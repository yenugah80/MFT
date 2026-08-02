/**
 * Tests for the derived hydration target.
 *
 * This replaced a hardcoded `waterLiters = 2.0` for every user, so the things
 * worth pinning down are: that body weight and activity actually move the
 * number, that the food-water share is removed (we track drinks, not total
 * water), and that the safety clamp holds at both ends.
 */

import {
  calculateWaterTarget,
  calculateNutritionTargets,
  WATER_GOAL_BOUNDS,
} from '../utils/onboardingCalculations';

describe('calculateWaterTarget', () => {
  it('scales with body weight', () => {
    const light = calculateWaterTarget({ weightKg: 55, age: 30, activityLevel: 'sedentary' });
    const heavy = calculateWaterTarget({ weightKg: 95, age: 30, activityLevel: 'sedentary' });

    expect(heavy.waterLiters).toBeGreaterThan(light.waterLiters);
  });

  it('excludes the food-water share rather than returning a total-water figure', () => {
    // 70kg x 35 ml/kg = 2450 ml total water; minus the ~20% from food = 1960 ml
    const { waterLiters } = calculateWaterTarget({
      weightKg: 70,
      age: 30,
      activityLevel: 'sedentary',
    });

    expect(waterLiters).toBeCloseTo(2.0, 1);
  });

  it('adds fluid for activity', () => {
    const sedentary = calculateWaterTarget({ weightKg: 70, age: 30, activityLevel: 'sedentary' });
    const active = calculateWaterTarget({ weightKg: 70, age: 30, activityLevel: 'very_active' });

    // 60 min/day => 2 x 350ml
    expect(active.waterLiters - sedentary.waterLiters).toBeCloseTo(0.7, 1);
  });

  it('lowers the per-kg baseline for older adults', () => {
    const younger = calculateWaterTarget({ weightKg: 70, age: 40, activityLevel: 'sedentary' });
    const older = calculateWaterTarget({ weightKg: 70, age: 70, activityLevel: 'sedentary' });

    expect(older.waterLiters).toBeLessThan(younger.waterLiters);
  });

  it('clamps to the safety band at both ends', () => {
    const tiny = calculateWaterTarget({ weightKg: 35, age: 80, activityLevel: 'sedentary' });
    const huge = calculateWaterTarget({ weightKg: 200, age: 25, activityLevel: 'extremely_active' });

    expect(tiny.waterLiters).toBe(WATER_GOAL_BOUNDS.minLiters);
    expect(tiny.rationale.wasClamped).toBe(true);
    expect(huge.waterLiters).toBe(WATER_GOAL_BOUNDS.maxLiters);
    expect(huge.rationale.wasClamped).toBe(true);
  });

  it('never returns a target outside the safety band across a wide sweep', () => {
    const activityLevels = [
      'sedentary',
      'lightly_active',
      'moderate',
      'very_active',
      'extremely_active',
    ];

    for (let weightKg = 35; weightKg <= 200; weightKg += 5) {
      for (let age = 16; age <= 90; age += 2) {
        for (const activityLevel of activityLevels) {
          const { waterLiters } = calculateWaterTarget({ weightKg, age, activityLevel });
          expect(waterLiters).toBeGreaterThanOrEqual(WATER_GOAL_BOUNDS.minLiters);
          expect(waterLiters).toBeLessThanOrEqual(WATER_GOAL_BOUNDS.maxLiters);
          expect(Number.isFinite(waterLiters)).toBe(true);
        }
      }
    }
  });

  it('falls back to the moderate bucket for an unknown activity level', () => {
    const unknown = calculateWaterTarget({ weightKg: 70, age: 30, activityLevel: 'nonsense' });
    const moderate = calculateWaterTarget({ weightKg: 70, age: 30, activityLevel: 'moderate' });

    expect(unknown.waterLiters).toBe(moderate.waterLiters);
  });
});

describe('calculateNutritionTargets water goal', () => {
  const base = {
    age: 30,
    heightCm: 175,
    gender: 'male',
    primaryGoal: 'maintain',
  };

  it('no longer hands every user the same 2.0L', () => {
    const light = calculateNutritionTargets({
      ...base,
      weightKg: 55,
      activityLevel: 'sedentary',
    });
    const heavy = calculateNutritionTargets({
      ...base,
      weightKg: 95,
      activityLevel: 'very_active',
    });

    expect(light.waterLiters).not.toBe(heavy.waterLiters);
  });

  it('exposes a rationale the UI can show instead of asserting a number', () => {
    const targets = calculateNutritionTargets({
      ...base,
      weightKg: 78,
      activityLevel: 'moderate',
    });

    expect(targets.waterRationale).toBeDefined();
    expect(targets.waterRationale.summary).toContain('78kg');
    expect(targets.waterRationale.mlPerKg).toBe(35);
  });

  it('stays within the range the profile validator accepts', () => {
    // profileValidation.js rejects anything outside 0.5-20 L; onboarding
    // validation is tighter at 0.5-10 L.
    const targets = calculateNutritionTargets({
      ...base,
      weightKg: 150,
      activityLevel: 'extremely_active',
    });

    expect(targets.waterLiters).toBeGreaterThan(0.5);
    expect(targets.waterLiters).toBeLessThan(10);
  });
});
