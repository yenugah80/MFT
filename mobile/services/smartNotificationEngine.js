/**
 * ============================================================================
 * Smart Notification Engine - Data-Driven Zomato-Style Messaging
 * ============================================================================
 *
 * KEY PRINCIPLE: NO default/generic messages. ONLY data-driven insights.
 *
 * All notifications are generated from:
 * - User's actual logged data (hydration, meals, activity, mood)
 * - User's behavioral patterns (peak logging times, streaks, gaps)
 * - User's lifecycle stage (newcomer, building, established, expert)
 * - Real-time context (time since last log, pace vs goal)
 *
 * Zomato-style characteristics:
 * - Witty, personality-driven copy
 * - Never annoying - always relevant
 * - Contextual and personalized
 * - Action-oriented with clear CTAs
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  USER_PATTERNS: '@smart_notif_patterns',
  LAST_NOTIFICATION: '@smart_notif_last_sent',
  NOTIFICATION_HISTORY: '@smart_notif_history',
};

// ============================================================================
// DATA FETCHERS - Get real user data
// ============================================================================

/**
 * Fetch user's current hydration status
 */
const fetchHydrationStatus = async () => {
  try {
    const response = await apiClient.get('/nutrition/dashboard');
    const today = response?.today || {};
    const goals = response?.goals || {};
    const trends = response?.trends || {};

    return {
      currentMl: Math.round((today.waterIntakeLiters || 0) * 1000),
      goalMl: Math.round((goals.waterLiters || 2) * 1000),
      lastLogTime: today.waterLogs?.[0]?.loggedDate || null,
      logCount: today.waterLogs?.length || 0,
      streak: trends.currentStreak || 0,
      beverageTypes: today.waterLogs?.map(l => l.beverageType) || [],
    };
  } catch {
    return null;
  }
};

/**
 * Fetch user's meal logging status
 */
const fetchMealStatus = async () => {
  try {
    const response = await apiClient.get('/nutrition/dashboard');
    const today = response?.today || {};
    const trends = response?.trends || {};

    return {
      mealsLogged: today.mealsLogged || 0,
      lastMealTime: today.lastMealTime || null,
      totalCalories: today.calories || 0,
      calorieGoal: response?.goals?.dailyCalories || 2000,
      streak: trends.currentStreak || 0,
    };
  } catch {
    return null;
  }
};

/**
 * Fetch user's activity status
 */
const fetchActivityStatus = async () => {
  try {
    const response = await apiClient.get('/activity/today');
    return {
      steps: response?.steps || 0,
      stepGoal: response?.stepGoal || 10000,
      activeMinutes: response?.activeMinutes || 0,
      caloriesBurned: response?.caloriesBurned || 0,
      lastActivityTime: response?.lastActivityTime || null,
    };
  } catch {
    return null;
  }
};

/**
 * Analyze user patterns from historical data
 */
export const analyzeUserPatterns = async () => {
  try {
    // Try to get cached patterns first
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.USER_PATTERNS);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Use cached if less than 1 hour old
      if (parsed.analyzedAt && Date.now() - parsed.analyzedAt < 3600000) {
        return parsed;
      }
    }

    // Fetch fresh data
    const response = await apiClient.get('/insights/user-patterns');

    const patterns = {
      // Timing patterns
      peakHydrationHours: response?.hydration?.peakHours || [],
      typicalMealTimes: response?.meals?.typicalTimes || [],
      mostActiveHours: response?.activity?.peakHours || [],

      // Behavior patterns
      averageDailyLogs: response?.averageDailyLogs || 0,
      hydrationConsistency: response?.hydration?.consistency || 0,
      mealLoggingRate: response?.meals?.loggingRate || 0,

      // Lifecycle
      totalDaysActive: response?.totalDaysActive || 0,
      currentStreak: response?.currentStreak || 0,
      longestStreak: response?.longestStreak || 0,
      lifecycleStage: response?.lifecycleStage || 'newcomer',

      // Preferences
      preferredBeverages: response?.hydration?.preferredBeverages || [],
      preferredCuisines: response?.meals?.preferredCuisines || [],

      analyzedAt: Date.now(),
    };

    await AsyncStorage.setItem(STORAGE_KEYS.USER_PATTERNS, JSON.stringify(patterns));
    return patterns;
  } catch {
    // Return null if we can't get patterns - don't send notifications without data
    return null;
  }
};

