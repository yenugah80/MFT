/**
 * PatternMiningService - Holistic Cross-Domain Wellness Correlation Engine
 *
 * Analyzes THIS USER's actual logged data to discover personalized patterns
 * across ALL wellness dimensions:
 *
 * FOOD CORRELATIONS:
 * - Food ↔ Mood/Energy - Which foods boost or drain your energy?
 * - Food ↔ Sleep - What foods affect your sleep quality?
 * - Food ↔ Stress - What foods correlate with stress levels?
 *
 * ACTIVITY CORRELATIONS:
 * - Activity ↔ Mood - How does exercise affect your mood?
 * - Activity ↔ Sleep - How does activity affect sleep quality?
 * - Activity ↔ Energy - How does activity affect next-day energy?
 *
 * HYDRATION CORRELATIONS:
 * - Hydration ↔ Energy - How does water intake affect energy levels?
 * - Hydration ↔ Mood - How does hydration affect your mood?
 *
 * SLEEP CORRELATIONS:
 * - Sleep ↔ Mood - How does sleep quality affect your mood?
 * - Sleep ↔ Energy - How does sleep affect your energy levels?
 *
 * STRESS CORRELATIONS:
 * - Stress ↔ Sleep - How does stress affect your sleep?
 * - Stress ↔ Mood - How does stress affect your mood?
 *
 * Key Principles:
 * - NO generic advice - only patterns from THIS user's data
 * - Statistical significance requirements (minimum sample sizes)
 * - Confidence scores for all insights
 * - Cross-domain pattern discovery
 * - Temporal awareness (recent data weighted higher)
 */

import { db } from '../config/db.js';
import { foodLogTable, moodLogTable, waterLogTable, activityLogTable, sleepLogTable, stressLogTable } from '../db/schema.js';
import { eq, gte, desc, and, sql } from 'drizzle-orm';

// Minimum data requirements for pattern detection
const MIN_FOOD_LOGS = 10;
const MIN_MOOD_LOGS = 7;
const MIN_ACTIVITY_LOGS = 5;
const MIN_SLEEP_LOGS = 5;
const MIN_WATER_LOGS = 7;
const MIN_STRESS_LOGS = 5;
const MIN_CORRELATION_SAMPLES = 3; // Need at least 3 instances to claim a pattern
const LOOKBACK_DAYS = 30; // Default analysis window

// Cache for pattern mining results (reduces redundant calls from multiple API endpoints)
const patternCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cache key for user+options combination
 */
function getCacheKey(userId, lookbackDays) {
  return `${userId}:${lookbackDays}`;
}

/**
 * Check if cached result is still valid
 */
function getCachedResult(cacheKey) {
  const cached = patternCache.get(cacheKey);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > CACHE_TTL;
  if (isExpired) {
    patternCache.delete(cacheKey);
    return null;
  }

  return cached.data;
}

/**
 * Store result in cache
 */
function setCachedResult(cacheKey, data) {
  patternCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  // Cleanup old entries (keep cache size manageable)
  if (patternCache.size > 100) {
    const oldestKey = patternCache.keys().next().value;
    patternCache.delete(oldestKey);
  }
}

/**
 * Clear cache for a specific user (call after new data is logged)
 */
export function clearPatternCache(userId) {
  for (const key of patternCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      patternCache.delete(key);
    }
  }
}

/**
 * Main entry point: Mine all patterns for a user
 */
export async function mineUserPatterns(userId, options = {}) {
  const { lookbackDays = LOOKBACK_DAYS } = options;

  // Check cache first
  const cacheKey = getCacheKey(userId, lookbackDays);
  const cachedResult = getCachedResult(cacheKey);
  if (cachedResult) {
    console.log(`[PatternMining] Cache hit for user ${userId} (${lookbackDays} days)`);
    return cachedResult;
  }

  console.log(`[PatternMining] Cache miss for user ${userId} (${lookbackDays} days) - computing patterns`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  try {
    // Fetch all relevant data
    const [foodLogs, moodLogs, waterLogs, activityLogs, sleepLogs, stressLogs] = await Promise.all([
      fetchFoodLogs(userId, cutoffDate),
      fetchMoodLogs(userId, cutoffDate),
      fetchWaterLogs(userId, cutoffDate),
      fetchActivityLogs(userId, cutoffDate),
      fetchSleepLogs(userId, cutoffDate),
      fetchStressLogs(userId, cutoffDate),
    ]);

    // Check data sufficiency across all domains
    const dataSufficiency = assessDataSufficiency(foodLogs, moodLogs, activityLogs, sleepLogs, waterLogs, stressLogs);

    // We can still mine patterns with partial data - just won't have all correlations
    const hasMinimumData = dataSufficiency.foodLogs.count >= 5 || dataSufficiency.moodLogs.count >= 3;
    if (!hasMinimumData) {
      return {
        success: true,
        patterns: [],
        foodMoodCorrelations: [],
        temporalPatterns: [],
        sequencingPatterns: [],
        activityCorrelations: [],
        sleepCorrelations: [],
        hydrationCorrelations: [],
        stressCorrelations: [],
        dataSufficiency,
        message: 'Need more data to discover patterns'
      };
    }

    // Mine ALL cross-domain pattern types in parallel
    const [
      // Food-centric correlations
      foodMoodCorrelations,
      foodSleepCorrelations,
      foodStressCorrelations,
      temporalPatterns,
      sequencingPatterns,
      nutrientPatterns,
      negativePatterns,
      // Activity correlations
      activityMoodCorrelations,
      activitySleepCorrelations,
      activityEnergyCorrelations,
      // Hydration correlations
      hydrationEnergyCorrelations,
      hydrationMoodCorrelations,
      // Sleep correlations
      sleepMoodCorrelations,
      sleepEnergyCorrelations,
      // Stress correlations
      stressSleepCorrelations,
      stressMoodCorrelations
    ] = await Promise.all([
      // Food-centric
      mineFoodMoodCorrelations(foodLogs, moodLogs),
      mineFoodSleepCorrelations(foodLogs, sleepLogs),
      mineFoodStressCorrelations(foodLogs, stressLogs),
      mineTemporalPatterns(foodLogs, moodLogs, activityLogs),
      mineSequencingPatterns(foodLogs, moodLogs),
      mineNutrientPatterns(foodLogs, moodLogs, activityLogs),
      mineNegativePatterns(foodLogs, moodLogs, sleepLogs, stressLogs),
      // Activity
      mineActivityMoodCorrelations(activityLogs, moodLogs),
      mineActivitySleepCorrelations(activityLogs, sleepLogs),
      mineActivityEnergyCorrelations(activityLogs, moodLogs),
      // Hydration
      mineHydrationEnergyCorrelations(waterLogs, moodLogs),
      mineHydrationMoodCorrelations(waterLogs, moodLogs),
      // Sleep
      mineSleepMoodCorrelations(sleepLogs, moodLogs),
      mineSleepEnergyCorrelations(sleepLogs, moodLogs),
      // Stress
      mineStressSleepCorrelations(stressLogs, sleepLogs),
      mineStressMoodCorrelations(stressLogs, moodLogs)
    ]);

    // Group correlations by domain for organized access
    const activityCorrelations = [
      ...activityMoodCorrelations,
      ...activitySleepCorrelations,
      ...activityEnergyCorrelations
    ];

    const sleepCorrelations = [
      ...sleepMoodCorrelations,
      ...sleepEnergyCorrelations
    ];

    const hydrationCorrelations = [
      ...hydrationEnergyCorrelations,
      ...hydrationMoodCorrelations
    ];

    const stressCorrelations = [
      ...stressSleepCorrelations,
      ...stressMoodCorrelations
    ];

    const foodCorrelations = [
      ...foodMoodCorrelations,
      ...foodSleepCorrelations,
      ...foodStressCorrelations
    ];

    // Combine and rank ALL patterns across all domains
    const allPatterns = [
      ...foodMoodCorrelations,
      ...foodSleepCorrelations,
      ...foodStressCorrelations,
      ...temporalPatterns,
      ...sequencingPatterns,
      ...nutrientPatterns,
      ...negativePatterns,
      ...activityCorrelations,
      ...sleepCorrelations,
      ...hydrationCorrelations,
      ...stressCorrelations
    ].sort((a, b) => b.confidence - a.confidence);

    const result = {
      success: true,
      patterns: allPatterns.slice(0, 15), // Top 15 most confident patterns (expanded)
      // Food-centric
      foodMoodCorrelations,
      foodSleepCorrelations,
      foodStressCorrelations,
      foodCorrelations, // Combined food correlations
      temporalPatterns,
      sequencingPatterns,
      nutrientPatterns,
      negativePatterns,
      // Cross-domain correlations
      activityCorrelations,
      sleepCorrelations,
      hydrationCorrelations,
      stressCorrelations,
      dataSufficiency,
      meta: {
        analyzedDays: lookbackDays,
        foodLogsAnalyzed: foodLogs.length,
        moodLogsAnalyzed: moodLogs.length,
        activityLogsAnalyzed: activityLogs.length,
        sleepLogsAnalyzed: sleepLogs.length,
        waterLogsAnalyzed: waterLogs.length,
        stressLogsAnalyzed: stressLogs.length,
        generatedAt: new Date().toISOString()
      }
    };

    // Cache the result
    setCachedResult(cacheKey, result);

    return result;
  } catch (error) {
    console.error('[PatternMining] Error:', error);
    return {
      success: false,
      error: error.message,
      patterns: [],
      dataSufficiency: { sufficient: false }
    };
  }
}

// ==================== Data Fetching ====================

async function fetchFoodLogs(userId, cutoffDate) {
  try {
    return await db.select()
      .from(foodLogTable)
      .where(and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedAt, cutoffDate)
      ))
      .orderBy(desc(foodLogTable.loggedAt));
  } catch {
    return [];
  }
}

