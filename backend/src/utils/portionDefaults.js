/**
 * Smart Portion Defaulting Utility
 *
 * Determines the appropriate default portion based on food type:
 * - Unit-based foods: "1 medium roti", "1 large egg", "1 medium banana"
 * - Serving-based foods: "1 serving", "1 cup"
 *
 * This prevents OpenAI from interpreting "1 serving of roti" as 2-3 rotis.
 */

import {
  getCountableFoodConfig,
  isCountableFood,
} from '../constants/countableFoods.js';

/**
 * Build the appropriate default portion string for a food
 *
 * @param {string} foodName - The food name (e.g., "roti", "rice", "chicken curry")
 * @param {number|null} userQuantity - User-specified quantity (if any)
 * @param {string|null} userUnit - User-specified unit (if any)
 * @returns {Object} { portionString, isCountable, portionSource, expectedCalories, countableConfig }
 *
 * Examples:
 * - buildDefaultPortion("roti", null, null) → { portionString: "1 medium roti (40g)", isCountable: true }
 * - buildDefaultPortion("roti", 2, null) → { portionString: "2 medium rotis (80g)", isCountable: true }
 * - buildDefaultPortion("dal", null, null) → { portionString: "1 serving", isCountable: false }
 * - buildDefaultPortion("rice", 1, "cup") → { portionString: "1 cup", isCountable: false }
 */
export function buildDefaultPortion(
  foodName,
  userQuantity = null,
  userUnit = null
) {
  // If user specified both quantity and unit, use their values
  if (userQuantity && userUnit) {
    return {
      portionString: `${userQuantity} ${userUnit}`,
      isCountable: isCountableFood(foodName),
      portionSource: 'user_specified',
      expectedCalories: null,
      countableConfig: getCountableFoodConfig(foodName),
    };
  }

  // Check if this is a countable food
  const countableConfig = getCountableFoodConfig(foodName);

  if (countableConfig) {
    // Unit-based food - use item-specific default
    const qty = userQuantity || countableConfig.defaultQuantity;
    const grams = countableConfig.gramsPerUnit * qty;

    // Build a natural portion string with gram weight for accuracy
    let portionString;
    if (qty === 1) {
      // Use the standard template for single item
      portionString = countableConfig.portionTemplate;
    } else {
      // Build plural form with updated weight
      const foodKey = countableConfig.key;
      const unit = countableConfig.defaultUnit;
      // Handle pluralization
      const pluralFood = foodKey.endsWith('s') ? foodKey : `${foodKey}s`;
      portionString = `${qty} ${unit} ${pluralFood} (${grams}g)`;
    }

    return {
      portionString,
      isCountable: true,
      portionSource: userQuantity ? 'user_quantity' : 'countable_default',
      expectedCalories: countableConfig.caloriesPerUnit * qty,
      expectedMacros: countableConfig.macrosPerUnit
        ? {
            protein: countableConfig.macrosPerUnit.protein * qty,
            carbs: countableConfig.macrosPerUnit.carbs * qty,
            fat: countableConfig.macrosPerUnit.fat * qty,
            fiber: countableConfig.macrosPerUnit.fiber * qty,
          }
        : null,
      countableConfig,
      quantity: qty,
      gramsEquivalent: grams,
    };
  }

  // Serving-based food - use generic default
  if (userQuantity) {
    // User specified quantity but no unit
    return {
      portionString: `${userQuantity} serving${userQuantity > 1 ? 's' : ''}`,
      isCountable: false,
      portionSource: 'user_quantity_serving',
      expectedCalories: null,
      countableConfig: null,
    };
  }

  // No user input, not countable - use "1 serving"
  return {
    portionString: '1 serving',
    isCountable: false,
    portionSource: 'serving_default',
    expectedCalories: null,
    countableConfig: null,
  };
}

/**
 * Get detailed portion information for UI display
 * Allows users to see and adjust the assumed portion
 *
 * @param {string} foodName - Food name
 * @param {string} currentPortion - Current portion string
 * @returns {Object} Portion adjustment options for UI
 */
