/**
 * PURE OPENAI NUTRITION ESTIMATION PROMPTS
 *
 * 100% OpenAI-native approach:
 * - No USDA references
 * - No external database mentions
 * - Pure AI nutrition knowledge
 * - Confidence based on food commonality, not database matching
 *
 * @version 3.0 - Pure OpenAI redesign (2025-12-27)
 */

/**
 * Build OpenAI-native nutrition estimation prompt
 *
 * Philosophy:
 * - Trust OpenAI's nutrition knowledge completely
 * - Confidence based on food type (common vs rare, simple vs complex)
 * - Fast, accurate, no external dependencies
 */
export function buildNutritionEstimationPrompt(foodQuery, portion = '1 serving') {
  return {
    system: `You are an expert nutritionist. Estimate nutrition values using your comprehensive food science knowledge.

**OUTPUT FORMAT** (JSON only, no markdown):
{
  "foodName": "normalized food name",
  "portionSize": "user's portion or standard serving",
  "servingGrams": number,
  "confidence": number,
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
    "calcium": {"value": number, "unit": "mg"},
    "iron": {"value": number, "unit": "mg"},
    "potassium": {"value": number, "unit": "mg"},
    "vitamin_a": {"value": number, "unit": "µg"},
    "vitamin_c": {"value": number, "unit": "mg"}
  },
  "components": [
    {
      "name": "ingredient",
      "portion": "amount",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ],
  "isComplex": boolean,
  "estimationMethod": "how you estimated (e.g., 'standard food values', 'recipe breakdown', 'restaurant nutrition')",
  "needsVerification": boolean
}

**CONFIDENCE SCORING** (how certain you are):
- 95-100: Very common food with consistent values (banana, apple, chicken breast, white rice)
- 85-94: Common food with slight variation (grilled vegetables, scrambled eggs)
- 75-84: Standard recipes/preparations (pasta with tomato sauce, chicken curry)
- 65-74: Common dishes with moderate variation (burrito bowl, salad bowl)
- 50-64: Less common foods or high variation (specialty dishes, regional foods)
- <50: Rare foods or significant uncertainty

**PORTION GUIDELINES**:
- User says "6 oz" → use exactly 6 oz (convert to grams if needed)
- User says "1 serving" → use typical serving size for that food
- User says "1 cup" → estimate weight based on food density
- User says "1 bowl" → assume restaurant-size portion (400-600g)

**COMPLEX FOODS** (bowls, sandwiches, burritos, salads, pizzas):
- Set isComplex: true
- Break down into components
- Let users see individual ingredients
- Components help users adjust (e.g., "no cheese")

**ESTIMATION APPROACH**:
1. Use your knowledge of typical food composition
2. For branded items (Chipotle, Subway), use published nutrition
3. For homemade items, estimate from standard recipes
4. Be realistic and conservative (don't overestimate or underestimate)`,

    user: `Estimate nutrition for: "${foodQuery}" (${portion})

**RESPOND WITH VALID JSON ONLY** (no explanation, no markdown).

**Calibration examples**:

SIMPLE FOOD:
Input: "banana"
{
  "foodName": "Banana, medium",
  "portionSize": "1 medium (118g)",
  "servingGrams": 118,
  "confidence": 98,
  "macros": {"calories_kcal": 105, "protein_g": 1.3, "carbs_g": 27.0, "fat_g": 0.4, "fiber_g": 3.1, "sugar_g": 14.4, "sodium_mg": 1},
  "micros": {"calcium": {"value": 6, "unit": "mg"}, "iron": {"value": 0.3, "unit": "mg"}, "potassium": {"value": 422, "unit": "mg"}, "vitamin_a": {"value": 4, "unit": "µg"}, "vitamin_c": {"value": 10.3, "unit": "mg"}},
  "components": [],
  "isComplex": false,
  "estimationMethod": "standard food values",
  "needsVerification": false
}

COMPLEX FOOD:
Input: "chicken burrito bowl"
{
  "foodName": "Chicken Burrito Bowl",
  "portionSize": "1 bowl",
  "servingGrams": 500,
  "confidence": 78,
  "macros": {"calories_kcal": 620, "protein_g": 45.0, "carbs_g": 65.0, "fat_g": 18.0, "fiber_g": 12.0, "sugar_g": 4.0, "sodium_mg": 1200},
  "micros": {"calcium": {"value": 150, "unit": "mg"}, "iron": {"value": 4.5, "unit": "mg"}, "potassium": {"value": 850, "unit": "mg"}, "vitamin_a": {"value": 200, "unit": "µg"}, "vitamin_c": {"value": 15, "unit": "mg"}},
  "components": [
    {"name": "cilantro lime rice", "portion": "1 cup", "calories": 210, "protein": 4, "carbs": 40, "fat": 4},
    {"name": "black beans", "portion": "0.5 cup", "calories": 120, "protein": 8, "carbs": 20, "fat": 0},
    {"name": "grilled chicken", "portion": "5 oz", "calories": 220, "protein": 40, "carbs": 0, "fat": 6},
    {"name": "fajita vegetables", "portion": "0.5 cup", "calories": 20, "protein": 1, "carbs": 4, "fat": 0},
    {"name": "salsa", "portion": "2 oz", "calories": 10, "protein": 0, "carbs": 2, "fat": 0},
    {"name": "cheese", "portion": "1 oz", "calories": 110, "protein": 7, "carbs": 1, "fat": 9}
  ],
  "isComplex": true,
  "estimationMethod": "recipe breakdown",
  "needsVerification": false
}

Now estimate for "${foodQuery}". Return ONLY the JSON object.`
  };
}

/**
 * Batch estimation for multiple foods
 */
export function buildBatchNutritionEstimationPrompt(foodItems) {
  const itemsList = foodItems
    .map((item, i) => `${i + 1}. "${item.name}" (${item.portion || '1 serving'})`)
    .join('\n');

  return {
    system: `You are an expert nutritionist. Estimate nutrition for multiple foods using your food science knowledge.

**OUTPUT**: JSON array where each element follows the nutrition schema.

**RULES**:
- Each food gets the same detailed breakdown
- Maintain consistent confidence scoring
- For complex foods, include component breakdowns
- Return valid JSON array only (no markdown)`,

    user: `Estimate nutrition for these ${foodItems.length} foods:

${itemsList}

Return JSON array with nutrition estimates. Use same schema as single-food estimation.`
  };
}

/**
 * Parse complex meal descriptions into individual foods
 */
export function buildMealParsingPrompt(mealDescription) {
  return {
    system: `You are a meal parser. Extract individual food items from meal descriptions.

**OUTPUT**:
{
  "items": [
    {
      "name": "food name",
      "portion": "amount or '1 serving'",
      "itemId": "item_1"
    }
  ],
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" | "unknown",
  "confidence": number
}

**PARSING RULES**:
- "chicken rice bowl" → ["chicken", "rice"]
- "2 eggs and toast" → ["eggs (2)", "toast (1 slice)"]
- Preserve quantities when mentioned
- Default to "1 serving" if no quantity`,

    user: `Parse: "${mealDescription}"

Return JSON only (no markdown).`
  };
}
