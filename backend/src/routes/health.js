/**
 * Health Platform API Routes
 *
 * Endpoints for HealthKit/Google Fit integration
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import healthPlatformService from '../services/healthPlatformService.js';
import analyticsEventPipeline from '../services/analyticsEventPipeline.js';

const router = express.Router();

// Middleware
router.use(requireAuth());

// ============================================================================
// PERMISSIONS
// ============================================================================

/**
 * GET /api/health/permissions
 * Get user's health platform permissions
 */
router.get('/permissions', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { platform = 'healthkit' } = req.query;

    const permissions = await healthPlatformService.getPermissions(userId, platform);

    res.json({
      success: true,
      platform,
      permissions,
    });
  } catch (error) {
    console.error('[Health] Permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get permissions' });
  }
});

/**
 * POST /api/health/permissions
 * Update health platform permissions (from mobile app)
 */
router.post('/permissions', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { platform, permissions } = req.body;

    await healthPlatformService.updateSettings(userId, platform, {
      permissions,
    });

    analyticsEventPipeline?.trackEvent({
      userId,
      eventType: 'health',
      eventName: 'permissions_updated',
      properties: { platform, granted: permissions.granted },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Health] Update permissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to update permissions' });
  }
});

// ============================================================================
// ACTIVITY DATA
// ============================================================================

/**
 * GET /api/health/activity/today
 * Get today's activity summary
 */
router.get('/activity/today', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const summary = await healthPlatformService.getHealthSummary(userId, new Date());

    res.json({
      success: true,
      activity: summary?.activity || {},
      steps: summary?.activity?.steps?.total || 0,
      activeCalories: summary?.activity?.activeEnergy?.total || 0,
      distance: summary?.activity?.distance?.total || 0,
    });
  } catch (error) {
    console.error('[Health] Activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to get activity' });
  }
});

/**
 * GET /api/health/activity/history
 * Get activity history for specified days
 */
router.get('/activity/history', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { days = 7 } = req.query;

    const trends = await healthPlatformService.getHealthTrends(userId, 'steps', parseInt(days));

    res.json({
      success: true,
      days: parseInt(days),
      data: trends?.data || [],
      trend: trends?.trend,
    });
  } catch (error) {
    console.error('[Health] Activity history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get activity history' });
  }
});

// ============================================================================
// SLEEP DATA
// ============================================================================

/**
 * GET /api/health/sleep
 * Get sleep data for a specific date
 */
router.get('/sleep', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const summary = await healthPlatformService.getHealthSummary(userId, targetDate);

    res.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      sleep: summary?.sleep || {},
      totalHours: summary?.sleep?.totalHours || 0,
    });
  } catch (error) {
    console.error('[Health] Sleep error:', error);
    res.status(500).json({ success: false, error: 'Failed to get sleep data' });
  }
});

// ============================================================================
// HEART RATE
// ============================================================================

/**
 * GET /api/health/heart-rate
 * Get heart rate data
 */
router.get('/heart-rate', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const trends = await healthPlatformService.getHealthTrends(userId, 'heartRate', 1);

    res.json({
      success: true,
      date: targetDate.toISOString().split('T')[0],
      average: trends?.data?.[0]?.average || null,
      min: trends?.data?.[0]?.min || null,
      max: trends?.data?.[0]?.max || null,
    });
  } catch (error) {
    console.error('[Health] Heart rate error:', error);
    res.status(500).json({ success: false, error: 'Failed to get heart rate' });
  }
});

// ============================================================================
// BODY MEASUREMENTS
// ============================================================================

/**
 * GET /api/health/body
 * Get body measurements
 */
router.get('/body', async (req, res) => {
  try {
    const userId = req.auth.userId;

    const [weightTrend, bodyFatTrend] = await Promise.all([
      healthPlatformService.getHealthTrends(userId, 'weight', 30),
      healthPlatformService.getHealthTrends(userId, 'bodyFat', 30),
    ]);

    // Get most recent values
    const latestWeight = weightTrend?.data?.[weightTrend.data.length - 1];
    const latestBodyFat = bodyFatTrend?.data?.[bodyFatTrend.data.length - 1];

    res.json({
      success: true,
      weight: latestWeight?.average || null,
      weightUnit: 'kg',
      weightTrend: weightTrend?.trend,
      bodyFat: latestBodyFat?.average || null,
      bodyFatTrend: bodyFatTrend?.trend,
    });
  } catch (error) {
    console.error('[Health] Body error:', error);
    res.status(500).json({ success: false, error: 'Failed to get body measurements' });
  }
});

