import { buildFoodItem } from '../src/utils/unifiedResponseBuilder.js';

// Regression coverage for: estimateNutritionForText's prompt never asked for
// fiber/sugar/sodium, so every AI-estimated item silently reported 0 for
// them — indistinguishable from "measured, and it's genuinely zero." The
// fix (a) updates the prompt to actually request these fields, and (b)
// makes buildFoodItem preserve null (not 0) for whichever fields the
// source truly never reported under any known name, so review, saving, and
// meal totals can all tell "unknown" apart from "confirmed zero."

describe('buildFoodItem — missing macro fields stay null, not a misleading 0', () => {
  it('a source that never reports fiber/sugar/sodium (the historical AI-estimate gap) produces null for those fields, not 0', () => {
    const item = buildFoodItem({
      name: 'Mystery Snack',
      quantity: 1,
      nutritionIsPerUnit: false,
      nutrition: { calories: 200, protein: 5, carbs: 20, fat: 8 }, // no fiber/sugar/sodium at all
    });
    expect(item.macros.calories_kcal).toBe(200);
    expect(item.macros.protein_g).toBe(5);
    expect(item.macros.fiber_g).toBeNull();
    expect(item.macros.sugar_g).toBeNull();
    expect(item.macros.sodium_mg).toBeNull();
  });

  it('a source that explicitly reports 0 fiber keeps it as a real 0, not null', () => {
    const item = buildFoodItem({
      name: 'Black Coffee',
      quantity: 1,
      nutritionIsPerUnit: false,
      nutrition: { calories: 2, protein: 0.3, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 5 },
    });
    expect(item.macros.fiber_g).toBe(0);
    expect(item.macros.sugar_g).toBe(0);
    expect(item.macros.sodium_mg).toBe(5);
  });

  it('recognizes the field under any known alias, not just the canonical name', () => {
    const item = buildFoodItem({
      name: 'Rice',
      quantity: 1,
      nutritionIsPerUnit: false,
      macros: { calories_kcal: 200, protein_g: 4, carbs_g: 45, fat_g: 0.4, fiber_g: 0.6 }, // sugar/sodium absent under any alias
    });
    expect(item.macros.fiber_g).toBe(0.6);
    expect(item.macros.sugar_g).toBeNull();
    expect(item.macros.sodium_mg).toBeNull();
  });

  it('a fully-specified item (every field present) has no null macros at all', () => {
    const item = buildFoodItem({
      name: 'Banana',
      quantity: 1,
      nutritionIsPerUnit: false,
      nutrition: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1 },
    });
    for (const value of Object.values(item.macros)) {
      expect(value).not.toBeNull();
    }
  });
});
