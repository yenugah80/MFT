/**
 * ML Analytics API Routes
 *
 * Exposes ML-enhanced recommendation and analytics endpoints.
 * All endpoints include audit trails and transparency metadata
 * for regulatory compliance (FDA, EU AI Act).
 *
 * Endpoints:
 * - GET /ml/recommendations - Get ML-enhanced recommendations
 * - POST /ml/feedback - Record recommendation feedback
 * - GET /ml/metrics - Get user's ML performance metrics
 * - GET /ml/experiments - Get user's experiment assignments
 * - GET /ml/drift - Get drift detection status
 * - GET /ml/interactions - Get feature interaction insights
 * - GET /ml/lagged-correlations - Get lagged correlation analysis
 * - POST /ml/admin/batch - Trigger batch orchestration (admin only)
 */

import express from 'express';
import { requireAuth } from '@clerk/express';

// Import ML services
import {
  orchestrateDailyRecommendationsML,
  recordRecommendationFeedback,
  getUserMLMetrics,
  orchestrateAllUsersML,
} from '../services/mlEnhancedOrchestratorService.js';

import {
  getArmStatistics,
  getGlobalArmStatistics,
} from '../services/thompsonSamplingService.js';

import {
  getOrAssignVariant,
  analyzeExperiment,
  getUserExperiments,
} from '../services/statisticalTestingService.js';

import {
  monitorCorrelationDrift,
  monitorAcceptanceRateDrift,
  getLatestDriftStatus,
} from '../services/driftDetectionService.js';

import {
  analyzeAllSignalPairs,
  discoverOptimalLag,
} from '../services/laggedCorrelationService.js';

import {
  getUserInteractions,
  analyzeAllInteractions,
} from '../services/featureInteractionService.js';

// Import batch jobs
import {
  runDailyOrchestration,
  runWeeklyDriftDetection,
  runWeeklyLaggedCorrelations,
  runMonthlyInteractionAnalysis,
  generateMonthlyHealthReport,
} from '../jobs/mlBatchAnalysisJob.js';

const router = express.Router();

/**
 * ============================================
 * RECOMMENDATION ENDPOINTS
 * ============================================
 */

/**
 * GET /ml/recommendations
 * Get ML-enhanced recommendations for the authenticated user
 *
 * Query params:
 * - includeExperiments: boolean (default: true)
 * - includeDriftCheck: boolean (default: true)
 * - includeLaggedCorrelations: boolean (default: false)
 * - includeInteractions: boolean (default: false)
 */
router.get('/recommendations', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {
      includeExperiments = 'true',
      includeDriftCheck = 'true',
      includeLaggedCorrelations = 'false',
      includeInteractions = 'false',
    } = req.query;

    const result = await orchestrateDailyRecommendationsML(userId, {
      includeExperiments: includeExperiments === 'true',
      includeDriftCheck: includeDriftCheck === 'true',
      includeLaggedCorrelations: includeLaggedCorrelations === 'true',
      includeInteractions: includeInteractions === 'true',
    });

    // Add regulatory transparency metadata
    result._audit = {
      endpoint: '/ml/recommendations',
      userId,
      timestamp: new Date().toISOString(),
      mlMethodsUsed: ['thompson_sampling', 'bayesian_updating'],
      transparencyNote: 'Recommendations generated using multi-armed bandit algorithm with Bayesian updates',
    };

    res.json(result);
  } catch (error) {
    console.error('[ML API] Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      message: error.message,
    });
  }
});

/**
 * POST /ml/feedback
 * Record feedback on a recommendation (accept/reject)
 *
 * Body:
 * - recommendationId: string (optional)
 * - armKey: string (required)
 * - accepted: boolean (required)
 * - metadata: object (optional)
 */
