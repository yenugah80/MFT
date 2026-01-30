/**
 * Ingredient Breakdown Service
 *
 * Production-grade service for:
 * 1. Breaking down ANY food into editable ingredients
 * 2. Supporting add/remove/modify operations
 * 3. Real-time nutrition recalculation
 * 4. Regional variation handling
 * 5. Customization tracking
 *
 * ARCHITECTURE:
 * - AI-powered ingredient extraction (unlimited coverage)
 * - Ingredient-level nutrition database
 * - User modification history for learning
 * - Regional multipliers and substitutions
 */

import { safeJSONCompletion } from './apiClients/SafeOpenAIWrapper.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS: Regional Variations & Ingredient Database
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Regional nutrition multipliers
 * Different countries have different portion sizes and ingredients
 */
const REGIONAL_MULTIPLIERS = {
  'US': {
    portionMultiplier: 1.0,
    sodiumMultiplier: 1.0,
    sugarMultiplier: 1.0,
    note: 'US standard portions',
  },
  'India': {
    portionMultiplier: 0.85, // Indian portions typically smaller
    sodiumMultiplier: 1.1, // More salt in Indian food
    sugarMultiplier: 0.9, // Less sugar in savory items
    spiceLevel: 'high',
    commonSubstitutions: {
      'beef': 'chicken', // No beef at Indian McDonald's
      'pork': 'chicken', // No pork
      'bacon': 'chicken_strips',
    },
    note: 'Indian market - no beef/pork, spicier options',
  },
  'UK': {
    portionMultiplier: 0.9,
    sodiumMultiplier: 0.85, // UK has stricter sodium limits
    sugarMultiplier: 0.8, // Sugar tax effects
    note: 'UK portions slightly smaller, less sugar/salt',
  },
  'Japan': {
    portionMultiplier: 0.75, // Japanese portions smaller
    sodiumMultiplier: 1.2, // More soy sauce based
    sugarMultiplier: 0.7,
    note: 'Japanese portions smaller, unique menu items',
  },
  'Middle East': {
    portionMultiplier: 1.0,
    sodiumMultiplier: 1.0,
    sugarMultiplier: 1.0,
    commonSubstitutions: {
      'pork': 'beef',
      'bacon': 'turkey_bacon',
      'ham': 'turkey',
    },
    note: 'Halal options, no pork products',
  },
};

/**
 * Common ingredient nutrition database (per standard unit)
 * This is used for recalculation when users modify ingredients
 */
