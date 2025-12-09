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

export default router;
