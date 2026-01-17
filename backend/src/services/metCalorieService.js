/**
 * MET Calorie Service
 *
 * Calculates calories burned using the Metabolic Equivalent of Task (MET) formula.
 *
 * Formula: Calories = MET × weight(kg) × time(hours)
 *
 * MET values are based on the Compendium of Physical Activities.
 */

// MET values by activity type and intensity
// Source: Compendium of Physical Activities (Ainsworth et al.)
export const MET_VALUES = {
  running: {
    light: 6.0,      // Jogging, general (5 mph)
    moderate: 10.0,  // Running 6-7 mph
    vigorous: 14.0,  // Running 8+ mph
  },
  cycling: {
    light: 4.0,      // Leisure cycling <10 mph
    moderate: 8.0,   // Cycling 12-14 mph
    vigorous: 12.0,  // Cycling 16+ mph
  },
  walking: {
    light: 2.5,      // Slow pace (2 mph)
    moderate: 3.5,   // Moderate pace (3-3.5 mph)
    vigorous: 5.0,   // Brisk pace (4+ mph)
  },
  gym: {
    light: 3.5,      // Light weight training
    moderate: 5.0,   // General weight training
    vigorous: 6.0,   // Vigorous weight training
  },
  swimming: {
    light: 4.5,      // Leisurely swimming
    moderate: 7.0,   // Swimming laps, moderate
    vigorous: 10.0,  // Swimming laps, vigorous
  },
  yoga: {
    light: 2.5,      // Hatha yoga
    moderate: 4.0,   // Power yoga / Vinyasa
    vigorous: 5.0,   // Hot yoga / Bikram
  },
  sports: {
    light: 4.0,      // Recreational sports (table tennis)
    moderate: 6.0,   // Moderate sports (tennis, basketball casual)
    vigorous: 8.0,   // Competitive sports
  },
  hiking: {
    light: 4.5,      // Flat terrain
    moderate: 6.0,   // Hills/moderate terrain
    vigorous: 8.0,   // Steep terrain with pack
  },
  dancing: {
    light: 3.0,      // Slow dancing
    moderate: 5.0,   // General dancing
    vigorous: 7.0,   // Aerobic/intense dancing
  },
  hiit: {
    light: 5.0,      // Low intensity intervals
    moderate: 8.0,   // Moderate HIIT
    vigorous: 12.0,  // High intensity HIIT
  },
  strength: {
    light: 3.0,      // Light resistance training
    moderate: 5.0,   // Moderate resistance training
    vigorous: 6.0,   // Heavy resistance training
  },
  cardio: {
    light: 4.0,      // Light cardio machines
    moderate: 7.0,   // Moderate cardio
    vigorous: 10.0,  // Intense cardio
  },
  flexibility: {
    light: 2.0,      // Gentle stretching
    moderate: 2.5,   // Active stretching
    vigorous: 3.0,   // Intensive stretching/Pilates
  },
  general: {
    light: 3.0,      // Light activity
    moderate: 5.0,   // Moderate activity
    vigorous: 7.0,   // Vigorous activity
  },
};

// Activity type labels for UI
export const ACTIVITY_TYPES = [
  { key: 'running', label: 'Running', icon: 'fitness' },
  { key: 'cycling', label: 'Cycling', icon: 'bicycle' },
  { key: 'walking', label: 'Walking', icon: 'walk' },
  { key: 'gym', label: 'Gym', icon: 'barbell' },
  { key: 'swimming', label: 'Swimming', icon: 'water' },
  { key: 'yoga', label: 'Yoga', icon: 'body' },
  { key: 'sports', label: 'Sports', icon: 'football' },
  { key: 'hiking', label: 'Hiking', icon: 'trail-sign' },
  { key: 'dancing', label: 'Dancing', icon: 'musical-notes' },
  { key: 'hiit', label: 'HIIT', icon: 'flame' },
  { key: 'strength', label: 'Strength', icon: 'barbell' },
  { key: 'cardio', label: 'Cardio', icon: 'heart' },
  { key: 'flexibility', label: 'Flexibility', icon: 'body' },
  { key: 'general', label: 'General', icon: 'fitness' },
];

