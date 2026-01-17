/**
 * Micronutrient Coverage Calculations
 *
 * Industry-standard micronutrient tracking based on FDA 2020-2025 DV standards
 */

import { DAILY_VALUES } from '../constants/dailyValues';

// Reference Daily Intake (RDI) values - derived from DAILY_VALUES for consistency
// Enhanced with labels and categories for display
// Keys use camelCase as canonical format
const MICRO_RDI_BASE = {
  // Minerals (values from DAILY_VALUES)
  calcium: { value: DAILY_VALUES.calcium.value, unit: 'mg', label: 'Calcium', category: 'mineral' },
  iron: { value: DAILY_VALUES.iron.value, unit: 'mg', label: 'Iron', category: 'mineral' },
  magnesium: { value: DAILY_VALUES.magnesium.value, unit: 'mg', label: 'Magnesium', category: 'mineral' },
  potassium: { value: DAILY_VALUES.potassium.value, unit: 'mg', label: 'Potassium', category: 'mineral' },
  zinc: { value: DAILY_VALUES.zinc.value, unit: 'mg', label: 'Zinc', category: 'mineral' },
  sodium: { value: DAILY_VALUES.sodium.value, unit: 'mg', label: 'Sodium', category: 'mineral', isLimit: true },

  // Vitamins (values from DAILY_VALUES)
  vitaminA: { value: DAILY_VALUES.vitaminA.value, unit: 'mcg', label: 'Vitamin A', category: 'vitamin' },
  vitaminC: { value: DAILY_VALUES.vitaminC.value, unit: 'mg', label: 'Vitamin C', category: 'vitamin' },
  vitaminD: { value: DAILY_VALUES.vitaminD.value, unit: 'mcg', label: 'Vitamin D', category: 'vitamin' },
  vitaminE: { value: DAILY_VALUES.vitaminE.value, unit: 'mg', label: 'Vitamin E', category: 'vitamin' },
  vitaminK: { value: DAILY_VALUES.vitaminK.value, unit: 'mcg', label: 'Vitamin K', category: 'vitamin' },
  vitaminB12: { value: DAILY_VALUES.vitaminB12.value, unit: 'mcg', label: 'Vitamin B12', category: 'vitamin' },
  folate: { value: DAILY_VALUES.folate.value, unit: 'mcg', label: 'Folate', category: 'vitamin' },

  // Other
  fiber: { value: 28, unit: 'g', label: 'Fiber', category: 'other' },
};

/**
 * Normalize micronutrient key to canonical camelCase format
 * Handles: vitamin_a -> vitaminA, vitamin_c -> vitaminC, etc.
 */
export const normalizeMicroKey = (key) => {
  if (!key) return key;

  // Handle snake_case vitamins: vitamin_a -> vitaminA
  const snakeCaseVitamin = key.match(/^vitamin_([a-z])(\d*)$/i);
  if (snakeCaseVitamin) {
    const letter = snakeCaseVitamin[1].toUpperCase();
    const number = snakeCaseVitamin[2] || '';
    return `vitamin${letter}${number}`;
  }

  return key;
};

// Export MICRO_RDI with snake_case aliases for compatibility
export const MICRO_RDI = {
  ...MICRO_RDI_BASE,
  // Snake_case aliases (for dashboard aggregation compatibility)
  vitamin_a: MICRO_RDI_BASE.vitaminA,
  vitamin_c: MICRO_RDI_BASE.vitaminC,
  vitamin_d: MICRO_RDI_BASE.vitaminD,
  vitamin_e: MICRO_RDI_BASE.vitaminE,
  vitamin_k: MICRO_RDI_BASE.vitaminK,
  vitamin_b12: MICRO_RDI_BASE.vitaminB12,
};

/**
 * Parse micro value from string (e.g., "500mg" -> 500)
 */
