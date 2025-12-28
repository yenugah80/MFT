import express from "express";
import { FoodService } from "../services/foodService.js";
import { requireAuth } from "../middleware/auth.js";

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
router.post("/transcribe-voice", async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const audioFile = req.files.audio;
    const language = req.body.language || 'en';

    // Validate file size (max 25MB as per OpenAI limits)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return res.status(400).json({ error: "Audio file too large (max 25MB)" });
    }

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm'];
    if (!validTypes.some(type => audioFile.mimetype.includes(type))) {
      return res.status(400).json({ error: "Invalid audio format. Supported: m4a, mp3, wav, webm" });
    }

    console.log(`[FoodTranscribeVoice] Transcribing audio: ${audioFile.name}, size: ${audioFile.size} bytes`);

    // Transcribe voice using FoodService
    const result = await FoodService.transcribeVoice(audioFile.data, { language });

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
router.post("/analyze-voice", async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.files || !req.files.audio) {
      return res.status(400).json({ error: "Audio file required" });
    }

    const audioFile = req.files.audio;
    const language = req.body.language || 'en';

    // Validate file size (max 25MB as per OpenAI limits)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return res.status(400).json({ error: "Audio file too large (max 25MB)" });
    }

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm'];
    if (!validTypes.some(type => audioFile.mimetype.includes(type))) {
      return res.status(400).json({ error: "Invalid audio format. Supported: m4a, mp3, wav, webm" });
    }

    console.log(`[FoodAnalyzeVoice] Processing audio: ${audioFile.name}, size: ${audioFile.size} bytes`);

    // Analyze voice using FoodService
    const result = await FoodService.analyzeVoice(audioFile.data, { language });

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

export default router;
