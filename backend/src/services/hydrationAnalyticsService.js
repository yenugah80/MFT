/**
 * Hydration Analytics Service
 *
 * Provides behavioral intelligence for hydration tracking:
 * - Pattern detection (when, what, how much)
 * - Persona classification
 * - Cold start stage determination
 * - Prediction generation
 *
 * Architecture:
 * - Hot path: Cached data (<100ms)
 * - Warm path: Pre-computed daily (~500ms)
 * - Cold path: On-demand generation (~2s)
 *
 * All insights are EXPLAINABLE - every output includes:
 * - Data points used
 * - Timespan analyzed
 * - Confidence score
 * - Algorithm version
 */

import { db } from '../config/db.js';
import {
  waterLogTable,
  nutritionGoalsTable,
  dailyNutritionSummaryTable,
  hydrationDailySummaryTable,
  userHydrationProfileTable,
  hydrationPredictionsTable,
  insightFeedbackTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { toDateStr } from '../utils/timezone.js';

// ============================================================================
// PERSONA DEFINITIONS
// ============================================================================

export const HYDRATION_PERSONAS = {
  CONSISTENT_SIPPER: {
    type: 'CONSISTENT_SIPPER',
    title: 'Consistent Sipper',
    description: 'You maintain steady hydration throughout the day',
    recommendation: 'Keep up the great rhythm',
    icon: 'checkmark-circle',
  },
  MORNING_DEHYDRATOR: {
    type: 'MORNING_DEHYDRATOR',
    title: 'Morning Dehydrator',
    description: 'You tend to underhydrate in the morning and catch up later',
    recommendation: 'Try a glass of water within 30 minutes of waking',
    icon: 'sunny-outline',
  },
  CAFFEINE_COMPENSATOR: {
    type: 'CAFFEINE_COMPENSATOR',
    title: 'Caffeine Compensator',
    description: 'Your coffee intake is high relative to water',
    recommendation: 'Pair each coffee with a glass of water',
    icon: 'cafe-outline',
  },
  MEAL_ANCHORED: {
    type: 'MEAL_ANCHORED',
    title: 'Meal Anchored',
    description: 'You drink primarily around meals',
    recommendation: 'Add hydration breaks between meals',
    icon: 'restaurant-outline',
  },
  EVENING_CATCHUP: {
    type: 'EVENING_CATCHUP',
    title: 'Evening Catchup',
    description: 'You rush to hit your goal in the evening',
    recommendation: 'Spread intake earlier in the day for better absorption',
    icon: 'moon-outline',
  },
  HYDRATION_CHAMPION: {
    type: 'HYDRATION_CHAMPION',
    title: 'Hydration Champion',
    description: 'You consistently hit your hydration goals',
    recommendation: 'Maintain your excellent habits',
    icon: 'trophy-outline',
  },
};

// ============================================================================
// COLD START STAGES
// ============================================================================

export const COLD_START_STAGES = {
  DAY_0: 'day0', // First open - no data
  DAYS_1_3: 'days1-3', // Building baseline
  DAYS_4_7: 'days4-7', // Pattern emergence
  ESTABLISHED: 'established', // Day 7+ with patterns
  POWER_USER: 'power_user', // Day 30+ with correlations
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MINIMUM_DAYS_FOR_PERSONA: 7,
  MINIMUM_DAYS_FOR_PREDICTIONS: 7,
  MINIMUM_DAYS_FOR_CORRELATIONS: 30,
  PATTERN_LOOKBACK_DAYS: 30,
  PERSONA_CONFIDENCE_THRESHOLD: 0.6,
  ALGORITHM_VERSION: 'v1.0.0',
};

// ============================================================================
// CORE ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get user's cold start stage based on their data history
 *
 * @param {string} userId
 * @returns {Promise<{stage: string, daysSinceFirstLog: number, totalLogs: number}>}
 */
export async function getColdStartStage(userId) {
  try {
    // Get first log date and count
    const [stats] = await db
      .select({
        firstLog: sql`MIN(${waterLogTable.loggedDate})`,
        totalLogs: sql`COUNT(*)::int`,
        distinctDays: sql`COUNT(DISTINCT DATE(${waterLogTable.loggedDate}))::int`,
      })
      .from(waterLogTable)
      .where(eq(waterLogTable.userId, userId));

    if (!stats?.firstLog || stats.totalLogs === 0) {
      return {
        stage: COLD_START_STAGES.DAY_0,
        daysSinceFirstLog: 0,
        totalLogs: 0,
        distinctDays: 0,
      };
    }

    const firstLogDate = new Date(stats.firstLog);
    const now = new Date();
    const daysSinceFirstLog = Math.floor(
      (now.getTime() - firstLogDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let stage;
    if (daysSinceFirstLog >= 30) {
      stage = COLD_START_STAGES.POWER_USER;
    } else if (daysSinceFirstLog >= 7) {
      stage = COLD_START_STAGES.ESTABLISHED;
    } else if (daysSinceFirstLog >= 4) {
      stage = COLD_START_STAGES.DAYS_4_7;
    } else if (daysSinceFirstLog >= 1) {
      stage = COLD_START_STAGES.DAYS_1_3;
    } else {
      stage = COLD_START_STAGES.DAY_0;
    }

    return {
      stage,
      daysSinceFirstLog,
      totalLogs: parseInt(stats.totalLogs) || 0,
      distinctDays: parseInt(stats.distinctDays) || 0,
    };
  } catch (error) {
    console.error('[HydrationAnalytics] getColdStartStage error:', error);
    return {
      stage: COLD_START_STAGES.DAY_0,
      daysSinceFirstLog: 0,
      totalLogs: 0,
      distinctDays: 0,
    };
  }
}

/**
 * Analyze user's hydration patterns over the past N days
 *
 * @param {string} userId
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<object>} - Pattern analysis with explainability
 */
export async function analyzeHydrationPatterns(userId, days = CONFIG.PATTERN_LOOKBACK_DAYS) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const logs = await db
      .select()
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, startDate)
        )
      )
      .orderBy(desc(waterLogTable.loggedDate));

    // Return early if no logs at all
    if (logs.length === 0) {
      return {
        hasEnoughData: false,
        hasBasicData: false,
        dataPoints: 0,
        timespan: `${days} days`,
        message: 'No hydration data logged yet',
        patterns: null,
      };
    }

    // Even with few logs, return real data (not zeros)
    // hasEnoughData refers to pattern detection, not basic stats
    const hasEnoughForPatterns = logs.length >= 5;

    // Calculate hourly distribution
    const hourlyDistribution = new Array(24).fill(0);
    const hourlyVolume = new Array(24).fill(0);
    logs.forEach((log) => {
      const hour = new Date(log.loggedDate).getHours();
      hourlyDistribution[hour]++;
      hourlyVolume[hour] += parseFloat(log.hydrationLiters || log.amountLiters || 0);
    });

    // Find peak hours
    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));

    // Calculate beverage breakdown
    const beverageBreakdown = {};
    let totalVolume = 0;
    logs.forEach((log) => {
      const type = log.beverageType || 'water';
      const volume = parseFloat(log.hydrationLiters || log.amountLiters || 0);
      beverageBreakdown[type] = (beverageBreakdown[type] || 0) + volume;
      totalVolume += volume;
    });

    // Convert to percentages
    Object.keys(beverageBreakdown).forEach((type) => {
      beverageBreakdown[type] = {
        volume: beverageBreakdown[type],
        percentage: totalVolume > 0 ? beverageBreakdown[type] / totalVolume : 0,
      };
    });

    // Calculate daily aggregates
    const dailyTotals = {};
    logs.forEach((log) => {
      const dateKey = new Date(log.loggedDate).toISOString().split('T')[0];
      const volume = parseFloat(log.hydrationLiters || log.amountLiters || 0);
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + volume;
    });

    const dailyValues = Object.values(dailyTotals);
    const avgDaily = dailyValues.length > 0
      ? dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length
      : 0;

    // Calculate weekday vs weekend patterns
    const weekdayTotals = [];
    const weekendTotals = [];
    Object.entries(dailyTotals).forEach(([dateKey, total]) => {
      const dayOfWeek = new Date(dateKey).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendTotals.push(total);
      } else {
        weekdayTotals.push(total);
      }
    });

    const avgWeekday = weekdayTotals.length > 0
      ? weekdayTotals.reduce((a, b) => a + b, 0) / weekdayTotals.length
      : avgDaily;
    const avgWeekend = weekendTotals.length > 0
      ? weekendTotals.reduce((a, b) => a + b, 0) / weekendTotals.length
      : avgDaily;

    // Calculate morning vs afternoon vs evening distribution
    const morningVolume = hourlyVolume.slice(6, 12).reduce((a, b) => a + b, 0);
    const afternoonVolume = hourlyVolume.slice(12, 18).reduce((a, b) => a + b, 0);
    const eveningVolume = hourlyVolume.slice(18, 24).reduce((a, b) => a + b, 0);
    const totalPeriodVolume = morningVolume + afternoonVolume + eveningVolume;

    const periodDistribution = {
      morning: totalPeriodVolume > 0 ? morningVolume / totalPeriodVolume : 0.33,
      afternoon: totalPeriodVolume > 0 ? afternoonVolume / totalPeriodVolume : 0.33,
      evening: totalPeriodVolume > 0 ? eveningVolume / totalPeriodVolume : 0.34,
    };

    // Coffee ratio (for caffeine compensator detection)
    const coffeeVolume = beverageBreakdown.coffee?.volume || 0;
    const waterVolume = beverageBreakdown.water?.volume || 0;
    const coffeeToWaterRatio = waterVolume > 0 ? coffeeVolume / waterVolume : 0;

    // Get user's goal for percentage calculation
    const [goals] = await db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId))
      .limit(1);

    const goalLiters = parseFloat(goals?.waterLiters) || 2.0;
    const goalMl = Math.round(goalLiters * 1000);

    // Calculate avgMl and avgPercentage (what frontend expects)
    const avgMl = Math.round(avgDaily * 1000);
    const avgPercentage = goalLiters > 0 ? (avgDaily / goalLiters) * 100 : 0;

    // Calculate streak - consecutive days meeting goal (most recent)
    const sortedDates = Object.keys(dailyTotals).sort().reverse(); // Most recent first
    let streak = 0;
    for (const dateKey of sortedDates) {
      const dailyLiters = dailyTotals[dateKey];
      if (dailyLiters >= goalLiters * 0.8) { // 80% of goal counts for streak
        streak++;
      } else {
        break; // Streak broken
      }
    }

    // Always return data - hasEnoughData is for advanced pattern detection only
    // Basic stats (avgMl, streak, avgPercentage) are shown even with 1 log
    return {
      hasEnoughData: hasEnoughForPatterns,
      hasBasicData: logs.length > 0, // New field for frontend to use
      dataPoints: logs.length,
      timespan: `${days} days`,
      algorithmVersion: CONFIG.ALGORITHM_VERSION,

      patterns: {
        hourlyDistribution,
        hourlyVolume,
        peakHour,
        beverageBreakdown,
        avgDaily,
        avgWeekday,
        avgWeekend,
        weekendDrop: avgWeekday > 0 ? (avgWeekday - avgWeekend) / avgWeekday : 0,
        periodDistribution,
        coffeeToWaterRatio,
        // Fields expected by frontend - always calculated
        avgMl,
        avgPercentage: Math.round(avgPercentage),
        streak,
        goalMl,
        daysLogged: Object.keys(dailyTotals).length,
      },

      // Explainability data
      explanation: {
        dataPointsUsed: logs.length,
        daysAnalyzed: Object.keys(dailyTotals).length,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
      },
    };
  } catch (error) {
    console.error('[HydrationAnalytics] analyzeHydrationPatterns error:', error);
    return {
      hasEnoughData: false,
      error: error.message,
    };
  }
}

