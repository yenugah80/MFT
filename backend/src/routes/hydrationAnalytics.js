/**
 * Hydration Analytics Routes
 *
 * Provides endpoints for:
 * - Cold start stage detection
 * - Pattern analysis
 * - Persona classification
 * - Prediction generation
 * - User profile management
 * - Insight feedback
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireFlag, FLAG_NAMES } from '../middleware/featureFlags.js';
import {
  getColdStartStage,
  analyzeHydrationPatterns,
  classifyPersona,
  generatePrediction,
  getAnalyticsDashboard,
  getOrCreateHydrationProfile,
  updateOnboardingStage,
  savePrediction,
  getTomorrowPrediction,
  recordInsightFeedback,
  getDismissedInsightTypes,
  computeDailySummary,
} from '../services/hydrationAnalyticsService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth());

// ============================================================================
// DASHBOARD ANALYTICS (Main endpoint for mobile app)
// ============================================================================

/**
 * GET /api/hydration/analytics/dashboard
 * Returns complete analytics dashboard data including:
 * - Cold start stage
 * - Patterns (if enough data)
 * - Persona (if established)
 * - Tomorrow's prediction
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Try to ensure user has a hydration profile (graceful if table doesn't exist)
    try {
      await getOrCreateHydrationProfile(userId);
    } catch (profileError) {
      // Table might not exist yet on production - continue without profile
      console.warn('[HydrationAnalytics] Profile creation skipped (table may not exist):', profileError.message);
    }

    // Get full analytics dashboard
    const dashboard = await getAnalyticsDashboard(userId);

    // Try to get dismissed insight types (graceful if table doesn't exist)
    let dismissedTypes = [];
    try {
      dismissedTypes = await getDismissedInsightTypes(userId);
    } catch (dismissedError) {
      console.warn('[HydrationAnalytics] Dismissed types fetch skipped:', dismissedError.message);
    }

    res.json({
      ...dashboard,
      dismissedInsightTypes: dismissedTypes,
    });
  } catch (error) {
    console.error('[HydrationAnalytics] Dashboard error:', error);
    // Return fallback data instead of 500 error
    res.json({
      coldStart: { stage: 'day0', daysSinceFirstLog: 0, totalLogs: 0, distinctDays: 0 },
      patterns: null,
      persona: null,
      personaConfidence: 0,
      prediction: null,
      dismissedInsightTypes: [],
      error: 'Analytics temporarily unavailable',
    });
  }
});

// ============================================================================
// COLD START
// ============================================================================

/**
 * GET /api/hydration/analytics/cold-start
 * Returns user's cold start stage and progression
 */
router.get('/cold-start', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const coldStart = await getColdStartStage(userId);

    res.json(coldStart);
  } catch (error) {
    console.error('[HydrationAnalytics] Cold start error:', error);
    res.status(500).json({ error: 'Failed to fetch cold start stage' });
  }
});

// ============================================================================
// PATTERNS
// ============================================================================

/**
 * GET /api/hydration/analytics/patterns
 * Returns detected hydration patterns
 * Query params:
 *   days: number of days to analyze (default: 30)
 */
router.get('/patterns', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const days = parseInt(req.query.days) || 30;

    const patterns = await analyzeHydrationPatterns(userId, days);

    res.json(patterns);
  } catch (error) {
    console.error('[HydrationAnalytics] Patterns error:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// ============================================================================
// PERSONA
// ============================================================================

/**
 * GET /api/hydration/analytics/persona
 * Returns user's hydration persona classification
 */
router.get('/persona', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const persona = await classifyPersona(userId);

    res.json(persona);
  } catch (error) {
    console.error('[HydrationAnalytics] Persona error:', error);
    res.status(500).json({ error: 'Failed to classify persona' });
  }
});

// ============================================================================
// PREDICTIONS
// ============================================================================

/**
 * GET /api/hydration/analytics/prediction/tomorrow
 * Returns tomorrow's hydration prediction
 */
router.get('/prediction/tomorrow', async (req, res) => {
  try {
    const userId = req.auth.userId;

    // First check if we have a cached prediction
    let prediction = await getTomorrowPrediction(userId);

    if (!prediction) {
      // Generate new prediction
      const context = {
        meetingCount: req.query.meetingCount ? parseInt(req.query.meetingCount) : undefined,
      };

      prediction = await generatePrediction(userId, context);

      // Save prediction if successful
      if (prediction.hasPrediction) {
        await savePrediction(userId, prediction);
      }
    }

    res.json(prediction);
  } catch (error) {
    console.error('[HydrationAnalytics] Prediction error:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

/**
 * POST /api/hydration/analytics/prediction/refresh
 * Forces regeneration of tomorrow's prediction
 */
router.post('/prediction/refresh', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { meetingCount } = req.body;

    const context = { meetingCount };
    const prediction = await generatePrediction(userId, context);

    if (prediction.hasPrediction) {
      await savePrediction(userId, prediction);
    }

    res.json(prediction);
  } catch (error) {
    console.error('[HydrationAnalytics] Prediction refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh prediction' });
  }
});

// ============================================================================
// PROFILE
// ============================================================================

/**
 * GET /api/hydration/analytics/profile
 * Returns user's hydration profile
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const profile = await getOrCreateHydrationProfile(userId);

    res.json(profile);
  } catch (error) {
    console.error('[HydrationAnalytics] Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * POST /api/hydration/analytics/profile/refresh-stage
 * Refreshes the user's onboarding stage based on current data
 */
router.post('/profile/refresh-stage', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const newStage = await updateOnboardingStage(userId);

    res.json({ stage: newStage });
  } catch (error) {
    console.error('[HydrationAnalytics] Stage refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh stage' });
  }
});

// ============================================================================
// FEEDBACK
// ============================================================================

/**
 * POST /api/hydration/analytics/feedback
 * Records user feedback on an insight
 * Body:
 *   insightType: 'prediction' | 'pattern' | 'persona' | 'suggestion'
 *   insightId: string
 *   wasHelpful: boolean
 *   dismissed: boolean
 *   dismissReason: string (optional)
 *   feedbackText: string (optional)
 *   accuracyRating: number 1-5 (optional)
 */
router.post('/feedback', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { insightType, insightId, ...feedback } = req.body;

    if (!insightType || !insightId) {
      return res.status(400).json({ error: 'insightType and insightId are required' });
    }

    const result = await recordInsightFeedback(userId, insightType, insightId, feedback);

    res.json({ success: true, feedback: result });
  } catch (error) {
    console.error('[HydrationAnalytics] Feedback error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * GET /api/hydration/analytics/feedback/dismissed
 * Returns list of dismissed insight types for filtering
 */
router.get('/feedback/dismissed', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const dismissed = await getDismissedInsightTypes(userId);

    res.json({ dismissedTypes: dismissed });
  } catch (error) {
    console.error('[HydrationAnalytics] Dismissed feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch dismissed types' });
  }
});

// ============================================================================
// AGGREGATION (Internal/Admin)
// ============================================================================

/**
 * POST /api/hydration/analytics/aggregate
 * Triggers daily aggregation for a specific date
 * Body:
 *   date: ISO date string (defaults to yesterday)
 */
router.post('/aggregate', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const date = req.body.date ? new Date(req.body.date) : new Date(Date.now() - 86400000);

    const summary = await computeDailySummary(userId, date);

    res.json({ success: true, summary });
  } catch (error) {
    console.error('[HydrationAnalytics] Aggregation error:', error);
    res.status(500).json({ error: 'Failed to compute daily summary' });
  }
});

export default router;
