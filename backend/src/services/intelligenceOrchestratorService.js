/**
 * Intelligence Orchestrator Service
 *
 * Central coordination layer for all intelligence subsystems.
 * This is the SINGLE entry point for all frontend intelligence requests.
 *
 * Responsibilities:
 * 1. Gather from all subsystems in parallel
 * 2. Resolve conflicts between sources
 * 3. Ensure predictions influence recommendations
 * 4. Deduplicate and rank all insights
 * 5. Include pending feedback items
 *
 * Imported by: intelligence.js routes
 */

import { computeUserCorrelations, getUserCorrelations } from './correlationEngineService.js';
import { discoverNovelCorrelations, getNovelInsights } from './autoCorrelationDiscoveryService.js';
import { generateTimeAwarePrediction } from './predictionEngineService.js';
import { getAnalyticsRecommendations } from './analyticsRecommendationService.js';
import { trackRecommendationAction } from './outcomeVerificationService.js';
import { db } from '../db/index.js';
import { insightActionsTable } from '../db/schema.js';
import { eq, and, desc, gte, isNull } from 'drizzle-orm';

/**
 * Get unified intelligence for a user
 * Single endpoint that coordinates all intelligence sources
 *
 * @param {string} userId - User ID
 * @param {Object} context - Context for personalization
 * @param {string} context.period - 'today' | 'week' | 'month' | 'all'
 * @param {number} context.timeOfDay - Hour of day (0-23)
 * @param {number} context.dayOfWeek - Day of week (0-6)
 * @returns {Promise<Object>} Unified intelligence response
 */
export async function getUnifiedIntelligence(userId, context = {}) {
  const { period = 'week', timeOfDay, dayOfWeek } = context;
  const lookbackDays = period === 'month' ? 30 : period === 'today' ? 1 : 7;

  try {
    // 1. Fetch ALL intelligence sources in parallel for maximum performance
    const [
      correlationsResult,
      predictions,
      novelDiscoveries,
      analyticsRecs,
      pendingFeedback,
    ] = await Promise.all([
      safeExecute(() => getUserCorrelations(userId, { activeOnly: true, limit: 20 })),
      safeExecute(() => generateTimeAwarePrediction(userId)),
      safeExecute(() => getNovelInsights(userId, 5)),
      safeExecute(() => getAnalyticsRecommendations(userId, period)),
      safeExecute(() => getPendingFeedbackRequests(userId)),
    ]);

    // Extract correlations - handle both object and array returns
    const correlations = Array.isArray(correlationsResult)
      ? correlationsResult
      : (correlationsResult?.correlations || []);

    // 2. Generate PREDICTION-AWARE recommendations
    const recommendations = await generatePredictionAwareRecommendations(
      userId,
      analyticsRecs?.recommendations || {},
      predictions,
      correlations
    );

    // 3. Select PRIMARY insight (most important thing to show)
    const primaryInsight = selectPrimaryInsight(correlations, predictions, novelDiscoveries || []);

    // 4. Format patterns from correlations and discoveries
    const patterns = [
      ...formatCorrelations(correlations),
      ...formatNovelDiscoveries(novelDiscoveries || []),
    ];

    // 5. Build unified response
    return {
      success: true,
      primaryInsight,
      predictions: formatPredictions(predictions),
      patterns,
      recommendations,
      pendingFeedback: pendingFeedback || [],
      domainStats: analyticsRecs?.stats || {},
      userStage: analyticsRecs?.stage || { label: 'first_steps', index: 0 },
      confidence: calculateOverallConfidence(correlations, predictions),
      meta: {
        period,
        generatedAt: new Date().toISOString(),
        sourcesQueried: 5,
        timeContext: { timeOfDay, dayOfWeek },
      },
    };
  } catch (error) {
    console.error('[IntelligenceOrchestrator] Error:', error);
    return {
      success: false,
      error: error.message,
      primaryInsight: null,
      predictions: null,
      patterns: [],
      recommendations: {},
      pendingFeedback: [],
      domainStats: {},
      userStage: { label: 'first_steps', index: 0 },
      confidence: 0,
    };
  }
}

/**
 * Safe wrapper that catches errors and returns null
 */