// ============================================================================
// HEALTH INSIGHTS
// ============================================================================

/**
 * GET /api/health/insights
 * Get combined health insights
 */
router.get('/insights', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const summary = await healthPlatformService.getHealthSummary(userId, new Date());

    // Generate insights based on health data
    const insights = [];

    // Activity insights
    if (summary?.activity?.steps) {
      const steps = summary.activity.steps.total;
      const stepGoal = 10000;

      if (steps >= stepGoal) {
        insights.push({
          type: 'achievement',
          category: 'activity',
          title: 'Step Goal Achieved!',
          message: `You've hit ${steps.toLocaleString()} steps today!`,
          icon: 'footsteps',
          color: '#10B981',
        });
      } else if (steps >= stepGoal * 0.5) {
        insights.push({
          type: 'progress',
          category: 'activity',
          title: 'Halfway There',
          message: `${steps.toLocaleString()} steps - keep going!`,
          icon: 'walk',
          color: '#3B82F6',
        });
      }
    }

    // Sleep insights
    if (summary?.sleep?.totalHours) {
      const sleepHours = parseFloat(summary.sleep.totalHours);

      if (sleepHours >= 7 && sleepHours <= 9) {
        insights.push({
          type: 'positive',
          category: 'sleep',
          title: 'Great Sleep',
          message: `${sleepHours.toFixed(1)} hours - well rested!`,
          icon: 'moon',
          color: '#8B5CF6',
        });
      } else if (sleepHours < 6) {
        insights.push({
          type: 'warning',
          category: 'sleep',
          title: 'Sleep Deficit',
          message: `Only ${sleepHours.toFixed(1)} hours - try to rest more`,
          icon: 'alert-circle',
          color: '#EF4444',
        });
      }
    }

    res.json({
      success: true,
      insights,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Health] Insights error:', error);
    res.status(500).json({ success: false, error: 'Failed to get insights' });
  }
});

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * POST /api/health/sync
 * Trigger sync with health platform
 */
router.post('/sync', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { platform = 'healthkit', dataTypes, forceFullSync = false } = req.body;

    const result = await healthPlatformService.syncWithHealthPlatform(userId, platform, {
      dataTypes,
      forceFullSync,
    });

    analyticsEventPipeline?.trackEvent({
      userId,
      eventType: 'health',
      eventName: 'sync_completed',
      properties: {
        platform,
        imported: result.imported?.count || 0,
        exported: result.exported?.count || 0,
        duration: result.durationMs,
      },
    });

    res.json({
      success: result.success,
      imported: result.imported,
      exported: result.exported,
      errors: result.errors,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error('[Health] Sync error:', error);
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

/**
 * POST /api/health/nutrition
 * Write nutrition data to health platform
 */
router.post('/nutrition', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const nutritionData = req.body;

    // This would trigger the mobile app to write to HealthKit/Google Fit
    // For now, we just acknowledge the request
    analyticsEventPipeline?.trackEvent({
      userId,
      eventType: 'health',
      eventName: 'nutrition_written',
      properties: {
        calories: nutritionData.calories,
        mealType: nutritionData.mealType,
      },
    });

    res.json({
      success: true,
      message: 'Nutrition data queued for sync',
    });
  } catch (error) {
    console.error('[Health] Nutrition write error:', error);
    res.status(500).json({ success: false, error: 'Failed to write nutrition' });
  }
});

/**
 * POST /api/health/water
 * Write water intake to health platform
 */
router.post('/water', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { amount, timestamp } = req.body;

    analyticsEventPipeline?.trackEvent({
      userId,
      eventType: 'health',
      eventName: 'water_written',
      properties: { amount },
    });

    res.json({
      success: true,
      message: 'Water intake queued for sync',
    });
  } catch (error) {
    console.error('[Health] Water write error:', error);
    res.status(500).json({ success: false, error: 'Failed to write water' });
  }
});

/**
 * POST /api/health/written
 * Callback from mobile app when data is written to health platform
 */
router.post('/written', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { platform, type, data, timestamp } = req.body;

    analyticsEventPipeline?.trackEvent({
      userId,
      eventType: 'health',
      eventName: 'data_written_confirmed',
      properties: { platform, type },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Health] Write callback error:', error);
    res.status(500).json({ success: false, error: 'Failed to process callback' });
  }
});

export default router;
