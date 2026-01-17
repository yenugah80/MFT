/**
 * Activity-Based Nutrition Utility
 *
 * Handles:
 * - Calorie adjustments based on activity level
 * - Pre-workout nutrition timing and suggestions
 * - Post-workout recovery nutrition
 * - Activity-nutrition integration
 *
 * Based on sports nutrition research and ACSM guidelines.
 */

// ============================================================================
// ACTIVITY CALORIE BURN ESTIMATES (per minute)
// ============================================================================

export const ACTIVITY_CALORIES = {
  // Cardio activities (calories per minute for 150lb person)
  running: 11.4,
  running_fast: 14.2,
  walking: 4.3,
  walking_brisk: 5.7,
  cycling: 7.5,
  cycling_intense: 11.4,
  swimming: 8.6,
  rowing: 8.6,
  elliptical: 7.7,
  stairclimber: 9.5,
  hiking: 6.8,
  dancing: 6.8,
  aerobics: 7.5,
  jump_rope: 12.3,

  // Strength training
  weightlifting: 4.3,
  weightlifting_intense: 6.8,
  bodyweight: 5.0,
  crossfit: 10.0,

  // Sports
  basketball: 9.1,
  soccer: 9.5,
  tennis: 8.2,
  volleyball: 4.5,
  golf: 3.4,
  baseball: 5.0,

  // Mind-body
  yoga: 3.0,
  pilates: 3.4,
  stretching: 2.3,
  tai_chi: 3.0,

  // Daily activities
  housework: 3.4,
  gardening: 4.5,
  general: 5.0, // Default for unspecified
};

// ============================================================================
// CALORIE ADJUSTMENT BASED ON ACTIVITY
// ============================================================================

/**
 * Calculate calories burned from an activity
 * @param {string} activityType - Type of activity
 * @param {number} durationMinutes - Duration in minutes
 * @param {number} bodyWeightKg - User's weight in kg (optional, default 68kg/150lb)
 * @param {string} intensity - 'low', 'moderate', 'high'
 * @returns {number} Estimated calories burned
 */
export function calculateCaloriesBurned(activityType, durationMinutes, bodyWeightKg = 68, intensity = 'moderate') {
  const normalizedType = (activityType || 'general').toLowerCase().replace(/\s+/g, '_');
  const baseRate = ACTIVITY_CALORIES[normalizedType] || ACTIVITY_CALORIES.general;

  // Adjust for body weight (base rates are for 68kg/150lb)
  const weightMultiplier = bodyWeightKg / 68;

  // Adjust for intensity
  const intensityMultiplier = intensity === 'low' ? 0.8 : intensity === 'high' ? 1.2 : 1.0;

  return Math.round(baseRate * durationMinutes * weightMultiplier * intensityMultiplier);
}

/**
 * Get adjusted daily calorie goal based on activity
 * @param {number} baseCalories - Base daily calorie goal (BMR * activity factor)
 * @param {Array} todayActivities - Array of { type, durationMinutes, intensity }
 * @param {number} bodyWeightKg - User's weight
 * @returns {object} Adjusted goal and breakdown
 */
export function getAdjustedCalorieGoal(baseCalories, todayActivities = [], bodyWeightKg = 68) {
  const activityCalories = todayActivities.reduce((total, activity) => {
    return total + calculateCaloriesBurned(
      activity.type,
      activity.durationMinutes,
      bodyWeightKg,
      activity.intensity
    );
  }, 0);

  // Only add extra calories if significant activity (>100 cal burned)
  const extraCalories = activityCalories > 100 ? Math.round(activityCalories * 0.5) : 0;

  return {
    baseGoal: baseCalories,
    activityCalories,
    extraCaloriesEarned: extraCalories,
    adjustedGoal: baseCalories + extraCalories,
    message: extraCalories > 0
      ? `+${extraCalories} cal from today's activity`
      : null,
  };
}

// ============================================================================
// PRE-WORKOUT NUTRITION
// ============================================================================

