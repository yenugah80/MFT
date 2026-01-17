/**
 * Nutrition Analysis Schema Normalization
 * Validates and normalizes AI responses to ensure data quality
 * Supports both single-item and multi-item (plate scan) formats
 */

/**
 * Normalize multi-item image analysis response
 * NEW: Handles the array-based format from multi-item plate scanning
 * @param {Object} rawData - Raw AI response with items array
 * @returns {Object} Normalized response with items array and totals
 */
export function normalizeMultiItemAnalysis(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid nutrition analysis data: expected object');
  }

  // Check if this is the new multi-item format
  if (rawData.items && Array.isArray(rawData.items)) {
    console.log(`[Schema] Multi-item format detected: ${rawData.items.length} items`);

    const normalizedItems = rawData.items.map((item, idx) => {
      try {
        return normalizeMultiItemEntry(item, idx);
      } catch (err) {
        console.error(`[Schema] Failed to normalize item ${idx}:`, err.message);
        return null;
      }
    }).filter(Boolean);

    // Calculate totals from items
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      micros: {}
    };

    normalizedItems.forEach(item => {
      totals.calories += item.macros?.calories || 0;
      totals.protein += item.macros?.protein || 0;
      totals.carbs += item.macros?.carbs || 0;
      totals.fat += item.macros?.fat || 0;
      totals.fiber += item.macros?.fiber || 0;
      totals.sugar += item.macros?.sugar || 0;
      totals.sodium += item.macros?.sodium || 0;

      // Aggregate micros
      if (item.micros) {
        Object.entries(item.micros).forEach(([key, val]) => {
          if (!totals.micros[key]) {
            totals.micros[key] = { value: 0, unit: val.unit || 'mg' };
          }
          totals.micros[key].value += val.value || 0;
        });
      }
    });

    return {
      isMultiItem: true,
      items: normalizedItems,
      totals,
      mealSummary: {
        totalItems: normalizedItems.length,
        totalCalories: Math.round(totals.calories),
        dominantCuisine: rawData.mealSummary?.dominantCuisine || 'Mixed',
        mealType: rawData.mealSummary?.mealType || 'meal'
      }
    };
  }

  // Fallback: Single item format (legacy) - convert to multi-item structure
  console.log('[Schema] Single-item format detected, converting to multi-item structure');
  const singleItem = normalizeNutritionAnalysis(rawData);

  return {
    isMultiItem: false,
    items: [{
      name: singleItem.foodName,
      description: singleItem.description,
      portion: {
        amount: 1,
        unit: 'serving',
        estimatedGrams: singleItem.portionGrams || 100
      },
      macros: {
        calories: singleItem.calories,
        protein: singleItem.protein,
        carbs: singleItem.carbs,
        fat: singleItem.fats,
        fiber: singleItem.fiber,
        sugar: singleItem.sugar,
        sodium: singleItem.sodium
      },
      micros: singleItem.micros,
      confidence: singleItem.confidence,
      ingredients: singleItem.ingredients,
      isComplex: singleItem.isComplex
    }],
    totals: {
      calories: singleItem.calories,
      protein: singleItem.protein,
      carbs: singleItem.carbs,
      fat: singleItem.fats,
      fiber: singleItem.fiber,
      sugar: singleItem.sugar,
      sodium: singleItem.sodium,
      micros: singleItem.micros
    },
    mealSummary: {
      totalItems: 1,
      totalCalories: Math.round(singleItem.calories),
      dominantCuisine: 'Unknown',
      mealType: singleItem.mealType || 'meal'
    }
  };
}

/**
 * Normalize a single item from multi-item response
 * @param {Object} item - Raw item from items array
 * @param {number} index - Item index for error logging
 * @returns {Object} Normalized item
 */
function normalizeMultiItemEntry(item, index) {
  if (!item || typeof item !== 'object') {
    throw new Error(`Item ${index} is not an object`);
  }

  const macros = item.macros || {};
  const portion = item.portion || {};

  return {
    name: validateString(item.name, `Item ${index + 1}`, 1, 200),
    description: validateString(item.description, '', 0, 500),
    portion: {
      amount: validateNumber(portion.amount, 1, 0, 100),
      unit: validateString(portion.unit, 'serving', 1, 20),
      estimatedGrams: validateNumber(portion.estimatedGrams || portion.grams, 100, 0, 5000)
    },
    macros: {
      calories: validateNumber(macros.calories, 0, 0, 5000),
      protein: validateNumber(macros.protein, 0, 0, 300),
      carbs: validateNumber(macros.carbs, 0, 0, 500),
      fat: validateNumber(macros.fat, 0, 0, 300),
      fiber: validateNumber(macros.fiber, 0, 0, 100),
      sugar: validateNumber(macros.sugar, 0, 0, 300),
      sodium: validateNumber(macros.sodium, 0, 0, 10000)
    },
    micros: normalizeMicronutrients(item.micros),
    confidence: validateConfidence(item.confidence),
    ingredients: validateIngredients(item.ingredients),
    isComplex: item.isComplex === true || (item.ingredients && item.ingredients.length > 1)
  };
}

