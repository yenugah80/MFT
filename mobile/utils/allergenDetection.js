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
  // \w* suffix on each nut name (same technique already used below for
  // dairy's "butter\w*") — without it, \b(...)\b's exact word boundary
  // means a food named just "Almonds" or "Walnuts" (plural, extremely
  // common) never matched at all, a real miss for anyone with that allergy.
  'nuts': {
    pattern: /\b(nuts?|almonds?|walnuts?|cashews?|pecans?|pistachios?|macadamias?|hazelnuts?|chestnuts?|brazil nuts?)\b/i,
    exceptions: ['coconut', 'donut', 'doughnut', 'butternut squash', 'water chestnut']
  },
  'tree_nuts': {
    pattern: /\b(almonds?|walnuts?|cashews?|pecans?|pistachios?|macadamias?|hazelnuts?|brazil nuts?)\b/i,
    exceptions: ['coconut']
  },
  'peanuts': {
    pattern: /\b(peanut|peanuts|groundnut)\b/i
  },
  // "butter" alone matches nut/seed butters and fruit butters that contain
  // no dairy at all (almond butter, peanut butter, cocoa butter, apple
  // butter, ...) — excepted the same way "almond milk" etc. already are, so
  // real dairy butter ("buttered toast", "butter chicken", "garlic butter
  // sauce") still correctly matches while these don't.
  'dairy': {
    pattern: /\b(milk|dairy|cheese|cream|butter\w*|yogurt|yoghurt|lactose|whey|casein|ghee|paneer|ricotta|mozzarella|cheddar|parmesan|brie|feta)\b/i,
    exceptions: [
      'coconut milk', 'almond milk', 'oat milk', 'soy milk', 'rice milk', 'dairy-free', 'non-dairy',
      'peanut butter', 'almond butter', 'cashew butter', 'walnut butter', 'hazelnut butter',
      'pistachio butter', 'macadamia butter', 'sunflower butter', 'sunflower seed butter',
      'pumpkin seed butter', 'soy nut butter', 'soy butter', 'cocoa butter', 'shea butter',
      'coconut butter', 'apple butter', 'nut butter', 'seed butter',
    ]
  },
  'milk': {
    pattern: /\b(milk|dairy|cheese|cream|butter\w*|yogurt|lactose|whey|casein)\b/i,
    exceptions: [
      'coconut milk', 'almond milk', 'oat milk', 'soy milk', 'rice milk',
      'peanut butter', 'almond butter', 'cashew butter', 'walnut butter', 'hazelnut butter',
      'pistachio butter', 'macadamia butter', 'sunflower butter', 'sunflower seed butter',
      'pumpkin seed butter', 'soy nut butter', 'soy butter', 'cocoa butter', 'shea butter',
      'coconut butter', 'apple butter', 'nut butter', 'seed butter',
    ]
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
 * Detect ALL FDA/EU allergen categories present in a food name — unlike
 * getAllergenSeverity/containsAllergen (which only check against one user's
 * allergy list), this scans against every category this module knows about.
 * For informational "Contains Allergens" displays that aren't personalized
 * to a specific user's profile (e.g. a meal-analysis summary screen), so
 * they don't have to fall back to trusting the AI's own untrustworthy
 * per-item allergen tagging.
 * @param {string} foodName
 * @returns {string[]} - allergen category keys detected (e.g. ['nuts', 'dairy'])
 */
export function detectAllergensInFoodName(foodName) {
  if (!foodName) return [];
  return Object.keys(ALLERGEN_PATTERNS).filter((allergen) =>
    checkAllergenInFoodName(foodName, allergen)
  );
}

/**
 * Meal-level allergen warnings, filtered to the user's own saved allergies —
 * unlike detectAllergensInFoodName (which surfaces every category this
 * module knows about, regardless of whether the user actually has that
 * allergy), this only ever returns something the user has told the app they
 * react to. Distinguishes two confidence levels per matched allergen:
 *   - 'confirmed': the AI's own per-item allergen tagging named it directly.
 *   - 'possible': no AI tag, but pattern-matching the item's or an
 *     ingredient's name against this specific user allergen found a hit —
 *     an uncertain, name-based signal, only surfaced because it matches
 *     something already in the user's profile (never shown for an allergen
 *     the user doesn't have).
 * A 'confirmed' match always wins over a 'possible' one for the same
 * allergen if both are found across the meal's items.
 * @param {Array} items - Meal items, each with name/allergens/potentialAllergens/ingredients
 * @param {Array} userAllergies - User's saved allergen list from profile
 * @returns {Array<{allergen: string, status: 'confirmed'|'possible'}>}
 */
export function getMealAllergenWarnings(items, userAllergies) {
  if (!items || items.length === 0 || !userAllergies || userAllergies.length === 0) return [];

  const statusByAllergen = new Map();
  const recordMatch = (allergen, status) => {
    const key = allergen.toLowerCase().trim();
    if (statusByAllergen.get(key) === 'confirmed') return; // confirmed already wins
    statusByAllergen.set(key, status);
  };

  items.forEach((item) => {
    const aiTagged = item.allergens || item.potentialAllergens || [];
    userAllergies.forEach((userAllergen) => {
      const userAllergenLower = userAllergen.toLowerCase().trim();

      const aiConfirmed = aiTagged.some((a) => {
        const al = a.toLowerCase().trim();
        return al === userAllergenLower || al.includes(userAllergenLower) || userAllergenLower.includes(al);
      });
      if (aiConfirmed) {
        recordMatch(userAllergen, 'confirmed');
        return;
      }

      const nameMatch = checkAllergenInFoodName(item.name, userAllergen)
        || (item.ingredients || []).some((ing) => checkAllergenInFoodName(ing?.name, userAllergen));
      if (nameMatch) {
        recordMatch(userAllergen, 'possible');
      }
    });
  });

  return Array.from(statusByAllergen.entries()).map(([allergen, status]) => ({ allergen, status }));
}

/**
 * Export patterns for potential use in other components
 */
export { ALLERGEN_PATTERNS };
