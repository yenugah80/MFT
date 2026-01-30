/**
 * ============================================================================
 * Smart Notification Engine - Data-Driven Witty Messaging
 * ============================================================================
 *
 * KEY PRINCIPLE: Data-driven insights + Gen-Z playful personality.
 *
 * All notifications are generated from:
 * - User's actual logged data (hydration, meals, activity, mood)
 * - User's behavioral patterns (peak logging times, streaks, gaps)
 * - User's lifecycle stage (newcomer, building, established, expert)
 * - Real-time context (time since last log, pace vs goal)
 *
 * Personality characteristics:
 * - 70% playful Gen-Z energy, 30% clear and warm
 * - Never annoying - always relevant
 * - Contextual and personalized
 * - Action-oriented with clear CTAs
 * - Uses MessageFreshnessManager for variety (no repeats)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import {
  hydrationMessages,
  reminderMessages,
  streakMessages,
  engagementMessages,
  moodMessages,
  activityMessages,
} from '../utils/wittyMessages';
import { pickFresh } from './intelligence/MessageFreshnessManager';
import {
  RATE_LIMITS,
  DEFAULT_QUIET_HOURS,
  isQuietHours,
} from '../constants/notificationTypes';

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
 * Get time period for contextual messages
 */
const getTimePeriod = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
};

/**
 * Pick a fresh message from an array using freshness manager
 */
const pickFreshMessage = (arr, category) => {
  if (!arr || arr.length === 0) return null;
  try {
    return pickFresh(arr, category);
  } catch {
    return arr[Math.floor(Math.random() * arr.length)];
  }
};

/**
 * Generate hydration reminder based on ACTUAL user data
 * Returns null if no relevant data to base message on
 * Uses wittyMessages for Gen-Z playful personality
 */
export const generateHydrationMessage = async () => {
  const status = await fetchHydrationStatus();
  if (!status) return null;

  const { currentMl, goalMl, lastLogTime, logCount, streak } = status;
  const percentage = Math.round((currentMl / goalMl) * 100);
  const remaining = goalMl - currentMl;
  const hour = new Date().getHours();
  const timePeriod = getTimePeriod();

  // Calculate time since last log
  let minutesSinceLastLog = null;
  if (lastLogTime) {
    minutesSinceLastLog = Math.round((Date.now() - new Date(lastLogTime).getTime()) / 60000);
  }

  // NO LOGS TODAY - but only send if it's past 10am
  if (logCount === 0 && hour >= 10) {
    const timeMessages = reminderMessages.hydration[timePeriod] || reminderMessages.hydration.morning;
    const body = pickFreshMessage(timeMessages, `reminder.hydration.${timePeriod}`);
    return {
      title: "Day started, hydration hasn't 💧",
      body: body || "Your first glass kicks off the day. Ready when you are.",
      data: { type: 'hydration', action: 'open_hydration', reason: 'no_logs_today' },
    };
  }

  // GOAL ACHIEVED - Don't send notification here
  // HydrationTracker's MilestoneToast handles goal celebrations to avoid duplicates
  if (percentage >= 100) {
    return null;
  }

  // BEHIND PACE - Only if we have timing data
  if (minutesSinceLastLog !== null && minutesSinceLastLog > 120 && percentage < 80) {
    const hoursSince = Math.round(minutesSinceLastLog / 60);
    const urgentMessages = reminderMessages.hydration.urgent;
    const body = pickFreshMessage(urgentMessages, 'reminder.hydration.urgent');
    return {
      title: `${hoursSince}h since your last sip`,
      body: body ? `${body} ${remaining}ml to go!` : `${remaining}ml to go. A glass now keeps you on track.`,
      data: { type: 'hydration', action: 'open_hydration', reason: 'behind_pace', behindBy: remaining },
    };
  }

  // GOOD PROGRESS - Give encouragement
  if (percentage >= 75 && percentage < 100) {
    return {
      title: "Almost there! 💧",
      body: `Just ${remaining}ml more. ${percentage}% done - you absolute legend!`,
      data: { type: 'hydration', action: 'open_hydration', reason: 'almost_goal' },
    };
  }

  // MODERATE PROGRESS with context
  if (percentage >= 40 && percentage < 75 && hour >= 14) {
    const afternoonMessages = reminderMessages.hydration.afternoon;
    const body = pickFreshMessage(afternoonMessages, 'reminder.hydration.afternoon');
    return {
      title: "Afternoon hydration check",
      body: body ? `${body} ${remaining}ml to go!` : `${percentage}% done, ${remaining}ml to go.`,
      data: { type: 'hydration', action: 'open_hydration', reason: 'afternoon_check' },
    };
  }

  // If none of the above conditions, don't send a notification
  return null;
};

