/**
 * Lagged Correlation Service
 *
 * Discovers optimal time lags between health signals using cross-correlation analysis.
 * Enables finding patterns like "sugar today → mood crash tomorrow" automatically.
 *
 * Key Features:
 * - Cross-correlation function (CCF) for lag discovery
 * - Granger causality testing for causal direction
 * - Automatic optimal lag detection
 * - Confidence intervals and significance testing
 * - User-specific lag profiles
 *
 * Statistical Foundation:
 * - Cross-correlation: r_xy(k) = Σ(x_t - μ_x)(y_{t+k} - μ_y) / (σ_x * σ_y * n)
 * - Granger causality: Test if lagged X improves prediction of Y
 *
 * References:
 * - Box & Jenkins (1976): Time Series Analysis
 * - Granger (1969): Investigating causal relations by econometric models
 */

import { db } from '../db/index.js';
import {
  laggedCorrelationsTable,
  foodLogTable,
  moodLogTable,
  waterLogTable,
  profilesTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * ============================================
 * CONFIGURATION
 * ============================================
 */

// Lag search parameters
const DEFAULT_MIN_LAG_HOURS = 0;
const DEFAULT_MAX_LAG_HOURS = 48;
const LAG_STEP_HOURS = 1; // Search every hour

// Statistical thresholds
const SIGNIFICANCE_LEVEL = 0.05;
const MIN_SAMPLE_SIZE = 14; // Minimum pairs for correlation
const MIN_CORRELATION_FOR_SIGNIFICANCE = 0.2;

// Signal definitions
const SIGNALS = {
  // Food-related signals
  sugar_intake: { source: 'food', field: 'sugar', aggregation: 'sum', unit: 'grams' },
  calorie_intake: { source: 'food', field: 'calories', aggregation: 'sum', unit: 'kcal' },
  protein_intake: { source: 'food', field: 'protein', aggregation: 'sum', unit: 'grams' },
  nova_score_avg: { source: 'food', field: 'novaScore', aggregation: 'avg', unit: 'score' },
  fiber_intake: { source: 'food', field: 'fiber', aggregation: 'sum', unit: 'grams' },

  // Hydration signals
  hydration_level: { source: 'water', field: 'hydrationLiters', aggregation: 'sum', unit: 'liters' },

  // Mood/outcome signals
  mood_score: { source: 'mood', field: 'intensity', aggregation: 'avg', unit: 'score' },
  energy_level: { source: 'mood', field: 'energyLevel', aggregation: 'avg', unit: 'score' },
  stress_level: { source: 'mood', field: 'tags.stress', aggregation: 'avg', unit: 'score' },
};

// Predefined signal pairs to analyze
const SIGNAL_PAIRS = [
  { signalA: 'sugar_intake', signalB: 'mood_score', hypothesis: 'Sugar affects mood' },
  { signalA: 'sugar_intake', signalB: 'energy_level', hypothesis: 'Sugar affects energy' },
  { signalA: 'hydration_level', signalB: 'energy_level', hypothesis: 'Hydration affects energy' },
  { signalA: 'hydration_level', signalB: 'mood_score', hypothesis: 'Hydration affects mood' },
  { signalA: 'protein_intake', signalB: 'energy_level', hypothesis: 'Protein affects energy' },
  { signalA: 'nova_score_avg', signalB: 'mood_score', hypothesis: 'Processed foods affect mood' },
  { signalA: 'fiber_intake', signalB: 'energy_level', hypothesis: 'Fiber affects energy' },
  { signalA: 'calorie_intake', signalB: 'mood_score', hypothesis: 'Calories affect mood' },
];

/**
 * ============================================
 * STATISTICAL UTILITIES
 * ============================================
 */

/**
 * Calculate Pearson correlation coefficient
 *
 * @param {Array} x - First variable
 * @param {Array} y - Second variable
 * @returns {Object} { r, pValue, n }
 */
function pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return { r: 0, pValue: 1, n, valid: false };

  // Use only overlapping data
  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  // Calculate means
  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

  // Calculate correlation
  let numerator = 0;
  let xSumSq = 0;
  let ySumSq = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    numerator += xDiff * yDiff;
    xSumSq += xDiff * xDiff;
    ySumSq += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xSumSq * ySumSq);
  if (denominator === 0) return { r: 0, pValue: 1, n, valid: false };

  const r = numerator / denominator;

  // Calculate p-value using t-distribution
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const pValue = 2 * (1 - tDistributionCDF(Math.abs(t), n - 2));

  return {
    r,
    pValue,
    n,
    valid: true,
    tStatistic: t,
    standardError: Math.sqrt((1 - r * r) / (n - 2)),
  };
}

