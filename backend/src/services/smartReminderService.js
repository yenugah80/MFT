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
  profilesTable,
  nutritionGoalsTable,
  accountSettingsTable,
  gamificationTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

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
// MESSAGE TEMPLATES - Zomato/Swiggy Inspired
// ============================================================================

/**
 * Hydration message templates - warm, friendly, varied
 */
const HYDRATION_MESSAGES = {
  morning: [
    {
      title: "Good morning! ☀️",
      body: "A glass of water is the perfect way to start your day. Your body will thank you!",
      tone: TONE_STYLES.FRIENDLY,
    },
    {
      title: "Rise and hydrate! 💧",
      body: "After a night's rest, your body is thirsty. Start with a refreshing glass of water.",
      tone: TONE_STYLES.GENTLE,
    },
    {
      title: "Morning check-in",
      body: "Hey {{name}}, had your first glass today? A hydrated morning = productive day!",
      tone: TONE_STYLES.FRIENDLY,
    },
  ],
  midday: [
    {
      title: "Hydration break! 🌊",
      body: "It's {{time}} - perfect time for a water break. You've had {{current}}ml so far!",
      tone: TONE_STYLES.INFORMATIVE,
    },
    {
      title: "Quick reminder",
      body: "Your water bottle misses you! Take a quick sip and keep going strong.",
      tone: TONE_STYLES.PLAYFUL,
    },
    {
      title: "Midday refresh",
      body: "Staying hydrated helps you stay focused. You're {{percentage}}% to your goal!",
      tone: TONE_STYLES.MOTIVATING,
    },
  ],
  afternoon: [
    {
      title: "Afternoon boost! 💪",
      body: "Feeling that afternoon slump? Water can help! You need {{remaining}}ml more today.",
      tone: TONE_STYLES.MOTIVATING,
    },
    {
      title: "Keep it flowing",
      body: "Great progress today! Just {{remaining}}ml to go. You've got this!",
      tone: TONE_STYLES.FRIENDLY,
    },
    {
      title: "Hydration check",
      body: "Tea, coffee, or water - whatever works for you! Just keep those fluids coming.",
      tone: TONE_STYLES.GENTLE,
    },
  ],
  evening: [
    {
      title: "Evening wind-down 🌙",
      body: "One more glass before winding down? You're at {{percentage}}% of today's goal.",
      tone: TONE_STYLES.GENTLE,
    },
    {
      title: "Almost there!",
      body: "Just {{remaining}}ml to hit your hydration goal. A herbal tea counts too!",
      tone: TONE_STYLES.MOTIVATING,
    },
  ],
  goal_reached: [
    {
      title: "Goal achieved! 🎉",
      body: "You hit your hydration goal for today! Keep up the amazing work, {{name}}!",
      tone: TONE_STYLES.FRIENDLY,
    },
    {
      title: "Hydration champion! 💧",
      body: "{{liters}}L logged today - you're crushing your water goals!",
      tone: TONE_STYLES.PLAYFUL,
    },
  ],
};

/**
 * Food logging message templates
 */
const FOOD_MESSAGES = {
  breakfast: [
    {
      title: "Breakfast time! 🍳",
      body: "Had your morning meal? Log it to track your nutrition journey.",
      tone: TONE_STYLES.FRIENDLY,
    },
    {
      title: "Good morning, {{name}}!",
      body: "Starting the day right? Don't forget to log your breakfast!",
      tone: TONE_STYLES.GENTLE,
    },
  ],
  lunch: [
    {
      title: "Lunch check-in 🥗",
      body: "Enjoying your midday meal? Log it to stay on top of your goals.",
      tone: TONE_STYLES.FRIENDLY,
    },
    {
      title: "Midday nourishment",
      body: "What's fueling your afternoon? Log your lunch when you get a chance!",
      tone: TONE_STYLES.GENTLE,
    },
  ],
  dinner: [
    {
      title: "Dinner time! 🍽️",
      body: "Wrapping up your eating for today? Log your dinner to complete your food diary.",
      tone: TONE_STYLES.FRIENDLY,
    },
    {
      title: "Evening meal",
      body: "What's on your plate tonight? Quick log takes just seconds!",
      tone: TONE_STYLES.GENTLE,
    },
  ],
  gentle_nudge: [
    {
      title: "Forgot to log?",
      body: "No pressure! When you're ready, your food diary is waiting for you.",
      tone: TONE_STYLES.GENTLE,
    },
    {
      title: "Quick catch-up",
      body: "Haven't logged today yet - no worries! Even one meal logged helps.",
      tone: TONE_STYLES.FRIENDLY,
    },
  ],
  streak: [
    {
      title: "🔥 {{streak}} day streak!",
      body: "Amazing consistency! Log today's meals to keep your streak going.",
      tone: TONE_STYLES.MOTIVATING,
    },
    {
      title: "Streak alert! 🔥",
      body: "You've logged for {{streak}} days straight! Don't break the chain!",
      tone: TONE_STYLES.PLAYFUL,
    },
  ],
};

