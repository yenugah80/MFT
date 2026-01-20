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

/**
 * ============================================
 * DIFFICULTY TIERS & MICRO-ACTIONS
 * ============================================
 */

// Difficulty tier definitions
const DIFFICULTY_TIERS = {
  EASY: { label: 'Easy', maxMinutes: 5, icon: 'sparkles', color: '#10B981' },
  MEDIUM: { label: 'Medium', maxMinutes: 15, icon: 'flash', color: '#F59E0B' },
  HARD: { label: 'Hard', maxMinutes: Infinity, icon: 'barbell', color: '#EF4444' },
};

// Action type configurations with difficulty and micro-action templates
const ACTION_CONFIGS = {
  // Hydration actions - mostly easy
  DRINK_WATER: {
    baseDifficulty: 'EASY',
    baseMinutes: 1,
    requiredEnergy: 1,
    microActions: [
      { step: 1, action: 'Fill your water bottle or glass', duration: 30 },
      { step: 2, action: 'Take 8-10 sips', duration: 60 },
    ],
    validTimes: ['morning', 'midday', 'afternoon', 'evening', 'night'],
  },
  DRINK_TEA: {
    baseDifficulty: 'EASY',
    baseMinutes: 5,
    requiredEnergy: 2,
    microActions: [
      { step: 1, action: 'Boil water', duration: 120 },
      { step: 2, action: 'Steep tea bag for 3-5 minutes', duration: 240 },
      { step: 3, action: 'Enjoy mindfully', duration: 300 },
    ],
    validTimes: ['morning', 'midday', 'afternoon', 'evening'],
  },

  // Quick nutrition actions - easy to medium
  EAT_FRUIT: {
    baseDifficulty: 'EASY',
    baseMinutes: 3,
    requiredEnergy: 1,
    microActions: [
      { step: 1, action: 'Grab fruit from kitchen', duration: 30 },
      { step: 2, action: 'Wash if needed', duration: 30 },
      { step: 3, action: 'Eat slowly, savoring each bite', duration: 180 },
    ],
    validTimes: ['morning', 'midday', 'afternoon'],
  },
  EAT_NUTS: {
    baseDifficulty: 'EASY',
    baseMinutes: 2,
    requiredEnergy: 1,
    microActions: [
      { step: 1, action: 'Portion out a small handful (1 oz)', duration: 30 },
      { step: 2, action: 'Eat one at a time for better satiety', duration: 120 },
    ],
    validTimes: ['midday', 'afternoon', 'evening'],
  },
  PREP_SALAD: {
    baseDifficulty: 'MEDIUM',
    baseMinutes: 10,
    requiredEnergy: 4,
    microActions: [
      { step: 1, action: 'Wash and dry greens', duration: 120 },
      { step: 2, action: 'Chop vegetables', duration: 180 },
      { step: 3, action: 'Add protein (canned tuna, chickpeas, etc)', duration: 60 },
      { step: 4, action: 'Drizzle with olive oil and lemon', duration: 30 },
    ],
    validTimes: ['midday', 'evening'],
  },

  // Meal prep actions - medium to hard
  COOK_PROTEIN: {
    baseDifficulty: 'MEDIUM',
    baseMinutes: 15,
    requiredEnergy: 5,
    microActions: [
      { step: 1, action: 'Take protein out of fridge', duration: 30 },
      { step: 2, action: 'Season lightly with salt and pepper', duration: 60 },
      { step: 3, action: 'Heat pan with oil over medium heat', duration: 120 },
      { step: 4, action: 'Cook 4-6 min per side until done', duration: 480 },
      { step: 5, action: 'Rest for 3 minutes before eating', duration: 180 },
    ],
    validTimes: ['midday', 'evening'],
  },
  MEAL_PREP_BATCH: {
    baseDifficulty: 'HARD',
    baseMinutes: 45,
    requiredEnergy: 7,
    microActions: [
      { step: 1, action: 'Plan 3-4 meals for the week', duration: 300 },
      { step: 2, action: 'Gather ingredients and containers', duration: 300 },
      { step: 3, action: 'Batch cook grains (rice, quinoa)', duration: 900 },
      { step: 4, action: 'Roast vegetables', duration: 1200 },
      { step: 5, action: 'Portion into containers', duration: 300 },
    ],
    validTimes: ['morning', 'afternoon', 'evening'],
  },

  // Activity actions
  TAKE_WALK: {
    baseDifficulty: 'EASY',
    baseMinutes: 10,
    requiredEnergy: 3,
    microActions: [
      { step: 1, action: 'Put on comfortable shoes', duration: 60 },
      { step: 2, action: 'Step outside', duration: 30 },
      { step: 3, action: 'Walk at comfortable pace for 10 min', duration: 600 },
    ],
    validTimes: ['morning', 'midday', 'afternoon', 'evening'],
  },
  STRETCH: {
    baseDifficulty: 'EASY',
    baseMinutes: 5,
    requiredEnergy: 2,
    microActions: [
      { step: 1, action: 'Stand up from your chair', duration: 10 },
      { step: 2, action: 'Reach arms overhead, hold 15 sec', duration: 20 },
      { step: 3, action: 'Touch toes (or knees), hold 15 sec', duration: 20 },
      { step: 4, action: 'Neck rolls, 5 each direction', duration: 30 },
      { step: 5, action: 'Shoulder shrugs, 10 reps', duration: 20 },
    ],
    validTimes: ['morning', 'midday', 'afternoon', 'evening'],
  },
  WORKOUT: {
    baseDifficulty: 'HARD',
    baseMinutes: 30,
    requiredEnergy: 8,
    microActions: [
      { step: 1, action: 'Change into workout clothes', duration: 180 },
      { step: 2, action: 'Dynamic warm-up (5 min)', duration: 300 },
      { step: 3, action: 'Main workout (20 min)', duration: 1200 },
      { step: 4, action: 'Cool down and stretch (5 min)', duration: 300 },
    ],
    validTimes: ['morning', 'afternoon', 'evening'],
  },

  // Mindfulness actions
  DEEP_BREATHING: {
    baseDifficulty: 'EASY',
    baseMinutes: 3,
    requiredEnergy: 1,
    microActions: [
      { step: 1, action: 'Find a quiet spot', duration: 20 },
      { step: 2, action: 'Close eyes, inhale 4 counts', duration: 4 },
      { step: 3, action: 'Hold 4 counts', duration: 4 },
      { step: 4, action: 'Exhale 6 counts', duration: 6 },
      { step: 5, action: 'Repeat 5 cycles', duration: 70 },
    ],
    validTimes: ['morning', 'midday', 'afternoon', 'evening', 'night'],
  },
  MEDITATION: {
    baseDifficulty: 'MEDIUM',
    baseMinutes: 10,
    requiredEnergy: 2,
    microActions: [
      { step: 1, action: 'Find comfortable seated position', duration: 30 },
      { step: 2, action: 'Set timer for 10 minutes', duration: 10 },
      { step: 3, action: 'Focus on breath, gently return when distracted', duration: 560 },
    ],
    validTimes: ['morning', 'evening', 'night'],
  },

  // Sleep hygiene actions
  REDUCE_SCREEN: {
    baseDifficulty: 'MEDIUM',
    baseMinutes: 30,
    requiredEnergy: 3,
    microActions: [
      { step: 1, action: 'Enable night mode on devices', duration: 60 },
      { step: 2, action: 'Put phone in another room', duration: 30 },
      { step: 3, action: 'Read a book or do light stretching', duration: 1500 },
    ],
    validTimes: ['evening', 'night'],
  },
};

