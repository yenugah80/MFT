/**
 * Prediction Engine Service
 *
 * Proactive wellness predictions based on:
 * - Historical correlation patterns
 * - Current day context (meals logged, time of day, etc.)
 * - User's personal patterns over time
 *
 * Key differentiator: PREDICT before it happens, don't just report what happened
 *
 * Time-aware predictions:
 * - Morning (5am-11am): Day forecast, breakfast impact
 * - Midday (11am-2pm): Lunch guidance, hydration check
 * - Afternoon (2pm-5pm): Energy crash prevention, snack timing
 * - Evening (5pm-9pm): Dinner impact on sleep, wind-down
 * - Night (9pm-5am): Next-day prep, sleep optimization
 */

import { db } from '../db/index.js';
import {
  foodLogTable,
  moodLogTable,
  waterLogTable,
  userCorrelationsTable,
  nutritionGoalsTable,
  profilesTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

// ============================================================================
// CONSTANTS
// ============================================================================

const ENERGY_LEVELS = {
  HIGH: { level: 'high', emoji: '⚡', label: 'High Energy', color: '#22C55E' },
  MODERATE: { level: 'moderate', emoji: '✨', label: 'Moderate', color: '#F59E0B' },
  LOW: { level: 'low', emoji: '😴', label: 'Low Energy', color: '#EF4444' },
  CRASH: { level: 'crash', emoji: '📉', label: 'Energy Crash', color: '#DC2626' },
};

const MOOD_PREDICTIONS = {
  POSITIVE: { level: 'positive', emoji: '😊', label: 'Positive Mood', color: '#22C55E' },
  STABLE: { level: 'stable', emoji: '😌', label: 'Stable', color: '#3B82F6' },
  VARIABLE: { level: 'variable', emoji: '😐', label: 'Variable', color: '#F59E0B' },
  AT_RISK: { level: 'at_risk', emoji: '⚠️', label: 'At Risk', color: '#EF4444' },
};

// Time windows for analysis
const HOURS_FOR_IMMEDIATE = 4;
const HOURS_FOR_SAME_DAY = 24;

// ============================================================================
// PERSONALIZED THRESHOLDS (calculated from user's historical data)
// ============================================================================

/**
 * Calculate personalized thresholds based on user's historical patterns
 * Falls back to sensible defaults if not enough data
 */
function calculatePersonalizedThresholds(weekMeals, weekMoods, goals) {
  // Default thresholds (used when not enough data)
  const defaults = {
    highSugar: 25,
    highCarb: 60,
    highProtein: 25,
    highCalorie: 600,
    lowProtein: 10,
    goodFiber: 5,
    hydrationWarning: 0.4, // 40% of goal
    hydrationCritical: 0.3, // 30% of goal
    proteinWarning: 0.3, // 30% of goal
    breakfastHour: 10, // Consider breakfast skipped after 10am
  };

  // Need at least 7 meals to personalize
  if (!weekMeals || weekMeals.length < 7) {
    return { ...defaults, isPersonalized: false };
  }

  // Calculate user's typical meal profile
  const avgCalories = weekMeals.reduce((sum, m) => sum + parseInt(m.calories || 0), 0) / weekMeals.length;
  const avgProtein = weekMeals.reduce((sum, m) => sum + parseInt(m.protein || 0), 0) / weekMeals.length;
  const avgCarbs = weekMeals.reduce((sum, m) => sum + parseInt(m.carbs || 0), 0) / weekMeals.length;

  // Calculate user's typical sugar intake from micros
  const sugarValues = weekMeals
    .map(m => parseInt(m.micros?.sugar || 0))
    .filter(s => s > 0);
  const avgSugar = sugarValues.length > 0
    ? sugarValues.reduce((sum, s) => sum + s, 0) / sugarValues.length
    : defaults.highSugar;

  // Find user's typical first meal time
  const mealHours = weekMeals
    .map(m => new Date(m.loggedDate).getHours())
    .filter(h => h >= 5 && h <= 12); // Morning meals only
  const typicalBreakfastHour = mealHours.length > 0
    ? Math.round(mealHours.reduce((sum, h) => sum + h, 0) / mealHours.length)
    : defaults.breakfastHour;

  return {
    // "High" is 20% above user's average
    highSugar: Math.round(avgSugar * 1.2),
    highCarb: Math.round(avgCarbs * 1.2),
    highProtein: Math.round(avgProtein * 1.2),
    highCalorie: Math.round(avgCalories * 1.2),
    // "Low" protein is below 30% of their goal or typical
    lowProtein: Math.round(Math.min(avgProtein * 0.3, goals?.protein * 0.3 || 10)),
    goodFiber: defaults.goodFiber, // Keep fiber at 5g (standard)
    hydrationWarning: defaults.hydrationWarning,
    hydrationCritical: defaults.hydrationCritical,
    proteinWarning: defaults.proteinWarning,
    // Breakfast is "skipped" if 1 hour past their typical time
    breakfastHour: Math.min(12, typicalBreakfastHour + 1),
    // Mark as personalized
    isPersonalized: true,
    // Include averages for context
    userAverages: {
      calories: Math.round(avgCalories),
      protein: Math.round(avgProtein),
      carbs: Math.round(avgCarbs),
      sugar: Math.round(avgSugar),
      typicalBreakfastHour,
    },
  };
}

// ============================================================================
// LOGGING CONSISTENCY & GAP DETECTION
// ============================================================================

/**
 * Analyze logging consistency and detect gaps
 * Returns detailed info about logging patterns and missing days
 */
function analyzeLoggingConsistency(entries, dayCount = 14) {
  if (!entries || entries.length === 0) {
    return {
      uniqueDays: 0,
      totalEntries: 0,
      consistency: 0,
      gaps: [],
      hasGaps: true,
      message: 'No data logged yet',
      daysWithData: [],
    };
  }

  // Get unique days with data
  const daysWithData = new Set();
  entries.forEach(entry => {
    const date = new Date(entry.loggedDate);
    const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    daysWithData.add(dateStr);
  });

  // Calculate expected days and find gaps
  const today = new Date();
  const gaps = [];
  const expectedDays = [];

  for (let i = 0; i < dayCount; i++) {
    const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    expectedDays.push(dateStr);

    if (!daysWithData.has(dateStr)) {
      gaps.push({
        date: checkDate.toISOString().split('T')[0],
        daysAgo: i,
        dayName: checkDate.toLocaleDateString('en-US', { weekday: 'short' }),
      });
    }
  }

  const uniqueDays = daysWithData.size;
  const consistency = Math.round((uniqueDays / dayCount) * 100);

  // Identify consecutive gap streaks
  const streaks = [];
  let currentStreak = 0;
  let streakStart = null;

  for (let i = 0; i < dayCount; i++) {
    const dateStr = expectedDays[i];
    if (!daysWithData.has(dateStr)) {
      if (currentStreak === 0) streakStart = i;
      currentStreak++;
    } else {
      if (currentStreak >= 2) {
        streaks.push({
          length: currentStreak,
          startDaysAgo: streakStart,
          message: `${currentStreak}-day gap, ${streakStart} days ago`,
        });
      }
      currentStreak = 0;
    }
  }

  return {
    uniqueDays,
    totalEntries: entries.length,
    expectedDays: dayCount,
    consistency, // percentage of days with data
    gaps: gaps.slice(0, 5), // Most recent 5 gaps
    hasGaps: gaps.length > 0,
    gapCount: gaps.length,
    streaks,
    longestStreak: streaks.length > 0 ? Math.max(...streaks.map(s => s.length)) : 0,
    daysWithData: Array.from(daysWithData),
    // Reliability assessment
    isReliable: consistency >= 70, // At least 70% of days have data
    message: consistency >= 70
      ? `${uniqueDays}/${dayCount} days logged (${consistency}%)`
      : `Only ${uniqueDays}/${dayCount} days logged - patterns may be incomplete`,
  };
}

/**
 * Get logging encouragement message based on gaps
 */
function getLoggingEncouragement(consistency) {
  if (consistency.consistency >= 90) {
    return {
      level: 'excellent',
      message: 'Amazing consistency! Your insights are highly reliable.',
      emoji: '🌟',
    };
  }
  if (consistency.consistency >= 70) {
    return {
      level: 'good',
      message: 'Good logging streak! Keep it up for better insights.',
      emoji: '✨',
    };
  }
  if (consistency.consistency >= 50) {
    return {
      level: 'improving',
      message: `Log ${consistency.gapCount} more days to unlock reliable patterns.`,
      emoji: '📈',
    };
  }
  return {
    level: 'starting',
    message: 'Keep logging daily to discover your unique patterns.',
    emoji: '🌱',
  };
}

// ============================================================================
// 14-DAY ANALYSIS (requires 2 weeks of data for reliability)
// ============================================================================

/**
 * Analyze trends by comparing this week to last week
 * Now accounts for gaps and logging consistency
 */
function analyzeTrends(twoWeekMeals, todayStart) {
  // Check logging consistency first
  const consistency = analyzeLoggingConsistency(twoWeekMeals, 14);

  if (!consistency.isReliable) {
    return {
      hasTrends: false,
      message: consistency.message,
      consistency,
      encouragement: getLoggingEncouragement(consistency),
    };
  }

  if (!twoWeekMeals || twoWeekMeals.length < 14) {
    return { hasTrends: false, message: 'Need 14+ meals for trend analysis', consistency };
  }

  const oneWeekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Split into this week and last week
  const thisWeekMeals = twoWeekMeals.filter(m => new Date(m.loggedDate) >= oneWeekAgo);
  const lastWeekMeals = twoWeekMeals.filter(m => new Date(m.loggedDate) < oneWeekAgo);

  if (thisWeekMeals.length < 5 || lastWeekMeals.length < 5) {
    return { hasTrends: false, message: 'Need more data in both weeks' };
  }

  // Calculate averages for each week
  const thisWeekAvg = {
    protein: thisWeekMeals.reduce((sum, m) => sum + parseInt(m.protein || 0), 0) / thisWeekMeals.length,
    calories: thisWeekMeals.reduce((sum, m) => sum + parseInt(m.calories || 0), 0) / thisWeekMeals.length,
    carbs: thisWeekMeals.reduce((sum, m) => sum + parseInt(m.carbs || 0), 0) / thisWeekMeals.length,
  };

  const lastWeekAvg = {
    protein: lastWeekMeals.reduce((sum, m) => sum + parseInt(m.protein || 0), 0) / lastWeekMeals.length,
    calories: lastWeekMeals.reduce((sum, m) => sum + parseInt(m.calories || 0), 0) / lastWeekMeals.length,
    carbs: lastWeekMeals.reduce((sum, m) => sum + parseInt(m.carbs || 0), 0) / lastWeekMeals.length,
  };

  // Calculate percent changes
  const proteinChange = lastWeekAvg.protein > 0
    ? Math.round(((thisWeekAvg.protein - lastWeekAvg.protein) / lastWeekAvg.protein) * 100)
    : 0;
  const calorieChange = lastWeekAvg.calories > 0
    ? Math.round(((thisWeekAvg.calories - lastWeekAvg.calories) / lastWeekAvg.calories) * 100)
    : 0;

  // Determine significant trends (>10% change)
  const trends = [];

  if (Math.abs(proteinChange) >= 10) {
    trends.push({
      metric: 'protein',
      direction: proteinChange > 0 ? 'up' : 'down',
      percent: Math.abs(proteinChange),
      message: `Protein ${proteinChange > 0 ? 'up' : 'down'} ${Math.abs(proteinChange)}% vs last week`,
      isPositive: proteinChange > 0, // More protein is usually good
    });
  }

  if (Math.abs(calorieChange) >= 15) {
    trends.push({
      metric: 'calories',
      direction: calorieChange > 0 ? 'up' : 'down',
      percent: Math.abs(calorieChange),
      message: `Calories ${calorieChange > 0 ? 'up' : 'down'} ${Math.abs(calorieChange)}% vs last week`,
      isPositive: null, // Depends on user's goal
    });
  }

  return {
    hasTrends: trends.length > 0,
    trends,
    thisWeekAvg,
    lastWeekAvg,
    dataPoints: {
      thisWeek: thisWeekMeals.length,
      lastWeek: lastWeekMeals.length,
    },
    consistency,
    encouragement: getLoggingEncouragement(consistency),
  };
}

/**
 * Detect time-of-day patterns for energy/mood crashes
 * Now accounts for logging consistency
 */
function detectCrashPatterns(twoWeekMoods) {
  // Check logging consistency first
  const consistency = analyzeLoggingConsistency(twoWeekMoods, 14);

  if (!consistency.isReliable) {
    return {
      hasPatterns: false,
      message: consistency.message,
      consistency,
      encouragement: getLoggingEncouragement(consistency),
    };
  }

  if (!twoWeekMoods || twoWeekMoods.length < 10) {
    return { hasPatterns: false, message: 'Need 10+ mood logs for crash detection', consistency };
  }

  // Find low-energy moods (assuming mood has energy or intensity field)
  const lowEnergyMoods = twoWeekMoods.filter(m => {
    const energy = m.energy || m.intensity || 5;
    return energy <= 3; // Low energy threshold
  });

  if (lowEnergyMoods.length < 3) {
    return { hasPatterns: false, message: 'Not enough low-energy entries to detect patterns' };
  }

  // Group by hour of day
  const hourCounts = {};
  lowEnergyMoods.forEach(m => {
    const hour = new Date(m.loggedDate).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // Find peak crash hour (most common low-energy time)
  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))[0];

  if (!peakHour || peakHour.count < 2) {
    return { hasPatterns: false, message: 'No consistent crash time detected' };
  }

  // Format hour for display
  const formatHour = (h) => {
    if (h === 0) return '12am';
    if (h < 12) return `${h}am`;
    if (h === 12) return '12pm';
    return `${h - 12}pm`;
  };

  return {
    hasPatterns: true,
    peakCrashHour: peakHour.hour,
    peakCrashTime: formatHour(peakHour.hour),
    occurrences: peakHour.count,
    message: `You often feel low energy around ${formatHour(peakHour.hour)}`,
    confidence: Math.min(0.9, 0.4 + (peakHour.count * 0.1)), // More occurrences = higher confidence
    consistency,
  };
}

/**
 * Detect weekend vs weekday patterns
 * Now accounts for logging consistency
 */
function detectWeekendPatterns(twoWeekMeals, twoWeekMoods) {
  // Check logging consistency first
  const consistency = analyzeLoggingConsistency(twoWeekMeals, 14);

  if (!consistency.isReliable) {
    return {
      hasPatterns: false,
      message: consistency.message,
      consistency,
      encouragement: getLoggingEncouragement(consistency),
    };
  }

  if (!twoWeekMeals || twoWeekMeals.length < 14) {
    return { hasPatterns: false, consistency };
  }

  // Separate weekend (Sat=6, Sun=0) and weekday meals
  const weekendMeals = twoWeekMeals.filter(m => {
    const day = new Date(m.loggedDate).getDay();
    return day === 0 || day === 6;
  });

  const weekdayMeals = twoWeekMeals.filter(m => {
    const day = new Date(m.loggedDate).getDay();
    return day !== 0 && day !== 6;
  });

  if (weekendMeals.length < 4 || weekdayMeals.length < 8) {
    return { hasPatterns: false };
  }

  // Calculate averages
  const weekendAvgCal = weekendMeals.reduce((sum, m) => sum + parseInt(m.calories || 0), 0) / weekendMeals.length;
  const weekdayAvgCal = weekdayMeals.reduce((sum, m) => sum + parseInt(m.calories || 0), 0) / weekdayMeals.length;

  const calorieDiff = Math.round(((weekendAvgCal - weekdayAvgCal) / weekdayAvgCal) * 100);

  // Weekend meal timing
  const weekendMealHours = weekendMeals.map(m => new Date(m.loggedDate).getHours());
  const weekdayMealHours = weekdayMeals.map(m => new Date(m.loggedDate).getHours());

  const avgWeekendFirstMeal = weekendMealHours.filter(h => h < 12).length > 0
    ? Math.round(weekendMealHours.filter(h => h < 12).reduce((a, b) => a + b, 0) / weekendMealHours.filter(h => h < 12).length)
    : null;

  const avgWeekdayFirstMeal = weekdayMealHours.filter(h => h < 12).length > 0
    ? Math.round(weekdayMealHours.filter(h => h < 12).reduce((a, b) => a + b, 0) / weekdayMealHours.filter(h => h < 12).length)
    : null;

  const patterns = [];

  // Significant calorie difference
  if (Math.abs(calorieDiff) >= 15) {
    patterns.push({
      type: 'calories',
      message: calorieDiff > 0
        ? `You eat ${calorieDiff}% more on weekends`
        : `You eat ${Math.abs(calorieDiff)}% less on weekends`,
      isPositive: null,
    });
  }

  // Different meal timing
  if (avgWeekendFirstMeal && avgWeekdayFirstMeal && Math.abs(avgWeekendFirstMeal - avgWeekdayFirstMeal) >= 2) {
    patterns.push({
      type: 'timing',
      message: avgWeekendFirstMeal > avgWeekdayFirstMeal
        ? `You start eating ${avgWeekendFirstMeal - avgWeekdayFirstMeal}h later on weekends`
        : `You start eating earlier on weekends`,
      weekdayFirstMeal: avgWeekdayFirstMeal,
      weekendFirstMeal: avgWeekendFirstMeal,
    });
  }

  return {
    hasPatterns: patterns.length > 0,
    patterns,
    weekendAvgCalories: Math.round(weekendAvgCal),
    weekdayAvgCalories: Math.round(weekdayAvgCal),
    consistency,
    encouragement: getLoggingEncouragement(consistency),
  };
}

// ============================================================================
// MORNING PREDICTION
// ============================================================================

/**
 * Generate morning prediction for the day ahead
 * Based on: last night's dinner, sleep indicators, recent patterns
 */
export async function generateMorningPrediction(userId) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last14DaysStart = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch data in parallel
    const [
      lastNightMeals,
      todayMeals,
      todayWater,
      todayMoods,
      weekMoods,
      weekMeals,
      twoWeekMeals,  // For trend analysis
      twoWeekMoods,  // For pattern detection
      correlations,
      goals,
    ] = await Promise.all([
      // Last night's meals (after 6pm yesterday)
      db.select()
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, new Date(yesterdayStart.getTime() + 18 * 60 * 60 * 1000)), // 6pm yesterday
          lte(foodLogTable.loggedDate, todayStart)
        ))
        .orderBy(desc(foodLogTable.loggedDate)),

      // Today's meals so far
      db.select()
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, todayStart)
        ))
        .orderBy(desc(foodLogTable.loggedDate)),

      // Today's water
      db.select()
        .from(waterLogTable)
        .where(and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, todayStart)
        )),

      // Today's moods
      db.select()
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, todayStart)
        ))
        .orderBy(desc(moodLogTable.loggedDate)),

      // Week's moods for pattern analysis
      db.select()
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, lastWeekStart)
        ))
        .orderBy(desc(moodLogTable.loggedDate)),

      // Week's meals for pattern analysis
      db.select()
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, lastWeekStart)
        ))
        .orderBy(desc(foodLogTable.loggedDate)),

      // 14-day meals for trend analysis (requires more data for reliability)
      db.select()
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, last14DaysStart)
        ))
        .orderBy(desc(foodLogTable.loggedDate)),

      // 14-day moods for pattern detection (crash time, day-of-week patterns)
      db.select()
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, last14DaysStart)
        ))
        .orderBy(desc(moodLogTable.loggedDate)),

      // User's discovered correlations
      db.select()
        .from(userCorrelationsTable)
        .where(and(
          eq(userCorrelationsTable.userId, userId),
          gte(userCorrelationsTable.confidence, 0.5)
        ))
        .orderBy(desc(userCorrelationsTable.confidence))
        .limit(20),

      // User's nutrition goals
      db.select()
        .from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1),
    ]);

    // Calculate PERSONALIZED thresholds from user's historical data
    const thresholds = calculatePersonalizedThresholds(weekMeals, weekMoods, goals[0]);

    // Analyze last night's dinner (using personalized thresholds)
    const dinnerAnalysis = analyzeDinnerImpact(lastNightMeals, thresholds);

    // 14-day deep analysis (requires 2 weeks of data for reliability)
    const trendAnalysis = analyzeTrends(twoWeekMeals, todayStart);
    const crashPatterns = detectCrashPatterns(twoWeekMoods);
    const weekendPatterns = detectWeekendPatterns(twoWeekMeals, twoWeekMoods);

    // Calculate current day state
    const currentHour = now.getHours();
    const dayProgress = currentHour / 24;

    // Calculate today's hydration
    const todayHydration = todayWater.reduce((sum, w) => sum + parseFloat(w.hydrationLiters || 0), 0);
    const hydrationGoal = goals[0]?.waterLiters || 2.5;
    const hydrationPercent = Math.min(100, Math.round((todayHydration / hydrationGoal) * 100));

    // Calculate today's protein
    const todayProtein = todayMeals.reduce((sum, m) => sum + parseInt(m.protein || 0), 0);
    const proteinGoal = goals[0]?.protein || 50;

    // Calculate energy prediction based on patterns
    const energyPrediction = predictEnergyLevels(
      dinnerAnalysis,
      todayMeals,
      todayHydration,
      hydrationGoal,
      weekMoods,
      correlations,
      currentHour
    );

    // Identify risks and prevention tips (using personalized thresholds)
    const risks = identifyRisks(
      dinnerAnalysis,
      todayMeals,
      todayHydration,
      hydrationGoal,
      todayProtein,
      proteinGoal,
      currentHour,
      correlations,
      thresholds
    );

    // Generate prevention tips
    const preventionTips = generatePreventionTips(risks, correlations, currentHour);

    // Calculate overall energy score (0-100)
    const energyScore = calculateEnergyScore(
      dinnerAnalysis,
      todayMeals,
      todayHydration,
      hydrationGoal,
      currentHour
    );

    return {
      success: true,
      prediction: {
        generatedAt: now.toISOString(),
        energyScore,
        energyLevel: energyPrediction.level,
        energyLabel: energyPrediction.label,
        energyColor: energyPrediction.color,

        // Risk analysis
        risks,
        hasHighRisk: risks.some(r => r.severity === 'high'),
        primaryRisk: risks[0] || null,

        // Prevention tips
        preventionTips,

        // Context
        context: {
          lastNightDinner: dinnerAnalysis,
          todayProgress: {
            mealsLogged: todayMeals.length,
            hydrationPercent,
            hydrationLiters: Math.round(todayHydration * 10) / 10,
            proteinGrams: todayProtein,
            proteinPercent: Math.min(100, Math.round((todayProtein / proteinGoal) * 100)),
          },
          currentHour,
          dayProgress: Math.round(dayProgress * 100),
          // Include personalization info for transparency
          personalization: {
            isPersonalized: thresholds.isPersonalized,
            userAverages: thresholds.userAverages || null,
            breakfastHour: thresholds.breakfastHour,
          },
        },

        // Confidence in prediction
        confidence: calculatePredictionConfidence(weekMoods.length, weekMeals.length, correlations.length),
        dataPointsUsed: weekMoods.length + weekMeals.length,

        // 14-day deep insights (only populated when enough data exists)
        // These are SUPPLEMENTARY - predictions work without them
        deepInsights: {
          trends: trendAnalysis.hasTrends ? trendAnalysis : null,
          crashPatterns: crashPatterns.hasPatterns ? crashPatterns : null,
          weekendPatterns: weekendPatterns.hasPatterns ? weekendPatterns : null,
          hasDeepInsights: trendAnalysis.hasTrends || crashPatterns.hasPatterns || weekendPatterns.hasPatterns,

          // Logging consistency (tells user about gaps)
          loggingConsistency: {
            meals: trendAnalysis.consistency || analyzeLoggingConsistency(twoWeekMeals, 14),
            moods: crashPatterns.consistency || analyzeLoggingConsistency(twoWeekMoods, 14),
          },

          // Encouragement for users with gaps
          encouragement: !trendAnalysis.hasTrends && trendAnalysis.encouragement
            ? trendAnalysis.encouragement
            : !crashPatterns.hasPatterns && crashPatterns.encouragement
            ? crashPatterns.encouragement
            : null,

          // Summary for UI
          summary: trendAnalysis.hasTrends || crashPatterns.hasPatterns || weekendPatterns.hasPatterns
            ? 'Deep insights available'
            : trendAnalysis.consistency?.isReliable === false
            ? `Log ${trendAnalysis.consistency?.gapCount || 'more'} days to unlock deep patterns`
            : 'Keep logging to unlock deeper insights',

          dataAge: {
            mealsLast14Days: twoWeekMeals.length,
            moodsLast14Days: twoWeekMoods.length,
            uniqueMealDays: trendAnalysis.consistency?.uniqueDays || 0,
            uniqueMoodDays: crashPatterns.consistency?.uniqueDays || 0,
            sufficientData: (trendAnalysis.consistency?.isReliable ?? false) &&
                           (crashPatterns.consistency?.isReliable ?? false),
          },
        },
      },
    };
  } catch (error) {
    console.error('[PredictionEngine] Morning prediction error:', error);
    return {
      success: false,
      error: error.message,
      prediction: null,
    };
  }
}