export const PRE_WORKOUT_TIMING = {
  // 3-4 hours before: Full meal
  fullMeal: {
    hoursBeforeMin: 3,
    hoursBeforeMax: 4,
    description: 'Full balanced meal',
    macros: {
      carbsPercent: 50,
      proteinPercent: 25,
      fatPercent: 25,
    },
    examples: [
      'Chicken with rice and vegetables',
      'Pasta with lean protein and salad',
      'Sandwich with lean meat and fruit',
    ],
  },

  // 2-3 hours before: Light meal
  lightMeal: {
    hoursBeforeMin: 2,
    hoursBeforeMax: 3,
    description: 'Light meal, lower fat',
    macros: {
      carbsPercent: 60,
      proteinPercent: 25,
      fatPercent: 15,
    },
    examples: [
      'Oatmeal with banana and nuts',
      'Greek yogurt with granola',
      'Turkey wrap with fruit',
    ],
  },

  // 1-2 hours before: Snack
  snack: {
    hoursBeforeMin: 1,
    hoursBeforeMax: 2,
    description: 'Easy-to-digest snack',
    macros: {
      carbsPercent: 70,
      proteinPercent: 20,
      fatPercent: 10,
    },
    examples: [
      'Banana with peanut butter',
      'Toast with honey',
      'Energy bar',
      'Smoothie',
    ],
  },

  // 30-60 minutes before: Quick fuel
  quickFuel: {
    hoursBeforeMin: 0.5,
    hoursBeforeMax: 1,
    description: 'Quick carbs only',
    macros: {
      carbsPercent: 90,
      proteinPercent: 10,
      fatPercent: 0,
    },
    examples: [
      'Banana',
      'Apple sauce',
      'Sports drink',
      'Few crackers',
    ],
  },
};

/**
 * Get pre-workout nutrition recommendation based on time until workout
 * @param {number} hoursUntilWorkout - Hours until planned workout
 * @returns {object} Pre-workout nutrition recommendation
 */
export function getPreWorkoutRecommendation(hoursUntilWorkout) {
  if (hoursUntilWorkout >= 3) {
    return {
      timing: PRE_WORKOUT_TIMING.fullMeal,
      urgency: 'relaxed',
      message: 'Time for a full meal before your workout',
    };
  }
  if (hoursUntilWorkout >= 2) {
    return {
      timing: PRE_WORKOUT_TIMING.lightMeal,
      urgency: 'normal',
      message: 'Have a light meal - avoid heavy fats',
    };
  }
  if (hoursUntilWorkout >= 1) {
    return {
      timing: PRE_WORKOUT_TIMING.snack,
      urgency: 'moderate',
      message: 'Quick snack time - easy-to-digest carbs',
    };
  }
  if (hoursUntilWorkout >= 0.5) {
    return {
      timing: PRE_WORKOUT_TIMING.quickFuel,
      urgency: 'soon',
      message: 'Just quick carbs now - banana or sports drink',
    };
  }

  return {
    timing: null,
    urgency: 'imminent',
    message: 'Too close to workout for eating - water only',
  };
}

// ============================================================================
// POST-WORKOUT NUTRITION
// ============================================================================

export const POST_WORKOUT_WINDOWS = {
  // 0-30 minutes: Immediate recovery
  immediate: {
    minutesAfterMax: 30,
    priority: 'high',
    description: 'Recovery window - protein + carbs',
    macros: {
      carbsGrams: 30, // per serving
      proteinGrams: 20,
      fatGrams: 5,
    },
    examples: [
      'Protein shake with banana',
      'Chocolate milk',
      'Greek yogurt with berries',
    ],
    hydration: '500ml water + electrolytes if >60min workout',
  },

  // 30-120 minutes: Recovery meal
  recoveryMeal: {
    minutesAfterMin: 30,
    minutesAfterMax: 120,
    priority: 'medium',
    description: 'Full recovery meal',
    macros: {
      carbsPercent: 50,
      proteinPercent: 30,
      fatPercent: 20,
    },
    examples: [
      'Grilled chicken with sweet potato and vegetables',
      'Salmon with quinoa and greens',
      'Eggs with whole grain toast and avocado',
    ],
    hydration: 'Continue hydrating - aim for clear urine',
  },
};

/**
 * Get post-workout nutrition recommendation
 * @param {number} minutesSinceWorkout - Minutes since workout ended
 * @param {string} workoutType - Type of workout
 * @param {number} durationMinutes - Workout duration
 * @param {string} intensity - Workout intensity
 * @returns {object} Post-workout nutrition recommendation
 */
export function getPostWorkoutRecommendation(minutesSinceWorkout, workoutType, durationMinutes, intensity = 'moderate') {
  const isIntenseWorkout = intensity === 'high' || durationMinutes > 60;

  if (minutesSinceWorkout <= 30) {
    return {
      window: POST_WORKOUT_WINDOWS.immediate,
      urgency: 'now',
      message: isIntenseWorkout
        ? 'Recovery window! Prioritize protein + carbs now'
        : 'Good time for a protein-rich snack',
      proteinGoal: isIntenseWorkout ? 25 : 15,
      carbGoal: isIntenseWorkout ? 40 : 20,
    };
  }

  if (minutesSinceWorkout <= 120) {
    return {
      window: POST_WORKOUT_WINDOWS.recoveryMeal,
      urgency: 'soon',
      message: 'Time for a balanced recovery meal',
      proteinGoal: 30,
      carbGoal: 50,
    };
  }

  return {
    window: null,
    urgency: 'passed',
    message: 'Recovery window passed - eat normally',
    proteinGoal: null,
    carbGoal: null,
  };
}

