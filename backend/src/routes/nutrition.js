import express from "express";
import { db } from "../config/db.js";
import { foodLogTable, dailyNutritionSummaryTable, waterLogTable, weightHistoryTable, moodLogTable, gamificationTable, nutritionGoalsTable, userPortionPreferencesTable } from "../db/schema.js";
import { FoodService } from "../services/foodService.js";
import { validateMacros, scaleNutrients } from "../utils/nutrition.js";
import { parseTimezoneOffsetMinutes, getLocalDayRange, getLocalDateUTC, addDaysUTC, normalizeDateUTC } from "../utils/timezone.js";
import { ensureWaterLogTableShape, ensureDailyNutritionSummaryTableShape } from "../utils/schemaGuards.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";
import { calculateMealXP, awardXP, updateStreak, getTotalMealsLogged, getLastLogDate, initializeGamification, backfillXPFromHistory } from "../services/gamificationRewardService.js";
import { calculateLevel } from "../utils/levelCalculator.js";
import { checkAchievements } from "../services/achievementService.js";
import { errors, ErrorCodes } from "../utils/errorResponse.js";

// Configure Multer for temporary file storage
const upload = multer({ dest: "uploads/" });

// Initialize OpenAI (ensure OPENAI_API_KEY is in env)
// We use a lazy initialization or check for the key to avoid crashing if not set
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

const router = express.Router();

router.use(requireAuth);
router.use(async (req, res, next) => {
  await ensureDailyNutritionSummaryTableShape();
  await ensureWaterLogTableShape();
  next();
});

/**
 * POST /api/nutrition/log
 * Log a food item to the history with idempotency support.
 * Validates macros before saving.
 * PHASE 1 - TRUST FIX: Prevents duplicate entries using clientEventId
 */
