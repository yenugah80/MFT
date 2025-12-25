import express from "express";
import { db } from "../config/db.js";
import { moodLogTable, foodLogTable } from "../db/schema.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { parseTimezoneOffsetMinutes, getLocalDayRange } from "../utils/timezone.js";
import { generateMoodInsights, analyzeMoodMealCorrelation } from "../services/moodInsightService.js";

const router = express.Router();

// 💰 COST OPTIMIZATION: In-memory cache for insights (24-hour TTL)
const insightsCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

router.use(requireAuth);

/**
 * POST /api/mood/log
 * Log a mood entry with enhanced fields (intensity, tags, energy, meal context)
 */
router.post("/log", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {
      mood,
      intensity,
      energyLevel,
      tags,
      note,
      source,
      loggedDate,
      clientEventId
    } = req.body;

    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    // Validate clientEventId for idempotency
    if (!clientEventId) {
      return res.status(400).json({ error: "clientEventId is required for idempotency" });
    }

    // Validate mood value (8 core moods)
    const validMoods = ['happy', 'calm', 'focused', 'energized', 'neutral', 'tired', 'stressed', 'sad'];
    if (!validMoods.includes(mood.toLowerCase())) {
      return res.status(400).json({
        error: "Invalid mood",
        validMoods
      });
    }

    // Validate intensity and energyLevel (1-10)
    if (intensity && (intensity < 1 || intensity > 10)) {
      return res.status(400).json({ error: "Intensity must be between 1 and 10" });
    }
    if (energyLevel && (energyLevel < 1 || energyLevel > 10)) {
      return res.status(400).json({ error: "Energy level must be between 1 and 10" });
    }

    // Validate note length (max 200 characters)
    if (note && note.length > 200) {
      return res.status(400).json({ error: "Note must be 200 characters or less" });
    }

    // Validate tags schema (optional but strict when provided)
    if (tags && typeof tags === 'object') {
      const validTagCategories = ['sleep', 'exercise', 'social', 'weather', 'stress'];
      const providedCategories = Object.keys(tags);
      const invalidCategories = providedCategories.filter(cat => !validTagCategories.includes(cat));

      if (invalidCategories.length > 0) {
        console.warn(`[MoodLog] Unknown tag categories: ${invalidCategories.join(', ')}`);
        // Allow unknown tags but log warning (flexible for future expansion)
      }
    }

    // Find recent meals (within 4 hours) for context
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const recentMeals = await db
      .select()
      .from(foodLogTable)
      .where(and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedDate, fourHoursAgo)
      ))
      .orderBy(desc(foodLogTable.loggedDate))
      .limit(5);

    // ⚠️ CRITICAL: Store meal IDs only, not full macros (safer schema)
    const mealContext = {
      mealIds: recentMeals.map(m => m.id),
      windowHours: 4,
    };

    // Insert with idempotency protection via ON CONFLICT
    const result = await db.insert(moodLogTable).values({
      userId,
      mood: mood.toLowerCase(),
      intensity: intensity || 5,
      energyLevel: energyLevel || 5,
      tags: tags || {},
      mealContext,
      note: note || null,
      source: source || 'manual',
      loggedDate: loggedDate ? new Date(loggedDate) : new Date(),
      clientEventId,
    }).onConflictDoNothing({ target: [moodLogTable.userId, moodLogTable.clientEventId] })
      .returning();

    const isNewEntry = result.length > 0;

    // If duplicate, fetch the existing entry
    let entry;
    if (!isNewEntry) {
      console.log(`[MoodLog] Duplicate detected: userId=${userId}, clientEventId=${clientEventId}`);
      [entry] = await db
        .select()
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          eq(moodLogTable.clientEventId, clientEventId)
        ))
        .limit(1);

      if (!entry) {
        console.error("[MoodLog] CRITICAL: Conflict detected but entry not found");
        return res.status(500).json({ error: "Internal consistency error" });
      }
    } else {
      entry = result[0];
      console.log(`[MoodLog] New entry created: id=${entry.id}, mood=${entry.mood}, intensity=${entry.intensity}`);

      // Trigger async correlation analysis (don't await)
      analyzeMoodMealCorrelation(userId, entry).catch(err => {
        console.error("[MoodLog] Correlation analysis failed:", err);
      });
    }

    // For API response, enrich with meal details
    const mealDetailsForResponse = recentMeals.map(m => ({
      id: m.id,
      foodName: m.foodName,
      carbs: m.carbs,
      protein: m.protein,
      fats: m.fats,
      novaScore: m.novaScore,
      timeDeltaHours: (new Date() - new Date(m.loggedDate)) / 3600000,
    }));

    res.json({
      entry,
      wasDuplicate: !isNewEntry,
      mealContext: mealDetailsForResponse
    });
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

    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const { start, end } = getLocalDayRange(offsetMinutes);

    const moods = await db
      .select()
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, start),
          lte(moodLogTable.loggedDate, end)
        )
      )
      .orderBy(desc(moodLogTable.loggedDate));

    res.json(moods);
  } catch (error) {
    console.error("[MoodToday] Error:", error);
    res.status(500).json({ error: "Failed to fetch today's moods" });
  }
});

