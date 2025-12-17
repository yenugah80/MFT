/**
 * Micronutrient Coverage Calculations
 *
 * Industry-standard micronutrient tracking based on RDAs
 */

// Reference Daily Intake (RDI) values - FDA standard
export const MICRO_RDI = {
  // Minerals
  calcium: { value: 1000, unit: 'mg', label: 'Calcium', category: 'mineral' },
  iron: { value: 18, unit: 'mg', label: 'Iron', category: 'mineral' },
  magnesium: { value: 400, unit: 'mg', label: 'Magnesium', category: 'mineral' },
  potassium: { value: 3500, unit: 'mg', label: 'Potassium', category: 'mineral' },
  zinc: { value: 11, unit: 'mg', label: 'Zinc', category: 'mineral' },
  sodium: { value: 2300, unit: 'mg', label: 'Sodium', category: 'mineral' },

  // Vitamins
  vitaminA: { value: 900, unit: 'mcg', label: 'Vitamin A', category: 'vitamin' },
  vitaminC: { value: 90, unit: 'mg', label: 'Vitamin C', category: 'vitamin' },
  vitaminD: { value: 20, unit: 'mcg', label: 'Vitamin D', category: 'vitamin' },
  vitaminE: { value: 15, unit: 'mg', label: 'Vitamin E', category: 'vitamin' },
  vitaminK: { value: 120, unit: 'mcg', label: 'Vitamin K', category: 'vitamin' },
  vitaminB12: { value: 2.4, unit: 'mcg', label: 'Vitamin B12', category: 'vitamin' },
  folate: { value: 400, unit: 'mcg', label: 'Folate', category: 'vitamin' },

  // Other
  fiber: { value: 28, unit: 'g', label: 'Fiber', category: 'other' },
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
  const rdi = MICRO_RDI[microKey];
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
    const percentage = calculateMicroPercentage(key, value);
    const weight = coreMicros.includes(key) ? 1.5 : 1.0;

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
      const rdi = MICRO_RDI[key];
      if (!rdi) return null;

      const numericValue = parseMicroValue(value);
      const percentage = calculateMicroPercentage(key, numericValue);

      return {
        key,
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
  parseMicroValue,
  calculateMicroPercentage,
  calculateMicrosCoverage,
  getMicrosWithPercentages,
  getMicroBarColor,
  getMicrosCoverageColor,
};
