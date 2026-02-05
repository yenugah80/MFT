/**
 * A/B Testing Framework - Staff-Level Production System
 *
 * Features:
 * - Experiment configuration & management
 * - Consistent user bucketing (deterministic hashing)
 * - Metric tracking per variant
 * - Statistical significance calculation (Bayesian & Frequentist)
 * - Feature flag integration
 * - Auto-graduation of winners
 */

import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

// ============================================================================
// EXPERIMENT CONFIGURATION
// ============================================================================

export const ExperimentStatus = {
  DRAFT: 'draft',
  RUNNING: 'running',
  PAUSED: 'paused',
  CONCLUDED: 'concluded',
};

export const MetricTypes = {
  CONVERSION: 'conversion', // Binary (did/didn't)
  CONTINUOUS: 'continuous', // Numeric value
  COUNT: 'count', // Event count
  RATIO: 'ratio', // Proportion
};

export const ConclusionReasons = {
  REACHED_SIGNIFICANCE: 'reached_significance',
  REACHED_SAMPLE_SIZE: 'reached_sample_size',
  REACHED_DURATION: 'reached_duration',
  MANUAL: 'manual',
  AUTO_STOP_HARM: 'auto_stop_harm', // Treatment is significantly worse
};

// ============================================================================
// EXPERIMENT MANAGEMENT
// ============================================================================

/**
 * Create a new experiment
 */