async function fetchMoodLogs(userId, cutoffDate) {
  try {
    return await db.select()
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedDate, cutoffDate)
      ))
      .orderBy(desc(moodLogTable.loggedDate));
  } catch {
    return [];
  }
}

async function fetchWaterLogs(userId, cutoffDate) {
  try {
    return await db.select()
      .from(waterLogTable)
      .where(and(
        eq(waterLogTable.userId, userId),
        gte(waterLogTable.loggedDate, cutoffDate)
      ))
      .orderBy(desc(waterLogTable.loggedDate));
  } catch {
    return [];
  }
}

async function fetchActivityLogs(userId, cutoffDate) {
  try {
    return await db.select()
      .from(activityLogTable)
      .where(and(
        eq(activityLogTable.userId, userId),
        gte(activityLogTable.loggedAt, cutoffDate)
      ))
      .orderBy(desc(activityLogTable.loggedAt));
  } catch {
    return [];
  }
}

async function fetchSleepLogs(userId, cutoffDate) {
  try {
    return await db.select()
      .from(sleepLogTable)
      .where(and(
        eq(sleepLogTable.userId, userId),
        gte(sleepLogTable.loggedAt, cutoffDate)
      ))
      .orderBy(desc(sleepLogTable.loggedAt));
  } catch {
    return [];
  }
}

async function fetchStressLogs(userId, cutoffDate) {
  try {
    return await db.select()
      .from(stressLogTable)
      .where(and(
        eq(stressLogTable.userId, userId),
        gte(stressLogTable.loggedAt, cutoffDate)
      ))
      .orderBy(desc(stressLogTable.loggedAt));
  } catch {
    return [];
  }
}

// ==================== Data Sufficiency ====================

function assessDataSufficiency(foodLogs, moodLogs, activityLogs = [], sleepLogs = [], waterLogs = [], stressLogs = []) {
  const foodCount = foodLogs.length;
  const moodCount = moodLogs.length;
  const activityCount = activityLogs.length;
  const sleepCount = sleepLogs.length;
  const waterCount = waterLogs.length;
  const stressCount = stressLogs.length;

  // Core sufficiency (food + mood for basic patterns)
  const coreSufficient = foodCount >= MIN_FOOD_LOGS && moodCount >= MIN_MOOD_LOGS;

  // Domain-specific sufficiency
  const activitySufficient = activityCount >= MIN_ACTIVITY_LOGS;
  const sleepSufficient = sleepCount >= MIN_SLEEP_LOGS;
  const hydrationSufficient = waterCount >= MIN_WATER_LOGS;
  const stressSufficient = stressCount >= MIN_STRESS_LOGS;

  // Overall sufficiency score (percentage of domains with enough data)
  const domainScores = [
    coreSufficient ? 1 : 0,
    activitySufficient ? 1 : 0,
    sleepSufficient ? 1 : 0,
    hydrationSufficient ? 1 : 0,
    stressSufficient ? 1 : 0
  ];
  const overallScore = Math.round((domainScores.reduce((a, b) => a + b, 0) / 5) * 100);

  return {
    sufficient: coreSufficient,
    overallScore,
    // Per-domain sufficiency
    foodLogs: {
      count: foodCount,
      required: MIN_FOOD_LOGS,
      percentage: Math.min(100, Math.round((foodCount / MIN_FOOD_LOGS) * 100)),
      sufficient: foodCount >= MIN_FOOD_LOGS
    },
    moodLogs: {
      count: moodCount,
      required: MIN_MOOD_LOGS,
      percentage: Math.min(100, Math.round((moodCount / MIN_MOOD_LOGS) * 100)),
      sufficient: moodCount >= MIN_MOOD_LOGS
    },
    activityLogs: {
      count: activityCount,
      required: MIN_ACTIVITY_LOGS,
      percentage: Math.min(100, Math.round((activityCount / MIN_ACTIVITY_LOGS) * 100)),
      sufficient: activitySufficient
    },
    sleepLogs: {
      count: sleepCount,
      required: MIN_SLEEP_LOGS,
      percentage: Math.min(100, Math.round((sleepCount / MIN_SLEEP_LOGS) * 100)),
      sufficient: sleepSufficient
    },
    waterLogs: {
      count: waterCount,
      required: MIN_WATER_LOGS,
      percentage: Math.min(100, Math.round((waterCount / MIN_WATER_LOGS) * 100)),
      sufficient: hydrationSufficient
    },
    stressLogs: {
      count: stressCount,
      required: MIN_STRESS_LOGS,
      percentage: Math.min(100, Math.round((stressCount / MIN_STRESS_LOGS) * 100)),
      sufficient: stressSufficient
    },
    // What correlations are possible with current data
    availableCorrelations: {
      foodMood: coreSufficient,
      foodSleep: foodCount >= 5 && sleepSufficient,
      foodStress: foodCount >= 5 && stressSufficient,
      activityMood: activitySufficient && moodCount >= 3,
      activitySleep: activitySufficient && sleepSufficient,
      activityEnergy: activitySufficient && moodCount >= 3,
      hydrationEnergy: hydrationSufficient && moodCount >= 3,
      hydrationMood: hydrationSufficient && moodCount >= 3,
      sleepMood: sleepSufficient && moodCount >= 3,
      sleepEnergy: sleepSufficient && moodCount >= 3,
      stressSleep: stressSufficient && sleepSufficient,
      stressMood: stressSufficient && moodCount >= 3
    },
    message: coreSufficient
      ? `Pattern analysis active (${overallScore}% data coverage)`
      : `Need ${Math.max(0, MIN_FOOD_LOGS - foodCount)} more food logs and ${Math.max(0, MIN_MOOD_LOGS - moodCount)} more mood logs`
  };
}

// ==================== Food-Mood Correlations ====================

/**
 * Find which specific foods correlate with better/worse mood & energy
 * Example: "Greek yogurt correlates with 23% higher energy the next morning"
 */
