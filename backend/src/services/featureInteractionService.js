/**
 * Feature Interaction Service
 *
 * Discovers synergistic and antagonistic interaction effects between health features.
 * Enables findings like "protein + hydration = 2x better mood than each alone".
 *
 * Key Features:
 * - Factorial ANOVA-style interaction detection
 * - Cohen's d effect size calculation
 * - Synergy vs antagonism classification
 * - Practical significance filtering
 * - User-specific interaction profiles
 *
 * Statistical Foundation:
 * - Interaction effect: Effect(A∩B) - Effect(A) - Effect(B)
 * - Synergistic: Interaction > 0 (combined effect exceeds sum of parts)
 * - Antagonistic: Interaction < 0 (combined effect less than sum of parts)
 * - Additive: Interaction ≈ 0 (no interaction)
 *
 * References:
 * - Cohen (1988): Statistical Power Analysis
 * - Field (2013): Discovering Statistics Using SPSS - Factorial ANOVA
 */

import { db } from '../db/index.js';
import {
  featureInteractionsTable,
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

// Statistical thresholds
const SIGNIFICANCE_LEVEL = 0.05;
const MIN_SAMPLE_SIZE_PER_CELL = 5; // Minimum observations per condition
const MIN_PRACTICAL_EFFECT = 0.2;   // Cohen's d threshold for practical significance

// Feature definitions (binary features derived from continuous signals)
const BINARY_FEATURES = {
  high_protein: {
    source: 'food',
    condition: (log) => (parseInt(log.protein) || 0) >= 25, // 25g+ per meal
    description: 'High protein meal',
  },
  high_sugar: {
    source: 'food',
    condition: (log) => {
      const sugar = log.micros?.sugar || 0;
      return sugar >= 20;
    },
    description: 'High sugar content',
  },
  high_nova: {
    source: 'food',
    condition: (log) => (parseInt(log.novaScore) || 0) >= 3,
    description: 'Ultra-processed food',
  },
  high_fiber: {
    source: 'food',
    condition: (log) => {
      const fiber = log.micros?.fiber || 0;
      return fiber >= 5;
    },
    description: 'High fiber meal',
  },
  well_hydrated: {
    source: 'water',
    condition: (dailyTotal, goal) => dailyTotal >= goal * 0.8, // 80%+ of goal
    description: 'Good hydration',
  },
  adequate_sleep: {
    source: 'mood',
    condition: (log) => log.tags?.sleep === 'good',
    description: 'Good sleep quality',
  },
  exercised: {
    source: 'mood',
    condition: (log) => log.tags?.exercise && log.tags.exercise !== 'none',
    description: 'Physical activity',
  },
  low_stress: {
    source: 'mood',
    condition: (log) => (parseInt(log.tags?.stress) || 5) <= 4,
    description: 'Low stress level',
  },
};

// Target outcomes to analyze
const OUTCOME_METRICS = {
  mood_score: {
    source: 'mood',
    field: 'intensity',
    description: 'Overall mood score',
    higherIsBetter: true,
  },
  energy_level: {
    source: 'mood',
    field: 'energyLevel',
    description: 'Energy level',
    higherIsBetter: true,
  },
};

// Predefined feature pairs to test for interactions
const INTERACTION_PAIRS = [
  { featureA: 'high_protein', featureB: 'well_hydrated', outcome: 'mood_score' },
  { featureA: 'high_protein', featureB: 'well_hydrated', outcome: 'energy_level' },
  { featureA: 'high_protein', featureB: 'exercised', outcome: 'energy_level' },
  { featureA: 'well_hydrated', featureB: 'adequate_sleep', outcome: 'energy_level' },
  { featureA: 'high_fiber', featureB: 'well_hydrated', outcome: 'mood_score' },
  { featureA: 'low_stress', featureB: 'adequate_sleep', outcome: 'mood_score' },
  { featureA: 'high_sugar', featureB: 'high_nova', outcome: 'mood_score' },
  { featureA: 'high_protein', featureB: 'low_stress', outcome: 'energy_level' },
];

/**
 * ============================================
 * STATISTICAL UTILITIES
 * ============================================
 */

/**
 * Calculate mean of array
 */
function mean(values) {
  if (!values || values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate sample variance
 */
function variance(values) {
  if (!values || values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / (values.length - 1);
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values) {
  return Math.sqrt(variance(values));
}

/**
 * Calculate pooled standard deviation
 */
function pooledStd(groups) {
  let numerator = 0;
  let denominator = 0;

  for (const group of groups) {
    if (group.length >= 2) {
      numerator += (group.length - 1) * variance(group);
      denominator += group.length - 1;
    }
  }

  return denominator > 0 ? Math.sqrt(numerator / denominator) : 0;
}

/**
 * Calculate Cohen's d effect size
 *
 * @param {number} mean1 - Mean of group 1
 * @param {number} mean2 - Mean of group 2
 * @param {number} pooledStd - Pooled standard deviation
 * @returns {number}
 */
function cohenD(mean1, mean2, pooledStd) {
  if (pooledStd === 0) return 0;
  return (mean1 - mean2) / pooledStd;
}

/**
 * Interpret Cohen's d
 */
function interpretCohenD(d) {
  const absD = Math.abs(d);
  if (absD < 0.2) return 'negligible';
  if (absD < 0.5) return 'small';
  if (absD < 0.8) return 'medium';
  return 'large';
}

/**
 * Two-sample t-test
 *
 * @param {Array} sample1
 * @param {Array} sample2
 * @returns {Object}
 */
function tTest(sample1, sample2) {
  const n1 = sample1.length;
  const n2 = sample2.length;

  if (n1 < 2 || n2 < 2) {
    return { valid: false, pValue: 1 };
  }

  const m1 = mean(sample1);
  const m2 = mean(sample2);
  const v1 = variance(sample1);
  const v2 = variance(sample2);

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) return { valid: false, pValue: 1 };

  const t = (m1 - m2) / se;

  // Welch-Satterthwaite df
  const df = Math.pow(v1 / n1 + v2 / n2, 2) /
    (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));

  // p-value (normal approximation for df > 30)
  const pValue = 2 * (1 - normalCDF(Math.abs(t)));

  return {
    valid: true,
    tStatistic: t,
    pValue,
    degreesOfFreedom: df,
    meanDifference: m1 - m2,
  };
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
 * ============================================
 * DATA EXTRACTION
 * ============================================
 */

/**
 * Extract daily feature status for a user
 *
 * @param {string} userId
 * @param {number} days
 * @returns {Promise<Object>} Map of day -> feature status
 */
async function extractDailyFeatures(userId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Fetch all relevant logs
  const [foodLogs, moodLogs, waterLogs] = await Promise.all([
    db.select().from(foodLogTable)
      .where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, since))),
    db.select().from(moodLogTable)
      .where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, since))),
    db.select().from(waterLogTable)
      .where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, since))),
  ]);

  // Group by day
  const dailyData = {};

  // Process food logs
  for (const log of foodLogs) {
    const day = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!dailyData[day]) {
      dailyData[day] = { food: [], mood: [], water: [], waterTotal: 0 };
    }
    dailyData[day].food.push(log);
  }

  // Process mood logs
  for (const log of moodLogs) {
    const day = log.dayKey || new Date(log.loggedDate).toISOString().split('T')[0];
    if (!dailyData[day]) {
      dailyData[day] = { food: [], mood: [], water: [], waterTotal: 0 };
    }
    dailyData[day].mood.push(log);
  }

  // Process water logs
  for (const log of waterLogs) {
    const day = new Date(log.loggedDate).toISOString().split('T')[0];
    if (!dailyData[day]) {
      dailyData[day] = { food: [], mood: [], water: [], waterTotal: 0 };
    }
    dailyData[day].water.push(log);
    dailyData[day].waterTotal += parseFloat(log.hydrationLiters) || 0;
  }

  // Calculate feature status for each day
  const hydrationGoal = 3.0; // Default goal

  for (const day of Object.keys(dailyData)) {
    const data = dailyData[day];
    data.features = {};

    // Food-based features (any meal that day)
    for (const [feature, config] of Object.entries(BINARY_FEATURES)) {
      if (config.source === 'food') {
        data.features[feature] = data.food.some(log => config.condition(log));
      } else if (config.source === 'water') {
        data.features[feature] = config.condition(data.waterTotal, hydrationGoal);
      } else if (config.source === 'mood') {
        data.features[feature] = data.mood.some(log => config.condition(log));
      }
    }

    // Calculate outcome metrics (average for the day)
    data.outcomes = {};
    for (const [outcome, config] of Object.entries(OUTCOME_METRICS)) {
      if (config.source === 'mood' && data.mood.length > 0) {
        const values = data.mood
          .map(log => parseFloat(log[config.field]))
          .filter(v => !isNaN(v));
        data.outcomes[outcome] = values.length > 0 ? mean(values) : null;
      }
    }
  }

  return dailyData;
}

