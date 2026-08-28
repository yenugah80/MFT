/**
 * calculateProteinDensityScore — extracted from a byte-for-byte duplicate
 * previously living in both app/history/compare.jsx and
 * components/log/HistoryDrawer.jsx, with one real divergence: the
 * HistoryDrawer.jsx copy had no null guard and would throw on
 * calculateProteinDensityScore(null/undefined). This suite pins both the
 * scoring behavior and that null-safety.
 */
import { calculateProteinDensityScore } from '../utils/mealComparison';

describe('calculateProteinDensityScore', () => {
  it('does not throw on null or undefined — the bug HistoryDrawer.jsx had', () => {
    expect(calculateProteinDensityScore(null)).toBe(0);
    expect(calculateProteinDensityScore(undefined)).toBe(0);
  });

  it('returns 50 for a meal with zero or missing calories', () => {
    expect(calculateProteinDensityScore({ calories: 0, protein: 20 })).toBe(50);
    expect(calculateProteinDensityScore({ protein: 20 })).toBe(50);
  });

  it('scores a high-protein, low-calorie meal higher than a low-protein, high-calorie one', () => {
    const lean = calculateProteinDensityScore({ calories: 300, protein: 40, carbs: 10, fat: 5, fiber: 5, sugar: 2 });
    const heavy = calculateProteinDensityScore({ calories: 800, protein: 10, carbs: 90, fat: 30, fiber: 2, sugar: 20 });
    expect(lean).toBeGreaterThan(heavy);
  });

  it('accepts fat under either the "fat" or "fats" field name', () => {
    const viaFat = calculateProteinDensityScore({ calories: 400, protein: 25, carbs: 30, fat: 15, fiber: 4, sugar: 5 });
    const viaFats = calculateProteinDensityScore({ calories: 400, protein: 25, carbs: 30, fats: 15, fiber: 4, sugar: 5 });
    expect(viaFat).toBe(viaFats);
  });

  it('returns a value in the 0-100 range for a realistic meal', () => {
    const score = calculateProteinDensityScore({ calories: 500, protein: 35, carbs: 45, fat: 18, fiber: 6, sugar: 8 });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
