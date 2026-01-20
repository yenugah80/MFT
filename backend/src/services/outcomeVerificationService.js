/**
 * Outcome Verification Service
 *
 * Closes the feedback loop by:
 * 1. Tracking recommendation follow-through (did user do what we suggested?)
 * 2. Measuring outcomes (did it help their mood/energy/wellness?)
 * 3. Updating Thompson Sampling priors based on verified outcomes
 * 4. Monitoring prediction accuracy and triggering recalibration
 *
 * This is critical for continuous learning - recommendations that don't
 * produce positive outcomes should be deprioritized over time.
 */

import { db } from '../db/index.js';
import {
  recommendationArmsTable,
  insightActionsTable,
  predictionOutcomesTable,
  predictionLogTable,
  moodLogTable,
  foodLogTable,
  waterLogTable,
  activityLogTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql, between } from 'drizzle-orm';
import { updateArm } from './thompsonSamplingService.js';

/**
 * ============================================
 * CONSTANTS
 * ============================================
 */

// Time windows for outcome measurement (in hours)
const OUTCOME_WINDOWS = {
  hydration: { min: 0.5, max: 4, optimalLag: 2 },   // Hydration effects are quick
  nutrition: { min: 1, max: 6, optimalLag: 3 },     // Food takes time to digest
  activity: { min: 0.5, max: 12, optimalLag: 4 },   // Activity effects last longer
  mood: { min: 0, max: 2, optimalLag: 0.5 },        // Mindfulness is immediate
  sleep: { min: 12, max: 24, optimalLag: 16 },      // Sleep effects next day
};

// Minimum outcome improvement to consider recommendation successful
const SUCCESS_THRESHOLDS = {
  mood: 0.5,        // +0.5 on 1-10 scale
  energy: 0.5,      // +0.5 on 1-10 scale
  hydration: 200,   // +200ml
  nutrition: 0,     // Any positive nutrient contribution
};

// Prediction accuracy monitoring
const ACCURACY_WINDOW_DAYS = 14;
const MIN_PREDICTIONS_FOR_MONITORING = 10;
const ACCURACY_THRESHOLD_FOR_RECALIBRATION = 0.6; // Recalibrate if < 60% accurate

/**
 * ============================================
 * OUTCOME TRACKING
 * ============================================
 */

/**
 * Track a recommendation that was shown/acted upon
 * Called when user interacts with a recommendation
 *
 * @param {string} userId
 * @param {Object} recommendation - The recommendation object
 * @param {string} actionType - 'shown' | 'clicked' | 'completed' | 'dismissed'
 * @returns {Promise<Object>} Tracking result
 */
export async function trackRecommendationAction(userId, recommendation, actionType) {
  const now = new Date();

  try {
    // Insert into recommendations history
    const [record] = await db
      .insert(insightActionsTable)
      .values({
        userId,
        recommendationType: recommendation.type || recommendation.recommendationType,
        recommendationId: recommendation.id,
        domain: recommendation.domain || inferDomain(recommendation),
        actionType,
        actionTimestamp: now,
        contextJson: {
          timeOfDay: now.getHours(),
          dayOfWeek: now.getDay(),
          recommendation: {
            title: recommendation.title,
            action: recommendation.action,
            difficulty: recommendation.difficultyTier?.tier,
          },
        },
        outcomeVerified: false,
      })
      .returning();

    console.log(`[OutcomeVerification] Tracked ${actionType} for recommendation ${recommendation.id}`);

    // If user completed the recommendation, schedule outcome verification
    if (actionType === 'completed') {
      await scheduleOutcomeVerification(userId, record.id, recommendation);
    }

    return {
      success: true,
      trackingId: record.id,
      scheduledVerification: actionType === 'completed',
    };
  } catch (error) {
    console.error('[OutcomeVerification] Error tracking action:', error);
    throw error;
  }
}

/**
 * Schedule outcome verification for a completed recommendation
 * This will be checked after the expected impact lag time
 */
