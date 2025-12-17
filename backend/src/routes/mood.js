import express from "express";
import { db } from "../config/db.js";
import { moodLogTable } from "../db/schema.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

/**
 * POST /api/mood/log
 * Log a mood entry
 */
router.post("/log", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { mood, note, source, loggedDate } = req.body;

    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    // Validate mood value
    const validMoods = ['happy', 'excited', 'calm', 'neutral', 'tired', 'stressed', 'sad', 'angry'];
    if (!validMoods.includes(mood.toLowerCase())) {
      return res.status(400).json({
        error: "Invalid mood",
        validMoods
      });
    }

    const [entry] = await db.insert(moodLogTable).values({
      userId,
      mood: mood.toLowerCase(),
      note: note || null,
      source: source || 'manual',
      loggedDate: loggedDate ? new Date(loggedDate) : new Date(),
    }).returning();

    res.json(entry);
  } catch (error) {
    console.error("[MoodLog] Error:", error);
    res.status(500).json({ error: "Failed to log mood" });
  }
});

/**
 * GET /api/mood/history
 * Get mood history for a user
 */
router.get("/history", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { startDate, endDate, limit = 30 } = req.query;

    let query = db
      .select()
      .from(moodLogTable)
      .where(eq(moodLogTable.userId, userId))
      .orderBy(desc(moodLogTable.loggedDate));

    // Add date filters if provided
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(moodLogTable.loggedDate, new Date(startDate)),
          lte(moodLogTable.loggedDate, new Date(endDate))
        )
      );
    }

    const history = await query.limit(parseInt(limit));

    res.json(history);
  } catch (error) {
    console.error("[MoodHistory] Error:", error);
    res.status(500).json({ error: "Failed to fetch mood history" });
  }
});

/**
 * GET /api/mood/today
 * Get today's mood logs
 */
router.get("/today", async (req, res) => {
  try {
    const userId = req.auth.userId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const moods = await db
      .select()
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, today),
          lte(moodLogTable.loggedDate, endOfToday)
        )
      )
      .orderBy(desc(moodLogTable.loggedDate));

    res.json(moods);
  } catch (error) {
    console.error("[MoodToday] Error:", error);
    res.status(500).json({ error: "Failed to fetch today's moods" });
  }
});

export default router;
