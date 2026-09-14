import {
  resolveMacroField,
  normalizeItemMacros,
  aggregateNormalizedMacroTotals,
} from '../utils/macroFieldResolver';

// Regression coverage for: an item correctly displayed 95 kcal in review,
// but the meal summary/total showed 0 — because the totals path only ever
// read the canonical suffixed macro key (calories_kcal), while some
// producers (nutritionSchema.js's multi-item AI validator output, used on
// the voice path) emit the unsuffixed alias (calories) instead. The fix
// normalizes every item's macros once, at the mapVoiceResultToAnalysis
// boundary (app/(tabs)/log.js), so every downstream consumer (item display,
// meal totals, save, dashboard) works from the same reconciled values —
// not a separately computed, potentially-diverging "total."
//
// This file is deliberately dependency-free (imports only from
// utils/macroFieldResolver, never from the log.js screen component) so it
// can run without the app's React Native / Expo native-module graph —
// importing the full screen file directly pulled in @expo/vector-icons and
// failed under jest-expo's preset regardless of this logic's correctness.

describe('resolveMacroField — canonical vs legacy key precedence', () => {
  it('reads the canonical suffixed key when present', () => {
    expect(resolveMacroField({ macros: { calories_kcal: 205 } }, 'calories_kcal')).toBe(205);
  });

  it('falls back to the unsuffixed legacy key when the canonical one is absent', () => {
    expect(resolveMacroField({ macros: { calories: 95 } }, 'calories_kcal')).toBe(95);
  });

  it('the canonical key wins when an item carries both (defined precedence)', () => {
    expect(resolveMacroField({ macros: { calories_kcal: 205, calories: 999 } }, 'calories_kcal')).toBe(205);
  });

  it('fat_g also accepts the "fats" alias seen in some producer shapes', () => {
    expect(resolveMacroField({ macros: { fats: 12 } }, 'fat_g')).toBe(12);
  });

  it('falls back to a flat field directly on the item when macros is absent entirely', () => {
    expect(resolveMacroField({ calories: 50 }, 'calories_kcal')).toBe(50);
  });

  it('returns null — not 0 — when a field is reported under no known name', () => {
    expect(resolveMacroField({ macros: { protein_g: 5 } }, 'calories_kcal')).toBeNull();
  });

  it('a legitimate zero under the legacy key is returned as 0, not treated as missing', () => {
    expect(resolveMacroField({ macros: { sodium: 0 } }, 'sodium_mg')).toBe(0);
  });
});

describe('normalizeItemMacros — full item shape', () => {
  it('the reported 95-kcal case: unsuffixed macros normalize to the canonical shape with the same value', () => {
    const item = { name: 'apple', macros: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2 } };
    expect(normalizeItemMacros(item)).toEqual({
      calories_kcal: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3, fiber_g: 4.4, sugar_g: 19, sodium_mg: 2,
    });
  });

  it('canonical and legacy field shapes produce equivalent normalized results', () => {
    const canonical = { macros: { calories_kcal: 450, protein_g: 30, carbs_g: 50, fat_g: 15, fiber_g: 3, sugar_g: 5, sodium_mg: 600 } };
    const legacy = { macros: { calories: 450, protein: 30, carbs: 50, fat: 15, fiber: 3, sugar: 5, sodium: 600 } };
    expect(normalizeItemMacros(canonical)).toEqual(normalizeItemMacros(legacy));
  });

  it('a field missing under every known name normalizes to null, not 0', () => {
    const item = { macros: { calories: 100 } }; // no protein anywhere
    expect(normalizeItemMacros(item).protein_g).toBeNull();
  });
});

describe('aggregateNormalizedMacroTotals — item, total, and save consistency', () => {
  it('a single legacy-shaped item (the reported regression) produces a matching total', () => {
    const items = [{ macros: normalizeItemMacros({ macros: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2 } }) }];
    const totals = aggregateNormalizedMacroTotals(items);
    expect(totals.calories_kcal).toBe(95); // not 0
  });

  it('mixed field shapes across multiple items (canonical + legacy + regional dish) aggregate correctly', () => {
    const items = [
      { macros: normalizeItemMacros({ macros: { calories_kcal: 385, protein_g: 14, carbs_g: 75, fat_g: 3, fiber_g: 8.6, sugar_g: 4.1, sodium_mg: 750 } }) }, // rice and dal
      { macros: normalizeItemMacros({ macros: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2 } }) }, // apple
      { macros: normalizeItemMacros({ calories: 450, protein: 30, carbs: 50, fat: 15 }) }, // chicken shawarma wrap, flat-on-item shape, no macros object
    ];
    const totals = aggregateNormalizedMacroTotals(items);
    expect(totals.calories_kcal).toBe(385 + 95 + 450);
    expect(totals.protein_g).toBeCloseTo(14 + 0.5 + 30);
    expect(totals.fiber_g).toBeCloseTo(8.6 + 4.4); // shawarma item never reported fiber
  });

  it('a meal where no item ever reports sodium keeps the total unknown, not a misleading 0', () => {
    const items = [
      { macros: normalizeItemMacros({ macros: { calories: 100, protein: 5, carbs: 10, fat: 2 } }) },
      { macros: normalizeItemMacros({ macros: { calories: 200, protein: 8, carbs: 20, fat: 4 } }) },
    ];
    const totals = aggregateNormalizedMacroTotals(items);
    expect(totals.sodium_mg).toBeNull();
    expect(totals.calories_kcal).toBe(300);
  });

  it('a meal where every item legitimately has 0 sodium reports a real zero, not null', () => {
    const items = [
      { macros: normalizeItemMacros({ macros: { calories: 100, protein: 5, carbs: 10, fat: 2, fiber: 1, sugar: 1, sodium: 0 } }) },
      { macros: normalizeItemMacros({ macros: { calories: 200, protein: 8, carbs: 20, fat: 4, fiber: 2, sugar: 2, sodium: 0 } }) },
    ];
    const totals = aggregateNormalizedMacroTotals(items);
    expect(totals.sodium_mg).toBe(0);
  });

  it('handles an empty item list without throwing', () => {
    const totals = aggregateNormalizedMacroTotals([]);
    expect(totals.calories_kcal).toBeNull();
  });
});

describe('quantity scaling happens exactly once', () => {
  it('normalizeItemMacros does not multiply by portion.amount — scaling is the backend\'s job, done before this item ever reaches the client', () => {
    const item = { portion: { amount: 3, unit: 'egg' }, macros: { calories_kcal: 210, protein_g: 18 } };
    const normalized = normalizeItemMacros(item);
    expect(normalized.calories_kcal).toBe(210); // not 630
    expect(normalized.protein_g).toBe(18); // not 54
  });
});