/**
 * Classify user into a hydration persona based on patterns
 *
 * @param {string} userId
 * @returns {Promise<object>} - Persona with confidence and explanation
 */
export async function classifyPersona(userId) {
  try {
    const patterns = await analyzeHydrationPatterns(userId);

    if (!patterns.hasEnoughData) {
      return {
        persona: null,
        confidence: 0,
        reason: 'Not enough data',
        minimumDaysRequired: CONFIG.MINIMUM_DAYS_FOR_PERSONA,
      };
    }

    const { periodDistribution, coffeeToWaterRatio, avgDaily, weekendDrop } = patterns.patterns;

    // Scoring system for persona classification
    const scores = {
      CONSISTENT_SIPPER: 0,
      MORNING_DEHYDRATOR: 0,
      CAFFEINE_COMPENSATOR: 0,
      MEAL_ANCHORED: 0,
      EVENING_CATCHUP: 0,
      HYDRATION_CHAMPION: 0,
    };

    // Check for consistent distribution (CONSISTENT_SIPPER)
    const distributionVariance = Math.abs(periodDistribution.morning - 0.33) +
      Math.abs(periodDistribution.afternoon - 0.33) +
      Math.abs(periodDistribution.evening - 0.34);
    if (distributionVariance < 0.15) {
      scores.CONSISTENT_SIPPER += 0.8;
    }

    // Check for morning dehydration (MORNING_DEHYDRATOR)
    if (periodDistribution.morning < 0.2 && periodDistribution.evening > 0.4) {
      scores.MORNING_DEHYDRATOR += 0.9;
    }

    // Check for high coffee ratio (CAFFEINE_COMPENSATOR)
    if (coffeeToWaterRatio > 0.3) {
      scores.CAFFEINE_COMPENSATOR += 0.85;
    }

    // Check for evening catchup (EVENING_CATCHUP)
    if (periodDistribution.evening > 0.5) {
      scores.EVENING_CATCHUP += 0.8;
    }

    // Get user's goal to check champion status
    const [goals] = await db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId))
      .limit(1);

    const waterGoal = parseFloat(goals?.waterLiters) || 2.0;

    // Check for champion (HYDRATION_CHAMPION)
    if (avgDaily >= waterGoal * 0.9 && distributionVariance < 0.2) {
      scores.HYDRATION_CHAMPION += 0.95;
    }

    // Find highest scoring persona
    const topPersona = Object.entries(scores).reduce(
      (best, [type, score]) => (score > best.score ? { type, score } : best),
      { type: 'CONSISTENT_SIPPER', score: 0 }
    );

    if (topPersona.score < CONFIG.PERSONA_CONFIDENCE_THRESHOLD) {
      // Default to consistent sipper if no strong pattern
      return {
        persona: HYDRATION_PERSONAS.CONSISTENT_SIPPER,
        confidence: 0.5,
        reason: 'No strong pattern detected, defaulting to consistent sipper',
        explanation: {
          scores,
          patterns: patterns.patterns,
          algorithmVersion: CONFIG.ALGORITHM_VERSION,
        },
      };
    }

    return {
      persona: HYDRATION_PERSONAS[topPersona.type],
      confidence: topPersona.score,
      reason: `Strong ${topPersona.type} pattern detected`,
      explanation: {
        scores,
        patterns: patterns.patterns,
        algorithmVersion: CONFIG.ALGORITHM_VERSION,
        dataPoints: patterns.dataPoints,
        timespan: patterns.timespan,
      },
    };
  } catch (error) {
    console.error('[HydrationAnalytics] classifyPersona error:', error);
    return {
      persona: null,
      confidence: 0,
      error: error.message,
    };
  }
}

