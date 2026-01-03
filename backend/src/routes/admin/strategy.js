/**
 * Admin Strategy Metrics Endpoint
 * Monitor hybrid parsing strategy effectiveness
 *
 * Use this to track:
 * - Premium conversion rates
 * - AI vs Rule-based usage ratio
 * - Cost metrics
 * - ROI calculations
 */

import express from 'express';
import { strategicFoodParser } from '../../services/StrategicFoodParser.js';
import { premiumFeaturesService } from '../../services/PremiumFeatures.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// Protect all endpoints - require admin role (implement based on your auth)
router.use(requireAuth);
router.use((req, res, next) => {
  // TODO: Check if user is admin
  // For now, just log access
  console.log('[AdminStrategy] Access by user:', req.auth.userId);
  next();
});

/**
 * GET /api/admin/strategy/metrics
 * Get current parsing strategy metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const stats = strategicFoodParser.getStats();
    const premiumMetrics = premiumFeaturesService.getMetrics();

    res.json({
      timestamp: new Date().toISOString(),
      parser: stats,
      premium: premiumMetrics,
      strategy: {
        hybridModeEnabled: premiumFeaturesService.isHybridModeEnabled(),
        fullAIModeEnabled: premiumFeaturesService.isFullAIModeEnabled(),
        environment: {
          HYBRID_FEATURE_MODE: process.env.HYBRID_FEATURE_MODE,
          ENABLE_PREMIUM_OPENAI: process.env.ENABLE_PREMIUM_OPENAI,
          FULL_AI_MODE: process.env.FULL_AI_MODE,
        },
      },
    });
  } catch (err) {
    console.error('[AdminStrategy] Error getting metrics:', err);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * GET /api/admin/strategy/tiers
 * Get available tier information
 */
router.get('/tiers', (req, res) => {
  try {
    const tiers = premiumFeaturesService.getAllTiers();
    res.json({
      timestamp: new Date().toISOString(),
      tiers,
      recommendations: {
        current: 'Use rule-based (free) tier for MVP',
        phase2: 'Introduce premium tier at 500+ users',
        phase3: 'Migrate to full AI at $15k+ monthly revenue',
      },
    });
  } catch (err) {
    console.error('[AdminStrategy] Error getting tiers:', err);
    res.status(500).json({ error: 'Failed to get tier information' });
  }
});

/**
 * GET /api/admin/strategy/user/:userId
 * Get parsing strategy for specific user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const strategy = await strategicFoodParser.getStrategyInfo(userId);
    const tier = await premiumFeaturesService.getUserTier(userId);

    res.json({
      timestamp: new Date().toISOString(),
      userId,
      ...strategy,
      tierDetails: tier,
    });
  } catch (err) {
    console.error('[AdminStrategy] Error getting user strategy:', err);
    res.status(500).json({ error: 'Failed to get user strategy' });
  }
});

/**
 * POST /api/admin/strategy/reset
 * Reset metrics (for testing)
 */
