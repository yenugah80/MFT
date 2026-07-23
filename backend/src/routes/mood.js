import express from "express";
import { db } from "../config/db.js";
import { moodLogTable, foodLogTable } from "../db/schema.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { parseTimezoneOffsetMinutes, getLocalDayRange, getLocalDateUTC } from "../utils/timezone.js";
import { generateMoodInsights, generateBasicMoodInsights, analyzeMoodMealCorrelation } from "../services/moodInsightService.js";
import { getMoodIntelligence } from "../services/moodRecommendationEngine.js";
import { errors, ErrorCodes } from "../utils/errorResponse.js";
import { updateStreak, calculateLogXP, awardXP } from "../services/gamificationRewardService.js";
import { clearPatternCache } from "../services/patternMiningService.js";
import { invalidateUserSignals } from "../services/userSignalCacheService.js";
import { triggerBackgroundAnalysis } from "../services/laggedCorrelationService.js";

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory cache for AI insights — bounded to 500 entries, 24-hour TTL per entry
const insightsCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;

function setCacheEntry(key, value) {
  if (insightsCache.size >= CACHE_MAX) {
    // Evict the oldest entry (Map preserves insertion order)
    insightsCache.delete(insightsCache.keys().next().value);
  }
  insightsCache.set(key, value);
}

router.use(requireAuth());

/**
 * POST /api/mood/log
 * Log a mood entry with enhanced fields (intensity, tags, energy, meal context)
 */
