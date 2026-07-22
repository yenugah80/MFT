/**
 * Nutrition Plausibility Checker
 *
 * WHY THIS EXISTS
 * The existing macro validation (_validateMacros in smartNutritionResolver.js, and
 * validateMacros in utils/nutrition.js) only checks INTERNAL arithmetic consistency:
 * calories ≈ protein×4 + carbs×4 + fat×9. That is blind to a whole class of error
 * where the AI's numbers are internally consistent but wrong by roughly a constant
 * factor — e.g. "Semiya upma" (a tempered, oil-cooked vermicelli dish) estimated at
 * 87 kcal/100g when a plausible real-world value is 150-220. Its macros (2g protein,
 * 14g carbs, 3g fat = 91 kcal) are self-consistent, so the Atwater check passes while
 * every number is ~half of reality.
 *
 * This module adds an ABSOLUTE plausibility check: classify the food into a coarse
 * density category from its name, then compare estimated kcal-per-100g against a
 * known-plausible range for that category. Pure in-process (keyword matching +
 * arithmetic) — no network call, no added latency (measured <1ms per check).
 *
 * DESIGN PRINCIPLE FOR GLOBAL / TRADITIONAL FOODS (important)
 * A keyword list can never enumerate every dish on Earth. For a global user base,
 * FALSE-flagging a legitimate traditional dish the checker doesn't recognize is worse
 * than missing some errors — it tells a user their culture's food is "wrong." So the
 * check is TIERED by how confident we are about the category:
 *
 *   Tier 1 — Known dish (matches the local STANDARD_FOODS reference table):
 *            tight band (±35%) around its real density.
 *   Tier 2 — Confident category (a distinctive keyword matched, e.g. "biryani",
 *            "ramen", "tamale"): that category's band.
 *   Tier 3 — Unrecognized: a deliberately WIDE universal band that only catches the
 *            physically egregious (a solid food reading like broth, or denser than
 *            pure fat). We accept catching fewer errors here rather than punishing
 *            legitimate unfamiliar food.
 *
 * This never silently rewrites the AI's numbers — it FLAGS implausible results so the
 * API can surface a review prompt (the app already has Edit / Report Issue for exactly
 * this). Replacing one guess with another silent guess is not an accuracy improvement.
 * When a known dish is matched, the reference value is returned as a *suggestion* the
 * caller may offer, not an automatic overwrite.
 */

import { STANDARD_FOODS } from '../data/standardFoodNutrition.js';

// kcal per 100g plausible range per coarse category. Ranges are intentionally wide —
// this is a smell test for "wrong by ~2x or more", not a precision database.
const CATEGORY_DENSITY_BANDS = {
  beverage_or_broth:        { min: 0,   max: 70  },
  vegetable:                { min: 10,  max: 110 },
  fruit:                    { min: 25,  max: 120 },
  legume_cooked:            { min: 80,  max: 200 },
  grain_or_starch_cooked:   { min: 55,  max: 240 }, // plain rice, pasta, noodles + wet porridges (oatmeal, congee) which run lighter
  grain_or_starch_tempered: { min: 140, max: 320 }, // fried rice, pulao, biryani, jollof, paella, oily upma
  bread_or_flatbread:       { min: 210, max: 370 }, // roti, tortilla, injera, arepa, pita, mantou
  fried_bread_or_pastry:    { min: 270, max: 500 }, // paratha, puri, samosa, empanada, spring roll, churro
  lean_protein:             { min: 85,  max: 220 }, // chicken breast, fish, egg, tofu, edamame
  fatty_protein:            { min: 180, max: 420 }, // red meat, fried/braised protein, sausage
  dairy_plain:              { min: 30,  max: 170 },
  cheese:                   { min: 220, max: 450 },
  nuts_seeds_or_oil:        { min: 440, max: 900 },
  dessert_or_sweet:         { min: 140, max: 560 }, // spans light milk puddings (kheer, flan ~145) to dense cakes/baklava
  dumpling_or_stuffed:      { min: 150, max: 340 }, // momo, gyoza, pierogi, ravioli, empanada, samosa-like
  soup_stew_with_solids:    { min: 25,  max: 170 }, // thin broths (rasam) → hearty stews; wide because "soup" spans a lot
  mixed_composite_meal:     { min: 90,  max: 300 }, // thali, bento, casserole, curry+rice as one item
  // Universal fallback for anything unrecognized — only catches the physically egregious.
  // Below ~35 a "solid food" is really a broth/drink; above ~750 it's essentially pure
  // fat/nut. Legitimate traditional dishes almost always fall inside this.
  unknown:                  { min: 35,  max: 750 },
};

