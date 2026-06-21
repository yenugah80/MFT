/**
 * Correlations API Route
 *
 * Endpoints:
 * POST   /api/correlations/compute       - Trigger correlation computation
 * GET    /api/correlations               - Get user's correlations
 * GET    /api/correlations/:id/evidence  - Get evidence for a specific correlation
 * DELETE /api/correlations/:id           - Deactivate a correlation
 */

import express from 'express';
import {
  computeUserCorrelations,
  getUserCorrelations,
  getCorrelationEvidence,
  deactivateCorrelation,
  saveCorrelation,
} from '../services/correlationEngineService.js';
import {
  processIntentOverride,
} from '../services/userIntentOverrideService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware
router.use(requireAuth());

/**
 * POST /api/correlations/compute
 *
 * Trigger correlation computation for the authenticated user.
 * Normally called daily by the orchestrator, but exposed for testing/manual trigger.
 */
router.post('/compute', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { windowTypes, forceRecompute } = req.body;

    console.log(`[API] POST /correlations/compute for user: ${userId}`);

    const result = await computeUserCorrelations(userId, {
      windowTypes: windowTypes || ['4h', '24h', '7d', '30d'],
      forceRecompute: forceRecompute || false,
    });

    // Save correlations concurrently; collect partial failures instead of crashing
    const saveResults = await Promise.allSettled(
      result.correlations.map((c) => saveCorrelation(userId, c))
    );
    const failed = saveResults.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(
        `[API] Failed to save ${failed.length}/${result.correlations.length} correlations for user ${userId}:`,
        failed.map((f) => f.reason?.message)
      );
    }

    res.json({
      success: true,
      userId,
      computedAt: result.computedAt,
      correlationCount: result.correlations.length,
      savedCount: result.correlations.length - failed.length,
      failedCount: failed.length,
      correlations: result.correlations,
    });
  } catch (error) {
    console.error('[API] Error in POST /correlations/compute:', error);
    res.status(500).json({
      success: false,
      error: ENV?.IS_PRODUCTION ? 'Internal server error' : error.message,
    });
  }
});

/**
 * GET /api/correlations
 *
 * Retrieve user's active correlations.
 *
 * Query Parameters:
 * - minConfidence (default: 0.5) - Only return correlations with confidence >= this value
 * - correlationType - Filter by specific correlation type (mood_food, hydration_mood, etc.)
 * - limit (default: 10) - Max number of correlations to return
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const VALID_CORRELATION_TYPES = [
      'mood_food', 'stress_eating', 'hydration_mood', 'activity_recovery',
      'sleep_nutrition', 'caffeine_sleep', 'sugar_mood',
    ];

    const rawConfidence = parseFloat(req.query.minConfidence);
    const minConfidence = Number.isFinite(rawConfidence)
      ? Math.min(Math.max(rawConfidence, 0), 1)
      : 0.5;

    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isInteger(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 100)
      : 10;

    const correlationType =
      req.query.correlationType &&
      VALID_CORRELATION_TYPES.includes(req.query.correlationType)
        ? req.query.correlationType
        : null;

    console.log(`[API] GET /correlations for user: ${userId}`);

    const correlations = await getUserCorrelations(userId, {
      minConfidence,
      correlationType,
      limit,
    });

    res.json({
      success: true,
      userId,
      correlationCount: correlations.length,
      correlations: correlations.map(c => ({
        id: c.id,
        correlationType: c.correlationType,
        ruleName: c.ruleName,
        windowType: c.windowType,
        signalA: c.signalA,
        signalB: c.signalB,
        strength: parseFloat(c.strength),
        confidence: parseFloat(c.confidence),
        occurrences: c.occurrences,
        healthImpactSeverity: c.healthImpactSeverity,
        affectedDomains: c.affectedDomains,
        expectedOutcome: c.expectedOutcome,
        lastObservedDate: c.lastObservedDate,
        firstObservedDate: c.firstObservedDate,
        isActive: c.isActive,
      })),
    });
  } catch (error) {
    console.error('[API] Error in GET /correlations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/correlations/:id/evidence
 *
 * Get evidence points supporting a specific correlation.
 * Shows the individual food-mood pairs and other data points that led to the correlation.
 *
 * Query Parameters:
 * - limit (default: 10) - Max number of evidence points
 */
router.get('/:id/evidence', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    console.log(`[API] GET /correlations/${id}/evidence`);

    const evidence = await getCorrelationEvidence(parseInt(id), parseInt(limit));

    res.json({
      success: true,
      correlationId: parseInt(id),
      evidenceCount: evidence.length,
      evidence: evidence.map(e => ({
        id: e.id,
        observationDate: e.observationDate,
        signalAActual: parseFloat(e.signalAActual),
        signalBActual: parseFloat(e.signalBActual),
        tags: e.tagsJson,
        hourOfDay: e.hourOfDay,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error(`[API] Error in GET /correlations/:id/evidence:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/correlations/:id/feedback
 *
 * Process user feedback on a correlation (dismiss, mark as helpful, etc.)
 * Feeds the learning system and adjusts confidence scores
 *
 * Request Body:
 * {
 *   "overrideType": "USER_DISMISSED" | "TEMPORARY_DISMISS" | "RESOLVED" | "DEACTIVATION" | "HELPFUL_FEEDBACK" | "NOT_HELPFUL_FEEDBACK",
 *   "userReason": "Optional explanation from user"
 * }
 */
router.post('/:id/feedback', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;
    const { overrideType, userReason } = req.body;

    if (!overrideType) {
      return res.status(400).json({
        success: false,
        error: 'Missing overrideType',
      });
    }

    console.log(
      `[API] POST /correlations/${id}/feedback for user: ${userId}, type: ${overrideType}`
    );

    const result = await processIntentOverride(userId, parseInt(id), overrideType, {
      userReason,
    });

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[API] Error in POST /correlations/:id/feedback:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/correlations/:id
 *
 * Mark a correlation as inactive.
 * User-driven action to indicate a correlation is no longer valid or relevant.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    console.log(`[API] DELETE /correlations/${id} for user: ${userId}`);

    await deactivateCorrelation(parseInt(id));

    res.json({
      success: true,
      message: `Correlation ${id} deactivated`,
    });
  } catch (error) {
    console.error(`[API] Error in DELETE /correlations/:id:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