const INGREDIENT_NUTRITION_DB = {
  // Proteins
  'beef_patty': { unit: '1 patty (45g)', calories: 110, protein: 10, carbs: 1, fat: 7, sodium: 75 },
  'beef_patty_quarter': { unit: '1 patty (113g)', calories: 270, protein: 24, carbs: 1, fat: 18, sodium: 180 },
  'chicken_breast_grilled': { unit: '100g', calories: 165, protein: 31, carbs: 0, fat: 3.6, sodium: 75 },
  'chicken_breast_fried': { unit: '100g', calories: 220, protein: 27, carbs: 8, fat: 10, sodium: 450 },
  'chicken_nugget': { unit: '1 piece', calories: 45, protein: 2.5, carbs: 2.5, fat: 2.8, sodium: 90 },
  'bacon_strip': { unit: '1 strip', calories: 43, protein: 3, carbs: 0, fat: 3.3, sodium: 137 },
  'turkey_bacon': { unit: '1 strip', calories: 30, protein: 2, carbs: 0, fat: 2.5, sodium: 130 },
  'fish_fillet_fried': { unit: '1 fillet (100g)', calories: 200, protein: 15, carbs: 12, fat: 10, sodium: 400 },
  'shrimp': { unit: '1 piece', calories: 7, protein: 1.5, carbs: 0, fat: 0.1, sodium: 35 },
  'egg_fried': { unit: '1 large', calories: 90, protein: 6, carbs: 0.6, fat: 7, sodium: 95 },
  'egg_scrambled': { unit: '1 large', calories: 100, protein: 7, carbs: 1, fat: 7.5, sodium: 170 },

  // Cheese
  'american_cheese': { unit: '1 slice (21g)', calories: 70, protein: 4, carbs: 1, fat: 6, sodium: 250 },
  'cheddar_cheese': { unit: '1 slice (28g)', calories: 113, protein: 7, carbs: 0.4, fat: 9, sodium: 180 },
  'swiss_cheese': { unit: '1 slice (28g)', calories: 108, protein: 8, carbs: 1.5, fat: 8, sodium: 55 },
  'mozzarella': { unit: '1 oz (28g)', calories: 85, protein: 6, carbs: 1, fat: 6, sodium: 175 },
  'parmesan': { unit: '1 tbsp (5g)', calories: 22, protein: 2, carbs: 0.2, fat: 1.4, sodium: 85 },
  'cream_cheese': { unit: '1 oz (28g)', calories: 99, protein: 2, carbs: 1, fat: 10, sodium: 85 },
  'feta_cheese': { unit: '1 oz (28g)', calories: 75, protein: 4, carbs: 1, fat: 6, sodium: 315 },

  // Breads & Buns
  'hamburger_bun': { unit: '1 bun (50g)', calories: 140, protein: 4, carbs: 26, fat: 2, sodium: 220 },
  'sesame_bun': { unit: '1 bun (55g)', calories: 150, protein: 5, carbs: 27, fat: 2.5, sodium: 230 },
  'brioche_bun': { unit: '1 bun (60g)', calories: 180, protein: 5, carbs: 28, fat: 5, sodium: 200 },
  'whole_wheat_bun': { unit: '1 bun (55g)', calories: 130, protein: 6, carbs: 24, fat: 2, sodium: 200 },
  'lettuce_wrap': { unit: '2 leaves', calories: 5, protein: 0.5, carbs: 1, fat: 0, sodium: 5 },
  'tortilla_flour': { unit: '1 (10 inch)', calories: 290, protein: 8, carbs: 48, fat: 7, sodium: 600 },
  'tortilla_corn': { unit: '1 (6 inch)', calories: 60, protein: 1.5, carbs: 12, fat: 1, sodium: 10 },
  'pita_bread': { unit: '1 pocket', calories: 165, protein: 5.5, carbs: 33, fat: 0.7, sodium: 320 },
  'naan': { unit: '1 piece (90g)', calories: 260, protein: 9, carbs: 45, fat: 5, sodium: 480 },
  'pizza_crust': { unit: '1 slice base', calories: 100, protein: 3, carbs: 18, fat: 2, sodium: 150 },
  'bread_bowl': { unit: '1 bowl (250g)', calories: 540, protein: 22, carbs: 104, fat: 4, sodium: 1200 },

  // Sauces & Condiments
  'ketchup': { unit: '1 packet (10g)', calories: 10, protein: 0, carbs: 3, fat: 0, sodium: 95 },
  'mustard': { unit: '1 tsp (5g)', calories: 3, protein: 0.2, carbs: 0.3, fat: 0.2, sodium: 55 },
  'mayonnaise': { unit: '1 tbsp (15g)', calories: 100, protein: 0, carbs: 0, fat: 11, sodium: 80 },
  'mayo_light': { unit: '1 tbsp (15g)', calories: 45, protein: 0, carbs: 1, fat: 4.5, sodium: 100 },
  'special_sauce': { unit: '1 tbsp', calories: 60, protein: 0, carbs: 2, fat: 6, sodium: 100 },
  'big_mac_sauce': { unit: '1 serving', calories: 90, protein: 0, carbs: 3, fat: 9, sodium: 150 },
  'ranch_dressing': { unit: '1 packet (43g)', calories: 200, protein: 1, carbs: 2, fat: 21, sodium: 380 },
  'bbq_sauce': { unit: '1 packet (25g)', calories: 45, protein: 0, carbs: 11, fat: 0, sodium: 260 },
  'honey_mustard': { unit: '1 packet (43g)', calories: 150, protein: 0, carbs: 14, fat: 11, sodium: 200 },
  'hot_sauce': { unit: '1 tsp', calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 125 },
  'sriracha': { unit: '1 tsp', calories: 5, protein: 0, carbs: 1, fat: 0, sodium: 100 },
  'soy_sauce': { unit: '1 tbsp', calories: 10, protein: 1, carbs: 1, fat: 0, sodium: 900 },
  'teriyaki_sauce': { unit: '1 tbsp', calories: 15, protein: 1, carbs: 3, fat: 0, sodium: 610 },
  'guacamole': { unit: '2 tbsp (30g)', calories: 50, protein: 1, carbs: 3, fat: 4.5, sodium: 115 },
  'salsa': { unit: '2 tbsp (30g)', calories: 10, protein: 0, carbs: 2, fat: 0, sodium: 150 },
  'sour_cream': { unit: '2 tbsp (30g)', calories: 60, protein: 1, carbs: 1, fat: 6, sodium: 15 },
  'chipotle_mayo': { unit: '1 tbsp', calories: 90, protein: 0, carbs: 1, fat: 10, sodium: 110 },
  'pesto': { unit: '1 tbsp', calories: 80, protein: 2, carbs: 1, fat: 8, sodium: 150 },
  'hummus': { unit: '2 tbsp (30g)', calories: 70, protein: 2, carbs: 6, fat: 5, sodium: 130 },

  // Vegetables
  'lettuce': { unit: '1 leaf', calories: 1, protein: 0.1, carbs: 0.2, fat: 0, sodium: 1 },
  'tomato_slice': { unit: '1 slice', calories: 3, protein: 0.1, carbs: 0.6, fat: 0, sodium: 1 },
  'onion_raw': { unit: '2 rings', calories: 6, protein: 0.2, carbs: 1.4, fat: 0, sodium: 1 },
  'onion_grilled': { unit: '2 tbsp', calories: 15, protein: 0.3, carbs: 2, fat: 0.5, sodium: 2 },
  'pickle_slices': { unit: '3 slices', calories: 2, protein: 0, carbs: 0.5, fat: 0, sodium: 200 },
  'jalapeno': { unit: '3 slices', calories: 4, protein: 0.2, carbs: 0.8, fat: 0, sodium: 1 },
  'cucumber': { unit: '5 slices', calories: 3, protein: 0.2, carbs: 0.6, fat: 0, sodium: 0 },
  'bell_pepper': { unit: '1/4 cup', calories: 10, protein: 0.4, carbs: 2, fat: 0, sodium: 1 },
  'spinach': { unit: '1 cup', calories: 7, protein: 0.9, carbs: 1, fat: 0.1, sodium: 24 },
  'avocado': { unit: '1/4 fruit', calories: 80, protein: 1, carbs: 4, fat: 7, sodium: 4 },
  'mushrooms': { unit: '1/4 cup', calories: 5, protein: 0.8, carbs: 0.8, fat: 0.1, sodium: 1 },
  'corn': { unit: '2 tbsp', calories: 20, protein: 0.7, carbs: 4.5, fat: 0.2, sodium: 0 },
  'black_beans': { unit: '2 tbsp', calories: 30, protein: 2, carbs: 5, fat: 0.2, sodium: 60 },
  'pinto_beans': { unit: '2 tbsp', calories: 30, protein: 2, carbs: 5, fat: 0.3, sodium: 55 },
  'olives': { unit: '3 olives', calories: 15, protein: 0, carbs: 1, fat: 1.5, sodium: 115 },
  'roasted_peppers': { unit: '2 tbsp', calories: 10, protein: 0.3, carbs: 2, fat: 0.1, sodium: 5 },

  // Carbs & Sides
  'french_fries_small': { unit: '1 small (71g)', calories: 220, protein: 3, carbs: 29, fat: 11, sodium: 160 },
  'french_fries_medium': { unit: '1 medium (117g)', calories: 320, protein: 5, carbs: 43, fat: 15, sodium: 260 },
  'french_fries_large': { unit: '1 large (154g)', calories: 490, protein: 7, carbs: 66, fat: 23, sodium: 400 },
  'hash_brown': { unit: '1 patty', calories: 150, protein: 1, carbs: 15, fat: 9, sodium: 310 },
  'tater_tots': { unit: '6 pieces', calories: 120, protein: 1, carbs: 14, fat: 7, sodium: 280 },
  'onion_rings': { unit: '4 rings', calories: 180, protein: 2, carbs: 18, fat: 11, sodium: 250 },
  'mashed_potatoes': { unit: '1/2 cup', calories: 110, protein: 2, carbs: 18, fat: 4, sodium: 350 },
  'rice_white': { unit: '1/2 cup', calories: 105, protein: 2, carbs: 23, fat: 0.2, sodium: 150 },
  'rice_brown': { unit: '1/2 cup', calories: 110, protein: 2.5, carbs: 23, fat: 1, sodium: 5 },
  'rice_cilantro_lime': { unit: '1/2 cup', calories: 130, protein: 2, carbs: 23, fat: 3.5, sodium: 180 },
  'chips_tortilla': { unit: '1 oz (28g)', calories: 140, protein: 2, carbs: 19, fat: 7, sodium: 115 },
  'coleslaw': { unit: '1/2 cup', calories: 150, protein: 1, carbs: 13, fat: 11, sodium: 180 },

  // Drinks & Add-ons
  'soft_drink_small': { unit: '12 oz', calories: 140, protein: 0, carbs: 39, fat: 0, sodium: 30 },
  'soft_drink_medium': { unit: '21 oz', calories: 210, protein: 0, carbs: 58, fat: 0, sodium: 45 },
  'soft_drink_large': { unit: '32 oz', calories: 310, protein: 0, carbs: 86, fat: 0, sodium: 70 },
  'diet_soda': { unit: 'any size', calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 40 },
  'orange_juice': { unit: '12 oz', calories: 160, protein: 2, carbs: 38, fat: 0, sodium: 0 },
  'milk_whole': { unit: '8 oz', calories: 150, protein: 8, carbs: 12, fat: 8, sodium: 100 },
  'milk_skim': { unit: '8 oz', calories: 90, protein: 8, carbs: 12, fat: 0, sodium: 130 },
  'coffee_black': { unit: '12 oz', calories: 5, protein: 0.5, carbs: 0, fat: 0, sodium: 5 },
  'espresso_shot': { unit: '1 shot', calories: 5, protein: 0, carbs: 1, fat: 0, sodium: 0 },
  'milk_steamed': { unit: '8 oz', calories: 120, protein: 8, carbs: 12, fat: 5, sodium: 105 },
  'whipped_cream': { unit: '2 tbsp', calories: 50, protein: 0.5, carbs: 2, fat: 5, sodium: 5 },
  'caramel_syrup': { unit: '1 pump', calories: 20, protein: 0, carbs: 5, fat: 0, sodium: 0 },
  'vanilla_syrup': { unit: '1 pump', calories: 20, protein: 0, carbs: 5, fat: 0, sodium: 0 },
  'chocolate_syrup': { unit: '1 pump', calories: 25, protein: 0.5, carbs: 5, fat: 0.5, sodium: 5 },
};

