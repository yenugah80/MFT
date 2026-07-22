#!/usr/bin/env node
/**
 * Nutrition Accuracy Eval — measures how well real AI estimates match plausible
 * per-100g calorie densities across world cuisines, using RANGES (not point values).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GROUND-TRUTH HONESTY (read this before trusting any number below)
 * ─────────────────────────────────────────────────────────────────────────────
 * Variable dishes (pho, ramen, katsu, paratha, curry) do NOT have a single correct
 * calorie value — preparation, oil, and portion move them by 2x+. So this eval does
 * NOT compare against a single number. Each dish has a documented ACCEPTABLE RANGE
 * (typical home/restaurant prep, per 100g). The primary metric is "within range",
 * which honestly measures "did the estimate land in a plausible zone" rather than
 * "did it hit a fabricated point value".
 *
 * These ranges are hand-curated approximations from general nutrition knowledge, NOT
 * a certified benchmark. This is a DIRECTIONAL smoke test for regressions and gross
 * errors — not evidence of absolute accuracy. A production benchmark needs sourced,
 * documented references (USDA/NCCDB) with recipe + serving definitions and n≥several
 * hundred. Treat single-digit metric moves as noise.
 *
 * DIFFERENT FROM nutritionPlausibilityHarness.mjs (the CI gate): that one is
 * deterministic and tests the CHECKER. THIS calls the real AI pipeline (network +
 * OpenAI cost, non-deterministic — OpenAI output varies run to run), so it is
 * deliberately OUT of CI. Run on demand.
 *
 * USAGE
 *   npm run eval:nutrition                 # full set
 *   node scripts/nutritionAccuracyEval.mjs --limit 15
 *   ENABLE_DENSITY_CALIBRATION=false node scripts/nutritionAccuracyEval.mjs   # A/B off
 * Requires backend/.env with DATABASE_URL + a FUNDED OPENAI_API_KEY.
 */

import 'dotenv/config';

// [dish, minDensity, maxDensity, cuisine]  — kcal per 100g acceptable range.
// Ranges are intentionally wide for dishes whose preparation varies a lot.
const REFERENCE_RANGES = [
  ['Semiya upma', 150, 230, 'indian'], ['Poha', 130, 200, 'indian'], ['Masala dosa', 150, 220, 'indian'],
  ['Idli', 110, 160, 'indian'], ['Chicken biryani', 170, 250, 'indian'], ['Dal tadka', 90, 160, 'indian'],
  ['Palak paneer', 120, 190, 'indian'], ['Chana masala', 110, 180, 'indian'], ['Plain paratha', 280, 360, 'indian'],
  ['Rajma', 100, 160, 'indian'], ['Aloo gobi', 80, 150, 'indian'],
  ['Beef pho', 45, 95, 'vietnamese'], ['Chicken ramen', 70, 130, 'japanese'], ['Chicken katsu', 230, 360, 'japanese'],
  ['Salmon sushi', 120, 180, 'japanese'], ['Miso soup', 25, 70, 'japanese'],
  ['Pad thai', 150, 260, 'thai'], ['Green curry chicken', 100, 170, 'thai'], ['Tom yum soup', 30, 90, 'thai'],
  ['Bibimbap', 110, 190, 'korean'], ['Kimchi', 15, 60, 'korean'],
  ['Fried rice', 150, 240, 'chinese'], ['Chow mein', 160, 260, 'chinese'], ['Congee', 40, 90, 'chinese'],
  ['Falafel', 270, 380, 'middle-eastern'], ['Hummus', 140, 220, 'middle-eastern'], ['Chicken shawarma', 180, 280, 'middle-eastern'],
  ['Tabbouleh', 50, 130, 'middle-eastern'],
  ['Beef tacos', 170, 260, 'mexican'], ['Chicken burrito', 160, 250, 'mexican'], ['Guacamole', 120, 200, 'mexican'],
  ['Jollof rice', 150, 240, 'west-african'], ['Injera', 160, 250, 'ethiopian'],
  ['Spaghetti bolognese', 120, 210, 'italian'], ['Margherita pizza', 220, 300, 'italian'], ['Risotto', 130, 210, 'italian'],
  ['Grilled chicken breast', 130, 200, 'american'], ['Greek salad', 60, 130, 'greek'], ['Oatmeal', 50, 100, 'american'],
  ['Apple', 45, 60, 'fruit'], ['Almonds', 550, 620, 'ingredient'],
];

const MIN_CUISINE_N = 5; // don't report a cuisine average below this — too noisy

