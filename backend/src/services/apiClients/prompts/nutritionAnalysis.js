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
export const NUTRITION_ANALYSIS_SYSTEM_PROMPT = `Identify food in images and estimate nutrition. Return JSON only.`;

/**
 * User prompt for food image analysis
 * SIMPLIFIED: Focused on essentials only
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
  "servingSize": "estimated portion",
  "confidence": 0.0-1.0
}

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
