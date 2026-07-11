import express from "express";
import { db } from "../config/db.js";
import { dailyNutritionSummaryTable, waterLogTable } from "../db/schema.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { parseTimezoneOffsetMinutes, getLocalDayRange, getDayKey } from "../utils/timezone.js";
import { ensureWaterLogTableShape, ensureDailyNutritionSummaryTableShape } from "../utils/schemaGuards.js";
import { errors, ErrorCodes } from "../utils/errorResponse.js";
import { updateStreak, calculateLogXP, awardXP } from "../services/gamificationRewardService.js";
import { nutritionGoalsTable } from "../db/schema.js";
import { clearPatternCache } from "../services/patternMiningService.js";
import { invalidateUserSignals } from "../services/userSignalCacheService.js";
import { triggerBackgroundAnalysis } from "../services/laggedCorrelationService.js";
import {
  BEVERAGE_FACTORS as _BEV_FACTORS,
  CAFFEINE_PER_250ML as _CAFF,
  CAFFEINE_DAILY_LIMIT_MG,
  getHydrationSignal,
  invalidateSignalCache,
} from "../services/hydrationSignalService.js";

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.use(requireAuth());

// Single source of truth: constants imported from hydrationSignalService
const BEVERAGE_FACTORS = _BEV_FACTORS;
const CAFFEINE_CONTENT = _CAFF;
const CAFFEINE_LIMIT = CAFFEINE_DAILY_LIMIT_MG;

/**
 * POST /api/water/log
 * Log water intake
 */
router.post("/log", async (req, res) => {
  try {
    await ensureWaterLogTableShape();
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const { amountLiters, loggedDate, clientEventId, beverageType } = req.body;

    if (!amountLiters || amountLiters <= 0) {
      return errors.invalidValue(res, 'amountLiters', 'must be greater than 0');
    }

    if (amountLiters > 5) {
      return errors.invalidValue(res, 'amountLiters', 'must be 5 liters or less');
    }

    // Validate clientEventId for idempotency
    if (!clientEventId) {
      return errors.missingField(res, 'clientEventId');
    }

    if (clientEventId && !UUID_RE.test(clientEventId)) {
      return errors.badRequest(res, 'clientEventId must be a valid UUID v4');
    }

    const normalizedType = typeof beverageType === "string"
      ? beverageType.toLowerCase()
      : "water";
    const hydrationFactor = BEVERAGE_FACTORS[normalizedType] ?? BEVERAGE_FACTORS.water;
    const hydrationLiters = parseFloat(amountLiters) * hydrationFactor;

    // Calculate caffeine content (mg per 250ml, so multiply by 4 for per-liter)
    const caffeinePer250ml = CAFFEINE_CONTENT[normalizedType] ?? 0;
    const caffeineMg = Math.round(parseFloat(amountLiters) * caffeinePer250ml * 4);

    // Insert with idempotency protection via ON CONFLICT
    // Drizzle ORM handles decimal conversion automatically - pass numbers directly
    // FIX: Use 3 decimal places (1ml precision) instead of 1 decimal (100ml precision)
    const result = await db.insert(waterLogTable).values({
      userId,
      amountLiters: parseFloat(parseFloat(amountLiters).toFixed(3)),
      beverageType: normalizedType,
      hydrationFactor: hydrationFactor,
      hydrationLiters: parseFloat(hydrationLiters.toFixed(3)),
      loggedDate: loggedDate ? new Date(loggedDate) : new Date(),
      clientEventId,
    }).onConflictDoNothing({ target: [waterLogTable.userId, waterLogTable.clientEventId] })
      .returning();

    const isNewEntry = result.length > 0;

    if (isNewEntry) {
      invalidateUserSignals(userId);
    }

    // If duplicate, fetch the existing entry
    let entry;
    if (!isNewEntry) {
      console.log(`[WaterLog] Duplicate detected: userId=${userId}, clientEventId=${clientEventId}`);
      [entry] = await db
        .select()
        .from(waterLogTable)
        .where(and(
          eq(waterLogTable.userId, userId),
          eq(waterLogTable.clientEventId, clientEventId)
        ))
        .limit(1);

      if (!entry) {
        // Edge case: conflict detected but can't find entry
        console.error("[WaterLog] CRITICAL: Conflict detected but entry not found");
        return errors.internal(res, 'Internal consistency error');
      }
    } else {
      entry = result[0];
      console.log(`[WaterLog] New entry created: id=${entry.id}, amount=${entry.amountLiters}L`);

      // Update streak for new water log (any activity continues streak)
      try {
        const streakResult = await updateStreak(userId, entry.loggedDate, db, offsetMinutes);
        console.log(`[WaterLog] Streak updated: ${streakResult.streak}, incremented: ${streakResult.streakIncremented}`);
      } catch (streakError) {
        console.error("[WaterLog] Streak update failed (non-fatal):", streakError);
      }

      // Award XP for water log
      try {
        // Check if user hit daily goal with this log
        const { start, end } = getLocalDayRange(offsetMinutes);
        const todayLogs = await db
          .select()
          .from(waterLogTable)
          .where(and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, start),
            lte(waterLogTable.loggedDate, end)
          ));

        const totalToday = todayLogs.reduce((sum, log) =>
          sum + parseFloat(log.hydrationLiters || log.amountLiters || 0), 0);

        // Get user's water goal
        const [goals] = await db
          .select()
          .from(nutritionGoalsTable)
          .where(eq(nutritionGoalsTable.userId, userId))
          .limit(1);
        const waterGoal = parseFloat(goals?.waterLiters) || 2.0;
        const hitDailyGoal = totalToday >= waterGoal;

        const xpToAward = calculateLogXP('water', { hitDailyGoal });
        const xpResult = await awardXP(userId, xpToAward, 'water_log', db);
        console.log(`[WaterLog] XP awarded: +${xpToAward} XP (total: ${xpResult.newXP}, level: ${xpResult.newLevel})`);
      } catch (xpError) {
        console.error("[WaterLog] XP award failed (non-fatal):", xpError);
      }

      // Clear pattern cache and hydration signal cache (new data invalidates both)
      clearPatternCache(userId);
      invalidateSignalCache(userId);
    }

    res.json({ entry, wasDuplicate: !isNewEntry });

    // Background: refresh lagged correlations after a new water log.
    // Throttled to once per 24h per user so frequent logging doesn't hammer the DB.
    if (isNewEntry) triggerBackgroundAnalysis(userId);

  } catch (error) {
    console.error("[WaterLog] Error:", error);
    errors.internal(res, 'Failed to log water');
  }
});

