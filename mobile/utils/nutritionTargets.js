/**
 * Calculates personalized daily nutrition targets based on user profile
 * Falls back to reasonable defaults if profile data is incomplete
 */

/**
 * Default daily reference values (FDA standards)
 */
const DEFAULT_DAILY_VALUES = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 78,
  fiber: 28,
  sugar: 50,
  sodium: 2300,
  calcium: 1000,
  iron: 18,
  vitaminA: 900,
  vitaminC: 90,
  vitaminD: 20,
  potassium: 3500,
};

/**
 * Calculate daily nutrition targets based on user profile
 * @param {Object} userGoals - User's nutrition goals from profile
 * @param {number} userGoals.dailyCalories - Target daily calories
 * @param {number} userGoals.proteinG - Target daily protein in grams
 * @param {number} userGoals.carbsG - Target daily carbs in grams
 * @param {number} userGoals.fatsG - Target daily fats in grams
 * @returns {Object} Daily nutrition targets with sensible defaults
 */
export const calculateDailyTargets = (userGoals = {}) => {
  const {
    dailyCalories = DEFAULT_DAILY_VALUES.calories,
    proteinG = DEFAULT_DAILY_VALUES.protein,
    carbsG = DEFAULT_DAILY_VALUES.carbs,
    fatsG = DEFAULT_DAILY_VALUES.fat,
  } = userGoals;

  // If user has set specific goals, use them
  if (dailyCalories && proteinG && carbsG && fatsG) {
    return {
      calories: dailyCalories || DEFAULT_DAILY_VALUES.calories,
      protein: proteinG || DEFAULT_DAILY_VALUES.protein,
      carbs: carbsG || DEFAULT_DAILY_VALUES.carbs,
      fat: fatsG || DEFAULT_DAILY_VALUES.fat,
      fiber: DEFAULT_DAILY_VALUES.fiber,
      sugar: DEFAULT_DAILY_VALUES.sugar,
      sodium: DEFAULT_DAILY_VALUES.sodium,
      calcium: DEFAULT_DAILY_VALUES.calcium,
      iron: DEFAULT_DAILY_VALUES.iron,
      vitaminA: DEFAULT_DAILY_VALUES.vitaminA,
      vitaminC: DEFAULT_DAILY_VALUES.vitaminC,
      vitaminD: DEFAULT_DAILY_VALUES.vitaminD,
      potassium: DEFAULT_DAILY_VALUES.potassium,
    };
  }

  // Otherwise, use defaults and scale micronutrients based on calorie intake
  const calorieRatio = (dailyCalories || DEFAULT_DAILY_VALUES.calories) / DEFAULT_DAILY_VALUES.calories;

  return {
    calories: dailyCalories || DEFAULT_DAILY_VALUES.calories,
    protein: proteinG || DEFAULT_DAILY_VALUES.protein,
    carbs: carbsG || DEFAULT_DAILY_VALUES.carbs,
    fat: fatsG || DEFAULT_DAILY_VALUES.fat,
    fiber: Math.round(DEFAULT_DAILY_VALUES.fiber * calorieRatio),
    sugar: Math.round(DEFAULT_DAILY_VALUES.sugar * calorieRatio),
    sodium: Math.round(DEFAULT_DAILY_VALUES.sodium * calorieRatio),
    calcium: Math.round(DEFAULT_DAILY_VALUES.calcium * calorieRatio),
    iron: Math.round(DEFAULT_DAILY_VALUES.iron * calorieRatio * 10) / 10,
    vitaminA: Math.round(DEFAULT_DAILY_VALUES.vitaminA * calorieRatio),
    vitaminC: Math.round(DEFAULT_DAILY_VALUES.vitaminC * calorieRatio),
    vitaminD: Math.round(DEFAULT_DAILY_VALUES.vitaminD * calorieRatio),
    potassium: Math.round(DEFAULT_DAILY_VALUES.potassium * calorieRatio),
  };
};

/**
 * Export defaults for backward compatibility
 */
export const DAILY_VALUES = DEFAULT_DAILY_VALUES;