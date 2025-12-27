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
  "estimationMethod": "brief explanation of how you estimated",
  "needsVerification": boolean (true if confidence < 80%)
}`,

    user: `Estimate the nutritional content for: "${foodQuery}" (${portion})

Examples of good estimates:
- "chicken breast, grilled" → Use USDA standard values for skinless grilled chicken
- "Chipotle burrito bowl" → Break down: rice, beans, protein, salsa, etc.
- "2 eggs scrambled" → Standard values for eggs, adjusted for cooking method
- "apple" → Generic medium apple values

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
