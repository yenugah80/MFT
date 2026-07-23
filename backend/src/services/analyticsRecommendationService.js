/**
 * Analytics Recommendation Service
 *
 * World-class recommendation engine inspired by Netflix/LinkedIn/Spotify.
 * Provides personalized, evidence-based recommendations across ALL domains
 * from Day 1 of user journey.
 *
 * Key Principles:
 * 1. NEVER show empty states - always have value to provide
 * 2. Progressive intelligence - recommendations grow richer with data
 * 3. Evidence-anchored - every recommendation tied to user's actual data
 * 4. Cross-domain insights - food affects mood affects energy affects activity
 * 5. Actionable - every recommendation has clear next steps
 */

import { db } from '../db/index.js';
import {
  foodLogTable,
  moodLogTable,
  waterLogTable,
  activityLogTable,
  userCorrelationsTable,
  profilesTable,
} from '../db/schema.js';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';

/**
 * ============================================
 * RECOMMENDATION STAGES
 * ============================================
 * Unlike hard day cutoffs, recommendations evolve with data
 */

const RECOMMENDATION_STAGES = {
  // Day 1: First data point - celebrate and guide
  FIRST_STEPS: {
    minDataPoints: 1,
    label: 'First Steps',
    capabilities: ['basic_tracking', 'goal_setting', 'education'],
  },
  // Day 2: Pattern seeds emerge
  PATTERN_SEEDS: {
    minDataPoints: 3,
    label: 'Pattern Seeds',
    capabilities: ['basic_tracking', 'goal_setting', 'education', 'early_patterns', 'simple_correlations'],
  },
  // Day 3-7: Early patterns detectable
  EARLY_PATTERNS: {
    minDataPoints: 5,
    label: 'Early Patterns',
    capabilities: ['basic_tracking', 'goal_setting', 'education', 'early_patterns', 'simple_correlations', 'trending_insights'],
  },
  // Day 7+: Full pattern analysis
  PATTERN_RECOGNITION: {
    minDataPoints: 10,
    label: 'Pattern Recognition',
    capabilities: ['all'],
  },
  // Day 14+: Predictive capabilities
  PREDICTIVE: {
    minDataPoints: 20,
    label: 'Predictive Intelligence',
    capabilities: ['all', 'predictions', 'forecasts'],
  },
  // Day 30+: Full personalization
  HYPER_PERSONAL: {
    minDataPoints: 50,
    label: 'Hyper-Personalized',
    capabilities: ['all', 'predictions', 'forecasts', 'advanced_correlations', 'lifestyle_optimization'],
  },
};

/**
 * Determine user's recommendation stage based on actual data
 */
function determineStage(dataStats) {
  const totalPoints = dataStats.totalDataPoints || 0;

  if (totalPoints >= 50) return RECOMMENDATION_STAGES.HYPER_PERSONAL;
  if (totalPoints >= 20) return RECOMMENDATION_STAGES.PREDICTIVE;
  if (totalPoints >= 10) return RECOMMENDATION_STAGES.PATTERN_RECOGNITION;
  if (totalPoints >= 5) return RECOMMENDATION_STAGES.EARLY_PATTERNS;
  if (totalPoints >= 3) return RECOMMENDATION_STAGES.PATTERN_SEEDS;
  return RECOMMENDATION_STAGES.FIRST_STEPS;
}

/**
 * ============================================
 * DATA COLLECTION
 * ============================================
 */

/**
 * Get comprehensive user data statistics
 * Uses separate queries to avoid Drizzle ORM subquery limitations
 */
async function getUserDataStats(userId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel for performance
  const [
    foodTotal,
    foodToday,
    foodThisWeek,
    foodThisMonth,
    foodAllLogs,
    moodTotal,
    moodToday,
    moodThisWeek,
    moodAll,
    moodWeek,
    waterTotal,
    waterToday,
    waterTodayAmount,
    waterAllLogs,
    activityTotal,
    activityThisWeek,
    activityWeekMinutes,
    profile,
  ] = await Promise.all([
    // Food queries
    db.select({ count: count() }).from(foodLogTable).where(eq(foodLogTable.userId, userId)),
    db.select({ count: count() }).from(foodLogTable).where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, today))),
    db.select({ count: count() }).from(foodLogTable).where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, weekAgo))),
    db.select({ count: count() }).from(foodLogTable).where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, monthAgo))),
    db.select({
      calories: foodLogTable.calories,
      protein: foodLogTable.protein,
      carbs: foodLogTable.carbs,
      fat: foodLogTable.fats,
      loggedDate: foodLogTable.loggedDate,
    }).from(foodLogTable).where(eq(foodLogTable.userId, userId)),

    // Mood queries
    db.select({ count: count() }).from(moodLogTable).where(eq(moodLogTable.userId, userId)),
    db.select({ count: count() }).from(moodLogTable).where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, today))),
    db.select({ count: count() }).from(moodLogTable).where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, weekAgo))),
    db.select({ intensity: moodLogTable.intensity }).from(moodLogTable).where(eq(moodLogTable.userId, userId)),
    db.select({ intensity: moodLogTable.intensity }).from(moodLogTable).where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, weekAgo))),

    // Water queries
    db.select({ count: count() }).from(waterLogTable).where(eq(waterLogTable.userId, userId)),
    db.select({ count: count() }).from(waterLogTable).where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, today))),
    db.select({ amount: waterLogTable.amountLiters }).from(waterLogTable).where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, today))),
    db.select({ amount: waterLogTable.amountLiters, loggedDate: waterLogTable.loggedDate }).from(waterLogTable).where(eq(waterLogTable.userId, userId)),

    // Activity queries
    db.select({ count: count() }).from(activityLogTable).where(eq(activityLogTable.userId, userId)),
    db.select({ count: count() }).from(activityLogTable).where(and(eq(activityLogTable.userId, userId), gte(activityLogTable.loggedAt, weekAgo))),
    db.select({ minutes: activityLogTable.durationMinutes }).from(activityLogTable).where(and(eq(activityLogTable.userId, userId), gte(activityLogTable.loggedAt, weekAgo))),

    // Profile for goals
    db.select().from(profilesTable).where(eq(profilesTable.userId, userId)).limit(1),
  ]);

  const userProfile = profile[0] || {};

  // Calculate food stats
  const todayFoodLogs = foodAllLogs.filter(f => new Date(f.loggedDate) >= today);
  const todayCalories = todayFoodLogs.reduce((sum, f) => sum + (parseFloat(f.calories) || 0), 0);
  const todayProtein = todayFoodLogs.reduce((sum, f) => sum + (parseFloat(f.protein) || 0), 0);
  const todayCarbs = todayFoodLogs.reduce((sum, f) => sum + (parseFloat(f.carbs) || 0), 0);
  const todayFat = todayFoodLogs.reduce((sum, f) => sum + (parseFloat(f.fat) || 0), 0);

  // Calculate daily averages for food
  const foodByDay = {};
  foodAllLogs.forEach(f => {
    const day = new Date(f.loggedDate).toISOString().split('T')[0];
    foodByDay[day] = (foodByDay[day] || 0) + (parseFloat(f.calories) || 0);
  });
  const dailyCalories = Object.values(foodByDay);
  const avgCaloriesPerDay = dailyCalories.length > 0 ? dailyCalories.reduce((a, b) => a + b, 0) / dailyCalories.length : 0;

  // Calculate mood averages
  const avgIntensity = moodAll.length > 0 ? moodAll.reduce((sum, m) => sum + (parseFloat(m.intensity) || 0), 0) / moodAll.length : 0;
  const avgIntensityThisWeek = moodWeek.length > 0 ? moodWeek.reduce((sum, m) => sum + (parseFloat(m.intensity) || 0), 0) / moodWeek.length : 0;

  // Calculate water stats
  const todayMl = waterTodayAmount.reduce((sum, w) => sum + ((parseFloat(w.amount) || 0) * 1000), 0);

  // Calculate daily water average
  const waterByDay = {};
  waterAllLogs.forEach(w => {
    const day = new Date(w.loggedDate).toISOString().split('T')[0];
    waterByDay[day] = (waterByDay[day] || 0) + ((parseFloat(w.amount) || 0) * 1000);
  });
  const dailyWater = Object.values(waterByDay);
  const avgDailyMl = dailyWater.length > 0 ? dailyWater.reduce((a, b) => a + b, 0) / dailyWater.length : 0;

  // Calculate activity stats
  const weeklyMinutes = activityWeekMinutes.reduce((sum, a) => sum + (parseFloat(a.minutes) || 0), 0);

  return {
    totalDataPoints:
      (foodTotal[0]?.count || 0) +
      (moodTotal[0]?.count || 0) +
      (waterTotal[0]?.count || 0) +
      (activityTotal[0]?.count || 0),
    food: {
      total: foodTotal[0]?.count || 0,
      today: foodToday[0]?.count || 0,
      thisWeek: foodThisWeek[0]?.count || 0,
      thisMonth: foodThisMonth[0]?.count || 0,
      todayCalories,
      todayProtein,
      todayCarbs,
      todayFat,
      avgCaloriesPerDay,
    },
    mood: {
      total: moodTotal[0]?.count || 0,
      today: moodToday[0]?.count || 0,
      thisWeek: moodThisWeek[0]?.count || 0,
      avgIntensity,
      avgIntensityThisWeek,
    },
    water: {
      total: waterTotal[0]?.count || 0,
      today: waterToday[0]?.count || 0,
      todayMl,
      avgDailyMl,
    },
    activity: {
      total: activityTotal[0]?.count || 0,
      thisWeek: activityThisWeek[0]?.count || 0,
      weeklyMinutes,
      avgWeeklyMinutes: weeklyMinutes, // Current week's minutes as average for now
    },
    goals: {
      calorieGoal: userProfile.calorieGoal || 2000,
      proteinGoal: userProfile.proteinGoal || 150,
      carbsGoal: userProfile.carbsGoal || 250,
      fatGoal: userProfile.fatGoal || 65,
      waterGoalMl: (userProfile.waterGoal || 2) * 1000,
      activityGoalMinutes: 150, // CDC recommendation
    },
  };
}

