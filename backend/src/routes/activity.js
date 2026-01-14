/**
 * Activity Analytics Routes
 *
 * Evidence-based activity tracking and insights API
 *
 * Routes:
 * - POST /activity/log - Log a new activity
 * - GET /activity/analytics/dashboard - Full analytics dashboard
 * - GET /activity/analytics/cold-start - Cold start stage only
 * - GET /activity/analytics/patterns - Pattern analysis
 * - GET /activity/analytics/prediction/tomorrow - Tomorrow's prediction
 * - GET /activity/analytics/recommendations - AI recommendations
 * - POST /activity/insights - Generate AI-powered insights
 * - POST /activity/analytics/feedback - Record feedback
 * - GET /activity/week-data - Week chart data
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import activityAnalyticsService from '../services/activityAnalyticsService.js';
import { openaiClient } from '../services/apiClients/OpenAIClient.js';
import { updateStreak, calculateLogXP, awardXP } from '../services/gamificationRewardService.js';
import { parseTimezoneOffsetMinutes } from '../utils/timezone.js';

const router = express.Router();

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

router.use(requireAuth());

// ============================================================================
// LOG ACTIVITY
// ============================================================================

router.post('/log', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const { type, minutes, intensity, notes, loggedAt } = req.body;

    if (!minutes || minutes <= 0) {
      return res.status(400).json({ error: 'Duration in minutes is required' });
    }

    // Insert activity log
    const loggedDate = loggedAt ? new Date(loggedAt) : new Date();
    const result = await db.execute(sql`
      INSERT INTO activity_logs (user_id, type, duration_minutes, intensity, notes, logged_at)
      VALUES (${userId}, ${type || 'general'}, ${minutes}, ${intensity || 'moderate'}, ${notes || null}, ${loggedDate.toISOString()})
      RETURNING *
    `);

    const newLog = result.rows?.[0];

    // Update streak for activity log
    try {
      const streakResult = await updateStreak(userId, loggedDate, db, offsetMinutes);
      console.log(`[Activity] Streak updated: ${streakResult.streak}, incremented: ${streakResult.streakIncremented}`);
    } catch (streakError) {
      console.error("[Activity] Streak update failed (non-fatal):", streakError);
    }

    // Award XP for activity log (bonus based on duration)
    try {
      const xpToAward = calculateLogXP('activity', { durationMinutes: minutes });
      const xpResult = await awardXP(userId, xpToAward, 'activity_log', db);
      console.log(`[Activity] XP awarded: +${xpToAward} XP for ${minutes}min (total: ${xpResult.newXP}, level: ${xpResult.newLevel})`);
    } catch (xpError) {
      console.error("[Activity] XP award failed (non-fatal):", xpError);
    }

    res.json({
      success: true,
      log: newLog,
      message: `Logged ${minutes} minutes of ${type || 'activity'}`,
    });
  } catch (error) {
    console.error('[Activity] POST /log error:', error);
    res.status(500).json({ error: 'Failed to log activity' });
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
    const { days = 30, forceRefresh = false } = req.body;

    // Get activity count for minimum data check
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM activity_logs
      WHERE user_id = ${userId}
        AND logged_at >= NOW() - INTERVAL '${days} days'
    `);
    const activityCount = parseInt(countResult.rows?.[0]?.count) || 0;

    // Get mood count
    const moodCountResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM mood_logs
      WHERE user_id = ${userId}
        AND logged_at >= NOW() - INTERVAL '${days} days'
    `);
    const moodCount = parseInt(moodCountResult.rows?.[0]?.count) || 0;

    const minActivities = 7;
    const minMoods = 7;

    // Check minimum data
    if (activityCount < minActivities || moodCount < minMoods) {
      return res.json({
        insights: [],
        message: `Need more data for insights. Currently have ${activityCount}/${minActivities} activities and ${moodCount}/${minMoods} mood logs.`,
        dataPoints: { activities: activityCount, moods: moodCount },
        minDataRequired: { activities: minActivities, moods: minMoods },
      });
    }

    // Generate AI insights
    const [patterns, correlations] = await Promise.all([
      activityAnalyticsService.analyzeActivityPatterns(userId, days),
      activityAnalyticsService.analyzeCorrelations(userId, days),
    ]);

    const insights = await generateActivityInsights(userId, patterns, correlations, days);

    res.json({
      insights,
      dataPoints: { activities: activityCount, moods: moodCount },
      minDataRequired: { activities: minActivities, moods: minMoods },
      generatedAt: new Date().toISOString(),
      cached: false,
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

    // Store feedback (you'd create an activity_insight_feedback table)
    await db.execute(sql`
      INSERT INTO activity_insight_feedback (user_id, insight_type, insight_id, was_helpful, dismissed, dismiss_reason, created_at)
      VALUES (${userId}, ${insightType}, ${insightId}, ${wasHelpful ?? null}, ${dismissed ?? false}, ${dismissReason ?? null}, NOW())
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
// WEEK DATA
// ============================================================================

router.get('/week-data', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const weekData = await activityAnalyticsService.getWeekData(userId);

    res.json({ weekData });
  } catch (error) {
    console.error('[Activity] GET /week-data error:', error);
    res.status(500).json({ error: 'Failed to get week data' });
  }
});

// ============================================================================
// HELPER: Generate AI Insights
// ============================================================================

async function generateActivityInsights(userId, patterns, correlations, days) {
  try {
    const prompt = buildInsightsPrompt(patterns, correlations, days);

    const response = await openaiClient.sdk.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an evidence-based health insights generator. Analyze the user's activity data and provide personalized, actionable insights.

Base your insights on these research findings:
1. Physical activity directly reduces depression/anxiety/stress (66.9-73.5% direct effect)
2. Diet mediates 26.5-33.1% of the activity-mental health relationship
3. 150 min/week moderate activity is CDC target for health benefits
4. Consistency (5+ days/week tracking) predicts better outcomes
5. Morning activity correlates with improved mood throughout the day
6. Weekend activity drops are common but impact weekly progress

Respond with a JSON array of 3-5 insights. Each insight should have:
- type: 'positive' | 'achievement' | 'suggestion' | 'tip' | 'warning'
- title: Short headline (3-6 words)
- message: Actionable insight with evidence reference (1-2 sentences)
- confidence: 0.0-1.0 based on data strength

Focus on:
- Celebrating progress and achievements
- Identifying patterns (time of day, type preferences, consistency)
- Connecting activity to mood/food patterns when data supports it
- Providing specific, actionable next steps`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
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
  const parts = [`User Activity Data (${days} days):`];

  if (patterns) {
    parts.push(`- Total activity: ${Math.round(patterns.totalMinutes)} minutes`);
    parts.push(`- Weekly average: ${Math.round(patterns.weeklyMinutes)} minutes`);
    parts.push(`- Daily average: ${Math.round(patterns.avgDaily)} minutes`);
    parts.push(`- CDC target progress: ${Math.round(patterns.cdcProgress * 100)}%`);
    parts.push(`- Consistency score: ${Math.round(patterns.consistencyScore * 100)}%`);
    parts.push(`- Peak activity hour: ${patterns.peakHour}:00`);
    parts.push(`- Period breakdown: Morning ${Math.round(patterns.periodDistribution.morning * 100)}%, Afternoon ${Math.round(patterns.periodDistribution.afternoon * 100)}%, Evening ${Math.round(patterns.periodDistribution.evening * 100)}%`);

    if (patterns.weekendDrop > 0.1) {
      parts.push(`- Weekend drop: ${Math.round(patterns.weekendDrop * 100)}%`);
    }

    if (patterns.typeDistribution && Object.keys(patterns.typeDistribution).length > 0) {
      parts.push(`- Activity types: ${JSON.stringify(patterns.typeDistribution)}`);
    }
  }

  if (correlations?.correlations) {
    parts.push('\nCorrelation Analysis:');
    if (correlations.correlations.activityMood !== null) {
      parts.push(`- Activity ↔ Mood: ${correlations.correlations.activityMood.toFixed(2)}`);
    }
    if (correlations.correlations.activityFood !== null) {
      parts.push(`- Activity ↔ Food Quality: ${correlations.correlations.activityFood.toFixed(2)}`);
    }
    if (correlations.correlations.activityHydration !== null) {
      parts.push(`- Activity ↔ Hydration: ${correlations.correlations.activityHydration.toFixed(2)}`);
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
      title: 'CDC Target Achieved!',
      message: 'You\'re meeting the recommended 150 minutes of weekly activity. Research shows this level reduces depression risk by up to 30%.',
      confidence: 0.9,
    });
  } else if (patterns?.cdcProgress >= 0.5) {
    insights.push({
      type: 'positive',
      title: 'Halfway to CDC Target',
      message: `You're at ${Math.round((patterns?.cdcProgress || 0) * 100)}% of weekly activity goal. Even this level provides meaningful health benefits.`,
      confidence: 0.85,
    });
  }

  if (patterns?.consistencyScore >= 0.7) {
    insights.push({
      type: 'positive',
      title: 'Great Consistency',
      message: 'You\'re logging activity regularly. Research shows consistent tracking predicts 5x better long-term outcomes.',
      confidence: 0.88,
    });
  }

  if (patterns?.periodDistribution?.morning > 0.4) {
    insights.push({
      type: 'tip',
      title: 'Morning Mover',
      message: 'You prefer morning activity. Studies show morning exercise boosts mood and focus for up to 12 hours.',
      confidence: 0.82,
    });
  }

  if (patterns?.weekendDrop > 0.3) {
    insights.push({
      type: 'suggestion',
      title: 'Weekend Opportunity',
      message: `Your weekend activity drops ${Math.round((patterns?.weekendDrop || 0) * 100)}%. A 20-minute Saturday walk could improve your weekly consistency.`,
      confidence: 0.75,
    });
  }

  // Always add a general tip
  insights.push({
    type: 'tip',
    title: 'Activity-Diet Connection',
    message: 'Research shows physical activity improves food choices. Active days often lead to better nutrition decisions.',
    confidence: 0.9,
  });

  return insights.slice(0, 5);
}

export default router;
