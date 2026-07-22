#!/usr/bin/env node
/**
 * Nutrition Plausibility Harness — accuracy regression guard
 * ==========================================================
 *
 * WHY THIS MATTERS MORE THAN THE CHECK ITSELF
 * The models are good; the durable lever is (1) giving them the right CONTEXT and
 * (2) continuously VERIFYING output against known-good values. Heuristic bands are
 * brittle — they drift and produce false positives (this harness was written after
 * an early version wrongly flagged sambar, miso soup, palak paneer, and falafel).
 * A committed golden-set harness turns "we think it's accurate" into a measurable,
 * regression-gated fact.
 *
 * WHAT IT CHECKS (deterministic, offline, no network, <2ms/case)
 *   1. NO FALSE POSITIVES on legitimate dishes across world cuisines — the cardinal
 *      rule: never tell a user their culture's real food is "wrong". This is a hard
 *      gate; any false positive fails the run.
 *   2. Detection of the real error patterns (2x under/over-estimates, impossible
 *      densities) that motivated the check — including the original "Semiya upma @
 *      87 kcal/100g" production bug.
 *
 * HOW TO USE
 *   node scripts/nutritionPlausibilityHarness.mjs         # run, print report
 *   npm run harness:nutrition                              # same via package script
 *   Exit code 0 = all guarantees hold; 1 = a regression (wire into CI).
 *
 * HOW TO EXTEND
 *   Add rows to LEGIT_FOODS (real dishes + realistic kcal/100g) or ERROR_CASES
 *   (name + wrong value + why). When a user reports a bad estimate, add it here first
 *   as a failing case, then fix — so it can never silently regress again.
 */

import { checkNutritionPlausibility } from '../src/services/nutritionPlausibilityChecker.js';

// ── Golden set: legitimate dishes at realistic per-100g calorie densities ──
// Sources: USDA FoodData Central, published regional nutrition tables. Values are
// mid-range realistic densities for a typical home/restaurant preparation.
const LEGIT_FOODS = [
  // Indian / South Asian
  ['Semiya upma', 175, 'indian'], ['Poha', 160, 'indian'], ['Masala dosa', 168, 'indian'],
  ['Idli', 135, 'indian'], ['Sambar', 55, 'indian'], ['Rasam', 35, 'indian'],
  ['Dal tadka', 120, 'indian'], ['Rajma', 130, 'indian'], ['Chana masala', 140, 'indian'],
  ['Chicken biryani', 200, 'indian'], ['Veg pulao', 180, 'indian'], ['Paneer butter masala', 260, 'indian'],
  ['Palak paneer', 150, 'indian'], ['Paneer tikka masala', 210, 'indian'], ['Chicken tikka masala', 175, 'indian'],
  ['Aloo gobi', 110, 'indian'], ['Roti', 300, 'indian'], ['Plain paratha', 330, 'indian'],
  ['Samosa', 300, 'indian'], ['Gulab jamun', 320, 'indian'], ['Kheer', 145, 'indian'],
  // East / Southeast Asian
  ['Beef pho', 65, 'vietnamese'], ['Chicken ramen', 90, 'japanese'], ['Miso soup', 40, 'japanese'],
  ['Chicken katsu', 250, 'japanese'], ['Salmon sashimi', 145, 'japanese'], ['Gyoza', 220, 'japanese'],
  ['Pad thai', 200, 'thai'], ['Tom yum soup', 60, 'thai'], ['Green curry chicken', 130, 'thai'],
  ['Nasi goreng', 185, 'indonesian'], ['Bibimbap', 145, 'korean'], ['Kimchi', 30, 'korean'],
  ['Fried rice', 190, 'chinese'], ['Chow mein', 210, 'chinese'], ['Congee', 60, 'chinese'],
  ['Xiao long bao', 240, 'chinese'], ['Steamed white rice', 130, 'asian'],
  // Middle Eastern / Mediterranean
  ['Falafel', 330, 'middle-eastern'], ['Hummus', 175, 'middle-eastern'], ['Chicken shawarma', 220, 'middle-eastern'],
  ['Beef kebab', 250, 'middle-eastern'], ['Tabbouleh', 90, 'middle-eastern'], ['Baklava', 430, 'middle-eastern'],
  ['Greek salad', 90, 'greek'], ['Chicken gyro', 220, 'greek'], ['Baba ganoush', 120, 'middle-eastern'],
  // Latin American
  ['Beef tacos', 210, 'mexican'], ['Chicken burrito', 200, 'mexican'], ['Carne asada', 240, 'mexican'],
  ['Guacamole', 160, 'mexican'], ['Tamale', 190, 'mexican'], ['Empanada', 290, 'latin'],
  ['Arepa', 260, 'latin'], ['Refried beans', 120, 'mexican'], ['Pozole', 90, 'mexican'],
  // African
  ['Jollof rice', 190, 'west-african'], ['Injera', 210, 'ethiopian'], ['Fufu', 160, 'west-african'],
  ['Egusi soup', 150, 'nigerian'], ['Bobotie', 200, 'south-african'],
  // European / American
  ['Spaghetti bolognese', 160, 'italian'], ['Margherita pizza', 260, 'italian'], ['Risotto', 165, 'italian'],
  ['Lasagna', 180, 'italian'], ['Grilled chicken breast', 165, 'american'], ['Caesar salad', 190, 'american'],
  ['Oatmeal', 70, 'american'], ['Greek yogurt', 60, 'american'], ['Cheddar cheese', 400, 'american'],
  // Single ingredients / edge densities
  ['Olive oil', 884, 'ingredient'], ['Almonds', 580, 'ingredient'], ['Apple', 52, 'fruit'],
  ['Banana', 89, 'fruit'], ['Broccoli', 34, 'vegetable'], ['Chicken broth', 15, 'ingredient'],
];

