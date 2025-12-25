/**
 * Safe Number Parsing Utilities
 *
 * Handles type coercion for Postgres Decimal fields (stored as strings)
 * and provides safe defaults for invalid/missing values
 */

/**
 * Safely parse a decimal value to number
 * @param {string|number|null|undefined} value - Value to parse
 * @param {number} defaultValue - Default if parsing fails
 * @returns {number} Parsed number or default
 */
export const parseDecimal = (value, defaultValue = 0) => {
  // Already a valid number
  if (typeof value === 'number' && isFinite(value)) {
    return value;
  }

  // Try parsing string
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }

  // Return default for null, undefined, NaN, Infinity
  return defaultValue;
};

/**
 * Parse liters value with validation
 * @param {*} value - Liters value
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Validated liters
 */
export const parseLiters = (value, min = 0, max = 20) => {
  const parsed = parseDecimal(value, 0);
  return Math.max(min, Math.min(max, parsed));
};

/**
 * Parse goal value with smart defaults
 * @param {*} value - Goal value
 * @param {number} defaultGoal - Default goal if invalid
 * @param {number} min - Minimum valid goal
 * @param {number} max - Maximum valid goal
 * @returns {number} Validated goal
 */
export const parseGoal = (value, defaultGoal, min = 0.1, max = 100) => {
  const parsed = parseDecimal(value, 0);

  // If parsed value is invalid or out of bounds, use default
  if (parsed < min || parsed > max) {
    return defaultGoal;
  }

  return parsed;
};

/**
 * Parse calories with bounds checking
 * @param {*} value - Calorie value
 * @returns {number} Validated calories (0-10000 range)
 */
export const parseCalories = (value) => {
  return parseDecimal(value, 0);
};

/**
 * Parse macronutrient value (protein, carbs, fat)
 * @param {*} value - Macro value
 * @returns {number} Validated macro value
 */
export const parseMacro = (value) => {
  return Math.max(0, parseDecimal(value, 0));
};

/**
 * Parse percentage (0-100 or 0-200 depending on context)
 * @param {*} value - Percentage value
 * @param {number} max - Maximum allowed percentage
 * @returns {number} Clamped percentage
 */
export const parsePercentage = (value, max = 100) => {
  const parsed = parseDecimal(value, 0);
  return Math.max(0, Math.min(max, parsed));
};

/**
 * Parse intensity value (1-10 scale for mood)
 * @param {*} value - Intensity value
 * @returns {number|null} Validated intensity or null
 */
export const parseIntensity = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = parseDecimal(value, 5);
  return Math.max(1, Math.min(10, Math.round(parsed)));
};

/**
 * Safely divide two numbers with zero check
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} defaultValue - Return if denominator is 0
 * @returns {number}
 */
export const safeDivide = (numerator, denominator, defaultValue = 0) => {
  if (denominator === 0 || !isFinite(denominator)) {
    return defaultValue;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : defaultValue;
};

/**
 * Calculate percentage safely
 * @param {number} value - Current value
 * @param {number} goal - Goal value
 * @param {number} max - Maximum percentage to return
 * @returns {number} Percentage (0-max)
 */
export const calculatePercentage = (value, goal, max = 100) => {
  const safeValue = parseDecimal(value, 0);
  const safeGoal = parseDecimal(goal, 1); // Avoid division by zero

  if (safeGoal <= 0) return 0;

  const percentage = (safeValue / safeGoal) * 100;
  return Math.max(0, Math.min(max, percentage));
};
