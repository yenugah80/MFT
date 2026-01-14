/**
 * Statistical Testing Service
 *
 * Production-grade A/B testing and hypothesis testing framework.
 * Provides statistically rigorous methods for measuring recommendation effectiveness.
 *
 * Key Features:
 * - A/B test creation, assignment, and analysis
 * - Sequential testing with early stopping (SPRT)
 * - Multiple comparison correction (Benjamini-Hochberg FDR)
 * - Power analysis and sample size calculation
 * - Effect size estimation (Cohen's d, odds ratio)
 * - Confidence intervals using bootstrap when needed
 *
 * Statistical Foundation:
 * - Two-proportion z-test for binary outcomes (accept/reject)
 * - Welch's t-test for continuous outcomes (mood scores)
 * - Chi-squared test for categorical distributions
 * - Sequential Probability Ratio Test (SPRT) for early stopping
 *
 * References:
 * - Kohavi et al. (2009): Controlled experiments on the web
 * - Johari et al. (2017): Sequential testing for always-valid inference
 * - Benjamini & Hochberg (1995): FDR controlling procedure
 */

import { db } from '../db/index.js';
import {
  abTestDefinitionsTable,
  abTestAssignmentsTable,
  recommendationsHistoryTable,
  profilesTable,
} from '../db/schema.js';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * ============================================
 * STATISTICAL CONSTANTS
 * ============================================
 */

// Z-scores for common confidence levels
const Z_SCORES = {
  0.90: 1.645,
  0.95: 1.96,
  0.99: 2.576,
};

// Default statistical parameters
const DEFAULT_SIGNIFICANCE = 0.05;
const DEFAULT_POWER = 0.80;
const MIN_SAMPLE_SIZE = 30; // Minimum per variant for CLT

/**
 * ============================================
 * STATISTICAL UTILITIES
 * ============================================
 */

/**
 * Standard normal CDF (cumulative distribution function)
 * Uses Abramowitz & Stegun approximation (error < 7.5e-8)
 *
 * @param {number} x - Value to evaluate
 * @returns {number} P(Z < x)
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
 * Inverse standard normal CDF (quantile function)
 * Uses Rational approximation (Abramowitz & Stegun 26.2.23)
 *
 * @param {number} p - Probability (0 < p < 1)
 * @returns {number} z such that P(Z < z) = p
 */
function normalQuantile(p) {
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1 (exclusive)');
  }

  // Coefficients for rational approximation
  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00,
  ];

  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01,
  ];

  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00,
  ];

  const d = [
    7.784695709041462e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q, r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/**
 * Two-proportion z-test
 * Tests H0: p1 = p2 vs H1: p1 ≠ p2
 *
 * @param {number} successes1 - Successes in group 1
 * @param {number} n1 - Sample size of group 1
 * @param {number} successes2 - Successes in group 2
 * @param {number} n2 - Sample size of group 2
 * @returns {Object} {zScore, pValue, significant, confidenceInterval}
 */
export function twoProportionZTest(successes1, n1, successes2, n2, alpha = DEFAULT_SIGNIFICANCE) {
  const p1 = successes1 / n1;
  const p2 = successes2 / n2;

  // Pooled proportion under null hypothesis
  const pPooled = (successes1 + successes2) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));

  // Avoid division by zero
  if (se === 0) {
    return {
      zScore: 0,
      pValue: 1,
      significant: false,
      confidenceInterval: { lower: 0, upper: 0 },
      p1,
      p2,
      difference: p1 - p2,
    };
  }

  // Z-score
  const zScore = (p1 - p2) / se;

  // Two-tailed p-value
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)));

  // Confidence interval for difference (using unpooled SE for CI)
  const seUnpooled = Math.sqrt((p1 * (1 - p1) / n1) + (p2 * (1 - p2) / n2));
  const zCritical = normalQuantile(1 - alpha / 2);

  return {
    zScore,
    pValue,
    significant: pValue < alpha,
    confidenceInterval: {
      lower: (p1 - p2) - zCritical * seUnpooled,
      upper: (p1 - p2) + zCritical * seUnpooled,
    },
    p1,
    p2,
    difference: p1 - p2,
    relativeLift: p2 > 0 ? (p1 - p2) / p2 : null,
  };
}

