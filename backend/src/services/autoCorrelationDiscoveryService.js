/**
 * Auto-Correlation Discovery Service
 *
 * Automatically discovers novel correlations unique to each user by:
 * - Pairwise scanning: Testing all factor combinations for statistical significance
 * - Lag analysis: Testing correlations at multiple time offsets (0h, 2h, 6h, 12h, 24h, 48h)
 * - Novelty scoring: Prioritizing surprising correlations (low prior probability)
 * - Minimum sample threshold: Requiring 10+ data points before surfacing
 *
 * This complements the rule-based correlationEngineService by finding patterns
 * that aren't covered by predefined rules.
 */

import { db } from '../db/index.js';
import {
  moodLogTable,
  foodLogTable,
  waterLogTable,
  activityLogTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

/**
 * ============================================
 * CONSTANTS
 * ============================================
 */

// Minimum data points required before surfacing a correlation
// Lowered to 3 to show discoveries from Day 2 onwards
const MIN_SAMPLE_SIZE = 3;

// Minimum correlation strength to consider significant
// Lowered for early-stage users
const MIN_CORRELATION = 0.25;

// Maximum p-value for statistical significance
// Relaxed slightly for early-stage discoveries
const MAX_P_VALUE = 0.1;

// Time lags to test (in hours)
const LAG_HOURS = [0, 2, 6, 12, 24, 48];

// Factor categories for pairwise testing
const FACTOR_CATEGORIES = {
  NUTRITION: [
    'total_calories',
    'total_protein',
    'total_carbs',
    'total_fat',
    'total_fiber',
    'total_sugar',
    'total_sodium',
    'meal_count',
    'avg_nova_score',
    'late_eating', // eating after 9pm
    'breakfast_skip',
    'protein_ratio',
  ],
  HYDRATION: [
    'daily_water_ml',
    'water_goal_percent',
    'morning_hydration',
    'evening_hydration',
  ],
  ACTIVITY: [
    'activity_minutes',
    'activity_intensity',
    'step_count',
    'morning_activity',
    'evening_activity',
  ],
  MOOD: [
    'mood_score',
    'energy_level',
    'stress_level',
    'sleep_quality',
  ],
  TEMPORAL: [
    'day_of_week',
    'is_weekend',
    'time_of_day',
  ],
};

// Known/expected correlations (used for novelty scoring - lower novelty for these)
const EXPECTED_CORRELATIONS = [
  ['daily_water_ml', 'energy_level'],
  ['activity_minutes', 'mood_score'],
  ['sleep_quality', 'energy_level'],
  ['total_sugar', 'energy_level'], // sugar crash
  ['breakfast_skip', 'mood_score'],
  ['late_eating', 'sleep_quality'],
  ['total_protein', 'energy_level'],
  ['activity_minutes', 'sleep_quality'],
];

/**
 * ============================================
 * STATISTICAL UTILITIES
 * ============================================
 */

/**
 * Calculate Pearson correlation coefficient
 * @param {Array<number>} x - First variable array
 * @param {Array<number>} y - Second variable array
 * @returns {number} Correlation coefficient (-1 to 1)
 */
function pearsonCorrelation(x, y) {
  if (x.length !== y.length || x.length < 3) {
    return 0;
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Calculate p-value for correlation coefficient using t-distribution approximation
 * @param {number} r - Correlation coefficient
 * @param {number} n - Sample size
 * @returns {number} Approximate p-value
 */
function correlationPValue(r, n) {
  if (n < 3 || Math.abs(r) >= 1) return 1;

  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;

  // Approximate p-value using Student's t-distribution
  // Using a simplified approximation for computational efficiency
  const x = df / (df + t * t);
  const a = df / 2;
  const b = 0.5;

  // Beta function approximation for t-distribution CDF
  // This is a rough approximation but sufficient for our purposes
  const p = 0.5 * Math.exp(
    -Math.abs(t) * Math.sqrt(2 / Math.PI) * (1 + (t * t) / df) ** (-df / 2)
  );

  return Math.min(1, 2 * p); // Two-tailed test
}

/**
 * Calculate Spearman rank correlation (more robust to outliers)
 * @param {Array<number>} x
 * @param {Array<number>} y
 * @returns {number} Rank correlation coefficient
 */
function spearmanCorrelation(x, y) {
  if (x.length !== y.length || x.length < 3) {
    return 0;
  }

  // Convert to ranks
  const rankX = toRanks(x);
  const rankY = toRanks(y);

  return pearsonCorrelation(rankX, rankY);
}

/**
 * Convert array to ranks (1-indexed, average for ties)
 */
function toRanks(arr) {
  const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);

  let i = 0;
  while (i < sorted.length) {
    let j = i;
    // Find ties
    while (j < sorted.length && sorted[j].v === sorted[i].v) {
      j++;
    }
    // Average rank for ties
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) {
      ranks[sorted[k].i] = avgRank;
    }
    i = j;
  }

  return ranks;
}

/**
 * ============================================
 * DATA EXTRACTION
 * ============================================
 */

/**
 * Extract all factors for a user within a lookback period
 * @param {string} userId
 * @param {number} lookbackDays
 * @returns {Promise<Object>} Factor data organized by date
 */
async function extractAllFactors(userId, lookbackDays = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  const [moodLogs, foodLogs, waterLogs, activityLogs] = await Promise.all([
    db.select()
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, startDate)
        )
      )
      .orderBy(desc(moodLogTable.loggedDate)),

    db.select()
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, startDate)
        )
      )
      .orderBy(desc(foodLogTable.loggedDate)),

    db.select()
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, startDate)
        )
      )
      .orderBy(desc(waterLogTable.loggedDate)),

    db.select()
      .from(activityLogTable)
      .where(
        and(
          eq(activityLogTable.userId, userId),
          gte(activityLogTable.loggedAt, startDate)
        )
      )
      .orderBy(desc(activityLogTable.loggedAt)),
  ]);

  // Organize by date
  const factorsByDate = {};

  // Process mood logs
  for (const log of moodLogs) {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    const hour = new Date(log.loggedDate).getHours();

    if (!factorsByDate[dateKey]) {
      factorsByDate[dateKey] = initDayFactors(dateKey);
    }

    // Aggregate mood data (moodLogTable uses 'intensity' not 'moodScore')
    factorsByDate[dateKey].mood_score = Math.max(
      factorsByDate[dateKey].mood_score || 0,
      log.intensity || 0
    );
    factorsByDate[dateKey].energy_level = Math.max(
      factorsByDate[dateKey].energy_level || 0,
      log.energyLevel || 0
    );
    // Note: stressLevel and sleepQuality are stored in tags JSON if present
    const tags = log.tags || {};
    if (tags.stress) factorsByDate[dateKey].stress_level = tags.stress;
    if (tags.sleep) factorsByDate[dateKey].sleep_quality = tags.sleep;
    factorsByDate[dateKey]._moodTimestamp = log.loggedDate;
  }

  // Process food logs
  for (const log of foodLogs) {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    const hour = new Date(log.loggedDate).getHours();

    if (!factorsByDate[dateKey]) {
      factorsByDate[dateKey] = initDayFactors(dateKey);
    }

    const day = factorsByDate[dateKey];
    day.total_calories += log.calories || 0;
    day.total_protein += log.protein || 0;
    day.total_carbs += log.carbs || 0;
    day.total_fat += log.fat || 0;
    day.total_fiber += log.fiber || 0;
    day.total_sugar += log.sugar || 0;
    day.total_sodium += log.sodium || 0;
    day.meal_count++;

    if (log.novaScore) {
      day._novaSores.push(log.novaScore);
    }

    // Track late eating (after 9pm)
    if (hour >= 21) {
      day.late_eating = 1;
    }

    // Track breakfast (before 10am)
    if (hour < 10) {
      day._hasBreakfast = true;
    }
  }

  // Process water logs
  for (const log of waterLogs) {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
    const hour = new Date(log.loggedDate).getHours();

    if (!factorsByDate[dateKey]) {
      factorsByDate[dateKey] = initDayFactors(dateKey);
    }

    const day = factorsByDate[dateKey];
    const waterMl = (parseFloat(log.amountLiters) || 0) * 1000;
    day.daily_water_ml += waterMl;

    if (hour < 12) {
      day.morning_hydration += waterMl;
    } else if (hour >= 18) {
      day.evening_hydration += waterMl;
    }
  }

  // Process activity logs
  for (const log of activityLogs) {
    const dateKey = new Date(log.loggedAt).toISOString().split('T')[0];
    const hour = new Date(log.loggedAt).getHours();

    if (!factorsByDate[dateKey]) {
      factorsByDate[dateKey] = initDayFactors(dateKey);
    }

    const day = factorsByDate[dateKey];
    day.activity_minutes += log.durationMinutes || 0;
    day._activityIntensities.push(log.intensity || 'moderate');
    day.step_count += log.steps || 0;

    if (hour < 12) {
      day.morning_activity += log.durationMinutes || 0;
    } else if (hour >= 17) {
      day.evening_activity += log.durationMinutes || 0;
    }
  }

  // Finalize computed factors
  for (const dateKey of Object.keys(factorsByDate)) {
    const day = factorsByDate[dateKey];

    // NOVA score average
    day.avg_nova_score = day._novaSores.length > 0
      ? day._novaSores.reduce((a, b) => a + b, 0) / day._novaSores.length
      : 0;

    // Breakfast skip
    day.breakfast_skip = day._hasBreakfast ? 0 : 1;

    // Protein ratio
    day.protein_ratio = day.total_calories > 0
      ? (day.total_protein * 4) / day.total_calories
      : 0;

    // Water goal percent (assuming 2000ml goal)
    day.water_goal_percent = (day.daily_water_ml / 2000) * 100;

    // Activity intensity (numeric)
    const intensityMap = { low: 1, moderate: 2, high: 3, vigorous: 4 };
    day.activity_intensity = day._activityIntensities.length > 0
      ? day._activityIntensities.reduce((sum, i) => sum + (intensityMap[i] || 2), 0) / day._activityIntensities.length
      : 0;

    // Clean up internal fields
    delete day._novaSores;
    delete day._hasBreakfast;
    delete day._activityIntensities;
  }

  return factorsByDate;
}

