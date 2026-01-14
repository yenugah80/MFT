/**
 * Unified Analytics Engine
 *
 * Comprehensive analytics service that handles:
 * 1. Missing data detection and graceful degradation
 * 2. Multi-timeframe aggregation (daily, weekly, monthly)
 * 3. Cross-domain analytics (food, mood, hydration, activity)
 * 4. Smart recommendations based on available data
 * 5. Goal-aware personalized insights
 *
 * DESIGN PRINCIPLES:
 * - Never show "no data" errors - always provide value
 * - Graceful degradation based on data availability
 * - Clear confidence indicators for all insights
 * - Explainable analytics with data provenance
 *
 * @module UnifiedAnalyticsEngine
 */

import { db } from '../config/db.js';
import {
  foodLogTable,
  waterLogTable,
  moodLogTable,
  nutritionGoalsTable,
  profilesTable,
  dailyNutritionSummaryTable,
  gamificationTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql, between } from 'drizzle-orm';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Data sufficiency thresholds for different analytics features
 */
export const DATA_THRESHOLDS = {
  MINIMUM_DAILY_INSIGHTS: 1,      // Days needed for basic daily view
  MINIMUM_WEEKLY_INSIGHTS: 3,     // Days needed for weekly patterns
  MINIMUM_MONTHLY_INSIGHTS: 7,    // Days needed for monthly trends
  MINIMUM_CORRELATION: 14,        // Days needed for cross-domain correlation
  MINIMUM_PREDICTION: 7,          // Days needed for predictions
  OPTIMAL_DATA_DAYS: 30,          // Days for optimal analytics quality
};

/**
 * Timeframe definitions
 */
export const TIMEFRAMES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  CUSTOM: 'custom',
};

/**
 * Analytics domains
 */
export const DOMAINS = {
  FOOD: 'food',
  HYDRATION: 'hydration',
  MOOD: 'mood',
  ACTIVITY: 'activity',
  OVERALL: 'overall',
};

/**
 * Cold start stages with clear progression
 */
export const COLD_START_STAGES = {
  NEW_USER: {
    id: 'new_user',
    minDays: 0,
    maxDays: 0,
    label: 'Getting Started',
    description: 'Log your first entry to begin',
    analyticsLevel: 'none',
  },
  LEARNING: {
    id: 'learning',
    minDays: 1,
    maxDays: 6,
    label: 'Learning Your Patterns',
    description: 'Building your baseline profile',
    analyticsLevel: 'basic',
  },
  EMERGING: {
    id: 'emerging',
    minDays: 7,
    maxDays: 13,
    label: 'Patterns Emerging',
    description: 'Detecting your habits and preferences',
    analyticsLevel: 'intermediate',
  },
  ESTABLISHED: {
    id: 'established',
    minDays: 14,
    maxDays: 29,
    label: 'Profile Established',
    description: 'Personalized insights available',
    analyticsLevel: 'advanced',
  },
  OPTIMIZED: {
    id: 'optimized',
    minDays: 30,
    maxDays: Infinity,
    label: 'Fully Optimized',
    description: 'Deep analytics and predictions',
    analyticsLevel: 'full',
  },
};

// ============================================================================
// DATA AVAILABILITY & QUALITY ASSESSMENT
// ============================================================================

/**
 * Assess data availability across all domains for a user
 *
 * @param {string} userId
 * @param {number} lookbackDays - Days to analyze (default: 30)
 * @returns {Promise<DataAvailabilityReport>}
 */
