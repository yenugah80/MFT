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
 * PRECISE: Use USDA-standard values for known foods
 */
export const NUTRITION_ANALYSIS_SYSTEM_PROMPT = `Identify food in images and estimate nutrition using USDA-standard values. Return JSON only. Use reference values for common foods.`;

/**
 * User prompt for food image analysis
 * MULTI-ITEM DETECTION: Detects and analyzes ALL separate food items on a plate
 * Returns array of items, each with complete nutrition data
 */
export const NUTRITION_ANALYSIS_USER_PROMPT = `Analyze this food image. CRITICAL: Detect ALL SEPARATE food items visible on the plate/in the image.

🔍 MULTI-ITEM DETECTION RULES:
1. Scan the ENTIRE image for ALL distinct food items
2. Each visually SEPARATE food = SEPARATE item in the "items" array
3. Examples:
   - Plate with chicken, rice, and salad → 3 items
   - Bowl of curry with naan → 2 items (curry + naan)
   - Thali with dal, rice, roti, sabzi → 4 items
   - Single apple → 1 item
4. Do NOT combine separate foods into one "meal" item

CRITICAL REFERENCE VALUES (use these for known foods - INCLUDE FIBER & SODIUM):
PROTEINS:
- Egg (1 large, 50g): 72 cal, 6g protein, 0.6g carbs, 5g fat, 0g fiber, 70mg sodium
- Chicken breast (100g cooked): 165 cal, 31g protein, 0g carbs, 3.6g fat, 0g fiber, 75mg sodium
- Paneer (100g): 265 cal, 18g protein, 1.2g carbs, 21g fat, 0g fiber, 18mg sodium
- Dal/Lentils cooked (1 cup, 198g): 230 cal, 18g protein, 40g carbs, 0.8g fat, 16g fiber, 470mg sodium
- Salmon (100g cooked): 208 cal, 20g protein, 0g carbs, 13g fat, 0g fiber, 60mg sodium

CARBS:
- Rice cooked (1 cup, 158g): 205 cal, 4g protein, 45g carbs, 0.4g fat, 0.6g fiber, 300mg sodium
- Brown rice cooked (1 cup): 218 cal, 5g protein, 46g carbs, 1.8g fat, 3.5g fiber, 10mg sodium
- Roti/Chapati (1 medium, 40g): 120 cal, 3g protein, 24g carbs, 1g fat, 2g fiber, 180mg sodium
- Bread slice (28g): 69 cal, 3g protein, 12g carbs, 1g fat, 1g fiber, 130mg sodium

VEGETABLES:
- Broccoli cooked (1 cup, 156g): 55 cal, 4g protein, 11g carbs, 0.6g fat, 5g fiber, 65mg sodium
- Spinach cooked (1 cup): 41 cal, 5g protein, 7g carbs, 0.5g fat, 4g fiber, 125mg sodium
- Mixed salad (1 cup): 20 cal, 1g protein, 4g carbs, 0g fat, 2g fiber, 10mg sodium

Return JSON with ARRAY of items:
{
  "items": [
    {
      "name": "food name (specific, e.g., 'Grilled Chicken Breast' not just 'Chicken')",
      "description": "brief description",
      "portion": {
        "amount": number,
        "unit": "g|cup|piece|serving",
        "estimatedGrams": number
      },
      "macros": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "fiber": number,
        "sugar": number,
        "sodium": number
      },
      "micros": {
        "calcium": number,
        "iron": number,
        "magnesium": number,
        "potassium": number,
        "vitaminA": number,
        "vitaminC": number,
        "vitaminD": number,
        "vitaminB12": number,
        "folate": number,
        "zinc": number
      },
      "confidence": 0.0-1.0,
      "ingredients": [{"name": "...", "amount": "...", "calories": N}],
      "potentialAllergens": ["dairy"|"gluten"|"wheat"|"nuts"|"peanuts"|"soy"|"eggs"|"shellfish"|"fish"|"sesame"]
    }
  ],
  "mealSummary": {
    "totalItems": number,
    "totalCalories": number,
    "dominantCuisine": "string",
    "mealType": "breakfast|lunch|dinner|snack"
  }
}

🎯 ACCURACY REQUIREMENTS:
- Use USDA reference values for common foods
- Scale values to VISIBLE portion size
- For each micro, provide realistic values (not 0 unless truly absent)
- Validate: calories ≈ (protein×4) + ((carbs-fiber)×4) + (fiber×2) + (fat×9) ±10%

📊 CONFIDENCE SCORING:
- 0.9-1.0: Clear image, exact reference food match
- 0.75-0.89: Good visibility, known food type
- 0.6-0.74: Partially obscured or mixed dish
- <0.6: Poor image quality or unusual food

⚠️ CONSTRAINTS:
- sugar ≤ carbs (sugar is subset)
- fiber ≤ carbs (fiber is subset)
- sodium > 0 for any cooked/seasoned food
- All macro values ≥ 0`;

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
