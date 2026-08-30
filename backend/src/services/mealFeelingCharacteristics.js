/**
 * Meal-characteristics and crash-risk classification — pure logic, extracted
 * from predictionEngineService.js so it's unit-testable without the DB
 * queries and Platt-calibration lookups predictMealFeeling() also does.
 *
 * PHASE 2 CALIBRATION: getCrashRisk() and generateFeelingTimeline()'s
 * "3-4 hours" branch both classified ANY high-carb, non-high-protein meal
 * as at least "Moderate crash risk" — without ever consulting fiber, even
 * though fiber slows glucose absorption and is exactly what distinguishes a
 * 75g-carb/8.6g-fiber meal (lentils + rice) from a 75g-carb/0g-fiber meal
 * (white bread). getEnergyProfile() and calculateMealImpactScore() already
 * used the fiber signal correctly elsewhere in this same file — this closes
 * the same gap in the two places that had it. Same 3-level (high/medium/low)
 * output and same labels/colors — only which meals land in which level
 * changed, using the same carbToFiberRatio signal already computed here.
 */

export function computeMealCharacteristics({ calories = 0, protein = 0, carbs = 0, sugar = 0, fiber = 0, novaScore = 2 } = {}) {
  return {
    isHighSugar: sugar > 25,
    isHighCarb: carbs > 60,
    isHighProtein: protein > 25,
    isHighCalorie: calories > 600,
    isLowProtein: protein < 10,
    isProcessed: novaScore >= 3,
    hasGoodFiber: fiber >= 5,
    carbToFiberRatio: fiber > 0 ? carbs / fiber : carbs,
    proteinToCalorieRatio: calories > 0 ? (protein * 4) / calories : 0,
  };
}

export function getCrashRisk(characteristics) {
  if (characteristics.isHighSugar && !characteristics.hasGoodFiber) {
    return { level: 'high', label: 'High crash risk', color: '#EF4444' };
  }
  if (characteristics.isHighCarb && !characteristics.isHighProtein) {
    // Fiber slows glucose absorption — a high-carb meal with a good
    // fiber-to-carb ratio (<=10, the same threshold already used for
    // calculateMealImpactScore's penalty) behaves meaningfully differently
    // from the same carb load with little fiber.
    if (characteristics.carbToFiberRatio <= 10) {
      return { level: 'low', label: 'Low crash risk', color: '#22C55E' };
    }
    return { level: 'medium', label: 'Moderate crash risk', color: '#F59E0B' };
  }
  return { level: 'low', label: 'Low crash risk', color: '#22C55E' };
}

/** Whether the "3-4 hours" timeline entry should show crash_risk vs stable — same fiber-aware rule as getCrashRisk, kept in sync so the timeline and the crashRisk summary never disagree. */
export function isLikelyCrashWindow(characteristics) {
  if (characteristics.isHighSugar) return true;
  if (characteristics.isHighCarb && !characteristics.isHighProtein && characteristics.carbToFiberRatio > 10) return true;
  return false;
}
