import { reconcileComponentTotals } from '../src/utils/reconcileComponents.js';

describe('reconcileComponentTotals', () => {
  it('rescales components proportionally when they diverge from the total by more than the tolerance', () => {
    // Live case: "chicken gravy curry" — chicken breast 165 kcal + curry
    // sauce 60 kcal = 225, against a 180 kcal item total (25% discrepancy).
    const components = [
      { name: 'Chicken breast', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      { name: 'Curry sauce', calories: 60, protein: 1, carbs: 5, fat: 4 },
    ];
    const result = reconcileComponentTotals(components, 180);
    const totalCalories = result.reduce((sum, c) => sum + c.calories, 0);
    expect(totalCalories).toBe(180);
    // Proportional share preserved: chicken breast was 165/225 = 73.3% of the total.
    expect(result[0].calories / totalCalories).toBeCloseTo(165 / 225, 1);
  });

  it('scales protein/carbs/fat by the same factor, not just calories', () => {
    const components = [{ name: 'X', calories: 200, protein: 20, carbs: 10, fat: 5 }];
    const result = reconcileComponentTotals(components, 100); // scale = 0.5
    expect(result[0].calories).toBe(100);
    expect(result[0].protein).toBe(10);
    expect(result[0].carbs).toBe(5);
    expect(result[0].fat).toBe(2.5);
  });

  it('leaves components untouched when within tolerance', () => {
    const components = [
      { name: 'A', calories: 100 },
      { name: 'B', calories: 100 },
    ];
    const result = reconcileComponentTotals(components, 195); // ~2.6% discrepancy
    expect(result).toBe(components);
  });

  it('leaves components untouched when totalCalories is missing or zero', () => {
    const components = [{ name: 'A', calories: 100 }];
    expect(reconcileComponentTotals(components, 0)).toBe(components);
    expect(reconcileComponentTotals(components, null)).toBe(components);
    expect(reconcileComponentTotals(components, undefined)).toBe(components);
  });

  it('leaves components untouched when component calories sum to zero', () => {
    const components = [{ name: 'A', calories: 0 }];
    expect(reconcileComponentTotals(components, 180)).toBe(components);
  });

  it('handles a non-array or empty components list gracefully', () => {
    expect(reconcileComponentTotals(null, 180)).toBeNull();
    expect(reconcileComponentTotals([], 180)).toEqual([]);
  });

  it('preserves non-numeric protein/carbs/fat fields instead of crashing', () => {
    const components = [{ name: 'X', calories: 200, protein: undefined, carbs: null, fat: 5 }];
    const result = reconcileComponentTotals(components, 100);
    expect(result[0].protein).toBeUndefined();
    expect(result[0].carbs).toBeNull();
    expect(result[0].fat).toBe(2.5);
  });
});
