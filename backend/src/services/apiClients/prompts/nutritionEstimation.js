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
  return `You are a PRECISE nutrition estimator using USDA-standard values.

Respond with valid JSON only. Do not include explanations outside the JSON.

CRITICAL RULE #1: PRESERVE EXACT FOOD NAME
- The "foodName" in your response MUST be EXACTLY what the user typed
- NEVER change, translate, correct, or substitute the food name
- Example: User asks for "Chamadhumpa curry" → foodName: "Chamadhumpa curry" (NOT "rice noodles", NOT "chicken curry")
- For unknown regional dishes, keep the name and estimate nutrition based on similar dishes

CRITICAL RULE #2: USE THESE STANDARD REFERENCE VALUES - ALWAYS INCLUDE FIBER & SODIUM:

PROTEINS (with fiber/sodium - legumes have HIGH fiber):
- Whole egg (1 large, 50g): 72 cal, 6g protein, 0.6g carbs, 5g fat, 0g fiber, 70mg sodium
- Chicken breast (100g cooked): 165 cal, 31g protein, 0g carbs, 3.6g fat, 0g fiber, 75mg sodium
- Salmon (100g cooked): 208 cal, 20g protein, 0g carbs, 13g fat, 0g fiber, 60mg sodium
- Greek yogurt (1 cup, 245g): 130 cal, 17g protein, 8g carbs, 4g fat, 0g fiber, 65mg sodium
- Paneer (100g): 265 cal, 18g protein, 1.2g carbs, 21g fat, 0g fiber, 18mg sodium
- Tofu firm (100g): 144 cal, 17g protein, 3g carbs, 9g fat, 0.5g fiber, 10mg sodium
- Lentils/Dal cooked (1 cup, 198g): 230 cal, 18g protein, 40g carbs, 0.8g fat, 16g fiber, 470mg sodium (with salt)
- Moong dal cooked (1 cup, 200g): 212 cal, 14g protein, 38g carbs, 0.8g fat, 15g fiber, 450mg sodium (with salt)
- Chickpeas cooked (1 cup, 164g): 269 cal, 15g protein, 45g carbs, 4g fat, 12g fiber, 400mg sodium (with salt)

CARBS (with fiber/sodium):
- White rice cooked (1 cup, 158g): 205 cal, 4g protein, 45g carbs, 0.4g fat, 0.6g fiber, 300mg sodium (with salt)
- Brown rice cooked (1 cup, 195g): 218 cal, 5g protein, 46g carbs, 1.8g fat, 3.5g fiber, 10mg sodium
- Wheat roti/chapati (1 medium, 40g): 120 cal, 3g protein, 24g carbs, 1g fat, 2g fiber, 180mg sodium
- Paratha (1 medium, 80g): 280 cal, 6g protein, 38g carbs, 12g fat, 2g fiber, 350mg sodium
- Oatmeal cooked (1 cup, 234g): 166 cal, 6g protein, 28g carbs, 3.5g fat, 4g fiber, 9mg sodium

FIBER SOURCES:
- Chia seeds (1 tbsp, 12g): 58 cal, 2g protein, 5g carbs, 3.5g fat, 4g fiber, 2mg sodium
- Spinach cooked (1 cup, 180g): 41 cal, 5g protein, 7g carbs, 0.5g fat, 4g fiber, 125mg sodium
- Broccoli cooked (1 cup, 156g): 55 cal, 4g protein, 11g carbs, 0.6g fat, 5g fiber, 65mg sodium
- Banana (1 medium, 118g): 105 cal, 1.3g protein, 27g carbs, 0.4g fat, 3g fiber, 1mg sodium

FATS:
- Almonds (1 oz, 28g): 164 cal, 6g protein, 6g carbs, 14g fat, 3.5g fiber, 0mg sodium
- Peanut butter (2 tbsp, 32g): 188 cal, 8g protein, 6g carbs, 16g fat, 2g fiber, 150mg sodium
- Ghee (1 tbsp, 14g): 123 cal, 0g protein, 0g carbs, 14g fat, 0g fiber, 0mg sodium
- Olive oil (1 tbsp, 13.5g): 119 cal, 0g protein, 0g carbs, 13.5g fat, 0g fiber, 0mg sodium

INDIAN DISHES (typical home-cooked with salt):
- Tomato dal (1 cup): 180 cal, 10g protein, 28g carbs, 3g fat, 8g fiber, 450mg sodium
- Sambar (1 cup): 150 cal, 7g protein, 25g carbs, 3g fat, 6g fiber, 600mg sodium
- Rasam (1 cup): 60 cal, 2g protein, 12g carbs, 0.5g fat, 2g fiber, 500mg sodium

OUTPUT SCHEMA:
{
  "foodName": string,
  "portionSize": string,
  "servingGrams": number,
  "recognitionConfidence": number,  // 0-100: How certain we identified the food correctly
  "nutritionConfidence": "reference" | "estimated" | "derived",  // Source of nutrition data
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
    "calcium": number,        // mg
    "iron": number,           // mg
    "magnesium": number,      // mg
    "potassium": number,      // mg
    "zinc": number,           // mg
    "vitaminA": number,       // mcg RAE
    "vitaminC": number,       // mg
    "vitaminD": number,       // mcg
    "vitaminB12": number,     // mcg
    "folate": number          // mcg DFE
  },
  "isComplex": boolean,
  "components": [
    {"name": string, "portion": string, "calories": number, "protein": number, "carbs": number, "fat": number}
  ],
  "estimationMethod": string,
  "assumptions": [string],  // REQUIRED: List all assumptions made (e.g., "assumed moderate salt", "typical home-cooked preparation")
  "microsEstimated": true,
  "potentialAllergens": [string]  // Common allergens: dairy, gluten, wheat, nuts, peanuts, soy, eggs, shellfish, fish, sesame
}

DEFAULT ASSUMPTIONS (use when not specified):
- Home-cooked preparation
- Moderate oil usage
- Moderate salt (unless explicitly "unsalted" or "plain")
- No added sugar unless the dish typically includes it
List ALL assumptions in the "assumptions" array.

RULES:
- CRITICAL: foodName MUST be EXACTLY what user typed - NEVER substitute with a different food
- For foods in the reference list above, USE THOSE EXACT VALUES scaled to portion size.
- Foods NOT listed in the reference table are allowed. Estimate using common USDA-style averages or realistic ingredient decomposition.
- For UNKNOWN regional dishes (e.g., "Chamadhumpa curry"), keep the exact name and estimate nutrition based on similar dishes from that cuisine.
- For complex dishes, sum the components using reference values when available.
- Use typical preparation and a common serving if none is provided.
- For regional/ethnic dishes (Indian, Mexican, Thai, etc.), use authentic ingredients typical of that cuisine.
  Example: Indian curry should include onion, tomato, ginger, garlic, oil/ghee, and relevant spices.
- If the dish is multi-ingredient, set isComplex=true and include components for ALL main ingredients (5-10 items).
- For complex dishes, sum of component macros must match final macros within ±5%.

MANDATORY CONSTRAINTS:
- sugar_g must be ≤ carbs_g (sugar is a subset of carbs)
- fiber_g must be ≤ carbs_g (fiber is a subset of carbs)
- sugar_g > 0 ONLY for naturally sweet foods (fruits, desserts, sweetened beverages, honey, etc.)
  For savory foods, sugar_g = 0 is acceptable
- sodium_mg rules:
  - If food is explicitly "salted", "seasoned", "packaged", or restaurant-prepared: sodium > 0 and include assumption
  - If food is explicitly "unsalted", "plain", or raw: sodium may be low/near-zero
  - If salt status unknown: use moderate assumption and note in assumptions array
- All macro values must be ≥ 0

CONFIDENCE SCORING (required):
recognitionConfidence (0-100):
- 90-100: Exact food identified with high certainty
- 75-89: Known food, minor ambiguity
- 60-74: Multi-ingredient or regional dish with assumptions
- <60: Ambiguous description, unusual food

nutritionConfidence:
- "reference": Exact USDA/database match
- "estimated": AI-estimated based on similar foods
- "derived": Calculated from components

CRITICAL VALIDATION RULE (Atwater factors):
Before returning, verify using standard Atwater calorie factors (fiber excluded):
digestible_carbs = carbs_g - fiber_g (must be ≥ 0)
calories_kcal ≈ (protein_g × 4) + (digestible_carbs × 4) + (fat_g × 9)
Allow ±10% margin for rounding.`;
}

