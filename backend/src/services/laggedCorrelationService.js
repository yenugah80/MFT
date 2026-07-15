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
} from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import jStat from 'jstat';
import { ensureLaggedCorrelationsTableShape } from '../utils/schemaGuards.js';

/**
 * ============================================
 * CONFIGURATION
 * ============================================
 */

// Lag search parameters — default window is 7 days because dietary effects
// (sugar → mood, fiber → energy) can take 1–4 days to manifest.
const DEFAULT_MIN_LAG_HOURS = 0;
const DEFAULT_MAX_LAG_HOURS = 7 * 24; // 168 h

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
  { signalA: 'sugar_intake',    signalB: 'mood_score',    hypothesis: 'Sugar affects mood' },
  { signalA: 'sugar_intake',    signalB: 'energy_level',  hypothesis: 'Sugar affects energy' },
  { signalA: 'hydration_level', signalB: 'energy_level',  hypothesis: 'Hydration affects energy' },
  { signalA: 'hydration_level', signalB: 'mood_score',    hypothesis: 'Hydration affects mood' },
  { signalA: 'protein_intake',  signalB: 'energy_level',  hypothesis: 'Protein affects energy' },
  { signalA: 'nova_score_avg',  signalB: 'mood_score',    hypothesis: 'Processed foods affect mood' },
  { signalA: 'fiber_intake',    signalB: 'energy_level',  hypothesis: 'Fiber affects energy' },
  { signalA: 'calorie_intake',  signalB: 'mood_score',    hypothesis: 'Calories affect mood' },
  { signalA: 'stress_level',    signalB: 'mood_score',    hypothesis: 'Stress affects mood' },
  { signalA: 'stress_level',    signalB: 'energy_level',  hypothesis: 'Stress affects energy' },
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

// jStat provides exact CDF implementations for both distributions,
// replacing the hand-rolled series approximations that lost precision at df < 30.
function tDistributionCDF(t, df) {
  return jStat.studentt.cdf(t, df);
}

function fDistributionCDF(f, d1, d2) {
  return jStat.centralF.cdf(f, d1, d2);
}

/**
 * Benjamini-Hochberg FDR correction for multiple comparisons.
 * Given m p-values, returns a boolean array where true = reject null at FDR level alpha.
 *
 * Procedure:
 *   1. Sort p-values ascending: p_(1) ≤ p_(2) ≤ ... ≤ p_(m)
 *   2. Find the largest k such that p_(k) ≤ (k/m) * alpha
 *   3. Reject all hypotheses 1..k
 *
 * @param {number[]} pValues
 * @param {number} alpha  - FDR level (e.g. 0.05)
 * @returns {boolean[]}   - parallel to pValues; true = significant after correction
 */
