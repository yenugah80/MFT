import express from "express";
import { db } from "../config/db.js";
import { foodLogTable, recipesTable, dailyNutritionSummaryTable } from "../db/schema.js";
import { FoodService } from "../services/foodService.js";
import { validateMacros, scaleNutrients } from "../utils/nutrition.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

/**
 * POST /api/nutrition/log
 * Log a food item to the history.
 * Validates macros before saving.
 */
router.post("/log", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { 
      foodName, calories, protein, carbs, fats, 
      servingSize, mealType, micros, nutriscore, ecoscore, novaScore, dietLabels, allergens, ingredients, barcode, imageUrl 
    } = req.body;

    // 1. Validation Rule: Check Macro/Calorie consistency
    const validation = validateMacros(calories, protein, carbs, fats);
    if (!validation.isValid) {
      console.warn(`[NutritionLog] Macro mismatch for ${foodName}: Expected ${validation.expectedCalories}, got ${calories}`);
      // We don't block it, but we could flag it. For now, just warn.
    }

    // 2. Save to DB
    const [entry] = await db.insert(foodLogTable).values({
      userId,
      foodName,
      calories,
      protein,
      carbs,
      fats,
      servingSize,
      mealType,
      micros: micros || {},
      nutriscore,
      ecoscore,
      novaScore,
      dietLabels: dietLabels || [],
      allergens: allergens || [],
      ingredients: ingredients || [],
      barcode,
      imageUrl,
      loggedDate: new Date(),
    }).returning();

    // 3. Update Daily Summary (Simple aggregation)
    // In a real app, you might use a trigger or a separate service, but here we do it inline.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if summary exists
    const existingSummary = await db.query.dailyNutritionSummaryTable.findFirst({
      where: and(
        eq(dailyNutritionSummaryTable.userId, userId),
        eq(dailyNutritionSummaryTable.date, today)
      )
    });

    if (existingSummary) {
      await db.update(dailyNutritionSummaryTable)
        .set({
          totalCalories: existingSummary.totalCalories + (calories || 0),
          totalProtein: existingSummary.totalProtein + (protein || 0),
          totalCarbs: existingSummary.totalCarbs + (carbs || 0),
          totalFats: existingSummary.totalFats + (fats || 0),
        })
        .where(eq(dailyNutritionSummaryTable.id, existingSummary.id));
    } else {
      await db.insert(dailyNutritionSummaryTable).values({
        userId,
        date: today,
        totalCalories: calories || 0,
        totalProtein: protein || 0,
        totalCarbs: carbs || 0,
        totalFats: fats || 0,
      });
    }

    res.json(entry);
  } catch (error) {
    console.error("[NutritionLog] Error:", error);
    res.status(500).json({ error: "Failed to log food" });
  }
});

/**
 * GET /api/nutrition/history
 * Get food logs for a specific date or range.
 */
router.get("/history", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { date, limit = 50 } = req.query;
    
    let whereClause = eq(foodLogTable.userId, userId);
    
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      
      whereClause = and(
        whereClause,
        gte(foodLogTable.loggedDate, start),
        lte(foodLogTable.loggedDate, end)
      );
    }

    const logs = await db.select()
      .from(foodLogTable)
      .where(whereClause)
      .orderBy(desc(foodLogTable.loggedDate))
      .limit(Number(limit));

    res.json(logs);
  } catch (error) {
    console.error("[NutritionHistory] Error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

/**
 * POST /api/nutrition/analyze-plate
 * Uses AI (Vision) to detect food, estimate portions, and return nutrition.
 * Replaces local YOLOv8 for cloud-native scalability.
 */
router.post("/analyze-plate", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Image required" });
    }

    // Use the robust FoodService we built
    const analysis = await FoodService.analyzeImage(imageBase64);
    
    if (!analysis) {
      return res.status(422).json({ error: "Could not analyze food in image" });
    }

    res.json(analysis);
  } catch (error) {
    console.error("[AnalyzePlate] Error:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

/**
 * POST /api/nutrition/recipe/parse
 * Parses a recipe text or URL (via text content) to extract ingredients and nutrition.
 * Uses NLP (DistilBERT-like capabilities via LLM).
 */
router.post("/recipe/parse", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Recipe text required" });

    // We reuse the AI text fallback but frame it for recipes
    // In a real app, we'd add a specific method to FoodService for recipes
    const analysis = await FoodService.generateFoodDetailsAI(
      `Parse this recipe and calculate total nutrition per serving: ${text}`
    );

    res.json(analysis);
  } catch (error) {
    console.error("[RecipeParse] Error:", error);
    res.status(500).json({ error: "Recipe parsing failed" });
  }
});

/**
 * POST /api/nutrition/scale
 * Helper endpoint to scale a food item's nutrition.
 */
router.post("/scale", (req, res) => {
  const { nutrients, baseAmount, targetAmount } = req.body;
  const scaled = scaleNutrients(nutrients, baseAmount, targetAmount);
  res.json(scaled);
});

export default router;