/**
 * Generate tomorrow's hydration prediction
 * Currently based on patterns only - calendar integration to be added
 *
 * @param {string} userId
 * @param {object} context - Optional context (calendar events, weather)
 * @returns {Promise<object>} - Prediction with factors and explanation
 */
export async function generatePrediction(userId, context = {}) {
  try {
    const patterns = await analyzeHydrationPatterns(userId, 14); // Use 14 days for predictions

    if (!patterns.hasEnoughData) {
      return {
        hasPrediction: false,
        reason: 'Not enough data for predictions',
        minimumDaysRequired: CONFIG.MINIMUM_DAYS_FOR_PREDICTIONS,
      };
    }

    // Get user's goal
    const [goals] = await db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId))
      .limit(1);

    const baseGoal = parseFloat(goals?.waterLiters) || 2.0;
    const avgDaily = patterns.patterns.avgDaily;

    // Start with user's typical intake as base
    let predictedNeed = Math.max(baseGoal, avgDaily);
    const factors = [];

    // Factor: Day of week adjustment
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend && patterns.patterns.weekendDrop > 0.1) {
      // User typically drinks less on weekends - suggest more
      const adjustment = predictedNeed * patterns.patterns.weekendDrop * 0.5;
      factors.push({
        type: 'weekend_pattern',
        description: 'You typically drink less on weekends',
        adjustment: adjustment,
        confidence: 0.7,
      });
      predictedNeed += adjustment;
    }

    // Factor: Calendar events (placeholder - requires calendar integration)
    if (context.meetingCount && context.meetingCount > 2) {
      const meetingAdjustment = context.meetingCount * 0.1; // +100ml per meeting
      factors.push({
        type: 'meetings',
        description: `${context.meetingCount} meetings scheduled`,
        adjustment: meetingAdjustment,
        confidence: 0.6,
      });
      predictedNeed += meetingAdjustment;
    }

    // Round to 1 decimal place
    predictedNeed = Math.round(predictedNeed * 10) / 10;

    return {
      hasPrediction: true,
      predictedNeedLiters: predictedNeed,
      baseGoalLiters: baseGoal,
      typicalIntakeLiters: avgDaily,
      factors,
      confidence: factors.length > 0 ? 0.75 : 0.6,
      explanation: {
        algorithmVersion: CONFIG.ALGORITHM_VERSION,
        dataPointsUsed: patterns.dataPoints,
        baseCalculation: 'max(goal, 14-day average)',
        adjustments: factors.map((f) => f.type),
      },
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };
  } catch (error) {
    console.error('[HydrationAnalytics] generatePrediction error:', error);
    return {
      hasPrediction: false,
      error: error.message,
    };
  }
}

