#!/usr/bin/env node
/**
 * Macro-Consistency Reconciliation Harness — deterministic, no-network test of
 * `SmartNutritionResolver._validateMacros`'s reconciliation rule.
 *
 * BACKGROUND: the accuracy eval (nutritionAccuracyEval.mjs) found ~15% of live
 * estimates have calories that don't reconcile with their stated macros (Atwater
 * check). `_validateMacros` used to only WARN on this — it never corrected anything,
 * so the bad number shipped to the user unchanged. This harness locks in the fix:
 *   - Genuine mismatch (no alcohol/sugar-alcohol involved) → RECONCILE: recompute
 *     calories_kcal from the macros via Atwater, flag macroReconciled=true.
 *   - Mismatch explained by alcohol or sugar alcohols (not tracked as their own macro
 *     field, so a mismatch there is EXPECTED) → do NOT reconcile, keep the existing
 *     warn-only/validationPassed=false behavior.
 *   - Consistent macros → untouched, validationPassed=true.
 *
 * Pure computation, no OpenAI/DB/Redis calls — safe for CI/deploy gating.
 * USAGE: node scripts/nutritionMacroReconciliationHarness.mjs
 */

import 'dotenv/config';
import { smartNutritionResolver } from '../src/services/smartNutritionResolver.js';

const resolver = smartNutritionResolver;

// [label, estimation, expectation]
const CASES = [
  {
    label: 'Consistent macros — no reconciliation needed',
    estimation: {
      foodName: 'Grilled chicken breast',
      macros: { calories_kcal: 290, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 0 },
    },
    expect: { reconciled: false, validationPassed: true },
  },
  {
    label: 'Genuine mismatch, no alcohol — should RECONCILE',
    // Atwater: 20*4 + 30*4 + 10*9 = 290, but stated total is wildly off (900)
    estimation: {
      foodName: 'Chicken curry',
      macros: { calories_kcal: 900, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 0 },
    },
    expect: { reconciled: true, validationPassed: true, reconciledCalories: 290 },
  },
  {
    label: 'High-fiber dish, mismatch within tolerance — no reconciliation',
    // Atwater: 10*4 + (40-15)*4 + 15*2 + 5*9 = 40+100+30+45 = 215; stated 240 is within 15%
    estimation: {
      foodName: 'Lentil salad',
      macros: { calories_kcal: 240, protein_g: 10, carbs_g: 40, fat_g: 5, fiber_g: 15 },
    },
    expect: { reconciled: false, validationPassed: true },
  },
  {
    label: 'Alcoholic drink, mismatch — should NOT reconcile (ethanol not tracked)',
    // Atwater from carbs/protein/fat alone will under-count; that's expected for beer.
    estimation: {
      foodName: 'Beer',
      macros: { calories_kcal: 150, protein_g: 1.6, carbs_g: 13, fat_g: 0, fiber_g: 0 },
    },
    expect: { reconciled: false, validationPassed: false },
  },
  {
    label: 'Rum cake (alcohol in dish name), mismatch — should NOT reconcile',
    estimation: {
      foodName: 'Rum cake',
      macros: { calories_kcal: 420, protein_g: 4, carbs_g: 45, fat_g: 15, fiber_g: 1 },
    },
    expect: { reconciled: false, validationPassed: false },
  },
  {
    label: 'Keto brownie (sugar alcohol), mismatch — should NOT reconcile',
    estimation: {
      foodName: 'Keto brownie',
      macros: { calories_kcal: 90, protein_g: 3, carbs_g: 25, fat_g: 8, fiber_g: 2 },
    },
    expect: { reconciled: false, validationPassed: false },
  },
];

let failures = 0;

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  MACRO-CONSISTENCY RECONCILIATION HARNESS');
console.log('═══════════════════════════════════════════════════════════');

for (const { label, estimation, expect } of CASES) {
  const originalCalories = estimation.macros.calories_kcal;
  resolver._validateMacros(estimation);

  const reconciled = !!estimation.macroReconciled;
  const validationPassed = !!estimation.validationPassed;

  let ok = reconciled === expect.reconciled && validationPassed === expect.validationPassed;
  if (ok && expect.reconciledCalories != null) {
    ok = estimation.macros.calories_kcal === expect.reconciledCalories;
  }
  if (ok && !expect.reconciled) {
    // Must NOT have mutated calories when we didn't expect reconciliation.
    ok = estimation.macros.calories_kcal === originalCalories;
  }

  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) {
    failures++;
    console.log(
      `      got: reconciled=${reconciled} validationPassed=${validationPassed} ` +
      `calories=${estimation.macros.calories_kcal} (was ${originalCalories})`
    );
    console.log(`      expected: ${JSON.stringify(expect)}`);
  }
}

console.log('───────────────────────────────────────────────────────────');
if (failures === 0) {
  console.log('  ✅ PASS — macro reconciliation rule behaves as specified\n');
  process.exit(0);
} else {
  console.log(`  ❌ FAIL — ${failures}/${CASES.length} case(s) did not match expectations\n`);
  process.exit(1);
}
