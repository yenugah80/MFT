/**
 * Unified Intelligence Service
 *
 * Aggregates insights from ALL domains (mood, activity, hydration, sleep, stress)
 * into a single holistic user state for the recommendation engine.
 *
 * This is the "missing link" that connects isolated intelligence engines
 * to the food recommendation system.
 */

import { db } from '../config/db.js';
import { eq, gte, desc, and } from 'drizzle-orm';
import {
  moodLogTable,
  activityLogTable,
  waterLogTable,
  sleepLogTable,
  stressLogTable,
  foodLogTable
} from '../db/schema.js';

/**
 * Get unified user intelligence for recommendation personalization
 *
 * @param {string} userId - The user's ID
 * @param {Object} options - Configuration options
 * @returns {Object} Comprehensive user state across all wellness domains
 */
export async function getUnifiedIntelligence(userId, options = {}) {
  const { lookbackDays = 7 } = options;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  try {
    // Fetch all domain data in parallel for performance
    const [
      moodLogs,
      activityLogs,
      waterLogs,
      sleepLogs,
      stressLogs,
      foodLogs
    ] = await Promise.all([
      fetchMoodLogs(userId, startDate),
      fetchActivityLogs(userId, startDate),
      fetchWaterLogs(userId, startDate),
      fetchSleepLogs(userId, startDate),
      fetchStressLogs(userId, startDate),
      fetchFoodLogs(userId, startDate)
    ]);

    // Calculate domain-specific insights
    const moodInsights = analyzeMoodPatterns(moodLogs);
    const activityInsights = analyzeActivityPatterns(activityLogs);
    const hydrationInsights = analyzeHydrationPatterns(waterLogs);
    const sleepInsights = analyzeSleepPatterns(sleepLogs);
    const stressInsights = analyzeStressPatterns(stressLogs);
    const foodInsights = analyzeFoodPatterns(foodLogs);

    // Calculate cross-domain correlations
    const correlations = calculateCrossDomainCorrelations({
      moodLogs,
      activityLogs,
      waterLogs,
      sleepLogs,
      stressLogs,
      foodLogs
    });

    // Calculate overall wellness score (0-100)
    const wellnessScore = calculateWellnessScore({
      moodInsights,
      activityInsights,
      hydrationInsights,
      sleepInsights,
      stressInsights
    });

    // Calculate recovery score (WHOOP-style, 0-100)
    const recoveryScore = calculateRecoveryScore({
      sleepInsights,
      stressInsights,
      activityInsights,
      hydrationInsights,
      moodInsights
    });

    // Detect current user state and needs
    const currentState = detectCurrentState({
      moodInsights,
      activityInsights,
      hydrationInsights,
      sleepInsights,
      stressInsights,
      recoveryScore
    });

    // Generate contextual recommendations based on state
    const contextualGuidance = generateContextualGuidance(currentState, correlations);

    return {
      // Core scores
      wellnessScore,
      recoveryScore,

      // Current state flags
      currentState,

      // Domain insights
      insights: {
        mood: moodInsights,
        activity: activityInsights,
        hydration: hydrationInsights,
        sleep: sleepInsights,
        stress: stressInsights,
        food: foodInsights
      },

      // Cross-domain intelligence
      correlations,

      // Actionable guidance for AI prompt
      contextualGuidance,

      // Metadata
      meta: {
        lookbackDays,
        dataPoints: {
          mood: moodLogs.length,
          activity: activityLogs.length,
          water: waterLogs.length,
          sleep: sleepLogs.length,
          stress: stressLogs.length,
          food: foodLogs.length
        },
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('[UnifiedIntelligence] Error:', error);
    // Return safe defaults if intelligence gathering fails
    return getDefaultIntelligence();
  }
}

/**
 * Format unified intelligence for AI prompt injection
 * Uses advanced prompt engineering techniques
 */
export function formatIntelligenceForPrompt(intelligence) {
  const { currentState, insights, correlations, contextualGuidance, wellnessScore, recoveryScore } = intelligence;

  // Build structured context blocks for the AI
  let promptContext = '';

  // 1. WELLNESS SNAPSHOT (high-level overview)
  promptContext += `
═══════════════════════════════════════════════════════════════════════════════
🧠 HOLISTIC USER WELLNESS STATE
═══════════════════════════════════════════════════════════════════════════════

WELLNESS SCORE: ${wellnessScore}/100 ${getWellnessEmoji(wellnessScore)}
RECOVERY SCORE: ${recoveryScore}/100 ${getRecoveryEmoji(recoveryScore)}

`;

  // 2. CURRENT STATE FLAGS (what the AI MUST consider)
  if (currentState.flags.length > 0) {
    promptContext += `⚠️ CURRENT STATE FLAGS (MUST CONSIDER):
${currentState.flags.map(f => `• ${f.flag}: ${f.description} → ${f.foodImplication}`).join('\n')}

`;
  }

  // 3. MOOD CONTEXT
  if (insights.mood.hasData) {
    promptContext += `MOOD CONTEXT:
• Current mood: ${insights.mood.currentMood || 'Unknown'} (${insights.mood.currentEnergy || 'Unknown'} energy)
• 7-day trend: ${insights.mood.trend}
• Mood-food pattern: ${insights.mood.foodCorrelation || 'Insufficient data'}

`;
  }

  // 4. ACTIVITY & RECOVERY
  if (insights.activity.hasData) {
    promptContext += `ACTIVITY & RECOVERY:
• Activity level today: ${insights.activity.todayLevel}
• Recovery recommendation: ${getRecoveryRecommendation(recoveryScore)}
• Post-workout window: ${insights.activity.inPostWorkoutWindow ? 'YES - prioritize protein + carbs' : 'No'}

`;
  }

  // 5. HYDRATION STATUS
  if (insights.hydration.hasData) {
    promptContext += `HYDRATION STATUS:
• Today's intake: ${insights.hydration.todayMl}ml (${insights.hydration.percentOfGoal}% of goal)
• Hydration persona: ${insights.hydration.persona}
• Dehydration alert: ${insights.hydration.isDehydrated ? 'YES - recommend hydrating foods' : 'No'}

`;
  }

  // 6. SLEEP & STRESS
  if (insights.sleep.hasData || insights.stress.hasData) {
    promptContext += `SLEEP & STRESS:
• Last night's sleep: ${insights.sleep.lastNightQuality || 'Unknown'} (${insights.sleep.lastNightHours || '?'}h)
• Current stress level: ${insights.stress.currentLevel || 'Unknown'}/10
• Stress-nutrition need: ${insights.stress.nutritionNeed || 'Standard'}

`;
  }

  // 7. CROSS-DOMAIN CORRELATIONS (for reasoning)
  if (correlations.significant.length > 0) {
    promptContext += `CROSS-DOMAIN INSIGHTS (proven patterns for this user):
${correlations.significant.map(c => `• ${c.insight}`).join('\n')}

`;
  }

  // 8. CONFLICT RESOLUTION (if applicable)
  if (currentState.conflictResolution) {
    promptContext += `⚖️ CONFLICT DETECTED: ${currentState.conflictResolution.conflict}
   Resolution: ${currentState.conflictResolution.resolution}
   Guidance: ${currentState.conflictResolution.adjustedGuidance}

`;
  }

  // 9. CONTEXTUAL FOOD GUIDANCE (specific instructions)
  promptContext += `═══════════════════════════════════════════════════════════════════════════════
🎯 CONTEXTUAL FOOD GUIDANCE (based on current state)
═══════════════════════════════════════════════════════════════════════════════

${contextualGuidance.map(g => `${g.priority === 'high' ? '🔴' : g.priority === 'medium' ? '🟡' : '🟢'} ${g.guidance}`).join('\n')}

`;

  return promptContext;
}

// ==================== Data Fetching Functions ====================

async function fetchMoodLogs(userId, startDate) {
  try {
    return await db
      .select()
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedAt, startDate)
      ))
      .orderBy(desc(moodLogTable.loggedAt))
      .limit(50);
  } catch {
    return [];
  }
}

