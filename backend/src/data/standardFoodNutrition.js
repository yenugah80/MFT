/**
 * Standard Food Nutrition Database
 *
 * Precision nutrition values for common foods, organized by category.
 * Values are per standard serving size with sources from USDA.
 *
 * Used for:
 * 1. Validating AI-generated recommendations (±10% tolerance)
 * 2. Calculating precise amounts to meet nutrient goals
 * 3. Suggesting specific food sources for nutrient gaps
 */

export const STANDARD_FOODS = {
  // ============================================================
  // PROTEINS - Animal Sources
  // ============================================================
  proteins: {
    egg_whole: {
      name: 'Whole Egg',
      servingSize: '1 large (50g)',
      servingGrams: 50,
      calories: 72,
      protein: 6,
      carbs: 0.6,
      fats: 5,
      fiber: 0,
      cuisines: ['indian', 'american', 'mediterranean', 'asian', 'mexican'],
      category: 'protein',
      subCategory: 'egg',
      prepMethods: ['boiled', 'scrambled', 'fried', 'poached'],
    },
    egg_white: {
      name: 'Egg White',
      servingSize: '1 large (33g)',
      servingGrams: 33,
      calories: 17,
      protein: 3.6,
      carbs: 0.2,
      fats: 0,
      fiber: 0,
      cuisines: ['all'],
      category: 'protein',
      subCategory: 'egg',
    },
    chicken_breast: {
      name: 'Chicken Breast',
      servingSize: '100g cooked',
      servingGrams: 100,
      calories: 165,
      protein: 31,
      carbs: 0,
      fats: 3.6,
      fiber: 0,
      cuisines: ['all'],
      category: 'protein',
      subCategory: 'poultry',
    },
    chicken_thigh: {
      name: 'Chicken Thigh',
      servingSize: '100g cooked',
      servingGrams: 100,
      calories: 209,
      protein: 26,
      carbs: 0,
      fats: 11,
      fiber: 0,
      cuisines: ['all'],
      category: 'protein',
      subCategory: 'poultry',
    },
    salmon: {
      name: 'Salmon (Atlantic)',
      servingSize: '100g cooked',
      servingGrams: 100,
      calories: 208,
      protein: 20,
      carbs: 0,
      fats: 13,
      fiber: 0,
      cuisines: ['american', 'asian', 'mediterranean'],
      category: 'protein',
      subCategory: 'fish',
    },
    tuna_canned: {
      name: 'Tuna (Canned in Water)',
      servingSize: '100g drained',
      servingGrams: 100,
      calories: 116,
      protein: 26,
      carbs: 0,
      fats: 0.8,
      fiber: 0,
      cuisines: ['all'],
      category: 'protein',
      subCategory: 'fish',
    },
    greek_yogurt: {
      name: 'Greek Yogurt (Plain)',
      servingSize: '1 cup (245g)',
      servingGrams: 245,
      calories: 130,
      protein: 17,
      carbs: 8,
      fats: 4,
      fiber: 0,
      cuisines: ['all'],
      category: 'protein',
      subCategory: 'dairy',
    },
    cottage_cheese: {
      name: 'Cottage Cheese (2%)',
      servingSize: '1 cup (226g)',
      servingGrams: 226,
      calories: 194,
      protein: 26,
      carbs: 8,
      fats: 5,
      fiber: 0,
      cuisines: ['all'],
      category: 'protein',
      subCategory: 'dairy',
    },
    paneer: {
      name: 'Paneer',
      servingSize: '100g',
      servingGrams: 100,
      calories: 265,
      protein: 18,
      carbs: 1.2,
      fats: 21,
      fiber: 0,
      cuisines: ['indian'],
      category: 'protein',
      subCategory: 'dairy',
    },
    mutton: {
      name: 'Mutton (Goat Meat)',
      servingSize: '100g cooked',
      servingGrams: 100,
      calories: 143,
      protein: 27,
      carbs: 0,
      fats: 3,
      fiber: 0,
      cuisines: ['indian', 'middle_eastern', 'african'],
      category: 'protein',
      subCategory: 'meat',
    },
  },

  // ============================================================
  // PROTEINS - Plant Sources
  // ============================================================
  plantProteins: {
    tofu_firm: {
      name: 'Tofu (Firm)',
      servingSize: '100g',
      servingGrams: 100,
      calories: 144,
      protein: 17,
      carbs: 3,
      fats: 9,
      fiber: 2,
      cuisines: ['asian', 'american'],
      category: 'protein',
      subCategory: 'soy',
    },
    tempeh: {
      name: 'Tempeh',
      servingSize: '100g',
      servingGrams: 100,
      calories: 193,
      protein: 19,
      carbs: 9,
      fats: 11,
      fiber: 5,
      cuisines: ['asian', 'american'],
      category: 'protein',
      subCategory: 'soy',
    },
    lentils_cooked: {
      name: 'Lentils (Cooked)',
      servingSize: '1 cup (198g)',
      servingGrams: 198,
      calories: 230,
      protein: 18,
      carbs: 40,
      fats: 0.8,
      fiber: 16,
      cuisines: ['indian', 'middle_eastern', 'mediterranean'],
      category: 'protein',
      subCategory: 'legume',
    },
    dal_moong: {
      name: 'Moong Dal (Cooked)',
      servingSize: '1 cup (200g)',
      servingGrams: 200,
      calories: 212,
      protein: 14,
      carbs: 38,
      fats: 0.8,
      fiber: 16,
      cuisines: ['indian'],
      category: 'protein',
      subCategory: 'legume',
    },
    dal_toor: {
      name: 'Toor Dal (Cooked)',
      servingSize: '1 cup (200g)',
      servingGrams: 200,
      calories: 240,
      protein: 16,
      carbs: 42,
      fats: 1,
      fiber: 14,
      cuisines: ['indian'],
      category: 'protein',
      subCategory: 'legume',
    },
    chickpeas_cooked: {
      name: 'Chickpeas (Cooked)',
      servingSize: '1 cup (164g)',
      servingGrams: 164,
      calories: 269,
      protein: 15,
      carbs: 45,
      fats: 4,
      fiber: 12,
      cuisines: ['indian', 'middle_eastern', 'mediterranean'],
      category: 'protein',
      subCategory: 'legume',
    },
    black_beans_cooked: {
      name: 'Black Beans (Cooked)',
      servingSize: '1 cup (172g)',
      servingGrams: 172,
      calories: 227,
      protein: 15,
      carbs: 41,
      fats: 0.9,
      fiber: 15,
      cuisines: ['mexican', 'american'],
      category: 'protein',
      subCategory: 'legume',
    },
  },

  // ============================================================
  // CARBOHYDRATES - Grains
  // ============================================================
  grains: {
    rice_white_cooked: {
      name: 'White Rice (Cooked)',
      servingSize: '1 cup (158g)',
      servingGrams: 158,
      calories: 205,
      protein: 4,
      carbs: 45,
      fats: 0.4,
      fiber: 0.6,
      cuisines: ['indian', 'asian', 'mexican'],
      category: 'carb',
      subCategory: 'grain',
    },
    rice_brown_cooked: {
      name: 'Brown Rice (Cooked)',
      servingSize: '1 cup (195g)',
      servingGrams: 195,
      calories: 218,
      protein: 5,
      carbs: 46,
      fats: 1.8,
      fiber: 3.5,
      cuisines: ['all'],
      category: 'carb',
      subCategory: 'grain',
    },
    quinoa_cooked: {
      name: 'Quinoa (Cooked)',
      servingSize: '1 cup (185g)',
      servingGrams: 185,
      calories: 222,
      protein: 8,
      carbs: 39,
      fats: 4,
      fiber: 5,
      cuisines: ['american', 'mediterranean'],
      category: 'carb',
      subCategory: 'grain',
    },
    oats_cooked: {
      name: 'Oatmeal (Cooked)',
      servingSize: '1 cup (234g)',
      servingGrams: 234,
      calories: 166,
      protein: 6,
      carbs: 28,
      fats: 3.5,
      fiber: 4,
      cuisines: ['all'],
      category: 'carb',
      subCategory: 'grain',
    },
    roti_wheat: {
      name: 'Wheat Roti/Chapati',
      servingSize: '1 medium (40g)',
      servingGrams: 40,
      calories: 120,
      protein: 3,
      carbs: 24,
      fats: 1,
      fiber: 2,
      cuisines: ['indian'],
      category: 'carb',
      subCategory: 'bread',
    },
    bread_whole_wheat: {
      name: 'Whole Wheat Bread',
      servingSize: '1 slice (28g)',
      servingGrams: 28,
      calories: 69,
      protein: 3,
      carbs: 12,
      fats: 1,
      fiber: 2,
      cuisines: ['american', 'mediterranean'],
      category: 'carb',
      subCategory: 'bread',
    },
    paratha: {
      name: 'Plain Paratha',
      servingSize: '1 medium (80g)',
      servingGrams: 80,
      calories: 280,
      protein: 6,
      carbs: 38,
      fats: 12,
      fiber: 3,
      cuisines: ['indian'],
      category: 'carb',
      subCategory: 'bread',
    },
    tortilla_corn: {
      name: 'Corn Tortilla',
      servingSize: '1 medium (26g)',
      servingGrams: 26,
      calories: 52,
      protein: 1.4,
      carbs: 11,
      fats: 0.7,
      fiber: 1.5,
      cuisines: ['mexican'],
      category: 'carb',
      subCategory: 'bread',
    },
  },

  // ============================================================
  // FIBER SOURCES
  // ============================================================
  fiberSources: {
    chia_seeds: {
      name: 'Chia Seeds',
      servingSize: '1 tbsp (12g)',
      servingGrams: 12,
      calories: 58,
      protein: 2,
      carbs: 5,
      fats: 3.5,
      fiber: 4,
      cuisines: ['all'],
      category: 'fiber',
      subCategory: 'seed',
      benefits: ['omega-3', 'fiber', 'antioxidants'],
    },
    flax_seeds: {
      name: 'Flax Seeds (Ground)',
      servingSize: '1 tbsp (7g)',
      servingGrams: 7,
      calories: 37,
      protein: 1.3,
      carbs: 2,
      fats: 3,
      fiber: 2,
      cuisines: ['all'],
      category: 'fiber',
      subCategory: 'seed',
      benefits: ['omega-3', 'fiber', 'lignans'],
    },
    psyllium_husk: {
      name: 'Psyllium Husk',
      servingSize: '1 tbsp (5g)',
      servingGrams: 5,
      calories: 10,
      protein: 0,
      carbs: 4,
      fats: 0,
      fiber: 4,
      cuisines: ['all'],
      category: 'fiber',
      subCategory: 'supplement',
    },
    beetroot: {
      name: 'Beetroot (Cooked)',
      servingSize: '1 cup (170g)',
      servingGrams: 170,
      calories: 74,
      protein: 3,
      carbs: 17,
      fats: 0.3,
      fiber: 3,
      cuisines: ['all'],
      category: 'fiber',
      subCategory: 'vegetable',
      benefits: ['nitrates', 'antioxidants', 'blood flow'],
    },
    carrot: {
      name: 'Carrot (Raw)',
      servingSize: '1 medium (61g)',
      servingGrams: 61,
      calories: 25,
      protein: 0.6,
      carbs: 6,
      fats: 0.1,
      fiber: 2,
      cuisines: ['all'],
      category: 'fiber',
      subCategory: 'vegetable',
      benefits: ['vitamin A', 'beta-carotene'],
    },
    spinach_cooked: {
      name: 'Spinach (Cooked)',
      servingSize: '1 cup (180g)',
      servingGrams: 180,
      calories: 41,
      protein: 5,
      carbs: 7,
      fats: 0.5,
      fiber: 4,
      cuisines: ['all'],
      category: 'fiber',
      subCategory: 'vegetable',
      benefits: ['iron', 'vitamin K', 'folate'],
    },
    palak_paneer_portion: {
      name: 'Palak (Spinach) - Indian Prep',
      servingSize: '100g cooked',
      servingGrams: 100,
      calories: 23,
      protein: 3,
      carbs: 4,
      fats: 0.4,
      fiber: 2,
      cuisines: ['indian'],
      category: 'fiber',
      subCategory: 'vegetable',
    },
    broccoli_cooked: {
      name: 'Broccoli (Cooked)',
      servingSize: '1 cup (156g)',
      servingGrams: 156,
      calories: 55,
      protein: 4,
      carbs: 11,
      fats: 0.6,
      fiber: 5,
      cuisines: ['all'],
      category: 'fiber',
      subCategory: 'vegetable',
    },
    banana: {
      name: 'Banana',
      servingSize: '1 medium (118g)',
      servingGrams: 118,
      calories: 105,
      protein: 1.3,
      carbs: 27,
      fats: 0.4,
      fiber: 3,
      cuisines: ['all'],
      category: 'fiber',
      subCategory: 'fruit',
    },
    apple: {
      name: 'Apple (with skin)',
      servingSize: '1 medium (182g)',
      servingGrams: 182,
      calories: 95,
      protein: 0.5,
      carbs: 25,
      fats: 0.3,
      fiber: 4,
      cuisines: ['all'],
      category: 'fiber',
      subCategory: 'fruit',
    },
  },

  // ============================================================
  // HEALTHY FATS
  // ============================================================
  healthyFats: {
    almonds: {
      name: 'Almonds',
      servingSize: '1 oz (28g, ~23 nuts)',
      servingGrams: 28,
      calories: 164,
      protein: 6,
      carbs: 6,
      fats: 14,
      fiber: 3.5,
      cuisines: ['all'],
      category: 'fat',
      subCategory: 'nut',
    },
    walnuts: {
      name: 'Walnuts',
      servingSize: '1 oz (28g, ~14 halves)',
      servingGrams: 28,
      calories: 185,
      protein: 4,
      carbs: 4,
      fats: 18,
      fiber: 2,
      cuisines: ['all'],
      category: 'fat',
      subCategory: 'nut',
      benefits: ['omega-3', 'brain health'],
    },
    avocado: {
      name: 'Avocado',
      servingSize: '1/2 fruit (100g)',
      servingGrams: 100,
      calories: 160,
      protein: 2,
      carbs: 9,
      fats: 15,
      fiber: 7,
      cuisines: ['mexican', 'american'],
      category: 'fat',
      subCategory: 'fruit',
    },
    olive_oil: {
      name: 'Olive Oil (Extra Virgin)',
      servingSize: '1 tbsp (13.5g)',
      servingGrams: 13.5,
      calories: 119,
      protein: 0,
      carbs: 0,
      fats: 13.5,
      fiber: 0,
      cuisines: ['mediterranean', 'italian'],
      category: 'fat',
      subCategory: 'oil',
    },
    ghee: {
      name: 'Ghee (Clarified Butter)',
      servingSize: '1 tbsp (14g)',
      servingGrams: 14,
      calories: 123,
      protein: 0,
      carbs: 0,
      fats: 14,
      fiber: 0,
      cuisines: ['indian'],
      category: 'fat',
      subCategory: 'oil',
    },
    peanut_butter: {
      name: 'Peanut Butter (Natural)',
      servingSize: '2 tbsp (32g)',
      servingGrams: 32,
      calories: 188,
      protein: 8,
      carbs: 6,
      fats: 16,
      fiber: 2,
      cuisines: ['american', 'asian'],
      category: 'fat',
      subCategory: 'spread',
    },
  },
};

