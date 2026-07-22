import express from "express";
import multer from "multer";
import { FoodService } from "../services/foodService.js";
import { requireAuth } from "../middleware/auth.js";
import { buildUnifiedResponse } from "../utils/unifiedResponseBuilder.js";
import { db } from "../config/db.js";
import { aiEstimatedFoodsTable } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { imageLimiter } from "../middleware/rateLimiter.js";
import { validate, imageAnalysisSchema } from "../middleware/validation.js";
import { checkNutritionPlausibility } from "../services/nutritionPlausibilityChecker.js";

// Configure Multer for audio file uploads
const upload = multer({ dest: "uploads/" });

const router = express.Router();

router.use(requireAuth());

/**
 * GET /api/food/search
 * Search for food across multiple sources (MealDB, OFF, USDA, AI).
 */
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query required" });

    const results = await FoodService.searchAll(query);
    res.json(results);
  } catch (error) {
    console.error("[FoodSearch] Error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * GET /api/food/barcode/:code
 * Look up a product by barcode.
 *
 * Query params:
 *   mealType?: string ('breakfast' | 'lunch' | 'dinner' | 'snack')
 *
 * Returns: UNIFIED RESPONSE STRUCTURE (same as voice/text/photo)
 */
router.get("/barcode/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const mealType = req.query.mealType || 'snack';
    if (!code) return res.status(400).json({ error: "Barcode required" });

    const product = await FoodService.searchByBarcode(code);
    // Use consistent "No product found" message that frontend expects
    if (!product) return res.status(404).json({ error: "No product found for this barcode" });

    // Transform to unified response format
    const rawItems = [{
      name: product.title || 'Unknown Product',
      quantity: 1,
      unit: 'serving',
      canonical: {
        nutrition: {
          calories: product.calories || 0,
          protein: product.protein || 0,
          carbs: product.carbs || 0,
          fats: product.fats || product.fat || 0,
          fiber: product.fiber || 0,
          sugar: product.sugar || 0,
          sodium: product.sodium || 0,
          micros: product.micros || {}
        },
        portion: { amount: 1, unit: product.servingSize || 'serving' },
        healthScore: null,
        nutriScore: product.nutriscore || null,
        ingredients: product.ingredients || []
      },
      confidence: product.source === 'openfoodfacts' ? 0.9 : 0.7,
      source: product.source || 'openfoodfacts',
      ingredients: product.ingredients || [],
      nutriScore: product.nutriscore || null
    }];

    const unifiedResponse = buildUnifiedResponse({
      inputText: product.title || `Barcode: ${code}`,
      inputMode: 'barcode',
      mealType: mealType,
      rawItems: rawItems
    });

    console.log(`[FoodBarcode] Unified response: ${unifiedResponse.items.length} items, healthScore=${unifiedResponse.healthScore}`);
    res.json({ success: true, data: unifiedResponse });
  } catch (error) {
    console.error("[FoodBarcode] Error:", error.message);
    // Return descriptive error message
    const errorMessage = error.message || 'Barcode lookup failed';
    res.status(500).json({
      error: errorMessage,
      success: false
    });
  }
});

/**
 * POST /api/food/analyze-image
 * Analyze a food image using AI.
 *
 * Body: {
 *   image: string (base64),
 *   highAccuracy?: boolean (use GPT-4o for 85-92% accuracy, default: false = gpt-4o-mini 75-85%),
 *   includeIngredients?: boolean (attempt to list individual ingredients, default: false),
 *   mealType?: string ('breakfast' | 'lunch' | 'dinner' | 'snack')
 * }
 *
 * Returns: UNIFIED RESPONSE STRUCTURE (same as voice/text/barcode)
 */