router.post("/log", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
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
      return errors.missingField(res, 'Mood');
    }

    // Validate clientEventId for idempotency
    if (!clientEventId) {
      return errors.missingField(res, 'clientEventId');
    }

    if (clientEventId && !UUID_RE.test(clientEventId)) {
      return errors.badRequest(res, 'clientEventId must be a valid UUID v4');
    }

    // Validate mood value (8 core moods) — mood.toLowerCase() below assumes a string
    const validMoods = ['happy', 'calm', 'focused', 'energized', 'neutral', 'tired', 'stressed', 'sad'];
    if (typeof mood !== 'string' || !validMoods.includes(mood.toLowerCase())) {
      return errors.invalidValue(res, 'mood', `must be one of: ${validMoods.join(', ')}`);
    }

    // Validate intensity and energyLevel (1-10). Checked explicitly for undefined/null
    // rather than `intensity && ...` — that form treats a legitimate 0 as "not provided"
    // and silently swaps in the default further down instead of rejecting it.
    const hasIntensity = intensity !== undefined && intensity !== null;
    if (hasIntensity && (typeof intensity !== 'number' || !Number.isFinite(intensity) || intensity < 1 || intensity > 10)) {
      return errors.invalidValue(res, 'intensity', 'must be a number between 1 and 10');
    }
    const hasEnergyLevel = energyLevel !== undefined && energyLevel !== null;
    if (hasEnergyLevel && (typeof energyLevel !== 'number' || !Number.isFinite(energyLevel) || energyLevel < 1 || energyLevel > 10)) {
      return errors.invalidValue(res, 'energyLevel', 'must be a number between 1 and 10');
    }

    // Validate note length (max 200 characters)
    if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > 200)) {
      return errors.invalidValue(res, 'note', 'must be a string of 200 characters or less');
    }

    // Validate tags schema (optional but strict when provided)
    // sleep/exercise/stress removed — each has its own dedicated logging
    // feature now (Sleep, Activity, Stress), so MoodLogger.jsx no longer
    // sends them. Old entries with those keys are untouched (this is a
    // warn-only allow-list, not a hard rejection), just no longer expected.
    if (tags && typeof tags === 'object') {
      const validTagCategories = ['social', 'weather'];
      const providedCategories = Object.keys(tags);
      const invalidCategories = providedCategories.filter(cat => !validTagCategories.includes(cat));

      if (invalidCategories.length > 0) {
        console.warn(`[MoodLog] Unknown tag categories: ${invalidCategories.join(', ')}`);
        // Allow unknown tags but log warning (flexible for future expansion)
      }
    }

    // Resolve the logged date first — moodTime/dayKey and the meal-context lookup
    // below all depend on it.
    const parsedLoggedDate = loggedDate ? new Date(loggedDate) : new Date();
    const safeLoggedDate = Number.isNaN(parsedLoggedDate.getTime()) ? new Date() : parsedLoggedDate;
    const localDay = getLocalDateUTC(offsetMinutes, safeLoggedDate);
    const dayKey = localDay.toISOString().slice(0, 10);

    // Find recent meals within 4 hours of the mood's logged time (user-timezone-aware)
    const moodTime = safeLoggedDate.getTime();
    const fourHoursAgo = new Date(moodTime - 4 * 60 * 60 * 1000);
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
      // intensity/energy_level are integer columns — round in case a slider
      // ever produces a fractional value (same class of bug as the
      // recommendations_history 500: fractional value into an integer column).
      intensity: hasIntensity ? Math.round(intensity) : 5,
      energyLevel: hasEnergyLevel ? Math.round(energyLevel) : 5,
      tags: tags || {},
      mealContext,
      note: note || null,
      source: source || 'manual',
      loggedDate: safeLoggedDate,
      clientEventId,
      dayKey,
      timezoneOffset: Number.isFinite(offsetMinutes) ? offsetMinutes : null,
    }).onConflictDoNothing({ target: [moodLogTable.userId, moodLogTable.clientEventId] })
      .returning();

    const isNewEntry = result.length > 0;

    if (isNewEntry) {
      invalidateUserSignals(userId);
      // Purge any cached insights for this user so next request reflects the new log
      for (const key of insightsCache.keys()) {
        if (key.startsWith(`${userId}-`)) insightsCache.delete(key);
      }
    }

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
        return errors.internal(res, 'Internal consistency error');
      }
    } else {
      entry = result[0];
      console.log(`[MoodLog] New entry created: id=${entry.id}, mood=${entry.mood}, intensity=${entry.intensity}`);

      // Update streak for new mood log (any activity continues streak)
      try {
        const streakResult = await updateStreak(userId, safeLoggedDate, db, offsetMinutes);
        console.log(`[MoodLog] Streak updated: ${streakResult.streak}, incremented: ${streakResult.streakIncremented}`);
      } catch (streakError) {
        console.error("[MoodLog] Streak update failed (non-fatal):", streakError);
      }

      // Award XP for mood log (encourages mental health tracking)
      try {
        const xpToAward = calculateLogXP('mood');
        const xpResult = await awardXP(userId, xpToAward, 'mood_log', db);
        console.log(`[MoodLog] XP awarded: +${xpToAward} XP (total: ${xpResult.newXP}, level: ${xpResult.newLevel})`);
      } catch (xpError) {
        console.error("[MoodLog] XP award failed (non-fatal):", xpError);
      }

      // Trigger async correlation analysis (don't await)
      analyzeMoodMealCorrelation(userId, entry).catch(err => {
        console.error("[MoodLog] Correlation analysis failed:", err);
      });

      // Clear pattern cache for this user (new data invalidates cached patterns)
      clearPatternCache(userId);
    }

    // Mental health safeguard: check for 3+ distinct days of high-distress logs in last 5 days
    let mentalHealthAlert = null;
    try {
      const distressMoods = ['sad', 'stressed'];
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      // limit(5) here was a real bug: it caps to the 5 MOST RECENT rows, not
      // 5 days — a user logging mood more than once a day (fully supported,
      // even encouraged elsewhere in this file) could have those 5 rows
      // entirely consumed by 1-3 recent days, so the query never actually
      // reached back far enough to see the full 5-day window it claims to
      // check. That silently weakens a crisis-support safeguard. The WHERE
      // clause already bounds this to 5 days of one user's data, so a
      // generous cap (not a functional constraint) is enough here.
      const recentDistress = await db
        .select()
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, fiveDaysAgo)
        ))
        .orderBy(desc(moodLogTable.loggedDate))
        .limit(50);

      // Count distinct days with high-intensity distress
      const distressDays = new Set(
        recentDistress
          .filter(m => distressMoods.includes(m.mood) && (m.intensity || 5) >= 7)
          .map(m => m.dayKey || m.loggedDate?.toISOString?.().slice(0, 10))
      );

      if (distressDays.size >= 3) {
        mentalHealthAlert = {
          type: 'support_resource',
          message: "We've noticed you've been feeling low for a few days. It's okay to ask for support.",
          resource: 'https://www.crisistextline.org',
          resourceLabel: 'Talk to someone',
        };
      }
    } catch (err) {
      console.error('[MoodLog] Mental health check failed (non-fatal):', err);
    }

    // Count how many times user logged this mood in the last 7 days (for pattern feedback + acknowledgment)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [moodFreqRow] = await db
      .select({ count: sql`count(*)` })
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        eq(moodLogTable.mood, entry.mood || mood.toLowerCase()),
        gte(moodLogTable.loggedDate, sevenDaysAgo)
      ));
    const moodFrequencyThisWeek = parseInt(moodFreqRow?.count || 0);

    // Count total logs this week (for acknowledgment)
    const [weekCountRow] = await db
      .select({ count: sql`count(*)` })
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedDate, sevenDaysAgo)
      ));
    const totalLogsThisWeek = parseInt(weekCountRow?.count || 0);

    // Pattern alert — same mood 3+ times in 7 days
    const NEGATIVE_MOODS = ['sad', 'stressed', 'tired'];
    const patternAlert = moodFrequencyThisWeek >= 3 && NEGATIVE_MOODS.includes(entry.mood || mood.toLowerCase())
      ? {
          message: `You've logged "${entry.mood || mood}" ${moodFrequencyThisWeek} times this week. We're tracking what food and sleep patterns connect to this.`,
          frequency: moodFrequencyThisWeek,
        }
      : null;

    // For API response, enrich with meal details
    const mealDetailsForResponse = recentMeals.map(m => ({
      id: m.id,
      foodName: m.foodName,
      carbs: m.carbs,
      protein: m.protein,
      fats: m.fats,
      novaScore: m.novaScore,
      timeDeltaHours: (Date.now() - new Date(m.loggedDate).getTime()) / 3600000,
    }));

    res.json({
      entry,
      wasDuplicate: !isNewEntry,
      mealContext: mealDetailsForResponse,
      logStats: { totalLogsThisWeek, moodFrequencyThisWeek },
      ...(patternAlert && { patternAlert }),
      ...(mentalHealthAlert && { mentalHealthAlert }),
    });

    // Background: refresh lagged correlations after a new mood log.
    // Throttled to once per 24h per user so frequent logging doesn't hammer the DB.
    if (isNewEntry) triggerBackgroundAnalysis(userId);

  } catch (error) {
    console.error("[MoodLog] Error:", error);
    errors.internal(res, 'Failed to log mood');
  }
});

