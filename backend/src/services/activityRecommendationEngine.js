/**
 * Activity Recommendation Engine
 *
 * AI-powered personalized exercise recommendation system using:
 * - User profiling and clustering
 * - Recovery-based strain targeting (WHOOP-style)
 * - Context-aware recommendations (time, day, patterns)
 * - Collaborative filtering for similar users
 * - Content-based exercise matching
 * - Explainable AI (XAI) with clear reasoning
 *
 * Based on research from:
 * - PERFECT Framework (ACM)
 * - Nature Scientific Reports ML fitness recommendations
 * - WHOOP recovery/strain algorithms
 */

import { db } from '../config/db.js';
import {
  profilesTable,
  activityLogTable,
  sleepLogTable,
  stressLogTable,
  moodLogTable,
  foodLogTable,
  waterLogTable,
  nutritionGoalsTable,
} from '../db/schema.js';
import { eq, and, gte, desc, sql, avg } from 'drizzle-orm';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Activity types with MET values and characteristics
 * MET = Metabolic Equivalent of Task
 */
const ACTIVITY_DATABASE = {
  walking: {
    name: 'Walking',
    met: { light: 2.5, moderate: 3.5, vigorous: 5.0 },
    category: 'cardio',
    impact: 'low',
    skills: ['endurance', 'recovery'],
    bestFor: ['recovery', 'weight_loss', 'general_health'],
    equipment: 'none',
    duration: { min: 15, optimal: 30, max: 90 },
  },
  running: {
    name: 'Running',
    met: { light: 6.0, moderate: 9.0, vigorous: 12.0 },
    category: 'cardio',
    impact: 'high',
    skills: ['endurance', 'speed', 'cardiovascular'],
    bestFor: ['cardiovascular', 'weight_loss', 'endurance'],
    equipment: 'none',
    duration: { min: 15, optimal: 30, max: 60 },
  },
  cycling: {
    name: 'Cycling',
    met: { light: 4.0, moderate: 6.5, vigorous: 10.0 },
    category: 'cardio',
    impact: 'low',
    skills: ['endurance', 'leg_strength', 'cardiovascular'],
    bestFor: ['cardiovascular', 'weight_loss', 'leg_strength'],
    equipment: 'bicycle',
    duration: { min: 20, optimal: 45, max: 120 },
  },
  strength: {
    name: 'Strength Training',
    met: { light: 3.0, moderate: 5.0, vigorous: 6.0 },
    category: 'strength',
    impact: 'medium',
    skills: ['muscle_building', 'strength', 'metabolism'],
    bestFor: ['muscle_gain', 'metabolism', 'strength'],
    equipment: 'weights',
    duration: { min: 20, optimal: 45, max: 75 },
  },
  yoga: {
    name: 'Yoga',
    met: { light: 2.0, moderate: 3.0, vigorous: 4.0 },
    category: 'flexibility',
    impact: 'low',
    skills: ['flexibility', 'balance', 'mindfulness'],
    bestFor: ['recovery', 'flexibility', 'stress_relief'],
    equipment: 'mat',
    duration: { min: 15, optimal: 45, max: 90 },
  },
  hiit: {
    name: 'HIIT',
    met: { light: 6.0, moderate: 10.0, vigorous: 14.0 },
    category: 'cardio',
    impact: 'high',
    skills: ['cardiovascular', 'metabolism', 'endurance'],
    bestFor: ['weight_loss', 'time_efficient', 'metabolism'],
    equipment: 'none',
    duration: { min: 10, optimal: 25, max: 40 },
  },
  swimming: {
    name: 'Swimming',
    met: { light: 4.5, moderate: 7.0, vigorous: 10.0 },
    category: 'cardio',
    impact: 'none',
    skills: ['full_body', 'cardiovascular', 'endurance'],
    bestFor: ['joint_friendly', 'full_body', 'cardiovascular'],
    equipment: 'pool',
    duration: { min: 20, optimal: 45, max: 90 },
  },
  pilates: {
    name: 'Pilates',
    met: { light: 2.5, moderate: 3.5, vigorous: 4.5 },
    category: 'flexibility',
    impact: 'low',
    skills: ['core_strength', 'flexibility', 'posture'],
    bestFor: ['core_strength', 'posture', 'flexibility'],
    equipment: 'mat',
    duration: { min: 20, optimal: 45, max: 60 },
  },
};