async function scheduleOutcomeVerification(userId, trackingId, recommendation) {
  const domain = recommendation.domain || inferDomain(recommendation);
  const window = OUTCOME_WINDOWS[domain] || OUTCOME_WINDOWS.nutrition;

  // Calculate verification time (when we expect to see the outcome)
  const verificationTime = new Date();
  verificationTime.setHours(verificationTime.getHours() + window.optimalLag);

  // Update the tracking record with scheduled verification
  await db
    .update(insightActionsTable)
    .set({
      expectedOutcomeTime: verificationTime,
      outcomeWindowHours: window.max - window.min,
    })
    .where(eq(insightActionsTable.id, trackingId));

  console.log(`[OutcomeVerification] Scheduled verification for ${trackingId} at ${verificationTime.toISOString()}`);
}

/**
 * Verify outcome for a recommendation
 * Called after the expected impact lag time
 *
 * @param {string} userId
 * @param {number} trackingId - The recommendation history record ID
 * @returns {Promise<Object>} Verification result
 */
export async function verifyRecommendationOutcome(userId, trackingId) {
  try {
    // Get the recommendation record
    const [record] = await db
      .select()
      .from(insightActionsTable)
      .where(
        and(
          eq(insightActionsTable.id, trackingId),
          eq(insightActionsTable.userId, userId)
        )
      )
      .limit(1);

    if (!record) {
      return { success: false, error: 'Recommendation record not found' };
    }

    if (record.outcomeVerified) {
      return { success: true, alreadyVerified: true, outcome: record.outcomeJson };
    }

    const domain = record.domain;
    const actionTime = new Date(record.actionTimestamp);
    const window = OUTCOME_WINDOWS[domain] || OUTCOME_WINDOWS.nutrition;

    // Define outcome measurement window
    const windowStart = new Date(actionTime);
    windowStart.setHours(windowStart.getHours() + window.min);
    const windowEnd = new Date(actionTime);
    windowEnd.setHours(windowEnd.getHours() + window.max);

    // Measure outcome based on domain
    const outcome = await measureOutcome(userId, domain, actionTime, windowStart, windowEnd);

    // Determine if recommendation was successful
    const success = evaluateOutcomeSuccess(outcome, domain);

    // Update the tracking record
    await db
      .update(insightActionsTable)
      .set({
        outcomeVerified: true,
        outcomeJson: {
          ...outcome,
          success,
          verifiedAt: new Date().toISOString(),
        },
        outcomeSuccess: success,
      })
      .where(eq(insightActionsTable.id, trackingId));

    // Update Thompson Sampling priors
    if (record.recommendationType) {
      const armKey = `${record.recommendationType}:${record.domain}:${getTimeBucket(actionTime.getHours())}`;
      await updateArm(userId, armKey, success, {
        trackingId,
        outcomeImprovement: outcome.improvement,
      });
    }

    console.log(`[OutcomeVerification] Verified outcome for ${trackingId}: success=${success}`);

    return {
      success: true,
      recommendationId: trackingId,
      outcome,
      wasSuccessful: success,
    };
  } catch (error) {
    console.error('[OutcomeVerification] Error verifying outcome:', error);
    throw error;
  }
}

/**
 * Measure outcome in the specified domain
 */
async function measureOutcome(userId, domain, actionTime, windowStart, windowEnd) {
  // Get baseline (before recommendation)
  const baselineStart = new Date(actionTime);
  baselineStart.setHours(baselineStart.getHours() - 4);

  let baseline = null;
  let postAction = null;

  switch (domain) {
    case 'mood':
      [baseline, postAction] = await Promise.all([
        getMoodInWindow(userId, baselineStart, actionTime),
        getMoodInWindow(userId, windowStart, windowEnd),
      ]);
      break;

    case 'hydration':
      [baseline, postAction] = await Promise.all([
        getHydrationInWindow(userId, baselineStart, actionTime),
        getHydrationInWindow(userId, windowStart, windowEnd),
      ]);
      break;

    case 'nutrition':
      [baseline, postAction] = await Promise.all([
        getNutritionInWindow(userId, baselineStart, actionTime),
        getNutritionInWindow(userId, windowStart, windowEnd),
      ]);
      break;

    case 'activity':
      [baseline, postAction] = await Promise.all([
        getActivityInWindow(userId, baselineStart, actionTime),
        getActivityInWindow(userId, windowStart, windowEnd),
      ]);
      break;

    default:
      // Generic mood/energy measurement
      [baseline, postAction] = await Promise.all([
        getMoodInWindow(userId, baselineStart, actionTime),
        getMoodInWindow(userId, windowStart, windowEnd),
      ]);
  }

  // Calculate improvement
  const improvement = calculateImprovement(baseline, postAction, domain);

  return {
    domain,
    baseline,
    postAction,
    improvement,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    hasDataForBoth: baseline !== null && postAction !== null,
  };
}

