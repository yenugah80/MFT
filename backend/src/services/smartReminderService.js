/**
 * Smart Reminder Service
 *
 * Intelligent notification system inspired by Zomato/Swiggy-style friendly reminders.
 * Learns user patterns and sends contextual, personalized nudges at optimal times.
 *
 * DESIGN PRINCIPLES:
 * 1. RESPECTFUL - Never spam, respect quiet hours, adapt to user engagement
 * 2. CONTEXTUAL - Messages based on actual user behavior and data
 * 3. PERSONALIZED - Tone and timing adapt to individual patterns
 * 4. HELPFUL - Genuinely useful reminders, not annoying
 * 5. SMART TIMING - Learn when users actually log and remind accordingly
 *
 * @module SmartReminderService
 */

import { db } from '../config/db.js';
import {
  foodLogTable,
  waterLogTable,
  moodLogTable,
  activityLogTable,
  profilesTable,
  nutritionGoalsTable,
  accountSettingsTable,
  gamificationTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import WittyMessageEngine from './wittyMessageEngine.js';

// ============================================================================
// REMINDER TYPES & CONFIGURATION
// ============================================================================

/**
 * Reminder categories
 */
export const REMINDER_TYPES = {
  // Hydration reminders
  HYDRATION_MORNING: 'hydration_morning',
  HYDRATION_MIDDAY: 'hydration_midday',
  HYDRATION_AFTERNOON: 'hydration_afternoon',
  HYDRATION_EVENING: 'hydration_evening',
  HYDRATION_GOAL_PROGRESS: 'hydration_goal_progress',
  HYDRATION_STREAK: 'hydration_streak',

  // Food reminders
  FOOD_BREAKFAST: 'food_breakfast',
  FOOD_LUNCH: 'food_lunch',
  FOOD_DINNER: 'food_dinner',
  FOOD_LOG_REMINDER: 'food_log_reminder',
  FOOD_STREAK: 'food_streak',

  // Mood reminders
  MOOD_CHECKIN_MORNING: 'mood_checkin_morning',
  MOOD_CHECKIN_AFTERNOON: 'mood_checkin_afternoon',
  MOOD_CHECKIN_EVENING: 'mood_checkin_evening',
  MOOD_POST_MEAL: 'mood_post_meal',

  // Activity reminders
  ACTIVITY_MOVEMENT: 'activity_movement',
  ACTIVITY_WALK: 'activity_walk',

  // Engagement & Motivation
  STREAK_AT_RISK: 'streak_at_risk',
  WEEKLY_SUMMARY: 'weekly_summary',
  ACHIEVEMENT_CLOSE: 'achievement_close',
  COMEBACK: 'comeback',
};

/**
 * Message tone styles
 */
export const TONE_STYLES = {
  FRIENDLY: 'friendly',
  MOTIVATING: 'motivating',
  GENTLE: 'gentle',
  PLAYFUL: 'playful',
  INFORMATIVE: 'informative',
};

/**
 * Default quiet hours (will be personalized based on user data)
 */
const DEFAULT_QUIET_HOURS = {
  start: 22, // 10 PM
  end: 7,    // 7 AM
};

/**
 * Reminder frequency limits (per day)
 */
export const FREQUENCY_LIMITS = {
  hydration: 4,
  food: 3,
  mood: 2,
  activity: 2,
  motivation: 1,
  total: 8, // Max notifications per day
};

// ============================================================================
// MESSAGE GENERATORS - Using WittyMessageEngine (Zomato-style)
// ============================================================================

/**
 * Get hydration message using WittyMessageEngine
 * @param {string} timeSlot - morning, midday, afternoon, evening, goal_reached
 * @param {object} context - { current, goal, remaining, percentage, streak, name }
 */
function getHydrationMessage(timeSlot, context = {}) {
  const { current = 0, goal = 2000, remaining, percentage, streak = 0, logCount = 0 } = context;
  const actualPercentage = percentage || Math.round((current / goal) * 100);
  const actualRemaining = remaining || (goal - current);

  // Use WittyMessageEngine for contextual message
  const wittyMessage = WittyMessageEngine.getHydrationMessage({
    percentage: actualPercentage,
    currentMl: current,
    goalMl: goal,
    streak,
    logCount,
    hoursSinceLastLog: context.hoursSinceLastLog,
  });

  if (wittyMessage) {
    return { ...wittyMessage, tone: TONE_STYLES.FRIENDLY };
  }

  // Fallback based on time slot
  const fallbacks = {
    morning: { title: "Morning hydration window 💧", body: "Your body just went 8 hours without water. It has requests." },
    midday: { title: "Hydration check-in", body: `You're at ${actualPercentage}%. The afternoon will thank you for drinking more now.` },
    afternoon: { title: "Afternoon energy hack", body: `${actualRemaining}ml more and you're set. Water now = energy later.` },
    evening: { title: "End-of-day push", body: `${actualRemaining}ml to go. You can salvage today's hydration goal.` },
    goal_reached: { title: "You did that 💪", body: "Hydration goal: demolished. Your cells are celebrating." },
  };

  return { ...fallbacks[timeSlot] || fallbacks.midday, tone: TONE_STYLES.FRIENDLY };
}

/**
 * Get food message using WittyMessageEngine
 * @param {string} mealType - breakfast, lunch, dinner, gentle_nudge, streak
 * @param {object} context - { streak, mealsLogged, name }
 */
function getFoodMessage(mealType, context = {}) {
  const { streak = 0, mealsLogged = 0, calorieGoal = 2000, totalCalories = 0 } = context;

  // Use WittyMessageEngine for contextual message
  const wittyMessage = WittyMessageEngine.getFoodMessage({
    mealsLogged,
    totalCalories,
    calorieGoal,
    streak,
  });

  if (wittyMessage) {
    return { ...wittyMessage, tone: TONE_STYLES.FRIENDLY };
  }

  // Fallback based on meal type
  const fallbacks = {
    breakfast: { title: "Breakfast happened, right?", body: "Log it before your brain forgets. Takes 10 seconds." },
    lunch: { title: "Lunch break?", body: "Your nutrition insights are only as good as your logs. No pressure." },
    dinner: { title: "Day's almost done", body: "Lock in that dinner before your streak ghosts you. 👻" },
    gentle_nudge: { title: "Quick log?", body: "One meal logged is better than zero. We don't judge." },
    streak: { title: `${streak}-day streak on the line`, body: "One meal log is all that stands between you and heartbreak. 💔" },
  };

  return { ...fallbacks[mealType] || fallbacks.gentle_nudge, tone: TONE_STYLES.FRIENDLY };
}

/**
 * Get mood message using WittyMessageEngine
 * @param {string} timeSlot - morning, afternoon, evening, post_meal
 * @param {object} context - { pattern }
 */
function getMoodMessage(timeSlot, context = {}) {
  const wittyMessage = WittyMessageEngine.getMoodMessage({
    hour: new Date().getHours(),
    pattern: context.pattern,
  });

  if (wittyMessage) {
    return { ...wittyMessage, tone: TONE_STYLES.GENTLE };
  }

  // Fallback based on time slot
  const fallbacks = {
    morning: { title: "Quick vibe check 🌤️", body: "How's today treating you? 5 seconds to log, days of insights." },
    afternoon: { title: "Afternoon pulse", body: "How's the day going? Quick check-in helps pattern detection." },
    evening: { title: "End of day feels", body: "Rate your day. It helps us connect the dots." },
    post_meal: { title: "Post-meal mood?", body: "How do you feel after eating? This data is gold for insights." },
  };

  return { ...fallbacks[timeSlot] || fallbacks.afternoon, tone: TONE_STYLES.GENTLE };
}

/**
 * Get motivation/engagement message using WittyMessageEngine
 * @param {string} type - streak_at_risk, comeback, achievement_close, weekly_summary
 * @param {object} context - { streak, daysInactive, remaining, achievement, meals, water }
 */
function getMotivationMessage(type, context = {}) {
  const { streak = 0, daysInactive = 0, previousStreak = 0 } = context;

  switch (type) {
    case 'streak_at_risk': {
      const streakMessage = WittyMessageEngine.getStreakMessage(streak);
      return {
        title: `${streak}-day streak at risk 🔥`,
        body: streakMessage?.body || "You didn't come this far to only come this far. Log something.",
        tone: TONE_STYLES.MOTIVATING,
      };
    }

    case 'comeback': {
      const reengageMessage = WittyMessageEngine.getReengagementMessage({
        daysInactive,
        previousStreak,
        totalDays: context.totalDays || 0,
      });
      return reengageMessage
        ? { ...reengageMessage, tone: TONE_STYLES.GENTLE }
        : { title: "Still here for you", body: "Whenever you're ready, we're ready. No pressure.", tone: TONE_STYLES.GENTLE };
    }

    case 'achievement_close':
      return {
        title: "So close! 🎯",
        body: `You're ${context.remaining} away from ${context.achievement}. Finish strong.`,
        tone: TONE_STYLES.MOTIVATING,
      };

    case 'weekly_summary':
      return {
        title: "Your week in review 📊",
        body: `${context.meals || 0} meals logged, ${context.water || 0}L water tracked. Your data is getting smarter.`,
        tone: TONE_STYLES.INFORMATIVE,
      };

    default:
      return { title: "Quick check-in", body: "Your health journey continues. One log at a time.", tone: TONE_STYLES.FRIENDLY };
  }
}

/**
 * Get activity message using WittyMessageEngine
 * @param {string} type - movement, walk, post_workout, sedentary
 * @param {object} context - { steps, stepGoal, sedentaryHours, activityType, duration }
 */
function getActivityMessage(type, context = {}) {
  const { steps = 0, stepGoal = 10000, sedentaryHours = 0, activityType, duration = 0 } = context;

  // Use WittyMessageEngine for contextual message
  const wittyMessage = WittyMessageEngine.getActivityMessage({
    steps,
    stepGoal,
    sedentaryHours,
    justWorkedOut: type === 'post_workout',
    activityType,
    duration,
  });

  if (wittyMessage) {
    return { ...wittyMessage, tone: TONE_STYLES.MOTIVATING };
  }

  // Fallback based on type
  const percentage = Math.round((steps / stepGoal) * 100);
  const fallbacks = {
    movement: { title: "Time to move 🏃", body: sedentaryHours >= 2 ? `${sedentaryHours}h sitting. Your body's filing a complaint.` : "A quick stretch does wonders. Science says so." },
    walk: { title: "Walk break?", body: `You're at ${percentage}% of your step goal. Every step counts.` },
    post_workout: { title: "Crushed it 💪", body: activityType ? `${activityType} logged! Your future self just sent a thank you note.` : "Activity logged! Momentum is a powerful thing." },
    sedentary: { title: "Sitting alert", body: `${sedentaryHours}+ hours seated. Even a 2-minute walk helps.` },
    gentle_nudge: { title: "Quick movement?", body: "30 seconds of stretching. Your spine will write you a thank-you letter." },
  };

  return { ...fallbacks[type] || fallbacks.gentle_nudge, tone: TONE_STYLES.MOTIVATING };
}

// Legacy message objects for backward compatibility (now wrap the functions)
const HYDRATION_MESSAGES = {
  morning: [{ getMessage: (ctx) => getHydrationMessage('morning', ctx) }],
  midday: [{ getMessage: (ctx) => getHydrationMessage('midday', ctx) }],
  afternoon: [{ getMessage: (ctx) => getHydrationMessage('afternoon', ctx) }],
  evening: [{ getMessage: (ctx) => getHydrationMessage('evening', ctx) }],
  goal_reached: [{ getMessage: (ctx) => getHydrationMessage('goal_reached', ctx) }],
};

const FOOD_MESSAGES = {
  breakfast: [{ getMessage: (ctx) => getFoodMessage('breakfast', ctx) }],
  lunch: [{ getMessage: (ctx) => getFoodMessage('lunch', ctx) }],
  dinner: [{ getMessage: (ctx) => getFoodMessage('dinner', ctx) }],
  gentle_nudge: [{ getMessage: (ctx) => getFoodMessage('gentle_nudge', ctx) }],
  streak: [{ getMessage: (ctx) => getFoodMessage('streak', ctx) }],
};

const MOOD_MESSAGES = {
  morning: [{ getMessage: (ctx) => getMoodMessage('morning', ctx) }],
  afternoon: [{ getMessage: (ctx) => getMoodMessage('afternoon', ctx) }],
  evening: [{ getMessage: (ctx) => getMoodMessage('evening', ctx) }],
  post_meal: [{ getMessage: (ctx) => getMoodMessage('post_meal', ctx) }],
};

const MOTIVATION_MESSAGES = {
  streak_at_risk: [{ getMessage: (ctx) => getMotivationMessage('streak_at_risk', ctx) }],
  comeback: [{ getMessage: (ctx) => getMotivationMessage('comeback', ctx) }],
  achievement_close: [{ getMessage: (ctx) => getMotivationMessage('achievement_close', ctx) }],
  weekly_summary: [{ getMessage: (ctx) => getMotivationMessage('weekly_summary', ctx) }],
};

const ACTIVITY_MESSAGES = {
  movement: [{ getMessage: (ctx) => getActivityMessage('movement', ctx) }],
  walk: [{ getMessage: (ctx) => getActivityMessage('walk', ctx) }],
  post_workout: [{ getMessage: (ctx) => getActivityMessage('post_workout', ctx) }],
  sedentary: [{ getMessage: (ctx) => getActivityMessage('sedentary', ctx) }],
  gentle_nudge: [{ getMessage: (ctx) => getActivityMessage('gentle_nudge', ctx) }],
};

// ============================================================================
// USER PATTERN LEARNING
// ============================================================================

/**
 * Learn user's typical logging patterns for smart timing
 *
 * @param {string} userId
 * @returns {Promise<UserPatterns>}
 */
export async function learnUserPatterns(userId) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all logs from last 30 days
    const [foodLogs, waterLogs, moodLogs] = await Promise.all([
      db.select({ loggedDate: foodLogTable.loggedDate })
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, thirtyDaysAgo)
        )),
      db.select({ loggedDate: waterLogTable.loggedDate })
        .from(waterLogTable)
        .where(and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, thirtyDaysAgo)
        )),
      db.select({ loggedDate: moodLogTable.loggedDate })
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, thirtyDaysAgo)
        )),
    ]);

    // Analyze hourly patterns
    const patterns = {
      food: { hourlyDistribution: new Array(24).fill(0), peakHours: [] },
      water: { hourlyDistribution: new Array(24).fill(0), peakHours: [] },
      mood: { hourlyDistribution: new Array(24).fill(0), peakHours: [] },
    };

    foodLogs.forEach(log => {
      const hour = new Date(log.loggedDate).getHours();
      patterns.food.hourlyDistribution[hour]++;
    });

    waterLogs.forEach(log => {
      const hour = new Date(log.loggedDate).getHours();
      patterns.water.hourlyDistribution[hour]++;
    });

    moodLogs.forEach(log => {
      const hour = new Date(log.loggedDate).getHours();
      patterns.mood.hourlyDistribution[hour]++;
    });

    // Find peak hours for each domain
    for (const domain of ['food', 'water', 'mood']) {
      const dist = patterns[domain].hourlyDistribution;
      patterns[domain].peakHours = dist
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .filter(h => h.count > 0)
        .map(h => h.hour);
    }

    // Calculate typical meal times
    const mealTimes = {
      breakfast: findTypicalMealTime(foodLogs, 5, 11),
      lunch: findTypicalMealTime(foodLogs, 11, 15),
      dinner: findTypicalMealTime(foodLogs, 17, 22),
    };

    // Detect quiet hours from patterns (when user never logs)
    const quietHours = detectQuietHours(patterns);

    // Calculate engagement level
    const totalLogs = foodLogs.length + waterLogs.length + moodLogs.length;
    const engagementLevel = totalLogs >= 100 ? 'high' :
                           totalLogs >= 30 ? 'medium' :
                           totalLogs >= 5 ? 'low' : 'new';

    return {
      userId,
      patterns,
      mealTimes,
      quietHours,
      engagementLevel,
      totalLogs,
      analyzedDays: 30,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[SmartReminder] learnUserPatterns error:', error);
    return getDefaultPatterns(userId);
  }
}