/**
 * Generate meal logging reminder based on ACTUAL user data
 * Returns null if no relevant data
 * Uses wittyMessages for Gen-Z playful personality
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

  // NO MEALS LOGGED - Contextual by time with witty messages
  if (mealsLogged === 0) {
    if (hour >= 9 && hour < 11) {
      const breakfastMessages = reminderMessages.nutrition.breakfast;
      const body = pickFreshMessage(breakfastMessages, 'reminder.nutrition.breakfast');
      return {
        title: "Breakfast fuel? 🍳",
        body: body || "What powered your morning? Log it in 10 seconds.",
        data: { type: 'meal', action: 'open_log', meal: 'breakfast' },
      };
    }
    if (hour >= 12 && hour < 14) {
      const lunchMessages = reminderMessages.nutrition.lunch;
      const body = pickFreshMessage(lunchMessages, 'reminder.nutrition.lunch');
      return {
        title: "Lunch o'clock! 🥗",
        body: body || "Your nutrition insights are waiting. Quick log keeps them accurate.",
        data: { type: 'meal', action: 'open_log', meal: 'lunch' },
      };
    }
    if (hour >= 18 && hour < 21) {
      const dinnerMessages = reminderMessages.nutrition.dinner;
      const body = pickFreshMessage(dinnerMessages, 'reminder.nutrition.dinner');
      return {
        title: "Dinner time! 🍽️",
        body: body || "End the day with a log. Your streak depends on it.",
        data: { type: 'meal', action: 'open_log', meal: 'dinner' },
      };
    }
    return null;
  }

  // STREAK REMINDER - Evening nudge with witty streak messages
  if (streak > 0 && hour >= 20 && mealsLogged < 2) {
    const streakMsg = streakMessages.atRisk(4); // 4 hours assumed
    return {
      title: `${streak}-day streak on the line! 🔥`,
      body: streakMsg || "One more meal log keeps it alive. Don't let it slip.",
      data: { type: 'meal', action: 'open_log', reason: 'streak_protection' },
    };
  }

  // CALORIE TRACKING - If they're tracking
  if (totalCalories > 0 && calorieGoal > 0) {
    const remaining = calorieGoal - totalCalories;
    if (remaining > 0 && remaining < 500 && hour >= 18) {
      return {
        title: "Room for a snack? 🍿",
        body: `${remaining} calories left in your budget. Treat yourself (mindfully)!`,
        data: { type: 'meal', action: 'open_log', reason: 'calorie_budget' },
      };
    }
  }

  return null;
};

/**
 * Generate activity reminder based on ACTUAL user data
 * Returns null if no relevant data
 * Uses wittyMessages for Gen-Z playful personality
 */
export const generateActivityMessage = async () => {
  const status = await fetchActivityStatus();
  if (!status) return null;

  const { steps, stepGoal } = status;
  const percentage = Math.round((steps / stepGoal) * 100);
  const hour = new Date().getHours();
  const timePeriod = getTimePeriod();

  // GOAL ACHIEVED - Celebrate!
  if (percentage >= 100) {
    return {
      title: "Step goal: CRUSHED! 🎯",
      body: `${steps.toLocaleString()} steps today. You absolute movement legend! 💪`,
      data: { type: 'activity', action: 'celebrate', reason: 'step_goal' },
    };
  }

  // LOW ACTIVITY - Time-based nudge with witty messages
  if (percentage < 30 && hour >= 14 && hour < 18) {
    const remaining = stepGoal - steps;
    const activityMessages = reminderMessages.activity[timePeriod] || reminderMessages.activity.afternoon;
    const body = pickFreshMessage(activityMessages, `reminder.activity.${timePeriod}`);
    return {
      title: "Movement break? 🚶",
      body: body ? `${body} ${remaining.toLocaleString()} steps to go!` : `${remaining.toLocaleString()} steps to go. Even a short walk helps.`,
      data: { type: 'activity', action: 'open_activity', reason: 'low_steps' },
    };
  }

  // CLOSE TO GOAL - Motivation boost
  if (percentage >= 80 && percentage < 100) {
    const remaining = stepGoal - steps;
    return {
      title: "So close! 👟",
      body: `Just ${remaining.toLocaleString()} more steps. You're literally almost there!`,
      data: { type: 'activity', action: 'open_activity', reason: 'almost_goal' },
    };
  }

  return null;
};

/**
 * Generate mood check-in based on ACTUAL user data
 * Only prompts if user has been logging mood consistently
 * Uses wittyMessages for Gen-Z playful personality
 */