/**
 * Get full analytics dashboard data for a user
 * Combines patterns, persona, prediction, and cold start info
 *
 * @param {string} userId
 * @returns {Promise<object>} - Complete analytics data
 */
export async function getAnalyticsDashboard(userId) {
  try {
    // Use Promise.allSettled for resilience - partial data is better than no data
    const results = await Promise.allSettled([
      getColdStartStage(userId),
      analyzeHydrationPatterns(userId),
      classifyPersona(userId),
      generatePrediction(userId),
    ]);

    // Extract results, using fallbacks for rejected promises
    const coldStart = results[0].status === 'fulfilled'
      ? results[0].value
      : { stage: COLD_START_STAGES.DAY_0, daysSinceFirstLog: 0, totalLogs: 0, distinctDays: 0 };

    const patterns = results[1].status === 'fulfilled'
      ? results[1].value
      : { hasEnoughData: false };

    const persona = results[2].status === 'fulfilled'
      ? results[2].value
      : { persona: null, confidence: 0 };

    const prediction = results[3].status === 'fulfilled'
      ? results[3].value
      : { hasPrediction: false };

    // Log any failures for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const names = ['coldStart', 'patterns', 'persona', 'prediction'];
        console.warn(`[HydrationAnalytics] ${names[index]} failed:`, result.reason?.message);
      }
    });

    // Return patterns if ANY data exists (hasBasicData), not just when hasEnoughData
    // This ensures returning users see their real stats, not zeros
    return {
      coldStart,
      patterns: (patterns.hasBasicData || patterns.hasEnoughData) ? patterns.patterns : null,
      hasEnoughForPatterns: patterns.hasEnoughData,
      hasBasicData: patterns.hasBasicData,
      persona: persona.persona,
      personaConfidence: persona.confidence,
      prediction: prediction.hasPrediction ? prediction : null,
      generatedAt: new Date().toISOString(),
      algorithmVersion: CONFIG.ALGORITHM_VERSION,
    };
  } catch (error) {
    console.error('[HydrationAnalytics] getAnalyticsDashboard error:', error);
    return {
      error: error.message,
      coldStart: { stage: COLD_START_STAGES.DAY_0, daysSinceFirstLog: 0, totalLogs: 0, distinctDays: 0 },
      patterns: null,
      persona: null,
      personaConfidence: 0,
      prediction: null,
    };
  }
}

