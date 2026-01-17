// Recommended Daily Values (RDVs) for adults, based on a 2000 calorie diet.
// These values are approximate and can vary based on age, sex, and other factors.
// Units are important! Ensure these units align with what your food analysis provides.
export const DAILY_VALUES = {
  // Vitamins
  vitaminA: { value: 900, unit: 'µg' }, // Micrograms
  vitaminC: { value: 90, unit: 'mg' },  // Milligrams
  vitaminD: { value: 20, unit: 'µg' },
  vitaminE: { value: 15, unit: 'mg' },
  vitaminK: { value: 120, unit: 'µg' },
  vitaminB1: { value: 1.2, unit: 'mg' }, // Thiamin
  vitaminB2: { value: 1.3, unit: 'mg' }, // Riboflavin
  vitaminB3: { value: 16, unit: 'mg' },  // Niacin
  vitaminB6: { value: 1.7, unit: 'mg' },
  vitaminB9: { value: 400, unit: 'µg' }, // Folate (or Folic Acid)
  folate: { value: 400, unit: 'µg' },    // Alias for vitaminB9
  vitaminB12: { value: 2.4, unit: 'µg' },
  biotin: { value: 30, unit: 'µg' },
  pantothenicAcid: { value: 5, unit: 'mg' },

  // Minerals
  calcium: { value: 1300, unit: 'mg' },
  iron: { value: 18, unit: 'mg' },
  magnesium: { value: 420, unit: 'mg' },
  phosphorus: { value: 1250, unit: 'mg' },
  potassium: { value: 4700, unit: 'mg' },
  sodium: { value: 2300, unit: 'mg' }, // Note: Often a limit, not a target
  zinc: { value: 11, unit: 'mg' },
  copper: { value: 0.9, unit: 'mg' },
  manganese: { value: 2.3, unit: 'mg' },
  selenium: { value: 55, unit: 'µg' },
  iodine: { value: 150, unit: 'µg' },
  chromium: { value: 35, unit: 'µg' },
  molybdenum: { value: 45, unit: 'µg' },
  chloride: { value: 2300, unit: 'mg' },
};

// Helper function for unit conversion (extend as needed for more complex cases)
export function convertUnit(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'µg' && toUnit === 'mg') return value / 1000;
  if (fromUnit === 'mg' && toUnit === 'µg') return value * 1000;
  // Add more conversions (e.g., IU for Vitamin A/D if your data uses it)

  console.warn(`[dailyValues] No direct conversion defined for ${fromUnit} to ${toUnit}. Returning original value.`);
  return value;
}