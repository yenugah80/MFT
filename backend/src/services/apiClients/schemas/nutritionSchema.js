/**
 * Nutrition Analysis Schema Normalization
 * Validates and normalizes AI responses to ensure data quality
 */

/**
 * Normalize and validate nutrition analysis response
 * @param {Object} rawData - Raw AI response
 * @returns {Object} Normalized and validated nutrition data
 */
export function normalizeNutritionAnalysis(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid nutrition analysis data: expected object');
  }

  // Normalize numeric values
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
    ingredients: validateIngredients(rawData.ingredients),
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
 */
function validateIngredients(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim())
    .slice(0, 50); // Max 50 ingredients
}

/**
 * Normalize micronutrients object
 * Converts camelCase keys (vitaminA) to snake_case (vitamin_a) for consistency
 */
function normalizeMicronutrients(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  // Accept both camelCase and snake_case formats
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
  };

  const normalized = {};

  for (const [inputKey, normalizedKey] of Object.entries(keyMapping)) {
    if (value[inputKey]) {
      // Parse the value (could be "120mg", "15% DV", or numeric)
      const rawValue = value[inputKey];
      let microValue;

      if (typeof rawValue === 'string') {
        microValue = rawValue.trim();
      } else if (typeof rawValue === 'number') {
        microValue = String(rawValue);
      } else {
        continue; // Skip invalid types
      }

      if (microValue.length > 0 && microValue.length < 50) {
        // Convert "15% DV" format to numeric value if possible
        if (microValue.includes('%')) {
          // Extract percentage and convert to actual amount
          // Note: This is a rough estimation - client can refine
          const percentMatch = microValue.match(/(\d+(?:\.\d+)?)\s*%/);
          if (percentMatch) {
            normalized[normalizedKey] = microValue; // Keep as-is for now, client handles it
          }
        } else {
          normalized[normalizedKey] = microValue;
        }
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
