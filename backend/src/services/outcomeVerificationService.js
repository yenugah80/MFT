/**
 * Outcome Verification Service
 *
 * Closes the feedback loop for the intelligence system by:
 * 1. Tracking recommendation follow-through (did user do what we suggested?)
 * 2. Measuring outcomes (did it help their mood/energy/wellness?)
 * 3. Updating Thompson Sampling priors based on verified outcomes
 * 4. Monitoring prediction accuracy and triggering recalibration
 * 5. Learning per-user Platt calibration parameters for confidence calibration
 * 6. Adjusting personalized thresholds based on prediction accuracy
 * 7. Implicit outcome detection from user behavior
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
  pendingCheckInsTable,
  userThresholdsTable,
  moodLogTable,
  foodLogTable,
  waterLogTable,
  activityLogTable,
  profilesTable,
} from '../db/schema.js';
import { eq, and, gte, lte, lt, desc, sql, isNull } from 'drizzle-orm';
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

// Platt calibration parameters
const DEFAULT_PLATT_PARAMS = { A: -2.0, B: 0.5 };
const MIN_SAMPLES_FOR_PLATT_CALIBRATION = 10;

// Threshold learning parameters
const MIN_SAMPLES_FOR_THRESHOLD_ADJUSTMENT = 5;
const THRESHOLD_ADJUSTMENT_RATE = 0.1; // 10% adjustment per iteration

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
 * Record explicit user satisfaction feedback for a recommendation
 * Called when user rates a recommendation after completing it
 *
 * This closes the feedback loop by capturing:
 * 1. Whether the recommendation was helpful (binary)
 * 2. Satisfaction rating (1-5 scale)
 * 3. Optional text feedback
 *
 * The feedback updates Thompson Sampling to improve future recommendations
 *
 * @param {string} userId - User ID
 * @param {number} trackingId - The recommendation tracking record ID
 * @param {Object} satisfaction - Satisfaction data
 * @param {boolean} satisfaction.helpful - Was it helpful?
 * @param {number} satisfaction.rating - 1-5 rating
 * @param {string} [satisfaction.feedback] - Optional feedback text
 * @returns {Promise<Object>} Result
 */
export async function recordRecommendationSatisfaction(userId, trackingId, satisfaction) {
  try {
    // Get the tracking record
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
      return { success: false, error: 'Tracking record not found' };
    }

    // Validate rating
    const rating = Math.min(5, Math.max(1, parseInt(satisfaction.rating) || 3));
    const helpful = satisfaction.helpful === true || rating >= 4;
    const now = new Date();

    // Update the record with satisfaction data using BOTH:
    // 1. Dedicated columns (for indexed queries)
    // 2. outcomeJson (for backward compatibility and full context)
    await db
      .update(insightActionsTable)
      .set({
        // Dedicated columns for efficient querying
        satisfactionRating: rating,
        satisfactionFeedback: satisfaction.feedback || null,
        satisfactionRecordedAt: now,
        // Also store in JSON for full context
        outcomeJson: {
          ...record.outcomeJson,
          satisfaction: {
            helpful,
            rating,
            feedback: satisfaction.feedback || null,
            recordedAt: now.toISOString(),
          },
        },
        updatedAt: now,
      })
      .where(eq(insightActionsTable.id, trackingId));

    // Update Thompson Sampling with satisfaction signal
    // This is crucial for the feedback loop
    if (record.recommendationType) {
      const actionTime = record.actionTimestamp || new Date();
      const armKey = `${record.recommendationType}:${record.domain}:${getTimeBucket(new Date(actionTime).getHours())}`;

      await updateArm(userId, armKey, helpful, {
        source: 'explicit_satisfaction',
        rating,
        trackingId,
      });

      console.log(`[OutcomeVerification] Updated Thompson Sampling for arm ${armKey} with satisfaction: helpful=${helpful}, rating=${rating}`);
    }

    console.log(`[OutcomeVerification] Recorded satisfaction for ${trackingId}: helpful=${helpful}, rating=${rating}`);

    return {
      success: true,
      trackingId,
      recorded: {
        helpful,
        rating,
        hasFeedback: !!satisfaction.feedback,
      },
    };
  } catch (error) {
    console.error('[OutcomeVerification] Error recording satisfaction:', error);
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
        gte(moodLogTable.loggedDate, start),
        lte(moodLogTable.loggedDate, end)
      )
    );

  if (logs.length === 0) return null;

  const avgMood = logs.reduce((sum, l) => sum + (l.intensity || 0), 0) / logs.length;
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
        gte(waterLogTable.loggedDate, start),
        lte(waterLogTable.loggedDate, end)
      )
    );

  if (logs.length === 0) return null;

  const totalMl = logs.reduce((sum, l) => sum + ((parseFloat(l.amountLiters) || 0) * 1000), 0);

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
        gte(foodLogTable.loggedDate, start),
        lte(foodLogTable.loggedDate, end)
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
 * PLATT CALIBRATION LEARNING
 * ============================================
 */