router.post("/analyze-image", imageLimiter, validate(imageAnalysisSchema), async (req, res) => {
  try {
    const { image, highAccuracy = false, includeIngredients = false, mealType = 'snack' } = req.body;
    if (!image) return res.status(400).json({ error: "Image required" });

    let result = await FoodService.analyzeImage(image, {
      highAccuracy,
      includeIngredients,
    });
    // Result should never be null now (FoodService throws on failure)
    if (!result) return res.status(500).json({ error: "AI could not analyze this image. Please try with a clearer photo." });

    // Photo-path self-correction (mirrors the text path). The vision model names the
    // dish AND estimates in one call, so unlike text we can't calibrate up front — but
    // once we HAVE the name we can detect an implausible density and re-analyze the
    // image ONCE with the reference band injected, escalated to the stronger model.
    // Only fires on flagged single-item photos → common path keeps zero added latency.
    if (process.env.ENABLE_PLAUSIBILITY_CORRECTION !== 'false' && !result.isMultiItem) {
      const dishName = result.title || result.foodName;
      const firstCheck = checkNutritionPlausibility({
        foodName: dishName,
        macros: { calories_kcal: result.calories || 0 },
      });
      if (!firstCheck.plausible && firstCheck.expectedRange) {
        const dir = firstCheck.kcalPer100g < firstCheck.expectedRange.min ? 'low' : 'high';
        const hint =
          `IMPORTANT — RE-ANALYZE: This looks like "${dishName}". A calorie density of ` +
          `~${firstCheck.kcalPer100g} kcal/100g is implausibly ${dir}; a typical "${dishName}" is ` +
          `${firstCheck.expectedRange.min}-${firstCheck.expectedRange.max} kcal/100g. Re-examine the ` +
          `image and give a REALISTIC estimate, keeping macros internally consistent.`;
        try {
          const retry = await FoodService.analyzeImage(image, {
            highAccuracy: true, // escalate to gpt-4o for the correction pass
            includeIngredients,
            customInstructions: hint,
          });
          if (retry) {
            const recheck = checkNutritionPlausibility({
              foodName: retry.title || retry.foodName || dishName,
              macros: { calories_kcal: retry.calories || 0 },
            });
            console.log(`[FoodAnalyzeImage][correction] "${dishName}": ${firstCheck.kcalPer100g} → ${recheck.kcalPer100g} kcal/100g (${recheck.plausible ? '✅ corrected' : '⚠️ still off, keeping better of the two'})`);
            // Accept the retry only if it's actually more plausible than the first pass.
            if (recheck.plausible) result = retry;
          }
        } catch (correctionErr) {
          console.warn(`[FoodAnalyzeImage][correction] Failed for "${dishName}": ${correctionErr.message}`);
        }
      }
    }

    // Transform result to rawItems format - handle both multi-item and single-item
    const rawItems = result.isMultiItem && result.items
      ? result.items.map(item => ({
          name: item.name || 'Unknown Food',
          quantity: item.portion?.amount || 1,
          unit: item.portion?.unit || 'serving',
          canonical: {
            nutrition: {
              calories: item.calories || 0,
              protein: item.protein || 0,
              carbs: item.carbs || 0,
              fats: item.fat || 0,
              fiber: item.fiber || 0,
              sugar: item.sugar || 0,
              sodium: item.sodium || 0,
              micros: item.micros || {}
            },
            portion: item.portion || { amount: 1, unit: 'serving' },
            healthScore: result.healthScore || null,
            nutriScore: result.nutriscore || null,
            cookingMethod: item.cookingMethod || null,
            cuisine: item.cuisine || null,
            ingredients: item.ingredients || []
          },
          confidence: item.confidence || 0.75,
          source: 'ai_estimate',
          ingredients: item.ingredients || [],
          healthFlags: item.healthFlags || {},
          cookingMethod: item.cookingMethod || null,
          cuisine: item.cuisine || null
        }))
      : [{
          name: result.title || result.foodName || 'Unknown Food',
          quantity: 1,
          unit: 'serving',
          canonical: {
            nutrition: {
              calories: result.calories || 0,
              protein: result.protein || 0,
              carbs: result.carbs || 0,
              fats: result.fats || result.fat || 0,
              fiber: result.fiber || 0,
              sugar: result.sugar || 0,
              sodium: result.sodium || 0,
              micros: result.micros || {}
            },
            portion: { amount: 1, unit: result.servingSize || 'serving' },
            healthScore: result.healthScore || null,
            nutriScore: result.nutriscore || null,
            cookingMethod: result.cookingMethod || null,
            cuisine: result.cuisine || null,
            ingredients: result.ingredients || []
          },
          confidence: result.confidence || 0.75,
          source: 'ai_estimate',
          ingredients: result.ingredients || [],
          healthScore: result.healthScore || null,
          nutriScore: result.nutriscore || null,
          cookingMethod: result.cookingMethod || null,
          cuisine: result.cuisine || null
        }];

    // Build unified response
    const unifiedResponse = buildUnifiedResponse({
      inputText: result.title || 'Photo analysis',
      inputMode: 'photo',
      mealType: mealType,
      rawItems: rawItems
    });

    // CRITICAL FIX: Add top-level foodName for backwards compatibility
    // The frontend's buildFoodLog expects raw.foodName, but unifiedResponse has items[0].name
    const foodName = rawItems[0]?.name || result.title || result.foodName || 'Unknown Food';
    const confidence = result.confidence ?? rawItems[0]?.confidence ?? 0.75;

    // Unlike the text path (resolve.js), there's no separate name-resolution step here
    // to guard against overwriting a correct parse — the vision model names and
    // estimates nutrition in one call, so a wrong name and wrong macros come from
    // the same low-confidence guess. Flagging it lets the client prompt a review
    // instead of silently trusting an uncertain read.
    const lowConfidence = confidence < 0.6;
    if (lowConfidence) {
      console.warn(`[FoodAnalyzeImage] Low-confidence result (${confidence}): foodName="${foodName}"`);
    }

    // Absolute calorie-density plausibility check (same one used in the text path,
    // smartNutritionResolver.js) — confidence alone doesn't catch a result that's
    // internally consistent but wrong by roughly a constant factor.
    const portionAmount = rawItems[0]?.canonical?.portion?.amount;
    const portionUnit = rawItems[0]?.canonical?.portion?.unit;
    const servingGrams = portionUnit === 'g' && typeof portionAmount === 'number' ? portionAmount : undefined;
    const plausibilityCheck = checkNutritionPlausibility({
      foodName,
      macros: { calories_kcal: unifiedResponse.totals?.calories || 0 },
      servingGrams,
    });

    console.log(`[FoodAnalyzeImage] Unified response: ${unifiedResponse.items.length} items, foodName="${foodName}", healthScore=${unifiedResponse.healthScore}`);

    // Build enhanced response with all analysis metadata
    const enhancedResponse = {
      success: true,
      data: {
        ...unifiedResponse,
        // Add backwards-compatible fields at top level
        foodName,
        title: foodName,
        name: foodName,
        calories: unifiedResponse.totals?.calories || 0,
        protein: unifiedResponse.totals?.protein || 0,
        carbs: unifiedResponse.totals?.carbs || 0,
        fat: unifiedResponse.totals?.fat || 0,
        fiber: unifiedResponse.totals?.fiber || 0,
        sugar: unifiedResponse.totals?.sugar || 0,
        sodium: unifiedResponse.totals?.sodium || 0,
        servingSize: rawItems[0]?.canonical?.portion?.unit || 'serving',
        micros: rawItems[0]?.canonical?.nutrition?.micros || {},
        ingredients: rawItems[0]?.ingredients || [],
        // Enhanced analysis fields
        isMultiItem: result.isMultiItem || false,
        itemCount: result.itemCount || 1,
        cookingMethod: result.cookingMethod || rawItems[0]?.cookingMethod || null,
        cuisine: result.cuisine || rawItems[0]?.cuisine || null,
        healthScore: result.healthScore || null,
        portionAssessment: result.portionAssessment || null,
        confidence,
        lowConfidence,
        nutritionPlausible: plausibilityCheck.plausible,
        plausibilityCheck,
        suggestions: result.suggestions || [],
        imageAnalysis: result.imageAnalysis || null
      }
    };

    console.log(`[FoodAnalyzeImage] Enhanced response:`, {
      items: enhancedResponse.data.items?.length || 1,
      calories: enhancedResponse.data.calories,
      cuisine: enhancedResponse.data.cuisine,
      cookingMethod: enhancedResponse.data.cookingMethod,
      confidence: enhancedResponse.data.confidence
    });

    res.json(enhancedResponse);
  } catch (error) {
    console.error("[FoodAnalyzeImage] Error:", error.message);
    // Return descriptive error message to frontend
    const errorMessage = error.message || 'Unknown error during image analysis';
    res.status(500).json({
      error: errorMessage,
      success: false
    });
  }
});

