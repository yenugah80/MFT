/**
 * Personalized Insights API Routes
 *
 * Exposes deep pattern mining and personalized narrative generation
 * to the mobile app for a truly personalized experience
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generatePersonalizedNarrative, generateQuickInsight, generateRecommendationContext } from '../services/personalizedNarrativeEngine.js';
import { mineUserPatterns } from '../services/patternMiningService.js';

const router = express.Router();

/**
 * GET /api/insights/personalized
 *
 * Returns the full personalized narrative with all pattern insights
 * Use this for the dedicated insights/patterns screen
 */
router.get('/personalized', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { days = 30 } = req.query;

    const narrative = await generatePersonalizedNarrative(userId, {
      lookbackDays: parseInt(days),
      maxInsights: 5
    });

    res.json({
      success: true,
      ...narrative,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PersonalizedInsights] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate personalized insights'
    });
  }
});

/**
 * GET /api/insights/quick
 *
 * Returns a single quick insight for dashboard display
 * Lightweight, fast, perfect for dashboard cards
 */
router.get('/quick', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;

    const insight = await generateQuickInsight(userId);

    res.json({
      success: true,
      ...insight,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PersonalizedInsights] Quick insight error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quick insight'
    });
  }
});

/**
 * GET /api/insights/patterns
 *
 * Returns raw pattern data for advanced analytics views
 */
router.get('/patterns', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { days = 30 } = req.query;

    const patterns = await mineUserPatterns(userId, {
      lookbackDays: parseInt(days)
    });

    res.json({
      success: true,
      ...patterns,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PersonalizedInsights] Patterns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mine patterns'
    });
  }
});

/**
 * GET /api/insights/food-correlations
 *
 * Returns food-specific correlations for the "What Works For You" section
 * Includes: food-mood, food-sleep, and food-stress correlations
 */
router.get('/food-correlations', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { days = 30 } = req.query;

    const patterns = await mineUserPatterns(userId, {
      lookbackDays: parseInt(days)
    });

    if (!patterns.success) {
      return res.json({
        success: true,
        goodFoods: [],
        watchFoods: [],
        message: 'Need more data to find food correlations'
      });
    }

    // Combine all food correlations (mood, sleep, stress)
    const allFoodCorrelations = [
      ...(patterns.foodMoodCorrelations || []).map(f => ({ ...f, correlationType: 'mood' })),
      ...(patterns.foodSleepCorrelations || []).map(f => ({ ...f, correlationType: 'sleep' })),
      ...(patterns.foodStressCorrelations || []).map(f => ({ ...f, correlationType: 'stress' }))
    ];

    // Separate into positive and negative correlations
    const goodFoods = allFoodCorrelations
      .filter(f => f.direction === 'positive')
      .map(f => ({
        food: f.food,
        correlationType: f.correlationType,
        energyBoost: f.energyImpact || 0,
        moodBoost: f.moodImpact || 0,
        sleepBoost: f.sleepImpact || 0,
        stressReduction: f.stressImpact || 0,
        confidence: f.confidence,
        timesEaten: f.sampleSize,
        lastEaten: f.lastOccurrence,
        recommendation: f.recommendation,
        insight: f.insight
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const watchFoods = allFoodCorrelations
      .filter(f => f.direction === 'negative')
      .map(f => ({
        food: f.food,
        correlationType: f.correlationType,
        energyImpact: f.energyImpact || 0,
        moodImpact: f.moodImpact || 0,
        sleepImpact: f.sleepImpact || 0,
        stressImpact: f.stressImpact || 0,
        confidence: f.confidence,
        timesEaten: f.sampleSize,
        suggestion: f.recommendation,
        insight: f.insight
      }))
      .sort((a, b) => b.confidence - a.confidence);

    res.json({
      success: true,
      goodFoods,
      watchFoods,
      // Breakdown by type for detailed views
      byType: {
        mood: {
          good: (patterns.foodMoodCorrelations || []).filter(f => f.direction === 'positive').length,
          watch: (patterns.foodMoodCorrelations || []).filter(f => f.direction === 'negative').length
        },
        sleep: {
          good: (patterns.foodSleepCorrelations || []).filter(f => f.direction === 'positive').length,
          watch: (patterns.foodSleepCorrelations || []).filter(f => f.direction === 'negative').length
        },
        stress: {
          good: (patterns.foodStressCorrelations || []).filter(f => f.direction === 'positive').length,
          watch: (patterns.foodStressCorrelations || []).filter(f => f.direction === 'negative').length
        }
      },
      dataSufficiency: patterns.dataSufficiency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PersonalizedInsights] Food correlations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze food correlations'
    });
  }
});