/**
 * Update per-user Platt calibration parameters based on accumulated outcomes
 * Uses gradient descent on (predicted confidence, actual accuracy) pairs
 *
 * @param {string} userId
 * @returns {Promise<Object|null>} Updated Platt params or null if not enough data
 */
export async function updatePlattCalibration(userId) {
  try {
    // Get recent prediction outcomes for this user
    const outcomes = await db
      .select({
        confidence: predictionLogTable.confidence,
        accurate: predictionOutcomesTable.predictionAccurate,
        accuracyScore: predictionOutcomesTable.accuracyScore,
      })
      .from(predictionOutcomesTable)
      .innerJoin(
        predictionLogTable,
        eq(predictionOutcomesTable.predictionId, predictionLogTable.id)
      )
      .where(eq(predictionOutcomesTable.userId, userId))
      .orderBy(desc(predictionOutcomesTable.createdAt))
      .limit(100);

    if (outcomes.length < MIN_SAMPLES_FOR_PLATT_CALIBRATION) {
      return null;
    }

    // Calculate new Platt parameters using gradient descent
    const params = calculatePlattParams(outcomes);

    // Store calibration params in user profile
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (profile) {
      const notifications = profile.notifications || {};
      notifications.plattCalibration = {
        A: params.A,
        B: params.B,
        sampleCount: outcomes.length,
        lastUpdated: new Date().toISOString(),
        accuracy: params.accuracy,
      };

      await db
        .update(profilesTable)
        .set({ notifications, updatedAt: new Date() })
        .where(eq(profilesTable.userId, userId));
    }

    console.log(`[OutcomeVerification] Updated Platt calibration for ${userId}: A=${params.A.toFixed(3)}, B=${params.B.toFixed(3)}`);
    return params;
  } catch (error) {
    console.error('[OutcomeVerification] Error updating Platt calibration:', error);
    return null;
  }
}

/**
 * Calculate Platt scaling parameters from outcomes using gradient descent
 * Loss = sum((predicted_probability - actual_outcome)^2)
 */
function calculatePlattParams(outcomes) {
  let A = DEFAULT_PLATT_PARAMS.A;
  let B = DEFAULT_PLATT_PARAMS.B;

  const learningRate = 0.01;
  const iterations = 100;

  const data = outcomes.map(o => ({
    confidence: parseFloat(o.confidence) || 0.5,
    actual: o.accurate ? 1 : (parseFloat(o.accuracyScore) || 0),
  }));

  for (let iter = 0; iter < iterations; iter++) {
    let gradA = 0;
    let gradB = 0;

    for (const { confidence, actual } of data) {
      const clippedConf = Math.max(0.01, Math.min(0.99, confidence));
      const logit = Math.log(clippedConf / (1 - clippedConf));
      const p = 1 / (1 + Math.exp(A * logit + B));
      const error = p - actual;
      const pDerivative = p * (1 - p);

      gradA += error * pDerivative * logit;
      gradB += error * pDerivative;
    }

    A -= learningRate * (gradA / data.length);
    B -= learningRate * (gradB / data.length);
  }

  // Calculate final accuracy
  let totalError = 0;
  for (const { confidence, actual } of data) {
    const clippedConf = Math.max(0.01, Math.min(0.99, confidence));
    const logit = Math.log(clippedConf / (1 - clippedConf));
    const p = 1 / (1 + Math.exp(A * logit + B));
    totalError += Math.abs(p - actual);
  }
  const accuracy = 1 - (totalError / data.length);

  return { A, B, accuracy };
}

/**
 * Get user's Platt calibration parameters
 * Returns personalized params if available, otherwise defaults
 *
 * @param {string} userId
 * @returns {Promise<Object>} Platt params { A, B }
 */