export async function assessDataAvailability(userId, lookbackDays = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  try {
    // Parallel queries for all domains
    const [foodStats, hydrationStats, moodStats, profile, goals] = await Promise.all([
      getFoodDataStats(userId, startDate, endDate),
      getHydrationDataStats(userId, startDate, endDate),
      getMoodDataStats(userId, startDate, endDate),
      getProfileData(userId),
      getUserGoals(userId),
    ]);

    // Calculate overall data quality score
    const totalPossibleDays = lookbackDays;
    const avgCoverage = (
      (foodStats.daysWithData / totalPossibleDays) +
      (hydrationStats.daysWithData / totalPossibleDays) +
      (moodStats.daysWithData / totalPossibleDays)
    ) / 3;

    // Determine cold start stage
    const maxDaysWithData = Math.max(
      foodStats.daysWithData,
      hydrationStats.daysWithData,
      moodStats.daysWithData
    );
    const coldStartStage = determineColdStartStage(maxDaysWithData);

    // Identify missing data gaps
    const gaps = identifyDataGaps(foodStats, hydrationStats, moodStats, lookbackDays);

    return {
      userId,
      analyzedPeriod: { start: startDate, end: endDate, days: lookbackDays },
      domains: {
        food: {
          ...foodStats,
          coverage: foodStats.daysWithData / totalPossibleDays,
          hasEnoughForDaily: foodStats.daysWithData >= DATA_THRESHOLDS.MINIMUM_DAILY_INSIGHTS,
          hasEnoughForWeekly: foodStats.daysWithData >= DATA_THRESHOLDS.MINIMUM_WEEKLY_INSIGHTS,
          hasEnoughForMonthly: foodStats.daysWithData >= DATA_THRESHOLDS.MINIMUM_MONTHLY_INSIGHTS,
        },
        hydration: {
          ...hydrationStats,
          coverage: hydrationStats.daysWithData / totalPossibleDays,
          hasEnoughForDaily: hydrationStats.daysWithData >= DATA_THRESHOLDS.MINIMUM_DAILY_INSIGHTS,
          hasEnoughForWeekly: hydrationStats.daysWithData >= DATA_THRESHOLDS.MINIMUM_WEEKLY_INSIGHTS,
          hasEnoughForMonthly: hydrationStats.daysWithData >= DATA_THRESHOLDS.MINIMUM_MONTHLY_INSIGHTS,
        },
        mood: {
          ...moodStats,
          coverage: moodStats.daysWithData / totalPossibleDays,
          hasEnoughForDaily: moodStats.daysWithData >= DATA_THRESHOLDS.MINIMUM_DAILY_INSIGHTS,
          hasEnoughForWeekly: moodStats.daysWithData >= DATA_THRESHOLDS.MINIMUM_WEEKLY_INSIGHTS,
          hasEnoughForMonthly: moodStats.daysWithData >= DATA_THRESHOLDS.MINIMUM_MONTHLY_INSIGHTS,
        },
      },
      overall: {
        dataQualityScore: roundTo(avgCoverage * 100, 0),
        coldStartStage,
        hasEnoughForCorrelations: maxDaysWithData >= DATA_THRESHOLDS.MINIMUM_CORRELATION,
        hasEnoughForPredictions: maxDaysWithData >= DATA_THRESHOLDS.MINIMUM_PREDICTION,
      },
      gaps,
      profile,
      goals,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[UnifiedAnalytics] assessDataAvailability error:', error);
    throw error;
  }
}

/**
 * Get food data statistics
 */
async function getFoodDataStats(userId, startDate, endDate) {
  try {
    const [stats] = await db
      .select({
        totalLogs: sql`COUNT(*)::int`,
        distinctDays: sql`COUNT(DISTINCT DATE(${foodLogTable.loggedDate}))::int`,
        totalCalories: sql`COALESCE(SUM(${foodLogTable.calories}), 0)::int`,
        totalProtein: sql`COALESCE(SUM(${foodLogTable.protein}), 0)::int`,
        totalCarbs: sql`COALESCE(SUM(${foodLogTable.carbs}), 0)::int`,
        totalFats: sql`COALESCE(SUM(${foodLogTable.fats}), 0)::int`,
        firstLog: sql`MIN(${foodLogTable.loggedDate})`,
        lastLog: sql`MAX(${foodLogTable.loggedDate})`,
      })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, startDate),
          lte(foodLogTable.loggedDate, endDate)
        )
      );

    // Get meal type distribution
    const mealTypes = await db
      .select({
        mealType: foodLogTable.mealType,
        count: sql`COUNT(*)::int`,
      })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, startDate),
          lte(foodLogTable.loggedDate, endDate)
        )
      )
      .groupBy(foodLogTable.mealType);

    const mealTypeBreakdown = {};
    mealTypes.forEach(mt => {
      mealTypeBreakdown[mt.mealType || 'unspecified'] = mt.count;
    });

    return {
      totalLogs: stats?.totalLogs || 0,
      daysWithData: stats?.distinctDays || 0,
      avgCaloriesPerDay: stats?.distinctDays > 0
        ? Math.round(stats.totalCalories / stats.distinctDays)
        : 0,
      firstLog: stats?.firstLog,
      lastLog: stats?.lastLog,
      mealTypeBreakdown,
    };
  } catch (error) {
    console.error('[UnifiedAnalytics] getFoodDataStats error:', error);
    return { totalLogs: 0, daysWithData: 0, avgCaloriesPerDay: 0, mealTypeBreakdown: {} };
  }
}

/**
 * Get hydration data statistics
 */
async function getHydrationDataStats(userId, startDate, endDate) {
  try {
    const [stats] = await db
      .select({
        totalLogs: sql`COUNT(*)::int`,
        distinctDays: sql`COUNT(DISTINCT DATE(${waterLogTable.loggedDate}))::int`,
        totalLiters: sql`COALESCE(SUM(${waterLogTable.amountLiters}), 0)`,
        totalHydrationLiters: sql`COALESCE(SUM(COALESCE(${waterLogTable.hydrationLiters}, ${waterLogTable.amountLiters})), 0)`,
        firstLog: sql`MIN(${waterLogTable.loggedDate})`,
        lastLog: sql`MAX(${waterLogTable.loggedDate})`,
      })
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, startDate),
          lte(waterLogTable.loggedDate, endDate)
        )
      );

    // Get beverage type breakdown
    const beverageTypes = await db
      .select({
        beverageType: waterLogTable.beverageType,
        count: sql`COUNT(*)::int`,
        totalLiters: sql`COALESCE(SUM(${waterLogTable.amountLiters}), 0)`,
      })
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, startDate),
          lte(waterLogTable.loggedDate, endDate)
        )
      )
      .groupBy(waterLogTable.beverageType);

    const beverageBreakdown = {};
    beverageTypes.forEach(bt => {
      beverageBreakdown[bt.beverageType || 'water'] = {
        count: bt.count,
        totalLiters: parseFloat(bt.totalLiters) || 0,
      };
    });

    return {
      totalLogs: stats?.totalLogs || 0,
      daysWithData: stats?.distinctDays || 0,
      totalLiters: parseFloat(stats?.totalLiters) || 0,
      avgLitersPerDay: stats?.distinctDays > 0
        ? roundTo(parseFloat(stats.totalLiters) / stats.distinctDays, 2)
        : 0,
      firstLog: stats?.firstLog,
      lastLog: stats?.lastLog,
      beverageBreakdown,
    };
  } catch (error) {
    console.error('[UnifiedAnalytics] getHydrationDataStats error:', error);
    return { totalLogs: 0, daysWithData: 0, totalLiters: 0, avgLitersPerDay: 0, beverageBreakdown: {} };
  }
}