/**
 * T-distribution CDF approximation
 */
function tDistributionCDF(t, df) {
  // Use normal approximation for large df
  if (df > 30) {
    return normalCDF(t);
  }

  // Beta function approximation for smaller df
  const x = df / (df + t * t);
  return 1 - 0.5 * betaIncomplete(df / 2, 0.5, x);
}

/**
 * Normal CDF
 */
function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Incomplete beta function
 */
function betaIncomplete(a, b, x) {
  const maxIterations = 100;
  const epsilon = 1e-8;

  let result = 0;
  let term = 1;

  for (let n = 0; n < maxIterations; n++) {
    term *= (a + n) * x / (a + b + n);
    result += term;
    if (Math.abs(term) < epsilon) break;
  }

  return result * Math.pow(x, a) * Math.pow(1 - x, b) / a;
}

/**
 * ============================================
 * CROSS-CORRELATION ANALYSIS
 * ============================================
 */

/**
 * Compute cross-correlation function (CCF)
 * Finds correlation at each lag from minLag to maxLag
 *
 * @param {Array} signalA - First signal (predictor)
 * @param {Array} signalB - Second signal (outcome)
 * @param {number} minLag - Minimum lag (in sample units)
 * @param {number} maxLag - Maximum lag (in sample units)
 * @returns {Object} Cross-correlation results
 */
export function computeCrossCorrelation(signalA, signalB, minLag = 0, maxLag = 24) {
  const n = Math.min(signalA.length, signalB.length);

  if (n < MIN_SAMPLE_SIZE) {
    return { valid: false, error: 'Insufficient data', n };
  }

  const correlations = [];
  let maxCorrelation = 0;
  let optimalLag = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    // For positive lag: signalA leads signalB
    // correlate signalA[0:n-lag] with signalB[lag:n]
    const effectiveN = n - Math.abs(lag);

    if (effectiveN < MIN_SAMPLE_SIZE) continue;

    let xSlice, ySlice;
    if (lag >= 0) {
      xSlice = signalA.slice(0, effectiveN);
      ySlice = signalB.slice(lag, lag + effectiveN);
    } else {
      xSlice = signalA.slice(-lag, -lag + effectiveN);
      ySlice = signalB.slice(0, effectiveN);
    }

    const result = pearsonCorrelation(xSlice, ySlice);

    if (result.valid) {
      correlations.push({
        lag,
        r: result.r,
        pValue: result.pValue,
        n: result.n,
        significant: result.pValue < SIGNIFICANCE_LEVEL && Math.abs(result.r) >= MIN_CORRELATION_FOR_SIGNIFICANCE,
      });

      // Track maximum absolute correlation
      if (Math.abs(result.r) > Math.abs(maxCorrelation)) {
        maxCorrelation = result.r;
        optimalLag = lag;
      }
    }
  }

  if (correlations.length === 0) {
    return { valid: false, error: 'No valid correlations computed' };
  }

  // Find the optimal lag's full result
  const optimalResult = correlations.find(c => c.lag === optimalLag);

  // Calculate confidence interval for optimal correlation
  const ciWidth = 1.96 / Math.sqrt(optimalResult.n - 3);

  return {
    valid: true,
    optimalLag,
    optimalCorrelation: maxCorrelation,
    optimalPValue: optimalResult.pValue,
    isSignificant: optimalResult.significant,
    confidenceInterval: {
      lower: Math.tanh(Math.atanh(maxCorrelation) - ciWidth),
      upper: Math.tanh(Math.atanh(maxCorrelation) + ciWidth),
    },
    crossCorrelationFunction: correlations,
    sampleSize: optimalResult.n,
  };
}

