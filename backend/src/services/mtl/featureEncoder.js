/**
 * Feature Encoder Service
 *
 * Transforms raw user-day data into normalized feature vectors for multi-task learning.
 * This is the shared representation layer that all task heads consume.
 *
 * ARCHITECTURE:
 * Raw Data -> Feature Extraction -> Normalization -> Embedding -> Shared Representation
 *
 * FEATURE CATEGORIES:
 * 1. Nutritional features (macros, micros, meal timing)
 * 2. Behavioral features (logging patterns, streaks)
 * 3. Temporal features (day of week, time of day, seasonality)
 * 4. Historical features (rolling averages, trends)
 * 5. Contextual features (activity level, hydration state)
 *
 * DESIGN PRINCIPLES:
 * - All features normalized to [0, 1] or standard normal
 * - Missing values handled with learned defaults, not zeros
 * - Categorical features use embedding lookup
 * - Numerical features use z-score normalization with running statistics
 *
 * References:
 * - Caruana (1997): Multitask Learning
 * - Ruder (2017): An Overview of Multi-Task Learning in Deep Neural Networks
 */

import { db } from '../../db/index.js';
import {
  foodLogTable,
  moodLogTable,
  waterLogTable,
  profilesTable,
  gamificationTable,
  dailyNutritionSummaryTable,
} from '../../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { toDateStr } from '../../utils/timezone.js';

/**
 * ============================================
 * FEATURE CONFIGURATION
 * ============================================
 */

// Feature dimensions
const FEATURE_CONFIG = {
  // Nutritional features (continuous)
  nutrition: {
    calories: { min: 0, max: 4000, default: 2000 },
    protein: { min: 0, max: 300, default: 50 },
    carbs: { min: 0, max: 500, default: 250 },
    fats: { min: 0, max: 200, default: 65 },
    fiber: { min: 0, max: 50, default: 25 },
    sugar: { min: 0, max: 150, default: 50 },
    sodium: { min: 0, max: 5000, default: 2300 },
  },

  // Behavioral features (continuous)
  behavioral: {
    mealsLogged: { min: 0, max: 10, default: 3 },
    waterGlasses: { min: 0, max: 20, default: 8 },
    loggingStreak: { min: 0, max: 365, default: 0 },
    moodLogsCount: { min: 0, max: 10, default: 1 },
  },

  // Temporal features (cyclical encoding)
  temporal: {
    dayOfWeek: { period: 7 },    // 0-6
    hourOfDay: { period: 24 },   // 0-23
    dayOfMonth: { period: 31 },  // 1-31
    monthOfYear: { period: 12 }, // 1-12
  },

  // Categorical features (embedding lookup)
  categorical: {
    activityLevel: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'],
    dietType: ['standard', 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'other'],
    mealType: ['breakfast', 'lunch', 'dinner', 'snack'],
  },
};

// Running statistics for z-score normalization (updated during training)
const runningStats = {
  mean: {},
  std: {},
  count: 0,
};

/**
 * ============================================
 * NORMALIZATION UTILITIES
 * ============================================
 */

/**
 * Min-max normalization to [0, 1]
 * Handles values outside expected range gracefully
 *
 * @param {number} value - Raw value
 * @param {number} min - Expected minimum
 * @param {number} max - Expected maximum
 * @returns {number} Normalized value in [0, 1]
 */
function minMaxNormalize(value, min, max) {
  if (value === null || value === undefined || isNaN(value)) {
    return 0.5; // Default to midpoint for missing values
  }
  // Clip to range then normalize
  const clipped = Math.max(min, Math.min(max, value));
  return (clipped - min) / (max - min);
}

/**
 * Z-score normalization using running statistics
 * Falls back to min-max if insufficient data
 *
 * @param {number} value - Raw value
 * @param {string} featureName - Feature identifier
 * @param {Object} config - Feature configuration
 * @returns {number} Normalized value (approximately N(0,1))
 */
function zScoreNormalize(value, featureName, config) {
  if (runningStats.count < 100 || !runningStats.mean[featureName]) {
    // Insufficient data - use min-max normalization mapped to approximate z-score
    const normalized = minMaxNormalize(value, config.min, config.max);
    return (normalized - 0.5) * 4; // Map [0,1] to approximately [-2, 2]
  }

  const mean = runningStats.mean[featureName];
  const std = runningStats.std[featureName] || 1;

  if (value === null || value === undefined || isNaN(value)) {
    return 0; // Missing = population mean
  }

  return (value - mean) / std;
}

