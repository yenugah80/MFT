import express from "express";
import { db } from "../config/db.js";
import { dailyNutritionSummaryTable, waterLogTable } from "../db/schema.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { parseTimezoneOffsetMinutes, getLocalDayRange } from "../utils/timezone.js";
import { ensureWaterLogTableShape, ensureDailyNutritionSummaryTableShape } from "../utils/schemaGuards.js";

const router = express.Router();

router.use(requireAuth);

const BEVERAGE_FACTORS = {
  water: 1.0,
  coffee: 0.5,
  tea: 0.9,
  juice: 0.8,
  milk: 0.9,
  electrolyte: 1.1,
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
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    if (amountLiters > 5) {
      return res.status(400).json({ error: "Amount seems unrealistic (max 5L per entry)" });
    }

    // Validate clientEventId for idempotency
    if (!clientEventId) {
      return res.status(400).json({ error: "clientEventId is required for idempotency" });
    }

    const normalizedType = typeof beverageType === "string"
      ? beverageType.toLowerCase()
      : "water";
    const hydrationFactor = BEVERAGE_FACTORS[normalizedType] ?? BEVERAGE_FACTORS.water;
    const hydrationLiters = parseFloat(amountLiters) * hydrationFactor;

    // Insert with idempotency protection via ON CONFLICT
    // Drizzle ORM handles decimal conversion automatically - pass numbers directly
    const result = await db.insert(waterLogTable).values({
      userId,
      amountLiters: parseFloat(amountLiters),
      beverageType: normalizedType,
      hydrationFactor: hydrationFactor,
      hydrationLiters: parseFloat(hydrationLiters.toFixed(1)),
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
        return res.status(500).json({ error: "Internal consistency error" });
      }
    } else {
      entry = result[0];
      console.log(`[WaterLog] New entry created: id=${entry.id}, amount=${entry.amountLiters}L`);
    }

    res.json({ entry, wasDuplicate: !isNewEntry });
  } catch (error) {
    console.error("[WaterLog] Error:", error);
    res.status(500).json({ error: "Failed to log water" });
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
    res.status(500).json({ error: "Failed to fetch today's water intake" });
  }
});

/**
 * GET /api/water/history
 * Get water intake history
 */
router.get("/history", async (req, res) => {
  try {
    await ensureWaterLogTableShape();
    const userId = req.auth.userId;
    const { startDate, endDate, limit = 100 } = req.query;

    let query = db
      .select()
      .from(waterLogTable)
      .where(eq(waterLogTable.userId, userId))
      .orderBy(desc(waterLogTable.loggedDate));

    // Add date filters if provided
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(waterLogTable.loggedDate, new Date(startDate)),
          lte(waterLogTable.loggedDate, new Date(endDate))
        )
      );
    }

    const history = await query.limit(parseInt(limit));

    res.json(history);
  } catch (error) {
    console.error("[WaterHistory] Error:", error);
    res.status(500).json({ error: "Failed to fetch water history" });
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
      return res.status(400).json({ error: "dateKey is required (YYYY-MM-DD)" });
    }

    const [year, month, day] = dateKey.split("-").map((value) => parseInt(value, 10));
    if (!year || !month || !day) {
      return res.status(400).json({ error: "dateKey must be in YYYY-MM-DD format" });
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
    res.status(500).json({ error: "Failed to persist hydration celebration" });
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
      return res.status(404).json({ error: "Water log not found" });
    }

    res.json({ message: "Water log deleted", deleted });
  } catch (error) {
    console.error("[WaterDelete] Error:", error);
    res.status(500).json({ error: "Failed to delete water log" });
  }
});

export default router;