router.post("/log", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {
      foodName, calories, protein, carbs, fats,
      servingSize, mealType, micros, nutriscore, ecoscore, novaScore, dietLabels, allergens, ingredients, barcode, imageUrl,
      clientEventId, sourceMeta, loggedDate
    } = req.body;

    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const parsedLoggedDate = loggedDate ? new Date(loggedDate) : new Date();
    const safeLoggedDate = Number.isNaN(parsedLoggedDate.getTime()) ? new Date() : parsedLoggedDate;

    // 1. Require clientEventId for idempotency
    if (!clientEventId) {
      return errors.missingField(res, 'clientEventId');
    }

    // 2. Validation Rule: Check Macro/Calorie consistency
    const validation = validateMacros(calories, protein, carbs, fats);
    if (!validation.isValid) {
      console.warn(`[NutritionLog] Macro mismatch for ${foodName}: Expected ${validation.expectedCalories}, got ${calories}`);
      // We don't block it, but we could flag it. For now, just warn.
    }

    // 3. Idempotent Insert: Use ON CONFLICT DO NOTHING
    // If (userId, clientEventId) already exists → returns empty array
    const result = await db.insert(foodLogTable)
      .values({
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
        clientEventId,
        sourceMeta: sourceMeta || {},
        loggedDate: safeLoggedDate,
      })
      .onConflictDoNothing({
        target: foodLogTable.clientEventId
      })
      .returning();

    const isNewEntry = result.length > 0;

    // 4. Only update daily summary if this is a NEW entry (not duplicate)
    const today = getLocalDateUTC(offsetMinutes, safeLoggedDate);

    if (isNewEntry) {
      // First entry of the day → INSERT
      // Subsequent entries → UPDATE with additive increment
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
    } else {
      // Duplicate detected, log for debugging
      console.log(`[NutritionLog] Duplicate prevented: clientEventId=${clientEventId}, food=${foodName}`);
    }

    // === GAMIFICATION INTEGRATION ===
    let gamificationResult = null;

    if (isNewEntry) {
      try {
        // 1. Calculate and award XP
        const { xp, mealNumber, dailyTotal } = await calculateMealXP(userId, safeLoggedDate, db);
        const { newXP, newLevel, leveledUp, currentLevelXP, nextLevelXP, progressPercent } = await awardXP(userId, xp, 'meal_log', db);

        // 2. Update streak
        const { streak, streakIncremented, previousStreak } = await updateStreak(
          userId,
          safeLoggedDate,
          db,
          offsetMinutes
        );

        // 3. Get last log date for achievement checking
        const lastLogDate = previousStreak > 0 ? await getLastLogDate(userId, db) : null;

        // 4. Check achievements
        const totalMeals = await getTotalMealsLogged(userId, db);
        const isWeekend = [0, 6].includes(new Date(safeLoggedDate).getDay());

        const achievements = await checkAchievements(userId, {
          totalMeals,
          level: newLevel,
          streak,
          lastLogDate,
          isWeekend,
        }, db);

        // 5. Prepare response
        gamificationResult = {
          xpEarned: xp,
          mealNumber,
          dailyXpTotal: dailyTotal,
          totalXP: newXP,
          level: newLevel,
          leveledUp,
          currentLevelXP,
          nextLevelXP,
          progressPercent,
          streak,
          streakIncremented,
          achievementsUnlocked: achievements.map(a => ({
            id: a.id,
            name: a.name,
            description: a.description,
            icon: a.icon,
            lottieSource: a.lottieSource,
            xp: a.xp,
            category: a.category,
          })),
        };

        console.log(`[Gamification] User ${userId}: +${xp} XP (meal #${mealNumber}), Level ${newLevel}, Streak ${streak}${achievements.length > 0 ? `, ${achievements.length} achievements` : ''}`);

      } catch (gamError) {
        // NON-BLOCKING: Log but don't fail meal logging
        console.error('[Gamification] Error processing rewards:', gamError);
        gamificationResult = { error: 'Gamification processing failed' };
      }
    }
    // === END GAMIFICATION INTEGRATION ===

    // 5. Fetch existing entry if duplicate (for consistent response)
    let entry = result[0] || null;
    if (!isNewEntry) {
      const existingEntries = await db.select()
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            eq(foodLogTable.clientEventId, clientEventId)
          )
        )
        .limit(1);

      entry = existingEntries[0] || null;

      // CRITICAL: If entry still null after fetch, something went wrong
      if (!entry) {
        console.error(`[CRITICAL] Entry not found for clientEventId: ${clientEventId}`);
        return errors.internal(res, 'Internal error: Entry not found after duplicate detection');
      }
    }

    // 6. Fetch current daily total for frontend reconciliation
    const [dailyTotal] = await db.select()
      .from(dailyNutritionSummaryTable)
      .where(
        and(
          eq(dailyNutritionSummaryTable.userId, userId),
          eq(dailyNutritionSummaryTable.date, today)
        )
      )
      .limit(1);

    // 7. Return response with duplicate detection
    res.json({
      entry,
      wasDuplicate: !isNewEntry,
      currentDailyTotal: dailyTotal || {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
      },
      gamification: gamificationResult,
    });

  } catch (error) {
    console.error("[NutritionLog] Error:", error);

    // Handle unique constraint violation (shouldn't happen with onConflictDoNothing, but just in case)
    if (error.code === '23505') {
      return res.status(409).json({
        error: "Duplicate entry detected",
        wasDuplicate: true
      });
    }

    errors.internal(res, 'Failed to log food');
  }
});

/**
 * PUT /api/nutrition/log/:id
 * Edit an existing food log entry.
 * Updates the entry and adjusts daily summary with delta calculation.
 * PHASE 1 - TRUST FIX: Ensures accurate daily totals after edits
 */
