/**
 * Recommendation Resolver API Route
 *
 * Maps generic intents from orchestrator to specific, personalized food recommendations
 * Endpoints for resolving abstract health goals into concrete actions
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import {
  resolveIntent,
  getResolverConfidence,
} from '../services/recommendationResolverService.js';

const router = express.Router();

/**
 * POST /api/resolver/resolve
 *
 * Resolve a generic intent to specific food recommendations
 *
 * Request Body:
 * {
 *   "intent": "improve sleep",
 *   "count": 3
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "intent": "improve sleep",
 *   "recommendations": [
 *     { "food": "almonds", "reason": "...", "quantity": "1 oz", "timing": "...", "resolverScore": 0.95 }
 *   ],
 *   "confidence": 0.92
 * }
 */
router.post('/resolve', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { intent, count = 3 } = req.body;

    if (!intent || typeof intent !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid intent parameter',
      });
    }

    console.log(
      `[API] POST /resolver/resolve for user: ${userId}, intent: "${intent}"`
    );

    const recommendations = await resolveIntent(userId, intent, count);
    const confidence = getResolverConfidence(recommendations, intent);

    res.json({
      success: true,
      intent,
      recommendations,
      confidence,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Error in POST /resolver/resolve:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