function mineFoodMoodCorrelations(foodLogs, moodLogs) {
  const correlations = [];

  // Group food logs by food name (normalized)
  const foodGroups = groupFoodsByName(foodLogs);

  // For each food, find mood logs within 2-24 hours after eating
  for (const [foodName, logs] of Object.entries(foodGroups)) {
    if (logs.length < MIN_CORRELATION_SAMPLES) continue;

    const moodAfterFood = [];
    const moodWithoutFood = [];

    for (const foodLog of logs) {
      const foodTime = new Date(foodLog.loggedAt);

      // Find mood logs 2-24 hours after this food
      const relevantMoods = moodLogs.filter(m => {
        const moodTime = new Date(m.loggedAt);
        const hoursDiff = (moodTime - foodTime) / (1000 * 60 * 60);
        return hoursDiff >= 2 && hoursDiff <= 24;
      });

      if (relevantMoods.length > 0) {
        const avgEnergy = relevantMoods.reduce((sum, m) => sum + (m.energyLevel || 5), 0) / relevantMoods.length;
        const avgMood = relevantMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / relevantMoods.length;
        moodAfterFood.push({ energy: avgEnergy, mood: avgMood, date: foodTime });
      }
    }

    // Calculate baseline (days without this food)
    const foodDays = new Set(logs.map(l => getDateKey(l.loggedAt)));
    const baselineMoods = moodLogs.filter(m => !foodDays.has(getDateKey(m.loggedAt)));

    if (baselineMoods.length >= 3 && moodAfterFood.length >= MIN_CORRELATION_SAMPLES) {
      const baselineEnergy = baselineMoods.reduce((sum, m) => sum + (m.energyLevel || 5), 0) / baselineMoods.length;
      const baselineMood = baselineMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / baselineMoods.length;

      const avgEnergyAfter = moodAfterFood.reduce((sum, m) => sum + m.energy, 0) / moodAfterFood.length;
      const avgMoodAfter = moodAfterFood.reduce((sum, m) => sum + m.mood, 0) / moodAfterFood.length;

      const energyDiff = ((avgEnergyAfter - baselineEnergy) / baselineEnergy) * 100;
      const moodDiff = ((avgMoodAfter - baselineMood) / baselineMood) * 100;

      // Only report if difference is meaningful (>10%)
      if (Math.abs(energyDiff) > 10 || Math.abs(moodDiff) > 10) {
        const isPositive = energyDiff > 0 || moodDiff > 0;
        const confidence = calculateConfidence(moodAfterFood.length, Math.abs(energyDiff));

        correlations.push({
          type: 'FOOD_MOOD',
          food: foodName,
          direction: isPositive ? 'positive' : 'negative',
          energyImpact: Math.round(energyDiff),
          moodImpact: Math.round(moodDiff),
          sampleSize: moodAfterFood.length,
          confidence,
          lastOccurrence: moodAfterFood[0]?.date,
          insight: generateFoodMoodInsight(foodName, energyDiff, moodDiff, moodAfterFood.length),
          recommendation: generateFoodMoodRecommendation(foodName, isPositive, energyDiff)
        });
      }
    }
  }

  return correlations.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

// ==================== Temporal Patterns ====================

/**
 * Find time-of-day and day-of-week patterns
 * Example: "You have 30% more energy on days you eat breakfast before 9am"
 */
function mineTemporalPatterns(foodLogs, moodLogs, activityLogs) {
  const patterns = [];

  // Pattern 1: Breakfast timing impact
  const breakfastPattern = analyzeBreakfastTiming(foodLogs, moodLogs);
  if (breakfastPattern) patterns.push(breakfastPattern);

  // Pattern 2: Late eating impact on next-day energy
  const lateEatingPattern = analyzeLateEating(foodLogs, moodLogs);
  if (lateEatingPattern) patterns.push(lateEatingPattern);

  // Pattern 3: Day-of-week patterns
  const dayOfWeekPatterns = analyzeDayOfWeekPatterns(foodLogs, moodLogs);
  patterns.push(...dayOfWeekPatterns);

  // Pattern 4: Meal regularity impact
  const regularityPattern = analyzeMealRegularity(foodLogs, moodLogs);
  if (regularityPattern) patterns.push(regularityPattern);

  return patterns.filter(p => p !== null);
}

function analyzeBreakfastTiming(foodLogs, moodLogs) {
  // Group by days with early breakfast (<9am) vs late/no breakfast
  const earlyBreakfastDays = new Set();
  const lateBreakfastDays = new Set();

  foodLogs.forEach(log => {
    const logTime = new Date(log.loggedAt);
    const hour = logTime.getHours();
    const dateKey = getDateKey(log.loggedAt);

    // Classify as breakfast if logged between 5am-11am
    if (hour >= 5 && hour < 11) {
      if (hour < 9) {
        earlyBreakfastDays.add(dateKey);
      } else {
        lateBreakfastDays.add(dateKey);
      }
    }
  });

  if (earlyBreakfastDays.size < 3 || lateBreakfastDays.size < 3) return null;

  // Compare energy levels
  const earlyEnergy = getAverageEnergyForDays(moodLogs, earlyBreakfastDays);
  const lateEnergy = getAverageEnergyForDays(moodLogs, lateBreakfastDays);

  if (earlyEnergy === null || lateEnergy === null) return null;

  const diff = ((earlyEnergy - lateEnergy) / lateEnergy) * 100;

  if (Math.abs(diff) < 10) return null; // Not significant

  return {
    type: 'TEMPORAL',
    subtype: 'BREAKFAST_TIMING',
    direction: diff > 0 ? 'positive' : 'negative',
    impact: Math.round(diff),
    earlyBreakfastDays: earlyBreakfastDays.size,
    lateBreakfastDays: lateBreakfastDays.size,
    confidence: calculateConfidence(earlyBreakfastDays.size + lateBreakfastDays.size, Math.abs(diff)),
    insight: diff > 0
      ? `Your energy is ${Math.round(diff)}% higher on days you eat breakfast before 9am`
      : `Eating breakfast before 9am might be affecting your energy negatively`,
    recommendation: diff > 0
      ? 'Try to maintain your early breakfast habit - it correlates with better energy for you'
      : 'Consider experimenting with breakfast timing to find what works best'
  };
}

function analyzeLateEating(foodLogs, moodLogs) {
  // Group by days with late eating (after 9pm) vs not
  const lateEatingDays = new Set();
  const noLateEatingDays = new Set();

  const allDays = new Set(foodLogs.map(l => getDateKey(l.loggedAt)));

  foodLogs.forEach(log => {
    const logTime = new Date(log.loggedAt);
    const hour = logTime.getHours();
    const dateKey = getDateKey(log.loggedAt);

    if (hour >= 21) {
      lateEatingDays.add(dateKey);
    }
  });

  allDays.forEach(day => {
    if (!lateEatingDays.has(day)) {
      noLateEatingDays.add(day);
    }
  });

  if (lateEatingDays.size < 3 || noLateEatingDays.size < 3) return null;

  // Compare next-morning energy
  const afterLateEnergy = getNextMorningEnergy(moodLogs, lateEatingDays);
  const afterNoLateEnergy = getNextMorningEnergy(moodLogs, noLateEatingDays);

  if (afterLateEnergy === null || afterNoLateEnergy === null) return null;

  const diff = ((afterNoLateEnergy - afterLateEnergy) / afterLateEnergy) * 100;

  if (Math.abs(diff) < 10) return null;

  return {
    type: 'TEMPORAL',
    subtype: 'LATE_EATING',
    direction: diff > 0 ? 'negative' : 'positive', // Late eating is negative if morning energy drops
    impact: Math.round(diff),
    lateEatingDays: lateEatingDays.size,
    noLateEatingDays: noLateEatingDays.size,
    confidence: calculateConfidence(lateEatingDays.size + noLateEatingDays.size, Math.abs(diff)),
    insight: diff > 0
      ? `Your morning energy is ${Math.round(diff)}% higher on days you don't eat after 9pm`
      : `Late eating doesn't seem to affect your morning energy`,
    recommendation: diff > 0
      ? 'Consider finishing your last meal before 9pm for better morning energy'
      : null
  };
}

function analyzeDayOfWeekPatterns(foodLogs, moodLogs) {
  const patterns = [];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Group mood logs by day of week
  const moodByDay = {};
  dayNames.forEach((_, i) => moodByDay[i] = []);

  moodLogs.forEach(log => {
    const day = new Date(log.loggedAt).getDay();
    moodByDay[day].push(log);
  });

  // Calculate average energy per day
  const avgByDay = {};
  let overallAvg = 0;
  let totalCount = 0;

  for (let i = 0; i < 7; i++) {
    if (moodByDay[i].length >= 2) {
      avgByDay[i] = moodByDay[i].reduce((sum, m) => sum + (m.energyLevel || 5), 0) / moodByDay[i].length;
      overallAvg += avgByDay[i] * moodByDay[i].length;
      totalCount += moodByDay[i].length;
    }
  }

  overallAvg = totalCount > 0 ? overallAvg / totalCount : 5;

  // Find days significantly different from average
  for (let i = 0; i < 7; i++) {
    if (avgByDay[i] !== undefined) {
      const diff = ((avgByDay[i] - overallAvg) / overallAvg) * 100;

      if (Math.abs(diff) > 15) { // 15% threshold for day patterns
        patterns.push({
          type: 'TEMPORAL',
          subtype: 'DAY_OF_WEEK',
          day: dayNames[i],
          dayIndex: i,
          direction: diff > 0 ? 'positive' : 'negative',
          impact: Math.round(diff),
          sampleSize: moodByDay[i].length,
          confidence: calculateConfidence(moodByDay[i].length, Math.abs(diff)),
          insight: diff > 0
            ? `${dayNames[i]}s tend to be your best days - energy is ${Math.round(diff)}% above average`
            : `${dayNames[i]}s tend to be challenging - energy is ${Math.round(Math.abs(diff))}% below average`,
          recommendation: diff < 0
            ? `Consider meal prepping for ${dayNames[i]}s or scheduling energizing foods`
            : null
        });
      }
    }
  }

  return patterns;
}

function analyzeMealRegularity(foodLogs, moodLogs) {
  // Compare days with regular meal times vs irregular
  const dayMealTimes = {};

  foodLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedAt);
    const hour = new Date(log.loggedAt).getHours();

    if (!dayMealTimes[dateKey]) dayMealTimes[dateKey] = [];
    dayMealTimes[dateKey].push(hour);
  });

  const regularDays = new Set();
  const irregularDays = new Set();

  // Calculate "regularity" - standard deviation of meal times
  Object.entries(dayMealTimes).forEach(([dateKey, hours]) => {
    if (hours.length >= 2) {
      const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
      const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
      const stdDev = Math.sqrt(variance);

      // Regular = meals spread out evenly (stdDev > 3), Irregular = clustered (stdDev < 2)
      if (stdDev > 3) {
        regularDays.add(dateKey);
      } else if (stdDev < 2) {
        irregularDays.add(dateKey);
      }
    }
  });

  if (regularDays.size < 3 || irregularDays.size < 3) return null;

  const regularEnergy = getAverageEnergyForDays(moodLogs, regularDays);
  const irregularEnergy = getAverageEnergyForDays(moodLogs, irregularDays);

  if (regularEnergy === null || irregularEnergy === null) return null;

  const diff = ((regularEnergy - irregularEnergy) / irregularEnergy) * 100;

  if (Math.abs(diff) < 10) return null;

  return {
    type: 'TEMPORAL',
    subtype: 'MEAL_REGULARITY',
    direction: diff > 0 ? 'positive' : 'negative',
    impact: Math.round(diff),
    regularDays: regularDays.size,
    irregularDays: irregularDays.size,
    confidence: calculateConfidence(regularDays.size + irregularDays.size, Math.abs(diff)),
    insight: diff > 0
      ? `Spreading your meals throughout the day correlates with ${Math.round(diff)}% better energy`
      : `Your meal timing pattern doesn't show a clear impact on energy`,
    recommendation: diff > 0
      ? 'Try to maintain consistent meal spacing for optimal energy'
      : null
  };
}

