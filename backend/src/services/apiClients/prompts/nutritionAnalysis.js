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
 * ENHANCED v2: Better portion estimation, cooking method detection, regional awareness
 */
export const NUTRITION_ANALYSIS_SYSTEM_PROMPT = `You are a certified nutritionist analyzing meal photos. Your expertise:
- USDA food composition database mastery
- Regional cuisine (Indian, American, Asian, Mediterranean)
- Portion estimation from visual cues (plate size ~10", fork ~7")
- Cooking method impact: deep fried +40-60% cal, pan fried +20-30%, grilled/steamed = base

CRITICAL: Be accurate, not optimistic. Underestimating calories hurts users' health goals.
Return JSON only. Scale portions based on visual reference objects.`;

/**
 * User prompt for food image analysis
 * MULTI-ITEM DETECTION: Detects and analyzes ALL separate food items on a plate
 * Returns array of items, each with complete nutrition data
 */
export const NUTRITION_ANALYSIS_USER_PROMPT = `Analyze this food image with PROFESSIONAL ACCURACY.

🔍 STEP 1: VISUAL ANALYSIS
1. Identify ALL distinct food items (each = separate entry)
2. Detect reference objects for portion sizing:
   - Plate: standard dinner plate = 10" diameter
   - Fork/spoon: ~7" long
   - Hand/palm: ~4" width = 3oz meat
3. Assess cooking method from visual cues:
   - Shiny/glistening = fried/oily (+30-50% cal)
   - Char marks = grilled
   - No browning = steamed/boiled
   - Crispy texture = deep fried (+40-60% cal)

📏 STEP 2: PORTION ESTIMATION
- Rice/grains: fist size = 1 cup (200 cal), half plate = 1.5 cups
- Meat/protein: palm size = 3oz (85g), deck of cards = 3oz
- Curry/liquid: small bowl = 1 cup (150-200ml)
- Roti/bread: CD size = 1 medium (40g)
- Visible oil sheen: add 50-100 cal per tablespoon

🌍 STEP 3: REGIONAL CUISINE ADJUSTMENT
- SOUTH INDIAN: coconut oil, larger rice portions, sambar = 150 cal/cup
- NORTH INDIAN: ghee/butter heavy, cream gravies +100-150 cal
- AMERICAN: larger portions, butter sauces
- Restaurant style: +20% vs homemade

📋 REFERENCE VALUES (USDA - scale to visible portion):
PROTEINS:
- Egg (1 large): 72 cal, 6g P, 0.6g C, 5g F
- Chicken breast (100g): 165 cal, 31g P, 0g C, 3.6g F
- Chicken curry (1 cup): 300-400 cal (varies by gravy richness)
- Paneer (100g): 265 cal, 18g P, 1.2g C, 21g F
- Dal cooked (1 cup): 230 cal, 18g P, 40g C, 0.8g F, 16g fiber
- Fish curry (1 cup): 250-350 cal

CARBS:
- White rice (1 cup): 205 cal, 4g P, 45g C, 0.4g F
- Biryani rice (1 cup): 350-400 cal (includes ghee)
- Roti (1 medium, 40g): 120 cal
- Naan (1 piece): 260-300 cal
- Dosa plain (1): 120 cal, masala dosa: 200 cal
- Idli (1 piece): 40 cal

INDIAN DISHES:
- Sambar (1 cup): 150 cal
- Butter chicken (1 cup): 450-500 cal
- Palak paneer (1 cup): 300 cal
- Biryani with meat (1 plate): 600-800 cal
- Chole/chana (1 cup): 250 cal

VEGETABLES:
- Mixed veg curry (1 cup): 150-200 cal
- Salad no dressing (1 cup): 20 cal
- Raita (1 cup): 100 cal

Return JSON with ARRAY of items:
{
  "items": [
    {
      "name": "Specific food name (e.g., 'Butter Chicken' not 'Chicken Curry')",
      "description": "Brief description with cooking method observed",
      "portion": {
        "amount": number,
        "unit": "g|cup|piece|serving",
        "estimatedGrams": number,
        "visualBasis": "how portion was estimated (e.g., 'half plate coverage')"
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
      "cookingMethod": "deep_fried|pan_fried|grilled|baked|steamed|boiled|raw|sauteed|roasted",
      "cuisine": "South Indian|North Indian|American|Chinese|Italian|Mediterranean|Japanese|Thai|Mexican|Mixed",
      "isRestaurantStyle": false,
      "ingredients": [{"name": "...", "amount": "...", "calories": number}],
      "potentialAllergens": ["dairy", "gluten", "nuts", "soy", "eggs", "shellfish"],
      "healthFlags": {
        "isHighCalorie": boolean,
        "isHighSodium": boolean,
        "isFried": boolean,
        "isProcessed": boolean
      }
    }
  ],
  "mealSummary": {
    "totalItems": number,
    "totalCalories": number,
    "totalProtein": number,
    "totalCarbs": number,
    "totalFat": number,
    "dominantCuisine": "string",
    "mealType": "breakfast|lunch|dinner|snack",
    "portionAssessment": "small|moderate|large|very_large",
    "healthScore": 0-100,
    "suggestions": ["Optional improvement suggestions"]
  },
  "imageAnalysis": {
    "quality": "excellent|good|fair|poor",
    "referenceObjectsFound": ["plate", "utensils", "hand", "none"],
    "confidenceFactors": ["clear image", "known dish", "visible portions"]
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
 * Enhanced to support regional context, user preferences, and voice descriptions
 *
 * @param {Object} options - Configuration options
 * @param {string} options.mealType - breakfast|lunch|dinner|snack
 * @param {string} options.customInstructions - Voice transcript or other user context
 * @param {string} options.cuisinePreference - User's cuisine preference (e.g., 'South Indian')
 * @param {string} options.region - User's region (e.g., 'India', 'USA')
 * @param {string} options.cookingMethod - Hint about cooking method if known
 * @param {Object} options.userGoals - User's daily nutrition targets
 */
export function buildImageAnalysisPrompt(options = {}) {
  const {
    mealType = null,
    customInstructions = null,
    cuisinePreference = null,
    region = null,
    cookingMethod = null,
    userGoals = null
  } = options;

  let userPrompt = NUTRITION_ANALYSIS_USER_PROMPT;

  // Add regional context for better accuracy
  if (cuisinePreference || region) {
    userPrompt += `\n\n🌍 USER CONTEXT:`;
    if (cuisinePreference) {
      userPrompt += `\n- Cuisine Preference: ${cuisinePreference}`;
      userPrompt += `\n- Prioritize ${cuisinePreference} dish identification`;
    }
    if (region) {
      userPrompt += `\n- Region: ${region}`;
      userPrompt += `\n- Use regional portion sizes and cooking styles`;
    }
  }

  // Add cooking method hint if provided
  if (cookingMethod) {
    userPrompt += `\n\n🍳 COOKING HINT: User indicated "${cookingMethod}" preparation.`;
    userPrompt += `\nAdjust calorie estimates accordingly.`;
  }

  // Add meal type context
  if (mealType) {
    userPrompt += `\n\n🍽️ MEAL TYPE: ${mealType}`;
    if (mealType === 'breakfast') {
      userPrompt += `\n- Typical breakfast items expected`;
    } else if (mealType === 'dinner') {
      userPrompt += `\n- Larger portions may be typical`;
    }
  }

  // Add user goals context for personalized suggestions
  if (userGoals) {
    userPrompt += `\n\n🎯 USER GOALS:`;
    if (userGoals.dailyCalories) {
      userPrompt += `\n- Daily calorie target: ${userGoals.dailyCalories} cal`;
    }
    if (userGoals.proteinTarget) {
      userPrompt += `\n- Protein target: ${userGoals.proteinTarget}g`;
    }
    userPrompt += `\n- Provide suggestions based on these goals`;
  }

  // Add voice description or custom instructions (highest priority context)
  if (customInstructions) {
    userPrompt += `\n\n📝 ADDITIONAL CONTEXT FROM USER:`;
    userPrompt += `\n"${customInstructions}"`;
    userPrompt += `\n\nUse this context to:`;
    userPrompt += `\n- Identify specific dishes mentioned`;
    userPrompt += `\n- Adjust portions based on descriptions`;
    userPrompt += `\n- Account for mentioned ingredients/modifications`;
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