export const generateMoodMessage = async () => {
  const patterns = await analyzeUserPatterns();
  if (!patterns) return null;

  // Only prompt mood check-in for established users who log regularly
  if (patterns.totalDaysActive < 7) return null;
  if (patterns.lifecycleStage === 'newcomer') return null;

  const hour = new Date().getHours();
  const timePeriod = getTimePeriod();

  // Time-based check-in with witty messages
  if (hour >= 19 && hour < 22) {
    const moodMessages = reminderMessages.mood[timePeriod] || reminderMessages.mood.evening;
    const body = pickFreshMessage(moodMessages, `reminder.mood.${timePeriod}`);
    return {
      title: "Quick vibe check 🌤️",
      body: body || "How's today treating you? 5 seconds to log, days of insights.",
      data: { type: 'mood', action: 'open_mood', reason: 'evening_checkin' },
    };
  }

  // Morning mood check for power users
  if (hour >= 8 && hour < 10 && patterns.lifecycleStage === 'expert') {
    const morningMessages = reminderMessages.mood.morning;
    const body = pickFreshMessage(morningMessages, 'reminder.mood.morning');
    return {
      title: "Morning mood check 🌅",
      body: body || "How are we starting today? Quick vibe log?",
      data: { type: 'mood', action: 'open_mood', reason: 'morning_checkin' },
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
 * Check if we should send a notification (rate limiting + quiet hours)
 */
export const shouldSendNotification = async (type, quietHours = null) => {
  try {
    // Check quiet hours first
    if (isQuietHours(quietHours || DEFAULT_QUIET_HOURS)) {
      console.log(`[SmartNotificationEngine] Quiet hours active - skipping ${type}`);
      return false;
    }

    const history = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    const parsed = history ? JSON.parse(history) : {};

    const lastSent = parsed[type];
    if (!lastSent) return true;

    // Use unified rate limits from constants
    const interval = RATE_LIMITS[type] || RATE_LIMITS.meal;
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

    // Clean up old entries (older than 7 days) to prevent storage bloat
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const cleaned = {};
    for (const [key, timestamp] of Object.entries(parsed)) {
      if (timestamp > sevenDaysAgo) {
        cleaned[key] = timestamp;
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(cleaned));
  } catch {
    // Ignore errors
  }
};

/**
 * Clear all notification history (useful for testing or reset)
 */
export const clearNotificationHistory = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_PATTERNS);
    console.log('[SmartNotificationEngine] Notification history cleared');
  } catch {
    // Ignore errors
  }
};

// ============================================================================
// ONBOARDING NUDGES - For new users (< 7 days)
// ============================================================================

/**
 * Generate onboarding nudge for new users
 * These are simpler, more welcoming messages for cold-start users
 * Returns null for established users (7+ days active)
 */
export const generateOnboardingNudge = async () => {
  const patterns = await analyzeUserPatterns();

  // Only for newcomers (< 7 days active)
  if (patterns && patterns.totalDaysActive >= 7) return null;

  const hour = new Date().getHours();
  const daysActive = patterns?.totalDaysActive || 0;

  // Day 1-2: Focus on getting first logs
  if (daysActive <= 2) {
    if (hour >= 8 && hour < 12) {
      return {
        title: "Welcome to your wellness journey! 🌱",
        body: "Log your first meal to start building healthy habits.",
        data: { type: 'onboarding', action: 'open_log', reason: 'first_meal_prompt' },
      };
    }
    if (hour >= 12 && hour < 18) {
      return {
        title: "Ready to track? 📱",
        body: "Just take a photo or type what you ate. Super quick!",
        data: { type: 'onboarding', action: 'open_log', reason: 'afternoon_intro' },
      };
    }
  }

  // Day 3-4: Encourage consistency
  if (daysActive >= 3 && daysActive <= 4) {
    if (hour >= 8 && hour < 10) {
      return {
        title: "Building momentum! 🚀",
        body: "Day " + daysActive + "! Each log teaches the app about your habits.",
        data: { type: 'onboarding', action: 'open_log', reason: 'consistency_prompt' },
      };
    }
  }

  // Day 5-6: Preview upcoming features
  if (daysActive >= 5 && daysActive <= 6) {
    if (hour >= 18 && hour < 21) {
      return {
        title: "Insights coming soon! 🔮",
        body: "Keep logging! After 7 days, you'll unlock personalized insights.",
        data: { type: 'onboarding', action: 'open_dashboard', reason: 'feature_preview' },
      };
    }
  }

  return null;
};

// ============================================================================
// RE-ENGAGEMENT - Only for inactive users with history
// ============================================================================

/**
 * Generate re-engagement message for inactive users
 * ONLY if user has meaningful history
 * Uses wittyMessages for Gen-Z playful personality
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
    const atRiskMessages = engagementMessages.atRisk;
    const body = pickFreshMessage(atRiskMessages, 'engagement.atRisk');
    return {
      title: "We miss you! 👋",
      body: body || `${patterns.totalDaysActive} days of data waiting. One log to pick up where you left off.`,
      data: { type: 'reengagement', action: 'open_dashboard', reason: 'inactive_3_days' },
    };
  }

  if (daysSinceActive >= 7 && patterns.longestStreak > 0) {
    const streakLostMsg = streakMessages.lost(patterns.longestStreak);
    return {
      title: "Remember that streak? 🔥",
      body: streakLostMsg || `You hit ${patterns.longestStreak} days once. Ready to beat it?`,
      data: { type: 'reengagement', action: 'open_dashboard', reason: 'inactive_7_days' },
    };
  }

  return null;
};

// ============================================================================
// CELEBRATION GENERATORS - For goal achievements and milestones
// ============================================================================

/**
 * Generate celebration message for achievements
 * Called when user completes goals, milestones, etc.
 *
 * Celebration types:
 * - hydration_goal: Daily water goal reached
 * - streak_milestone: Logging streak milestones (7, 14, 30, 50, 100 days)
 * - step_goal: Activity step goal reached
 * - first_log: User's very first food log
 * - first_water: User's very first water log
 * - meal_milestone: Meal logging milestones (10, 25, 50, 100, 250 meals)
 * - mood_streak: Mood logging consistency milestones
 * - calorie_goal: Daily calorie target hit
 * - macro_balance: Balanced macro distribution achieved
 */
export const generateCelebrationMessage = async (type, data = {}) => {
  switch (type) {
    case 'hydration_goal':
      return {
        title: hydrationMessages.goalReached(),
        body: data.streak > 1 ? `${data.streak} days of crushing it! Keep it going.` : 'Your body is loving this hydration energy.',
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'hydration_goal' },
      };

    case 'streak_milestone':
      return {
        title: streakMessages.milestone(data.days),
        body: `${data.days} days of consistency. You're officially in the elite club.`,
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'streak_milestone', days: data.days },
      };

    case 'step_goal':
      return {
        title: "Step goal: DESTROYED! 🏃",
        body: `${data.steps?.toLocaleString() || 'All'} steps done. Your legs are thanking you.`,
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'step_goal' },
      };

    case 'first_log':
      return {
        title: "First log! 🚀",
        body: "The journey of a thousand logs begins with this one. Welcome!",
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'first_log' },
      };

    case 'first_water':
      return {
        title: "Hydration started! 💧",
        body: "First sip logged. Your hydration journey begins now!",
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'first_water' },
      };

    case 'meal_milestone': {
      const mealMilestones = {
        10: "10 meals logged! You're building a solid habit.",
        25: "25 meals! Quarter-century of tracking excellence.",
        50: "50 meals! Half a hundred and going strong.",
        100: "100 meals! Triple digits. You're a logging legend now.",
        250: "250 meals! A quarter thousand. Absolutely unstoppable.",
        500: "500 MEALS! Half a thousand. You're in the hall of fame.",
      };
      const count = data.mealCount || 0;
      const message = mealMilestones[count] || `${count} meals logged! Keep it up!`;
      return {
        title: `${count} Meals Logged! 🎉`,
        body: message,
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'meal_milestone', mealCount: count },
      };
    }

    case 'mood_streak': {
      const days = data.days || 0;
      const moodStreakMessages = {
        3: "3 days of mood tracking! Self-awareness is a superpower.",
        7: "Week-long mood streak! You're becoming a feelings pro.",
        14: "2 weeks of vibes tracked! Pattern recognition unlocked.",
        30: "30 days! A month of understanding yourself better.",
      };
      const message = moodStreakMessages[days] || `${days} days of mood tracking! Amazing commitment.`;
      return {
        title: `${days}-Day Mood Streak! 🌟`,
        body: message,
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'mood_streak', days },
      };
    }

    case 'calorie_goal':
      return {
        title: "Calorie Goal Hit! 🎯",
        body: data.underOrOver === 'under'
          ? "Right on target. Balanced eating for the win!"
          : "You fueled your body well today. Nice work!",
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'calorie_goal' },
      };

    case 'macro_balance':
      return {
        title: "Macros Balanced! ⚖️",
        body: "Protein, carbs, and fats in harmony. That's the triple threat!",
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'macro_balance' },
      };

    case 'activity_goal':
      return {
        title: "Activity Goal Crushed! 💪",
        body: `${data.activeMinutes || 'Your'} active minutes today. Your body thanks you!`,
        data: { type: 'celebration', action: 'celebrate', celebrationType: 'activity_goal' },
      };

    default:
      return null;
  }
};

export default {
  analyzeUserPatterns,
  generateHydrationMessage,
  generateMealMessage,
  generateActivityMessage,
  generateMoodMessage,
  generateOnboardingNudge,
  generateReengagementMessage,
  generateCelebrationMessage,
  getOptimalNotificationTimes,
  shouldSendNotification,
  recordNotificationSent,
  clearNotificationHistory,
};