/**
 * Mood check-in message templates
 */
const MOOD_MESSAGES = {
  morning: [
    {
      title: "How are you feeling? 🌅",
      body: "Take a moment to check in with yourself. How did you wake up today?",
      tone: TONE_STYLES.GENTLE,
    },
    {
      title: "Morning mood check",
      body: "A quick mood log helps us understand how your nutrition affects you!",
      tone: TONE_STYLES.INFORMATIVE,
    },
  ],
  afternoon: [
    {
      title: "Afternoon check-in 🌤️",
      body: "How's your energy? A quick mood log helps track your patterns.",
      tone: TONE_STYLES.FRIENDLY,
    },
    {
      title: "How are you doing?",
      body: "Midday reflections help us spot food-mood connections for you.",
      tone: TONE_STYLES.GENTLE,
    },
  ],
  evening: [
    {
      title: "End of day reflection 🌙",
      body: "How was your day overall? Log your mood before winding down.",
      tone: TONE_STYLES.GENTLE,
    },
    {
      title: "Evening check-in",
      body: "Looking back at today - how are you feeling? Quick log helps!",
      tone: TONE_STYLES.FRIENDLY,
    },
  ],
  post_meal: [
    {
      title: "Post-meal check-in",
      body: "How do you feel after your meal? This helps us find patterns!",
      tone: TONE_STYLES.INFORMATIVE,
    },
  ],
};

/**
 * Engagement & motivation messages
 */
const MOTIVATION_MESSAGES = {
  streak_at_risk: [
    {
      title: "Your streak needs you! 🔥",
      body: "You have a {{streak}} day streak - just one log today keeps it alive!",
      tone: TONE_STYLES.MOTIVATING,
    },
    {
      title: "Don't let it slip!",
      body: "{{streak}} days of progress is worth protecting. Log anything today!",
      tone: TONE_STYLES.FRIENDLY,
    },
  ],
  comeback: [
    {
      title: "We miss you! 💚",
      body: "It's been a few days. Ready to get back on track? We're here for you!",
      tone: TONE_STYLES.GENTLE,
    },
    {
      title: "Welcome back?",
      body: "No judgment here! Whenever you're ready, your health journey continues.",
      tone: TONE_STYLES.FRIENDLY,
    },
  ],
  achievement_close: [
    {
      title: "So close! 🎯",
      body: "You're {{remaining}} away from your {{achievement}} achievement!",
      tone: TONE_STYLES.MOTIVATING,
    },
  ],
  weekly_summary: [
    {
      title: "Your week in review 📊",
      body: "You logged {{meals}} meals and drank {{water}}L this week. Tap to see more!",
      tone: TONE_STYLES.INFORMATIVE,
    },
  ],
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
    const [foodStats, waterStats, moodStats] = await Promise.all([
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
    };
  } catch (error) {
    console.error('[SmartReminder] getTodayStats error:', error);
    return {
      food: { totalMeals: 0, totalCalories: 0, mealTypes: {} },
      water: { totalLogs: 0, totalLiters: 0 },
      mood: { totalLogs: 0 },
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
      };
    }

    const notifs = settings.notifications;
    return {
      enabled: notifs.enabled !== false,
      hydration: notifs.hydration !== false,
      food: notifs.food !== false,
      mood: notifs.mood !== false,
      motivation: notifs.motivation !== false,
    };
  } catch {
    return {
      enabled: true,
      hydration: true,
      food: true,
      mood: true,
      motivation: true,
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
