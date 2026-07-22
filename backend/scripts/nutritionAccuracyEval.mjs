#!/usr/bin/env node
/**
 * Nutrition Accuracy Eval — measures how CLOSE real AI estimates land to reference
 * densities, across world cuisines. This is the "every dish accuracy" measurement,
 * and the way to prove the prompt-time density calibration actually helps.
 *
 * DIFFERENT FROM nutritionPlausibilityHarness.mjs:
 *   - That harness is deterministic (no network), tests the CHECKER, gates CI.
 *   - THIS eval calls the REAL AI pipeline (network + OpenAI cost, non-deterministic),
 *     so it is deliberately OUT of CI. Run it on demand to measure/track accuracy.
 *
 * USAGE
 *   node scripts/nutritionAccuracyEval.mjs                    # eval with current config
 *   node scripts/nutritionAccuracyEval.mjs --limit 15        # cheaper subset
 *   ENABLE_DENSITY_CALIBRATION=false node scripts/nutritionAccuracyEval.mjs   # A/B: off
 *   (run once with calibration on, once off — clear Redis between for a clean A/B —
 *    and compare the reported MAE to quantify the lift.)
 *
 * Requires backend/.env with DATABASE_URL + OPENAI_API_KEY.
 *
 * METRIC: for each dish we request a 100g portion, so estimated density = estimated
 * calories (normalized by returned grams). We report mean absolute percentage error
 * (MAPE) vs. a reference density, plus the share of dishes within ±15% / ±25%, plus a
 * per-cuisine breakdown so weak cuisines are visible. Reference densities are realistic
 * mid-range values (USDA / published regional tables) — themselves approximate, so
 * treat single-digit MAPE differences as noise and focus on the distribution.
 */

import 'dotenv/config';

// [dish, reference kcal/100g, cuisine]
const GOLDEN = [
  ['Semiya upma', 175, 'indian'], ['Poha', 160, 'indian'], ['Masala dosa', 168, 'indian'],
  ['Idli', 135, 'indian'], ['Chicken biryani', 200, 'indian'], ['Dal tadka', 120, 'indian'],
  ['Palak paneer', 150, 'indian'], ['Chana masala', 140, 'indian'], ['Plain paratha', 330, 'indian'],
  ['Beef pho', 65, 'vietnamese'], ['Chicken ramen', 90, 'japanese'], ['Chicken katsu', 250, 'japanese'],
  ['Pad thai', 200, 'thai'], ['Green curry chicken', 130, 'thai'], ['Bibimbap', 145, 'korean'],
  ['Fried rice', 190, 'chinese'], ['Chow mein', 210, 'chinese'],
  ['Falafel', 330, 'middle-eastern'], ['Hummus', 175, 'middle-eastern'], ['Chicken shawarma', 220, 'middle-eastern'],
  ['Beef tacos', 210, 'mexican'], ['Chicken burrito', 200, 'mexican'], ['Guacamole', 160, 'mexican'],
  ['Jollof rice', 190, 'west-african'], ['Injera', 210, 'ethiopian'],
  ['Spaghetti bolognese', 160, 'italian'], ['Margherita pizza', 260, 'italian'], ['Risotto', 165, 'italian'],
  ['Grilled chicken breast', 165, 'american'], ['Greek salad', 90, 'greek'], ['Oatmeal', 70, 'american'],
];

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function main() {
  const limit = parseInt(arg('--limit', String(GOLDEN.length)), 10);
  const set = GOLDEN.slice(0, limit);
  const calibration = process.env.ENABLE_DENSITY_CALIBRATION !== 'false';

  console.log(`\nNutrition Accuracy Eval — ${set.length} dishes, calibration=${calibration ? 'ON' : 'OFF'}\n`);
  const { smartNutritionResolver } = await import('../src/services/smartNutritionResolver.js');

  const rows = [];
  for (const [dish, refDensity, cuisine] of set) {
    try {
      const r = await smartNutritionResolver.resolveFood(dish, '100 g');
      const cals = r?.macros?.calories_kcal;
      const grams = r?.servingGrams > 0 ? r.servingGrams : 100;
      const density = typeof cals === 'number' ? (cals / grams) * 100 : null;
      if (density == null) { console.log(`  ⚠️  ${dish}: no estimate`); continue; }
      const errPct = Math.abs(density - refDensity) / refDensity * 100;
      rows.push({ dish, cuisine, refDensity, density: Math.round(density), errPct, corrected: !!r.correctionApplied, plausible: r.nutritionPlausible !== false });
      console.log(`  ${errPct <= 15 ? '✅' : errPct <= 25 ? '🟡' : '❌'} ${dish.padEnd(24)} est=${String(Math.round(density)).padStart(4)}  ref=${String(refDensity).padStart(4)}  err=${errPct.toFixed(0).padStart(3)}%${r.correctionApplied ? '  [corrected]' : ''}`);
    } catch (e) {
      console.log(`  ⚠️  ${dish}: ${e.message}`);
    }
  }

  if (!rows.length) { console.log('\nNo results.'); process.exit(1); }
  const mape = rows.reduce((s, r) => s + r.errPct, 0) / rows.length;
  const within15 = rows.filter(r => r.errPct <= 15).length;
  const within25 = rows.filter(r => r.errPct <= 25).length;
  const byCuisine = {};
  for (const r of rows) (byCuisine[r.cuisine] ||= []).push(r.errPct);

  console.log('\n───────────────────────────────────────────');
  console.log(`  MAPE (mean abs % error):  ${mape.toFixed(1)}%`);
  console.log(`  Within ±15%:              ${within15}/${rows.length} (${(within15 / rows.length * 100).toFixed(0)}%)`);
  console.log(`  Within ±25%:              ${within25}/${rows.length} (${(within25 / rows.length * 100).toFixed(0)}%)`);
  console.log(`  Corrections fired:        ${rows.filter(r => r.corrected).length}`);
  console.log('  Per cuisine (avg err%):');
  for (const [c, errs] of Object.entries(byCuisine).sort((a, b) => (b[1].reduce((x, y) => x + y, 0) / b[1].length) - (a[1].reduce((x, y) => x + y, 0) / a[1].length))) {
    console.log(`     ${c.padEnd(16)} ${(errs.reduce((x, y) => x + y, 0) / errs.length).toFixed(0)}%`);
  }
  console.log('───────────────────────────────────────────\n');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
