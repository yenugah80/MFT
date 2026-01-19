/**
 * Context Builder - Intelligence Layer 1
 *
 * Gathers and enriches context for intelligent recommendations.
 * This layer understands:
 * - Time of day and meal windows
 * - Recent user activity (last 2-4 hours)
 * - Historical patterns for current time
 * - Goal progress and urgency
 * - User engagement state (active, dormant, returning)
 *
 * Output: Enriched context object that informs downstream layers
 */

// ============================================================================
// TIME CONSTANTS
// ============================================================================

const MEAL_WINDOWS = {
  breakfast: { start: 5, end: 10, label: 'Breakfast', icon: 'sunny-outline' },
  midMorning: { start: 10, end: 12, label: 'Mid-Morning', icon: 'cafe-outline' },
  lunch: { start: 12, end: 14, label: 'Lunch', icon: 'restaurant-outline' },
  afternoon: { start: 14, end: 17, label: 'Afternoon', icon: 'partly-sunny-outline' },
  dinner: { start: 17, end: 21, label: 'Dinner', icon: 'moon-outline' },
  evening: { start: 21, end: 24, label: 'Evening', icon: 'moon-outline' },
  lateNight: { start: 0, end: 5, label: 'Late Night', icon: 'bed-outline' },
};

const ACTIVITY_WINDOWS = {
  earlyMorning: { start: 5, end: 8, label: 'Early Morning', ideal: ['yoga', 'running', 'walking'] },
  morning: { start: 8, end: 12, label: 'Morning', ideal: ['gym', 'cycling', 'swimming'] },
  afternoon: { start: 12, end: 17, label: 'Afternoon', ideal: ['walking', 'stretching'] },
  evening: { start: 17, end: 21, label: 'Evening', ideal: ['gym', 'running', 'yoga'] },
  night: { start: 21, end: 24, label: 'Night', ideal: ['stretching', 'meditation'] },
};

const HYDRATION_WINDOWS = {
  wakeUp: { start: 6, end: 8, priority: 'high', message: 'Start your day hydrated' },
  preLunch: { start: 11, end: 12, priority: 'medium', message: 'Pre-meal hydration' },
  afternoon: { start: 14, end: 16, priority: 'high', message: 'Beat the afternoon slump' },
  preDinner: { start: 17, end: 18, priority: 'medium', message: 'Pre-dinner water' },
  evening: { start: 20, end: 22, priority: 'low', message: 'Light evening hydration' },
};

// ============================================================================
// CONTEXT BUILDER CLASS
// ============================================================================

export class ContextBuilder {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Build complete context for intelligence layers
   */
  buildContext({
    dashboardData,
    recentLogs = {},
    userPreferences = {},
    historicalPatterns = {},
  }) {
    const now = new Date();
    const hour = now.getHours();

    return {
      // Temporal context
      temporal: this.buildTemporalContext(now),

      // User state context
      userState: this.buildUserStateContext(dashboardData, recentLogs),

      // Goal context
      goals: this.buildGoalContext(dashboardData),

      // Engagement context
      engagement: this.buildEngagementContext(dashboardData, recentLogs),

      // Historical context
      historical: this.buildHistoricalContext(historicalPatterns, hour),

      // Preference context
      preferences: this.buildPreferenceContext(userPreferences),

      // Derived urgencies
      urgencies: this.calculateUrgencies(dashboardData, hour),

      // Metadata
      meta: {
        builtAt: now.toISOString(),
        version: '1.0',
      },
    };
  }

  /**
   * Build temporal context - what time-related factors matter now
   */
  buildTemporalContext(now) {
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Find current meal window
    const mealWindow = Object.entries(MEAL_WINDOWS).find(([, config]) => {
      if (config.start < config.end) {
        return hour >= config.start && hour < config.end;
      }
      return hour >= config.start || hour < config.end;
    });

    // Find current activity window
    const activityWindow = Object.entries(ACTIVITY_WINDOWS).find(([, config]) =>
      hour >= config.start && hour < config.end
    );

    // Find current hydration window
    const hydrationWindow = Object.entries(HYDRATION_WINDOWS).find(([, config]) =>
      hour >= config.start && hour < config.end
    );

    // Time until end of day (for goal urgency)
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const hoursRemaining = (endOfDay - now) / (1000 * 60 * 60);

    return {
      hour,
      dayOfWeek,
      isWeekend,
      hoursRemaining,
      mealWindow: mealWindow ? {
        id: mealWindow[0],
        ...mealWindow[1],
      } : null,
      activityWindow: activityWindow ? {
        id: activityWindow[0],
        ...activityWindow[1],
      } : null,
      hydrationWindow: hydrationWindow ? {
        id: hydrationWindow[0],
        ...hydrationWindow[1],
      } : null,
      // Time-based moods
      expectedEnergyLevel: this.estimateEnergyLevel(hour),
      isPostMealWindow: hour >= 13 && hour <= 15, // Afternoon slump
      isPreSleepWindow: hour >= 21,
    };
  }