/**
 * Get mood data statistics
 */
async function getMoodDataStats(userId, startDate, endDate) {
  try {
    const [stats] = await db
      .select({
        totalLogs: sql`COUNT(*)::int`,
        distinctDays: sql`COUNT(DISTINCT DATE(${moodLogTable.loggedDate}))::int`,
        avgIntensity: sql`AVG(${moodLogTable.intensity})`,
        avgEnergy: sql`AVG(${moodLogTable.energyLevel})`,
        firstLog: sql`MIN(${moodLogTable.loggedDate})`,
        lastLog: sql`MAX(${moodLogTable.loggedDate})`,
      })
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, startDate),
          lte(moodLogTable.loggedDate, endDate)
        )
      );

    // Get mood distribution
    const moodDist = await db
      .select({
        mood: moodLogTable.mood,
        count: sql`COUNT(*)::int`,
      })
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, startDate),
          lte(moodLogTable.loggedDate, endDate)
        )
      )
      .groupBy(moodLogTable.mood);

    const moodDistribution = {};
    moodDist.forEach(m => {
      moodDistribution[m.mood] = m.count;
    });

    return {
      totalLogs: stats?.totalLogs || 0,
      daysWithData: stats?.distinctDays || 0,
      avgIntensity: roundTo(parseFloat(stats?.avgIntensity) || 0, 1),
      avgEnergy: roundTo(parseFloat(stats?.avgEnergy) || 0, 1),
      firstLog: stats?.firstLog,
      lastLog: stats?.lastLog,
      moodDistribution,
    };
  } catch (error) {
    console.error('[UnifiedAnalytics] getMoodDataStats error:', error);
    return { totalLogs: 0, daysWithData: 0, avgIntensity: 0, avgEnergy: 0, moodDistribution: {} };
  }
}

/**
 * Get user profile data
 */
async function getProfileData(userId) {
  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);

    return profile || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get user goals
 */
async function getUserGoals(userId) {
  try {
    const [goals] = await db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId))
      .limit(1);

    return goals || null;
  } catch (error) {
    return null;
  }
}

/**
 * Determine cold start stage based on days with data
 */
function determineColdStartStage(daysWithData) {
  for (const [key, stage] of Object.entries(COLD_START_STAGES)) {
    if (daysWithData >= stage.minDays && daysWithData <= stage.maxDays) {
      return { ...stage, daysWithData };
    }
  }
  return { ...COLD_START_STAGES.NEW_USER, daysWithData };
}

/**
 * Identify data gaps in the analyzed period
 */
function identifyDataGaps(foodStats, hydrationStats, moodStats, lookbackDays) {
  const gaps = [];

  // Check for domains with no data
  if (foodStats.daysWithData === 0) {
    gaps.push({
      domain: DOMAINS.FOOD,
      severity: 'critical',
      message: 'No food data logged yet',
      recommendation: 'Log your meals to see nutrition insights',
    });
  } else if (foodStats.daysWithData < lookbackDays * 0.3) {
    gaps.push({
      domain: DOMAINS.FOOD,
      severity: 'moderate',
      message: `Food data for only ${foodStats.daysWithData} of ${lookbackDays} days`,
      recommendation: 'Log meals daily for better insights',
    });
  }

  if (hydrationStats.daysWithData === 0) {
    gaps.push({
      domain: DOMAINS.HYDRATION,
      severity: 'critical',
      message: 'No hydration data logged yet',
      recommendation: 'Track your water intake to see hydration patterns',
    });
  } else if (hydrationStats.daysWithData < lookbackDays * 0.3) {
    gaps.push({
      domain: DOMAINS.HYDRATION,
      severity: 'moderate',
      message: `Hydration data for only ${hydrationStats.daysWithData} of ${lookbackDays} days`,
      recommendation: 'Log beverages daily for accurate tracking',
    });
  }

  if (moodStats.daysWithData === 0) {
    gaps.push({
      domain: DOMAINS.MOOD,
      severity: 'critical',
      message: 'No mood data logged yet',
      recommendation: 'Track your mood to discover food-mood connections',
    });
  } else if (moodStats.daysWithData < lookbackDays * 0.3) {
    gaps.push({
      domain: DOMAINS.MOOD,
      severity: 'moderate',
      message: `Mood data for only ${moodStats.daysWithData} of ${lookbackDays} days`,
      recommendation: 'Log mood daily for pattern detection',
    });
  }

  return gaps;
}

