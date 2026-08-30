import { calculateMealScore, getScoreLabel, getArcColor } from '../components/log/MealSummary/mealScoring';

function item(macros, extra = {}) {
  return { macros, micros: extra.micros || {}, confidence: extra.confidence ?? 0.7 };
}

describe('calculateMealScore — edge cases', () => {
  it('returns 50 for a null/missing item', () => {
    expect(calculateMealScore(null)).toBe(50);
    expect(calculateMealScore(undefined)).toBe(50);
  });

  it('returns 50 when calories are 0 or missing (no data to score)', () => {
    expect(calculateMealScore(item({ calories_kcal: 0, protein_g: 10 }))).toBe(50);
    expect(calculateMealScore(item({}))).toBe(50);
  });

  it('never returns below 0 or above 100', () => {
    const terrible = item({ calories_kcal: 500, protein_g: 0, carbs_g: 100, fat_g: 0, fiber_g: 0, sugar_g: 100, sodium_mg: 3000 });
    const score = calculateMealScore(terrible);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('calculateMealScore — the Phase 2 calibration cases (real validated numbers)', () => {
  it('rice + tomato dal: fiber-rich, protein-adequate carb-forward meal scores Excellent, not Fair', () => {
    const score = calculateMealScore(item(
      { calories_kcal: 385, protein_g: 14, carbs_g: 75, fat_g: 3, fiber_g: 8.6, sugar_g: 4.1, sodium_mg: 750 },
      { confidence: 0.6, micros: { vitaminA: 300, folate: 90, calcium: 45, iron: 1.9 } }
    ));
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('a packaged granola bar (low protein, low fiber, high sugar) scores Poor, not Fair', () => {
    const score = calculateMealScore(item(
      { calories_kcal: 190, protein_g: 4, carbs_g: 29, fat_g: 7, fiber_g: 1, sugar_g: 15, sodium_mg: 140 },
      { confidence: 0.7, micros: { iron: 0.8 } }
    ));
    expect(score).toBeLessThan(40);
  });

  it('skim milk (naturally fiber-free lactose, low carb load) is NOT penalized as poor-quality carbs', () => {
    const score = calculateMealScore(item(
      { calories_kcal: 83, protein_g: 8.3, carbs_g: 12, fat_g: 0, fiber_g: 0, sugar_g: 12, sodium_mg: 103 },
      { confidence: 0.8, micros: { calcium: 299, vitaminD: 2.9, vitaminB12: 1.1 } }
    ));
    expect(score).toBeGreaterThanOrEqual(40); // Fair or better, not Poor
  });

  it('grilled chicken + quinoa (already well-balanced) scores at least as well as before', () => {
    const score = calculateMealScore(item(
      { calories_kcal: 453, protein_g: 51, carbs_g: 39, fat_g: 8.6, fiber_g: 5.2, sugar_g: 1.6, sodium_mg: 117 },
      { confidence: 0.8, micros: { vitaminB12: 0.3, zinc: 1.3, iron: 2.8 } }
    ));
    expect(score).toBeGreaterThanOrEqual(80);
  });
});

describe('calculateMealScore — protein adequacy is absolute-gram based', () => {
  it('25g+ protein takes no protein penalty regardless of meal composition', () => {
    const withHighProtein = calculateMealScore(item({ calories_kcal: 400, protein_g: 30, carbs_g: 40, fat_g: 10, fiber_g: 5, sugar_g: 2, sodium_mg: 200 }));
    const withLowProtein = calculateMealScore(item({ calories_kcal: 400, protein_g: 3, carbs_g: 40, fat_g: 10, fiber_g: 5, sugar_g: 2, sodium_mg: 200 }));
    expect(withHighProtein).toBeGreaterThan(withLowProtein);
  });
});

describe('calculateMealScore — carb-quality gate (absolute carb threshold)', () => {
  it('a meal with <20g total carbs takes no carb-quality penalty even at a bad ratio', () => {
    const lowCarbNoFiber = calculateMealScore(item({ calories_kcal: 200, protein_g: 20, carbs_g: 15, fat_g: 10, fiber_g: 0, sugar_g: 2, sodium_mg: 100 }));
    // Should not be crushed purely for a 0-fiber ratio on a small carb load
    expect(lowCarbNoFiber).toBeGreaterThanOrEqual(50);
  });

  it('a meal with >=20g carbs and a poor fiber ratio DOES take the penalty', () => {
    const highCarbNoFiber = calculateMealScore(item({ calories_kcal: 400, protein_g: 20, carbs_g: 60, fat_g: 10, fiber_g: 0, sugar_g: 2, sodium_mg: 100 }));
    const highCarbGoodFiber = calculateMealScore(item({ calories_kcal: 400, protein_g: 20, carbs_g: 60, fat_g: 10, fiber_g: 10, sugar_g: 2, sodium_mg: 100 }));
    expect(highCarbGoodFiber).toBeGreaterThan(highCarbNoFiber);
  });
});

describe('calculateMealScore — sodium (previously not factored in at all)', () => {
  it('penalizes high sodium (>1200mg) more than moderate sodium', () => {
    const base = { calories_kcal: 400, protein_g: 20, carbs_g: 40, fat_g: 15, fiber_g: 5, sugar_g: 5 };
    const highSodium = calculateMealScore(item({ ...base, sodium_mg: 1500 }));
    const lowSodium = calculateMealScore(item({ ...base, sodium_mg: 100 }));
    expect(lowSodium).toBeGreaterThan(highSodium);
  });

  it('does not penalize sodium at or below 400mg', () => {
    const base = { calories_kcal: 400, protein_g: 20, carbs_g: 40, fat_g: 15, fiber_g: 5, sugar_g: 5 };
    const at400 = calculateMealScore(item({ ...base, sodium_mg: 400 }));
    const at100 = calculateMealScore(item({ ...base, sodium_mg: 100 }));
    expect(at400).toBe(at100);
  });
});

describe('getScoreLabel / getArcColor — unchanged thresholds', () => {
  it('labels match the same 80/60/40 cutoffs as before', () => {
    expect(getScoreLabel(85).label).toBe('Excellent');
    expect(getScoreLabel(65).label).toBe('Good');
    expect(getScoreLabel(45).label).toBe('Fair');
    expect(getScoreLabel(20).label).toBe('Poor');
  });

  it('arc colors match the label colors', () => {
    expect(getArcColor(85)).toBe(getScoreLabel(85).color);
    expect(getArcColor(20)).toBe(getScoreLabel(20).color);
  });
});
