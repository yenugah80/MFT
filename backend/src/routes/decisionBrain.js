/**
 * Decision Brain API Routes
 *
 * Unified intelligence endpoints for the Decision Brain service.
 * These endpoints power the frontend with real ML-backed recommendations.
 *
 * Endpoints:
 * - GET /api/decision-brain/recommendations - Get intelligent recommendations
 * - GET /api/decision-brain/mood-insights - Get mood-specific insights
 * - GET /api/decision-brain/status - Get user's learning status
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import {
  generateIntelligentRecommendations,
  generateMoodInsights,
  generateNutritionInsights,
  generateHydrationInsights,
  generateActivityInsights,
} from '../services/decisionBrainService.js';
import { getLearningStateSummary } from '../services/learningStateService.js';
import { errors } from '../utils/errorResponse.js';

const router = express.Router();

// Require authentication for all routes
router.use(requireAuth());

/**
 * GET /api/decision-brain/recommendations
 *
 * Get intelligent recommendations from the Decision Brain.
 *
 * Query Parameters:
 * - domain: 'mood' | 'nutrition' | 'hydration' | 'activity' | 'all' (default: 'all')
 * - explain: boolean (default: true) - Include explanation data
 * - max: number (default: 3) - Maximum recommendations to return
 *
 * Response:
 * {
 *   success: boolean,
 *   decision: { type, priority, reason, confidence, shouldSpeak },
 *   recommendation: { headline, subtitle, actions, visual },
 *   correlations: [...],
 *   userContext: { lifecycleStage, stageLabel, daysActive, dataQuality },
 *   explanation: { summary, factors, limitations },
 *   modelHealth: { status, lastChecked }
 * }
 */
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {
      domain = 'all',
      explain = 'true',
      max = '3',
    } = req.query;

    console.log(`[API] GET /decision-brain/recommendations for user: ${userId}, domain: ${domain}`);

    const result = await generateIntelligentRecommendations(userId, {
      domain,
      includeExplanation: explain === 'true',
      maxRecommendations: parseInt(max, 10) || 3,
    });

    res.json(result);
  } catch (error) {
    console.error('[API] Error in GET /decision-brain/recommendations:', error);
    errors.internal(res, 'Failed to generate recommendations');
  }
});

/**
 * GET /api/decision-brain/mood-insights
 *
 * Get mood-specific insights from the Decision Brain.
 * This powers the Mood Insights screen with real ML-backed data.
 *
 * Response:
 * {
 *   success: boolean,
 *   hasEnoughData: boolean,
 *   stats: { avgMood, avgEnergy, moodVariance, isConsistent, trend, ... },
 *   trendData: [ { dayKey, day, hasData, intensity, entryCount, isToday }, ... ],
 *   patterns: [ { title, description, icon, color, light, confidence }, ... ],
 *   correlations: [ { id, pattern, statement, confidence, impactType, suggestion }, ... ],
 *   recommendations: [ { type, title, description, priority, icon }, ... ],
 *   todaysMoods: [...],
 *   profile: { dominantMood, volatility, bestTimeOfDay, wellnessScore }
 * }
 */
router.get('/mood-insights', async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] GET /decision-brain/mood-insights for user: ${userId}`);

    const result = await generateMoodInsights(userId);

    res.json(result);
  } catch (error) {
    console.error('[API] Error in GET /decision-brain/mood-insights:', error);
    // PRODUCTION FIX: Return graceful fallback instead of 500
    // This prevents frontend crashes when backend services are temporarily unavailable
    res.json({
      success: false,
      hasEnoughData: false,
      message: 'Mood insights temporarily unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stats: { avgMood: 0, avgEnergy: 0, moodVariance: 0, isConsistent: false, trend: 'stable' },
      trendData: [],
      patterns: [],
      correlations: [],
      recommendations: [],
      todaysMoods: [],
      profile: null,
    });
  }
});

/**
 * GET /api/decision-brain/nutrition-insights
 *
 * Get nutrition-specific insights from the Decision Brain.
 * Powers the Nutrition Insights screen with real ML-backed data.
 *
 * Response:
 * {
 *   success: boolean,
 *   hasEnoughData: boolean,
 *   stats: { avgCalories, avgProtein, calorieGoalAdherence, ... },
 *   trendData: [ { dayKey, calories, protein, ... }, ... ],
 *   patterns: [ { title, description, icon, color, confidence }, ... ],
 *   correlations: [ { id, pattern, statement, confidence }, ... ],
 *   recommendations: [ { type, title, description, priority, icon }, ... ],
 *   profile: { nutritionScore, macroBalance, consistency }
 * }
 */
router.get('/nutrition-insights', async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] GET /decision-brain/nutrition-insights for user: ${userId}`);

    const result = await generateNutritionInsights(userId);

    res.json(result);
  } catch (error) {
    console.error('[API] Error in GET /decision-brain/nutrition-insights:', error);
    errors.internal(res, 'Failed to generate nutrition insights');
  }
});

