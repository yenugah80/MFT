/**
 * Shared micronutrient helpers: aggregating per-item micros into a meal
 * total, and looking up %DV against constants/dailyValues.js.
 *
 * Extracted so this logic (used by app/(tabs)/log.js's multi-item save and
 * components/log/MealLoggedCard.jsx's %DV badges) is unit-testable without
 * pulling in either of those — a giant screen component and a component
 * with heavy native-module dependencies, respectively.
 */
import { DAILY_VALUES } from '../constants/dailyValues';

/**
 * Sums micros across multiple food items into one meal total. Handles both
 * shapes a micros entry can arrive in: {calcium: 15} and
 * {calcium: {value: 15, unit: 'mg'}}.
 *
 * @param {Array<{micros?: Object}>} items
 * @returns {Object} keyed by micronutrient name, each {value, unit}
 */
export function aggregateMicros(items) {
  const result = {};
  for (const item of items || []) {
    const micros = item?.micros;
    if (!micros || typeof micros !== 'object') continue;
    for (const [key, val] of Object.entries(micros)) {
      const isObject = typeof val === 'object' && val !== null;
      const value = isObject ? (val.value ?? 0) : (typeof val === 'number' ? val : 0);
      const unit = isObject ? (val.unit || 'mg') : 'mg';
      if (!result[key]) result[key] = { value: 0, unit };
      result[key].value += value;
    }
  }
  return result;
}

/**
 * Normalizes a micronutrient key so "vitamin_c", "vitaminC", "Vitamin C",
 * and "vitaminC_mg" all collapse to the same lookup key. Same normalization
 * MealSummary/MicrosGrid.jsx uses for its own (narrower, 11-nutrient)
 * DAILY_VALUES lookup.
 */
export function normalizeMicroKey(key) {
  return String(key)
    .replace(/_mg$|_g$|_mcg$|_ug$|_μg$/i, '')
    .replace(/[_\s-]/g, '')
    .toLowerCase();
}

const DAILY_VALUES_BY_NORMALIZED_KEY = Object.fromEntries(
  Object.entries(DAILY_VALUES).map(([key, dv]) => [normalizeMicroKey(key), dv])
);

/**
 * @param {string} name - micronutrient name in any casing/underscore style
 * @returns {{value: number, unit: string} | null}
 */
export function getDailyValueFor(name) {
  return DAILY_VALUES_BY_NORMALIZED_KEY[normalizeMicroKey(name)] || null;
}