/**
 * Get recent logs for trend analysis
 */
async function getRecentLogs(userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [foodLogs, moodLogs, waterLogs, activityLogs] = await Promise.all([
    db.select()
      .from(foodLogTable)
      .where(and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedDate, startDate)
      ))
      .orderBy(desc(foodLogTable.loggedDate)),

    db.select()
      .from(moodLogTable)
      .where(and(
        eq(moodLogTable.userId, userId),
        gte(moodLogTable.loggedDate, startDate)
      ))
      .orderBy(desc(moodLogTable.loggedDate)),

    db.select()
      .from(waterLogTable)
      .where(and(
        eq(waterLogTable.userId, userId),
        gte(waterLogTable.loggedDate, startDate)
      ))
      .orderBy(desc(waterLogTable.loggedDate)),

    db.select()
      .from(activityLogTable)
      .where(and(
        eq(activityLogTable.userId, userId),
        gte(activityLogTable.loggedAt, startDate)
      ))
      .orderBy(desc(activityLogTable.loggedAt)),
  ]);

  return { foodLogs, moodLogs, waterLogs, activityLogs };
}

/**
 * Get user's correlations if available
 */
async function getUserCorrelationsData(userId) {
  const correlations = await db.select()
    .from(userCorrelationsTable)
    .where(and(
      eq(userCorrelationsTable.userId, userId),
      eq(userCorrelationsTable.isActive, true)
    ))
    .orderBy(desc(userCorrelationsTable.confidence));

  return correlations;
}

/**
 * ============================================
 * RECOMMENDATION GENERATORS
 * ============================================
 */

/**
 * Generate nutrition recommendations
 */
function generateNutritionRecommendations(stats, recentLogs, correlations, stage) {
  const recommendations = [];
  const { food, goals } = stats;
  const { foodLogs } = recentLogs;

  // Always provide value - even with 0 data
  if (food.total === 0) {
    recommendations.push({
      id: 'nutrition_first_meal',
      type: 'action',
      priority: 1,
      domain: 'nutrition',
      title: 'Log Your First Meal',
      message: 'Start your nutrition journey by logging what you eat. We\'ll learn your patterns and provide personalized insights.',
      icon: 'restaurant',
      color: '#10B981',
      action: { type: 'navigate', target: 'log' },
      evidence: null,
    });
    return recommendations;
  }

  // Day 1+: Basic tracking insights
  const caloriePercent = goals.calorieGoal > 0
    ? Math.round((food.todayCalories / goals.calorieGoal) * 100)
    : 0;
  const proteinPercent = goals.proteinGoal > 0
    ? Math.round((food.todayProtein / goals.proteinGoal) * 100)
    : 0;

  // Calorie progress recommendation
  if (food.today > 0) {
    const calorieStatus = caloriePercent >= 90 && caloriePercent <= 110
      ? 'on_track'
      : caloriePercent < 90
        ? 'under'
        : 'over';

    recommendations.push({
      id: 'nutrition_calorie_progress',
      type: 'insight',
      priority: 2,
      domain: 'nutrition',
      title: calorieStatus === 'on_track'
        ? 'Right on Target!'
        : calorieStatus === 'under'
          ? 'Room for More Fuel'
          : 'Calorie Check',
      message: calorieStatus === 'on_track'
        ? `You're at ${caloriePercent}% of your ${goals.calorieGoal.toLocaleString()} calorie goal. Great balance!`
        : calorieStatus === 'under'
          ? `${goals.calorieGoal - food.todayCalories} calories remaining today. Consider a balanced snack.`
          : `You've reached ${caloriePercent}% of your calorie goal. Be mindful with remaining meals.`,
      icon: 'flame',
      color: calorieStatus === 'on_track' ? '#10B981' : calorieStatus === 'under' ? '#3B82F6' : '#F59E0B',
      metric: {
        current: food.todayCalories,
        goal: goals.calorieGoal,
        percentage: caloriePercent,
        unit: 'cal',
      },
      evidence: {
        mealsToday: food.today,
        type: 'today_progress',
      },
    });
  }

  // Protein recommendation
  if (food.today > 0 && proteinPercent < 70) {
    recommendations.push({
      id: 'nutrition_protein_boost',
      type: 'suggestion',
      priority: 3,
      domain: 'nutrition',
      title: 'Protein Opportunity',
      message: `At ${Math.round(food.todayProtein)}g protein (${proteinPercent}% of goal), consider adding chicken, fish, eggs, or legumes to your next meal.`,
      icon: 'fitness',
      color: '#8B5CF6',
      metric: {
        current: Math.round(food.todayProtein),
        goal: goals.proteinGoal,
        percentage: proteinPercent,
        unit: 'g',
      },
      evidence: {
        deficit: Math.round(goals.proteinGoal - food.todayProtein),
        type: 'macro_deficit',
      },
    });
  }

  // Day 2+: Trend insights
  if (food.total >= 3 && foodLogs.length >= 3) {
    // Calculate daily calorie trend
    const dailyCalories = {};
    foodLogs.forEach(log => {
      const day = new Date(log.loggedDate).toISOString().split('T')[0];
      dailyCalories[day] = (dailyCalories[day] || 0) + (log.calories || 0);
    });

    const days = Object.keys(dailyCalories).sort();
    if (days.length >= 2) {
      const avgCal = Object.values(dailyCalories).reduce((a, b) => a + b, 0) / days.length;
      const trend = Object.values(dailyCalories)[days.length - 1] > avgCal ? 'up' : 'down';

      recommendations.push({
        id: 'nutrition_calorie_trend',
        type: 'insight',
        priority: 4,
        domain: 'nutrition',
        title: 'Calorie Trend',
        message: `Your average daily intake is ${Math.round(avgCal)} calories. ${trend === 'up' ? 'Today is slightly higher than usual.' : 'You\'re eating lighter than average today.'}`,
        icon: trend === 'up' ? 'trending-up' : 'trending-down',
        color: '#6366F1',
        metric: {
          average: Math.round(avgCal),
          trend,
          daysAnalyzed: days.length,
        },
        evidence: {
          dailyBreakdown: dailyCalories,
          type: 'trend_analysis',
        },
      });
    }
  }

  // Day 3+: Pattern-based recommendations from correlations
  const nutritionCorrelations = correlations.filter(c =>
    c.ruleName?.includes('food') ||
    c.ruleName?.includes('breakfast') ||
    c.ruleName?.includes('sugar') ||
    c.ruleName?.includes('protein')
  );

  nutritionCorrelations.slice(0, 2).forEach((corr, idx) => {
    const evidence = corr.evidenceJson || {};
    recommendations.push({
      id: `nutrition_pattern_${corr.id || idx}`,
      type: 'pattern',
      priority: 5 + idx,
      domain: 'nutrition',
      title: 'Discovered Pattern',
      message: corr.description || `Your ${corr.ruleName?.replace(/_/g, ' ')} affects your ${corr.outcomeMetric || 'mood'}.`,
      icon: 'bulb',
      color: corr.impact === 'positive' ? '#10B981' : '#F59E0B',
      metric: {
        confidence: Math.round((corr.confidence || 0) * 100),
        occurrences: corr.occurrences || 0,
        strength: corr.strength || 'moderate',
      },
      evidence: {
        examples: evidence.examples?.slice(0, 2) || [],
        avgWith: evidence.avgValueWith,
        avgWithout: evidence.avgValueWithout,
        type: 'correlation',
      },
      correlation: corr,
    });
  });

  // Week+ recommendations with rich analysis
  if (food.thisWeek >= 7) {
    // Best eating time analysis
    const mealTimes = foodLogs.map(log => ({
      hour: new Date(log.loggedDate).getHours(),
      calories: log.calories || 0,
    }));

    const breakfastMeals = mealTimes.filter(m => m.hour >= 6 && m.hour < 10);
    if (breakfastMeals.length > 0) {
      const avgBreakfastCal = breakfastMeals.reduce((a, b) => a + b.calories, 0) / breakfastMeals.length;
      recommendations.push({
        id: 'nutrition_breakfast_insight',
        type: 'insight',
        priority: 6,
        domain: 'nutrition',
        title: 'Breakfast Pattern',
        message: `You typically have ${Math.round(avgBreakfastCal)} calories for breakfast. ${avgBreakfastCal > 300 ? 'This substantial start fuels your morning.' : 'A heartier breakfast might boost your morning energy.'}`,
        icon: 'sunny',
        color: '#F59E0B',
        metric: {
          avgBreakfastCalories: Math.round(avgBreakfastCal),
          breakfastDays: breakfastMeals.length,
        },
        evidence: {
          type: 'meal_timing',
        },
      });
    }
  }

  return recommendations;
}