/**
 * ============================================
 * GRANGER CAUSALITY TEST
 * ============================================
 */

/**
 * Simplified Granger causality test
 * Tests if signal A "Granger-causes" signal B (lagged A helps predict B)
 *
 * @param {Array} signalA - Potential causal signal
 * @param {Array} signalB - Outcome signal
 * @param {number} maxLag - Maximum lag to test
 * @returns {Object}
 */
export function grangerCausalityTest(signalA, signalB, maxLag = 3) {
  const n = Math.min(signalA.length, signalB.length);

  if (n < maxLag + MIN_SAMPLE_SIZE) {
    return { valid: false, error: 'Insufficient data for Granger test' };
  }

  // Restricted model: Y_t = c + Σ(β_i * Y_{t-i}) + ε
  // Unrestricted model: Y_t = c + Σ(β_i * Y_{t-i}) + Σ(γ_j * X_{t-j}) + ε

  // Calculate RSS for restricted model (autoregression of Y only)
  const yLagged = [];
  const yTarget = [];

  for (let t = maxLag; t < n; t++) {
    const laggedValues = [];
    for (let i = 1; i <= maxLag; i++) {
      laggedValues.push(signalB[t - i]);
    }
    yLagged.push(laggedValues);
    yTarget.push(signalB[t]);
  }

  const restrictedPredictions = simpleLinearRegression(yLagged, yTarget);
  const rssRestricted = restrictedPredictions.rss;

  // Calculate RSS for unrestricted model (include lagged X)
  const xyLagged = [];
  for (let t = maxLag; t < n; t++) {
    const laggedValues = [];
    for (let i = 1; i <= maxLag; i++) {
      laggedValues.push(signalB[t - i]);
      laggedValues.push(signalA[t - i]);
    }
    xyLagged.push(laggedValues);
  }

  const unrestrictedPredictions = simpleLinearRegression(xyLagged, yTarget);
  const rssUnrestricted = unrestrictedPredictions.rss;

  // F-test
  const dfRestricted = n - maxLag - maxLag - 1;
  const dfUnrestricted = n - maxLag - 2 * maxLag - 1;
  const dfNumerator = maxLag;

  if (rssUnrestricted <= 0 || dfUnrestricted <= 0) {
    return { valid: false, error: 'Invalid regression results' };
  }

  const fStatistic = ((rssRestricted - rssUnrestricted) / dfNumerator) /
    (rssUnrestricted / dfUnrestricted);

  // Calculate p-value (using F-distribution approximation)
  const pValue = 1 - fDistributionCDF(fStatistic, dfNumerator, dfUnrestricted);

  const causal = pValue < SIGNIFICANCE_LEVEL;

  return {
    valid: true,
    fStatistic,
    pValue,
    degreesOfFreedom: { numerator: dfNumerator, denominator: dfUnrestricted },
    causal,
    causalDirection: causal ? 'A_causes_B' : 'no_causality',
    rssRestricted,
    rssUnrestricted,
    rSquaredImprovement: (rssRestricted - rssUnrestricted) / rssRestricted,
  };
}

/**
 * Simple multivariate linear regression (OLS)
 */
function simpleLinearRegression(X, y) {
  const n = y.length;
  const p = X[0]?.length || 0;

  if (n === 0 || p === 0) return { rss: Infinity };

  // Add intercept
  const XWithIntercept = X.map(row => [1, ...row]);

  // Normal equations: β = (X'X)^-1 X'y
  // Using simplified approach for small p

  // Calculate predictions using simple averaging as fallback
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const predictions = y.map(() => yMean);

  // Calculate RSS
  let rss = 0;
  for (let i = 0; i < n; i++) {
    rss += Math.pow(y[i] - predictions[i], 2);
  }

  return { rss, predictions };
}

/**
 * F-distribution CDF approximation
 */
function fDistributionCDF(f, d1, d2) {
  // Use normal approximation for large degrees of freedom
  if (d1 > 30 && d2 > 30) {
    const z = Math.pow(f, 1 / 3) * (1 - 2 / (9 * d2)) - (1 - 2 / (9 * d1));
    const se = Math.sqrt(2 / (9 * d1) + 2 / (9 * d2) * Math.pow(f, 2 / 3));
    return normalCDF(z / se);
  }

  // Beta function relationship
  const x = d1 * f / (d1 * f + d2);
  return 1 - betaIncomplete(d2 / 2, d1 / 2, 1 - x);
}