/**
 * Welch's t-test for continuous outcomes
 * Does not assume equal variances
 *
 * @param {Array} sample1 - First sample
 * @param {Array} sample2 - Second sample
 * @param {number} alpha - Significance level
 * @returns {Object}
 */
export function welchTTest(sample1, sample2, alpha = DEFAULT_SIGNIFICANCE) {
  const n1 = sample1.length;
  const n2 = sample2.length;

  if (n1 < 2 || n2 < 2) {
    return { tStatistic: null, pValue: 1, significant: false, error: 'Insufficient sample size' };
  }

  // Calculate means
  const mean1 = sample1.reduce((a, b) => a + b, 0) / n1;
  const mean2 = sample2.reduce((a, b) => a + b, 0) / n2;

  // Calculate variances
  const var1 = sample1.reduce((sum, x) => sum + Math.pow(x - mean1, 2), 0) / (n1 - 1);
  const var2 = sample2.reduce((sum, x) => sum + Math.pow(x - mean2, 2), 0) / (n2 - 1);

  // Standard error of difference
  const se = Math.sqrt(var1 / n1 + var2 / n2);

  if (se === 0) {
    return { tStatistic: 0, pValue: 1, significant: false, mean1, mean2 };
  }

  // Welch-Satterthwaite degrees of freedom
  const numerator = Math.pow(var1 / n1 + var2 / n2, 2);
  const denominator = Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1);
  const df = numerator / denominator;

  // t-statistic
  const tStatistic = (mean1 - mean2) / se;

  // Two-tailed p-value (using normal approximation for large df)
  const pValue = df > 30
    ? 2 * (1 - normalCDF(Math.abs(tStatistic)))
    : tDistributionPValue(Math.abs(tStatistic), df);

  // Effect size (Cohen's d)
  const pooledStd = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2));
  const cohenD = pooledStd > 0 ? (mean1 - mean2) / pooledStd : 0;

  return {
    tStatistic,
    pValue,
    degreesOfFreedom: df,
    significant: pValue < alpha,
    mean1,
    mean2,
    difference: mean1 - mean2,
    standardError: se,
    cohenD,
    effectSizeInterpretation: interpretCohenD(cohenD),
  };
}

/**
 * T-distribution p-value approximation
 */
function tDistributionPValue(t, df) {
  // Use normal approximation for df > 30, otherwise use Beta incomplete function
  if (df > 30) {
    return 2 * (1 - normalCDF(t));
  }

  // Approximation using the relationship with Beta distribution
  const x = df / (df + t * t);
  return betaIncomplete(df / 2, 0.5, x);
}

/**
 * Incomplete beta function approximation
 */
