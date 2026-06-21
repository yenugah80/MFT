/**
 * Food Knowledge Graph Service
 *
 * Provides structured relationships between foods, nutrients, and dietary constraints.
 * Used by the recommendation engine to:
 *   1. Score foods against micronutrient gaps (beyond macros)
 *   2. Detect allergen cross-reactivity beyond exact name matching
 *   3. Suggest ingredient substitutions when allergens/dislikes block top candidates
 *
 * This is a static knowledge base augmented by LLM reasoning in recommendations.js.
 * No DB queries — pure in-memory lookup for hot-path performance.
 */

// ============================================================================
// ALLERGEN CROSS-REACTIVITY MAP
// Source: FARE (Food Allergy Research & Education), AAAAI guidelines
// Key: primary allergen declared by user
// Value: related terms / derivatives to also flag in food names
// ============================================================================

export const ALLERGEN_CROSS_REACTIVITY = {
  milk:        ['dairy', 'cheese', 'butter', 'cream', 'yogurt', 'curd', 'ghee', 'paneer', 'whey', 'casein', 'lacto', 'lactose'],
  dairy:       ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'curd', 'ghee', 'paneer', 'whey', 'casein', 'lacto', 'lactose'],
  paneer:      ['cheese', 'cottage cheese', 'dairy', 'milk'],
  egg:         ['eggs', 'mayonnaise', 'meringue', 'albumin'],
  wheat:       ['gluten', 'flour', 'bread', 'pasta', 'semolina', 'barley', 'rye', 'atta', 'maida', 'sooji'],
  gluten:      ['wheat', 'flour', 'bread', 'pasta', 'semolina', 'barley', 'rye', 'atta', 'maida', 'sooji', 'seitan'],
  peanut:      ['groundnut', 'peanut butter', 'groundnut oil'],
  peanuts:     ['groundnut', 'peanut butter', 'groundnut oil'],
  'tree nut':  ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'chestnut'],
  'tree nuts': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'chestnut'],
  nuts:        ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'hazelnut', 'chestnut', 'peanut'],
  soy:         ['tofu', 'tempeh', 'edamame', 'miso', 'soy sauce', 'soybean'],
  fish:        ['salmon', 'tuna', 'cod', 'haddock', 'tilapia', 'mackerel', 'sardine', 'anchovy', 'trout', 'bass'],
  shellfish:   ['shrimp', 'prawn', 'crab', 'lobster', 'oyster', 'clam', 'mussel', 'scallop', 'crayfish'],
  sesame:      ['tahini', 'sesame oil', 'til'],
  mustard:     ['mustard oil', 'mustard seeds'],
  corn:        ['maize', 'cornmeal', 'cornstarch', 'popcorn', 'corn syrup'],
};

