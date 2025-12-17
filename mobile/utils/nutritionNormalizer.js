/**
 * Nutrition Data Normalization Utilities
 *
 * Ensures all nutrition data is:
 * - Numeric only (no units in values)
 * - Per-serving (not daily totals)
 * - Sanity-checked against realistic bounds
 * - Ready for aggregation in Dashboard
 */

/**
 * Realistic upper bounds for per-serving nutrition values
 * These prevent AI hallucinations and aggregation explosions
 */
const SANITY_BOUNDS = {
  // Macros (per serving)
  calories: 2000,      // Max 2000 kcal per serving (extremely large meal)
  protein: 100,        // Max 100g protein per serving
  carbs: 200,          // Max 200g carbs per serving
  fat: 100,            // Max 100g fat per serving
  fiber: 50,           // Max 50g fiber per serving
  sugar: 100,          // Max 100g sugar per serving

  // Micronutrients (per serving, in mg unless specified)
  vitaminC: 500,       // mg - upper limit before toxicity concerns
  vitaminD: 100,       // μg (stored as mg equivalent)
  vitaminE: 100,       // mg
  vitaminK: 1000,      // μg
  vitaminB12: 100,     // μg
  calcium: 1500,       // mg
  iron: 50,            // mg
  magnesium: 500,      // mg
  potassium: 4000,     // mg
  zinc: 50,            // mg
  sodium: 5000,        // mg (high but realistic for processed foods)
  folate: 1000,        // μg
};

/**
 * Parse a nutrition value string and extract numeric value + unit
 * Examples:
 *   "7540mg" → { value: 7540, unit: "mg" }
 *   "10.5g" → { value: 10.5, unit: "g" }
 *   "45" → { value: 45, unit: "" }
 *   "trace" → { value: 0, unit: "" }
 */