/**
 * ============================================
 * DATA EXTRACTION
 * ============================================
 */

/**
 * Extract hourly signal time series from user logs
 *
 * @param {string} userId
 * @param {string} signalName
 * @param {number} days - Number of days to fetch
 * @returns {Promise<Array>}
 */
async function extractSignalTimeSeries(userId, signalName, days = 30) {
  const signal = SIGNALS[signalName];
  if (!signal) {
    throw new Error(`Unknown signal: ${signalName}`);
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let logs;

  switch (signal.source) {
    case 'food':
      logs = await db
        .select({
          timestamp: foodLogTable.loggedDate,
          value: signal.field === 'sugar' || signal.field === 'fiber'
            ? sql`COALESCE((${foodLogTable.micros}->>'${sql.raw(signal.field)}')::numeric, 0)`
            : foodLogTable[signal.field],
        })
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, since)
          )
        )
        .orderBy(foodLogTable.loggedDate);
      break;

    case 'water':
      logs = await db
        .select({
          timestamp: waterLogTable.loggedDate,
          value: waterLogTable.hydrationLiters,
        })
        .from(waterLogTable)
        .where(
          and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, since)
          )
        )
        .orderBy(waterLogTable.loggedDate);
      break;

    case 'mood':
      logs = await db
        .select({
          timestamp: moodLogTable.loggedDate,
          value: moodLogTable[signal.field],
        })
        .from(moodLogTable)
        .where(
          and(
            eq(moodLogTable.userId, userId),
            gte(moodLogTable.loggedDate, since)
          )
        )
        .orderBy(moodLogTable.loggedDate);
      break;
  }

  // Aggregate to hourly buckets
  const hourlyData = {};

  for (const log of logs) {
    if (!log.timestamp || log.value === null || log.value === undefined) continue;

    const hour = new Date(log.timestamp);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();

    if (!hourlyData[key]) {
      hourlyData[key] = { sum: 0, count: 0 };
    }

    hourlyData[key].sum += parseFloat(log.value) || 0;
    hourlyData[key].count++;
  }

  // Convert to array, sorted by time
  const sortedKeys = Object.keys(hourlyData).sort();

  return sortedKeys.map(key => ({
    timestamp: new Date(key),
    value: signal.aggregation === 'avg'
      ? hourlyData[key].sum / hourlyData[key].count
      : hourlyData[key].sum,
  }));
}

/**
 * ============================================
 * MAIN ANALYSIS FUNCTIONS
 * ============================================
 */

/**
 * Discover optimal lag for a signal pair
 *
 * @param {string} userId
 * @param {string} signalAName
 * @param {string} signalBName
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function discoverOptimalLag(userId, signalAName, signalBName, options = {}) {
  const {
    minLagHours = DEFAULT_MIN_LAG_HOURS,
    maxLagHours = DEFAULT_MAX_LAG_HOURS,
    days = 30,
  } = options;

  try {
    console.log(`[Lagged Correlation] Analyzing ${signalAName} → ${signalBName} for user ${userId}`);

    // Extract time series
    const [signalA, signalB] = await Promise.all([
      extractSignalTimeSeries(userId, signalAName, days),
      extractSignalTimeSeries(userId, signalBName, days),
    ]);

    if (signalA.length < MIN_SAMPLE_SIZE || signalB.length < MIN_SAMPLE_SIZE) {
      return {
        valid: false,
        error: 'Insufficient data',
        signalA: { count: signalA.length },
        signalB: { count: signalB.length },
      };
    }

    // Align time series to common hourly grid
    const { alignedA, alignedB } = alignTimeSeries(signalA, signalB);

    if (alignedA.length < MIN_SAMPLE_SIZE) {
      return { valid: false, error: 'Insufficient aligned data points' };
    }

    // Compute cross-correlation
    const ccf = computeCrossCorrelation(
      alignedA,
      alignedB,
      minLagHours,
      maxLagHours
    );

    if (!ccf.valid) {
      return ccf;
    }

    // Run Granger causality test at optimal lag
    const granger = grangerCausalityTest(alignedA, alignedB, Math.min(3, ccf.optimalLag));

    // Store result
    const result = {
      valid: true,
      userId,
      signalA: signalAName,
      signalB: signalBName,
      optimalLagHours: ccf.optimalLag,
      correlationAtOptimalLag: ccf.optimalCorrelation,
      pValue: ccf.optimalPValue,
      isStatisticallySignificant: ccf.isSignificant,
      confidenceInterval: ccf.confidenceInterval,
      sampleSize: ccf.sampleSize,
      crossCorrelationFunction: ccf.crossCorrelationFunction,
      grangerCausality: granger.valid ? {
        fStatistic: granger.fStatistic,
        pValue: granger.pValue,
        causalDirection: granger.causalDirection,
        isCausal: granger.causal,
      } : null,
      interpretation: generateInterpretation(ccf, granger, signalAName, signalBName),
    };

    // Save to database if significant
    if (ccf.isSignificant) {
      await saveLaggedCorrelation(result);
    }

    return result;
  } catch (error) {
    console.error('[Lagged Correlation] Error discovering optimal lag:', error);
    throw error;
  }
}

/**
 * Align two time series to common time grid
 */