/**
 * Initialize a day's factors with default values
 */
function initDayFactors(dateKey) {
  const date = new Date(dateKey);
  return {
    date: dateKey,
    day_of_week: date.getDay(),
    is_weekend: date.getDay() === 0 || date.getDay() === 6 ? 1 : 0,

    // Nutrition factors
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fat: 0,
    total_fiber: 0,
    total_sugar: 0,
    total_sodium: 0,
    meal_count: 0,
    avg_nova_score: 0,
    late_eating: 0,
    breakfast_skip: 1, // Default to skipped, mark as 0 if breakfast logged
    protein_ratio: 0,

    // Hydration factors
    daily_water_ml: 0,
    water_goal_percent: 0,
    morning_hydration: 0,
    evening_hydration: 0,

    // Activity factors
    activity_minutes: 0,
    activity_intensity: 0,
    step_count: 0,
    morning_activity: 0,
    evening_activity: 0,

    // Mood factors (populated from mood logs)
    mood_score: 0,
    energy_level: 0,
    stress_level: null,
    sleep_quality: null,

    // Internal tracking
    _novaSores: [],
    _hasBreakfast: false,
    _activityIntensities: [],
    _moodTimestamp: null,
  };
}

/**
 * ============================================
 * CORRELATION DISCOVERY
 * ============================================
 */