/**
 * Generate mood recommendations
 */
function generateMoodRecommendations(stats, recentLogs, correlations, stage) {
  const recommendations = [];
  const { mood, food, water, activity } = stats;
  const { moodLogs, foodLogs } = recentLogs;

  // No mood data yet
  if (mood.total === 0) {
    recommendations.push({
      id: 'mood_first_log',
      type: 'action',
      priority: 1,
      domain: 'mood',
      title: 'Track Your Mood',
      message: 'Understanding your mood patterns helps us discover what makes you feel your best.',
      icon: 'happy',
      color: '#EC4899',
      action: { type: 'navigate', target: 'mood' },
      evidence: null,
    });
    return recommendations;
  }

  // Day 1+: Current mood state
  if (mood.today > 0 && moodLogs.length > 0) {
    const latestMood = moodLogs[0];
    const moodScore = latestMood.intensity || 5;
    const moodType = latestMood.mood || 'neutral';

    recommendations.push({
      id: 'mood_current_state',
      type: 'insight',
      priority: 2,
      domain: 'mood',
      title: moodScore >= 7 ? 'Feeling Great!' : moodScore >= 5 ? 'Steady Mood' : 'Room to Lift',
      message: moodScore >= 7
        ? `You're feeling ${moodType} with energy at ${moodScore}/10. What's working well today?`
        : moodScore >= 5
          ? `Your mood is ${moodType} at ${moodScore}/10. Stable is good!`
          : `Your mood is at ${moodScore}/10. Small changes can help - try a walk, water, or healthy snack.`,
      icon: moodScore >= 7 ? 'happy' : moodScore >= 5 ? 'happy-outline' : 'leaf',
      color: moodScore >= 7 ? '#10B981' : moodScore >= 5 ? '#6366F1' : '#F59E0B',
      metric: {
        current: moodScore,
        type: moodType,
        scale: 10,
      },
      evidence: {
        loggedAt: latestMood.loggedDate,
        type: 'current_mood',
      },
    });
  }

  // Day 2+: Mood trend
  if (mood.total >= 2 && moodLogs.length >= 2) {
    const recentScores = moodLogs.slice(0, 5).map(m => m.intensity || 5);
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const trend = recentScores[0] > avgRecent ? 'improving' : recentScores[0] < avgRecent ? 'declining' : 'stable';

    recommendations.push({
      id: 'mood_trend',
      type: 'insight',
      priority: 3,
      domain: 'mood',
      title: trend === 'improving' ? 'Mood Rising!' : trend === 'stable' ? 'Consistent Mood' : 'Mood Dip',
      message: trend === 'improving'
        ? `Your mood has been improving! Average of ${avgRecent.toFixed(1)}/10 over ${recentScores.length} entries.`
        : trend === 'stable'
          ? `Your mood is steady around ${avgRecent.toFixed(1)}/10. Consistency is good for wellbeing.`
          : `Your mood has dipped below your ${avgRecent.toFixed(1)}/10 average. Let's find what helps.`,
      icon: trend === 'improving' ? 'trending-up' : trend === 'stable' ? 'remove' : 'trending-down',
      color: trend === 'improving' ? '#10B981' : trend === 'stable' ? '#6366F1' : '#F59E0B',
      metric: {
        average: parseFloat(avgRecent.toFixed(1)),
        trend,
        entries: recentScores.length,
      },
      evidence: {
        scores: recentScores,
        type: 'mood_trend',
      },
    });
  }

  // Cross-domain insight: Food + Mood
  if (food.today > 0 && mood.today > 0 && foodLogs.length > 0 && moodLogs.length > 0) {
    const lastMood = moodLogs[0];
    const moodTime = new Date(lastMood.loggedDate);

    // Find food logged near mood log
    const nearbyFood = foodLogs.filter(f => {
      const foodTime = new Date(f.loggedDate);
      const hoursDiff = Math.abs(moodTime - foodTime) / (1000 * 60 * 60);
      return hoursDiff <= 4;
    });

    if (nearbyFood.length > 0) {
      const foodNames = nearbyFood.map(f => f.foodName || f.name).filter(Boolean).slice(0, 2).join(', ');
      recommendations.push({
        id: 'mood_food_connection',
        type: 'insight',
        priority: 4,
        domain: 'mood',
        title: 'Food-Mood Connection',
        message: `You logged ${foodNames || 'a meal'} around the time of your mood entry. We're learning how your food choices affect how you feel.`,
        icon: 'nutrition',
        color: '#8B5CF6',
        evidence: {
          nearbyFoods: nearbyFood.slice(0, 3).map(f => ({ name: f.foodName || f.name, calories: f.calories })),
          moodScore: lastMood.intensity,
          type: 'food_mood_timing',
        },
      });
    }
  }

  // Correlations-based mood insights
  const moodCorrelations = correlations.filter(c =>
    c.outcomeMetric?.includes('mood') ||
    c.ruleName?.includes('mood') ||
    c.signalBType === 'mood_score'
  );

  moodCorrelations.slice(0, 2).forEach((corr, idx) => {
    const evidence = corr.evidenceJson || {};
    const impact = (evidence.avgValueWith || 0) > (evidence.avgValueWithout || 0) ? 'positive' : 'negative';

    recommendations.push({
      id: `mood_pattern_${corr.id || idx}`,
      type: 'pattern',
      priority: 5 + idx,
      domain: 'mood',
      title: impact === 'positive' ? 'Mood Booster Found' : 'Mood Factor Identified',
      message: corr.description || `We found a connection between ${corr.signalAType?.replace(/_/g, ' ') || 'your behavior'} and your mood.`,
      icon: impact === 'positive' ? 'sunny' : 'cloudy',
      color: impact === 'positive' ? '#10B981' : '#F59E0B',
      metric: {
        confidence: Math.round((corr.confidence || 0) * 100),
        moodWith: evidence.avgValueWith ? evidence.avgValueWith.toFixed(1) : null,
        moodWithout: evidence.avgValueWithout ? evidence.avgValueWithout.toFixed(1) : null,
      },
      evidence: {
        examples: evidence.examples?.slice(0, 2) || [],
        delta: evidence.delta,
        type: 'correlation',
      },
      correlation: corr,
    });
  });

  // Best mood day analysis (week+)
  if (moodLogs.length >= 5) {
    const moodByDay = {};
    moodLogs.forEach(m => {
      const dayName = new Date(m.loggedDate).toLocaleDateString('en-US', { weekday: 'long' });
      if (!moodByDay[dayName]) moodByDay[dayName] = [];
      moodByDay[dayName].push(m.intensity || 5);
    });

    let bestDay = null;
    let bestAvg = 0;
    Object.entries(moodByDay).forEach(([day, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestDay = day;
      }
    });

    if (bestDay && bestAvg > mood.avgIntensity) {
      recommendations.push({
        id: 'mood_best_day',
        type: 'insight',
        priority: 7,
        domain: 'mood',
        title: `${bestDay}s Are Your Best`,
        message: `Your average mood on ${bestDay}s is ${bestAvg.toFixed(1)}/10, higher than your overall ${mood.avgIntensity.toFixed(1)}. What makes ${bestDay}s special?`,
        icon: 'star',
        color: '#FBBF24',
        metric: {
          bestDay,
          bestDayAvg: parseFloat(bestAvg.toFixed(1)),
          overallAvg: parseFloat(mood.avgIntensity.toFixed(1)),
        },
        evidence: {
          dayBreakdown: Object.fromEntries(
            Object.entries(moodByDay).map(([d, s]) => [d, parseFloat((s.reduce((a, b) => a + b, 0) / s.length).toFixed(1))])
          ),
          type: 'day_analysis',
        },
      });
    }
  }

  return recommendations;
}