/**
 * GET /api/water/today
 * Get today's total water intake
 */
router.get("/today", async (req, res) => {
  try {
    await ensureWaterLogTableShape();
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const { start, end } = getLocalDayRange(offsetMinutes);

    const logs = await db
      .select()
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, start),
          lte(waterLogTable.loggedDate, end)
        )
      )
      .orderBy(desc(waterLogTable.loggedDate));

    const totalLiters = logs.reduce((sum, log) => {
      const hydrationValue = parseFloat(log.hydrationLiters || 0);
      if (hydrationValue > 0) return sum + hydrationValue;
      return sum + parseFloat(log.amountLiters || 0);
    }, 0);

    // Calculate total caffeine from today's logs
    const totalCaffeine = logs.reduce((sum, log) => {
      const bevType = (log.beverageType || 'water').toLowerCase();
      const caffeinePer250ml = CAFFEINE_CONTENT[bevType] ?? 0;
      const amount = parseFloat(log.amountLiters || 0);
      return sum + Math.round(amount * caffeinePer250ml * 4);
    }, 0);

    let caffeineStatus = 'low';
    let caffeineWarning = null;
    if (totalCaffeine > CAFFEINE_LIMIT) {
      caffeineStatus = 'excessive';
      caffeineWarning = 'Over recommended daily limit (400mg)';
    } else if (totalCaffeine > 300) {
      caffeineStatus = 'high';
      caffeineWarning = 'Approaching daily limit';
    } else if (totalCaffeine > 200) {
      caffeineStatus = 'moderate';
    }

    res.json({
      logs,
      totalLiters,
      totalCaffeine,
      caffeineStatus,
      caffeineWarning,
      caffeineLimit: CAFFEINE_LIMIT,
      count: logs.length,
    });
  } catch (error) {
    console.error("[WaterToday] Error:", error);
    errors.internal(res, 'Failed to fetch today\'s water intake');
  }
});