export async function getUserPlattParams(userId) {
  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    if (profile?.notifications?.plattCalibration) {
      return profile.notifications.plattCalibration;
    }

    return DEFAULT_PLATT_PARAMS;
  } catch (error) {
    console.error('[OutcomeVerification] Error getting Platt params:', error);
    return DEFAULT_PLATT_PARAMS;
  }
}

/**
 * ============================================
 * THRESHOLD LEARNING
 * ============================================
 */

/**
 * Update personalized thresholds based on prediction outcome
 *
 * @param {string} userId
 * @param {Object} prediction - The prediction that was verified
 * @param {Object} outcome - The verified outcome
 * @returns {Promise<Object|null>}
 */
export async function updateThresholdFromOutcome(userId, prediction, outcome) {
  try {
    const thresholdType = prediction.predictionSubtype || prediction.predictionType;
    if (!thresholdType) return null;

    const [existingThreshold] = await db
      .select()
      .from(userThresholdsTable)
      .where(and(
        eq(userThresholdsTable.userId, userId),
        eq(userThresholdsTable.thresholdType, thresholdType)
      ))
      .limit(1);

    const isAccurate = outcome.predictionAccurate || outcome.inConfidenceInterval;

    if (existingThreshold) {
      const currentValue = parseFloat(existingThreshold.thresholdValue);
      const predictionsMade = (existingThreshold.predictionsMade || 0) + 1;
      const predictionsCorrect = (existingThreshold.predictionsCorrect || 0) + (isAccurate ? 1 : 0);
      const newAccuracyRate = predictionsCorrect / predictionsMade;

      let newValue = currentValue;
      let adjustmentReason = null;

      if (predictionsMade >= MIN_SAMPLES_FOR_THRESHOLD_ADJUSTMENT) {
        if (newAccuracyRate < 0.5) {
          // Too many false positives - raise threshold
          newValue = currentValue * (1 + THRESHOLD_ADJUSTMENT_RATE);
          adjustmentReason = 'false_positive_reduction';
        } else if (newAccuracyRate > 0.8 && isAccurate) {
          // Very accurate - slightly lower threshold to catch more
          newValue = currentValue * (1 - THRESHOLD_ADJUSTMENT_RATE * 0.5);
          adjustmentReason = 'sensitivity_increase';
        }
      }

      await db
        .update(userThresholdsTable)
        .set({
          thresholdValue: newValue.toFixed(2),
          predictionsMade,
          predictionsCorrect,
          accuracyRate: newAccuracyRate.toFixed(2),
          adjustmentCount: newValue !== currentValue
            ? (existingThreshold.adjustmentCount || 0) + 1
            : existingThreshold.adjustmentCount,
          lastAdjustmentAt: newValue !== currentValue ? new Date() : existingThreshold.lastAdjustmentAt,
          adjustmentReason: adjustmentReason || existingThreshold.adjustmentReason,
          confidenceLevel: getConfidenceLevel(predictionsMade, newAccuracyRate),
          updatedAt: new Date(),
        })
        .where(eq(userThresholdsTable.id, existingThreshold.id));

      return { updated: true, newValue, adjustmentReason };
    } else {
      // Create new threshold entry with defaults
      await db.insert(userThresholdsTable).values({
        userId,
        thresholdType,
        thresholdValue: '30.00', // Default starting value
        thresholdUnit: getThresholdUnit(thresholdType),
        source: 'personal_learning',
        predictionsMade: 1,
        predictionsCorrect: isAccurate ? 1 : 0,
        accuracyRate: isAccurate ? '1.00' : '0.00',
        initialValue: '30.00',
        confidenceLevel: 'low',
      });

      return { created: true };
    }
  } catch (error) {
    console.error('[OutcomeVerification] Error updating threshold:', error);
    return null;
  }
}

/**
 * Get user's personalized thresholds
 *
 * @param {string} userId
 * @returns {Promise<Object>} Map of threshold type to value/metadata
 */
export async function getUserThresholds(userId) {
  try {
    const thresholds = await db
      .select()
      .from(userThresholdsTable)
      .where(eq(userThresholdsTable.userId, userId));

    const thresholdMap = {};
    for (const t of thresholds) {
      thresholdMap[t.thresholdType] = {
        value: parseFloat(t.thresholdValue),
        unit: t.thresholdUnit,
        confidence: t.confidenceLevel,
        accuracy: parseFloat(t.accuracyRate || 0),
        source: t.source,
        sampleSize: t.predictionsMade || 0,
      };
    }

    return thresholdMap;
  } catch (error) {
    console.error('[OutcomeVerification] Error getting user thresholds:', error);
    return {};
  }
}