// ============================================================================
// WORKOUT-SPECIFIC NUTRITION
// ============================================================================

export const WORKOUT_NUTRITION_PROFILES = {
  // Cardio/endurance
  cardio: {
    pre: { carbsHigh: true, proteinModerate: true, fatLow: true },
    post: { carbsHigh: true, proteinModerate: true, fatLow: true },
    hydration: 'critical',
    notes: 'Focus on carbs for fuel, replenish glycogen after',
  },

  // Strength training
  strength: {
    pre: { carbsModerate: true, proteinModerate: true, fatLow: true },
    post: { carbsModerate: true, proteinHigh: true, fatModerate: true },
    hydration: 'important',
    notes: 'Protein critical for muscle repair and growth',
  },

  // HIIT
  hiit: {
    pre: { carbsHigh: true, proteinLow: true, fatLow: true },
    post: { carbsHigh: true, proteinHigh: true, fatLow: true },
    hydration: 'critical',
    notes: 'High carb needs due to intensity',
  },

  // Yoga/flexibility
  mindBody: {
    pre: { carbsLow: true, proteinLow: true, fatLow: true },
    post: { carbsModerate: true, proteinModerate: true, fatModerate: true },
    hydration: 'moderate',
    notes: 'Light stomach preferred, normal eating after',
  },
};

/**
 * Get workout-specific nutrition profile
 * @param {string} workoutType - Type of workout
 * @returns {object} Nutrition profile for workout type
 */
export function getWorkoutNutritionProfile(workoutType) {
  const type = (workoutType || '').toLowerCase();

  // Map common activities to profiles
  if (['running', 'cycling', 'swimming', 'rowing', 'elliptical'].includes(type)) {
    return WORKOUT_NUTRITION_PROFILES.cardio;
  }
  if (['weightlifting', 'bodyweight', 'gym', 'strength'].includes(type)) {
    return WORKOUT_NUTRITION_PROFILES.strength;
  }
  if (['hiit', 'crossfit', 'circuit', 'interval'].includes(type)) {
    return WORKOUT_NUTRITION_PROFILES.hiit;
  }
  if (['yoga', 'pilates', 'stretching', 'tai_chi'].includes(type)) {
    return WORKOUT_NUTRITION_PROFILES.mindBody;
  }

  // Default to cardio profile
  return WORKOUT_NUTRITION_PROFILES.cardio;
}

// ============================================================================
// HYDRATION FOR ACTIVITY
// ============================================================================

/**
 * Get hydration recommendation for activity
 * @param {string} activityType - Type of activity
 * @param {number} durationMinutes - Duration in minutes
 * @param {string} intensity - 'low', 'moderate', 'high'
 * @returns {object} Hydration recommendation
 */
export function getActivityHydrationNeeds(activityType, durationMinutes, intensity = 'moderate') {
  const profile = getWorkoutNutritionProfile(activityType);
  const baseNeed = intensity === 'high' ? 1.0 : intensity === 'low' ? 0.5 : 0.75; // liters per hour

  const totalNeeded = (durationMinutes / 60) * baseNeed;
  const needsElectrolytes = durationMinutes > 60 || intensity === 'high';

  return {
    duringWorkout: {
      amount: Math.round(totalNeeded * 1000) + 'ml',
      frequency: 'Every 15-20 minutes',
      type: needsElectrolytes ? 'Water + electrolytes' : 'Water',
    },
    afterWorkout: {
      amount: Math.round(totalNeeded * 1.5 * 1000) + 'ml',
      timeframe: 'Within 2 hours',
      tip: 'Drink until urine is light yellow',
    },
    needsElectrolytes,
    priority: profile.hydration,
  };
}

export default {
  ACTIVITY_CALORIES,
  PRE_WORKOUT_TIMING,
  POST_WORKOUT_WINDOWS,
  WORKOUT_NUTRITION_PROFILES,
  calculateCaloriesBurned,
  getAdjustedCalorieGoal,
  getPreWorkoutRecommendation,
  getPostWorkoutRecommendation,
  getWorkoutNutritionProfile,
  getActivityHydrationNeeds,
};