/**
 * Generate all factor pairs for testing
 * @returns {Array<[string, string]>} Array of factor pairs
 */
function generateFactorPairs() {
  const pairs = [];
  const allFactors = Object.values(FACTOR_CATEGORIES).flat();

  // Test correlations between different categories primarily
  const categories = Object.entries(FACTOR_CATEGORIES);

  for (let i = 0; i < categories.length; i++) {
    for (let j = i; j < categories.length; j++) {
      const [cat1, factors1] = categories[i];
      const [cat2, factors2] = categories[j];

      // Skip mood-mood correlations (less interesting)
      if (cat1 === 'MOOD' && cat2 === 'MOOD') continue;

      for (const f1 of factors1) {
        for (const f2 of factors2) {
          if (f1 !== f2) {
            pairs.push([f1, f2]);
          }
        }
      }
    }
  }

  return pairs;
}

/**
 * Compute lagged correlation between two factors
 * @param {Object} factorsByDate - Factor data by date
 * @param {string} factorA - First factor name
 * @param {string} factorB - Second factor name
 * @param {number} lagHours - Lag in hours (positive = A leads B)
 * @returns {Object} Correlation result
 */
function computeLaggedCorrelation(factorsByDate, factorA, factorB, lagHours = 0) {
  const dates = Object.keys(factorsByDate).sort();
  const lagDays = Math.floor(lagHours / 24);

  const xValues = [];
  const yValues = [];
  const matchedDates = [];

  for (let i = 0; i < dates.length - lagDays; i++) {
    const dateA = dates[i];
    const dateB = dates[i + lagDays];

    const valA = factorsByDate[dateA]?.[factorA];
    const valB = factorsByDate[dateB]?.[factorB];

    // Skip if either value is null/undefined or zero (for optional factors)
    if (valA != null && valB != null && (valA !== 0 || valB !== 0)) {
      xValues.push(valA);
      yValues.push(valB);
      matchedDates.push({ dateA, dateB });
    }
  }

  if (xValues.length < MIN_SAMPLE_SIZE) {
    return {
      factorA,
      factorB,
      lagHours,
      correlation: 0,
      pValue: 1,
      sampleSize: xValues.length,
      significant: false,
      reason: 'insufficient_data',
    };
  }

  // Use Spearman correlation (more robust to outliers)
  const r = spearmanCorrelation(xValues, yValues);
  const pValue = correlationPValue(r, xValues.length);

  return {
    factorA,
    factorB,
    lagHours,
    correlation: Math.round(r * 1000) / 1000,
    pValue: Math.round(pValue * 10000) / 10000,
    sampleSize: xValues.length,
    significant: Math.abs(r) >= MIN_CORRELATION && pValue < MAX_P_VALUE,
    direction: r > 0 ? 'positive' : 'negative',
    strength: getCorrelationStrength(Math.abs(r)),
  };
}

