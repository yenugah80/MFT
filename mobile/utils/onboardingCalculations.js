/**
 * Onboarding Calculations Utility
 * Handles TDEE, BMR, and macro calculations for new users
 */

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * @param {number} weightKg - Weight in kilograms
 * @param {number} heightCm - Height in centimeters
 * @param {number} age - Age in years
 * @param {string} gender - 'male' | 'female' | 'other'
 * @returns {number} BMR in calories
 */
export const calculateBMR = (weightKg, heightCm, age, gender = 'other') => {
  let genderOffset = -78; // Other/unspecified average

  if (gender === 'male') {
    genderOffset = 5;
  } else if (gender === 'female') {
    genderOffset = -161;
  }

  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + genderOffset;
  return Math.round(bmr);
};

/**
 * Calculate Total Daily Energy Expenditure
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - 'sedentary' | 'lightly_active' | 'moderate' | 'very_active' | 'extremely_active'
 * @returns {number} TDEE in calories
 */
export const calculateTDEE = (bmr, activityLevel) => {
  const activityFactors = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };

  const factor = activityFactors[activityLevel] || 1.55;
  return Math.round(bmr * factor);
};

/**
 * Adjust calories based on primary goal
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} primaryGoal - 'lose' | 'maintain' | 'gain'
 * @returns {number} Adjusted daily calorie target
 */
export const calculateDailyCalories = (tdee, primaryGoal) => {
  switch (primaryGoal) {
    case 'lose':
      return Math.round(tdee - 500); // 1 lb/week loss
    case 'gain':
      return Math.round(tdee + 300); // Conservative muscle gain
    case 'maintain':
    default:
      return tdee;
  }
};

/**
 * Convert weight from pounds to kilograms
 * @param {number} lbs - Weight in pounds
 * @returns {number} Weight in kilograms
 */
export const lbsToKg = (lbs) => Math.round((lbs / 2.20462) * 100) / 100;

/**
 * Convert weight from kilograms to pounds
 * @param {number} kg - Weight in kilograms
 * @returns {number} Weight in pounds
 */
export const kgToLbs = (kg) => Math.round((kg * 2.20462) * 100) / 100;

/**
 * Convert height from feet+inches to centimeters
 * @param {number} feet - Feet
 * @param {number} inches - Inches
 * @returns {number} Height in centimeters
 */
export const ftInToCm = (feet, inches) => Math.round((feet * 30.48 + inches * 2.54));

/**
 * Convert height from centimeters to feet+inches
 * @param {number} cm - Height in centimeters
 * @returns {object} { feet, inches }
 */
export const cmToFtIn = (cm) => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

/**
 * Calculate protein target in grams
 * @param {number} weightKg - Weight in kilograms
 * @param {string} primaryGoal - 'lose' | 'maintain' | 'gain'
 * @returns {number} Protein target in grams
 */
export const calculateProteinTarget = (weightKg, primaryGoal) => {
  const weightLbs = kgToLbs(weightKg);

  // Different targets based on goal
  // Lose/Gain: 1.0g per lb (preserve muscle / build muscle)
  // Maintain: 0.8g per lb
  const proteinPerLb = (primaryGoal === 'maintain') ? 0.8 : 1.0;

  return Math.round(weightLbs * proteinPerLb);
};

/**
 * Calculate fat target in grams (25-30% of calories)
 * @param {number} dailyCalories - Daily calorie target
 * @returns {number} Fat target in grams
 */
export const calculateFatTarget = (dailyCalories) => {
  // 25-30% of calories from fat, default to 27.5%
  const fatCalories = dailyCalories * 0.275;
  return Math.round(fatCalories / 9); // 9 calories per gram of fat
};

/**
 * Calculate carb target in grams (remaining calories)
 * @param {number} dailyCalories - Daily calorie target
 * @param {number} proteinGrams - Protein target in grams
 * @param {number} fatGrams - Fat target in grams
 * @returns {number} Carb target in grams
 */
export const calculateCarbTarget = (dailyCalories, proteinGrams, fatGrams) => {
  const proteinCals = proteinGrams * 4; // 4 calories per gram
  const fatCals = fatGrams * 9; // 9 calories per gram
  const carbCals = dailyCalories - proteinCals - fatCals;
  return Math.round(carbCals / 4); // 4 calories per gram of carbs
};