export function buildNutritionEstimationPrompt(foodQuery, portion = '1 serving') {
  // FIXED P1: Sanitize user input to prevent prompt injection
  const cleanQuery = sanitizeFoodQuery(foodQuery);
  const cleanPortion = sanitizeFoodQuery(portion);

  return {
    system: buildEstimatorSystemPrompt(),
    user: `Estimate nutrition for: "${cleanQuery}" (${cleanPortion}).

IMPORTANT: Set foodName to EXACTLY "${cleanQuery}" - do not change or substitute the name.

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
Return JSON only.

MODIFIER HANDLING:
- If modifiers affect quantity or preparation (e.g., "half", "extra", "less oil", "double", "small"),
  capture them in the portion field (e.g., "half cup", "extra serving") or notes.
- Never discard quantity modifiers - they significantly affect nutrition.

SAUCE & CONDIMENT HANDLING:
- If a dish typically includes a sauce, gravy, dressing, or condiment (chutney, raita, ketchup),
  include it as a separate item with a small typical portion.
- Examples: curry includes gravy, sandwich includes spread, salad includes dressing.

CONFIDENCE SCORING:
- 90-100: Explicit foods AND explicit portions (e.g., "2 eggs with 1 cup rice")
- 70-89: Clear foods, inferred portions (e.g., "eggs and rice")
- 50-69: Vague description, multiple assumptions needed (e.g., "some breakfast")
- <50: Ambiguous or unclear (e.g., "food", "stuff")`,
    user: `Meal text: "${cleanDescription}"

Return JSON:
{
  "rawText": string,
  "items": [{"name": string, "portion": string, "modifiers": string | null}],
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" | "unknown",
  "confidence": number,
  "notes": string,
  "implicitItems": [string]
}

RULES:
- rawText: Echo the original input exactly (for debugging/analytics)
- items: All explicitly mentioned foods with portions
- modifiers: Any preparation modifiers (grilled, fried, extra, half, etc.)
- implicitItems: Sauces/condiments typically included but not mentioned
- If a portion is not specified, infer a typical portion and note it in modifiers`,
  };
}