export const HIDDEN_ALLERGEN_DISHES = {
  'pad thai': ['peanut', 'shellfish', 'fish', 'egg', 'soy'],
  satay: ['peanut', 'soy'],
  'kung pao': ['peanut', 'soy'],
  'dan dan': ['peanut', 'sesame', 'soy', 'wheat'],
  'mole sauce': ['tree nut', 'peanut', 'sesame'],
  mole: ['tree nut', 'peanut', 'sesame'],
  'caesar salad': ['fish', 'egg', 'dairy'],
  'caesar dressing': ['fish', 'egg', 'dairy'],
  worcestershire: ['fish', 'wheat'],
  'worcestershire sauce': ['fish', 'wheat'],
  miso: ['soy'],
  'miso soup': ['soy'],
  'soy sauce': ['soy', 'wheat'],
  hoisin: ['soy', 'wheat', 'sesame'],
  teriyaki: ['soy', 'wheat'],
  ramen: ['wheat', 'soy', 'egg'],
  udon: ['wheat', 'soy'],
  soba: ['wheat'],
  tempura: ['wheat', 'egg', 'shellfish'],
  sushi: ['fish', 'shellfish', 'soy'],
  laksa: ['shellfish', 'fish'],
  pho: ['soy', 'wheat'],
  'tom yum': ['shellfish', 'fish'],
  'green curry': ['fish', 'shellfish'],
  'red curry': ['fish', 'shellfish'],
  'fish sauce': ['fish'],
  'oyster sauce': ['shellfish', 'soy', 'wheat'],
  pesto: ['tree nut', 'dairy'],
  'alfredo sauce': ['dairy', 'wheat'],
  carbonara: ['egg', 'dairy', 'wheat'],
  lasagna: ['wheat', 'dairy', 'egg'],
  ravioli: ['wheat', 'dairy', 'egg'],
  naan: ['wheat', 'dairy'],
  paratha: ['wheat', 'dairy'],
  roti: ['wheat'],
  chapati: ['wheat'],
  poori: ['wheat'],
  upma: ['wheat'],
  dosa: ['soy'],
  sambar: ['mustard'],
  'idli sambar': ['mustard'],
  biryani: ['dairy', 'tree nut'],
  korma: ['dairy', 'tree nut'],
  'butter chicken': ['dairy'],
  'tikka masala': ['dairy', 'tree nut'],
  paneer: ['dairy'],
  raita: ['dairy'],
  lassi: ['dairy'],
  hummus: ['sesame'],
  falafel: ['sesame', 'wheat'],
  tahini: ['sesame'],
  shawarma: ['sesame', 'dairy', 'wheat'],
  gyro: ['dairy', 'wheat'],
  'greek salad': ['dairy'],
  tabbouleh: ['wheat'],
  granola: ['tree nut', 'wheat'],
  muesli: ['tree nut', 'wheat'],
  'trail mix': ['tree nut', 'peanut'],
  praline: ['tree nut', 'dairy'],
  marzipan: ['tree nut'],
  'protein smoothie': ['dairy'],
  whey: ['dairy'],
  'golden milk': ['dairy'],
  'ranch dressing': ['dairy', 'egg'],
  mayonnaise: ['egg'],
  aioli: ['egg'],
  'barbecue sauce': ['soy', 'wheat'],
  'black bean sauce': ['soy', 'wheat'],
};

const ALLERGEN_ALIASES = {
  peanuts: 'peanut',
  groundnut: 'peanut',
  groundnuts: 'peanut',
  nut: 'tree nut',
  nuts: 'tree nut',
  tree_nut: 'tree nut',
  tree_nuts: 'tree nut',
  'tree nuts': 'tree nut',
  milk: 'dairy',
  lactose: 'dairy',
  gluten: 'wheat',
  shellfish: 'shellfish',
  mollusk: 'shellfish',
  mollusks: 'shellfish',
  soybeans: 'soy',
  soybean: 'soy',
  eggs: 'egg',
};

const ALLERGEN_EXCEPTIONS = {
  wheat: ['buckwheat', 'gluten-free', 'gluten free'],
  gluten: ['buckwheat', 'gluten-free', 'gluten free'],
  dairy: ['dairy-free', 'dairy free', 'non-dairy', 'nondairy'],
  milk: ['milk-free', 'milk free'],
  peanut: ['peanut-free', 'peanut free'],
};

