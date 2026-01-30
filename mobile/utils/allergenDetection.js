/**
 * Allergen Detection - Unified Logic
 *
 * Scans meals for user's allergens and generates warnings.
 * Uses sophisticated regex pattern matching consistent with backend
 * to detect allergens in food names and ingredients.
 *
 * Supports FDA Top 9 + EU additional allergens:
 * - FDA: nuts, dairy/milk, eggs, shellfish, soy, wheat, fish, peanuts, sesame
 * - EU: gluten, mustard, celery, sulfites, lupin, mollusks
 */

/**
 * Allergen-specific patterns for precise matching
 * Includes word boundaries to avoid false positives (e.g., "coconut" not matching "nut")
 */
const ALLERGEN_PATTERNS = {
  'nuts': {
    pattern: /\b(nut|nuts|almond|walnut|cashew|pecan|pistachio|macadamia|hazelnut|chestnut|brazil nut)\b/i,
    exceptions: ['coconut', 'donut', 'doughnut', 'butternut squash', 'water chestnut']
  },
  'tree_nuts': {
    pattern: /\b(almond|walnut|cashew|pecan|pistachio|macadamia|hazelnut|brazil nut)\b/i,
    exceptions: ['coconut']
  },
  'peanuts': {
    pattern: /\b(peanut|peanuts|groundnut)\b/i
  },
  'dairy': {
    pattern: /\b(milk|dairy|cheese|cream|butter|yogurt|yoghurt|lactose|whey|casein|ghee|paneer|ricotta|mozzarella|cheddar|parmesan|brie|feta)\b/i,
    exceptions: ['coconut milk', 'almond milk', 'oat milk', 'soy milk', 'rice milk', 'dairy-free', 'non-dairy']
  },
  'milk': {
    pattern: /\b(milk|dairy|cheese|cream|butter|yogurt|lactose|whey|casein)\b/i,
    exceptions: ['coconut milk', 'almond milk', 'oat milk', 'soy milk', 'rice milk']
  },
  'eggs': {
    pattern: /\b(egg|eggs|mayonnaise|mayo|meringue|custard|aioli)\b/i,
    exceptions: ['eggplant', 'egg roll wrapper']
  },
  'fish': {
    pattern: /\b(fish|salmon|tuna|cod|haddock|halibut|anchovy|anchovies|trout|bass|tilapia|mackerel|sardine|herring|snapper|grouper|swordfish|mahi)\b/i,
    exceptions: ['jellyfish', 'starfish', 'crayfish', 'crawfish']
  },
  'shellfish': {
    pattern: /\b(shrimp|prawn|prawns|crab|lobster|oyster|oysters|clam|clams|mussel|mussels|scallop|scallops|crawfish|crayfish|langoustine)\b/i
  },
  'soy': {
    pattern: /\b(soy|soya|soybean|tofu|tempeh|edamame|miso|natto|tamari)\b/i
  },
  'wheat': {
    pattern: /\b(wheat|bread|pasta|flour|couscous|bulgur|farro|semolina|seitan|bran|germ)\b/i,
    exceptions: ['buckwheat', 'wheat-free', 'gluten-free']
  },
  'gluten': {
    pattern: /\b(wheat|barley|rye|gluten|seitan|malt|triticale|spelt|kamut)\b/i,
    exceptions: ['buckwheat', 'gluten-free', 'gluten free']
  },
  'sesame': {
    pattern: /\b(sesame|tahini|halvah|halva|hummus)\b/i
  },
  'mustard': {
    pattern: /\b(mustard|dijon)\b/i
  },
  'celery': {
    pattern: /\b(celery|celeriac)\b/i
  },
  'sulfites': {
    pattern: /\b(sulfite|sulfites|sulphite|sulphites|metabisulfite)\b/i
  },
  'lupin': {
    pattern: /\b(lupin|lupine|lupini)\b/i
  },
  'mollusks': {
    pattern: /\b(squid|octopus|calamari|snail|escargot|abalone|conch)\b/i
  }
};

/**
 * Check if a food name contains a specific allergen using pattern matching
 * @param {string} foodName - The name of the food to check
 * @param {string} allergen - The allergen to check for
 * @returns {boolean} - True if allergen is detected
 */