/**
 * POST /api/food/transcribe-voice
 * Transcribe a voice recording to text (step 1 of voice logging).
 *
 * Content-Type: multipart/form-data
 * Body (form-data): {
 *   audio: File (m4a, mp3, wav, etc.),
 *   language?: string (e.g., 'en', default: 'en')
 * }
 *
 * Returns: { transcript: string, confidence: number }
 * Uses gpt-4o-mini-transcribe for speech-to-text ONLY
 */
router.post("/transcribe-voice", upload.single('audio'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const audioFile = req.file;
    const language = req.body.language || 'en';

    // Validate file size (max 25MB as per OpenAI limits)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return res.status(400).json({ error: "Audio file too large (max 25MB)" });
    }

    console.log(`[FoodTranscribeVoice] Transcribing audio: ${audioFile.originalname}, size: ${audioFile.size} bytes`);

    const fs = await import('fs');

    let audioBuffer;
    try {
      audioBuffer = fs.readFileSync(audioFile.path);
    } catch (fsErr) {
      console.error('[FoodTranscribeVoice] Failed to read temp audio file:', fsErr.message);
      try { fs.unlinkSync(audioFile.path); } catch {}
      return res.status(500).json({ error: 'Failed to read uploaded audio file' });
    }

    let result;
    try {
      result = await FoodService.transcribeVoice(audioBuffer, { language });
    } finally {
      // Always clean up temp file, even on transcription error
      try { fs.unlinkSync(audioFile.path); } catch (cleanErr) {
        console.warn('[FoodTranscribeVoice] Failed to delete temp file:', cleanErr.message);
      }
    }

    if (!result || !result.transcript) {
      return res.status(500).json({ error: 'Transcription failed' });
    }

    res.json(result);
  } catch (error) {
    console.error("[FoodTranscribeVoice] Error:", error);
    res.status(500).json({
      error: error.message || "Transcription failed"
    });
  }
});