/**
 * GET /api/mood/trends
 * Get aggregated mood trends for charting
 */
router.get("/trends", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { period = 'week' } = req.query;

    // Calculate date range based on period
    const days = { day: 1, week: 7, month: 30 }[period] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const moods = await db
      .select()
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, startDate)
        )
      )
      .orderBy(moodLogTable.loggedDate);

    // Aggregate data by day
    const aggregated = [];
    const dayMap = new Map();

    moods.forEach(mood => {
      const date = new Date(mood.loggedDate);
      const dayKey = date.toISOString().split('T')[0];

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, {
          date: dayKey,
          moods: [],
          intensities: [],
          energyLevels: [],
        });
      }

      const dayData = dayMap.get(dayKey);
      dayData.moods.push(mood.mood);
      dayData.intensities.push(mood.intensity || 5);
      dayData.energyLevels.push(mood.energyLevel || 5);
    });

    // Calculate averages for each day
    dayMap.forEach((dayData, dayKey) => {
      const avgIntensity = dayData.intensities.reduce((sum, val) => sum + val, 0) / dayData.intensities.length;
      const avgEnergy = dayData.energyLevels.reduce((sum, val) => sum + val, 0) / dayData.energyLevels.length;

      // Most common mood for the day
      const moodCounts = {};
      dayData.moods.forEach(mood => {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      });
      const dominantMood = Object.keys(moodCounts).reduce((a, b) =>
        moodCounts[a] > moodCounts[b] ? a : b
      );

      aggregated.push({
        date: dayKey,
        mood: dominantMood,
        intensity: Math.round(avgIntensity * 10) / 10,
        energy: Math.round(avgEnergy * 10) / 10,
        count: dayData.moods.length,
      });
    });

    // Calculate overall averages
    const allIntensities = moods.map(m => m.intensity || 5);
    const allEnergy = moods.map(m => m.energyLevel || 5);
    const avgIntensity = allIntensities.length > 0
      ? allIntensities.reduce((sum, val) => sum + val, 0) / allIntensities.length
      : 5;
    const avgEnergy = allEnergy.length > 0
      ? allEnergy.reduce((sum, val) => sum + val, 0) / allEnergy.length
      : 5;

    res.json({
      period,
      data: aggregated,
      averages: {
        intensity: Math.round(avgIntensity * 10) / 10,
        energy: Math.round(avgEnergy * 10) / 10,
      },
      totalEntries: moods.length,
    });
  } catch (error) {
    console.error("[MoodTrends] Error:", error);
    res.status(500).json({ error: "Failed to fetch mood trends" });
  }
});

/**
 * POST /api/mood/insights
 * Generate AI-powered mood insights with guardrails
 * 💰 COST OPTIMIZED: 24-hour cache + rule-based fallback
 */
router.post("/insights", async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { days = 30, forceRefresh = false } = req.body;

    // 💰 Check cache first (save AI costs!)
    const cacheKey = `${userId}-${days}`;
    const cached = insightsCache.get(cacheKey);

    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`[MoodInsights] Returning cached insights for user ${userId} (saved AI cost)`);
      return res.json({
        ...cached.data,
        cached: true,
        cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000 / 60), // minutes
      });
    }

    // Fetch mood logs for analysis period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const moods = await db
      .select()
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, startDate)
        )
      )
      .orderBy(moodLogTable.loggedDate);

    // Fetch food logs for correlation analysis
    const foodLogs = await db
      .select()
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, startDate)
        )
      )
      .orderBy(foodLogTable.loggedDate);

    // ⚠️ CRITICAL: Guard AI insights (minimum data threshold)
    if (moods.length < 10 || foodLogs.length < 10) {
      return res.json({
        insights: [],
        message: 'Not enough data yet. Keep logging to unlock insights!',
        minDataRequired: { moods: 10, meals: 10 },
        currentData: { moods: moods.length, meals: foodLogs.length },
      });
    }

    // Generate insights (rule-based first, AI as fallback)
    const insights = await generateMoodInsights(userId, moods, foodLogs);

    const responseData = {
      insights,
      dataPoints: {
        moods: moods.length,
        meals: foodLogs.length,
        days,
      },
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    // 💰 Cache the result for 24 hours
    insightsCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    res.json(responseData);
  } catch (error) {
    console.error("[MoodInsights] Error:", error);
    res.status(500).json({ error: "Failed to generate mood insights" });
  }
});

export default router;
