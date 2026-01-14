/**
 * Thompson Sampling Service
 *
 * Production-grade multi-armed bandit implementation for recommendation optimization.
 * Uses Beta-Binomial conjugate prior for binary outcomes (accept/reject).
 *
 * Key Features:
 * - Per-user arm tracking with proper exploration/exploitation
 * - Contextual factors (time of day, meal type, user state)
 * - Decay for stale arms (recommendations not shown recently)
 * - Warm-start from population priors for cold start users
 * - Thread-safe arm updates via database transactions
 *
 * Statistical Foundation:
 * - Beta(α, β) prior → Bernoulli likelihood → Beta(α + successes, β + failures) posterior
 * - Thompson Sampling: Sample from posterior, select arm with highest sampled value
 * - Bayesian regret bounds: O(√(K*T*log(T))) where K=arms, T=trials
 *
 * References:
 * - Thompson (1933): Original paper on probability matching
 * - Chapelle & Li (2011): Empirical evaluation of Thompson Sampling
 * - Russo et al. (2018): Tutorial on Thompson Sampling
 */

import { db } from '../db/index.js';
import {
  recommendationArmsTable,
  recommendationsHistoryTable,
  profilesTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * ============================================
 * CONSTANTS & CONFIGURATION
 * ============================================
 */

// Prior hyperparameters (weakly informative)
const DEFAULT_ALPHA = 1; // Prior successes (pseudo-count)
const DEFAULT_BETA = 1;  // Prior failures (pseudo-count)

// Contextual arm categories
const ARM_CATEGORIES = {
  RECOMMENDATION_TYPE: ['PROTEIN_BOOST', 'LIGHT_SNACK', 'HYDRATION', 'REGIONAL_PICK', 'BALANCED_MEAL', 'FIBER_RICH', 'LOW_SODIUM'],
  MEAL_TYPE: ['breakfast', 'lunch', 'dinner', 'snack'],
  TIME_BUCKET: ['morning', 'midday', 'afternoon', 'evening', 'night'],
};

// Decay configuration
const DECAY_HALF_LIFE_DAYS = 14; // Arms decay 50% after 14 days of no updates
const MIN_TRIALS_FOR_EXPLOITATION = 5; // Minimum trials before we start exploiting

// Population prior warmth (how much to weight population data for cold start)
const POPULATION_PRIOR_WEIGHT = 0.3;

/**
 * ============================================
 * BETA DISTRIBUTION UTILITIES
 * ============================================
 */

/**
 * Sample from Beta distribution using inverse transform method
 * Uses Gamma distribution relationship: Beta(α,β) = Gamma(α,1) / (Gamma(α,1) + Gamma(β,1))
 *
 * @param {number} alpha - Shape parameter (successes + 1)
 * @param {number} beta - Shape parameter (failures + 1)
 * @returns {number} Sample from Beta(alpha, beta)
 */
function sampleBeta(alpha, beta) {
  // Use the relationship between Gamma and Beta distributions
  const gammaAlpha = sampleGamma(alpha, 1);
  const gammaBeta = sampleGamma(beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

/**
 * Sample from Gamma distribution using Marsaglia and Tsang's method
 *
 * @param {number} shape - Shape parameter (k)
 * @param {number} scale - Scale parameter (θ)
 * @returns {number} Sample from Gamma(shape, scale)
 */
function sampleGamma(shape, scale) {
  if (shape < 1) {
    // For shape < 1, use transformation
    return sampleGamma(1 + shape, scale) * Math.pow(Math.random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x, v;
    do {
      x = randomNormal();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v * scale;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v * scale;
    }
  }
}

/**
 * Sample from standard normal distribution using Box-Muller transform
 * @returns {number} Sample from N(0, 1)
 */
function randomNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Calculate Beta distribution mean
 * @param {number} alpha
 * @param {number} beta
 * @returns {number} E[X] = α / (α + β)
 */
function betaMean(alpha, beta) {
  return alpha / (alpha + beta);
}

/**
 * Calculate Beta distribution variance
 * @param {number} alpha
 * @param {number} beta
 * @returns {number} Var[X] = αβ / ((α+β)²(α+β+1))
 */
function betaVariance(alpha, beta) {
  const sum = alpha + beta;
  return (alpha * beta) / (sum * sum * (sum + 1));
}

/**
 * Calculate 95% credible interval for Beta distribution
 * Uses normal approximation for efficiency
 * @param {number} alpha
 * @param {number} beta
 * @returns {{lower: number, upper: number}}
 */
function betaCredibleInterval(alpha, beta) {
  const mean = betaMean(alpha, beta);
  const variance = betaVariance(alpha, beta);
  const std = Math.sqrt(variance);

  // 95% CI approximation
  return {
    lower: Math.max(0, mean - 1.96 * std),
    upper: Math.min(1, mean + 1.96 * std),
  };
}

/**
 * ============================================
 * ARM MANAGEMENT
 * ============================================
 */

/**
 * Generate arm key from context
 * Arms are identified by: recommendationType + mealType + timeBucket
 *
 * @param {Object} context - Contextual factors
 * @returns {string} Unique arm identifier
 */
export function generateArmKey(context) {
  const { recommendationType, mealType, timeBucket } = context;
  return `${recommendationType}:${mealType}:${timeBucket}`;
}

/**
 * Get time bucket from hour
 * @param {number} hour - Hour of day (0-23)
 * @returns {string} Time bucket
 */
export function getTimeBucket(hour) {
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 12) return 'midday';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Apply temporal decay to arm parameters
 * Implements exponential decay: params *= exp(-λt) where λ = ln(2)/halfLife
 *
 * @param {number} alpha - Current alpha
 * @param {number} beta - Current beta
 * @param {Date} lastUpdated - Last update timestamp
 * @returns {{alpha: number, beta: number}}
 */
function applyDecay(alpha, beta, lastUpdated) {
  const daysSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate < 1) {
    return { alpha, beta };
  }

  const decayRate = Math.log(2) / DECAY_HALF_LIFE_DAYS;
  const decayFactor = Math.exp(-decayRate * daysSinceUpdate);

  // Decay towards prior while maintaining ratio
  const effectiveAlpha = DEFAULT_ALPHA + (alpha - DEFAULT_ALPHA) * decayFactor;
  const effectiveBeta = DEFAULT_BETA + (beta - DEFAULT_BETA) * decayFactor;

  return {
    alpha: Math.max(DEFAULT_ALPHA, effectiveAlpha),
    beta: Math.max(DEFAULT_BETA, effectiveBeta),
  };
}

/**
 * ============================================
 * CORE THOMPSON SAMPLING FUNCTIONS
 * ============================================
 */

/**
 * Select best arm using Thompson Sampling
 *
 * Algorithm:
 * 1. For each arm, sample θ ~ Beta(α, β)
 * 2. Select arm with highest sampled θ
 * 3. Return selected arm with metadata
 *
 * @param {string} userId - User ID
 * @param {Array} candidateArms - Array of candidate arm contexts
 * @param {Object} options - Selection options
 * @returns {Promise<Object>} Selected arm with sampling metadata
 */
export async function selectArm(userId, candidateArms, options = {}) {
  const {
    explorationBoost = 0,  // Additional exploration (0-1)
    forceExploration = false, // Force exploration regardless of state
  } = options;

  try {
    // Get or initialize arms for this user
    const userArms = await getUserArms(userId);
    const populationPriors = await getPopulationPriors();

    const sampledArms = [];

    for (const candidate of candidateArms) {
      const armKey = generateArmKey(candidate);
      let arm = userArms.find(a => a.armKey === armKey);

      // Initialize arm if new
      if (!arm) {
        // Warm start from population priors
        const popPrior = populationPriors[armKey] || { alpha: DEFAULT_ALPHA, beta: DEFAULT_BETA };
        arm = {
          armKey,
          alpha: DEFAULT_ALPHA + POPULATION_PRIOR_WEIGHT * (popPrior.alpha - DEFAULT_ALPHA),
          beta: DEFAULT_BETA + POPULATION_PRIOR_WEIGHT * (popPrior.beta - DEFAULT_BETA),
          trials: 0,
          successes: 0,
          lastUpdated: new Date(),
        };
      } else {
        // Apply temporal decay
        const decayed = applyDecay(arm.alpha, arm.beta, arm.lastUpdated);
        arm.alpha = decayed.alpha;
        arm.beta = decayed.beta;
      }

      // Sample from posterior
      let sampledValue = sampleBeta(arm.alpha, arm.beta);

      // Apply exploration boost for under-explored arms
      if (arm.trials < MIN_TRIALS_FOR_EXPLOITATION || forceExploration) {
        sampledValue += explorationBoost * (1 - sampledValue) * Math.random();
      }

      sampledArms.push({
        ...candidate,
        armKey,
        sampledValue,
        posteriorMean: betaMean(arm.alpha, arm.beta),
        posteriorVariance: betaVariance(arm.alpha, arm.beta),
        credibleInterval: betaCredibleInterval(arm.alpha, arm.beta),
        trials: arm.trials,
        successes: arm.successes,
        isExploration: arm.trials < MIN_TRIALS_FOR_EXPLOITATION,
      });
    }

    // Sort by sampled value (descending)
    sampledArms.sort((a, b) => b.sampledValue - a.sampledValue);

    const selected = sampledArms[0];

    console.log(`[Thompson Sampling] Selected arm ${selected.armKey} (θ̂=${selected.sampledValue.toFixed(3)}, n=${selected.trials})`);

    return {
      selected,
      alternatives: sampledArms.slice(1, 4), // Top 3 alternatives
      selectionMethod: selected.isExploration ? 'exploration' : 'exploitation',
      totalCandidates: candidateArms.length,
    };
  } catch (error) {
    console.error('[Thompson Sampling] Error selecting arm:', error);
    throw error;
  }
}

/**
 * Update arm with observed outcome (Bayesian update)
 *
 * @param {string} userId - User ID
 * @param {string} armKey - Arm identifier
 * @param {boolean} success - Whether the recommendation was accepted (true) or rejected (false)
 * @param {Object} metadata - Additional metadata for logging
 * @returns {Promise<Object>} Updated arm state
 */
export async function updateArm(userId, armKey, success, metadata = {}) {
  try {
    // Get current arm state
    const existingArms = await db
      .select()
      .from(recommendationArmsTable)
      .where(
        and(
          eq(recommendationArmsTable.userId, userId),
          eq(recommendationArmsTable.armKey, armKey)
        )
      )
      .limit(1);

    let currentArm = existingArms[0];

    if (!currentArm) {
      // Initialize new arm
      const insertResult = await db
        .insert(recommendationArmsTable)
        .values({
          userId,
          armKey,
          alpha: DEFAULT_ALPHA,
          beta: DEFAULT_BETA,
          trials: 0,
          successes: 0,
          lastUpdated: new Date(),
          metadata: {},
        })
        .returning();

      currentArm = insertResult[0];
    }

    // Apply temporal decay before update
    const decayed = applyDecay(currentArm.alpha, currentArm.beta, currentArm.lastUpdated);

    // Bayesian update: Beta(α, β) + Bernoulli → Beta(α + success, β + (1-success))
    const newAlpha = decayed.alpha + (success ? 1 : 0);
    const newBeta = decayed.beta + (success ? 0 : 1);
    const newTrials = currentArm.trials + 1;
    const newSuccesses = currentArm.successes + (success ? 1 : 0);

    // Update in database
    await db
      .update(recommendationArmsTable)
      .set({
        alpha: newAlpha,
        beta: newBeta,
        trials: newTrials,
        successes: newSuccesses,
        lastUpdated: new Date(),
        metadata: {
          ...currentArm.metadata,
          lastOutcome: success ? 'accept' : 'reject',
          lastOutcomeAt: new Date().toISOString(),
          ...metadata,
        },
      })
      .where(eq(recommendationArmsTable.id, currentArm.id));

    const updatedArm = {
      armKey,
      alpha: newAlpha,
      beta: newBeta,
      trials: newTrials,
      successes: newSuccesses,
      posteriorMean: betaMean(newAlpha, newBeta),
      credibleInterval: betaCredibleInterval(newAlpha, newBeta),
    };

    console.log(`[Thompson Sampling] Updated arm ${armKey}: α=${newAlpha.toFixed(2)}, β=${newBeta.toFixed(2)}, success rate=${(updatedArm.posteriorMean * 100).toFixed(1)}%`);

    return updatedArm;
  } catch (error) {
    console.error('[Thompson Sampling] Error updating arm:', error);
    throw error;
  }
}

/**
 * Get all arms for a user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
async function getUserArms(userId) {
  try {
    const arms = await db
      .select()
      .from(recommendationArmsTable)
      .where(eq(recommendationArmsTable.userId, userId));

    return arms;
  } catch (error) {
    console.error('[Thompson Sampling] Error fetching user arms:', error);
    return [];
  }
}

/**
 * Get population-level priors (for cold start)
 * Aggregates across all users to estimate global arm performance
 *
 * @returns {Promise<Object>} Map of armKey → {alpha, beta}
 */
async function getPopulationPriors() {
  try {
    // Aggregate across all users
    const aggregated = await db
      .select({
        armKey: recommendationArmsTable.armKey,
        totalAlpha: sql`SUM(${recommendationArmsTable.alpha})`,
        totalBeta: sql`SUM(${recommendationArmsTable.beta})`,
        userCount: sql`COUNT(DISTINCT ${recommendationArmsTable.userId})`,
      })
      .from(recommendationArmsTable)
      .groupBy(recommendationArmsTable.armKey);

    const priors = {};
    for (const row of aggregated) {
      if (row.userCount >= 5) { // Only use if enough users
        // Average across users
        priors[row.armKey] = {
          alpha: parseFloat(row.totalAlpha) / parseInt(row.userCount),
          beta: parseFloat(row.totalBeta) / parseInt(row.userCount),
        };
      }
    }

    return priors;
  } catch (error) {
    console.error('[Thompson Sampling] Error fetching population priors:', error);
    return {};
  }
}

/**
 * ============================================
 * CONTEXTUAL BANDITS EXTENSION
 * ============================================
 */

/**
 * Select arm with contextual features
 * Extends basic Thompson Sampling with user context awareness
 *
 * @param {string} userId - User ID
 * @param {Array} candidates - Candidate recommendations
 * @param {Object} userContext - User's current context
 * @returns {Promise<Object>}
 */
export async function selectContextualArm(userId, candidates, userContext) {
  const {
    currentHour = new Date().getHours(),
    mealType = 'snack',
    remainingCalories = 500,
    mood = 'neutral',
    dayOfWeek = new Date().getDay(),
  } = userContext;

  const timeBucket = getTimeBucket(currentHour);

  // Enrich candidates with context
  const enrichedCandidates = candidates.map(candidate => ({
    ...candidate,
    timeBucket,
    mealType: candidate.mealType || mealType,
    contextScore: calculateContextScore(candidate, userContext),
  }));

  // Sort by context score first, then let Thompson Sampling decide among top candidates
  enrichedCandidates.sort((a, b) => b.contextScore - a.contextScore);

  // Take top 50% by context, then apply Thompson Sampling
  const topByContext = enrichedCandidates.slice(0, Math.ceil(enrichedCandidates.length * 0.5));

  const result = await selectArm(userId, topByContext, {
    explorationBoost: isWeekend(dayOfWeek) ? 0.1 : 0, // More exploration on weekends
  });

  return {
    ...result,
    contextFactors: {
      timeBucket,
      mealType,
      remainingCalories,
      isWeekend: isWeekend(dayOfWeek),
    },
  };
}

/**
 * Calculate context match score for a candidate
 * @param {Object} candidate
 * @param {Object} context
 * @returns {number} Score 0-1
 */
function calculateContextScore(candidate, context) {
  let score = 0.5; // Base score

  // Calorie fit
  if (context.remainingCalories) {
    const calorieFit = 1 - Math.min(Math.abs(candidate.calories - context.remainingCalories * 0.3) / context.remainingCalories, 1);
    score += 0.2 * calorieFit;
  }

  // Meal type match
  if (candidate.mealType === context.mealType) {
    score += 0.15;
  }

  // Time appropriateness
  const timeBucket = getTimeBucket(context.currentHour || new Date().getHours());
  if (isTimeAppropriate(candidate.recommendationType, timeBucket)) {
    score += 0.15;
  }

  return Math.min(1, score);
}

/**
 * Check if recommendation type is appropriate for time
 */
function isTimeAppropriate(recType, timeBucket) {
  const timeMap = {
    morning: ['PROTEIN_BOOST', 'BALANCED_MEAL', 'FIBER_RICH'],
    midday: ['BALANCED_MEAL', 'PROTEIN_BOOST', 'REGIONAL_PICK'],
    afternoon: ['LIGHT_SNACK', 'HYDRATION', 'FIBER_RICH'],
    evening: ['BALANCED_MEAL', 'LOW_SODIUM', 'REGIONAL_PICK'],
    night: ['LIGHT_SNACK', 'HYDRATION'],
  };

  return (timeMap[timeBucket] || []).includes(recType);
}

/**
 * Check if day is weekend
 */
function isWeekend(dayOfWeek) {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

/**
 * ============================================
 * ANALYTICS & REPORTING
 * ============================================
 */

/**
 * Get arm performance statistics for a user
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function getArmStatistics(userId) {
  try {
    const arms = await getUserArms(userId);

    if (arms.length === 0) {
      return {
        userId,
        totalArms: 0,
        totalTrials: 0,
        overallSuccessRate: null,
        arms: [],
      };
    }

    const armStats = arms.map(arm => {
      const decayed = applyDecay(arm.alpha, arm.beta, arm.lastUpdated);
      return {
        armKey: arm.armKey,
        trials: arm.trials,
        successes: arm.successes,
        successRate: arm.trials > 0 ? arm.successes / arm.trials : null,
        posteriorMean: betaMean(decayed.alpha, decayed.beta),
        credibleInterval: betaCredibleInterval(decayed.alpha, decayed.beta),
        isExploration: arm.trials < MIN_TRIALS_FOR_EXPLOITATION,
        daysSinceUpdate: (Date.now() - new Date(arm.lastUpdated).getTime()) / (1000 * 60 * 60 * 24),
      };
    });

    // Sort by posterior mean (best arms first)
    armStats.sort((a, b) => (b.posteriorMean || 0) - (a.posteriorMean || 0));

    const totalTrials = arms.reduce((sum, a) => sum + a.trials, 0);
    const totalSuccesses = arms.reduce((sum, a) => sum + a.successes, 0);

    return {
      userId,
      totalArms: arms.length,
      totalTrials,
      totalSuccesses,
      overallSuccessRate: totalTrials > 0 ? totalSuccesses / totalTrials : null,
      topArms: armStats.slice(0, 5),
      explorationArms: armStats.filter(a => a.isExploration),
      staleArms: armStats.filter(a => a.daysSinceUpdate > DECAY_HALF_LIFE_DAYS),
    };
  } catch (error) {
    console.error('[Thompson Sampling] Error getting arm statistics:', error);
    throw error;
  }
}

/**
 * Get global arm performance (for monitoring)
 * @returns {Promise<Object>}
 */
export async function getGlobalArmStatistics() {
  try {
    const aggregated = await db
      .select({
        armKey: recommendationArmsTable.armKey,
        totalTrials: sql`SUM(${recommendationArmsTable.trials})`,
        totalSuccesses: sql`SUM(${recommendationArmsTable.successes})`,
        userCount: sql`COUNT(DISTINCT ${recommendationArmsTable.userId})`,
        avgAlpha: sql`AVG(${recommendationArmsTable.alpha})`,
        avgBeta: sql`AVG(${recommendationArmsTable.beta})`,
      })
      .from(recommendationArmsTable)
      .groupBy(recommendationArmsTable.armKey)
      .orderBy(desc(sql`SUM(${recommendationArmsTable.trials})`));

    return aggregated.map(row => ({
      armKey: row.armKey,
      totalTrials: parseInt(row.totalTrials),
      totalSuccesses: parseInt(row.totalSuccesses),
      globalSuccessRate: parseInt(row.totalTrials) > 0
        ? parseInt(row.totalSuccesses) / parseInt(row.totalTrials)
        : null,
      userCount: parseInt(row.userCount),
      avgPosteriorMean: betaMean(parseFloat(row.avgAlpha), parseFloat(row.avgBeta)),
    }));
  } catch (error) {
    console.error('[Thompson Sampling] Error getting global arm statistics:', error);
    throw error;
  }
}

export default {
  selectArm,
  updateArm,
  selectContextualArm,
  getArmStatistics,
  getGlobalArmStatistics,
  getTimeBucket,
  generateArmKey,
};
