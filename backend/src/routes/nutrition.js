import express from "express";
import { db } from "../config/db.js";
import { foodLogTable, recipesTable, dailyNutritionSummaryTable } from "../db/schema.js";
import { FoodService } from "../services/foodService.js";
import { validateMacros, scaleNutrients } from "../utils/nutrition.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";

// Configure Multer for temporary file storage
const upload = multer({ dest: "uploads/" });

// Initialize OpenAI (ensure OPENAI_API_KEY is in env)
// We use a lazy initialization or check for the key to avoid crashing if not set
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

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

/**
 * POST /api/nutrition/voice-log
 * Transcribe audio and analyze food content.
 */
router.post("/voice-log", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const filePath = req.file.path;

    if (!openai) {
      // Cleanup temp file
      fs.unlinkSync(filePath);
      return res.status(503).json({ error: "AI service unavailable (API Key missing)" });
    }

    // 1. Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
    });

    const text = transcription.text;
    console.log(`[VoiceLog] Transcribed: "${text}"`);

    // 2. Analyze text with GPT-4 (reuse existing logic if available, or call directly)
    // We'll reuse the FoodService.parseRecipe logic or similar AI analysis
    // For now, let's assume we have a helper or call GPT directly.
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a nutritionist. Analyze the user's spoken food log. 
          Return a JSON object with: 
          { 
            foodName, 
            description,
            calories (number), 
            protein (number), 
            carbs (number), 
            fats (number), 
            servingSize, 
            mealType,
            nutriscore (A/B/C/D/E),
            micros: {
              calcium (string with unit),
              iron (string with unit),
              vitaminA (string with unit),
              vitaminC (string with unit),
              potassium (string with unit)
            }
          }. 
          Estimate nutrition if not specified. Return ONLY JSON.`
        },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" },
    });

    const rawAnalysis = JSON.parse(completion.choices[0].message.content);
    
    // 3. Transform to standard app format
    const analysis = FoodService.transformAIResponse(rawAnalysis);

    // Cleanup temp file
    fs.unlinkSync(filePath);

    res.json(analysis);

  } catch (error) {
    console.error("[VoiceLog] Error:", error);
    // Cleanup temp file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Voice processing failed" });
  }
});

export default router;