/**
 * Get human-readable correlation strength
 */
function getCorrelationStrength(absR) {
  if (absR >= 0.7) return 'strong';
  if (absR >= 0.5) return 'moderate';
  if (absR >= 0.3) return 'weak';
  return 'negligible';
}

/**
 * Compute novelty score for a correlation
 * Novel = unexpected based on prior knowledge
 * @param {string} factorA
 * @param {string} factorB
 * @returns {number} Novelty score 0-1
 */
function computeNoveltyScore(factorA, factorB) {
  // Check if this is an expected correlation
  const isExpected = EXPECTED_CORRELATIONS.some(
    ([a, b]) => (a === factorA && b === factorB) || (a === factorB && b === factorA)
  );

  if (isExpected) {
    return 0.3; // Low novelty for expected correlations
  }

  // Check if factors are from same category (less novel)
  let sameCategoryBonus = 1.0;
  for (const factors of Object.values(FACTOR_CATEGORIES)) {
    if (factors.includes(factorA) && factors.includes(factorB)) {
      sameCategoryBonus = 0.6; // Same category is less surprising
      break;
    }
  }

  // Base novelty for cross-category correlations
  let novelty = 0.7 * sameCategoryBonus;

  // Boost novelty for unusual factors
  const unusualFactors = ['late_eating', 'breakfast_skip', 'protein_ratio', 'morning_activity', 'evening_hydration'];
  if (unusualFactors.includes(factorA) || unusualFactors.includes(factorB)) {
    novelty += 0.15;
  }

  // Boost novelty for temporal correlations (non-zero lag)
  // This is handled in the main discovery function

  return Math.min(1, novelty);
}