// ============================================================================
// PROFILE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get or create user hydration profile
 * Ensures every user has a profile record
 *
 * @param {string} userId
 * @returns {Promise<object>} - User hydration profile
 */
export async function getOrCreateHydrationProfile(userId) {
  try {
    // Try to get existing profile
    const [existing] = await db
      .select()
      .from(userHydrationProfileTable)
      .where(eq(userHydrationProfileTable.userId, userId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create new profile
    const coldStart = await getColdStartStage(userId);
    const [profile] = await db
      .insert(userHydrationProfileTable)
      .values({
        userId,
        onboardingStage: coldStart.stage,
        firstLogAt: coldStart.totalLogs > 0 ? new Date() : null,
        daysWithData: coldStart.distinctDays,
      })
      .returning();

    console.log(`[HydrationAnalytics] Created profile for user ${userId}`);
    return profile;
  } catch (error) {
    // Check if table doesn't exist (relation does not exist error)
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      console.warn('[HydrationAnalytics] Profile table does not exist yet - using fallback');
      const coldStart = await getColdStartStage(userId);
      return {
        userId,
        onboardingStage: coldStart.stage,
        daysWithData: coldStart.distinctDays,
        patternTrackingEnabled: true,
        calendarConnected: false,
      };
    }
    console.error('[HydrationAnalytics] getOrCreateHydrationProfile error:', error);
    throw error;
  }
}

/**
 * Update user hydration profile with new persona
 *
 * @param {string} userId
 * @param {object} personaData - { personaType, confidence }
 */
export async function updateHydrationPersona(userId, personaData) {
  try {
    await db
      .update(userHydrationProfileTable)
      .set({
        personaType: personaData.personaType,
        personaConfidence: personaData.confidence?.toString(),
        personaAssignedAt: new Date(),
        personaVersion: CONFIG.ALGORITHM_VERSION,
        lastPersonaComputeAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userHydrationProfileTable.userId, userId));

    console.log(`[HydrationAnalytics] Updated persona for user ${userId}: ${personaData.personaType}`);
  } catch (error) {
    console.error('[HydrationAnalytics] updateHydrationPersona error:', error);
  }
}

/**
 * Update user's onboarding stage based on their data
 *
 * @param {string} userId
 */
export async function updateOnboardingStage(userId) {
  try {
    const coldStart = await getColdStartStage(userId);

    await db
      .update(userHydrationProfileTable)
      .set({
        onboardingStage: coldStart.stage,
        daysWithData: coldStart.distinctDays,
        updatedAt: new Date(),
      })
      .where(eq(userHydrationProfileTable.userId, userId));

    return coldStart.stage;
  } catch (error) {
    console.error('[HydrationAnalytics] updateOnboardingStage error:', error);
    return null;
  }
}

// ============================================================================
// PREDICTION PERSISTENCE FUNCTIONS
// ============================================================================

/**
 * Save a prediction for a user
 *
 * @param {string} userId
 * @param {object} prediction - Prediction data from generatePrediction
 */
export async function savePrediction(userId, prediction) {
  try {
    if (!prediction.hasPrediction) return null;

    const predictionDate = new Date();
    predictionDate.setDate(predictionDate.getDate() + 1); // Tomorrow
    predictionDate.setHours(0, 0, 0, 0);

    const expiresAt = new Date(predictionDate);
    expiresAt.setDate(expiresAt.getDate() + 1); // Expires end of prediction day

    const [saved] = await db
      .insert(hydrationPredictionsTable)
      .values({
        userId,
        predictionDate: toDateStr(predictionDate),
        predictedNeedMl: Math.round(prediction.predictedNeedLiters * 1000),
        baselineMl: Math.round(prediction.typicalIntakeLiters * 1000),
        factors: prediction.factors,
        confidence: prediction.confidence?.toString(),
        algorithmVersion: prediction.explanation?.algorithmVersion,
        dataPointsUsed: prediction.explanation?.dataPointsUsed,
        contextJson: prediction.explanation || {},
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [hydrationPredictionsTable.userId, hydrationPredictionsTable.predictionDate],
        set: {
          predictedNeedMl: Math.round(prediction.predictedNeedLiters * 1000),
          baselineMl: Math.round(prediction.typicalIntakeLiters * 1000),
          factors: prediction.factors,
          confidence: prediction.confidence?.toString(),
          generatedAt: new Date(),
        },
      })
      .returning();

    return saved;
  } catch (error) {
    console.error('[HydrationAnalytics] savePrediction error:', error);
    return null;
  }
}

/**
 * Get tomorrow's prediction for a user
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getTomorrowPrediction(userId) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const [prediction] = await db
      .select()
      .from(hydrationPredictionsTable)
      .where(
        and(
          eq(hydrationPredictionsTable.userId, userId),
          eq(hydrationPredictionsTable.predictionDate, toDateStr(tomorrow))
        )
      )
      .limit(1);

    return prediction || null;
  } catch (error) {
    console.error('[HydrationAnalytics] getTomorrowPrediction error:', error);
    return null;
  }
}

// ============================================================================
// INSIGHT FEEDBACK FUNCTIONS
// ============================================================================

/**
 * Record user feedback on an insight
 *
 * @param {string} userId
 * @param {string} insightType - 'prediction', 'pattern', 'persona', 'suggestion'
 * @param {string} insightId - Unique ID for the insight
 * @param {object} feedback - { wasHelpful, dismissed, dismissReason, feedbackText, accuracyRating }
 */
export async function recordInsightFeedback(userId, insightType, insightId, feedback) {
  try {
    const [result] = await db
      .insert(insightFeedbackTable)
      .values({
        userId,
        insightType,
        insightId,
        insightVersion: CONFIG.ALGORITHM_VERSION,
        wasHelpful: feedback.wasHelpful,
        dismissed: feedback.dismissed || false,
        dismissReason: feedback.dismissReason,
        feedbackText: feedback.feedbackText,
        accuracyRating: feedback.accuracyRating,
        contextJson: feedback.context || {},
      })
      .onConflictDoUpdate({
        target: [
          insightFeedbackTable.userId,
          insightFeedbackTable.insightType,
          insightFeedbackTable.insightId,
        ],
        set: {
          wasHelpful: feedback.wasHelpful,
          dismissed: feedback.dismissed || false,
          dismissReason: feedback.dismissReason,
          feedbackText: feedback.feedbackText,
          accuracyRating: feedback.accuracyRating,
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log(`[HydrationAnalytics] Recorded feedback for ${insightType}:${insightId}`);
    return result;
  } catch (error) {
    console.error('[HydrationAnalytics] recordInsightFeedback error:', error);
    return null;
  }
}

/**
 * Get user's dismissed insight types for filtering
 *
 * @param {string} userId
 * @returns {Promise<string[]>} - Array of dismissed insight types
 */
export async function getDismissedInsightTypes(userId) {
  try {
    const dismissed = await db
      .select({ insightType: insightFeedbackTable.insightType })
      .from(insightFeedbackTable)
      .where(
        and(
          eq(insightFeedbackTable.userId, userId),
          eq(insightFeedbackTable.dismissed, true)
        )
      );

    return dismissed.map((d) => d.insightType);
  } catch (error) {
    // Gracefully handle if table doesn't exist
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      console.warn('[HydrationAnalytics] Feedback table does not exist yet - returning empty');
      return [];
    }
    console.error('[HydrationAnalytics] getDismissedInsightTypes error:', error);
    return [];
  }
}

// ============================================================================
// DAILY AGGREGATION FUNCTIONS (For nightly batch job)
// ============================================================================

/**
 * Compute and store daily hydration summary for a user
 * Called by nightly batch job or on-demand
 *
 * @param {string} userId
 * @param {Date} date
 */
export async function computeDailySummary(userId, date) {
  try {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    // Get all logs for the day
    const logs = await db
      .select()
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, dateStart),
          lte(waterLogTable.loggedDate, dateEnd)
        )
      );

    if (logs.length === 0) {
      return null; // No data for this day
    }

    // Calculate totals
    let totalMl = 0;
    let hydrationMl = 0;
    const beverageBreakdown = {};
    const hourlyVolume = new Array(24).fill(0);

    logs.forEach((log) => {
      const ml = parseFloat(log.amountLiters || 0) * 1000;
      const hydMl = parseFloat(log.hydrationLiters || log.amountLiters || 0) * 1000;
      const bevType = log.beverageType || 'water';
      const hour = new Date(log.loggedDate).getHours();

      totalMl += ml;
      hydrationMl += hydMl;
      beverageBreakdown[bevType] = (beverageBreakdown[bevType] || 0) + ml;
      hourlyVolume[hour] += hydMl;
    });

    // Get user's goal
    const [goals] = await db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId))
      .limit(1);

    const goalMl = (parseFloat(goals?.waterLiters) || 2.0) * 1000;
    const goalPercent = (hydrationMl / goalMl) * 100;

    // Calculate pattern features
    const peakHour = hourlyVolume.indexOf(Math.max(...hourlyVolume));
    const logHours = logs.map((l) => new Date(l.loggedDate).getHours()).sort((a, b) => a - b);
    const firstLogHour = logHours[0];
    const lastLogHour = logHours[logHours.length - 1];

    // Calculate distribution variance
    const avgHourly = hydrationMl / 24;
    const variance = hourlyVolume.reduce((sum, v) => sum + Math.pow(v - avgHourly, 2), 0) / 24;
    const distributionVariance = Math.sqrt(variance);

    // Convert beverage breakdown to percentages
    Object.keys(beverageBreakdown).forEach((type) => {
      beverageBreakdown[type] = beverageBreakdown[type] / totalMl;
    });

    // Upsert daily summary
    const [summary] = await db
      .insert(hydrationDailySummaryTable)
      .values({
        userId,
        date: toDateStr(dateStart),
        totalMl: Math.round(totalMl),
        hydrationMl: Math.round(hydrationMl),
        logCount: logs.length,
        beverageBreakdown,
        goalMl: Math.round(goalMl),
        goalMet: hydrationMl >= goalMl,
        goalPercent: goalPercent.toFixed(2),
        peakHour,
        distributionVariance: distributionVariance.toFixed(4),
        firstLogHour,
        lastLogHour,
        computedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [hydrationDailySummaryTable.userId, hydrationDailySummaryTable.date],
        set: {
          totalMl: Math.round(totalMl),
          hydrationMl: Math.round(hydrationMl),
          logCount: logs.length,
          beverageBreakdown,
          goalMet: hydrationMl >= goalMl,
          goalPercent: goalPercent.toFixed(2),
          peakHour,
          distributionVariance: distributionVariance.toFixed(4),
          firstLogHour,
          lastLogHour,
          computedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    return summary;
  } catch (error) {
    console.error('[HydrationAnalytics] computeDailySummary error:', error);
    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  HYDRATION_PERSONAS,
  COLD_START_STAGES,
  getColdStartStage,
  analyzeHydrationPatterns,
  classifyPersona,
  generatePrediction,
  getAnalyticsDashboard,
  // Profile management
  getOrCreateHydrationProfile,
  updateHydrationPersona,
  updateOnboardingStage,
  // Predictions
  savePrediction,
  getTomorrowPrediction,
  // Feedback
  recordInsightFeedback,
  getDismissedInsightTypes,
  // Aggregation
  computeDailySummary,
};