/**
 * ============================================
 * INTERACTION ANALYSIS
 * ============================================
 */

/**
 * Analyze interaction effect between two features
 *
 * @param {string} userId
 * @param {string} featureA
 * @param {string} featureB
 * @param {string} targetOutcome
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function analyzeInteraction(userId, featureA, featureB, targetOutcome, options = {}) {
  const { days = 30 } = options;

  try {
    console.log(`[Feature Interaction] Analyzing ${featureA} × ${featureB} → ${targetOutcome} for user ${userId}`);

    // Get daily data
    const dailyData = await extractDailyFeatures(userId, days);

    // Create 2x2 factorial design groups
    const groups = {
      neither: [],    // A=0, B=0
      onlyA: [],      // A=1, B=0
      onlyB: [],      // A=0, B=1
      both: [],       // A=1, B=1
    };

    for (const [day, data] of Object.entries(dailyData)) {
      const outcome = data.outcomes[targetOutcome];
      if (outcome === null || outcome === undefined) continue;

      const hasA = data.features[featureA];
      const hasB = data.features[featureB];

      if (hasA && hasB) {
        groups.both.push(outcome);
      } else if (hasA && !hasB) {
        groups.onlyA.push(outcome);
      } else if (!hasA && hasB) {
        groups.onlyB.push(outcome);
      } else {
        groups.neither.push(outcome);
      }
    }

    // Check minimum sample sizes
    const cellSizes = {
      neither: groups.neither.length,
      onlyA: groups.onlyA.length,
      onlyB: groups.onlyB.length,
      both: groups.both.length,
    };

    const totalN = Object.values(cellSizes).reduce((a, b) => a + b, 0);

    if (Object.values(cellSizes).some(n => n < MIN_SAMPLE_SIZE_PER_CELL)) {
      return {
        valid: false,
        error: 'Insufficient data in one or more conditions',
        cellSizes,
        minRequired: MIN_SAMPLE_SIZE_PER_CELL,
      };
    }

    // Calculate cell means
    const means = {
      neither: mean(groups.neither),
      onlyA: mean(groups.onlyA),
      onlyB: mean(groups.onlyB),
      both: mean(groups.both),
    };

    // Calculate main effects
    const effectA = (means.onlyA + means.both) / 2 - (means.neither + means.onlyB) / 2;
    const effectB = (means.onlyB + means.both) / 2 - (means.neither + means.onlyA) / 2;

    // Calculate interaction effect
    // Interaction = (Both - Neither) - (OnlyA - Neither) - (OnlyB - Neither)
    // Simplified: Interaction = Both - OnlyA - OnlyB + Neither
    const interactionEffect = means.both - means.onlyA - means.onlyB + means.neither;

    // Calculate pooled standard deviation
    const allGroups = [groups.neither, groups.onlyA, groups.onlyB, groups.both];
    const pooledSD = pooledStd(allGroups);

    // Calculate effect sizes
    const effectSizeA = cohenD(
      (means.onlyA + means.both) / 2,
      (means.neither + means.onlyB) / 2,
      pooledSD
    );

    const effectSizeB = cohenD(
      (means.onlyB + means.both) / 2,
      (means.neither + means.onlyA) / 2,
      pooledSD
    );

    const interactionCohenD = pooledSD > 0 ? interactionEffect / pooledSD : 0;

    // Test significance of interaction
    // Compare "both" vs expected additive effect
    const expectedAdditive = means.neither + effectA + effectB;
    const observedBoth = means.both;

    // Create pseudo-groups for t-test on interaction
    const interactionTest = tTest(
      groups.both,
      groups.onlyA.concat(groups.onlyB).map((_, i, arr) => {
        // Approximate: expected value if additive
        return means.neither + effectA + effectB;
      })
    );

    // Determine interaction type
    let interactionType = 'additive';
    if (Math.abs(interactionCohenD) >= MIN_PRACTICAL_EFFECT) {
      interactionType = interactionEffect > 0 ? 'synergistic' : 'antagonistic';
    }

    // Calculate confidence interval for interaction
    const seBoth = standardDeviation(groups.both) / Math.sqrt(groups.both.length);
    const ciWidth = 1.96 * seBoth * 2; // Approximate

    const result = {
      valid: true,
      userId,
      featureA,
      featureB,
      targetOutcome,

      // Sample sizes
      cellSizes,
      totalSampleSize: totalN,

      // Cell means
      means,

      // Main effects
      effectA: {
        value: effectA,
        cohenD: effectSizeA,
        interpretation: interpretCohenD(effectSizeA),
      },
      effectB: {
        value: effectB,
        cohenD: effectSizeB,
        interpretation: interpretCohenD(effectSizeB),
      },

      // Interaction effect
      interaction: {
        value: interactionEffect,
        cohenD: interactionCohenD,
        type: interactionType,
        interpretation: interpretCohenD(interactionCohenD),
        isPracticallySignificant: Math.abs(interactionCohenD) >= MIN_PRACTICAL_EFFECT,
        expectedAdditive,
        observedCombined: observedBoth,
        synergy: observedBoth - expectedAdditive,
      },

      // Statistical significance
      pValue: interactionTest.pValue,
      isStatisticallySignificant: interactionTest.pValue < SIGNIFICANCE_LEVEL,

      // Human-readable interpretation
      interpretation: generateInteractionInterpretation(
        featureA, featureB, targetOutcome,
        interactionType, interactionEffect, means
      ),
    };

    // Save if significant
    if (result.interaction.isPracticallySignificant) {
      await saveFeatureInteraction(result);
    }

    return result;
  } catch (error) {
    console.error('[Feature Interaction] Error analyzing interaction:', error);
    throw error;
  }
}

/**
 * Generate human-readable interpretation
 */
