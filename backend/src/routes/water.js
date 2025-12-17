import express from "express";
import { db } from "../config/db.js";
import { waterLogTable } from "../db/schema.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

/**
 * POST /api/water/log
 * Log water intake
 */
router.post("/log", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { amountLiters, loggedDate } = req.body;

    if (!amountLiters || amountLiters <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    if (amountLiters > 5) {
      return res.status(400).json({ error: "Amount seems unrealistic (max 5L per entry)" });
    }

    const [entry] = await db.insert(waterLogTable).values({
      userId,
      amountLiters: amountLiters.toString(), // Store as string (decimal in DB)
      loggedDate: loggedDate ? new Date(loggedDate) : new Date(),
    }).returning();

    res.json(entry);
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
    const userId = req.auth.userId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const logs = await db
      .select()
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, today),
          lte(waterLogTable.loggedDate, endOfToday)
        )
      )
      .orderBy(desc(waterLogTable.loggedDate));

    const totalLiters = logs.reduce(
      (sum, log) => sum + parseFloat(log.amountLiters || 0),
      0
    );

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