// ============================================================================
// MULTI-TIMEFRAME ANALYTICS
// ============================================================================

/**
 * Get analytics for a specific timeframe
 *
 * @param {string} userId
 * @param {string} timeframe - 'daily' | 'weekly' | 'monthly'
 * @param {Date} referenceDate - The reference date (defaults to today)
 * @returns {Promise<TimeframeAnalytics>}
 */
export async function getTimeframeAnalytics(userId, timeframe, referenceDate = new Date()) {
  const { startDate, endDate, periodLabel } = getTimeframeBounds(timeframe, referenceDate);

  // First assess data availability
  const availability = await assessDataAvailability(userId, getDaysBetween(startDate, endDate));

  // Get detailed analytics for each domain
  const [foodAnalytics, hydrationAnalytics, moodAnalytics] = await Promise.all([
    getFoodAnalytics(userId, startDate, endDate, availability.domains.food),
    getHydrationAnalytics(userId, startDate, endDate, availability.domains.hydration),
    getMoodAnalytics(userId, startDate, endDate, availability.domains.mood),
  ]);

  // Calculate overall wellness score
  const wellnessScore = calculateWellnessScore(
    foodAnalytics,
    hydrationAnalytics,
    moodAnalytics,
    availability.goals
  );

  // Generate recommendations based on available data
  const recommendations = generateTimeframeRecommendations(
    timeframe,
    foodAnalytics,
    hydrationAnalytics,
    moodAnalytics,
    availability
  );

  return {
    userId,
    timeframe,
    periodLabel,
    period: { start: startDate, end: endDate },
    dataQuality: {
      score: availability.overall.dataQualityScore,
      stage: availability.overall.coldStartStage,
      gaps: availability.gaps,
    },
    food: foodAnalytics,
    hydration: hydrationAnalytics,
    mood: moodAnalytics,
    wellness: wellnessScore,
    recommendations,
    goals: availability.goals,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get time bounds for a timeframe
 */
function getTimeframeBounds(timeframe, referenceDate) {
  const ref = new Date(referenceDate);
  let startDate, endDate, periodLabel;

  switch (timeframe) {
    case TIMEFRAMES.DAILY:
      startDate = new Date(ref.setHours(0, 0, 0, 0));
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      break;

    case TIMEFRAMES.WEEKLY:
      // Start from Monday of current week
      const dayOfWeek = ref.getDay();
      const diff = ref.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(ref);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      break;

    case TIMEFRAMES.MONTHLY:
      startDate = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
      periodLabel = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      break;

    default:
      throw new Error(`Unknown timeframe: ${timeframe}`);
  }

  return { startDate, endDate, periodLabel };
}

/**
 * Get detailed food analytics for a period
 */
async function getFoodAnalytics(userId, startDate, endDate, dataAvailability) {
  if (!dataAvailability.hasEnoughForDaily) {
    return {
      hasData: false,
      message: 'Log meals to see nutrition analytics',
      suggestion: 'Start by logging your next meal',
    };
  }

  try {
    const logs = await db
      .select()
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, startDate),
          lte(foodLogTable.loggedDate, endDate)
        )
      )
      .orderBy(desc(foodLogTable.loggedDate));

    if (logs.length === 0) {
      return {
        hasData: false,
        message: 'No meals logged for this period',
        suggestion: 'Log your meals to track nutrition',
      };
    }

    // Aggregate by day
    const dailyAggregates = aggregateByDay(logs, 'food');

    // Calculate totals
    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fats: acc.fats + (log.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    const daysCount = Object.keys(dailyAggregates).length;

    // Meal type breakdown
    const mealBreakdown = logs.reduce((acc, log) => {
      const type = log.mealType || 'unspecified';
      if (!acc[type]) acc[type] = { count: 0, calories: 0 };
      acc[type].count++;
      acc[type].calories += log.calories || 0;
      return acc;
    }, {});

    // Top foods by frequency
    const foodFrequency = logs.reduce((acc, log) => {
      const name = log.foodName.toLowerCase();
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    const topFoods = Object.entries(foodFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      hasData: true,
      totalMeals: logs.length,
      daysWithData: daysCount,
      totals,
      averages: {
        caloriesPerDay: roundTo(totals.calories / daysCount, 0),
        proteinPerDay: roundTo(totals.protein / daysCount, 0),
        carbsPerDay: roundTo(totals.carbs / daysCount, 0),
        fatsPerDay: roundTo(totals.fats / daysCount, 0),
        mealsPerDay: roundTo(logs.length / daysCount, 1),
      },
      mealBreakdown,
      topFoods,
      dailyData: dailyAggregates,
      macroRatio: calculateMacroRatio(totals),
    };
  } catch (error) {
    console.error('[UnifiedAnalytics] getFoodAnalytics error:', error);
    return {
      hasData: false,
      error: error.message,
    };
  }
}

/**
 * Get detailed hydration analytics for a period
 */
async function getHydrationAnalytics(userId, startDate, endDate, dataAvailability) {
  if (!dataAvailability.hasEnoughForDaily) {
    return {
      hasData: false,
      message: 'Log beverages to see hydration analytics',
      suggestion: 'Track your water and other drinks',
    };
  }

  try {
    const logs = await db
      .select()
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, startDate),
          lte(waterLogTable.loggedDate, endDate)
        )
      )
      .orderBy(desc(waterLogTable.loggedDate));

    if (logs.length === 0) {
      return {
        hasData: false,
        message: 'No beverages logged for this period',
        suggestion: 'Log your water intake to track hydration',
      };
    }

    // Aggregate by day
    const dailyAggregates = aggregateByDay(logs, 'hydration');

    // Calculate totals
    const totals = logs.reduce(
      (acc, log) => ({
        totalLiters: acc.totalLiters + parseFloat(log.amountLiters || 0),
        hydrationLiters: acc.hydrationLiters + parseFloat(log.hydrationLiters || log.amountLiters || 0),
      }),
      { totalLiters: 0, hydrationLiters: 0 }
    );

    const daysCount = Object.keys(dailyAggregates).length;

    // Beverage type breakdown
    const beverageBreakdown = logs.reduce((acc, log) => {
      const type = log.beverageType || 'water';
      if (!acc[type]) acc[type] = { count: 0, liters: 0 };
      acc[type].count++;
      acc[type].liters += parseFloat(log.amountLiters || 0);
      return acc;
    }, {});

    // Hourly distribution for patterns
    const hourlyDistribution = new Array(24).fill(0);
    logs.forEach(log => {
      const hour = new Date(log.loggedDate).getHours();
      hourlyDistribution[hour] += parseFloat(log.hydrationLiters || log.amountLiters || 0);
    });

    // Find peak hydration hours
    const peakHours = hourlyDistribution
      .map((vol, hour) => ({ hour, volume: vol }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 3);

    return {
      hasData: true,
      totalLogs: logs.length,
      daysWithData: daysCount,
      totals,
      averages: {
        litersPerDay: roundTo(totals.totalLiters / daysCount, 2),
        hydrationPerDay: roundTo(totals.hydrationLiters / daysCount, 2),
        logsPerDay: roundTo(logs.length / daysCount, 1),
      },
      beverageBreakdown,
      hourlyDistribution,
      peakHours,
      dailyData: dailyAggregates,
    };
  } catch (error) {
    console.error('[UnifiedAnalytics] getHydrationAnalytics error:', error);
    return {
      hasData: false,
      error: error.message,
    };
  }
}

