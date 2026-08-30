/**
 * Field-aware nutrient completeness and enrichment-fill logic.
 *
 * Previously (in resolve.js) these used truthy/`=== 0`/`> 0` checks to decide
 * what counted as "missing" for both macros and the tracked key
 * micronutrients — which meant a genuinely-reported zero (0mg sodium, 0g
 * fat) was indistinguishable from an absent field, so it could be silently
 * overwritten by a lower-confidence USDA/AI enrichment estimate. Field-aware
 * here means: only `undefined`/`null` (or unparseable) counts as missing:
 * enrichment fills in what's absent and never touches a present value,
 * confirmed zero or not.
 */

import { MACRO_FIELDS } from './canonicalNutrition.js';

export const KEY_MICRONUTRIENTS = [
  'calcium', 'iron', 'magnesium', 'potassium', 'zinc', 'sodium',
  'vitaminA', 'vitaminC', 'vitaminD', 'vitaminB12', 'folate',
];

/** Which of MACRO_FIELDS are genuinely absent from `macros`. */
export function getMissingMacroFields(macros) {
  if (!macros) return [...MACRO_FIELDS];
  return MACRO_FIELDS.filter((field) => macros[field] === undefined || macros[field] === null);
}

export function isNutrientsComplete(macros) {
  return getMissingMacroFields(macros).length === 0;
}

/** Which of KEY_MICRONUTRIENTS are genuinely absent from `micros`. */
export function getMissingMicroKeys(micros) {
  if (!micros || typeof micros !== 'object') return [...KEY_MICRONUTRIENTS];
  return KEY_MICRONUTRIENTS.filter((key) => {
    const value = micros[key];
    if (value === undefined || value === null) return true;
    const numValue = typeof value === 'number' ? value
      : (value?.value !== undefined ? parseFloat(value.value) : NaN);
    return !Number.isFinite(numValue);
  });
}

export function isMicrosComplete(micros) {
  return getMissingMicroKeys(micros).length === 0;
}

/**
 * Fill ONLY genuinely-missing macro fields on `item.macros` from a per-100g
 * USDA-shaped `usdaData.macros`, scaled to `itemServingGrams` (defaulting to
 * 100 — i.e. unscaled — when not known). Never overwrites a present value.
 * `scaleFromPer100g` is injected so this stays a pure function independent
 * of foodService.js's module graph.
 */
export function fillMissingNutrients(item, usdaData, itemServingGrams, scaleFromPer100g) {
  const missing = getMissingMacroFields(item.macros);
  const grams = Number.isFinite(itemServingGrams) && itemServingGrams > 0 ? itemServingGrams : 100;
  for (const field of missing) {
    const fillValue = scaleFromPer100g(usdaData.macros[field], grams);
    if (fillValue !== null && fillValue !== undefined) {
      item.macros[field] = fillValue;
    }
  }
}

/**
 * Merge estimated micros into `item.micros`, filling ONLY keys that are
 * genuinely absent. A present value — including a confirmed zero — is never
 * overwritten by a lower-confidence enrichment estimate.
 */
export function mergeMissingMicros(existingMicros, estimatedMicros) {
  const result = { ...(existingMicros || {}) };
  for (const [key, value] of Object.entries(estimatedMicros || {})) {
    const existing = result[key];
    const existingIsMissing = existing === undefined || existing === null;
    if (existingIsMissing) {
      result[key] = value;
    }
  }
  return result;
}
