/**
 * Ingredient Estimation Service
 *
 * Provides estimated ingredient breakdowns for common foods.
 * This helps users understand what's in their food and allows them to
 * add/remove ingredients for more accurate tracking.
 *
 * Data sources:
 * - Hardcoded mappings for common foods (fast, reliable)
 * - OpenAI estimation for unknown foods (fallback)
 */

import { getCountableFoodConfig } from '../constants/countableFoods.js';

/**
 * Common food ingredient mappings
 * Each ingredient has:
 * - name: Display name
 * - percentage: Approximate % of total weight
 * - calorieContribution: % of total calories from this ingredient
 * - category: Type of ingredient (base, fat, seasoning, optional)
 * - isRemovable: Whether user can remove this ingredient
 * - alternates: Alternative ingredients that can replace this
 */
export const INGREDIENT_MAPPINGS = {
  // ============================================================================
  // INDIAN BREADS
  // ============================================================================
  roti: {
    totalCalories: 120,
    totalGrams: 40,
    ingredients: [
      {
        name: 'Whole wheat flour (atta)',
        percentage: 85,
        calorieContribution: 90,
        calories: 108,
        macros: { protein: 3, carbs: 22, fat: 0.5, fiber: 2 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Water',
        percentage: 12,
        calorieContribution: 0,
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Salt',
        percentage: 1,
        calorieContribution: 0,
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
        category: 'seasoning',
        isRemovable: true,
      },
      {
        name: 'Oil/Ghee (for cooking)',
        percentage: 2,
        calorieContribution: 10,
        calories: 12,
        macros: { protein: 0, carbs: 0, fat: 1.5, fiber: 0 },
        category: 'fat',
        isRemovable: true,
        alternates: ['No oil (dry roasted)', 'Ghee', 'Butter'],
      },
    ],
    optionalAddOns: [
      {
        name: 'Extra ghee',
        calories: 45,
        macros: { protein: 0, carbs: 0, fat: 5, fiber: 0 },
        description: 'Add ghee on top',
      },
      {
        name: 'Butter',
        calories: 36,
        macros: { protein: 0, carbs: 0, fat: 4, fiber: 0 },
        description: 'Add butter on top',
      },
    ],
  },

  chapati: {
    // Same as roti
    totalCalories: 120,
    totalGrams: 40,
    ingredients: [
      {
        name: 'Whole wheat flour (atta)',
        percentage: 85,
        calorieContribution: 90,
        calories: 108,
        macros: { protein: 3, carbs: 22, fat: 0.5, fiber: 2 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Water',
        percentage: 12,
        calorieContribution: 0,
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Salt',
        percentage: 1,
        calorieContribution: 0,
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
        category: 'seasoning',
        isRemovable: true,
      },
      {
        name: 'Oil/Ghee (for cooking)',
        percentage: 2,
        calorieContribution: 10,
        calories: 12,
        macros: { protein: 0, carbs: 0, fat: 1.5, fiber: 0 },
        category: 'fat',
        isRemovable: true,
      },
    ],
    optionalAddOns: [
      {
        name: 'Extra ghee',
        calories: 45,
        macros: { protein: 0, carbs: 0, fat: 5, fiber: 0 },
      },
    ],
  },

  paratha: {
    totalCalories: 260,
    totalGrams: 80,
    ingredients: [
      {
        name: 'Whole wheat flour (atta)',
        percentage: 60,
        calorieContribution: 55,
        calories: 143,
        macros: { protein: 4, carbs: 29, fat: 0.7, fiber: 2 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Ghee/Oil (layered)',
        percentage: 15,
        calorieContribution: 40,
        calories: 104,
        macros: { protein: 0, carbs: 0, fat: 12, fiber: 0 },
        category: 'fat',
        isRemovable: false,
        alternates: ['Less oil', 'Butter'],
      },
      {
        name: 'Water',
        percentage: 20,
        calorieContribution: 0,
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Salt',
        percentage: 1,
        calorieContribution: 0,
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
        category: 'seasoning',
        isRemovable: true,
      },
      {
        name: 'Ajwain (carom seeds)',
        percentage: 1,
        calorieContribution: 2,
        calories: 5,
        macros: { protein: 0.2, carbs: 0.5, fat: 0.3, fiber: 0.2 },
        category: 'seasoning',
        isRemovable: true,
      },
    ],
    optionalAddOns: [
      {
        name: 'Extra ghee',
        calories: 45,
        macros: { protein: 0, carbs: 0, fat: 5, fiber: 0 },
      },
    ],
  },

  // ============================================================================
  // SOUTH INDIAN
  // ============================================================================
  idli: {
    totalCalories: 58,
    totalGrams: 40,
    ingredients: [
      {
        name: 'Rice (fermented batter)',
        percentage: 70,
        calorieContribution: 75,
        calories: 44,
        macros: { protein: 1, carbs: 10, fat: 0.1, fiber: 0.2 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Urad dal (black gram)',
        percentage: 25,
        calorieContribution: 25,
        calories: 14,
        macros: { protein: 1, carbs: 2, fat: 0.1, fiber: 0.3 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Salt',
        percentage: 1,
        calorieContribution: 0,
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
        category: 'seasoning',
        isRemovable: true,
      },
    ],
    optionalAddOns: [
      {
        name: 'Ghee',
        calories: 45,
        macros: { protein: 0, carbs: 0, fat: 5, fiber: 0 },
      },
      {
        name: 'Coconut chutney',
        calories: 50,
        macros: { protein: 1, carbs: 3, fat: 4, fiber: 1 },
      },
      {
        name: 'Sambar',
        calories: 80,
        macros: { protein: 4, carbs: 10, fat: 2, fiber: 3 },
      },
    ],
  },

  dosa: {
    totalCalories: 168,
    totalGrams: 120,
    ingredients: [
      {
        name: 'Rice (fermented batter)',
        percentage: 65,
        calorieContribution: 70,
        calories: 118,
        macros: { protein: 2.5, carbs: 25, fat: 0.3, fiber: 0.5 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Urad dal (black gram)',
        percentage: 20,
        calorieContribution: 15,
        calories: 25,
        macros: { protein: 1.5, carbs: 3, fat: 0.2, fiber: 0.5 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Oil (for cooking)',
        percentage: 5,
        calorieContribution: 15,
        calories: 25,
        macros: { protein: 0, carbs: 0, fat: 3, fiber: 0 },
        category: 'fat',
        isRemovable: true,
        alternates: ['Less oil', 'Ghee'],
      },
      {
        name: 'Salt',
        percentage: 1,
        calorieContribution: 0,
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
        category: 'seasoning',
        isRemovable: true,
      },
    ],
    optionalAddOns: [
      {
        name: 'Potato masala filling',
        calories: 100,
        macros: { protein: 2, carbs: 15, fat: 4, fiber: 2 },
        description: 'For masala dosa',
      },
      {
        name: 'Coconut chutney',
        calories: 50,
        macros: { protein: 1, carbs: 3, fat: 4, fiber: 1 },
      },
      {
        name: 'Sambar',
        calories: 80,
        macros: { protein: 4, carbs: 10, fat: 2, fiber: 3 },
      },
    ],
  },

  // ============================================================================
  // EGGS
  // ============================================================================
  egg: {
    totalCalories: 72,
    totalGrams: 50,
    ingredients: [
      {
        name: 'Egg white',
        percentage: 60,
        calorieContribution: 25,
        calories: 18,
        macros: { protein: 3.6, carbs: 0.2, fat: 0, fiber: 0 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Egg yolk',
        percentage: 30,
        calorieContribution: 75,
        calories: 54,
        macros: { protein: 2.4, carbs: 0.2, fat: 5, fiber: 0 },
        category: 'base',
        isRemovable: true,
        alternates: ['Egg white only'],
      },
    ],
    optionalAddOns: [],
  },

  'boiled egg': {
    totalCalories: 78,
    totalGrams: 50,
    ingredients: [
      {
        name: 'Egg white',
        percentage: 60,
        calorieContribution: 25,
        calories: 20,
        macros: { protein: 3.6, carbs: 0.2, fat: 0, fiber: 0 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Egg yolk',
        percentage: 30,
        calorieContribution: 75,
        calories: 58,
        macros: { protein: 2.4, carbs: 0.4, fat: 5, fiber: 0 },
        category: 'base',
        isRemovable: true,
      },
    ],
    optionalAddOns: [
      {
        name: 'Salt & pepper',
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
      },
    ],
  },

  omelette: {
    totalCalories: 180,
    totalGrams: 120,
    ingredients: [
      {
        name: 'Eggs (2)',
        percentage: 80,
        calorieContribution: 80,
        calories: 144,
        macros: { protein: 12, carbs: 0.8, fat: 10, fiber: 0 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Oil/Butter (for cooking)',
        percentage: 8,
        calorieContribution: 18,
        calories: 32,
        macros: { protein: 0, carbs: 0, fat: 3.5, fiber: 0 },
        category: 'fat',
        isRemovable: true,
      },
      {
        name: 'Salt',
        percentage: 1,
        calorieContribution: 0,
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
        category: 'seasoning',
        isRemovable: true,
      },
      {
        name: 'Black pepper',
        percentage: 0.5,
        calorieContribution: 1,
        calories: 2,
        macros: { protein: 0, carbs: 0.5, fat: 0, fiber: 0 },
        category: 'seasoning',
        isRemovable: true,
      },
    ],
    optionalAddOns: [
      {
        name: 'Onion',
        calories: 10,
        macros: { protein: 0.2, carbs: 2, fat: 0, fiber: 0.3 },
      },
      {
        name: 'Tomato',
        calories: 5,
        macros: { protein: 0.2, carbs: 1, fat: 0, fiber: 0.2 },
      },
      {
        name: 'Cheese',
        calories: 45,
        macros: { protein: 3, carbs: 0.2, fat: 3.5, fiber: 0 },
      },
      {
        name: 'Green chilli',
        calories: 2,
        macros: { protein: 0, carbs: 0.5, fat: 0, fiber: 0.1 },
      },
    ],
  },

  // ============================================================================
  // FRUITS
  // ============================================================================
  banana: {
    totalCalories: 105,
    totalGrams: 118,
    ingredients: [
      {
        name: 'Banana (whole)',
        percentage: 100,
        calorieContribution: 100,
        calories: 105,
        macros: { protein: 1.3, carbs: 27, fat: 0.4, fiber: 3 },
        category: 'base',
        isRemovable: false,
      },
    ],
    optionalAddOns: [
      {
        name: 'Honey',
        calories: 21,
        macros: { protein: 0, carbs: 6, fat: 0, fiber: 0 },
      },
      {
        name: 'Peanut butter',
        calories: 94,
        macros: { protein: 4, carbs: 3, fat: 8, fiber: 1 },
      },
    ],
  },

  apple: {
    totalCalories: 95,
    totalGrams: 182,
    ingredients: [
      {
        name: 'Apple (with skin)',
        percentage: 100,
        calorieContribution: 100,
        calories: 95,
        macros: { protein: 0.5, carbs: 25, fat: 0.3, fiber: 4 },
        category: 'base',
        isRemovable: false,
      },
    ],
    optionalAddOns: [
      {
        name: 'Peanut butter',
        calories: 94,
        macros: { protein: 4, carbs: 3, fat: 8, fiber: 1 },
      },
    ],
  },

  // ============================================================================
  // INDIAN SNACKS
  // ============================================================================
  samosa: {
    totalCalories: 250,
    totalGrams: 80,
    ingredients: [
      {
        name: 'Maida (all-purpose flour)',
        percentage: 35,
        calorieContribution: 30,
        calories: 75,
        macros: { protein: 2, carbs: 16, fat: 0.3, fiber: 0.5 },
        category: 'base',
        isRemovable: false,
      },
      {
        name: 'Potato filling',
        percentage: 40,
        calorieContribution: 25,
        calories: 63,
        macros: { protein: 1.5, carbs: 10, fat: 2, fiber: 1.5 },
        category: 'filling',
        isRemovable: false,
      },
      {
        name: 'Green peas',
        percentage: 10,
        calorieContribution: 5,
        calories: 13,
        macros: { protein: 1, carbs: 2, fat: 0, fiber: 0.5 },
        category: 'filling',
        isRemovable: true,
      },
      {
        name: 'Oil (deep fried)',
        percentage: 12,
        calorieContribution: 38,
        calories: 95,
        macros: { protein: 0, carbs: 0, fat: 11, fiber: 0 },
        category: 'fat',
        isRemovable: false,
        alternates: ['Air fried (less oil)'],
      },
      {
        name: 'Spices',
        percentage: 3,
        calorieContribution: 2,
        calories: 4,
        macros: { protein: 0.2, carbs: 0.5, fat: 0.2, fiber: 0.2 },
        category: 'seasoning',
        isRemovable: true,
      },
    ],
    optionalAddOns: [
      {
        name: 'Tamarind chutney',
        calories: 30,
        macros: { protein: 0, carbs: 7, fat: 0, fiber: 0.5 },
      },
      {
        name: 'Green chutney',
        calories: 15,
        macros: { protein: 0.5, carbs: 2, fat: 0.5, fiber: 0.5 },
      },
    ],
  },
};

/**
 * Get ingredient breakdown for a food
 * @param {string} foodName - Food name to look up
 * @param {number} quantity - Number of items (for scaling)
 * @returns {Object|null} Ingredient breakdown or null if not found
 */
export function getIngredientBreakdown(foodName, quantity = 1) {
  if (!foodName) return null;

  const normalized = foodName.toLowerCase().trim();

  // Direct lookup
  let mapping = INGREDIENT_MAPPINGS[normalized];

  // Check countable foods for aliases
  if (!mapping) {
    const countableConfig = getCountableFoodConfig(foodName);
    if (countableConfig && INGREDIENT_MAPPINGS[countableConfig.key]) {
      mapping = INGREDIENT_MAPPINGS[countableConfig.key];
    }
  }

  if (!mapping) return null;

  // Scale ingredients by quantity
  const scaledIngredients = mapping.ingredients.map((ing) => ({
    ...ing,
    calories: Math.round(ing.calories * quantity),
    grams: Math.round((mapping.totalGrams * ing.percentage * quantity) / 100),
    macros: {
      protein: Math.round(ing.macros.protein * quantity * 10) / 10,
      carbs: Math.round(ing.macros.carbs * quantity * 10) / 10,
      fat: Math.round(ing.macros.fat * quantity * 10) / 10,
      fiber: Math.round(ing.macros.fiber * quantity * 10) / 10,
    },
  }));

  return {
    foodName: normalized,
    quantity,
    totalCalories: Math.round(mapping.totalCalories * quantity),
    totalGrams: Math.round(mapping.totalGrams * quantity),
    ingredients: scaledIngredients,
    optionalAddOns: mapping.optionalAddOns || [],
    canEdit: true,
  };
}

/**
 * Recalculate nutrition after ingredient changes
 * @param {Object} originalBreakdown - Original ingredient breakdown
 * @param {Array} activeIngredients - Array of ingredient names that are active
 * @param {Array} addedAddOns - Array of add-on names that were added
 * @returns {Object} Recalculated nutrition
 */
export function recalculateNutrition(
  originalBreakdown,
  activeIngredients,
  addedAddOns = []
) {
  if (!originalBreakdown) return null;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  // Sum active ingredients
  for (const ing of originalBreakdown.ingredients) {
    if (activeIngredients.includes(ing.name) || !ing.isRemovable) {
      totalCalories += ing.calories;
      totalProtein += ing.macros.protein;
      totalCarbs += ing.macros.carbs;
      totalFat += ing.macros.fat;
      totalFiber += ing.macros.fiber;
    }
  }

  // Add optional add-ons
  for (const addOnName of addedAddOns) {
    const addOn = originalBreakdown.optionalAddOns?.find(
      (a) => a.name === addOnName
    );
    if (addOn) {
      totalCalories += addOn.calories;
      totalProtein += addOn.macros.protein;
      totalCarbs += addOn.macros.carbs;
      totalFat += addOn.macros.fat;
      totalFiber += addOn.macros.fiber;
    }
  }

  return {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    fiber: Math.round(totalFiber * 10) / 10,
    isModified: true,
    activeIngredients,
    addedAddOns,
  };
}

/**
 * Check if a food has ingredient data available
 * @param {string} foodName - Food name to check
 * @returns {boolean}
 */
export function hasIngredientData(foodName) {
  return getIngredientBreakdown(foodName) !== null;
}

export default {
  INGREDIENT_MAPPINGS,
  getIngredientBreakdown,
  recalculateNutrition,
  hasIngredientData,
};