function getConfidenceLevel(sampleCount, accuracy) {
  if (sampleCount >= 30 && accuracy >= 0.7) return 'validated';
  if (sampleCount >= 15 && accuracy >= 0.6) return 'high';
  if (sampleCount >= 5 && accuracy >= 0.5) return 'medium';
  return 'low';
}

function getThresholdUnit(thresholdType) {
  const units = {
    sugar_crash: 'grams',
    protein_fatigue: 'grams',
    hydration_warning: 'percent',
    carb_threshold: 'grams',
    calorie_threshold: 'calories',
    energy_crash: 'grams',
    mood_dip: 'grams',
  };
  return units[thresholdType] || 'units';
}

/**
 * ============================================
 * IMPLICIT OUTCOME DETECTION
 * ============================================
 */

/**
 * Measure outcomes implicitly from user's logged data
 * For predictions that didn't receive explicit feedback
 *
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function measureImplicitOutcomes(userId) {
  try {
    const now = new Date();

    // Get pending predictions past their expected time
    const pendingPredictions = await db
      .select()
      .from(predictionLogTable)
      .where(and(
        eq(predictionLogTable.userId, userId),
        eq(predictionLogTable.outcomeStatus, 'pending'),
        lt(predictionLogTable.expiresAt, now)
      ))
      .orderBy(desc(predictionLogTable.createdAt))
      .limit(20);

    const results = [];

    for (const prediction of pendingPredictions) {
      const implicitOutcome = await detectImplicitOutcome(userId, prediction);

      if (implicitOutcome) {
        // Record the implicitly detected outcome
        const [outcome] = await db
          .insert(predictionOutcomesTable)
          .values({
            predictionId: prediction.id,
            userId,
            actualOutcome: implicitOutcome.outcome,
            outcomeIntensity: implicitOutcome.intensity,
            timingAccuracy: implicitOutcome.timingAccuracy,
            actualTime: implicitOutcome.detectedAt,
            feedbackMethod: 'implicit',
            predictionAccurate: implicitOutcome.accurate,
            accuracyScore: implicitOutcome.accuracyScore.toFixed(2),
            contextFactors: implicitOutcome.contextFactors,
          })
          .returning();

        // Update prediction status
        await db
          .update(predictionLogTable)
          .set({ outcomeStatus: 'confirmed' })
          .where(eq(predictionLogTable.id, prediction.id));

        // Trigger learning updates
        await updatePlattCalibration(userId);
        await updateThresholdFromOutcome(userId, prediction, outcome);

        results.push({ predictionId: prediction.id, outcome: implicitOutcome });
      } else {
        // Mark as skipped if we couldn't detect outcome
        await db
          .update(predictionLogTable)
          .set({ outcomeStatus: 'skipped' })
          .where(eq(predictionLogTable.id, prediction.id));

        results.push({ predictionId: prediction.id, outcome: null, skipped: true });
      }
    }

    return { processed: results.length, results };
  } catch (error) {
    console.error('[OutcomeVerification] Error measuring implicit outcomes:', error);
    return { processed: 0, error: error.message };
  }
}

/**
 * Detect outcome implicitly from user data logged after prediction
 */