/**
 * POST /api/food/analyze-voice
 * Analyze a voice recording and extract nutrition data (LEGACY - does both transcribe + analyze).
 *
 * Content-Type: multipart/form-data
 * Body (form-data): {
 *   audio: File (m4a, mp3, wav, etc.),
 *   language?: string (e.g., 'en', default: 'en')
 * }
 *
 * Uses gpt-4o-mini-transcribe for speech-to-text + GPT-4o for nutrition extraction
 *
 * NOTE: Prefer using /transcribe-voice + /analyze-text for better UX (allows user to confirm/edit transcript)
 */
router.post("/analyze-voice", upload.single('audio'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const audioFile = req.file;
    const language = req.body.language || 'en';

    // Validate file size (max 25MB as per OpenAI limits)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return res.status(400).json({ error: "Audio file too large (max 25MB)" });
    }

    console.log(`[FoodAnalyzeVoice] Processing audio: ${audioFile.originalname}, size: ${audioFile.size} bytes`);

    const fs = await import('fs');

    let audioBuffer;
    try {
      audioBuffer = fs.readFileSync(audioFile.path);
    } catch (fsErr) {
      console.error('[FoodAnalyzeVoice] Failed to read temp audio file:', fsErr.message);
      try { fs.unlinkSync(audioFile.path); } catch {}
      return res.status(500).json({ error: 'Failed to read uploaded audio file' });
    }

    let result;
    try {
      result = await FoodService.analyzeVoice(audioBuffer, { language });
    } finally {
      try { fs.unlinkSync(audioFile.path); } catch (cleanErr) {
        console.warn('[FoodAnalyzeVoice] Failed to delete temp file:', cleanErr.message);
      }
    }

    if (!result) {
      return res.status(500).json({ error: 'Voice analysis failed' });
    }

    res.json(result);
  } catch (error) {
    console.error("[FoodAnalyzeVoice] Error:", error);
    res.status(500).json({
      error: error.message || "Voice analysis failed"
    });
  }
});