/**
 * Get detailed mood analytics for a period
 */
async function getMoodAnalytics(userId, startDate, endDate, dataAvailability) {
  if (!dataAvailability.hasEnoughForDaily) {
    return {
      hasData: false,
      message: 'Log your mood to see emotional patterns',
      suggestion: 'Track how you feel throughout the day',
    };
  }

  try {
    const logs = await db
      .select()
      .from(moodLogTable)
      .where(
        and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, startDate),
          lte(moodLogTable.loggedDate, endDate)
        )
      )
      .orderBy(desc(moodLogTable.loggedDate));

    if (logs.length === 0) {
      return {
        hasData: false,
        message: 'No mood entries for this period',
        suggestion: 'Log your mood to discover patterns',
      };
    }

    // Aggregate by day
    const dailyAggregates = aggregateByDay(logs, 'mood');

    // Calculate averages
    const intensities = logs.map(l => l.intensity).filter(Boolean);
    const energies = logs.map(l => l.energyLevel).filter(Boolean);

    const daysCount = Object.keys(dailyAggregates).length;

    // Mood distribution
    const moodDistribution = logs.reduce((acc, log) => {
      acc[log.mood] = (acc[log.mood] || 0) + 1;
      return acc;
    }, {});

    // Time of day patterns
    const timeOfDayPatterns = {
      morning: { count: 0, avgIntensity: 0, avgEnergy: 0 },
      afternoon: { count: 0, avgIntensity: 0, avgEnergy: 0 },
      evening: { count: 0, avgIntensity: 0, avgEnergy: 0 },
    };

    logs.forEach(log => {
      const hour = new Date(log.loggedDate).getHours();
      let period;
      if (hour >= 5 && hour < 12) period = 'morning';
      else if (hour >= 12 && hour < 17) period = 'afternoon';
      else period = 'evening';

      timeOfDayPatterns[period].count++;
      if (log.intensity) timeOfDayPatterns[period].avgIntensity += log.intensity;
      if (log.energyLevel) timeOfDayPatterns[period].avgEnergy += log.energyLevel;
    });

    // Calculate averages for time of day
    for (const period of Object.keys(timeOfDayPatterns)) {
      const p = timeOfDayPatterns[period];
      if (p.count > 0) {
        p.avgIntensity = roundTo(p.avgIntensity / p.count, 1);
        p.avgEnergy = roundTo(p.avgEnergy / p.count, 1);
      }
    }

    return {
      hasData: true,
      totalLogs: logs.length,
      daysWithData: daysCount,
      averages: {
        intensity: intensities.length > 0
          ? roundTo(intensities.reduce((a, b) => a + b, 0) / intensities.length, 1)
          : null,
        energy: energies.length > 0
          ? roundTo(energies.reduce((a, b) => a + b, 0) / energies.length, 1)
          : null,
        logsPerDay: roundTo(logs.length / daysCount, 1),
      },
      moodDistribution,
      timeOfDayPatterns,
      dailyData: dailyAggregates,
      dominantMood: Object.entries(moodDistribution)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    };
  } catch (error) {
    console.error('[UnifiedAnalytics] getMoodAnalytics error:', error);
    return {
      hasData: false,
      error: error.message,
    };
  }
}

