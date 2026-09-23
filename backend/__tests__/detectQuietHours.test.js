import { describe, test, expect } from '@jest/globals';
import { detectQuietHours } from '../src/services/smartReminderService.js';

// Regression coverage for a severe, previously-undiscovered bug found while
// building a controlled generation test (not something this session set out
// to look for): the old implementation took Math.min/Math.max over hours
// matching `h >= 20 || h <= 8` — a set that, for almost any real usage
// pattern, includes hours from BOTH the early-morning tail (near 0) and the
// late-night tail (near 23). min() landed on 0 and max() landed on 23 for
// nearly every account with any concentrated activity window, producing
// { start: 0, end: 23 }. Consumed by isQuietHour()'s
// `hour >= start && hour < end`, that made 23 of 24 hours register as
// "quiet" — silently blocking almost all reminder generation at the very
// first gate in getSmartReminders(), before any category generator runs,
// for effectively every real user. Reproduced directly with a synthetic
// account logging at a consistent 8am/1pm/8pm before this fix existed.
function buildPatterns(activeHours) {
  const food = new Array(24).fill(0);
  activeHours.forEach((h) => { food[h] = 10; });
  return {
    food: { hourlyDistribution: food },
    water: { hourlyDistribution: new Array(24).fill(0) },
    mood: { hourlyDistribution: new Array(24).fill(0) },
  };
}

describe('detectQuietHours', () => {
  test('never returns a window covering 23+ of 24 hours for a real, concentrated usage pattern', () => {
    const patterns = buildPatterns([8, 13, 20]);
    const result = detectQuietHours(patterns);

    // Compute how many hours isQuietHour's own logic would flag as quiet,
    // exactly mirroring smartReminderJob.js's isInQuietHours consumer.
    const quietHourCount = Array.from({ length: 24 }, (_, hour) => {
      const { start, end } = result;
      return start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
    }).filter(Boolean).length;

    expect(quietHourCount).toBeLessThan(20); // sanity: real sleep windows are ~6-10 hours, never 23
    expect(result.start).not.toBe(0);
    expect(result.end).not.toBe(23);
  });

  test('correctly identifies an overnight window spanning midnight as one contiguous run', () => {
    // Active 8am-8pm, quiet the rest — the quiet run wraps from 21 through 7.
    const patterns = buildPatterns([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    const result = detectQuietHours(patterns);
    expect(result.detected).toBe(true);
    // The window should wrap (start > end) since the quiet run crosses midnight.
    expect(result.start).toBeGreaterThan(result.end);
  });

  test('falls back to the default sleep window when there is no usable signal', () => {
    const patterns = buildPatterns([]); // completely flat — no activity at all
    const result = detectQuietHours(patterns);
    expect(result.detected).toBe(false);
    expect(result).toEqual({ start: 22, end: 7, detected: false });
  });

  test('does not treat every hour as quiet when activity is perfectly flat but non-zero', () => {
    // Every hour has identical, non-zero activity — no real "quiet" signal,
    // should not collapse to a 24-hour or near-24-hour window.
    const flat = new Array(24).fill(5);
    const patterns = {
      food: { hourlyDistribution: flat },
      water: { hourlyDistribution: new Array(24).fill(0) },
      mood: { hourlyDistribution: new Array(24).fill(0) },
    };
    const result = detectQuietHours(patterns);
    const quietHourCount = Array.from({ length: 24 }, (_, hour) => {
      const { start, end } = result;
      return start > end ? (hour >= start || hour < end) : (hour >= start && hour < end);
    }).filter(Boolean).length;
    expect(quietHourCount).toBeLessThan(24);
  });
});
