import express from "express";
import { db } from "../config/db.js";
import { foodLogTable, recipesTable, dailyNutritionSummaryTable, waterLogTable, weightHistoryTable, moodLogTable, gamificationTable, nutritionGoalsTable } from "../db/schema.js";
import { FoodService } from "../services/foodService.js";
import { validateMacros, scaleNutrients } from "../utils/nutrition.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
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

    // 3. Update Daily Summary using PostgreSQL UPSERT (atomic operation)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use INSERT ... ON CONFLICT DO UPDATE for atomic upsert
    await db.insert(dailyNutritionSummaryTable)
      .values({
        userId,
        date: today,
        totalCalories: calories || 0,
        totalProtein: protein || 0,
        totalCarbs: carbs || 0,
        totalFats: fats || 0,
      })
      .onConflictDoUpdate({
        target: [dailyNutritionSummaryTable.userId, dailyNutritionSummaryTable.date],
        set: {
          totalCalories: sql`${dailyNutritionSummaryTable.totalCalories} + ${calories || 0}`,
          totalProtein: sql`${dailyNutritionSummaryTable.totalProtein} + ${protein || 0}`,
          totalCarbs: sql`${dailyNutritionSummaryTable.totalCarbs} + ${carbs || 0}`,
          totalFats: sql`${dailyNutritionSummaryTable.totalFats} + ${fats || 0}`,
          updatedAt: new Date(),
        },
      });

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

/**
 * GET /api/nutrition/summary
 * Get daily nutrition summary for a specific date or date range
 */
router.get("/summary", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { date, startDate, endDate, limit = 30 } = req.query;

    let whereClause = eq(dailyNutritionSummaryTable.userId, userId);

    if (date) {
      // Single date query
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      whereClause = and(whereClause, eq(dailyNutritionSummaryTable.date, targetDate));
    } else if (startDate && endDate) {
      // Date range query
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause = and(
        whereClause,
        gte(dailyNutritionSummaryTable.date, start),
        lte(dailyNutritionSummaryTable.date, end)
      );
    }

    const summaries = await db.select()
      .from(dailyNutritionSummaryTable)
      .where(whereClause)
      .orderBy(desc(dailyNutritionSummaryTable.date))
      .limit(Number(limit));

    res.json(summaries);
  } catch (error) {
    console.error("[NutritionSummary] Error:", error);
    res.status(500).json({ error: "Failed to fetch nutrition summary" });
  }
});

/**
 * GET /api/nutrition/water
 * Get water intake logs for a user
 */
router.get("/water", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { date, startDate, endDate, limit = 50 } = req.query;

    let whereClause = eq(waterLogTable.userId, userId);

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause = and(
        whereClause,
        gte(waterLogTable.loggedDate, targetDate),
        lte(waterLogTable.loggedDate, endOfDay)
      );
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause = and(
        whereClause,
        gte(waterLogTable.loggedDate, start),
        lte(waterLogTable.loggedDate, end)
      );
    }

    const logs = await db.select()
      .from(waterLogTable)
      .where(whereClause)
      .orderBy(desc(waterLogTable.loggedDate))
      .limit(Number(limit));

    res.json(logs);
  } catch (error) {
    console.error("[WaterLog] Error:", error);
    res.status(500).json({ error: "Failed to fetch water logs" });
  }
});

/**
 * GET /api/nutrition/weight
 * Get weight history for a user
 */
router.get("/weight", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { startDate, endDate, limit = 50 } = req.query;

    let whereClause = eq(weightHistoryTable.userId, userId);

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause = and(
        whereClause,
        gte(weightHistoryTable.recordedDate, start),
        lte(weightHistoryTable.recordedDate, end)
      );
    }

    const history = await db.select()
      .from(weightHistoryTable)
      .where(whereClause)
      .orderBy(desc(weightHistoryTable.recordedDate))
      .limit(Number(limit));

    res.json(history);
  } catch (error) {
    console.error("[WeightHistory] Error:", error);
    res.status(500).json({ error: "Failed to fetch weight history" });
  }
});

/**
 * GET /api/nutrition/mood
 * Get mood logs for a user
 */
router.get("/mood", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { date, startDate, endDate, limit = 50 } = req.query;

    let whereClause = eq(moodLogTable.userId, userId);

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      whereClause = and(
        whereClause,
        gte(moodLogTable.loggedDate, targetDate),
        lte(moodLogTable.loggedDate, endOfDay)
      );
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause = and(
        whereClause,
        gte(moodLogTable.loggedDate, start),
        lte(moodLogTable.loggedDate, end)
      );
    }

    const logs = await db.select()
      .from(moodLogTable)
      .where(whereClause)
      .orderBy(desc(moodLogTable.loggedDate))
      .limit(Number(limit));

    res.json(logs);
  } catch (error) {
    console.error("[MoodLog] Error:", error);
    res.status(500).json({ error: "Failed to fetch mood logs" });
  }
});

/**
 * GET /api/nutrition/dashboard
 * Get aggregated dashboard data for the user
 * Includes: today's stats, weekly trends, goals, gamification, recent logs
 */