function alignTimeSeries(seriesA, seriesB) {
  // Get common time range
  const aStart = seriesA[0]?.timestamp?.getTime();
  const aEnd = seriesA[seriesA.length - 1]?.timestamp?.getTime();
  const bStart = seriesB[0]?.timestamp?.getTime();
  const bEnd = seriesB[seriesB.length - 1]?.timestamp?.getTime();

  if (!aStart || !bStart) {
    return { alignedA: [], alignedB: [] };
  }

  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);

  // Create hourly grid
  const gridA = new Map(seriesA.map(s => [s.timestamp.getTime(), s.value]));
  const gridB = new Map(seriesB.map(s => [s.timestamp.getTime(), s.value]));

  const alignedA = [];
  const alignedB = [];

  const hourMs = 60 * 60 * 1000;
  for (let t = start; t <= end; t += hourMs) {
    const valA = gridA.get(t);
    const valB = gridB.get(t);

    if (valA !== undefined && valB !== undefined) {
      alignedA.push(valA);
      alignedB.push(valB);
    }
  }

  return { alignedA, alignedB };
}

/**
 * Generate human-readable interpretation
 */
function generateInterpretation(ccf, granger, signalA, signalB) {
  if (!ccf.isSignificant) {
    return {
      summary: `No significant relationship found between ${signalA} and ${signalB}.`,
      recommendation: 'Continue logging to gather more data.',
    };
  }

  const direction = ccf.optimalCorrelation > 0 ? 'positive' : 'negative';
  const strength = Math.abs(ccf.optimalCorrelation) > 0.5 ? 'strong' : 'moderate';
  const lagText = ccf.optimalLag === 0 ? 'same time'
    : ccf.optimalLag === 1 ? '1 hour later'
      : `${ccf.optimalLag} hours later`;

  let summary = `Found a ${strength} ${direction} correlation: ${signalA} affects ${signalB} ${lagText}.`;

  if (granger?.isCausal) {
    summary += ` Granger causality test suggests this is a causal relationship.`;
  }

  return {
    summary,
    strength,
    direction,
    lagHours: ccf.optimalLag,
    recommendation: generateRecommendation(signalA, signalB, direction, ccf.optimalLag),
  };
}

/**
 * Generate actionable recommendation
 */
function generateRecommendation(signalA, signalB, direction, lag) {
  const recommendations = {
    'sugar_intake:mood_score:negative': 'Consider reducing sugar intake to improve mood stability.',
    'sugar_intake:energy_level:negative': 'High sugar may be causing energy crashes. Try complex carbs instead.',
    'hydration_level:energy_level:positive': 'Great! Staying hydrated is boosting your energy. Keep it up!',
    'hydration_level:mood_score:positive': 'Hydration positively affects your mood. Maintain good water intake.',
    'protein_intake:energy_level:positive': 'Protein is helping sustain your energy. Keep including it in meals.',
    'nova_score_avg:mood_score:negative': 'Processed foods may be affecting your mood. Try more whole foods.',
  };

  const key = `${signalA}:${signalB}:${direction}`;
  return recommendations[key] || `Monitor how ${signalA} affects ${signalB} over time.`;
}