// ============================================================================
// MESSAGE GENERATORS - Zomato-style, data-driven
// ============================================================================

/**
 * Generate hydration reminder based on ACTUAL user data
 * Returns null if no relevant data to base message on
 */
export const generateHydrationMessage = async () => {
  const status = await fetchHydrationStatus();
  if (!status) return null;

  const { currentMl, goalMl, lastLogTime, logCount, streak, beverageTypes } = status;
  const percentage = Math.round((currentMl / goalMl) * 100);
  const remaining = goalMl - currentMl;
  const hour = new Date().getHours();

  // Calculate time since last log
  let minutesSinceLastLog = null;
  if (lastLogTime) {
    minutesSinceLastLog = Math.round((Date.now() - new Date(lastLogTime).getTime()) / 60000);
  }

  // NO LOGS TODAY - but only send if it's past 10am
  if (logCount === 0 && hour >= 10) {
    return {
      title: "Day started, hydration hasn't 💧",
      body: "Your first glass kicks off the day. Ready when you are.",
      data: { type: 'hydration', action: 'open_hydration', reason: 'no_logs_today' },
    };
  }

  // GOAL ACHIEVED
  if (percentage >= 100) {
    if (streak > 1) {
      return {
        title: `${streak} days hydrated! 🔥`,
        body: "Your consistency is paying off. Keep the streak alive tomorrow!",
        data: { type: 'hydration', action: 'celebrate', reason: 'goal_achieved_streak' },
      };
    }
    return {
      title: "Hydration goal: Crushed! 💪",
      body: "Your body is running on full hydration. Nice work today.",
      data: { type: 'hydration', action: 'celebrate', reason: 'goal_achieved' },
    };
  }

  // BEHIND PACE - Only if we have timing data
  if (minutesSinceLastLog !== null && minutesSinceLastLog > 120 && percentage < 80) {
    const hoursSince = Math.round(minutesSinceLastLog / 60);
    return {
      title: `${hoursSince}h since your last sip`,
      body: `${remaining}ml to go. A glass now keeps you on track.`,
      data: { type: 'hydration', action: 'open_hydration', reason: 'behind_pace', behindBy: remaining },
    };
  }

  // GOOD PROGRESS - Give encouragement
  if (percentage >= 75 && percentage < 100) {
    return {
      title: "Almost there! 💧",
      body: `Just ${remaining}ml more. You've got this.`,
      data: { type: 'hydration', action: 'open_hydration', reason: 'almost_goal' },
    };
  }

  // MODERATE PROGRESS with context
  if (percentage >= 40 && percentage < 75 && hour >= 14) {
    return {
      title: "Afternoon hydration check",
      body: `${percentage}% done, ${remaining}ml to go. Pace yourself for the evening.`,
      data: { type: 'hydration', action: 'open_hydration', reason: 'afternoon_check' },
    };
  }

  // If none of the above conditions, don't send a notification
  // Better to send nothing than a generic message
  return null;
};

/**
 * Generate meal logging reminder based on ACTUAL user data
 * Returns null if no relevant data
 */
