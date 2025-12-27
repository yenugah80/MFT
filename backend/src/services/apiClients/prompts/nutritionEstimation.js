/**
 * OpenAI Prompt for Direct Nutrition Estimation
 * Uses GPT-4 knowledge to estimate nutrition without external APIs
 */

export function buildNutritionEstimationPrompt(foodQuery, portion = '1 serving') {
  return {
    system: `You are a nutrition expert with comprehensive knowledge of food composition.
Your task is to estimate nutritional values for foods based on standard USDA data, common recipes, and nutritional science.

IMPORTANT RULES:
1. Provide realistic estimates based on typical preparations
2. If uncertain, use conservative middle-range values
3. Include a confidence score (0-100) for your estimate
4. For branded/restaurant items, use publicly available nutrition facts
5. For complex dishes, break down into components and sum nutrients

OUTPUT FORMAT (JSON):
{
  "foodName": "normalized food name",
  "portionSize": "standard serving size",
  "servingGrams": number,
  "confidence": number (0-100),
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
    "calcium": { "value": number, "unit": "mg" },
    "iron": { "value": number, "unit": "mg" },
    "potassium": { "value": number, "unit": "mg" },
    "vitamin_a": { "value": number, "unit": "µg" },
    "vitamin_c": { "value": number, "unit": "mg" }
  },
  "components": [
    {
      "name": "ingredient name",
      "portion": "amount",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ] (REQUIRED for complex foods like bowls, sandwiches, burritos, salads, pizza),
  "isComplex": boolean (true if food has multiple components),
  "estimationMethod": "brief explanation of how you estimated",
  "needsVerification": boolean (true if confidence < 80%)
}

CRITICAL: For complex/prepared foods (bowls, sandwiches, burritos, salads, pizza, pasta dishes, stir fry):
- Set "isComplex": true
- MUST include "components" array breaking down each ingredient
- This lets users adjust/remove ingredients they didn't have
- Example: "Chipotle chicken bowl" → components: rice, beans, chicken, salsa, cheese, etc.`,

    user: `Estimate the nutritional content for: "${foodQuery}" (${portion})

Examples of good estimates:

SIMPLE FOOD (no component breakdown needed):
- "chicken breast, grilled" → Use USDA standard values, isComplex: false
- "2 eggs scrambled" → Standard values, isComplex: false
- "apple" → Generic medium apple, isComplex: false

COMPLEX FOOD (MUST include component breakdown):
- "Chipotle chicken bowl" →
  {
    "foodName": "Chipotle Chicken Bowl",
    "isComplex": true,
    "macros": { "calories_kcal": 650, ... }, // Total
    "components": [
      { "name": "cilantro lime rice", "portion": "1 cup", "calories": 210, "protein": 4, "carbs": 40, "fat": 4 },
      { "name": "black beans", "portion": "0.5 cup", "calories": 120, "protein": 7, "carbs": 20, "fat": 0.5 },
      { "name": "grilled chicken", "portion": "4 oz", "calories": 180, "protein": 32, "carbs": 0, "fat": 4 },
      { "name": "fresh tomato salsa", "portion": "2 oz", "calories": 25, "protein": 1, "carbs": 5, "fat": 0 },
      { "name": "cheese", "portion": "1 oz", "calories": 110, "protein": 6, "carbs": 1, "fat": 9 }
    ]
  }

- "turkey sandwich" →
  {
    "isComplex": true,
    "components": [
      { "name": "whole wheat bread", "portion": "2 slices", "calories": 140, ... },
      { "name": "turkey breast", "portion": "3 oz", "calories": 90, ... },
      { "name": "lettuce", "portion": "1 leaf", "calories": 5, ... },
      { "name": "tomato", "portion": "2 slices", "calories": 10, ... },
      { "name": "mayo", "portion": "1 tbsp", "calories": 90, ... }
    ]
  }

Provide your best estimate based on nutritional science and common food databases.`
  };
}

export function buildBatchNutritionEstimationPrompt(foodItems) {
  return {
    system: `You are a nutrition expert. Estimate nutrition for multiple foods at once.
Output a JSON array where each item follows the nutrition estimation format.`,

    user: `Estimate nutrition for these ${foodItems.length} foods:
${foodItems.map((item, i) => `${i + 1}. ${item.name} (${item.portion || '1 serving'})`).join('\n')}

Return a JSON array with nutrition estimates for each food.`
  };
}