/**
 * Get mood/energy data in a time window
 */
async function getMoodInWindow(userId, start, end) {
  const logs = await db
    .select()
    .from(moodLogTable)
    .where(
      and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedAt, start),
        lte(moodLogTable.loggedAt, end)
      )
    );

  if (logs.length === 0) return null;

  const avgMood = logs.reduce((sum, l) => sum + (l.moodScore || 0), 0) / logs.length;
  const avgEnergy = logs.reduce((sum, l) => sum + (l.energyLevel || 0), 0) / logs.length;

  return {
    mood: Math.round(avgMood * 10) / 10,
    energy: Math.round(avgEnergy * 10) / 10,
    count: logs.length,
  };
}

/**
 * Get hydration data in a time window
 */
async function getHydrationInWindow(userId, start, end) {
  const logs = await db
    .select()
    .from(waterLogTable)
    .where(
      and(
        eq(waterLogTable.userId, userId),
        gte(waterLogTable.loggedAt, start),
        lte(waterLogTable.loggedAt, end)
      )
    );

  if (logs.length === 0) return null;

  const totalMl = logs.reduce((sum, l) => sum + (l.amountMl || 0), 0);

  return {
    totalMl,
    count: logs.length,
  };
}

/**
 * Get nutrition data in a time window
 */
async function getNutritionInWindow(userId, start, end) {
  const logs = await db
    .select()
    .from(foodLogTable)
    .where(
      and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedAt, start),
        lte(foodLogTable.loggedAt, end)
      )
    );

  if (logs.length === 0) return null;

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories || 0),
      protein: acc.protein + (l.protein || 0),
      fiber: acc.fiber + (l.fiber || 0),
    }),
    { calories: 0, protein: 0, fiber: 0 }
  );

  return {
    ...totals,
    mealCount: logs.length,
  };
}

/**
 * Get activity data in a time window
 */
async function getActivityInWindow(userId, start, end) {
  const logs = await db
    .select()
    .from(activityLogTable)
    .where(
      and(
        eq(activityLogTable.userId, userId),
        gte(activityLogTable.loggedAt, start),
        lte(activityLogTable.loggedAt, end)
      )
    );

  if (logs.length === 0) return null;

  const totalMinutes = logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

  return {
    totalMinutes,
    count: logs.length,
  };
}

/**
 * Calculate improvement between baseline and post-action
 */
function calculateImprovement(baseline, postAction, domain) {
  if (baseline === null || postAction === null) {
    return { hasData: false, delta: 0 };
  }

  switch (domain) {
    case 'mood':
      return {
        hasData: true,
        moodDelta: postAction.mood - baseline.mood,
        energyDelta: postAction.energy - baseline.energy,
        delta: (postAction.mood - baseline.mood + postAction.energy - baseline.energy) / 2,
      };

    case 'hydration':
      return {
        hasData: true,
        delta: postAction.totalMl - baseline.totalMl,
      };

    case 'activity':
      return {
        hasData: true,
        delta: postAction.totalMinutes - baseline.totalMinutes,
      };

    case 'nutrition':
      return {
        hasData: true,
        caloriesDelta: postAction.calories - baseline.calories,
        proteinDelta: postAction.protein - baseline.protein,
        delta: postAction.protein - baseline.protein, // Focus on protein as improvement metric
      };

    default:
      return { hasData: true, delta: 0 };
  }
}