function generateInteractionInterpretation(featureA, featureB, outcome, type, effect, means) {
  const featureADesc = BINARY_FEATURES[featureA]?.description || featureA;
  const featureBDesc = BINARY_FEATURES[featureB]?.description || featureB;
  const outcomeDesc = OUTCOME_METRICS[outcome]?.description || outcome;

  if (type === 'additive') {
    return {
      summary: `${featureADesc} and ${featureBDesc} have independent effects on ${outcomeDesc}.`,
      recommendation: 'Both factors help, but don\'t amplify each other.',
      actionable: true,
    };
  }

  if (type === 'synergistic') {
    const boost = ((means.both - means.neither) / means.neither * 100).toFixed(0);
    return {
      summary: `${featureADesc} and ${featureBDesc} together boost ${outcomeDesc} more than expected! Combined effect is ${boost}% better than baseline.`,
      recommendation: `Prioritize combining ${featureADesc.toLowerCase()} with ${featureBDesc.toLowerCase()} for maximum benefit.`,
      actionable: true,
      highlight: true,
    };
  }

  // Antagonistic
  return {
    summary: `${featureADesc} and ${featureBDesc} partially cancel each other's effects on ${outcomeDesc}.`,
    recommendation: `Consider separating ${featureADesc.toLowerCase()} and ${featureBDesc.toLowerCase()} for better results.`,
    actionable: true,
    warning: true,
  };
}

