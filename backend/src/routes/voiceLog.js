import express from 'express';
import multer from 'multer';
import { validateExtraction, isComplexDishInput } from '../services/canonicalIngredients.js';
import { openaiClient } from '../services/apiClients/OpenAIClient.js';
import { db } from '../config/db.js';
import { aiEstimatedFoodsTable } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';
import { buildUnifiedResponse } from '../utils/unifiedResponseBuilder.js';

const router = express.Router();

// Configure Multer for memory storage to handle audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware to handle Multer errors gracefully (The 1% fix for upload stability)
const uploadMiddleware = (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "Audio file too large. Limit is 10MB." });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: "File upload failed." });
    }
    next();
  });
};

// Helper to safely escape user input for Regex usage
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes food text for privacy and better DB matching.
 * - Lowercases
 * - Removes punctuation
 * - Removes leading quantities (e.g. "2 eggs" -> "eggs")
 * - Removes common stop words
 */
function normalizeFoodText(text) {
  if (!text) return "";
  const STOP_WORDS = new Set(['a', 'an', 'the', 'some', 'my', 'of', 'with', 'in', 'on', 'for']);
  
  let normalized = text.toLowerCase().replace(/[^\w\s]/g, ''); // Remove punctuation
  normalized = normalized.replace(/^\d+(\.\d+)?\s*/, ''); // Remove leading numbers
  
  return normalized.split(/\s+/).filter(w => !STOP_WORDS.has(w)).join(' ').trim();
}

/**
 * Generates a stable, deterministic ID for food items.
 * Ensures frontend stability across retries and edits.
 */
function generateItemId(name, normalizedQuery, index) {
  return crypto
    .createHash('sha1')
    .update(`${normalizedQuery}:${name}:${index}`)
    .digest('hex')
    .slice(0, 12);
}