// Ordered keyword → category matchers, spanning global cuisines. First match wins, so
// more specific / higher-density patterns (fried, tempered, stuffed) precede plainer
// counterparts. Not exhaustive by design — unmatched foods fall to the wide 'unknown'
// band rather than being force-fit into a wrong tight band.
// NOTE: order matters — first match wins. Soups/stews are checked BEFORE grains,
// legumes, and proteins so that "miso soup", "sambar", "chicken noodle soup" resolve
// to the low-density soup band rather than to their solid ingredient. Fried/stuffed
// (high-oil) variants precede their plain counterparts.
const CATEGORY_KEYWORDS = [
  // Beverages / broths / thin soups
  { category: 'beverage_or_broth', keywords: ['juice', 'smoothie', 'tea', 'coffee', 'soda', 'shake', 'lassi', 'kombucha', 'broth', 'consomme', 'clear soup'] },

  // Soups / stews with solids — global. Checked early so "X soup"/thin lentil stews
  // (sambar, miso soup) don't get miscategorised as their dense solid ingredient.
  { category: 'soup_stew_with_solids', keywords: ['soup', 'stew', 'pho', 'ramen', 'menudo', 'pozole', 'gumbo', 'chowder', 'curry soup', 'tom yum', 'sinigang', 'borscht', 'harira', 'sambar', 'rasam', 'miso soup'] },

  // Fried breads / pastries / fried snacks (high oil) — global. Falafel lives here
  // (deep-fried chickpea balls, ~330 kcal/100g), not with plain legumes.
  { category: 'fried_bread_or_pastry', keywords: ['paratha', 'puri', 'poori', 'bhatura', 'samosa', 'pakora', 'falafel', 'spring roll', 'egg roll', 'churro', 'donut', 'doughnut', 'croissant', 'fried dough', 'youtiao', 'beignet', 'mandazi', 'akara', 'tempura'] },

  // Dumplings / stuffed items — global
  { category: 'dumpling_or_stuffed', keywords: ['momo', 'gyoza', 'dumpling', 'potsticker', 'pierogi', 'ravioli', 'tortellini', 'empanada', 'wonton', 'dim sum', 'bao', 'khinkali', 'manti', 'mandu', 'xiao long bao'] },

  // Dressed / composite salads (dressing, cheese, croutons, protein) run far denser
  // than a plain vegetable salad — checked before the 'salad'→vegetable rule below.
  { category: 'mixed_composite_meal', keywords: ['caesar salad', 'cobb salad', 'pasta salad', 'potato salad', 'chicken salad'] },

  // Tempered / fried / oil-rich grain dishes — global
  { category: 'grain_or_starch_tempered', keywords: ['upma', 'poha', 'khichdi', 'pongal', 'fried rice', 'pulao', 'pilaf', 'biryani', 'jollof', 'paella', 'risotto', 'fried noodle', 'chow mein', 'lo mein', 'pad thai', 'yakisoba', 'bibimbap', 'nasi goreng', 'jambalaya'] },

  // Breads / flatbreads — global
  { category: 'bread_or_flatbread', keywords: ['roti', 'chapati', 'naan', 'tortilla', 'pita', 'injera', 'arepa', 'mantou', 'baguette', 'bread', 'bun', 'toast', 'bagel', 'focaccia', 'lavash'] },

  // Plain cooked grains / starches / steamed rice-cakes — global
  { category: 'grain_or_starch_cooked', keywords: ['vermicelli', 'semiya', 'idli', 'uttapam', 'dosa', 'rice', 'congee', 'jook', 'pasta', 'spaghetti', 'macaroni', 'noodle', 'ramen noodle', 'udon', 'soba', 'oats', 'oatmeal', 'porridge', 'quinoa', 'couscous', 'bulgur', 'polenta', 'grits', 'fufu', 'ugali'] },

  // Legumes / bean dishes — global (plain, non-fried). Fried (falafel) and soupy
  // (sambar, miso soup) legume dishes are handled by the categories above.
  { category: 'legume_cooked', keywords: ['dal', 'daal', 'lentil', 'chickpea', 'chana', 'rajma', 'beans', 'refried beans', 'hummus', 'edamame', 'moong'] },

  // Cheese-heavy (plain cheese blocks). "paneer" deliberately NOT here — it appears
  // mostly inside curries (palak paneer, paneer tikka masala) whose density is far
  // below a cheese block, so it's left to fall through to a dish/composite band.
  { category: 'cheese', keywords: ['cheese', 'halloumi', 'feta', 'mozzarella', 'queso fresco', 'cheddar'] },

  // Nuts / seeds / oils / fats. Bare 'butter' deliberately excluded — in dish names
  // it means the sauce style (butter chicken, paneer butter masala), not a fat block.
  { category: 'nuts_seeds_or_oil', keywords: ['almond', 'cashew', 'walnut', 'peanut butter', 'nut butter', 'olive oil', 'ghee', 'seeds', 'tahini', 'coconut oil'] },

  // Desserts / sweets — global
  { category: 'dessert_or_sweet', keywords: ['cake', 'cookie', 'biscuit', 'candy', 'chocolate', 'ice cream', 'dessert', 'pastry', 'halwa', 'ladoo', 'laddu', 'barfi', 'gulab jamun', 'jalebi', 'kheer', 'mochi', 'baklava', 'flan', 'tiramisu', 'pudding', 'brownie', 'pie'] },

  // Fatty / fried / braised proteins — global
  { category: 'fatty_protein', keywords: ['bacon', 'sausage', 'fried chicken', 'karaage', 'katsu', 'beef', 'pork', 'lamb', 'mutton', 'ribs', 'kebab', 'shawarma', 'gyro', 'carnitas', 'chorizo', 'duck', 'brisket', 'goat'] },

  // Lean proteins — global
  { category: 'lean_protein', keywords: ['chicken breast', 'grilled chicken', 'chicken', 'fish', 'salmon', 'tuna', 'tilapia', 'egg', 'omelet', 'tofu', 'tempeh', 'turkey', 'shrimp', 'prawn', 'sashimi'] },

  // Dairy (plain)
  { category: 'dairy_plain', keywords: ['milk', 'yogurt', 'yoghurt', 'curd', 'kefir', 'buttermilk', 'skyr'] },

  // Vegetables / vegetable dishes — global
  { category: 'vegetable', keywords: ['salad', 'vegetable', 'veggie', 'spinach', 'broccoli', 'cabbage', 'poriyal', 'sabzi', 'bhaji', 'stir fry', 'kimchi', 'greens', 'ratatouille', 'sauteed vegetable'] },

  // Fruits
  { category: 'fruit', keywords: ['apple', 'banana', 'orange', 'mango', 'papaya', 'fruit', 'berries', 'grapes', 'melon', 'pineapple'] },
];