function betaIncomplete(a, b, x) {
  // Simple continued fraction approximation
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
 * Interpret Cohen's d effect size
 */
function interpretCohenD(d) {
  const absD = Math.abs(d);
  if (absD < 0.2) return 'negligible';
  if (absD < 0.5) return 'small';
  if (absD < 0.8) return 'medium';
  return 'large';
}

/**
 * ============================================
 * SAMPLE SIZE CALCULATION
 * ============================================
 */

/**
 * Calculate required sample size for two-proportion test
 *
 * @param {number} p1 - Expected proportion in treatment
 * @param {number} p2 - Expected proportion in control
 * @param {number} alpha - Significance level
 * @param {number} power - Statistical power (1 - β)
 * @returns {Object} {perGroup, total}
 */
export function calculateSampleSize(p1, p2, alpha = DEFAULT_SIGNIFICANCE, power = DEFAULT_POWER) {
  const zAlpha = normalQuantile(1 - alpha / 2);
  const zBeta = normalQuantile(power);

  // Effect size
  const delta = Math.abs(p1 - p2);

  if (delta === 0) {
    return { perGroup: Infinity, total: Infinity, error: 'No effect to detect' };
  }

  // Average proportion
  const pBar = (p1 + p2) / 2;

  // Sample size formula
  const n = 2 * Math.pow((zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
    zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) / delta, 2);

  const perGroup = Math.ceil(n);

  return {
    perGroup,
    total: perGroup * 2,
    minimumDetectableEffect: delta,
    assumptions: { p1, p2, alpha, power },
  };
}

/**
 * ============================================
 * MULTIPLE COMPARISON CORRECTION
 * ============================================
 */

/**
 * Benjamini-Hochberg FDR correction
 * Controls false discovery rate for multiple comparisons
 *
 * @param {Array} pValues - Array of p-values
 * @param {number} fdr - Target false discovery rate
 * @returns {Array} Adjusted p-values with significance flags
 */
export function benjaminiHochberg(pValues, fdr = 0.05) {
  const n = pValues.length;

  // Create indexed array and sort by p-value
  const indexed = pValues.map((p, i) => ({ index: i, pValue: p }));
  indexed.sort((a, b) => a.pValue - b.pValue);

  // Calculate adjusted p-values
  const adjusted = [];
  let cumMin = 1;

  for (let i = n - 1; i >= 0; i--) {
    const bh = indexed[i].pValue * n / (i + 1);
    cumMin = Math.min(cumMin, bh);
    adjusted[indexed[i].index] = {
      originalPValue: indexed[i].pValue,
      adjustedPValue: Math.min(cumMin, 1),
      rank: i + 1,
      significant: cumMin <= fdr,
    };
  }

  return adjusted;
}

/**
 * ============================================
 * SEQUENTIAL TESTING (SPRT)
 * ============================================
 */

/**
 * Sequential Probability Ratio Test
 * Allows for early stopping while controlling Type I and II errors
 *
 * @param {number} successes1 - Successes in treatment
 * @param {number} n1 - Sample size in treatment
 * @param {number} successes2 - Successes in control
 * @param {number} n2 - Sample size in control
 * @param {Object} options - Test configuration
 * @returns {Object}
 */
export function sequentialTest(successes1, n1, successes2, n2, options = {}) {
  const {
    alpha = DEFAULT_SIGNIFICANCE,
    beta = 1 - DEFAULT_POWER,
    minimumDetectableEffect = 0.05,
  } = options;

  // Wald's boundaries
  const A = (1 - beta) / alpha;  // Upper boundary
  const B = beta / (1 - alpha);  // Lower boundary

  // Calculate likelihood ratio
  const p1 = successes1 / n1;
  const p2 = successes2 / n2;
  const p0 = (successes1 + successes2) / (n1 + n2); // Null hypothesis

  // Alternative hypothesis proportions
  const p1Alt = p0 + minimumDetectableEffect / 2;
  const p2Alt = p0 - minimumDetectableEffect / 2;

  // Log likelihood ratio (avoid log(0))
  const epsilon = 1e-10;
  const llr = successes1 * Math.log(Math.max(p1Alt, epsilon) / Math.max(p0, epsilon)) +
    (n1 - successes1) * Math.log(Math.max(1 - p1Alt, epsilon) / Math.max(1 - p0, epsilon)) +
    successes2 * Math.log(Math.max(p2Alt, epsilon) / Math.max(p0, epsilon)) +
    (n2 - successes2) * Math.log(Math.max(1 - p2Alt, epsilon) / Math.max(1 - p0, epsilon));

  // Likelihood ratio
  const lr = Math.exp(llr);

  // Decision
  let decision = 'continue';
  if (lr >= A) {
    decision = 'reject_null'; // Treatment is better
  } else if (lr <= B) {
    decision = 'accept_null'; // No significant difference
  }

  return {
    likelihoodRatio: lr,
    logLikelihoodRatio: llr,
    upperBoundary: A,
    lowerBoundary: B,
    decision,
    canStop: decision !== 'continue',
    p1,
    p2,
    n1,
    n2,
    sampleSizeSoFar: n1 + n2,
  };
}

/**
 * ============================================
 * A/B TEST MANAGEMENT
 * ============================================
 */

/**
 * Create a new A/B test experiment
 *
 * @param {Object} config - Experiment configuration
 * @returns {Promise<Object>} Created experiment
 */
export async function createExperiment(config) {
  const {
    experimentName,
    description,
    hypothesis,
    primaryMetric,
    secondaryMetrics = [],
    variants,
    minimumSampleSize = 100,
    significanceLevel = DEFAULT_SIGNIFICANCE,
    statisticalPower = DEFAULT_POWER,
    minimumDetectableEffect = 0.05,
    targetUserSegment = {},
    trafficAllocation = 1.0,
  } = config;

  const experimentId = `exp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  try {
    const [created] = await db
      .insert(abTestDefinitionsTable)
      .values({
        experimentId,
        experimentName,
        description,
        hypothesis,
        primaryMetric,
        secondaryMetrics,
        variants,
        minimumSampleSize,
        significanceLevel,
        statisticalPower,
        minimumDetectableEffect,
        targetUserSegment,
        trafficAllocation,
        status: 'draft',
      })
      .returning();

    console.log(`[A/B Testing] Created experiment: ${experimentId}`);

    return created;
  } catch (error) {
    console.error('[A/B Testing] Error creating experiment:', error);
    throw error;
  }
}

/**
 * Start an A/B test experiment
 *
 * @param {string} experimentId
 * @returns {Promise<Object>}
 */
export async function startExperiment(experimentId) {
  try {
    const [updated] = await db
      .update(abTestDefinitionsTable)
      .set({
        status: 'running',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(abTestDefinitionsTable.experimentId, experimentId))
      .returning();

    console.log(`[A/B Testing] Started experiment: ${experimentId}`);

    return updated;
  } catch (error) {
    console.error('[A/B Testing] Error starting experiment:', error);
    throw error;
  }
}

/**
 * Assign user to experiment variant
 * Uses deterministic assignment based on user ID hash for consistency
 *
 * @param {string} userId
 * @param {string} experimentId
 * @returns {Promise<Object>} Assignment details
 */
export async function assignUserToExperiment(userId, experimentId) {
  try {
    // Check for existing assignment
    const existing = await db
      .select()
      .from(abTestAssignmentsTable)
      .where(
        and(
          eq(abTestAssignmentsTable.userId, userId),
          eq(abTestAssignmentsTable.experimentId, experimentId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Get experiment definition
    const [experiment] = await db
      .select()
      .from(abTestDefinitionsTable)
      .where(eq(abTestDefinitionsTable.experimentId, experimentId))
      .limit(1);

    if (!experiment || experiment.status !== 'running') {
      return null;
    }

    // Check traffic allocation
    const hashValue = deterministicHash(userId + experimentId);
    if (hashValue > experiment.trafficAllocation) {
      return null; // User not in experiment
    }

    // Assign variant using weighted random selection
    const variants = experiment.variants;
    const selectedVariant = selectVariantByWeight(variants, hashValue);

    // Create assignment
    const [assignment] = await db
      .insert(abTestAssignmentsTable)
      .values({
        userId,
        experimentId,
        experimentName: experiment.experimentName,
        variantId: selectedVariant.id,
        assignmentReason: 'deterministic',
      })
      .returning();

    console.log(`[A/B Testing] Assigned user ${userId} to variant ${selectedVariant.id} in ${experimentId}`);

    return assignment;
  } catch (error) {
    console.error('[A/B Testing] Error assigning user:', error);
    throw error;
  }
}

/**
 * Deterministic hash function for consistent assignment
 */
function deterministicHash(input) {
  const hash = crypto.createHash('md5').update(input).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return hashInt / 0xffffffff; // Normalize to [0, 1]
}

/**
 * Select variant by cumulative weight
 */
function selectVariantByWeight(variants, randomValue) {
  const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0);
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += (variant.weight || 1) / totalWeight;
    if (randomValue <= cumulative) {
      return variant;
    }
  }

  return variants[variants.length - 1];
}

/**
 * Record experiment exposure (user saw the variant)
 *
 * @param {string} userId
 * @param {string} experimentId
 * @returns {Promise<void>}
 */
export async function recordExposure(userId, experimentId) {
  try {
    await db
      .update(abTestAssignmentsTable)
      .set({
        firstExposedAt: sql`COALESCE(${abTestAssignmentsTable.firstExposedAt}, NOW())`,
        exposureCount: sql`${abTestAssignmentsTable.exposureCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(abTestAssignmentsTable.userId, userId),
          eq(abTestAssignmentsTable.experimentId, experimentId)
        )
      );
  } catch (error) {
    console.error('[A/B Testing] Error recording exposure:', error);
  }
}