router.put("/log/:id", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const logId = parseInt(req.params.id);
    const {
      foodName, calories, protein, carbs, fats,
      servingSize, mealType, micros, nutriscore, ecoscore, novaScore, dietLabels, allergens, ingredients, barcode, imageUrl
    } = req.body;

    if (isNaN(logId)) {
      return errors.invalidValue(res, 'id', 'must be a valid number');
    }

    // 1. Fetch the existing entry
    const [existingEntry] = await db.select()
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.id, logId),
          eq(foodLogTable.userId, userId) // Security: ensure user owns this log
        )
      )
      .limit(1);

    if (!existingEntry) {
      return errors.notFound(res, 'Food log entry');
    }

    // 2. Calculate deltas for daily summary update
    const caloriesDelta = (calories || 0) - (existingEntry.calories || 0);
    const proteinDelta = (protein || 0) - (existingEntry.protein || 0);
    const carbsDelta = (carbs || 0) - (existingEntry.carbs || 0);
    const fatsDelta = (fats || 0) - (existingEntry.fats || 0);

    // 3. Update the food log entry
    const [updatedEntry] = await db.update(foodLogTable)
      .set({
        foodName: foodName !== undefined ? foodName : existingEntry.foodName,
        calories: calories !== undefined ? calories : existingEntry.calories,
        protein: protein !== undefined ? protein : existingEntry.protein,
        carbs: carbs !== undefined ? carbs : existingEntry.carbs,
        fats: fats !== undefined ? fats : existingEntry.fats,
        servingSize: servingSize !== undefined ? servingSize : existingEntry.servingSize,
        mealType: mealType !== undefined ? mealType : existingEntry.mealType,
        micros: micros !== undefined ? micros : existingEntry.micros,
        nutriscore: nutriscore !== undefined ? nutriscore : existingEntry.nutriscore,
        ecoscore: ecoscore !== undefined ? ecoscore : existingEntry.ecoscore,
        novaScore: novaScore !== undefined ? novaScore : existingEntry.novaScore,
        dietLabels: dietLabels !== undefined ? dietLabels : existingEntry.dietLabels,
        allergens: allergens !== undefined ? allergens : existingEntry.allergens,
        ingredients: ingredients !== undefined ? ingredients : existingEntry.ingredients,
        barcode: barcode !== undefined ? barcode : existingEntry.barcode,
        imageUrl: imageUrl !== undefined ? imageUrl : existingEntry.imageUrl,
      })
      .where(eq(foodLogTable.id, logId))
      .returning();

    // 4. Update daily summary with deltas (can be positive or negative)
    const logDate = new Date(existingEntry.loggedDate);
    logDate.setHours(0, 0, 0, 0);

    if (caloriesDelta !== 0 || proteinDelta !== 0 || carbsDelta !== 0 || fatsDelta !== 0) {
      await db.update(dailyNutritionSummaryTable)
        .set({
          totalCalories: sql`${dailyNutritionSummaryTable.totalCalories} + ${caloriesDelta}`,
          totalProtein: sql`${dailyNutritionSummaryTable.totalProtein} + ${proteinDelta}`,
          totalCarbs: sql`${dailyNutritionSummaryTable.totalCarbs} + ${carbsDelta}`,
          totalFats: sql`${dailyNutritionSummaryTable.totalFats} + ${fatsDelta}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dailyNutritionSummaryTable.userId, userId),
            eq(dailyNutritionSummaryTable.date, logDate)
          )
        );
    }

    // 5. Fetch updated daily total for frontend reconciliation
    const [dailyTotal] = await db.select()
      .from(dailyNutritionSummaryTable)
      .where(
        and(
          eq(dailyNutritionSummaryTable.userId, userId),
          eq(dailyNutritionSummaryTable.date, logDate)
        )
      )
      .limit(1);

    res.json({
      entry: updatedEntry,
      deltas: {
        calories: caloriesDelta,
        protein: proteinDelta,
        carbs: carbsDelta,
        fats: fatsDelta,
      },
      currentDailyTotal: dailyTotal || {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
      },
    });

  } catch (error) {
    console.error("[NutritionLog Edit] Error:", error);
    errors.internal(res, 'Failed to update food log');
  }
});

/**
 * DELETE /api/nutrition/log/:id
 * Delete a food log entry.
 * Subtracts the entry's nutrition from the daily summary.
 * PHASE 1 - TRUST FIX: Ensures accurate daily totals after deletions
 */
router.delete("/log/:id", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const logId = parseInt(req.params.id);

    if (isNaN(logId)) {
      return errors.invalidValue(res, 'id', 'must be a valid number');
    }

    // 1. Fetch the existing entry before deletion
    const [existingEntry] = await db.select()
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.id, logId),
          eq(foodLogTable.userId, userId) // Security: ensure user owns this log
        )
      )
      .limit(1);

    if (!existingEntry) {
      return errors.notFound(res, 'Food log entry');
    }

    // 2. Delete the entry
    await db.delete(foodLogTable)
      .where(eq(foodLogTable.id, logId));

    // 3. Subtract from daily summary
    const logDate = new Date(existingEntry.loggedDate);
    logDate.setHours(0, 0, 0, 0);

    await db.update(dailyNutritionSummaryTable)
      .set({
        totalCalories: sql`${dailyNutritionSummaryTable.totalCalories} - ${existingEntry.calories || 0}`,
        totalProtein: sql`${dailyNutritionSummaryTable.totalProtein} - ${existingEntry.protein || 0}`,
        totalCarbs: sql`${dailyNutritionSummaryTable.totalCarbs} - ${existingEntry.carbs || 0}`,
        totalFats: sql`${dailyNutritionSummaryTable.totalFats} - ${existingEntry.fats || 0}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dailyNutritionSummaryTable.userId, userId),
          eq(dailyNutritionSummaryTable.date, logDate)
        )
      );

    // 4. Fetch updated daily total for frontend reconciliation
    const [dailyTotal] = await db.select()
      .from(dailyNutritionSummaryTable)
      .where(
        and(
          eq(dailyNutritionSummaryTable.userId, userId),
          eq(dailyNutritionSummaryTable.date, logDate)
        )
      )
      .limit(1);

    res.json({
      success: true,
      deletedEntry: existingEntry,
      currentDailyTotal: dailyTotal || {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
      },
    });

  } catch (error) {
    console.error("[NutritionLog Delete] Error:", error);
    errors.internal(res, 'Failed to delete food log');
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
    errors.internal(res, 'Failed to fetch history');
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
    if (!text) return errors.missingField(res, 'text');

    // We reuse the AI text fallback but frame it for recipes
    // In a real app, we'd add a specific method to FoodService for recipes
    const analysis = await FoodService.generateFoodDetailsAI(
      `Parse this recipe and calculate total nutrition per serving: ${text}`
    );

    res.json(analysis);
  } catch (error) {
    console.error("[RecipeParse] Error:", error);
    errors.internal(res, 'Recipe parsing failed');
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
      return errors.badRequest(res, 'No audio file provided');
    }

    const filePath = req.file.path;

    if (!openai) {
      // Cleanup temp file
      fs.unlinkSync(filePath);
      return errors.externalService(res, 'OpenAI');
    }

    // 1. Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "gpt-4o-mini-transcribe",
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
    errors.internal(res, 'Voice processing failed');
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
    errors.internal(res, 'Failed to fetch nutrition summary');
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
    errors.internal(res, 'Failed to fetch water logs');
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
    errors.internal(res, 'Failed to fetch weight history');
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
    errors.internal(res, 'Failed to fetch mood logs');
  }
});

