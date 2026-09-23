/**
 * Protein-density ranking score used only for the meal-vs-meal comparison
 * screens (app/history/compare.jsx, components/log/HistoryDrawer.jsx).
 *
 * This is deliberately NOT the canonical Nutri-Score/health-score shown
 * elsewhere in the app (post-log card, pre-log analysis screen) — it
 * answers a different question ("which of these two logged meals is more
 * protein-dense per calorie"), not "how healthy is this meal in isolation".
 * Keeping it separate is correct; only the copy-paste duplication of this
 * exact function across the two comparison screens was the bug.
 *
 * Previously duplicated verbatim in both files with one real difference:
 * HistoryDrawer.jsx's copy had no null guard and would throw on
 * calculateProteinDensityScore(null/undefined) — this version keeps
 * compare.jsx's safer guard.
 *
 * @param {{protein?: number, carbs?: number, fat?: number, fats?: number, fiber?: number, sugar?: number, calories?: number} | null} meal
 * @returns {number} 0-100
 */
export function calculateProteinDensityScore(meal) {
  if (!meal) return 0;

  const protein = meal.protein || 0;
  const carbs = meal.carbs || 0;
  const fat = meal.fat || meal.fats || 0;
  const fiber = meal.fiber || 0;
  const sugar = meal.sugar || 0;
  const calories = meal.calories || 0;

  if (calories <= 0) return 50;

  // Protein ratio score (higher protein per calorie is better)
  const proteinPerCal = (protein * 4) / calories;
  const proteinScore = Math.min(100, proteinPerCal * 250);

  // Fiber bonus
  const fiberScore = Math.min(100, (fiber / 8) * 100);

  // Sugar penalty
  const sugarPenalty = Math.min(40, (sugar / 25) * 40);

  // Macro balance
  const totalMacroCal = (protein * 4) + (carbs * 4) + (fat * 9) || 1;
  const proteinPct = (protein * 4) / totalMacroCal * 100;
  let balanceScore = 100;
  if (proteinPct < 15) balanceScore -= 30;
  else if (proteinPct < 20) balanceScore -= 15;

  return Math.round((proteinScore * 0.35 + fiberScore * 0.2 + balanceScore * 0.3 + (40 - sugarPenalty)) * 0.9);
}