/**
 * Calculate all nutrition targets based on user input
 * @param {object} userData - { age, weightKg, heightCm, gender, activityLevel, primaryGoal }
 * @returns {object} { dailyCalories, proteinG, carbsG, fatsG, waterLiters, bmr, tdee }
 */
export const calculateNutritionTargets = (userData) => {
  const {
    age,
    weightKg,
    heightCm,
    gender = 'other',
    activityLevel,
    primaryGoal,
  } = userData;

  // Validate inputs
  if (!age || !weightKg || !heightCm || !activityLevel || !primaryGoal) {
    throw new Error('Missing required fields for calculation');
  }

  // Calculate base metrics
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const dailyCalories = calculateDailyCalories(tdee, primaryGoal);

  // Calculate macros
  const proteinG = calculateProteinTarget(weightKg, primaryGoal);
  const fatsG = calculateFatTarget(dailyCalories);
  const carbsG = calculateCarbTarget(dailyCalories, proteinG, fatsG);

  // Default water goal
  const waterLiters = 2.0;

  return {
    dailyCalories,
    proteinG,
    carbsG,
    fatsG,
    waterLiters,
    bmr,
    tdee,
  };
};

/**
 * Validate nutrition targets
 * @param {object} targets - { dailyCalories, proteinG, carbsG, fatsG, waterLiters }
 * @returns {object} { isValid, errors }
 */
export const validateNutritionTargets = (targets) => {
  const errors = {};

  if (!targets.dailyCalories || targets.dailyCalories < 800 || targets.dailyCalories > 10000) {
    errors.dailyCalories = 'Calories must be between 800 and 10,000';
  }

  if (!targets.proteinG || targets.proteinG < 0 || targets.proteinG > 500) {
    errors.proteinG = 'Protein must be between 0 and 500g';
  }

  if (!targets.carbsG || targets.carbsG < 0 || targets.carbsG > 1000) {
    errors.carbsG = 'Carbs must be between 0 and 1,000g';
  }

  if (!targets.fatsG || targets.fatsG < 0 || targets.fatsG > 300) {
    errors.fatsG = 'Fats must be between 0 and 300g';
  }

  if (!targets.waterLiters || targets.waterLiters < 0 || targets.waterLiters > 20) {
    errors.waterLiters = 'Water must be between 0 and 20 liters';
  }

  // Check if macros add up to calories (within 20% tolerance)
  const calculatedCalories =
    (targets.proteinG * 4) + (targets.carbsG * 4) + (targets.fatsG * 9);
  const caloriesDiff = Math.abs(calculatedCalories - targets.dailyCalories);
  const tolerance = targets.dailyCalories * 0.2;

  if (caloriesDiff > tolerance) {
    errors.macros = 'Macros do not balance with calorie target. Please adjust.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Get readable description for activity level
 * @param {string} activityLevel - Activity level key
 * @returns {string} Description
 */
export const getActivityLevelDescription = (activityLevel) => {
  const descriptions = {
    sedentary: 'Desk job, little exercise',
    lightly_active: 'Exercise 1-2 days per week',
    moderate: 'Exercise 3-5 days per week',
    very_active: 'Daily exercise',
    extremely_active: 'Intense daily training',
  };
  return descriptions[activityLevel] || '';
};

/**
 * Get context message for calculated goals
 * @param {object} targets - Calculated targets
 * @param {object} userData - Original user data
 * @returns {object} { calorieContext, proteinContext }
 */
export const getGoalContext = (targets, userData) => {
  const { primaryGoal, bmr, tdee } = targets;

  let calorieContext = 'Based on your height, weight, age, and activity level';
  let proteinContext = '';

  if (userData.primaryGoal === 'lose') {
    calorieContext += '. This creates a 500 calorie deficit for 1 lb/week weight loss.';
    proteinContext = 'To preserve muscle while losing weight';
  } else if (userData.primaryGoal === 'gain') {
    calorieContext += '. This creates a 300 calorie surplus for muscle gain.';
    proteinContext = 'To support muscle growth';
  } else {
    calorieContext += ' to maintain your current weight.';
    proteinContext = 'For basic health and muscle maintenance';
  }

  return { calorieContext, proteinContext };
};
