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
 * Derive a single activityLevel bucket from a set of checked
 * ACTIVITY_CHECKLIST item ids (see constants/onboardingConfig.js).
 * Weights are summed and mapped onto the same 5 buckets calculateTDEE
 * expects, so nothing downstream needs to know the checklist exists.
 * @param {string[]} selectedIds
 * @param {{id: string, weight: number}[]} checklist - ACTIVITY_CHECKLIST
 * @returns {string|null} activityLevel id, or null if nothing is checked
 */
export const computeActivityLevel = (selectedIds, checklist) => {
  if (!selectedIds || selectedIds.length === 0) return null;

  const score = checklist
    .filter((item) => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + item.weight, 0);

  if (score <= 0) return 'sedentary';
  if (score <= 2) return 'lightly_active';
  if (score <= 4) return 'moderate';
  if (score <= 6) return 'very_active';
  return 'extremely_active';
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

  // Use proper number checks (typeof) to allow 0 as a valid value
  // Min 500 matches backend validation (profileController.js line 615)
  const calories = targets.dailyCalories;
  if (typeof calories !== 'number' || isNaN(calories) || calories < 500 || calories > 10000) {
    errors.dailyCalories = 'Calories must be between 500 and 10,000';
  }

  const protein = targets.proteinG;
  if (typeof protein !== 'number' || isNaN(protein) || protein < 0 || protein > 500) {
    errors.proteinG = 'Protein must be between 0 and 500g';
  }

  const carbs = targets.carbsG;
  if (typeof carbs !== 'number' || isNaN(carbs) || carbs < 0 || carbs > 1000) {
    errors.carbsG = 'Carbs must be between 0 and 1,000g';
  }

  const fats = targets.fatsG;
  if (typeof fats !== 'number' || isNaN(fats) || fats < 0 || fats > 300) {
    errors.fatsG = 'Fats must be between 0 and 300g';
  }

  const water = targets.waterLiters;
  if (typeof water !== 'number' || isNaN(water) || water < 0.5 || water > 10) {
    errors.waterLiters = 'Water must be between 0.5 and 10 liters';
  }

  // Note: We don't enforce strict macro-calorie balance here
  // Users may want to customize targets that don't perfectly match
  // The app will show both values and users can adjust as needed

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
export const getGoalContext = (_targets, userData) => {
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