export async function createExperiment(config) {
  const {
    name,
    description,
    hypothesis,
    primaryMetric,
    secondaryMetrics = [],
    variants,
    targetUserSegment = {},
    trafficAllocation = 1.0,
    minimumSampleSize = 100,
    significanceLevel = 0.05,
    minimumDetectableEffect = 0.1,
  } = config;

  // Generate experiment ID
  const experimentId = `exp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // Validate variants
  const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 0.5), 0);
  if (Math.abs(totalWeight - 1.0) > 0.01) {
    throw new Error(`Variant weights must sum to 1.0, got ${totalWeight}`);
  }

  await db.execute(sql`
    INSERT INTO ab_test_definitions (
      experiment_id, experiment_name, description, hypothesis,
      primary_metric, secondary_metrics, variants,
      target_user_segment, traffic_allocation,
      minimum_sample_size, significance_level, minimum_detectable_effect,
      status, created_at
    ) VALUES (
      ${experimentId}, ${name}, ${description}, ${hypothesis},
      ${primaryMetric}, ${JSON.stringify(secondaryMetrics)}, ${JSON.stringify(variants)},
      ${JSON.stringify(targetUserSegment)}, ${trafficAllocation},
      ${minimumSampleSize}, ${significanceLevel}, ${minimumDetectableEffect},
      'draft', NOW()
    )
  `);

  return {
    experimentId,
    status: 'draft',
    message: 'Experiment created. Call startExperiment() to begin.',
  };
}

/**
 * Start an experiment
 */
export async function startExperiment(experimentId) {
  // Verify experiment exists and is in draft
  const experiment = await getExperiment(experimentId);
  if (!experiment) {
    throw new Error(`Experiment ${experimentId} not found`);
  }
  if (experiment.status !== ExperimentStatus.DRAFT) {
    throw new Error(`Experiment is ${experiment.status}, can only start from draft`);
  }

  await db.execute(sql`
    UPDATE ab_test_definitions
    SET status = 'running', started_at = NOW(), updated_at = NOW()
    WHERE experiment_id = ${experimentId}
  `);

  return { experimentId, status: 'running', startedAt: new Date().toISOString() };
}

/**
 * Pause an experiment
 */
export async function pauseExperiment(experimentId) {
  await db.execute(sql`
    UPDATE ab_test_definitions
    SET status = 'paused', paused_at = NOW(), updated_at = NOW()
    WHERE experiment_id = ${experimentId}
  `);

  return { experimentId, status: 'paused' };
}

/**
 * Conclude an experiment
 */
export async function concludeExperiment(experimentId, winningVariant, reason) {
  await db.execute(sql`
    UPDATE ab_test_definitions
    SET
      status = 'concluded',
      concluded_at = NOW(),
      winning_variant = ${winningVariant},
      conclusion_reason = ${reason},
      updated_at = NOW()
    WHERE experiment_id = ${experimentId}
  `);

  // Mark all user assignments as inactive
  await db.execute(sql`
    UPDATE ab_test_assignments
    SET is_active = false, concluded_at = NOW()
    WHERE experiment_id = ${experimentId}
  `);

  return { experimentId, status: 'concluded', winningVariant, reason };
}

/**
 * Get experiment details
 */
export async function getExperiment(experimentId) {
  const result = await db.execute(sql`
    SELECT * FROM ab_test_definitions WHERE experiment_id = ${experimentId}
  `);

  return result.rows[0] || null;
}

// ============================================================================
// USER ASSIGNMENT (BUCKETING)
// ============================================================================

/**
 * Assign user to experiment variant (deterministic)
 */
export async function assignUserToExperiment(userId, experimentId) {
  // Check for existing assignment
  const existing = await db.execute(sql`
    SELECT variant_id FROM ab_test_assignments
    WHERE user_id = ${userId} AND experiment_id = ${experimentId}
  `);

  if (existing.rows.length > 0) {
    return {
      variantId: existing.rows[0].variant_id,
      isNew: false,
    };
  }

  // Get experiment config
  const experiment = await getExperiment(experimentId);
  if (!experiment || experiment.status !== ExperimentStatus.RUNNING) {
    return { variantId: null, excluded: true, reason: 'experiment_not_running' };
  }

  // Check if user matches target segment
  const isEligible = await checkUserEligibility(userId, experiment.target_user_segment);
  if (!isEligible.eligible) {
    return { variantId: null, excluded: true, reason: isEligible.reason };
  }

  // Check traffic allocation
  const trafficHash = deterministicHash(`${userId}:${experimentId}:traffic`);
  if (trafficHash > experiment.traffic_allocation) {
    return { variantId: null, excluded: true, reason: 'traffic_holdout' };
  }

  // Deterministic variant assignment
  const variantHash = deterministicHash(`${userId}:${experimentId}:variant`);
  const variants = experiment.variants;

  let cumulativeWeight = 0;
  let assignedVariant = variants[0].id;

  for (const variant of variants) {
    cumulativeWeight += variant.weight;
    if (variantHash < cumulativeWeight) {
      assignedVariant = variant.id;
      break;
    }
  }

  // Store assignment
  await db.execute(sql`
    INSERT INTO ab_test_assignments (
      user_id, experiment_id, experiment_name, variant_id,
      assigned_at, assignment_reason, is_active
    ) VALUES (
      ${userId}, ${experimentId}, ${experiment.experiment_name}, ${assignedVariant},
      NOW(), 'random', true
    )
    ON CONFLICT (user_id, experiment_id) DO NOTHING
  `);

  return {
    variantId: assignedVariant,
    isNew: true,
    experimentName: experiment.experiment_name,
  };
}

/**
 * Get user's variant for an experiment
 */
export async function getUserVariant(userId, experimentId) {
  const result = await db.execute(sql`
    SELECT variant_id, is_active, first_exposed_at
    FROM ab_test_assignments
    WHERE user_id = ${userId} AND experiment_id = ${experimentId}
  `);

  if (result.rows.length === 0) {
    // Auto-assign
    return assignUserToExperiment(userId, experimentId);
  }

  return {
    variantId: result.rows[0].variant_id,
    isActive: result.rows[0].is_active,
    firstExposedAt: result.rows[0].first_exposed_at,
  };
}

/**
 * Record user exposure to experiment
 */
export async function recordExposure(userId, experimentId) {
  await db.execute(sql`
    UPDATE ab_test_assignments
    SET
      first_exposed_at = COALESCE(first_exposed_at, NOW()),
      exposure_count = exposure_count + 1
    WHERE user_id = ${userId} AND experiment_id = ${experimentId}
  `);
}

// ============================================================================
// METRIC TRACKING
// ============================================================================

/**
 * Record metric event for user
 */
export async function recordMetricEvent(userId, experimentId, metricName, metricValue = 1) {
  // Get user's variant
  const assignment = await getUserVariant(userId, experimentId);
  if (!assignment.variantId) return { recorded: false, reason: 'not_assigned' };

  // Get experiment
  const experiment = await getExperiment(experimentId);
  if (!experiment) return { recorded: false, reason: 'experiment_not_found' };

  // Check if this is the primary or secondary metric
  const isPrimary = experiment.primary_metric === metricName;
  const isSecondary = experiment.secondary_metrics?.includes(metricName);

  if (!isPrimary && !isSecondary) {
    return { recorded: false, reason: 'unknown_metric' };
  }

  // Record the event
  await db.execute(sql`
    INSERT INTO ab_test_metrics (
      experiment_id, user_id, variant_id, metric_name,
      metric_value, is_primary, recorded_at
    ) VALUES (
      ${experimentId}, ${userId}, ${assignment.variantId}, ${metricName},
      ${metricValue}, ${isPrimary}, NOW()
    )
  `);

  // Update user assignment with conversion if primary
  if (isPrimary) {
    await db.execute(sql`
      UPDATE ab_test_assignments
      SET
        conversion_at = COALESCE(conversion_at, NOW()),
        primary_metric_value = ${metricValue}
      WHERE user_id = ${userId} AND experiment_id = ${experimentId}
    `);
  }

  // Check if experiment should auto-conclude
  await checkAutoConclusion(experimentId);

  return { recorded: true, variant: assignment.variantId, isPrimary };
}

// ============================================================================
// STATISTICAL ANALYSIS
// ============================================================================

/**
 * Calculate experiment results with statistical analysis
 */
export async function calculateExperimentResults(experimentId) {
  const experiment = await getExperiment(experimentId);
  if (!experiment) {
    throw new Error(`Experiment ${experimentId} not found`);
  }

  // Get variant stats
  const variantStats = await db.execute(sql`
    SELECT
      a.variant_id,
      COUNT(DISTINCT a.user_id) as total_users,
      COUNT(DISTINCT CASE WHEN a.conversion_at IS NOT NULL THEN a.user_id END) as converted_users,
      COUNT(DISTINCT CASE WHEN a.first_exposed_at IS NOT NULL THEN a.user_id END) as exposed_users,
      AVG(a.primary_metric_value) as avg_metric_value,
      STDDEV(a.primary_metric_value) as stddev_metric_value
    FROM ab_test_assignments a
    WHERE a.experiment_id = ${experimentId}
    GROUP BY a.variant_id
  `);

  if (variantStats.rows.length < 2) {
    return { error: 'insufficient_variants', variantCount: variantStats.rows.length };
  }

  // Find control and treatment(s)
  const variants = experiment.variants;
  const controlId = variants.find(v => v.id === 'control')?.id || variants[0].id;

  const controlStats = variantStats.rows.find(v => v.variant_id === controlId);
  const treatmentStats = variantStats.rows.filter(v => v.variant_id !== controlId);

  if (!controlStats) {
    return { error: 'no_control_data' };
  }

  // Calculate metrics for each treatment vs control
  const results = {
    experimentId,
    status: experiment.status,
    startedAt: experiment.started_at,
    control: {
      variantId: controlId,
      users: parseInt(controlStats.total_users),
      exposed: parseInt(controlStats.exposed_users),
      converted: parseInt(controlStats.converted_users),
      conversionRate: controlStats.exposed_users > 0
        ? controlStats.converted_users / controlStats.exposed_users
        : 0,
      avgMetricValue: parseFloat(controlStats.avg_metric_value) || 0,
    },
    treatments: [],
    recommendation: null,
    isSignificant: false,
  };

  for (const treatment of treatmentStats) {
    const treatmentResult = {
      variantId: treatment.variant_id,
      users: parseInt(treatment.total_users),
      exposed: parseInt(treatment.exposed_users),
      converted: parseInt(treatment.converted_users),
      conversionRate: treatment.exposed_users > 0
        ? treatment.converted_users / treatment.exposed_users
        : 0,
      avgMetricValue: parseFloat(treatment.avg_metric_value) || 0,
    };

    // Calculate relative lift
    treatmentResult.relativeLift = results.control.conversionRate > 0
      ? (treatmentResult.conversionRate - results.control.conversionRate) / results.control.conversionRate
      : 0;

    // Calculate statistical significance (frequentist approach)
    const significance = calculateSignificance(
      results.control.converted,
      results.control.exposed,
      treatmentResult.converted,
      treatmentResult.exposed
    );

    treatmentResult.pValue = significance.pValue;
    treatmentResult.confidenceInterval = significance.confidenceInterval;
    treatmentResult.isSignificant = significance.pValue < experiment.significance_level;
    treatmentResult.standardError = significance.standardError;

    // Bayesian analysis
    const bayesian = calculateBayesianProbability(
      results.control.converted,
      results.control.exposed,
      treatmentResult.converted,
      treatmentResult.exposed
    );
    treatmentResult.probabilityToBeatControl = bayesian.probability;

    results.treatments.push(treatmentResult);
  }

  // Determine overall significance and recommendation
  const significantTreatments = results.treatments.filter(t => t.isSignificant);
  results.isSignificant = significantTreatments.length > 0;

  if (results.isSignificant) {
    // Find best treatment
    const bestTreatment = significantTreatments.reduce((best, current) =>
      current.relativeLift > best.relativeLift ? current : best
    );

    if (bestTreatment.relativeLift > 0) {
      results.recommendation = {
        action: 'ship_treatment',
        variant: bestTreatment.variantId,
        expectedLift: bestTreatment.relativeLift,
        confidence: 1 - bestTreatment.pValue,
      };
    } else {
      results.recommendation = {
        action: 'keep_control',
        reason: 'treatment_performs_worse',
      };
    }
  } else {
    const totalSample = results.control.exposed + results.treatments.reduce((s, t) => s + t.exposed, 0);
    results.recommendation = {
      action: 'continue',
      reason: 'not_significant',
      currentSample: totalSample,
      targetSample: experiment.minimum_sample_size,
      percentComplete: (totalSample / experiment.minimum_sample_size * 100).toFixed(1),
    };
  }

  return results;
}

/**
 * Calculate statistical significance using Z-test
 */
function calculateSignificance(controlConversions, controlTotal, treatmentConversions, treatmentTotal) {
  const p1 = controlConversions / controlTotal;
  const p2 = treatmentConversions / treatmentTotal;
  const pPooled = (controlConversions + treatmentConversions) / (controlTotal + treatmentTotal);

  // Standard error
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / controlTotal + 1 / treatmentTotal));

  if (se === 0) {
    return { pValue: 1, confidenceInterval: [0, 0], standardError: 0 };
  }

  // Z-score
  const z = (p2 - p1) / se;

  // Two-tailed p-value (approximation using standard normal)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  // 95% confidence interval for the difference
  const diff = p2 - p1;
  const margin = 1.96 * se;

  return {
    pValue,
    confidenceInterval: [diff - margin, diff + margin],
    standardError: se,
    zScore: z,
  };
}

/**
 * Calculate Bayesian probability of treatment beating control
 */
function calculateBayesianProbability(controlConversions, controlTotal, treatmentConversions, treatmentTotal) {
  // Beta distribution parameters
  const alphaControl = controlConversions + 1;
  const betaControl = controlTotal - controlConversions + 1;
  const alphaTreatment = treatmentConversions + 1;
  const betaTreatment = treatmentTotal - treatmentConversions + 1;

  // Monte Carlo simulation
  const samples = 10000;
  let treatmentWins = 0;

  for (let i = 0; i < samples; i++) {
    const controlSample = betaSample(alphaControl, betaControl);
    const treatmentSample = betaSample(alphaTreatment, betaTreatment);
    if (treatmentSample > controlSample) {
      treatmentWins++;
    }
  }

  return {
    probability: treatmentWins / samples,
    samples,
  };
}

// ============================================================================
// AUTO-CONCLUSION
// ============================================================================

/**
 * Check if experiment should auto-conclude
 */
async function checkAutoConclusion(experimentId) {
  const experiment = await getExperiment(experimentId);
  if (!experiment || experiment.status !== ExperimentStatus.RUNNING) return;

  const results = await calculateExperimentResults(experimentId);

  // Check for harm (treatment significantly worse)
  for (const treatment of results.treatments) {
    if (treatment.isSignificant && treatment.relativeLift < -0.1) {
      console.warn(`[AB Test] Auto-stopping ${experimentId}: treatment ${treatment.variantId} is harmful`);
      await concludeExperiment(experimentId, results.control.variantId, ConclusionReasons.AUTO_STOP_HARM);
      return;
    }
  }

  // Check for positive significance
  if (results.isSignificant && results.recommendation?.action === 'ship_treatment') {
    const totalSample = results.control.exposed + results.treatments.reduce((s, t) => s + t.exposed, 0);

    // Only auto-conclude if we have minimum sample
    if (totalSample >= experiment.minimum_sample_size) {
      console.log(`[AB Test] Auto-concluding ${experimentId}: ${results.recommendation.variant} wins`);
      await concludeExperiment(
        experimentId,
        results.recommendation.variant,
        ConclusionReasons.REACHED_SIGNIFICANCE
      );
    }
  }

  // Check for reaching sample size without significance
  const totalSample = results.control.exposed + results.treatments.reduce((s, t) => s + t.exposed, 0);
  if (totalSample >= experiment.minimum_sample_size * 2 && !results.isSignificant) {
    console.log(`[AB Test] Auto-concluding ${experimentId}: reached 2x sample without significance`);
    await concludeExperiment(experimentId, results.control.variantId, ConclusionReasons.REACHED_SAMPLE_SIZE);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Deterministic hash for consistent bucketing
 */
function deterministicHash(input) {
  const hash = crypto.createHash('md5').update(input).digest('hex');
  const numeric = parseInt(hash.substring(0, 8), 16);
  return numeric / 0xffffffff; // Normalize to 0-1
}

/**
 * Check user eligibility for experiment
 */
async function checkUserEligibility(userId, targetSegment) {
  if (!targetSegment || Object.keys(targetSegment).length === 0) {
    return { eligible: true };
  }

  try {
    const userInfo = await db.execute(sql`
      SELECT
        p.is_premium,
        p.region,
        g.level,
        g.streak,
        EXTRACT(DAY FROM NOW() - p.created_at) as days_since_signup
      FROM profiles p
      LEFT JOIN gamification g ON g.user_id = p.user_id
      WHERE p.user_id = ${userId}
    `);

    if (userInfo.rows.length === 0) {
      return { eligible: false, reason: 'user_not_found' };
    }

    const user = userInfo.rows[0];

    // Check segment criteria
    if (targetSegment.minDays && user.days_since_signup < targetSegment.minDays) {
      return { eligible: false, reason: 'too_new' };
    }
    if (targetSegment.maxDays && user.days_since_signup > targetSegment.maxDays) {
      return { eligible: false, reason: 'too_old' };
    }
    if (targetSegment.isPremium !== undefined && user.is_premium !== targetSegment.isPremium) {
      return { eligible: false, reason: 'premium_mismatch' };
    }
    if (targetSegment.minLevel && user.level < targetSegment.minLevel) {
      return { eligible: false, reason: 'level_too_low' };
    }
    if (targetSegment.region && user.region !== targetSegment.region) {
      return { eligible: false, reason: 'region_mismatch' };
    }

    return { eligible: true };
  } catch (error) {
    console.error('[AB Test] Error checking eligibility:', error.message);
    return { eligible: false, reason: 'error' };
  }
}

/**
 * Standard normal CDF approximation
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
 * Beta distribution sample (Box-Muller transform approximation)
 */
function betaSample(alpha, beta) {
  // Simple approximation using gamma distribution ratio
  const x = gammaSample(alpha);
  const y = gammaSample(beta);
  return x / (x + y);
}

/**
 * Gamma distribution sample (Marsaglia and Tsang's method simplified)
 */
function gammaSample(shape) {
  if (shape < 1) {
    return gammaSample(1 + shape) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x, v;
    do {
      x = gaussianRandom();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Gaussian random using Box-Muller
 */
function gaussianRandom() {
  const u = Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ============================================================================
// LIST ALL EXPERIMENTS
// ============================================================================

/**
 * Get all experiments with optional filtering
 */
export async function listExperiments(filters = {}) {
  const { status, limit = 20 } = filters;

  const result = await db.execute(sql`
    SELECT
      experiment_id,
      experiment_name,
      description,
      status,
      primary_metric,
      variants,
      started_at,
      concluded_at,
      winning_variant,
      created_at
    FROM ab_test_definitions
    ${status ? sql`WHERE status = ${status}` : sql``}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return result.rows;
}

export default {
  createExperiment,
  startExperiment,
  pauseExperiment,
  concludeExperiment,
  getExperiment,
  assignUserToExperiment,
  getUserVariant,
  recordExposure,
  recordMetricEvent,
  calculateExperimentResults,
  listExperiments,
  ExperimentStatus,
  MetricTypes,
  ConclusionReasons,
};
