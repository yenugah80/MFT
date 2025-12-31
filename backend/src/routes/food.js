import express from "express";
import multer from "multer";
import { FoodService } from "../services/foodService.js";
import { requireAuth } from "../middleware/auth.js";

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
 */
router.get("/barcode/:code", async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) return res.status(400).json({ error: "Barcode required" });

    const product = await FoodService.searchByBarcode(code);
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json(product);
  } catch (error) {
    console.error("[FoodBarcode] Error:", error);
    res.status(500).json({ error: "Barcode lookup failed" });
  }
});

/**
 * POST /api/food/analyze-image
 * Analyze a food image using AI.
 *
 * Body: {
 *   image: string (base64),
 *   highAccuracy?: boolean (use GPT-4o for 85-92% accuracy, default: false = gpt-4o-mini 75-85%),
 *   includeIngredients?: boolean (attempt to list individual ingredients, default: false)
 * }
 */
router.post("/analyze-image", async (req, res) => {
  try {
    const { image, highAccuracy = false, includeIngredients = false } = req.body;
    if (!image) return res.status(400).json({ error: "Image required" });

    const result = await FoodService.analyzeImage(image, {
      highAccuracy,
      includeIngredients,
    });
    if (!result) return res.status(500).json({ error: "Analysis failed" });

    res.json(result);
  } catch (error) {
    console.error("[FoodAnalyzeImage] Error:", error);
    res.status(500).json({ error: "Image analysis failed" });
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
 *   includeIngredients?: boolean (default: true)
 * }
 *
 * Returns: {
 *   items: [...food items with nutrition],
 *   ingredients: [breakdown of individual ingredients],
 *   multimodal: { hasVoice: boolean, voiceTranscript: string },
 *   source: 'multimodal'
 * }
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
      includeIngredients = true // Always include ingredients for multimodal
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

    // Add multimodal metadata to response
    result.multimodal = {
      hasVoice: !!voiceTranscript,
      voiceTranscript
    };
    result.source = 'multimodal';

    res.json(result);
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
            fat: corrections.fat || food.nutrition.fat
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