export const generateMealMessage = async () => {
  const status = await fetchMealStatus();
  if (!status) return null;

  const { mealsLogged, lastMealTime, totalCalories, calorieGoal, streak } = status;
  const hour = new Date().getHours();

  // Calculate time since last meal log
  let hoursSinceLastMeal = null;
  if (lastMealTime) {
    hoursSinceLastMeal = Math.round((Date.now() - new Date(lastMealTime).getTime()) / 3600000);
  }

  // NO MEALS LOGGED - Contextual by time
  if (mealsLogged === 0) {
    if (hour >= 9 && hour < 11) {
      return {
        title: "Breakfast fuel? 🍳",
        body: "What powered your morning? Log it in 10 seconds.",
        data: { type: 'meal', action: 'open_log', meal: 'breakfast' },
      };
    }
    if (hour >= 12 && hour < 14) {
      return {
        title: "Lunch break?",
        body: "Your nutrition insights are waiting. Quick log keeps them accurate.",
        data: { type: 'meal', action: 'open_log', meal: 'lunch' },
      };
    }
    if (hour >= 18 && hour < 21) {
      return {
        title: "Dinner time! 🍽️",
        body: "End the day with a log. Your streak depends on it.",
        data: { type: 'meal', action: 'open_log', meal: 'dinner' },
      };
    }
    return null;
  }

  // STREAK REMINDER - Evening nudge
  if (streak > 0 && hour >= 20 && mealsLogged < 2) {
    return {
      title: `${streak}-day streak on the line! 🔥`,
      body: "One more meal log keeps it alive. Don't let it slip.",
      data: { type: 'meal', action: 'open_log', reason: 'streak_protection' },
    };
  }

  // CALORIE TRACKING - If they're tracking
  if (totalCalories > 0 && calorieGoal > 0) {
    const remaining = calorieGoal - totalCalories;
    if (remaining > 0 && remaining < 500 && hour >= 18) {
      return {
        title: "Room for a snack? 🍿",
        body: `${remaining} calories left in your budget today.`,
        data: { type: 'meal', action: 'open_log', reason: 'calorie_budget' },
      };
    }
  }

  return null;
};

/**
 * Generate activity reminder based on ACTUAL user data
 * Returns null if no relevant data
 */
export const generateActivityMessage = async () => {
  const status = await fetchActivityStatus();
  if (!status) return null;

  const { steps, stepGoal, activeMinutes, lastActivityTime } = status;
  const percentage = Math.round((steps / stepGoal) * 100);
  const hour = new Date().getHours();

  // GOAL ACHIEVED
  if (percentage >= 100) {
    return {
      title: "Step goal: Done! 🎯",
      body: `${steps.toLocaleString()} steps today. Your body thanks you.`,
      data: { type: 'activity', action: 'celebrate', reason: 'step_goal' },
    };
  }

  // LOW ACTIVITY - Afternoon nudge
  if (percentage < 30 && hour >= 14 && hour < 18) {
    const remaining = stepGoal - steps;
    return {
      title: "Movement break? 🚶",
      body: `${remaining.toLocaleString()} steps to go. Even a short walk helps.`,
      data: { type: 'activity', action: 'open_activity', reason: 'low_steps' },
    };
  }

  // CLOSE TO GOAL
  if (percentage >= 80 && percentage < 100) {
    const remaining = stepGoal - steps;
    return {
      title: "So close! 👟",
      body: `Just ${remaining.toLocaleString()} more steps to hit your goal.`,
      data: { type: 'activity', action: 'open_activity', reason: 'almost_goal' },
    };
  }

  return null;
};

/**
 * Generate mood check-in based on ACTUAL user data
 * Only prompts if user has been logging mood consistently
 */
export const generateMoodMessage = async () => {
  const patterns = await analyzeUserPatterns();
  if (!patterns) return null;

  // Only prompt mood check-in for established users who log regularly
  if (patterns.totalDaysActive < 7) return null;
  if (patterns.lifecycleStage === 'newcomer') return null;

  const hour = new Date().getHours();

  // Evening check-in for active users
  if (hour >= 19 && hour < 22) {
    return {
      title: "Quick vibe check 🌤️",
      body: "How's today treating you? 5 seconds to log, days of insights.",
      data: { type: 'mood', action: 'open_mood', reason: 'evening_checkin' },
    };
  }

  return null;
};

// ============================================================================
// SMART SCHEDULING - Based on user patterns
// ============================================================================

/**
 * Get optimal notification times based on user's actual patterns
 */