/**
 * Find typical meal time for a meal type
 */
function findTypicalMealTime(logs, startHour, endHour) {
  const relevantLogs = logs.filter(log => {
    const hour = new Date(log.loggedDate).getHours();
    return hour >= startHour && hour < endHour;
  });

  if (relevantLogs.length < 3) {
    return { hour: Math.floor((startHour + endHour) / 2), confidence: 'low' };
  }

  const hours = relevantLogs.map(log => new Date(log.loggedDate).getHours());
  const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);

  return {
    hour: avgHour,
    confidence: relevantLogs.length >= 10 ? 'high' : 'medium',
  };
}

/**
 * Detect quiet hours from user patterns
 */
function detectQuietHours(patterns) {
  const combined = patterns.food.hourlyDistribution.map((count, hour) =>
    count + patterns.water.hourlyDistribution[hour] + patterns.mood.hourlyDistribution[hour]
  );

  // Find the longest stretch of zero/low activity
  let longestQuietStart = 22;
  let longestQuietEnd = 7;

  // Look for hours with very low activity
  const quietThreshold = Math.max(...combined) * 0.1;
  const quietHoursSet = combined.map((count, hour) => count <= quietThreshold ? hour : -1).filter(h => h >= 0);

  if (quietHoursSet.length >= 4) {
    // Find contiguous quiet periods
    quietHoursSet.sort((a, b) => a - b);
    // Simple heuristic: use typical sleep hours if detected
    if (quietHoursSet.includes(22) || quietHoursSet.includes(23) || quietHoursSet.includes(0)) {
      longestQuietStart = Math.min(...quietHoursSet.filter(h => h >= 20 || h <= 8));
      longestQuietEnd = Math.max(...quietHoursSet.filter(h => h >= 20 || h <= 8));
    }
  }

  return {
    start: longestQuietStart,
    end: longestQuietEnd,
    detected: quietHoursSet.length >= 4,
  };
}

