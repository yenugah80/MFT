import {
  aggregateCanonicalTotals,
  normalizeMicros,
  checkMicroPlausibility,
  parseStrictNumber,
  parseNumberWithUnit,
  convertUnit,
  computeConfidenceTier,
  MICRO_UNITS,
  MACRO_FIELDS,
} from '../src/utils/canonicalNutrition.js';

describe('parseStrictNumber — strict numeric parsing', () => {
  it('parses a plain integer', () => {
    expect(parseStrictNumber('12')).toBe(12);
  });

  it('parses a decimal', () => {
    expect(parseStrictNumber('3.5')).toBe(3.5);
  });

  it('parses a negative numeric string without corrupting the sign', () => {
    expect(parseStrictNumber('-5.2')).toBe(-5.2);
  });

  it('parses a leading-plus-sign number', () => {
    expect(parseStrictNumber('+5')).toBe(5);
  });

  it('parses scientific notation', () => {
    expect(parseStrictNumber('1.2e3')).toBe(1200);
    expect(parseStrictNumber('2E-2')).toBe(0.02);
  });

  it('parses a leading-dot decimal', () => {
    expect(parseStrictNumber('.5')).toBe(0.5);
  });

  it('rejects a malformed string instead of truncating it to a different number', () => {
    // A naive `.replace(/[^0-9.]/g, '')` approach would turn "12-3" into
    // "123" or "12.3" — silently producing a DIFFERENT valid-looking number
    // rather than admitting the input was malformed.
    expect(parseStrictNumber('12-3')).toBeNull();
    expect(parseStrictNumber('1..2')).toBeNull();
    expect(parseStrictNumber('abc')).toBeNull();
    expect(parseStrictNumber('12abc34')).toBeNull();
  });

  it('rejects non-finite values', () => {
    expect(parseStrictNumber(NaN)).toBeNull();
    expect(parseStrictNumber(Infinity)).toBeNull();
    expect(parseStrictNumber('Infinity')).toBeNull();
  });

  it('rejects null/undefined/objects', () => {
    expect(parseStrictNumber(null)).toBeNull();
    expect(parseStrictNumber(undefined)).toBeNull();
    expect(parseStrictNumber({})).toBeNull();
  });

  it('passes through an already-finite number unchanged', () => {
    expect(parseStrictNumber(42)).toBe(42);
    expect(parseStrictNumber(-3.14)).toBe(-3.14);
  });
});

describe('parseNumberWithUnit', () => {
  it('splits a value+unit string', () => {
    expect(parseNumberWithUnit('12mg')).toEqual({ value: 12, unit: 'mg' });
    expect(parseNumberWithUnit('-5.2 g')).toEqual({ value: -5.2, unit: 'g' });
    expect(parseNumberWithUnit('300µg')).toEqual({ value: 300, unit: 'µg' });
  });

  it('handles scientific notation with a unit suffix', () => {
    expect(parseNumberWithUnit('1.2e3mcg')).toEqual({ value: 1200, unit: 'mcg' });
  });

  it('returns a null unit when no unit suffix is present', () => {
    expect(parseNumberWithUnit('45')).toEqual({ value: 45, unit: null });
  });

  it('rejects a malformed numeric prefix rather than guessing', () => {
    expect(parseNumberWithUnit('12-3mg')).toBeNull();
    expect(parseNumberWithUnit('mg12')).toBeNull();
  });
});

describe('convertUnit — deterministic conversions only', () => {
  it('converts mg to µg', () => {
    expect(convertUnit(1, 'mg', 'µg')).toBe(1000);
  });

  it('converts µg to mg', () => {
    expect(convertUnit(1000, 'µg', 'mg')).toBe(1);
  });

  it('returns the same value when units already match', () => {
    expect(convertUnit(5, 'mg', 'mg')).toBe(5);
  });

  it('refuses an unsupported conversion pair rather than guessing', () => {
    expect(convertUnit(5, 'IU', 'µg')).toBeNull();
    expect(convertUnit(5, 'g', 'mg')).toBeNull();
    expect(convertUnit(5, 'mg', 'IU')).toBeNull();
  });

  it('returns null for a non-finite input value', () => {
    expect(convertUnit(NaN, 'mg', 'µg')).toBeNull();
  });
});