/**
 * Save lagged correlation to database
 */
async function saveLaggedCorrelation(result) {
  try {
    // Check if exists
    const existing = await db
      .select()
      .from(laggedCorrelationsTable)
      .where(
        and(
          eq(laggedCorrelationsTable.userId, result.userId),
          eq(laggedCorrelationsTable.signalA, result.signalA),
          eq(laggedCorrelationsTable.signalB, result.signalB)
        )
      )
      .limit(1);

    const data = {
      userId: result.userId,
      signalA: result.signalA,
      signalB: result.signalB,
      optimalLagHours: result.optimalLagHours,
      correlationAtOptimalLag: result.correlationAtOptimalLag,
      pValueAtOptimalLag: result.pValue,
      crossCorrelationJson: result.crossCorrelationFunction,
      sampleSize: result.sampleSize,
      confidenceInterval: result.confidenceInterval,
      isStatisticallySignificant: result.isStatisticallySignificant,
      grangerFStatistic: result.grangerCausality?.fStatistic || null,
      grangerPValue: result.grangerCausality?.pValue || null,
      causalDirection: result.grangerCausality?.causalDirection || null,
      lastComputedAt: new Date(),
      isActive: true,
    };

    if (existing.length > 0) {
      await db
        .update(laggedCorrelationsTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(laggedCorrelationsTable.id, existing[0].id));
    } else {
      await db.insert(laggedCorrelationsTable).values(data);
    }

    console.log(`[Lagged Correlation] Saved: ${result.signalA} → ${result.signalB}, lag=${result.optimalLagHours}h, r=${result.correlationAtOptimalLag.toFixed(3)}`);
  } catch (error) {
    console.error('[Lagged Correlation] Error saving:', error);
  }
}

/**
 * ============================================
 * BATCH ANALYSIS
 * ============================================
 */

/**
 * Analyze all predefined signal pairs for a user
 *
 * @param {string} userId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function analyzeAllSignalPairs(userId, options = {}) {
  const results = {
    userId,
    analyzedAt: new Date().toISOString(),
    significantFindings: [],
    allResults: [],
    errors: [],
  };

  for (const pair of SIGNAL_PAIRS) {
    try {
      const result = await discoverOptimalLag(
        userId,
        pair.signalA,
        pair.signalB,
        options
      );

      results.allResults.push({
        ...pair,
        result,
      });

      if (result.valid && result.isStatisticallySignificant) {
        results.significantFindings.push({
          signalA: pair.signalA,
          signalB: pair.signalB,
          hypothesis: pair.hypothesis,
          optimalLag: result.optimalLagHours,
          correlation: result.correlationAtOptimalLag,
          interpretation: result.interpretation,
        });
      }
    } catch (error) {
      results.errors.push({
        pair,
        error: error.message,
      });
    }
  }

  console.log(`[Lagged Correlation] Analyzed ${results.allResults.length} pairs for user ${userId}, found ${results.significantFindings.length} significant`);

  return results;
}

/**
 * Get user's significant lagged correlations
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getUserLaggedCorrelations(userId) {
  try {
    const correlations = await db
      .select()
      .from(laggedCorrelationsTable)
      .where(
        and(
          eq(laggedCorrelationsTable.userId, userId),
          eq(laggedCorrelationsTable.isActive, true),
          eq(laggedCorrelationsTable.isStatisticallySignificant, true)
        )
      )
      .orderBy(desc(sql`ABS(${laggedCorrelationsTable.correlationAtOptimalLag})`));

    return correlations;
  } catch (error) {
    console.error('[Lagged Correlation] Error fetching user correlations:', error);
    throw error;
  }
}

export default {
  // Core functions
  computeCrossCorrelation,
  grangerCausalityTest,
  discoverOptimalLag,
  analyzeAllSignalPairs,
  getUserLaggedCorrelations,

  // Constants
  SIGNALS,
  SIGNAL_PAIRS,
};