async function fetchActivityLogs(userId, startDate) {
  try {
    return await db
      .select()
      .from(activityLogTable)
      .where(and(
        eq(activityLogTable.userId, userId),
        gte(activityLogTable.loggedAt, startDate)
      ))
      .orderBy(desc(activityLogTable.loggedAt))
      .limit(50);
  } catch {
    return [];
  }
}

async function fetchWaterLogs(userId, startDate) {
  try {
    return await db
      .select()
      .from(waterLogTable)
      .where(and(
        eq(waterLogTable.clerkId, userId),
        gte(waterLogTable.loggedAt, startDate)
      ))
      .orderBy(desc(waterLogTable.loggedAt))
      .limit(100);
  } catch {
    return [];
  }
}

async function fetchSleepLogs(userId, startDate) {
  try {
    return await db
      .select()
      .from(sleepLogTable)
      .where(and(
        eq(sleepLogTable.userId, userId),
        gte(sleepLogTable.loggedAt, startDate)
      ))
      .orderBy(desc(sleepLogTable.loggedAt))
      .limit(14);
  } catch {
    return [];
  }
}

async function fetchStressLogs(userId, startDate) {
  try {
    return await db
      .select()
      .from(stressLogTable)
      .where(and(
        eq(stressLogTable.userId, userId),
        gte(stressLogTable.loggedAt, startDate)
      ))
      .orderBy(desc(stressLogTable.loggedAt))
      .limit(50);
  } catch {
    return [];
  }
}