// ============================================================================
// AGGREGATION HELPERS
// ============================================================================

/**
 * Aggregate logs by day
 */
function aggregateByDay(logs, domain) {
  const aggregates = {};

  logs.forEach(log => {
    const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];

    if (!aggregates[dateKey]) {
      aggregates[dateKey] = { date: dateKey, logs: [] };
    }
    aggregates[dateKey].logs.push(log);
  });

  // Calculate daily summaries based on domain
  for (const dateKey of Object.keys(aggregates)) {
    const dayLogs = aggregates[dateKey].logs;

    if (domain === 'food') {
      aggregates[dateKey].calories = dayLogs.reduce((s, l) => s + (l.calories || 0), 0);
      aggregates[dateKey].protein = dayLogs.reduce((s, l) => s + (l.protein || 0), 0);
      aggregates[dateKey].carbs = dayLogs.reduce((s, l) => s + (l.carbs || 0), 0);
      aggregates[dateKey].fats = dayLogs.reduce((s, l) => s + (l.fats || 0), 0);
      aggregates[dateKey].count = dayLogs.length;
    } else if (domain === 'hydration') {
      aggregates[dateKey].liters = dayLogs.reduce((s, l) => s + parseFloat(l.amountLiters || 0), 0);
      aggregates[dateKey].hydrationLiters = dayLogs.reduce(
        (s, l) => s + parseFloat(l.hydrationLiters || l.amountLiters || 0),
        0
      );
      aggregates[dateKey].count = dayLogs.length;
      aggregates[dateKey].beverages = {};
      dayLogs.forEach(l => {
        const type = l.beverageType || 'water';
        aggregates[dateKey].beverages[type] = (aggregates[dateKey].beverages[type] || 0) + 1;
      });
    } else if (domain === 'mood') {
      const intensities = dayLogs.map(l => l.intensity).filter(Boolean);
      const energies = dayLogs.map(l => l.energyLevel).filter(Boolean);
      aggregates[dateKey].avgIntensity = intensities.length > 0
        ? roundTo(intensities.reduce((a, b) => a + b, 0) / intensities.length, 1)
        : null;
      aggregates[dateKey].avgEnergy = energies.length > 0
        ? roundTo(energies.reduce((a, b) => a + b, 0) / energies.length, 1)
        : null;
      aggregates[dateKey].moods = dayLogs.map(l => l.mood);
      aggregates[dateKey].count = dayLogs.length;
    }

    // Remove raw logs to reduce payload
    delete aggregates[dateKey].logs;
  }

  return aggregates;
}

/**
 * Calculate macro ratio
 */
function calculateMacroRatio(totals) {
  const totalCalories = totals.calories || 1;
  return {
    protein: roundTo((totals.protein * 4 / totalCalories) * 100, 0),
    carbs: roundTo((totals.carbs * 4 / totalCalories) * 100, 0),
    fats: roundTo((totals.fats * 9 / totalCalories) * 100, 0),
  };
}

// ============================================================================
// WELLNESS SCORING
// ============================================================================

/**
 * Calculate overall wellness score based on all domains
 */
function calculateWellnessScore(foodAnalytics, hydrationAnalytics, moodAnalytics, goals) {
  const scores = [];
  const components = {};

  // Food score (0-100)
  if (foodAnalytics.hasData && goals?.dailyCalories) {
    const calorieTarget = goals.dailyCalories;
    const actualCalories = foodAnalytics.averages.caloriesPerDay;
    const calorieScore = 100 - Math.min(100, Math.abs(actualCalories - calorieTarget) / calorieTarget * 100);
    scores.push(calorieScore);
    components.nutrition = {
      score: roundTo(calorieScore, 0),
      label: calorieScore >= 80 ? 'On Track' : calorieScore >= 50 ? 'Needs Attention' : 'Off Track',
    };
  }

  // Hydration score (0-100)
  if (hydrationAnalytics.hasData && goals?.waterLiters) {
    const waterTarget = parseFloat(goals.waterLiters);
    const actualWater = hydrationAnalytics.averages.litersPerDay;
    const hydrationScore = Math.min(100, (actualWater / waterTarget) * 100);
    scores.push(hydrationScore);
    components.hydration = {
      score: roundTo(hydrationScore, 0),
      label: hydrationScore >= 80 ? 'Well Hydrated' : hydrationScore >= 50 ? 'Needs More' : 'Dehydrated',
    };
  }

  // Mood score (0-100, based on intensity and energy)
  if (moodAnalytics.hasData) {
    const intensityScore = moodAnalytics.averages.intensity
      ? (moodAnalytics.averages.intensity / 10) * 100
      : 50;
    const energyScore = moodAnalytics.averages.energy
      ? (moodAnalytics.averages.energy / 10) * 100
      : 50;
    const moodScore = (intensityScore + energyScore) / 2;
    scores.push(moodScore);
    components.mood = {
      score: roundTo(moodScore, 0),
      label: moodScore >= 70 ? 'Feeling Good' : moodScore >= 40 ? 'Moderate' : 'Could Be Better',
    };
  }

  // Overall score
  const overallScore = scores.length > 0
    ? roundTo(scores.reduce((a, b) => a + b, 0) / scores.length, 0)
    : null;

  return {
    overall: overallScore,
    components,
    hasEnoughData: scores.length >= 2,
    interpretation: overallScore !== null
      ? interpretWellnessScore(overallScore)
      : { label: 'Insufficient Data', color: 'neutral' },
  };
}