/**
 * Save feature interaction to database
 */
async function saveFeatureInteraction(result) {
  try {
    const existing = await db
      .select()
      .from(featureInteractionsTable)
      .where(
        and(
          eq(featureInteractionsTable.userId, result.userId),
          eq(featureInteractionsTable.featureA, result.featureA),
          eq(featureInteractionsTable.featureB, result.featureB),
          eq(featureInteractionsTable.targetOutcome, result.targetOutcome)
        )
      )
      .limit(1);

    const data = {
      userId: result.userId,
      featureA: result.featureA,
      featureB: result.featureB,
      targetOutcome: result.targetOutcome,
      effectA: result.effectA.value,
      effectB: result.effectB.value,
      effectAB: result.means.both - result.means.neither,
      interactionEffect: result.interaction.value,
      interactionType: result.interaction.type,
      interactionPValue: result.pValue,
      interactionConfidenceInterval: {
        lower: result.interaction.value - 0.5, // Approximate
        upper: result.interaction.value + 0.5,
      },
      sampleSizeBothPresent: result.cellSizes.both,
      sampleSizeTotal: result.totalSampleSize,
      cohenD: result.interaction.cohenD,
      isPracticallySignificant: result.interaction.isPracticallySignificant,
      lastComputedAt: new Date(),
      isActive: true,
    };

    if (existing.length > 0) {
      await db
        .update(featureInteractionsTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(featureInteractionsTable.id, existing[0].id));
    } else {
      await db.insert(featureInteractionsTable).values(data);
    }

    console.log(`[Feature Interaction] Saved: ${result.featureA} × ${result.featureB} → ${result.targetOutcome}, type=${result.interaction.type}`);
  } catch (error) {
    console.error('[Feature Interaction] Error saving:', error);
  }
}

