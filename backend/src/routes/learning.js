/**
 * Learning State API Route
 *
 * Manages user's learning progression and readiness
 * Endpoints for tracking learning stage, evidence accumulation, and feedback
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  initializeLearningState,
  bootstrapLearningFromHistory,
  updateLearningFromFeedback,
  getLearningReadiness,
  getLearningStateSummary,
} from '../services/learningStateService.js';

const router = express.Router();

/**
 * GET /api/learning/state
 *
 * Get current user's learning state and readiness
 *
 * Response:
 * {
 *   "success": true,
 *   "learning": {
 *     "stage": "TRACKER",
 *     "learningStage": "LEARNING",
 *     "observations": 25,
 *     "correlations": 4,
 *     "daysActive": 10
 *   },
 *   "readiness": {
 *     "canShowCorrelations": true,
 *     "canShowPredictions": false,
 *     "nextMilestone": { ... }
 *   }
 * }
 */
router.get('/state', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] GET /learning/state for user: ${userId}`);

    // Get bootstrapped state from historical data
    const bootstrapped = await bootstrapLearningFromHistory(userId, 365);

    // Get readiness assessment
    const readiness = await getLearningReadiness(userId);

    res.json({
      success: true,
      learning: {
        stage: bootstrapped.stage,
        learningStage: bootstrapped.learningStage,
        observations: bootstrapped.observations,
        correlations: bootstrapped.correlations,
        evidence: bootstrapped.evidence,
      },
      readiness,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in GET /learning/state:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/learning/summary
 *
 * Get quick learning summary for dashboard display
 *
 * Response:
 * {
 *   "success": true,
 *   "summary": {
 *     "stage": "TRACKER",
 *     "daysActive": 10,
 *     "observations": 25,
 *     "nextMilestone": "Week Complete (progress: 43%)"
 *   }
 * }
 */
router.get('/summary', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] GET /learning/summary for user: ${userId}`);

    const summary = await getLearningStateSummary(userId);

    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in GET /learning/summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/learning/feedback
 *
 * Record user feedback on correlations or recommendations
 * Updates learning model based on user corrections
 *
 * Request Body:
 * {
 *   "feedbackType": "correction" | "validation" | "dismissal",
 *   "correlationId": 123,
 *   "reason": "This doesn't apply to me"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "updated": {
 *     "learningStage": "LEARNING",
 *     "correlations": 4,
 *     "confidenceGrowth": 0.65
 *   }
 * }
 */
router.post('/feedback', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { feedbackType, correlationId, reason } = req.body;

    if (!feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'Missing feedbackType',
      });
    }

    console.log(
      `[API] POST /learning/feedback for user: ${userId}, type: ${feedbackType}`
    );

    const updated = await updateLearningFromFeedback(userId, feedbackType, {
      correlationId,
      reason,
    });

    res.json({
      success: true,
      updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in POST /learning/feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