describe('normalizeMicros — unit resolution', () => {
  it('tags a bare AI-estimated number with its canonical unit', () => {
    const result = normalizeMicros({ vitaminA: 500, calcium: 200 });
    expect(result.vitaminA).toEqual({ value: 500, unit: 'µg' });
    expect(result.calcium).toEqual({ value: 200, unit: 'mg' });
  });

  it('gives every unit-ambiguous vitamin its canonical (not mg-default) unit', () => {
    const result = normalizeMicros({ vitaminA: 1, vitaminD: 1, vitaminB12: 1, folate: 1 });
    expect(result.vitaminA.unit).toBe('µg');
    expect(result.vitaminD.unit).toBe('µg');
    expect(result.vitaminB12.unit).toBe('µg');
    expect(result.folate.unit).toBe('µg');
  });

  it('preserves an already-tagged source unit instead of overriding it', () => {
    const result = normalizeMicros({ sodium: { value: 300, unit: 'mg' } });
    expect(result.sodium).toEqual({ value: 300, unit: 'mg' });
  });

  it('parses a numeric string with a unit suffix', () => {
    const result = normalizeMicros({ iron: '3.5mg' });
    expect(result.iron).toEqual({ value: 3.5, unit: 'mg' });
  });

  it('an UNKNOWN micronutrient with no source unit stays unit: null — never defaults to mg', () => {
    const result = normalizeMicros({ someExoticCompound: 42 });
    expect(result.someExoticCompound).toEqual({ value: 42, unit: null });
  });

  it('an unknown micronutrient WITH a source-provided unit preserves that unit', () => {
    const result = normalizeMicros({ someExoticCompound: { value: 42, unit: 'ng' } });
    expect(result.someExoticCompound).toEqual({ value: 42, unit: 'ng' });
  });

  it('drops a field with no value at all rather than defaulting to 0', () => {
    const result = normalizeMicros({ zinc: null, potassium: undefined });
    expect(result.zinc).toBeUndefined();
    expect(result.potassium).toBeUndefined();
  });

  it('drops a MALFORMED value and reports it via onInvalid, distinct from a missing one', () => {
    const invalid = [];
    const result = normalizeMicros({ calcium: 'not-a-number', iron: 5 }, { onInvalid: (f) => invalid.push(f) });
    expect(result.calcium).toBeUndefined();
    expect(result.iron).toEqual({ value: 5, unit: 'mg' });
    expect(invalid).toHaveLength(1);
    expect(invalid[0].key).toBe('calcium');
  });

  it('a legitimate zero is preserved, not treated as missing or invalid', () => {
    const invalid = [];
    const result = normalizeMicros({ sodium: 0 }, { onInvalid: (f) => invalid.push(f) });
    expect(result.sodium).toEqual({ value: 0, unit: 'mg' });
    expect(invalid).toHaveLength(0);
  });

  it('returns an empty object for missing/non-object input', () => {
    expect(normalizeMicros(null)).toEqual({});
    expect(normalizeMicros(undefined)).toEqual({});
  });
});

describe('normalizeMicros — key canonicalization (photo/AI-vision snake_case → canonical camelCase)', () => {
  it('folds snake_case keys from the vision path into the canonical camelCase key', () => {
    const result = normalizeMicros({ vitamin_a: 300, vitamin_b12: 2.4, vitamin_d: 5 });
    expect(result.vitaminA).toEqual({ value: 300, unit: 'µg' });
    expect(result.vitaminB12).toEqual({ value: 2.4, unit: 'µg' });
    expect(result.vitaminD).toEqual({ value: 5, unit: 'µg' });
    expect(result.vitamin_a).toBeUndefined();
    expect(result.vitamin_b12).toBeUndefined();
  });

  it('folds kebab-case and title-case-with-spaces variants the same way', () => {
    const result = normalizeMicros({ 'vitamin-c': 45, 'Vitamin A': 200 });
    expect(result.vitaminC).toEqual({ value: 45, unit: 'mg' });
    expect(result.vitaminA).toEqual({ value: 200, unit: 'µg' });
  });

  it('single-word nutrients are unaffected by canonicalization (already match)', () => {
    const result = normalizeMicros({ calcium: 100, iron: 2 });
    expect(result.calcium).toEqual({ value: 100, unit: 'mg' });
    expect(result.iron).toEqual({ value: 2, unit: 'mg' });
  });

  it('preserves an unrecognized nutrient under its original key rather than mapping it away', () => {
    const result = normalizeMicros({ some_exotic_compound: 42 });
    expect(result.some_exotic_compound).toEqual({ value: 42, unit: null });
    expect(Object.keys(result)).not.toContain('someExoticCompound');
  });

  it('a canonicalized key still gets its plausibility ceiling checked', () => {
    const flags = [];
    normalizeMicros({ vitamin_b12: 5000 }, { onImplausible: (f) => flags.push(f) });
    expect(flags).toHaveLength(1);
  });
});