async function safeExecute(fn) {
  try {
    return await fn();
  } catch (error) {
    console.warn('[IntelligenceOrchestrator] Subsystem error:', error.message);
    return null;
  }
}

/**
 * Generate prediction-aware recommendations
 * KEY ENHANCEMENT: Predictions influence recommendation selection and priority
 *
 * @param {string} userId - User ID
 * @param {Object} baseRecs - Base recommendations by domain
 * @param {Object} predictions - Prediction results
 * @param {Array} correlations - Active correlations
 * @returns {Promise<Object>} Enhanced recommendations
 */
async function generatePredictionAwareRecommendations(userId, baseRecs, predictions, correlations) {
  const result = { ...baseRecs };

  // If energy crash predicted, boost hydration and light meal recommendations
  if (predictions?.prediction?.primaryRisk?.type === 'energy_crash' ||
      predictions?.prediction?.type === 'energy_crash') {
    Object.keys(result).forEach(domain => {
      if (Array.isArray(result[domain])) {
        result[domain] = result[domain].map(rec => {
          if (addressesEnergyRisk(rec)) {
            return {
              ...rec,
              priority: (rec.priority || 50) - 15, // Higher priority (lower number)
              urgency: 'high',
              predictionLink: {
                riskType: 'energy_crash',
                message: 'Addresses your predicted energy dip',
              },
            };
          }
          return rec;
        });
      }
    });
  }

  // If mood crash predicted, boost mood-positive recommendations
  if (predictions?.prediction?.primaryRisk?.type === 'mood_crash' ||
      predictions?.prediction?.moodRisk) {
    const moodRecs = result.mood || [];
    const nutritionRecs = result.nutrition || [];

    // Boost existing mood recommendations
    result.mood = moodRecs.map(rec => ({
      ...rec,
      priority: (rec.priority || 50) - 10,
      urgency: rec.urgency || 'medium',
      predictionLink: {
        riskType: 'mood_dip',
        message: 'May help with your mood pattern',
      },
    }));

    // Check for foods that positively affect mood
    const moodBoostingFoods = correlations
      .filter(c => c.signalBType === 'mood' && c.isPositive && c.confidence >= 0.6)
      .map(c => c.signalAType);

    if (moodBoostingFoods.length > 0) {
      // Add correlation-based nutrition recommendation
      result.nutrition = [
        ...nutritionRecs,
        createCorrelationRecommendation({
          type: 'correlation',
          title: 'Mood-Boosting Food',
          message: `Based on your patterns, certain foods tend to lift your mood`,
          correlations: moodBoostingFoods,
          priority: 25,
        }),
      ];
    }
  }

  // Add correlation-based recommendations for high-confidence patterns
  correlations
    .filter(c => c.confidence >= 0.65 && c.isPositive !== false)
    .forEach(corr => {
      const domain = getDomainFromCorrelation(corr);
      if (domain && result[domain] && !hasCorrelationRec(result[domain], corr)) {
        const correlationRec = createCorrelationRecommendation(corr);
        if (correlationRec) {
          result[domain] = [...result[domain], correlationRec];
        }
      }
    });

  // Sort each domain by priority (lower is higher priority)
  Object.keys(result).forEach(domain => {
    if (Array.isArray(result[domain])) {
      result[domain] = result[domain]
        .sort((a, b) => (a.priority || 50) - (b.priority || 50))
        .slice(0, 5); // Limit to top 5 per domain
    }
  });

  return result;
}

/**
 * Check if recommendation addresses energy-related risks
 */
function addressesEnergyRisk(rec) {
  const energyKeywords = ['energy', 'hydration', 'water', 'rest', 'break', 'snack', 'protein'];
  const recText = `${rec.title || ''} ${rec.message || ''} ${rec.category || ''}`.toLowerCase();
  return energyKeywords.some(keyword => recText.includes(keyword));
}

/**
 * Select the PRIMARY insight to display prominently
 * Priority: Urgent prediction > Novel discovery > Strong correlation
 */