/**
 * Generate hydration recommendations
 */
function generateHydrationRecommendations(stats, recentLogs, correlations, stage) {
  const recommendations = [];
  const { water, goals, mood } = stats;
  const { waterLogs, moodLogs } = recentLogs;

  // No water data yet
  if (water.total === 0) {
    recommendations.push({
      id: 'hydration_first_log',
      type: 'action',
      priority: 1,
      domain: 'hydration',
      title: 'Track Your Water',
      message: 'Hydration impacts energy, mood, and focus. Start tracking to see how water affects your day.',
      icon: 'water',
      color: '#0EA5E9',
      action: { type: 'navigate', target: 'water' },
      evidence: null,
    });
    return recommendations;
  }

  // Day 1+: Today's progress
  const waterPercent = goals.waterGoalMl > 0
    ? Math.round((water.todayMl / goals.waterGoalMl) * 100)
    : 0;

  if (water.today > 0) {
    const glasses = Math.round(water.todayMl / 250);
    const goalGlasses = Math.round(goals.waterGoalMl / 250);

    recommendations.push({
      id: 'hydration_progress',
      type: 'insight',
      priority: 2,
      domain: 'hydration',
      title: waterPercent >= 100 ? 'Goal Reached!' : waterPercent >= 70 ? 'Almost There' : 'Keep Sipping',
      message: waterPercent >= 100
        ? `You've hit ${waterPercent}% of your hydration goal! Your body thanks you.`
        : `${glasses} of ${goalGlasses} glasses (${waterPercent}%). ${goalGlasses - glasses} more to go!`,
      icon: waterPercent >= 100 ? 'checkmark-circle' : 'water',
      color: waterPercent >= 100 ? '#10B981' : waterPercent >= 70 ? '#0EA5E9' : '#F59E0B',
      metric: {
        current: water.todayMl,
        goal: goals.waterGoalMl,
        percentage: waterPercent,
        glasses,
        goalGlasses,
      },
      evidence: {
        type: 'today_progress',
      },
    });
  }

  // Time-based hydration reminder
  const hour = new Date().getHours();
  if (waterPercent < 100) {
    const remainingMl = goals.waterGoalMl - water.todayMl;
    const hoursLeft = Math.max(1, 21 - hour); // Until 9pm
    const mlPerHour = Math.round(remainingMl / hoursLeft);

    recommendations.push({
      id: 'hydration_pace',
      type: 'suggestion',
      priority: 3,
      domain: 'hydration',
      title: 'Hydration Pace',
      message: `To hit your goal, drink about ${Math.round(mlPerHour / 250)} glass${mlPerHour > 250 ? 'es' : ''} (${mlPerHour}ml) per hour for the rest of the day.`,
      icon: 'time',
      color: '#6366F1',
      metric: {
        remainingMl,
        hoursLeft,
        mlPerHour,
      },
      evidence: {
        type: 'pace_calculation',
      },
    });
  }

  // Day 2+: Trend analysis
  if (water.total >= 3) {
    const avgDaily = water.avgDailyMl || 0;
    const trend = water.todayMl > avgDaily ? 'above' : water.todayMl < avgDaily ? 'below' : 'on';

    recommendations.push({
      id: 'hydration_trend',
      type: 'insight',
      priority: 4,
      domain: 'hydration',
      title: trend === 'above' ? 'Extra Hydrated!' : trend === 'on' ? 'Consistent Hydration' : 'Below Average',
      message: `Your daily average is ${(avgDaily / 1000).toFixed(1)}L. Today you're ${trend === 'above' ? 'doing better' : trend === 'on' ? 'right on track' : 'a bit behind'}.`,
      icon: trend === 'above' ? 'trending-up' : trend === 'on' ? 'remove' : 'trending-down',
      color: trend === 'above' ? '#10B981' : trend === 'on' ? '#6366F1' : '#F59E0B',
      metric: {
        avgDaily: Math.round(avgDaily),
        todayMl: water.todayMl,
        trend,
      },
      evidence: {
        type: 'trend_analysis',
      },
    });
  }

  // Cross-domain: Hydration-Mood connection
  if (water.total >= 2 && mood.total >= 2 && waterLogs.length >= 2 && moodLogs.length >= 2) {
    // Simple correlation check: days with more water vs mood
    const waterByDay = {};
    waterLogs.forEach(w => {
      const day = new Date(w.loggedDate).toISOString().split('T')[0];
      waterByDay[day] = (waterByDay[day] || 0) + ((parseFloat(w.amountLiters) || 0) * 1000);
    });

    const moodByDay = {};
    moodLogs.forEach(m => {
      const day = new Date(m.loggedDate).toISOString().split('T')[0];
      if (!moodByDay[day]) moodByDay[day] = [];
      moodByDay[day].push(m.intensity || 5);
    });

    // Calculate average mood for high vs low water days
    const waterDays = Object.keys(waterByDay);
    if (waterDays.length >= 2) {
      const avgWater = Object.values(waterByDay).reduce((a, b) => a + b, 0) / waterDays.length;
      const highWaterDays = waterDays.filter(d => waterByDay[d] > avgWater);
      const lowWaterDays = waterDays.filter(d => waterByDay[d] <= avgWater);

      const avgMoodHighWater = highWaterDays
        .filter(d => moodByDay[d])
        .flatMap(d => moodByDay[d])
        .reduce((a, b, i, arr) => a + b / arr.length, 0) || 0;

      const avgMoodLowWater = lowWaterDays
        .filter(d => moodByDay[d])
        .flatMap(d => moodByDay[d])
        .reduce((a, b, i, arr) => a + b / arr.length, 0) || 0;

      if (avgMoodHighWater > 0 && avgMoodLowWater > 0 && Math.abs(avgMoodHighWater - avgMoodLowWater) >= 0.3) {
        recommendations.push({
          id: 'hydration_mood_link',
          type: 'pattern',
          priority: 5,
          domain: 'hydration',
          title: avgMoodHighWater > avgMoodLowWater ? 'Water Boosts Your Mood' : 'Hydration Insight',
          message: avgMoodHighWater > avgMoodLowWater
            ? `On well-hydrated days, your mood averages ${avgMoodHighWater.toFixed(1)}/10 vs ${avgMoodLowWater.toFixed(1)}/10 on lower water days.`
            : `We're tracking how your hydration connects to mood. Keep logging for more insights!`,
          icon: 'happy',
          color: '#10B981',
          metric: {
            moodWithHighWater: parseFloat(avgMoodHighWater.toFixed(1)),
            moodWithLowWater: parseFloat(avgMoodLowWater.toFixed(1)),
            delta: parseFloat((avgMoodHighWater - avgMoodLowWater).toFixed(1)),
          },
          evidence: {
            highWaterDays: highWaterDays.length,
            lowWaterDays: lowWaterDays.length,
            type: 'cross_domain',
          },
        });
      }
    }
  }

  // Hydration correlations from stored data
  const hydrationCorrelations = correlations.filter(c =>
    c.ruleName?.includes('hydration') ||
    c.ruleName?.includes('water') ||
    c.signalAType?.includes('water')
  );

  hydrationCorrelations.slice(0, 1).forEach((corr, idx) => {
    const evidence = corr.evidenceJson || {};
    recommendations.push({
      id: `hydration_pattern_${corr.id || idx}`,
      type: 'pattern',
      priority: 6,
      domain: 'hydration',
      title: 'Hydration Pattern',
      message: corr.description || `Your hydration habits are connected to your ${corr.outcomeMetric || 'wellbeing'}.`,
      icon: 'water',
      color: '#0EA5E9',
      metric: {
        confidence: Math.round((corr.confidence || 0) * 100),
        strength: corr.strength || 'moderate',
      },
      evidence: {
        examples: evidence.examples?.slice(0, 2) || [],
        type: 'correlation',
      },
      correlation: corr,
    });
  });

  return recommendations;
}