// ==================== Sequencing Patterns ====================

/**
 * Find patterns in meal sequencing
 * Example: "Protein-heavy dinners correlate with better morning energy"
 */
function mineSequencingPatterns(foodLogs, moodLogs) {
  const patterns = [];

  // Pattern: Protein at dinner → morning energy
  const dinnerProteinPattern = analyzeDinnerProtein(foodLogs, moodLogs);
  if (dinnerProteinPattern) patterns.push(dinnerProteinPattern);

  // Pattern: Carbs at lunch → afternoon energy
  const lunchCarbsPattern = analyzeLunchCarbs(foodLogs, moodLogs);
  if (lunchCarbsPattern) patterns.push(lunchCarbsPattern);

  return patterns;
}

function analyzeDinnerProtein(foodLogs, moodLogs) {
  // Group dinners by protein content
  const highProteinDinnerDays = new Set();
  const lowProteinDinnerDays = new Set();

  foodLogs.forEach(log => {
    const hour = new Date(log.loggedAt).getHours();
    const dateKey = getDateKey(log.loggedAt);

    // Dinner = 5pm-9pm
    if (hour >= 17 && hour <= 21) {
      const protein = log.protein || 0;
      if (protein >= 25) {
        highProteinDinnerDays.add(dateKey);
      } else if (protein < 15) {
        lowProteinDinnerDays.add(dateKey);
      }
    }
  });

  if (highProteinDinnerDays.size < 3 || lowProteinDinnerDays.size < 3) return null;

  const afterHighProtein = getNextMorningEnergy(moodLogs, highProteinDinnerDays);
  const afterLowProtein = getNextMorningEnergy(moodLogs, lowProteinDinnerDays);

  if (afterHighProtein === null || afterLowProtein === null) return null;

  const diff = ((afterHighProtein - afterLowProtein) / afterLowProtein) * 100;

  if (Math.abs(diff) < 10) return null;

  return {
    type: 'SEQUENCING',
    subtype: 'DINNER_PROTEIN',
    direction: diff > 0 ? 'positive' : 'negative',
    impact: Math.round(diff),
    highProteinDays: highProteinDinnerDays.size,
    lowProteinDays: lowProteinDinnerDays.size,
    confidence: calculateConfidence(highProteinDinnerDays.size + lowProteinDinnerDays.size, Math.abs(diff)),
    insight: diff > 0
      ? `Protein-rich dinners (25g+) correlate with ${Math.round(diff)}% better morning energy for you`
      : `Dinner protein levels don't seem to significantly impact your morning energy`,
    recommendation: diff > 0
      ? 'Consider including a good protein source with dinner for better morning energy'
      : null
  };
}

function analyzeLunchCarbs(foodLogs, moodLogs) {
  // Similar analysis for lunch carbs → afternoon energy
  const highCarbLunchDays = new Set();
  const lowCarbLunchDays = new Set();

  foodLogs.forEach(log => {
    const hour = new Date(log.loggedAt).getHours();
    const dateKey = getDateKey(log.loggedAt);

    // Lunch = 11am-2pm
    if (hour >= 11 && hour <= 14) {
      const carbs = log.carbs || 0;
      if (carbs >= 40) {
        highCarbLunchDays.add(dateKey);
      } else if (carbs < 20) {
        lowCarbLunchDays.add(dateKey);
      }
    }
  });

  if (highCarbLunchDays.size < 3 || lowCarbLunchDays.size < 3) return null;

  const afterHighCarb = getAfternoonEnergy(moodLogs, highCarbLunchDays);
  const afterLowCarb = getAfternoonEnergy(moodLogs, lowCarbLunchDays);

  if (afterHighCarb === null || afterLowCarb === null) return null;

  const diff = ((afterLowCarb - afterHighCarb) / afterHighCarb) * 100;

  if (Math.abs(diff) < 10) return null;

  return {
    type: 'SEQUENCING',
    subtype: 'LUNCH_CARBS',
    direction: diff > 0 ? 'negative' : 'positive', // High carbs might cause afternoon slump
    impact: Math.round(diff),
    highCarbDays: highCarbLunchDays.size,
    lowCarbDays: lowCarbLunchDays.size,
    confidence: calculateConfidence(highCarbLunchDays.size + lowCarbLunchDays.size, Math.abs(diff)),
    insight: diff > 0
      ? `Lower-carb lunches correlate with ${Math.round(diff)}% better afternoon energy for you`
      : `Lunch carb levels don't seem to significantly impact your afternoon energy`,
    recommendation: diff > 0
      ? 'Consider protein-forward lunches to avoid the afternoon energy dip'
      : null
  };
}

// ==================== Nutrient Patterns ====================

/**
 * Find patterns related to overall nutrient intake
 * Example: "High-protein days correlate with better recovery"
 */
function mineNutrientPatterns(foodLogs, moodLogs, activityLogs) {
  const patterns = [];

  // Aggregate daily totals
  const dailyTotals = aggregateDailyNutrients(foodLogs);

  // Pattern: High protein days → energy
  const proteinPattern = analyzeNutrientImpact(dailyTotals, moodLogs, 'protein', 100);
  if (proteinPattern) patterns.push(proteinPattern);

  // Pattern: High fiber days → mood
  const fiberPattern = analyzeNutrientImpact(dailyTotals, moodLogs, 'fiber', 25);
  if (fiberPattern) patterns.push(fiberPattern);

  return patterns;
}

function aggregateDailyNutrients(foodLogs) {
  const dailyTotals = {};

  foodLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedAt);

    if (!dailyTotals[dateKey]) {
      dailyTotals[dateKey] = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    }

    dailyTotals[dateKey].calories += log.calories || 0;
    dailyTotals[dateKey].protein += log.protein || 0;
    dailyTotals[dateKey].carbs += log.carbs || 0;
    dailyTotals[dateKey].fats += log.fats || 0;
    dailyTotals[dateKey].fiber += log.fiber || 0;
  });

  return dailyTotals;
}

function analyzeNutrientImpact(dailyTotals, moodLogs, nutrient, threshold) {
  const highDays = new Set();
  const lowDays = new Set();

  Object.entries(dailyTotals).forEach(([dateKey, totals]) => {
    if (totals[nutrient] >= threshold) {
      highDays.add(dateKey);
    } else if (totals[nutrient] < threshold * 0.6) {
      lowDays.add(dateKey);
    }
  });

  if (highDays.size < 3 || lowDays.size < 3) return null;

  const highEnergy = getAverageEnergyForDays(moodLogs, highDays);
  const lowEnergy = getAverageEnergyForDays(moodLogs, lowDays);

  if (highEnergy === null || lowEnergy === null) return null;

  const diff = ((highEnergy - lowEnergy) / lowEnergy) * 100;

  if (Math.abs(diff) < 10) return null;

  return {
    type: 'NUTRIENT',
    nutrient,
    threshold,
    direction: diff > 0 ? 'positive' : 'negative',
    impact: Math.round(diff),
    highDays: highDays.size,
    lowDays: lowDays.size,
    confidence: calculateConfidence(highDays.size + lowDays.size, Math.abs(diff)),
    insight: diff > 0
      ? `Days with ${threshold}g+ ${nutrient} correlate with ${Math.round(diff)}% better energy`
      : `High ${nutrient} days don't show a clear energy benefit for you`,
    recommendation: diff > 0
      ? `Aim for at least ${threshold}g of ${nutrient} daily for optimal energy`
      : null
  };
}

// ==================== Negative Patterns ====================

/**
 * Find foods/behaviors that correlate with NEGATIVE outcomes
 * Example: "Coffee after 3pm correlates with 20% worse sleep quality"
 */
function mineNegativePatterns(foodLogs, moodLogs, sleepLogs, stressLogs) {
  const patterns = [];

  // Pattern: Caffeine timing → sleep
  const caffeinePattern = analyzeCaffeineTiming(foodLogs, sleepLogs);
  if (caffeinePattern) patterns.push(caffeinePattern);

  // Pattern: Sugar spikes → energy crashes
  const sugarPattern = analyzeSugarSpikes(foodLogs, moodLogs);
  if (sugarPattern) patterns.push(sugarPattern);

  return patterns;
}