function normalizeAllergen(allergen) {
  const key = String(allergen || '').toLowerCase().trim();
  return ALLERGEN_ALIASES[key] || key;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasTerm(text, term) {
  if (!text || !term) return false;
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`, 'i');
  return pattern.test(text);
}

/**
 * Expand a user's allergen list with cross-reactive terms.
 * Returns a deduplicated flat list of all terms to flag in food names.
 *
 * @param {string[]} allergens - Raw allergen strings from user profile
 * @returns {string[]} Expanded list including cross-reactive terms
 */
export function expandAllergens(allergens) {
  if (!allergens || allergens.length === 0) return [];
  const expanded = new Set(allergens.map((a) => normalizeAllergen(a)));
  for (const allergen of allergens) {
    const normalized = normalizeAllergen(allergen);
    const related = ALLERGEN_CROSS_REACTIVITY[normalized] ?? ALLERGEN_CROSS_REACTIVITY[allergen.toLowerCase()] ?? [];
    for (const term of related) expanded.add(normalizeAllergen(term));
  }
  return [...expanded];
}

export function detectAllergenRisk(food, allergies = []) {
  const declared = (allergies || []).map(normalizeAllergen).filter(Boolean);
  if (declared.length === 0) {
    return { hasRisk: false, matchedAllergens: [], hiddenMatches: [], ingredientMatches: [], confidence: 1 };
  }

  const foodName = typeof food === 'string' ? food : (food?.name || food?.foodName || '');
  const textParts = [foodName];
  const ingredients = typeof food === 'object' && food
    ? (food.ingredients || food.keyIngredients || food.ingredientsBreakdown || [])
    : [];

  for (const ingredient of ingredients) {
    if (typeof ingredient === 'string') textParts.push(ingredient);
    else if (ingredient?.name) textParts.push(ingredient.name);
  }

  const searchableText = textParts.join(' ').toLowerCase();
  const expandedTerms = expandAllergens(declared);
  const matched = new Set();
  const ingredientMatches = [];
  const hiddenMatches = [];

  for (const term of expandedTerms) {
    const exceptions = ALLERGEN_EXCEPTIONS[term] || [];
    if (exceptions.some((exception) => searchableText.includes(exception))) continue;
    if (hasTerm(searchableText, term)) {
      matched.add(normalizeAllergen(term));
      for (const declaredAllergen of declared) {
        if (expandAllergens([declaredAllergen]).includes(term)) {
          matched.add(declaredAllergen);
        }
      }
      ingredientMatches.push(term);
    }
  }

  const nameLower = foodName.toLowerCase();
  for (const [dish, risks] of Object.entries(HIDDEN_ALLERGEN_DISHES)) {
    if (!hasTerm(nameLower, dish)) continue;
    for (const risk of risks) {
      const normalizedRisk = normalizeAllergen(risk);
      const riskTerms = expandAllergens([normalizedRisk]);
      const intersectsUserAllergy = declared.includes(normalizedRisk)
        || riskTerms.some((term) => expandedTerms.includes(term))
        || expandedTerms.some((term) => riskTerms.includes(term));
      if (intersectsUserAllergy) {
        matched.add(normalizedRisk);
        hiddenMatches.push({ dish, allergen: normalizedRisk });
      }
    }
  }

  const matchedAllergens = [...matched];
  return {
    hasRisk: matchedAllergens.length > 0,
    matchedAllergens,
    hiddenMatches,
    ingredientMatches,
    confidence: hiddenMatches.length > 0 ? 0.9 : 0.98,
  };
}

export function inferFoodAttributes(food) {
  const name = String(food?.name || food?.foodName || '').toLowerCase();
  const tags = new Set(food?.tags || []);

  if (/(chicken|salmon|tuna|sardine|egg|yogurt|paneer|tofu|tempeh|lentil|dal|bean|chickpea|edamame|cottage cheese)/.test(name)) {
    tags.add('high-protein');
  }
  if (/(oat|lentil|dal|bean|chickpea|rajma|quinoa|brown rice|whole wheat|vegetable|broccoli|spinach|palak|chia|flax|avocado)/.test(name)) {
    tags.add('fiber-rich');
  }
  if (/(oat|rice|quinoa|sweet potato|roti|whole wheat|bean|lentil|dal)/.test(name)) {
    tags.add('complex-carbs');
  }
  if (/(salmon|sardine|tuna|chia|flax|walnut)/.test(name)) {
    tags.add('omega3-rich');
  }
  if (/(turmeric|ginger|berry|berries|green tea|spinach|palak|salmon|sardine|broccoli|avocado)/.test(name)) {
    tags.add('anti-inflammatory');
  }
  if (/(water|cucumber|watermelon|soup|broth|congee|tea|coconut water|smoothie)/.test(name)) {
    tags.add('hydrating');
  }
  if (/(banana|oat|rice|quinoa|sweet potato|egg|yogurt|chicken|smoothie)/.test(name)) {
    tags.add('energy-boost');
  }

  const cuisineTags = new Set(food?.cuisineTags || []);
  if (/(dal|idli|dosa|roti|paneer|palak|chana|rajma|biryani|masala|upma|khichdi)/.test(name)) cuisineTags.add('indian');
  if (/(hummus|falafel|tabbouleh|greek|sardine|olive|feta|tzatziki)/.test(name)) cuisineTags.add('mediterranean');
  if (/(miso|tofu|edamame|soba|congee|kimchi|stir-fry|teriyaki|ramen)/.test(name)) cuisineTags.add('asian');
  if (/(taco|burrito|salsa|tortilla|black bean|avocado)/.test(name)) cuisineTags.add('mexican');
  if (/(oatmeal|turkey|sandwich|cottage cheese|chicken breast|smoothie)/.test(name)) cuisineTags.add('american');

  return {
    tags: getMicroTagsForFood({ ...food, tags: [...tags] }),
    moodBoost: Boolean(food?.moodBoost) || /(salmon|sardine|egg|yogurt|oat|berry|banana|green tea|avocado|dal|lentil)/.test(name),
    hydrating: Boolean(food?.hydrating) || tags.has('hydrating'),
    cuisineTags: [...cuisineTags],
  };
}

// ============================================================================
// MICRONUTRIENT TAGS PER FOOD CATALOGUE ITEM
// Key: food catalogue ID (e.g. 'IN001') or normalised name fragment
// Value: array of micronutrient tags the food is significantly rich in
// (supplements the `tags` field on each catalogue item)
// ============================================================================

/**
 * Micronutrient tag definitions.
 * Only include when the food provides ≥ 15% RDA per typical serving.
 * Tags follow the pattern: "<nutrient>-rich"
 */
export const FOOD_MICRO_TAGS = {
  // ── Indian ────────────────────────────────────────────────────────────────
  IN001: ['iron-rich', 'folate-rich', 'zinc-rich'],              // Dal (yellow lentil)
  IN002: ['calcium-rich', 'probiotic'],                           // Idli
  IN003: ['iron-rich', 'magnesium-rich'],                         // Whole wheat roti
  IN004: ['calcium-rich', 'phosphorus-rich', 'vitamin-b12-rich'], // Paneer bhurji
  IN005: ['iron-rich', 'zinc-rich', 'vitamin-b12-rich'],          // Chicken biryani
  IN006: ['calcium-rich', 'probiotic', 'vitamin-c-rich'],         // Masala dosa
  IN007: ['iron-rich', 'folate-rich', 'potassium-rich'],          // Rajma
  IN008: ['magnesium-rich', 'phosphorus-rich'],                   // Upma
  IN009: ['iron-rich', 'calcium-rich', 'vitamin-a-rich'],         // Palak paneer
  IN010: ['calcium-rich', 'phosphorus-rich', 'vitamin-b12-rich'], // Curd / yogurt
  IN011: ['iron-rich', 'vitamin-c-rich', 'potassium-rich'],       // Chana masala
  IN012: ['vitamin-c-rich', 'beta-carotene-rich'],                // Baingan bharta
  IN013: ['vitamin-c-rich', 'potassium-rich', 'vitamin-b6-rich'], // Aloo gobi
  IN014: ['iron-rich', 'calcium-rich'],                           // Saag (mustard greens)
  IN015: ['protein-rich', 'iron-rich', 'zinc-rich'],              // Egg curry
  IN016: ['vitamin-c-rich', 'potassium-rich'],                    // Raita (cucumber)
  IN017: ['vitamin-a-rich', 'vitamin-c-rich', 'potassium-rich'],  // Vegetable khichdi
  IN018: ['vitamin-c-rich', 'iron-rich'],                         // Moong dal salad
  IN019: ['vitamin-b12-rich', 'omega3-rich', 'potassium-rich'],   // Fish curry
  IN020: ['iron-rich', 'protein-rich', 'zinc-rich'],              // Chicken tikka

  // ── Mediterranean ─────────────────────────────────────────────────────────
  ME001: ['omega3-rich', 'vitamin-d-rich', 'vitamin-b12-rich'],   // Baked salmon
  ME002: ['calcium-rich', 'vitamin-c-rich', 'iron-rich'],         // Greek salad
  ME003: ['iron-rich', 'folate-rich', 'magnesium-rich'],          // Hummus
  ME004: ['folate-rich', 'iron-rich', 'vitamin-c-rich'],          // Falafel
  ME005: ['vitamin-c-rich', 'vitamin-a-rich', 'potassium-rich'],  // Ratatouille
  ME006: ['calcium-rich', 'omega3-rich'],                         // Tzatziki
  ME007: ['magnesium-rich', 'iron-rich', 'folate-rich'],          // Lentil soup
  ME008: ['iron-rich', 'vitamin-b12-rich', 'potassium-rich'],     // Lamb kebab
  ME009: ['omega3-rich', 'vitamin-d-rich', 'calcium-rich'],       // Sardines on toast
  ME010: ['vitamin-e-rich', 'vitamin-k-rich', 'potassium-rich'],  // Avocado toast

  // ── Asian ─────────────────────────────────────────────────────────────────
  AS001: ['vitamin-c-rich', 'vitamin-k-rich', 'folate-rich'],     // Miso soup with tofu
  AS002: ['vitamin-b12-rich', 'omega3-rich', 'iodine-rich'],      // Sushi rolls
  AS003: ['vitamin-c-rich', 'vitamin-a-rich', 'iron-rich'],       // Stir-fried vegetables
  AS004: ['calcium-rich', 'iron-rich', 'vitamin-c-rich'],         // Bok choy with tofu
  AS005: ['omega3-rich', 'vitamin-d-rich', 'vitamin-b12-rich'],   // Teriyaki salmon
  AS006: ['vitamin-k-rich', 'calcium-rich', 'iodine-rich'],       // Seaweed salad
  AS007: ['iron-rich', 'zinc-rich', 'protein-rich'],              // Beef bulgogi
  AS008: ['vitamin-c-rich', 'potassium-rich', 'probiotic'],       // Kimchi
  AS009: ['magnesium-rich', 'omega3-rich', 'vitamin-e-rich'],     // Edamame
  AS010: ['vitamin-k-rich', 'calcium-rich', 'folate-rich'],       // Green tea

  // ── American / Western ────────────────────────────────────────────────────
  AM001: ['protein-rich', 'vitamin-b12-rich', 'zinc-rich'],       // Turkey sandwich
  AM002: ['calcium-rich', 'vitamin-d-rich', 'protein-rich'],      // Greek yogurt parfait
  AM003: ['fiber-rich', 'magnesium-rich', 'iron-rich'],           // Oatmeal with berries
  AM004: ['omega3-rich', 'vitamin-d-rich', 'protein-rich'],       // Tuna salad
  AM005: ['vitamin-c-rich', 'vitamin-a-rich', 'potassium-rich'],  // Spinach smoothie

  // ── Snacks ────────────────────────────────────────────────────────────────
  SN001: ['vitamin-e-rich', 'magnesium-rich', 'omega3-rich'],     // Mixed nuts
  SN002: ['calcium-rich', 'vitamin-d-rich', 'protein-rich'],      // Cottage cheese
  SN003: ['potassium-rich', 'vitamin-b6-rich', 'magnesium-rich'], // Banana
  SN004: ['vitamin-c-rich', 'folate-rich', 'potassium-rich'],     // Orange / citrus
  SN005: ['omega3-rich', 'iron-rich', 'calcium-rich'],            // Chia pudding
};

/**
 * Nutrient → food names that are excellent sources (used in MICRONUTRIENT_BOOST mode).
 * These names must match or partially match food catalogue names for the score bonus to trigger.
 */
export const NUTRIENT_RICH_FOOD_FRAGMENTS = {
  iron:          ['spinach', 'palak', 'lentil', 'dal', 'rajma', 'chana', 'chicken', 'beef', 'lamb', 'egg', 'tofu', 'saag', 'moong'],
  calcium:       ['milk', 'curd', 'yogurt', 'paneer', 'cottage cheese', 'bok choy', 'broccoli', 'almond', 'sesame', 'sardine'],
  'vitamin-d':   ['salmon', 'sardine', 'tuna', 'mackerel', 'egg yolk', 'mushroom', 'fortified milk'],
  'vitamin-b12': ['chicken', 'beef', 'lamb', 'fish', 'salmon', 'tuna', 'egg', 'milk', 'curd', 'paneer'],
  'vitamin-c':   ['orange', 'lemon', 'lime', 'bell pepper', 'broccoli', 'kiwi', 'strawberry', 'amla', 'guava', 'tomato'],
  magnesium:     ['spinach', 'palak', 'almonds', 'cashew', 'dark chocolate', 'avocado', 'banana', 'oat', 'pumpkin seed'],
  potassium:     ['banana', 'sweet potato', 'avocado', 'spinach', 'salmon', 'coconut water', 'rajma', 'dal'],
  omega3:        ['salmon', 'sardine', 'mackerel', 'tuna', 'walnut', 'flaxseed', 'chia', 'hemp seed'],
  zinc:          ['pumpkin seed', 'cashew', 'chickpea', 'chana', 'beef', 'lamb', 'chicken', 'lentil', 'dal'],
  folate:        ['spinach', 'palak', 'lentil', 'dal', 'rajma', 'broccoli', 'avocado', 'edamame', 'egg'],
  fiber:         ['lentil', 'dal', 'rajma', 'oat', 'apple', 'banana', 'broccoli', 'whole wheat', 'chia', 'avocado'],
};

/**
 * RDA targets for micronutrient urgency calculation.
 * Using conservative adult values (lower of male/female where different).
 */
export const MICRONUTRIENT_RDA = {
  iron:         18,    // mg — uses female RDA (higher) to avoid false negatives
  calcium:      1000,  // mg
  'vitamin-d':  600,   // IU
  'vitamin-c':  65,    // mg
  magnesium:    310,   // mg
  potassium:    2600,  // mg
  'vitamin-b12': 2.4,  // mcg
  zinc:         8,     // mg
  folate:       400,   // mcg DFE
};

// ============================================================================
// INGREDIENT SUBSTITUTIONS
// When a food is blocked by allergen/dislike, suggest alternatives
// ============================================================================

export const INGREDIENT_SUBSTITUTIONS = {
  dairy:   ['oat milk', 'almond milk', 'coconut milk', 'soy milk', 'cashew milk'],
  milk:    ['oat milk', 'almond milk', 'coconut milk', 'soy milk', 'rice milk'],
  paneer:  ['tofu', 'firm tofu', 'tempeh', 'mushroom', 'chickpea'],
  cheese:  ['nutritional yeast', 'tofu', 'cashew cream', 'vegan cheese'],
  egg:     ['tofu scramble', 'chia seeds', 'flaxseed', 'banana', 'chickpea flour'],
  wheat:   ['rice', 'quinoa', 'millet (jowar)', 'buckwheat', 'tapioca', 'corn'],
  gluten:  ['rice', 'quinoa', 'millet (jowar)', 'buckwheat', 'tapioca', 'corn', 'gluten-free oats'],
  peanut:  ['sunflower seed butter', 'tahini', 'pumpkin seed butter'],
  nuts:    ['seeds (sunflower, pumpkin, sesame)', 'soy nuts', 'chickpeas'],
  soy:     ['chickpea', 'hemp seed', 'sunflower seed', 'lentil'],
  meat:    ['dal', 'rajma', 'chana', 'tofu', 'tempeh', 'paneer'],
  fish:    ['tofu', 'tempeh', 'seaweed', 'jackfruit', 'chickpea'],
  chicken: ['tofu', 'tempeh', 'paneer', 'chickpea', 'mushroom'],
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get additional micronutrient tags for a food item beyond what's in the catalogue.
 * Uses both the catalogue ID and name fragments for lookup.
 *
 * @param {{ id?: string, name: string, tags?: string[] }} food
 * @returns {string[]} merged tag list with micro tags added
 */
export function getMicroTagsForFood(food) {
  const existing = food.tags ?? [];
  const fromId = food.id ? (FOOD_MICRO_TAGS[food.id] ?? []) : [];

  // Name-fragment fallback: check if food name contains any nutrient-rich fragment
  const nameLower = (food.name ?? '').toLowerCase();
  const fromName = [];
  for (const [nutrient, fragments] of Object.entries(NUTRIENT_RICH_FOOD_FRAGMENTS)) {
    if (fragments.some((frag) => nameLower.includes(frag))) {
      fromName.push(`${nutrient}-rich`);
    }
  }

  const allTags = [...new Set([...existing, ...fromId, ...fromName])];
  return allTags;
}

/**
 * Compute which micronutrients are urgently low given today's intake.
 * Returns urgency signals that can be injected into enrichedSignals.
 *
 * @param {object} todayMicros - e.g. { iron: "5mg", calcium: "200mg" } or { iron: 5, calcium: 200 }
 * @returns {{ hasDeficit: boolean, deficits: object, topDeficit: string|null, urgencySignals: object }}
 */
export function computeMicronutrientUrgency(todayMicros) {
  if (!todayMicros || typeof todayMicros !== 'object') {
    return { hasDeficit: false, deficits: {}, topDeficit: null, urgencySignals: {} };
  }

  const deficits = {};
  const urgencySignals = {};

  for (const [nutrient, rda] of Object.entries(MICRONUTRIENT_RDA)) {
    const raw = todayMicros[nutrient] ?? todayMicros[nutrient.replace('-', '')] ?? null;
    if (raw === null || raw === undefined) continue;

    const val = parseFloat(String(raw));
    if (isNaN(val)) continue;

    const pctRda = val / rda;
    if (pctRda < 0.5) { // < 50% RDA = meaningful deficit
      const urgency = Math.min(1, (0.5 - pctRda) / 0.5); // 0 at 50%, 1 at 0%
      deficits[nutrient] = { current: val, rda, urgency, pctRda };
      urgencySignals[`${nutrient.replace('-', '_')}_urgency`] = urgency;
    }
  }

  const topDeficit = Object.entries(deficits)
    .sort((a, b) => b[1].urgency - a[1].urgency)[0]?.[0] ?? null;

  return { hasDeficit: Object.keys(deficits).length > 0, deficits, topDeficit, urgencySignals };
}

/**
 * Score a food's contribution to fixing micronutrient deficits.
 * Returns a bonus score [0, 20] to be added to the candidate score.
 *
 * @param {{ tags?: string[], name: string, id?: string }} food
 * @param {{ iron_urgency?: number, calcium_urgency?: number, ... }} microUrgencySignals
 * @returns {number}
 */
export function scoreMicronutrientFit(food, microUrgencySignals) {
  if (!microUrgencySignals || Object.keys(microUrgencySignals).length === 0) return 0;

  const allTags = getMicroTagsForFood(food);
  let bonus = 0;

  for (const tag of allTags) {
    // Tag format: "iron-rich", "calcium-rich", "vitamin-d-rich"
    // Signal format: "iron_urgency", "vitamin_d_urgency"
    const nutrientFromTag = tag.replace(/-rich$/, '').replace(/-/g, '_');
    const urgency = microUrgencySignals[`${nutrientFromTag}_urgency`] ?? 0;
    if (urgency > 0.2) {
      bonus += Math.round(urgency * 10);
    }
  }

  return Math.min(20, bonus); // cap at 20 pts
}

/**
 * Get substitute food suggestions when a target food is blocked.
 *
 * @param {string} blockedIngredient - The allergen/dislike key
 * @returns {string[]} Array of substitute food names/descriptions
 */
export function getSubstitutes(blockedIngredient) {
  const key = (blockedIngredient ?? '').toLowerCase().trim();
  return INGREDIENT_SUBSTITUTIONS[key] ?? [];
}