function selectPrimaryInsight(correlations, predictions, novelDiscoveries) {
  // Priority 1: Urgent predictions
  if (predictions?.prediction?.hasUrgentRisk ||
      predictions?.prediction?.confidence >= 0.75) {
    return {
      type: 'prediction',
      urgency: 'high',
      icon: 'alert-circle',
      title: predictions.prediction.title || 'Prediction Alert',
      message: predictions.prediction.message || predictions.prediction.insight,
      confidence: predictions.prediction.confidence,
      timeframe: predictions.prediction.timeframe,
      riskType: predictions.prediction.type || predictions.prediction.primaryRisk?.type,
    };
  }

  // Priority 2: Novel discoveries (exciting new patterns)
  const topNovel = novelDiscoveries?.find(d => d.noveltyScore >= 0.7 || d.strength >= 0.6);
  if (topNovel) {
    return {
      type: 'discovery',
      urgency: 'medium',
      icon: 'sparkles',
      title: 'New Pattern Discovered',
      message: topNovel.insight || topNovel.message,
      noveltyScore: topNovel.noveltyScore,
      affectedDomains: topNovel.affectedDomains || [topNovel.signalAType, topNovel.signalBType],
    };
  }

  // Priority 3: Strong active correlations
  const strongCorrelation = correlations?.find(c =>
    c.confidence >= 0.7 && (c.isActive !== false) && c.strength >= 0.5
  );
  if (strongCorrelation) {
    return {
      type: 'correlation',
      urgency: 'low',
      icon: 'analytics',
      title: strongCorrelation.ruleName?.replace(/_/g, ' ') || 'Pattern Found',
      message: strongCorrelation.insight || strongCorrelation.expectedOutcome,
      confidence: strongCorrelation.confidence,
      strength: strongCorrelation.strength,
      affectedDomains: strongCorrelation.affectedDomains,
    };
  }

  return null;
}

/**
 * Format correlations for frontend display
 */
function formatCorrelations(correlations) {
  if (!Array.isArray(correlations)) return [];

  return correlations
    .filter(c => c.confidence >= 0.5)
    .map(c => ({
      id: c.id || `corr_${c.ruleName}_${c.signalAType}_${c.signalBType}`,
      type: 'correlation',
      source: 'correlation_engine',
      ruleName: c.ruleName,
      title: formatCorrelationTitle(c),
      message: c.insight || c.expectedOutcome,
      confidence: Math.round(c.confidence * 100),
      strength: Math.round((c.strength || 0.5) * 100),
      affectedDomains: c.affectedDomains || [],
      evidence: c.evidenceJson,
      isPositive: c.isPositive !== false,
      timeLag: c.timeLagMinutes,
    }));
}

/**
 * Format novel discoveries for frontend display
 */
function formatNovelDiscoveries(discoveries) {
  if (!Array.isArray(discoveries)) return [];

  return discoveries.map(d => ({
    id: d.id || `discovery_${d.signalAType}_${d.signalBType}`,
    type: 'discovery',
    source: 'auto_discovery',
    title: d.insight || `${d.signalAType} → ${d.signalBType}`,
    message: d.detail || d.message,
    noveltyScore: Math.round((d.noveltyScore || 0.5) * 100),
    confidence: Math.round((d.confidence || 0.5) * 100),
    affectedDomains: d.affectedDomains || [d.signalAType, d.signalBType],
    optimalLag: d.optimalLag,
    occurrences: d.occurrences,
  }));
}

/**
 * Format predictions for frontend display
 */
function formatPredictions(predictions) {
  if (!predictions?.prediction) return null;

  const pred = predictions.prediction;
  return {
    type: pred.type || pred.primaryRisk?.type,
    confidence: Math.round((pred.confidence || 0.5) * 100),
    confidenceInterval: pred.confidenceInterval,
    title: pred.title,
    message: pred.message || pred.insight,
    timeframe: pred.timeframe,
    preventionTips: pred.preventionTips || [],
    riskFactors: pred.riskFactors || [],
    isUrgent: pred.hasUrgentRisk || pred.confidence >= 0.75,
  };
}

/**
 * Calculate overall confidence based on available data
 */
function calculateOverallConfidence(correlations, predictions) {
  const scores = [];

  // Factor in correlations confidence
  if (Array.isArray(correlations) && correlations.length > 0) {
    const avgCorrelationConf = correlations.reduce((sum, c) => sum + (c.confidence || 0), 0) / correlations.length;
    scores.push(avgCorrelationConf);
  }

  // Factor in prediction confidence
  if (predictions?.prediction?.confidence) {
    scores.push(predictions.prediction.confidence);
  }

  if (scores.length === 0) return 0;

  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
}

