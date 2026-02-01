/**
 * Mood Recommendation Engine
 *
 * AI-powered personalized mood improvement recommendations using:
 * - User mood profiling and pattern analysis
 * - Food-mood correlation insights
 * - Time-of-day and context awareness
 * - Explainable AI (XAI) with clear reasoning
 * - Evidence-based mood optimization strategies
 *
 * Based on research from:
 * - Nutritional psychiatry studies
 * - Circadian rhythm and mood research
 * - Behavioral activation therapy principles
 */

import { db } from '../config/db.js';
import {
  profilesTable,
  moodLogTable,
  foodLogTable,
  waterLogTable,
  sleepLogTable,
  stressLogTable,
  activityLogTable,
  nutritionGoalsTable,
} from '../db/schema.js';
import { eq, and, gte, desc, sql, avg } from 'drizzle-orm';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Mood categories with wellness attributes
 */
const MOOD_CATEGORIES = {
  happy: { valence: 1, energy: 0.7, icon: 'happy', color: '#10B981' },
  energized: { valence: 0.8, energy: 1, icon: 'flash', color: '#F59E0B' },
  calm: { valence: 0.7, energy: 0.3, icon: 'leaf', color: '#3B82F6' },
  focused: { valence: 0.7, energy: 0.6, icon: 'bulb', color: '#14B8A6' },
  neutral: { valence: 0.5, energy: 0.5, icon: 'ellipse-outline', color: '#6B7280' },
  tired: { valence: 0.3, energy: 0.2, icon: 'bed', color: '#8B5CF6' },
  stressed: { valence: 0.2, energy: 0.7, icon: 'alert-circle', color: '#EF4444' },
  sad: { valence: 0.1, energy: 0.3, icon: 'sad', color: '#8B5CF6' },
};

/**
 * Time-of-day mood optimization windows
 */
const TIME_WINDOWS = {
  earlyMorning: { start: 5, end: 8, label: 'Early Morning', energy: 'rising' },
  morning: { start: 8, end: 12, label: 'Morning', energy: 'peak' },
  afternoon: { start: 12, end: 17, label: 'Afternoon', energy: 'dipping' },
  evening: { start: 17, end: 21, label: 'Evening', energy: 'winding_down' },
  night: { start: 21, end: 24, label: 'Night', energy: 'low' },
  lateNight: { start: 0, end: 5, label: 'Late Night', energy: 'recovery' },
};

/**
 * Mood-supporting nutrients with RDA and food sources
 */
const MOOD_NUTRIENTS = {
  omega3: {
    name: 'Omega-3',
    rda: 1.6,
    unit: 'g',
    benefit: 'Reduces inflammation, supports brain health',
    foods: ['Salmon', 'Walnuts', 'Chia seeds', 'Flaxseeds'],
  },
  magnesium: {
    name: 'Magnesium',
    rda: 400,
    unit: 'mg',
    benefit: 'Regulates stress response, supports GABA',
    foods: ['Dark chocolate', 'Spinach', 'Almonds', 'Avocado'],
  },
  vitaminD: {
    name: 'Vitamin D',
    rda: 600,
    unit: 'IU',
    benefit: 'Serotonin production, mood regulation',
    foods: ['Fatty fish', 'Egg yolks', 'Fortified milk', 'Sunlight exposure'],
  },
  bVitamins: {
    name: 'B Vitamins',
    rda: 2.4,
    unit: 'mcg (B12)',
    benefit: 'Neurotransmitter synthesis, energy production',
    foods: ['Eggs', 'Leafy greens', 'Whole grains', 'Legumes'],
  },
  iron: {
    name: 'Iron',
    rda: 18,
    unit: 'mg',
    benefit: 'Oxygen delivery to brain, dopamine function',
    foods: ['Red meat', 'Spinach', 'Lentils', 'Fortified cereals'],
  },
  tryptophan: {
    name: 'Tryptophan',
    rda: 250,
    unit: 'mg',
    benefit: 'Serotonin precursor, promotes calm and sleep',
    foods: ['Turkey', 'Chicken', 'Eggs', 'Cheese', 'Nuts'],
  },
};