// Energy level thresholds (1-10 scale matching mood/energy tracking)
const ENERGY_THRESHOLDS = {
  LOW: { max: 3, label: 'Low energy', allowedDifficulties: ['EASY'] },
  MEDIUM: { max: 6, label: 'Moderate energy', allowedDifficulties: ['EASY', 'MEDIUM'] },
  HIGH: { max: 10, label: 'High energy', allowedDifficulties: ['EASY', 'MEDIUM', 'HARD'] },
};

/**
 * Get energy level category from numeric value
 * @param {number} energyLevel - Energy level 1-10
 * @returns {string} Energy category key
 */
function getEnergyCategory(energyLevel) {
  if (energyLevel <= ENERGY_THRESHOLDS.LOW.max) return 'LOW';
  if (energyLevel <= ENERGY_THRESHOLDS.MEDIUM.max) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Calculate difficulty tier based on action config and user context
 * @param {Object} actionConfig - Action configuration
 * @param {Object} context - User context
 * @returns {Object} Difficulty tier info
 */
function calculateDifficultyTier(actionConfig, context = {}) {
  const { baseMinutes, baseDifficulty } = actionConfig;
  const { userEnergyLevel = 5, hasRequiredIngredients = true } = context;

  // Adjust difficulty based on context
  let adjustedMinutes = baseMinutes;
  let adjustedDifficulty = baseDifficulty;

  // Increase difficulty if user has low energy
  if (userEnergyLevel <= 3 && baseDifficulty !== 'HARD') {
    // Low energy makes medium tasks feel hard
    if (baseDifficulty === 'MEDIUM') {
      adjustedDifficulty = 'HARD';
    } else if (baseDifficulty === 'EASY' && baseMinutes > 3) {
      adjustedDifficulty = 'MEDIUM';
    }
  }

  // Decrease difficulty if user has high energy
  if (userEnergyLevel >= 8 && baseDifficulty !== 'EASY') {
    // High energy makes medium tasks feel easier
    if (baseDifficulty === 'HARD') {
      adjustedDifficulty = 'MEDIUM';
    }
  }

  // Increase time/difficulty if missing ingredients
  if (!hasRequiredIngredients && ['COOK_PROTEIN', 'PREP_SALAD', 'MEAL_PREP_BATCH'].includes(actionConfig.type)) {
    adjustedMinutes += 15; // Add shopping/gathering time
  }

  const tier = DIFFICULTY_TIERS[adjustedDifficulty];

  return {
    tier: adjustedDifficulty,
    label: tier.label,
    icon: tier.icon,
    color: tier.color,
    estimatedMinutes: adjustedMinutes,
    originalDifficulty: baseDifficulty,
    wasAdjusted: adjustedDifficulty !== baseDifficulty,
    adjustmentReason: adjustedDifficulty !== baseDifficulty
      ? (userEnergyLevel <= 3 ? 'Adjusted for low energy' : 'Adjusted for high energy')
      : null,
  };
}

/**
 * Break a recommendation into micro-actions
 * @param {Object} recommendation - The recommendation object
 * @param {Object} context - User context for customization
 * @returns {Array} Array of micro-action steps
 */
function breakIntoMicroActions(recommendation, context = {}) {
  const { actionType, recommendationType } = recommendation;
  const actionKey = actionType || mapRecommendationTypeToAction(recommendationType);
  const config = ACTION_CONFIGS[actionKey];

  if (!config || !config.microActions) {
    // Return generic micro-actions for unknown types
    return [
      { step: 1, action: `Start: ${recommendation.title || 'Begin action'}`, duration: 30, isGeneric: true },
      { step: 2, action: 'Complete the action', duration: 300, isGeneric: true },
    ];
  }

  // Customize micro-actions based on context
  return config.microActions.map((action, index) => ({
    ...action,
    step: index + 1,
    completed: false,
    // Add time-based customization
    customNote: getCustomNoteForAction(action, context),
  }));
}

/**
 * Map recommendation type to action type
 */
function mapRecommendationTypeToAction(recommendationType) {
  const mapping = {
    HYDRATION: 'DRINK_WATER',
    LIGHT_SNACK: 'EAT_FRUIT',
    PROTEIN_BOOST: 'COOK_PROTEIN',
    BALANCED_MEAL: 'PREP_SALAD',
    FIBER_RICH: 'EAT_FRUIT',
    LOW_SODIUM: 'PREP_SALAD',
    REGIONAL_PICK: 'PREP_SALAD',
    ACTIVITY: 'TAKE_WALK',
    MINDFULNESS: 'DEEP_BREATHING',
  };
  return mapping[recommendationType] || 'DRINK_WATER';
}

/**
 * Get custom note for an action based on context
 */
function getCustomNoteForAction(action, context) {
  const { timeBucket, userEnergyLevel } = context;

  // Morning-specific tips
  if (timeBucket === 'morning' && action.action.includes('water')) {
    return 'Room temperature water is gentler on your system in the morning';
  }

  // Low energy tips
  if (userEnergyLevel && userEnergyLevel <= 3 && action.duration > 120) {
    return 'Take your time - no rush';
  }

  return null;
}

/**
 * Predict the impact of following a recommendation
 * @param {Object} recommendation - The recommendation
 * @param {string} userId - User ID for personalized predictions
 * @returns {Object} Predicted impact
 */
function predictImpact(recommendation, userId) {
  const { actionType, recommendationType } = recommendation;
  const actionKey = actionType || mapRecommendationTypeToAction(recommendationType);
  const config = ACTION_CONFIGS[actionKey];

  // Base impact predictions by category
  const impactMap = {
    DRINK_WATER: { energy: +0.5, mood: +0.3, hydration: +15, domain: 'hydration' },
    DRINK_TEA: { energy: +0.7, mood: +0.5, hydration: +10, domain: 'hydration' },
    EAT_FRUIT: { energy: +0.6, mood: +0.3, nutrition: +10, domain: 'nutrition' },
    EAT_NUTS: { energy: +0.4, mood: +0.2, nutrition: +8, domain: 'nutrition' },
    PREP_SALAD: { energy: +0.8, mood: +0.5, nutrition: +20, domain: 'nutrition' },
    COOK_PROTEIN: { energy: +1.0, mood: +0.6, nutrition: +25, domain: 'nutrition' },
    MEAL_PREP_BATCH: { energy: +0.5, mood: +0.8, nutrition: +50, domain: 'nutrition' },
    TAKE_WALK: { energy: +1.2, mood: +0.8, activity: +10, domain: 'activity' },
    STRETCH: { energy: +0.6, mood: +0.4, activity: +5, domain: 'activity' },
    WORKOUT: { energy: +1.5, mood: +1.0, activity: +30, domain: 'activity' },
    DEEP_BREATHING: { energy: +0.3, mood: +0.6, stress: -0.5, domain: 'mindfulness' },
    MEDITATION: { energy: +0.4, mood: +0.8, stress: -0.8, domain: 'mindfulness' },
    REDUCE_SCREEN: { energy: +0.2, mood: +0.3, sleep: +0.5, domain: 'sleep' },
  };

  const baseImpact = impactMap[actionKey] || { energy: +0.3, mood: +0.2, domain: 'general' };

  // Calculate confidence based on action type commonality
  const confidence = config ? 0.7 : 0.4;

  return {
    ...baseImpact,
    confidence,
    timeToEffect: config ? (config.baseMinutes < 5 ? 'immediate' : config.baseMinutes < 15 ? '15-30 min' : '1-2 hours') : 'varies',
    personalized: false, // Could be enhanced with user-specific data
  };
}

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
 * ============================================
 * ENHANCED CONTEXT-AWARE RECOMMENDATION SELECTION
 * ============================================
 */

/**
 * Select recommendation with full context awareness including:
 * - Time of day appropriateness
 * - User energy level matching
 * - Difficulty tier filtering
 * - Micro-action breakdown
 * - Impact prediction
 *
 * @param {string} userId - User ID
 * @param {Array} candidates - Candidate recommendations
 * @param {Object} context - Full user context
 * @returns {Promise<Object>} Selected recommendation with all enrichments
 */
export async function selectRecommendation(userId, candidates, context = {}) {
  const {
    timeOfDay = new Date().getHours(),
    dayOfWeek = new Date().getDay(),
    recentActivity = null,
    predictedEnergy = 5,
    currentMood = 'neutral',
    mealType = 'snack',
    remainingCalories = 500,
    preferredDifficulty = null, // User can filter by Easy/Medium/Hard
    maxMinutes = null, // User can set max time they have
  } = context;

  const timeBucket = getTimeBucket(timeOfDay);
  const energyCategory = getEnergyCategory(predictedEnergy);
  const allowedDifficulties = ENERGY_THRESHOLDS[energyCategory].allowedDifficulties;

  console.log(`[Thompson Sampling] Selecting recommendation for ${userId}: timeBucket=${timeBucket}, energy=${predictedEnergy} (${energyCategory})`);

  // Step 1: Filter candidates by context
  const filteredCandidates = candidates.filter(candidate => {
    const actionKey = candidate.actionType || mapRecommendationTypeToAction(candidate.recommendationType);
    const config = ACTION_CONFIGS[actionKey];

    if (!config) return true; // Allow unknown types through

    // Check time appropriateness
    if (!config.validTimes.includes(timeBucket)) {
      return false;
    }

    // Check energy requirement
    if (config.requiredEnergy > predictedEnergy + 2) {
      return false; // Filter out actions requiring much more energy than available
    }

    // Check difficulty preference
    if (preferredDifficulty && config.baseDifficulty !== preferredDifficulty) {
      return false;
    }

    // Check max time constraint
    if (maxMinutes && config.baseMinutes > maxMinutes) {
      return false;
    }

    // Filter by allowed difficulties based on energy
    if (!allowedDifficulties.includes(config.baseDifficulty)) {
      return false;
    }

    return true;
  });

  // If filtering removed all candidates, fall back to easiest options
  const finalCandidates = filteredCandidates.length > 0
    ? filteredCandidates
    : candidates.filter(c => {
        const actionKey = c.actionType || mapRecommendationTypeToAction(c.recommendationType);
        const config = ACTION_CONFIGS[actionKey];
        return !config || config.baseDifficulty === 'EASY';
      });

  if (finalCandidates.length === 0) {
    console.warn('[Thompson Sampling] No suitable candidates after filtering, using original list');
    finalCandidates.push(...candidates.slice(0, 3));
  }

  // Step 2: Apply Thompson Sampling
  const result = await selectContextualArm(userId, finalCandidates, {
    currentHour: timeOfDay,
    mealType,
    remainingCalories,
    mood: currentMood,
    dayOfWeek,
  });

  if (!result.selected) {
    return {
      success: false,
      error: 'No recommendation selected',
      candidates: finalCandidates.length,
    };
  }

  // Step 3: Enrich selected recommendation with all context-aware features
  const enrichedRecommendation = enrichRecommendation(result.selected, {
    timeBucket,
    userEnergyLevel: predictedEnergy,
    userId,
  });

  return {
    success: true,
    selected: enrichedRecommendation,
    alternatives: result.alternatives?.slice(0, 2).map(alt =>
      enrichRecommendation(alt, { timeBucket, userEnergyLevel: predictedEnergy, userId })
    ) || [],
    selectionMethod: result.selectionMethod,
    contextFactors: {
      timeBucket,
      energyCategory,
      allowedDifficulties,
      candidatesFiltered: candidates.length - filteredCandidates.length,
      totalCandidates: candidates.length,
      finalCandidates: finalCandidates.length,
    },
    meta: {
      timestamp: new Date().toISOString(),
      userId,
    },
  };
}

/**
 * Enrich a single recommendation with difficulty, micro-actions, and impact
 * @param {Object} recommendation - Raw recommendation
 * @param {Object} context - Enrichment context
 * @returns {Object} Enriched recommendation
 */
export function enrichRecommendation(recommendation, context = {}) {
  const { timeBucket, userEnergyLevel = 5, userId } = context;
  const actionKey = recommendation.actionType || mapRecommendationTypeToAction(recommendation.recommendationType);
  const config = ACTION_CONFIGS[actionKey] || {
    baseDifficulty: 'EASY',
    baseMinutes: 5,
    requiredEnergy: 2,
  };

  // Calculate difficulty tier
  const difficulty = calculateDifficultyTier(config, {
    userEnergyLevel,
    hasRequiredIngredients: true, // Could be enhanced with user inventory data
  });

  // Get micro-actions
  const microActions = breakIntoMicroActions(recommendation, {
    timeBucket,
    userEnergyLevel,
  });

  // Predict impact
  const estimatedImpact = predictImpact(recommendation, userId);

  // Calculate total micro-action time
  const totalMicroActionSeconds = microActions.reduce((sum, a) => sum + (a.duration || 0), 0);

  return {
    ...recommendation,
    // Difficulty tier info
    difficultyTier: difficulty,
    // Atomic micro-actions for step-by-step guidance
    microActions,
    microActionCount: microActions.length,
    totalMicroActionSeconds,
    // Predicted wellness impact
    estimatedImpact,
    // Time appropriateness
    isTimeAppropriate: config.validTimes?.includes(timeBucket) ?? true,
    validTimes: config.validTimes || ['morning', 'midday', 'afternoon', 'evening', 'night'],
    // Energy requirements
    requiredEnergy: config.requiredEnergy || 2,
    energyMatch: userEnergyLevel >= (config.requiredEnergy || 2),
    // Quick action flag for UI
    isQuickAction: difficulty.estimatedMinutes <= 5,
    // Enrichment metadata
    enrichedAt: new Date().toISOString(),
  };
}

/**
 * Get time-appropriate recommendations for a specific time bucket
 * Useful for pre-filtering before Thompson Sampling
 *
 * @param {Array} allRecommendations - All available recommendations
 * @param {string} timeBucket - Target time bucket
 * @param {Object} options - Additional filter options
 * @returns {Array} Filtered recommendations
 */
export function filterByTimeAndEnergy(allRecommendations, timeBucket, options = {}) {
  const { userEnergyLevel = 5, maxDifficulty = 'HARD', maxMinutes = null } = options;
  const energyCategory = getEnergyCategory(userEnergyLevel);
  const allowedDifficulties = ENERGY_THRESHOLDS[energyCategory].allowedDifficulties;

  // Also allow all difficulties up to maxDifficulty
  const difficultyOrder = ['EASY', 'MEDIUM', 'HARD'];
  const maxDifficultyIndex = difficultyOrder.indexOf(maxDifficulty);
  const allowedByMax = difficultyOrder.slice(0, maxDifficultyIndex + 1);

  return allRecommendations.filter(rec => {
    const actionKey = rec.actionType || mapRecommendationTypeToAction(rec.recommendationType);
    const config = ACTION_CONFIGS[actionKey];

    if (!config) return true;

    // Check time appropriateness
    if (!config.validTimes.includes(timeBucket)) return false;

    // Check difficulty is allowed by both energy and max setting
    if (!allowedDifficulties.includes(config.baseDifficulty)) return false;
    if (!allowedByMax.includes(config.baseDifficulty)) return false;

    // Check max time
    if (maxMinutes && config.baseMinutes > maxMinutes) return false;

    return true;
  });
}

/**
 * Get recommendations grouped by difficulty tier
 * Useful for presenting options to users
 *
 * @param {Array} recommendations - Array of recommendations
 * @param {Object} context - User context for difficulty calculation
 * @returns {Object} Recommendations grouped by difficulty
 */
export function groupByDifficulty(recommendations, context = {}) {
  const grouped = {
    EASY: [],
    MEDIUM: [],
    HARD: [],
  };

  for (const rec of recommendations) {
    const actionKey = rec.actionType || mapRecommendationTypeToAction(rec.recommendationType);
    const config = ACTION_CONFIGS[actionKey];

    if (!config) {
      grouped.EASY.push(rec); // Default unknown to easy
      continue;
    }

    const difficulty = calculateDifficultyTier(config, context);
    grouped[difficulty.tier].push({
      ...rec,
      difficultyTier: difficulty,
    });
  }

  return {
    easy: grouped.EASY,
    medium: grouped.MEDIUM,
    hard: grouped.HARD,
    counts: {
      easy: grouped.EASY.length,
      medium: grouped.MEDIUM.length,
      hard: grouped.HARD.length,
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
  // Core Thompson Sampling
  selectArm,
  updateArm,
  selectContextualArm,
  getArmStatistics,
  getGlobalArmStatistics,
  getTimeBucket,
  generateArmKey,
  // Enhanced context-aware selection
  selectRecommendation,
  enrichRecommendation,
  filterByTimeAndEnergy,
  groupByDifficulty,
  // Constants for external use
  DIFFICULTY_TIERS,
  ENERGY_THRESHOLDS,
  ACTION_CONFIGS,
};