export function parseNutritionValue(input) {
  if (typeof input === 'number') {
    return { value: input, unit: '' };
  }

  if (typeof input !== 'string') {
    return { value: 0, unit: '' };
  }

  // Handle special cases
  const normalized = input.toLowerCase().trim();
  if (normalized === 'trace' || normalized === 'none' || normalized === 'n/a') {
    return { value: 0, unit: '' };
  }

  // Extract number and unit using regex
  const match = normalized.match(/^([\d.]+)\s*([a-zμ]*)$/i);
  if (!match) {
    // Try just extracting the number
    const numOnly = parseFloat(normalized);
    return {
      value: isNaN(numOnly) ? 0 : numOnly,
      unit: '',
    };
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || '';

  return {
    value: isNaN(value) ? 0 : value,
    unit: unit.toLowerCase(),
  };
}

/**
 * Apply sanity bounds to a nutrition value
 * Clamps to reasonable per-serving limits
 */
export function applySanityBounds(nutrient, value) {
  const bound = SANITY_BOUNDS[nutrient];
  if (!bound) {
    // No bound defined - return as-is
    return value;
  }

  if (value > bound) {
    console.warn(
      `[NutritionNormalizer] ${nutrient} value ${value} exceeds sanity bound ${bound}, clamping`
    );
    return bound;
  }

  return value;
}

/**
 * Normalize macronutrient values
 * Returns clean numbers ready for storage
 */
export function normalizeMacros(data) {
  const parseAndClamp = (field, value) => {
    const { value: parsed } = parseNutritionValue(value);
    const clamped = applySanityBounds(field, parsed);
    return Math.max(0, Math.round(clamped)); // Round to integers, ensure non-negative
  };

  return {
    calories: parseAndClamp('calories', data.calories || 0),
    protein: parseAndClamp('protein', data.protein || 0),
    carbs: parseAndClamp('carbs', data.carbs || data.carbohydrates || 0),
    fat: parseAndClamp('fat', data.fats || data.fat || 0),
    fiber: data.fiber ? parseAndClamp('fiber', data.fiber) : undefined,
    sugar: data.sugar ? parseAndClamp('sugar', data.sugar) : undefined,
    sugarAlcohols: data.sugarAlcohols ? parseAndClamp('sugar', data.sugarAlcohols) : undefined,
  };
}

/**
 * Normalize micronutrients object
 * Converts { "vitaminC": "7540mg", "iron": "3.1mg" }
 * To { "vitaminC_mg": 500, "iron_mg": 3 }
 *
 * Returns numeric-only values with explicit units in keys
 */
export function normalizeMicros(micros) {
  if (!micros || typeof micros !== 'object') {
    return {};
  }

  const normalized = {};

  Object.entries(micros).forEach(([key, value]) => {
    const { value: parsed, unit } = parseNutritionValue(value);

    // Determine nutrient name (remove existing unit suffix if present)
    const nutrientName = key
      .replace(/_mg$|_g$|_mcg$|_ug$|_μg$/i, '')
      .toLowerCase();

    // Apply sanity bounds
    const bounded = applySanityBounds(nutrientName, parsed);

    // Store with explicit unit in key
    // Default to mg for most micronutrients
    const defaultUnit = unit || 'mg';
    const storageKey = `${nutrientName}_${defaultUnit}`;

    normalized[storageKey] = Math.round(bounded * 10) / 10; // Round to 1 decimal place
  });

  return normalized;
}

/**
 * Validate macros for consistency
 * Macros should sum to approximately calories (4-4-9 rule)
 */
export function validateMacroConsistency(macros) {
  const { calories, protein, carbs, fat } = macros;

  // Calculate expected calories from macros
  const expectedCalories = (protein * 4) + (carbs * 4) + (fat * 9);

  // Allow 20% margin of error (AI estimates are imperfect)
  const margin = 0.2;
  const lowerBound = expectedCalories * (1 - margin);
  const upperBound = expectedCalories * (1 + margin);

  const isValid = calories >= lowerBound && calories <= upperBound;

  if (!isValid) {
    console.warn(
      `[NutritionNormalizer] Macro inconsistency detected:` +
      `\n  Reported calories: ${calories}` +
      `\n  Expected from macros: ${Math.round(expectedCalories)}` +
      `\n  Using macro-derived value`
    );
  }

  return {
    isValid,
    expectedCalories: Math.round(expectedCalories),
    difference: Math.abs(calories - expectedCalories),
  };
}

/**
 * Main normalization function
 * Takes raw AI output and returns clean FoodLog-ready data
 */
export function normalizeNutritionData(rawData) {
  // Normalize macros
  const macros = normalizeMacros(rawData);

  // Validate macro consistency
  const validation = validateMacroConsistency(macros);

  // If macros don't match calories and difference is significant, use macro-derived
  if (!validation.isValid && validation.difference > 50) {
    macros.calories = validation.expectedCalories;
  }

  // Normalize micros
  const micros = normalizeMicros(rawData.micros || {});

  // Build micronutrients array for detailed display
  const micronutrients = Object.entries(micros).map(([key, amount]) => {
    // Extract nutrient name and unit from key
    const match = key.match(/^(.+)_(mg|g|mcg|ug|μg)$/);
    const name = match ? match[1] : key;
    const unit = match ? match[2] : 'mg';

    return {
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
      amount,
      unit,
    };
  });

  return {
    ...macros,
    micros, // Clean numeric object
    micronutrients, // Detailed array
  };
}

/**
 * Detect if data looks like it's already aggregated
 * Heuristic: if multiple nutrients exceed 150% of daily values, likely aggregated
 */
export function detectAggregatedData(data) {
  const flags = [];

  if (data.calories > 3000) flags.push('calories');
  if (data.protein > 150) flags.push('protein');
  if (data.carbs > 300) flags.push('carbs');
  if (data.fat > 150) flags.push('fat');

  // Check micros
  const micros = data.micros || {};
  if (micros.vitaminC && parseFloat(micros.vitaminC) > 200) flags.push('vitaminC');
  if (micros.iron && parseFloat(micros.iron) > 30) flags.push('iron');
  if (micros.calcium && parseFloat(micros.calcium) > 2000) flags.push('calcium');

  const isAggregated = flags.length >= 2;

  if (isAggregated) {
    console.warn(
      `[NutritionNormalizer] Data appears to be pre-aggregated (flags: ${flags.join(', ')}). ` +
      `Consider dividing by serving count or meal count.`
    );
  }

  return {
    isAggregated,
    flags,
    suggestion: isAggregated
      ? 'This looks like multiple servings or a daily total. Consider dividing values.'
      : null,
  };
}