/**
 * Normalize and validate nutrition analysis response (LEGACY single-item format)
 * @param {Object} rawData - Raw AI response
 * @returns {Object} Normalized and validated nutrition data
 */
export function normalizeNutritionAnalysis(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid nutrition analysis data: expected object');
  }

  // Normalize numeric values
  const ingredients = validateIngredients(rawData.ingredients);

  const normalized = {
    foodName: validateString(rawData.foodName, 'Unknown Food', 1, 200),
    description: validateString(rawData.description, 'AI Analyzed Meal', 0, 500),
    calories: validateNumber(rawData.calories, 0, 0, 10000),
    protein: validateNumber(rawData.protein, 0, 0, 500),
    carbs: validateNumber(rawData.carbs, 0, 0, 500),
    fats: validateNumber(rawData.fats || rawData.fat, 0, 0, 500),
    fiber: validateNumber(rawData.fiber, 0, 0, 100),
    sugar: validateNumber(rawData.sugar, 0, 0, 500),
    sodium: validateNumber(rawData.sodium, 0, 0, 10000),
    servingSize: validateString(rawData.servingSize, '1 serving', 1, 100),
    portionGrams: validateNumber(rawData.portionGrams, null, 0, 5000),
    mealType: validateMealType(rawData.mealType),
    confidence: validateConfidence(rawData.confidence),
    ingredients,
    // isComplex: true if multiple ingredients with nutrition data
    isComplex: rawData.isComplex === true || ingredients.length > 1,
    // Map ingredients to components for consistency with text mode
    components: ingredients.filter(i => i.calories > 0),
    micros: normalizeMicronutrients(rawData.micros),
    analysisNotes: validateString(rawData.analysisNotes, null, 0, 500),
  };

  // Validate macros add up reasonably (allow some margin for rounding)
  const calculatedCalories = (normalized.protein * 4) + (normalized.carbs * 4) + (normalized.fats * 9);
  const calorieDiff = Math.abs(normalized.calories - calculatedCalories);

  // If difference is > 20%, log a warning but don't reject
  if (calorieDiff > normalized.calories * 0.2 && normalized.calories > 0) {
    console.warn(
      `[Schema] Macro-calorie mismatch for ${normalized.foodName}: ` +
      `Reported: ${normalized.calories} kcal, Calculated: ${calculatedCalories} kcal (diff: ${calorieDiff})`
    );
  }

  return normalized;
}

/**
 * Validate string field
 */
function validateString(value, defaultValue, minLength = 0, maxLength = Infinity) {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const str = String(value).trim();

  if (str.length < minLength) {
    return defaultValue;
  }

  return str.length > maxLength ? str.substring(0, maxLength) : str;
}

/**
 * Validate numeric field
 */
function validateNumber(value, defaultValue, min = -Infinity, max = Infinity) {
  const num = parseFloat(value);

  if (isNaN(num)) {
    return defaultValue;
  }

  // Clamp to range
  if (num < min) return min;
  if (num > max) return max;

  // Round to 1 decimal place
  return Math.round(num * 10) / 10;
}

/**
 * Validate meal type
 */
function validateMealType(value) {
  const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const normalized = String(value || '').toLowerCase().trim();

  return validTypes.includes(normalized) ? normalized : 'snack';
}

/**
 * Validate confidence score
 */
function validateConfidence(value) {
  const conf = parseFloat(value);

  if (isNaN(conf)) {
    return 0.75; // Default moderate confidence
  }

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, conf));
}

/**
 * Validate ingredients array
 * Supports both simple strings and structured objects with nutrition
 */
function validateIngredients(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => {
      // Handle string format (legacy)
      if (typeof item === 'string' && item.trim().length > 0) {
        return { name: item.trim() };
      }

      // Handle structured object format (new)
      if (item && typeof item === 'object' && item.name) {
        return {
          name: validateString(item.name, '', 1, 100),
          portion: validateString(item.portion, '1 serving', 0, 50),
          calories: validateNumber(item.calories, 0, 0, 5000),
          protein: validateNumber(item.protein, 0, 0, 200),
          carbs: validateNumber(item.carbs, 0, 0, 300),
          fat: validateNumber(item.fat, 0, 0, 200),
        };
      }

      return null;
    })
    .filter(item => item && item.name && item.name.length > 0)
    .slice(0, 50); // Max 50 ingredients
}

/**
 * Normalize micronutrients object
 * Converts camelCase keys (vitaminA) to snake_case (vitamin_a) for consistency
 * Returns structured {value: number, unit: string} objects for proper aggregation
 */