/**
 * Evaluate if outcome was successful based on thresholds
 */
function evaluateOutcomeSuccess(outcome, domain) {
  if (!outcome.hasDataForBoth || !outcome.improvement?.hasData) {
    // If we don't have data, give benefit of the doubt
    return null; // Unknown
  }

  const threshold = SUCCESS_THRESHOLDS[domain] || 0;
  const delta = outcome.improvement.delta || 0;

  // For mood/energy, also check the specific deltas
  if (domain === 'mood') {
    const moodImproved = outcome.improvement.moodDelta >= SUCCESS_THRESHOLDS.mood;
    const energyImproved = outcome.improvement.energyDelta >= SUCCESS_THRESHOLDS.energy;
    return moodImproved || energyImproved;
  }

  return delta >= threshold;
}

/**
 * ============================================
 * PREDICTION ACCURACY MONITORING
 * ============================================
 */

/**
 * Log a prediction for later verification
 *
 * @param {string} userId
 * @param {string} predictionType - Type of prediction (mood, energy, etc.)
 * @param {Object} prediction - The prediction object
 * @returns {Promise<Object>}
 */
export async function logPrediction(userId, predictionType, prediction) {
  try {
    const [record] = await db
      .insert(predictionLogTable)
      .values({
        userId,
        predictionType,
        predictedValue: prediction.value || prediction.predictedValue,
        confidence: prediction.confidence || prediction.calibrated?.confidence,
        intervalLow: prediction.interval?.low,
        intervalHigh: prediction.interval?.high,
        predictionContext: prediction.context || {},
        createdAt: new Date(),
      })
      .returning();

    return { success: true, predictionId: record.id };
  } catch (error) {
    console.error('[OutcomeVerification] Error logging prediction:', error);
    throw error;
  }
}

/**
 * Verify a prediction against actual outcome
 *
 * @param {number} predictionId
 * @param {number} actualValue
 * @returns {Promise<Object>}
 */
export async function verifyPrediction(predictionId, actualValue) {
  try {
    const [prediction] = await db
      .select()
      .from(predictionLogTable)
      .where(eq(predictionLogTable.id, predictionId))
      .limit(1);

    if (!prediction) {
      return { success: false, error: 'Prediction not found' };
    }

    // Calculate error
    const error = Math.abs(actualValue - prediction.predictedValue);
    const inInterval = prediction.intervalLow !== null && prediction.intervalHigh !== null
      ? actualValue >= prediction.intervalLow && actualValue <= prediction.intervalHigh
      : null;

    // Log the outcome
    await db
      .insert(predictionOutcomesTable)
      .values({
        predictionId,
        userId: prediction.userId,
        actualValue,
        error,
        inConfidenceInterval: inInterval,
        verifiedAt: new Date(),
      });

    // Update prediction record
    await db
      .update(predictionLogTable)
      .set({
        actualValue,
        verifiedAt: new Date(),
      })
      .where(eq(predictionLogTable.id, predictionId));

    return {
      success: true,
      predictionId,
      predicted: prediction.predictedValue,
      actual: actualValue,
      error,
      inInterval,
    };
  } catch (error) {
    console.error('[OutcomeVerification] Error verifying prediction:', error);
    throw error;
  }
}

/**
 * Calculate prediction accuracy for a user
 *
 * @param {string} userId
 * @param {string} predictionType - Optional: filter by type
 * @returns {Promise<Object>}
 */