async function fetchFoodLogs(userId, startDate) {
  try {
    return await db
      .select()
      .from(foodLogTable)
      .where(and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedAt, startDate)
      ))
      .orderBy(desc(foodLogTable.loggedAt))
      .limit(100);
  } catch {
    return [];
  }
}

// ==================== Analysis Functions ====================

function analyzeMoodPatterns(moodLogs) {
  if (!moodLogs.length) {
    return { hasData: false };
  }

  const recent = moodLogs[0];
  const avgMood = moodLogs.reduce((sum, l) => sum + (l.moodScore || 5), 0) / moodLogs.length;
  const avgEnergy = moodLogs.reduce((sum, l) => sum + (l.energyLevel || 5), 0) / moodLogs.length;

  // Calculate trend (improving, declining, stable)
  const recentAvg = moodLogs.slice(0, 3).reduce((sum, l) => sum + (l.moodScore || 5), 0) / Math.min(3, moodLogs.length);
  const olderAvg = moodLogs.slice(-3).reduce((sum, l) => sum + (l.moodScore || 5), 0) / Math.min(3, moodLogs.length);
  const trend = recentAvg > olderAvg + 0.5 ? 'improving' : recentAvg < olderAvg - 0.5 ? 'declining' : 'stable';

  return {
    hasData: true,
    currentMood: getMoodLabel(recent.moodScore),
    currentEnergy: getEnergyLabel(recent.energyLevel),
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    trend,
    isLowMood: avgMood < 5,
    isLowEnergy: avgEnergy < 5,
    recentTags: recent.tags || []
  };
}

function analyzeActivityPatterns(activityLogs) {
  if (!activityLogs.length) {
    return { hasData: false, todayLevel: 'none' };
  }

  const today = new Date().toDateString();
  const todayLogs = activityLogs.filter(l => new Date(l.loggedAt).toDateString() === today);
  const todayCaloriesBurned = todayLogs.reduce((sum, l) => sum + (l.caloriesBurned || 0), 0);

  // Check if in post-workout window (within 2 hours of last activity)
  const lastActivity = activityLogs[0];
  const hoursSinceLastActivity = (Date.now() - new Date(lastActivity.loggedAt).getTime()) / (1000 * 60 * 60);
  const inPostWorkoutWindow = hoursSinceLastActivity < 2;

  // Calculate weekly average
  const weeklyCalories = activityLogs.reduce((sum, l) => sum + (l.caloriesBurned || 0), 0);
  const avgDailyBurn = weeklyCalories / 7;

  return {
    hasData: true,
    todayLevel: todayCaloriesBurned > 300 ? 'high' : todayCaloriesBurned > 100 ? 'moderate' : 'low',
    todayCaloriesBurned,
    inPostWorkoutWindow,
    lastActivityType: lastActivity.activityType,
    avgDailyBurn: Math.round(avgDailyBurn),
    needsProteinBoost: inPostWorkoutWindow && lastActivity.activityType?.includes('strength')
  };
}

function analyzeHydrationPatterns(waterLogs) {
  if (!waterLogs.length) {
    return { hasData: false, isDehydrated: false };
  }

  const today = new Date().toDateString();
  const todayLogs = waterLogs.filter(l => new Date(l.loggedAt).toDateString() === today);
  const todayMl = todayLogs.reduce((sum, l) => sum + (l.amountMl || 0), 0);

  const goalMl = 2500; // Default goal
  const percentOfGoal = Math.round((todayMl / goalMl) * 100);

  // Detect persona based on patterns
  const hourlyDistribution = getHourlyDistribution(waterLogs);
  const persona = detectHydrationPersona(hourlyDistribution, waterLogs);

  return {
    hasData: true,
    todayMl,
    percentOfGoal,
    isDehydrated: percentOfGoal < 50,
    isWellHydrated: percentOfGoal >= 80,
    persona,
    peakHour: hourlyDistribution.peakHour
  };
}

