/**
 * Meal pairing candidates
 *
 * Replaces three hardcoded suggestion strings per category that were shown to
 * every user regardless of what they can eat. The app collects FDA Top 9
 * allergens *with severity* — the schema documents
 * `{ peanuts: "anaphylaxis" }` — and the pairing UI then suggested almonds,
 * eggs and Greek yogurt without consulting any of it.
 *
 * Each candidate declares what it contains rather than relying on name matching.
 * Tagging at the source is exact: "Greek yogurt" is dairy because it is marked
 * dairy, not because a regex found "yogurt" in a string. Name matching belongs
 * on unknown foods (the backend's food knowledge graph does that job well for
 * user-entered meals); it is the wrong tool for a fixed list we control.
 *
 * `allergens` uses the same ids as ALLERGIES in onboardingConfig.
 * `excludedDiets` uses the same ids as DIETARY_PREFERENCES.
 */

/** Nutrient gap a candidate is meant to close. */
export const PAIRING_GOALS = {
  PROTEIN: 'protein',
  FIBER: 'fiber',
  HYDRATION: 'hydration',
};

export const PAIRING_CANDIDATES = [
  // ─── Protein ───────────────────────────────────────────────────────────────
  {
    id: 'greek_yogurt',
    name: 'Greek yogurt',
    goal: PAIRING_GOALS.PROTEIN,
    protein: 15, calories: 100, fiber: 0,
    allergens: ['dairy'],
    excludedDiets: ['vegan'],
    cuisines: ['mediterranean', 'american'],
  },
  {
    id: 'boiled_egg',
    name: 'Hard-boiled egg',
    goal: PAIRING_GOALS.PROTEIN,
    protein: 6, calories: 78, fiber: 0,
    allergens: ['eggs'],
    excludedDiets: ['vegan'],
    cuisines: ['american', 'mediterranean', 'asian'],
  },
  {
    id: 'almonds',
    name: 'Handful of almonds',
    goal: PAIRING_GOALS.PROTEIN,
    protein: 6, calories: 164, fiber: 3,
    allergens: ['nuts', 'tree_nuts', 'almonds'],
    excludedDiets: [],
    cuisines: ['mediterranean', 'american', 'indian'],
  },
  {
    id: 'paneer',
    name: 'Grilled paneer',
    goal: PAIRING_GOALS.PROTEIN,
    protein: 14, calories: 160, fiber: 0,
    allergens: ['dairy'],
    excludedDiets: ['vegan'],
    cuisines: ['indian'],
  },
  {
    id: 'dal',
    name: 'Side of dal',
    goal: PAIRING_GOALS.PROTEIN,
    protein: 9, calories: 120, fiber: 4,
    allergens: [],
    excludedDiets: ['keto'],
    cuisines: ['indian'],
  },
  {
    id: 'chickpeas',
    name: 'Roasted chickpeas',
    goal: PAIRING_GOALS.PROTEIN,
    protein: 7, calories: 120, fiber: 5,
    allergens: [],
    excludedDiets: ['keto'],
    cuisines: ['mediterranean', 'indian', 'middle_eastern'],
  },
  {
    id: 'grilled_chicken',
    name: '3oz grilled chicken',
    goal: PAIRING_GOALS.PROTEIN,
    protein: 25, calories: 140, fiber: 0,
    allergens: [],
    excludedDiets: ['vegan', 'vegetarian'],
    cuisines: ['american', 'mediterranean', 'asian', 'indian'],
  },
  {
    id: 'tofu',
    name: 'Pan-fried tofu',
    goal: PAIRING_GOALS.PROTEIN,
    protein: 10, calories: 110, fiber: 1,
    allergens: ['soy'],
    excludedDiets: [],
    cuisines: ['asian'],
  },
  {
    id: 'edamame',
    name: 'Steamed edamame',
    goal: PAIRING_GOALS.PROTEIN,
    protein: 11, calories: 120, fiber: 5,
    allergens: ['soy'],
    excludedDiets: ['keto'],
    cuisines: ['asian'],
  },

  // ─── Fiber ─────────────────────────────────────────────────────────────────
  {
    id: 'side_salad',
    name: 'Side salad',
    goal: PAIRING_GOALS.FIBER,
    protein: 1, calories: 25, fiber: 3,
    allergens: [],
    excludedDiets: [],
    cuisines: ['mediterranean', 'american'],
  },
  {
    id: 'apple',
    name: 'Apple',
    goal: PAIRING_GOALS.FIBER,
    protein: 0, calories: 95, fiber: 4,
    allergens: [],
    excludedDiets: ['keto'],
    cuisines: ['american', 'mediterranean', 'indian', 'asian'],
  },
  {
    id: 'raw_carrots',
    name: 'Raw carrots',
    goal: PAIRING_GOALS.FIBER,
    protein: 1, calories: 35, fiber: 3,
    allergens: [],
    excludedDiets: [],
    cuisines: ['american', 'mediterranean', 'indian', 'asian'],
  },
  {
    id: 'cucumber_raita',
    name: 'Cucumber raita',
    goal: PAIRING_GOALS.FIBER,
    protein: 3, calories: 60, fiber: 2,
    allergens: ['dairy'],
    excludedDiets: ['vegan'],
    cuisines: ['indian'],
  },
  {
    id: 'sauteed_greens',
    name: 'Sautéed greens',
    goal: PAIRING_GOALS.FIBER,
    protein: 2, calories: 45, fiber: 4,
    allergens: [],
    excludedDiets: [],
    cuisines: ['indian', 'asian', 'mediterranean', 'american'],
  },
  {
    id: 'berries',
    name: 'Handful of berries',
    goal: PAIRING_GOALS.FIBER,
    protein: 1, calories: 50, fiber: 4,
    allergens: [],
    excludedDiets: [],
    cuisines: ['american', 'mediterranean'],
  },

  // ─── Hydration ─────────────────────────────────────────────────────────────
  {
    id: 'water',
    name: 'Glass of water',
    goal: PAIRING_GOALS.HYDRATION,
    protein: 0, calories: 0, fiber: 0,
    benefit: 'Aids digestion',
    allergens: [],
    excludedDiets: [],
    cuisines: [],
  },
  {
    id: 'herbal_tea',
    name: 'Herbal tea',
    goal: PAIRING_GOALS.HYDRATION,
    protein: 0, calories: 2, fiber: 0,
    benefit: 'Antioxidants',
    allergens: [],
    excludedDiets: [],
    cuisines: [],
  },
  {
    id: 'sparkling_water',
    name: 'Sparkling water',
    goal: PAIRING_GOALS.HYDRATION,
    protein: 0, calories: 0, fiber: 0,
    benefit: 'Refreshing',
    allergens: [],
    excludedDiets: [],
    cuisines: [],
  },
  {
    id: 'buttermilk',
    name: 'Chaas (buttermilk)',
    goal: PAIRING_GOALS.HYDRATION,
    protein: 2, calories: 40, fiber: 0,
    benefit: 'Cooling, aids digestion',
    allergens: ['dairy'],
    excludedDiets: ['vegan'],
    cuisines: ['indian'],
  },
];

export default PAIRING_CANDIDATES;