/**
 * Recommendation categories
 */
const RECOMMENDATION_TYPES = {
  NUTRITION: 'nutrition',
  HYDRATION: 'hydration',
  ACTIVITY: 'activity',
  SLEEP: 'sleep',
  MINDFULNESS: 'mindfulness',
  SOCIAL: 'social',
  LIGHT_EXPOSURE: 'light_exposure',
};

// ============================================================================
// USER PROFILING
// ============================================================================

/**
 * Build comprehensive mood profile for user
 */
async function buildMoodProfile(userId) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get user profile
    let profile = null;
    try {
      const profiles = await db
        .select()
        .from(profilesTable)
        .where(eq(profilesTable.userId, userId))
        .limit(1);
      profile = profiles[0] || null;
    } catch (e) {
      console.log('[MoodEngine] Profile not available:', e.message);
    }

    // Get mood history
    let moodLogs = [];
    try {
      moodLogs = await db
        .select()
        .from(moodLogTable)
        .where(
          and(
            eq(moodLogTable.userId, userId),
            gte(moodLogTable.loggedAt, thirtyDaysAgo)
          )
        )
        .orderBy(desc(moodLogTable.loggedAt));
    } catch (e) {
      console.log('[MoodEngine] Mood data not available:', e.message);
    }

    // Get recent food logs
    let foodLogs = [];
    try {
      foodLogs = await db
        .select()
        .from(foodLogTable)
        .where(
          and(
            eq(foodLogTable.userId, userId),
            gte(foodLogTable.loggedDate, sevenDaysAgo)
          )
        )
        .orderBy(desc(foodLogTable.loggedDate));
    } catch (e) {
      console.log('[MoodEngine] Food data not available:', e.message);
    }

    // Get recent sleep
    let sleepLogs = [];
    try {
      sleepLogs = await db
        .select()
        .from(sleepLogTable)
        .where(eq(sleepLogTable.userId, userId))
        .orderBy(desc(sleepLogTable.sleepDate))
        .limit(7);
    } catch (e) {
      console.log('[MoodEngine] Sleep data not available:', e.message);
    }

    // Get recent stress
    let stressLogs = [];
    try {
      stressLogs = await db
        .select()
        .from(stressLogTable)
        .where(
          and(
            eq(stressLogTable.userId, userId),
            gte(stressLogTable.loggedAt, sevenDaysAgo)
          )
        );
    } catch (e) {
      console.log('[MoodEngine] Stress data not available:', e.message);
    }

    // Get recent activity
    let activityLogs = [];
    try {
      activityLogs = await db
        .select()
        .from(activityLogTable)
        .where(
          and(
            eq(activityLogTable.userId, userId),
            gte(activityLogTable.loggedAt, sevenDaysAgo)
          )
        );
    } catch (e) {
      console.log('[MoodEngine] Activity data not available:', e.message);
    }

    // Get hydration
    let waterLogs = [];
    try {
      waterLogs = await db
        .select()
        .from(waterLogTable)
        .where(
          and(
            eq(waterLogTable.userId, userId),
            gte(waterLogTable.loggedDate, sevenDaysAgo)
          )
        );
    } catch (e) {
      console.log('[MoodEngine] Water data not available:', e.message);
    }

    // Analyze mood patterns
    const moodPatterns = analyzeMoodPatterns(moodLogs);
    const foodMoodCorrelations = analyzeFoodMoodCorrelations(moodLogs, foodLogs);
    const sleepMoodLink = analyzeSleepMoodLink(moodLogs, sleepLogs);
    const activityMoodLink = analyzeActivityMoodLink(moodLogs, activityLogs);
    const hydrationStatus = analyzeHydration(waterLogs);
    const stressLevel = analyzeStressLevel(stressLogs);

    return {
      userId,
      demographics: {
        age: profile?.age || null,
        gender: profile?.gender || null,
      },
      moodPatterns,
      foodMoodCorrelations,
      sleepMoodLink,
      activityMoodLink,
      hydrationStatus,
      stressLevel,
      dataQuality: {
        moodLogs: moodLogs.length,
        foodLogs: foodLogs.length,
        sleepLogs: sleepLogs.length,
        activityLogs: activityLogs.length,
        hasEnoughData: moodLogs.length >= 3,
      },
    };
  } catch (error) {
    console.error('[MoodEngine] Error building profile:', error);
    return getDefaultMoodProfile(userId);
  }
}