// Intensity levels
export const INTENSITY_LEVELS = [
  { key: 'light', label: 'Light', description: 'Can easily hold a conversation' },
  { key: 'moderate', label: 'Moderate', description: 'Can talk but slightly breathless' },
  { key: 'vigorous', label: 'Vigorous', description: 'Hard to hold a conversation' },
];

/**
 * Get the MET value for an activity type and intensity
 * @param {string} type - Activity type
 * @param {string} intensity - Intensity level (light/moderate/vigorous)
 * @returns {number} MET value
 */
export function getMETValue(type, intensity = 'moderate') {
  const activityMETs = MET_VALUES[type] || MET_VALUES.general;
  return activityMETs[intensity] || activityMETs.moderate;
}

/**
 * Calculate calories burned using MET formula
 * Formula: Calories = MET × weight(kg) × time(hours)
 *
 * @param {string} type - Activity type
 * @param {string} intensity - Intensity level
 * @param {number} durationMinutes - Duration in minutes
 * @param {number} weightKg - Body weight in kg (default: 70kg)
 * @returns {{ calories: number, metValue: number }}
 */
export function calculateCaloriesFromMET(type, intensity, durationMinutes, weightKg = 70) {
  const metValue = getMETValue(type, intensity);
  const hours = durationMinutes / 60;
  const calories = Math.round(metValue * weightKg * hours);

  return {
    calories,
    metValue,
  };
}

/**
 * Estimate calories for quick display (uses default 70kg weight)
 * @param {string} type - Activity type
 * @param {string} intensity - Intensity level
 * @param {number} durationMinutes - Duration in minutes
 * @returns {number} Estimated calories
 */
export function estimateCalories(type, intensity, durationMinutes) {
  return calculateCaloriesFromMET(type, intensity, durationMinutes).calories;
}

/**
 * Calculate XP for activity based on duration and intensity
 * Base: 5 XP per 10 minutes
 * Intensity bonus: light = 0, moderate = +2, vigorous = +5
 * @param {number} durationMinutes - Duration in minutes
 * @param {string} intensity - Intensity level
 * @returns {number} XP to award
 */
export function calculateActivityXP(durationMinutes, intensity = 'moderate') {
  const baseXP = Math.floor(durationMinutes / 10) * 5;
  const intensityBonus = {
    light: 0,
    moderate: 2,
    vigorous: 5,
  };
  return baseXP + (intensityBonus[intensity] || 0);
}

/**
 * Get activity summary for a given day
 * @param {Array} activities - Array of activity logs
 * @returns {{ totalMinutes: number, totalCalories: number, activityCount: number, types: object }}
 */
export function getActivitySummary(activities) {
  if (!activities || activities.length === 0) {
    return {
      totalMinutes: 0,
      totalCalories: 0,
      activityCount: 0,
      types: {},
    };
  }

  const summary = activities.reduce((acc, activity) => {
    acc.totalMinutes += activity.durationMinutes || 0;
    acc.totalCalories += activity.caloriesBurned || 0;
    acc.types[activity.type] = (acc.types[activity.type] || 0) + (activity.durationMinutes || 0);
    return acc;
  }, { totalMinutes: 0, totalCalories: 0, types: {} });

  return {
    ...summary,
    activityCount: activities.length,
  };
}

/**
 * Get progress towards weekly CDC target (150 min moderate activity)
 * @param {number} weeklyMinutes - Total minutes of activity this week
 * @returns {{ progress: number, target: number, remaining: number, onTrack: boolean }}
 */
export function getWeeklyProgress(weeklyMinutes) {
  const TARGET = 150; // CDC recommendation
  const progress = Math.min(weeklyMinutes / TARGET, 1);
  const remaining = Math.max(TARGET - weeklyMinutes, 0);

  return {
    progress,
    target: TARGET,
    remaining,
    onTrack: progress >= 1,
    weeklyMinutes,
  };
}

export default {
  MET_VALUES,
  ACTIVITY_TYPES,
  INTENSITY_LEVELS,
  getMETValue,
  calculateCaloriesFromMET,
  estimateCalories,
  calculateActivityXP,
  getActivitySummary,
  getWeeklyProgress,
};
