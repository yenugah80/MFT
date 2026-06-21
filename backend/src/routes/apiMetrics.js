/**
 * API METRICS & MONITORING ENDPOINT
 * Provides real-time visibility into API usage, costs, and performance
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { usdaClient } from '../services/apiClients/USDAClient.js';
import { openaiClient } from '../services/apiClients/OpenAIClient.js';

const router = express.Router();

/**
 * GET /api/metrics
 * Get API usage metrics (admin only)
 */
router.get('/', requireAuth(), async (req, res) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const usdaMetrics = usdaClient.getMetrics();
    const openaiMetrics = openaiClient.getMetrics();
    const openaiCosts = openaiClient.getCostMetrics();

    res.json({
      timestamp: new Date().toISOString(),
      apis: {
        usda: {
          ...usdaMetrics,
          apiKey: usdaClient.apiKey === 'DEMO_KEY' ? 'DEMO_KEY (Limited)' : 'Registered Key',
        },
        openai: {
          ...openaiMetrics,
          available: openaiClient.isAvailable(),
          costs: openaiCosts,
        },
      },
      summary: {
        totalRequests: usdaMetrics.totalRequests + openaiMetrics.totalRequests,
        overallSuccessRate: calculateOverallSuccessRate([usdaMetrics, openaiMetrics]),
        estimatedMonthlyCost: `$${(openaiCosts.totalCostUSD.replace('$', '') * 30).toFixed(2)}`,
      },
    });
  } catch (error) {
    console.error('[API Metrics] Error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * POST /api/metrics/reset-circuit-breaker
 * Manually reset circuit breaker for an API (admin only)
 */
router.post('/reset-circuit-breaker/:api', requireAuth(), async (req, res) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { api } = req.params;

    if (api === 'usda') {
      usdaClient.resetCircuitBreaker();
      res.json({ success: true, message: 'USDA circuit breaker reset' });
    } else if (api === 'openai') {
      openaiClient.resetCircuitBreaker();
      res.json({ success: true, message: 'OpenAI circuit breaker reset' });
    } else {
      res.status(400).json({ error: 'Invalid API name' });
    }
  } catch (error) {
    console.error('[API Metrics] Reset failed:', error);
    res.status(500).json({ error: 'Failed to reset circuit breaker' });
  }
});

/**
 * POST /api/metrics/clear-cache/:api
 * Clear cache for an API (admin only)
 */
router.post('/clear-cache/:api', requireAuth(), async (req, res) => {
  try {
    if (!isAdminRequest(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { api } = req.params;

    if (api === 'usda') {
      usdaClient.clearCache();
      res.json({ success: true, message: 'USDA cache cleared' });
    } else if (api === 'openai') {
      openaiClient.clearCache();
      res.json({ success: true, message: 'OpenAI cache cleared' });
    } else {
      res.status(400).json({ error: 'Invalid API name' });
    }
  } catch (error) {
    console.error('[API Metrics] Clear cache failed:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Helper function
function calculateOverallSuccessRate(metricsArray) {
  const total = metricsArray.reduce((sum, m) => sum + m.totalRequests, 0);
  const successful = metricsArray.reduce((sum, m) => sum + m.successfulRequests, 0);

  if (total === 0) return '0%';

  return `${((successful / total) * 100).toFixed(2)}%`;
}

function isAdminRequest(req) {
  const sessionClaims = req.auth?.sessionClaims || {};
  const role = sessionClaims?.metadata?.role || sessionClaims?.publicMetadata?.role;

  if (role === 'admin') {
    return true;
  }

  const adminUserIds = (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (adminUserIds.length === 0) {
    return false;
  }

  return adminUserIds.includes(req.auth?.userId);
}

export default router;