/**
 * Helper to format correlation title nicely
 */
function formatCorrelationTitle(corr) {
  if (corr.title) return corr.title;

  const signalA = corr.signalAType?.replace(/_/g, ' ') || '';
  const signalB = corr.signalBType?.replace(/_/g, ' ') || '';

  if (signalA && signalB) {
    return `${capitalize(signalA)} affects ${signalB.toLowerCase()}`;
  }

  if (corr.ruleName) {
    return capitalize(corr.ruleName.replace(/_/g, ' '));
  }

  return 'Pattern Detected';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get domain from correlation
 */
function getDomainFromCorrelation(corr) {
  const affectedDomains = corr.affectedDomains || [];
  if (affectedDomains.includes('nutrition')) return 'nutrition';
  if (affectedDomains.includes('hydration')) return 'hydration';
  if (affectedDomains.includes('mood')) return 'mood';
  if (affectedDomains.includes('activity')) return 'activity';

  // Infer from signal types
  const signalB = corr.signalBType?.toLowerCase() || '';
  if (signalB.includes('mood') || signalB.includes('energy')) return 'mood';
  if (signalB.includes('water') || signalB.includes('hydrat')) return 'hydration';
  if (signalB.includes('activity') || signalB.includes('exercise')) return 'activity';
  return 'nutrition';
}

/**
 * Check if domain already has a similar correlation recommendation
 */
function hasCorrelationRec(domainRecs, corr) {
  if (!Array.isArray(domainRecs)) return false;
  return domainRecs.some(rec =>
    rec.correlationId === corr.id ||
    (rec.ruleName === corr.ruleName && rec.type === 'correlation')
  );
}

/**
 * Create recommendation from correlation
 */
function createCorrelationRecommendation(corr) {
  if (!corr) return null;

  const isPositive = corr.isPositive !== false;

  return {
    id: `corr_rec_${corr.id || corr.ruleName}`,
    type: 'pattern',
    category: 'correlation',
    correlationId: corr.id,
    ruleName: corr.ruleName,
    title: corr.title || formatCorrelationTitle(corr),
    message: corr.message || corr.insight || corr.expectedOutcome,
    priority: 40 - Math.round((corr.confidence || 0.5) * 20), // Higher confidence = higher priority
    confidence: Math.round((corr.confidence || 0.5) * 100),
    evidence: corr.evidenceJson || corr.evidence,
    actionable: isPositive,
    icon: isPositive ? 'trending-up' : 'alert-circle',
    affectedDomains: corr.affectedDomains,
  };
}

/**
 * Get pending feedback requests for a user
 * Returns recommendations that were completed but haven't been rated
 */
async function getPendingFeedbackRequests(userId) {
  try {
    // Find completed recommendations without satisfaction rating
    // that were completed in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pendingRecords = await db
      .select({
        id: insightActionsTable.id,
        recommendationId: insightActionsTable.recommendationId,
        recommendationType: insightActionsTable.recommendationType,
        domain: insightActionsTable.domain,
        actionTimestamp: insightActionsTable.actionTimestamp,
        contextJson: insightActionsTable.contextJson,
      })
      .from(insightActionsTable)
      .where(
        and(
          eq(insightActionsTable.userId, userId),
          eq(insightActionsTable.actionType, 'completed'),
          gte(insightActionsTable.actionTimestamp, sevenDaysAgo),
          // CRITICAL: Only include records that DON'T have a satisfaction rating yet
          isNull(insightActionsTable.satisfactionRating)
        )
      )
      .orderBy(desc(insightActionsTable.actionTimestamp))
      .limit(5);

    return pendingRecords.map(record => ({
      trackingId: record.id,
      recommendationId: record.recommendationId,
      type: record.recommendationType,
      domain: record.domain,
      completedAt: record.actionTimestamp,
      context: record.contextJson,
      prompt: 'How helpful was this recommendation?',
    }));
  } catch (error) {
    console.warn('[IntelligenceOrchestrator] Error getting pending feedback:', error.message);
    return [];
  }
}

export default {
  getUnifiedIntelligence,
};