/**
 * GET /api/mood/history
 * Get mood history for a user
 */
router.get("/history", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { startDate, endDate, limit = 30 } = req.query;

    // Build conditions array so userId is never overwritten by date filters
    const conditions = [eq(moodLogTable.userId, userId)];
    if (startDate) conditions.push(gte(moodLogTable.loggedDate, new Date(startDate)));
    if (endDate) conditions.push(lte(moodLogTable.loggedDate, new Date(endDate)));

    const parsedLimit = Math.min(Math.max(parseInt(limit) || 30, 1), 365);

    const history = await db
      .select()
      .from(moodLogTable)
      .where(and(...conditions))
      .orderBy(desc(moodLogTable.loggedDate))
      .limit(parsedLimit);

    res.json(history);
  } catch (error) {
    console.error("[MoodHistory] Error:", error);
    errors.internal(res, 'Failed to fetch mood history');
  }
});

/**
 * GET /api/mood/today
 * Get today's mood logs
 */
router.get("/today", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

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
    errors.internal(res, 'Failed to fetch today\'s moods');
  }
});

/**
 * GET /api/mood/trends
 * Get aggregated mood trends for charting
 */
router.get("/trends", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { period = 'week' } = req.query;

    const VALID_PERIODS = { day: 1, week: 7, month: 30 };
    if (period && !VALID_PERIODS[period]) {
      return errors.invalidValue(res, 'period', 'must be one of: day, week, month');
    }
    const days = VALID_PERIODS[period] || 7;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    // Compute start of period in the user's local timezone, not server UTC
    const nowLocal = new Date(Date.now() - offsetMinutes * 60 * 1000);
    nowLocal.setUTCDate(nowLocal.getUTCDate() - days);
    nowLocal.setUTCHours(0, 0, 0, 0);
    const startDate = new Date(nowLocal.getTime() + offsetMinutes * 60 * 1000);

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

    const buildDayKey = (entry) => {
      if (entry.dayKey) return entry.dayKey;
      const date = new Date(entry.loggedDate);
      if (Number.isNaN(date.getTime())) return null;
      // Use 0 (UTC) as neutral fallback — server timezone is wrong for all non-local users
      const offset = Number.isFinite(entry.timezoneOffset) ? entry.timezoneOffset : 0;
      const localMs = date.getTime() - offset * 60 * 1000;
      const local = new Date(localMs);
      const year = local.getUTCFullYear();
      const month = String(local.getUTCMonth() + 1).padStart(2, '0');
      const day = String(local.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    moods.forEach(mood => {
      const dayKey = buildDayKey(mood);
      if (!dayKey) return;

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
    errors.internal(res, 'Failed to fetch mood trends');
  }
});

/**
 * POST /api/mood/insights
 * Generate AI-powered mood insights with guardrails
 * 💰 COST OPTIMIZED: 24-hour cache + rule-based fallback
 */
router.post("/insights", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { days = 30, forceRefresh = false } = req.body;

    // Cache key includes today's date so a new day always refreshes,
    // and a new mood log within the same day can use forceRefresh=true
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `${userId}-${days}-${today}`;
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

    const minThreshold = { moods: 10, meals: 10 };
    const belowThreshold = moods.length < minThreshold.moods || foodLogs.length < minThreshold.meals;

    if (belowThreshold) {
      const basicInsights = generateBasicMoodInsights(moods);
      const fallbackInsights = basicInsights.length > 0 ? basicInsights : [{
        type: "Mood Summary",
        title: "Early Signals",
        message: "Keep logging to strengthen your mood baseline and reveal clearer patterns.",
        confidence: 0.3,
        suggestions: ["Log mood consistently for a few more days"],
        relatedData: { moodTrigger: "neutral" },
      }];

      return res.json({
        insightTier: "basic",
        insights: fallbackInsights,
        message: "Early insights based on recent logs.",
        minDataRequired: minThreshold,
        currentData: { moods: moods.length, meals: foodLogs.length },
      });
    }

    // Generate insights (rule-based first, AI as fallback)
    const insights = await generateMoodInsights(userId, moods, foodLogs);

    const responseData = {
      insightTier: "ai",
      insights,
      dataPoints: {
        moods: moods.length,
        meals: foodLogs.length,
        days,
      },
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    setCacheEntry(cacheKey, { data: responseData, timestamp: Date.now() });

    res.json(responseData);
  } catch (error) {
    console.error("[MoodInsights] Error:", error);
    errors.internal(res, 'Failed to generate mood insights');
  }
});

/**
 * GET /api/mood/pattern-check?mood=sad
 * Lightweight check: how many times has user logged this mood in last 7 days?
 * Called when user selects a mood in the logger, before they tap Save.
 * Returns a nudge message if the mood is repeated 3+ times this week.
 */
router.get("/pattern-check", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { mood } = req.query;

    const VALID_MOODS = ['happy', 'calm', 'focused', 'energized', 'neutral', 'tired', 'stressed', 'sad'];
    if (!mood || !VALID_MOODS.includes(mood.toLowerCase())) {
      return res.json({ patternAlert: null });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [row] = await db
      .select({ count: sql`count(*)` })
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        eq(moodLogTable.mood, mood.toLowerCase()),
        gte(moodLogTable.loggedDate, sevenDaysAgo)
      ));

    const count = parseInt(row?.count || 0);
    const NEGATIVE_MOODS = ['sad', 'stressed', 'tired'];
    const isNegative = NEGATIVE_MOODS.includes(mood.toLowerCase());

    if (count >= 2 && isNegative) {
      return res.json({
        patternAlert: {
          count,
          message: count >= 3
            ? `You've felt ${mood} ${count} times this week — we're tracking what food and sleep patterns connect to this.`
            : `You've felt ${mood} ${count} times this week. We'll track what influences this for you.`,
        },
      });
    }

    res.json({ patternAlert: null });
  } catch (error) {
    console.error("[MoodPatternCheck] Error:", error);
    res.json({ patternAlert: null }); // non-fatal — don't block logging
  }
});

/**
 * GET /api/mood/intelligence
 * AI-powered mood recommendations and personalized wellness insights
 * Uses pattern recognition across mood, food, sleep, and activity data
 */
router.get("/intelligence", async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    console.log(`[MoodIntelligence] Generating intelligence for user: ${userId}`);

    const intelligence = await getMoodIntelligence(userId);

    if (!intelligence) {
      return errors.notFound(res, 'Mood intelligence (insufficient data – keep logging mood, food, and activities)');
    }

    res.json(intelligence);
  } catch (error) {
    console.error("[MoodIntelligence] Error:", error);
    errors.internal(res, 'Failed to generate mood intelligence');
  }
});

export default router;