// ── Error cases: implausible values the harness MUST catch ──
const ERROR_CASES = [
  ['Semiya upma', 87, 'THE PRODUCTION BUG — tempered grain dish at ~half plausible density'],
  ['Chicken breast', 25, 'protein at broth density — physically impossible'],
  ['Fried rice', 40, 'oily grain dish at ~1/5 plausible'],
  ['Plain paratha', 90, 'deep-fried flatbread at ~1/3 density'],
  ['Olive oil', 200, 'oil should be ~880 kcal/100g'],
  ['Chicken biryani', 55, 'rich rice dish reading like broth'],
  ['Beef kebab', 60, 'grilled fatty meat at soup density'],
  ['Almonds', 120, 'nuts should be ~580'],
];

function pct(n, d) { return d === 0 ? '0.0' : ((n / d) * 100).toFixed(1); }

function run() {
  const t0 = performance.now();
  let falsePositives = [];
  let missed = [];
  const byTier = {};

  for (const [name, kcal, cuisine] of LEGIT_FOODS) {
    const r = checkNutritionPlausibility({ foodName: name, macros: { calories_kcal: kcal }, servingGrams: 100 });
    byTier[r.tier] = (byTier[r.tier] || 0) + 1;
    if (!r.plausible) falsePositives.push({ name, kcal, cuisine, r });
  }
  for (const [name, kcal, why] of ERROR_CASES) {
    const r = checkNutritionPlausibility({ foodName: name, macros: { calories_kcal: kcal }, servingGrams: 100 });
    if (r.plausible) missed.push({ name, kcal, why, r });
  }
  const elapsed = performance.now() - t0;
  const totalChecks = LEGIT_FOODS.length + ERROR_CASES.length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  NUTRITION PLAUSIBILITY HARNESS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Legit dishes tested:  ${LEGIT_FOODS.length}  (across ~20 cuisines)`);
  console.log(`  Error cases tested:   ${ERROR_CASES.length}`);
  console.log(`  Latency:              ${elapsed.toFixed(2)}ms total, ${(elapsed / totalChecks).toFixed(3)}ms/check`);
  console.log(`  Tier distribution:    ${Object.entries(byTier).map(([k, v]) => `${k}=${v}`).join('  ')}`);
  console.log('───────────────────────────────────────────────────────────');
  console.log(`  FALSE POSITIVE RATE:  ${pct(falsePositives.length, LEGIT_FOODS.length)}%  (${falsePositives.length}/${LEGIT_FOODS.length})   [must be 0.0%]`);
  console.log(`  ERROR DETECTION RATE: ${pct(ERROR_CASES.length - missed.length, ERROR_CASES.length)}%  (${ERROR_CASES.length - missed.length}/${ERROR_CASES.length})`);
  console.log('───────────────────────────────────────────────────────────');

  if (falsePositives.length) {
    console.log('  ❌ FALSE POSITIVES (legit food wrongly flagged — CARDINAL FAILURE):');
    for (const { name, kcal, cuisine, r } of falsePositives) {
      console.log(`     ${name} (${cuisine}) @ ${kcal} → flagged. tier=${r.tier} expected=${r.expectedRange.min}-${r.expectedRange.max}`);
    }
  }
  if (missed.length) {
    console.log('  ⚠️  MISSED ERRORS (implausible value not caught):');
    for (const { name, kcal, why } of missed) {
      console.log(`     ${name} @ ${kcal} — ${why}`);
    }
  }

  const pass = falsePositives.length === 0 && missed.length === 0;
  console.log('═══════════════════════════════════════════════════════════');
  console.log(pass ? '  ✅ PASS — all accuracy guarantees hold' : '  ❌ FAIL — regression detected');
  console.log('═══════════════════════════════════════════════════════════\n');
  return pass ? 0 : 1;
}

process.exit(run());
