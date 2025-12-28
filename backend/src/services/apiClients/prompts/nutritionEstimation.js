/**
 * Nutrition Estimation Prompts
 *
 * Philosophy: decisive estimator + minimal instructions.
 * The model provides a confident first guess with typical prep assumptions.
 * Validation, reconciliation, and policy live in code, not in prompt.
 */

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
    "potassium": number,
    "vitamin_a": number,
    "vitamin_c": number
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
- Calories should be broadly consistent with macros; small discrepancies are acceptable.
- Micros are conservative estimates; if uncertain, prefer lower typical values.
- servingGrams is approximate; round to a sensible value (e.g., nearest 5g).
- If the dish is multi-ingredient, set isComplex=true and include a high-level component breakdown (2-5 items max).`;
}

export function buildNutritionEstimationPrompt(foodQuery, portion = '1 serving') {
  return {
    system: buildEstimatorSystemPrompt(),
    user: `Estimate nutrition for: "${foodQuery}" (${portion}).

Return JSON only.`,
  };
}

export function buildBatchNutritionEstimationPrompt(foodItems) {
  const itemsList = foodItems
    .map((item, i) => `${i + 1}. "${item.name}" (${item.portion || '1 serving'})`)
    .join('\n');

  return {
    system: buildEstimatorSystemPrompt(),
    user: `Estimate nutrition for each item independently:

${itemsList}

Return JSON array: [{food1}, {food2}, ...]`,
  };
}

export function buildMealParsingPrompt(mealDescription) {
  return {
    system: `You are a meal parser. Extract food items with portions.
Return JSON only.`,
    user: `Meal text: "${mealDescription}"

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
