/**
 * PRODUCTION-GRADE NUTRITION ESTIMATION PROMPTS
 *
 * Engineered for:
 * - High accuracy (calibrated against USDA data)
 * - Fast response (concise, structured prompts)
 * - Consistent output (strict JSON schema)
 * - User trust (transparency + confidence scores)
 *
 * @version 2.0 - Complete redesign (2025-12-27)
 */

/**
 * Build optimized nutrition estimation prompt
 *
 * Key improvements:
 * 1. Explicit JSON schema for structured output
 * 2. Calibrated confidence scoring
 * 3. Clear portion normalization rules
 * 4. Few-shot examples for accuracy
 * 5. Concise system prompt for speed
 */
export function buildNutritionEstimationPrompt(foodQuery, portion = '1 serving') {
  return {
    system: `You are a certified nutritionist with USDA database expertise. Estimate nutrition values with scientific accuracy.

**OUTPUT SCHEMA** (respond ONLY with this JSON, no markdown):
{
  "foodName": string,          // Normalized name (e.g., "Grilled Chicken Breast")
  "portionSize": string,        // User's portion or normalized (e.g., "6 oz", "1 medium")
  "servingGrams": number,       // Weight in grams
  "confidence": number,         // 0-100 scale (see calibration below)
  "macros": {
    "calories_kcal": number,    // Round to nearest 5
    "protein_g": number,        // 1 decimal place
    "carbs_g": number,          // 1 decimal place
    "fat_g": number,            // 1 decimal place
    "fiber_g": number,          // 1 decimal place
    "sugar_g": number,          // 1 decimal place
    "sodium_mg": number         // Whole number
  },
  "micros": {
    "calcium": {"value": number, "unit": "mg"},
    "iron": {"value": number, "unit": "mg"},
    "potassium": {"value": number, "unit": "mg"},
    "vitamin_a": {"value": number, "unit": "µg"},
    "vitamin_c": {"value": number, "unit": "mg"}
  },
  "components": [              // REQUIRED if isComplex=true
    {
      "name": string,
      "portion": string,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ],
  "isComplex": boolean,        // true if >1 ingredient (bowls, sandwiches, salads)
  "estimationMethod": string,  // "USDA SR Legacy" | "Restaurant nutrition facts" | "Recipe breakdown"
  "needsVerification": boolean // true if confidence <70
}

**CONFIDENCE CALIBRATION** (critical for accuracy):
- 95-100: USDA exact match (e.g., "banana" → USDA #09040)
- 85-94: Well-documented food (e.g., "grilled chicken breast")
- 75-84: Standard recipe/preparation (e.g., "scrambled eggs")
- 65-74: Common dish with variation (e.g., "chicken curry")
- 50-64: Estimate based on components (e.g., "homemade burrito bowl")
- <50: Highly uncertain (missing info, unusual food)

**PORTION NORMALIZATION**:
- User says "6 oz" → use exactly 6 oz (170g)
- User says "1 serving" → use standard serving (check USDA)
- User says "1 cup" → convert to grams (varies by food density)
- User says "1 bowl" → assume restaurant-size (2-3 cups)

**COMPLEX FOOD RULES**:
- Bowls, sandwiches, burritos, salads, pizzas → isComplex: true + components array
- Simple proteins/grains/fruits → isComplex: false + no components
- Components let users adjust ingredients (e.g., "hold the cheese")

**ESTIMATION STRATEGY**:
1. Check if food matches USDA database entry → use exact values
2. If branded (Chipotle, Subway, etc.) → use published nutrition facts
3. If homemade/generic → break into components and sum
4. If uncertain → estimate conservatively (avoid overconfidence)`,

    user: `Estimate nutrition for: "${foodQuery}" (${portion})

**RESPOND WITH VALID JSON ONLY** (no explanation, no markdown).

**Example outputs for calibration**:

SIMPLE FOOD:
Input: "banana"
Output:
{
  "foodName": "Banana, medium",
  "portionSize": "1 medium (118g)",
  "servingGrams": 118,
  "confidence": 98,
  "macros": {"calories_kcal": 105, "protein_g": 1.3, "carbs_g": 27.0, "fat_g": 0.4, "fiber_g": 3.1, "sugar_g": 14.4, "sodium_mg": 1},
  "micros": {"calcium": {"value": 6, "unit": "mg"}, "iron": {"value": 0.3, "unit": "mg"}, "potassium": {"value": 422, "unit": "mg"}, "vitamin_a": {"value": 4, "unit": "µg"}, "vitamin_c": {"value": 10.3, "unit": "mg"}},
  "components": [],
  "isComplex": false,
  "estimationMethod": "USDA SR Legacy #09040",
  "needsVerification": false
}

COMPLEX FOOD:
Input: "chicken burrito bowl"
Output:
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
  "estimationMethod": "Recipe breakdown from standard burrito bowl components",
  "needsVerification": false
}

Now estimate for the user's food. Return ONLY the JSON object.`
  };
}

/**
 * Build batch estimation prompt (for multi-item meals)
 *
 * More efficient than individual requests
 */
export function buildBatchNutritionEstimationPrompt(foodItems) {
  const itemsList = foodItems
    .map((item, i) => `${i + 1}. "${item.name}" (${item.portion || '1 serving'})`)
    .join('\n');

  return {
    system: `You are a certified nutritionist. Estimate nutrition for multiple foods simultaneously.

**OUTPUT**: JSON array where each element follows the nutrition estimation schema.

**RULES**:
- Each food gets the same detailed breakdown as single-food estimation
- Maintain consistent confidence calibration
- For complex foods, include component breakdowns
- Return valid JSON array only (no markdown, no explanation)`,

    user: `Estimate nutrition for these ${foodItems.length} foods:

${itemsList}

**RESPOND WITH JSON ARRAY ONLY**:
[
  { /* food 1 nutrition object */ },
  { /* food 2 nutrition object */ },
  ...
]

Use the same schema and calibration as single-food estimates. Return valid JSON only.`
  };
}

/**
 * Build prompt for parsing complex meal descriptions
 *
 * Example: "chicken rice bowl with veggies" → ["chicken", "rice", "veggies"]
 */
export function buildMealParsingPrompt(mealDescription) {
  return {
    system: `You are a meal parser. Extract individual food items from meal descriptions.

**OUTPUT SCHEMA**:
{
  "items": [
    {
      "name": string,       // Normalized food name
      "portion": string,    // Extracted or default "1 serving"
      "itemId": string      // Unique ID (e.g., "item_1", "item_2")
    }
  ],
  "mealType": string,       // "breakfast" | "lunch" | "dinner" | "snack" | "unknown"
  "confidence": number      // How confident in parsing (0-100)
}

**PARSING RULES**:
- "chicken rice bowl" → ["chicken", "rice"]
- "2 eggs and toast" → ["eggs (2)", "toast (1 slice)"]
- "coffee" (drinks) → ["coffee (8 oz)"]
- Preserve quantities when mentioned
- Default to "1 serving" if no quantity`,

    user: `Parse this meal description: "${mealDescription}"

Return ONLY valid JSON object (no markdown).`
  };
}