function analyzeCaffeineTiming(foodLogs, sleepLogs) {
  // Identify caffeine-containing foods/drinks
  const caffeineFoods = ['coffee', 'espresso', 'latte', 'cappuccino', 'tea', 'energy drink', 'cola', 'soda'];

  const lateCaffeineDays = new Set();
  const noCaffeineDays = new Set();
  const allDays = new Set(foodLogs.map(l => getDateKey(l.loggedAt)));

  foodLogs.forEach(log => {
    const hour = new Date(log.loggedAt).getHours();
    const dateKey = getDateKey(log.loggedAt);
    const foodName = (log.foodName || '').toLowerCase();

    const hasCaffeine = caffeineFoods.some(c => foodName.includes(c));

    if (hasCaffeine && hour >= 15) { // After 3pm
      lateCaffeineDays.add(dateKey);
    }
  });

  allDays.forEach(day => {
    if (!lateCaffeineDays.has(day)) {
      noCaffeineDays.add(day);
    }
  });

  if (lateCaffeineDays.size < 2 || sleepLogs.length < 5) return null;

  // Compare sleep quality
  const afterLateCaffeine = getAverageSleepQuality(sleepLogs, lateCaffeineDays);
  const afterNoCaffeine = getAverageSleepQuality(sleepLogs, noCaffeineDays);

  if (afterLateCaffeine === null || afterNoCaffeine === null) return null;

  const diff = ((afterNoCaffeine - afterLateCaffeine) / afterLateCaffeine) * 100;

  if (diff < 10) return null; // Only report if significant negative impact

  return {
    type: 'NEGATIVE',
    subtype: 'LATE_CAFFEINE',
    direction: 'negative',
    impact: Math.round(diff),
    lateCaffeineDays: lateCaffeineDays.size,
    noCaffeineDays: noCaffeineDays.size,
    confidence: calculateConfidence(lateCaffeineDays.size, diff),
    insight: `Caffeine after 3pm correlates with ${Math.round(diff)}% worse sleep quality for you`,
    recommendation: 'Consider switching to decaf or herbal tea after 3pm'
  };
}

function analyzeSugarSpikes(foodLogs, moodLogs) {
  // Find high-sugar meals and subsequent energy crashes
  const highSugarDays = new Set();
  const lowSugarDays = new Set();

  foodLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedAt);
    const sugar = log.sugar || 0;

    if (sugar > 30) {
      highSugarDays.add(dateKey);
    } else if (sugar < 10) {
      lowSugarDays.add(dateKey);
    }
  });

  if (highSugarDays.size < 3 || lowSugarDays.size < 3) return null;

  const highSugarEnergy = getAverageEnergyForDays(moodLogs, highSugarDays);
  const lowSugarEnergy = getAverageEnergyForDays(moodLogs, lowSugarDays);

  if (highSugarEnergy === null || lowSugarEnergy === null) return null;

  const diff = ((lowSugarEnergy - highSugarEnergy) / highSugarEnergy) * 100;

  if (diff < 10) return null;

  return {
    type: 'NEGATIVE',
    subtype: 'SUGAR_IMPACT',
    direction: 'negative',
    impact: Math.round(diff),
    highSugarDays: highSugarDays.size,
    lowSugarDays: lowSugarDays.size,
    confidence: calculateConfidence(highSugarDays.size + lowSugarDays.size, diff),
    insight: `High-sugar meals correlate with ${Math.round(diff)}% lower energy for you`,
    recommendation: 'Consider balancing sugary foods with protein or fiber to stabilize energy'
  };
}

// ==================== FOOD ↔ SLEEP Correlations ====================

/**
 * Find which foods affect sleep quality
 * Example: "Eating spicy food at dinner correlates with 25% worse sleep"
 */