describe('aggregateCanonicalTotals — canonicalized micro keys survive aggregation', () => {
  it('snake_case micros from a photo-mode item sum correctly under the canonical key across a multi-item meal', () => {
    const items = [
      { macros: { calories_kcal: 100 }, micros: normalizeMicros({ vitamin_a: 100, calcium: 50 }) },
      { macros: { calories_kcal: 100 }, micros: normalizeMicros({ vitaminA: 50, calcium: 25 }) },
    ];
    const totals = aggregateCanonicalTotals(items);
    // Both items' vitamin A contribution lands under the SAME canonical key
    // instead of splitting into vitamin_a (100) and vitaminA (50).
    expect(totals.micros.vitaminA).toEqual({ value: 150, unit: 'µg' });
    expect(totals.micros.calcium).toEqual({ value: 75, unit: 'mg' });
    expect(totals.meta.conflictedMicros).toHaveLength(0);
  });
});

describe('aggregateCanonicalTotals — macros: missing vs zero vs malformed', () => {
  it('sums all 7 macro fields across a single item', () => {
    const items = [{
      macros: { calories_kcal: 205, protein_g: 4, carbs_g: 45, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: 2 },
      micros: {},
    }];
    const { macros } = aggregateCanonicalTotals(items);
    expect(macros).toEqual({ calories_kcal: 205, protein_g: 4, carbs_g: 45, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: 2 });
  });

  it('sums fiber/sugar/sodium correctly across a multi-item meal (the rice+dal regression case)', () => {
    const items = [
      { macros: { calories_kcal: 205, protein_g: 4, carbs_g: 45, fat_g: 0, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: 2 }, micros: {} },
      { macros: { calories_kcal: 180, protein_g: 10, carbs_g: 30, fat_g: 3, fiber_g: 8, sugar_g: 4, sodium_mg: 748 }, micros: {} },
    ];
    const { macros } = aggregateCanonicalTotals(items);
    expect(macros.fiber_g).toBeCloseTo(8.6);
    expect(macros.sugar_g).toBeCloseTo(4.1);
    expect(macros.sodium_mg).toBe(750);
    expect(macros.calories_kcal).toBe(385);
  });

  it('sums correctly across 3+ items', () => {
    const items = [
      { macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 }, micros: {} },
      { macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 }, micros: {} },
      { macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 }, micros: {} },
    ];
    const { macros } = aggregateCanonicalTotals(items);
    expect(macros.calories_kcal).toBe(300);
    expect(macros.fiber_g).toBe(3);
    expect(macros.sodium_mg).toBe(150);
  });

  it('missing field (never reported): recorded in missingMacroFields, contributes 0 to the sum', () => {
    const items = [
      { macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, sugar_g: 1, sodium_mg: 50 }, micros: {} }, // no fiber_g
    ];
    const { macros, meta } = aggregateCanonicalTotals(items);
    expect(macros.fiber_g).toBe(0);
    expect(meta.missingMacroFields).toContain('fiber_g');
    expect(meta.invalidMacroFields).not.toContain('fiber_g');
  });

  it('legitimate zero: NOT flagged as missing', () => {
    const items = [
      { macros: { calories_kcal: 100, protein_g: 5, carbs_g: 10, fat_g: 2, fiber_g: 0, sugar_g: 0, sodium_mg: 0 }, micros: {} },
    ];
    const { meta } = aggregateCanonicalTotals(items);
    expect(meta.missingMacroFields).toEqual([]);
    expect(meta.invalidMacroFields).toEqual([]);
  });

  it('malformed field (present but not parseable): recorded in invalidMacroFields, NOT silently summed as 0 via Number(x)||0', () => {
    const items = [
      { itemId: 'item-1', macros: { calories_kcal: 100, protein_g: 'not-a-number', carbs_g: 10, fat_g: 2, fiber_g: 1, sugar_g: 1, sodium_mg: 50 }, micros: {} },
    ];
    const { meta } = aggregateCanonicalTotals(items);
    expect(meta.invalidMacroFields).toContain('protein_g');
    expect(meta.missingMacroFields).not.toContain('protein_g');
  });

  it('a negative numeric string is parsed as a real negative value, not corrupted into a positive one', () => {
    const items = [{ macros: { calories_kcal: -50 }, micros: {} }]; // e.g. a correction/adjustment item
    const { macros, meta } = aggregateCanonicalTotals(items);
    expect(macros.calories_kcal).toBe(-50);
    expect(meta.invalidMacroFields).toEqual([]);
  });

  it('handles an empty items array without throwing', () => {
    const { macros, meta } = aggregateCanonicalTotals([]);
    expect(macros.calories_kcal).toBe(0);
    expect(meta.itemCount).toBe(0);
  });
});