/**
 * ============================================
 * BATCH ANALYSIS
 * ============================================
 */

/**
 * Analyze all predefined interaction pairs for a user
 *
 * @param {string} userId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function analyzeAllInteractions(userId, options = {}) {
  const results = {
    userId,
    analyzedAt: new Date().toISOString(),
    synergies: [],
    antagonisms: [],
    additive: [],
    insufficientData: [],
    errors: [],
  };

  for (const pair of INTERACTION_PAIRS) {
    try {
      const result = await analyzeInteraction(
        userId,
        pair.featureA,
        pair.featureB,
        pair.outcome,
        options
      );

      if (!result.valid) {
        results.insufficientData.push({
          ...pair,
          reason: result.error,
          cellSizes: result.cellSizes,
        });
        continue;
      }

      const summary = {
        featureA: pair.featureA,
        featureB: pair.featureB,
        outcome: pair.outcome,
        type: result.interaction.type,
        cohenD: result.interaction.cohenD,
        isPracticallySignificant: result.interaction.isPracticallySignificant,
        interpretation: result.interpretation,
      };

      if (result.interaction.type === 'synergistic') {
        results.synergies.push(summary);
      } else if (result.interaction.type === 'antagonistic') {
        results.antagonisms.push(summary);
      } else {
        results.additive.push(summary);
      }
    } catch (error) {
      results.errors.push({
        pair,
        error: error.message,
      });
    }
  }

  // Sort by effect size
  results.synergies.sort((a, b) => Math.abs(b.cohenD) - Math.abs(a.cohenD));
  results.antagonisms.sort((a, b) => Math.abs(b.cohenD) - Math.abs(a.cohenD));

  console.log(`[Feature Interaction] Analyzed ${INTERACTION_PAIRS.length} pairs for user ${userId}: ${results.synergies.length} synergies, ${results.antagonisms.length} antagonisms`);

  return results;
}

/**
 * Get user's significant feature interactions
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getUserInteractions(userId) {
  try {
    const interactions = await db
      .select()
      .from(featureInteractionsTable)
      .where(
        and(
          eq(featureInteractionsTable.userId, userId),
          eq(featureInteractionsTable.isActive, true),
          eq(featureInteractionsTable.isPracticallySignificant, true)
        )
      )
      .orderBy(desc(sql`ABS(${featureInteractionsTable.cohenD})`));

    return interactions.map(i => ({
      ...i,
      featureADescription: BINARY_FEATURES[i.featureA]?.description,
      featureBDescription: BINARY_FEATURES[i.featureB]?.description,
      outcomeDescription: OUTCOME_METRICS[i.targetOutcome]?.description,
    }));
  } catch (error) {
    console.error('[Feature Interaction] Error fetching user interactions:', error);
    throw error;
  }
}

export default {
  analyzeInteraction,
  analyzeAllInteractions,
  getUserInteractions,
  BINARY_FEATURES,
  OUTCOME_METRICS,
  INTERACTION_PAIRS,
};