router.post('/feedback', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { recommendationId, armKey, accepted, metadata = {} } = req.body;

    if (!armKey || typeof accepted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: armKey and accepted (boolean)',
      });
    }

    const result = await recordRecommendationFeedback(
      userId,
      recommendationId,
      armKey,
      accepted,
      metadata
    );

    // Audit trail
    result._audit = {
      endpoint: '/ml/feedback',
      userId,
      timestamp: new Date().toISOString(),
      action: accepted ? 'recommendation_accepted' : 'recommendation_rejected',
    };

    res.json(result);
  } catch (error) {
    console.error('[ML API] Error recording feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record feedback',
      message: error.message,
    });
  }
});

/**
 * ============================================
 * METRICS & ANALYTICS ENDPOINTS
 * ============================================
 */

/**
 * GET /ml/metrics
 * Get ML performance metrics for the authenticated user
 */
router.get('/metrics', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const metrics = await getUserMLMetrics(userId);

    metrics._audit = {
      endpoint: '/ml/metrics',
      userId,
      timestamp: new Date().toISOString(),
    };

    res.json(metrics);
  } catch (error) {
    console.error('[ML API] Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ML metrics',
      message: error.message,
    });
  }
});

/**
 * GET /ml/arm-statistics
 * Get Thompson Sampling arm statistics for the user
 */
router.get('/arm-statistics', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const stats = await getArmStatistics(userId);

    res.json({
      success: true,
      ...stats,
      _transparency: {
        algorithm: 'Thompson Sampling with Beta-Binomial conjugate prior',
        decayHalfLife: '14 days',
        explorationThreshold: '5 trials minimum',
      },
    });
  } catch (error) {
    console.error('[ML API] Error getting arm statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get arm statistics',
      message: error.message,
    });
  }
});

/**
 * ============================================
 * EXPERIMENT ENDPOINTS
 * ============================================
 */

/**
 * GET /ml/experiments
 * Get user's current experiment assignments
 */
router.get('/experiments', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const experiments = await getUserExperiments(userId);

    res.json({
      success: true,
      userId,
      experiments,
      _transparency: {
        note: 'You are participating in product improvement experiments',
        method: 'Deterministic assignment based on user ID hash',
      },
    });
  } catch (error) {
    console.error('[ML API] Error getting experiments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get experiment assignments',
      message: error.message,
    });
  }
});

/**
 * ============================================
 * DRIFT DETECTION ENDPOINTS
 * ============================================
 */

/**
 * GET /ml/drift
 * Get drift detection status for the user
 */
router.get('/drift', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const driftStatus = await getLatestDriftStatus(userId);

    res.json({
      success: true,
      userId,
      ...driftStatus,
      _transparency: {
        algorithm: 'CUSUM (Cumulative Sum) with Page-Hinkley test',
        purpose: 'Detects when your health patterns change significantly',
        action: 'If drift detected, recommendations will be recalibrated',
      },
    });
  } catch (error) {
    console.error('[ML API] Error getting drift status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get drift status',
      message: error.message,
    });
  }
});

/**
 * POST /ml/drift/check
 * Trigger drift check for a specific metric
 *
 * Body:
 * - metric: string ('correlations' | 'acceptance_rate')
 * - windowDays: number (optional, default: 7)
 */
router.post('/drift/check', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { metric = 'acceptance_rate', windowDays = 7 } = req.body;

    let result;
    if (metric === 'correlations') {
      result = await monitorCorrelationDrift(userId, { windowDays });
    } else {
      result = await monitorAcceptanceRateDrift(userId, { windowDays });
    }

    res.json({
      success: true,
      userId,
      metric,
      ...result,
    });
  } catch (error) {
    console.error('[ML API] Error checking drift:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check drift',
      message: error.message,
    });
  }
});

/**
 * ============================================
 * INTERACTION ENDPOINTS
 * ============================================
 */

/**
 * GET /ml/interactions
 * Get feature interaction insights for the user
 *
 * Query params:
 * - days: number (default: 30)
 */