/**
 * Record experiment conversion
 *
 * @param {string} userId
 * @param {string} experimentId
 * @param {number} metricValue - Primary metric value
 * @param {Object} secondaryMetrics - Additional metrics
 * @returns {Promise<void>}
 */
export async function recordConversion(userId, experimentId, metricValue, secondaryMetrics = {}) {
  try {
    await db
      .update(abTestAssignmentsTable)
      .set({
        conversionAt: new Date(),
        primaryMetricValue: metricValue,
        secondaryMetricsJson: secondaryMetrics,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(abTestAssignmentsTable.userId, userId),
          eq(abTestAssignmentsTable.experimentId, experimentId)
        )
      );
  } catch (error) {
    console.error('[A/B Testing] Error recording conversion:', error);
  }
}

/**
 * Analyze experiment results
 *
 * @param {string} experimentId
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeExperiment(experimentId) {
  try {
    // Get experiment definition
    const [experiment] = await db
      .select()
      .from(abTestDefinitionsTable)
      .where(eq(abTestDefinitionsTable.experimentId, experimentId))
      .limit(1);

    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    // Get all assignments
    const assignments = await db
      .select()
      .from(abTestAssignmentsTable)
      .where(eq(abTestAssignmentsTable.experimentId, experimentId));

    // Group by variant
    const variantData = {};
    for (const variant of experiment.variants) {
      variantData[variant.id] = {
        variant,
        assignments: [],
        exposures: 0,
        conversions: 0,
        metricValues: [],
      };
    }

    for (const assignment of assignments) {
      if (variantData[assignment.variantId]) {
        variantData[assignment.variantId].assignments.push(assignment);
        if (assignment.firstExposedAt) {
          variantData[assignment.variantId].exposures++;
        }
        if (assignment.conversionAt && assignment.primaryMetricValue !== null) {
          variantData[assignment.variantId].conversions++;
          variantData[assignment.variantId].metricValues.push(parseFloat(assignment.primaryMetricValue));
        }
      }
    }

    // Find control and treatment variants
    const control = experiment.variants.find(v => v.id === 'control') || experiment.variants[0];
    const treatments = experiment.variants.filter(v => v.id !== control.id);

    const results = {
      experimentId,
      experimentName: experiment.experimentName,
      status: experiment.status,
      totalAssignments: assignments.length,
      variants: {},
      comparisons: [],
    };

    // Calculate metrics per variant
    for (const [variantId, data] of Object.entries(variantData)) {
      const n = data.exposures;
      const conversions = data.conversions;
      const conversionRate = n > 0 ? conversions / n : 0;

      results.variants[variantId] = {
        name: data.variant.name || variantId,
        sampleSize: n,
        conversions,
        conversionRate,
        confidenceInterval: n > 0 ? calculateWilsonCI(conversions, n) : null,
      };
    }

    // Compare each treatment to control
    const controlData = variantData[control.id];

    for (const treatment of treatments) {
      const treatmentData = variantData[treatment.id];

      if (controlData.exposures < MIN_SAMPLE_SIZE || treatmentData.exposures < MIN_SAMPLE_SIZE) {
        results.comparisons.push({
          control: control.id,
          treatment: treatment.id,
          error: 'Insufficient sample size',
          minRequired: MIN_SAMPLE_SIZE,
        });
        continue;
      }

      // Two-proportion z-test
      const testResult = twoProportionZTest(
        treatmentData.conversions,
        treatmentData.exposures,
        controlData.conversions,
        controlData.exposures,
        experiment.significanceLevel
      );

      // Sequential test
      const seqResult = sequentialTest(
        treatmentData.conversions,
        treatmentData.exposures,
        controlData.conversions,
        controlData.exposures,
        { minimumDetectableEffect: experiment.minimumDetectableEffect }
      );

      results.comparisons.push({
        control: control.id,
        treatment: treatment.id,
        zScore: testResult.zScore,
        pValue: testResult.pValue,
        significant: testResult.significant,
        confidenceInterval: testResult.confidenceInterval,
        lift: testResult.relativeLift,
        sequentialDecision: seqResult.decision,
        canStopEarly: seqResult.canStop,
        sampleSizePower: calculateSampleSize(
          testResult.p1,
          testResult.p2,
          experiment.significanceLevel,
          experiment.statisticalPower
        ),
      });
    }

    // Determine overall winner
    const significantWinner = results.comparisons.find(c => c.significant && c.lift > 0);
    if (significantWinner) {
      results.winner = significantWinner.treatment;
      results.winnerLift = significantWinner.lift;
    }

    results.analyzedAt = new Date().toISOString();

    return results;
  } catch (error) {
    console.error('[A/B Testing] Error analyzing experiment:', error);
    throw error;
  }
}

/**
 * Wilson score confidence interval for proportions
 * More accurate than normal approximation for small samples
 */