/**
 * Get default patterns for new users
 */
function getDefaultPatterns(userId) {
  return {
    userId,
    patterns: {
      food: { hourlyDistribution: new Array(24).fill(0), peakHours: [8, 13, 19] },
      water: { hourlyDistribution: new Array(24).fill(0), peakHours: [9, 14, 17] },
      mood: { hourlyDistribution: new Array(24).fill(0), peakHours: [8, 15, 21] },
    },
    mealTimes: {
      breakfast: { hour: 8, confidence: 'default' },
      lunch: { hour: 13, confidence: 'default' },
      dinner: { hour: 19, confidence: 'default' },
    },
    quietHours: DEFAULT_QUIET_HOURS,
    engagementLevel: 'new',
    totalLogs: 0,
    analyzedDays: 0,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// REMINDER SCHEDULING
// ============================================================================

/**
 * Get smart reminders for a user based on their patterns and current state
 *
 * @param {string} userId
 * @returns {Promise<ScheduledReminder[]>}
 */
export async function getSmartReminders(userId) {
  try {
    // Get user data in parallel
    const [patterns, profile, goals, gamification, todayStats] = await Promise.all([
      learnUserPatterns(userId),
      getProfileData(userId),
      getGoalsData(userId),
      getGamificationData(userId),
      getTodayStats(userId),
    ]);

    const reminders = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Check if we're in quiet hours
    if (isQuietHour(currentHour, patterns.quietHours)) {
      return []; // No reminders during quiet hours
    }

    // Get user's name for personalization
    const userName = profile?.fullName?.split(' ')[0] || 'there';

    // Check notification preferences
    const notificationPrefs = await getNotificationPreferences(userId);
    if (!notificationPrefs.enabled) {
      return [];
    }

    // Generate reminders based on current time and user state
    const context = {
      userName,
      currentHour,
      patterns,
      goals,
      gamification,
      todayStats,
      notificationPrefs,
    };

    // Hydration reminders
    if (notificationPrefs.hydration !== false) {
      const hydrationReminders = generateHydrationReminders(context);
      reminders.push(...hydrationReminders);
    }

    // Food reminders
    if (notificationPrefs.food !== false) {
      const foodReminders = generateFoodReminders(context);
      reminders.push(...foodReminders);
    }

    // Mood reminders
    if (notificationPrefs.mood !== false) {
      const moodReminders = generateMoodReminders(context);
      reminders.push(...moodReminders);
    }

    // Motivation/engagement reminders
    if (notificationPrefs.motivation !== false) {
      const motivationReminders = generateMotivationReminders(context);
      reminders.push(...motivationReminders);
    }

    // Activity reminders
    if (notificationPrefs.activity !== false) {
      const activityReminders = generateActivityReminders(context);
      reminders.push(...activityReminders);
    }

    // Sort by priority and limit total
    reminders.sort((a, b) => a.priority - b.priority);

    return reminders.slice(0, FREQUENCY_LIMITS.total);
  } catch (error) {
    console.error('[SmartReminder] getSmartReminders error:', error);
    return [];
  }
}

/**
 * Check if current hour is within quiet hours
 */
function isQuietHour(hour, quietHours) {
  const { start, end } = quietHours;
  if (start > end) {
    // Quiet hours span midnight (e.g., 22:00 to 07:00)
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

/**
 * Generate hydration reminders
 */
function generateHydrationReminders(context) {
  const { currentHour, todayStats, goals, userName } = context;
  const reminders = [];

  const waterGoal = parseFloat(goals?.waterLiters) || 2.0;
  const waterLogged = todayStats.water.totalLiters;
  const percentage = Math.round((waterLogged / waterGoal) * 100);
  const remaining = Math.max(0, waterGoal - waterLogged);
  const remainingMl = Math.round(remaining * 1000);

  // Already hit goal today
  if (waterLogged >= waterGoal) {
    return []; // Don't remind if goal is met
  }

  // Morning reminder (7-9 AM)
  if (currentHour >= 7 && currentHour <= 9 && todayStats.water.totalLogs === 0) {
    const template = selectRandomTemplate(HYDRATION_MESSAGES.morning);
    reminders.push({
      type: REMINDER_TYPES.HYDRATION_MORNING,
      ...formatTemplate(template, { name: userName }),
      priority: 2,
      scheduledFor: null, // Now
    });
  }

  // Midday reminder (11 AM - 1 PM)
  if (currentHour >= 11 && currentHour <= 13 && percentage < 40) {
    const template = selectRandomTemplate(HYDRATION_MESSAGES.midday);
    reminders.push({
      type: REMINDER_TYPES.HYDRATION_MIDDAY,
      ...formatTemplate(template, {
        time: formatTime(currentHour),
        current: Math.round(waterLogged * 1000),
        percentage,
      }),
      priority: 3,
      scheduledFor: null,
    });
  }

  // Afternoon reminder (3-5 PM)
  if (currentHour >= 15 && currentHour <= 17 && percentage < 70) {
    const template = selectRandomTemplate(HYDRATION_MESSAGES.afternoon);
    reminders.push({
      type: REMINDER_TYPES.HYDRATION_AFTERNOON,
      ...formatTemplate(template, { remaining: remainingMl }),
      priority: 3,
      scheduledFor: null,
    });
  }

  // Evening reminder (7-9 PM)
  if (currentHour >= 19 && currentHour <= 21 && percentage < 90) {
    const template = selectRandomTemplate(HYDRATION_MESSAGES.evening);
    reminders.push({
      type: REMINDER_TYPES.HYDRATION_EVENING,
      ...formatTemplate(template, { percentage, remaining: remainingMl }),
      priority: 4,
      scheduledFor: null,
    });
  }

  return reminders;
}

/**
 * Generate food reminders
 */
function generateFoodReminders(context) {
  const { currentHour, todayStats, patterns, gamification, userName } = context;
  const reminders = [];

  const mealsLogged = todayStats.food.totalMeals;
  const streak = gamification?.streak || 0;

  // Breakfast reminder (based on user's typical time)
  const breakfastTime = patterns.mealTimes.breakfast.hour;
  if (currentHour >= breakfastTime && currentHour <= breakfastTime + 2) {
    const hasBreakfast = todayStats.food.mealTypes?.breakfast > 0;
    if (!hasBreakfast) {
      const template = selectRandomTemplate(FOOD_MESSAGES.breakfast);
      reminders.push({
        type: REMINDER_TYPES.FOOD_BREAKFAST,
        ...formatTemplate(template, { name: userName }),
        priority: 2,
        scheduledFor: null,
      });
    }
  }

  // Lunch reminder
  const lunchTime = patterns.mealTimes.lunch.hour;
  if (currentHour >= lunchTime && currentHour <= lunchTime + 2) {
    const hasLunch = todayStats.food.mealTypes?.lunch > 0;
    if (!hasLunch) {
      const template = selectRandomTemplate(FOOD_MESSAGES.lunch);
      reminders.push({
        type: REMINDER_TYPES.FOOD_LUNCH,
        ...formatTemplate(template, { name: userName }),
        priority: 3,
        scheduledFor: null,
      });
    }
  }

  // Dinner reminder
  const dinnerTime = patterns.mealTimes.dinner.hour;
  if (currentHour >= dinnerTime && currentHour <= dinnerTime + 2) {
    const hasDinner = todayStats.food.mealTypes?.dinner > 0;
    if (!hasDinner) {
      const template = selectRandomTemplate(FOOD_MESSAGES.dinner);
      reminders.push({
        type: REMINDER_TYPES.FOOD_DINNER,
        ...formatTemplate(template, { name: userName }),
        priority: 3,
        scheduledFor: null,
      });
    }
  }

  // Streak protection reminder (evening if no logs today)
  if (currentHour >= 19 && currentHour <= 21 && mealsLogged === 0 && streak >= 3) {
    const template = selectRandomTemplate(FOOD_MESSAGES.streak);
    reminders.push({
      type: REMINDER_TYPES.FOOD_STREAK,
      ...formatTemplate(template, { streak }),
      priority: 1, // High priority for streak protection
      scheduledFor: null,
    });
  }

  // Gentle nudge if no logs by late afternoon
  if (currentHour >= 16 && currentHour <= 18 && mealsLogged === 0 && patterns.engagementLevel !== 'new') {
    const template = selectRandomTemplate(FOOD_MESSAGES.gentle_nudge);
    reminders.push({
      type: REMINDER_TYPES.FOOD_LOG_REMINDER,
      ...formatTemplate(template, {}),
      priority: 5,
      scheduledFor: null,
    });
  }

  return reminders;
}

/**
 * Generate mood reminders
 */
function generateMoodReminders(context) {
  const { currentHour, todayStats, patterns, userName } = context;
  const reminders = [];

  const moodLogsToday = todayStats.mood.totalLogs;

  // Only remind if engaged (not every user wants mood tracking)
  if (patterns.engagementLevel === 'new' && patterns.patterns.mood.peakHours.length === 0) {
    return reminders; // New user who hasn't shown interest in mood tracking
  }

  // Morning mood check (8-10 AM)
  if (currentHour >= 8 && currentHour <= 10 && moodLogsToday === 0) {
    const template = selectRandomTemplate(MOOD_MESSAGES.morning);
    reminders.push({
      type: REMINDER_TYPES.MOOD_CHECKIN_MORNING,
      ...formatTemplate(template, { name: userName }),
      priority: 4,
      scheduledFor: null,
    });
  }

  // Afternoon mood check (2-4 PM)
  if (currentHour >= 14 && currentHour <= 16 && moodLogsToday <= 1) {
    const template = selectRandomTemplate(MOOD_MESSAGES.afternoon);
    reminders.push({
      type: REMINDER_TYPES.MOOD_CHECKIN_AFTERNOON,
      ...formatTemplate(template, {}),
      priority: 5,
      scheduledFor: null,
    });
  }

  // Evening mood check (8-10 PM)
  if (currentHour >= 20 && currentHour <= 22 && moodLogsToday <= 2) {
    const template = selectRandomTemplate(MOOD_MESSAGES.evening);
    reminders.push({
      type: REMINDER_TYPES.MOOD_CHECKIN_EVENING,
      ...formatTemplate(template, {}),
      priority: 5,
      scheduledFor: null,
    });
  }

  return reminders;
}

/**
 * Generate motivation reminders
 */
function generateMotivationReminders(context) {
  const { currentHour, gamification, todayStats, patterns } = context;
  const reminders = [];

  const streak = gamification?.streak || 0;
  const daysSinceLastLog = calculateDaysSinceLastLog(todayStats);

  // Streak at risk (evening, has streak, no logs today)
  if (currentHour >= 20 && currentHour <= 22 && streak >= 3) {
    const totalLogsToday = todayStats.food.totalMeals + todayStats.water.totalLogs + todayStats.mood.totalLogs;
    if (totalLogsToday === 0) {
      const template = selectRandomTemplate(MOTIVATION_MESSAGES.streak_at_risk);
      reminders.push({
        type: REMINDER_TYPES.STREAK_AT_RISK,
        ...formatTemplate(template, { streak }),
        priority: 1, // Highest priority
        scheduledFor: null,
      });
    }
  }

  // Comeback reminder (if user hasn't logged in 2+ days)
  if (daysSinceLastLog >= 2 && daysSinceLastLog <= 7 && currentHour >= 10 && currentHour <= 14) {
    const template = selectRandomTemplate(MOTIVATION_MESSAGES.comeback);
    reminders.push({
      type: REMINDER_TYPES.COMEBACK,
      ...formatTemplate(template, {}),
      priority: 3,
      scheduledFor: null,
    });
  }

  return reminders;
}

/**
 * Generate activity reminders
 */
function generateActivityReminders(context) {
  const { currentHour, todayStats, patterns, userName } = context;
  const reminders = [];

  const activityLogsToday = todayStats.activity?.totalLogs || 0;
  const steps = todayStats.activity?.steps || 0;
  const stepGoal = context.goals?.stepGoal || 10000;
  const sedentaryHours = todayStats.activity?.sedentaryHours || 0;

  // Only remind if user has shown interest in activity tracking
  if (patterns.engagementLevel === 'new' && activityLogsToday === 0) {
    return reminders; // New user who hasn't engaged with activity
  }

  // Morning movement prompt (9-10 AM)
  if (currentHour >= 9 && currentHour <= 10 && steps < stepGoal * 0.1) {
    const template = selectRandomTemplate(ACTIVITY_MESSAGES.movement);
    reminders.push({
      type: REMINDER_TYPES.ACTIVITY_MOVEMENT,
      ...formatTemplate(template, { name: userName, sedentaryHours }),
      priority: 4,
      scheduledFor: null,
    });
  }

  // Midday walk reminder (12-2 PM)
  if (currentHour >= 12 && currentHour <= 14 && steps < stepGoal * 0.4) {
    const template = selectRandomTemplate(ACTIVITY_MESSAGES.walk);
    reminders.push({
      type: REMINDER_TYPES.ACTIVITY_WALK,
      ...formatTemplate(template, { steps, stepGoal, percentage: Math.round((steps / stepGoal) * 100) }),
      priority: 4,
      scheduledFor: null,
    });
  }

  // Afternoon sedentary alert (3-5 PM)
  if (currentHour >= 15 && currentHour <= 17 && sedentaryHours >= 3) {
    const template = selectRandomTemplate(ACTIVITY_MESSAGES.sedentary);
    reminders.push({
      type: REMINDER_TYPES.ACTIVITY_MOVEMENT,
      ...formatTemplate(template, { sedentaryHours }),
      priority: 3,
      scheduledFor: null,
    });
  }

  // Evening step goal push (6-8 PM)
  if (currentHour >= 18 && currentHour <= 20 && steps >= stepGoal * 0.6 && steps < stepGoal) {
    const remaining = stepGoal - steps;
    const template = selectRandomTemplate(ACTIVITY_MESSAGES.gentle_nudge);
    reminders.push({
      type: REMINDER_TYPES.ACTIVITY_WALK,
      ...formatTemplate(template, { steps, stepGoal, remaining }),
      priority: 5,
      scheduledFor: null,
    });
  }

  return reminders;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Select a random template from array
 */
function selectRandomTemplate(templates) {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Format template with variables
 */
function formatTemplate(template, variables) {
  let title = template.title;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    title = title.replace(new RegExp(placeholder, 'g'), value);
    body = body.replace(new RegExp(placeholder, 'g'), value);
  }

  return {
    title,
    body,
    tone: template.tone,
  };
}

/**
 * Format time for display
 */
function formatTime(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

/**
 * Calculate days since last log
 */
function calculateDaysSinceLastLog(todayStats) {
  // If there are logs today, return 0
  if (todayStats.food.totalMeals > 0 || todayStats.water.totalLogs > 0 || todayStats.mood.totalLogs > 0) {
    return 0;
  }
  // This would need last log date from stats - simplified for now
  return 1;
}

/**
 * Get profile data for user
 */
async function getProfileData(userId) {
  try {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);
    return profile;
  } catch {
    return null;
  }
}

/**
 * Get goals data for user
 */
async function getGoalsData(userId) {
  try {
    const [goals] = await db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId))
      .limit(1);
    return goals;
  } catch {
    return null;
  }
}

/**
 * Get gamification data for user
 */
async function getGamificationData(userId) {
  try {
    const [gamification] = await db
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1);
    return gamification;
  } catch {
    return null;
  }
}

/**
 * Get today's stats for all domains
 */
async function getTodayStats(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const [foodStats, waterStats, moodStats, activityStats] = await Promise.all([
      // Food stats
      db.select({
        totalMeals: sql`COUNT(*)::int`,
        totalCalories: sql`COALESCE(SUM(${foodLogTable.calories}), 0)::int`,
      })
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          gte(foodLogTable.loggedDate, today),
          lte(foodLogTable.loggedDate, tomorrow)
        )),

      // Water stats
      db.select({
        totalLogs: sql`COUNT(*)::int`,
        totalLiters: sql`COALESCE(SUM(${waterLogTable.amountLiters}), 0)`,
      })
        .from(waterLogTable)
        .where(and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, today),
          lte(waterLogTable.loggedDate, tomorrow)
        )),

      // Mood stats
      db.select({
        totalLogs: sql`COUNT(*)::int`,
      })
        .from(moodLogTable)
        .where(and(
          eq(moodLogTable.userId, userId),
          gte(moodLogTable.loggedDate, today),
          lte(moodLogTable.loggedDate, tomorrow)
        )),

      // Activity stats
      db.select({
        totalLogs: sql`COUNT(*)::int`,
        totalDuration: sql`COALESCE(SUM(${activityLogTable.durationMinutes}), 0)::int`,
        totalCaloriesBurned: sql`COALESCE(SUM(${activityLogTable.caloriesBurned}), 0)::int`,
      })
        .from(activityLogTable)
        .where(and(
          eq(activityLogTable.userId, userId),
          gte(activityLogTable.loggedAt, today),
          lte(activityLogTable.loggedAt, tomorrow)
        )),
    ]);

    // Get meal type breakdown
    const mealTypes = await db
      .select({
        mealType: foodLogTable.mealType,
        count: sql`COUNT(*)::int`,
      })
      .from(foodLogTable)
      .where(and(
        eq(foodLogTable.userId, userId),
        gte(foodLogTable.loggedDate, today),
        lte(foodLogTable.loggedDate, tomorrow)
      ))
      .groupBy(foodLogTable.mealType);

    const mealTypeCounts = {};
    mealTypes.forEach(mt => {
      mealTypeCounts[mt.mealType || 'unspecified'] = mt.count;
    });

    return {
      food: {
        totalMeals: foodStats[0]?.totalMeals || 0,
        totalCalories: foodStats[0]?.totalCalories || 0,
        mealTypes: mealTypeCounts,
      },
      water: {
        totalLogs: waterStats[0]?.totalLogs || 0,
        totalLiters: parseFloat(waterStats[0]?.totalLiters) || 0,
      },
      mood: {
        totalLogs: moodStats[0]?.totalLogs || 0,
      },
      activity: {
        totalLogs: activityStats[0]?.totalLogs || 0,
        totalDuration: activityStats[0]?.totalDuration || 0,
        totalCaloriesBurned: activityStats[0]?.totalCaloriesBurned || 0,
        steps: 0, // Would need integration with step tracking service
        sedentaryHours: 0, // Would need integration with activity tracking
      },
    };
  } catch (error) {
    console.error('[SmartReminder] getTodayStats error:', error);
    return {
      food: { totalMeals: 0, totalCalories: 0, mealTypes: {} },
      water: { totalLogs: 0, totalLiters: 0 },
      mood: { totalLogs: 0 },
      activity: { totalLogs: 0, totalDuration: 0, totalCaloriesBurned: 0, steps: 0, sedentaryHours: 0 },
    };
  }
}