/**
 * Cyclical encoding for temporal features
 * Preserves distance properties (e.g., day 6 close to day 0)
 *
 * @param {number} value - Raw value (e.g., day of week 0-6)
 * @param {number} period - Cycle period (e.g., 7 for days)
 * @returns {Object} {sin, cos} encoding
 */
function cyclicalEncode(value, period) {
  const angle = (2 * Math.PI * value) / period;
  return {
    sin: Math.sin(angle),
    cos: Math.cos(angle),
  };
}

/**
 * One-hot encoding for categorical features
 *
 * @param {string} value - Category value
 * @param {Array} categories - All possible categories
 * @returns {Array} One-hot vector
 */
function oneHotEncode(value, categories) {
  const vector = new Array(categories.length).fill(0);
  const index = categories.indexOf(value);
  if (index >= 0) {
    vector[index] = 1;
  } else {
    // Unknown category - use uniform distribution
    vector.fill(1 / categories.length);
  }
  return vector;
}

/**
 * ============================================
 * FEATURE EXTRACTION
 * ============================================
 */

/**
 * Extract nutritional features from food logs
 *
 * @param {Array} foodLogs - Food log entries for the day
 * @returns {Object} Normalized nutritional features
 */
function extractNutritionFeatures(foodLogs) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  for (const log of foodLogs) {
    totals.calories += log.calories || 0;
    totals.protein += log.protein || 0;
    totals.carbs += log.carbs || 0;
    totals.fats += log.fats || 0;
    totals.fiber += log.fiber || 0;
    totals.sugar += log.sugar || 0;
    totals.sodium += log.sodium || 0;
  }

  const features = {};
  for (const [name, config] of Object.entries(FEATURE_CONFIG.nutrition)) {
    features[`nutrition_${name}`] = minMaxNormalize(totals[name], config.min, config.max);
  }

  // Derived ratios (important for health outcomes)
  const totalMacros = totals.protein + totals.carbs + totals.fats;
  features.nutrition_protein_ratio = totalMacros > 0 ? totals.protein / totalMacros : 0.33;
  features.nutrition_carb_ratio = totalMacros > 0 ? totals.carbs / totalMacros : 0.33;
  features.nutrition_fat_ratio = totalMacros > 0 ? totals.fats / totalMacros : 0.33;
  features.nutrition_fiber_per_1000cal = totals.calories > 0 ? (totals.fiber / totals.calories) * 1000 / 50 : 0.5;
  features.nutrition_sugar_per_1000cal = totals.calories > 0 ? (totals.sugar / totals.calories) * 1000 / 100 : 0.5;

  return features;
}

/**
 * Extract meal timing features
 *
 * @param {Array} foodLogs - Food log entries with timestamps
 * @returns {Object} Meal timing features
 */
function extractMealTimingFeatures(foodLogs) {
  if (foodLogs.length === 0) {
    return {
      timing_first_meal_hour: 0.5,
      timing_last_meal_hour: 0.5,
      timing_eating_window: 0.5,
      timing_meal_regularity: 0.5,
    };
  }

  const mealHours = foodLogs
    .map(log => new Date(log.loggedAt).getHours())
    .sort((a, b) => a - b);

  const firstMeal = mealHours[0];
  const lastMeal = mealHours[mealHours.length - 1];
  const eatingWindow = lastMeal - firstMeal;

  // Calculate meal regularity (inverse of variance in meal times)
  const avgHour = mealHours.reduce((a, b) => a + b, 0) / mealHours.length;
  const variance = mealHours.reduce((sum, h) => sum + Math.pow(h - avgHour, 2), 0) / mealHours.length;
  const regularity = Math.exp(-variance / 20); // Higher variance = lower regularity

  return {
    timing_first_meal_hour: firstMeal / 24,
    timing_last_meal_hour: lastMeal / 24,
    timing_eating_window: Math.min(eatingWindow / 16, 1), // 16-hour max window
    timing_meal_regularity: regularity,
  };
}

/**
 * Extract behavioral features
 *
 * @param {Object} dayData - Aggregated day data
 * @returns {Object} Behavioral features
 */