export async function calculatePredictionAccuracy(userId, predictionType = null) {
  try {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - ACCURACY_WINDOW_DAYS);

    // Build query conditions
    const conditions = [
      eq(predictionOutcomesTable.userId, userId),
      gte(predictionOutcomesTable.verifiedAt, windowStart),
    ];

    const outcomes = await db
      .select({
        predictionId: predictionOutcomesTable.predictionId,
        error: predictionOutcomesTable.error,
        inConfidenceInterval: predictionOutcomesTable.inConfidenceInterval,
      })
      .from(predictionOutcomesTable)
      .where(and(...conditions));

    if (outcomes.length < MIN_PREDICTIONS_FOR_MONITORING) {
      return {
        hasEnoughData: false,
        count: outcomes.length,
        minimumRequired: MIN_PREDICTIONS_FOR_MONITORING,
      };
    }

    // Calculate metrics
    const validIntervals = outcomes.filter(o => o.inConfidenceInterval !== null);
    const inIntervalCount = validIntervals.filter(o => o.inConfidenceInterval).length;
    const calibrationAccuracy = validIntervals.length > 0
      ? inIntervalCount / validIntervals.length
      : null;

    const avgError = outcomes.reduce((sum, o) => sum + o.error, 0) / outcomes.length;
    const maxError = Math.max(...outcomes.map(o => o.error));

    // Check if recalibration needed
    const needsRecalibration = calibrationAccuracy !== null &&
      calibrationAccuracy < ACCURACY_THRESHOLD_FOR_RECALIBRATION;

    return {
      hasEnoughData: true,
      count: outcomes.length,
      calibrationAccuracy: Math.round(calibrationAccuracy * 100) / 100,
      avgError: Math.round(avgError * 100) / 100,
      maxError: Math.round(maxError * 100) / 100,
      needsRecalibration,
      recalibrationThreshold: ACCURACY_THRESHOLD_FOR_RECALIBRATION,
    };
  } catch (error) {
    console.error('[OutcomeVerification] Error calculating accuracy:', error);
    throw error;
  }
}

/**
 * ============================================
 * BATCH VERIFICATION
 * ============================================
 */

/**
 * Process pending outcome verifications for all users
 * Should be called periodically (e.g., every hour)
 *
 * @returns {Promise<Object>}
 */
export async function processPendingVerifications() {
  const now = new Date();

  try {
    // Find recommendations that need verification
    const pendingRecords = await db
      .select()
      .from(insightActionsTable)
      .where(
        and(
          eq(insightActionsTable.outcomeVerified, false),
          eq(insightActionsTable.actionType, 'completed'),
          lte(insightActionsTable.expectedOutcomeTime, now)
        )
      )
      .limit(100);

    console.log(`[OutcomeVerification] Processing ${pendingRecords.length} pending verifications`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      noData: 0,
    };

    for (const record of pendingRecords) {
      try {
        const result = await verifyRecommendationOutcome(record.userId, record.id);
        results.processed++;

        if (result.wasSuccessful === true) {
          results.successful++;
        } else if (result.wasSuccessful === false) {
          results.failed++;
        } else {
          results.noData++;
        }
      } catch (error) {
        console.error(`[OutcomeVerification] Error processing ${record.id}:`, error);
      }
    }

    console.log(`[OutcomeVerification] Batch complete:`, results);
    return results;
  } catch (error) {
    console.error('[OutcomeVerification] Error in batch processing:', error);
    throw error;
  }
}

/**
 * ============================================
 * HELPERS
 * ============================================
 */

/**
 * Infer domain from recommendation content
 */
function inferDomain(recommendation) {
  const text = (recommendation.title + ' ' + (recommendation.description || '')).toLowerCase();

  if (text.includes('water') || text.includes('hydrat') || text.includes('drink')) {
    return 'hydration';
  }
  if (text.includes('protein') || text.includes('calorie') || text.includes('meal') || text.includes('eat')) {
    return 'nutrition';
  }
  if (text.includes('exercise') || text.includes('active') || text.includes('movement') || text.includes('walk')) {
    return 'activity';
  }
  if (text.includes('mood') || text.includes('feel') || text.includes('energy') || text.includes('breath')) {
    return 'mood';
  }
  if (text.includes('sleep') || text.includes('screen') || text.includes('rest')) {
    return 'sleep';
  }

  return 'general';
}

/**
 * Get time bucket from hour
 */
function getTimeBucket(hour) {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 12) return 'midday';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * ============================================
 * EXPORTS
 * ============================================
 */

export default {
  // Recommendation tracking
  trackRecommendationAction,
  verifyRecommendationOutcome,
  processPendingVerifications,
  // Prediction tracking
  logPrediction,
  verifyPrediction,
  calculatePredictionAccuracy,
};
