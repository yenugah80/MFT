/**
 * Unified Notification Type Constants
 *
 * This file provides a single source of truth for all notification types,
 * categories, colors, and configurations used across the app.
 *
 * IMPORTANT: All notification-related files should import from here
 * to ensure consistency.
 */

// ============================================================================
// NOTIFICATION CATEGORIES (for push notification actions)
// ============================================================================

export const NOTIFICATION_CATEGORIES = {
  DAILY_REMINDER: 'daily_reminder',
  HYDRATION_NUDGE: 'hydration_nudge',
  ACTIVITY_REMINDER: 'activity_reminder',
  MOOD_CHECKIN: 'mood_checkin',
  INSIGHT_DROP: 'insight_drop',
  STREAK_CELEBRATION: 'streak_celebration',
  STREAK_AT_RISK: 'streak_at_risk',
  GOAL_ACHIEVED: 'goal_achieved',
};

// ============================================================================
// REMINDER TYPES (for smart reminder service - maps to backend)
// ============================================================================

export const REMINDER_TYPES = {
  // Hydration
  HYDRATION_MORNING: 'hydration_morning',
  HYDRATION_MIDDAY: 'hydration_midday',
  HYDRATION_AFTERNOON: 'hydration_afternoon',
  HYDRATION_EVENING: 'hydration_evening',
  HYDRATION_GOAL_PROGRESS: 'hydration_goal_progress',
  HYDRATION_STREAK: 'hydration_streak',

  // Food
  FOOD_BREAKFAST: 'food_breakfast',
  FOOD_LUNCH: 'food_lunch',
  FOOD_DINNER: 'food_dinner',
  FOOD_LOG_REMINDER: 'food_log_reminder',
  FOOD_STREAK: 'food_streak',

  // Mood
  MOOD_CHECKIN_MORNING: 'mood_checkin_morning',
  MOOD_CHECKIN_AFTERNOON: 'mood_checkin_afternoon',
  MOOD_CHECKIN_EVENING: 'mood_checkin_evening',
  MOOD_POST_MEAL: 'mood_post_meal',

  // Activity
  ACTIVITY_MOVEMENT: 'activity_movement',
  ACTIVITY_WALK: 'activity_walk',

  // Motivation
  STREAK_AT_RISK: 'streak_at_risk',
  WEEKLY_SUMMARY: 'weekly_summary',
  ACHIEVEMENT_CLOSE: 'achievement_close',
  COMEBACK: 'comeback',
};

// ============================================================================
// NOTIFICATION PRIORITY LEVELS
// ============================================================================

export const PRIORITY = {
  URGENT: 'urgent',      // Streak at risk, allergen warning
  HIGH: 'high',          // Low intake, anomalies
  NORMAL: 'normal',      // Suggestions, nudges
  INFO: 'info',          // Welcome, tips
};

// ============================================================================
// UNIFIED COLOR PALETTE FOR NOTIFICATIONS
// ============================================================================

export const NOTIFICATION_COLORS = {
  // Domain colors (consistent across all components)
  hydration: '#3B82F6',
  food: '#F97316',
  mood: '#8B5CF6',
  activity: '#10B981',
  streak: '#F59E0B',
  insight: '#06B6D4',
  prediction: '#6366F1',

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Specific notification types
  streak_risk: '#EF4444',
  low_protein: '#8B5CF6',
  low_calories: '#F59E0B',
  achievement: '#F59E0B',
  allergen: '#DC2626',
};

// ============================================================================
// NOTIFICATION PREFERENCES (unified keys for mobile and backend)
// ============================================================================

export const PREFERENCE_KEYS = {
  // Mobile preference keys (camelCase)
  DAILY_REMINDER: 'dailyReminder',
  HYDRATION_NUDGES: 'hydrationNudges',
  ACTIVITY_REMINDERS: 'activityReminders',
  MOOD_CHECKINS: 'moodCheckins',
  STREAK_PROTECTION: 'streakProtection',
  INSIGHT_DROPS: 'insightDrops',
  STREAK_CELEBRATIONS: 'streakCelebrations',
};

// Map mobile preference keys to backend keys
export const PREFERENCE_KEY_MAP = {
  dailyReminder: 'food',
  hydrationNudges: 'hydration',
  activityReminders: 'activity',
  moodCheckins: 'mood',
  streakProtection: 'motivation',
  insightDrops: 'motivation',
  streakCelebrations: 'motivation',
};