/**
 * POST /api/food/analyze-multimodal
 * Analyze food with optional voice description for better accuracy
 *
 * Body: {
 *   image: string (base64),
 *   voiceTranscript?: string (optional voice description),
 *   cuisinePreference?: string (e.g., 'South Indian', 'American'),
 *   region?: string (e.g., 'India', 'USA'),
 *   cookingMethod?: string (e.g., 'fried', 'steamed', 'grilled'),
 *   highAccuracy?: boolean (default: true for multimodal),
 *   includeIngredients?: boolean (default: true),
 *   mealType?: string ('breakfast' | 'lunch' | 'dinner' | 'snack')
 * }
 *
 * Returns: UNIFIED RESPONSE STRUCTURE with multimodal metadata
 */
router.post("/analyze-multimodal", imageLimiter, validate(imageAnalysisSchema), async (req, res) => {
  try {
    const {
      image,
      voiceTranscript = null,
      cuisinePreference = null,
      region = null,
      cookingMethod = null,
      highAccuracy = true, // Multimodal uses high accuracy by default
      includeIngredients = true, // Always include ingredients for multimodal
      mealType = 'snack'
    } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image required for multimodal analysis" });
    }

    console.log('[FoodMultimodal] Analyzing image with voice context:', {
      hasVoice: !!voiceTranscript,
      voiceLength: voiceTranscript?.length || 0,
      cuisinePreference,
      region
    });

    // Build custom instructions from voice context
    let customInstructions = null;
    if (voiceTranscript) {
      customInstructions = `🎤 USER VOICE DESCRIPTION: "${voiceTranscript}"\n\n`;
      customInstructions += `Use this voice context to refine your analysis:\n`;
      customInstructions += `- User may mention ingredients ("with extra ghee", "no onions")\n`;
      customInstructions += `- Cooking details ("deep fried", "air fried", "steamed")\n`;
      customInstructions += `- Portion info ("large serving", "half portion")\n`;
      customInstructions += `- Regional variations ("South Indian style", "restaurant style")\n\n`;
      customInstructions += `Adjust nutrition estimates based on these details.`;
    }

    // Analyze image with full context for maximum accuracy
    const result = await FoodService.analyzeImage(image, {
      highAccuracy,
      includeIngredients,
      cuisinePreference,
      region,
      cookingMethod,
      customInstructions,
      voiceTranscript,
      mealType,
      // Pass user goals if provided for personalized suggestions
      userGoals: req.body.userGoals || null
    });

    if (!result) {
      return res.status(500).json({ error: "Multimodal analysis failed" });
    }

    // Transform result to rawItems format - handle both multi-item and single-item
    const rawItems = result.isMultiItem && result.items
      ? result.items.map(item => ({
          name: item.name || 'Unknown Food',
          quantity: item.portion?.amount || 1,
          unit: item.portion?.unit || 'serving',
          canonical: {
            nutrition: {
              calories: item.calories || 0,
              protein: item.protein || 0,
              carbs: item.carbs || 0,
              fats: item.fat || 0,
              fiber: item.fiber || 0,
              sugar: item.sugar || 0,
              sodium: item.sodium || 0,
              micros: item.micros || {}
            },
            portion: item.portion || { amount: 1, unit: 'serving' },
            healthScore: result.healthScore || null,
            nutriScore: result.nutriscore || null,
            cookingMethod: cookingMethod || item.cookingMethod || null,
            cuisine: cuisinePreference || item.cuisine || null,
            ingredients: item.ingredients || []
          },
          confidence: voiceTranscript ? 0.85 : (item.confidence || 0.75),
          source: 'ai_estimate',
          ingredients: item.ingredients || [],
          healthFlags: item.healthFlags || {},
          cookingMethod: cookingMethod || item.cookingMethod || null,
          cuisine: cuisinePreference || item.cuisine || null
        }))
      : [{
          name: result.title || result.foodName || 'Unknown Food',
          quantity: 1,
          unit: 'serving',
          canonical: {
            nutrition: {
              calories: result.calories || 0,
              protein: result.protein || 0,
              carbs: result.carbs || 0,
              fats: result.fats || result.fat || 0,
              fiber: result.fiber || 0,
              sugar: result.sugar || 0,
              sodium: result.sodium || 0,
              micros: result.micros || {}
            },
            portion: { amount: 1, unit: result.servingSize || 'serving' },
            healthScore: result.healthScore || null,
            nutriScore: result.nutriscore || null,
            cookingMethod: cookingMethod || result.cookingMethod || null,
            cuisine: cuisinePreference || result.cuisine || region || null,
            ingredients: result.ingredients || []
          },
          confidence: voiceTranscript ? 0.85 : 0.75,
          source: 'ai_estimate',
          ingredients: result.ingredients || [],
          healthScore: result.healthScore || null,
          nutriScore: result.nutriscore || null,
          cookingMethod: cookingMethod || result.cookingMethod || null,
          cuisine: cuisinePreference || result.cuisine || null
        }];

    // Build unified response
    const unifiedResponse = buildUnifiedResponse({
      inputText: voiceTranscript || result.title || 'Multimodal analysis',
      inputMode: 'photo',
      mealType: mealType,
      rawItems: rawItems
    });

    // Add multimodal and enhanced analysis metadata
    unifiedResponse.multimodal = {
      hasVoice: !!voiceTranscript,
      voiceTranscript,
      cuisinePreference,
      region
    };

    // Add enhanced fields from analysis
    unifiedResponse.isMultiItem = result.isMultiItem || false;
    unifiedResponse.itemCount = result.itemCount || rawItems.length;
    unifiedResponse.cookingMethod = cookingMethod || result.cookingMethod || null;
    unifiedResponse.cuisine = cuisinePreference || result.cuisine || null;
    unifiedResponse.portionAssessment = result.portionAssessment || null;
    unifiedResponse.suggestions = result.suggestions || [];
    unifiedResponse.imageAnalysis = result.imageAnalysis || null;

    // Same absolute calorie-density plausibility check as /analyze-image and the
    // text path (smartNutritionResolver.js) — catches internally-consistent-but-
    // wrong-magnitude estimates that confidence scores alone don't.
    const multimodalPlausibilityCheck = checkNutritionPlausibility({
      foodName: rawItems[0]?.name || result.title || result.foodName || 'Unknown Food',
      macros: { calories_kcal: unifiedResponse.totals?.calories || 0 },
    });
    unifiedResponse.nutritionPlausible = multimodalPlausibilityCheck.plausible;
    unifiedResponse.plausibilityCheck = multimodalPlausibilityCheck;

    console.log(`[FoodMultimodal] Enhanced response:`, {
      items: unifiedResponse.items?.length || 1,
      calories: unifiedResponse.totals?.calories,
      cuisine: unifiedResponse.cuisine,
      hasVoice: !!voiceTranscript,
      confidence: rawItems[0]?.confidence
    });

    res.json({ success: true, data: unifiedResponse });
  } catch (error) {
    console.error("[FoodMultimodal] Error:", error);
    res.status(500).json({ error: error.message || "Multimodal analysis failed" });
  }
});