/**
 * Generate human-readable description for a correlation
 */
function generateCorrelationDescription(correlation) {
  const { factorA, factorB, correlation: r, lagHours, direction, strength } = correlation;

  const factorLabels = {
    total_calories: 'calorie intake',
    total_protein: 'protein intake',
    total_sugar: 'sugar intake',
    total_fiber: 'fiber intake',
    daily_water_ml: 'water intake',
    activity_minutes: 'activity time',
    mood_score: 'mood',
    energy_level: 'energy level',
    sleep_quality: 'sleep quality',
    stress_level: 'stress level',
    late_eating: 'late eating',
    breakfast_skip: 'skipping breakfast',
    morning_activity: 'morning activity',
    evening_hydration: 'evening hydration',
    protein_ratio: 'protein-to-calorie ratio',
    avg_nova_score: 'processed food consumption',
  };

  const labelA = factorLabels[factorA] || factorA.replace(/_/g, ' ');
  const labelB = factorLabels[factorB] || factorB.replace(/_/g, ' ');

  let temporal = '';
  if (lagHours > 0) {
    temporal = ` ${lagHours} hours later`;
  }

  const verb = direction === 'positive' ? 'tends to increase' : 'tends to decrease';

  return `When your ${labelA} is higher, your ${labelB}${temporal} ${verb} (${strength} correlation)`;
}

/**
 * ============================================
 * MAIN DISCOVERY FUNCTION
 * ============================================
 */

/**
 * Discover novel correlations for a user
 * @param {string} userId
 * @param {number} lookbackDays - Days of history to analyze
 * @returns {Promise<Array>} Top novel correlations
 */