/**
 * Generate activity recommendations
 */
function generateActivityRecommendations(stats, recentLogs, correlations, stage) {
  const recommendations = [];
  const { activity, goals, mood } = stats;
  const { activityLogs, moodLogs } = recentLogs;

  // No activity data yet
  if (activity.total === 0) {
    recommendations.push({
      id: 'activity_first_log',
      type: 'action',
      priority: 1,
      domain: 'activity',
      title: 'Log Your Activity',
      message: 'Even a short walk counts! Track your movement to see how it affects your energy and mood.',
      icon: 'fitness',
      color: '#10B981',
      action: { type: 'navigate', target: 'activity' },
      evidence: null,
    });
    return recommendations;
  }

  // Day 1+: Weekly progress toward CDC goal
  const cdcPercent = Math.round((activity.weeklyMinutes / goals.activityGoalMinutes) * 100);

  recommendations.push({
    id: 'activity_cdc_progress',
    type: 'insight',
    priority: 2,
    domain: 'activity',
    title: cdcPercent >= 100 ? 'CDC Goal Achieved!' : cdcPercent >= 50 ? 'Halfway There' : 'Keep Moving',
    message: cdcPercent >= 100
      ? `You've exceeded the CDC's 150 min/week recommendation with ${activity.weeklyMinutes} minutes! Excellent work.`
      : `${activity.weeklyMinutes} of ${goals.activityGoalMinutes} minutes this week (${cdcPercent}%). ${goals.activityGoalMinutes - activity.weeklyMinutes} to go!`,
    icon: cdcPercent >= 100 ? 'trophy' : cdcPercent >= 50 ? 'fitness' : 'walk',
    color: cdcPercent >= 100 ? '#FBBF24' : cdcPercent >= 50 ? '#10B981' : '#F59E0B',
    metric: {
      current: activity.weeklyMinutes,
      goal: goals.activityGoalMinutes,
      percentage: cdcPercent,
      unit: 'min',
    },
    evidence: {
      type: 'weekly_progress',
    },
  });

  // Activity suggestions based on time of day
  const hour = new Date().getHours();
  if (activity.thisWeek === 0) {
    const suggestion = hour < 12
      ? 'A morning walk can boost your energy for the whole day.'
      : hour < 17
        ? 'A midday stretch or walk can refresh your afternoon.'
        : 'An evening activity can help you wind down and sleep better.';

    recommendations.push({
      id: 'activity_time_suggestion',
      type: 'suggestion',
      priority: 3,
      domain: 'activity',
      title: 'Activity Idea',
      message: suggestion,
      icon: hour < 12 ? 'sunny' : hour < 17 ? 'partly-sunny' : 'moon',
      color: '#8B5CF6',
      evidence: {
        hour,
        type: 'time_based',
      },
    });
  }

  // Day 2+: Activity pattern analysis
  if (activityLogs.length >= 2) {
    // Find most common activity time
    const activityHours = activityLogs.map(a => new Date(a.loggedAt).getHours());
    const hourCounts = {};
    activityHours.forEach(h => {
      const period = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
      hourCounts[period] = (hourCounts[period] || 0) + 1;
    });

    const favoritePeriod = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0];

    if (favoritePeriod) {
      recommendations.push({
        id: 'activity_preferred_time',
        type: 'insight',
        priority: 4,
        domain: 'activity',
        title: `${favoritePeriod[0].charAt(0).toUpperCase() + favoritePeriod[0].slice(1)} Mover`,
        message: `You tend to be most active in the ${favoritePeriod[0]} (${favoritePeriod[1]} activities). This is your sweet spot!`,
        icon: favoritePeriod[0] === 'morning' ? 'sunny' : favoritePeriod[0] === 'afternoon' ? 'partly-sunny' : 'moon',
        color: '#10B981',
        metric: {
          preferredPeriod: favoritePeriod[0],
          count: favoritePeriod[1],
        },
        evidence: {
          breakdown: hourCounts,
          type: 'time_preference',
        },
      });
    }
  }

  // Cross-domain: Activity-Mood connection
  if (activity.total >= 2 && mood.total >= 2 && activityLogs.length >= 2 && moodLogs.length >= 2) {
    // Check mood on active vs inactive days
    const activityByDay = {};
    activityLogs.forEach(a => {
      const day = new Date(a.loggedAt).toISOString().split('T')[0];
      activityByDay[day] = (activityByDay[day] || 0) + (a.durationMinutes || 0);
    });

    const moodByDay = {};
    moodLogs.forEach(m => {
      const day = new Date(m.loggedDate).toISOString().split('T')[0];
      if (!moodByDay[day]) moodByDay[day] = [];
      moodByDay[day].push(m.intensity || 5);
    });

    const activeDays = Object.keys(activityByDay);
    const moodOnActiveDays = activeDays
      .filter(d => moodByDay[d])
      .flatMap(d => moodByDay[d]);

    const inactiveDays = Object.keys(moodByDay).filter(d => !activityByDay[d]);
    const moodOnInactiveDays = inactiveDays.flatMap(d => moodByDay[d]);

    if (moodOnActiveDays.length > 0 && moodOnInactiveDays.length > 0) {
      const avgMoodActive = moodOnActiveDays.reduce((a, b) => a + b, 0) / moodOnActiveDays.length;
      const avgMoodInactive = moodOnInactiveDays.reduce((a, b) => a + b, 0) / moodOnInactiveDays.length;

      if (Math.abs(avgMoodActive - avgMoodInactive) >= 0.3) {
        recommendations.push({
          id: 'activity_mood_link',
          type: 'pattern',
          priority: 5,
          domain: 'activity',
          title: avgMoodActive > avgMoodInactive ? 'Activity Boosts Mood' : 'Activity Insight',
          message: avgMoodActive > avgMoodInactive
            ? `On active days, your mood averages ${avgMoodActive.toFixed(1)}/10 vs ${avgMoodInactive.toFixed(1)}/10 on rest days. Movement helps!`
            : `We're tracking how your activity affects your mood. Keep logging!`,
          icon: 'heart',
          color: '#EC4899',
          metric: {
            moodOnActiveDays: parseFloat(avgMoodActive.toFixed(1)),
            moodOnInactiveDays: parseFloat(avgMoodInactive.toFixed(1)),
            delta: parseFloat((avgMoodActive - avgMoodInactive).toFixed(1)),
          },
          evidence: {
            activeDays: activeDays.length,
            inactiveDays: inactiveDays.length,
            type: 'cross_domain',
          },
        });
      }
    }
  }

  // Activity correlations
  const activityCorrelations = correlations.filter(c =>
    c.ruleName?.includes('activity') ||
    c.signalAType?.includes('activity')
  );

  activityCorrelations.slice(0, 1).forEach((corr, idx) => {
    const evidence = corr.evidenceJson || {};
    recommendations.push({
      id: `activity_pattern_${corr.id || idx}`,
      type: 'pattern',
      priority: 6,
      domain: 'activity',
      title: 'Activity Pattern',
      message: corr.description || `Your activity habits are connected to your ${corr.outcomeMetric || 'wellbeing'}.`,
      icon: 'fitness',
      color: '#10B981',
      metric: {
        confidence: Math.round((corr.confidence || 0) * 100),
        strength: corr.strength || 'moderate',
      },
      evidence: {
        examples: evidence.examples?.slice(0, 2) || [],
        type: 'correlation',
      },
      correlation: corr,
    });
  });

  return recommendations;
}