function extractBehavioralFeatures(dayData) {
  const {
    mealsLogged = 0,
    waterGlasses = 0,
    loggingStreak = 0,
    moodLogsCount = 0,
    beverageData = {},
  } = dayData;

  // Extract beverage-specific features
  const caffeineCount = (beverageData.coffee || 0) + (beverageData.tea || 0);
  const totalBeverageTypes = Object.keys(beverageData).length;
  const waterRatio = beverageData.water ? beverageData.water / Math.max(1, Object.values(beverageData).reduce((a, b) => a + b, 0)) : 0.5;

  return {
    behavioral_meals_logged: minMaxNormalize(mealsLogged, 0, 10),
    behavioral_water_glasses: minMaxNormalize(waterGlasses, 0, 20),
    behavioral_streak: Math.min(loggingStreak / 30, 1), // Saturate at 30 days
    behavioral_mood_logs: minMaxNormalize(moodLogsCount, 0, 10),
    behavioral_logging_completeness: Math.min((mealsLogged + (waterGlasses > 0 ? 1 : 0) + moodLogsCount) / 5, 1),
    // Beverage-specific features
    behavioral_caffeine_count: minMaxNormalize(caffeineCount, 0, 6),
    behavioral_beverage_variety: minMaxNormalize(totalBeverageTypes, 0, 6),
    behavioral_water_ratio: waterRatio,
  };
}

/**
 * Extract temporal features with cyclical encoding
 *
 * @param {Date} date - Target date
 * @returns {Object} Temporal features
 */
function extractTemporalFeatures(date) {
  const d = new Date(date);

  const dayOfWeek = cyclicalEncode(d.getDay(), 7);
  const hourOfDay = cyclicalEncode(d.getHours(), 24);
  const dayOfMonth = cyclicalEncode(d.getDate(), 31);
  const monthOfYear = cyclicalEncode(d.getMonth() + 1, 12);

  return {
    temporal_dow_sin: dayOfWeek.sin,
    temporal_dow_cos: dayOfWeek.cos,
    temporal_hour_sin: hourOfDay.sin,
    temporal_hour_cos: hourOfDay.cos,
    temporal_dom_sin: dayOfMonth.sin,
    temporal_dom_cos: dayOfMonth.cos,
    temporal_month_sin: monthOfYear.sin,
    temporal_month_cos: monthOfYear.cos,
    temporal_is_weekend: d.getDay() === 0 || d.getDay() === 6 ? 1 : 0,
  };
}

/**
 * Extract historical trend features (rolling statistics)
 *
 * @param {Array} historicalData - Past N days of data
 * @param {Object} currentDay - Current day features
 * @returns {Object} Trend features
 */
function extractHistoricalFeatures(historicalData, currentDay) {
  if (historicalData.length < 3) {
    return {
      trend_calories_7d: 0,
      trend_protein_7d: 0,
      trend_mood_7d: 0,
      trend_hydration_7d: 0,
      volatility_mood: 0.5,
      consistency_logging: 0.5,
    };
  }

  // Calculate rolling means
  const avgCalories = historicalData.reduce((sum, d) => sum + (d.calories || 0), 0) / historicalData.length;
  const avgProtein = historicalData.reduce((sum, d) => sum + (d.protein || 0), 0) / historicalData.length;
  const avgMood = historicalData.reduce((sum, d) => sum + (d.avgMood || 3), 0) / historicalData.length;
  const avgWater = historicalData.reduce((sum, d) => sum + (d.waterGlasses || 0), 0) / historicalData.length;

  // Calculate trends (current vs. historical)
  const calorieTrend = avgCalories > 0 ? (currentDay.calories - avgCalories) / avgCalories : 0;
  const proteinTrend = avgProtein > 0 ? (currentDay.protein - avgProtein) / avgProtein : 0;
  const moodTrend = (currentDay.avgMood - avgMood) / 2; // Scale by max possible change
  const waterTrend = avgWater > 0 ? (currentDay.waterGlasses - avgWater) / avgWater : 0;

  // Calculate volatility (standard deviation)
  const moodValues = historicalData.map(d => d.avgMood || 3);
  const moodMean = moodValues.reduce((a, b) => a + b, 0) / moodValues.length;
  const moodVariance = moodValues.reduce((sum, v) => sum + Math.pow(v - moodMean, 2), 0) / moodValues.length;
  const moodVolatility = Math.sqrt(moodVariance) / 2; // Normalize to ~[0, 1]

  // Calculate logging consistency
  const daysWithLogs = historicalData.filter(d => d.mealsLogged > 0).length;
  const consistency = daysWithLogs / historicalData.length;

  return {
    trend_calories_7d: Math.tanh(calorieTrend), // Bounded to [-1, 1]
    trend_protein_7d: Math.tanh(proteinTrend),
    trend_mood_7d: Math.tanh(moodTrend),
    trend_hydration_7d: Math.tanh(waterTrend),
    volatility_mood: Math.min(moodVolatility, 1),
    consistency_logging: consistency,
  };
}