function analyzeSleepPatterns(sleepLogs) {
  if (!sleepLogs.length) {
    return { hasData: false };
  }

  const lastNight = sleepLogs[0];
  const avgQuality = sleepLogs.reduce((sum, l) => sum + (l.quality || 5), 0) / sleepLogs.length;
  const avgHours = sleepLogs.reduce((sum, l) => sum + (l.durationHours || 7), 0) / sleepLogs.length;

  return {
    hasData: true,
    lastNightQuality: getSleepQualityLabel(lastNight.quality),
    lastNightHours: lastNight.durationHours,
    avgQuality: Math.round(avgQuality * 10) / 10,
    avgHours: Math.round(avgHours * 10) / 10,
    isPoorSleep: avgQuality < 6 || avgHours < 6,
    needsRecovery: lastNight.quality < 5
  };
}

function analyzeStressPatterns(stressLogs) {
  if (!stressLogs.length) {
    return { hasData: false, currentLevel: 5 };
  }

  const recent = stressLogs[0];
  const avgStress = stressLogs.reduce((sum, l) => sum + (l.stressLevel || 5), 0) / stressLogs.length;

  // Determine nutrition need based on stress
  let nutritionNeed = 'Standard';
  if (avgStress > 7) {
    nutritionNeed = 'High magnesium + B vitamins (stress relief)';
  } else if (avgStress > 5) {
    nutritionNeed = 'Complex carbs + protein (mood stability)';
  }

  return {
    hasData: true,
    currentLevel: recent.stressLevel,
    avgLevel: Math.round(avgStress * 10) / 10,
    isHighStress: avgStress > 6,
    trend: recent.stressLevel > avgStress ? 'increasing' : 'decreasing',
    nutritionNeed,
    recentTriggers: recent.triggers || []
  };
}

function analyzeFoodPatterns(foodLogs) {
  if (!foodLogs.length) {
    return { hasData: false };
  }

  // Calculate macro averages
  const avgCalories = foodLogs.reduce((sum, l) => sum + (l.calories || 0), 0) / foodLogs.length;
  const avgProtein = foodLogs.reduce((sum, l) => sum + (l.protein || 0), 0) / foodLogs.length;

  // Detect patterns
  const highSugarMeals = foodLogs.filter(l => (l.sugar || 0) > 20).length;
  const lowProteinMeals = foodLogs.filter(l => (l.protein || 0) < 10).length;

  return {
    hasData: true,
    avgCaloriesPerMeal: Math.round(avgCalories),
    avgProteinPerMeal: Math.round(avgProtein),
    highSugarPattern: highSugarMeals > foodLogs.length * 0.3,
    lowProteinPattern: lowProteinMeals > foodLogs.length * 0.3
  };
}

// ==================== Score Calculations ====================