async function detectImplicitOutcome(userId, prediction) {
  try {
    const predictedTime = new Date(prediction.predictedTime);
    const windowEnd = new Date(prediction.expiresAt);

    // Look for mood logs in the prediction window
    const moodLogs = await db
      .select()
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedDate, predictedTime),
        lte(moodLogTable.loggedDate, windowEnd)
      ))
      .orderBy(moodLogTable.loggedDate);

    if (moodLogs.length === 0) {
      return null;
    }

    // Analyze the mood/energy data
    const avgEnergy = moodLogs.reduce((sum, m) => sum + (m.energyLevel || 5), 0) / moodLogs.length;
    const avgIntensity = moodLogs.reduce((sum, m) => sum + (m.intensity || 5), 0) / moodLogs.length;

    const predictedNegative = ['high', 'medium'].includes(prediction.predictedSeverity);
    let outcome, accurate, accuracyScore;

    if (prediction.predictionType === 'energy_crash' || prediction.predictionType === 'energy') {
      const hadCrash = avgEnergy <= 4;
      if (predictedNegative) {
        accurate = hadCrash;
        accuracyScore = hadCrash ? 1.0 : (avgEnergy <= 5 ? 0.5 : 0.0);
        outcome = hadCrash ? 'as_predicted' : 'better_than_predicted';
      } else {
        accurate = !hadCrash;
        accuracyScore = !hadCrash ? 1.0 : 0.0;
        outcome = !hadCrash ? 'as_predicted' : 'worse_than_predicted';
      }
    } else if (prediction.predictionType === 'mood_dip' || prediction.predictionType === 'mood') {
      const hadDip = avgIntensity <= 4;
      if (predictedNegative) {
        accurate = hadDip;
        accuracyScore = hadDip ? 1.0 : (avgIntensity <= 5 ? 0.5 : 0.0);
        outcome = hadDip ? 'as_predicted' : 'better_than_predicted';
      } else {
        accurate = !hadDip;
        accuracyScore = !hadDip ? 1.0 : 0.0;
        outcome = !hadDip ? 'as_predicted' : 'worse_than_predicted';
      }
    } else {
      const hadIssue = avgEnergy <= 4 || avgIntensity <= 4;
      if (predictedNegative) {
        accurate = hadIssue;
        accuracyScore = hadIssue ? 1.0 : 0.5;
        outcome = hadIssue ? 'as_predicted' : 'better_than_predicted';
      } else {
        accurate = !hadIssue;
        accuracyScore = !hadIssue ? 1.0 : 0.0;
        outcome = !hadIssue ? 'as_predicted' : 'worse_than_predicted';
      }
    }

    const firstLog = moodLogs[0];
    const logTime = new Date(firstLog.loggedDate);
    const timeDiff = Math.abs((logTime - predictedTime) / (1000 * 60));
    const timingAccuracy = timeDiff > 60 ? (logTime < predictedTime ? 'early' : 'late') : 'on_time';

    return {
      outcome,
      accurate,
      accuracyScore,
      intensity: Math.round(avgEnergy),
      timingAccuracy,
      detectedAt: logTime,
      contextFactors: {
        moodLogsAnalyzed: moodLogs.length,
        avgEnergy,
        avgIntensity,
        detectionMethod: 'implicit_mood_analysis',
      },
    };
  } catch (error) {
    console.error('[OutcomeVerification] Error detecting implicit outcome:', error);
    return null;
  }
}

/**
 * ============================================
 * PREDICTION ACCURACY STATS
 * ============================================
 */

/**
 * Get comprehensive prediction accuracy stats for a user
 *
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function getPredictionAccuracyStats(userId) {
  try {
    const outcomes = await db
      .select({
        predictionType: predictionLogTable.predictionType,
        accurate: predictionOutcomesTable.predictionAccurate,
        accuracyScore: predictionOutcomesTable.accuracyScore,
      })
      .from(predictionOutcomesTable)
      .innerJoin(
        predictionLogTable,
        eq(predictionOutcomesTable.predictionId, predictionLogTable.id)
      )
      .where(eq(predictionOutcomesTable.userId, userId));

    if (outcomes.length === 0) {
      return { hasData: false };
    }

    const totalAccurate = outcomes.filter(o => o.accurate).length;
    const overallAccuracy = totalAccurate / outcomes.length;

    const byType = {};
    for (const outcome of outcomes) {
      const type = outcome.predictionType || 'unknown';
      if (!byType[type]) {
        byType[type] = { total: 0, accurate: 0 };
      }
      byType[type].total++;
      if (outcome.accurate) {
        byType[type].accurate++;
      }
    }

    const typeAccuracies = {};
    for (const [type, stats] of Object.entries(byType)) {
      typeAccuracies[type] = {
        accuracy: stats.accurate / stats.total,
        sampleSize: stats.total,
      };
    }

    return {
      hasData: true,
      totalPredictions: outcomes.length,
      overallAccuracy: Math.round(overallAccuracy * 100) / 100,
      byType: typeAccuracies,
    };
  } catch (error) {
    console.error('[OutcomeVerification] Error getting accuracy stats:', error);
    return { hasData: false, error: error.message };
  }
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
  recordRecommendationSatisfaction,
  processPendingVerifications,
  // Prediction tracking
  logPrediction,
  verifyPrediction,
  calculatePredictionAccuracy,
  // Platt calibration
  updatePlattCalibration,
  getUserPlattParams,
  // Threshold learning
  updateThresholdFromOutcome,
  getUserThresholds,
  // Implicit outcomes
  measureImplicitOutcomes,
  // Stats
  getPredictionAccuracyStats,
};