/**
 * Extract user profile features (static or slowly changing)
 *
 * @param {Object} profile - User profile
 * @returns {Object} Profile features
 */
function extractProfileFeatures(profile) {
  if (!profile) {
    return {
      profile_age_normalized: 0.5,
      profile_bmi_normalized: 0.5,
      profile_activity_sedentary: 0.2,
      profile_activity_light: 0.2,
      profile_activity_moderate: 0.2,
      profile_activity_very: 0.2,
      profile_activity_extreme: 0.2,
    };
  }

  // Age normalization (18-80 typical range)
  const ageNorm = profile.age ? minMaxNormalize(profile.age, 18, 80) : 0.5;

  // BMI calculation and normalization (15-40 typical range)
  let bmiNorm = 0.5;
  if (profile.heightCm && profile.weightKg) {
    const heightM = profile.heightCm / 100;
    const bmi = profile.weightKg / (heightM * heightM);
    bmiNorm = minMaxNormalize(bmi, 15, 40);
  }

  // Activity level encoding
  const activityLevels = FEATURE_CONFIG.categorical.activityLevel;
  const activityVector = oneHotEncode(profile.activityLevel || 'moderately_active', activityLevels);

  return {
    profile_age_normalized: ageNorm,
    profile_bmi_normalized: bmiNorm,
    profile_activity_sedentary: activityVector[0],
    profile_activity_light: activityVector[1],
    profile_activity_moderate: activityVector[2],
    profile_activity_very: activityVector[3],
    profile_activity_extreme: activityVector[4],
  };
}

/**
 * ============================================
 * MAIN ENCODING FUNCTIONS
 * ============================================
 */

/**
 * Encode a single user-day into feature vector
 *
 * @param {string} userId - User ID
 * @param {Date} date - Target date
 * @param {Object} options - Encoding options
 * @returns {Promise<Object>} Feature vector with metadata
 */
export async function encodeUserDay(userId, date, options = {}) {
  const { includeHistory = true, historyDays = 7 } = options;

  try {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Fetch data in parallel
    const [foodLogs, moodLogs, waterLogs, profile, gamStats] = await Promise.all([
      db.select().from(foodLogTable).where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedAt, targetDate),
          lte(foodLogTable.loggedAt, nextDate)
        )
      ),
      db.select().from(moodLogTable).where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, targetDate),
          lte(moodLogTable.loggedDate, nextDate)
        )
      ),
      db.select().from(waterLogTable).where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, targetDate),
          lte(waterLogTable.loggedDate, nextDate)
        )
      ),
      db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1),
      db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId)).limit(1),
    ]);

    // Calculate beverage breakdown
    const beverageData = {};
    waterLogs.forEach(w => {
      const type = w.beverageType || 'water';
      beverageData[type] = (beverageData[type] || 0) + 1;
    });

    // Calculate day aggregates
    const dayData = {
      mealsLogged: foodLogs.length,
      waterGlasses: waterLogs.reduce((sum, w) => sum + (w.glasses || w.amount || 1), 0),
      loggingStreak: gamStats[0]?.streak || 0,
      moodLogsCount: moodLogs.length,
      avgMood: moodLogs.length > 0
        ? moodLogs.reduce((sum, m) => sum + (m.intensity || 3), 0) / moodLogs.length
        : null,
      calories: foodLogs.reduce((sum, f) => sum + (f.calories || 0), 0),
      protein: foodLogs.reduce((sum, f) => sum + (f.protein || 0), 0),
      beverageData, // Add beverage breakdown for behavioral features
    };

    // Extract all feature groups
    const nutritionFeatures = extractNutritionFeatures(foodLogs);
    const timingFeatures = extractMealTimingFeatures(foodLogs);
    const behavioralFeatures = extractBehavioralFeatures(dayData);
    const temporalFeatures = extractTemporalFeatures(targetDate);
    const profileFeatures = extractProfileFeatures(profile[0]);

    // Historical features (optional, more expensive)
    let historicalFeatures = {};
    if (includeHistory) {
      const historyStart = new Date(targetDate);
      historyStart.setDate(historyStart.getDate() - historyDays);

      const historicalData = await fetchHistoricalSummary(userId, historyStart, targetDate);
      historicalFeatures = extractHistoricalFeatures(historicalData, dayData);
    }

    // Combine all features
    const features = {
      ...nutritionFeatures,
      ...timingFeatures,
      ...behavioralFeatures,
      ...temporalFeatures,
      ...profileFeatures,
      ...historicalFeatures,
    };

    // Convert to array format for model input
    const featureNames = Object.keys(features).sort();
    const featureVector = featureNames.map(name => features[name]);

    return {
      userId,
      date: targetDate.toISOString().split('T')[0],
      features,
      featureVector,
      featureNames,
      metadata: {
        mealsLogged: dayData.mealsLogged,
        hasWaterLog: dayData.waterGlasses > 0,
        hasMoodLog: dayData.moodLogsCount > 0,
        dataCompleteness: calculateDataCompleteness(dayData),
      },
    };
  } catch (error) {
    console.error('[Feature Encoder] Error encoding user-day:', error);
    throw error;
  }
}