/**
 * GET /api/nutrition/dashboard
 * Get aggregated dashboard data for the user
 * Includes: today's stats, weekly trends, goals, gamification, recent logs
 */
router.get("/dashboard", async (req, res) => {
  try {
    await ensureWaterLogTableShape();
    const userId = req.auth.userId;

    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const { start: todayStart, end: todayEnd } = getLocalDayRange(offsetMinutes);
    const today = getLocalDateUTC(offsetMinutes);

    // Get last 7 days date range
    const sevenDaysAgo = addDaysUTC(today, -7);

    // Get last 30 days date range
    const thirtyDaysAgo = addDaysUTC(today, -30);

    // Get last 365 days date range for streaks
    const streakWindowStart = addDaysUTC(today, -365);

    // Fetch all data in parallel for performance
    const [
      todaySummary,
      weekSummaries,
      todayFoodLogs,
      todayWaterLogs,
      recentWeightEntries,
      todayMoodLogs,
      streakFoodLogs,
      streakWaterLogs,
      streakMoodLogs,
      goals,
      gamification,
      todayActivityLogsResult,
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

      // Today's food logs (PHASE 1 - TRUST FIX: Deduplicated by clientEventId)
      // Uses DISTINCT ON to ensure only one entry per clientEventId
      // This handles edge cases during migration where duplicates might exist
      db.selectDistinctOn([foodLogTable.clientEventId])
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, todayStart),
            lte(foodLogTable.loggedDate, todayEnd)
          )
        )
        .orderBy(foodLogTable.clientEventId, desc(foodLogTable.loggedDate)),

      // Today's water intake
      db.select()
        .from(waterLogTable)
        .where(
          and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, todayStart),
            lte(waterLogTable.loggedDate, todayEnd)
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
            gte(moodLogTable.loggedDate, todayStart),
            lte(moodLogTable.loggedDate, todayEnd)
          )
        )
        .orderBy(desc(moodLogTable.loggedDate)),

      // Streak window food logs (all activity days)
      db.select({ loggedDate: foodLogTable.loggedDate })
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, streakWindowStart)
          )
        ),

      // Streak window water logs
      db.select({ loggedDate: waterLogTable.loggedDate })
        .from(waterLogTable)
        .where(
          and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, streakWindowStart)
          )
        ),

      // Streak window mood logs
      db.select({ loggedDate: moodLogTable.loggedDate, timezoneOffset: moodLogTable.timezoneOffset })
        .from(moodLogTable)
        .where(
          and(
            eq(moodLogTable.userId, userId),
            gte(moodLogTable.loggedDate, streakWindowStart)
          )
        ),

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

      // Today's activity logs (raw SQL since table isn't in Drizzle schema)
      db.execute(sql`
        SELECT * FROM activity_logs
        WHERE user_id = ${userId}
        AND logged_at >= ${todayStart}
        AND logged_at <= ${todayEnd}
        ORDER BY logged_at DESC
      `),
    ]);

    // Extract today's activity logs from raw SQL result
    const todayActivityLogs = todayActivityLogsResult?.rows || [];

    // Calculate today's water total
    const todayWaterTotal = todayWaterLogs.reduce((sum, log) => {
      const hydrationValue = parseFloat(log.hydrationLiters || 0);
      if (hydrationValue > 0) return sum + hydrationValue;
      return sum + parseFloat(log.amountLiters || 0);
    }, 0);

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

    // Calculate streak (consecutive days with ANY activity)
    const activityDays = new Set();
    const fallbackOffset = Number.isFinite(offsetMinutes) ? offsetMinutes : 0;

    const addActivityDay = (loggedDate, tzOffset) => {
      if (!loggedDate) return;
      const offset = Number.isFinite(tzOffset) ? tzOffset : fallbackOffset;
      const day = getLocalDateUTC(offset, loggedDate);
      activityDays.add(day.getTime());
    };

    streakFoodLogs.forEach(log => addActivityDay(log.loggedDate, fallbackOffset));
    streakWaterLogs.forEach(log => addActivityDay(log.loggedDate, fallbackOffset));
    streakMoodLogs.forEach(log => addActivityDay(log.loggedDate, log.timezoneOffset));

    let currentStreak = 0;
    const hasTodayActivity = activityDays.has(today.getTime());
    let checkDate = hasTodayActivity ? new Date(today) : addDaysUTC(today, -1);

    for (let i = 0; i < 365; i++) {
      if (activityDays.has(checkDate.getTime())) {
        currentStreak++;
        checkDate = addDaysUTC(checkDate, -1);
      } else {
        break;
      }
    }

    // ============================================================================
    // USER LIFECYCLE DETECTION
    // Properly distinguishes brand new users from returning users who missed a day
    // Multi-billion dollar app approach: lifecycle = LIFETIME engagement, not TODAY
    // ============================================================================
    const totalDaysWithLogs = activityDays.size;  // Already computed for streak!
    const hasLoggedToday = activityDays.has(today.getTime());

    // Calculate days since last activity
    let lastActivityDate = null;
    if (activityDays.size > 0) {
      const sortedDays = Array.from(activityDays).sort((a, b) => b - a);
      lastActivityDate = new Date(sortedDays[0]);
    }
    const daysSinceLastLog = lastActivityDate
      ? Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Determine lifecycle stage (single source of truth)
    let lifecycleStage;
    if (totalDaysWithLogs === 0) {
      lifecycleStage = 'brand_new';
    } else if (totalDaysWithLogs < 3) {
      lifecycleStage = 'onboarding';
    } else if (totalDaysWithLogs < 7) {
      lifecycleStage = 'building';
    } else if (totalDaysWithLogs < 30) {
      lifecycleStage = 'established';
    } else {
      lifecycleStage = 'power_user';
    }

    // isReturning is a MODIFIER, not a stage
    // True when: has history, nothing logged today, was active within last 30 days
    const isReturning = totalDaysWithLogs > 0 &&
                        !hasLoggedToday &&
                        daysSinceLastLog !== null &&
                        daysSinceLastLog <= 30;

    // PHASE 3.2 - API FIX: Aggregate micronutrients from today's food logs
    const todayMicros = {};
    todayFoodLogs.forEach(log => {
      if (log.micros && typeof log.micros === 'object') {
        Object.entries(log.micros).forEach(([key, value]) => {
          // Handle different micronutrient formats: "10mg", 10, { value: 10, unit: "mg" }
          let numValue;
          if (typeof value === 'number') {
            numValue = value;
          } else if (typeof value === 'object' && value.value !== undefined) {
            numValue = value.value;
          } else if (typeof value === 'string') {
            numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
          }

          if (!isNaN(numValue) && numValue > 0) {
            todayMicros[key] = (todayMicros[key] || 0) + numValue;
          }
        });
      }
    });

    // Build response
    let gamificationRow = gamification[0];
    if (!gamificationRow) {
      gamificationRow = await initializeGamification(userId, db);
    }

    // Calculate level info from XP - this is the source of truth, not DB level
    // CRITICAL FIX: Always use freshly calculated level, not potentially stale DB value
    const levelInfo = calculateLevel(gamificationRow?.xp || 0);
    const gamificationWithLevel = {
      ...gamificationRow,
      level: levelInfo.level,           // Override DB level with calculated level
      nextLevelXp: levelInfo.nextLevelXp,
      currentLevelXp: levelInfo.currentLevelXP,
      progressPercent: levelInfo.progressPercent,
    };

    const dashboard = {
      today: {
        date: today,
        nutrition: {
          ...(todaySummary[0] || {
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFats: 0,
          }),
          micros: todayMicros, // Include aggregated micronutrients
        },
        waterIntakeLiters: todayWaterTotal,
        waterLogs: todayWaterLogs,
        foodLogs: todayFoodLogs,
        moodLogs: todayMoodLogs,
        activityLogs: todayActivityLogs,
        activityMinutes: todayActivityLogs.reduce((sum, log) => sum + (parseInt(log.duration_minutes) || 0), 0),
        hydrationCelebratedAt: todaySummary[0]?.hydrationCelebratedAt || null,
      },
      goals: goals[0] || null,
      gamification: gamificationWithLevel,
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
      // USER LIFECYCLE - Single source of truth for user state detection
      userLifecycle: {
        stage: lifecycleStage,           // 'brand_new' | 'onboarding' | 'building' | 'established' | 'power_user'
        isReturning,                     // Modifier: has history but nothing today
        hasLoggedToday,                  // Any activity today
        daysSinceLastLog,                // Gap in days (null if brand new)
        totalDaysWithLogs,               // Distinct days with any activity (lifetime)
        totalMealsLogged: gamificationRow?.totalMealsLogged || 0,
        reachedFirstMilestone: (gamificationRow?.totalMealsLogged || 0) >= 3,
      },
    };

    res.json(dashboard);
  } catch (error) {
    console.error("[Dashboard] Error:", error);
    errors.internal(res, 'Failed to fetch dashboard data');
  }
});

