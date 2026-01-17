import express from "express";
import multer from "multer";
import { FoodService } from "../services/foodService.js";
import { requireAuth } from "../middleware/auth.js";
import { buildUnifiedResponse } from "../utils/unifiedResponseBuilder.js";

// Configure Multer for audio file uploads
const upload = multer({ dest: "uploads/" });

const router = express.Router();

router.use(requireAuth);

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
router.post("/analyze-image", async (req, res) => {
  try {
    const { image, highAccuracy = false, includeIngredients = false, mealType = 'snack' } = req.body;
    if (!image) return res.status(400).json({ error: "Image required" });

    const result = await FoodService.analyzeImage(image, {
      highAccuracy,
      includeIngredients,
    });
    // Result should never be null now (FoodService throws on failure)
    if (!result) return res.status(500).json({ error: "AI could not analyze this image. Please try with a clearer photo." });

    // Transform raw result to unified response format
    // Convert FoodService.analyzeImage result to rawItems format for unified builder
    const rawItems = [{
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
        ingredients: result.ingredients || []
      },
      confidence: result.confidence || 0.75,
      source: 'ai_estimate',
      ingredients: result.ingredients || [],
      healthScore: result.healthScore || null,
      nutriScore: result.nutriscore || null
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

    console.log(`[FoodAnalyzeImage] Unified response: ${unifiedResponse.items.length} items, foodName="${foodName}", healthScore=${unifiedResponse.healthScore}`);

    res.json({
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
      }
    });
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

    // Read file buffer from disk (multer saves to disk)
    const fs = await import('fs');
    const audioBuffer = fs.readFileSync(audioFile.path);

    // Transcribe voice using FoodService
    const result = await FoodService.transcribeVoice(audioBuffer, { language });

    // Clean up temp file
    fs.unlinkSync(audioFile.path);

    if (!result || !result.transcript) {
      return res.status(500).json({ error: "Transcription failed" });
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

    // Read file buffer from disk (multer saves to disk)
    const fs = await import('fs');
    const audioBuffer = fs.readFileSync(audioFile.path);

    // Analyze voice using FoodService
    const result = await FoodService.analyzeVoice(audioBuffer, { language });

    // Clean up temp file
    fs.unlinkSync(audioFile.path);

    if (!result) {
      return res.status(500).json({ error: "Voice analysis failed" });
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
router.post("/analyze-multimodal", async (req, res) => {
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

    // Analyze image with regional and voice context
    const result = await FoodService.analyzeImage(image, {
      highAccuracy,
      includeIngredients,
      cuisinePreference,
      region,
      cookingMethod,
      customInstructions, // Pass voice context to AI
      voiceTranscript // Store for reference
    });

    if (!result) {
      return res.status(500).json({ error: "Multimodal analysis failed" });
    }

    // Transform to unified response format
    const rawItems = [{
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
      confidence: voiceTranscript ? 0.85 : 0.75, // Higher confidence with voice context
      source: 'ai_estimate',
      ingredients: result.ingredients || [],
      healthScore: result.healthScore || null,
      nutriScore: result.nutriscore || null,
      cookingMethod: cookingMethod || result.cookingMethod || null
    }];

    // Build unified response
    const unifiedResponse = buildUnifiedResponse({
      inputText: voiceTranscript || result.title || 'Multimodal analysis',
      inputMode: 'photo', // Base mode is photo
      mealType: mealType,
      rawItems: rawItems
    });

    // Add multimodal metadata
    unifiedResponse.multimodal = {
      hasVoice: !!voiceTranscript,
      voiceTranscript,
      cuisinePreference,
      region
    };

    console.log(`[FoodMultimodal] Unified response: ${unifiedResponse.items.length} items, healthScore=${unifiedResponse.healthScore}`);
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

    // Import AiEstimatedFood model
    const { AiEstimatedFood } = await import("../models/AiEstimatedFood.js");

    // Find the food item
    const food = await AiEstimatedFood.findById(itemId);
    if (!food) {
      return res.status(404).json({ error: "Food item not found" });
    }

    // Add user verification record
    const verificationRecord = {
      userId,
      verified,
      corrections: verified ? {} : corrections, // Only store corrections if not verified
      region: region || food.region,
      cuisine: cuisine || food.cuisine,
      timestamp: new Date()
    };

    food.userVerifications = food.userVerifications || [];
    food.userVerifications.push(verificationRecord);

    // Update counters
    if (verified) {
      food.verificationCount = (food.verificationCount || 0) + 1;
    } else {
      food.correctionCount = (food.correctionCount || 0) + 1;

      // Apply corrections if significant (>10% difference from current estimate)
      if (corrections && Object.keys(corrections).length > 0) {
        const currentCals = food.nutrition?.calories || 0;
        const correctedCals = corrections.calories || currentCals;

        if (currentCals > 0 && Math.abs(correctedCals - currentCals) / currentCals > 0.1) {
          // Update nutrition with corrections
          food.nutrition = {
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
    const totalVerifications = food.verificationCount + food.correctionCount;
    if (totalVerifications > 0) {
      food.confidence = food.verificationCount / totalVerifications;
    }

    // Update regional accuracy tracking
    if (region) {
      const regionKey = region;
      if (!food.regionalAccuracy) {
        food.regionalAccuracy = new Map();
      }

      const regionStats = food.regionalAccuracy.get(regionKey) || {
        verifiedCount: 0,
        correctedCount: 0,
        avgConfidence: food.confidence || 0
      };

      if (verified) {
        regionStats.verifiedCount += 1;
      } else {
        regionStats.correctedCount += 1;
      }

      regionStats.avgConfidence = (
        (regionStats.verifiedCount * food.confidence) +
        (regionStats.correctedCount * 0.5)
      ) / (regionStats.verifiedCount + regionStats.correctedCount);

      food.regionalAccuracy.set(regionKey, regionStats);
    }

    // Save updated food item
    await food.save();

    console.log('[FoodVerification] Verification saved:', {
      itemId,
      newConfidence: food.confidence,
      totalVerifications
    });

    res.json({
      success: true,
      newConfidence: food.confidence,
      verificationCount: food.verificationCount,
      correctionCount: food.correctionCount,
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