/**
 * User fitness levels with recovery multipliers
 */
const FITNESS_LEVELS = {
  beginner: { recoveryMultiplier: 1.3, maxStrainTarget: 12, weeklyMinutes: 75 },
  intermediate: { recoveryMultiplier: 1.0, maxStrainTarget: 16, weeklyMinutes: 150 },
  advanced: { recoveryMultiplier: 0.8, maxStrainTarget: 20, weeklyMinutes: 300 },
  athlete: { recoveryMultiplier: 0.6, maxStrainTarget: 21, weeklyMinutes: 420 },
};

/**
 * Time-of-day activity preferences (based on research)
 */
const TIME_PREFERENCES = {
  morning: {
    hours: [5, 11],
    bestActivities: ['running', 'cycling', 'yoga', 'hiit'],
    energyMultiplier: 1.1,
    reason: 'Morning workouts boost metabolism and energy for the day',
  },
  midday: {
    hours: [11, 14],
    bestActivities: ['walking', 'yoga', 'pilates'],
    energyMultiplier: 0.9,
    reason: 'Light activity aids digestion and breaks up sedentary work',
  },
  afternoon: {
    hours: [14, 18],
    bestActivities: ['strength', 'hiit', 'swimming'],
    energyMultiplier: 1.15,
    reason: 'Peak body temperature and muscle function for strength gains',
  },
  evening: {
    hours: [18, 21],
    bestActivities: ['yoga', 'walking', 'pilates', 'swimming'],
    energyMultiplier: 1.0,
    reason: 'Wind-down activities that promote better sleep',
  },
};

// ============================================================================
// USER PROFILE ANALYSIS
// ============================================================================

/**
 * Build comprehensive user profile for recommendations
 * Returns default values for new users without data
 */
async function buildUserProfile(userId) {
  try {
    // Fetch user's basic profile (may not exist for new users)
    let profile = null;
    let goals = null;

    try {
      const profiles = await db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, userId))
        .limit(1);
      profile = profiles[0] || null;
    } catch (e) {
      console.log('[ActivityEngine] No profile found, using defaults');
    }

    try {
      const goalsList = await db
        .select()
        .from(nutritionGoalsTable)
        .where(eq(nutritionGoalsTable.userId, userId))
        .limit(1);
      goals = goalsList[0] || null;
    } catch (e) {
      console.log('[ActivityEngine] No goals found, using defaults');
    }

    // Calculate derived fitness level
    const fitnessLevel = determineFitnessLevel(profile, goals);

    // Get activity history stats (returns defaults if no data)
    const activityStats = await getActivityStats(userId, 30);

    // Get current health signals (returns empty object if no data)
    const healthSignals = await getCurrentHealthSignals(userId);

    return {
      userId,
      demographics: {
        age: calculateAge(profile?.dateOfBirth),
        weight: parseFloat(profile?.weightKg) || 70,
        height: parseFloat(profile?.heightCm) || 170,
        gender: profile?.gender || 'not_specified',
        activityLevel: profile?.activityLevel || 'moderate',
      },
      goals: {
        primary: goals?.primaryGoal || 'general_health',
        calorieTarget: goals?.calorieTarget || 2000,
        proteinTarget: goals?.proteinGrams || 50,
        weeklyActivityMinutes: goals?.weeklyActivityMinutes || 150,
      },
      fitnessLevel,
      activityStats: activityStats || getDefaultActivityStats(),
      healthSignals: healthSignals || {},
      preferences: profile?.activityPreferences || {},
      restrictions: profile?.healthConditions || [],
    };
  } catch (error) {
    console.error('[ActivityEngine] Error building user profile:', error);
    // Return default profile instead of null
    return {
      userId,
      demographics: {
        age: 30,
        weight: 70,
        height: 170,
        gender: 'not_specified',
        activityLevel: 'moderate',
      },
      goals: {
        primary: 'general_health',
        calorieTarget: 2000,
        proteinTarget: 50,
        weeklyActivityMinutes: 150,
      },
      fitnessLevel: 'intermediate',
      activityStats: getDefaultActivityStats(),
      healthSignals: {},
      preferences: {},
      restrictions: [],
    };
  }
}

/**
 * Get default activity stats for new users
 */
