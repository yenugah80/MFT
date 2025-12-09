/**
 * Profile Validation
 * Comprehensive validation for all profile sections
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate basics section
 * @param {Object} basics - Basics data
 * @returns {Object} Validation errors (empty object if valid)
 */
export const validateBasics = (basics) => {
  const errors = {};

  // Name validation
  if (!basics.fullName?.trim()) {
    errors.fullName = 'Name is required';
  } else if (basics.fullName.trim().length < 2) {
    errors.fullName = 'Name must be at least 2 characters';
  }

  // Email validation
  if (!basics.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(basics.email)) {
    errors.email = 'Invalid email format';
  }

  // Age validation
  if (basics.age) {
    const age = parseInt(basics.age, 10);
    if (isNaN(age) || age < 1 || age > 120) {
      errors.age = 'Age must be between 1 and 120';
    }
  }

  // Weight validation
  if (basics.weightKg) {
    const weight = parseFloat(basics.weightKg);
    if (isNaN(weight) || weight < 20 || weight > 500) {
      errors.weightKg = 'Weight must be between 20 and 500 kg';
    }
  }

  // Height validation
  if (basics.heightCm) {
    const height = parseFloat(basics.heightCm);
    if (isNaN(height) || height < 50 || height > 300) {
      errors.heightCm = 'Height must be between 50 and 300 cm';
    }
  }

  // Gender validation
  if (basics.gender && !['male', 'female', 'other'].includes(basics.gender)) {
    errors.gender = 'Invalid gender selection';
  }

  return errors;
};

/**
 * Validate dietary section
 * @param {Object} dietary - Dietary data
 * @returns {Object} Validation errors
 */
export const validateDietary = (dietary) => {
  const errors = {};

  // Check for empty preferences
  if (dietary.preferences?.length === 0) {
    errors.preferences = 'At least one dietary preference is recommended';
  }

  // Check for duplicates in allergies
  const allergySet = new Set(dietary.allergies);
  if (allergySet.size !== dietary.allergies?.length) {
    errors.allergies = 'Duplicate allergies detected';
  }

  return errors;
};

/**
 * Validate nutrition goals
 * @param {Object} goals - Goals data
 * @returns {Object} Validation errors
 */
export const validateGoals = (goals) => {
  const errors = {};

  // Calories validation
  if (goals.calories) {
    const calories = parseFloat(goals.calories);
    if (isNaN(calories) || calories < 500 || calories > 10000) {
      errors.calories = 'Calories must be between 500 and 10,000';
    }

    // Macro validation
    const protein = parseFloat(goals.protein) || 0;
    const carbs = parseFloat(goals.carbs) || 0;
    const fats = parseFloat(goals.fats) || 0;

    const macroCalories = protein * 4 + carbs * 4 + fats * 9;
    const difference = Math.abs(macroCalories - calories);

    // Allow 20% difference
    if (difference > calories * 0.2) {
      errors.macros = `Macro totals (${Math.round(macroCalories)} kcal) don't match calorie goal (${Math.round(calories)} kcal)`;
    }
  }

  // Protein validation
  if (goals.protein) {
    const protein = parseFloat(goals.protein);
    if (isNaN(protein) || protein < 0 || protein > 500) {
      errors.protein = 'Protein must be between 0 and 500g';
    }
  }

  // Carbs validation
  if (goals.carbs) {
    const carbs = parseFloat(goals.carbs);
    if (isNaN(carbs) || carbs < 0 || carbs > 1000) {
      errors.carbs = 'Carbs must be between 0 and 1000g';
    }
  }

  // Fats validation
  if (goals.fats) {
    const fats = parseFloat(goals.fats);
    if (isNaN(fats) || fats < 0 || fats > 300) {
      errors.fats = 'Fats must be between 0 and 300g';
    }
  }

  // Water validation
  if (goals.water) {
    const water = parseFloat(goals.water);
    if (isNaN(water) || water < 0 || water > 20) {
      errors.water = 'Water must be between 0 and 20 liters';
    }
  }

  return errors;
};

/**
 * Validate gamification data
 * @param {Object} gamification - Gamification data
 * @returns {Object} Validation errors
 */
export const validateGamification = (gamification) => {
  const errors = {};

  if (gamification.xp < 0) {
    errors.xp = 'XP cannot be negative';
  }

  if (gamification.level < 1 || gamification.level > 100) {
    errors.level = 'Level must be between 1 and 100';
  }

  if (gamification.streak < 0) {
    errors.streak = 'Streak cannot be negative';
  }

  return errors;
};

/**
 * Check if validation errors object has any errors
 * @param {Object} errors - Validation errors
 * @returns {boolean} True if has errors
 */
export const hasValidationErrors = (errors) => {
  return Object.keys(errors).length > 0;
};