describe('aggregateCanonicalTotals — legacy unsuffixed macro keys (nutritionSchema.js\'s voice-path output shape)', () => {
  // Reported bug: an item correctly displayed 95 kcal (mobile reads
  // `macros.calories_kcal || macros.calories`), but the meal summary showed
  // 0 — because this aggregator only ever read the suffixed key.
  it('an item carrying unsuffixed macros.calories (not calories_kcal) still contributes to the total', () => {
    const items = [{ macros: { calories: 95, protein: 3, carbs: 12, fat: 4, fiber: 1, sugar: 2, sodium: 40 }, micros: {} }];
    const { macros, meta } = aggregateCanonicalTotals(items);
    expect(macros.calories_kcal).toBe(95);
    expect(macros.protein_g).toBe(3);
    expect(macros.carbs_g).toBe(12);
    expect(macros.fat_g).toBe(4);
    expect(macros.fiber_g).toBe(1);
    expect(macros.sugar_g).toBe(2);
    expect(macros.sodium_mg).toBe(40);
    expect(meta.missingMacroFields).toEqual([]);
  });

  it('a mixed meal (one canonical item, one legacy-shaped item) sums both correctly', () => {
    const items = [
      { macros: { calories_kcal: 205, protein_g: 4, carbs_g: 45, fat_g: 0.4, fiber_g: 0.6, sugar_g: 0.1, sodium_mg: 2 }, micros: {} },
      { macros: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2 }, micros: {} },
    ];
    const { macros } = aggregateCanonicalTotals(items);
    expect(macros.calories_kcal).toBe(300);
    expect(macros.fiber_g).toBeCloseTo(5);
  });

  it('the suffixed key wins when an item somehow carries both', () => {
    const items = [{ macros: { calories_kcal: 205, calories: 999 }, micros: {} }];
    const { macros } = aggregateCanonicalTotals(items);
    expect(macros.calories_kcal).toBe(205);
  });

  it('a legitimate zero under the legacy key is not treated as missing', () => {
    const items = [{ macros: { calories: 100, protein: 5, carbs: 10, fat: 2, fiber: 0, sugar: 0, sodium: 0 }, micros: {} }];
    const { meta } = aggregateCanonicalTotals(items);
    expect(meta.missingMacroFields).toEqual([]);
  });

  it('still flags a field missing under both names', () => {
    const items = [{ macros: { calories_kcal: 100 }, micros: {} }]; // no protein under either name
    const { meta } = aggregateCanonicalTotals(items);
    expect(meta.missingMacroFields).toContain('protein_g');
  });
});

