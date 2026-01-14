/**
 * Orchestrator API Route
 *
 * Endpoints for triggering and retrieving daily orchestration results
 */

import express from 'express';
import {
  orchestrateDailyRecommendations,
  orchestrateAllUsers,
} from '../services/recommendationOrchestratorService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Require authentication for all orchestrator routes
router.use(requireAuth);

/**
 * POST /api/orchestrator/run
 *
 * Trigger orchestration for authenticated user
 * Called manually or by daily cron
 */
router.post('/run', async (req, res) => {
  try {
    const userId = req.auth.userId;

    console.log(`[API] POST /orchestrator/run for user: ${userId}`);

    const result = await orchestrateDailyRecommendations(userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] Error in POST /orchestrator/run:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/orchestrator/batch
 *
 * Trigger orchestration for all users
 * Protected: Only callable with admin token or internal request
 *
 * Query Parameters:
 * - limit (number) - Max users to process (for testing)
 * - batchSize (number) - Users to process in parallel (default: 100)
 */
router.post('/batch', async (req, res) => {
  try {
    // TODO: Add admin authorization check
    // For now, assume internal/cron access

    const { limit, batchSize } = req.query;

    console.log('[API] POST /orchestrator/batch (all users)');

    const result = await orchestrateAllUsers({
      limit: limit ? parseInt(limit) : null,
      batchSize: batchSize ? parseInt(batchSize) : 100,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[API] Error in POST /orchestrator/batch:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
