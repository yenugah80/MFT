/**
 * Activity Tracking Routes
 *
 * Full activity logging with MET-based calorie calculation and idempotency support.
 *
 * Routes:
 * - POST /activity/log - Log a new activity (with idempotency)
 * - GET /activity/today - Get today's activity summary
 * - GET /activity/history - Get activity history with filters
 * - DELETE /activity/:id - Delete an activity entry
 * - GET /activity/week-data - Week chart data
 * - GET /activity/analytics/dashboard - Full analytics dashboard
 * - GET /activity/analytics/patterns - Pattern analysis
 * - POST /activity/insights - Generate AI-powered insights
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { eq, and, gte, lte, desc, sql, count, sum } from 'drizzle-orm';
import { db } from '../config/db.js';
import { activityLogTable, profilesTable } from '../db/schema.js';
import {
  calculateCaloriesFromMET,
  calculateActivityXP,
  getActivitySummary,
  getWeeklyProgress,
  ACTIVITY_TYPES,
  INTENSITY_LEVELS,
} from '../services/metCalorieService.js';
import activityAnalyticsService from '../services/activityAnalyticsService.js';
import { openaiClient } from '../services/apiClients/OpenAIClient.js';
import { updateStreak, awardXP } from '../services/gamificationRewardService.js';
import { parseTimezoneOffsetMinutes, getDayKey } from '../utils/timezone.js';
import { getActivityIntelligence } from '../services/activityRecommendationEngine.js';
import { invalidateUserSignals } from '../services/userSignalCacheService.js';
import { clearPatternCache } from '../services/patternMiningService.js';

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

router.use(requireAuth());

// ============================================================================
// CONSTANTS
// ============================================================================

router.get('/constants', (req, res) => {
  res.json({
    activityTypes: ACTIVITY_TYPES,
    intensityLevels: INTENSITY_LEVELS,
  });
});

// ============================================================================
// LOG ACTIVITY (with idempotency)
// ============================================================================

router.post('/log', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const {
      type = 'general',
      minutes,
      intensity = 'moderate',
      notes,
      distanceKm,
      heartRateAvg,
      steps,
      loggedAt,
      clientEventId,
    } = req.body;

    // Validation
    if (!minutes || minutes <= 0) {
      return res.status(400).json({ error: 'Duration in minutes is required and must be positive' });
    }

    if (minutes > 1440) {
      return res.status(400).json({ error: 'Duration cannot exceed 24 hours (1440 minutes)' });
    }

    if (clientEventId && !UUID_RE.test(clientEventId)) {
      return res.status(400).json({ error: 'clientEventId must be a valid UUID v4' });
    }

    // Idempotency check
    if (clientEventId) {
      const existing = await db
        .select()
        .from(activityLogTable)
        .where(
          and(
            eq(activityLogTable.userId, userId),
            eq(activityLogTable.clientEventId, clientEventId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`[Activity] Idempotency hit for clientEventId: ${clientEventId}`);
        return res.json({
          success: true,
          log: existing[0],
          idempotent: true,
          message: 'Activity already logged',
        });
      }
    }

    // Get user's weight for accurate calorie calculation
    const userProfile = await db
      .select({ weightKg: profilesTable.weightKg })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    const weightKg = userProfile[0]?.weightKg ? parseFloat(userProfile[0].weightKg) : 70;

    // Calculate calories using MET formula
    const { calories, metValue } = calculateCaloriesFromMET(type, intensity, minutes, weightKg);

    // Prepare log data
    const loggedDate = loggedAt ? new Date(loggedAt) : new Date();
    const dayKey = getDayKey(loggedDate, offsetMinutes);

    // Insert activity log
    const [newLog] = await db
      .insert(activityLogTable)
      .values({
        userId,
        type,
        durationMinutes: minutes,
        intensity,
        metValue: metValue.toString(),
        caloriesBurned: calories,
        heartRateAvg: heartRateAvg || null,
        distanceKm: distanceKm ? distanceKm.toString() : null,
        steps: steps || null,
        notes: notes || null,
        clientEventId: clientEventId || null,
        dayKey,
        timezoneOffset: offsetMinutes,
        loggedAt: loggedDate,
      })
      .returning();

    // Invalidate signal cache so the next recommendation fetch reflects this activity
    if (newLog) {
      invalidateUserSignals(userId);
    }

    // Update streak for activity log
    let streakResult = null;
    try {
      streakResult = await updateStreak(userId, loggedDate, db, offsetMinutes);
      console.log(`[Activity] Streak updated: ${streakResult.streak}, incremented: ${streakResult.streakIncremented}`);
    } catch (streakError) {
      console.error('[Activity] Streak update failed (non-fatal):', streakError);
    }

    // Award XP for activity log
    let xpResult = null;
    try {
      const xpToAward = calculateActivityXP(minutes, intensity);
      xpResult = await awardXP(userId, xpToAward, 'activity_log', db);
      console.log(`[Activity] XP awarded: +${xpToAward} XP for ${minutes}min ${intensity} (total: ${xpResult.newXP}, level: ${xpResult.newLevel})`);
    } catch (xpError) {
      console.error('[Activity] XP award failed (non-fatal):', xpError);
    }

    // Clear pattern cache for this user (new data invalidates cached patterns)
    clearPatternCache(userId);

    res.json({
      success: true,
      log: newLog,
      calories,
      metValue,
      xp: xpResult ? { awarded: calculateActivityXP(minutes, intensity), total: xpResult.newXP } : null,
      streak: streakResult ? { current: streakResult.streak, incremented: streakResult.streakIncremented } : null,
      message: `Logged ${minutes} minutes of ${type} (${calories} cal burned)`,
    });
  } catch (error) {
    console.error('[Activity] POST /log error:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// ============================================================================
// GET TODAY'S ACTIVITY SUMMARY
// ============================================================================

router.get('/today', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const today = getDayKey(new Date(), offsetMinutes);

    // Get today's activities
    const activities = await db
      .select()
      .from(activityLogTable)
      .where(
        and(
          eq(activityLogTable.userId, userId),
          eq(activityLogTable.dayKey, today)
        )
      )
      .orderBy(desc(activityLogTable.loggedAt));

    const summary = getActivitySummary(activities);

    // Get weekly progress
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const weeklyActivities = await db
      .select({
        totalMinutes: sum(activityLogTable.durationMinutes),
      })
      .from(activityLogTable)
      .where(
        and(
          eq(activityLogTable.userId, userId),
          gte(activityLogTable.loggedAt, weekStart)
        )
      );

    const weeklyMinutes = parseInt(weeklyActivities[0]?.totalMinutes) || 0;
    const weeklyProgress = getWeeklyProgress(weeklyMinutes);

    res.json({
      success: true,
      today: {
        ...summary,
        dayKey: today,
      },
      activities,
      weeklyProgress,
    });
  } catch (error) {
    console.error('[Activity] GET /today error:', error);
    res.status(500).json({ error: 'Failed to get today\'s activity' });
  }
});

// ============================================================================
// GET ACTIVITY HISTORY
// ============================================================================

router.get('/history', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { days = 30, type, limit = 100, offset = 0 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    // Build query conditions
    const conditions = [
      eq(activityLogTable.userId, userId),
      gte(activityLogTable.loggedAt, startDate),
    ];

    if (type && type !== 'all') {
      conditions.push(eq(activityLogTable.type, type));
    }

    // Get activities
    const activities = await db
      .select()
      .from(activityLogTable)
      .where(and(...conditions))
      .orderBy(desc(activityLogTable.loggedAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(activityLogTable)
      .where(and(...conditions));

    // Get summary stats
    const summary = getActivitySummary(activities);

    res.json({
      success: true,
      activities,
      total: countResult?.count || 0,
      summary,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + activities.length) < (countResult?.count || 0),
      },
    });
  } catch (error) {
    console.error('[Activity] GET /history error:', error);
    res.status(500).json({ error: 'Failed to get activity history' });
  }
});

// ============================================================================
// DELETE ACTIVITY
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const activityId = parseInt(req.params.id);

    if (!activityId || isNaN(activityId)) {
      return res.status(400).json({ error: 'Invalid activity ID' });
    }

    // Verify ownership and delete
    const deleted = await db
      .delete(activityLogTable)
      .where(
        and(
          eq(activityLogTable.id, activityId),
          eq(activityLogTable.userId, userId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Activity not found or not owned by user' });
    }

    res.json({
      success: true,
      deleted: deleted[0],
      message: 'Activity deleted successfully',
    });
  } catch (error) {
    console.error('[Activity] DELETE /:id error:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// ============================================================================
// WEEK DATA (for charts)
// ============================================================================

router.get('/week-data', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);

    // Get last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(getDayKey(date, offsetMinutes));
    }

    // Get activities for each day
    const weekData = await Promise.all(
      days.map(async (dayKey) => {
        const activities = await db
          .select()
          .from(activityLogTable)
          .where(
            and(
              eq(activityLogTable.userId, userId),
              eq(activityLogTable.dayKey, dayKey)
            )
          );

        const summary = getActivitySummary(activities);
        return {
          dayKey,
          ...summary,
        };
      })
    );

    res.json({
      success: true,
      weekData,
      days,
    });
  } catch (error) {
    console.error('[Activity] GET /week-data error:', error);
    res.status(500).json({ error: 'Failed to get week data' });
  }
});

// ============================================================================
// FULL DASHBOARD ANALYTICS
// ============================================================================

router.get('/analytics/dashboard', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const analytics = await activityAnalyticsService.getDashboardAnalytics(userId);

    res.json(analytics);
  } catch (error) {
    console.error('[Activity] GET /analytics/dashboard error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ============================================================================
// COLD START STAGE
// ============================================================================

router.get('/analytics/cold-start', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const coldStart = await activityAnalyticsService.getColdStartStage(userId);

    res.json(coldStart);
  } catch (error) {
    console.error('[Activity] GET /analytics/cold-start error:', error);
    res.status(500).json({ error: 'Failed to get cold start stage' });
  }
});

// ============================================================================
// PATTERN ANALYSIS
// ============================================================================

router.get('/analytics/patterns', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const days = parseInt(req.query.days) || 30;

    const patterns = await activityAnalyticsService.analyzeActivityPatterns(userId, days);

    res.json({
      patterns,
      days,
    });
  } catch (error) {
    console.error('[Activity] GET /analytics/patterns error:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// ============================================================================
// TOMORROW'S PREDICTION
// ============================================================================

router.get('/analytics/prediction/tomorrow', async (req, res) => {
  try {
    const userId = req.auth.userId;

    const patterns = await activityAnalyticsService.analyzeActivityPatterns(userId, 30);
    const prediction = await activityAnalyticsService.predictTomorrow(userId, patterns);

    res.json(prediction);
  } catch (error) {
    console.error('[Activity] GET /analytics/prediction/tomorrow error:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// ============================================================================
// AI RECOMMENDATIONS
// ============================================================================

router.get('/analytics/recommendations', async (req, res) => {
  try {
    const userId = req.auth.userId;

    const [patterns, correlations] = await Promise.all([
      activityAnalyticsService.analyzeActivityPatterns(userId, 30),
      activityAnalyticsService.analyzeCorrelations(userId, 30),
    ]);

    const recommendations = await activityAnalyticsService.generateAIRecommendations(
      userId,
      patterns,
      correlations
    );

    res.json({
      recommendations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Activity] GET /analytics/recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// ============================================================================
// AI-POWERED INSIGHTS (POST for cache control)
// ============================================================================

router.post('/insights', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { days = 30 } = req.body;

    // Get activity count for minimum data check
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [activityCountResult] = await db
      .select({ count: count() })
      .from(activityLogTable)
      .where(
        and(
          eq(activityLogTable.userId, userId),
          gte(activityLogTable.loggedAt, startDate)
        )
      );

    const activityCount = activityCountResult?.count || 0;
    const minActivities = 7;

    // Check minimum data
    if (activityCount < minActivities) {
      return res.json({
        insights: [],
        message: `Need more data for insights. Currently have ${activityCount}/${minActivities} activities.`,
        dataPoints: { activities: activityCount },
        minDataRequired: { activities: minActivities },
      });
    }

    // Generate AI insights
    const [patterns, correlations] = await Promise.all([
      activityAnalyticsService.analyzeActivityPatterns(userId, days),
      activityAnalyticsService.analyzeCorrelations(userId, days),
    ]);

    const insights = await generateActivityInsights(patterns, correlations, days);

    res.json({
      insights,
      dataPoints: { activities: activityCount },
      minDataRequired: { activities: minActivities },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Activity] POST /insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// ============================================================================
// FEEDBACK
// ============================================================================

router.post('/analytics/feedback', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { insightType, insightId, wasHelpful, dismissed, dismissReason } = req.body;

    // Store feedback using raw SQL since we don't have a dedicated feedback table for activity
    await db.execute(sql`
      INSERT INTO insight_feedback (user_id, insight_type, insight_id, was_helpful, dismissed, dismiss_reason, created_at)
      VALUES (${userId}, ${`activity_${insightType}`}, ${insightId}, ${wasHelpful ?? null}, ${dismissed ?? false}, ${dismissReason ?? null}, NOW())
      ON CONFLICT (user_id, insight_type, insight_id) DO UPDATE
      SET was_helpful = ${wasHelpful ?? null}, dismissed = ${dismissed ?? false}, dismiss_reason = ${dismissReason ?? null}, updated_at = NOW()
    `);

    res.json({ success: true });
  } catch (error) {
    console.error('[Activity] POST /analytics/feedback error:', error);
    // Don't fail the request if feedback storage fails
    res.json({ success: true, warning: 'Feedback noted but storage may have failed' });
  }
});

// ============================================================================
// HELPER: Generate AI Insights
// ============================================================================

async function generateActivityInsights(patterns, correlations, days) {
  try {
    const prompt = buildInsightsPrompt(patterns, correlations, days);

    const response = await openaiClient.sdk.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a health insights generator. Analyze the user's activity data and provide simple, helpful insights.

Focus on:
- Celebrating progress and achievements
- Identifying patterns (time of day, type preferences)
- Providing specific, actionable next steps

Respond with a JSON array of 3-5 insights. Each insight should have:
- type: 'positive' | 'achievement' | 'suggestion' | 'tip'
- title: Short headline (3-6 words)
- message: Simple, helpful insight (1-2 sentences)
- confidence: 0.0-1.0 based on data strength

Keep language simple and encouraging. No technical jargon.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const content = response.choices?.[0]?.message?.content || '[]';
    const jsonMatch = content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return getFallbackInsights(patterns);
  } catch (error) {
    console.error('[Activity] generateActivityInsights error:', error);
    return getFallbackInsights(patterns);
  }
}

function buildInsightsPrompt(patterns, correlations, days) {
  const parts = [`Activity Data (${days} days):`];

  if (patterns) {
    parts.push(`- Total activity: ${Math.round(patterns.totalMinutes)} minutes`);
    parts.push(`- Weekly average: ${Math.round(patterns.weeklyMinutes)} minutes`);
    parts.push(`- Daily average: ${Math.round(patterns.avgDaily)} minutes`);
    parts.push(`- Weekly target progress: ${Math.round((patterns.cdcProgress || 0) * 100)}%`);
    parts.push(`- Consistency: ${Math.round((patterns.consistencyScore || 0) * 100)}%`);

    if (patterns.peakHour !== undefined) {
      parts.push(`- Most active hour: ${patterns.peakHour}:00`);
    }

    if (patterns.typeDistribution && Object.keys(patterns.typeDistribution).length > 0) {
      parts.push(`- Activity types: ${JSON.stringify(patterns.typeDistribution)}`);
    }
  }

  parts.push('\nGenerate 3-5 personalized insights based on this data.');

  return parts.join('\n');
}

function getFallbackInsights(patterns) {
  const insights = [];

  if (patterns?.cdcProgress >= 1) {
    insights.push({
      type: 'achievement',
      title: 'Weekly Goal Met!',
      message: 'You\'re meeting the recommended 150 minutes of weekly activity. Great work!',
      confidence: 0.9,
    });
  } else if (patterns?.cdcProgress >= 0.5) {
    insights.push({
      type: 'positive',
      title: 'Making Progress',
      message: `You're at ${Math.round((patterns?.cdcProgress || 0) * 100)}% of your weekly activity goal. Keep it up!`,
      confidence: 0.85,
    });
  }

  if (patterns?.consistencyScore >= 0.7) {
    insights.push({
      type: 'positive',
      title: 'Great Consistency',
      message: 'You\'re staying active regularly. Consistency is key to building lasting habits.',
      confidence: 0.88,
    });
  }

  if (patterns?.periodDistribution?.morning > 0.4) {
    insights.push({
      type: 'tip',
      title: 'Morning Person',
      message: 'You prefer morning activity. This can help boost your energy for the whole day.',
      confidence: 0.82,
    });
  }

  // Always add a general tip
  insights.push({
    type: 'tip',
    title: 'Stay Active',
    message: 'Regular activity helps improve mood and energy levels throughout the day.',
    confidence: 0.9,
  });

  return insights.slice(0, 5);
}

// ============================================================================
// AI-POWERED ACTIVITY INTELLIGENCE (NEW RECOMMENDATION ENGINE)
// ============================================================================

/**
 * GET /activity/intelligence
 * Returns comprehensive personalized activity recommendations with:
 * - Recovery score (WHOOP-style)
 * - Strain target
 * - Personalized activity recommendations with explanations
 * - Weekly insights
 */
router.get('/intelligence', async (req, res) => {
  try {
    const userId = req.auth.userId;

    const intelligence = await getActivityIntelligence(userId);

    if (intelligence.error) {
      return res.status(500).json({ error: intelligence.error });
    }

    res.json(intelligence);
  } catch (error) {
    console.error('[Activity] GET /intelligence error:', error);
    res.status(500).json({ error: 'Failed to generate activity intelligence' });
  }
});

export default router;