/**
 * Get foods by category and optionally filter by cuisine
 */
export function getFoodsByCategory(category, cuisine = null) {
  const allFoods = [];

  for (const [categoryKey, foods] of Object.entries(STANDARD_FOODS)) {
    for (const [foodKey, food] of Object.entries(foods)) {
      if (food.category === category || categoryKey.includes(category)) {
        if (!cuisine || food.cuisines.includes(cuisine) || food.cuisines.includes('all')) {
          allFoods.push({ key: foodKey, ...food });
        }
      }
    }
  }

  return allFoods;
}

/**
 * Find foods to meet a specific nutrient gap
 *
 * @param {string} nutrient - 'protein', 'fiber', 'carbs', 'fats'
 * @param {number} targetAmount - Amount needed in grams
 * @param {string} cuisine - User's preferred cuisine
 * @returns {Array} Suggested foods with exact amounts
 */
export function findFoodsForNutrientGap(nutrient, targetAmount, cuisine = null) {
  const suggestions = [];

  for (const [categoryKey, foods] of Object.entries(STANDARD_FOODS)) {
    for (const [foodKey, food] of Object.entries(foods)) {
      const nutrientPerServing = food[nutrient] || 0;

      if (nutrientPerServing <= 0) continue;

      // Check cuisine match
      const cuisineMatch = !cuisine ||
        food.cuisines.includes(cuisine) ||
        food.cuisines.includes('all');

      if (!cuisineMatch) continue;

      // Calculate servings needed
      const servingsNeeded = targetAmount / nutrientPerServing;
      const gramsNeeded = Math.round(servingsNeeded * food.servingGrams);

      // Only suggest if reasonable portion (0.5 to 3 servings)
      if (servingsNeeded >= 0.5 && servingsNeeded <= 3) {
        const totalNutrition = {
          calories: Math.round(servingsNeeded * food.calories),
          protein: Math.round(servingsNeeded * food.protein * 10) / 10,
          carbs: Math.round(servingsNeeded * food.carbs * 10) / 10,
          fats: Math.round(servingsNeeded * food.fats * 10) / 10,
          fiber: Math.round(servingsNeeded * (food.fiber || 0) * 10) / 10,
        };

        suggestions.push({
          food: food.name,
          foodKey,
          suggestedAmount: `${gramsNeeded}g`,
          servings: Math.round(servingsNeeded * 10) / 10,
          provides: {
            [nutrient]: Math.round(servingsNeeded * nutrientPerServing * 10) / 10,
          },
          totalNutrition,
          cuisine: food.cuisines[0],
          prepMethods: food.prepMethods,
          benefits: food.benefits,
        });
      }
    }
  }

  // Sort by efficiency (least extra calories for the nutrient)
  return suggestions.sort((a, b) => {
    const efficiencyA = a.provides[nutrient] / a.totalNutrition.calories;
    const efficiencyB = b.provides[nutrient] / b.totalNutrition.calories;
    return efficiencyB - efficiencyA;
  });
}

