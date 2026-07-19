import express from "express";
import { db } from "../config/db.js";
import { foodLogTable, dailyNutritionSummaryTable, waterLogTable, weightHistoryTable, moodLogTable, gamificationTable, nutritionGoalsTable, userPortionPreferencesTable, profilesTable } from "../db/schema.js";
import { FoodService } from "../services/foodService.js";
import { validateMacros, scaleNutrients } from "../utils/nutrition.js";
import { parseTimezoneOffsetMinutes, getLocalDayRange, getLocalDateUTC, addDaysUTC, normalizeDateUTC, toDateStr } from "../utils/timezone.js";
import { ensureWaterLogTableShape, ensureDailyNutritionSummaryTableShape, ensureFoodLogTableShape, ensureGamificationTableShape } from "../utils/schemaGuards.js";
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
import { invalidateUserSignals } from "../services/userSignalCacheService.js";
import { triggerBackgroundAnalysis } from "../services/laggedCorrelationService.js";

// Configure Multer for temporary file storage
const upload = multer({ dest: "uploads/" });

// Initialize OpenAI (ensure OPENAI_API_KEY is in env)
// We use a lazy initialization or check for the key to avoid crashing if not set
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

const router = express.Router();

router.use(requireAuth());
router.use(async (req, res, next) => {
  await ensureDailyNutritionSummaryTableShape();
  await ensureWaterLogTableShape();
  await ensureFoodLogTableShape();
  await ensureGamificationTableShape();
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const {
      foodName, calories, protein, carbs, fats, fiber, sugar, sodium,
      servingSize, mealType, micros, nutriscore, ecoscore, novaScore, dietLabels, allergens, ingredients, barcode, imageUrl,
      clientEventId, sourceMeta, loggedDate,
      cuisine, cookingMethod, aiModel, aiConfidence,
      voiceTranscript, multimodalSource, ingredientsBreakdown
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
        fiber: fiber ?? null,
        sugar: sugar ?? null,
        sodium: sodium ?? null,
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
        cuisine: cuisine || null,
        cookingMethod: cookingMethod || null,
        aiModel: aiModel || null,
        aiConfidence: aiConfidence ?? null,
        voiceTranscript: voiceTranscript || null,
        multimodalSource: multimodalSource || {},
        ingredientsBreakdown: ingredientsBreakdown || [],
      })
      .onConflictDoNothing({
        target: foodLogTable.clientEventId
      })
      .returning();

    const isNewEntry = result.length > 0;

    // Invalidate the user signal cache so the next recommendation fetch
    // reflects the new nutritional intake (affects gap calculations)
    if (isNewEntry) {
      invalidateUserSignals(userId);
    }

    // 4. Only update daily summary if this is a NEW entry (not duplicate)
    const today = getLocalDateUTC(offsetMinutes, safeLoggedDate);

    if (isNewEntry) {
      // First entry of the day → INSERT
      // Subsequent entries → UPDATE with additive increment
      await db.insert(dailyNutritionSummaryTable)
        .values({
          userId,
          date: toDateStr(today),
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
          eq(dailyNutritionSummaryTable.date, toDateStr(today))
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

    // Background: refresh lagged correlations after a new food log.
    // Throttled to once per 24h per user so frequent logging doesn't hammer the DB.
    if (isNewEntry) triggerBackgroundAnalysis(userId);

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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
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
    const logDateStr = toDateStr(logDate);

    if (caloriesDelta !== 0 || proteinDelta !== 0 || carbsDelta !== 0 || fatsDelta !== 0) {
      await db.update(dailyNutritionSummaryTable)
        .set({
          totalCalories: sql`GREATEST(0, ${dailyNutritionSummaryTable.totalCalories} + ${caloriesDelta})`,
          totalProtein: sql`GREATEST(0, ${dailyNutritionSummaryTable.totalProtein} + ${proteinDelta})`,
          totalCarbs: sql`GREATEST(0, ${dailyNutritionSummaryTable.totalCarbs} + ${carbsDelta})`,
          totalFats: sql`GREATEST(0, ${dailyNutritionSummaryTable.totalFats} + ${fatsDelta})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dailyNutritionSummaryTable.userId, userId),
            eq(dailyNutritionSummaryTable.date, logDateStr)
          )
        );
    }

    // 5. Fetch updated daily total for frontend reconciliation
    const [dailyTotal] = await db.select()
      .from(dailyNutritionSummaryTable)
      .where(
        and(
          eq(dailyNutritionSummaryTable.userId, userId),
          eq(dailyNutritionSummaryTable.date, logDateStr)
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
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
    const logDateStr = toDateStr(logDate);

    await db.update(dailyNutritionSummaryTable)
      .set({
        totalCalories: sql`GREATEST(0, ${dailyNutritionSummaryTable.totalCalories} - ${existingEntry.calories || 0})`,
        totalProtein: sql`GREATEST(0, ${dailyNutritionSummaryTable.totalProtein} - ${existingEntry.protein || 0})`,
        totalCarbs: sql`GREATEST(0, ${dailyNutritionSummaryTable.totalCarbs} - ${existingEntry.carbs || 0})`,
        totalFats: sql`GREATEST(0, ${dailyNutritionSummaryTable.totalFats} - ${existingEntry.fats || 0})`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dailyNutritionSummaryTable.userId, userId),
          eq(dailyNutritionSummaryTable.date, logDateStr)
        )
      );

    // 4. Fetch updated daily total for frontend reconciliation
    const [dailyTotal] = await db.select()
      .from(dailyNutritionSummaryTable)
      .where(
        and(
          eq(dailyNutritionSummaryTable.userId, userId),
          eq(dailyNutritionSummaryTable.date, logDateStr)
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { date, startDate, endDate, limit = 30 } = req.query;

    let whereClause = eq(dailyNutritionSummaryTable.userId, userId);

    if (date) {
      // Single date query — date column needs YYYY-MM-DD string
      const targetDate = new Date(date);
      targetDate.setUTCHours(0, 0, 0, 0);
      whereClause = and(whereClause, eq(dailyNutritionSummaryTable.date, toDateStr(targetDate)));
    } else if (startDate && endDate) {
      // Date range query — date column needs YYYY-MM-DD string
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(0, 0, 0, 0);
      whereClause = and(
        whereClause,
        gte(dailyNutritionSummaryTable.date, toDateStr(start)),
        lte(dailyNutritionSummaryTable.date, toDateStr(end))
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const { start: todayStart, end: todayEnd } = getLocalDayRange(offsetMinutes);
    const today = getLocalDateUTC(offsetMinutes);

    // Get yesterday's date range for fallback display
    const yesterday = addDaysUTC(today, -1);
    const { start: yesterdayStart, end: yesterdayEnd } = getLocalDayRange(offsetMinutes, yesterday);

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
      // Yesterday's data for fallback when today is empty
      yesterdaySummary,
      yesterdayFoodLogs,
      yesterdayWaterLogs,
      yesterdayMoodLogs,
    ] = await Promise.all([
      // Today's nutrition summary
      db.select()
        .from(dailyNutritionSummaryTable)
        .where(
          and(
            eq(dailyNutritionSummaryTable.userId, userId),
            eq(dailyNutritionSummaryTable.date, toDateStr(today))
          )
        )
        .limit(1),

      // Last 7 days summaries for trends
      db.select()
        .from(dailyNutritionSummaryTable)
        .where(
          and(
            eq(dailyNutritionSummaryTable.userId, userId),
            gte(dailyNutritionSummaryTable.date, toDateStr(sevenDaysAgo))
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
      // Wrapped in try-catch to handle missing table gracefully
      (async () => {
        try {
          return await db.execute(sql`
            SELECT * FROM activity_log
            WHERE user_id = ${userId}
            AND logged_at >= ${todayStart}
            AND logged_at <= ${todayEnd}
            ORDER BY logged_at DESC
          `);
        } catch (err) {
          console.warn('[Dashboard] activity_log query failed (table may not exist):', err.message);
          return { rows: [] };
        }
      })(),

      // Yesterday's nutrition summary (fallback when today is empty)
      db.select()
        .from(dailyNutritionSummaryTable)
        .where(
          and(
            eq(dailyNutritionSummaryTable.userId, userId),
            eq(dailyNutritionSummaryTable.date, toDateStr(yesterday))
          )
        )
        .limit(1),

      // Yesterday's food logs
      db.selectDistinctOn([foodLogTable.clientEventId])
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, yesterdayStart),
            lte(foodLogTable.loggedDate, yesterdayEnd)
          )
        )
        .orderBy(foodLogTable.clientEventId, desc(foodLogTable.loggedDate)),

      // Yesterday's water intake
      db.select()
        .from(waterLogTable)
        .where(
          and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, yesterdayStart),
            lte(waterLogTable.loggedDate, yesterdayEnd)
          )
        ),

      // Yesterday's mood logs
      db.select()
        .from(moodLogTable)
        .where(
          and(
            eq(moodLogTable.userId, userId),
            gte(moodLogTable.loggedDate, yesterdayStart),
            lte(moodLogTable.loggedDate, yesterdayEnd)
          )
        )
        .orderBy(desc(moodLogTable.loggedDate)),
    ]);

    // Extract today's activity logs from raw SQL result
    const todayActivityLogs = todayActivityLogsResult?.rows || [];

    // Calculate today's water total
    const todayWaterTotal = todayWaterLogs.reduce((sum, log) => {
      const hydrationValue = parseFloat(log.hydrationLiters || 0);
      if (hydrationValue > 0) return sum + hydrationValue;
      return sum + parseFloat(log.amountLiters || 0);
    }, 0);

    // Calculate yesterday's water total (for fallback)
    const yesterdayWaterTotal = yesterdayWaterLogs.reduce((sum, log) => {
      const hydrationValue = parseFloat(log.hydrationLiters || 0);
      if (hydrationValue > 0) return sum + hydrationValue;
      return sum + parseFloat(log.amountLiters || 0);
    }, 0);

    // Determine if today has any meaningful data
    const todayHasNutrition = (todaySummary[0]?.totalCalories || 0) > 0;
    const todayHasWater = todayWaterTotal > 0;
    const todayHasMood = todayMoodLogs.length > 0;
    const todayHasFood = todayFoodLogs.length > 0;
    const todayIsEmpty = !todayHasNutrition && !todayHasWater && !todayHasMood && !todayHasFood;

    // Check if yesterday has data to show
    const yesterdayHasNutrition = (yesterdaySummary[0]?.totalCalories || 0) > 0;
    const yesterdayHasWater = yesterdayWaterTotal > 0;
    const yesterdayHasMood = yesterdayMoodLogs.length > 0;
    const yesterdayHasFood = yesterdayFoodLogs.length > 0;
    const yesterdayHasData = yesterdayHasNutrition || yesterdayHasWater || yesterdayHasMood || yesterdayHasFood;

    // Show yesterday's data only when today is completely empty AND yesterday has data
    const showYesterdayFallback = todayIsEmpty && yesterdayHasData;

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
    // Use stored timezone from gamification if request header is missing
    // This ensures consistency with how updateStreak() calculates dates
    const storedTimezoneOffset = gamification[0]?.timezoneOffset;
    const fallbackOffset = Number.isFinite(offsetMinutes)
      ? offsetMinutes
      : (Number.isFinite(storedTimezoneOffset) ? storedTimezoneOffset : 0);

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

    // Debug: Log when calculated streak differs from stored streak
    const storedStreak = gamification[0]?.streak ?? 0;
    if (currentStreak !== storedStreak) {
      console.warn(`[Dashboard] Streak mismatch: user=${userId}, stored=${storedStreak}, calculated=${currentStreak}, tz_header=${offsetMinutes}, tz_stored=${storedTimezoneOffset}`);
    }

    // Calculate hours since last meal for personalized nudges
    let hoursSinceLastMeal = null;
    if (todayFoodLogs.length > 0) {
      const sortedFoodLogs = [...todayFoodLogs].sort((a, b) =>
        new Date(b.loggedDate) - new Date(a.loggedDate)
      );
      const lastMealTime = new Date(sortedFoodLogs[0].loggedDate);
      hoursSinceLastMeal = Math.floor((Date.now() - lastMealTime.getTime()) / (1000 * 60 * 60));
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

    // Check if streak can be restored (within 24 hours of reset, has freezes)
    const previousStreak = gamificationRow?.previousStreak || gamificationRow?.previous_streak || 0;
    const streakResetAt = gamificationRow?.streakResetAt || gamificationRow?.streak_reset_at || null;
    let canRestoreStreak = false;

    if (
      previousStreak > 0 &&
      (gamificationRow?.streakFreezes || gamificationRow?.streak_freezes || 0) > 0 &&
      (gamificationRow?.streak || 0) === 0 &&
      streakResetAt
    ) {
      const hoursSinceReset = (Date.now() - new Date(streakResetAt).getTime()) / (1000 * 60 * 60);
      canRestoreStreak = hoursSinceReset <= 24;
    }

    // PRODUCTION FIX: Use calculated currentStreak as source of truth
    // This ensures streak reflects actual logged activity, not stale DB value
    // Sync DB in background if they differ (don't block response)
    if (currentStreak !== storedStreak && gamificationRow?.id) {
      // Async update - don't await to keep response fast
      db.update(gamificationTable)
        .set({ streak: currentStreak })
        .where(eq(gamificationTable.userId, userId))
        .then(() => console.log(`[Dashboard] Synced streak: ${storedStreak} → ${currentStreak}`))
        .catch(err => console.error('[Dashboard] Failed to sync streak:', err));
    }

    const gamificationWithLevel = {
      ...gamificationRow,
      streak: currentStreak,            // CRITICAL: Use calculated streak, not stale DB value
      level: levelInfo.level,           // Override DB level with calculated level
      levelName: levelInfo.levelName,
      rank: levelInfo.rank,
      nextLevelXp: levelInfo.nextLevelXP,  // FIX: Use correct case (capital XP)
      currentLevelXp: levelInfo.currentLevelXP,
      progressPercent: levelInfo.progressPercent,
      // Streak restoration info (Snapchat-style)
      canRestoreStreak,
      previousStreak,
      streakResetAt,
      // New fields for streak popups
      streakSavedByFreeze: gamificationRow?.streakSavedByFreeze || gamificationRow?.streak_saved_by_freeze || false,
      lastLogDate: gamificationRow?.lastLogDate || gamificationRow?.last_log_date || null,
    };

    // Aggregate yesterday's micronutrients for fallback
    const yesterdayMicros = {};
    yesterdayFoodLogs.forEach(log => {
      if (log.micros && typeof log.micros === 'object') {
        Object.entries(log.micros).forEach(([key, value]) => {
          let numValue;
          if (typeof value === 'number') {
            numValue = value;
          } else if (typeof value === 'object' && value.value !== undefined) {
            numValue = value.value;
          } else if (typeof value === 'string') {
            numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
          }
          if (!isNaN(numValue) && numValue > 0) {
            yesterdayMicros[key] = (yesterdayMicros[key] || 0) + numValue;
          }
        });
      }
    });

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
      // Yesterday's data for fallback display when today is empty
      yesterday: showYesterdayFallback ? {
        date: yesterday,
        nutrition: {
          ...(yesterdaySummary[0] || {
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFats: 0,
          }),
          micros: yesterdayMicros,
        },
        waterIntakeLiters: yesterdayWaterTotal,
        waterLogs: yesterdayWaterLogs,
        foodLogs: yesterdayFoodLogs,
        moodLogs: yesterdayMoodLogs,
      } : null,
      // Flag to indicate frontend should show yesterday's data
      showYesterdayFallback,
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
          mealCount: s.mealCount || 0,
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
        hoursSinceLastMeal,              // Hours since last food log (for personalized nudges)
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
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
 * GET /api/nutrition/history-stats
 * Get historical meal statistics for comparison insights
 * Returns: weekly averages, yesterday's same meal, monthly trend, meal type averages
 */
router.get("/history-stats", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { mealType } = req.query;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const today = getLocalDateUTC(offsetMinutes);
    const yesterday = addDaysUTC(today, -1);
    const sevenDaysAgo = addDaysUTC(today, -7);
    const thirtyDaysAgo = addDaysUTC(today, -30);

    // Get today's date range for meals today count
    const { start: todayStart, end: todayEnd } = getLocalDayRange(offsetMinutes);

    // PERFORMANCE OPTIMIZATION: Fetch 30-day logs once, filter 7-day in memory
    // Also select only needed columns to reduce payload size
    const [
      monthLogs,
      yesterdaySameMealLogs,
      todayMeals,
      lastMealResult,
    ] = await Promise.all([
      // Last 30 days of food logs (includes 7-day subset)
      // Select only columns needed for calculations
      db.select({
        calories: foodLogTable.calories,
        protein: foodLogTable.protein,
        carbs: foodLogTable.carbs,
        fats: foodLogTable.fats,
        mealType: foodLogTable.mealType,
        foodName: foodLogTable.foodName,
        loggedDate: foodLogTable.loggedDate,
      })
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, thirtyDaysAgo)
          )
        ),

      // Yesterday's logs of the same meal type (if mealType provided)
      mealType ? db.select({
        calories: foodLogTable.calories,
        protein: foodLogTable.protein,
      })
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            eq(foodLogTable.mealType, mealType),
            gte(foodLogTable.loggedDate, yesterday),
            lte(foodLogTable.loggedDate, today)
          )
        ) : Promise.resolve([]),

      // Today's meals count (for meal frequency insights) - only need count
      db.select({ loggedDate: foodLogTable.loggedDate })
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, todayStart),
            lte(foodLogTable.loggedDate, todayEnd)
          )
        ),

      // Last meal time (for fasting window insights)
      db.select({ loggedDate: foodLogTable.loggedDate })
        .from(foodLogTable)
        .where(eq(foodLogTable.userId, userId))
        .orderBy(desc(foodLogTable.loggedDate))
        .limit(1),
    ]);

    // Filter 7-day logs from 30-day data (avoids redundant DB query)
    const weekLogs = monthLogs.filter(log =>
      new Date(log.loggedDate) >= sevenDaysAgo
    );

    // Calculate weekly averages - use ACTUAL days with data, not 7
    // Count distinct days with logs
    const daysWithLogs = new Set(
      weekLogs.map(log => new Date(log.loggedDate).toDateString())
    ).size;

    const weeklyTotals = weekLogs.reduce((acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fat: acc.fat + (log.fats || 0),
      mealCount: acc.mealCount + 1,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 });

    // Use actual days with data for accurate averages
    const actualDays = Math.max(1, daysWithLogs);
    const weeklyAverage = {
      calories: Math.round(weeklyTotals.calories / actualDays),
      protein: Math.round(weeklyTotals.protein / actualDays),
      carbs: Math.round(weeklyTotals.carbs / actualDays),
      fat: Math.round(weeklyTotals.fat / actualDays),
      daysOfData: daysWithLogs, // Include this so frontend knows data quality
    };

    // Calculate yesterday's same meal type totals
    const yesterdaySameMeal = yesterdaySameMealLogs.length > 0
      ? {
          calories: yesterdaySameMealLogs.reduce((sum, log) => sum + (log.calories || 0), 0),
          protein: yesterdaySameMealLogs.reduce((sum, log) => sum + (log.protein || 0), 0),
        }
      : null;

    // Calculate meal type averages
    const mealTypeData = {};
    weekLogs.forEach(log => {
      const type = (log.mealType || 'other').toLowerCase();
      if (!mealTypeData[type]) {
        mealTypeData[type] = { totalCalories: 0, count: 0 };
      }
      mealTypeData[type].totalCalories += log.calories || 0;
      mealTypeData[type].count += 1;
    });

    const mealTypeAverage = {};
    Object.entries(mealTypeData).forEach(([type, data]) => {
      mealTypeAverage[type] = Math.round(data.totalCalories / data.count);
    });

    // Calculate monthly trend (compare first 15 days vs last 15 days)
    const midMonth = addDaysUTC(thirtyDaysAgo, 15);
    const firstHalf = monthLogs.filter(log => new Date(log.loggedDate) < midMonth);
    const secondHalf = monthLogs.filter(log => new Date(log.loggedDate) >= midMonth);

    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, log) => sum + (log.calories || 0), 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, log) => sum + (log.calories || 0), 0) / secondHalf.length
      : 0;

    let monthlyTrend = 'stable';
    if (secondHalfAvg > firstHalfAvg * 1.1) {
      monthlyTrend = 'increasing';
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      monthlyTrend = 'decreasing';
    }

    // Find similar foods (same food logged before)
    const similarFoods = [];
    const foodNames = new Set(weekLogs.map(log => log.foodName?.toLowerCase()));

    // Get last meal time for fasting window detection
    const lastMealTime = lastMealResult.length > 0 ? lastMealResult[0].loggedDate : null;

    // Get today's meal count for frequency insights
    const mealsToday = todayMeals.length;

    res.json({
      weeklyAverage,
      yesterdaySameMeal,
      monthlyTrend,
      mealTypeAverage,
      similarFoods,
      dataPoints: {
        weekLogs: weekLogs.length,
        monthLogs: monthLogs.length,
      },
      // New fields for timing insights
      lastMealTime,
      mealsToday,
    });

  } catch (error) {
    console.error("[HistoryStats] Error:", error);
    errors.internal(res, 'Failed to fetch history statistics');
  }
});

/**
 * POST /api/nutrition/goals
 * Save or update user's nutrition goals (UPSERT by userId)
 */
router.post("/goals", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
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
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
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

// ============================================================================
// MICRONUTRIENT TREND TRACKING
// Aggregates daily micronutrient intake over 30 days and computes deficit streaks
// ============================================================================

const MICRONUTRIENT_RDA = {
  calcium:    { rda: 1000, unit: 'mg' },
  iron:       { rda: 18,   unit: 'mg' },
  magnesium:  { rda: 400,  unit: 'mg' },
  potassium:  { rda: 3500, unit: 'mg' },
  zinc:       { rda: 11,   unit: 'mg' },
  vitaminA:   { rda: 900,  unit: 'mcg' },
  vitaminC:   { rda: 90,   unit: 'mg' },
  vitaminD:   { rda: 20,   unit: 'mcg' },
  vitaminB12: { rda: 2.4,  unit: 'mcg' },
  folate:     { rda: 400,  unit: 'mcg' },
};

/**
 * GET /api/nutrition/micronutrient-trends
 * Returns per-nutrient daily totals + deficit streaks for the last 30 days
 */
router.get("/micronutrient-trends", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const days = Math.min(parseInt(req.query.days || '30', 10), 90);
    const offsetMinutes = parseTimezoneOffsetMinutes(req);

    const since = addDaysUTC(new Date(), -days, offsetMinutes);

    // Pull all food logs with micros for the window
    const logs = await db
      .select({ loggedDate: foodLogTable.loggedDate, micros: foodLogTable.micros })
      .from(foodLogTable)
      .where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, since)))
      .orderBy(foodLogTable.loggedDate);

    // Aggregate micros by calendar day
    const byDay = {};
    for (const log of logs) {
      const day = normalizeDateUTC(log.loggedDate, offsetMinutes);
      if (!byDay[day]) byDay[day] = {};

      const micros = log.micros || {};
      for (const [key, raw] of Object.entries(micros)) {
        const val = typeof raw === 'number' ? raw
          : typeof raw === 'object' && raw !== null ? parseFloat(raw.value ?? 0)
          : parseFloat(String(raw).replace(/[^0-9.]/g, '') || '0');
        if (!isNaN(val)) byDay[day][key] = (byDay[day][key] || 0) + val;
      }
    }

    // Build daily rows sorted by date
    const sortedDays = Object.keys(byDay).sort();

    // Per-nutrient analysis
    const nutrientAnalysis = {};
    for (const [nutrient, { rda, unit }] of Object.entries(MICRONUTRIENT_RDA)) {
      const dailyValues = sortedDays.map(d => ({ date: d, value: byDay[d][nutrient] || 0 }));

      // Compute deficit streak (consecutive trailing days below 70% RDA)
      let deficitStreak = 0;
      for (let i = dailyValues.length - 1; i >= 0; i--) {
        if (dailyValues[i].value < rda * 0.7) deficitStreak++;
        else break;
      }

      // Weekly average
      const last7 = dailyValues.slice(-7);
      const avgLast7 = last7.length > 0
        ? last7.reduce((s, d) => s + d.value, 0) / last7.length
        : 0;

      const percentOfRDA = rda > 0 ? Math.round((avgLast7 / rda) * 100) : 0;

      nutrientAnalysis[nutrient] = {
        rda,
        unit,
        dailyValues,
        avgLast7: Math.round(avgLast7 * 10) / 10,
        percentOfRDA,
        deficitStreak,
        status: percentOfRDA >= 100 ? 'adequate'
               : percentOfRDA >= 70  ? 'low'
               : 'deficient',
      };
    }

    // Surface top deficits (deficitStreak >= 3 days)
    const activeDeficits = Object.entries(nutrientAnalysis)
      .filter(([, n]) => n.deficitStreak >= 3)
      .sort((a, b) => b[1].deficitStreak - a[1].deficitStreak)
      .map(([name, n]) => ({
        nutrient: name,
        deficitStreak: n.deficitStreak,
        percentOfRDA: n.percentOfRDA,
        unit: n.unit,
        rda: n.rda,
      }));

    res.json({
      userId,
      windowDays: days,
      nutrientAnalysis,
      activeDeficits,
      totalDaysTracked: sortedDays.length,
    });
  } catch (error) {
    console.error("[MicronutrientTrends] Error:", error);
    errors.internal(res, "Failed to compute micronutrient trends");
  }
});

// ============================================================================
// WEIGHT HISTORY
// ============================================================================

/**
 * POST /api/nutrition/weight
 * Log a body weight measurement
 */
router.post("/weight", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { weightKg, recordedDate, clientEventId } = req.body;

    if (!weightKg || isNaN(parseFloat(weightKg))) {
      return errors.missingField(res, 'weightKg');
    }
    const weight = parseFloat(weightKg);
    if (weight <= 20 || weight >= 499) {
      return errors.invalidValue(res, 'weightKg', 'must be between 20 and 499 kg');
    }

    const safeDate = recordedDate ? new Date(recordedDate) : new Date();
    const eventId = clientEventId || `weight-${userId}-${safeDate.toISOString()}`;

    const [entry] = await db.insert(weightHistoryTable)
      .values({ userId, weightKg: weight.toFixed(2), recordedDate: safeDate, clientEventId: eventId })
      .onConflictDoNothing({ target: [weightHistoryTable.userId, weightHistoryTable.clientEventId] })
      .returning();

    // Also update profile with latest weight
    await db.update(profilesTable)
      .set({ weightKg: weight.toFixed(2), updatedAt: new Date() })
      .where(eq(profilesTable.userId, userId));

    res.json({ success: true, entry: entry || null });
  } catch (error) {
    console.error("[WeightLog] Error:", error);
    errors.internal(res, "Failed to log weight");
  }
});

/**
 * GET /api/nutrition/weight-history
 * Returns last N weight entries with trend analysis
 */
router.get("/weight-history", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const limit = Math.min(parseInt(req.query.limit || '90', 10), 365);

    const entries = await db
      .select()
      .from(weightHistoryTable)
      .where(eq(weightHistoryTable.userId, userId))
      .orderBy(desc(weightHistoryTable.recordedDate))
      .limit(limit);

    const sorted = [...entries].reverse(); // oldest first for trend

    let trend = 'stable';
    let changeKg = 0;
    if (sorted.length >= 2) {
      const first = parseFloat(sorted[0].weightKg);
      const last = parseFloat(sorted[sorted.length - 1].weightKg);
      changeKg = Math.round((last - first) * 10) / 10;
      if (changeKg > 0.5) trend = 'gaining';
      else if (changeKg < -0.5) trend = 'losing';
    }

    res.json({
      entries: sorted,
      latest: sorted[sorted.length - 1] || null,
      trend,
      changeKg,
      totalEntries: sorted.length,
    });
  } catch (error) {
    console.error("[WeightHistory] Error:", error);
    errors.internal(res, "Failed to fetch weight history");
  }
});

export default router;
