/**
 * useFoodAnalysis.js's calculateTotals() produces the persisted
 * analysisResult.totals after every quantity/removal edit (updateItemQuantity,
 * removeItem, removeIngredient all call it) — the totals that actually get
 * saved, not just displayed. Missing-vs-zero discipline for the optional
 * macro fields (fiber/sugar/sodium) matters here as much as it does in the
 * display-side aggregateNutrition.js.
 */
import { calculateTotals } from '../hooks/useFoodAnalysis';

jest.mock('@clerk/clerk-expo', () => ({ useAuth: () => ({ getToken: jest.fn() }) }));
jest.mock('expo-file-system/legacy', () => ({ readAsStringAsync: jest.fn(), EncodingType: { Base64: 'base64' } }));

describe('calculateTotals — missing-vs-zero for optional macro fields', () => {
  it('nulls a total field when any item never reported it, instead of undercounting silently', () => {
    const items = [
      { macros: { calories_kcal: 200, protein_g: 10, carbs_g: 20, fat_g: 5, fiber_g: 3, sugar_g: 2, sodium_mg: 400 } },
      // fiber_g/sugar_g/sodium_mg genuinely never reported.
      { macros: { calories_kcal: 150, protein_g: 8, carbs_g: 15, fat_g: 4 } },
    ];
    const totals = calculateTotals(items);
    expect(totals.macros.calories_kcal).toBe(350);
    expect(totals.macros.protein_g).toBe(18);
    expect(totals.macros.fiber_g).toBeNull();
    expect(totals.macros.sugar_g).toBeNull();
    expect(totals.macros.sodium_mg).toBeNull();
  });

  it('sums normally when every item explicitly reports the field, including a genuine 0', () => {
    const items = [
      { macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 3, sugar_g: 0, sodium_mg: 200 } },
      { macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 2, sugar_g: 0, sodium_mg: 100 } },
    ];
    const totals = calculateTotals(items);
    expect(totals.macros.fiber_g).toBe(5);
    expect(totals.macros.sugar_g).toBe(0);
    expect(totals.macros.sodium_mg).toBe(300);
  });

  it('sums micros correctly and returns null macros for an empty item list', () => {
    const empty = calculateTotals([]);
    expect(empty.macros.calories_kcal).toBeNull();
    expect(empty.macros.sodium_mg).toBeNull();

    const items = [
      { macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 }, micros: { calcium: { value: 20, unit: 'mg' } } },
      { macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 }, micros: { calcium: { value: 10, unit: 'mg' } } },
    ];
    const totals = calculateTotals(items);
    expect(totals.micros.calcium).toEqual({ value: 30, unit: 'mg' });
  });
});
