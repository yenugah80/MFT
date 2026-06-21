/**
 * Unified Analytics API Routes
 *
 * Provides endpoints for comprehensive analytics across all health domains
 * with multi-timeframe support and graceful degradation for incomplete data.
 *
 * ENDPOINTS:
 * - GET /analytics/availability - Check data availability status
 * - GET /analytics/daily - Get daily analytics
 * - GET /analytics/weekly - Get weekly analytics
 * - GET /analytics/monthly - Get monthly analytics
 * - GET /analytics/custom - Get custom date range analytics
 * - GET /analytics/wellness - Get overall wellness score
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  assessDataAvailability,
  getTimeframeAnalytics,
  interpolateMissingDays,
  TIMEFRAMES,
} from '../services/unifiedAnalyticsEngine.js';
import { getAnalyticsRecommendations } from '../services/analyticsRecommendationService.js';

const router = express.Router();

/**
 * GET /api/analytics/availability
 * Check data availability and quality for all domains
 */
router.get('/availability', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const lookbackDays = parseInt(req.query.days) || 30;

    const availability = await assessDataAvailability(userId, lookbackDays);

    res.json({
      success: true,
      ...availability,
    });
  } catch (error) {
    console.error('[UnifiedAnalytics API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assess data availability',
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/daily
 * Get daily analytics for a specific date
 */
router.get('/daily', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const dateParam = req.query.date;

    const referenceDate = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(referenceDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const analytics = await getTimeframeAnalytics(userId, TIMEFRAMES.DAILY, referenceDate);

    res.json({
      success: true,
      ...analytics,
    });
  } catch (error) {
    console.error('[UnifiedAnalytics API] Daily error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily analytics',
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/weekly
 * Get weekly analytics for the week containing the specified date
 */
router.get('/weekly', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const dateParam = req.query.date;

    const referenceDate = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(referenceDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const analytics = await getTimeframeAnalytics(userId, TIMEFRAMES.WEEKLY, referenceDate);

    res.json({
      success: true,
      ...analytics,
    });
  } catch (error) {
    console.error('[UnifiedAnalytics API] Weekly error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get weekly analytics',
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/monthly
 * Get monthly analytics for the month containing the specified date
 */
router.get('/monthly', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const dateParam = req.query.date;

    const referenceDate = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(referenceDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    const analytics = await getTimeframeAnalytics(userId, TIMEFRAMES.MONTHLY, referenceDate);

    res.json({
      success: true,
      ...analytics,
    });
  } catch (error) {
    console.error('[UnifiedAnalytics API] Monthly error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monthly analytics',
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/custom
 * Get analytics for a custom date range
 */
router.get('/custom', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Both startDate and endDate are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'startDate must be before endDate',
      });
    }

    // Limit to 90 days max
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return res.status(400).json({
        success: false,
        error: 'Date range cannot exceed 90 days',
      });
    }

    // Use the midpoint date for analytics
    const midpoint = new Date((start.getTime() + end.getTime()) / 2);
    const analytics = await getTimeframeAnalytics(userId, TIMEFRAMES.CUSTOM, midpoint);

    res.json({
      success: true,
      ...analytics,
      customPeriod: { start: startDate, end: endDate, days: daysDiff },
    });
  } catch (error) {
    console.error('[UnifiedAnalytics API] Custom error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get custom analytics',
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/wellness
 * Get overall wellness score summary
 */
router.get('/wellness', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const timeframe = req.query.timeframe || TIMEFRAMES.WEEKLY;

    if (!Object.values(TIMEFRAMES).includes(timeframe)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeframe. Use daily, weekly, or monthly',
      });
    }

    const analytics = await getTimeframeAnalytics(userId, timeframe);

    // Return just the wellness score portion
    res.json({
      success: true,
      userId,
      timeframe,
      period: analytics.period,
      wellness: analytics.wellness,
      dataQuality: analytics.dataQuality,
      recommendations: analytics.recommendations.slice(0, 3),
      generatedAt: analytics.generatedAt,
    });
  } catch (error) {
    console.error('[UnifiedAnalytics API] Wellness error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wellness score',
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/trends
 * Get trend comparison between two periods
 */
router.get('/trends', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const timeframe = req.query.timeframe || TIMEFRAMES.WEEKLY;

    // Get current period
    const currentAnalytics = await getTimeframeAnalytics(userId, timeframe);

    // Get previous period
    const previousDate = new Date();
    if (timeframe === TIMEFRAMES.DAILY) {
      previousDate.setDate(previousDate.getDate() - 1);
    } else if (timeframe === TIMEFRAMES.WEEKLY) {
      previousDate.setDate(previousDate.getDate() - 7);
    } else {
      previousDate.setMonth(previousDate.getMonth() - 1);
    }
    const previousAnalytics = await getTimeframeAnalytics(userId, timeframe, previousDate);

    // Calculate trends
    const trends = calculateTrends(currentAnalytics, previousAnalytics);

    res.json({
      success: true,
      userId,
      timeframe,
      current: {
        period: currentAnalytics.period,
        wellness: currentAnalytics.wellness,
      },
      previous: {
        period: previousAnalytics.period,
        wellness: previousAnalytics.wellness,
      },
      trends,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[UnifiedAnalytics API] Trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trends',
      message: error.message,
    });
  }
});

/**
 * Calculate trends between two periods
 */
function calculateTrends(current, previous) {
  const trends = {};

  // Wellness trend
  if (current.wellness?.overall != null && previous.wellness?.overall != null) {
    const diff = current.wellness.overall - previous.wellness.overall;
    trends.wellness = {
      current: current.wellness.overall,
      previous: previous.wellness.overall,
      change: diff,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      percentage: previous.wellness.overall > 0
        ? Math.round((diff / previous.wellness.overall) * 100)
        : null,
    };
  }

  // Food trends
  if (current.food?.hasData && previous.food?.hasData) {
    const calDiff = (current.food.averages?.caloriesPerDay || 0) -
                    (previous.food.averages?.caloriesPerDay || 0);
    trends.calories = {
      current: current.food.averages?.caloriesPerDay || 0,
      previous: previous.food.averages?.caloriesPerDay || 0,
      change: calDiff,
      direction: calDiff > 50 ? 'up' : calDiff < -50 ? 'down' : 'stable',
    };
  }

  // Hydration trends
  if (current.hydration?.hasData && previous.hydration?.hasData) {
    const hydDiff = (current.hydration.averages?.litersPerDay || 0) -
                    (previous.hydration.averages?.litersPerDay || 0);
    trends.hydration = {
      current: current.hydration.averages?.litersPerDay || 0,
      previous: previous.hydration.averages?.litersPerDay || 0,
      change: Math.round(hydDiff * 100) / 100,
      direction: hydDiff > 0.1 ? 'up' : hydDiff < -0.1 ? 'down' : 'stable',
    };
  }

  // Mood trends
  if (current.mood?.hasData && previous.mood?.hasData) {
    const moodDiff = (current.mood.averages?.intensity || 0) -
                     (previous.mood.averages?.intensity || 0);
    trends.mood = {
      current: current.mood.averages?.intensity || 0,
      previous: previous.mood.averages?.intensity || 0,
      change: Math.round(moodDiff * 10) / 10,
      direction: moodDiff > 0.5 ? 'up' : moodDiff < -0.5 ? 'down' : 'stable',
    };
  }

  return trends;
}

/**
 * GET /api/analytics/recommendations
 * Get comprehensive analytics with personalized recommendations for all domains
 *
 * World-class recommendation system inspired by Netflix/LinkedIn/Spotify
 * - Analytics from Day 1
 * - Recommendations from Day 2
 * - Cross-domain insights
 * - Evidence-anchored suggestions
 */
router.get('/recommendations', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const period = req.query.period || 'week'; // today, week, month, all

    const recommendations = await getAnalyticsRecommendations(userId, period);

    res.json(recommendations);
  } catch (error) {
    console.error('[UnifiedAnalytics API] Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics recommendations',
      message: error.message,
    });
  }
});

export default router;
