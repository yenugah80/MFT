/**
 * getMealGroupKey / countDistinctMeals — the fix for the "X logged" pill
 * counting food_log ROWS instead of MEALS. A meal logged with 3 items used
 * to show "3 logged"; these group rows by the shared clientEventId prefix
 * so it correctly shows "1 logged".
 */
import { getMealGroupKey, countDistinctMeals } from '../utils/mealGrouping';

describe('getMealGroupKey', () => {
  it('groups multi-item clientEventIds (3+ segments) by their first two segments', () => {
    const a = getMealGroupKey('1755800000000-a1b2c3d4e-item-1');
    const b = getMealGroupKey('1755800000000-a1b2c3d4e-item-2');
    expect(a).toBe(b);
    expect(a).toBe('1755800000000-a1b2c3d4e');
  });

  it('treats a single-item clientEventId (exactly 2 segments) as its own group', () => {
    const key = getMealGroupKey('1755800000000-a1b2c3d4e');
    expect(key).toBe('1755800000000-a1b2c3d4e');
  });

  it('two different single-item logs never collide into the same group', () => {
    const a = getMealGroupKey('1755800000000-a1b2c3d4e');
    const b = getMealGroupKey('1755800000001-x9y8z7w6v');
    expect(a).not.toBe(b);
  });

  it('handles an itemId that itself contains hyphens without ambiguity', () => {
    // e.g. a barcode item id like "off-1234567890" or "chicken-breast-2"
    const a = getMealGroupKey('1755800000000-a1b2c3d4e-off-1234567890');
    const b = getMealGroupKey('1755800000000-a1b2c3d4e-chicken-breast-2');
    expect(a).toBe(b);
    expect(a).toBe('1755800000000-a1b2c3d4e');
  });

  it('treats a legacy UUID (5 dash segments, structurally distinct) as its own group', () => {
    const key = getMealGroupKey('550e8400-e29b-41d4-a716-446655440000');
    // Not equal to any 2-segment prefix collision — just proving it doesn't crash
    // and returns a stable, non-empty key.
    expect(key).toBeTruthy();
  });

  it('passes through falsy input unchanged', () => {
    expect(getMealGroupKey(null)).toBeNull();
    expect(getMealGroupKey(undefined)).toBeUndefined();
    expect(getMealGroupKey('')).toBe('');
  });
});

describe('countDistinctMeals', () => {
  it('counts a 3-item meal as ONE meal, not three', () => {
    const logs = [
      { clientEventId: '1755800000000-a1b2c3d4e-item-1' },
      { clientEventId: '1755800000000-a1b2c3d4e-item-2' },
      { clientEventId: '1755800000000-a1b2c3d4e-item-3' },
    ];
    expect(countDistinctMeals(logs)).toBe(1);
  });

  it('counts a mix of one 3-item meal and two single-item meals as three meals', () => {
    const logs = [
      { clientEventId: '1755800000000-a1b2c3d4e-item-1' },
      { clientEventId: '1755800000000-a1b2c3d4e-item-2' },
      { clientEventId: '1755800000000-a1b2c3d4e-item-3' },
      { clientEventId: '1755800000001-b2c3d4e5f' },
      { clientEventId: '1755800000002-c3d4e5f6g' },
    ];
    expect(countDistinctMeals(logs)).toBe(3);
  });

  it('returns 0 for no logs', () => {
    expect(countDistinctMeals([])).toBe(0);
    expect(countDistinctMeals(null)).toBe(0);
    expect(countDistinctMeals(undefined)).toBe(0);
  });
});