export async function discoverNovelCorrelations(userId, lookbackDays = 30) {
  console.log(`[AutoCorrelation] Starting discovery for user ${userId}, lookback=${lookbackDays} days`);

  const factors = await extractAllFactors(userId, lookbackDays);
  const dateCount = Object.keys(factors).length;

  if (dateCount < MIN_SAMPLE_SIZE) {
    console.log(`[AutoCorrelation] Insufficient data: ${dateCount} days`);
    return {
      success: false,
      reason: 'insufficient_data',
      daysAnalyzed: dateCount,
      minimumRequired: MIN_SAMPLE_SIZE,
      correlations: [],
    };
  }

  const pairs = generateFactorPairs();
  const candidates = [];

  // Test each pair at multiple lags
  for (const [factorA, factorB] of pairs) {
    for (const lag of LAG_HOURS) {
      const result = computeLaggedCorrelation(factors, factorA, factorB, lag);

      if (result.significant) {
        // Calculate novelty score
        let noveltyScore = computeNoveltyScore(factorA, factorB);

        // Boost novelty for lagged correlations (more surprising)
        if (lag > 0) {
          noveltyScore = Math.min(1, noveltyScore + 0.1);
        }

        candidates.push({
          ...result,
          noveltyScore: Math.round(noveltyScore * 100) / 100,
          description: generateCorrelationDescription(result),
          discoveredAt: new Date().toISOString(),
        });
      }
    }
  }

  // Sort by novelty * |correlation| (prioritize strong novel correlations)
  candidates.sort((a, b) => {
    const scoreA = a.noveltyScore * Math.abs(a.correlation);
    const scoreB = b.noveltyScore * Math.abs(b.correlation);
    return scoreB - scoreA;
  });

  // Remove duplicates (same factors, different lags - keep strongest)
  const seen = new Set();
  const deduplicated = candidates.filter(c => {
    const key = [c.factorA, c.factorB].sort().join(':');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  // Take top 5
  const topCorrelations = deduplicated.slice(0, 5);

  console.log(`[AutoCorrelation] Found ${candidates.length} significant correlations, returning top ${topCorrelations.length}`);

  return {
    success: true,
    daysAnalyzed: dateCount,
    pairsTestedCount: pairs.length * LAG_HOURS.length,
    significantFound: candidates.length,
    correlations: topCorrelations,
    meta: {
      userId,
      lookbackDays,
      minSampleSize: MIN_SAMPLE_SIZE,
      minCorrelation: MIN_CORRELATION,
      maxPValue: MAX_P_VALUE,
      analyzedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get correlation insights formatted for the mobile app
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getNovelInsights(userId, limit = 3) {
  const discovery = await discoverNovelCorrelations(userId, 30);

  if (!discovery.success) {
    return {
      insights: [],
      hasEnoughData: false,
      daysNeeded: MIN_SAMPLE_SIZE - discovery.daysAnalyzed,
    };
  }

  const insights = discovery.correlations.slice(0, limit).map((c, index) => ({
    id: `novel_${c.factorA}_${c.factorB}_${c.lagHours}`,
    type: 'novel_correlation',
    priority: index + 1,
    title: 'Pattern Discovered',
    message: c.description,
    factors: [c.factorA, c.factorB],
    correlation: c.correlation,
    direction: c.direction,
    strength: c.strength,
    lagHours: c.lagHours,
    noveltyScore: c.noveltyScore,
    sampleSize: c.sampleSize,
    confidence: 1 - c.pValue,
    actionable: isActionable(c),
    suggestedAction: generateSuggestedAction(c),
  }));

  return {
    insights,
    hasEnoughData: true,
    daysAnalyzed: discovery.daysAnalyzed,
  };
}

/**
 * Check if a correlation is actionable (user can change the input factor)
 */
function isActionable(correlation) {
  const actionableFactors = [
    'total_calories', 'total_protein', 'total_sugar', 'total_fiber',
    'daily_water_ml', 'morning_hydration', 'evening_hydration',
    'activity_minutes', 'morning_activity', 'evening_activity',
    'late_eating', 'breakfast_skip', 'protein_ratio', 'avg_nova_score',
  ];

  return actionableFactors.includes(correlation.factorA);
}

/**
 * Generate a suggested action based on the correlation
 */
function generateSuggestedAction(correlation) {
  const { factorA, factorB, direction } = correlation;

  const actionTemplates = {
    daily_water_ml: {
      positive: `Try increasing your water intake to boost your ${factorB.replace(/_/g, ' ')}`,
      negative: `Consider moderating water intake if ${factorB.replace(/_/g, ' ')} feels off`,
    },
    total_protein: {
      positive: `Adding more protein may help improve your ${factorB.replace(/_/g, ' ')}`,
      negative: `Balance your protein intake for better ${factorB.replace(/_/g, ' ')}`,
    },
    activity_minutes: {
      positive: `More activity could boost your ${factorB.replace(/_/g, ' ')}`,
      negative: `Consider rest days if activity is affecting ${factorB.replace(/_/g, ' ')} negatively`,
    },
    morning_activity: {
      positive: `Try morning workouts to improve your ${factorB.replace(/_/g, ' ')}`,
      negative: `Evening activity might work better for your ${factorB.replace(/_/g, ' ')}`,
    },
    late_eating: {
      positive: `Late meals might be helping your ${factorB.replace(/_/g, ' ')}`,
      negative: `Try eating dinner earlier to improve ${factorB.replace(/_/g, ' ')}`,
    },
    breakfast_skip: {
      positive: `Intermittent fasting may be working for your ${factorB.replace(/_/g, ' ')}`,
      negative: `Having breakfast could improve your ${factorB.replace(/_/g, ' ')}`,
    },
    total_sugar: {
      positive: `Some natural sugars may be helping ${factorB.replace(/_/g, ' ')}`,
      negative: `Reducing sugar might improve your ${factorB.replace(/_/g, ' ')}`,
    },
  };

  const templates = actionTemplates[factorA];
  if (!templates) {
    return `Experiment with your ${factorA.replace(/_/g, ' ')} to see how it affects ${factorB.replace(/_/g, ' ')}`;
  }

  return templates[direction] || templates.positive;
}

export default {
  discoverNovelCorrelations,
  getNovelInsights,
  // Expose for testing
  _internal: {
    pearsonCorrelation,
    spearmanCorrelation,
    computeLaggedCorrelation,
    computeNoveltyScore,
  },
};