/**
 * Generate specific suggestions based on user's remaining budget
 *
 * @param {Object} remaining - { calories, protein, carbs, fats, fiber }
 * @param {string} cuisine - User's preferred cuisine (indian, american, etc.)
 * @returns {Array} Prioritized suggestions with exact amounts
 */
export function generatePreciseSuggestions(remaining, cuisine) {
  const suggestions = [];

  // Identify gaps (>20% of daily goal remaining)
  const gaps = [];

  if (remaining.protein > 20) gaps.push({ nutrient: 'protein', amount: remaining.protein });
  if (remaining.fiber > 5) gaps.push({ nutrient: 'fiber', amount: remaining.fiber });
  if (remaining.carbs > 30) gaps.push({ nutrient: 'carbs', amount: remaining.carbs });
  if (remaining.fats > 10) gaps.push({ nutrient: 'fats', amount: remaining.fats });

  // Get suggestions for each gap
  for (const gap of gaps) {
    const foodOptions = findFoodsForNutrientGap(gap.nutrient, gap.amount, cuisine);

    if (foodOptions.length > 0) {
      const topOption = foodOptions[0];
      suggestions.push({
        priority: gap.nutrient === 'protein' ? 'high' : 'medium',
        gap: `${Math.round(gap.amount)}g ${gap.nutrient}`,
        suggestion: `Add ${topOption.suggestedAmount} ${topOption.food}`,
        provides: topOption.provides,
        nutrition: topOption.totalNutrition,
        alternatives: foodOptions.slice(1, 3).map(f => f.food),
      });
    }
  }

  return suggestions;
}