function arg(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }
function median(xs) { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function confBucket(c) { const n = c > 1 ? c / 100 : c; return n >= 0.85 ? 'high' : n >= 0.6 ? 'med' : 'low'; }

async function main() {
  const limit = parseInt(arg('--limit', String(REFERENCE_RANGES.length)), 10);
  const set = REFERENCE_RANGES.slice(0, limit);
  const calibration = process.env.ENABLE_DENSITY_CALIBRATION !== 'false';
  console.log(`\nNutrition Accuracy Eval — ${set.length} dishes (ranges), calibration=${calibration ? 'ON' : 'OFF'}\n`);

  const { smartNutritionResolver } = await import('../src/services/smartNutritionResolver.js');
  const rows = [];

  for (const [dish, lo, hi, cuisine] of set) {
    try {
      const r = await smartNutritionResolver.resolveFood(dish, '100 g');
      const m = r?.macros || {};
      const cals = m.calories_kcal;
      const grams = r?.servingGrams > 0 ? r.servingGrams : 100;
      if (typeof cals !== 'number') { console.log(`  ⚠️  ${dish}: no estimate (unresolved)`); rows.push({ dish, cuisine, resolved: false }); continue; }
      const density = (cals / grams) * 100;
      const mid = (lo + hi) / 2;
      const inRange = density >= lo && density <= hi;
      const rangeExceed = inRange ? 0 : Math.min(Math.abs(density - lo), Math.abs(density - hi)); // kcal outside plausible zone
      const pctErrVsMid = Math.abs(density - mid) / mid * 100;
      // Macro consistency (Atwater, fiber at 2 kcal/g), tolerate ±12%.
      const p = m.protein_g || 0, c = m.carbs_g || 0, f = m.fat_g || 0, fib = m.fiber_g || 0;
      const atwater = p * 4 + Math.max(0, c - fib) * 4 + fib * 2 + f * 9;
      const macroConsistent = cals > 0 ? Math.abs(cals - atwater) / cals <= 0.12 : false;
      const conf = confBucket(r.confidence ?? r.sourceConfidence ?? 0.7);
      rows.push({ dish, cuisine, resolved: true, density: Math.round(density), lo, hi, inRange, rangeExceed, pctErrVsMid, macroConsistent, conf, corrected: !!r.correctionApplied });
      const mark = inRange ? '✅' : rangeExceed <= mid * 0.15 ? '🟡' : '❌';
      console.log(`  ${mark} ${dish.padEnd(24)} est=${String(Math.round(density)).padStart(4)}  range=${lo}-${hi}${inRange ? '' : `  (+${Math.round(rangeExceed)} out)`}  ${macroConsistent ? '' : '⚠macro'}${r.correctionApplied ? ' [corrected]' : ''}`);
    } catch (e) { console.log(`  ⚠️  ${dish}: ${e.message}`); rows.push({ dish, cuisine, resolved: false }); }
  }

  const resolved = rows.filter(r => r.resolved);
  if (!resolved.length) { console.log('\nNo results (check OPENAI_API_KEY funding).'); process.exit(1); }
  const inRange = resolved.filter(r => r.inRange).length;
  const exceed = resolved.filter(r => !r.inRange).map(r => r.rangeExceed);
  const pctErrs = resolved.map(r => r.pctErrVsMid);
  const macroOk = resolved.filter(r => r.macroConsistent).length;

  console.log('\n───────────────────────────────────────────────');
  console.log(`  Coverage (resolved):        ${resolved.length}/${rows.length}`);
  console.log(`  WITHIN acceptable range:    ${inRange}/${resolved.length} (${(inRange / resolved.length * 100).toFixed(0)}%)   ← primary metric`);
  console.log(`  Mean kcal outside range:    ${exceed.length ? (exceed.reduce((a, b) => a + b, 0) / exceed.length).toFixed(0) : 0} kcal (over ${exceed.length} misses)`);
  console.log(`  Median % err vs midpoint:   ${median(pctErrs).toFixed(0)}%   (robust; MAPE=${(pctErrs.reduce((a, b) => a + b, 0) / pctErrs.length).toFixed(0)}% shown for reference only)`);
  console.log(`  Macro consistency (Atwater):${macroOk}/${resolved.length} (${(macroOk / resolved.length * 100).toFixed(0)}%)`);
  console.log(`  Corrections fired:          ${resolved.filter(r => r.corrected).length}`);
  // Confidence grouping
  console.log('  Within-range by confidence:');
  for (const b of ['high', 'med', 'low']) {
    const g = resolved.filter(r => r.conf === b);
    if (g.length) console.log(`     ${b.padEnd(5)} ${g.filter(r => r.inRange).length}/${g.length} in range`);
  }
  // Per-cuisine only when n is large enough to mean anything
  console.log(`  Per cuisine (only n≥${MIN_CUISINE_N}):`);
  const byC = {}; for (const r of resolved) (byC[r.cuisine] ||= []).push(r);
  const reported = Object.entries(byC).filter(([, g]) => g.length >= MIN_CUISINE_N);
  if (!reported.length) console.log(`     (no cuisine has n≥${MIN_CUISINE_N} in this run — use a larger --limit)`);
  for (const [c, g] of reported) console.log(`     ${c.padEnd(16)} ${g.filter(r => r.inRange).length}/${g.length} in range`);
  console.log('───────────────────────────────────────────────');
  console.log('  NOTE: ranges are curated approximations, not a certified benchmark.');
  console.log('  This is a directional smoke test — not proof of absolute accuracy.\n');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
