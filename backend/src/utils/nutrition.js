/**
 * Nutrition Utility Helpers
 * Handles scaling, validation, and unit conversion.
 */

/**
 * Scale nutrients from a base amount to a target amount.
 * @param {Object} nutrients - Object containing nutrient values (e.g., { calories: 100, protein: 5 })
 * @param {number} baseAmount - The amount the nutrients are currently based on (e.g., 100g)
 * @param {number} targetAmount - The amount to scale to (e.g., 250g)
 * @returns {Object} Scaled nutrients
 */
export function scaleNutrients(nutrients, baseAmount, targetAmount) {
  if (!baseAmount || !targetAmount || baseAmount <= 0) return nutrients;
  
  const ratio = targetAmount / baseAmount;
  const scaled = {};

  for (const [key, value] of Object.entries(nutrients)) {
    if (typeof value === 'number') {
      scaled[key] = Number((value * ratio).toFixed(2));
    } else {
      scaled[key] = value;
    }
  }
  return scaled;
}

/**
 * Validate if the caloric total roughly matches the macronutrients.
 * Uses the Atwater system: Protein (4), Carbs (4), Fat (9), Alcohol (7).
 * Allows for a margin of error (e.g., 20%).
 * @param {number} calories 
 * @param {number} protein 
 * @param {number} carbs 
 * @param {number} fat 
 * @returns {Object} { isValid: boolean, expectedCalories: number, diff: number }
 */
export function validateMacros(calories, protein, carbs, fat) {
  const p = protein || 0;
  const c = carbs || 0;
  const f = fat || 0;

  const expected = (p * 4) + (c * 4) + (f * 9);
  
  // If calories are 0 or missing, we can't validate, or it's just water/diet soda
  if (!calories) return { isValid: true, expectedCalories: expected, diff: 0 };

  const diff = Math.abs(calories - expected);
  const margin = calories * 0.2; // 20% margin of error

  return {
    isValid: diff <= margin,
    expectedCalories: Math.round(expected),
    diff: Math.round(diff)
  };
}

/**
 * Parse a serving size string to grams if possible.
 * Very basic heuristic.
 * @param {string} servingSizeStr - e.g. "100g", "1 cup (240ml)", "1 oz"
 * @returns {number|null} Estimated grams or null
 */
export function parseServingToGrams(servingSizeStr) {
  if (!servingSizeStr) return null;
  const str = servingSizeStr.toLowerCase().trim();

  // Direct gram match
  const gMatch = str.match(/(\d+(\.\d+)?)\s*g/);
  if (gMatch) return parseFloat(gMatch[1]);

  // Ounces
  const ozMatch = str.match(/(\d+(\.\d+)?)\s*oz/);
  if (ozMatch) return parseFloat(ozMatch[1]) * 28.35;

  // Milliliters (assuming water density roughly)
  const mlMatch = str.match(/(\d+(\.\d+)?)\s*ml/);
  if (mlMatch) return parseFloat(mlMatch[1]);

  return null; // Unknown unit
}
