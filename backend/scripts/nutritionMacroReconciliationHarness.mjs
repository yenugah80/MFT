#!/usr/bin/env node
/**
 * Macro-Consistency Reconciliation Harness — deterministic, no-network test of
 * `checkMacroConsistency` (nutritionPlausibilityChecker.js), the pure decision function
 * behind SmartNutritionResolver._validateMacros's reconciliation rule.
 *
 * BACKGROUND: the accuracy eval (nutritionAccuracyEval.mjs) found ~15% of live
 * estimates have calories that don't reconcile with their stated macros (Atwater
 * check). _validateMacros used to only WARN on this — it never corrected anything, so
 * the bad number shipped to the user unchanged. This harness locks in the fix:
 *   - Genuine mismatch (no alcohol/sugar-alcohol involved) → RECONCILE: recompute
 *     calories_kcal from the macros via Atwater.
 *   - Mismatch explained by alcohol or sugar alcohols (not tracked as their own macro
 *     field, so a mismatch there is EXPECTED) → do NOT reconcile.
 *   - Consistent macros → untouched.
 *
 * IMPORTANT: this imports ONLY nutritionPlausibilityChecker.js, never
 * smartNutritionResolver.js — that module's import graph pulls in USDAClient →
 * config/env.js, which calls process.exit(1) when DATABASE_URL is unset (as it is in
 * CI). Testing the pure decision function directly is what keeps this CI-safe; see the
 * sibling nutritionPlausibilityHarness.mjs for the same pattern.
 *
 * Pure computation, no OpenAI/DB/Redis calls — safe for CI/deploy gating.
 * USAGE: node scripts/nutritionMacroReconciliationHarness.mjs
 */

import { checkMacroConsistency } from '../src/services/nutritionPlausibilityChecker.js';

// [label, estimation, expectation]
const CASES = [
  {
    label: 'Consistent macros — no reconciliation needed',
    estimation: {
      foodName: 'Grilled chicken breast',
      macros: { calories_kcal: 290, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 0 },
    },
    expect: { consistent: true, shouldReconcile: false },
  },
  {
    label: 'Genuine mismatch, no alcohol — should RECONCILE',
    // Atwater: 20*4 + 30*4 + 10*9 = 290, but stated total is wildly off (900)
    estimation: {
      foodName: 'Chicken curry',
      macros: { calories_kcal: 900, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 0 },
    },
    expect: { consistent: false, shouldReconcile: true, calculatedCalories: 290 },
  },
  {
    label: 'High-fiber dish, mismatch within tolerance — no reconciliation',
    // Atwater: 10*4 + (40-15)*4 + 15*2 + 5*9 = 40+100+30+45 = 215; stated 240 is within 15%
    estimation: {
      foodName: 'Lentil salad',
      macros: { calories_kcal: 240, protein_g: 10, carbs_g: 40, fat_g: 5, fiber_g: 15 },
    },
    expect: { consistent: true, shouldReconcile: false },
  },
  {
    label: 'Alcoholic drink, mismatch — should NOT reconcile (ethanol not tracked)',
    estimation: {
      foodName: 'Beer',
      macros: { calories_kcal: 150, protein_g: 1.6, carbs_g: 13, fat_g: 0, fiber_g: 0 },
    },
    expect: { consistent: false, shouldReconcile: false },
  },
  {
    label: 'Rum cake (alcohol in dish name), mismatch — should NOT reconcile',
    estimation: {
      foodName: 'Rum cake',
      macros: { calories_kcal: 420, protein_g: 4, carbs_g: 45, fat_g: 15, fiber_g: 1 },
    },
    expect: { consistent: false, shouldReconcile: false },
  },
  {
    label: 'Keto brownie (sugar alcohol), mismatch — should NOT reconcile',
    estimation: {
      foodName: 'Keto brownie',
      macros: { calories_kcal: 90, protein_g: 3, carbs_g: 25, fat_g: 8, fiber_g: 2 },
    },
    expect: { consistent: false, shouldReconcile: false },
  },
];

let failures = 0;

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  MACRO-CONSISTENCY RECONCILIATION HARNESS');
console.log('═══════════════════════════════════════════════════════════');

for (const { label, estimation, expect } of CASES) {
  const result = checkMacroConsistency(estimation);

  let ok = result.consistent === expect.consistent && result.shouldReconcile === expect.shouldReconcile;
  if (ok && expect.calculatedCalories != null) {
    ok = result.calculatedCalories === expect.calculatedCalories;
  }

  console.log(`  ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) {
    failures++;
    console.log(`      got: ${JSON.stringify(result)}`);
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
