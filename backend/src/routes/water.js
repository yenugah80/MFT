import express from "express";
import { db } from "../config/db.js";
import { dailyNutritionSummaryTable, waterLogTable } from "../db/schema.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { parseTimezoneOffsetMinutes, getLocalDayRange } from "../utils/timezone.js";
import { ensureWaterLogTableShape, ensureDailyNutritionSummaryTableShape } from "../utils/schemaGuards.js";
import { errors, ErrorCodes } from "../utils/errorResponse.js";
import { updateStreak } from "../services/gamificationRewardService.js";

const router = express.Router();

router.use(requireAuth);

/**
 * BEVERAGE HYDRATION FACTORS
 * Keep in sync with mobile/constants/beverageConstants.js
 *
 * Science-based factors:
 * - Water: 1.0 (baseline)
 * - Tea: 0.9 (minimal caffeine)
 * - Milk: 0.87 (studies show excellent retention)
 * - Smoothie: 0.85 (fiber doesn't significantly affect absorption)
 * - Juice: 0.8 (sugar increases osmotic load)
 * - Soda: 0.6 (high sugar, some caffeine)
 * - Coffee: 0.5 (caffeine is mild diuretic)
 * - Electrolyte/Sports/Coconut: 1.05-1.1 (sodium helps retention)
 */
const BEVERAGE_FACTORS = {
  water: 1.0,
  sparkling: 1.0,
  herbal: 1.0,
  tea: 0.9,
  milk: 0.87,
  smoothie: 0.85,
  juice: 0.8,
  soda: 0.6,
  coffee: 0.5,
  electrolyte: 1.1,
  coconut: 1.05,
  sports: 1.05,
};

/**
 * POST /api/water/log
 * Log water intake
 */
router.post("/log", async (req, res) => {
  try {
    await ensureWaterLogTableShape();
    const userId = req.auth.userId;
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

    const normalizedType = typeof beverageType === "string"
      ? beverageType.toLowerCase()
      : "water";
    const hydrationFactor = BEVERAGE_FACTORS[normalizedType] ?? BEVERAGE_FACTORS.water;
    const hydrationLiters = parseFloat(amountLiters) * hydrationFactor;

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
        const streakResult = await updateStreak(userId, entry.loggedDate, db);
        console.log(`[WaterLog] Streak updated: ${streakResult.streak}, incremented: ${streakResult.streakIncremented}`);
      } catch (streakError) {
        console.error("[WaterLog] Streak update failed (non-fatal):", streakError);
      }
    }

    res.json({ entry, wasDuplicate: !isNewEntry });
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
    const userId = req.auth.userId;

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

    res.json({
      logs,
      totalLiters,
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
 */
router.get("/history", async (req, res) => {
  try {
    await ensureWaterLogTableShape();
    const userId = req.auth.userId;
    const { startDate, endDate, limit = 100 } = req.query;

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
    const dailyAggregates = {};
    history.forEach(log => {
      const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
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
    const userId = req.auth.userId;
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
    const userId = req.auth.userId;
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