function benjaminiHochberg(pValues, alpha = 0.05) { // cspell:ignore benjamini hochberg
  const m = pValues.length;
  if (m === 0) return [];
  const indexed = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  let lastRejected = -1;
  for (let k = 0; k < m; k++) {
    if (indexed[k].p <= ((k + 1) / m) * alpha) lastRejected = k;
  }
  const rejected = new Array(m).fill(false);
  for (let k = 0; k <= lastRejected; k++) rejected[indexed[k].i] = true;
  return rejected;
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

  // Calculate confidence interval using Fisher z-transformation.
  // Clamp to (-0.9999, 0.9999) to avoid atanh(±1) = ±Infinity.
  const rClamped = Math.max(-0.9999, Math.min(0.9999, maxCorrelation));
  const ciWidth = 1.96 / Math.sqrt(optimalResult.n - 3);

  return {
    valid: true,
    optimalLag,
    optimalCorrelation: maxCorrelation,
    optimalPValue: optimalResult.pValue,
    isSignificant: optimalResult.significant,
    confidenceInterval: {
      lower: Math.tanh(Math.atanh(rClamped) - ciWidth),
      upper: Math.tanh(Math.atanh(rClamped) + ciWidth),
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
  const dfUnrestricted = n - maxLag - 2 * maxLag - 1;
  const dfNumerator = maxLag;

  if (!isFinite(rssRestricted) || !isFinite(rssUnrestricted) || rssUnrestricted <= 0 || dfUnrestricted <= 0) {
    return { valid: false, error: 'Invalid regression results' };
  }

  // Clamp to 0: negative F (restricted fits better) means no causality, not invalid math.
  const fStatistic = Math.max(0, ((rssRestricted - rssUnrestricted) / dfNumerator) /
    (rssUnrestricted / dfUnrestricted));

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
 * Multivariate OLS via normal equations (X'X β = X'y) solved with
 * Gaussian elimination with partial pivoting. Works correctly for the
 * small matrices produced by Granger tests (p ≤ 7, n ≥ 17).
 */
function simpleLinearRegression(X, y) {
  const n = y.length;
  const p = X[0]?.length || 0;
  if (n === 0 || p === 0) return { rss: Infinity };

  // Augment X with an intercept column
  const q = p + 1;
  const Xm = X.map(row => [1, ...row]);

  // Build X'X (q×q) and X'y (q×1)
  const XtX = Array.from({ length: q }, () => new Array(q).fill(0));
  const Xty = new Array(q).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < q; j++) {
      Xty[j] += Xm[i][j] * y[i];
      for (let k = j; k < q; k++) {
        XtX[j][k] += Xm[i][j] * Xm[i][k];
        XtX[k][j] = XtX[j][k];
      }
    }
  }

  const beta = gaussianElimination(XtX, Xty);
  if (!beta) return { rss: Infinity }; // singular — degenerate design matrix

  let rss = 0;
  const predictions = [];
  for (let i = 0; i < n; i++) {
    let yhat = 0;
    for (let j = 0; j < q; j++) yhat += Xm[i][j] * beta[j];
    predictions.push(yhat);
    rss += (y[i] - yhat) ** 2;
  }
  return { rss, predictions, beta };
}

/**
 * Solve Ax = b via Gaussian elimination with partial pivoting.
 * Returns the solution vector, or null if A is singular.
 */
function gaussianElimination(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) return null;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const f = M[row][col] / M[col][col];
      for (let k = col; k <= n; k++) M[row][k] -= f * M[col][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
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

    case 'mood': {
      // field may be a dotted JSON path like 'tags.stress' for values nested
      // inside a JSON column.  The tags column stores categorical strings
      // ('Low', 'Moderate', 'High', 'Extreme'), not numbers — map them via CASE.
      const isJsonPath = signal.field.includes('.');
      const [jsonCol, jsonKey] = isJsonPath ? signal.field.split('.') : [];
      const valueExpr = isJsonPath
        ? sql`CASE ${moodLogTable[jsonCol]}->>${jsonKey}
               WHEN 'Low'      THEN 2
               WHEN 'Moderate' THEN 5
               WHEN 'High'     THEN 8
               WHEN 'Extreme'  THEN 10
               ELSE NULL
             END`
        : moodLogTable[signal.field];

      logs = await db
        .select({
          timestamp: moodLogTable.loggedDate,
          value: valueExpr,
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

    default:
      throw new Error(`Unknown signal source: ${signal.source}`);
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
    skipPersist = false, // set true when called from analyzeAllSignalPairs (BH applied afterward)
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

    // Align to daily buckets — see alignTimeSeries for rationale.
    // Each element in alignedA/B now represents one calendar day.
    const { alignedA: rawA, alignedB: rawB, granularityDays } = alignTimeSeries(signalA, signalB);

    if (rawA.length < MIN_SAMPLE_SIZE) {
      return { valid: false, error: 'Insufficient aligned data points' };
    }

    // First-difference to remove slow trends (e.g. gradually improving mood over
    // 30 days).  Without this, two concurrently trending signals produce a spurious
    // positive correlation even when there is no causal link.
    // First-differencing reduces length by 1; MIN_SAMPLE_SIZE still applies.
    const alignedA = firstDifference(rawA);
    const alignedB = firstDifference(rawB);

    if (alignedA.length < MIN_SAMPLE_SIZE) {
      return { valid: false, error: 'Insufficient data after first-differencing' };
    }

    // Convert the caller's hour-based lag window to days.
    // Default is 168 h (7 days) — set by DEFAULT_MAX_LAG_HOURS.
    // Callers that pass a custom maxLagHours get exactly what they asked for.
    const maxLagDays = Math.ceil(maxLagHours / 24);
    const minLagDays = Math.floor(minLagHours / 24);

    // Compute cross-correlation — lag units are now days
    const ccf = computeCrossCorrelation(
      alignedA,
      alignedB,
      minLagDays,
      maxLagDays
    );

    if (!ccf.valid) {
      return ccf;
    }

    // Run Granger causality test at optimal lag.
    // maxLag must be ≥ 1; at lag=0 the inner AR loop never fires and the design
    // matrix collapses to an empty matrix, producing NaN for the F-statistic.
    const grangerLagDays = Math.max(1, Math.min(3, ccf.optimalLag));
    const granger = grangerCausalityTest(alignedA, alignedB, grangerLagDays);

    // Convert the optimal lag from days back to hours for storage/API compatibility
    const optimalLagHours = ccf.optimalLag * (granularityDays ? 24 : 1);

    // Store result
    const result = {
      valid: true,
      userId,
      signalA: signalAName,
      signalB: signalBName,
      optimalLagHours,
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

    // Save only when called standalone. analyzeAllSignalPairs passes skipPersist: true
    // and saves after BH-FDR correction — otherwise false positives get persisted
    // before the multi-comparison adjustment has a chance to downgrade them.
    if (ccf.isSignificant && !skipPersist) {
      await saveLaggedCorrelation(result);
    }

    return result;
  } catch (error) {
    console.error('[Lagged Correlation] Error discovering optimal lag:', error);
    throw error;
  }
}

/**
 * First-difference a series to remove slow linear trends.
 * Transforms [a, b, c, d] → [b-a, c-b, d-c].
 * Reduces length by 1 — caller must re-check MIN_SAMPLE_SIZE.
 */
function firstDifference(series) {
  if (series.length < 2) return [];
  return series.slice(1).map((val, i) => val - series[i]);
}

/**
 * Align two time series to a common daily-bucket grid.
 *
 * Hourly exact-matching discards nearly all real-world health data because food
 * logs and mood logs almost never land in the same clock-hour.  Daily aggregation
 * retains all data and matches the timescale at which dietary effects actually
 * manifest (hours-to-days, not minutes).
 *
 * Returns arrays of daily averaged values for days present in BOTH signals.
 * The "lag" unit from computeCrossCorrelation is therefore in DAYS — callers
 * that store optimalLagHours must multiply by 24.
 */
function alignTimeSeries(seriesA, seriesB) {
  const toDay = (ts) => {
    const d = new Date(ts);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };

  const aggregate = (series) => {
    const map = new Map();
    for (const s of series) {
      if (!s.timestamp) continue;
      const day = toDay(s.timestamp);
      const b = map.get(day);
      if (!b) map.set(day, { sum: s.value, count: 1 });
      else { b.sum += s.value; b.count++; }
    }
    return map;
  };

  const bucketA = aggregate(seriesA);
  const bucketB = aggregate(seriesB);

  const commonDays = [...bucketA.keys()]
    .filter(d => bucketB.has(d))
    .sort((a, b) => a - b);

  return {
    alignedA: commonDays.map(d => bucketA.get(d).sum / bucketA.get(d).count),
    alignedB: commonDays.map(d => bucketB.get(d).sum / bucketB.get(d).count),
    granularityDays: true,
  };
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
  // optimalLag is in DAYS after the daily-bucket alignment change
  const lagText = ccf.optimalLag === 0 ? 'the same day'
    : ccf.optimalLag === 1 ? '1 day later'
      : `${ccf.optimalLag} days later`;

  let summary = `Found a ${strength} ${direction} correlation: ${signalA} affects ${signalB} ${lagText}.`;

  if (granger?.causal) {
    summary += ` Granger causality test suggests this is a causal relationship.`;
  }

  return {
    summary,
    strength,
    direction,
    lagDays: ccf.optimalLag,
    recommendation: generateRecommendation(signalA, signalB, direction),
  };
}

/**
 * Generate actionable recommendation
 */
function generateRecommendation(signalA, signalB, direction) {
  const recommendations = {
    'sugar_intake:mood_score:negative':       'Consider reducing sugar intake to improve mood stability.',
    'sugar_intake:energy_level:negative':     'High sugar may be causing energy crashes. Try complex carbs instead.',
    'hydration_level:energy_level:positive':  'Great! Staying hydrated is boosting your energy. Keep it up!',
    'hydration_level:mood_score:positive':    'Hydration positively affects your mood. Maintain good water intake.',
    'protein_intake:energy_level:positive':   'Protein is helping sustain your energy. Keep including it in meals.',
    'nova_score_avg:mood_score:negative':     'Processed foods may be affecting your mood. Try more whole foods.',
    'stress_level:mood_score:positive':       'High stress days align with lower mood scores. Try stress-reduction techniques like short walks or deep breathing.',
    'stress_level:mood_score:negative':       'Interestingly, stress correlates with higher intensity mood — channel that energy productively.',
    'stress_level:energy_level:negative':     'Stress is draining your energy. Prioritize recovery: sleep, light exercise, and hydration.',
    'stress_level:energy_level:positive':     'Your energy and stress track together — structured activity may be helping you convert stress into focus.',
  };

  const key = `${signalA}:${signalB}:${direction}`;
  return recommendations[key] || `Monitor how ${signalA} affects ${signalB} over time.`;
}

/**
 * Save lagged correlation to database
 */
async function saveLaggedCorrelation(result) {
  try {
    await ensureLaggedCorrelationsTableShape();
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
      grangerFStatistic: result.grangerCausality?.fStatistic ?? null,
      grangerPValue: result.grangerCausality?.pValue ?? null,
      causalDirection: result.grangerCausality?.causalDirection ?? null,
      lastComputedAt: new Date(),
      isActive: true,
    };

    // Atomic upsert — the schema has a unique index on (userId, signalA, signalB).
    // The old SELECT + conditional INSERT/UPDATE was a non-atomic read-modify-write
    // that could race on server restart or concurrent background jobs.
    await db.insert(laggedCorrelationsTable)
      .values(data)
      .onConflictDoUpdate({
        target: [laggedCorrelationsTable.userId, laggedCorrelationsTable.signalA, laggedCorrelationsTable.signalB],
        set: { ...data, updatedAt: new Date() },
      });

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

  // Run all pairs in parallel — each pair is independent and DB-read-heavy,
  // so Promise.all gives ~10x wall-clock improvement over sequential for-of.
  const settled = await Promise.allSettled(
    SIGNAL_PAIRS.map(pair =>
      discoverOptimalLag(userId, pair.signalA, pair.signalB, { ...options, skipPersist: true })
        .then(result => ({ ...pair, result }))
    )
  );

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    if (outcome.status === 'fulfilled') {
      results.allResults.push(outcome.value);
    } else {
      results.errors.push({ pair: SIGNAL_PAIRS[i], error: outcome.reason?.message });
    }
  }

  // Apply Benjamini-Hochberg FDR correction across all signal pairs.
  // Testing 10 pairs inflates false-positive risk; BH limits expected false
  // discoveries to SIGNIFICANCE_LEVEL * m fraction of rejections.
  const validWithPValue = results.allResults
    .filter(r => r.result.valid && typeof r.result.pValue === 'number');

  if (validWithPValue.length > 0) {
    const pValues = validWithPValue.map(r => r.result.pValue);
    const bhRejected = benjaminiHochberg(pValues, SIGNIFICANCE_LEVEL);

    validWithPValue.forEach((r, i) => {
      r.result.isStatisticallySignificant = bhRejected[i]
        && Math.abs(r.result.correlationAtOptimalLag) >= MIN_CORRELATION_FOR_SIGNIFICANCE;
    });
  }

  // Build significant findings and persist — only after BH correction.
  // Persisting before BH would write false positives to DB that never get cleaned up.
  for (const r of results.allResults) {
    if (r.result.valid && r.result.isStatisticallySignificant) {
      results.significantFindings.push({
        signalA: r.signalA,
        signalB: r.signalB,
        hypothesis: r.hypothesis,
        optimalLag: r.result.optimalLagHours,
        correlation: r.result.correlationAtOptimalLag,
        interpretation: r.result.interpretation,
      });
      await saveLaggedCorrelation(r.result);
    }
  }

  console.log(`[Lagged Correlation] Analyzed ${results.allResults.length} pairs for user ${userId}, found ${results.significantFindings.length} significant (BH-FDR corrected)`);

  return results;
}

// Per-user throttle: at most one background analysis per 24 hours.
// Prevents re-analyzing on every log when data hasn't meaningfully changed.
const _lastAnalysisAt = new Map();
const _ANALYSIS_THROTTLE_MS = 24 * 60 * 60 * 1000;

/**
 * Fire-and-forget background correlation analysis for a user.
 * Throttled to once per 24 hours per user.  Safe to call after every log —
 * the throttle ensures we don't hammer the DB on high-frequency logging.
 *
 * @param {string} userId
 */
export function triggerBackgroundAnalysis(userId) {
  const last = _lastAnalysisAt.get(userId);
  if (last && Date.now() - last < _ANALYSIS_THROTTLE_MS) return;

  _lastAnalysisAt.set(userId, Date.now());
  analyzeAllSignalPairs(userId).catch(err => {
    console.error(`[Lagged Correlation] Background analysis failed for ${userId}:`, err.message);
    _lastAnalysisAt.delete(userId); // allow retry on next log after a failure
  });
}

/**
 * Get user's significant lagged correlations
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getUserLaggedCorrelations(userId) {
  try {
    await ensureLaggedCorrelationsTableShape();
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
  triggerBackgroundAnalysis,

  // Constants
  SIGNALS,
  SIGNAL_PAIRS,
};