router.post('/reset', (req, res) => {
  try {
    // TODO: Add proper admin authorization check
    strategicFoodParser.resetStats();

    res.json({
      success: true,
      message: 'Strategy metrics reset',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[AdminStrategy] Error resetting metrics:', err);
    res.status(500).json({ error: 'Failed to reset metrics' });
  }
});

/**
 * GET /api/admin/strategy/recommendations
 * Get strategic recommendations based on current metrics
 */
router.get('/recommendations', (req, res) => {
  try {
    const stats = strategicFoodParser.getStats();
    const premiumMetrics = premiumFeaturesService.getMetrics();

    // Generate recommendations
    const recommendations = [];

    // Cost analysis
    const estimatedMonthlyCost = parseFloat(stats.estimatedMonthlyCost);
    if (estimatedMonthlyCost > 100) {
      recommendations.push({
        level: 'warning',
        message: `Monthly OpenAI cost is $${estimatedMonthlyCost.toFixed(2)}. Consider limiting AI to premium users only.`,
      });
    }

    // Usage analysis
    if (stats.aiPoweredPercentage > 50 && estimatedMonthlyCost < 500) {
      recommendations.push({
        level: 'success',
        message: 'Hybrid strategy is working well. AI usage is controlled and cost-effective.',
      });
    }

    // Premium tier recommendation
    if (stats.totalRequests > 5000) {
      recommendations.push({
        level: 'info',
        message: 'With this usage level, you should evaluate premium tier conversion rates.',
      });
    }

    // Fallback analysis
    if (stats.fallbackRequests > stats.totalRequests * 0.05) {
      recommendations.push({
        level: 'warning',
        message: `${((stats.fallbackRequests / stats.totalRequests) * 100).toFixed(1)}% of requests are using fallback parsing. Improve core parsing logic.`,
      });
    }

    // Phase recommendations
    if (stats.totalRequests < 1000) {
      recommendations.push({
        level: 'info',
        title: 'Phase 1 (MVP)',
        message: 'Keep using rule-based parsing. Focus on product-market fit.',
      });
    } else if (stats.totalRequests < 10000) {
      recommendations.push({
        level: 'info',
        title: 'Phase 2 (Growth)',
        message: 'Good time to introduce premium tier with AI parsing. Expected conversion: 15-20%.',
      });
    } else {
      recommendations.push({
        level: 'info',
        title: 'Phase 3 (Scale)',
        message: 'Evaluate full AI migration if premium tier achieves >15% conversion.',
      });
    }

    res.json({
      timestamp: new Date().toISOString(),
      metrics: stats,
      premiumMetrics,
      recommendations,
    });
  } catch (err) {
    console.error('[AdminStrategy] Error generating recommendations:', err);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * GET /api/admin/strategy/forecast
 * Forecast costs and ROI at different user scales
 */
router.get('/forecast', (req, res) => {
  try {
    const stats = strategicFoodParser.getStats();
    const costPerRequest = parseFloat(stats.averageCostPerRequest);

    // Forecast for different user bases
    const scenarios = [
      { users: 100, mealsPerDay: 2, name: 'Early MVP' },
      { users: 500, mealsPerDay: 2, name: 'Early Adopters' },
      { users: 1000, mealsPerDay: 2, name: 'Growth Phase' },
      { users: 5000, mealsPerDay: 2, name: 'Scale Phase' },
      { users: 10000, mealsPerDay: 2, name: 'Mature Product' },
    ];

    const forecasts = scenarios.map(scenario => {
      const totalRequests = scenario.users * scenario.mealsPerDay * 30;
      const totalCost = totalRequests * costPerRequest;
      const costPerUser = scenario.users > 0 ? totalCost / scenario.users : 0;

      // Assume 20% premium conversion at $5/month
      const premiumUsers = Math.floor(scenario.users * 0.2);
      const premiumRevenue = premiumUsers * 5;
      const profitMargin = (premiumRevenue - totalCost) / premiumRevenue * 100;

      return {
        scenario: scenario.name,
        users: scenario.users,
        totalMonthlyRequests: totalRequests,
        totalMonthlyCost: `$${totalCost.toFixed(2)}`,
        costPerUser: `$${costPerUser.toFixed(2)}`,
        projectedPremiumUsers: premiumUsers,
        projectedRevenue: `$${premiumRevenue.toFixed(2)}`,
        profitMargin: `${profitMargin.toFixed(1)}%`,
        viable: profitMargin > 0 ? 'Yes ✅' : 'No ❌',
      };
    });

    res.json({
      timestamp: new Date().toISOString(),
      assumption: `Cost per request: $${costPerRequest}`,
      assumptions: {
        mealsPerUserPerDay: 2,
        premiumConversionRate: '20%',
        premiumMonthlyPrice: '$5',
        openaiCostPerRequest: costPerRequest,
      },
      forecasts,
    });
  } catch (err) {
    console.error('[AdminStrategy] Error generating forecast:', err);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

export default router;