function mineFoodSleepCorrelations(foodLogs, sleepLogs) {
  if (sleepLogs.length < MIN_SLEEP_LOGS) return [];

  const correlations = [];
  const foodGroups = groupFoodsByName(foodLogs);

  for (const [foodName, logs] of Object.entries(foodGroups)) {
    if (logs.length < MIN_CORRELATION_SAMPLES) continue;

    const sleepAfterFood = [];

    for (const foodLog of logs) {
      const foodTime = new Date(foodLog.loggedAt);
      const foodDateKey = getDateKey(foodLog.loggedAt);

      // Find sleep log for that night (next day's sleep log)
      const nextDay = new Date(foodTime);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayKey = getDateKey(nextDay);

      const sleepLog = sleepLogs.find(s => getDateKey(s.loggedAt) === nextDayKey);
      if (sleepLog && sleepLog.quality) {
        sleepAfterFood.push({ quality: sleepLog.quality, date: foodTime });
      }
    }

    if (sleepAfterFood.length >= MIN_CORRELATION_SAMPLES) {
      // Calculate baseline sleep (nights without this food)
      const foodDays = new Set(logs.map(l => getDateKey(l.loggedAt)));
      const baselineSleep = sleepLogs.filter(s => {
        const prevDay = new Date(s.loggedAt);
        prevDay.setDate(prevDay.getDate() - 1);
        return !foodDays.has(getDateKey(prevDay));
      });

      if (baselineSleep.length >= 3) {
        const avgSleepAfter = sleepAfterFood.reduce((sum, s) => sum + s.quality, 0) / sleepAfterFood.length;
        const avgBaseline = baselineSleep.reduce((sum, s) => sum + (s.quality || 5), 0) / baselineSleep.length;

        const diff = ((avgSleepAfter - avgBaseline) / avgBaseline) * 100;

        if (Math.abs(diff) > 10) {
          const isPositive = diff > 0;
          correlations.push({
            type: 'FOOD_SLEEP',
            food: foodName,
            direction: isPositive ? 'positive' : 'negative',
            sleepImpact: Math.round(diff),
            sampleSize: sleepAfterFood.length,
            confidence: calculateConfidence(sleepAfterFood.length, Math.abs(diff)),
            insight: isPositive
              ? `${foodName} correlates with ${Math.round(diff)}% better sleep quality`
              : `${foodName} correlates with ${Math.round(Math.abs(diff))}% worse sleep quality`,
            recommendation: isPositive
              ? `${foodName} seems to help your sleep - good choice for evening meals`
              : `Consider avoiding ${foodName} close to bedtime for better sleep`
          });
        }
      }
    }
  }

  return correlations.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

// ==================== FOOD ↔ STRESS Correlations ====================

/**
 * Find which foods affect stress levels
 */
function mineFoodStressCorrelations(foodLogs, stressLogs) {
  if (stressLogs.length < MIN_STRESS_LOGS) return [];

  const correlations = [];
  const foodGroups = groupFoodsByName(foodLogs);

  for (const [foodName, logs] of Object.entries(foodGroups)) {
    if (logs.length < MIN_CORRELATION_SAMPLES) continue;

    const stressAfterFood = [];

    for (const foodLog of logs) {
      const foodTime = new Date(foodLog.loggedAt);

      // Find stress logs within 4-24 hours after eating
      const relevantStress = stressLogs.filter(s => {
        const stressTime = new Date(s.loggedAt);
        const hoursDiff = (stressTime - foodTime) / (1000 * 60 * 60);
        return hoursDiff >= 4 && hoursDiff <= 24;
      });

      if (relevantStress.length > 0) {
        const avgStress = relevantStress.reduce((sum, s) => sum + (s.level || 5), 0) / relevantStress.length;
        stressAfterFood.push({ stress: avgStress, date: foodTime });
      }
    }

    if (stressAfterFood.length >= MIN_CORRELATION_SAMPLES) {
      const foodDays = new Set(logs.map(l => getDateKey(l.loggedAt)));
      const baselineStress = stressLogs.filter(s => !foodDays.has(getDateKey(s.loggedAt)));

      if (baselineStress.length >= 3) {
        const avgStressAfter = stressAfterFood.reduce((sum, s) => sum + s.stress, 0) / stressAfterFood.length;
        const avgBaseline = baselineStress.reduce((sum, s) => sum + (s.level || 5), 0) / baselineStress.length;

        // Lower stress is better, so negative diff is positive
        const diff = ((avgBaseline - avgStressAfter) / avgBaseline) * 100;

        if (Math.abs(diff) > 10) {
          const isPositive = diff > 0; // Lower stress after food = positive
          correlations.push({
            type: 'FOOD_STRESS',
            food: foodName,
            direction: isPositive ? 'positive' : 'negative',
            stressImpact: Math.round(diff),
            sampleSize: stressAfterFood.length,
            confidence: calculateConfidence(stressAfterFood.length, Math.abs(diff)),
            insight: isPositive
              ? `${foodName} correlates with ${Math.round(diff)}% lower stress levels`
              : `${foodName} correlates with ${Math.round(Math.abs(diff))}% higher stress levels`,
            recommendation: isPositive
              ? `${foodName} may help reduce your stress - consider having it during stressful periods`
              : `Be mindful of ${foodName} during stressful times - it may not help`
          });
        }
      }
    }
  }

  return correlations.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

// ==================== ACTIVITY Correlations ====================

/**
 * Find how activity affects mood
 */
function mineActivityMoodCorrelations(activityLogs, moodLogs) {
  if (activityLogs.length < MIN_ACTIVITY_LOGS || moodLogs.length < MIN_MOOD_LOGS) return [];

  const correlations = [];

  // Group by activity type
  const activityTypes = {};
  activityLogs.forEach(log => {
    const type = log.activityType || 'general';
    if (!activityTypes[type]) activityTypes[type] = [];
    activityTypes[type].push(log);
  });

  for (const [activityType, logs] of Object.entries(activityTypes)) {
    if (logs.length < MIN_CORRELATION_SAMPLES) continue;

    const moodAfterActivity = [];
    const activityDays = new Set();

    for (const activityLog of logs) {
      const activityTime = new Date(activityLog.loggedAt);
      const dateKey = getDateKey(activityLog.loggedAt);
      activityDays.add(dateKey);

      // Find mood logs 1-8 hours after activity
      const relevantMoods = moodLogs.filter(m => {
        const moodTime = new Date(m.loggedAt);
        const hoursDiff = (moodTime - activityTime) / (1000 * 60 * 60);
        return hoursDiff >= 1 && hoursDiff <= 8;
      });

      if (relevantMoods.length > 0) {
        const avgMood = relevantMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / relevantMoods.length;
        moodAfterActivity.push({ mood: avgMood, date: activityTime });
      }
    }

    if (moodAfterActivity.length >= MIN_CORRELATION_SAMPLES) {
      const baselineMoods = moodLogs.filter(m => !activityDays.has(getDateKey(m.loggedAt)));

      if (baselineMoods.length >= 3) {
        const avgMoodAfter = moodAfterActivity.reduce((sum, m) => sum + m.mood, 0) / moodAfterActivity.length;
        const avgBaseline = baselineMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / baselineMoods.length;

        const diff = ((avgMoodAfter - avgBaseline) / avgBaseline) * 100;

        if (Math.abs(diff) > 10) {
          correlations.push({
            type: 'ACTIVITY_MOOD',
            activityType,
            direction: diff > 0 ? 'positive' : 'negative',
            moodImpact: Math.round(diff),
            sampleSize: moodAfterActivity.length,
            confidence: calculateConfidence(moodAfterActivity.length, Math.abs(diff)),
            insight: diff > 0
              ? `${activityType} boosts your mood by ${Math.round(diff)}%`
              : `${activityType} doesn't seem to improve your mood`,
            recommendation: diff > 0
              ? `${activityType} is great for your mood - keep it up!`
              : null
          });
        }
      }
    }
  }

  // Also check overall activity vs no activity
  const activeDays = new Set(activityLogs.map(l => getDateKey(l.loggedAt)));
  const activeEnergy = getAverageEnergyForDays(moodLogs, activeDays);
  const inactiveDays = new Set(moodLogs.map(m => getDateKey(m.loggedAt)).filter(d => !activeDays.has(d)));
  const inactiveEnergy = getAverageEnergyForDays(moodLogs, inactiveDays);

  if (activeEnergy && inactiveEnergy && activeDays.size >= 3 && inactiveDays.size >= 3) {
    const diff = ((activeEnergy - inactiveEnergy) / inactiveEnergy) * 100;
    if (Math.abs(diff) > 10) {
      correlations.push({
        type: 'ACTIVITY_MOOD',
        activityType: 'any_activity',
        direction: diff > 0 ? 'positive' : 'negative',
        moodImpact: Math.round(diff),
        sampleSize: activeDays.size,
        confidence: calculateConfidence(activeDays.size, Math.abs(diff)),
        insight: diff > 0
          ? `Days with any activity have ${Math.round(diff)}% better energy`
          : `Activity doesn't seem to significantly impact your daily energy`,
        recommendation: diff > 0 ? 'Any movement helps your energy - even light activity!' : null
      });
    }
  }

  return correlations.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Find how activity affects sleep
 */
function mineActivitySleepCorrelations(activityLogs, sleepLogs) {
  if (activityLogs.length < MIN_ACTIVITY_LOGS || sleepLogs.length < MIN_SLEEP_LOGS) return [];

  const correlations = [];

  // Active days vs inactive days → sleep quality
  const activeDays = new Set(activityLogs.map(l => getDateKey(l.loggedAt)));

  const sleepAfterActive = sleepLogs.filter(s => {
    const prevDay = new Date(s.loggedAt);
    prevDay.setDate(prevDay.getDate() - 1);
    return activeDays.has(getDateKey(prevDay));
  });

  const sleepAfterInactive = sleepLogs.filter(s => {
    const prevDay = new Date(s.loggedAt);
    prevDay.setDate(prevDay.getDate() - 1);
    return !activeDays.has(getDateKey(prevDay));
  });

  if (sleepAfterActive.length >= 3 && sleepAfterInactive.length >= 3) {
    const avgActive = sleepAfterActive.reduce((sum, s) => sum + (s.quality || 5), 0) / sleepAfterActive.length;
    const avgInactive = sleepAfterInactive.reduce((sum, s) => sum + (s.quality || 5), 0) / sleepAfterInactive.length;

    const diff = ((avgActive - avgInactive) / avgInactive) * 100;

    if (Math.abs(diff) > 10) {
      correlations.push({
        type: 'ACTIVITY_SLEEP',
        direction: diff > 0 ? 'positive' : 'negative',
        sleepImpact: Math.round(diff),
        sampleSize: sleepAfterActive.length,
        confidence: calculateConfidence(sleepAfterActive.length, Math.abs(diff)),
        insight: diff > 0
          ? `Physical activity improves your sleep quality by ${Math.round(diff)}%`
          : `Activity close to bedtime may be affecting your sleep`,
        recommendation: diff > 0
          ? 'Keep being active - it helps you sleep better!'
          : 'Try exercising earlier in the day for better sleep'
      });
    }
  }

  // Morning vs evening activity → sleep impact
  const morningActivity = activityLogs.filter(l => new Date(l.loggedAt).getHours() < 12);
  const eveningActivity = activityLogs.filter(l => new Date(l.loggedAt).getHours() >= 18);

  if (morningActivity.length >= 3 && eveningActivity.length >= 3) {
    const morningDays = new Set(morningActivity.map(l => getDateKey(l.loggedAt)));
    const eveningDays = new Set(eveningActivity.map(l => getDateKey(l.loggedAt)));

    const sleepAfterMorning = getAverageSleepQuality(sleepLogs, morningDays);
    const sleepAfterEvening = getAverageSleepQuality(sleepLogs, eveningDays);

    if (sleepAfterMorning && sleepAfterEvening) {
      const diff = ((sleepAfterMorning - sleepAfterEvening) / sleepAfterEvening) * 100;
      if (Math.abs(diff) > 10) {
        correlations.push({
          type: 'ACTIVITY_SLEEP',
          subtype: 'TIMING',
          direction: diff > 0 ? 'positive' : 'negative',
          sleepImpact: Math.round(diff),
          sampleSize: morningActivity.length + eveningActivity.length,
          confidence: calculateConfidence(morningActivity.length, Math.abs(diff)),
          insight: diff > 0
            ? `Morning workouts give you ${Math.round(diff)}% better sleep than evening ones`
            : `Evening workouts don't negatively impact your sleep`,
          recommendation: diff > 0 ? 'Morning exercise seems optimal for your sleep' : null
        });
      }
    }
  }

  return correlations.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
}

/**
 * Find how activity affects next-day energy
 */
function mineActivityEnergyCorrelations(activityLogs, moodLogs) {
  if (activityLogs.length < MIN_ACTIVITY_LOGS || moodLogs.length < MIN_MOOD_LOGS) return [];

  const correlations = [];
  const activeDays = new Set(activityLogs.map(l => getDateKey(l.loggedAt)));

  // Next-day energy after active vs inactive days
  const nextDayEnergy = getNextMorningEnergy(moodLogs, activeDays);
  const inactiveDays = new Set(moodLogs.map(m => getDateKey(m.loggedAt)).filter(d => !activeDays.has(d)));
  const inactiveNextDay = getNextMorningEnergy(moodLogs, inactiveDays);

  if (nextDayEnergy && inactiveNextDay && activeDays.size >= 3) {
    const diff = ((nextDayEnergy - inactiveNextDay) / inactiveNextDay) * 100;
    if (Math.abs(diff) > 10) {
      correlations.push({
        type: 'ACTIVITY_ENERGY',
        direction: diff > 0 ? 'positive' : 'negative',
        energyImpact: Math.round(diff),
        sampleSize: activeDays.size,
        confidence: calculateConfidence(activeDays.size, Math.abs(diff)),
        insight: diff > 0
          ? `Active days lead to ${Math.round(diff)}% better energy the next morning`
          : `You might need more recovery time after intense activity`,
        recommendation: diff > 0
          ? 'Regular activity improves your next-day energy!'
          : 'Consider lighter activities or better recovery'
      });
    }
  }

  return correlations;
}

// ==================== HYDRATION Correlations ====================

/**
 * Find how hydration affects energy
 */
function mineHydrationEnergyCorrelations(waterLogs, moodLogs) {
  if (waterLogs.length < MIN_WATER_LOGS || moodLogs.length < MIN_MOOD_LOGS) return [];

  const correlations = [];

  // Aggregate daily water intake
  const dailyWater = {};
  waterLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedAt);
    dailyWater[dateKey] = (dailyWater[dateKey] || 0) + (log.amount || 0);
  });

  // Classify days as well-hydrated vs dehydrated
  const waterAmounts = Object.values(dailyWater);
  const avgWater = waterAmounts.reduce((a, b) => a + b, 0) / waterAmounts.length;

  const wellHydratedDays = new Set(
    Object.entries(dailyWater)
      .filter(([_, amount]) => amount >= avgWater * 1.2)
      .map(([date]) => date)
  );

  const dehydratedDays = new Set(
    Object.entries(dailyWater)
      .filter(([_, amount]) => amount < avgWater * 0.7)
      .map(([date]) => date)
  );

  if (wellHydratedDays.size >= 3 && dehydratedDays.size >= 3) {
    const wellHydratedEnergy = getAverageEnergyForDays(moodLogs, wellHydratedDays);
    const dehydratedEnergy = getAverageEnergyForDays(moodLogs, dehydratedDays);

    if (wellHydratedEnergy && dehydratedEnergy) {
      const diff = ((wellHydratedEnergy - dehydratedEnergy) / dehydratedEnergy) * 100;

      if (Math.abs(diff) > 10) {
        correlations.push({
          type: 'HYDRATION_ENERGY',
          direction: diff > 0 ? 'positive' : 'negative',
          energyImpact: Math.round(diff),
          sampleSize: wellHydratedDays.size + dehydratedDays.size,
          confidence: calculateConfidence(wellHydratedDays.size, Math.abs(diff)),
          insight: diff > 0
            ? `Good hydration gives you ${Math.round(diff)}% more energy`
            : `Hydration levels don't strongly affect your energy`,
          recommendation: diff > 0
            ? 'Staying well-hydrated significantly boosts your energy!'
            : null
        });
      }
    }
  }

  return correlations;
}