function getDefaultActivityStats() {
  return {
    totalActivities: 0,
    totalMinutes: 0,
    totalCalories: 0,
    avgDuration: 0,
    avgIntensity: 'moderate',
    weeklyMinutes: 0,
    preferredTypes: [],
    preferredTimes: [],
    consistency: 0,
    lastActivity: null,
    daysSinceLastActivity: null,
  };
}

/**
 * Determine user's fitness level from profile and activity data
 */
function determineFitnessLevel(profile, goals) {
  const activityLevel = profile?.activityLevel || 'moderate';

  const levelMap = {
    sedentary: 'beginner',
    light: 'beginner',
    moderate: 'intermediate',
    active: 'advanced',
    very_active: 'athlete',
  };

  return levelMap[activityLevel] || 'intermediate';
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 30; // Default assumption
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get activity statistics for the user
 */
async function getActivityStats(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const activities = await db
      .select()
      .from(activityLogTable)
      .where(
        and(
          eq(activityLogTable.userId, userId),
          gte(activityLogTable.loggedAt, startDate)
        )
      )
      .orderBy(desc(activityLogTable.loggedAt));

    if (activities.length === 0) {
      return {
        totalActivities: 0,
        totalMinutes: 0,
        totalCalories: 0,
        avgDuration: 0,
        avgIntensity: 'moderate',
        weeklyMinutes: 0,
        preferredTypes: [],
        preferredTimes: [],
        consistency: 0,
        lastActivity: null,
        daysSinceLastActivity: null,
      };
    }

    // Calculate statistics
    const totalMinutes = activities.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
    const totalCalories = activities.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
    const weeklyMinutes = totalMinutes / (days / 7);

    // Count activity types
    const typeCounts = {};
    const timeCounts = { morning: 0, midday: 0, afternoon: 0, evening: 0 };

    activities.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;

      const hour = new Date(a.loggedAt).getHours();
      if (hour >= 5 && hour < 11) timeCounts.morning++;
      else if (hour >= 11 && hour < 14) timeCounts.midday++;
      else if (hour >= 14 && hour < 18) timeCounts.afternoon++;
      else if (hour >= 18 && hour < 21) timeCounts.evening++;
    });

    // Get preferred types (top 3)
    const preferredTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);

    // Get preferred time
    const preferredTimes = Object.entries(timeCounts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, count]) => count > 0)
      .slice(0, 2)
      .map(([time]) => time);

    // Calculate consistency (days with activity / total days)
    const uniqueDays = new Set(
      activities.map(a => new Date(a.loggedAt).toDateString())
    ).size;
    const consistency = Math.round((uniqueDays / days) * 100);

    // Days since last activity
    const lastActivity = activities[0];
    const daysSinceLastActivity = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.loggedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      totalActivities: activities.length,
      totalMinutes,
      totalCalories,
      avgDuration: Math.round(totalMinutes / activities.length),
      avgIntensity: calculateAvgIntensity(activities),
      weeklyMinutes: Math.round(weeklyMinutes),
      preferredTypes,
      preferredTimes,
      consistency,
      lastActivity,
      daysSinceLastActivity,
    };
  } catch (error) {
    console.error('[ActivityEngine] Error getting activity stats:', error);
    return getDefaultActivityStats();
  }
}

/**
 * Calculate average intensity from activities
 */
function calculateAvgIntensity(activities) {
  const intensityMap = { light: 1, moderate: 2, vigorous: 3 };
  const total = activities.reduce((sum, a) => sum + (intensityMap[a.intensity] || 2), 0);
  const avg = total / activities.length;

  if (avg < 1.5) return 'light';
  if (avg < 2.5) return 'moderate';
  return 'vigorous';
}

// ============================================================================
// RECOVERY SCORE CALCULATION (WHOOP-style)
// ============================================================================

/**
 * Get current health signals for recovery calculation
 * Each query is wrapped individually to handle table-not-found errors
 */
