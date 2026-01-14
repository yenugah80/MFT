/**
 * Drift Detection Service
 *
 * Production-grade model drift detection using CUSUM (Cumulative Sum) algorithm.
 * Monitors correlation strength, acceptance rates, and feature distributions
 * to detect when models need retraining.
 *
 * Key Features:
 * - CUSUM algorithm for change point detection
 * - EWMA (Exponentially Weighted Moving Average) for smoothing
 * - Page-Hinkley test for mean shift detection
 * - Automatic retraining triggers
 * - Alert generation for significant drifts
 *
 * Statistical Foundation:
 * - CUSUM: Detects persistent shifts in mean
 * - EWMA: Smooths noisy data while remaining sensitive to changes
 * - Page-Hinkley: Sequential test for mean change
 *
 * References:
 * - Page (1954): Continuous inspection schemes
 * - Roberts (1959): Control chart tests based on geometric moving averages
 * - Hinkley (1971): Inference about the change-point from cumulative sum tests
 */

import { db } from '../db/index.js';
import {
  driftMetricsTable,
  userCorrelationsTable,
  recommendationsHistoryTable,
  profilesTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * ============================================
 * CONFIGURATION
 * ============================================
 */

// CUSUM parameters
const CUSUM_THRESHOLD_MULTIPLIER = 4; // Standard deviations before alert
const CUSUM_DRIFT_THRESHOLD = 0.5;    // Minimum drift magnitude to report

// EWMA parameters
const EWMA_LAMBDA = 0.2; // Smoothing factor (0-1, higher = more recent data weight)

// Page-Hinkley parameters
const PH_DELTA = 0.005;  // Minimum change to detect
const PH_LAMBDA = 50;    // Threshold for detection

// Monitoring windows
const MONITORING_WINDOW_DAYS = 7;
const BASELINE_WINDOW_DAYS = 30;
const MIN_SAMPLES_FOR_DETECTION = 10;

/**
 * ============================================
 * CUSUM ALGORITHM
 * ============================================
 */

/**
 * Compute CUSUM statistics for a time series
 * CUSUM detects shifts in the mean of a sequence
 *
 * Algorithm:
 * S_high(t) = max(0, S_high(t-1) + x_t - μ_0 - k)
 * S_low(t)  = min(0, S_low(t-1) + x_t - μ_0 + k)
 *
 * where μ_0 is the target mean and k is the allowance parameter
 *
 * @param {Array} values - Time series of values
 * @param {number} targetMean - Expected mean (baseline)
 * @param {number} targetStd - Expected standard deviation (baseline)
 * @returns {Object} CUSUM statistics
 */
export function computeCUSUM(values, targetMean, targetStd) {
  if (!values || values.length < 2) {
    return { valid: false, error: 'Insufficient data' };
  }

  // Allowance parameter (typically 0.5 * σ for detecting 1σ shifts)
  const k = 0.5 * targetStd;

  // Threshold (typically 4-5 * σ)
  const h = CUSUM_THRESHOLD_MULTIPLIER * targetStd;

  // Initialize CUSUM
  let sHigh = 0;
  let sLow = 0;
  let maxSHigh = 0;
  let minSLow = 0;

  const cusumSeries = [];

  for (let i = 0; i < values.length; i++) {
    const x = values[i];

    // Update CUSUM
    sHigh = Math.max(0, sHigh + (x - targetMean - k));
    sLow = Math.min(0, sLow + (x - targetMean + k));

    // Track extremes
    maxSHigh = Math.max(maxSHigh, sHigh);
    minSLow = Math.min(minSLow, sLow);

    cusumSeries.push({
      index: i,
      value: x,
      sHigh,
      sLow,
      upperBreach: sHigh > h,
      lowerBreach: sLow < -h,
    });
  }

  // Detect drift
  const upperDrift = maxSHigh > h;
  const lowerDrift = minSLow < -h;
  const driftDetected = upperDrift || lowerDrift;

  // Calculate drift magnitude
  let driftDirection = null;
  let driftMagnitude = 0;

  if (upperDrift) {
    driftDirection = 'positive';
    driftMagnitude = maxSHigh / h;
  } else if (lowerDrift) {
    driftDirection = 'negative';
    driftMagnitude = Math.abs(minSLow) / h;
  }

  // Find change point (first breach)
  const changePoint = cusumSeries.findIndex(s => s.upperBreach || s.lowerBreach);

  return {
    valid: true,
    driftDetected,
    driftDirection,
    driftMagnitude,
    changePoint: changePoint >= 0 ? changePoint : null,
    finalSHigh: sHigh,
    finalSLow: sLow,
    threshold: h,
    allowance: k,
    series: cusumSeries,
    statistics: {
      maxPositiveCusum: maxSHigh,
      minNegativeCusum: minSLow,
      sampleSize: values.length,
    },
  };
}

/**
 * ============================================
 * EWMA (Exponentially Weighted Moving Average)
 * ============================================
 */

/**
 * Compute EWMA for smoothing and trend detection
 *
 * EWMA(t) = λ * x_t + (1-λ) * EWMA(t-1)
 *
 * @param {Array} values - Time series
 * @param {number} lambda - Smoothing factor (0-1)
 * @returns {Object}
 */
export function computeEWMA(values, lambda = EWMA_LAMBDA) {
  if (!values || values.length === 0) {
    return { valid: false, error: 'No data' };
  }

  let ewma = values[0];
  const ewmaSeries = [{ index: 0, value: values[0], ewma }];

  for (let i = 1; i < values.length; i++) {
    ewma = lambda * values[i] + (1 - lambda) * ewma;
    ewmaSeries.push({
      index: i,
      value: values[i],
      ewma,
      deviation: values[i] - ewma,
    });
  }

  // Calculate EWMA variance (for control limits)
  const ewmaVariance = (lambda / (2 - lambda)) * variance(values);
  const controlLimit = 3 * Math.sqrt(ewmaVariance);

  // Check for out-of-control points
  const outOfControl = ewmaSeries.filter(s =>
    Math.abs(s.ewma - mean(values)) > controlLimit
  );

  return {
    valid: true,
    currentEWMA: ewma,
    series: ewmaSeries,
    controlLimit,
    outOfControlCount: outOfControl.length,
    trend: detectTrend(ewmaSeries.map(s => s.ewma)),
  };
}

/**
 * ============================================
 * PAGE-HINKLEY TEST
 * ============================================
 */

/**
 * Page-Hinkley test for mean shift detection
 * More sensitive to small gradual changes than CUSUM
 *
 * @param {Array} values - Time series
 * @param {Object} options - Test parameters
 * @returns {Object}
 */
export function pageHinkleyTest(values, options = {}) {
  const {
    delta = PH_DELTA,
    lambda = PH_LAMBDA,
  } = options;

  if (!values || values.length < 3) {
    return { valid: false, error: 'Insufficient data' };
  }

  const n = values.length;
  const cumSum = [];
  let sum = 0;
  let minSum = 0;
  let maxSum = 0;

  for (let i = 0; i < n; i++) {
    sum += values[i] - mean(values.slice(0, i + 1)) - delta;
    cumSum.push(sum);
    minSum = Math.min(minSum, sum);
    maxSum = Math.max(maxSum, sum);
  }

  // Page-Hinkley statistic
  const phPlus = maxSum - minSum;
  const phMinus = minSum - maxSum;

  // Detect change
  const changeDetected = Math.max(phPlus, Math.abs(phMinus)) > lambda;

  return {
    valid: true,
    changeDetected,
    phStatisticPlus: phPlus,
    phStatisticMinus: phMinus,
    threshold: lambda,
    changeDirection: phPlus > Math.abs(phMinus) ? 'increase' : 'decrease',
    series: cumSum,
  };
}

/**
 * ============================================
 * STATISTICAL HELPERS
 * ============================================
 */

function mean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function variance(values) {
  if (!values || values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / (values.length - 1);
}

function standardDeviation(values) {
  return Math.sqrt(variance(values));
}

function detectTrend(values) {
  if (!values || values.length < 3) return 'insufficient_data';

  // Simple linear regression
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Interpret slope relative to data scale
  const relativeSlope = slope / (yMean || 1);

  if (relativeSlope > 0.05) return 'increasing';
  if (relativeSlope < -0.05) return 'decreasing';
  return 'stable';
}

/**
 * ============================================
 * DRIFT MONITORING
 * ============================================
 */

/**
 * Monitor correlation strength drift for a user
 *
 * @param {string} userId
 * @param {number} correlationId
 * @returns {Promise<Object>}
 */
export async function monitorCorrelationDrift(userId, correlationId) {
  try {
    const now = new Date();
    const monitoringStart = new Date(now.getTime() - MONITORING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const baselineStart = new Date(now.getTime() - (MONITORING_WINDOW_DAYS + BASELINE_WINDOW_DAYS) * 24 * 60 * 60 * 1000);

    // Get correlation history (we'd need to track this over time)
    // For now, we'll use the evidence table as a proxy
    const correlation = await db
      .select()
      .from(userCorrelationsTable)
      .where(eq(userCorrelationsTable.id, correlationId))
      .limit(1);

    if (!correlation.length) {
      return { valid: false, error: 'Correlation not found' };
    }

    // Get historical drift metrics
    const historicalMetrics = await db
      .select()
      .from(driftMetricsTable)
      .where(
        and(
          eq(driftMetricsTable.userId, userId),
          eq(driftMetricsTable.correlationId, correlationId),
          gte(driftMetricsTable.windowStart, baselineStart)
        )
      )
      .orderBy(driftMetricsTable.windowStart);

    if (historicalMetrics.length < MIN_SAMPLES_FOR_DETECTION) {
      return {
        valid: false,
        error: 'Insufficient historical data',
        metricsCount: historicalMetrics.length,
        minRequired: MIN_SAMPLES_FOR_DETECTION,
      };
    }

    // Extract metric values for analysis
    const metricValues = historicalMetrics.map(m => parseFloat(m.metricValue));

    // Split into baseline and monitoring periods
    const splitIndex = Math.floor(metricValues.length * (BASELINE_WINDOW_DAYS / (BASELINE_WINDOW_DAYS + MONITORING_WINDOW_DAYS)));
    const baselineValues = metricValues.slice(0, splitIndex);
    const monitoringValues = metricValues.slice(splitIndex);

    if (baselineValues.length < 3 || monitoringValues.length < 3) {
      return { valid: false, error: 'Insufficient data in periods' };
    }

    // Calculate baseline statistics
    const baselineMean = mean(baselineValues);
    const baselineStd = standardDeviation(baselineValues);

    // Run CUSUM on monitoring period
    const cusumResult = computeCUSUM(monitoringValues, baselineMean, baselineStd);

    // Run EWMA
    const ewmaResult = computeEWMA(metricValues);

    // Run Page-Hinkley
    const phResult = pageHinkleyTest(metricValues);

    // Combine results
    const driftDetected = cusumResult.driftDetected || phResult.changeDetected;
    const driftConfidence = calculateDriftConfidence(cusumResult, phResult, ewmaResult);

    const result = {
      valid: true,
      correlationId,
      userId,
      driftDetected,
      driftDirection: cusumResult.driftDirection,
      driftMagnitude: cusumResult.driftMagnitude,
      driftConfidence,
      cusum: {
        detected: cusumResult.driftDetected,
        magnitude: cusumResult.driftMagnitude,
        changePoint: cusumResult.changePoint,
      },
      pageHinkley: {
        detected: phResult.changeDetected,
        direction: phResult.changeDirection,
      },
      ewma: {
        trend: ewmaResult.trend,
        outOfControlCount: ewmaResult.outOfControlCount,
      },
      baseline: {
        mean: baselineMean,
        std: baselineStd,
        sampleSize: baselineValues.length,
      },
      monitoring: {
        mean: mean(monitoringValues),
        std: standardDeviation(monitoringValues),
        sampleSize: monitoringValues.length,
      },
      recommendation: generateDriftRecommendation(driftDetected, cusumResult, phResult),
    };

    // Store drift metric if drift detected
    if (driftDetected) {
      await storeDriftMetric(userId, correlationId, result);
    }

    return result;
  } catch (error) {
    console.error('[Drift Detection] Error monitoring correlation drift:', error);
    throw error;
  }
}

/**
 * Calculate overall drift confidence from multiple tests
 */
function calculateDriftConfidence(cusum, pageHinkley, ewma) {
  let confidence = 0;
  let tests = 0;

  if (cusum.valid) {
    tests++;
    if (cusum.driftDetected) confidence += 0.4;
    confidence += Math.min(0.2, cusum.driftMagnitude * 0.1);
  }

  if (pageHinkley.valid) {
    tests++;
    if (pageHinkley.changeDetected) confidence += 0.3;
  }

  if (ewma.valid) {
    tests++;
    if (ewma.trend === 'increasing' || ewma.trend === 'decreasing') confidence += 0.15;
    if (ewma.outOfControlCount > 2) confidence += 0.15;
  }

  return tests > 0 ? Math.min(1, confidence) : 0;
}

/**
 * Generate recommendation based on drift results
 */
function generateDriftRecommendation(driftDetected, cusum, pageHinkley) {
  if (!driftDetected) {
    return {
      action: 'none',
      message: 'No drift detected. Model is stable.',
      urgency: 'low',
    };
  }

  const magnitude = cusum.driftMagnitude || 0;

  if (magnitude > 2) {
    return {
      action: 'retrain_immediately',
      message: 'Significant drift detected. Immediate retraining recommended.',
      urgency: 'critical',
    };
  }

  if (magnitude > 1) {
    return {
      action: 'schedule_retraining',
      message: 'Moderate drift detected. Schedule retraining within 24 hours.',
      urgency: 'high',
    };
  }

  return {
    action: 'monitor',
    message: 'Minor drift detected. Continue monitoring and retrain if drift persists.',
    urgency: 'medium',
  };
}

/**
 * Store drift metric in database
 */
async function storeDriftMetric(userId, correlationId, result) {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - MONITORING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    await db.insert(driftMetricsTable).values({
      userId,
      metricType: 'correlation_strength',
      correlationId,
      windowStart,
      windowEnd: now,
      windowDays: MONITORING_WINDOW_DAYS,
      metricValue: result.monitoring.mean,
      sampleSize: result.monitoring.sampleSize,
      standardError: result.monitoring.std / Math.sqrt(result.monitoring.sampleSize),
      cusumValue: result.cusum.magnitude,
      cusumUpperThreshold: CUSUM_THRESHOLD_MULTIPLIER,
      cusumLowerThreshold: -CUSUM_THRESHOLD_MULTIPLIER,
      driftDetected: result.driftDetected,
      driftDirection: result.driftDirection,
      driftMagnitude: result.driftMagnitude,
      driftConfidence: result.driftConfidence,
      alertTriggered: result.driftConfidence > 0.7,
      retrainingTriggered: result.driftConfidence > 0.85,
    });

    console.log(`[Drift Detection] Stored drift metric for user ${userId}, correlation ${correlationId}`);
  } catch (error) {
    console.error('[Drift Detection] Error storing drift metric:', error);
  }
}

/**
 * ============================================
 * ACCEPTANCE RATE MONITORING
 * ============================================
 */

/**
 * Monitor recommendation acceptance rate drift
 *
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function monitorAcceptanceRateDrift(userId) {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - (MONITORING_WINDOW_DAYS + BASELINE_WINDOW_DAYS) * 24 * 60 * 60 * 1000);

    // Get recommendation history
    const history = await db
      .select({
        shownAt: recommendationsHistoryTable.shownAt,
        status: recommendationsHistoryTable.interactionStatus,
      })
      .from(recommendationsHistoryTable)
      .where(
        and(
          eq(recommendationsHistoryTable.userId, userId),
          gte(recommendationsHistoryTable.shownAt, windowStart)
        )
      )
      .orderBy(recommendationsHistoryTable.shownAt);

    if (history.length < MIN_SAMPLES_FOR_DETECTION * 2) {
      return {
        valid: false,
        error: 'Insufficient recommendation history',
        count: history.length,
      };
    }

    // Calculate daily acceptance rates
    const dailyRates = {};
    for (const rec of history) {
      const day = rec.shownAt.toISOString().split('T')[0];
      if (!dailyRates[day]) {
        dailyRates[day] = { total: 0, accepted: 0 };
      }
      dailyRates[day].total++;
      if (rec.status === 'accepted') {
        dailyRates[day].accepted++;
      }
    }

    // Convert to time series
    const sortedDays = Object.keys(dailyRates).sort();
    const acceptanceRates = sortedDays.map(day =>
      dailyRates[day].accepted / dailyRates[day].total
    );

    if (acceptanceRates.length < MIN_SAMPLES_FOR_DETECTION) {
      return { valid: false, error: 'Insufficient daily data points' };
    }

    // Split into baseline and monitoring
    const splitIndex = Math.floor(acceptanceRates.length * (BASELINE_WINDOW_DAYS / (BASELINE_WINDOW_DAYS + MONITORING_WINDOW_DAYS)));
    const baselineRates = acceptanceRates.slice(0, splitIndex);
    const monitoringRates = acceptanceRates.slice(splitIndex);

    // Calculate baseline
    const baselineMean = mean(baselineRates);
    const baselineStd = standardDeviation(baselineRates);

    // Run CUSUM
    const cusumResult = computeCUSUM(monitoringRates, baselineMean, baselineStd);

    // Run EWMA
    const ewmaResult = computeEWMA(acceptanceRates);

    const driftDetected = cusumResult.driftDetected;
    const driftConfidence = calculateDriftConfidence(cusumResult, { valid: false }, ewmaResult);

    return {
      valid: true,
      userId,
      metricType: 'acceptance_rate',
      driftDetected,
      driftDirection: cusumResult.driftDirection,
      driftMagnitude: cusumResult.driftMagnitude,
      driftConfidence,
      baseline: {
        mean: baselineMean,
        std: baselineStd,
        days: baselineRates.length,
      },
      current: {
        mean: mean(monitoringRates),
        std: standardDeviation(monitoringRates),
        days: monitoringRates.length,
      },
      trend: ewmaResult.trend,
      recommendation: generateDriftRecommendation(driftDetected, cusumResult, { valid: false }),
    };
  } catch (error) {
    console.error('[Drift Detection] Error monitoring acceptance rate drift:', error);
    throw error;
  }
}

/**
 * ============================================
 * BATCH MONITORING
 * ============================================
 */

/**
 * Run drift detection for all active users
 *
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function runBatchDriftDetection(options = {}) {
  const { batchSize = 50, limit = null } = options;

  try {
    console.log('[Drift Detection] Starting batch drift detection...');

    // Get all active users with sufficient data
    let usersQuery = db
      .select({ userId: profilesTable.userId })
      .from(profilesTable);

    if (limit) {
      usersQuery = usersQuery.limit(limit);
    }

    const users = await usersQuery;

    const results = {
      total: users.length,
      processed: 0,
      driftsDetected: 0,
      criticalAlerts: 0,
      errors: 0,
      userResults: [],
    };

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (user) => {
          try {
            const acceptanceResult = await monitorAcceptanceRateDrift(user.userId);

            return {
              userId: user.userId,
              acceptanceDrift: acceptanceResult.valid ? {
                detected: acceptanceResult.driftDetected,
                direction: acceptanceResult.driftDirection,
                confidence: acceptanceResult.driftConfidence,
              } : null,
            };
          } catch (error) {
            return { userId: user.userId, error: error.message };
          }
        })
      );

      for (const result of batchResults) {
        results.processed++;
        if (result.error) {
          results.errors++;
        } else if (result.acceptanceDrift?.detected) {
          results.driftsDetected++;
          if (result.acceptanceDrift.confidence > 0.8) {
            results.criticalAlerts++;
          }
        }
        results.userResults.push(result);
      }

      console.log(`[Drift Detection] Processed ${results.processed}/${results.total} users`);
    }

    console.log(`[Drift Detection] Batch complete: ${results.driftsDetected} drifts detected, ${results.criticalAlerts} critical alerts`);

    return results;
  } catch (error) {
    console.error('[Drift Detection] Error in batch drift detection:', error);
    throw error;
  }
}

/**
 * Get drift history for a user
 *
 * @param {string} userId
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function getDriftHistory(userId, options = {}) {
  const { days = 30, metricType = null } = options;

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let query = db
      .select()
      .from(driftMetricsTable)
      .where(
        and(
          eq(driftMetricsTable.userId, userId),
          gte(driftMetricsTable.createdAt, since)
        )
      );

    if (metricType) {
      query = query.where(eq(driftMetricsTable.metricType, metricType));
    }

    const history = await query.orderBy(desc(driftMetricsTable.createdAt));

    return history;
  } catch (error) {
    console.error('[Drift Detection] Error fetching drift history:', error);
    throw error;
  }
}

/**
 * Get the latest drift status for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Latest drift status or null if none
 */
export async function getLatestDriftStatus(userId) {
  try {
    const history = await getDriftHistory(userId, { limit: 1 });
    if (history && history.length > 0) {
      return history[0];
    }
    return null;
  } catch (error) {
    console.error('[DriftDetection] Error getting latest drift status:', error);
    return null;
  }
}

export default {
  // Core algorithms
  computeCUSUM,
  computeEWMA,
  pageHinkleyTest,

  // Monitoring
  monitorCorrelationDrift,
  monitorAcceptanceRateDrift,
  runBatchDriftDetection,
  getDriftHistory,
  getLatestDriftStatus,
};