/**
 * GET /api/decision-brain/hydration-insights
 *
 * Get hydration-specific insights from the Decision Brain.
 *
 * Response:
 * {
 *   success: boolean,
 *   hasEnoughData: boolean,
 *   stats: { avgDailyIntake, goalAdherence, todayProgress, ... },
 *   trendData: [ { dayKey, liters, ... }, ... ],
 *   patterns: [ { title, description, icon, color, confidence }, ... ],
 *   correlations: [ { id, pattern, statement, confidence }, ... ],
 *   recommendations: [ { type, title, description, priority }, ... ],
 *   profile: { hydrationHabit, peakHydrationTime, consistency }
 * }
 */
router.get('/hydration-insights', async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] GET /decision-brain/hydration-insights for user: ${userId}`);

    const result = await generateHydrationInsights(userId);

    res.json(result);
  } catch (error) {
    console.error('[API] Error in GET /decision-brain/hydration-insights:', error);
    errors.internal(res, 'Failed to generate hydration insights');
  }
});

/**
 * GET /api/decision-brain/activity-insights
 *
 * Get activity-specific insights from the Decision Brain.
 *
 * Response:
 * {
 *   success: boolean,
 *   hasEnoughData: boolean,
 *   stats: { totalMinutesThisWeek, activeDays, moodImpact, ... },
 *   trendData: [ { dayKey, minutes, caloriesBurned, ... }, ... ],
 *   patterns: [ { title, description, icon, color, confidence }, ... ],
 *   correlations: [ { id, pattern, statement, confidence }, ... ],
 *   recommendations: [ { type, title, description, priority }, ... ],
 *   profile: { fitnessLevel, preferredTime, moodBoostEffect }
 * }
 */
router.get('/activity-insights', async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] GET /decision-brain/activity-insights for user: ${userId}`);

    const result = await generateActivityInsights(userId);

    res.json(result);
  } catch (error) {
    console.error('[API] Error in GET /decision-brain/activity-insights:', error);
    errors.internal(res, 'Failed to generate activity insights');
  }
});

/**
 * GET /api/decision-brain/status
 *
 * Get user's learning status and readiness assessment.
 *
 * Response:
 * {
 *   success: boolean,
 *   stage: string,
 *   learningStage: string,
 *   daysActive: number,
 *   dataQuality: { observations, correlations, avgConfidence },
 *   readinessMilestone: { threshold, name, progress, remaining },
 *   nextAction: { priority, action, reason }
 * }
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] GET /decision-brain/status for user: ${userId}`);

    const summary = await getLearningStateSummary(userId);

    res.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error('[API] Error in GET /decision-brain/status:', error);
    errors.internal(res, 'Failed to get learning status');
  }
});

/**
 * POST /api/decision-brain/feedback
 *
 * Submit feedback on a recommendation (helpful/not helpful).
 * Used to improve the Decision Brain over time.
 *
 * Body:
 * {
 *   correlationId: string,
 *   feedbackType: 'helpful' | 'not_helpful' | 'dismiss',
 *   reason?: string
 * }
 */
router.post('/feedback', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { correlationId, feedbackType, reason } = req.body;

    if (!correlationId || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'correlationId and feedbackType are required',
      });
    }

    console.log(`[API] POST /decision-brain/feedback for user: ${userId}, correlation: ${correlationId}, type: ${feedbackType}`);

    // Import updateArmStats for Thompson Sampling feedback
    const { updateArmStats } = await import('../services/thompsonSamplingService.js');

    // Update Thompson Sampling stats based on feedback
    const success = feedbackType === 'helpful';
    await updateArmStats(userId, correlationId, success);

    // Also update learning state
    const { updateLearningFromFeedback } = await import('../services/learningStateService.js');
    await updateLearningFromFeedback(userId, feedbackType, {
      correlationId,
      reason,
    });

    res.json({
      success: true,
      message: 'Feedback recorded',
    });
  } catch (error) {
    console.error('[API] Error in POST /decision-brain/feedback:', error);
    errors.internal(res, 'Failed to record feedback');
  }
});

export default router;