export function getPortionAdjustmentOptions(foodName, currentPortion) {
  const countableConfig = getCountableFoodConfig(foodName);

  if (!countableConfig) {
    // Generic serving-based options
    return {
      isCountable: false,
      currentPortion,
      unitLabel: 'serving',
      itemName: foodName,
      suggestedOptions: [
        { label: '0.5 serving', value: '0.5 serving', multiplier: 0.5 },
        { label: '1 serving', value: '1 serving', multiplier: 1 },
        { label: '1.5 servings', value: '1.5 servings', multiplier: 1.5 },
        { label: '2 servings', value: '2 servings', multiplier: 2 },
        { label: '1 cup', value: '1 cup', multiplier: 1 },
        { label: '100g', value: '100g', multiplier: 1 },
      ],
    };
  }

  // Countable food - provide item-based options
  const key = countableConfig.key;
  const cal = countableConfig.caloriesPerUnit;
  const grams = countableConfig.gramsPerUnit;

  return {
    isCountable: true,
    currentPortion,
    unitLabel: countableConfig.defaultUnit,
    itemName: key,
    caloriesPerUnit: cal,
    gramsPerUnit: grams,
    macrosPerUnit: countableConfig.macrosPerUnit,
    suggestedOptions: [
      {
        label: `0.5 ${key}`,
        value: `0.5 ${countableConfig.defaultUnit} ${key} (${Math.round(grams * 0.5)}g)`,
        quantity: 0.5,
        calories: Math.round(cal * 0.5),
        grams: Math.round(grams * 0.5),
      },
      {
        label: `1 ${key}`,
        value: countableConfig.portionTemplate,
        quantity: 1,
        calories: cal,
        grams: grams,
      },
      {
        label: `2 ${key}s`,
        value: `2 ${countableConfig.defaultUnit} ${key}s (${grams * 2}g)`,
        quantity: 2,
        calories: cal * 2,
        grams: grams * 2,
      },
      {
        label: `3 ${key}s`,
        value: `3 ${countableConfig.defaultUnit} ${key}s (${grams * 3}g)`,
        quantity: 3,
        calories: cal * 3,
        grams: grams * 3,
      },
    ],
  };
}

/**
 * Scale nutrition values by a quantity multiplier
 *
 * @param {Object} macros - Original macros object
 * @param {number} multiplier - Scale factor
 * @returns {Object} Scaled macros
 */
export function scaleNutrition(macros, multiplier) {
  if (!macros || multiplier === 1) return macros;

  const scaled = {};
  for (const [key, value] of Object.entries(macros)) {
    if (typeof value === 'number') {
      scaled[key] = Math.round(value * multiplier * 10) / 10; // Round to 1 decimal
    } else {
      scaled[key] = value;
    }
  }
  return scaled;
}

/**
 * Parse a portion string back into quantity and unit
 * Useful for UI editing
 *
 * @param {string} portionString - e.g., "2 medium rotis", "1 cup", "100g"
 * @returns {Object} { quantity, unit, remainder }
 */
export function parsePortionString(portionString) {
  if (!portionString)
    return { quantity: 1, unit: 'serving', remainder: '', grams: null };

  // Check for gram specification: "1 medium roti (40g)"
  const gramsMatch = portionString.match(/\((\d+(?:\.\d+)?)\s*g\)/i);
  const grams = gramsMatch ? parseFloat(gramsMatch[1]) : null;

  // Match patterns like "2 medium rotis", "1 cup rice", "100g"
  const match = portionString.match(
    /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)?(.*)$/
  );

  if (match) {
    return {
      quantity: parseFloat(match[1]),
      unit: match[2]?.trim() || 'serving',
      remainder: match[3]?.trim().replace(/\(\d+(?:\.\d+)?\s*g\)/i, '') || '',
      grams,
    };
  }

  return { quantity: 1, unit: 'serving', remainder: portionString, grams };
}

/**
 * Get the expected nutrition for a countable food based on quantity
 *
 * @param {string} foodName - Food name
 * @param {number} quantity - Number of items
 * @returns {Object|null} Expected nutrition or null if not countable
 */
export function getExpectedNutrition(foodName, quantity = 1) {
  const config = getCountableFoodConfig(foodName);
  if (!config) return null;

  return {
    calories: Math.round(config.caloriesPerUnit * quantity),
    protein: Math.round(config.macrosPerUnit.protein * quantity * 10) / 10,
    carbs: Math.round(config.macrosPerUnit.carbs * quantity * 10) / 10,
    fat: Math.round(config.macrosPerUnit.fat * quantity * 10) / 10,
    fiber: Math.round(config.macrosPerUnit.fiber * quantity * 10) / 10,
    grams: Math.round(config.gramsPerUnit * quantity),
    portionString:
      quantity === 1
        ? config.portionTemplate
        : `${quantity} ${config.defaultUnit} ${config.key}${quantity > 1 ? 's' : ''} (${Math.round(config.gramsPerUnit * quantity)}g)`,
  };
}

export default {
  buildDefaultPortion,
  getPortionAdjustmentOptions,
  scaleNutrition,
  parsePortionString,
  getExpectedNutrition,
};