/**
 * GET /api/insights/timing
 *
 * Returns timing-specific patterns (breakfast timing, late eating, day-of-week)
 */
router.get('/timing', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;
    const { days = 30 } = req.query;

    const patterns = await mineUserPatterns(userId, {
      lookbackDays: parseInt(days)
    });

    if (!patterns.success) {
      return res.json({
        success: true,
        timingPatterns: [],
        message: 'Need more data to find timing patterns'
      });
    }

    const timingPatterns = patterns.temporalPatterns.map(p => ({
      type: p.subtype,
      insight: p.insight,
      impact: p.impact,
      direction: p.direction,
      confidence: p.confidence,
      recommendation: p.recommendation,
      details: {
        day: p.day,
        dayIndex: p.dayIndex,
        sampleSize: p.earlyBreakfastDays || p.lateEatingDays || p.regularDays || p.sampleSize
      }
    }));

    // Find best and worst days
    const dayPatterns = timingPatterns.filter(p => p.type === 'DAY_OF_WEEK');
    const bestDay = dayPatterns.find(p => p.direction === 'positive');
    const challengingDay = dayPatterns.find(p => p.direction === 'negative');

    res.json({
      success: true,
      timingPatterns,
      summary: {
        bestDay: bestDay ? bestDay.details.day : null,
        challengingDay: challengingDay ? challengingDay.details.day : null,
        breakfastMatters: timingPatterns.some(p => p.type === 'BREAKFAST_TIMING'),
        lateEatingAffects: timingPatterns.some(p => p.type === 'LATE_EATING')
      },
      dataSufficiency: patterns.dataSufficiency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PersonalizedInsights] Timing patterns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze timing patterns'
    });
  }
});

/**
 * GET /api/insights/recommendation-context
 *
 * Returns personalized context for AI recommendations
 * Used internally by the recommendations endpoint
 */
router.get('/recommendation-context', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;

    const context = await generateRecommendationContext(userId);

    res.json({
      success: true,
      ...context,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PersonalizedInsights] Recommendation context error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendation context'
    });
  }
});

/**
 * GET /api/insights/summary
 *
 * Returns a lightweight summary suitable for notifications or widgets
 * Includes cross-domain correlation stats
 */
router.get('/summary', requireAuth(), async (req, res) => {
  try {
    const { userId } = typeof req.auth === 'function' ? req.auth() : req.auth;

    const [quickInsight, patterns] = await Promise.all([
      generateQuickInsight(userId),
      mineUserPatterns(userId, { lookbackDays: 14 })
    ]);

    // Combine all food correlations
    const allFoodCorrelations = [
      ...(patterns.foodMoodCorrelations || []),
      ...(patterns.foodSleepCorrelations || []),
      ...(patterns.foodStressCorrelations || [])
    ];

    // Build a concise summary with cross-domain stats
    const summary = {
      hasInsights: quickInsight.insight !== null || (patterns.patterns?.length > 0),
      topInsight: quickInsight.insight,
      patternsFound: patterns.patterns?.length || 0,
      dataStatus: patterns.dataSufficiency?.sufficient ? 'ready' : 'building',
      dataProgress: patterns.dataSufficiency ? {
        food: patterns.dataSufficiency.foodLogs?.percentage || 0,
        mood: patterns.dataSufficiency.moodLogs?.percentage || 0,
        activity: patterns.dataSufficiency.activityLogs?.percentage || 0,
        sleep: patterns.dataSufficiency.sleepLogs?.percentage || 0,
        hydration: patterns.dataSufficiency.waterLogs?.percentage || 0,
        stress: patterns.dataSufficiency.stressLogs?.percentage || 0
      } : null,
      overallDataScore: patterns.dataSufficiency?.overallScore || 0,
      // Quick stats across all domains
      stats: {
        goodFoods: allFoodCorrelations.filter(f => f.direction === 'positive').length,
        watchFoods: allFoodCorrelations.filter(f => f.direction === 'negative').length,
        timingInsights: patterns.temporalPatterns?.length || 0,
        activityInsights: patterns.activityCorrelations?.length || 0,
        sleepInsights: patterns.sleepCorrelations?.length || 0,
        hydrationInsights: patterns.hydrationCorrelations?.length || 0,
        stressInsights: patterns.stressCorrelations?.length || 0
      },
      // Available correlation types (for UI feature gates)
      availableCorrelations: patterns.dataSufficiency?.availableCorrelations || {}
    };

    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[PersonalizedInsights] Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary'
    });
  }
});

export default router;
