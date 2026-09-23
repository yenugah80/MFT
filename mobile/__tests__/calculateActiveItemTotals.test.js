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

describe('calculateActiveItemTotals — adjustedItems (per-item, not just aggregate)', () => {
  // Regression coverage for a second bug found alongside the sodium/micros
  // one: even with the aggregate correct, the REVIEW SCREEN's own
  // onItemsChange callback was passing the raw, unadjusted `activeItems`
  // up to the parent — each item's own .macros still held its ORIGINAL,
  // pre-exclusion values. saveMealItems (log.js) persists one record PER
  // ITEM, reading each item's .macros directly — so an excluded ingredient
  // changed what the review screen displayed but not what got saved.
  // adjustedItems is what closes that: the same per-item subtraction this
  // function already does for the aggregate, exposed per item too.
  it('returns adjustedItems with each item\'s own macros reflecting its ingredient exclusions', () => {
    const items = [makeItem()];
    const excludedIngredients = new Set(['0-1']); // exclude "soy sauce" (20 cal, 800mg sodium)

    const result = calculateActiveItemTotals(items, items, new Set(), excludedIngredients);

    expect(result.adjustedItems).toHaveLength(1);
    const adjusted = result.adjustedItems[0];
    expect(adjusted.macros.calories_kcal).toBe(300 - 20);
    expect(adjusted.macros.sodium_mg).toBe(900 - 800);
    // Sum of adjustedItems' own macros must equal the aggregate — this is
    // the actual invariant the save path depends on (N per-item records,
    // summed by the backend/dashboard, must equal what the review screen
    // showed as the meal total).
    expect(adjusted.macros.calories_kcal).toBe(result.calories);
  });

  it('adjustedItems drops the excluded ingredient from that item\'s own ingredients list', () => {
    const items = [makeItem()];
    const excludedIngredients = new Set(['0-1']); // exclude "soy sauce"

    const result = calculateActiveItemTotals(items, items, new Set(), excludedIngredients);

    const adjusted = result.adjustedItems[0];
    expect(adjusted.ingredients.map((i) => i.name)).toEqual(['chicken', 'rice']);
  });

  it('with multiple items, only the item with an excluded ingredient is changed in adjustedItems', () => {
    const items = [makeItem(), makeItem({ macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 }, ingredients: [] })];
    const excludedIngredients = new Set(['0-1']); // exclude "soy sauce" on item 0 only

    const result = calculateActiveItemTotals(items, items, new Set(), excludedIngredients);

    expect(result.adjustedItems[0].macros.calories_kcal).toBe(300 - 20);
    expect(result.adjustedItems[1].macros.calories_kcal).toBe(100); // untouched
  });

  it('with no exclusions at all, adjustedItems still mirrors the original macros exactly', () => {
    const items = [makeItem()];

    const result = calculateActiveItemTotals(items, items, new Set(), new Set());

    expect(result.adjustedItems[0].macros.calories_kcal).toBe(300);
    expect(result.adjustedItems[0].ingredients).toHaveLength(3);
  });
});
