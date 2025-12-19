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

export default router;