function normalizeMicronutrients(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  // Accept camelCase, snake_case, and suffixed formats (e.g., calcium_mg, vitaminA_mcg)
  const keyMapping = {
    // Input formats (camelCase from AI)
    'vitaminA': 'vitamin_a',
    'vitaminC': 'vitamin_c',
    'vitaminD': 'vitamin_d',
    'vitaminE': 'vitamin_e',
    'vitaminK': 'vitamin_k',
    'vitaminB12': 'vitamin_b12',
    // Already correct formats (snake_case or single word)
    'vitamin_a': 'vitamin_a',
    'vitamin_c': 'vitamin_c',
    'vitamin_d': 'vitamin_d',
    'vitamin_e': 'vitamin_e',
    'vitamin_k': 'vitamin_k',
    'vitamin_b12': 'vitamin_b12',
    'calcium': 'calcium',
    'iron': 'iron',
    'magnesium': 'magnesium',
    'potassium': 'potassium',
    'zinc': 'zinc',
    'sodium': 'sodium',
    'folate': 'folate',
    // Suffixed variants (defensive - handle legacy or inconsistent AI outputs)
    'calcium_mg': 'calcium',
    'iron_mg': 'iron',
    'magnesium_mg': 'magnesium',
    'potassium_mg': 'potassium',
    'zinc_mg': 'zinc',
    'sodium_mg': 'sodium',
    'vitaminA_mcg': 'vitamin_a',
    'vitaminC_mg': 'vitamin_c',
    'vitaminD_mcg': 'vitamin_d',
    'vitaminB12_mcg': 'vitamin_b12',
    'folate_mcg': 'folate',
  };

  // Default units for micronutrients (used when unit not provided)
  const defaultUnits = {
    'vitamin_a': 'µg',
    'vitamin_c': 'mg',
    'vitamin_d': 'µg',
    'vitamin_e': 'mg',
    'vitamin_k': 'µg',
    'vitamin_b12': 'µg',
    'calcium': 'mg',
    'iron': 'mg',
    'magnesium': 'mg',
    'potassium': 'mg',
    'zinc': 'mg',
    'sodium': 'mg',
    'folate': 'µg',
  };

  const normalized = {};

  for (const [inputKey, normalizedKey] of Object.entries(keyMapping)) {
    if (value[inputKey] !== undefined && value[inputKey] !== null) {
      const rawValue = value[inputKey];
      let numericValue = null;
      let unit = defaultUnits[normalizedKey] || '';

      // Handle already structured format {value, unit}
      if (typeof rawValue === 'object' && rawValue.value !== undefined) {
        numericValue = parseFloat(rawValue.value);
        unit = rawValue.unit || unit;
      }
      // Handle numeric values
      else if (typeof rawValue === 'number') {
        numericValue = rawValue;
      }
      // Handle string values like "120mg", "15µg", "15% DV"
      else if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();

        // Handle percentage DV format (convert to approximate absolute value)
        if (trimmed.includes('%')) {
          const percentMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*%/);
          if (percentMatch) {
            // Store as percentage with DV unit for frontend to handle
            numericValue = parseFloat(percentMatch[1]);
            unit = '% DV';
          }
        } else {
          // Extract numeric value and unit from strings like "120mg", "15µg"
          const numMatch = trimmed.match(/^([\d.]+)\s*([a-zA-Zµ]*)/);
          if (numMatch) {
            numericValue = parseFloat(numMatch[1]);
            if (numMatch[2]) {
              unit = numMatch[2];
            }
          }
        }
      }

      // Only add if we got a valid numeric value
      if (numericValue !== null && !isNaN(numericValue) && numericValue >= 0) {
        normalized[normalizedKey] = {
          value: Math.round(numericValue * 100) / 100, // Round to 2 decimals
          unit: unit,
        };
      }
    }
  }

  return normalized;
}

/**
 * Validate text parsing response (array of foods)
 */
export function normalizeTextParsingResponse(rawData) {
  if (!Array.isArray(rawData)) {
    // If single object, wrap in array
    if (rawData && typeof rawData === 'object') {
      rawData = [rawData];
    } else {
      throw new Error('Invalid text parsing response: expected array or object');
    }
  }

  return rawData.map((item, index) => {
    try {
      return normalizeNutritionAnalysis(item);
    } catch (error) {
      console.error(`[Schema] Failed to normalize item ${index}:`, error.message);
      return null;
    }
  }).filter(Boolean); // Remove null entries
}

/**
 * Validate that response has minimum required fields
 */
export function hasRequiredFields(data) {
  const required = ['foodName', 'calories'];

  for (const field of required) {
    if (data[field] === null || data[field] === undefined) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate data quality score (0-1)
 * Higher score = more complete and reliable data
 */
export function calculateDataQuality(data) {
  let score = 0;
  let maxScore = 0;

  // Core fields (50% of score)
  const coreFields = ['foodName', 'calories', 'protein', 'carbs', 'fats'];
  for (const field of coreFields) {
    maxScore += 10;
    if (data[field] && data[field] > 0) {
      score += 10;
    }
  }

  // Detailed fields (30% of score)
  const detailedFields = ['fiber', 'sugar', 'sodium', 'portionGrams', 'servingSize'];
  for (const field of detailedFields) {
    maxScore += 6;
    if (data[field] !== null && data[field] !== undefined) {
      score += 6;
    }
  }

  // Optional fields (20% of score)
  maxScore += 10;
  if (data.ingredients && data.ingredients.length > 0) {
    score += 5;
  }
  if (data.micros && Object.keys(data.micros).length > 0) {
    score += 5;
  }

  return score / maxScore;
}