/**
 * Find how hydration affects mood
 */
function mineHydrationMoodCorrelations(waterLogs, moodLogs) {
  if (waterLogs.length < MIN_WATER_LOGS || moodLogs.length < MIN_MOOD_LOGS) return [];

  const correlations = [];

  const dailyWater = {};
  waterLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedAt);
    dailyWater[dateKey] = (dailyWater[dateKey] || 0) + (log.amount || 0);
  });

  const waterAmounts = Object.values(dailyWater);
  if (waterAmounts.length < 5) return [];

  const avgWater = waterAmounts.reduce((a, b) => a + b, 0) / waterAmounts.length;

  const wellHydratedDays = new Set(
    Object.entries(dailyWater)
      .filter(([_, amount]) => amount >= avgWater * 1.2)
      .map(([date]) => date)
  );

  const dehydratedDays = new Set(
    Object.entries(dailyWater)
      .filter(([_, amount]) => amount < avgWater * 0.7)
      .map(([date]) => date)
  );

  if (wellHydratedDays.size >= 3 && dehydratedDays.size >= 3) {
    const wellHydratedMoods = moodLogs.filter(m => wellHydratedDays.has(getDateKey(m.loggedAt)));
    const dehydratedMoods = moodLogs.filter(m => dehydratedDays.has(getDateKey(m.loggedAt)));

    if (wellHydratedMoods.length >= 3 && dehydratedMoods.length >= 3) {
      const avgWellMood = wellHydratedMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / wellHydratedMoods.length;
      const avgDehydratedMood = dehydratedMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / dehydratedMoods.length;

      const diff = ((avgWellMood - avgDehydratedMood) / avgDehydratedMood) * 100;

      if (Math.abs(diff) > 10) {
        correlations.push({
          type: 'HYDRATION_MOOD',
          direction: diff > 0 ? 'positive' : 'negative',
          moodImpact: Math.round(diff),
          sampleSize: wellHydratedDays.size + dehydratedDays.size,
          confidence: calculateConfidence(wellHydratedDays.size, Math.abs(diff)),
          insight: diff > 0
            ? `Good hydration improves your mood by ${Math.round(diff)}%`
            : `Hydration doesn't strongly correlate with your mood`,
          recommendation: diff > 0
            ? 'Water is a mood booster for you - keep drinking!'
            : null
        });
      }
    }
  }

  return correlations;
}

// ==================== SLEEP Correlations ====================

/**
 * Find how sleep quality affects mood
 */
function mineSleepMoodCorrelations(sleepLogs, moodLogs) {
  if (sleepLogs.length < MIN_SLEEP_LOGS || moodLogs.length < MIN_MOOD_LOGS) return [];

  const correlations = [];

  // Classify sleep quality
  const avgQuality = sleepLogs.reduce((sum, s) => sum + (s.quality || 5), 0) / sleepLogs.length;

  const goodSleepDays = new Set(
    sleepLogs.filter(s => (s.quality || 5) >= avgQuality * 1.2).map(s => getDateKey(s.loggedAt))
  );

  const poorSleepDays = new Set(
    sleepLogs.filter(s => (s.quality || 5) < avgQuality * 0.8).map(s => getDateKey(s.loggedAt))
  );

  if (goodSleepDays.size >= 3 && poorSleepDays.size >= 3) {
    const goodSleepMoods = moodLogs.filter(m => goodSleepDays.has(getDateKey(m.loggedAt)));
    const poorSleepMoods = moodLogs.filter(m => poorSleepDays.has(getDateKey(m.loggedAt)));

    if (goodSleepMoods.length >= 3 && poorSleepMoods.length >= 3) {
      const avgGoodMood = goodSleepMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / goodSleepMoods.length;
      const avgPoorMood = poorSleepMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / poorSleepMoods.length;

      const diff = ((avgGoodMood - avgPoorMood) / avgPoorMood) * 100;

      if (Math.abs(diff) > 10) {
        correlations.push({
          type: 'SLEEP_MOOD',
          direction: diff > 0 ? 'positive' : 'negative',
          moodImpact: Math.round(diff),
          sampleSize: goodSleepDays.size + poorSleepDays.size,
          confidence: calculateConfidence(goodSleepDays.size, Math.abs(diff)),
          insight: diff > 0
            ? `Good sleep improves your mood by ${Math.round(diff)}%`
            : `Sleep quality doesn't strongly correlate with your mood`,
          recommendation: diff > 0
            ? 'Prioritize sleep quality - it significantly affects your mood!'
            : null
        });
      }
    }
  }

  return correlations;
}

/**
 * Find how sleep quality affects energy
 */
function mineSleepEnergyCorrelations(sleepLogs, moodLogs) {
  if (sleepLogs.length < MIN_SLEEP_LOGS || moodLogs.length < MIN_MOOD_LOGS) return [];

  const correlations = [];

  const avgQuality = sleepLogs.reduce((sum, s) => sum + (s.quality || 5), 0) / sleepLogs.length;

  const goodSleepDays = new Set(
    sleepLogs.filter(s => (s.quality || 5) >= avgQuality * 1.2).map(s => getDateKey(s.loggedAt))
  );

  const poorSleepDays = new Set(
    sleepLogs.filter(s => (s.quality || 5) < avgQuality * 0.8).map(s => getDateKey(s.loggedAt))
  );

  if (goodSleepDays.size >= 3 && poorSleepDays.size >= 3) {
    const goodSleepEnergy = getAverageEnergyForDays(moodLogs, goodSleepDays);
    const poorSleepEnergy = getAverageEnergyForDays(moodLogs, poorSleepDays);

    if (goodSleepEnergy && poorSleepEnergy) {
      const diff = ((goodSleepEnergy - poorSleepEnergy) / poorSleepEnergy) * 100;

      if (Math.abs(diff) > 10) {
        correlations.push({
          type: 'SLEEP_ENERGY',
          direction: diff > 0 ? 'positive' : 'negative',
          energyImpact: Math.round(diff),
          sampleSize: goodSleepDays.size + poorSleepDays.size,
          confidence: calculateConfidence(goodSleepDays.size, Math.abs(diff)),
          insight: diff > 0
            ? `Good sleep gives you ${Math.round(diff)}% more energy`
            : `Sleep quality doesn't strongly affect your energy levels`,
          recommendation: diff > 0
            ? 'Quality sleep is key to your energy levels!'
            : null
        });
      }
    }
  }

  // Also check sleep duration
  const avgDuration = sleepLogs.reduce((sum, s) => sum + (s.duration || 7), 0) / sleepLogs.length;

  const longSleepDays = new Set(
    sleepLogs.filter(s => (s.duration || 7) >= avgDuration * 1.15).map(s => getDateKey(s.loggedAt))
  );

  const shortSleepDays = new Set(
    sleepLogs.filter(s => (s.duration || 7) < avgDuration * 0.85).map(s => getDateKey(s.loggedAt))
  );

  if (longSleepDays.size >= 3 && shortSleepDays.size >= 3) {
    const longSleepEnergy = getAverageEnergyForDays(moodLogs, longSleepDays);
    const shortSleepEnergy = getAverageEnergyForDays(moodLogs, shortSleepDays);

    if (longSleepEnergy && shortSleepEnergy) {
      const diff = ((longSleepEnergy - shortSleepEnergy) / shortSleepEnergy) * 100;

      if (Math.abs(diff) > 10) {
        correlations.push({
          type: 'SLEEP_ENERGY',
          subtype: 'DURATION',
          direction: diff > 0 ? 'positive' : 'negative',
          energyImpact: Math.round(diff),
          sampleSize: longSleepDays.size + shortSleepDays.size,
          confidence: calculateConfidence(longSleepDays.size, Math.abs(diff)),
          insight: diff > 0
            ? `Longer sleep (${Math.round(avgDuration * 1.15)}+ hours) gives you ${Math.round(diff)}% more energy`
            : `Extra sleep doesn't significantly boost your energy`,
          recommendation: diff > 0
            ? `Aim for at least ${Math.round(avgDuration * 1.15)} hours of sleep for optimal energy`
            : null
        });
      }
    }
  }

  return correlations.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
}