/**
 * Get notification preferences for user
 */
async function getNotificationPreferences(userId) {
  try {
    const [settings] = await db
      .select()
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId))
      .limit(1);

    if (!settings?.notifications) {
      return {
        enabled: true,
        hydration: true,
        food: true,
        mood: true,
        motivation: true,
        activity: true,
      };
    }

    const notifs = settings.notifications;
    return {
      enabled: notifs.enabled !== false,
      hydration: notifs.hydration !== false,
      food: notifs.food !== false,
      mood: notifs.mood !== false,
      motivation: notifs.motivation !== false,
      activity: notifs.activity !== false,
    };
  } catch {
    return {
      enabled: true,
      hydration: true,
      food: true,
      mood: true,
      motivation: true,
      activity: true,
    };
  }
}

// ============================================================================
// SCHEDULING & DELIVERY
// ============================================================================

/**
 * Schedule reminders for a user based on their patterns
 * Returns an array of scheduled notification times for the next 24 hours
 *
 * @param {string} userId
 * @returns {Promise<ScheduledNotification[]>}
 */
export async function scheduleUserReminders(userId) {
  try {
    const patterns = await learnUserPatterns(userId);
    const preferences = await getNotificationPreferences(userId);

    if (!preferences.enabled) {
      return [];
    }

    const scheduled = [];
    const now = new Date();
    const currentHour = now.getHours();

    // Schedule hydration reminders based on patterns
    if (preferences.hydration) {
      const hydrationHours = [8, 11, 15, 19]; // Default hours
      for (const hour of hydrationHours) {
        if (hour > currentHour && !isQuietHour(hour, patterns.quietHours)) {
          scheduled.push({
            type: 'hydration',
            scheduledHour: hour,
            estimatedTime: getScheduledTime(hour),
          });
        }
      }
    }

    // Schedule food reminders based on learned meal times
    if (preferences.food) {
      const mealTimes = patterns.mealTimes;
      for (const [meal, timing] of Object.entries(mealTimes)) {
        const reminderHour = timing.hour;
        if (reminderHour > currentHour && !isQuietHour(reminderHour, patterns.quietHours)) {
          scheduled.push({
            type: 'food',
            meal,
            scheduledHour: reminderHour,
            estimatedTime: getScheduledTime(reminderHour),
          });
        }
      }
    }

    // Schedule mood check-ins
    if (preferences.mood && patterns.engagementLevel !== 'new') {
      const moodHours = [9, 15, 20];
      for (const hour of moodHours) {
        if (hour > currentHour && !isQuietHour(hour, patterns.quietHours)) {
          scheduled.push({
            type: 'mood',
            scheduledHour: hour,
            estimatedTime: getScheduledTime(hour),
          });
        }
      }
    }

    return scheduled;
  } catch (error) {
    console.error('[SmartReminder] scheduleUserReminders error:', error);
    return [];
  }
}

/**
 * Get scheduled time for an hour
 */
function getScheduledTime(hour) {
  const scheduled = new Date();
  scheduled.setHours(hour, 0, 0, 0);
  if (scheduled < new Date()) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  return scheduled.toISOString();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  REMINDER_TYPES,
  TONE_STYLES,
  FREQUENCY_LIMITS,
  learnUserPatterns,
  getSmartReminders,
  scheduleUserReminders,
};