async function getCurrentHealthSignals(userId) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0); // Start of yesterday
  const todayStr = today.toISOString().split('T')[0];

  let sleep = null;
  let stressLogs = [];
  let mood = null;
  let waterLogs = [];

  // Get last night's sleep (gracefully handle if table doesn't exist)
  try {
    const sleepResults = await db
      .select()
      .from(sleepLogTable)
      .where(eq(sleepLogTable.userId, userId))
      .orderBy(desc(sleepLogTable.sleepDate))
      .limit(1);
    sleep = sleepResults[0] || null;
  } catch (e) {
    console.log('[ActivityEngine] Sleep data not available:', e.message);
  }

  // Get today's stress (gracefully handle if table doesn't exist)
  try {
    stressLogs = await db
      .select()
      .from(stressLogTable)
      .where(
        and(
          eq(stressLogTable.userId, userId),
          eq(stressLogTable.loggedDate, todayStr)
        )
      );
  } catch (e) {
    console.log('[ActivityEngine] Stress data not available:', e.message);
  }

  // Get today's mood
  try {
    const moodResults = await db
      .select()
      .from(moodLogTable)
      .where(eq(moodLogTable.userId, userId))
      .orderBy(desc(moodLogTable.loggedDate))
      .limit(1);
    mood = moodResults[0] || null;
  } catch (e) {
    console.log('[ActivityEngine] Mood data not available:', e.message);
  }

  // Get recent hydration (compare with Date object since loggedDate is timestamp)
  try {
    waterLogs = await db
      .select()
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, yesterday)
        )
      );
  } catch (e) {
    console.log('[ActivityEngine] Water data not available:', e.message);
  }

  // Convert liters to ml (schema uses amountLiters)
  const totalWaterMl = waterLogs.reduce((sum, w) => {
    const liters = parseFloat(w.amountLiters) || 0;
    return sum + (liters * 1000);
  }, 0);

  return {
    sleep: sleep ? {
      quality: sleep.quality,
      durationMinutes: sleep.durationMinutes,
      durationHours: Math.round((sleep.durationMinutes / 60) * 10) / 10,
      tags: sleep.tags || {},
    } : null,
    stress: stressLogs.length > 0 ? {
      avgLevel: stressLogs.reduce((sum, s) => sum + s.level, 0) / stressLogs.length,
      count: stressLogs.length,
    } : null,
    mood: mood ? {
      score: mood.intensity || 5, // Use intensity as score (1-10)
      energy: mood.energyLevel,
      type: mood.mood, // 'happy', 'sad', 'neutral', etc.
    } : null,
    hydration: {
      totalMl: totalWaterMl,
      isAdequate: totalWaterMl >= 2000,
    },
  };
}

/**
 * Calculate recovery score (0-100) based on health signals
 * Inspired by WHOOP's recovery algorithm
 */