// ==================== STRESS Correlations ====================

/**
 * Find how stress affects sleep
 */
function mineStressSleepCorrelations(stressLogs, sleepLogs) {
  if (stressLogs.length < MIN_STRESS_LOGS || sleepLogs.length < MIN_SLEEP_LOGS) return [];

  const correlations = [];

  // Group days by stress level
  const dailyStress = {};
  stressLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedAt);
    if (!dailyStress[dateKey]) dailyStress[dateKey] = [];
    dailyStress[dateKey].push(log.level || 5);
  });

  const avgDailyStress = {};
  Object.entries(dailyStress).forEach(([date, levels]) => {
    avgDailyStress[date] = levels.reduce((a, b) => a + b, 0) / levels.length;
  });

  const overallAvg = Object.values(avgDailyStress).reduce((a, b) => a + b, 0) / Object.values(avgDailyStress).length;

  const highStressDays = new Set(
    Object.entries(avgDailyStress)
      .filter(([_, level]) => level >= overallAvg * 1.3)
      .map(([date]) => date)
  );

  const lowStressDays = new Set(
    Object.entries(avgDailyStress)
      .filter(([_, level]) => level < overallAvg * 0.7)
      .map(([date]) => date)
  );

  if (highStressDays.size >= 3 && lowStressDays.size >= 3) {
    const sleepAfterHighStress = getAverageSleepQuality(sleepLogs, highStressDays);
    const sleepAfterLowStress = getAverageSleepQuality(sleepLogs, lowStressDays);

    if (sleepAfterHighStress && sleepAfterLowStress) {
      const diff = ((sleepAfterLowStress - sleepAfterHighStress) / sleepAfterHighStress) * 100;

      if (Math.abs(diff) > 10) {
        correlations.push({
          type: 'STRESS_SLEEP',
          direction: diff > 0 ? 'negative' : 'positive',
          sleepImpact: Math.round(diff),
          sampleSize: highStressDays.size + lowStressDays.size,
          confidence: calculateConfidence(highStressDays.size, Math.abs(diff)),
          insight: diff > 0
            ? `High stress reduces your sleep quality by ${Math.round(diff)}%`
            : `Stress doesn't strongly affect your sleep`,
          recommendation: diff > 0
            ? 'Stress management could significantly improve your sleep'
            : null
        });
      }
    }
  }

  return correlations;
}

/**
 * Find how stress affects mood
 */
function mineStressMoodCorrelations(stressLogs, moodLogs) {
  if (stressLogs.length < MIN_STRESS_LOGS || moodLogs.length < MIN_MOOD_LOGS) return [];

  const correlations = [];

  const dailyStress = {};
  stressLogs.forEach(log => {
    const dateKey = getDateKey(log.loggedAt);
    if (!dailyStress[dateKey]) dailyStress[dateKey] = [];
    dailyStress[dateKey].push(log.level || 5);
  });

  const avgDailyStress = {};
  Object.entries(dailyStress).forEach(([date, levels]) => {
    avgDailyStress[date] = levels.reduce((a, b) => a + b, 0) / levels.length;
  });

  if (Object.keys(avgDailyStress).length < 5) return [];

  const overallAvg = Object.values(avgDailyStress).reduce((a, b) => a + b, 0) / Object.values(avgDailyStress).length;

  const highStressDays = new Set(
    Object.entries(avgDailyStress)
      .filter(([_, level]) => level >= overallAvg * 1.3)
      .map(([date]) => date)
  );

  const lowStressDays = new Set(
    Object.entries(avgDailyStress)
      .filter(([_, level]) => level < overallAvg * 0.7)
      .map(([date]) => date)
  );

  if (highStressDays.size >= 3 && lowStressDays.size >= 3) {
    const highStressMoods = moodLogs.filter(m => highStressDays.has(getDateKey(m.loggedAt)));
    const lowStressMoods = moodLogs.filter(m => lowStressDays.has(getDateKey(m.loggedAt)));

    if (highStressMoods.length >= 3 && lowStressMoods.length >= 3) {
      const avgHighMood = highStressMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / highStressMoods.length;
      const avgLowMood = lowStressMoods.reduce((sum, m) => sum + getMoodScore(m.mood), 0) / lowStressMoods.length;

      const diff = ((avgLowMood - avgHighMood) / avgHighMood) * 100;

      if (Math.abs(diff) > 10) {
        correlations.push({
          type: 'STRESS_MOOD',
          direction: diff > 0 ? 'negative' : 'positive',
          moodImpact: Math.round(diff),
          sampleSize: highStressDays.size + lowStressDays.size,
          confidence: calculateConfidence(highStressDays.size, Math.abs(diff)),
          insight: diff > 0
            ? `High stress days have ${Math.round(diff)}% worse mood`
            : `Your mood is resilient to stress`,
          recommendation: diff > 0
            ? 'Stress management is key to maintaining your mood'
            : null
        });
      }
    }
  }

  return correlations;
}

// ==================== Helper Functions ====================

function groupFoodsByName(foodLogs) {
  const groups = {};

  foodLogs.forEach(log => {
    // Normalize food name (lowercase, trim)
    const name = (log.foodName || 'unknown').toLowerCase().trim();
    // Use first 2-3 words for grouping (handles "grilled chicken breast" vs "grilled chicken salad")
    const normalizedName = name.split(' ').slice(0, 3).join(' ');

    if (!groups[normalizedName]) groups[normalizedName] = [];
    groups[normalizedName].push(log);
  });

  return groups;
}

function getDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMoodScore(mood) {
  const scores = {
    'great': 10, 'happy': 8, 'good': 7, 'okay': 5, 'calm': 6,
    'meh': 4, 'tired': 3, 'stressed': 3, 'anxious': 3, 'sad': 2, 'bad': 2
  };
  return scores[mood?.toLowerCase()] || 5;
}

function getAverageEnergyForDays(moodLogs, daySet) {
  const relevantMoods = moodLogs.filter(m => daySet.has(getDateKey(m.loggedAt)));
  if (relevantMoods.length === 0) return null;
  return relevantMoods.reduce((sum, m) => sum + (m.energyLevel || 5), 0) / relevantMoods.length;
}

function getNextMorningEnergy(moodLogs, daySet) {
  // Get energy from morning logs (6am-11am) on days AFTER the given days
  const nextDays = new Set();
  daySet.forEach(dateKey => {
    const d = new Date(dateKey);
    d.setDate(d.getDate() + 1);
    nextDays.add(getDateKey(d));
  });

  const morningMoods = moodLogs.filter(m => {
    const hour = new Date(m.loggedAt).getHours();
    return hour >= 6 && hour <= 11 && nextDays.has(getDateKey(m.loggedAt));
  });

  if (morningMoods.length === 0) return null;
  return morningMoods.reduce((sum, m) => sum + (m.energyLevel || 5), 0) / morningMoods.length;
}

function getAfternoonEnergy(moodLogs, daySet) {
  // Get energy from afternoon logs (2pm-6pm)
  const afternoonMoods = moodLogs.filter(m => {
    const hour = new Date(m.loggedAt).getHours();
    return hour >= 14 && hour <= 18 && daySet.has(getDateKey(m.loggedAt));
  });

  if (afternoonMoods.length === 0) return null;
  return afternoonMoods.reduce((sum, m) => sum + (m.energyLevel || 5), 0) / afternoonMoods.length;
}

function getAverageSleepQuality(sleepLogs, daySet) {
  // Get sleep quality for nights following the given days
  const nextDays = new Set();
  daySet.forEach(dateKey => {
    const d = new Date(dateKey);
    d.setDate(d.getDate() + 1);
    nextDays.add(getDateKey(d));
  });

  const relevantSleep = sleepLogs.filter(s => nextDays.has(getDateKey(s.loggedAt)));
  if (relevantSleep.length === 0) return null;
  return relevantSleep.reduce((sum, s) => sum + (s.quality || 5), 0) / relevantSleep.length;
}

function calculateConfidence(sampleSize, impactMagnitude) {
  // Confidence based on sample size and effect magnitude
  // More samples + larger effect = higher confidence
  const sampleFactor = Math.min(1, sampleSize / 10); // Max out at 10 samples
  const effectFactor = Math.min(1, impactMagnitude / 30); // Max out at 30% effect

  return Math.round((sampleFactor * 0.6 + effectFactor * 0.4) * 100);
}

function generateFoodMoodInsight(foodName, energyDiff, moodDiff, sampleSize) {
  const primaryMetric = Math.abs(energyDiff) > Math.abs(moodDiff) ? 'energy' : 'mood';
  const diff = primaryMetric === 'energy' ? energyDiff : moodDiff;
  const direction = diff > 0 ? 'better' : 'worse';

  return `${foodName} correlates with ${Math.round(Math.abs(diff))}% ${direction} ${primaryMetric} (based on ${sampleSize} occurrences)`;
}

function generateFoodMoodRecommendation(foodName, isPositive, energyDiff) {
  if (isPositive) {
    return `${foodName} seems to work well for you - consider having it when you need an energy boost`;
  } else {
    return `You might want to limit ${foodName} or pair it with other foods to offset the energy impact`;
  }
}

export default { mineUserPatterns, clearPatternCache };