router.get("/dashboard", async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Get last 7 days date range
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Get last 30 days date range
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Fetch all data in parallel for performance
    const [
      todaySummary,
      weekSummaries,
      todayFoodLogs,
      todayWaterLogs,
      recentWeightEntries,
      todayMoodLogs,
      goals,
      gamification,
    ] = await Promise.all([
      // Today's nutrition summary
      db.select()
        .from(dailyNutritionSummaryTable)
        .where(
          and(
            eq(dailyNutritionSummaryTable.userId, userId),
            eq(dailyNutritionSummaryTable.date, today)
          )
        )
        .limit(1),

      // Last 7 days summaries for trends
      db.select()
        .from(dailyNutritionSummaryTable)
        .where(
          and(
            eq(dailyNutritionSummaryTable.userId, userId),
            gte(dailyNutritionSummaryTable.date, sevenDaysAgo)
          )
        )
        .orderBy(desc(dailyNutritionSummaryTable.date)),

      // Today's food logs
      db.select()
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, today),
            lte(foodLogTable.loggedDate, endOfToday)
          )
        )
        .orderBy(desc(foodLogTable.loggedDate)),

      // Today's water intake
      db.select()
        .from(waterLogTable)
        .where(
          and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, today),
            lte(waterLogTable.loggedDate, endOfToday)
          )
        ),

      // Recent weight entries (last 5)
      db.select()
        .from(weightHistoryTable)
        .where(eq(weightHistoryTable.userId, userId))
        .orderBy(desc(weightHistoryTable.recordedDate))
        .limit(5),

      // Today's mood logs
      db.select()
        .from(moodLogTable)
        .where(
          and(
            eq(moodLogTable.userId, userId),
            gte(moodLogTable.loggedDate, today),
            lte(moodLogTable.loggedDate, endOfToday)
          )
        )
        .orderBy(desc(moodLogTable.loggedDate)),

      // User's nutrition goals
      db.select()
        .from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1),

      // Gamification stats
      db.select()
        .from(gamificationTable)
        .where(eq(gamificationTable.userId, userId))
        .limit(1),
    ]);

    // Calculate today's water total
    const todayWaterTotal = todayWaterLogs.reduce(
      (sum, log) => sum + parseFloat(log.amountLiters || 0),
      0
    );

    // Calculate weekly averages
    const weeklyAverages = weekSummaries.length > 0 ? {
      avgCalories: Math.round(
        weekSummaries.reduce((sum, day) => sum + (day.totalCalories || 0), 0) / weekSummaries.length
      ),
      avgProtein: Math.round(
        weekSummaries.reduce((sum, day) => sum + (day.totalProtein || 0), 0) / weekSummaries.length
      ),
      avgCarbs: Math.round(
        weekSummaries.reduce((sum, day) => sum + (day.totalCarbs || 0), 0) / weekSummaries.length
      ),
      avgFats: Math.round(
        weekSummaries.reduce((sum, day) => sum + (day.totalFats || 0), 0) / weekSummaries.length
      ),
    } : null;

    // Calculate streak (consecutive days with logged data)
    let currentStreak = 0;
    let checkDate = new Date(today);
    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);

      const hasSummary = weekSummaries.some(s => {
        const summaryDate = new Date(s.date);
        summaryDate.setHours(0, 0, 0, 0);
        return summaryDate.getTime() === dayStart.getTime();
      });

      if (hasSummary) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Build response
    const dashboard = {
      today: {
        date: today,
        nutrition: todaySummary[0] || {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFats: 0,
        },
        waterIntakeLiters: todayWaterTotal,
        foodLogs: todayFoodLogs,
        moodLogs: todayMoodLogs,
      },
      goals: goals[0] || null,
      gamification: gamification[0] || {
        xp: 0,
        level: 1,
        streak: 0,
        badges: [],
      },
      trends: {
        weeklyAverages,
        weekSummaries: weekSummaries.map(s => ({
          date: s.date,
          totalCalories: s.totalCalories,
          totalProtein: s.totalProtein,
          totalCarbs: s.totalCarbs,
          totalFats: s.totalFats,
        })),
        currentStreak,
      },
      recentWeight: recentWeightEntries,
    };

    res.json(dashboard);
  } catch (error) {
    console.error("[Dashboard] Error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

/**
 * POST /api/nutrition/goals
 * Save or update user's nutrition goals (UPSERT by userId)
 */
router.post("/goals", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {
      primaryGoal,
      dailyCalories,
      proteinG,
      carbsG,
      fatsG,
      waterLiters,
    } = req.body;

    const [row] = await db
      .insert(nutritionGoalsTable)
      .values({
        userId,
        primaryGoal,
        dailyCalories,
        proteinG,
        carbsG,
        fatsG,
        waterLiters,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: nutritionGoalsTable.userId,
        set: {
          primaryGoal,
          dailyCalories,
          proteinG,
          carbsG,
          fatsG,
          waterLiters,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json(row);
  } catch (err) {
    console.error("[NutritionGoals] Error:", err);
    res.status(500).json({
      error: "Failed to save nutrition goals",
      details: err.message,
    });
  }
});

export default router;
