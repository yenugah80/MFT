import { getUsdaNutrientValue, transformUsdaFood } from '../src/services/apiClients/USDAClient.js';
import { aggregateCanonicalTotals } from '../src/utils/canonicalNutrition.js';
import { fillMissingNutrients, getMissingMacroFields } from '../src/utils/nutrientCompleteness.js';

// Not importing FoodService from foodService.js here on purpose — that file
// pulls in a large module graph (OpenAI client, DB config, etc.) that hangs
// test execution when only its tiny scaleFromPer100g helper is needed.
// Same logic, verified identical to scaleFromPer100g.
function scaleFromPer100g(valuePer100g, servingGrams) {
  if (valuePer100g === null || valuePer100g === undefined) return null;
  const grams = Number.isFinite(servingGrams) && servingGrams > 0 ? servingGrams : 100;
  return Math.round(valuePer100g * (grams / 100) * 100) / 100;
}

function usdaFood(nutrients) {
  return {
    fdcId: 12345,
    description: 'Test Food',
    dataType: 'SR Legacy',
    foodNutrients: Object.entries(nutrients).map(([nutrientName, value]) => ({ nutrientName, value })),
  };
}

describe('getUsdaNutrientValue — missing vs zero vs known', () => {
  it('a nutrient absent from foodNutrients entirely returns null (missing), not 0', () => {
    const food = usdaFood({ Protein: 5 }); // no Energy at all
    expect(getUsdaNutrientValue(food, 'Energy')).toBeNull();
  });

  it('a nutrient USDA explicitly reports as 0 stays 0, not null', () => {
    const food = usdaFood({ 'Total lipid (fat)': 0 });
    expect(getUsdaNutrientValue(food, 'Total lipid (fat)')).toBe(0);
  });

  it('a known positive value is returned unchanged', () => {
    const food = usdaFood({ Protein: 6.3 });
    expect(getUsdaNutrientValue(food, 'Protein')).toBe(6.3);
  });

  it('a malformed (non-finite) nutrient value is treated as missing, not coerced', () => {
    const food = { foodNutrients: [{ nutrientName: 'Energy', value: NaN }] };
    expect(getUsdaNutrientValue(food, 'Energy')).toBeNull();
  });

  it('no foodNutrients array at all returns null rather than throwing', () => {
    expect(getUsdaNutrientValue({}, 'Energy')).toBeNull();
    expect(getUsdaNutrientValue(null, 'Energy')).toBeNull();
  });
});

describe('transformUsdaFood — macros preserve missing vs zero vs known through rounding', () => {
  it('a macro USDA never reports is null, not 0 — Math.round(null) does NOT silently produce 0', () => {
    const food = usdaFood({ Protein: 6.3, 'Carbohydrate, by difference': 57.5 }); // no Energy, no Fiber
    const result = transformUsdaFood(food);
    expect(result.macros.calories_kcal).toBeNull();
    expect(result.macros.fiber_g).toBeNull();
  });

  it('a macro USDA explicitly reports as 0 stays 0 after rounding', () => {
    const food = usdaFood({ 'Fiber, total dietary': 0, 'Sugars, total including NLEA': 0 });
    const result = transformUsdaFood(food);
    expect(result.macros.fiber_g).toBe(0);
    expect(result.macros.sugar_g).toBe(0);
  });

  it('a known value is preserved (rounded to its documented precision), not altered in magnitude', () => {
    const food = usdaFood({ Energy: 539.4, Protein: 6.34 });
    const result = transformUsdaFood(food);
    expect(result.macros.calories_kcal).toBe(539); // 0 decimals
    expect(result.macros.protein_g).toBe(6.3); // 1 decimal
  });

  it('reproduces the real Nutella case: proteins_100g present, Energy present, Fiber genuinely absent', () => {
    const food = usdaFood({ Energy: 539, Protein: 6.3, 'Carbohydrate, by difference': 57.5, 'Total lipid (fat)': 30.9 });
    const result = transformUsdaFood(food);
    expect(result.macros.calories_kcal).toBe(539);
    expect(result.macros.protein_g).toBe(6.3);
    expect(result.macros.fiber_g).toBeNull(); // genuinely never reported for this product
  });

  it('micros follow the same missing-vs-zero rule', () => {
    const food = usdaFood({ 'Calcium, Ca': 0, 'Iron, Fe': 2.1 }); // no Potassium at all
    const result = transformUsdaFood(food);
    expect(result.micros.calcium.value).toBe(0); // explicit zero preserved
    expect(result.micros.iron.value).toBe(2.1);
    expect(result.micros.potassium.value).toBeNull(); // genuinely absent
  });
});