  /**
   * Build user state context - what has the user done recently
   */
  buildUserStateContext(dashboardData, recentLogs) {
    const today = dashboardData?.today || {};
    const waterLogs = recentLogs.water || [];
    const foodLogs = recentLogs.food || today.foodLogs || [];
    const moodLogs = recentLogs.mood || [];
    const activityLogs = recentLogs.activity || [];

    // Calculate time since last activities
    const lastWaterLog = this.getLastLogTime(waterLogs);
    const lastFoodLog = this.getLastLogTime(foodLogs);
    const lastMoodLog = this.getLastLogTime(moodLogs);
    const lastActivityLog = this.getLastLogTime(activityLogs);

    // Recent activity in last 2 hours
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    const recentWater = waterLogs.filter(l => new Date(l.loggedDate || l.timestamp) > twoHoursAgo);
    const recentFood = foodLogs.filter(l => new Date(l.loggedDate || l.timestamp) > twoHoursAgo);
    const recentMood = moodLogs.filter(l => new Date(l.loggedDate || l.timestamp) > twoHoursAgo);
    const recentActivity = activityLogs.filter(l => new Date(l.timestamp) > twoHoursAgo);

    // Current mood state
    const latestMood = moodLogs.length > 0 ? moodLogs[moodLogs.length - 1] : null;

    return {
      // Today's totals
      todayCalories: today.nutrition?.calories || 0,
      todayProtein: today.nutrition?.protein || 0,
      todayWater: today.waterIntakeLiters || 0,
      todayMeals: foodLogs.length,
      todayActivityMinutes: activityLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0),

      // Time since last activity
      hoursSinceWater: lastWaterLog ? (Date.now() - lastWaterLog) / (1000 * 60 * 60) : 24,
      hoursSinceFood: lastFoodLog ? (Date.now() - lastFoodLog) / (1000 * 60 * 60) : 24,
      hoursSinceMood: lastMoodLog ? (Date.now() - lastMoodLog) / (1000 * 60 * 60) : 24,
      hoursSinceActivity: lastActivityLog ? (Date.now() - lastActivityLog) / (1000 * 60 * 60) : 24,

      // Recent activity (last 2 hours)
      recentWaterMl: recentWater.reduce((sum, l) => sum + (l.amountLiters || 0) * 1000, 0),
      recentMealsCount: recentFood.length,
      hadRecentActivity: recentActivity.length > 0,
      recentMoodLogged: recentMood.length > 0,

      // Current mood
      currentMood: latestMood ? {
        type: latestMood.mood,
        intensity: latestMood.intensity,
        loggedAt: latestMood.loggedDate || latestMood.timestamp,
      } : null,

      // Flags
      hasEatenToday: foodLogs.length > 0,
      hasHydratedToday: today.waterIntakeLiters > 0,
      hasLoggedMoodToday: moodLogs.length > 0,
      hasExercisedToday: activityLogs.length > 0,
    };
  }

  /**
   * Build goal context - how is the user progressing toward goals
   */
  buildGoalContext(dashboardData) {
    const goals = dashboardData?.goals || {};
    const today = dashboardData?.today || {};
    const nutrition = today.nutrition || {};

    // Calculate progress percentages
    const calorieGoal = goals.dailyCalories || 2000;
    const proteinGoal = goals.proteinG || 120;
    const waterGoal = goals.waterLiters || 2.0;
    const activityGoal = goals.activityMinutes || 30;

    const calorieProgress = Math.min((nutrition.calories || 0) / calorieGoal * 100, 150);
    const proteinProgress = Math.min((nutrition.protein || 0) / proteinGoal * 100, 150);
    const waterProgress = Math.min((today.waterIntakeLiters || 0) / waterGoal * 100, 150);

    // Activity is usually tracked weekly
    const weeklyActivityGoal = 150; // CDC recommendation
    const trends = dashboardData?.trends || {};
    const weeklyActivity = trends.weeklyActivityMinutes || 0;
    const activityProgress = Math.min(weeklyActivity / weeklyActivityGoal * 100, 150);

    return {
      calories: {
        goal: calorieGoal,
        current: nutrition.calories || 0,
        progress: calorieProgress,
        remaining: Math.max(0, calorieGoal - (nutrition.calories || 0)),
        status: this.getGoalStatus(calorieProgress),
      },
      protein: {
        goal: proteinGoal,
        current: nutrition.protein || 0,
        progress: proteinProgress,
        remaining: Math.max(0, proteinGoal - (nutrition.protein || 0)),
        status: this.getGoalStatus(proteinProgress),
      },
      water: {
        goal: waterGoal,
        current: today.waterIntakeLiters || 0,
        progress: waterProgress,
        remaining: Math.max(0, waterGoal - (today.waterIntakeLiters || 0)),
        status: this.getGoalStatus(waterProgress),
      },
      activity: {
        goal: weeklyActivityGoal,
        current: weeklyActivity,
        progress: activityProgress,
        remaining: Math.max(0, weeklyActivityGoal - weeklyActivity),
        status: this.getGoalStatus(activityProgress),
      },
      // Overall wellness
      overallProgress: (calorieProgress + proteinProgress + waterProgress + activityProgress) / 4,
      weakestDomain: this.findWeakestDomain({ calorieProgress, proteinProgress, waterProgress, activityProgress }),
      strongestDomain: this.findStrongestDomain({ calorieProgress, proteinProgress, waterProgress, activityProgress }),
    };
  }

  /**
   * Build engagement context - how engaged is this user
   */
  buildEngagementContext(dashboardData, recentLogs) {
    const gamification = dashboardData?.gamification || {};
    const userLifecycle = dashboardData?.userLifecycle || {};

    // Determine user engagement state
    const totalLogs = (userLifecycle.totalFoodLogs || 0) +
                      (userLifecycle.totalWaterLogs || 0) +
                      (userLifecycle.totalMoodLogs || 0);

    const daysSinceFirst = userLifecycle.daysSinceFirstLog || 0;
    const streak = gamification.streak || 0;

    let engagementState;
    if (totalLogs < 5) {
      engagementState = 'new';
    } else if (streak === 0 && totalLogs > 5) {
      engagementState = 'returning';
    } else if (streak >= 7) {
      engagementState = 'power_user';
    } else if (streak >= 3) {
      engagementState = 'engaged';
    } else {
      engagementState = 'casual';
    }

    return {
      state: engagementState,
      streak,
      totalLogs,
      daysSinceFirstLog: daysSinceFirst,
      daysActive: userLifecycle.distinctDays || 0,
      retentionRate: daysSinceFirst > 0 ? (userLifecycle.distinctDays || 0) / daysSinceFirst : 0,
      // Motivation factors
      isOnStreak: streak >= 2,
      isAtRiskOfBreaking: streak >= 3 && !recentLogs.food?.length && !recentLogs.water?.length,
      needsEncouragement: engagementState === 'returning' || engagementState === 'casual',
      canCelebrate: streak > 0 && streak % 7 === 0, // Weekly milestones
    };
  }

  /**
   * Build historical context - what patterns exist for this time
   */
  buildHistoricalContext(historicalPatterns, currentHour) {
    // Find patterns that match current time
    const relevantPatterns = [];

    if (historicalPatterns.mealTiming) {
      const mealPattern = historicalPatterns.mealTiming.find(p =>
        Math.abs(p.typicalHour - currentHour) <= 1
      );
      if (mealPattern) {
        relevantPatterns.push({
          type: 'meal_timing',
          pattern: mealPattern,
          message: `You usually eat ${mealPattern.mealType} around now`,
        });
      }
    }

    if (historicalPatterns.hydration) {
      const hydrationPattern = historicalPatterns.hydration.hourlyAverages?.[currentHour];
      if (hydrationPattern) {
        relevantPatterns.push({
          type: 'hydration',
          pattern: hydrationPattern,
          message: `Your typical water intake at this hour is ${hydrationPattern.avgMl}ml`,
        });
      }
    }

    if (historicalPatterns.activity) {
      const activityPattern = historicalPatterns.activity.preferredTimes?.includes(currentHour);
      if (activityPattern) {
        relevantPatterns.push({
          type: 'activity',
          pattern: { preferredHour: currentHour },
          message: 'This is one of your preferred workout times',
        });
      }
    }

    return {
      relevantPatterns,
      hasEnoughHistory: Object.keys(historicalPatterns).length >= 2,
      patternStrength: historicalPatterns.confidence || 0.5,
    };
  }

  /**
   * Build preference context
   */
  buildPreferenceContext(userPreferences) {
    return {
      prefersDailyReminders: userPreferences.dailyReminders ?? true,
      preferredReminderTimes: userPreferences.reminderTimes || [9, 12, 18],
      notificationFrequency: userPreferences.notificationFrequency || 'medium',
      copyTone: userPreferences.copyTone || 'friendly', // friendly, professional, witty
      metricsPreference: userPreferences.preferredMetrics || ['calories', 'water', 'mood'],
    };
  }

  /**
   * Calculate urgencies for each domain
   */
  calculateUrgencies(dashboardData, hour) {
    const goals = this.buildGoalContext(dashboardData);
    const hoursRemaining = 24 - hour;

    const calculateUrgency = (progress, domain) => {
      // Base urgency from progress
      let urgency = 0;
      if (progress < 25) urgency = 0.9;
      else if (progress < 50) urgency = 0.7;
      else if (progress < 75) urgency = 0.4;
      else if (progress < 100) urgency = 0.2;
      else urgency = 0;

      // Time decay - urgency increases as day progresses
      const timeMultiplier = hoursRemaining <= 4 ? 1.5 :
                            hoursRemaining <= 8 ? 1.2 : 1.0;

      return Math.min(urgency * timeMultiplier, 1.0);
    };

    return {
      nutrition: {
        urgency: calculateUrgency(goals.calories.progress, 'nutrition'),
        reason: goals.calories.progress < 50 ? 'low_intake' :
                goals.calories.progress > 100 ? 'exceeded' : 'on_track',
      },
      hydration: {
        urgency: calculateUrgency(goals.water.progress, 'hydration'),
        reason: goals.water.progress < 50 ? 'dehydrated' :
                goals.water.progress > 100 ? 'well_hydrated' : 'on_track',
      },
      activity: {
        urgency: calculateUrgency(goals.activity.progress, 'activity'),
        reason: goals.activity.progress < 50 ? 'sedentary' :
                goals.activity.progress > 100 ? 'active' : 'on_track',
      },
      // Overall priority domain
      priorityDomain: goals.weakestDomain,
      priorityUrgency: calculateUrgency(
        goals[goals.weakestDomain]?.progress || 0,
        goals.weakestDomain
      ),
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  getLastLogTime(logs) {
    if (!logs || logs.length === 0) return null;
    const lastLog = logs[logs.length - 1];
    return new Date(lastLog.loggedDate || lastLog.timestamp || lastLog.createdAt).getTime();
  }

  estimateEnergyLevel(hour) {
    // Typical circadian rhythm
    if (hour >= 6 && hour < 10) return 'rising';
    if (hour >= 10 && hour < 12) return 'high';
    if (hour >= 12 && hour < 14) return 'moderate';
    if (hour >= 14 && hour < 16) return 'low'; // Post-lunch dip
    if (hour >= 16 && hour < 19) return 'rising';
    if (hour >= 19 && hour < 21) return 'moderate';
    return 'low';
  }

  getGoalStatus(progress) {
    if (progress >= 100) return 'achieved';
    if (progress >= 80) return 'almost';
    if (progress >= 50) return 'halfway';
    if (progress >= 25) return 'started';
    return 'behind';
  }

  findWeakestDomain({ calorieProgress, proteinProgress, waterProgress, activityProgress }) {
    const domains = {
      calories: calorieProgress,
      protein: proteinProgress,
      water: waterProgress,
      activity: activityProgress,
    };
    return Object.entries(domains).sort((a, b) => a[1] - b[1])[0][0];
  }

  findStrongestDomain({ calorieProgress, proteinProgress, waterProgress, activityProgress }) {
    const domains = {
      calories: calorieProgress,
      protein: proteinProgress,
      water: waterProgress,
      activity: activityProgress,
    };
    return Object.entries(domains).sort((a, b) => b[1] - a[1])[0][0];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const contextBuilder = new ContextBuilder();
export default contextBuilder;
