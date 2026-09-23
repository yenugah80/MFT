/**
 * Single source of truth for classifying a meal type from a clock hour.
 *
 * Before this, three independent copies of this boundary logic existed
 * (useFoodAnalysis.js's getMealTypeFromTime, and detectMealType in both
 * app/meal/[id].jsx and NutritionDetailsSection.jsx) and disagreed with
 * each other for the 22:00-23:59 and 00:00-00:59 windows: the save-time
 * classifier called anything at or after 22:00 a 'snack', while both
 * display-time classifiers called it 'dinner'. A meal logged at, say,
 * 10:53pm was stored as one mealType and then shown as a different one on
 * every screen that re-derived it from the timestamp instead of trusting
 * the stored value — which is exactly the "Dinner" (Details) vs "Late
 * Night Snack" (Smart Insights) mismatch this was investigated from.
 *
 * Boundaries below match what the two (mutually-agreeing) display-time
 * implementations already used, since changing display-only call sites
 * carries no save-time compatibility risk.
 */
export function getMealTypeFromTime(date = new Date()) {
  const hour = date instanceof Date ? date.getHours() : new Date(date).getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 18 || hour < 1) return 'dinner';
  return 'snack';
}
