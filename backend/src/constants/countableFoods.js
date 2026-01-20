/**
 * Countable Foods Mapping
 *
 * Unit-based foods that should default to "1 [item]" not "1 serving"
 * because "1 serving" is ambiguous and often interpreted as multiple items.
 *
 * Examples:
 * - "1 roti" = ~120 cal (correct)
 * - "1 serving of roti" = 2-3 rotis = ~299 cal (incorrect assumption)
 */

export const COUNTABLE_FOODS = {
  // ============================================================================
  // INDIAN BREADS - These are ALWAYS counted as individual pieces
  // ============================================================================
  roti: {
    defaultUnit: 'medium',
    defaultQuantity: 1,
    portionTemplate: '1 medium roti (40g)',
    gramsPerUnit: 40,
    caloriesPerUnit: 120,
    macrosPerUnit: { protein: 3, carbs: 24, fat: 1, fiber: 2 },
    category: 'indian_bread',
    aliases: ['rotis', 'chapati', 'chapatis', 'phulka', 'phulkas', 'fulka'],
  },
  paratha: {
    defaultUnit: 'medium',
    defaultQuantity: 1,
    portionTemplate: '1 medium paratha (80g)',
    gramsPerUnit: 80,
    caloriesPerUnit: 260,
    macrosPerUnit: { protein: 5, carbs: 32, fat: 13, fiber: 2 },
    category: 'indian_bread',
    aliases: ['parathas', 'parantha', 'paranthas', 'prantha'],
  },
  naan: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 naan (90g)',
    gramsPerUnit: 90,
    caloriesPerUnit: 262,
    macrosPerUnit: { protein: 9, carbs: 45, fat: 5, fiber: 2 },
    category: 'indian_bread',
    aliases: ['naans', 'nan'],
  },
  puri: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 puri (30g)',
    gramsPerUnit: 30,
    caloriesPerUnit: 100,
    macrosPerUnit: { protein: 2, carbs: 12, fat: 5, fiber: 1 },
    category: 'indian_bread',
    aliases: ['puris', 'poori', 'pooris'],
  },
  bhatura: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 bhatura (100g)',
    gramsPerUnit: 100,
    caloriesPerUnit: 300,
    macrosPerUnit: { protein: 6, carbs: 40, fat: 13, fiber: 2 },
    category: 'indian_bread',
    aliases: ['bhaturas', 'bhature', 'bhatoora'],
  },
  kulcha: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 kulcha (80g)',
    gramsPerUnit: 80,
    caloriesPerUnit: 240,
    macrosPerUnit: { protein: 7, carbs: 38, fat: 7, fiber: 2 },
    category: 'indian_bread',
    aliases: ['kulchas', 'amritsari kulcha'],
  },

  // ============================================================================
  // SOUTH INDIAN - Counted individually
  // ============================================================================
  dosa: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 dosa (120g)',
    gramsPerUnit: 120,
    caloriesPerUnit: 168,
    macrosPerUnit: { protein: 4, carbs: 28, fat: 4, fiber: 1 },
    category: 'south_indian',
    aliases: ['dosas', 'dosai', 'plain dosa'],
  },
  'masala dosa': {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 masala dosa (200g)',
    gramsPerUnit: 200,
    caloriesPerUnit: 295,
    macrosPerUnit: { protein: 6, carbs: 42, fat: 12, fiber: 3 },
    category: 'south_indian',
    aliases: ['masala dosas'],
  },
  idli: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 idli (40g)',
    gramsPerUnit: 40,
    caloriesPerUnit: 58,
    macrosPerUnit: { protein: 2, carbs: 12, fat: 0.2, fiber: 0.5 },
    category: 'south_indian',
    aliases: ['idlis', 'idly'],
  },
  vada: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 vada (50g)',
    gramsPerUnit: 50,
    caloriesPerUnit: 170,
    macrosPerUnit: { protein: 6, carbs: 16, fat: 9, fiber: 2 },
    category: 'south_indian',
    aliases: ['vadas', 'medu vada', 'medu vadas', 'vadai', 'wada'],
  },
  uttapam: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 uttapam (150g)',
    gramsPerUnit: 150,
    caloriesPerUnit: 200,
    macrosPerUnit: { protein: 5, carbs: 35, fat: 5, fiber: 2 },
    category: 'south_indian',
    aliases: ['uttapams', 'uthappam', 'oothappam'],
  },
  appam: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 appam (50g)',
    gramsPerUnit: 50,
    caloriesPerUnit: 120,
    macrosPerUnit: { protein: 2, carbs: 24, fat: 1.5, fiber: 0.5 },
    category: 'south_indian',
    aliases: ['appams', 'aappam'],
  },

  // ============================================================================
  // EGGS - Always counted individually
  // ============================================================================
  egg: {
    defaultUnit: 'large',
    defaultQuantity: 1,
    portionTemplate: '1 large egg (50g)',
    gramsPerUnit: 50,
    caloriesPerUnit: 72,
    macrosPerUnit: { protein: 6, carbs: 0.4, fat: 5, fiber: 0 },
    category: 'protein',
    aliases: ['eggs', 'whole egg', 'whole eggs', 'anda'],
  },
  'boiled egg': {
    defaultUnit: 'large',
    defaultQuantity: 1,
    portionTemplate: '1 large boiled egg (50g)',
    gramsPerUnit: 50,
    caloriesPerUnit: 78,
    macrosPerUnit: { protein: 6, carbs: 0.6, fat: 5, fiber: 0 },
    category: 'protein',
    aliases: ['boiled eggs', 'hard boiled egg', 'hard boiled eggs', 'ubla anda'],
  },
  'fried egg': {
    defaultUnit: 'large',
    defaultQuantity: 1,
    portionTemplate: '1 large fried egg (60g)',
    gramsPerUnit: 60,
    caloriesPerUnit: 90,
    macrosPerUnit: { protein: 6, carbs: 0.4, fat: 7, fiber: 0 },
    category: 'protein',
    aliases: ['fried eggs', 'sunny side up', 'over easy'],
  },
  omelette: {
    defaultUnit: 'egg',
    defaultQuantity: 2,
    portionTemplate: '2-egg omelette (120g)',
    gramsPerUnit: 120,
    caloriesPerUnit: 180,
    macrosPerUnit: { protein: 12, carbs: 1, fat: 14, fiber: 0 },
    category: 'protein',
    aliases: ['omelet', 'omelettes', 'omelets', 'egg omelette'],
  },

  // ============================================================================
  // BREAD - Counted per slice/piece
  // ============================================================================
  'bread slice': {
    defaultUnit: 'slice',
    defaultQuantity: 1,
    portionTemplate: '1 slice bread (28g)',
    gramsPerUnit: 28,
    caloriesPerUnit: 75,
    macrosPerUnit: { protein: 3, carbs: 14, fat: 1, fiber: 0.6 },
    category: 'bread',
    aliases: ['bread slices', 'slice of bread', 'slices of bread', 'bread'],
  },
  toast: {
    defaultUnit: 'slice',
    defaultQuantity: 1,
    portionTemplate: '1 slice toast (28g)',
    gramsPerUnit: 28,
    caloriesPerUnit: 75,
    macrosPerUnit: { protein: 3, carbs: 14, fat: 1, fiber: 0.6 },
    category: 'bread',
    aliases: ['toasts', 'toasted bread'],
  },
  'whole wheat bread': {
    defaultUnit: 'slice',
    defaultQuantity: 1,
    portionTemplate: '1 slice whole wheat bread (28g)',
    gramsPerUnit: 28,
    caloriesPerUnit: 69,
    macrosPerUnit: { protein: 3.5, carbs: 12, fat: 1, fiber: 2 },
    category: 'bread',
    aliases: ['whole grain bread', 'brown bread', 'wheat bread'],
  },

  // ============================================================================
  // FRUITS - Counted individually
  // ============================================================================
  banana: {
    defaultUnit: 'medium',
    defaultQuantity: 1,
    portionTemplate: '1 medium banana (118g)',
    gramsPerUnit: 118,
    caloriesPerUnit: 105,
    macrosPerUnit: { protein: 1.3, carbs: 27, fat: 0.4, fiber: 3 },
    category: 'fruit',
    aliases: ['bananas', 'kela'],
  },
  apple: {
    defaultUnit: 'medium',
    defaultQuantity: 1,
    portionTemplate: '1 medium apple (182g)',
    gramsPerUnit: 182,
    caloriesPerUnit: 95,
    macrosPerUnit: { protein: 0.5, carbs: 25, fat: 0.3, fiber: 4 },
    category: 'fruit',
    aliases: ['apples', 'seb'],
  },
  orange: {
    defaultUnit: 'medium',
    defaultQuantity: 1,
    portionTemplate: '1 medium orange (131g)',
    gramsPerUnit: 131,
    caloriesPerUnit: 62,
    macrosPerUnit: { protein: 1.2, carbs: 15, fat: 0.2, fiber: 3 },
    category: 'fruit',
    aliases: ['oranges', 'santra'],
  },
  mango: {
    defaultUnit: 'medium',
    defaultQuantity: 1,
    portionTemplate: '1 medium mango (200g)',
    gramsPerUnit: 200,
    caloriesPerUnit: 135,
    macrosPerUnit: { protein: 1.4, carbs: 35, fat: 0.6, fiber: 4 },
    category: 'fruit',
    aliases: ['mangos', 'mangoes', 'aam'],
  },
  guava: {
    defaultUnit: 'medium',
    defaultQuantity: 1,
    portionTemplate: '1 medium guava (55g)',
    gramsPerUnit: 55,
    caloriesPerUnit: 37,
    macrosPerUnit: { protein: 1.4, carbs: 8, fat: 0.5, fiber: 3 },
    category: 'fruit',
    aliases: ['guavas', 'amrud'],
  },
  papaya: {
    defaultUnit: 'cup',
    defaultQuantity: 1,
    portionTemplate: '1 cup papaya (145g)',
    gramsPerUnit: 145,
    caloriesPerUnit: 62,
    macrosPerUnit: { protein: 0.7, carbs: 16, fat: 0.4, fiber: 2.5 },
    category: 'fruit',
    aliases: ['papayas', 'papita'],
  },

  // ============================================================================
  // INDIAN SNACKS - Counted individually
  // ============================================================================
  samosa: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 samosa (80g)',
    gramsPerUnit: 80,
    caloriesPerUnit: 250,
    macrosPerUnit: { protein: 4, carbs: 26, fat: 14, fiber: 2 },
    category: 'indian_snack',
    aliases: ['samosas'],
  },
  pakora: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 pakora (30g)',
    gramsPerUnit: 30,
    caloriesPerUnit: 75,
    macrosPerUnit: { protein: 2, carbs: 8, fat: 4, fiber: 0.5 },
    category: 'indian_snack',
    aliases: ['pakoras', 'pakoda', 'pakodas', 'bhaji', 'bhajia'],
  },
  kachori: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 kachori (60g)',
    gramsPerUnit: 60,
    caloriesPerUnit: 200,
    macrosPerUnit: { protein: 4, carbs: 22, fat: 11, fiber: 1 },
    category: 'indian_snack',
    aliases: ['kachoris', 'khachori'],
  },

  // ============================================================================
  // INDIAN SWEETS - Counted individually
  // ============================================================================
  ladoo: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 ladoo (30g)',
    gramsPerUnit: 30,
    caloriesPerUnit: 150,
    macrosPerUnit: { protein: 2, carbs: 20, fat: 7, fiber: 0.5 },
    category: 'indian_sweet',
    aliases: ['ladoos', 'laddu', 'laddus', 'laddoo', 'besan ladoo'],
  },
  jalebi: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 jalebi (30g)',
    gramsPerUnit: 30,
    caloriesPerUnit: 150,
    macrosPerUnit: { protein: 1, carbs: 25, fat: 6, fiber: 0 },
    category: 'indian_sweet',
    aliases: ['jalebis'],
  },
  gulab_jamun: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 gulab jamun (40g)',
    gramsPerUnit: 40,
    caloriesPerUnit: 150,
    macrosPerUnit: { protein: 2, carbs: 22, fat: 6, fiber: 0 },
    category: 'indian_sweet',
    aliases: ['gulab jamun', 'gulab jamuns', 'gulabjamun'],
  },
  rasgulla: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 rasgulla (40g)',
    gramsPerUnit: 40,
    caloriesPerUnit: 105,
    macrosPerUnit: { protein: 2.5, carbs: 22, fat: 0.5, fiber: 0 },
    category: 'indian_sweet',
    aliases: ['rasgullas', 'rasagulla'],
  },
  barfi: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 barfi piece (30g)',
    gramsPerUnit: 30,
    caloriesPerUnit: 140,
    macrosPerUnit: { protein: 3, carbs: 18, fat: 6, fiber: 0 },
    category: 'indian_sweet',
    aliases: ['barfis', 'burfi', 'kaju barfi', 'kaju katli'],
  },

  // ============================================================================
  // COOKIES/BISCUITS - Counted individually
  // ============================================================================
  cookie: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 cookie (30g)',
    gramsPerUnit: 30,
    caloriesPerUnit: 140,
    macrosPerUnit: { protein: 2, carbs: 20, fat: 6, fiber: 0.5 },
    category: 'snack',
    aliases: ['cookies'],
  },
  biscuit: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 biscuit (10g)',
    gramsPerUnit: 10,
    caloriesPerUnit: 50,
    macrosPerUnit: { protein: 0.7, carbs: 7, fat: 2, fiber: 0.2 },
    category: 'snack',
    aliases: ['biscuits'],
  },

  // ============================================================================
  // WRAPS/TACOS - Counted per piece
  // ============================================================================
  taco: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 taco (170g)',
    gramsPerUnit: 170,
    caloriesPerUnit: 210,
    macrosPerUnit: { protein: 9, carbs: 20, fat: 10, fiber: 2 },
    category: 'mexican',
    aliases: ['tacos'],
  },
  burrito: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 burrito (250g)',
    gramsPerUnit: 250,
    caloriesPerUnit: 450,
    macrosPerUnit: { protein: 18, carbs: 52, fat: 18, fiber: 6 },
    category: 'mexican',
    aliases: ['burritos'],
  },
  tortilla: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 flour tortilla (45g)',
    gramsPerUnit: 45,
    caloriesPerUnit: 140,
    macrosPerUnit: { protein: 4, carbs: 24, fat: 3.5, fiber: 1.5 },
    category: 'bread',
    aliases: ['tortillas', 'flour tortilla'],
  },

  // ============================================================================
  // PANCAKES/WAFFLES - Counted individually
  // ============================================================================
  pancake: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 pancake (38g)',
    gramsPerUnit: 38,
    caloriesPerUnit: 86,
    macrosPerUnit: { protein: 2, carbs: 11, fat: 3.5, fiber: 0.5 },
    category: 'breakfast',
    aliases: ['pancakes'],
  },
  waffle: {
    defaultUnit: 'piece',
    defaultQuantity: 1,
    portionTemplate: '1 waffle (75g)',
    gramsPerUnit: 75,
    caloriesPerUnit: 218,
    macrosPerUnit: { protein: 6, carbs: 25, fat: 11, fiber: 1 },
    category: 'breakfast',
    aliases: ['waffles'],
  },
};