/**
 * Fetch historical summary for trend calculation
 */
async function fetchHistoricalSummary(userId, startDate, endDate) {
  try {
    // Get daily nutrition summaries if available
    const summaries = await db
      .select()
      .from(dailyNutritionSummaryTable)
      .where(
        and(
          eq(dailyNutritionSummaryTable.userId, userId),
          gte(dailyNutritionSummaryTable.date, toDateStr(startDate)),
          lte(dailyNutritionSummaryTable.date, toDateStr(endDate))
        )
      )
      .orderBy(dailyNutritionSummaryTable.date);

    if (summaries.length > 0) {
      return summaries.map(s => ({
        calories: s.totalCalories || 0,
        protein: s.totalProtein || 0,
        avgMood: s.avgMood || 3,
        waterGlasses: s.waterGlasses || 0,
        mealsLogged: s.mealsCount || 0,
      }));
    }

    // Fallback: compute from raw logs (more expensive)
    return [];
  } catch (error) {
    console.error('[Feature Encoder] Error fetching historical summary:', error);
    return [];
  }
}

/**
 * Calculate data completeness score
 */
function calculateDataCompleteness(dayData) {
  let score = 0;
  if (dayData.mealsLogged >= 2) score += 0.4;
  else if (dayData.mealsLogged >= 1) score += 0.2;
  if (dayData.waterGlasses > 0) score += 0.3;
  if (dayData.moodLogsCount > 0) score += 0.3;
  return score;
}

/**
 * Batch encode multiple user-days (for training)
 *
 * @param {Array} userDays - Array of {userId, date} objects
 * @param {Object} options - Encoding options
 * @returns {Promise<Array>} Array of encoded feature vectors
 */
export async function batchEncodeUserDays(userDays, options = {}) {
  const { batchSize = 50 } = options;
  const results = [];

  for (let i = 0; i < userDays.length; i += batchSize) {
    const batch = userDays.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(ud => encodeUserDay(ud.userId, ud.date, options).catch(err => null))
    );
    results.push(...batchResults.filter(r => r !== null));
  }

  return results;
}

/**
 * Get feature dimension count
 */
export function getFeatureDimension() {
  // Count all features
  let dim = 0;

  // Nutrition features (7 base + 5 derived)
  dim += 12;

  // Timing features
  dim += 4;

  // Behavioral features (5 base + 3 beverage-specific)
  dim += 8;

  // Temporal features (8 cyclical + 1 binary)
  dim += 9;

  // Profile features (2 continuous + 5 activity one-hot)
  dim += 7;

  // Historical features
  dim += 6;

  return dim; // Total: 46 features (added beverage features)
}

/**
 * Update running statistics (called during training)
 */
export function updateRunningStats(featureBatch) {
  // Welford's online algorithm for mean and variance
  for (const features of featureBatch) {
    runningStats.count++;
    for (const [name, value] of Object.entries(features)) {
      if (typeof value !== 'number') continue;

      if (!runningStats.mean[name]) {
        runningStats.mean[name] = 0;
        runningStats.std[name] = 0;
      }

      const delta = value - runningStats.mean[name];
      runningStats.mean[name] += delta / runningStats.count;
      const delta2 = value - runningStats.mean[name];
      runningStats.std[name] += delta * delta2;
    }
  }

  // Convert variance to std
  if (runningStats.count > 1) {
    for (const name of Object.keys(runningStats.std)) {
      runningStats.std[name] = Math.sqrt(runningStats.std[name] / (runningStats.count - 1));
    }
  }
}

export default {
  encodeUserDay,
  batchEncodeUserDays,
  getFeatureDimension,
  updateRunningStats,
  FEATURE_CONFIG,
};