/**
 * Generate cross-domain recommendations - THE HEART OF INTELLIGENCE
 * This is where we surface connections between ALL wellness domains:
 * - Food → Mood, Energy
 * - Hydration → Energy, Focus, Mood
 * - Activity → Mood, Sleep, Energy
 * - Nutrition timing → Performance
 */
function generateCrossDomainRecommendations(stats, recentLogs, correlations, stage) {
  const recommendations = [];
  const { food, mood, water, activity, goals } = stats;
  const { foodLogs, moodLogs, waterLogs, activityLogs } = recentLogs;

  // Calculate scores for wellness breakdown
  const calorieScore = Math.min(100, goals.calorieGoal > 0 ? (food.todayCalories / goals.calorieGoal) * 100 : 0);
  const waterScore = Math.min(100, goals.waterGoalMl > 0 ? (water.todayMl / goals.waterGoalMl) * 100 : 0);
  const activityScore = Math.min(100, goals.activityGoalMinutes > 0 ? (activity.weeklyMinutes / goals.activityGoalMinutes) * 100 : 0);
  const moodScore = mood.avgIntensityThisWeek > 0 ? mood.avgIntensityThisWeek * 10 : 50;

  // Start providing cross-domain insights from Day 2
  if (stats.totalDataPoints >= 3) {
    const wellnessScore = Math.round((calorieScore + waterScore + activityScore + moodScore) / 4);

    recommendations.push({
      id: 'wellness_score',
      type: 'insight',
      priority: 1,
      domain: 'wellness',
      title: `Wellness Score: ${wellnessScore}`,
      message: wellnessScore >= 80
        ? 'You\'re doing great across all wellness dimensions!'
        : wellnessScore >= 60
          ? 'Good progress! Small improvements in a few areas can boost your score.'
          : 'Focus on improving one area at a time for better overall wellness.',
      icon: 'fitness',
      color: wellnessScore >= 80 ? '#10B981' : wellnessScore >= 60 ? '#6366F1' : '#F59E0B',
      metric: {
        overall: wellnessScore,
        breakdown: {
          nutrition: Math.round(calorieScore),
          hydration: Math.round(waterScore),
          activity: Math.round(activityScore),
          mood: Math.round(moodScore),
        },
      },
      evidence: {
        type: 'wellness_score',
      },
    });

    // Find weakest and strongest areas
    const areas = [
      { name: 'nutrition', score: calorieScore, icon: 'nutrition', action: 'Log more balanced meals' },
      { name: 'hydration', score: waterScore, icon: 'water', action: 'Drink more water' },
      { name: 'activity', score: activityScore, icon: 'fitness', action: 'Add more movement' },
      { name: 'mood', score: moodScore, icon: 'happy', action: 'Try mood-boosting activities' },
    ].sort((a, b) => a.score - b.score);

    const weakest = areas[0];
    const strongest = areas[3];

    if (weakest.score < 70) {
      recommendations.push({
        id: 'focus_area',
        type: 'suggestion',
        priority: 2,
        domain: 'wellness',
        title: `Focus: ${weakest.name.charAt(0).toUpperCase() + weakest.name.slice(1)}`,
        message: `Your ${weakest.name} score is ${Math.round(weakest.score)}%. ${weakest.action} to improve your overall wellness.`,
        icon: weakest.icon,
        color: '#8B5CF6',
        metric: {
          area: weakest.name,
          score: Math.round(weakest.score),
        },
        evidence: {
          type: 'focus_recommendation',
        },
      });
    }

    // Celebrate strongest area
    if (strongest.score >= 80) {
      recommendations.push({
        id: 'strength_celebration',
        type: 'insight',
        priority: 3,
        domain: 'wellness',
        title: `${strongest.name.charAt(0).toUpperCase() + strongest.name.slice(1)} Champion`,
        message: `Your ${strongest.name} is at ${Math.round(strongest.score)}% - you're crushing it! This sets a great foundation.`,
        icon: 'trophy',
        color: '#FBBF24',
        metric: {
          area: strongest.name,
          score: Math.round(strongest.score),
        },
        evidence: {
          type: 'strength_celebration',
        },
      });
    }
  }

  // ==========================================
  // FOOD → ENERGY/MOOD Cross-Domain Analysis
  // ==========================================
  if (foodLogs.length >= 2 && moodLogs.length >= 2) {
    // Analyze protein intake vs energy levels
    const highProteinDays = {};
    const lowProteinDays = {};

    foodLogs.forEach(f => {
      const day = new Date(f.loggedDate).toISOString().split('T')[0];
      const protein = parseFloat(f.protein) || 0;
      if (!highProteinDays[day]) highProteinDays[day] = 0;
      highProteinDays[day] += protein;
    });

    const avgProtein = Object.values(highProteinDays).reduce((a, b) => a + b, 0) / Object.keys(highProteinDays).length || 0;

    // Check if high protein days correlate with better mood
    const moodByDay = {};
    moodLogs.forEach(m => {
      const day = new Date(m.loggedDate).toISOString().split('T')[0];
      if (!moodByDay[day]) moodByDay[day] = [];
      moodByDay[day].push(parseFloat(m.intensity) || 5);
    });

    const highProteinMoods = [];
    const lowProteinMoods = [];

    Object.keys(highProteinDays).forEach(day => {
      if (moodByDay[day]) {
        const dayMood = moodByDay[day].reduce((a, b) => a + b, 0) / moodByDay[day].length;
        if (highProteinDays[day] > avgProtein) {
          highProteinMoods.push(dayMood);
        } else {
          lowProteinMoods.push(dayMood);
        }
      }
    });

    if (highProteinMoods.length > 0 && lowProteinMoods.length > 0) {
      const avgMoodHighProtein = highProteinMoods.reduce((a, b) => a + b, 0) / highProteinMoods.length;
      const avgMoodLowProtein = lowProteinMoods.reduce((a, b) => a + b, 0) / lowProteinMoods.length;

      if (Math.abs(avgMoodHighProtein - avgMoodLowProtein) >= 0.3) {
        const better = avgMoodHighProtein > avgMoodLowProtein;
        recommendations.push({
          id: 'food_protein_mood',
          type: 'pattern',
          priority: 4,
          domain: 'wellness',
          title: better ? 'Protein Powers Your Mood' : 'Nutrition-Mood Link',
          message: better
            ? `On high-protein days (>${Math.round(avgProtein)}g), your mood averages ${avgMoodHighProtein.toFixed(1)}/10 vs ${avgMoodLowProtein.toFixed(1)}/10 on lower protein days.`
            : `We're tracking how your protein intake affects your mood. Keep logging!`,
          icon: 'nutrition',
          color: '#10B981',
          metric: {
            moodHighProtein: parseFloat(avgMoodHighProtein.toFixed(1)),
            moodLowProtein: parseFloat(avgMoodLowProtein.toFixed(1)),
            delta: parseFloat((avgMoodHighProtein - avgMoodLowProtein).toFixed(1)),
            avgProtein: Math.round(avgProtein),
          },
          evidence: {
            highProteinDays: highProteinMoods.length,
            lowProteinDays: lowProteinMoods.length,
            type: 'nutrition_mood_correlation',
          },
        });
      }
    }
  }

  // ==========================================
  // HYDRATION → ENERGY Cross-Domain Analysis
  // ==========================================
  if (waterLogs.length >= 2 && moodLogs.length >= 2) {
    const waterByDay = {};
    waterLogs.forEach(w => {
      const day = new Date(w.loggedDate).toISOString().split('T')[0];
      waterByDay[day] = (waterByDay[day] || 0) + ((parseFloat(w.amountLiters) || 0) * 1000);
    });

    const moodByDay = {};
    moodLogs.forEach(m => {
      const day = new Date(m.loggedDate).toISOString().split('T')[0];
      if (!moodByDay[day]) moodByDay[day] = [];
      moodByDay[day].push(parseFloat(m.intensity) || 5);
    });

    const waterDays = Object.keys(waterByDay);
    if (waterDays.length >= 2) {
      const avgWater = Object.values(waterByDay).reduce((a, b) => a + b, 0) / waterDays.length;

      const hydratedMoods = [];
      const dehydratedMoods = [];

      waterDays.forEach(day => {
        if (moodByDay[day]) {
          const dayMood = moodByDay[day].reduce((a, b) => a + b, 0) / moodByDay[day].length;
          if (waterByDay[day] >= avgWater * 0.9) {
            hydratedMoods.push(dayMood);
          } else {
            dehydratedMoods.push(dayMood);
          }
        }
      });

      if (hydratedMoods.length > 0 && dehydratedMoods.length > 0) {
        const avgMoodHydrated = hydratedMoods.reduce((a, b) => a + b, 0) / hydratedMoods.length;
        const avgMoodDehydrated = dehydratedMoods.reduce((a, b) => a + b, 0) / dehydratedMoods.length;

        if (Math.abs(avgMoodHydrated - avgMoodDehydrated) >= 0.2) {
          recommendations.push({
            id: 'hydration_energy_link',
            type: 'pattern',
            priority: 5,
            domain: 'wellness',
            title: avgMoodHydrated > avgMoodDehydrated ? 'Hydration = Energy' : 'Water-Energy Connection',
            message: avgMoodHydrated > avgMoodDehydrated
              ? `When well-hydrated (${(avgWater/1000).toFixed(1)}L+), your energy is ${avgMoodHydrated.toFixed(1)}/10 vs ${avgMoodDehydrated.toFixed(1)}/10 on drier days.`
              : `We're analyzing how hydration affects your energy levels.`,
            icon: 'water',
            color: '#0EA5E9',
            metric: {
              energyHydrated: parseFloat(avgMoodHydrated.toFixed(1)),
              energyDehydrated: parseFloat(avgMoodDehydrated.toFixed(1)),
              avgWaterMl: Math.round(avgWater),
            },
            evidence: {
              hydratedDays: hydratedMoods.length,
              dehydratedDays: dehydratedMoods.length,
              type: 'hydration_energy_correlation',
            },
          });
        }
      }
    }
  }

  // ==========================================
  // ACTIVITY → MOOD Cross-Domain Analysis
  // ==========================================
  if (activityLogs.length >= 2 && moodLogs.length >= 2) {
    const activityByDay = {};
    activityLogs.forEach(a => {
      const day = new Date(a.loggedAt).toISOString().split('T')[0];
      activityByDay[day] = (activityByDay[day] || 0) + (parseFloat(a.durationMinutes) || 0);
    });

    const moodByDay = {};
    moodLogs.forEach(m => {
      const day = new Date(m.loggedDate).toISOString().split('T')[0];
      if (!moodByDay[day]) moodByDay[day] = [];
      moodByDay[day].push(parseFloat(m.intensity) || 5);
    });

    const activeDayMoods = [];
    const restDayMoods = [];

    // Check mood on days with activity vs days without
    Object.keys(moodByDay).forEach(day => {
      const dayMood = moodByDay[day].reduce((a, b) => a + b, 0) / moodByDay[day].length;
      if (activityByDay[day] && activityByDay[day] > 10) {
        activeDayMoods.push({ mood: dayMood, minutes: activityByDay[day] });
      } else {
        restDayMoods.push(dayMood);
      }
    });

    if (activeDayMoods.length > 0 && restDayMoods.length > 0) {
      const avgMoodActive = activeDayMoods.reduce((a, b) => a + b.mood, 0) / activeDayMoods.length;
      const avgMoodRest = restDayMoods.reduce((a, b) => a + b, 0) / restDayMoods.length;
      const avgActivityMinutes = activeDayMoods.reduce((a, b) => a + b.minutes, 0) / activeDayMoods.length;

      if (Math.abs(avgMoodActive - avgMoodRest) >= 0.2) {
        const better = avgMoodActive > avgMoodRest;
        recommendations.push({
          id: 'activity_mood_boost',
          type: 'pattern',
          priority: 6,
          domain: 'wellness',
          title: better ? 'Movement = Better Mood' : 'Activity-Mood Pattern',
          message: better
            ? `On days with ${Math.round(avgActivityMinutes)}+ min of activity, your mood is ${avgMoodActive.toFixed(1)}/10 vs ${avgMoodRest.toFixed(1)}/10 on rest days.`
            : `We're tracking how activity affects your mood. Keep logging!`,
          icon: 'fitness',
          color: '#10B981',
          metric: {
            moodActive: parseFloat(avgMoodActive.toFixed(1)),
            moodRest: parseFloat(avgMoodRest.toFixed(1)),
            avgMinutes: Math.round(avgActivityMinutes),
          },
          evidence: {
            activeDays: activeDayMoods.length,
            restDays: restDayMoods.length,
            type: 'activity_mood_correlation',
          },
        });
      }
    }
  }

  // ==========================================
  // NUTRITION TIMING → ACTIVITY Performance
  // ==========================================
  if (foodLogs.length >= 3 && activityLogs.length >= 2) {
    // Check if eating before activity correlates with longer workouts
    const activityWithPreMeal = [];
    const activityWithoutPreMeal = [];

    activityLogs.forEach(a => {
      const activityTime = new Date(a.loggedAt);
      const twoHoursBefore = new Date(activityTime.getTime() - 2 * 60 * 60 * 1000);

      // Find food logged in the 2 hours before activity
      const preMeal = foodLogs.find(f => {
        const foodTime = new Date(f.loggedDate);
        return foodTime >= twoHoursBefore && foodTime <= activityTime;
      });

      if (preMeal) {
        activityWithPreMeal.push(parseFloat(a.durationMinutes) || 0);
      } else {
        activityWithoutPreMeal.push(parseFloat(a.durationMinutes) || 0);
      }
    });

    if (activityWithPreMeal.length > 0 && activityWithoutPreMeal.length > 0) {
      const avgWithMeal = activityWithPreMeal.reduce((a, b) => a + b, 0) / activityWithPreMeal.length;
      const avgWithoutMeal = activityWithoutPreMeal.reduce((a, b) => a + b, 0) / activityWithoutPreMeal.length;

      if (Math.abs(avgWithMeal - avgWithoutMeal) >= 5) {
        const fueledBetter = avgWithMeal > avgWithoutMeal;
        recommendations.push({
          id: 'nutrition_timing_activity',
          type: 'insight',
          priority: 7,
          domain: 'wellness',
          title: fueledBetter ? 'Fueled Workouts Go Longer' : 'Pre-Workout Nutrition',
          message: fueledBetter
            ? `When you eat before activity, your workouts average ${Math.round(avgWithMeal)} min vs ${Math.round(avgWithoutMeal)} min without pre-fuel.`
            : `Your fasted workouts average ${Math.round(avgWithoutMeal)} min. This might work well for you!`,
          icon: 'flash',
          color: '#F59E0B',
          metric: {
            fueledDuration: Math.round(avgWithMeal),
            fastedDuration: Math.round(avgWithoutMeal),
          },
          evidence: {
            fueledWorkouts: activityWithPreMeal.length,
            fastedWorkouts: activityWithoutPreMeal.length,
            type: 'meal_timing_correlation',
          },
        });
      }
    }
  }

  // ==========================================
  // TRIPLE COMBO: Food + Water + Activity → Mood
  // ==========================================
  if (foodLogs.length >= 3 && waterLogs.length >= 3 && activityLogs.length >= 2 && moodLogs.length >= 3) {
    const dayMetrics = {};

    foodLogs.forEach(f => {
      const day = new Date(f.loggedDate).toISOString().split('T')[0];
      if (!dayMetrics[day]) dayMetrics[day] = { calories: 0, water: 0, activity: 0, moods: [] };
      dayMetrics[day].calories += parseFloat(f.calories) || 0;
    });

    waterLogs.forEach(w => {
      const day = new Date(w.loggedDate).toISOString().split('T')[0];
      if (!dayMetrics[day]) dayMetrics[day] = { calories: 0, water: 0, activity: 0, moods: [] };
      dayMetrics[day].water += (parseFloat(w.amountLiters) || 0) * 1000;
    });

    activityLogs.forEach(a => {
      const day = new Date(a.loggedAt).toISOString().split('T')[0];
      if (!dayMetrics[day]) dayMetrics[day] = { calories: 0, water: 0, activity: 0, moods: [] };
      dayMetrics[day].activity += parseFloat(a.durationMinutes) || 0;
    });

    moodLogs.forEach(m => {
      const day = new Date(m.loggedDate).toISOString().split('T')[0];
      if (!dayMetrics[day]) dayMetrics[day] = { calories: 0, water: 0, activity: 0, moods: [] };
      dayMetrics[day].moods.push(parseFloat(m.intensity) || 5);
    });

    // Find "power days" (good in all 3 areas) vs "regular days"
    const days = Object.entries(dayMetrics).filter(([_, m]) => m.moods.length > 0);
    if (days.length >= 3) {
      const avgCalories = days.reduce((a, [_, m]) => a + m.calories, 0) / days.length;
      const avgWater = days.reduce((a, [_, m]) => a + m.water, 0) / days.length;

      const powerDayMoods = [];
      const regularDayMoods = [];

      days.forEach(([_, metrics]) => {
        const dayMood = metrics.moods.reduce((a, b) => a + b, 0) / metrics.moods.length;
        const isEatingWell = metrics.calories >= avgCalories * 0.8;
        const isHydrated = metrics.water >= avgWater * 0.8;
        const isActive = metrics.activity >= 15;

        if (isEatingWell && isHydrated && isActive) {
          powerDayMoods.push(dayMood);
        } else {
          regularDayMoods.push(dayMood);
        }
      });

      if (powerDayMoods.length > 0 && regularDayMoods.length > 0) {
        const avgPowerMood = powerDayMoods.reduce((a, b) => a + b, 0) / powerDayMoods.length;
        const avgRegularMood = regularDayMoods.reduce((a, b) => a + b, 0) / regularDayMoods.length;

        if (avgPowerMood > avgRegularMood + 0.3) {
          recommendations.push({
            id: 'triple_combo_insight',
            type: 'pattern',
            priority: 8,
            domain: 'wellness',
            title: 'Your Power Formula',
            message: `Days when you eat well, stay hydrated AND exercise, your mood averages ${avgPowerMood.toFixed(1)}/10 vs ${avgRegularMood.toFixed(1)}/10 otherwise. The combo works!`,
            icon: 'flash',
            color: '#EC4899',
            metric: {
              powerDayMood: parseFloat(avgPowerMood.toFixed(1)),
              regularDayMood: parseFloat(avgRegularMood.toFixed(1)),
              delta: parseFloat((avgPowerMood - avgRegularMood).toFixed(1)),
            },
            evidence: {
              powerDays: powerDayMoods.length,
              regularDays: regularDayMoods.length,
              type: 'multi_factor_correlation',
            },
          });
        }
      }
    }
  }

  // ==========================================
  // DATABASE CORRELATIONS (from correlation engine)
  // ==========================================
  const multiDomainCorrelations = correlations.filter(c => {
    const aType = (c.signalAType || c.ruleName || '').toLowerCase();
    const bType = (c.signalBType || c.outcomeMetric || '').toLowerCase();
    const domains = new Set();

    if (aType.includes('food') || aType.includes('calorie') || aType.includes('protein') || aType.includes('breakfast') || aType.includes('sugar')) domains.add('nutrition');
    if (aType.includes('water') || aType.includes('hydration')) domains.add('hydration');
    if (aType.includes('activity') || aType.includes('exercise') || aType.includes('workout')) domains.add('activity');
    if (aType.includes('mood') || aType.includes('energy') || aType.includes('happy') || aType.includes('stress')) domains.add('mood');

    if (bType.includes('food') || bType.includes('calorie')) domains.add('nutrition');
    if (bType.includes('water') || bType.includes('hydration')) domains.add('hydration');
    if (bType.includes('activity') || bType.includes('exercise')) domains.add('activity');
    if (bType.includes('mood') || bType.includes('energy') || bType.includes('score')) domains.add('mood');

    return domains.size >= 2;
  });

  multiDomainCorrelations.slice(0, 2).forEach((corr, idx) => {
    const evidence = corr.evidenceJson || {};
    const impact = (evidence.avgValueWith || 0) > (evidence.avgValueWithout || 0) ? 'positive' : 'negative';

    recommendations.push({
      id: `cross_domain_${corr.id || idx}`,
      type: 'pattern',
      priority: 9 + idx,
      domain: 'wellness',
      title: impact === 'positive' ? 'Positive Connection Found' : 'Pattern Discovered',
      message: corr.description || `We found a connection between ${corr.signalAType?.replace(/_/g, ' ') || 'your habits'} and ${corr.outcomeMetric?.replace(/_/g, ' ') || 'your wellbeing'}.`,
      icon: 'git-network',
      color: impact === 'positive' ? '#10B981' : '#F59E0B',
      metric: {
        confidence: Math.round((corr.confidence || 0) * 100),
        strength: corr.strength || 'moderate',
        with: evidence.avgValueWith,
        without: evidence.avgValueWithout,
      },
      evidence: {
        examples: evidence.examples?.slice(0, 2) || [],
        occurrences: corr.occurrences,
        type: 'database_correlation',
      },
      correlation: corr,
    });
  });

  return recommendations;
}

