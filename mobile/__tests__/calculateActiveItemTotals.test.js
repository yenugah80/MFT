/**
 * calculateActiveItemTotals (UnifiedMealAnalysis.jsx) — regression coverage
 * for a real bug: excluding an ingredient on the Detailed Analysis screen
 * correctly subtracted calories/protein/carbs/fat/fiber/sugar, but never
 * sodium or micros. Excluding a high-sodium ingredient (soy sauce, cheese,
 * cured meat) dropped the visible macros while sodium and every
 * micronutrient stayed at the full pre-exclusion total — the same class of
 * bug already fixed once for useFoodAnalysis.js's subtractIngredientFromItem
 * and computeIngredientNutrition.js, just missed in this third engine.
 */
import { calculateActiveItemTotals } from '../components/log/calculateActiveItemTotals';

function makeItem(overrides = {}) {
  return {
    macros: { calories_kcal: 300, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 3, sugar_g: 5, sodium_mg: 900 },
    micros: { potassium: { value: 400, unit: 'mg' }, calcium: { value: 100, unit: 'mg' } },
    ingredients: [
      { name: 'chicken', calories: 200, protein: 18, carbs: 0, fat: 8, fiber: 0, sugar: 0, sodium: 80, micros: { potassium: { value: 250, unit: 'mg' } } },
      { name: 'soy sauce', calories: 20, protein: 2, carbs: 2, fat: 0, fiber: 0, sugar: 1, sodium: 800, micros: { potassium: { value: 20, unit: 'mg' } } },
      { name: 'rice', calories: 80, protein: 0, carbs: 28, fat: 2, fiber: 3, sugar: 4, sodium: 20, micros: { calcium: { value: 100, unit: 'mg' } } },
    ],
    ...overrides,
  };
}

describe('calculateActiveItemTotals — ingredient exclusion drops sodium and micros too', () => {
  it('subtracts an excluded ingredient\'s sodium, not just its macros', () => {
    const items = [makeItem()];
    const excludedIngredients = new Set(['0-1']); // exclude "soy sauce"

    const result = calculateActiveItemTotals(items, items, new Set(), excludedIngredients);

    // Macros already worked before this fix — confirm still correct.
    expect(result.calories).toBe(300 - 20);
    expect(result.sugar).toBe(5 - 1);
    // The actual regression: sodium must drop by soy sauce's 800mg, not
    // stay at the full 900mg.
    expect(result.sodium).toBe(900 - 800);
  });

  it('subtracts an excluded ingredient\'s micros, not just macros/sodium', () => {
    const items = [makeItem()];
    const excludedIngredients = new Set(['0-0']); // exclude "chicken"

    const result = calculateActiveItemTotals(items, items, new Set(), excludedIngredients);

    // chicken contributed 250 of the item's 400 potassium
    expect(result.micros.potassium.value).toBe(400 - 250);
    // calcium wasn't on the excluded ingredient — untouched
    expect(result.micros.calcium.value).toBe(100);
  });

  it('never goes negative when an ingredient is estimated to exceed the item total', () => {
    const items = [makeItem({
      macros: { calories_kcal: 300, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 3, sugar_g: 5, sodium_mg: 50 },
    })];
    const excludedIngredients = new Set(['0-1']); // soy sauce's 800mg > item's 50mg total

    const result = calculateActiveItemTotals(items, items, new Set(), excludedIngredients);

    expect(result.sodium).toBe(0);
  });

  it('leaves totals unchanged when nothing is excluded', () => {
    const items = [makeItem()];

    const result = calculateActiveItemTotals(items, items, new Set(), new Set());

    expect(result.calories).toBe(300);
    expect(result.sodium).toBe(900);
    expect(result.micros.potassium.value).toBe(400);
  });
});