// Precompile each category's keywords into ONE word-boundary regex. Word boundaries
// are essential: naive substring matching produced real bugs (e.g. "steamed" contains
// "tea" → mis-classified steamed rice as a beverage; "goat" contains "oat"). Built once
// at module load.
const CATEGORY_MATCHERS = CATEGORY_KEYWORDS.map(({ category, keywords }) => {
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return { category, regex: new RegExp(`\\b(?:${escaped.join('|')})\\b`, 'i') };
});

function classifyFoodCategory(foodName = '') {
  const name = foodName.toLowerCase();
  for (const { category, regex } of CATEGORY_MATCHERS) {
    if (regex.test(name)) return category;
  }
  return null; // signal: unrecognized → caller uses the wide 'unknown' band (Tier 3)
}

// Flatten STANDARD_FOODS once into name → per-100g density, so a known dish gets a
// much tighter band than any coarse category. In-memory, built lazily, cached.
let standardFoodDensityIndex = null;
function getStandardFoodDensityIndex() {
  if (standardFoodDensityIndex) return standardFoodDensityIndex;
  standardFoodDensityIndex = [];
  for (const group of Object.values(STANDARD_FOODS)) {
    for (const food of Object.values(group)) {
      if (!food.servingGrams || !food.calories) continue;
      standardFoodDensityIndex.push({
        name: food.name.toLowerCase(),
        kcalPer100g: (food.calories / food.servingGrams) * 100,
        reference: food,
      });
    }
  }
  return standardFoodDensityIndex;
}

function findStandardFoodMatch(foodName = '') {
  const name = foodName.toLowerCase().trim();
  if (!name) return null;
  const index = getStandardFoodDensityIndex();
  // Prefer the longest reference name that is a substring of the query (or vice-versa),
  // so "grilled chicken breast" matches "chicken breast" over "chicken ...".
  let best = null;
  for (const f of index) {
    if (name.includes(f.name) || f.name.includes(name)) {
      if (!best || f.name.length > best.name.length) best = f;
    }
  }
  if (!best) return null;
  // Guard against compound dishes matching a single-ingredient reference: "palak paneer"
  // (a spinach-paneer curry, ~150 kcal/100g) must NOT be treated as pure "paneer"
  // (a cheese block, ~265). Only accept the tight known-dish band when the query is
  // essentially the reference itself, not a longer dish that merely contains it.
  const longer = Math.max(name.length, best.name.length);
  const shorter = Math.min(name.length, best.name.length);
  if (shorter / longer < 0.7) return null; // too much extra wording → not the same food
  return best;
}

