/**
 * Meal-quality scoring — pure logic, kept separate from MealScoreDial.jsx
 * (which pulls in react-native-svg / RN core) so it's unit-testable without
 * an RN rendering environment.
 *
 * PHASE 2 CALIBRATION (see the Phase 2 report for the full before/after
 * comparison across real meals): the macro-balance component previously
 * judged protein/carb/fat by % of calories, which structurally penalized
 * any carb-forward meal (rice, bread, potato-based cuisines) regardless of
 * whether it had adequate absolute protein and fiber — a fiber-rich,
 * protein-adequate rice+lentil meal scored the same "severely carb-heavy"
 * penalty as a carb load from refined starch with no fiber at all, because
 * ratio alone can't distinguish them. Replaced with:
 *   - protein adequacy by ABSOLUTE grams, not % of calories
 *   - carb QUALITY via a fiber-to-carb ratio (glycemic-load-style proxy),
 *     gated by absolute carb grams so a small amount of naturally
 *     fiber-free carb (lactose in a glass of milk, ~12g) isn't judged by
 *     the same math as 75g of genuinely low-fiber carb
 *   - fat adequacy by absolute grams, softened — some fat matters for
 *     satiety/absorption, but "low % of calories from fat" isn't itself a
 *     defect for a naturally lower-fat meal
 *   - a new sodium check (previously not factored into the score at all)
 * Same overall 55/20/15/5% weight structure plus the micro-nutrient bonus —
 * only how macroScore itself is computed changed.
 */

import { calculateMicroBonus } from '../../../utils/macroBalance';

export function calculateMealScore(item) {
  if (!item) return 50;

  const macros = item.macros || {};
  const protein = macros.protein_g || 0;
  const carbs = macros.carbs_g || 0;
  const fat = macros.fat_g || 0;
  const fiber = macros.fiber_g || 0;
  const sugar = macros.sugar_g || 0;
  const sodium = macros.sodium_mg || 0;
  const calories = macros.calories_kcal || 0;

  // If no calorie data, return neutral score
  if (calories <= 0) return 50;

  // =========================================================================
  // 1. MACRO BALANCE SCORE (55% weight) - This is the PRIMARY factor
  // =========================================================================
  let macroScore = 100;

  // PROTEIN — absolute grams, not % of calories. A carb-forward meal with
  // real protein (e.g. from lentils/dairy/meat) isn't "deficient" just
  // because a starch contributes most of the calories.
  if (protein < 6) macroScore -= 35;
  else if (protein < 12) macroScore -= 25;
  else if (protein < 18) macroScore -= 12;
  else if (protein < 25) macroScore -= 4;
  // >=25g: no penalty

  // CARB QUALITY — fiber-to-carb ratio instead of raw carb share, gated by
  // absolute carb load (see file header for why the gate matters).
  const carbToFiberRatio = carbs > 0 ? carbs / Math.max(fiber, 0.5) : 0;
  if (carbs >= 20) {
    if (carbToFiberRatio > 15) macroScore -= 25;
    else if (carbToFiberRatio > 10) macroScore -= 15;
    else if (carbToFiberRatio > 6) macroScore -= 5;
  }

  // FAT — absolute grams, softer than the old %-based check. Some fat
  // matters for satiety/absorption; a meal being carb-and-protein-forward
  // with only trace fat isn't automatically a defect at the single-meal
  // level.
  if (fat < 1) macroScore -= 15;
  else if (fat < 4) macroScore -= 10;
  else if (fat < 8) macroScore -= 5;
  else if (fat > 45) macroScore -= 15;
  // 8-45g: no penalty

  // SODIUM — previously not factored into the score at all. ~2300mg/day is
  // the common upper-limit guideline; these tiers treat roughly a third of
  // that as the top of a "normal for one meal" range.
  if (sodium > 1200) macroScore -= 25;
  else if (sodium > 800) macroScore -= 15;
  else if (sodium > 400) macroScore -= 5;
  // <=400mg: no penalty

  macroScore = Math.max(0, macroScore);

  // =========================================================================
  // 2. FIBER SCORE (20% weight) - Important for gut health
  // =========================================================================
  // 8g fiber per meal = excellent (3 meals = 24g daily)
  const fiberScore = Math.min(100, (fiber / 8) * 100);

  // =========================================================================
  // 3. SUGAR SCORE (15% weight) - Penalize added sugars
  // =========================================================================
  // <5g sugar = 100%, >25g = 0%
  const sugarScore = Math.max(0, 100 - (sugar / 25) * 100);

  // =========================================================================
  // 4. CONFIDENCE MODIFIER (5% weight) - Minor adjustment, NOT primary factor
  // =========================================================================
  const confidence = item.confidence || 0.7;
  const confidenceModifier = confidence >= 0.7 ? 100 : confidence * 143; // 0.7+ = full score

  // =========================================================================
  // 5. MICRONUTRIENT BONUS (up to 10 points) - Rewards nutrient-dense meals
  // =========================================================================
  const microBonus = calculateMicroBonus(item.micros);

  // =========================================================================
  // CALCULATE FINAL SCORE
  // =========================================================================
  const baseScore =
    macroScore * 0.55 +
    fiberScore * 0.20 +
    sugarScore * 0.15 +
    confidenceModifier * 0.05;

  const finalScore = Math.min(100, baseScore + microBonus);

  return Math.round(finalScore);
}

export function getScoreLabel(score) {
  if (score >= 80) return { label: 'Excellent', color: '#10B981' };
  if (score >= 60) return { label: 'Good', color: '#3B82F6' };
  if (score >= 40) return { label: 'Fair', color: '#F59E0B' };
  return { label: 'Poor', color: '#EF4444' };
}

export function getArcColor(score) {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#3B82F6'; // Blue
  if (score >= 40) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}
