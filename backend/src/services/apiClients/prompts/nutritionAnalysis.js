/**
 * Static System Prompts for Nutrition Analysis
 * Separated from dynamic user prompts for better maintainability and testing
 */

/**
 * System prompt for food image analysis
 * This defines the AI's role and expertise
 */
export const NUTRITION_ANALYSIS_SYSTEM_PROMPT = `You are a certified nutritionist and food scientist with 15+ years of experience in clinical nutrition, portion estimation, and USDA food composition analysis.

**Your Expertise**:
- Visual portion estimation using reference objects and portion standards
- Deep knowledge of cooking methods and their nutritional impact
- Familiar with restaurant vs. home-cooked portion sizes
- Expert in macronutrient and micronutrient composition

**Analysis Protocol**:
1. **Visual Assessment**: Analyze plate size, utensils, and food density for portion estimation
2. **Ingredient Detection**: Identify visible components, cooking methods, and preparation style
3. **Portion Calculation**: Use reference objects (plate = 10-12", bowl = 2 cups, hand comparisons)
4. **Nutritional Estimation**: Calculate macros based on USDA standards + cooking method adjustments
5. **Confidence Scoring**: Rate accuracy based on image clarity, food visibility, and portion certainty

Return ONLY valid JSON with detailed nutritional data.`;

/**
 * User prompt template for food image analysis
 * This contains the detailed analysis instructions
 */
export const NUTRITION_ANALYSIS_USER_PROMPT = `Analyze this food image with professional-grade quality.

**Step-by-step Analysis**:

1. **Food Identification**:
   - Identify the main dish and all visible components
   - Detect cooking method (grilled, fried, baked, steamed, raw, sautéed)
   - Note any sauces, dressings, or toppings

2. **Portion Estimation**:
   - Use visual cues: plate size (standard = 10-12"), utensil size, food height/thickness
   - Reference comparisons:
     * Fist = 1 cup
     * Palm (no fingers) = 3-4 oz protein
     * Thumb = 1 oz cheese or 1 tbsp dressing
     * Handful = 1-2 oz snacks
   - Restaurant portions = 1.5-2x home portions
   - Account for food density (leafy greens vs. dense grains)

3. **Ingredient Breakdown** (if visible):
   - List each component with estimated weight
   - Include hidden ingredients (oil used for cooking, butter, salt)

4. **Nutritional Calculation**:
   - Base calories on USDA standards
   - Adjust for cooking method:
     * Fried: +50-100% calories (oil absorption)
     * Grilled/Baked: Minimal change
     * Steamed/Boiled: No added calories
   - Calculate macros with precision (protein, carbs, fat in grams)
   - Estimate fiber, sugar, sodium
   - Estimate key micros: calcium, iron, vitamin A, C, potassium

5. **Confidence Assessment**:
   - 0.95-1.0: Perfect clarity, standard foods, clear portions (e.g., packaged items, single ingredients)
   - 0.85-0.94: Good visibility, recognizable foods, reasonable portion estimates
   - 0.70-0.84: Partial visibility, mixed dishes, estimated portions
   - 0.50-0.69: Poor lighting, complex dishes, uncertain portions
   - <0.50: Blurry image, unrecognizable foods

**Return JSON Format**:
{
  "foodName": "Specific dish name (e.g., 'Grilled Chicken Caesar Salad')",
  "description": "Detailed description including cooking method and key ingredients",
  "ingredients": ["ingredient1 (Xg)", "ingredient2 (Xg)", ...],
  "portionGrams": <total weight in grams>,
  "calories": <total calories (number)>,
  "protein": <grams (number)>,
  "carbs": <grams (number)>,
  "fat": <grams (number)>,
  "fiber": <grams (number)>,
  "sugar": <grams (number)>,
  "sodium": <mg (number)>,
  "servingSize": "descriptive size (e.g., '1 large bowl (500g)' or '2 cups')",
  "mealType": "breakfast|lunch|dinner|snack",
  "confidence": <0.0-1.0 (number)>,
  "micros": {
    "calcium": "amount with unit (e.g., '120mg' or '12% DV')",
    "iron": "amount with unit",
    "vitaminA": "amount with unit",
    "vitaminC": "amount with unit",
    "potassium": "amount with unit"
  },
  "analysisNotes": "Optional: mention any estimation challenges, cooking method impacts, or portion assumptions"
}

**Examples**:

**Example 1** - Simple food:
Image: Grilled chicken breast with broccoli
→ {
  "foodName": "Grilled Chicken Breast with Steamed Broccoli",
  "description": "Grilled boneless chicken breast (6 oz) with steamed broccoli florets",
  "ingredients": ["chicken breast (170g)", "broccoli (150g)", "olive oil (5g)"],
  "portionGrams": 325,
  "calories": 285,
  "protein": 48,
  "carbs": 12,
  "fat": 6,
  "fiber": 5,
  "sugar": 3,
  "sodium": 180,
  "servingSize": "1 chicken breast (6 oz) + 1.5 cups broccoli",
  "mealType": "lunch",
  "confidence": 0.92,
  "micros": {
    "calcium": "80mg",
    "iron": "1.8mg",
    "vitaminA": "15% DV",
    "vitaminC": "220% DV",
    "potassium": "850mg"
  },
  "analysisNotes": "Clear image, standard portions. Assumed minimal oil for grilling."
}

**Example 2** - Complex dish:
Image: Pasta carbonara
→ {
  "foodName": "Pasta Carbonara",
  "description": "Creamy pasta with bacon, egg, and parmesan cheese",
  "ingredients": ["spaghetti (200g cooked)", "bacon (30g)", "egg (1 whole)", "parmesan (20g)", "cream (50ml)"],
  "portionGrams": 400,
  "calories": 720,
  "protein": 28,
  "carbs": 68,
  "fat": 38,
  "fiber": 3,
  "sugar": 4,
  "sodium": 920,
  "servingSize": "1.5 cups pasta",
  "mealType": "dinner",
  "confidence": 0.78,
  "micros": {
    "calcium": "280mg",
    "iron": "2.2mg",
    "vitaminA": "8% DV",
    "vitaminC": "2% DV",
    "potassium": "320mg"
  },
  "analysisNotes": "Estimated sauce ingredients based on typical carbonara recipe. Portion size estimated from plate coverage."
}

Be thorough, precise, and return ONLY the JSON object.`;