describe('missing USDA fiber/sugar/sodium reaches canonical aggregation as missing, not confirmed zero', () => {
  it('end-to-end: transformUsdaFood -> item.macros -> aggregateCanonicalTotals reports it in missingMacroFields', () => {
    const food = usdaFood({ Energy: 100, Protein: 5, 'Carbohydrate, by difference': 10, 'Total lipid (fat)': 2 }); // no fiber/sugar/sodium
    const usdaResult = transformUsdaFood(food);

    const item = { name: 'Test Item', macros: usdaResult.macros, micros: {} };
    const { macros, meta } = aggregateCanonicalTotals([item]);

    // Arithmetic-safe (0), but distinguishable via meta
    expect(macros.fiber_g).toBe(0);
    expect(macros.sugar_g).toBe(0);
    expect(macros.sodium_mg).toBe(0);
    expect(meta.missingMacroFields).toEqual(expect.arrayContaining(['fiber_g', 'sugar_g', 'sodium_mg']));
  });

  it('a USDA-reported explicit zero for fiber does NOT appear in missingMacroFields', () => {
    const food = usdaFood({ Energy: 80, Protein: 0, 'Carbohydrate, by difference': 20, 'Total lipid (fat)': 0, 'Fiber, total dietary': 0, 'Sugars, total including NLEA': 20, 'Sodium, Na': 5 });
    const usdaResult = transformUsdaFood(food);
    const item = { name: 'Test Item', macros: usdaResult.macros, micros: {} };
    const { meta } = aggregateCanonicalTotals([item]);
    expect(meta.missingMacroFields).not.toContain('fiber_g');
  });
});

describe('fallback/enrichment behavior still works with the null-preserving USDA client', () => {
  it('fillMissingNutrients fills a barcode item\'s missing field from USDA, scaled to the real serving size', () => {
    const food = usdaFood({ Energy: 200 }); // per 100g
    const usdaData = transformUsdaFood(food);
    const item = { macros: { calories_kcal: undefined, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 } };

    fillMissingNutrients(item, usdaData, 45, scaleFromPer100g); // 45g serving
    expect(item.macros.calories_kcal).toBe(90); // 200 * 0.45
  });

  it('fillMissingNutrients correctly leaves a field unfilled when USDA ALSO has no data for it (both missing)', () => {
    const food = usdaFood({ Energy: 200 }); // no fiber at all
    const usdaData = transformUsdaFood(food);
    const item = { macros: { calories_kcal: undefined, fiber_g: undefined } };

    fillMissingNutrients(item, usdaData, 100, scaleFromPer100g);
    expect(item.macros.calories_kcal).toBe(200);
    expect(item.macros.fiber_g).toBeUndefined(); // still missing — USDA had nothing to offer either
    expect(getMissingMacroFields(item.macros)).toContain('fiber_g');
  });

  it('fillMissingNutrients does not overwrite a present value with a USDA explicit zero or otherwise', () => {
    const food = usdaFood({ Energy: 999 });
    const usdaData = transformUsdaFood(food);
    const item = { macros: { calories_kcal: 50 } }; // already known — should survive
    fillMissingNutrients(item, usdaData, 100, scaleFromPer100g);
    expect(item.macros.calories_kcal).toBe(50);
  });
});