// ============================================================================
// MEAL FEELING PREDICTION
// ============================================================================

/**
 * Predict how a meal will make the user feel
 * This is the "How Will This Make Me Feel?" feature
 */
export async function predictMealFeeling(userId, mealData) {
  try {
    const {
      calories = 0,
      protein = 0,
      carbs = 0,
      sugar = 0,
      fiber = 0,
      novaScore = 2,
      mealType = 'snack',
    } = mealData;

    const now = new Date();
    const currentHour = now.getHours();
    const lastWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch user's historical patterns
    const [correlations, similarMeals] = await Promise.all([
      db.select()
        .from(userCorrelationsTable)
        .where(and(
          eq(userCorrelationsTable.userId, userId),
          gte(userCorrelationsTable.confidence, 0.4)
        ))
        .orderBy(desc(userCorrelationsTable.confidence))
        .limit(20),

      // Find similar meals from history
      db.select()
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, lastWeekStart)
        ))
        .orderBy(desc(foodLogTable.loggedDate))
        .limit(100),
    ]);

    // Analyze meal characteristics
    const mealCharacteristics = {
      isHighSugar: sugar > 25,
      isHighCarb: carbs > 60,
      isHighProtein: protein > 25,
      isHighCalorie: calories > 600,
      isLowProtein: protein < 10,
      isProcessed: novaScore >= 3,
      hasGoodFiber: fiber >= 5,
      carbToFiberRatio: fiber > 0 ? carbs / fiber : carbs,
      proteinToCalorieRatio: calories > 0 ? (protein * 4) / calories : 0,
    };

    // Generate timeline predictions
    const timeline = generateFeelingTimeline(mealCharacteristics, currentHour, correlations);

    // Calculate overall meal impact score (-100 to +100)
    const impactScore = calculateMealImpactScore(mealCharacteristics);

    // Generate insights based on patterns
    const insights = generateMealInsights(mealCharacteristics, correlations, similarMeals.length);

    return {
      success: true,
      feeling: {
        impactScore, // -100 (bad) to +100 (good)
        impactLabel: getImpactLabel(impactScore),
        impactColor: getImpactColor(impactScore),

        // Timeline: what to expect at different points
        timeline,

        // Key insights
        insights,

        // Meal characteristics summary
        characteristics: {
          energyProfile: getEnergyProfile(mealCharacteristics),
          sustainabilityScore: getSustainabilityScore(mealCharacteristics),
          crashRisk: getCrashRisk(mealCharacteristics),
        },

        // Based on historical data
        basedOnMeals: similarMeals.length,
        confidence: Math.min(0.9, 0.5 + (similarMeals.length * 0.01)),
      },
    };
  } catch (error) {
    console.error('[PredictionEngine] Meal feeling prediction error:', error);
    return {
      success: false,
      error: error.message,
      feeling: null,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function analyzeDinnerImpact(lastNightMeals, thresholds = {}) {
  if (!lastNightMeals || lastNightMeals.length === 0) {
    return {
      hasData: false,
      summary: 'No dinner data',
      impact: 'unknown',
    };
  }

  // Use personalized thresholds or defaults
  const highCarb = thresholds.highCarb || 60;
  const highSugar = thresholds.highSugar || 30;
  const highCalorie = thresholds.highCalorie || 500;

  const totalCalories = lastNightMeals.reduce((sum, m) => sum + parseInt(m.calories || 0), 0);
  const totalCarbs = lastNightMeals.reduce((sum, m) => sum + parseInt(m.carbs || 0), 0);
  const totalSugar = lastNightMeals.reduce((sum, m) => {
    const micros = m.micros || {};
    return sum + parseInt(micros.sugar || 0);
  }, 0);
  const avgNova = lastNightMeals.reduce((sum, m) => sum + parseInt(m.novaScore || 2), 0) / lastNightMeals.length;

  // Get latest meal time
  const latestMealTime = new Date(lastNightMeals[0].loggedDate);
  const mealHour = latestMealTime.getHours();
  const isLateMeal = mealHour >= 21; // After 9pm

  // Determine impact using PERSONALIZED thresholds
  let impact = 'neutral';
  let factors = [];

  if (totalCarbs > highCarb) {
    impact = 'negative';
    factors.push(`High carbs (${totalCarbs}g vs your typical ${thresholds.userAverages?.carbs || highCarb}g) can affect sleep`);
  }
  if (totalSugar > highSugar) {
    impact = 'negative';
    factors.push(`High sugar (${totalSugar}g) may cause morning grogginess`);
  }
  if (isLateMeal && totalCalories > highCalorie) {
    impact = 'negative';
    factors.push('Late heavy meal may disrupt sleep');
  }
  if (avgNova >= 3) {
    factors.push('Processed foods may affect energy');
  }

  return {
    hasData: true,
    totalCalories,
    totalCarbs,
    totalSugar,
    avgNova: Math.round(avgNova * 10) / 10,
    isLateMeal,
    mealHour,
    impact,
    factors,
    summary: factors.length > 0
      ? factors[0]
      : 'Dinner looks balanced',
    // Include threshold info for transparency
    thresholdsUsed: {
      highCarb,
      highSugar,
      highCalorie,
      isPersonalized: thresholds.isPersonalized || false,
    },
  };
}

function predictEnergyLevels(dinnerAnalysis, todayMeals, todayHydration, hydrationGoal, weekMoods, correlations, currentHour) {
  let score = 70; // Base score

  // Adjust based on dinner
  if (dinnerAnalysis.hasData) {
    if (dinnerAnalysis.impact === 'negative') score -= 15;
    if (dinnerAnalysis.isLateMeal) score -= 10;
    if (dinnerAnalysis.totalSugar > 40) score -= 10;
  }

  // Adjust based on today's progress
  const hydrationRatio = todayHydration / hydrationGoal;
  if (hydrationRatio < 0.3 && currentHour > 12) score -= 15;
  if (hydrationRatio > 0.5) score += 5;

  // Adjust based on meals today
  if (todayMeals.length === 0 && currentHour > 10) score -= 10;

  const todayProtein = todayMeals.reduce((sum, m) => sum + parseInt(m.protein || 0), 0);
  if (todayProtein > 20) score += 10;

  // Apply correlation-based adjustments
  correlations.forEach(corr => {
    if (corr.healthImpact === 'negative' && corr.confidence > 0.6) {
      score -= 5;
    }
  });

  // Determine level
  if (score >= 75) return ENERGY_LEVELS.HIGH;
  if (score >= 55) return ENERGY_LEVELS.MODERATE;
  if (score >= 35) return ENERGY_LEVELS.LOW;
  return ENERGY_LEVELS.CRASH;
}

function identifyRisks(dinnerAnalysis, todayMeals, todayHydration, hydrationGoal, todayProtein, proteinGoal, currentHour, correlations, thresholds = {}) {
  const risks = [];

  // Use personalized thresholds or defaults
  const hydrationWarning = thresholds.hydrationWarning || 0.4;
  const hydrationCritical = thresholds.hydrationCritical || 0.2;
  const proteinWarning = thresholds.proteinWarning || 0.3;
  const breakfastHour = thresholds.breakfastHour || 10;
  const highSugar = thresholds.highSugar || 40;

  // Check dehydration risk (personalized)
  const hydrationRatio = todayHydration / hydrationGoal;
  if (hydrationRatio < hydrationWarning && currentHour > 11) {
    risks.push({
      type: 'dehydration',
      severity: hydrationRatio < hydrationCritical ? 'high' : 'medium',
      title: 'Dehydration Risk',
      description: `You're at ${Math.round(hydrationRatio * 100)}% of your water goal`,
      timeWindow: 'Now',
      icon: 'water-outline',
    });
  }

  // Check energy crash risk based on dinner
  if (dinnerAnalysis.hasData && dinnerAnalysis.impact === 'negative') {
    const crashTime = currentHour < 15 ? '2-3pm' : '4-5pm';
    risks.push({
      type: 'energy_crash',
      severity: dinnerAnalysis.totalSugar > highSugar ? 'high' : 'medium',
      title: 'Energy Dip Likely',
      description: dinnerAnalysis.summary,
      timeWindow: crashTime,
      icon: 'battery-dead-outline',
    });
  }

  // Check protein deficiency (personalized)
  if (todayProtein < proteinGoal * proteinWarning && currentHour > 12) {
    risks.push({
      type: 'low_protein',
      severity: 'medium',
      title: 'Low Protein',
      description: `Only ${todayProtein}g so far - may cause fatigue`,
      timeWindow: 'Afternoon',
      icon: 'fitness-outline',
    });
  }

  // Check skipped breakfast (personalized based on user's typical breakfast time)
  if (todayMeals.length === 0 && currentHour >= breakfastHour && currentHour < 12) {
    const typicalTime = thresholds.userAverages?.typicalBreakfastHour;
    risks.push({
      type: 'skipped_breakfast',
      severity: 'medium',
      title: 'No Breakfast Logged',
      description: typicalTime
        ? `You usually eat around ${typicalTime}am`
        : 'May lead to afternoon energy crash',
      timeWindow: '2-4pm',
      icon: 'restaurant-outline',
    });
  }

  // Check for patterns from correlations
  correlations.forEach(corr => {
    if (corr.healthImpact === 'negative' && corr.confidence > 0.65 && !risks.some(r => r.type === corr.correlationType)) {
      risks.push({
        type: corr.correlationType,
        severity: corr.confidence > 0.8 ? 'high' : 'medium',
        title: formatCorrelationTitle(corr.correlationType),
        description: `Pattern detected in your data`,
        timeWindow: 'Based on history',
        icon: 'analytics-outline',
      });
    }
  });

  return risks.slice(0, 3); // Top 3 risks
}

function generatePreventionTips(risks, correlations, currentHour) {
  const tips = [];

  // Only add tips for actual identified risks
  risks.forEach(risk => {
    switch (risk.type) {
      case 'dehydration':
        tips.push({
          icon: 'water',
          action: 'Drink 500ml water now',
          reason: 'Prevents afternoon fatigue',
          priority: 1,
        });
        break;
      case 'energy_crash':
        tips.push({
          icon: 'nutrition',
          action: 'Have a protein-rich snack',
          reason: 'Stabilizes blood sugar',
          priority: 2,
        });
        break;
      case 'low_protein':
        tips.push({
          icon: 'egg',
          action: 'Add protein to your next meal',
          reason: 'Sustains energy levels',
          priority: 2,
        });
        break;
      case 'skipped_breakfast':
        tips.push({
          icon: 'sunny',
          action: 'Have a balanced breakfast',
          reason: 'Sets energy tone for the day',
          priority: 1,
        });
        break;
    }
  });

  // Only add walk tip in afternoon if there are other risks and user might benefit
  if (currentHour >= 14 && currentHour <= 16 && tips.length > 0 && !tips.some(t => t.action.includes('walk'))) {
    tips.push({
      icon: 'walk',
      action: 'Take a 10-min walk',
      reason: 'Boosts afternoon energy naturally',
      priority: 3,
    });
  }

  // Don't return generic tips if there are no risks - the user is doing well!
  return tips.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

function calculateEnergyScore(dinnerAnalysis, todayMeals, todayHydration, hydrationGoal, currentHour) {
  let score = 78; // Optimistic base

  // Dinner impact
  if (dinnerAnalysis.hasData) {
    if (dinnerAnalysis.impact === 'negative') score -= 12;
    if (dinnerAnalysis.isLateMeal) score -= 8;
  }

  // Hydration
  const hydrationRatio = todayHydration / hydrationGoal;
  score += Math.min(10, hydrationRatio * 15);

  // Breakfast logged
  if (todayMeals.length > 0) score += 5;

  // Protein intake
  const todayProtein = todayMeals.reduce((sum, m) => sum + parseInt(m.protein || 0), 0);
  if (todayProtein > 20) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculatePredictionConfidence(moodCount, mealCount, correlationCount) {
  // More data = higher confidence
  const dataScore = Math.min(1, (moodCount + mealCount) / 50);
  const patternScore = Math.min(1, correlationCount / 10);

  return Math.round((0.4 + dataScore * 0.3 + patternScore * 0.3) * 100) / 100;
}

function formatCorrelationTitle(correlationType) {
  const titles = {
    'sugar_mood_crash': 'Sugar Impact',
    'dehydration_fatigue': 'Hydration Effect',
    'late_meal_sleep': 'Late Meal Impact',
    'protein_energy': 'Protein Levels',
    'nova_mood': 'Food Quality Effect',
  };
  return titles[correlationType] || 'Pattern Detected';
}

// Meal feeling prediction helpers

function generateFeelingTimeline(characteristics, currentHour, correlations) {
  const timeline = [];

  // Immediate (30 min)
  if (characteristics.isHighCarb || characteristics.isHighSugar) {
    timeline.push({
      timeLabel: 'In 30 min',
      minutes: 30,
      feeling: 'energy_spike',
      emoji: '⚡',
      description: 'Quick energy boost',
      change: '+15%',
      color: '#22C55E',
    });
  } else if (characteristics.isHighProtein) {
    timeline.push({
      timeLabel: 'In 30 min',
      minutes: 30,
      feeling: 'satisfied',
      emoji: '😌',
      description: 'Feeling satisfied',
      change: '+10%',
      color: '#3B82F6',
    });
  }

  // 1-2 hours
  if (characteristics.isHighSugar && !characteristics.hasGoodFiber) {
    timeline.push({
      timeLabel: 'In 1-2 hours',
      minutes: 90,
      feeling: 'energy_dip',
      emoji: '😴',
      description: 'Energy may dip',
      change: '-20%',
      color: '#F59E0B',
    });
  } else if (characteristics.isHighProtein && characteristics.hasGoodFiber) {
    timeline.push({
      timeLabel: 'In 1-2 hours',
      minutes: 90,
      feeling: 'sustained',
      emoji: '✨',
      description: 'Sustained energy',
      change: '+5%',
      color: '#22C55E',
    });
  }

  // 3-4 hours
  if (characteristics.isHighSugar || (characteristics.isHighCarb && !characteristics.isHighProtein)) {
    timeline.push({
      timeLabel: 'In 3-4 hours',
      minutes: 210,
      feeling: 'crash_risk',
      emoji: '📉',
      description: 'Crash likely',
      change: '-25%',
      color: '#EF4444',
    });
  } else {
    timeline.push({
      timeLabel: 'In 3-4 hours',
      minutes: 210,
      feeling: 'stable',
      emoji: '😊',
      description: 'Back to baseline',
      change: '0%',
      color: '#6B7280',
    });
  }

  return timeline;
}

function calculateMealImpactScore(characteristics) {
  let score = 0;

  // Positive factors
  if (characteristics.isHighProtein) score += 25;
  if (characteristics.hasGoodFiber) score += 20;
  if (characteristics.proteinToCalorieRatio > 0.2) score += 15;

  // Negative factors
  if (characteristics.isHighSugar) score -= 30;
  if (characteristics.isProcessed) score -= 20;
  if (characteristics.isLowProtein) score -= 15;
  if (characteristics.carbToFiberRatio > 10) score -= 15;
  if (characteristics.isHighCalorie && characteristics.isLowProtein) score -= 20;

  return Math.max(-100, Math.min(100, score));
}

function getImpactLabel(score) {
  if (score >= 30) return 'Great choice!';
  if (score >= 10) return 'Good balance';
  if (score >= -10) return 'Moderate';
  if (score >= -30) return 'Watch out';
  return 'Consider alternatives';
}

function getImpactColor(score) {
  if (score >= 30) return '#22C55E';
  if (score >= 10) return '#84CC16';
  if (score >= -10) return '#F59E0B';
  if (score >= -30) return '#F97316';
  return '#EF4444';
}

function getEnergyProfile(characteristics) {
  if (characteristics.isHighSugar && !characteristics.hasGoodFiber) {
    return { type: 'spike_crash', label: 'Quick spike then crash', icon: '📈📉' };
  }
  if (characteristics.isHighProtein && characteristics.hasGoodFiber) {
    return { type: 'sustained', label: 'Slow, sustained release', icon: '📊' };
  }
  if (characteristics.isHighCarb && characteristics.hasGoodFiber) {
    return { type: 'moderate', label: 'Moderate energy boost', icon: '📈' };
  }
  return { type: 'standard', label: 'Standard energy curve', icon: '➡️' };
}

function getSustainabilityScore(characteristics) {
  let score = 50;
  if (characteristics.isHighProtein) score += 20;
  if (characteristics.hasGoodFiber) score += 20;
  if (characteristics.isHighSugar) score -= 25;
  if (characteristics.isProcessed) score -= 15;
  return Math.max(0, Math.min(100, score));
}

function getCrashRisk(characteristics) {
  if (characteristics.isHighSugar && !characteristics.hasGoodFiber) {
    return { level: 'high', label: 'High crash risk', color: '#EF4444' };
  }
  if (characteristics.isHighCarb && !characteristics.isHighProtein) {
    return { level: 'medium', label: 'Moderate crash risk', color: '#F59E0B' };
  }
  return { level: 'low', label: 'Low crash risk', color: '#22C55E' };
}

function generateMealInsights(characteristics, correlations, similarMealCount) {
  const insights = [];

  if (characteristics.isHighSugar) {
    insights.push({
      type: 'warning',
      icon: 'warning',
      text: 'High sugar content may cause energy fluctuations',
    });
  }

  if (characteristics.isHighProtein) {
    insights.push({
      type: 'positive',
      icon: 'checkmark-circle',
      text: 'Good protein content for sustained energy',
    });
  }

  if (characteristics.hasGoodFiber) {
    insights.push({
      type: 'positive',
      icon: 'leaf',
      text: 'Fiber helps stabilize blood sugar',
    });
  }

  if (characteristics.isProcessed) {
    insights.push({
      type: 'info',
      icon: 'information-circle',
      text: 'Processed foods may affect mood and energy',
    });
  }

  if (similarMealCount > 10) {
    insights.push({
      type: 'data',
      icon: 'analytics',
      text: `Prediction based on ${similarMealCount} similar meals`,
    });
  }

  return insights.slice(0, 3);
}

// ============================================================================
// TIME-AWARE PREDICTION (Adapts throughout the day)
// ============================================================================

/**
 * Get time period based on current hour
 */
function getTimePeriod(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get greeting based on time period
 */
function getTimeGreeting(period) {
  const greetings = {
    morning: 'Good morning',
    midday: 'Good afternoon',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
    night: 'Good night',
  };
  return greetings[period] || 'Hello';
}

/**
 * Get forecast title based on time period
 */
function getForecastTitle(period) {
  const titles = {
    morning: 'YOUR DAY FORECAST',
    midday: 'AFTERNOON OUTLOOK',
    afternoon: 'EVENING AHEAD',
    evening: 'TONIGHT & TOMORROW',
    night: 'TOMORROW PREP',
  };
  return titles[period] || 'YOUR FORECAST';
}

/**
 * Generate time-aware prediction
 * Adapts the prediction context and recommendations based on time of day
 */
export async function generateTimeAwarePrediction(userId) {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const timePeriod = getTimePeriod(currentHour);

    // Get base prediction data
    const basePrediction = await generateMorningPrediction(userId);

    if (!basePrediction.success) {
      return basePrediction;
    }

    const prediction = basePrediction.prediction;

    // Adapt messaging based on time period
    const adaptedPrediction = {
      ...prediction,
      timePeriod,
      greeting: getTimeGreeting(timePeriod),
      forecastTitle: getForecastTitle(timePeriod),

      // Time-specific focus areas
      focusArea: getTimeFocusArea(timePeriod, prediction),

      // Adapted prevention tips
      preventionTips: adaptPreventionTips(prediction.preventionTips, timePeriod, currentHour),

      // Time-specific risks
      risks: adaptRisks(prediction.risks, timePeriod, currentHour),

      // Next milestone
      nextMilestone: getNextMilestone(timePeriod, prediction.context),
    };

    return {
      success: true,
      prediction: adaptedPrediction,
    };
  } catch (error) {
    console.error('[PredictionEngine] Time-aware prediction error:', error);
    return {
      success: false,
      error: error.message,
      prediction: null,
    };
  }
}

/**
 * Get focus area based on actual user state (dynamic, not static)
 * Prioritizes real deficiencies over generic time-based advice
 */
function getTimeFocusArea(period, prediction) {
  const hydrationPercent = prediction.context?.todayProgress?.hydrationPercent || 0;
  const mealsLogged = prediction.context?.todayProgress?.mealsLogged || 0;
  const proteinPercent = prediction.context?.todayProgress?.proteinPercent || 0;
  const proteinGrams = prediction.context?.todayProgress?.proteinGrams || 0;
  const hasHighRisk = prediction.hasHighRisk || false;
  const risks = prediction.risks || [];

  // Priority 1: Critical deficiencies (actual data-driven)
  if (hydrationPercent < 30 && period !== 'morning') {
    return {
      title: 'Low hydration',
      description: `Only ${hydrationPercent}% of water goal - drink now`,
      icon: 'water',
      priority: 'high',
    };
  }

  // Priority 2: High risk situations from correlation data
  if (hasHighRisk && risks.length > 0) {
    const primaryRisk = risks[0];
    return {
      title: primaryRisk.title || 'Risk detected',
      description: primaryRisk.description || 'Based on your patterns',
      icon: primaryRisk.icon?.replace('-outline', '') || 'warning',
      priority: 'high',
    };
  }

  // Priority 3: Protein deficiency (only if actually low)
  if (proteinPercent < 25 && mealsLogged >= 1 && period !== 'morning') {
    return {
      title: 'Protein gap',
      description: `Only ${proteinGrams}g so far - add protein to your next meal`,
      icon: 'fitness',
      priority: 'medium',
    };
  }

  // Priority 4: No meals logged (context-aware)
  if (mealsLogged === 0) {
    if (period === 'morning') {
      return {
        title: 'Start your day',
        description: 'Log your first meal to start tracking',
        icon: 'sunny',
        priority: 'low',
      };
    }
    if (period === 'midday' || period === 'afternoon') {
      return {
        title: 'No meals logged',
        description: 'Log what you\'ve eaten to get personalized insights',
        icon: 'restaurant',
        priority: 'medium',
      };
    }
  }

  // Priority 5: Moderate hydration concern
  if (hydrationPercent < 50 && period === 'afternoon') {
    return {
      title: 'Hydration check',
      description: `${hydrationPercent}% of water goal - staying hydrated helps energy`,
      icon: 'water',
      priority: 'low',
    };
  }

  // Priority 6: Everything is good! Show positive reinforcement
  if (proteinPercent >= 50 && hydrationPercent >= 50) {
    return {
      title: 'On track',
      description: 'Great progress today! Keep it up',
      icon: 'checkmark-circle',
      priority: 'low',
    };
  }

  // Priority 7: Time-based suggestions only when no specific issues
  switch (period) {
    case 'morning':
      return {
        title: 'Good morning',
        description: 'Log your breakfast to start building today\'s picture',
        icon: 'sunny',
        priority: 'low',
      };

    case 'midday':
      return {
        title: 'Midday check-in',
        description: 'How\'s your energy? Log your lunch',
        icon: 'partly-sunny',
        priority: 'low',
      };

    case 'afternoon':
      return {
        title: 'Afternoon energy',
        description: 'A small snack can help maintain focus',
        icon: 'leaf',
        priority: 'low',
      };

    case 'evening':
      return {
        title: 'Evening wind-down',
        description: 'Lighter dinners often mean better mornings',
        icon: 'moon',
        priority: 'low',
      };

    case 'night':
      return {
        title: 'Day complete',
        description: 'Review your day and plan for tomorrow',
        icon: 'calendar',
        priority: 'low',
      };

    default:
      return null; // No focus area needed
  }
}

/**
 * Adapt prevention tips based on time
 */
function adaptPreventionTips(tips, period, currentHour) {
  if (!tips || tips.length === 0) return [];

  // Filter out irrelevant tips for the time period
  const adaptedTips = tips.map(tip => {
    const adapted = { ...tip };

    // Modify tips based on time
    if (period === 'evening' || period === 'night') {
      // At night, reframe tips for tomorrow
      if (tip.icon === 'sunny') {
        adapted.action = 'Plan a protein-rich breakfast for tomorrow';
        adapted.reason = 'Prep tonight for better energy tomorrow';
      }
    }

    if (period === 'afternoon' && tip.icon === 'walk') {
      adapted.priority = 1; // Prioritize walking in afternoon
    }

    return adapted;
  });

  return adaptedTips.sort((a, b) => a.priority - b.priority).slice(0, 3);
}

/**
 * Adapt risks based on time
 */
function adaptRisks(risks, period, currentHour) {
  if (!risks || risks.length === 0) return [];

  return risks.map(risk => {
    const adapted = { ...risk };

    // Adjust time windows based on current time
    if (period === 'afternoon' && risk.type === 'energy_crash') {
      adapted.timeWindow = 'Right now';
      adapted.severity = 'high';
    }

    if (period === 'evening' && risk.type === 'energy_crash') {
      adapted.title = 'Tomorrow Risk';
      adapted.description = 'Tonight\'s choices affect tomorrow\'s energy';
      adapted.timeWindow = 'Tomorrow morning';
    }

    return adapted;
  });
}

/**
 * Get next milestone for motivation
 */
function getNextMilestone(period, context) {
  const hydrationPercent = context?.todayProgress?.hydrationPercent || 0;
  const mealsLogged = context?.todayProgress?.mealsLogged || 0;

  if (mealsLogged < 3) {
    return {
      type: 'meals',
      current: mealsLogged,
      target: 3,
      label: `${3 - mealsLogged} more meal${3 - mealsLogged > 1 ? 's' : ''} to complete today`,
      icon: 'restaurant',
    };
  }

  if (hydrationPercent < 100) {
    return {
      type: 'hydration',
      current: hydrationPercent,
      target: 100,
      label: `${100 - hydrationPercent}% more to hit water goal`,
      icon: 'water',
    };
  }

  return {
    type: 'complete',
    label: 'Great job! You\'ve hit your goals today',
    icon: 'checkmark-circle',
  };
}

export default {
  generateMorningPrediction,
  generateTimeAwarePrediction,
  predictMealFeeling,
};
