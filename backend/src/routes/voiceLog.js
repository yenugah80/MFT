import express from 'express';
import multer from 'multer';
import { validateExtraction, isComplexDishInput } from '../services/canonicalIngredients.js';
import { openaiClient } from '../services/apiClients/OpenAIClient.js';
import { AiEstimatedFood } from '../models/AiEstimatedFood.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

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
      const dbMatch = await AiEstimatedFood.findOne({ sourceQuery: normalizedQuery });
      
      if (dbMatch) {
        console.log(`[VoiceLog] ⚡ DB Hit for "${text}"`);
        detectedIngredients = [{
          name: dbMatch.name,
          canonical: { nutrition: dbMatch.nutrition, portion: dbMatch.portion },
          confidence: dbMatch.confidence,
          healthScore: dbMatch.healthScore,
          nutriScore: dbMatch.nutriScore,
          cookingMethod: dbMatch.cookingMethod,
          analysis: dbMatch.analysis,
          autoAdded: true
        }];
      } else {
        // 2. If not in DB, call OpenAI
      const aiResults = await openaiClient.estimateNutritionForText(text, { mealType });
      if (aiResults.length > 0) {
        detectedIngredients = aiResults;

        // SAVE TO DB: Permanently store these new foods
        // GUARD: Only save high-quality results to prevent DB pollution
        const highQualityFoods = aiResults.filter(item => 
          (item.confidence >= 0.6) && (item.canonical?.nutrition?.calories !== undefined)
        );

        try {
          const newFoods = highQualityFoods.map(item => ({
            name: item.name,
            nutrition: {
              ...item.canonical.nutrition,
              micros: item.canonical.nutrition.micros || {}
            },
            portion: item.canonical.portion,
            confidence: item.confidence,
            healthScore: item.canonical.healthScore,
            nutriScore: item.canonical.nutriScore,
            cookingMethod: item.canonical.cookingMethod,
            analysis: item.canonical.analysis,
            sourceQuery: normalizedQuery, // Store normalized text for privacy & matching
            source: 'ai_estimate'
          }));
          
          // Use insertMany with ordered: false to ignore duplicates if any
          await AiEstimatedFood.insertMany(newFoods, { ordered: false }).catch(() => {});
          console.log(`[VoiceLog] Saved ${newFoods.length} new foods to database.`);
        } catch (dbError) {
          console.error("[VoiceLog] Failed to save to DB:", dbError.message);
        }
      }
      }
    }

    // Add stable IDs to response
    detectedIngredients = detectedIngredients.map((item, idx) => ({
      ...item,
      id: item.id || generateItemId(item.name, normalizeFoodText(text), idx)
    }));

    // P0 FIX: Return frontend-ready analysisResult structure
    // This prevents client-side guessing and ensures consistency
    const analysisResult = {
      items: detectedIngredients.map(item => {
        // Handle both direct nutrition (AI) and canonical.nutrition (DB matches)
        const nutrition = item.nutrition || item.canonical?.nutrition || {};
        const portion = item.portion || item.canonical?.portion || {};

        return {
          name: item.name,
          itemId: item.id,
          portion: {
            amount: portion.amount || item.quantity || 1,
            unit: portion.unit || item.unit || 'serving',
            servingText: `${portion.amount || item.quantity || 1} ${portion.unit || item.unit || 'serving'}`
          },
          macros: {
            calories_kcal: nutrition.calories || nutrition.calories_kcal || 0,
            protein_g: nutrition.protein_g || nutrition.protein || 0,
            carbs_g: nutrition.carbs_g || nutrition.carbs || 0,
            fat_g: nutrition.fats || nutrition.fat_g || nutrition.fat || 0,
            fiber_g: nutrition.fiber_g || nutrition.fiber || 0,
            sugar_g: nutrition.sugar_g || nutrition.sugar || 0,
            sodium_mg: nutrition.sodium_mg || nutrition.sodium || 0
          },
          micros: nutrition.micros || {},
          confidence: item.confidence,
          source: item.source || 'ai_estimate',
          isEstimated: item.source === 'ai_estimate',
          suggestions: []
        };
      }),
      totals: {}, // Calculated on frontend
      source: 'voice',
      isEstimated: true
    };

    res.json({ success: true, data: analysisResult });
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
      const dbMatch = await AiEstimatedFood.findOne({ sourceQuery: normalizedQuery });
      
      if (dbMatch) {
        detectedIngredients = [{
          name: dbMatch.name,
          canonical: { nutrition: dbMatch.nutrition, portion: dbMatch.portion },
          confidence: dbMatch.confidence,
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
        // We don't await this to return response faster
        // GUARD: Only save high-quality results
        const highQualityFoods = aiResults.filter(item => 
          (item.confidence >= 0.6) && (item.canonical?.nutrition?.calories !== undefined)
        );

        const newFoods = highQualityFoods.map(item => ({
          name: item.name,
          nutrition: {
            ...item.canonical.nutrition,
            micros: item.canonical.nutrition.micros || {}
          },
          portion: item.canonical.portion,
          confidence: item.confidence,
          healthScore: item.canonical.healthScore,
          nutriScore: item.canonical.nutriScore,
          cookingMethod: item.canonical.cookingMethod,
          analysis: item.canonical.analysis,
          sourceQuery: normalizedQuery,
          source: 'ai_estimate'
        }));
        AiEstimatedFood.insertMany(newFoods, { ordered: false }).catch(err => console.error("DB Save Error:", err.message));
      }
    }
    }

    // Add stable IDs to response
    detectedIngredients = detectedIngredients.map((item, idx) => ({
      ...item,
      id: item.id || generateItemId(item.name, normalizeFoodText(text), idx)
    }));

    // P0 FIX: Return frontend-ready analysisResult structure
    const analysisResult = {
      items: detectedIngredients.map(item => {
        // Handle both direct nutrition (AI) and canonical.nutrition (DB matches)
        const nutrition = item.nutrition || item.canonical?.nutrition || {};
        const portion = item.portion || item.canonical?.portion || {};

        return {
          name: item.name,
          itemId: item.id,
          portion: {
            amount: portion.amount || item.quantity || 1,
            unit: portion.unit || item.unit || 'serving',
            servingText: `${portion.amount || item.quantity || 1} ${portion.unit || item.unit || 'serving'}`
          },
          macros: {
            calories_kcal: nutrition.calories || nutrition.calories_kcal || 0,
            protein_g: nutrition.protein_g || nutrition.protein || 0,
            carbs_g: nutrition.carbs_g || nutrition.carbs || 0,
            fat_g: nutrition.fats || nutrition.fat_g || nutrition.fat || 0,
            fiber_g: nutrition.fiber_g || nutrition.fiber || 0,
            sugar_g: nutrition.sugar_g || nutrition.sugar || 0,
            sodium_mg: nutrition.sodium_mg || nutrition.sodium || 0
          },
          micros: nutrition.micros || {},
          confidence: item.confidence,
          source: item.source || 'ai_estimate',
          isEstimated: item.source === 'ai_estimate',
          suggestions: []
        };
      }),
      totals: {},
      source: 'voice',
      isEstimated: true
    };

    res.json({ success: true, data: analysisResult, text });

  } catch (error) {
    console.error("[VoiceLog] Transcription error:", error);
    // SECURITY FIX: Don't leak internal error details to client in production
    res.status(500).json({ error: "Unable to process voice log. Please try again." });
  }
});

router.post('/report', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    // Increment report count for this food item
    await AiEstimatedFood.updateOne(
      { name: new RegExp(`^${name}$`, 'i') },
      { $inc: { reports: 1 }, $set: { lastReportedAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Report error:", error);
    // SECURITY FIX: Generic error message
    res.status(500).json({ error: "Failed to submit report." });
  }
});

export default router;