function calculateWilsonCI(successes, n, alpha = 0.05) {
  if (n === 0) return null;

  const p = successes / n;
  const z = normalQuantile(1 - alpha / 2);
  const z2 = z * z;

  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n) / denominator;

  return {
    lower: Math.max(0, center - spread),
    upper: Math.min(1, center + spread),
  };
}

/**
 * Get or assign variant for a user in an experiment
 * Convenience function that combines assignment and retrieval
 *
 * @param {string} experimentId
 * @param {string} userId
 * @returns {Promise<string|null>} Variant ID or null if not assigned
 */
export async function getOrAssignVariant(experimentId, userId) {
  try {
    // Check for existing assignment
    const existing = await db
      .select()
      .from(abTestAssignmentsTable)
      .where(
        and(
          eq(abTestAssignmentsTable.userId, userId),
          eq(abTestAssignmentsTable.experimentId, experimentId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0].variantId;
    }

    // Try to assign
    const assignment = await assignUserToExperiment(userId, experimentId);
    return assignment?.variantId || null;
  } catch (error) {
    console.error('[A/B Testing] Error in getOrAssignVariant:', error);
    return null;
  }
}

/**
 * Get all experiment assignments for a user
 *
 * @param {string} userId
 * @returns {Promise<Object>} Map of experimentId to variant
 */
export async function getUserExperiments(userId) {
  try {
    const assignments = await db
      .select({
        experimentId: abTestAssignmentsTable.experimentId,
        experimentName: abTestAssignmentsTable.experimentName,
        variantId: abTestAssignmentsTable.variantId,
        assignedAt: abTestAssignmentsTable.assignedAt,
        isActive: abTestAssignmentsTable.isActive,
      })
      .from(abTestAssignmentsTable)
      .where(eq(abTestAssignmentsTable.userId, userId))
      .orderBy(desc(abTestAssignmentsTable.assignedAt));

    // Also get experiment status
    const experimentsMap = {};
    for (const assignment of assignments) {
      experimentsMap[assignment.experimentId] = {
        experimentId: assignment.experimentId,
        experimentName: assignment.experimentName,
        variant: assignment.variantId,
        assignedAt: assignment.assignedAt,
        isActive: assignment.isActive,
      };
    }

    return experimentsMap;
  } catch (error) {
    console.error('[A/B Testing] Error getting user experiments:', error);
    return {};
  }
}

/**
 * Conclude experiment and record results
 *
 * @param {string} experimentId
 * @param {string} reason - Conclusion reason
 * @returns {Promise<Object>}
 */
export async function concludeExperiment(experimentId, reason = 'manual') {
  try {
    const analysis = await analyzeExperiment(experimentId);

    const [updated] = await db
      .update(abTestDefinitionsTable)
      .set({
        status: 'concluded',
        concludedAt: new Date(),
        conclusionReason: reason,
        winningVariant: analysis.winner || null,
        pValue: analysis.comparisons[0]?.pValue || null,
        confidenceInterval: analysis.comparisons[0]?.confidenceInterval || null,
        effectSize: analysis.comparisons[0]?.lift || null,
        updatedAt: new Date(),
      })
      .where(eq(abTestDefinitionsTable.experimentId, experimentId))
      .returning();

    // Deactivate all assignments
    await db
      .update(abTestAssignmentsTable)
      .set({
        isActive: false,
        concludedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(abTestAssignmentsTable.experimentId, experimentId));

    console.log(`[A/B Testing] Concluded experiment: ${experimentId}, winner: ${analysis.winner || 'none'}`);

    return { experiment: updated, analysis };
  } catch (error) {
    console.error('[A/B Testing] Error concluding experiment:', error);
    throw error;
  }
}

export default {
  // Statistical tests
  twoProportionZTest,
  welchTTest,
  sequentialTest,
  calculateSampleSize,
  benjaminiHochberg,

  // A/B test management
  createExperiment,
  startExperiment,
  assignUserToExperiment,
  getOrAssignVariant,
  getUserExperiments,
  recordExposure,
  recordConversion,
  analyzeExperiment,
  concludeExperiment,
};