/**
 * Build a lookup index including all aliases
 * This allows O(1) lookup for any food name or alias
 */
export const COUNTABLE_FOODS_INDEX = (() => {
  const index = {};

  for (const [foodName, config] of Object.entries(COUNTABLE_FOODS)) {
    // Index the primary name (lowercase)
    index[foodName.toLowerCase()] = { key: foodName, ...config };

    // Index all aliases (lowercase)
    if (config.aliases) {
      for (const alias of config.aliases) {
        index[alias.toLowerCase()] = { key: foodName, ...config };
      }
    }
  }

  return index;
})();

/**
 * Check if a food is countable (unit-based)
 * @param {string} foodName - Food name to check
 * @returns {Object|null} Countable food config if found, null otherwise
 */
export function getCountableFoodConfig(foodName) {
  if (!foodName) return null;

  const normalized = foodName.toLowerCase().trim();

  // Direct lookup
  if (COUNTABLE_FOODS_INDEX[normalized]) {
    return COUNTABLE_FOODS_INDEX[normalized];
  }

  // Check if any key is contained in the food name (for compound names)
  // e.g., "plain roti" should match "roti", "wheat roti" should match "roti"
  for (const [key, config] of Object.entries(COUNTABLE_FOODS_INDEX)) {
    // Check if the food name ends with the key (e.g., "wheat roti" ends with "roti")
    if (normalized.endsWith(key)) {
      return config;
    }
    // Check if the key ends with the food name (e.g., "masala dosa" contains "dosa")
    if (normalized.includes(' ' + key) || normalized.startsWith(key + ' ')) {
      return config;
    }
  }

  // Final check: see if the food name contains any key as a word
  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (COUNTABLE_FOODS_INDEX[word]) {
      return COUNTABLE_FOODS_INDEX[word];
    }
  }

  return null;
}

/**
 * Check if a food is countable
 * @param {string} foodName - Food name to check
 * @returns {boolean}
 */
export function isCountableFood(foodName) {
  return getCountableFoodConfig(foodName) !== null;
}

export default {
  COUNTABLE_FOODS,
  COUNTABLE_FOODS_INDEX,
  getCountableFoodConfig,
  isCountableFood,
};
