import { checkNutritionPlausibility, SKIPPED_PLAUSIBILITY_RESULT } from '../src/services/nutritionPlausibilityChecker.js';

describe('checkNutritionPlausibility — SKIPPED_PLAUSIBILITY_RESULT shared shape', () => {
  it('is returned as-is when there is nothing to check (no/zero calories)', () => {
    expect(checkNutritionPlausibility({ foodName: 'Anything', macros: { calories_kcal: 0 } }))
      .toEqual(SKIPPED_PLAUSIBILITY_RESULT);
    expect(checkNutritionPlausibility({ foodName: 'Anything' })).toEqual(SKIPPED_PLAUSIBILITY_RESULT);
  });

  it('is a stable, reusable shape callers can use to explicitly skip the check', () => {
    // food.js's multi-item branches use this directly instead of calling
    // checkNutritionPlausibility with a meal total that isn't comparable to
    // a single dish's density band.
    expect(SKIPPED_PLAUSIBILITY_RESULT).toEqual({
      plausible: true, tier: 'skipped', category: null, kcalPer100g: null,
      expectedRange: null, matchedReference: null, referenceKcalPer100g: null, severity: 'none',
    });
  });

  it('still evaluates normally for a real single-item calorie value', () => {
    const result = checkNutritionPlausibility({
      foodName: 'grilled chicken',
      macros: { calories_kcal: 165 },
      servingGrams: 85,
    });
    expect(result.tier).not.toBe('skipped');
    expect(result.plausible).toBe(true);
  });
});
