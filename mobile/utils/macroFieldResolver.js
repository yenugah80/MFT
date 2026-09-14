/**
 * Macro field resolution — reconciles the canonical suffixed macro shape
 * (macros.calories_kcal, .protein_g, ...) against the unsuffixed legacy
 * aliases some producers still emit (nutritionSchema.js's multi-item AI
 * validator output, used on the voice path, emits macros.calories not
 * macros.calories_kcal). Mirrors
 * backend/src/utils/canonicalNutrition.js's LEGACY_MACRO_ALIASES so both
 * halves of the pipeline recognize the same shapes.
 *
 * Pure, dependency-free by design (no React/React Native/Expo imports) so
 * it can be unit tested directly without pulling in the app's native-module
 * graph — see __tests__/macroFieldResolver.test.js and
 * __tests__/voiceMacroNormalization.test.js.
 *
 * Root cause this exists to close: an item correctly displayed 95 kcal
 * (review reads `macros.calories_kcal || macros.calories`), but the meal
 * total showed 0, because the totals path only ever read the canonical
 * suffixed key. Normalizing once, here, at the boundary means every
 * downstream consumer (item display, meal totals, save, dashboard) works
 * from the same reconciled values instead of each guessing independently.
 */

export const MACRO_ALIASES = {
  calories_kcal: ['calories'],
  protein_g: ['protein'],
  carbs_g: ['carbs'],
  fat_g: ['fat', 'fats'],
  fiber_g: ['fiber'],
  sugar_g: ['sugar'],
  sodium_mg: ['sodium'],
};

export const MACRO_KEYS = Object.keys(MACRO_ALIASES);

/**
 * Resolves one canonical macro field from an item, checking its legacy
 * aliases (nested under `macros`, then flat on the item itself) before
 * concluding the value is genuinely absent. Returns null — never a
 * misleading 0 — when no producer reported it under any known name. The
 * canonical key always wins when an item somehow carries both.
 */
export function resolveMacroField(item, canonicalKey) {
  const macros = item?.macros || {};
  if (macros[canonicalKey] !== undefined && macros[canonicalKey] !== null) return macros[canonicalKey];
  for (const alias of MACRO_ALIASES[canonicalKey] || []) {
    if (macros[alias] !== undefined && macros[alias] !== null) return macros[alias];
  }
  for (const alias of MACRO_ALIASES[canonicalKey] || []) {
    if (item?.[alias] !== undefined && item[alias] !== null) return item[alias];
  }
  return null;
}

/** Resolves every canonical macro field for one item into the canonical shape. */
export function normalizeItemMacros(item) {
  const result = {};
  for (const canonicalKey of MACRO_KEYS) {
    result[canonicalKey] = resolveMacroField(item, canonicalKey);
  }
  return result;
}

/**
 * Reconciles meal-level totals from a list of already-normalized items
 * (each item's macros already run through normalizeItemMacros). A field is
 * summed from whichever items reported it; a field no item ever reported
 * comes back null (unknown), not a misleading 0 — distinct from a field
 * every item legitimately reported as 0.
 */
export function aggregateNormalizedMacroTotals(normalizedItems) {
  const totals = Object.fromEntries(MACRO_KEYS.map((key) => [key, 0]));
  const reported = Object.fromEntries(MACRO_KEYS.map((key) => [key, false]));

  for (const item of normalizedItems || []) {
    const macros = item?.macros || {};
    for (const key of MACRO_KEYS) {
      if (macros[key] !== null && macros[key] !== undefined) {
        totals[key] += macros[key];
        reported[key] = true;
      }
    }
  }

  for (const key of MACRO_KEYS) {
    if (!reported[key]) totals[key] = null;
  }
  return totals;
}