function checkAllergenInFoodName(foodName, allergen) {
  if (!foodName || !allergen) return false;

  const foodNameLower = foodName.toLowerCase();
  const allergenLower = allergen.toLowerCase().trim();

  // Get pattern config for this allergen
  const patternConfig = ALLERGEN_PATTERNS[allergenLower];

  if (patternConfig && patternConfig.pattern) {
    if (patternConfig.pattern.test(foodName)) {
      // Check exceptions (for false positives)
      if (patternConfig.exceptions && patternConfig.exceptions.some(ex =>
        foodNameLower.includes(ex.toLowerCase())
      )) {
        return false; // Skip, it's an exception
      }
      return true;
    }
  } else {
    // Fallback: For allergens without patterns, use word boundary matching
    const words = foodNameLower.split(/[\s,\-\/]+/);
    if (words.includes(allergenLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Scan meals for allergens - enhanced with pattern matching
 * Checks both the allergens array AND food names for comprehensive detection
 * @param {Array} meals - Array of meal objects
 * @param {Array} userAllergies - User's allergen list from profile
 * @returns {Array} - Warnings for detected allergens
 */
export function scanMealsForAllergens(meals, userAllergies) {
  if (!meals || meals.length === 0 || !userAllergies || userAllergies.length === 0) {
    return [];
  }

  const warnings = [];

  meals.forEach(meal => {
    const detectedAllergens = new Set();

    // Method 1: Check allergens array (from AI analysis)
    const mealAllergens = meal.allergens || [];
    mealAllergens.forEach(allergen => {
      const allergenLower = allergen.toLowerCase().trim();
      userAllergies.forEach(userAllergen => {
        const userAllergenLower = userAllergen.toLowerCase().trim();
        // Direct match or related allergens
        if (allergenLower === userAllergenLower ||
            allergenLower.includes(userAllergenLower) ||
            userAllergenLower.includes(allergenLower)) {
          detectedAllergens.add(allergen);
        }
      });
    });

    // Method 2: Pattern matching on food name (catches missed allergens)
    const foodName = meal.foodName || meal.name || '';
    userAllergies.forEach(userAllergen => {
      if (checkAllergenInFoodName(foodName, userAllergen)) {
        detectedAllergens.add(userAllergen);
      }
    });

    // Method 3: Check ingredients if available
    const ingredients = meal.ingredients || [];
    ingredients.forEach(ingredient => {
      const ingredientName = typeof ingredient === 'string' ? ingredient : ingredient.name || '';
      userAllergies.forEach(userAllergen => {
        if (checkAllergenInFoodName(ingredientName, userAllergen)) {
          detectedAllergens.add(userAllergen);
        }
      });
    });

    if (detectedAllergens.size > 0) {
      warnings.push({
        id: meal.id || `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        meal: meal.foodName || meal.name || 'Unknown meal',
        allergens: Array.from(detectedAllergens),
        loggedAt: meal.loggedDate || meal.createdAt,
        severity: 'critical',
        mealId: meal.id
      });
    }
  });

  return warnings;
}

/**
 * Generate insight card data for allergen warnings
 */
export function generateAllergenInsight(warnings) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  const uniqueAllergens = [...new Set(warnings.flatMap(w => w.allergens))];

  return {
    type: 'urgent',
    icon: 'alert-circle',
    title: '⚠️ Allergen Detected!',
    message: `${warnings.length} meal(s) contain your allergen${warnings.length > 1 ? 's' : ''}`,
    details: `${uniqueAllergens.length} allergen type${uniqueAllergens.length > 1 ? 's' : ''} found: ${uniqueAllergens.join(', ')}`,
    warnings,
    severity: 'critical'
  };
}

/**
 * Get allergen severity for a single food item - enhanced with pattern matching
 * @param {Array} foodAllergens - Allergens from food analysis
 * @param {Array} userAllergies - User's allergen list
 * @param {string} foodName - Optional food name for pattern matching
 * @returns {Object|null} - Allergen info or null if none detected
 */
export function getAllergenSeverity(foodAllergens, userAllergies, foodName = '') {
  if (!userAllergies || userAllergies.length === 0) return null;

  const detectedAllergens = new Set();

  // Check allergens array
  if (foodAllergens && Array.isArray(foodAllergens)) {
    foodAllergens.forEach(allergen => {
      const allergenLower = allergen.toLowerCase().trim();
      userAllergies.forEach(userAllergen => {
        const userAllergenLower = userAllergen.toLowerCase().trim();
        if (allergenLower === userAllergenLower ||
            allergenLower.includes(userAllergenLower) ||
            userAllergenLower.includes(allergenLower)) {
          detectedAllergens.add(allergen);
        }
      });
    });
  }

  // Pattern matching on food name
  if (foodName) {
    userAllergies.forEach(userAllergen => {
      if (checkAllergenInFoodName(foodName, userAllergen)) {
        detectedAllergens.add(userAllergen);
      }
    });
  }

  if (detectedAllergens.size === 0) return null;

  const allergensArray = Array.from(detectedAllergens);
  return {
    hasAllergen: true,
    allergens: allergensArray,
    message: `Contains: ${allergensArray.join(', ')}`,
    severity: 'critical'
  };
}

/**
 * Quick check if any food contains user allergens (for filtering)
 * @param {string} foodName - Food name to check
 * @param {Array} userAllergies - User's allergen list
 * @returns {boolean} - True if allergen detected
 */
export function containsAllergen(foodName, userAllergies) {
  if (!foodName || !userAllergies || userAllergies.length === 0) return false;

  return userAllergies.some(allergen => checkAllergenInFoodName(foodName, allergen));
}

/**
 * Export patterns for potential use in other components
 */
export { ALLERGEN_PATTERNS };
