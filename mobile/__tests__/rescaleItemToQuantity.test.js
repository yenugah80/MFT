/**
 * Coverage for Stage 8e's generic Edit Quantity feature: rescaleItemToQuantity
 * (the pure core of useFoodAnalysis.js's updateItemQuantity) recomputes an
 * item's macros, micros, AND each sub-ingredient's own macros proportionally
 * from a gram-weight ratio, and marks the portion as no longer estimated.
 */
import { rescaleItemToQuantity } from '../hooks/useFoodAnalysis';

jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ getToken: jest.fn() }) }));
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn(), EncodingType: { Base64: 'base64' } }));

describe('rescaleItemToQuantity', () => {
  const baseItem = {
    itemId: 'item-1',
    name: 'Roti',
    portion: { amount: 2, unit: 'piece', gramsEquivalent: 80, isEstimated: true },
    macros: {
      calories_kcal: 160,
      protein_g: 6,
      carbs_g: 30,
      fat_g: 2,
      fiber_g: 4,
      sugar_g: 1,
      sodium_mg: 200,
    },
    micros: {
      calcium: { value: 20, unit: 'mg' },
      iron: { value: 1, unit: 'mg' },
    },
    ingredients: [
      { name: 'Wheat flour', calories: 140, protein: 5, carbs: 28, fat: 1, fiber: 3.5, sugar: 0.5 },
      { name: 'Oil', calories: 20, protein: 0, carbs: 0, fat: 2, fiber: 0, sugar: 0 },
    ],
  };

  it('scales macros proportionally to the new gram weight (2 rotis -> 4 rotis, 2x)', () => {
    const result = rescaleItemToQuantity(baseItem, 4, 'piece');
    expect(result.macros.calories_kcal).toBe(320);
    expect(result.macros.protein_g).toBe(12);
    expect(result.macros.sodium_mg).toBe(400);
  });

  it('scales micros proportionally', () => {
    const result = rescaleItemToQuantity(baseItem, 4, 'piece');
    expect(result.micros.calcium).toEqual({ value: 40, unit: 'mg' });
    expect(result.micros.iron).toEqual({ value: 2, unit: 'mg' });
  });

  it('scales each sub-ingredient\'s own macros by the same factor', () => {
    const result = rescaleItemToQuantity(baseItem, 4, 'piece');
    expect(result.ingredients[0]).toMatchObject({ name: 'Wheat flour', calories: 280, protein: 10, carbs: 56, fat: 2, fiber: 7, sugar: 1 });
    expect(result.ingredients[1]).toMatchObject({ name: 'Oil', calories: 40, fat: 4 });
  });

  it('updates the portion object and marks isEstimated false — the user just confirmed a real quantity', () => {
    const result = rescaleItemToQuantity(baseItem, 4, 'piece');
    expect(result.portion).toMatchObject({ amount: 4, unit: 'piece', gramsEquivalent: 160, isEstimated: false });
    expect(result.editedPortion).toEqual({ amount: 4, unit: 'piece' });
  });

  it('scales down correctly (2 rotis -> 1 roti, 0.5x)', () => {
    const result = rescaleItemToQuantity(baseItem, 1, 'piece');
    expect(result.macros.calories_kcal).toBe(80);
    expect(result.ingredients[0].calories).toBe(70);
  });

  it('returns the item unchanged when the original portion has no gramsEquivalent', () => {
    const item = { ...baseItem, portion: { amount: 2, unit: 'piece' } };
    const result = rescaleItemToQuantity(item, 4, 'piece');
    expect(result).toBe(item);
  });

  it('returns the item unchanged when the new unit cannot be converted to grams and does not match the current unit', () => {
    const result = rescaleItemToQuantity(baseItem, 4, 'not-a-real-unit');
    expect(result).toBe(baseItem);
  });

  it('handles a countable-food unit unknown to convertToGrams (e.g. "piece") via same-unit proportional scaling', () => {
    // "piece" isn't in convertToGrams's generic weight/volume table at all —
    // this is exactly QuantityAdjuster's countable-food case (roti/idli/
    // egg), where there's no fixed gram weight for the unit itself, only
    // this specific item's own current amount->grams ratio (2 piece = 80g,
    // so 1 piece = 40g).
    const result = rescaleItemToQuantity(baseItem, 4, 'piece');
    expect(result.macros.calories_kcal).toBe(320);
    expect(result.portion).toMatchObject({ amount: 4, unit: 'piece', gramsEquivalent: 160, isEstimated: false });
  });

  it('prefers the item\'s own resolved gram weight over the generic unit table when the unit is unchanged (fake-precision regression)', () => {
    // Real bug this test guards against: "serving" IS in convertToGrams's
    // generic table (assumed 100g), but a specific resolved food is almost
    // never actually 100g/serving — a chicken curry might really be 350g.
    // Editing "1 serving" -> "2 servings" must scale from THIS item's own
    // resolved 350g, not silently substitute the generic 100g assumption
    // just because "serving" happens to be a recognized unit string.
    const curry = {
      itemId: 'curry-1',
      name: 'Chicken curry',
      portion: { amount: 1, unit: 'serving', gramsEquivalent: 350, isEstimated: true },
      macros: { calories_kcal: 400, protein_g: 30, carbs_g: 10, fat_g: 25, fiber_g: 2, sugar_g: 3, sodium_mg: 600 },
      micros: {},
      ingredients: [],
    };
    const result = rescaleItemToQuantity(curry, 2, 'serving');
    // Correct (350g/serving * 2 = 700g, 2x scale): 800 kcal.
    // The old bug would have used generic 100g/serving (200g total,
    // 0.57x scale relative to the real 350g) and produced ~229 kcal instead.
    expect(result.macros.calories_kcal).toBe(800);
    expect(result.portion.gramsEquivalent).toBe(700);
  });

  it('falls back to the generic unit table only for a genuine unit change convertToGrams recognizes', () => {
    // "cup" differs from the item's current "piece" unit, and isn't
    // derivable from this item's own ratio — the generic table (240g/cup)
    // is the only information available, so using it here is correct
    // (unlike the same-unit case above, where a food-specific ratio
    // already exists and must be preferred).
    const result = rescaleItemToQuantity(baseItem, 1, 'cup');
    expect(result.portion.gramsEquivalent).toBe(240);
  });

  it('declines to scale when switching to a genuinely unrecognized, different unit', () => {
    // The same-unit proportional fallback only applies when the unit is
    // unchanged from the item's current one — a real unit *change* to
    // something convertToGrams doesn't know (e.g. "bowl") can't be safely
    // inferred, so this must decline rather than silently guess.
    const result = rescaleItemToQuantity(baseItem, 1, 'bowl');
    expect(result).toBe(baseItem);
  });

  it('handles an item with no ingredients gracefully', () => {
    const item = { ...baseItem, ingredients: undefined };
    const result = rescaleItemToQuantity(item, 4, 'piece');
    expect(result.ingredients).toEqual([]);
  });
});