/**
 * Default mood profile for new users
 */
function getDefaultMoodProfile(userId) {
  return {
    userId,
    demographics: { age: null, gender: null },
    moodPatterns: {
      dominantMood: 'neutral',
      avgValence: 0.5,
      avgEnergy: 0.5,
      volatility: 'stable',
      recentTrend: 'stable',
      bestTimeOfDay: null,
      worstTimeOfDay: null,
    },
    foodMoodCorrelations: [],
    sleepMoodLink: { correlation: null, avgSleepQuality: null },
    activityMoodLink: { correlation: null, avgActivityMinutes: 0 },
    hydrationStatus: { avgDaily: 0, isAdequate: false },
    stressLevel: { avg: 5, trend: 'stable' },
    dataQuality: {
      moodLogs: 0,
      foodLogs: 0,
      sleepLogs: 0,
      activityLogs: 0,
      hasEnoughData: false,
    },
  };
}

// ============================================================================
// PATTERN ANALYSIS
// ============================================================================

/**
 * Analyze mood patterns from logs
 */
function analyzeMoodPatterns(moodLogs) {
  if (!moodLogs || moodLogs.length === 0) {
    return {
      dominantMood: 'neutral',
      avgValence: 0.5,
      avgEnergy: 0.5,
      volatility: 'stable',
      recentTrend: 'stable',
      bestTimeOfDay: null,
      worstTimeOfDay: null,
    };
  }

  // Count mood frequencies
  const moodCounts = {};
  let totalValence = 0;
  let totalEnergy = 0;
  const timeOfDayMoods = { morning: [], afternoon: [], evening: [], night: [] };

  moodLogs.forEach(log => {
    const mood = log.mood || 'neutral';
    moodCounts[mood] = (moodCounts[mood] || 0) + 1;

    const moodInfo = MOOD_CATEGORIES[mood] || MOOD_CATEGORIES.neutral;
    totalValence += moodInfo.valence;
    totalEnergy += moodInfo.energy;

    // Time of day analysis
    const hour = new Date(log.loggedAt).getHours();
    const intensity = log.intensity || 5;
    if (hour >= 6 && hour < 12) {
      timeOfDayMoods.morning.push(intensity);
    } else if (hour >= 12 && hour < 17) {
      timeOfDayMoods.afternoon.push(intensity);
    } else if (hour >= 17 && hour < 21) {
      timeOfDayMoods.evening.push(intensity);
    } else {
      timeOfDayMoods.night.push(intensity);
    }
  });

  // Find dominant mood
  const dominantMood = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  // Calculate averages
  const avgValence = totalValence / moodLogs.length;
  const avgEnergy = totalEnergy / moodLogs.length;

  // Calculate volatility (standard deviation of intensity)
  const intensities = moodLogs.map(l => l.intensity || 5);
  const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  const variance = intensities.reduce((sum, i) => sum + Math.pow(i - avgIntensity, 2), 0) / intensities.length;
  const stdDev = Math.sqrt(variance);
  const volatility = stdDev > 2.5 ? 'volatile' : stdDev > 1.5 ? 'moderate' : 'stable';

  // Recent trend (last 7 vs previous 7)
  const recent = moodLogs.slice(0, Math.min(7, moodLogs.length));
  const previous = moodLogs.slice(7, 14);
  const recentAvg = recent.reduce((sum, l) => sum + (l.intensity || 5), 0) / recent.length;
  const previousAvg = previous.length > 0
    ? previous.reduce((sum, l) => sum + (l.intensity || 5), 0) / previous.length
    : recentAvg;
  const recentTrend = recentAvg > previousAvg + 0.5 ? 'improving'
    : recentAvg < previousAvg - 0.5 ? 'declining' : 'stable';

  // Best/worst time of day
  const timeAvgs = Object.entries(timeOfDayMoods)
    .filter(([_, moods]) => moods.length > 0)
    .map(([time, moods]) => ({
      time,
      avg: moods.reduce((a, b) => a + b, 0) / moods.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  return {
    dominantMood,
    avgValence: Math.round(avgValence * 100) / 100,
    avgEnergy: Math.round(avgEnergy * 100) / 100,
    volatility,
    recentTrend,
    bestTimeOfDay: timeAvgs[0]?.time || null,
    worstTimeOfDay: timeAvgs[timeAvgs.length - 1]?.time || null,
  };
}

/**
 * Analyze food-mood correlations
 */
function analyzeFoodMoodCorrelations(moodLogs, foodLogs) {
  if (!moodLogs.length || !foodLogs.length) return [];

  const correlations = [];

  // High sugar → mood crashes
  const highSugarMeals = foodLogs.filter(f => (f.sugar || 0) > 25);
  if (highSugarMeals.length > 2) {
    correlations.push({
      factor: 'High Sugar Intake',
      impact: 'negative',
      strength: 0.7,
      description: 'High sugar meals may lead to energy crashes and mood dips',
      recommendation: 'Try balancing sugary foods with protein or fiber',
    });
  }

  // High protein → stable mood
  const highProteinMeals = foodLogs.filter(f => (f.protein || 0) > 25);
  if (highProteinMeals.length > 3) {
    correlations.push({
      factor: 'Protein-Rich Diet',
      impact: 'positive',
      strength: 0.65,
      description: 'Adequate protein supports stable blood sugar and mood',
      recommendation: 'Continue including protein in each meal',
    });
  }

  // Low calorie → low energy
  const avgCalories = foodLogs.reduce((sum, f) => sum + (f.calories || 0), 0) / foodLogs.length;
  if (avgCalories < 1500 && foodLogs.length > 5) {
    correlations.push({
      factor: 'Low Calorie Intake',
      impact: 'negative',
      strength: 0.6,
      description: 'Insufficient calories can lead to fatigue and irritability',
      recommendation: 'Ensure adequate energy intake for your activity level',
    });
  }

  return correlations.sort((a, b) => b.strength - a.strength);
}

/**
 * Analyze sleep-mood relationship
 */
function analyzeSleepMoodLink(moodLogs, sleepLogs) {
  if (!sleepLogs.length) {
    return { correlation: null, avgSleepQuality: null, avgDuration: null };
  }

  const avgQuality = sleepLogs.reduce((sum, s) => sum + (s.quality || 5), 0) / sleepLogs.length;
  const avgDuration = sleepLogs.reduce((sum, s) => sum + (s.durationMinutes || 420), 0) / sleepLogs.length;

  let correlation = null;
  if (avgQuality >= 7) {
    correlation = 'positive';
  } else if (avgQuality <= 4) {
    correlation = 'negative';
  }

  return {
    correlation,
    avgSleepQuality: Math.round(avgQuality * 10) / 10,
    avgDuration: Math.round(avgDuration),
    isAdequate: avgDuration >= 420 && avgQuality >= 6,
  };
}

/**
 * Analyze activity-mood relationship
 */
function analyzeActivityMoodLink(moodLogs, activityLogs) {
  if (!activityLogs.length) {
    return { correlation: null, avgActivityMinutes: 0, hasConsistentActivity: false };
  }

  const totalMinutes = activityLogs.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
  const avgDaily = totalMinutes / 7;
  const hasConsistentActivity = activityLogs.length >= 3 && avgDaily >= 20;

  return {
    correlation: hasConsistentActivity ? 'positive' : null,
    avgActivityMinutes: Math.round(avgDaily),
    hasConsistentActivity,
    totalWeeklyMinutes: totalMinutes,
  };
}

/**
 * Analyze hydration status
 */
function analyzeHydration(waterLogs) {
  if (!waterLogs.length) {
    return { avgDaily: 0, isAdequate: false, trend: 'unknown' };
  }

  const totalMl = waterLogs.reduce((sum, w) => {
    const liters = parseFloat(w.amountLiters) || 0;
    return sum + liters * 1000;
  }, 0);

  const avgDaily = totalMl / 7;
  const isAdequate = avgDaily >= 2000;

  return {
    avgDaily: Math.round(avgDaily),
    isAdequate,
    trend: isAdequate ? 'good' : 'needs_improvement',
  };
}

/**
 * Analyze stress level
 */
function analyzeStressLevel(stressLogs) {
  if (!stressLogs.length) {
    return { avg: 5, trend: 'unknown', isHigh: false };
  }

  const avgLevel = stressLogs.reduce((sum, s) => sum + (s.level || 5), 0) / stressLogs.length;

  return {
    avg: Math.round(avgLevel * 10) / 10,
    trend: avgLevel > 6 ? 'elevated' : avgLevel < 4 ? 'low' : 'moderate',
    isHigh: avgLevel > 6,
  };
}

// ============================================================================
// RECOMMENDATION GENERATION
// ============================================================================

/**
 * Generate personalized mood recommendations
 */
function generateMoodRecommendations(profile) {
  const recommendations = [];
  const now = new Date();
  const hour = now.getHours();
  const timeWindow = getTimeWindow(hour);

  // 1. Based on current time of day
  recommendations.push(...getTimeBasedRecommendations(timeWindow, profile));

  // 2. Based on mood patterns
  recommendations.push(...getMoodPatternRecommendations(profile.moodPatterns));

  // 3. Based on food-mood correlations
  recommendations.push(...getFoodMoodRecommendations(profile.foodMoodCorrelations));

  // 4. Based on sleep quality
  recommendations.push(...getSleepRecommendations(profile.sleepMoodLink));

  // 5. Based on hydration
  recommendations.push(...getHydrationRecommendations(profile.hydrationStatus));

  // 6. Based on activity level
  recommendations.push(...getActivityRecommendations(profile.activityMoodLink, timeWindow));

  // 7. Based on stress level
  recommendations.push(...getStressRecommendations(profile.stressLevel));

  // Score and sort recommendations
  const scoredRecs = recommendations.map(rec => ({
    ...rec,
    score: calculateRecommendationScore(rec, profile, timeWindow),
  }));

  // Return top 5 most relevant
  return scoredRecs
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((rec, index) => ({
      ...rec,
      rank: index + 1,
      isPrimary: index === 0,
    }));
}

/**
 * Get current time window
 */
function getTimeWindow(hour) {
  if (hour >= 5 && hour < 8) return TIME_WINDOWS.earlyMorning;
  if (hour >= 8 && hour < 12) return TIME_WINDOWS.morning;
  if (hour >= 12 && hour < 17) return TIME_WINDOWS.afternoon;
  if (hour >= 17 && hour < 21) return TIME_WINDOWS.evening;
  if (hour >= 21 && hour < 24) return TIME_WINDOWS.night;
  return TIME_WINDOWS.lateNight;
}

/**
 * Time-based recommendations
 */
function getTimeBasedRecommendations(timeWindow, profile) {
  const recs = [];

  switch (timeWindow.label) {
    case 'Early Morning':
      recs.push({
        type: RECOMMENDATION_TYPES.LIGHT_EXPOSURE,
        title: 'Morning Light Exposure',
        description: 'Get 10-15 minutes of natural light to boost serotonin and set your circadian rhythm',
        icon: 'sunny',
        action: null,
        reasons: [
          { type: 'timing', text: 'Morning light optimizes your mood hormones' },
          { type: 'science', text: 'Sunlight triggers serotonin production in the brain' },
        ],
      });
      break;
    case 'Afternoon':
      if (profile.moodPatterns?.avgEnergy < 0.5) {
        recs.push({
          type: RECOMMENDATION_TYPES.ACTIVITY,
          title: 'Afternoon Energy Boost',
          description: 'Take a 10-minute walk to combat the afternoon slump',
          icon: 'walk',
          action: 'Log activity',
          reasons: [
            { type: 'timing', text: 'Afternoon dips in energy are natural but manageable' },
            { type: 'pattern', text: 'Your energy levels tend to drop in the afternoon' },
          ],
        });
      }
      break;
    case 'Evening':
      recs.push({
        type: RECOMMENDATION_TYPES.MINDFULNESS,
        title: 'Evening Wind-Down',
        description: 'Start dimming lights and screens to prepare for restful sleep',
        icon: 'moon',
        action: null,
        reasons: [
          { type: 'timing', text: 'Evening light reduction supports melatonin production' },
          { type: 'science', text: 'Blue light from screens can delay sleep onset' },
        ],
      });
      break;
  }

  return recs;
}

/**
 * Mood pattern recommendations
 */
function getMoodPatternRecommendations(patterns) {
  const recs = [];

  // PRODUCTION FIX: Handle null/undefined patterns
  if (!patterns) return recs;

  if (patterns.recentTrend === 'declining') {
    recs.push({
      type: RECOMMENDATION_TYPES.MINDFULNESS,
      title: 'Mood Check-In',
      description: 'Your mood has been trending down. Try journaling or talking to someone you trust.',
      icon: 'journal',
      action: 'Log mood',
      reasons: [
        { type: 'pattern', text: 'Your mood scores have decreased over the past week' },
        { type: 'support', text: 'Acknowledging feelings is the first step to improvement' },
      ],
    });
  }

  if (patterns.volatility === 'volatile') {
    recs.push({
      type: RECOMMENDATION_TYPES.NUTRITION,
      title: 'Stabilize with Steady Eating',
      description: 'Eat regular meals with protein and complex carbs to stabilize mood swings',
      icon: 'nutrition',
      action: 'Log meal',
      reasons: [
        { type: 'pattern', text: 'Your mood has been fluctuating significantly' },
        { type: 'science', text: 'Blood sugar swings can amplify mood volatility' },
      ],
    });
  }

  if (patterns.avgValence < 0.4) {
    recs.push({
      type: RECOMMENDATION_TYPES.SOCIAL,
      title: 'Connect with Others',
      description: 'Reach out to a friend or family member. Social connection boosts mood.',
      icon: 'people',
      action: null,
      reasons: [
        { type: 'pattern', text: 'Your overall mood valence has been low' },
        { type: 'science', text: 'Social interaction releases oxytocin and reduces cortisol' },
      ],
    });
  }

  return recs;
}

/**
 * Food-mood recommendations
 */
function getFoodMoodRecommendations(correlations) {
  const recs = [];

  const negativeCorrelation = correlations.find(c => c.impact === 'negative');
  if (negativeCorrelation) {
    recs.push({
      type: RECOMMENDATION_TYPES.NUTRITION,
      title: 'Optimize Your Diet',
      description: negativeCorrelation.recommendation,
      icon: 'restaurant',
      action: 'Log meal',
      reasons: [
        { type: 'correlation', text: negativeCorrelation.description },
        { type: 'data', text: `Correlation strength: ${Math.round(negativeCorrelation.strength * 100)}%` },
      ],
    });
  }

  return recs;
}

/**
 * Sleep recommendations
 */
function getSleepRecommendations(sleepLink) {
  const recs = [];

  if (sleepLink.avgSleepQuality && sleepLink.avgSleepQuality < 6) {
    recs.push({
      type: RECOMMENDATION_TYPES.SLEEP,
      title: 'Improve Sleep Quality',
      description: 'Poor sleep affects mood. Try a consistent bedtime and cool, dark room.',
      icon: 'bed',
      action: 'Log sleep',
      reasons: [
        { type: 'data', text: `Your average sleep quality is ${sleepLink.avgSleepQuality}/10` },
        { type: 'science', text: 'Sleep quality directly impacts next-day mood and cognition' },
      ],
    });
  }

  if (sleepLink.avgDuration && sleepLink.avgDuration < 420) {
    recs.push({
      type: RECOMMENDATION_TYPES.SLEEP,
      title: 'Get More Sleep',
      description: `You're averaging ${Math.round(sleepLink.avgDuration / 60)} hours. Aim for 7-9 hours.`,
      icon: 'moon',
      action: null,
      reasons: [
        { type: 'data', text: 'Sleep duration is below recommended levels' },
        { type: 'science', text: 'Chronic sleep deprivation increases irritability and anxiety' },
      ],
    });
  }

  return recs;
}

/**
 * Hydration recommendations
 */
function getHydrationRecommendations(hydration) {
  const recs = [];

  if (!hydration.isAdequate) {
    recs.push({
      type: RECOMMENDATION_TYPES.HYDRATION,
      title: 'Boost Hydration',
      description: 'Dehydration can cause fatigue and poor concentration. Drink a glass of water now.',
      icon: 'water',
      action: 'Log water',
      reasons: [
        { type: 'data', text: `You're averaging ${Math.round(hydration.avgDaily)}ml/day` },
        { type: 'science', text: 'Even mild dehydration impairs mood and cognitive function' },
      ],
    });
  }

  return recs;
}

/**
 * Activity recommendations
 */
function getActivityRecommendations(activityLink, timeWindow) {
  const recs = [];

  if (!activityLink.hasConsistentActivity && timeWindow.energy !== 'low') {
    recs.push({
      type: RECOMMENDATION_TYPES.ACTIVITY,
      title: 'Move Your Body',
      description: 'Just 20 minutes of movement can boost endorphins and improve mood.',
      icon: 'fitness',
      action: 'Log activity',
      reasons: [
        { type: 'pattern', text: 'Your activity levels have been low this week' },
        { type: 'science', text: 'Exercise releases endorphins - natural mood elevators' },
      ],
    });
  }

  return recs;
}

/**
 * Stress recommendations
 */
function getStressRecommendations(stressLevel) {
  const recs = [];

  if (stressLevel.isHigh) {
    recs.push({
      type: RECOMMENDATION_TYPES.MINDFULNESS,
      title: 'Stress Relief',
      description: 'Try 5 minutes of deep breathing or progressive muscle relaxation.',
      icon: 'leaf',
      action: 'Log mood',
      reasons: [
        { type: 'data', text: `Your stress level has been elevated (${stressLevel.avg}/10)` },
        { type: 'science', text: 'Breathing exercises activate the parasympathetic nervous system' },
      ],
    });
  }

  return recs;
}

/**
 * Score recommendation relevance
 */
function calculateRecommendationScore(rec, profile, timeWindow) {
  let score = 50; // Base score

  // Boost for matching current needs
  if (rec.type === RECOMMENDATION_TYPES.HYDRATION && !profile.hydrationStatus.isAdequate) {
    score += 20;
  }
  if (rec.type === RECOMMENDATION_TYPES.SLEEP && profile.sleepMoodLink.avgSleepQuality < 6) {
    score += 25;
  }
  if (rec.type === RECOMMENDATION_TYPES.ACTIVITY && !profile.activityMoodLink.hasConsistentActivity) {
    score += 15;
  }
  if (rec.type === RECOMMENDATION_TYPES.MINDFULNESS && profile.stressLevel.isHigh) {
    score += 25;
  }

  // Time relevance
  if (rec.type === RECOMMENDATION_TYPES.LIGHT_EXPOSURE && timeWindow.label === 'Early Morning') {
    score += 20;
  }
  if (rec.type === RECOMMENDATION_TYPES.SLEEP && timeWindow.label === 'Night') {
    score += 15;
  }

  // Mood trend boost
  if (profile.moodPatterns.recentTrend === 'declining') {
    score += 10;
  }

  return score;
}

// ============================================================================
// MOOD WELLNESS SCORE
// ============================================================================

/**
 * Calculate overall mood wellness score (0-100)
 */
function calculateMoodWellnessScore(profile) {
  const weights = {
    moodValence: 0.25,
    moodStability: 0.15,
    sleep: 0.20,
    hydration: 0.10,
    activity: 0.15,
    stress: 0.15,
  };

  let totalScore = 0;
  let totalWeight = 0;

  // Mood valence (0-100)
  if (profile.moodPatterns.avgValence !== undefined) {
    totalScore += (profile.moodPatterns.avgValence * 100) * weights.moodValence;
    totalWeight += weights.moodValence;
  }

  // Mood stability (volatility)
  const stabilityScore = profile.moodPatterns.volatility === 'stable' ? 90
    : profile.moodPatterns.volatility === 'moderate' ? 60 : 30;
  totalScore += stabilityScore * weights.moodStability;
  totalWeight += weights.moodStability;

  // Sleep quality
  if (profile.sleepMoodLink.avgSleepQuality) {
    totalScore += (profile.sleepMoodLink.avgSleepQuality * 10) * weights.sleep;
    totalWeight += weights.sleep;
  }

  // Hydration
  const hydrationScore = profile.hydrationStatus.isAdequate ? 85
    : Math.min(85, (profile.hydrationStatus.avgDaily / 2000) * 85);
  totalScore += hydrationScore * weights.hydration;
  totalWeight += weights.hydration;

  // Activity
  const activityScore = profile.activityMoodLink.hasConsistentActivity ? 80
    : Math.min(80, (profile.activityMoodLink.avgActivityMinutes / 30) * 80);
  totalScore += activityScore * weights.activity;
  totalWeight += weights.activity;

  // Stress (inverse - lower is better)
  const stressScore = Math.max(0, 100 - (profile.stressLevel.avg * 10));
  totalScore += stressScore * weights.stress;
  totalWeight += weights.stress;

  const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    tier: finalScore >= 80 ? 'Excellent' : finalScore >= 60 ? 'Good' : finalScore >= 40 ? 'Needs Attention' : 'Low',
    color: finalScore >= 80 ? '#10B981' : finalScore >= 60 ? '#3B82F6' : finalScore >= 40 ? '#F59E0B' : '#EF4444',
  };
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

/**
 * Get comprehensive mood intelligence for user
 */
export async function getMoodIntelligence(userId) {
  try {
    console.log('[MoodEngine] Generating intelligence for user:', userId);

    // Build user mood profile
    const profile = await buildMoodProfile(userId);

    console.log('[MoodEngine] Profile built:', {
      moodLogs: profile.dataQuality.moodLogs,
      hasEnoughData: profile.dataQuality.hasEnoughData,
      dominantMood: profile.moodPatterns.dominantMood,
    });

    // Calculate wellness score
    const wellnessScore = calculateMoodWellnessScore(profile);

    // Generate recommendations
    const recommendations = generateMoodRecommendations(profile);

    console.log('[MoodEngine] Generated', recommendations.length, 'recommendations');

    // Get current time context
    const now = new Date();
    const timeWindow = getTimeWindow(now.getHours());

    return {
      success: true,
      timestamp: new Date().toISOString(),
      wellnessScore,
      moodPatterns: profile.moodPatterns,
      recommendations,
      insights: {
        foodMoodCorrelations: profile.foodMoodCorrelations,
        sleepLink: profile.sleepMoodLink,
        activityLink: profile.activityMoodLink,
        hydrationStatus: profile.hydrationStatus,
        stressLevel: profile.stressLevel,
      },
      context: {
        timeOfDay: timeWindow.label,
        dataQuality: profile.dataQuality,
      },
    };
  } catch (error) {
    console.error('[MoodEngine] Error generating intelligence:', error.message);
    console.error('[MoodEngine] Stack trace:', error.stack);
    return {
      error: 'Failed to generate mood intelligence',
      details: error.message,
      success: false,
    };
  }
}

export default {
  getMoodIntelligence,
  buildMoodProfile,
  calculateMoodWellnessScore,
  generateMoodRecommendations,
  MOOD_CATEGORIES,
  MOOD_NUTRIENTS,
  RECOMMENDATION_TYPES,
};