/**
 * Expected per-100g calorie density for a dish, from its NAME ALONE (no estimate
 * required). This is the calibration lever: injected into the estimation prompt so
 * the model is anchored to a realistic density BEFORE it answers, for every dish —
 * the highest-accuracy, zero-latency intervention (the model produces the number,
 * just better-informed). Returns null for unrecognized foods (no useful anchor →
 * don't inject noise).
 *
 * @param {string} foodName
 * @returns {{ tier: 'known_dish'|'category', category: string, min: number, max: number,
 *             referenceKcalPer100g: number|null, matchedReference: string|null } | null}
 */
export function getExpectedDensityForFood(foodName = '') {
  if (!foodName || typeof foodName !== 'string') return null;
  const standardMatch = findStandardFoodMatch(foodName);
  if (standardMatch) {
    return {
      tier: 'known_dish',
      category: 'known_dish',
      min: Math.round(standardMatch.kcalPer100g * 0.75),
      max: Math.round(standardMatch.kcalPer100g * 1.25),
      referenceKcalPer100g: Math.round(standardMatch.kcalPer100g),
      matchedReference: standardMatch.name,
    };
  }
  const category = classifyFoodCategory(foodName);
  if (category) {
    const band = CATEGORY_DENSITY_BANDS[category];
    return {
      tier: 'category',
      category,
      min: band.min,
      max: band.max,
      referenceKcalPer100g: null,
      matchedReference: null,
    };
  }
  return null; // unrecognized → no confident anchor
}

/**
 * @param {{ foodName?: string, macros?: { calories_kcal?: number }, servingGrams?: number }} estimation
 * @returns {{
 *   plausible: boolean,
 *   tier: 'known_dish' | 'category' | 'unknown' | 'skipped',
 *   category: string | null,
 *   kcalPer100g: number | null,
 *   expectedRange: { min: number, max: number } | null,
 *   matchedReference: string | null,
 *   referenceKcalPer100g: number | null,   // suggestion source for known dishes (not auto-applied)
 *   severity: 'none' | 'moderate' | 'severe',
 * }}
 */
export function checkNutritionPlausibility(estimation) {
  const calories = estimation?.macros?.calories_kcal;
  const foodName = estimation?.foodName || '';

  const skipped = {
    plausible: true, tier: 'skipped', category: null, kcalPer100g: null,
    expectedRange: null, matchedReference: null, referenceKcalPer100g: null, severity: 'none',
  };
  if (typeof calories !== 'number' || calories <= 0) return skipped;

  // Fall back to a 100g assumption when no gram weight was given — matches the "~100g"
  // default the UI already shows for unspecified portions.
  const grams = estimation.servingGrams > 0 ? estimation.servingGrams : 100;
  const kcalPer100g = (calories / grams) * 100;

  let tier, category, expectedRange, matchedReference = null, referenceKcalPer100g = null;

  const standardMatch = findStandardFoodMatch(foodName);
  if (standardMatch) {
    tier = 'known_dish';
    category = 'known_dish';
    expectedRange = { min: standardMatch.kcalPer100g * 0.65, max: standardMatch.kcalPer100g * 1.35 };
    matchedReference = standardMatch.name;
    referenceKcalPer100g = Math.round(standardMatch.kcalPer100g);
  } else {
    const matchedCategory = classifyFoodCategory(foodName);
    if (matchedCategory) {
      tier = 'category';
      category = matchedCategory;
      expectedRange = CATEGORY_DENSITY_BANDS[matchedCategory];
    } else {
      tier = 'unknown';
      category = 'unknown';
      expectedRange = CATEGORY_DENSITY_BANDS.unknown;
    }
  }

  const plausible = kcalPer100g >= expectedRange.min && kcalPer100g <= expectedRange.max;

  // Severity: how far outside the band. >2x past an edge (or <half) = severe.
  let severity = 'none';
  if (!plausible) {
    const belowBy = expectedRange.min > 0 ? expectedRange.min / kcalPer100g : 1;
    const aboveBy = kcalPer100g / expectedRange.max;
    const worst = Math.max(belowBy, aboveBy);
    severity = worst >= 2 ? 'severe' : 'moderate';
    console.warn(
      `[NutritionPlausibility] "${foodName}" ${kcalPer100g.toFixed(0)} kcal/100g outside ` +
      `${expectedRange.min.toFixed(0)}-${expectedRange.max.toFixed(0)} ` +
      `[tier=${tier}${matchedReference ? `, ref=${matchedReference}` : `, cat=${category}`}, severity=${severity}]`
    );
  }

  return {
    plausible,
    tier,
    category,
    kcalPer100g: Math.round(kcalPer100g),
    expectedRange: { min: Math.round(expectedRange.min), max: Math.round(expectedRange.max) },
    matchedReference,
    referenceKcalPer100g,
    severity,
  };
}