/**
 * POST /api/food/verify-nutrition
 * User confirms or corrects AI nutrition estimate to improve database accuracy
 *
 * Body: {
 *   itemId: string (food item ID from AiEstimatedFood),
 *   verified: boolean (true = user confirmed, false = user corrected),
 *   corrections?: {
 *     calories: number,
 *     protein: number,
 *     carbs: number,
 *     fat: number
 *   },
 *   cuisine?: string,
 *   region?: string
 * }
 *
 * Returns: {
 *   success: boolean,
 *   newConfidence: number (0-1),
 *   verificationCount: number,
 *   correctionCount: number
 * }
 */
router.post("/verify-nutrition", async (req, res) => {
  try {
    const {
      itemId,
      verified,
      corrections = {},
      cuisine = null,
      region = null
    } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: "itemId required" });
    }

    if (verified === undefined || verified === null) {
      return res.status(400).json({ error: "verified flag required" });
    }

    const userId = req.userId || req.auth?.sub; // Get user ID from auth
    if (!userId) {
      return res.status(401).json({ error: "User authentication required" });
    }

    console.log('[FoodVerification] User verification:', {
      itemId,
      userId,
      verified,
      hasCorrections: Object.keys(corrections).length > 0,
      region
    });

    // Look up the food item using Drizzle
    const [food] = await db
      .select()
      .from(aiEstimatedFoodsTable)
      .where(eq(aiEstimatedFoodsTable.id, parseInt(itemId)))
      .limit(1);

    if (!food) {
      return res.status(404).json({ error: "Food item not found" });
    }

    // Calculate updated counters
    let newVerificationCount = food.verificationCount || 0;
    let newCorrectionCount = food.correctionCount || 0;
    let updatedNutrition = food.nutrition;

    if (verified) {
      newVerificationCount += 1;
    } else {
      newCorrectionCount += 1;

      // Apply corrections if significant (>10% difference from current estimate)
      if (corrections && Object.keys(corrections).length > 0) {
        const currentCals = food.nutrition?.calories || 0;
        const correctedCals = corrections.calories || currentCals;

        if (currentCals > 0 && Math.abs(correctedCals - currentCals) / currentCals > 0.1) {
          updatedNutrition = {
            ...food.nutrition,
            calories: corrections.calories || food.nutrition.calories,
            protein: corrections.protein || food.nutrition.protein,
            carbs: corrections.carbs || food.nutrition.carbs,
            fats: corrections.fats || food.nutrition.fats
          };
        }
      }
    }

    // Recalculate confidence based on verification ratio
    const totalVerifications = newVerificationCount + newCorrectionCount;
    const newConfidence = totalVerifications > 0
      ? (newVerificationCount / totalVerifications).toFixed(2)
      : food.confidence;

    // Mark as verified if threshold met (>= 3 verifications)
    const newIsVerified = newVerificationCount >= 3;

    // Persist updates using Drizzle
    const [updatedFood] = await db
      .update(aiEstimatedFoodsTable)
      .set({
        verificationCount: newVerificationCount,
        correctionCount: newCorrectionCount,
        confidence: newConfidence,
        isVerified: newIsVerified,
        nutrition: updatedNutrition,
        updatedAt: new Date(),
      })
      .where(eq(aiEstimatedFoodsTable.id, food.id))
      .returning();

    console.log('[FoodVerification] Verification saved:', {
      itemId,
      newConfidence: updatedFood.confidence,
      totalVerifications
    });

    res.json({
      success: true,
      newConfidence: parseFloat(updatedFood.confidence),
      verificationCount: updatedFood.verificationCount,
      correctionCount: updatedFood.correctionCount,
      message: verified
        ? 'Thank you for confirming! This helps improve accuracy for others.'
        : 'Thank you for the correction! We\'ve updated the estimates.'
    });
  } catch (error) {
    console.error("[FoodVerification] Error:", error);
    res.status(500).json({ error: error.message || "Verification failed" });
  }
});

export default router;