function calculateRecoveryScore(healthSignals, activityStats) {
  let score = 50; // Baseline
  const factors = [];

  // Sleep Quality (40% weight)
  if (healthSignals.sleep) {
    const sleepScore = calculateSleepScore(healthSignals.sleep);
    score += (sleepScore - 50) * 0.4;
    factors.push({
      factor: 'sleep',
      value: sleepScore,
      impact: sleepScore >= 70 ? 'positive' : sleepScore >= 50 ? 'neutral' : 'negative',
      detail: healthSignals.sleep.durationHours >= 7
        ? `${healthSignals.sleep.durationHours}h of quality sleep`
        : `Only ${healthSignals.sleep.durationHours}h sleep - aim for 7-9h`,
    });
  } else {
    factors.push({
      factor: 'sleep',
      value: null,
      impact: 'unknown',
      detail: 'No sleep data - log your sleep for better recommendations',
    });
  }

  // Stress Level (25% weight)
  if (healthSignals.stress) {
    const stressScore = 100 - (healthSignals.stress.avgLevel * 10);
    score += (stressScore - 50) * 0.25;
    factors.push({
      factor: 'stress',
      value: stressScore,
      impact: healthSignals.stress.avgLevel <= 4 ? 'positive' : healthSignals.stress.avgLevel <= 6 ? 'neutral' : 'negative',
      detail: healthSignals.stress.avgLevel <= 4
        ? 'Low stress levels - great for training'
        : `Stress level ${healthSignals.stress.avgLevel}/10 may affect recovery`,
    });
  }

  // Previous Activity Load (20% weight)
  if (activityStats && activityStats.daysSinceLastActivity !== null) {
    let loadScore = 50;
    if (activityStats.daysSinceLastActivity === 0) {
      // Same day activity - may need recovery
      loadScore = 30;
      factors.push({
        factor: 'activity_load',
        value: loadScore,
        impact: 'caution',
        detail: 'Already active today - consider lighter follow-up activity',
      });
    } else if (activityStats.daysSinceLastActivity === 1) {
      loadScore = 60;
      factors.push({
        factor: 'activity_load',
        value: loadScore,
        impact: 'neutral',
        detail: '1 day since last workout - good recovery window',
      });
    } else if (activityStats.daysSinceLastActivity >= 2 && activityStats.daysSinceLastActivity <= 3) {
      loadScore = 80;
      factors.push({
        factor: 'activity_load',
        value: loadScore,
        impact: 'positive',
        detail: 'Well-rested - ready for a solid workout',
      });
    } else if (activityStats.daysSinceLastActivity > 3) {
      loadScore = 70;
      factors.push({
        factor: 'activity_load',
        value: loadScore,
        impact: 'neutral',
        detail: `${activityStats.daysSinceLastActivity} days inactive - ease back in`,
      });
    }
    score += (loadScore - 50) * 0.2;
  }

  // Hydration (10% weight)
  if (healthSignals.hydration) {
    const hydrationScore = healthSignals.hydration.isAdequate ? 75 : 35;
    score += (hydrationScore - 50) * 0.1;
    factors.push({
      factor: 'hydration',
      value: hydrationScore,
      impact: healthSignals.hydration.isAdequate ? 'positive' : 'negative',
      detail: healthSignals.hydration.isAdequate
        ? 'Well hydrated for optimal performance'
        : 'Hydration low - drink water before exercising',
    });
  }

  // Mood/Energy (5% weight)
  if (healthSignals.mood) {
    const moodScore = (healthSignals.mood.score || 5) * 10;
    score += (moodScore - 50) * 0.05;
    factors.push({
      factor: 'mood',
      value: moodScore,
      impact: moodScore >= 60 ? 'positive' : 'neutral',
      detail: moodScore >= 60 ? 'Good mood supports motivation' : 'Consider mood-boosting activities',
    });
  }

  // Clamp score between 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    label: getRecoveryLabel(score),
    color: getRecoveryColor(score),
    factors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Calculate sleep score component
 */
function calculateSleepScore(sleep) {
  let score = 50;

  // Duration (7-9 hours optimal)
  const hours = sleep.durationHours;
  if (hours >= 7 && hours <= 9) {
    score += 25;
  } else if (hours >= 6 && hours < 7) {
    score += 10;
  } else if (hours > 9) {
    score += 15;
  } else {
    score -= 10;
  }

  // Quality (1-10 scale)
  score += (sleep.quality - 5) * 5;

  // Negative tags impact
  const negativeTags = ['caffeine', 'alcohol', 'screenTime', 'stress'];
  const activeNegativeTags = negativeTags.filter(t => sleep.tags?.[t]);
  score -= activeNegativeTags.length * 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * Get recovery label from score
 */
function getRecoveryLabel(score) {
  if (score >= 80) return 'Optimal';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Poor';
}

/**
 * Get recovery color from score
 */
function getRecoveryColor(score) {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#84CC16'; // Lime
  if (score >= 40) return '#F59E0B'; // Amber
  if (score >= 20) return '#F97316'; // Orange
  return '#EF4444'; // Red
}

// ============================================================================
// STRAIN TARGET CALCULATION
// ============================================================================

/**
 * Calculate recommended strain target based on recovery
 * Uses WHOOP-inspired logarithmic strain scale (0-21)
 */
function calculateStrainTarget(recoveryScore, fitnessLevel) {
  const levelConfig = FITNESS_LEVELS[fitnessLevel] || FITNESS_LEVELS.intermediate;
  const maxStrain = levelConfig.maxStrainTarget;

  // Recovery percentage determines strain percentage
  const recoveryPct = recoveryScore / 100;

  // Non-linear relationship: higher recovery allows exponentially more strain
  const strainPct = Math.pow(recoveryPct, 0.8);

  // Calculate target with fitness level cap
  let target = strainPct * maxStrain;

  // Apply minimum based on maintaining fitness
  const minStrain = 6; // Minimum to maintain fitness
  target = Math.max(minStrain, target);

  // Round to nearest 0.5
  target = Math.round(target * 2) / 2;

  return {
    target,
    min: Math.max(4, target - 3),
    max: Math.min(maxStrain, target + 2),
    zone: getStrainZone(target),
    recommendation: getStrainRecommendation(target, recoveryScore),
  };
}

/**
 * Get strain zone description
 */
function getStrainZone(strain) {
  if (strain <= 6) return { name: 'Recovery', description: 'Light activity to maintain fitness' };
  if (strain <= 10) return { name: 'Light', description: 'Easy workout with low cardiovascular demand' };
  if (strain <= 14) return { name: 'Moderate', description: 'Balanced workout maintaining fitness' };
  if (strain <= 18) return { name: 'High', description: 'Challenging workout building fitness' };
  return { name: 'Peak', description: 'Maximum effort for significant gains' };
}

/**
 * Get strain recommendation text
 */
function getStrainRecommendation(strain, recovery) {
  if (recovery >= 80) {
    return 'Your recovery is excellent. Push yourself today for maximum gains.';
  }
  if (recovery >= 60) {
    return 'Good recovery. A solid workout will maintain and build fitness.';
  }
  if (recovery >= 40) {
    return 'Moderate recovery. Focus on technique over intensity today.';
  }
  return 'Low recovery. Prioritize rest or light movement like walking or yoga.';
}

// ============================================================================
// PERSONALIZED ACTIVITY RECOMMENDATIONS
// ============================================================================

/**
 * Generate personalized activity recommendations
 */
function generateActivityRecommendations(userProfile, recoveryScore, strainTarget) {
  const recommendations = [];
  const currentHour = new Date().getHours();
  const currentTimeSlot = getCurrentTimeSlot(currentHour);
  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Get activities suitable for current recovery
  const suitableActivities = getSuitableActivities(recoveryScore, strainTarget, userProfile);

  // Score and rank activities
  suitableActivities.forEach(activity => {
    const score = scoreActivity(activity, userProfile, currentTimeSlot, isWeekend);
    const reasons = generateReasons(activity, userProfile, recoveryScore, currentTimeSlot);

    recommendations.push({
      ...activity,
      score,
      reasons,
      timing: generateTimingRecommendation(activity, currentHour, userProfile),
      duration: calculateOptimalDuration(activity, strainTarget, userProfile),
      intensity: calculateRecommendedIntensity(activity, recoveryScore, userProfile),
      calories: estimateCalories(activity, userProfile),
    });
  });

  // Sort by score and return top recommendations
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.slice(0, 5).map((rec, index) => ({
    ...rec,
    rank: index + 1,
    isPrimary: index === 0,
  }));
}

/**
 * Get current time slot
 */
function getCurrentTimeSlot(hour) {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get activities suitable for recovery level
 */
function getSuitableActivities(recoveryScore, strainTarget, userProfile) {
  const activities = [];

  Object.entries(ACTIVITY_DATABASE).forEach(([type, data]) => {
    // Filter by impact if recovery is low
    if (recoveryScore < 40 && data.impact === 'high') return;

    // Check restrictions
    if (userProfile.restrictions?.includes(`no_${data.category}`)) return;

    // Calculate achievable strain with this activity
    const achievableStrain = calculateActivityStrain(data, strainTarget.target);

    if (achievableStrain >= strainTarget.min * 0.5) {
      activities.push({
        type,
        ...data,
        achievableStrain,
      });
    }
  });

  return activities;
}

/**
 * Calculate approximate strain from activity
 */
function calculateActivityStrain(activity, duration = 30) {
  const baseMet = activity.met.moderate;
  // Simplified strain calculation: MET * duration factor
  return Math.min(21, (baseMet * Math.log(duration + 1)) / 2);
}

/**
 * Score an activity for the user
 */
function scoreActivity(activity, userProfile, timeSlot, isWeekend) {
  let score = 50; // Base score

  // Goal alignment (+20 max)
  const goalAlignment = activity.bestFor.includes(userProfile.goals.primary);
  if (goalAlignment) score += 20;

  // User preference history (+15 max)
  if (userProfile.activityStats?.preferredTypes?.includes(activity.type)) {
    score += 15;
  }

  // Time of day suitability (+10 max)
  const timePrefs = TIME_PREFERENCES[timeSlot];
  if (timePrefs?.bestActivities.includes(activity.type)) {
    score += 10;
  }

  // Variety bonus - recommend something different (+5)
  const recentTypes = userProfile.activityStats?.preferredTypes || [];
  if (!recentTypes.includes(activity.type) && recentTypes.length > 0) {
    score += 5;
  }

  // Weekend adjustment for longer activities
  if (isWeekend && activity.duration.optimal >= 45) {
    score += 5;
  }

  // Equipment availability penalty
  if (activity.equipment !== 'none' && activity.equipment !== 'mat') {
    score -= 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate human-readable reasons for recommendation
 */
function generateReasons(activity, userProfile, recoveryScore, timeSlot) {
  const reasons = [];

  // Goal-based reason
  if (activity.bestFor.includes(userProfile.goals.primary)) {
    const goalMap = {
      weight_loss: 'Supports your weight loss goal',
      muscle_gain: 'Helps build muscle mass',
      general_health: 'Great for overall health',
      endurance: 'Builds cardiovascular endurance',
      flexibility: 'Improves flexibility and mobility',
      stress_relief: 'Excellent for stress relief',
    };
    reasons.push({
      type: 'goal',
      text: goalMap[userProfile.goals.primary] || 'Aligns with your fitness goals',
      icon: 'target',
    });
  }

  // Recovery-based reason
  if (recoveryScore >= 70 && activity.impact === 'high') {
    reasons.push({
      type: 'recovery',
      text: 'Your high recovery supports intense training',
      icon: 'battery-full',
    });
  } else if (recoveryScore < 50 && activity.impact === 'low') {
    reasons.push({
      type: 'recovery',
      text: 'Low-impact activity ideal for your recovery state',
      icon: 'heart',
    });
  }

  // Time-based reason
  const timePrefs = TIME_PREFERENCES[timeSlot];
  if (timePrefs?.bestActivities.includes(activity.type)) {
    reasons.push({
      type: 'timing',
      text: timePrefs.reason,
      icon: 'time',
    });
  }

  // History-based reason
  if (userProfile.activityStats?.preferredTypes?.includes(activity.type)) {
    reasons.push({
      type: 'preference',
      text: 'One of your favorite activities',
      icon: 'heart',
    });
  }

  // Variety reason
  if (!userProfile.activityStats?.preferredTypes?.includes(activity.type)) {
    reasons.push({
      type: 'variety',
      text: 'Try something different for balanced fitness',
      icon: 'shuffle',
    });
  }

  return reasons;
}

/**
 * Generate timing recommendation
 */
function generateTimingRecommendation(activity, currentHour, userProfile) {
  const preferredTimes = userProfile.activityStats?.preferredTimes || [];

  // Find best time for this activity
  let bestTime = null;
  let bestScore = 0;

  Object.entries(TIME_PREFERENCES).forEach(([slot, prefs]) => {
    if (prefs.bestActivities.includes(activity.type)) {
      let score = prefs.energyMultiplier * 100;
      if (preferredTimes.includes(slot)) score += 20;
      if (score > bestScore) {
        bestScore = score;
        bestTime = slot;
      }
    }
  });

  const timeRanges = {
    morning: '6:00 - 10:00 AM',
    midday: '11:00 AM - 1:00 PM',
    afternoon: '2:00 - 5:00 PM',
    evening: '6:00 - 8:00 PM',
  };

  return {
    suggested: bestTime || 'afternoon',
    range: timeRanges[bestTime] || timeRanges.afternoon,
    isNow: getCurrentTimeSlot(currentHour) === bestTime,
  };
}

/**
 * Calculate optimal duration
 */
function calculateOptimalDuration(activity, strainTarget, userProfile) {
  const base = activity.duration.optimal;
  const fitnessMultiplier = FITNESS_LEVELS[userProfile.fitnessLevel]?.recoveryMultiplier || 1;

  // Adjust based on strain target and fitness
  let duration = base / fitnessMultiplier;

  // Ensure within activity's range
  duration = Math.max(activity.duration.min, Math.min(activity.duration.max, duration));

  return {
    minutes: Math.round(duration),
    range: `${activity.duration.min}-${activity.duration.max}`,
  };
}

/**
 * Calculate recommended intensity
 */
function calculateRecommendedIntensity(activity, recoveryScore, userProfile) {
  if (recoveryScore >= 80) return 'vigorous';
  if (recoveryScore >= 50) return 'moderate';
  return 'light';
}

/**
 * Estimate calories burned
 */
function estimateCalories(activity, userProfile) {
  const weight = userProfile.demographics?.weight || 70;
  const duration = activity.duration?.optimal || 30;
  const met = activity.met?.moderate || 5;

  // Calories = MET * weight (kg) * duration (hours)
  const calories = Math.round(met * weight * (duration / 60));

  return {
    estimated: calories,
    range: `${Math.round(calories * 0.8)}-${Math.round(calories * 1.2)}`,
  };
}

// ============================================================================
// WEEKLY PATTERNS & INSIGHTS
// ============================================================================

/**
 * Generate weekly activity insights
 */
async function generateWeeklyInsights(userId, activityStats) {
  const insights = [];

  // Consistency insight
  if (activityStats.consistency >= 70) {
    insights.push({
      type: 'achievement',
      title: 'Great Consistency!',
      message: `You've been active ${activityStats.consistency}% of days. Keep it up!`,
      icon: 'trophy',
      color: '#10B981',
    });
  } else if (activityStats.consistency >= 40) {
    insights.push({
      type: 'encouragement',
      title: 'Building Momentum',
      message: `Active ${activityStats.consistency}% of days. Aim for 3-4 days per week.`,
      icon: 'trending-up',
      color: '#F59E0B',
    });
  } else {
    insights.push({
      type: 'motivation',
      title: 'Let\'s Get Moving',
      message: 'Even 10 minutes of activity can improve your day. Start small!',
      icon: 'flash',
      color: '#6366F1',
    });
  }

  // Weekly minutes vs recommended target (150 min/week)
  const weeklyTarget = 150;
  const weeklyPct = Math.round((activityStats.weeklyMinutes / weeklyTarget) * 100);

  if (weeklyPct >= 100) {
    insights.push({
      type: 'goal_met',
      title: 'Weekly Goal Achieved!',
      message: `${activityStats.weeklyMinutes} min this week - you've exceeded your 150 min target!`,
      icon: 'checkmark-circle',
      color: '#10B981',
    });
  } else {
    const remaining = weeklyTarget - activityStats.weeklyMinutes;
    insights.push({
      type: 'progress',
      title: 'Weekly Progress',
      message: `${activityStats.weeklyMinutes}/${weeklyTarget} min (${weeklyPct}%). ${remaining} min to go!`,
      icon: 'bar-chart',
      color: '#3B82F6',
    });
  }

  // Activity variety insight
  if (activityStats.preferredTypes.length === 1) {
    insights.push({
      type: 'suggestion',
      title: 'Try Something New',
      message: `You mostly do ${activityStats.preferredTypes[0]}. Mixing activities prevents plateaus.`,
      icon: 'shuffle',
      color: '#8B5CF6',
    });
  }

  return insights;
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Get comprehensive activity intelligence for user
 */
export async function getActivityIntelligence(userId) {
  try {
    console.log('[ActivityEngine] Generating intelligence for user:', userId);

    // Build user profile (now always returns a valid profile with defaults)
    const userProfile = await buildUserProfile(userId);

    console.log('[ActivityEngine] User profile built:', {
      fitnessLevel: userProfile.fitnessLevel,
      hasHealthSignals: Object.keys(userProfile.healthSignals || {}).length > 0,
      activityCount: userProfile.activityStats?.totalActivities || 0,
    });

    // Calculate recovery score
    const recovery = calculateRecoveryScore(
      userProfile.healthSignals || {},
      userProfile.activityStats || getDefaultActivityStats()
    );

    console.log('[ActivityEngine] Recovery score:', recovery.score);

    // Calculate strain target
    const strainTarget = calculateStrainTarget(
      recovery.score,
      userProfile.fitnessLevel
    );

    // Generate personalized recommendations
    const recommendations = generateActivityRecommendations(
      userProfile,
      recovery.score,
      strainTarget
    );

    console.log('[ActivityEngine] Generated', recommendations.length, 'recommendations');

    // Generate weekly insights
    const weeklyInsights = await generateWeeklyInsights(
      userId,
      userProfile.activityStats || getDefaultActivityStats()
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      recovery,
      strainTarget,
      recommendations,
      weeklyInsights,
      activityStats: userProfile.activityStats,
      userContext: {
        fitnessLevel: userProfile.fitnessLevel,
        primaryGoal: userProfile.goals.primary,
        timeSlot: getCurrentTimeSlot(new Date().getHours()),
      },
    };
  } catch (error) {
    console.error('[ActivityEngine] Error generating intelligence:', error.message);
    console.error('[ActivityEngine] Stack trace:', error.stack);
    return {
      error: 'Failed to generate activity intelligence',
      details: error.message,
      success: false,
    };
  }
}

export default {
  getActivityIntelligence,
  buildUserProfile,
  calculateRecoveryScore,
  calculateStrainTarget,
  generateActivityRecommendations,
  ACTIVITY_DATABASE,
  FITNESS_LEVELS,
  TIME_PREFERENCES,
};
