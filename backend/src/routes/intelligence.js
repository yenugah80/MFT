/**
 * Intelligence API Routes
 *
 * Unified endpoint for all intelligence features:
 * - GET /api/intelligence/unified - Single endpoint for all intelligence data
 * - POST /api/intelligence/track-action - Track recommendation interactions
 * - POST /api/intelligence/satisfaction - Record user satisfaction feedback
 *
 * This replaces fragmented analytics endpoints with a single,
 * coordinated intelligence system.
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import { getUnifiedIntelligence } from '../services/intelligenceOrchestratorService.js';
import {
  trackRecommendationAction,
  recordRecommendationSatisfaction,
} from '../services/outcomeVerificationService.js';

const router = express.Router();

/**
 * GET /api/intelligence/unified
 *
 * Single endpoint for ALL intelligence data.
 * Coordinates all subsystems and returns unified response.
 *
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'all' (default: 'week')
 *
 * Response:
 * {
 *   success: boolean,
 *   primaryInsight: {...} | null,
 *   predictions: {...} | null,
 *   patterns: [...],
 *   recommendations: { nutrition: [...], mood: [...], ... },
 *   pendingFeedback: [...],
 *   domainStats: {...},
 *   userStage: { label, index },
 *   confidence: number,
 *   meta: { period, generatedAt, sourcesQueried, timeContext }
 * }
 */
router.get('/unified', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { period = 'week' } = req.query;

    // Validate period
    const validPeriods = ['today', 'week', 'month', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`,
      });
    }

    const now = new Date();
    const intelligence = await getUnifiedIntelligence(userId, {
      period,
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
    });

    res.json(intelligence);
  } catch (error) {
    console.error('[Intelligence API] Error getting unified intelligence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get intelligence data',
      message: error.message,
    });
  }
});

/**
 * POST /api/intelligence/track-action
 *
 * Track recommendation interactions (shown, clicked, completed, dismissed).
 * This data feeds the Thompson Sampling optimization.
 *
 * Body:
 * {
 *   recommendationId: string,
 *   actionType: 'shown' | 'clicked' | 'completed' | 'dismissed' | 'snoozed',
 *   context?: {
 *     timestamp: string,
 *     screen?: string,
 *     position?: number
 *   }
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   trackingId: number,
 *   scheduledVerification: boolean
 * }
 */
router.post('/track-action', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { recommendationId, actionType, context = {} } = req.body;

    // Validate required fields
    if (!recommendationId) {
      return res.status(400).json({
        success: false,
        error: 'recommendationId is required',
      });
    }

    const validActions = ['shown', 'clicked', 'completed', 'dismissed', 'snoozed'];
    if (!actionType || !validActions.includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: `actionType must be one of: ${validActions.join(', ')}`,
      });
    }

    // Build recommendation object from the request
    const recommendation = {
      id: recommendationId,
      ...context.recommendation, // Allow passing additional recommendation data
    };

    const result = await trackRecommendationAction(userId, recommendation, actionType);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Intelligence API] Error tracking action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track action',
      message: error.message,
    });
  }
});

/**
 * POST /api/intelligence/satisfaction
 *
 * Record user satisfaction feedback for a completed recommendation.
 * This closes the feedback loop and improves future recommendations.
 *
 * Body:
 * {
 *   trackingId: number,  // From track-action response
 *   helpful: boolean,
 *   rating: number,      // 1-5
 *   feedback?: string    // Optional text feedback
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   trackingId: number,
 *   recorded: { helpful, rating, hasFeedback }
 * }
 */
router.post('/satisfaction', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { trackingId, helpful, rating, feedback } = req.body;

    // Validate required fields
    if (!trackingId) {
      return res.status(400).json({
        success: false,
        error: 'trackingId is required',
      });
    }

    if (rating === undefined || rating === null) {
      return res.status(400).json({
        success: false,
        error: 'rating is required (1-5)',
      });
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        error: 'rating must be a number between 1 and 5',
      });
    }

    const result = await recordRecommendationSatisfaction(userId, trackingId, {
      helpful: helpful === true,
      rating: ratingNum,
      feedback: feedback || null,
    });

    res.json(result);
  } catch (error) {
    console.error('[Intelligence API] Error recording satisfaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record satisfaction',
      message: error.message,
    });
  }
});

/**
 * GET /api/intelligence/status
 *
 * Get intelligence system status and diagnostics.
 * Useful for debugging and monitoring.
 */
router.get('/status', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    res.json({
      success: true,
      status: 'operational',
      version: '1.0.0',
      features: {
        unifiedIntelligence: true,
        predictionAwareRecommendations: true,
        satisfactionFeedback: true,
        thompsonSampling: true,
        crossDomainCorrelations: true,
      },
      endpoints: {
        unified: 'GET /api/intelligence/unified',
        trackAction: 'POST /api/intelligence/track-action',
        satisfaction: 'POST /api/intelligence/satisfaction',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Intelligence API] Error getting status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
    });
  }
});

export default router;
