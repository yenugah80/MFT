/**
 * Static System Prompts for Nutrition Analysis
 *
 * ARCHITECTURE PRINCIPLE: Minimal prompts + Code post-processing
 * - AI identifies food and estimates nutrition
 * - Code handles validation, caching, fallbacks
 * - Short prompts = better focus = fewer errors
 */

/**
 * System prompt for food image analysis
 * SIMPLIFIED: Identify food, estimate macros, return JSON
 */
export const NUTRITION_ANALYSIS_SYSTEM_PROMPT = `Identify food in images and estimate nutrition. Return JSON only. Favor accurate identification for complex cuisines and multi-ingredient dishes.`;

/**
 * User prompt for food image analysis
 * Enhanced: Includes per-ingredient nutrition breakdown
 */
export const NUTRITION_ANALYSIS_USER_PROMPT = `Analyze this food image.

Return JSON:
{
  "foodName": "dish name",
  "description": "brief description",
  "calories": number,
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "sodium": number (mg),
  "micros": {
    "calcium": number (mg),
    "iron": number (mg),
    "magnesium": number (mg),
    "potassium": number (mg),
    "vitaminA": number (mcg RAE),
    "vitaminC": number (mg),
    "vitaminD": number (mcg),
    "vitaminB12": number (mcg),
    "folate": number (mcg),
    "zinc": number (mg)
  },
  "ingredients": [
    {
      "name": "ingredient name",
      "portion": "estimated amount (e.g., 1 cup, 150g)",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ],
  "servingSize": "estimated total portion",
  "confidence": 0.0-1.0,
  "isComplex": boolean
}

INGREDIENT BREAKDOWN RULES:
- List ALL visible ingredients with individual nutrition estimates
- Each ingredient's macros should reflect its portion in the dish
- Sum of ingredient calories should approximately equal total calories
- For multi-component dishes (curry, bowl, sandwich), list 5-10 main ingredients
- For simple foods (apple, egg), list as single ingredient

Confidence guide:
- 0.9+: Clear image, simple food
- 0.7-0.9: Good visibility, common dish
- 0.5-0.7: Mixed dish, estimated portions
- <0.5: Poor image, uncertain`;

/**
 * System prompt for text-based meal parsing
 * NOTE: This is now handled by OpenAIClient.parseTextToFoods() with minimal prompt
 */
export const TEXT_PARSING_SYSTEM_PROMPT = `Extract food items from text. Return exactly what user typed.`;

/**
 * User prompt template for text parsing
 */
export const TEXT_PARSING_USER_PROMPT = `"{mealText}"

Return JSON: {"foods": [{"name": "...", "quantity": N, "unit": "..."}]}`;

/**
 * Dynamic prompt builder for image analysis
 */
export function buildImageAnalysisPrompt(options = {}) {
  const { mealType = null, customInstructions = null } = options;

  let userPrompt = NUTRITION_ANALYSIS_USER_PROMPT;

  if (mealType) {
    userPrompt += `\n\nContext: ${mealType}`;
  }

  if (customInstructions) {
    userPrompt += `\n\n${customInstructions}`;
  }

  return {
    systemPrompt: NUTRITION_ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
  };
}

/**
 * Dynamic prompt builder for text parsing
 */
export function buildTextParsingPrompt(mealText) {
  const userPrompt = TEXT_PARSING_USER_PROMPT.replace('{mealText}', mealText);

  return {
    systemPrompt: TEXT_PARSING_SYSTEM_PROMPT,
    userPrompt,
  };
}