/**
 * System prompt for text-based meal parsing
 */
export const TEXT_PARSING_SYSTEM_PROMPT = `You are a nutrition data extraction specialist. Parse meal descriptions into structured nutritional data using USDA standards.

**Guidelines**:
- Extract all foods mentioned in the user's text
- Estimate portions if not specified (use common serving sizes)
- Calculate nutrition data for each item
- Return ONLY valid JSON

**Confidence Levels**:
- High (0.9-1.0): Exact portions specified, simple foods
- Medium (0.7-0.89): Portions estimated, common foods
- Low (0.5-0.69): Vague descriptions, complex dishes`;

/**
 * User prompt template for text parsing
 */
export const TEXT_PARSING_USER_PROMPT = `Parse this meal description and return nutritional data:

"{mealText}"

Return JSON array format:
[
  {
    "foodName": "string",
    "portionGrams": number,
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "servingSize": "string",
    "confidence": number
  }
]

If multiple foods are mentioned, return an array with each food as a separate object.`;

/**
 * Dynamic prompt builder for image analysis with user preferences
 */
export function buildImageAnalysisPrompt(options = {}) {
  const { includeIngredients = true, mealType = null, customInstructions = null } = options;

  let userPrompt = NUTRITION_ANALYSIS_USER_PROMPT;

  // Add meal type hint if specified
  if (mealType) {
    userPrompt += `\n\n**Context**: User indicates this is likely a ${mealType}.`;
  }

  // Add custom instructions if provided
  if (customInstructions) {
    userPrompt += `\n\n**Additional Instructions**: ${customInstructions}`;
  }

  return {
    systemPrompt: NUTRITION_ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
  };
}

/**
 * Dynamic prompt builder for text parsing with user preferences
 */
export function buildTextParsingPrompt(mealText, options = {}) {
  const { userPreferences = null } = options;

  let userPrompt = TEXT_PARSING_USER_PROMPT.replace('{mealText}', mealText);

  // Add user dietary preferences if available
  if (userPreferences) {
    userPrompt += `\n\n**User Preferences**: ${JSON.stringify(userPreferences)}`;
  }

  return {
    systemPrompt: TEXT_PARSING_SYSTEM_PROMPT,
    userPrompt,
  };
}