/**
 * POST /api/nutrition/backfill-xp
 * Calculates and awards XP from all historical logs
 * Use this to credit users with XP they should have earned before XP system was added
 */
router.post("/backfill-xp", async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[Backfill] Starting XP backfill for user ${userId}`);

    const result = await backfillXPFromHistory(userId, db);

    res.json({
      success: true,
      message: `Backfilled ${result.totalXP} XP from your historical logs!`,
      ...result,
    });
  } catch (err) {
    console.error("[Backfill] Error:", err);
    res.status(500).json({
      error: "Failed to backfill XP",
      details: err.message,
    });
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

/**
 * PATCH /api/nutrition/log/:id/portion
 * Track portion adjustments and update learning preferences
 * Part of Phase 5: User Portion Learning
 */
router.patch("/log/:id/portion", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;
    const { portionAmount, portionUnit, canonicalName } = req.body;

    if (!portionAmount || !portionUnit) {
      return res.status(400).json({
        error: "portionAmount and portionUnit are required",
      });
    }

    // Update the food log entry
    const [updatedLog] = await db
      .update(foodLogTable)
      .set({
        servingSize: `${portionAmount} ${portionUnit}`,
        updatedAt: new Date(),
      })
      .where(and(eq(foodLogTable.id, parseInt(id)), eq(foodLogTable.userId, userId)))
      .returning();

    if (!updatedLog) {
      return res.status(404).json({
        error: "Food log entry not found",
      });
    }

    // Track the portion adjustment in learning table
    if (canonicalName) {
      await _trackPortionAdjustment(userId, canonicalName, portionAmount, portionUnit);
    }

    res.json({
      success: true,
      foodLog: updatedLog,
    });
  } catch (err) {
    console.error("[NutritionPortion] Error:", err);
    res.status(500).json({
      error: "Failed to update portion",
      details: err.message,
    });
  }
});

/**
 * Helper: Track portion adjustment and update learning preferences
 * Implements the learning algorithm:
 * - After 5 adjustments, confidence = 1.0 (100% precise)
 * - Uses confidence to weight portion suggestions
 */
async function _trackPortionAdjustment(userId, canonicalName, portionAmount, portionUnit) {
  try {
    // Check if preference already exists
    const existing = await db
      .select()
      .from(userPortionPreferencesTable)
      .where(
        and(
          eq(userPortionPreferencesTable.userId, userId),
          eq(userPortionPreferencesTable.canonicalName, canonicalName)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing preference
      const currentPreference = existing[0];
      const newAdjustmentCount = currentPreference.adjustmentCount + 1;

      // Confidence grows: after 5 adjustments, reach max (1.0)
      // 0.2 → 0.4 → 0.6 → 0.8 → 1.0
      const newConfidenceScore = Math.min(newAdjustmentCount * 0.2, 1.0);

      // Average the portion with previous preference
      const avgAmount =
        (parseFloat(currentPreference.preferredPortionAmount) * currentPreference.adjustmentCount +
          parseFloat(portionAmount)) /
        newAdjustmentCount;

      await db
        .update(userPortionPreferencesTable)
        .set({
          preferredPortionAmount: parseFloat(avgAmount.toFixed(2)),
          preferredPortionUnit: portionUnit,
          adjustmentCount: newAdjustmentCount,
          confidenceScore: parseFloat(newConfidenceScore.toFixed(2)),
          totalLoggingCount: currentPreference.totalLoggingCount + 1,
          lastUsed: new Date(),
          lastAdjustedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userPortionPreferencesTable.id, currentPreference.id));

      console.log(
        `[PortionLearning] Updated ${canonicalName} for user ${userId}: ` +
        `${newAdjustmentCount} adjustments, confidence: ${(newConfidenceScore * 100).toFixed(0)}%`
      );
    } else {
      // Create new preference
      await db
        .insert(userPortionPreferencesTable)
        .values({
          userId,
          canonicalName,
          preferredPortionAmount: parseFloat(portionAmount),
          preferredPortionUnit: portionUnit,
          adjustmentCount: 1,
          confidenceScore: 0.2, // 20% confidence on first adjustment
          totalLoggingCount: 1,
          lastUsed: new Date(),
          lastAdjustedAt: new Date(),
        });

      console.log(
        `[PortionLearning] Created new preference for ${canonicalName} for user ${userId}`
      );
    }
  } catch (err) {
    // Log error but don't fail the request
    console.error("[PortionLearning] Error tracking adjustment:", err);
  }
}

export default router;