describe('aggregateCanonicalTotals — item-level provenance', () => {
  it('records which specific item is missing which field, not just the meal-level union', () => {
    const items = [
      { itemId: 'rice-1', name: 'Rice', macros: { calories_kcal: 200, protein_g: 4, carbs_g: 45, fat_g: 0, fiber_g: 1, sugar_g: 0, sodium_mg: 2 }, micros: {} },
      { itemId: 'dal-1', name: 'Dal', macros: { calories_kcal: 180, protein_g: 10, carbs_g: 30, fat_g: 3, fiber_g: 8, sugar_g: 4 /* no sodium_mg */ }, micros: {} },
    ];
    const { meta } = aggregateCanonicalTotals(items);
    expect(meta.missingMacroFields).toContain('sodium_mg'); // meal-level union
    const dalIssue = meta.itemFieldIssues.find((i) => i.itemId === 'dal-1');
    expect(dalIssue.missingFields).toContain('sodium_mg');
    const riceIssue = meta.itemFieldIssues.find((i) => i.itemId === 'rice-1');
    expect(riceIssue).toBeUndefined(); // rice reported every field, no issue entry
  });

  it('partial micronutrient coverage: one of several items missing a nutrient is distinguishable from none reporting it', () => {
    const items = [
      { itemId: 'a', macros: {}, micros: { calcium: 100 } },
      { itemId: 'b', macros: {}, micros: { calcium: 50 } },
      { itemId: 'c', macros: {}, micros: {} }, // no calcium
      { itemId: 'd', macros: {}, micros: {} }, // no calcium
    ];
    const { meta } = aggregateCanonicalTotals(items);
    expect(meta.microCoverage.calcium.itemsReporting).toBe(2);
    expect(meta.microCoverage.calcium.itemsTotal).toBe(4);
    expect(meta.microCoverage.calcium.missingFromItemIds.sort()).toEqual(['c', 'd']);
  });
});

describe('aggregateCanonicalTotals — micronutrient aggregation and unit conflicts', () => {
  it('aggregates micronutrients across items with correct canonical units', () => {
    const items = [
      { macros: {}, micros: { vitaminA: 300, calcium: 100 } },
      { macros: {}, micros: { vitaminA: 200, calcium: 50 } },
    ];
    const { micros } = aggregateCanonicalTotals(items);
    expect(micros.vitaminA).toEqual({ value: 500, unit: 'µg' });
    expect(micros.calcium).toEqual({ value: 150, unit: 'mg' });
  });

  it('mg + µg for the same nutrient converts deterministically and sums correctly', () => {
    const items = [
      { macros: {}, micros: { calcium: { value: 100, unit: 'mg' } } },
      { macros: {}, micros: { calcium: { value: 50000, unit: 'µg' } } }, // = 50mg
    ];
    const { micros, meta } = aggregateCanonicalTotals(items);
    expect(micros.calcium.value).toBe(150);
    expect(micros.calcium.unit).toBe('mg');
    expect(meta.conflictedMicros).toEqual([]);
  });

  it('a non-convertible unit conflict removes the nutrient from totals entirely rather than exposing a partial sum', () => {
    const items = [
      { macros: {}, micros: { sodium: { value: 300, unit: 'mg' } } },
      { macros: {}, micros: { sodium: { value: 5, unit: 'IU' } } }, // nonsensical unit for sodium, no safe conversion
    ];
    const { micros, meta } = aggregateCanonicalTotals(items);
    expect(micros.sodium).toBeUndefined(); // NOT exposed as if it were the complete/partial total
    expect(meta.conflictedMicros).toHaveLength(1);
    expect(meta.conflictedMicros[0].key).toBe('sodium');
    expect(meta.conflictedMicros[0].unitsSeen).toEqual(['mg', 'IU']);
  });
});

describe('checkMicroPlausibility — flags without altering', () => {
  it('flags a vitaminA value that looks like IU mistaken for mcg RAE', () => {
    const flag = checkMicroPlausibility('vitaminA', 50000);
    expect(flag).not.toBeNull();
    expect(flag.reason).toMatch(/unit-scale error/);
  });

  it('does not flag a legitimate high-vitaminA meal (e.g. liver)', () => {
    expect(checkMicroPlausibility('vitaminA', 6500)).toBeNull();
  });

  it('flags a value 1000x too high (mg/mcg confusion)', () => {
    expect(checkMicroPlausibility('folate', 400000)).not.toBeNull();
  });

  it('does not flag ordinary values for common nutrients', () => {
    expect(checkMicroPlausibility('calcium', 300)).toBeNull();
    expect(checkMicroPlausibility('iron', 5)).toBeNull();
    expect(checkMicroPlausibility('sodium', 750)).toBeNull();
  });

  it('returns null for an unknown nutrient key rather than false-flagging', () => {
    expect(checkMicroPlausibility('someNewNutrient', 999999)).toBeNull();
  });

  it('flags a negative value', () => {
    expect(checkMicroPlausibility('calcium', -5)).not.toBeNull();
  });
});