router.get('/interactions', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const days = parseInt(req.query.days) || 30;

    const interactions = await getUserInteractions(userId, days);

    // Categorize interactions
    const synergistic = interactions.filter(i => i.interactionType === 'synergistic');
    const antagonistic = interactions.filter(i => i.interactionType === 'antagonistic');
    const neutral = interactions.filter(i => i.interactionType === 'neutral');

    res.json({
      success: true,
      userId,
      period: { days },
      summary: {
        total: interactions.length,
        synergistic: synergistic.length,
        antagonistic: antagonistic.length,
        neutral: neutral.length,
      },
      interactions: {
        synergistic,
        antagonistic,
        neutral,
      },
      _transparency: {
        method: '2x2 factorial analysis with Cohen\'s d effect sizes',
        purpose: 'Identifies which health behaviors work better together vs. conflict',
      },
    });
  } catch (error) {
    console.error('[ML API] Error getting interactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feature interactions',
      message: error.message,
    });
  }
});

/**
 * ============================================
 * LAGGED CORRELATION ENDPOINTS
 * ============================================
 */

/**
 * GET /ml/lagged-correlations
 * Get lagged correlation analysis for the user
 *
 * Query params:
 * - days: number (default: 30)
 * - maxLag: number (default: 3)
 */
router.get('/lagged-correlations', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const days = parseInt(req.query.days) || 30;
    const maxLag = parseInt(req.query.maxLag) || 3;

    const results = await analyzeAllSignalPairs(userId, { days, maxLag });

    // Filter to significant results
    const significant = results.filter(r => r.isSignificant);

    res.json({
      success: true,
      userId,
      period: { days, maxLag },
      summary: {
        totalPairs: results.length,
        significantFindings: significant.length,
      },
      findings: significant.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)),
      _transparency: {
        method: 'Cross-correlation function with Granger causality testing',
        purpose: 'Discovers delayed effects (e.g., sugar intake affecting mood next day)',
        significance: 'p < 0.05 with Bonferroni correction',
      },
    });
  } catch (error) {
    console.error('[ML API] Error getting lagged correlations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lagged correlations',
      message: error.message,
    });
  }
});

/**
 * GET /ml/lagged-correlations/:signal1/:signal2
 * Get specific lagged correlation between two signals
 */
router.get('/lagged-correlations/:signal1/:signal2', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { signal1, signal2 } = req.params;
    const days = parseInt(req.query.days) || 30;
    const maxLag = parseInt(req.query.maxLag) || 3;

    const result = await discoverOptimalLag(userId, signal1, signal2, { days, maxLag });

    res.json({
      success: true,
      userId,
      signals: { signal1, signal2 },
      period: { days, maxLag },
      ...result,
    });
  } catch (error) {
    console.error('[ML API] Error getting specific lagged correlation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get lagged correlation',
      message: error.message,
    });
  }
});

/**
 * ============================================
 * ADMIN ENDPOINTS
 * ============================================
 */

/**
 * POST /ml/admin/batch
 * Trigger batch orchestration for all users (admin only)
 *
 * Body:
 * - batchSize: number (default: 50)
 * - limit: number (optional)
 */
router.post('/admin/batch', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { batchSize = 50, limit } = req.body;

    // TODO: Add admin role check here
    // For now, log the admin action
    console.log(`[ML API] Admin batch triggered by user: ${userId}`);

    const result = await orchestrateAllUsersML({ batchSize, limit });

    res.json({
      success: true,
      triggeredBy: userId,
      ...result,
      _audit: {
        endpoint: '/ml/admin/batch',
        triggeredBy: userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ML API] Error running batch orchestration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run batch orchestration',
      message: error.message,
    });
  }
});

/**
 * GET /ml/admin/global-statistics
 * Get global arm statistics across all users (admin only)
 */