export const getOptimalNotificationTimes = async () => {
  const patterns = await analyzeUserPatterns();

  if (!patterns) {
    // No data = no notifications
    return {
      hydration: [],
      meals: [],
      activity: [],
      mood: [],
    };
  }

  // Build schedule from actual user patterns
  const schedule = {
    hydration: [],
    meals: [],
    activity: [],
    mood: [],
  };

  // Hydration: Based on peak hours and consistency
  if (patterns.peakHydrationHours.length > 0) {
    // Add reminders 1 hour before typical logging times
    patterns.peakHydrationHours.forEach(hour => {
      const reminderHour = Math.max(8, hour - 1);
      if (!schedule.hydration.includes(reminderHour)) {
        schedule.hydration.push(reminderHour);
      }
    });
  }

  // Meals: Based on typical meal times
  if (patterns.typicalMealTimes.length > 0) {
    patterns.typicalMealTimes.forEach(time => {
      // Remind 30 min after typical meal time to log
      const reminderHour = Math.min(21, time.hour);
      if (!schedule.meals.includes(reminderHour)) {
        schedule.meals.push(reminderHour);
      }
    });
  }

  // Activity: Based on most active hours
  if (patterns.mostActiveHours.length > 0) {
    const leastActiveHour = patterns.mostActiveHours[0];
    if (leastActiveHour >= 10 && leastActiveHour <= 18) {
      schedule.activity.push(leastActiveHour);
    }
  }

  // Mood: Evening for established users
  if (patterns.lifecycleStage !== 'newcomer' && patterns.totalDaysActive >= 7) {
    schedule.mood.push(20); // 8 PM
  }

  return schedule;
};

/**
 * Check if we should send a notification (rate limiting)
 */
export const shouldSendNotification = async (type) => {
  try {
    const history = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    const parsed = history ? JSON.parse(history) : {};

    const lastSent = parsed[type];
    if (!lastSent) return true;

    // Minimum intervals (in ms)
    const intervals = {
      hydration: 2 * 60 * 60 * 1000,  // 2 hours
      meal: 3 * 60 * 60 * 1000,       // 3 hours
      activity: 4 * 60 * 60 * 1000,   // 4 hours
      mood: 12 * 60 * 60 * 1000,      // 12 hours
    };

    const interval = intervals[type] || 3 * 60 * 60 * 1000;
    return Date.now() - lastSent > interval;
  } catch {
    return true;
  }
};

/**
 * Record that a notification was sent
 */
export const recordNotificationSent = async (type) => {
  try {
    const history = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    const parsed = history ? JSON.parse(history) : {};
    parsed[type] = Date.now();
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(parsed));
  } catch {
    // Ignore errors
  }
};

// ============================================================================
// RE-ENGAGEMENT - Only for inactive users with history
// ============================================================================

/**
 * Generate re-engagement message for inactive users
 * ONLY if user has meaningful history
 */
export const generateReengagementMessage = async () => {
  const patterns = await analyzeUserPatterns();
  if (!patterns) return null;

  // Only re-engage users who have actual history
  if (patterns.totalDaysActive < 3) return null;
  if (patterns.currentStreak > 0) return null; // Still active

  // Check when they were last active
  const daysSinceActive = Math.round((Date.now() - patterns.analyzedAt) / (24 * 60 * 60 * 1000));

  if (daysSinceActive >= 3 && daysSinceActive < 7) {
    return {
      title: "Your insights miss you 📊",
      body: `${patterns.totalDaysActive} days of data waiting. One log to pick up where you left off.`,
      data: { type: 'reengagement', action: 'open_dashboard', reason: 'inactive_3_days' },
    };
  }

  if (daysSinceActive >= 7 && patterns.longestStreak > 0) {
    return {
      title: "Remember that streak? 🔥",
      body: `You hit ${patterns.longestStreak} days once. Ready to beat it?`,
      data: { type: 'reengagement', action: 'open_dashboard', reason: 'inactive_7_days' },
    };
  }

  return null;
};

export default {
  analyzeUserPatterns,
  generateHydrationMessage,
  generateMealMessage,
  generateActivityMessage,
  generateMoodMessage,
  generateReengagementMessage,
  getOptimalNotificationTimes,
  shouldSendNotification,
  recordNotificationSent,
};