/**
 * ============================================
 * MAIN EXPORT
 * ============================================
 */

/**
 * Get comprehensive analytics recommendations for a user
 * @param {string} userId
 * @param {string} period - 'today' | 'week' | 'month' | 'all'
 * @returns {Promise<Object>} Full analytics with recommendations
 */
export async function getAnalyticsRecommendations(userId, period = 'week') {
  const lookbackDays = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;

  // Gather all data in parallel
  const [stats, recentLogs, correlations] = await Promise.all([
    getUserDataStats(userId),
    getRecentLogs(userId, lookbackDays),
    getUserCorrelationsData(userId),
  ]);

  // Determine user's stage
  const stage = determineStage(stats);

  // Generate recommendations for each domain
  const nutritionRecs = generateNutritionRecommendations(stats, recentLogs, correlations, stage);
  const moodRecs = generateMoodRecommendations(stats, recentLogs, correlations, stage);
  const hydrationRecs = generateHydrationRecommendations(stats, recentLogs, correlations, stage);
  const activityRecs = generateActivityRecommendations(stats, recentLogs, correlations, stage);
  const crossDomainRecs = generateCrossDomainRecommendations(stats, recentLogs, correlations, stage);

  // Sort by priority within each domain
  const sortByPriority = (a, b) => a.priority - b.priority;

  return {
    success: true,
    stage: {
      name: stage.label,
      capabilities: stage.capabilities,
      minDataPoints: stage.minDataPoints,
      currentDataPoints: stats.totalDataPoints,
    },
    stats: {
      totalDataPoints: stats.totalDataPoints,
      food: stats.food,
      mood: stats.mood,
      water: stats.water,
      activity: stats.activity,
      goals: stats.goals,
    },
    recommendations: {
      nutrition: nutritionRecs.sort(sortByPriority),
      mood: moodRecs.sort(sortByPriority),
      hydration: hydrationRecs.sort(sortByPriority),
      activity: activityRecs.sort(sortByPriority),
      wellness: crossDomainRecs.sort(sortByPriority),
    },
    meta: {
      generatedAt: new Date().toISOString(),
      period,
      lookbackDays,
      correlationsAvailable: correlations.length,
    },
  };
}

export default {
  getAnalyticsRecommendations,
  getUserDataStats,
  determineStage,
  RECOMMENDATION_STAGES,
};