/**
 * Validate AI-generated nutrition against standards
 * Returns true if within ±10% tolerance
 */
export function validateNutritionAccuracy(foodName, aiNutrition) {
  const foodNameLower = foodName.toLowerCase();

  // Find matching food in database
  for (const [categoryKey, foods] of Object.entries(STANDARD_FOODS)) {
    for (const [foodKey, food] of Object.entries(foods)) {
      if (foodNameLower.includes(food.name.toLowerCase()) ||
          food.name.toLowerCase().includes(foodNameLower)) {
        // Calculate tolerance (±10%)
        const tolerance = 0.1;

        const withinTolerance = (ai, standard) => {
          if (standard === 0) return ai <= 1;
          const diff = Math.abs(ai - standard) / standard;
          return diff <= tolerance;
        };

        const validation = {
          matched: food.name,
          protein: withinTolerance(aiNutrition.protein, food.protein),
          carbs: withinTolerance(aiNutrition.carbs, food.carbs),
          fats: withinTolerance(aiNutrition.fats, food.fats),
          calories: withinTolerance(aiNutrition.calories, food.calories),
        };

        validation.isAccurate = validation.protein && validation.carbs &&
                                validation.fats && validation.calories;

        if (!validation.isAccurate) {
          validation.suggested = {
            protein: food.protein,
            carbs: food.carbs,
            fats: food.fats,
            calories: food.calories,
          };
        }

        return validation;
      }
    }
  }

  return { matched: null, isAccurate: null }; // No match found in database
}

export default STANDARD_FOODS;
