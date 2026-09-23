import {
  getMissingMacroFields,
  isNutrientsComplete,
  getMissingMicroKeys,
  isMicrosComplete,
  fillMissingNutrients,
  mergeMissingMicros,
  KEY_MICRONUTRIENTS,
} from '../src/utils/nutrientCompleteness.js';

describe('macro field-awareness', () => {
  it('a fully-populated macros object is complete', () => {
    const macros = { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 };
    expect(isNutrientsComplete(macros)).toBe(true);
    expect(getMissingMacroFields(macros)).toEqual([]);
  });

  it('a missing field (e.g. fiber never reported) is flagged missing and enrichment-eligible', () => {
    const macros = { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, sugar_g: 1, sodium_mg: 50 };
    expect(isNutrientsComplete(macros)).toBe(false);
    expect(getMissingMacroFields(macros)).toEqual(['fiber_g']);
  });

  it('a real 0 (e.g. 0g fat for black coffee) is NOT flagged missing', () => {
    const macros = { calories_kcal: 5, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 5 };
    expect(isNutrientsComplete(macros)).toBe(true);
    expect(getMissingMacroFields(macros)).toEqual([]);
  });
});

describe('micro field-awareness', () => {
  it('all 11 key micros present (any value, including 0) counts as complete', () => {
    const micros = Object.fromEntries(KEY_MICRONUTRIENTS.map((k) => [k, 0]));
    expect(isMicrosComplete(micros)).toBe(true);
    expect(getMissingMicroKeys(micros)).toEqual([]);
  });

  it('previously this would have said incomplete (coarse "3 non-zero" rule) even though every field is actually known', () => {
    // All key micros reported, all legitimately 0 — old rule required >=3
    // non-zero and would call this "incomplete", triggering unnecessary
    // (and unsafe) enrichment overwrite risk.
    const micros = Object.fromEntries(KEY_MICRONUTRIENTS.map((k) => [k, 0]));
    expect(isMicrosComplete(micros)).toBe(true);
  });

  it('a genuinely absent nutrient is flagged missing', () => {
    const micros = { calcium: 100, iron: 2 }; // rest absent
    const missing = getMissingMicroKeys(micros);
    expect(missing).toContain('sodium');
    expect(missing).toContain('vitaminA');
    expect(missing).not.toContain('calcium');
  });

  it('partial coverage: some items report a nutrient, others do not — this function reports per-set, caller aggregates across items', () => {
    const missingFromEmpty = getMissingMicroKeys({});
    expect(missingFromEmpty).toEqual(KEY_MICRONUTRIENTS);
  });
});

describe('mergeMissingMicros — enrichment never overwrites a present value', () => {
  it('fills a genuinely missing micronutrient', () => {
    const result = mergeMissingMicros({ calcium: 100 }, { iron: 5 });
    expect(result.calcium).toBe(100);
    expect(result.iron).toBe(5);
  });

  it('does NOT overwrite a real, confirmed zero', () => {
    const result = mergeMissingMicros({ sodium: 0 }, { sodium: 999 });
    expect(result.sodium).toBe(0); // the real reading survives
  });

  it('does not overwrite any present value, high- or low-confidence alike', () => {
    const result = mergeMissingMicros({ calcium: 50 }, { calcium: 500 });
    expect(result.calcium).toBe(50);
  });

  it('handles a null/undefined existing object', () => {
    const result = mergeMissingMicros(null, { calcium: 100 });
    expect(result.calcium).toBe(100);
  });
});

describe('fillMissingNutrients — USDA per-100g scaling', () => {
  const scaleFromPer100g = (value, grams) => {
    if (value === null || value === undefined) return null;
    return Math.round(value * (grams / 100) * 100) / 100;
  };

  it('scales a per-100g USDA value to the item\'s actual serving size before filling', () => {
    const item = { macros: { calories_kcal: undefined, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 } };
    const usdaData = { macros: { calories_kcal: 200 } }; // per 100g
    fillMissingNutrients(item, usdaData, 45, scaleFromPer100g); // 45g serving
    expect(item.macros.calories_kcal).toBe(90); // 200 * 0.45
  });

  it('defaults to unscaled (100g basis) when serving grams is unknown', () => {
    const item = { macros: { calories_kcal: undefined } };
    const usdaData = { macros: { calories_kcal: 150 } };
    fillMissingNutrients(item, usdaData, undefined, scaleFromPer100g);
    expect(item.macros.calories_kcal).toBe(150);
  });

  it('does not overwrite a present value even if it is 0', () => {
    const item = { macros: { calories_kcal: 0 } };
    const usdaData = { macros: { calories_kcal: 999 } };
    fillMissingNutrients(item, usdaData, 100, scaleFromPer100g);
    expect(item.macros.calories_kcal).toBe(0);
  });

  it('only fills fields USDA actually has data for', () => {
    const item = { macros: { calories_kcal: undefined, protein_g: undefined } };
    const usdaData = { macros: { calories_kcal: 100 } }; // no protein_g
    fillMissingNutrients(item, usdaData, 100, scaleFromPer100g);
    expect(item.macros.calories_kcal).toBe(100);
    expect(item.macros.protein_g).toBeUndefined();
  });
});