export const parseMicroValue = (valueStr) => {
  if (typeof valueStr === 'number') return valueStr;
  if (!valueStr) return 0;

  const numericValue = parseFloat(valueStr.toString().replace(/[^\d.-]/g, ''));
  return isNaN(numericValue) ? 0 : numericValue;
};

/**
 * Calculate percentage of RDI for a micronutrient
 */
export const calculateMicroPercentage = (microKey, value) => {
  // Normalize key to handle both formats
  const rdi = MICRO_RDI[microKey] || MICRO_RDI[normalizeMicroKey(microKey)];
  if (!rdi) return 0;

  const numericValue = parseMicroValue(value);
  return Math.round((numericValue / rdi.value) * 100);
};

/**
 * Calculate overall micronutrient coverage
 *
 * Formula: Weighted average of tracked micros
 * - Core micros (iron, calcium, vitC, vitD) have 1.5x weight
 * - Other tracked micros have 1.0x weight
 */
export const calculateMicrosCoverage = (micros) => {
  if (!micros || typeof micros !== 'object') return 0;

  const coreMicros = ['iron', 'calcium', 'vitaminC', 'vitaminD'];

  let totalWeight = 0;
  let weightedSum = 0;

  Object.entries(micros).forEach(([key, value]) => {
    const normalizedKey = normalizeMicroKey(key);
    const percentage = calculateMicroPercentage(key, value);
    // Check both original and normalized key for core micros
    const weight = coreMicros.includes(key) || coreMicros.includes(normalizedKey) ? 1.5 : 1.0;

    weightedSum += Math.min(percentage, 120) * weight; // Cap at 120% to avoid over-representation
    totalWeight += weight;
  });

  if (totalWeight === 0) return 0;

  return Math.round(weightedSum / totalWeight);
};

/**
 * Get micros with percentages for display
 */
export const getMicrosWithPercentages = (micros) => {
  if (!micros || typeof micros !== 'object') return [];

  return Object.entries(micros)
    .map(([key, value]) => {
      // Try direct lookup first, then normalized key
      const rdi = MICRO_RDI[key] || MICRO_RDI[normalizeMicroKey(key)];
      if (!rdi) return null;

      const numericValue = parseMicroValue(value);
      const percentage = calculateMicroPercentage(key, numericValue);
      // Use normalized key for consistency in sorting
      const normalizedKey = normalizeMicroKey(key);

      return {
        key: normalizedKey,
        label: rdi.label,
        value: numericValue,
        unit: rdi.unit,
        percentage,
        rdi: rdi.value,
        category: rdi.category,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Sort by importance: core micros first, then by percentage (lowest first to highlight deficiencies)
      const coreMicros = ['iron', 'calcium', 'vitaminC', 'vitaminD'];
      const aIsCore = coreMicros.includes(a.key);
      const bIsCore = coreMicros.includes(b.key);

      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;

      // Within same category, show lowest percentage first (needs attention)
      return a.percentage - b.percentage;
    });
};

/**
 * Get color for micronutrient bar based on percentage
 *
 * Color semantics:
 * - 0-50%: Amber (needs attention)
 * - 50-90%: Teal (improving)
 * - 90-120%: Green (good)
 * - 120%+: Blue-gray (sufficient)
 */
export const getMicroBarColor = (percentage) => {
  if (percentage < 50) return '#f59e0b'; // Amber
  if (percentage < 90) return '#14b8a6'; // Teal
  if (percentage < 120) return '#10b981'; // Green
  return '#6b7280'; // Blue-gray
};

/**
 * Get ring color for overall micros coverage
 */
export const getMicrosCoverageColor = (percentage) => {
  if (percentage < 50) return '#f59e0b'; // Amber
  if (percentage < 70) return '#14b8a6'; // Teal
  return '#10b981'; // Green (calm, never red)
};

export default {
  MICRO_RDI,
  normalizeMicroKey,
  parseMicroValue,
  calculateMicroPercentage,
  calculateMicrosCoverage,
  getMicrosWithPercentages,
  getMicroBarColor,
  getMicrosCoverageColor,
};