/**
 * Interpret wellness score
 */
function interpretWellnessScore(score) {
  if (score >= 80) return { label: 'Excellent', color: 'success', emoji: '🌟' };
  if (score >= 60) return { label: 'Good', color: 'positive', emoji: '👍' };
  if (score >= 40) return { label: 'Fair', color: 'warning', emoji: '💪' };
  return { label: 'Needs Improvement', color: 'attention', emoji: '🎯' };
}

// ============================================================================
// SMART RECOMMENDATIONS
// ============================================================================

/**
 * Generate recommendations based on analytics
 */
function generateTimeframeRecommendations(timeframe, food, hydration, mood, availability) {
  const recommendations = [];
  const { goals } = availability;

  // Food recommendations
  if (food.hasData && goals?.dailyCalories) {
    const calDiff = food.averages.caloriesPerDay - goals.dailyCalories;
    if (Math.abs(calDiff) > goals.dailyCalories * 0.15) {
      recommendations.push({
        domain: DOMAINS.FOOD,
        priority: 'high',
        type: calDiff > 0 ? 'reduce_intake' : 'increase_intake',
        title: calDiff > 0 ? 'Calorie intake above target' : 'Calorie intake below target',
        description: calDiff > 0
          ? `You're averaging ${Math.abs(Math.round(calDiff))} calories above your goal`
          : `You're averaging ${Math.abs(Math.round(calDiff))} calories below your goal`,
        action: calDiff > 0
          ? 'Try smaller portions or lower-calorie alternatives'
          : 'Consider adding nutrient-dense snacks',
        icon: calDiff > 0 ? 'trending-down' : 'trending-up',
      });
    }

    // Macro balance recommendation
    const ratio = food.macroRatio;
    if (ratio && (ratio.protein < 15 || ratio.protein > 35)) {
      recommendations.push({
        domain: DOMAINS.FOOD,
        priority: 'medium',
        type: 'macro_balance',
        title: ratio.protein < 15 ? 'Low protein intake' : 'High protein intake',
        description: `Protein is ${ratio.protein}% of calories (ideal: 20-30%)`,
        action: ratio.protein < 15
          ? 'Add lean protein sources like chicken, fish, or legumes'
          : 'Balance with more vegetables and whole grains',
        icon: 'nutrition',
      });
    }
  } else if (!food.hasData) {
    recommendations.push({
      domain: DOMAINS.FOOD,
      priority: 'high',
      type: 'start_logging',
      title: 'Start tracking meals',
      description: 'Log your food to get personalized nutrition insights',
      action: 'Tap the + button to log your next meal',
      icon: 'add-circle',
    });
  }

  // Hydration recommendations
  if (hydration.hasData && goals?.waterLiters) {
    const waterGoal = parseFloat(goals.waterLiters);
    const avgWater = hydration.averages.litersPerDay;
    if (avgWater < waterGoal * 0.8) {
      recommendations.push({
        domain: DOMAINS.HYDRATION,
        priority: 'high',
        type: 'increase_hydration',
        title: 'Below hydration target',
        description: `Averaging ${avgWater.toFixed(1)}L vs ${waterGoal}L goal`,
        action: 'Set reminders to drink water throughout the day',
        icon: 'water',
      });
    }

    // Beverage diversity recommendation
    const beverageTypes = Object.keys(hydration.beverageBreakdown || {});
    if (beverageTypes.length === 1 && beverageTypes[0] === 'water') {
      recommendations.push({
        domain: DOMAINS.HYDRATION,
        priority: 'low',
        type: 'beverage_variety',
        title: 'Try variety in beverages',
        description: 'Herbal teas and milk can add variety while staying hydrated',
        action: 'Log different beverages to track hydration value',
        icon: 'cafe',
      });
    }
  } else if (!hydration.hasData) {
    recommendations.push({
      domain: DOMAINS.HYDRATION,
      priority: 'medium',
      type: 'start_logging',
      title: 'Track your hydration',
      description: 'Log water and beverages to see your hydration patterns',
      action: 'Tap the water glass to log a drink',
      icon: 'water',
    });
  }

  // Mood recommendations
  if (mood.hasData) {
    if (mood.averages.energy && mood.averages.energy < 5) {
      recommendations.push({
        domain: DOMAINS.MOOD,
        priority: 'medium',
        type: 'low_energy',
        title: 'Energy levels are low',
        description: `Average energy: ${mood.averages.energy}/10`,
        action: 'Consider sleep habits, hydration, and balanced meals',
        icon: 'battery-charging',
      });
    }
  } else if (!mood.hasData) {
    recommendations.push({
      domain: DOMAINS.MOOD,
      priority: 'low',
      type: 'start_logging',
      title: 'Track your mood',
      description: 'Discover how food affects your mood and energy',
      action: 'Log how you feel after meals',
      icon: 'happy',
    });
  }

  // Cross-domain correlations (if enough data)
  if (availability.overall.hasEnoughForCorrelations) {
    recommendations.push({
      domain: DOMAINS.OVERALL,
      priority: 'low',
      type: 'insight',
      title: 'Patterns available',
      description: 'You have enough data for food-mood correlation analysis',
      action: 'Check the Insights tab for correlations',
      icon: 'analytics',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return recommendations.slice(0, 5); // Return top 5
}

// ============================================================================
// MISSING DATA INTERPOLATION
// ============================================================================

/**
 * Interpolate missing data for visualization continuity
 * Uses simple linear interpolation for gaps <= 2 days
 * Marks longer gaps as "no data" periods
 *
 * @param {Object} dailyData - Aggregated daily data
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} domain
 * @returns {Object} Interpolated daily data with gap markers
 */
export function interpolateMissingDays(dailyData, startDate, endDate, domain) {
  const result = {};
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];

    if (dailyData[dateKey]) {
      result[dateKey] = {
        ...dailyData[dateKey],
        interpolated: false,
        hasData: true,
      };
    } else {
      // Find previous and next available data points
      const prev = findPreviousDataPoint(dailyData, dateKey);
      const next = findNextDataPoint(dailyData, dateKey);

      if (prev && next) {
        const gapDays = getDaysBetween(new Date(prev.date), new Date(next.date));
        if (gapDays <= 3) {
          // Interpolate for small gaps
          result[dateKey] = interpolateDataPoint(prev, next, dateKey, domain);
        } else {
          // Mark as gap for large gaps
          result[dateKey] = {
            date: dateKey,
            hasData: false,
            isGap: true,
            gapDays,
            message: 'No data logged',
          };
        }
      } else {
        result[dateKey] = {
          date: dateKey,
          hasData: false,
          isGap: true,
          message: prev ? 'Logging stopped' : 'Before first log',
        };
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

/**
 * Find previous data point
 */
function findPreviousDataPoint(dailyData, currentDateKey) {
  const dates = Object.keys(dailyData).sort();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] < currentDateKey) {
      return { date: dates[i], ...dailyData[dates[i]] };
    }
  }
  return null;
}

/**
 * Find next data point
 */
function findNextDataPoint(dailyData, currentDateKey) {
  const dates = Object.keys(dailyData).sort();
  for (const date of dates) {
    if (date > currentDateKey) {
      return { date, ...dailyData[date] };
    }
  }
  return null;
}

/**
 * Interpolate a data point between two known points
 */
function interpolateDataPoint(prev, next, targetDateKey, domain) {
  const prevDate = new Date(prev.date);
  const nextDate = new Date(next.date);
  const targetDate = new Date(targetDateKey);

  const totalDays = getDaysBetween(prevDate, nextDate);
  const daysPassed = getDaysBetween(prevDate, targetDate);
  const ratio = daysPassed / totalDays;

  const interpolated = {
    date: targetDateKey,
    interpolated: true,
    hasData: false,
    confidence: roundTo(1 - (Math.abs(ratio - 0.5) * 0.4), 2), // Higher confidence near midpoint
  };

  if (domain === 'food') {
    interpolated.calories = Math.round(prev.calories + (next.calories - prev.calories) * ratio);
    interpolated.protein = Math.round(prev.protein + (next.protein - prev.protein) * ratio);
    interpolated.carbs = Math.round(prev.carbs + (next.carbs - prev.carbs) * ratio);
    interpolated.fats = Math.round(prev.fats + (next.fats - prev.fats) * ratio);
  } else if (domain === 'hydration') {
    interpolated.liters = roundTo(prev.liters + (next.liters - prev.liters) * ratio, 2);
  } else if (domain === 'mood') {
    if (prev.avgIntensity && next.avgIntensity) {
      interpolated.avgIntensity = roundTo(prev.avgIntensity + (next.avgIntensity - prev.avgIntensity) * ratio, 1);
    }
    if (prev.avgEnergy && next.avgEnergy) {
      interpolated.avgEnergy = roundTo(prev.avgEnergy + (next.avgEnergy - prev.avgEnergy) * ratio, 1);
    }
  }

  return interpolated;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function roundTo(value, decimals) {
  if (value === null || value === undefined || isNaN(value)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function getDaysBetween(startDate, endDate) {
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Constants
  DATA_THRESHOLDS,
  TIMEFRAMES,
  DOMAINS,
  COLD_START_STAGES,
  // Core functions
  assessDataAvailability,
  getTimeframeAnalytics,
  interpolateMissingDays,
};