/**
 * Common customization impacts on nutrition
 */
const CUSTOMIZATION_IMPACTS = {
  // Removals (negative impact)
  'no_bun': { calories: -150, carbs: -27, protein: -5, fat: -2.5, sodium: -230 },
  'no_cheese': { calories: -70, carbs: -1, protein: -4, fat: -6, sodium: -250 },
  'no_mayo': { calories: -100, carbs: 0, protein: 0, fat: -11, sodium: -80 },
  'no_sauce': { calories: -60, carbs: -2, protein: 0, fat: -6, sodium: -100 },
  'no_bacon': { calories: -86, carbs: 0, protein: -6, fat: -6.6, sodium: -274 },
  'no_pickles': { calories: -2, carbs: -0.5, protein: 0, fat: 0, sodium: -200 },
  'no_onions': { calories: -6, carbs: -1.4, protein: -0.2, fat: 0, sodium: -1 },
  'no_lettuce': { calories: -1, carbs: -0.2, protein: -0.1, fat: 0, sodium: -1 },
  'no_tomato': { calories: -3, carbs: -0.6, protein: -0.1, fat: 0, sodium: -1 },
  'no_ketchup': { calories: -10, carbs: -3, protein: 0, fat: 0, sodium: -95 },
  'no_mustard': { calories: -3, carbs: -0.3, protein: -0.2, fat: -0.2, sodium: -55 },

  // Additions (positive impact)
  'extra_cheese': { calories: 70, carbs: 1, protein: 4, fat: 6, sodium: 250 },
  'extra_bacon': { calories: 86, carbs: 0, protein: 6, fat: 6.6, sodium: 274 },
  'extra_sauce': { calories: 60, carbs: 2, protein: 0, fat: 6, sodium: 100 },
  'extra_patty': { calories: 110, carbs: 1, protein: 10, fat: 7, sodium: 75 },
  'add_avocado': { calories: 80, carbs: 4, protein: 1, fat: 7, sodium: 4 },
  'add_egg': { calories: 90, carbs: 0.6, protein: 6, fat: 7, sodium: 95 },
  'add_bacon': { calories: 86, carbs: 0, protein: 6, fat: 6.6, sodium: 274 },
  'add_jalapenos': { calories: 4, carbs: 0.8, protein: 0.2, fat: 0, sodium: 1 },
  'add_mushrooms': { calories: 5, carbs: 0.8, protein: 0.8, fat: 0.1, sodium: 1 },
  'add_guacamole': { calories: 50, carbs: 3, protein: 1, fat: 4.5, sodium: 115 },

  // Substitutions
  'sub_lettuce_wrap': { calories: -145, carbs: -26, protein: -4.5, fat: -2, sodium: -225 },
  'sub_wheat_bun': { calories: -10, carbs: -2, protein: 1, fat: 0, sodium: -30 },
  'sub_grilled_chicken': { calories: -45, carbs: -1, protein: 4, fat: -3.4, sodium: -375 },
  'sub_plant_patty': { calories: 0, carbs: 3, protein: -3, fat: 2, sodium: 200 },
  'sub_turkey_bacon': { calories: -13, carbs: 0, protein: -1, fat: -0.8, sodium: -7 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// AI PROMPT FOR UNLIMITED INGREDIENT BREAKDOWN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build prompt for AI-powered ingredient extraction
 * This enables UNLIMITED menu coverage - any food can be broken down
 */
function buildIngredientBreakdownPrompt(foodName, brandHint = null, regionHint = null) {
  return {
    system: `You are an expert food analyst specializing in restaurant menu items and ingredient decomposition.

Your task is to break down ANY food item into its constituent ingredients with accurate nutrition estimates.

CRITICAL RULES:
1. Provide REALISTIC ingredient lists based on how restaurants actually prepare foods
2. Each ingredient must have: name, portion (with unit), and estimated macros
3. Sum of ingredient calories MUST approximately equal the total food calories (±10%)
4. Account for cooking methods (frying adds oil, grilling doesn't)
5. Be specific about portions (not "some lettuce" but "2 leaves of iceberg lettuce")

${regionHint ? `REGIONAL CONTEXT: ${regionHint}
- Adjust ingredients for regional availability
- Account for regional portion differences
- Note any ingredient substitutions (e.g., no beef in India)` : ''}

${brandHint ? `BRAND/RESTAURANT: ${brandHint}
- Use this brand's typical preparation methods
- Account for their specific recipes and portion sizes
- Reference their published nutrition data when available` : ''}

OUTPUT FORMAT (JSON):
{
  "foodName": "exact name",
  "restaurant": "brand name or 'homemade/generic'",
  "region": "US/India/UK/etc or 'global'",
  "totalNutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sodium": number
  },
  "ingredients": [
    {
      "id": "unique_id",
      "name": "ingredient name",
      "category": "protein|carb|vegetable|sauce|cheese|other",
      "portion": "1 piece (45g)",
      "portionGrams": number,
      "nutrition": {
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "sodium": number
      },
      "isRemovable": boolean,
      "isCustomizable": boolean,
      "commonModifications": ["extra", "light", "no"],
      "allergens": ["dairy", "gluten", etc.]
    }
  ],
  "preparationNotes": "brief description of how it's made",
  "customizationOptions": [
    {
      "action": "remove|add|substitute",
      "ingredient": "name",
      "label": "user-friendly label",
      "nutritionImpact": { calories, protein, carbs, fat, sodium }
    }
  ],
  "confidence": number (0-100)
}`,
    user: `Break down this food into its ingredients with full nutrition data:

Food: "${foodName}"
${brandHint ? `Restaurant/Brand: ${brandHint}` : ''}
${regionHint ? `Region: ${regionHint}` : ''}

Provide complete JSON response with all ingredients, their individual nutrition, and customization options.`
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class IngredientBreakdownService {
  constructor() {
    this.ingredientDB = INGREDIENT_NUTRITION_DB;
    this.customizationImpacts = CUSTOMIZATION_IMPACTS;
    this.regionalMultipliers = REGIONAL_MULTIPLIERS;
    this.cache = new Map(); // In-memory cache for ingredient breakdowns
  }

  /**
   * Get full ingredient breakdown for any food
   * This is the main entry point - handles ANY food, not limited to hardcoded items
   *
   * @param {string} foodName - Name of the food
   * @param {object} options - Optional: brand, region, existingNutrition
   * @returns {Promise<object>} - Full ingredient breakdown with edit capabilities
   */
  async getIngredientBreakdown(foodName, options = {}) {
    const { brand, region, existingNutrition, userId } = options;

    // Generate cache key
    const cacheKey = `${foodName.toLowerCase()}_${brand || 'generic'}_${region || 'US'}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log(`[IngredientBreakdown] Cache hit for "${foodName}"`);
      return this.cache.get(cacheKey);
    }

    try {
      // Use AI to break down the food
      const prompt = buildIngredientBreakdownPrompt(foodName, brand, region);

      const breakdown = await safeJSONCompletion(
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        {
          model: 'gpt-4o-mini',
          temperature: 0.1, // Low temp for consistency
          maxTokens: 2000,
          maxRetries: 1,
        }
      );

      // Validate and enhance the breakdown
      const enhancedBreakdown = this._enhanceBreakdown(breakdown, region);

      // Apply regional adjustments
      const regionalizedBreakdown = this._applyRegionalAdjustments(enhancedBreakdown, region);

      // Add edit capabilities
      const editableBreakdown = this._addEditCapabilities(regionalizedBreakdown);

      // Cache the result
      this.cache.set(cacheKey, editableBreakdown);

      console.log(`[IngredientBreakdown] Generated breakdown for "${foodName}": ${editableBreakdown.ingredients.length} ingredients`);

      return editableBreakdown;

    } catch (error) {
      console.error(`[IngredientBreakdown] Failed to get breakdown for "${foodName}":`, error.message);

      // Return a basic breakdown with the total nutrition
      return this._createFallbackBreakdown(foodName, existingNutrition);
    }
  }

  /**
   * Recalculate nutrition after user modifies ingredients
   *
   * @param {object} originalBreakdown - The original ingredient breakdown
   * @param {array} modifications - Array of modifications: [{action: 'remove'|'add'|'modify', ingredientId, newValue}]
   * @returns {object} - Updated breakdown with new totals
   */
  recalculateNutrition(originalBreakdown, modifications) {
    // Deep clone the original
    const updated = JSON.parse(JSON.stringify(originalBreakdown));

    for (const mod of modifications) {
      switch (mod.action) {
        case 'remove':
          this._removeIngredient(updated, mod.ingredientId);
          break;
        case 'add':
          this._addIngredient(updated, mod.ingredient);
          break;
        case 'modify':
          this._modifyIngredient(updated, mod.ingredientId, mod.changes);
          break;
        case 'substitute':
          this._substituteIngredient(updated, mod.ingredientId, mod.newIngredient);
          break;
      }
    }

    // Recalculate totals
    updated.totalNutrition = this._calculateTotals(updated.ingredients);
    updated.lastModified = new Date().toISOString();
    updated.isModified = true;
    updated.modifications = modifications;

    return updated;
  }

  /**
   * Apply a known customization (e.g., "no pickles", "extra cheese")
   *
   * @param {object} breakdown - Current ingredient breakdown
   * @param {string} customization - Customization string
   * @returns {object} - Updated breakdown
   */
  applyCustomization(breakdown, customization) {
    const normalizedCustomization = customization.toLowerCase().replace(/\s+/g, '_');

    // Check if this is a known customization
    const impact = this.customizationImpacts[normalizedCustomization];

    if (impact) {
      // Apply the known impact
      const updated = JSON.parse(JSON.stringify(breakdown));

      updated.totalNutrition.calories += impact.calories;
      updated.totalNutrition.protein += impact.protein;
      updated.totalNutrition.carbs += impact.carbs;
      updated.totalNutrition.fat += impact.fat;
      updated.totalNutrition.sodium += impact.sodium;

      // Ensure no negative values
      for (const key of Object.keys(updated.totalNutrition)) {
        updated.totalNutrition[key] = Math.max(0, updated.totalNutrition[key]);
      }

      // Track the customization
      updated.appliedCustomizations = updated.appliedCustomizations || [];
      updated.appliedCustomizations.push({
        customization,
        impact,
        appliedAt: new Date().toISOString()
      });

      return updated;
    }

    // If not a known customization, try to parse and apply
    return this._parseAndApplyCustomization(breakdown, customization);
  }

  /**
   * Get suggested add-ons based on food type
   *
   * @param {object} breakdown - Current ingredient breakdown
   * @returns {array} - Suggested ingredients to add
   */
  getSuggestedAddOns(breakdown) {
    const foodType = this._detectFoodType(breakdown);

    const suggestions = {
      burger: [
        { name: 'Extra Patty', ingredient: 'beef_patty', impact: this.ingredientDB.beef_patty },
        { name: 'Bacon', ingredient: 'bacon_strip', impact: { ...this.ingredientDB.bacon_strip, count: 2 } },
        { name: 'Avocado', ingredient: 'avocado', impact: this.ingredientDB.avocado },
        { name: 'Fried Egg', ingredient: 'egg_fried', impact: this.ingredientDB.egg_fried },
        { name: 'Extra Cheese', ingredient: 'american_cheese', impact: this.ingredientDB.american_cheese },
        { name: 'Jalapeños', ingredient: 'jalapeno', impact: this.ingredientDB.jalapeno },
        { name: 'Mushrooms', ingredient: 'mushrooms', impact: this.ingredientDB.mushrooms },
      ],
      pizza: [
        { name: 'Extra Cheese', ingredient: 'mozzarella', impact: { ...this.ingredientDB.mozzarella, count: 2 } },
        { name: 'Pepperoni', ingredient: 'pepperoni', impact: { calories: 50, protein: 2, carbs: 0, fat: 4.5, sodium: 200 } },
        { name: 'Mushrooms', ingredient: 'mushrooms', impact: this.ingredientDB.mushrooms },
        { name: 'Bell Peppers', ingredient: 'bell_pepper', impact: this.ingredientDB.bell_pepper },
        { name: 'Olives', ingredient: 'olives', impact: this.ingredientDB.olives },
      ],
      sandwich: [
        { name: 'Extra Meat', impact: { calories: 80, protein: 12, carbs: 0, fat: 3, sodium: 300 } },
        { name: 'Cheese', ingredient: 'american_cheese', impact: this.ingredientDB.american_cheese },
        { name: 'Avocado', ingredient: 'avocado', impact: this.ingredientDB.avocado },
        { name: 'Bacon', ingredient: 'bacon_strip', impact: { ...this.ingredientDB.bacon_strip, count: 2 } },
      ],
      salad: [
        { name: 'Grilled Chicken', ingredient: 'chicken_breast_grilled', impact: { ...this.ingredientDB.chicken_breast_grilled, portionGrams: 100 } },
        { name: 'Avocado', ingredient: 'avocado', impact: this.ingredientDB.avocado },
        { name: 'Cheese', ingredient: 'feta_cheese', impact: this.ingredientDB.feta_cheese },
        { name: 'Croutons', impact: { calories: 60, protein: 1, carbs: 10, fat: 2, sodium: 100 } },
        { name: 'Extra Dressing', ingredient: 'ranch_dressing', impact: this.ingredientDB.ranch_dressing },
      ],
      bowl: [
        { name: 'Extra Protein', impact: { calories: 120, protein: 20, carbs: 0, fat: 4, sodium: 200 } },
        { name: 'Guacamole', ingredient: 'guacamole', impact: this.ingredientDB.guacamole },
        { name: 'Sour Cream', ingredient: 'sour_cream', impact: this.ingredientDB.sour_cream },
        { name: 'Extra Rice', ingredient: 'rice_cilantro_lime', impact: this.ingredientDB.rice_cilantro_lime },
        { name: 'Cheese', ingredient: 'cheddar_cheese', impact: this.ingredientDB.cheddar_cheese },
      ],
      coffee: [
        { name: 'Extra Shot', ingredient: 'espresso_shot', impact: this.ingredientDB.espresso_shot },
        { name: 'Whipped Cream', ingredient: 'whipped_cream', impact: this.ingredientDB.whipped_cream },
        { name: 'Caramel Syrup', ingredient: 'caramel_syrup', impact: this.ingredientDB.caramel_syrup },
        { name: 'Vanilla Syrup', ingredient: 'vanilla_syrup', impact: this.ingredientDB.vanilla_syrup },
      ],
      default: [
        { name: 'Extra Protein', impact: { calories: 100, protein: 15, carbs: 0, fat: 4, sodium: 150 } },
        { name: 'Extra Sauce', impact: { calories: 60, protein: 0, carbs: 2, fat: 6, sodium: 100 } },
        { name: 'Add Cheese', ingredient: 'american_cheese', impact: this.ingredientDB.american_cheese },
      ],
    };

    return suggestions[foodType] || suggestions.default;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Enhance AI-generated breakdown with additional data
   * @private
   */
  _enhanceBreakdown(breakdown, region) {
    // Add IDs to ingredients if missing
    breakdown.ingredients = breakdown.ingredients.map((ing, idx) => ({
      ...ing,
      id: ing.id || `ing_${idx}_${Date.now()}`,
      isRemovable: ing.isRemovable !== false, // Default true
      isCustomizable: ing.isCustomizable !== false,
    }));

    // Validate calorie sum
    const ingredientCalories = breakdown.ingredients.reduce(
      (sum, ing) => sum + (ing.nutrition?.calories || 0), 0
    );
    const totalCalories = breakdown.totalNutrition?.calories || 0;

    if (totalCalories > 0) {
      const discrepancy = Math.abs(ingredientCalories - totalCalories) / totalCalories;
      if (discrepancy > 0.15) {
        console.warn(
          `[IngredientBreakdown] Calorie mismatch: ingredients=${ingredientCalories}, total=${totalCalories}`
        );
        // Scale ingredients to match total
        const scaleFactor = totalCalories / ingredientCalories;
        breakdown.ingredients = breakdown.ingredients.map(ing => ({
          ...ing,
          nutrition: {
            ...ing.nutrition,
            calories: Math.round((ing.nutrition?.calories || 0) * scaleFactor),
            protein: Math.round((ing.nutrition?.protein || 0) * scaleFactor * 10) / 10,
            carbs: Math.round((ing.nutrition?.carbs || 0) * scaleFactor * 10) / 10,
            fat: Math.round((ing.nutrition?.fat || 0) * scaleFactor * 10) / 10,
          }
        }));
      }
    }

    return breakdown;
  }

  /**
   * Apply regional adjustments to breakdown
   * @private
   */
  _applyRegionalAdjustments(breakdown, region) {
    if (!region || region === 'US') return breakdown;

    const multipliers = this.regionalMultipliers[region];
    if (!multipliers) return breakdown;

    const adjusted = JSON.parse(JSON.stringify(breakdown));

    // Apply portion multiplier
    if (multipliers.portionMultiplier !== 1.0) {
      adjusted.totalNutrition.calories = Math.round(
        adjusted.totalNutrition.calories * multipliers.portionMultiplier
      );
      adjusted.totalNutrition.protein = Math.round(
        adjusted.totalNutrition.protein * multipliers.portionMultiplier * 10
      ) / 10;
      adjusted.totalNutrition.carbs = Math.round(
        adjusted.totalNutrition.carbs * multipliers.portionMultiplier * 10
      ) / 10;
      adjusted.totalNutrition.fat = Math.round(
        adjusted.totalNutrition.fat * multipliers.portionMultiplier * 10
      ) / 10;
    }

    // Apply sodium multiplier
    if (multipliers.sodiumMultiplier !== 1.0) {
      adjusted.totalNutrition.sodium = Math.round(
        adjusted.totalNutrition.sodium * multipliers.sodiumMultiplier
      );
    }

    // Apply ingredient substitutions
    if (multipliers.commonSubstitutions) {
      adjusted.ingredients = adjusted.ingredients.map(ing => {
        const ingKey = ing.name.toLowerCase().replace(/\s+/g, '_');
        for (const [original, replacement] of Object.entries(multipliers.commonSubstitutions)) {
          if (ingKey.includes(original)) {
            return {
              ...ing,
              name: ing.name.replace(new RegExp(original, 'gi'), replacement.replace(/_/g, ' ')),
              regionalSubstitution: { original, replacement, region }
            };
          }
        }
        return ing;
      });
    }

    adjusted.region = region;
    adjusted.regionalAdjustments = {
      applied: true,
      multipliers: {
        portion: multipliers.portionMultiplier,
        sodium: multipliers.sodiumMultiplier,
        sugar: multipliers.sugarMultiplier,
      },
      note: multipliers.note,
    };

    return adjusted;
  }

  /**
   * Add edit capabilities to breakdown
   * @private
   */
  _addEditCapabilities(breakdown) {
    return {
      ...breakdown,
      editCapabilities: {
        canRemoveIngredients: true,
        canAddIngredients: true,
        canModifyPortions: true,
        canSubstitute: true,
        suggestedAddOns: this.getSuggestedAddOns(breakdown),
        removableIngredients: breakdown.ingredients
          .filter(ing => ing.isRemovable)
          .map(ing => ({
            id: ing.id,
            name: ing.name,
            nutritionImpact: {
              calories: -ing.nutrition.calories,
              protein: -ing.nutrition.protein,
              carbs: -ing.nutrition.carbs,
              fat: -ing.nutrition.fat,
              sodium: -ing.nutrition.sodium,
            }
          })),
      },
      isEditable: true,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Create fallback breakdown when AI fails
   * @private
   */
  _createFallbackBreakdown(foodName, existingNutrition = {}) {
    const defaultNutrition = {
      calories: existingNutrition.calories || 300,
      protein: existingNutrition.protein || 10,
      carbs: existingNutrition.carbs || 30,
      fat: existingNutrition.fat || 15,
      fiber: existingNutrition.fiber || 2,
      sodium: existingNutrition.sodium || 500,
    };

    return {
      foodName,
      restaurant: 'unknown',
      region: 'US',
      totalNutrition: defaultNutrition,
      ingredients: [
        {
          id: 'main_component',
          name: foodName,
          category: 'other',
          portion: '1 serving',
          portionGrams: 150,
          nutrition: defaultNutrition,
          isRemovable: false,
          isCustomizable: false,
          commonModifications: [],
          allergens: [],
        }
      ],
      preparationNotes: 'Could not determine detailed ingredients',
      customizationOptions: [],
      confidence: 30,
      isFallback: true,
      editCapabilities: {
        canRemoveIngredients: false,
        canAddIngredients: true,
        canModifyPortions: true,
        canSubstitute: false,
        suggestedAddOns: [],
        removableIngredients: [],
      },
      isEditable: true,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Remove an ingredient from breakdown
   * @private
   */
  _removeIngredient(breakdown, ingredientId) {
    const idx = breakdown.ingredients.findIndex(ing => ing.id === ingredientId);
    if (idx !== -1) {
      const removed = breakdown.ingredients.splice(idx, 1)[0];
      breakdown.removedIngredients = breakdown.removedIngredients || [];
      breakdown.removedIngredients.push(removed);
    }
  }

  /**
   * Add an ingredient to breakdown
   * @private
   */
  _addIngredient(breakdown, ingredient) {
    const newIngredient = {
      id: `added_${Date.now()}`,
      ...ingredient,
      isAdded: true,
      addedAt: new Date().toISOString(),
    };
    breakdown.ingredients.push(newIngredient);
    breakdown.addedIngredients = breakdown.addedIngredients || [];
    breakdown.addedIngredients.push(newIngredient);
  }

  /**
   * Modify an ingredient's portion
   * @private
   */
  _modifyIngredient(breakdown, ingredientId, changes) {
    const ingredient = breakdown.ingredients.find(ing => ing.id === ingredientId);
    if (ingredient) {
      // If portion is being modified, scale nutrition
      if (changes.portionMultiplier) {
        ingredient.nutrition = {
          calories: Math.round(ingredient.nutrition.calories * changes.portionMultiplier),
          protein: Math.round(ingredient.nutrition.protein * changes.portionMultiplier * 10) / 10,
          carbs: Math.round(ingredient.nutrition.carbs * changes.portionMultiplier * 10) / 10,
          fat: Math.round(ingredient.nutrition.fat * changes.portionMultiplier * 10) / 10,
          sodium: Math.round(ingredient.nutrition.sodium * changes.portionMultiplier),
        };
        ingredient.portionGrams = Math.round((ingredient.portionGrams || 0) * changes.portionMultiplier);
      }

      Object.assign(ingredient, changes);
      ingredient.isModified = true;
      ingredient.modifiedAt = new Date().toISOString();
    }
  }

  /**
   * Substitute one ingredient for another
   * @private
   */
  _substituteIngredient(breakdown, ingredientId, newIngredient) {
    const idx = breakdown.ingredients.findIndex(ing => ing.id === ingredientId);
    if (idx !== -1) {
      const original = breakdown.ingredients[idx];
      breakdown.ingredients[idx] = {
        ...newIngredient,
        id: `sub_${Date.now()}`,
        substitutedFor: { id: original.id, name: original.name },
        isSubstituted: true,
        substitutedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Calculate totals from ingredients
   * @private
   */
  _calculateTotals(ingredients) {
    return ingredients.reduce((totals, ing) => ({
      calories: totals.calories + (ing.nutrition?.calories || 0),
      protein: Math.round((totals.protein + (ing.nutrition?.protein || 0)) * 10) / 10,
      carbs: Math.round((totals.carbs + (ing.nutrition?.carbs || 0)) * 10) / 10,
      fat: Math.round((totals.fat + (ing.nutrition?.fat || 0)) * 10) / 10,
      fiber: Math.round((totals.fiber + (ing.nutrition?.fiber || 0)) * 10) / 10,
      sodium: totals.sodium + (ing.nutrition?.sodium || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 });
  }

  /**
   * Detect food type for suggestions
   * @private
   */
  _detectFoodType(breakdown) {
    const name = (breakdown.foodName || '').toLowerCase();

    if (name.includes('burger') || name.includes('whopper') || name.includes('big mac')) return 'burger';
    if (name.includes('pizza')) return 'pizza';
    if (name.includes('sandwich') || name.includes('sub') || name.includes('hoagie')) return 'sandwich';
    if (name.includes('salad')) return 'salad';
    if (name.includes('bowl') || name.includes('burrito')) return 'bowl';
    if (name.includes('coffee') || name.includes('latte') || name.includes('cappuccino')) return 'coffee';
    if (name.includes('taco')) return 'taco';
    if (name.includes('chicken') && (name.includes('nugget') || name.includes('tender'))) return 'chicken';

    return 'default';
  }

  /**
   * Parse and apply free-text customization
   * @private
   */
  _parseAndApplyCustomization(breakdown, customization) {
    const updated = JSON.parse(JSON.stringify(breakdown));
    const lowerCustom = customization.toLowerCase();

    // Parse common patterns
    const removePatterns = [
      { pattern: /no\s+(\w+)/i, action: 'remove' },
      { pattern: /without\s+(\w+)/i, action: 'remove' },
      { pattern: /hold\s+(?:the\s+)?(\w+)/i, action: 'remove' },
    ];

    const addPatterns = [
      { pattern: /extra\s+(\w+)/i, action: 'extra', multiplier: 1.5 },
      { pattern: /double\s+(\w+)/i, action: 'double', multiplier: 2 },
      { pattern: /add\s+(\w+)/i, action: 'add' },
    ];

    // Try to match and apply
    for (const { pattern, action } of removePatterns) {
      const match = lowerCustom.match(pattern);
      if (match) {
        const item = match[1];
        const ingredient = updated.ingredients.find(
          ing => ing.name.toLowerCase().includes(item)
        );
        if (ingredient) {
          this._removeIngredient(updated, ingredient.id);
          updated.appliedCustomizations = updated.appliedCustomizations || [];
          updated.appliedCustomizations.push({
            customization,
            parsedAs: `Remove ${ingredient.name}`,
            appliedAt: new Date().toISOString()
          });
        }
      }
    }

    for (const { pattern, action, multiplier } of addPatterns) {
      const match = lowerCustom.match(pattern);
      if (match) {
        const item = match[1];
        const ingredient = updated.ingredients.find(
          ing => ing.name.toLowerCase().includes(item)
        );
        if (ingredient && action !== 'add') {
          this._modifyIngredient(updated, ingredient.id, { portionMultiplier: multiplier });
          updated.appliedCustomizations = updated.appliedCustomizations || [];
          updated.appliedCustomizations.push({
            customization,
            parsedAs: `${action} ${ingredient.name}`,
            appliedAt: new Date().toISOString()
          });
        }
      }
    }

    // Recalculate totals
    updated.totalNutrition = this._calculateTotals(updated.ingredients);

    return updated;
  }

  /**
   * Clear the cache (for testing/updates)
   */
  clearCache() {
    this.cache.clear();
    console.log('[IngredientBreakdown] Cache cleared');
  }
}

// Export singleton instance
export const ingredientBreakdownService = new IngredientBreakdownService();
export default ingredientBreakdownService;

// Export constants for testing
export {
  REGIONAL_MULTIPLIERS,
  INGREDIENT_NUTRITION_DB,
  CUSTOMIZATION_IMPACTS,
};