function calculateWellnessScore({ moodInsights, activityInsights, hydrationInsights, sleepInsights, stressInsights }) {
  let score = 50; // Base score

  // Mood contribution (25%)
  if (moodInsights.hasData) {
    score += (moodInsights.avgMood - 5) * 5; // -25 to +25
  }

  // Activity contribution (20%)
  if (activityInsights.hasData) {
    score += activityInsights.todayLevel === 'high' ? 10 : activityInsights.todayLevel === 'moderate' ? 5 : 0;
  }

  // Hydration contribution (15%)
  if (hydrationInsights.hasData) {
    score += hydrationInsights.isWellHydrated ? 10 : hydrationInsights.isDehydrated ? -10 : 0;
  }

  // Sleep contribution (25%)
  if (sleepInsights.hasData) {
    score += (sleepInsights.avgQuality - 5) * 5; // -25 to +25
  }

  // Stress contribution (15%)
  if (stressInsights.hasData) {
    score -= (stressInsights.avgLevel - 5) * 3; // High stress reduces score
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateRecoveryScore({ sleepInsights, stressInsights, activityInsights, hydrationInsights, moodInsights }) {
  // WHOOP-style recovery score calculation
  let score = 50;

  // Sleep quality (40% weight)
  if (sleepInsights.hasData) {
    const sleepScore = ((sleepInsights.lastNightHours || 7) / 8) * 40 * (sleepInsights.avgQuality / 10);
    score += sleepScore - 20; // Normalize around 50
  }

  // Stress level (25% weight)
  if (stressInsights.hasData) {
    score -= (stressInsights.currentLevel - 5) * 2.5;
  }

  // Activity load (20% weight)
  if (activityInsights.hasData) {
    // Heavy activity yesterday = lower recovery today
    score -= activityInsights.avgDailyBurn > 400 ? 10 : 0;
  }

  // Hydration (10% weight)
  if (hydrationInsights.hasData) {
    score += hydrationInsights.isWellHydrated ? 5 : hydrationInsights.isDehydrated ? -5 : 0;
  }

  // Mood/energy (5% weight)
  if (moodInsights.hasData) {
    score += moodInsights.isLowEnergy ? -2.5 : 2.5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ==================== State Detection ====================

/**
 * Detect current state with conflict resolution
 * Handles edge cases and conflicting signals intelligently
 */
function detectCurrentState({ moodInsights, activityInsights, hydrationInsights, sleepInsights, stressInsights, recoveryScore }) {
  const flags = [];

  // ==================== EDGE CASE HANDLING ====================

  // Edge Case 1: No data at all (new user)
  const hasAnyData = moodInsights.hasData || activityInsights.hasData ||
                     hydrationInsights.hasData || sleepInsights.hasData || stressInsights.hasData;

  if (!hasAnyData) {
    return {
      flags: [{
        flag: 'NEW_USER',
        severity: 'low',
        description: 'No wellness data available yet',
        foodImplication: 'Recommend balanced, nutritious meals based on macro goals. Encourage logging mood, activity, and hydration for personalized suggestions.'
      }],
      primaryConcern: 'NEW_USER',
      needsSpecialAttention: false,
      conflictResolution: null
    };
  }

  // Edge Case 2: Extreme recovery score (0 or 100)
  if (recoveryScore === 0) {
    flags.push({
      flag: 'CRITICAL_RECOVERY',
      severity: 'high',
      description: 'Recovery score is critically low (0/100)',
      foodImplication: 'Focus on rest and gentle nutrition only. Recommend warm broths, herbal teas, and easily digestible foods. Avoid stimulants.'
    });
  } else if (recoveryScore === 100) {
    // Perfect recovery is rare - might indicate data issues
    flags.push({
      flag: 'OPTIMAL_STATE',
      severity: 'low',
      description: 'Optimal recovery and wellness detected',
      foodImplication: 'User is in great shape - recommend performance-optimized meals that match their activity goals.'
    });
  }

  // Low recovery flag (normal range)
  if (recoveryScore < 40 && recoveryScore > 0) {
    flags.push({
      flag: 'LOW_RECOVERY',
      severity: 'high',
      description: `Recovery score is ${recoveryScore}/100 (poor)`,
      foodImplication: 'Recommend lighter, easily digestible meals (soups, smoothies, simple proteins)'
    });
  }

  // Dehydration flag
  if (hydrationInsights.isDehydrated) {
    flags.push({
      flag: 'DEHYDRATED',
      severity: 'high',
      description: `Only ${hydrationInsights.percentOfGoal}% of hydration goal met`,
      foodImplication: 'Prioritize hydrating foods (watermelon, cucumber, soups, smoothies) and recommend water intake'
    });
  }

  // High stress flag
  if (stressInsights.isHighStress) {
    flags.push({
      flag: 'HIGH_STRESS',
      severity: 'medium',
      description: `Stress level ${stressInsights.currentLevel}/10 (elevated)`,
      foodImplication: 'Recommend magnesium-rich foods (dark chocolate, spinach, almonds, avocado) and complex carbs'
    });
  }

  // Poor sleep flag
  if (sleepInsights.isPoorSleep) {
    flags.push({
      flag: 'POOR_SLEEP',
      severity: 'medium',
      description: `Sleep quality below optimal (${sleepInsights.avgHours}h, quality ${sleepInsights.avgQuality}/10)`,
      foodImplication: 'Avoid caffeine recommendations, suggest tryptophan-rich foods (turkey, milk, bananas) for evening'
    });
  }

  // Post-workout flag
  if (activityInsights.inPostWorkoutWindow) {
    flags.push({
      flag: 'POST_WORKOUT',
      severity: 'low',
      description: 'Within 2-hour post-workout recovery window',
      foodImplication: 'Prioritize protein + fast carbs for muscle recovery (Greek yogurt with fruit, protein shake, chicken with rice)'
    });
  }

  // Low mood flag
  if (moodInsights.isLowMood) {
    flags.push({
      flag: 'LOW_MOOD',
      severity: 'medium',
      description: `Mood trend is ${moodInsights.trend}, average ${moodInsights.avgMood}/10`,
      foodImplication: 'Recommend mood-boosting foods (omega-3 rich salmon, dark chocolate, berries, fermented foods)'
    });
  }

  // Low energy flag
  if (moodInsights.isLowEnergy) {
    flags.push({
      flag: 'LOW_ENERGY',
      severity: 'medium',
      description: `Energy level below average (${moodInsights.avgEnergy}/10)`,
      foodImplication: 'Recommend sustained energy foods (complex carbs, protein, iron-rich foods like spinach and lean red meat)'
    });
  }

  // ==================== CONFLICT RESOLUTION ====================
  // Handle conflicting signals intelligently

  let conflictResolution = null;

  // Conflict 1: POST_WORKOUT + LOW_RECOVERY
  // Resolution: Prioritize recovery nutrition (lighter post-workout meal)
  const hasPostWorkout = flags.some(f => f.flag === 'POST_WORKOUT');
  const hasLowRecovery = flags.some(f => f.flag === 'LOW_RECOVERY');
  if (hasPostWorkout && hasLowRecovery) {
    conflictResolution = {
      conflict: 'POST_WORKOUT vs LOW_RECOVERY',
      resolution: 'Prioritize recovery - suggest lighter post-workout nutrition (protein shake, yogurt) instead of heavy meal',
      adjustedGuidance: 'Your body needs recovery nutrition, but keep it light. Focus on easily digestible protein + simple carbs.'
    };
    // Adjust the POST_WORKOUT flag
    const postWorkoutFlag = flags.find(f => f.flag === 'POST_WORKOUT');
    if (postWorkoutFlag) {
      postWorkoutFlag.foodImplication = 'Light post-workout recovery: protein shake, Greek yogurt with fruit, or banana with nut butter (avoid heavy meals)';
    }
  }

  // Conflict 2: HIGH_STRESS + DEHYDRATED
  // Resolution: Prioritize hydration (dehydration worsens stress)
  const hasHighStress = flags.some(f => f.flag === 'HIGH_STRESS');
  const hasDehydration = flags.some(f => f.flag === 'DEHYDRATED');
  if (hasHighStress && hasDehydration) {
    conflictResolution = conflictResolution || {
      conflict: 'HIGH_STRESS + DEHYDRATED',
      resolution: 'Prioritize hydration first - dehydration amplifies stress hormones',
      adjustedGuidance: 'Address dehydration immediately with water-rich foods, then follow with magnesium-rich options.'
    };
    // Move DEHYDRATED to higher priority
    flags.sort((a, b) => {
      if (a.flag === 'DEHYDRATED') return -1;
      if (b.flag === 'DEHYDRATED') return 1;
      return 0;
    });
  }

  // Conflict 3: LOW_MOOD + POST_WORKOUT
  // Resolution: Combine benefits - post-workout nutrition can boost mood
  const hasLowMood = flags.some(f => f.flag === 'LOW_MOOD');
  if (hasLowMood && hasPostWorkout) {
    conflictResolution = conflictResolution || {
      conflict: 'LOW_MOOD + POST_WORKOUT',
      resolution: 'Leverage post-workout window for mood boost',
      adjustedGuidance: 'Post-workout meals that also boost mood: dark chocolate protein shake, berry smoothie with spinach, or salmon with sweet potato.'
    };
  }

  // Conflict 4: POOR_SLEEP + HIGH_STRESS (vicious cycle)
  // Resolution: Break the cycle with calming nutrition
  const hasPoorSleep = flags.some(f => f.flag === 'POOR_SLEEP');
  if (hasPoorSleep && hasHighStress) {
    conflictResolution = conflictResolution || {
      conflict: 'POOR_SLEEP + HIGH_STRESS (vicious cycle)',
      resolution: 'Break the sleep-stress cycle with calming nutrition',
      adjustedGuidance: 'Focus on magnesium, tryptophan, and avoiding stimulants. Evening: chamomile tea, turkey, or warm milk with turmeric.'
    };
  }

  // Sort flags by severity (high > medium > low)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  flags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    flags,
    primaryConcern: flags[0]?.flag || 'NONE',
    needsSpecialAttention: flags.some(f => f.severity === 'high'),
    conflictResolution
  };
}

// ==================== Cross-Domain Correlations ====================

function calculateCrossDomainCorrelations({ moodLogs, activityLogs, waterLogs, sleepLogs, stressLogs, foodLogs }) {
  const significant = [];

  // Activity → Mood correlation (if both have data)
  if (moodLogs.length >= 5 && activityLogs.length >= 5) {
    const activityDays = new Set(activityLogs.map(l => new Date(l.loggedAt).toDateString()));
    const moodOnActivityDays = moodLogs.filter(l => activityDays.has(new Date(l.loggedAt).toDateString()));
    const moodOnRestDays = moodLogs.filter(l => !activityDays.has(new Date(l.loggedAt).toDateString()));

    if (moodOnActivityDays.length > 0 && moodOnRestDays.length > 0) {
      const avgMoodActive = moodOnActivityDays.reduce((sum, l) => sum + l.moodScore, 0) / moodOnActivityDays.length;
      const avgMoodRest = moodOnRestDays.reduce((sum, l) => sum + l.moodScore, 0) / moodOnRestDays.length;

      if (avgMoodActive > avgMoodRest + 1) {
        significant.push({
          type: 'ACTIVITY_MOOD',
          insight: `Your mood is ${Math.round(avgMoodActive - avgMoodRest)} points higher on active days. Exercise boosts your wellbeing.`,
          recommendation: 'Consider a light walk or activity before meals for better mood'
        });
      }
    }
  }

  // Hydration → Energy correlation
  if (moodLogs.length >= 5 && waterLogs.length >= 5) {
    const wellHydratedDays = new Set();
    const dayWaterTotals = {};

    waterLogs.forEach(l => {
      const day = new Date(l.loggedAt).toDateString();
      dayWaterTotals[day] = (dayWaterTotals[day] || 0) + (l.amountMl || 0);
    });

    Object.entries(dayWaterTotals).forEach(([day, total]) => {
      if (total >= 2000) wellHydratedDays.add(day);
    });

    const energyWhenHydrated = moodLogs
      .filter(l => wellHydratedDays.has(new Date(l.loggedAt).toDateString()))
      .reduce((sum, l) => sum + (l.energyLevel || 5), 0);

    const energyWhenDehydrated = moodLogs
      .filter(l => !wellHydratedDays.has(new Date(l.loggedAt).toDateString()))
      .reduce((sum, l) => sum + (l.energyLevel || 5), 0);

    const countHydrated = moodLogs.filter(l => wellHydratedDays.has(new Date(l.loggedAt).toDateString())).length;
    const countDehydrated = moodLogs.filter(l => !wellHydratedDays.has(new Date(l.loggedAt).toDateString())).length;

    if (countHydrated > 0 && countDehydrated > 0) {
      const avgHydrated = energyWhenHydrated / countHydrated;
      const avgDehydrated = energyWhenDehydrated / countDehydrated;

      if (avgHydrated > avgDehydrated + 0.5) {
        significant.push({
          type: 'HYDRATION_ENERGY',
          insight: `Your energy levels are higher on well-hydrated days. Staying hydrated boosts your energy.`,
          recommendation: 'Recommend water-rich foods and beverages throughout the day'
        });
      }
    }
  }

  // Sleep → Stress correlation
  if (sleepLogs.length >= 3 && stressLogs.length >= 3) {
    const poorSleepDays = new Set(
      sleepLogs.filter(l => (l.quality || 5) < 6).map(l => new Date(l.loggedAt).toDateString())
    );

    const stressAfterPoorSleep = stressLogs.filter(l => {
      const prevDay = new Date(l.loggedAt);
      prevDay.setDate(prevDay.getDate() - 1);
      return poorSleepDays.has(prevDay.toDateString());
    });

    if (stressAfterPoorSleep.length > 0) {
      const avgStressAfterPoorSleep = stressAfterPoorSleep.reduce((sum, l) => sum + l.stressLevel, 0) / stressAfterPoorSleep.length;
      if (avgStressAfterPoorSleep > 6) {
        significant.push({
          type: 'SLEEP_STRESS',
          insight: `Poor sleep leads to higher stress levels the next day for you.`,
          recommendation: 'After poor sleep, prioritize calming foods (chamomile tea, magnesium-rich foods) and avoid stimulants'
        });
      }
    }
  }

  return {
    significant,
    hasCorrelations: significant.length > 0
  };
}

// ==================== Contextual Guidance Generation ====================

function generateContextualGuidance(currentState, correlations) {
  const guidance = [];

  // Add guidance for each flag
  currentState.flags.forEach(flag => {
    guidance.push({
      priority: flag.severity,
      type: flag.flag,
      guidance: flag.foodImplication
    });
  });

  // Add correlation-based guidance
  correlations.significant.forEach(corr => {
    guidance.push({
      priority: 'low',
      type: corr.type,
      guidance: corr.recommendation
    });
  });

  // Default guidance if no specific flags
  if (guidance.length === 0) {
    guidance.push({
      priority: 'low',
      type: 'BALANCED',
      guidance: 'User is in good overall state. Recommend balanced, nutritious meals that match their preferences.'
    });
  }

  return guidance;
}

// ==================== Helper Functions ====================

function getMoodLabel(score) {
  if (score >= 8) return 'Excellent';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Neutral';
  if (score >= 2) return 'Low';
  return 'Very Low';
}

function getEnergyLabel(level) {
  if (level >= 8) return 'High';
  if (level >= 6) return 'Good';
  if (level >= 4) return 'Moderate';
  return 'Low';
}

function getSleepQualityLabel(quality) {
  if (quality >= 8) return 'Excellent';
  if (quality >= 6) return 'Good';
  if (quality >= 4) return 'Fair';
  return 'Poor';
}

function getWellnessEmoji(score) {
  if (score >= 80) return '🟢 Excellent';
  if (score >= 60) return '🟡 Good';
  if (score >= 40) return '🟠 Fair';
  return '🔴 Needs Attention';
}

function getRecoveryEmoji(score) {
  if (score >= 70) return '💚 Ready for activity';
  if (score >= 50) return '💛 Moderate activity OK';
  if (score >= 30) return '🧡 Light activity only';
  return '❤️ Rest recommended';
}

function getRecoveryRecommendation(score) {
  if (score >= 70) return 'Full activity - can handle heavy meals';
  if (score >= 50) return 'Moderate activity - balanced meals';
  if (score >= 30) return 'Light activity - lighter, digestible meals';
  return 'Rest day - focus on recovery nutrition';
}

function getHourlyDistribution(waterLogs) {
  const hourCounts = {};
  waterLogs.forEach(l => {
    const hour = new Date(l.loggedAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 12;
  return { hourCounts, peakHour: parseInt(peakHour) };
}

function detectHydrationPersona(hourlyDistribution, waterLogs) {
  const { hourCounts } = hourlyDistribution;
  const morningCount = (hourCounts[6] || 0) + (hourCounts[7] || 0) + (hourCounts[8] || 0) + (hourCounts[9] || 0);
  const eveningCount = (hourCounts[18] || 0) + (hourCounts[19] || 0) + (hourCounts[20] || 0) + (hourCounts[21] || 0);
  const totalCount = Object.values(hourCounts).reduce((a, b) => a + b, 0);

  if (morningCount < totalCount * 0.1) return 'MORNING_DEHYDRATOR';
  if (eveningCount > totalCount * 0.4) return 'EVENING_CATCHUP';
  if (morningCount > totalCount * 0.3 && eveningCount < totalCount * 0.2) return 'CONSISTENT_SIPPER';
  return 'BALANCED';
}

function getDefaultIntelligence() {
  return {
    wellnessScore: 50,
    recoveryScore: 50,
    currentState: { flags: [], primaryConcern: 'NONE', needsSpecialAttention: false },
    insights: {
      mood: { hasData: false },
      activity: { hasData: false, todayLevel: 'unknown' },
      hydration: { hasData: false, isDehydrated: false },
      sleep: { hasData: false },
      stress: { hasData: false, currentLevel: 5 },
      food: { hasData: false }
    },
    correlations: { significant: [], hasCorrelations: false },
    contextualGuidance: [{
      priority: 'low',
      type: 'NO_DATA',
      guidance: 'Insufficient wellness data - recommend balanced meals based on macro preferences'
    }],
    meta: { lookbackDays: 7, dataPoints: {}, generatedAt: new Date().toISOString() }
  };
}

export default {
  getUnifiedIntelligence,
  formatIntelligenceForPrompt
};
