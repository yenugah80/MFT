/**
 * Nutrition Estimation Prompts
 *
 * Philosophy: decisive estimator + minimal instructions.
 * The model provides a confident first guess with typical prep assumptions.
 * Validation, reconciliation, and policy live in code, not in prompt.
 */

/**
 * FIXED P1: Sanitize food query to prevent prompt injection
 * @private
 */
function sanitizeFoodQuery(query) {
  // FIXED #7: Remove injection patterns only, preserve valid parentheses
  // Parentheses are valid in food names: "Vitamin B12 (1000 mcg)", "Chicken (grilled)"
  let sanitized = query
    .replace(/ignore.*?instructions/gi, '')
    .replace(/system.*?prompt/gi, '')
    .replace(/previous.*?instruction/gi, '')
    .replace(/\n{2,}/g, ' ')                      // Collapse multiple newlines
    .replace(/[\[\]\{\}\\]/g, '')                 // Remove ONLY dangerous brackets: [], {}, \ (NOT parentheses)
    .replace(/\s+/g, ' ')                         // Collapse multiple spaces
    .trim();

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200).trim();
  }

  // Reject if became empty after sanitization (likely injection attempt)
  if (sanitized.length === 0) {
    throw new Error('Food query is invalid after sanitization');
  }

  return sanitized;
}

function buildEstimatorSystemPrompt() {
  return `You are a decisive nutrition estimator for consumer food logs.

Respond with valid JSON only. Do not include explanations outside the JSON.

OUTPUT SCHEMA:
{
  "foodName": string,
  "portionSize": string,
  "servingGrams": number,
  "confidence": number, // 0-100
  "macros": {
    "calories_kcal": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "sugar_g": number,
    "sodium_mg": number
  },
  "micros": {
    "calcium": number,
    "iron": number,
    "magnesium": number,
    "potassium": number,
    "zinc": number,
    "sodium": number,
    "vitamin_a": number,
    "vitamin_c": number,
    "vitamin_d": number,
    "vitamin_e": number,
    "vitamin_k": number,
    "vitamin_b12": number,
    "folate": number
  },
  "isComplex": boolean,
  "components": [
    {"name": string, "portion": string, "calories": number, "protein": number, "carbs": number, "fat": number}
  ],
  "estimationMethod": string,
  "assumptions": [string],
  "microsEstimated": true
}

RULES:
- Use typical preparation and a common serving if none is provided.
- Always return a best-guess estimate, even when uncertain; lower confidence accordingly.
- Prefer plausible, typical estimates over exhaustive accuracy.
- Micros are conservative estimates; if uncertain, prefer lower typical values.
- Use mg for minerals and vitamin C/E, and µg for vitamins A/D/K/B12/folate.
- servingGrams is approximate; round to a sensible value (e.g., nearest 5g).
- If the dish is multi-ingredient, set isComplex=true and include components for ALL main ingredients (5-10 items).
- For regional/ethnic dishes (Indian, Mexican, Thai, etc.), use authentic ingredients typical of that cuisine.
  Example: Indian curry should include onion, tomato, ginger, garlic, oil/ghee, and relevant spices - not generic Western ingredients.

CRITICAL VALIDATION RULE - FIXED P0 (Atwater factors):
Before returning, verify using scientifically correct Atwater calorie factors:
digestible_carbs = carbs_g - fiber_g
calories_kcal ≈ (protein_g × 4) + (digestible_carbs × 4) + (fiber_g × 2) + (fat_g × 9)
Allow ±15% margin for rounding and Atwater variation (important for high-fiber foods, alcohol, sugar alcohols).
Example: Chickpeas with 12g fiber should calculate correctly, not fail validation.`;
}

export function buildNutritionEstimationPrompt(foodQuery, portion = '1 serving') {
  // FIXED P1: Sanitize user input to prevent prompt injection
  const cleanQuery = sanitizeFoodQuery(foodQuery);
  const cleanPortion = sanitizeFoodQuery(portion);

  return {
    system: buildEstimatorSystemPrompt(),
    user: `Estimate nutrition for: "${cleanQuery}" (${cleanPortion}).

Return JSON only.`,
  };
}

export function buildBatchNutritionEstimationPrompt(foodItems) {
  // FIXED P1: Sanitize all food items to prevent prompt injection
  const itemsList = foodItems
    .map((item, i) => {
      const cleanName = sanitizeFoodQuery(item.name);
      const cleanPortion = sanitizeFoodQuery(item.portion || '1 serving');
      return `${i + 1}. "${cleanName}" (${cleanPortion})`;
    })
    .join('\n');

  return {
    system: buildEstimatorSystemPrompt(),
    user: `Estimate nutrition for each item independently:

${itemsList}

Return JSON array: [{food1}, {food2}, ...]`,
  };
}

export function buildMealParsingPrompt(mealDescription) {
  // FIXED P1: Sanitize meal description
  const cleanDescription = sanitizeFoodQuery(mealDescription);

  return {
    system: `You are a meal parser. Extract food items with portions.
Return JSON only.`,
    user: `Meal text: "${cleanDescription}"

Return JSON:
{
  "items": [{"name": string, "portion": string}],
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" | "unknown",
  "confidence": number,
  "notes": string
}

If a portion is not specified, infer a typical portion.`,
  };
}