router.post('/process', requireAuth, async (req, res) => {
  try {
    const { text, isPartial, mealType } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    // SMART ROUTING:
    // If input is a complex dish (e.g. "Chicken Tikka Masala"), skip local validation
    // to prevent incorrect simplification. Force AI analysis for these.
    const isComplex = isComplexDishInput(text);

    // Pass empty array [] so it treats ALL found keywords as "newly detected"
    // This effectively turns the validator into a parser.
    // Enable prefix matching only for partial (live) requests
    // If complex, pass empty list to force fallback to AI
    let detectedIngredients = isComplex ? [] : validateExtraction(text, [], { allowPrefix: isPartial });

    // FALLBACK: If local dictionary found nothing, try OpenAI
    // SKIP OpenAI for partial requests to ensure instant UI feedback
    if ((detectedIngredients.length === 0 || isComplex) && !isPartial) {
      console.log(`[VoiceLog] Local dictionary missed "${text}". Calling OpenAI...`);

      // 1. CHECK DB FIRST: Has anyone logged this before?
      // This makes "sushi" fast for the 2nd person who logs it
      const normalizedQuery = normalizeFoodText(text);

      try {
        const [dbMatch] = await db
          .select()
          .from(aiEstimatedFoodsTable)
          .where(eq(aiEstimatedFoodsTable.sourceQuery, normalizedQuery))
          .limit(1);

        if (dbMatch) {
          console.log(`[VoiceLog] ⚡ DB Hit for "${text}"`);

          // Update access count for cache analytics
          await db
            .update(aiEstimatedFoodsTable)
            .set({
              accessCount: sql`${aiEstimatedFoodsTable.accessCount} + 1`,
              lastAccessedAt: new Date()
            })
            .where(eq(aiEstimatedFoodsTable.id, dbMatch.id));

          detectedIngredients = [{
            name: dbMatch.name,
            canonical: { nutrition: dbMatch.nutrition, portion: dbMatch.portion },
            confidence: parseFloat(dbMatch.confidence) || 0.7,
            healthScore: dbMatch.healthScore,
            nutriScore: dbMatch.nutriScore,
            cookingMethod: dbMatch.cookingMethod,
            analysis: dbMatch.analysis,
            autoAdded: true
          }];
        } else {
          // 2. If not in DB, call OpenAI
          const aiResults = await openaiClient.estimateNutritionForText(text, { mealType });
          console.log(`[VoiceLog] OpenAI raw result:`, JSON.stringify(aiResults?.slice?.(0, 2), null, 2));
          if (aiResults.length > 0) {
            detectedIngredients = aiResults;
            console.log(`[VoiceLog] OpenAI returned ${aiResults.length} items for "${text}":`, aiResults.map(i => i.name).join(', '));

            // SAVE TO DB: Permanently store these new foods
            // GUARD: Only save high-quality results to prevent DB pollution
            const highQualityFoods = aiResults.filter(item =>
              (item.confidence >= 0.6) && (item.canonical?.nutrition?.calories !== undefined)
            );

            // Save first high-quality result (avoid duplicates with unique constraint)
            if (highQualityFoods.length > 0) {
              const item = highQualityFoods[0];
              try {
                await db
                  .insert(aiEstimatedFoodsTable)
                  .values({
                    name: item.name,
                    sourceQuery: normalizedQuery,
                    nutrition: {
                      calories: item.canonical.nutrition.calories,
                      protein: item.canonical.nutrition.protein,
                      carbs: item.canonical.nutrition.carbs,
                      fats: item.canonical.nutrition.fats,
                      fiber: item.canonical.nutrition.fiber,
                      sugar: item.canonical.nutrition.sugar,
                      sodium: item.canonical.nutrition.sodium,
                      micros: item.canonical.nutrition.micros || {}
                    },
                    portion: item.canonical.portion || { amount: 1, unit: 'serving' },
                    confidence: String(item.confidence),
                    healthScore: item.canonical.healthScore,
                    nutriScore: item.canonical.nutriScore,
                    cookingMethod: item.canonical.cookingMethod,
                    analysis: item.canonical.analysis,
                    source: 'ai_estimate'
                  })
                  .onConflictDoNothing(); // Ignore if already exists
                console.log(`[VoiceLog] Saved "${item.name}" to database cache.`);
              } catch (dbError) {
                // Ignore duplicate key errors
                if (!dbError.message?.includes('duplicate')) {
                  console.error("[VoiceLog] Failed to save to DB:", dbError.message);
                }
              }
            }
          }
        }
      } catch (dbError) {
        console.error("[VoiceLog] DB lookup failed, calling OpenAI directly:", dbError.message);
        // Fallback to OpenAI if DB fails
        const aiResults = await openaiClient.estimateNutritionForText(text, { mealType });
        if (aiResults.length > 0) {
          detectedIngredients = aiResults;
        }
      }
    }

    // Add stable IDs before building response
    detectedIngredients = detectedIngredients.map((item, idx) => ({
      ...item,
      id: item.id || generateItemId(item.name, normalizeFoodText(text), idx)
    }));

    // UNIFIED RESPONSE: All data calculated in backend
    // Includes: totals, healthScore, nutriScore, healthAnalysis, suggestions, dataQuality
    const unifiedResponse = buildUnifiedResponse({
      inputText: text,
      inputMode: 'voice',
      mealType: mealType || 'snack',
      rawItems: detectedIngredients
    });

    console.log(`[VoiceLog] Unified response: ${unifiedResponse.items.length} items, healthScore=${unifiedResponse.healthScore}, nutriScore=${unifiedResponse.nutriScore}`);
    res.json({ success: true, data: unifiedResponse });
  } catch (error) {
    console.error("Voice processing error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Handle audio transcription + processing in one optimized request.
 * Accepts multipart/form-data with 'audio' file field.
 */
router.post('/transcribe', requireAuth, uploadMiddleware, async (req, res) => {
  try {
    // VALIDATION: Whitelist meal types to prevent prompt injection or confusion
    const VALID_MEAL_TYPES = new Set(['breakfast', 'lunch', 'dinner', 'snack']);
    const rawMealType = req.body.mealType || 'general';
    const mealType = VALID_MEAL_TYPES.has(rawMealType) ? rawMealType : 'general';

    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided. Ensure field name is 'audio'." });
    }

    // 1. Transcribe Audio (OpenAI Whisper)
    // Pass original filename/mimetype to help Whisper decode correctly (The 1% fix for format compatibility)
    const transcription = await openaiClient.transcribeAudio(req.file.buffer, {
      filename: req.file.originalname,
      mimeType: req.file.mimetype
    });
    const text = transcription.text;

    if (!text) {
      return res.json({ success: true, data: [], text: "" });
    }

    const isComplex = isComplexDishInput(text);
    // 2. Process Text (Reuse logic from /process)
    // Local lookup is instant (<10ms)
    let detectedIngredients = isComplex ? [] : validateExtraction(text, []);

    // 3. Fallback to AI if needed
    // Only called if local lookup fails, to save time and cost
    if (detectedIngredients.length === 0 || isComplex) {
      // CHECK DB FIRST
      const normalizedQuery = normalizeFoodText(text);

      try {
        const [dbMatch] = await db
          .select()
          .from(aiEstimatedFoodsTable)
          .where(eq(aiEstimatedFoodsTable.sourceQuery, normalizedQuery))
          .limit(1);

        if (dbMatch) {
          detectedIngredients = [{
            name: dbMatch.name,
            canonical: { nutrition: dbMatch.nutrition, portion: dbMatch.portion },
            confidence: parseFloat(dbMatch.confidence) || 0.7,
            healthScore: dbMatch.healthScore,
            nutriScore: dbMatch.nutriScore,
            cookingMethod: dbMatch.cookingMethod,
            analysis: dbMatch.analysis,
            autoAdded: true
          }];
        } else {
          // CALL AI
          const aiResults = await openaiClient.estimateNutritionForText(text, { mealType });
          if (aiResults.length > 0) {
            detectedIngredients = aiResults;

            // Background: Save to DB for future speedup
            // GUARD: Only save high-quality results
            const highQualityFoods = aiResults.filter(item =>
              (item.confidence >= 0.6) && (item.canonical?.nutrition?.calories !== undefined)
            );

            // Save first high-quality result
            if (highQualityFoods.length > 0) {
              const item = highQualityFoods[0];
              db.insert(aiEstimatedFoodsTable)
                .values({
                  name: item.name,
                  sourceQuery: normalizedQuery,
                  nutrition: {
                    calories: item.canonical.nutrition.calories,
                    protein: item.canonical.nutrition.protein,
                    carbs: item.canonical.nutrition.carbs,
                    fats: item.canonical.nutrition.fats,
                    fiber: item.canonical.nutrition.fiber,
                    sugar: item.canonical.nutrition.sugar,
                    sodium: item.canonical.nutrition.sodium,
                    micros: item.canonical.nutrition.micros || {}
                  },
                  portion: item.canonical.portion || { amount: 1, unit: 'serving' },
                  confidence: String(item.confidence),
                  healthScore: item.canonical.healthScore,
                  nutriScore: item.canonical.nutriScore,
                  cookingMethod: item.canonical.cookingMethod,
                  analysis: item.canonical.analysis,
                  source: 'ai_estimate'
                })
                .onConflictDoNothing()
                .catch(err => console.error("DB Save Error:", err.message));
          }
        }
        }
      } catch (dbError) {
        console.error("[VoiceLog] DB lookup failed:", dbError.message);
        // Fallback to OpenAI if DB fails
        const aiResults = await openaiClient.estimateNutritionForText(text, { mealType });
        if (aiResults.length > 0) {
          detectedIngredients = aiResults;
        }
      }
    }

    // Add stable IDs before building response
    detectedIngredients = detectedIngredients.map((item, idx) => ({
      ...item,
      id: item.id || generateItemId(item.name, normalizeFoodText(text), idx)
    }));

    // UNIFIED RESPONSE: All data calculated in backend
    const unifiedResponse = buildUnifiedResponse({
      inputText: text,
      inputMode: 'voice',
      mealType: mealType || 'snack',
      rawItems: detectedIngredients
    });

    console.log(`[VoiceLog/Transcribe] Items: ${unifiedResponse.items.length}, Health: ${unifiedResponse.healthScore}`);
    res.json({ success: true, data: unifiedResponse, text });

  } catch (error) {
    console.error("[VoiceLog] Transcription error:", error);
    res.status(500).json({ error: "Unable to process voice log. Please try again." });
  }
});

router.post('/report', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    // Increment report count for this food item (case-insensitive match via lowercase)
    const normalizedName = name.toLowerCase();
    await db
      .update(aiEstimatedFoodsTable)
      .set({
        reports: sql`COALESCE(${aiEstimatedFoodsTable.reports}, 0) + 1`,
        lastReportedAt: new Date()
      })
      .where(sql`LOWER(${aiEstimatedFoodsTable.name}) = ${normalizedName}`);

    res.json({ success: true });
  } catch (error) {
    console.error("Report error:", error);
    // SECURITY FIX: Generic error message
    res.status(500).json({ error: "Failed to submit report." });
  }
});

export default router;