router.get('/admin/global-statistics', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    // TODO: Add admin role check
    console.log(`[ML API] Global statistics requested by user: ${userId}`);

    const stats = await getGlobalArmStatistics();

    res.json({
      success: true,
      globalStatistics: stats,
      _audit: {
        endpoint: '/ml/admin/global-statistics',
        requestedBy: userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ML API] Error getting global statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get global statistics',
      message: error.message,
    });
  }
});

/**
 * GET /ml/admin/experiment/:experimentId/analysis
 * Get analysis for a specific experiment (admin only)
 */
router.get('/admin/experiment/:experimentId/analysis', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { experimentId } = req.params;

    // TODO: Add admin role check
    console.log(`[ML API] Experiment analysis requested by user: ${userId}`);

    const analysis = await analyzeExperiment(experimentId);

    res.json({
      success: true,
      experimentId,
      ...analysis,
      _audit: {
        endpoint: `/ml/admin/experiment/${experimentId}/analysis`,
        requestedBy: userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ML API] Error analyzing experiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze experiment',
      message: error.message,
    });
  }
});

/**
 * ============================================
 * BATCH JOB ENDPOINTS
 * ============================================
 * Note: These endpoints allow manual triggering of scheduled ML jobs.
 * In production, these should be protected with admin role verification.
 */

/**
 * POST /ml/admin/jobs/daily
 * Trigger daily recommendation orchestration job
 */
router.post('/admin/jobs/daily', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[ML API] Daily orchestration job triggered by user: ${userId}`);

    const result = await runDailyOrchestration();

    res.json({
      success: true,
      ...result,
      _audit: {
        endpoint: '/ml/admin/jobs/daily',
        triggeredBy: userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ML API] Error running daily orchestration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run daily orchestration',
      message: error.message,
    });
  }
});

/**
 * POST /ml/admin/jobs/weekly-drift
 * Trigger weekly drift detection job
 */
router.post('/admin/jobs/weekly-drift', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[ML API] Weekly drift detection job triggered by user: ${userId}`);

    const result = await runWeeklyDriftDetection();

    res.json({
      success: true,
      ...result,
      _audit: {
        endpoint: '/ml/admin/jobs/weekly-drift',
        triggeredBy: userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ML API] Error running weekly drift detection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run weekly drift detection',
      message: error.message,
    });
  }
});

/**
 * POST /ml/admin/jobs/weekly-lag
 * Trigger weekly lagged correlation analysis job
 */
router.post('/admin/jobs/weekly-lag', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[ML API] Weekly lagged correlation job triggered by user: ${userId}`);

    const result = await runWeeklyLaggedCorrelations();

    res.json({
      success: true,
      ...result,
      _audit: {
        endpoint: '/ml/admin/jobs/weekly-lag',
        triggeredBy: userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ML API] Error running weekly lagged correlations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run weekly lagged correlations',
      message: error.message,
    });
  }
});

/**
 * POST /ml/admin/jobs/monthly-interactions
 * Trigger monthly feature interaction analysis job
 */
router.post('/admin/jobs/monthly-interactions', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[ML API] Monthly interaction analysis job triggered by user: ${userId}`);

    const result = await runMonthlyInteractionAnalysis();

    res.json({
      success: true,
      ...result,
      _audit: {
        endpoint: '/ml/admin/jobs/monthly-interactions',
        triggeredBy: userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ML API] Error running monthly interaction analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run monthly interaction analysis',
      message: error.message,
    });
  }
});

/**
 * POST /ml/admin/jobs/monthly-report
 * Trigger monthly health report generation
 */
router.post('/admin/jobs/monthly-report', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`[ML API] Monthly health report job triggered by user: ${userId}`);

    const result = await generateMonthlyHealthReport();

    res.json({
      success: true,
      ...result,
      _audit: {
        endpoint: '/ml/admin/jobs/monthly-report',
        triggeredBy: userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ML API] Error generating monthly health report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly health report',
      message: error.message,
    });
  }
});

export default router;