/**
 * GET /api/water/history
 * Get water intake history for pattern detection
 *
 * Query params:
 *   startDate?: ISO date string
 *   endDate?: ISO date string
 *   limit?: number (default 100)
 *
 * Headers:
 *   X-Timezone-Offset: Client's timezone offset in minutes (required for correct date grouping)
 */
router.get("/history", async (req, res) => {
  try {
    await ensureWaterLogTableShape();
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { startDate, endDate, limit = 100 } = req.query;

    // Get client's timezone offset for accurate date grouping
    const offsetMinutes = parseTimezoneOffsetMinutes(req);

    // Build where clause with all conditions
    let whereClause = eq(waterLogTable.userId, userId);

    // Add date filters if provided
    if (startDate && endDate) {
      whereClause = and(
        whereClause,
        gte(waterLogTable.loggedDate, new Date(startDate)),
        lte(waterLogTable.loggedDate, new Date(endDate))
      );
    } else if (startDate) {
      whereClause = and(
        whereClause,
        gte(waterLogTable.loggedDate, new Date(startDate))
      );
    } else if (endDate) {
      whereClause = and(
        whereClause,
        lte(waterLogTable.loggedDate, new Date(endDate))
      );
    }

    const history = await db
      .select()
      .from(waterLogTable)
      .where(whereClause)
      .orderBy(desc(waterLogTable.loggedDate))
      .limit(parseInt(limit));

    // Calculate daily aggregates for pattern detection
    // Use client's timezone for accurate date grouping
    const dailyAggregates = {};
    history.forEach(log => {
      // Use getDayKey with timezone offset for client-local date grouping
      const dateKey = getDayKey(new Date(log.loggedDate), offsetMinutes);
      if (!dailyAggregates[dateKey]) {
        dailyAggregates[dateKey] = {
          date: dateKey,
          totalLiters: 0,
          hydrationLiters: 0,
          count: 0,
          beverageTypes: {},
        };
      }
      dailyAggregates[dateKey].totalLiters += parseFloat(log.amountLiters || 0);
      dailyAggregates[dateKey].hydrationLiters += parseFloat(log.hydrationLiters || log.amountLiters || 0);
      dailyAggregates[dateKey].count += 1;
      const bevType = log.beverageType || 'water';
      dailyAggregates[dateKey].beverageTypes[bevType] = (dailyAggregates[dateKey].beverageTypes[bevType] || 0) + 1;
    });

    res.json({
      logs: history,
      dailyAggregates: Object.values(dailyAggregates),
      totalEntries: history.length,
    });
  } catch (error) {
    console.error("[WaterHistory] Error:", error);
    errors.internal(res, 'Failed to fetch water history');
  }
});

/**
 * POST /api/water/celebration
 * Persist daily hydration celebration (confetti gate)
 */
router.post("/celebration", async (req, res) => {
  try {
    await ensureDailyNutritionSummaryTableShape();
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { dateKey } = req.body;

    if (!dateKey || typeof dateKey !== "string") {
      return errors.missingField(res, 'dateKey');
    }

    const [year, month, day] = dateKey.split("-").map((value) => parseInt(value, 10));
    if (!year || !month || !day) {
      return errors.invalidFormat(res, 'dateKey', 'YYYY-MM-DD');
    }

    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    const celebratedAt = new Date();

    const [row] = await db
      .insert(dailyNutritionSummaryTable)
      .values({
        userId,
        date,
        hydrationCelebratedAt: celebratedAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [dailyNutritionSummaryTable.userId, dailyNutritionSummaryTable.date],
        set: {
          hydrationCelebratedAt: celebratedAt,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.json({ hydrationCelebratedAt: row?.hydrationCelebratedAt || celebratedAt });
  } catch (error) {
    console.error("[WaterCelebration] Error:", error);
    errors.internal(res, 'Failed to persist hydration celebration');
  }
});

/**
 * DELETE /api/water/:id
 * Delete a water log entry
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(waterLogTable)
      .where(
        and(
          eq(waterLogTable.id, parseInt(id)),
          eq(waterLogTable.userId, userId)
        )
      )
      .returning();

    if (!deleted) {
      return errors.notFound(res, 'Water log');
    }

    res.json({ message: "Water log deleted", deleted });
  } catch (error) {
    console.error("[WaterDelete] Error:", error);
    errors.internal(res, 'Failed to delete water log');
  }
});

export default router;