// Default preference values
export const DEFAULT_PREFERENCES = {
  dailyReminder: true,
  hydrationNudges: true,
  activityReminders: true,
  moodCheckins: true,
  streakProtection: true,
  insightDrops: true,
  streakCelebrations: true,
};

// ============================================================================
// NOTIFICATION CONFIG (unified configuration for all components)
// ============================================================================

export const NOTIFICATION_CONFIG = {
  // Urgency-based types
  streak_risk: {
    icon: 'flame',
    color: NOTIFICATION_COLORS.streak_risk,
    priority: PRIORITY.URGENT,
    gradient: ['#EF4444', '#F87171'],
  },
  streak_at_risk: {
    icon: 'flame',
    color: NOTIFICATION_COLORS.streak_risk,
    priority: PRIORITY.URGENT,
    gradient: ['#F97316', '#FB923C'],
  },

  // Allergen warning (critical safety alert)
  allergen_warning: {
    icon: 'alert-circle',
    color: '#DC2626',
    priority: PRIORITY.URGENT,
    gradient: ['#DC2626', '#EF4444'],
  },

  // Nutrition types
  low_protein: {
    icon: 'fitness',
    color: NOTIFICATION_COLORS.low_protein,
    priority: PRIORITY.HIGH,
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  low_calories: {
    icon: 'alert-circle',
    color: NOTIFICATION_COLORS.low_calories,
    priority: PRIORITY.HIGH,
    gradient: ['#F59E0B', '#FBBF24'],
  },

  // Hydration types
  hydration: {
    icon: 'water',
    color: NOTIFICATION_COLORS.hydration,
    priority: PRIORITY.NORMAL,
    gradient: ['#3B82F6', '#60A5FA'],
  },
  hydration_morning: {
    icon: 'water',
    color: NOTIFICATION_COLORS.hydration,
    priority: PRIORITY.NORMAL,
    gradient: ['#3B82F6', '#60A5FA'],
  },
  hydration_midday: {
    icon: 'water',
    color: NOTIFICATION_COLORS.hydration,
    priority: PRIORITY.NORMAL,
    gradient: ['#0EA5E9', '#38BDF8'],
  },
  hydration_afternoon: {
    icon: 'water',
    color: NOTIFICATION_COLORS.hydration,
    priority: PRIORITY.NORMAL,
    gradient: ['#06B6D4', '#22D3EE'],
  },

  // Food/meal types
  meal_reminder: {
    icon: 'restaurant',
    color: NOTIFICATION_COLORS.food,
    priority: PRIORITY.NORMAL,
    gradient: ['#F97316', '#FB923C'],
  },
  food_breakfast: {
    icon: 'sunny',
    color: '#F59E0B',
    priority: PRIORITY.NORMAL,
    gradient: ['#F59E0B', '#FBBF24'],
  },
  food_lunch: {
    icon: 'restaurant',
    color: NOTIFICATION_COLORS.food,
    priority: PRIORITY.NORMAL,
    gradient: ['#10B981', '#34D399'],
  },
  food_dinner: {
    icon: 'moon',
    color: '#8B5CF6',
    priority: PRIORITY.NORMAL,
    gradient: ['#8B5CF6', '#A78BFA'],
  },

  // Activity types
  activity_reminder: {
    icon: 'fitness',
    color: NOTIFICATION_COLORS.activity,
    priority: PRIORITY.NORMAL,
    gradient: ['#10B981', '#34D399'],
  },
  activity_movement: {
    icon: 'walk',
    color: NOTIFICATION_COLORS.activity,
    priority: PRIORITY.NORMAL,
    gradient: ['#10B981', '#34D399'],
  },

  // Mood types
  mood_checkin: {
    icon: 'happy',
    color: NOTIFICATION_COLORS.mood,
    priority: PRIORITY.NORMAL,
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  mood_checkin_morning: {
    icon: 'happy',
    color: '#EC4899',
    priority: PRIORITY.NORMAL,
    gradient: ['#EC4899', '#F472B6'],
  },
  mood_checkin_evening: {
    icon: 'bed',
    color: '#6366F1',
    priority: PRIORITY.NORMAL,
    gradient: ['#6366F1', '#818CF8'],
  },

  // Achievement/celebration types
  achievement: {
    icon: 'trophy',
    color: NOTIFICATION_COLORS.achievement,
    priority: PRIORITY.INFO,
    gradient: ['#F59E0B', '#FBBF24'],
  },
  streak_celebration: {
    icon: 'trophy',
    color: '#EAB308',
    priority: PRIORITY.INFO,
    gradient: ['#EAB308', '#FDE047'],
  },
  goal_achieved: {
    icon: 'checkmark-circle',
    color: NOTIFICATION_COLORS.success,
    priority: PRIORITY.INFO,
    gradient: ['#10B981', '#34D399'],
  },

  // Insight types
  insight: {
    icon: 'bulb',
    color: NOTIFICATION_COLORS.insight,
    priority: PRIORITY.INFO,
    gradient: ['#06B6D4', '#22D3EE'],
  },
  weekly_review: {
    icon: 'bar-chart',
    color: '#14B8A6',
    priority: PRIORITY.INFO,
    gradient: ['#14B8A6', '#2DD4BF'],
  },

  // Default fallback
  default: {
    icon: 'notifications',
    color: '#6B4EFF',
    priority: PRIORITY.INFO,
    gradient: ['#6B4EFF', '#8B5CF6'],
  },
};

// ============================================================================
// RATE LIMITING INTERVALS (in milliseconds)
// ============================================================================

export const RATE_LIMITS = {
  hydration: 2 * 60 * 60 * 1000,    // 2 hours
  meal: 3 * 60 * 60 * 1000,         // 3 hours
  activity: 4 * 60 * 60 * 1000,     // 4 hours
  mood: 8 * 60 * 60 * 1000,         // 8 hours (unified - was 12 in engine)
  reengagement: 24 * 60 * 60 * 1000, // 24 hours
};

// ============================================================================
// SNOOZE OPTIONS
// ============================================================================

export const SNOOZE_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

// ============================================================================
// NOTIFICATION LAYOUT CONSTANTS
// ============================================================================

export const NOTIFICATION_LAYOUT = {
  // Consistent horizontal margins for all notification components
  horizontalMargin: 16,

  // Border radius
  borderRadius: 16,
  borderRadiusSmall: 12,

  // Icon sizes
  iconSize: {
    toast: 42,
    reminder: 48,
    notificationCenter: 40,
    compact: 36,
  },

  // Padding
  padding: {
    toast: 14,
    reminder: 20,
    notificationCenter: 12,
    compact: 12,
  },

  // Toast specific
  toast: {
    minHeight: 64,
    accentBarWidth: 5,
    duration: {
      default: 7000,      // 7 seconds for comfortable reading
      error: 6000,        // 6 seconds for errors
      celebration: 7000,  // 7 seconds for celebrations
      smart: 5000,        // 5 seconds for smart notifications
    },
  },
};

// ============================================================================
// DISMISS REASONS (must match backend validation)
// ============================================================================

export const DISMISS_REASONS = {
  NOT_RELEVANT: 'not_relevant',
  TOO_FREQUENT: 'too_frequent',
  WRONG_TIME: 'wrong_time',
  OTHER: 'other',
};

// ============================================================================
// QUIET HOURS CONFIG
// ============================================================================

export const DEFAULT_QUIET_HOURS = {
  start: 22, // 10 PM
  end: 7,    // 7 AM
};

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(quietHours = DEFAULT_QUIET_HOURS) {
  const hour = new Date().getHours();
  const { start, end } = quietHours;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (start > end) {
    return hour >= start || hour < end;
  }
  // Handle same-day quiet hours (e.g., 14:00 to 16:00)
  return hour >= start && hour < end;
}

/**
 * Get notification config by type with fallback
 */
export function getNotificationConfig(type) {
  return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.default;
}

export default {
  NOTIFICATION_CATEGORIES,
  REMINDER_TYPES,
  PRIORITY,
  NOTIFICATION_COLORS,
  PREFERENCE_KEYS,
  PREFERENCE_KEY_MAP,
  DEFAULT_PREFERENCES,
  NOTIFICATION_CONFIG,
  RATE_LIMITS,
  SNOOZE_OPTIONS,
  NOTIFICATION_LAYOUT,
  DISMISS_REASONS,
  DEFAULT_QUIET_HOURS,
  isQuietHours,
  getNotificationConfig,
};