describe('aggregateCanonicalTotals — plausibility flags surface WITHOUT altering the value', () => {
  it('reports an implausible micronutrient in meta but still includes its unaltered value in the sum', () => {
    const items = [
      { macros: {}, micros: { vitaminA: 90000 } }, // clearly wrong-unit
    ];
    const { micros, meta } = aggregateCanonicalTotals(items);
    expect(micros.vitaminA.value).toBe(90000); // not altered/rewritten
    expect(meta.implausibleMicros).toHaveLength(1);
    expect(meta.implausibleMicros[0].key).toBe('vitaminA');
    expect(meta.implausibleMicros[0].value).toBe(90000); // original source value preserved for debugging
  });

  it('does not flag anything for a normal meal', () => {
    const items = [
      { macros: {}, micros: { calcium: 100, vitaminA: 300, iron: 2 } },
    ];
    const { meta } = aggregateCanonicalTotals(items);
    expect(meta.implausibleMicros).toEqual([]);
  });
});

describe('canonical field list stays in sync with mobile/constants/dailyValues.js unit conventions', () => {
  it('every MACRO_FIELDS entry uses the _kcal/_g/_mg suffix convention every route/consumer expects', () => {
    expect(MACRO_FIELDS).toEqual([
      'calories_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg',
    ]);
  });

  it('vitaminA/vitaminD/vitaminB12/folate are µg, matching dailyValues.js (not mg)', () => {
    expect(MICRO_UNITS.vitaminA).toBe('µg');
    expect(MICRO_UNITS.vitaminD).toBe('µg');
    expect(MICRO_UNITS.vitaminB12).toBe('µg');
    expect(MICRO_UNITS.folate).toBe('µg');
  });

  it('calcium/iron/magnesium/potassium/zinc/sodium/vitaminC are mg', () => {
    for (const key of ['calcium', 'iron', 'magnesium', 'potassium', 'zinc', 'sodium', 'vitaminC']) {
      expect(MICRO_UNITS[key]).toBe('mg');
    }
  });
});

describe('computeConfidenceTier', () => {
  it('High: record-based source, stated quantity, no flags', () => {
    expect(computeConfidenceTier({ source: 'usda_verified', portionIsEstimated: false })).toBe('high');
    expect(computeConfidenceTier({ source: 'ingredient_breakdown', portionIsEstimated: false })).toBe('high');
  });

  it('Medium: record-based source but a defaulted (estimated) quantity', () => {
    expect(computeConfidenceTier({ source: 'usda_verified', portionIsEstimated: true })).toBe('medium');
  });

  it('Medium: AI estimate with nothing flagged', () => {
    expect(computeConfidenceTier({ source: 'openai_estimation', portionIsEstimated: false })).toBe('medium');
    expect(computeConfidenceTier({ source: 'openai_estimation', portionIsEstimated: true })).toBe('medium');
  });

  it('Low: severe plausibility overrides everything else, even a record-based source', () => {
    expect(computeConfidenceTier({ source: 'usda_verified', portionIsEstimated: false, plausibilitySeverity: 'severe' })).toBe('low');
  });

  it('Low: item-level field issues override a record-based source', () => {
    expect(computeConfidenceTier({ source: 'usda_verified', portionIsEstimated: false, hasFieldIssues: true })).toBe('low');
  });

  it('Low: an unvalidated estimate, even with no other flags', () => {
    expect(computeConfidenceTier({ source: 'openai_estimation_unvalidated', validated: false })).toBe('low');
  });

  it('moderate plausibility alone does not demote to Low (only severe does)', () => {
    expect(computeConfidenceTier({ source: 'usda_verified', portionIsEstimated: false, plausibilitySeverity: 'moderate' })).toBe('high');
  });

  it('defaults sensibly with no context at all', () => {
    expect(computeConfidenceTier()).toBe('medium');
    expect(computeConfidenceTier({})).toBe('medium');
  });
});
