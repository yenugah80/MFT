/**
 * Recommendation Expiry API Route
 *
 * Manages the lifecycle of recommendations
 * Endpoints for tracking expiry, archiving old recommendations, and revalidating dismissed items
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import {
  getExpiredRecommendations,
  archiveExpiredRecommendations,
  getCorrelationsNeedingRevalidation,
  revalidateCorrelation,
  getExpiryStats,
  cleanupOldRecommendations,
} from '../services/recommendationExpiryService.js';

const router = express.Router();

/**
 * GET /api/expiry/pending
 *
 * Get recommendations and correlations that are expiring or need revalidation
 *
 * Response:
 * {
 *   "success": true,
 *   "expiring": [
 *     { "id": 1, "type": "SPEAK", "daysRemaining": 2, ... }
 *   ],
 *   "needingRevalidation": [
 *     { "id": 5, "pattern": "...", "revalidateAt": "2024-01-20" }
 *   ],
 *   "stats": { ... }
 * }
 */
router.get('/pending', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] GET /expiry/pending for user: ${userId}`);

    const expired = await getExpiredRecommendations(userId, 10);
    const needingRevalidation = await getCorrelationsNeedingRevalidation(userId);
    const stats = await getExpiryStats(userId);

    res.json({
      success: true,
      expiring: expired,
      needingRevalidation,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in GET /expiry/pending:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/expiry/stats
 *
 * Get expiry statistics for the user
 *
 * Response:
 * {
 *   "success": true,
 *   "stats": {
 *     "total": 15,
 *     "expired": 2,
 *     "expiringToday": 1,
 *     "expiringThisWeek": 3,
 *     "byType": { "SPEAK": 5, "REINFORCE": 10 }
 *   }
 * }
 */
router.get('/stats', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] GET /expiry/stats for user: ${userId}`);

    const stats = await getExpiryStats(userId);

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in GET /expiry/stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/expiry/archive
 *
 * Archive expired recommendations (manual cleanup)
 * Usually called automatically, but exposed for admin/testing purposes
 *
 * Response:
 * {
 *   "success": true,
 *   "archived": 5,
 *   "message": "Archived 5 expired recommendations"
 * }
 */
router.post('/archive', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] POST /expiry/archive for user: ${userId}`);

    const result = await archiveExpiredRecommendations(userId);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in POST /expiry/archive:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/expiry/:id/revalidate
 *
 * Revalidate a dismissed correlation (unhide it and try again)
 * Called when user wants to give a previously dismissed pattern another chance
 *
 * Request Body:
 * {
 *   "correlationId": 123
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "correlationId": 123,
 *   "message": "Correlation revalidated and unhidden",
 *   "confidence": 0.65
 * }
 */
router.post('/:id/revalidate', requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing correlation ID',
      });
    }

    console.log(
      `[API] POST /expiry/${id}/revalidate for user: ${userId}`
    );

    const result = await revalidateCorrelation(userId, parseInt(id));

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[API] Error in POST /expiry/:id/revalidate:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/expiry/cleanup
 *
 * Cleanup old recommendations (delete very old records)
 * Protected: Sensitive operation, use with caution
 *
 * Request Body:
 * {
 *   "daysOld": 90
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Cleaned up recommendations older than 90 days"
 * }
 */
router.post('/cleanup', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { daysOld = 90 } = req.body;

    console.log(
      `[API] POST /expiry/cleanup for user: ${userId}, daysOld: ${daysOld}`
    );

    const result = await cleanupOldRecommendations(userId, daysOld);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in POST /expiry/cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
