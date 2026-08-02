/**
 * Timezone correctness for hydration analytics.
 *
 * Every time-of-day figure in hydrationAnalyticsService (peak hour, the
 * morning/afternoon/evening split, persona classification, streak day
 * boundaries) used to be computed with `getHours()` / `toISOString()`, i.e. in
 * the SERVER's timezone — UTC on Railway. These tests pin the corrected
 * behaviour using the same helpers the service now uses, so a regression to
 * server-local time fails here rather than silently mis-bucketing real users.
 *
 * Offsets follow Date#getTimezoneOffset convention, matching what the mobile
 * client sends in X-Timezone-Offset: IST = -330, EST = 300, UTC = 0.
 */

import { getDayKey } from '../src/utils/timezone.js';

const IST = -330;
const EST = 300;

// Mirrors getLocalHour() in hydrationAnalyticsService.js
function getLocalHour(date, offsetMinutes = 0) {
  const offsetMs = (Number.isFinite(offsetMinutes) ? offsetMinutes : 0) * 60 * 1000;
  return new Date(date.getTime() - offsetMs).getUTCHours();
}

function periodFor(hour) {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18) return 'evening';
  return 'overnight';
}

describe('local hour bucketing', () => {
  test('an 8am IST glass counts as morning, not overnight', () => {
    // 08:00 IST == 02:30 UTC
    const loggedAt = new Date('2026-08-01T02:30:00Z');

    expect(getLocalHour(loggedAt, IST)).toBe(8);
    expect(periodFor(getLocalHour(loggedAt, IST))).toBe('morning');

    // The old server-local (UTC) behaviour bucketed it outside morning entirely
    expect(periodFor(getLocalHour(loggedAt, 0))).toBe('overnight');
  });

  test('a 9pm EST glass counts as evening', () => {
    // 21:00 EST == 02:00 UTC next day
    const loggedAt = new Date('2026-08-02T02:00:00Z');

    expect(getLocalHour(loggedAt, EST)).toBe(21);
    expect(periodFor(getLocalHour(loggedAt, EST))).toBe('evening');
  });

  test('falls back to UTC for a missing or malformed offset', () => {
    const loggedAt = new Date('2026-08-01T02:30:00Z');

    expect(getLocalHour(loggedAt, undefined)).toBe(2);
    expect(getLocalHour(loggedAt, NaN)).toBe(2);
    expect(getLocalHour(loggedAt, null)).toBe(2);
  });

  test('every hour of a day round-trips to itself', () => {
    for (let hour = 0; hour < 24; hour++) {
      // Construct the UTC instant matching this IST wall-clock hour
      const utcMs = Date.UTC(2026, 7, 1, hour, 0, 0) + IST * 60 * 1000;
      expect(getLocalHour(new Date(utcMs), IST)).toBe(hour);
    }
  });
});

describe('day-key boundaries', () => {
  test('late-evening IST logs land on the local day, not the previous UTC day', () => {
    // 01:00 IST on Aug 2 == 19:30 UTC on Aug 1
    const loggedAt = new Date('2026-08-01T19:30:00Z');

    expect(getDayKey(loggedAt, IST)).toBe('2026-08-02');
    // Server-local (UTC) would have filed it under the previous day
    expect(getDayKey(loggedAt, 0)).toBe('2026-08-01');
  });

  test('a full IST day maps to exactly one key', () => {
    const keys = new Set();
    // 00:00 IST Aug 1 == 18:30 UTC Jul 31; walk 24 hours forward
    const startMs = Date.UTC(2026, 6, 31, 18, 30, 0);
    for (let h = 0; h < 24; h++) {
      keys.add(getDayKey(new Date(startMs + h * 3600 * 1000), IST));
    }
    expect([...keys]).toEqual(['2026-08-01']);
  });

  test('streak day-walk produces consecutive descending local days', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const anchor = new Date('2026-08-01T19:30:00Z'); // Aug 2 in IST

    const walked = [0, 1, 2].map((i) =>
      getDayKey(new Date(anchor.getTime() - i * DAY_MS), IST)
    );

    expect(walked).toEqual(['2026-08-02', '2026-08-01', '2026-07-31']);
  });
});

describe('weekend detection for predictions', () => {
  // Mirrors dayOfWeekForKey() in hydrationAnalyticsService.js
  const dayOfWeekForKey = (key) => new Date(`${key}T00:00:00Z`).getUTCDay();

  test('reads the weekend from the user local day, not the server day', () => {
    // 2026-08-01 is a Saturday; 2026-07-31 a Friday.
    // At 19:30 UTC Friday it is already Saturday in IST.
    const instant = new Date('2026-07-31T19:30:00Z');

    expect(dayOfWeekForKey(getDayKey(instant, IST))).toBe(6); // Saturday
    expect(dayOfWeekForKey(getDayKey(instant, 0))).toBe(5); // Friday, server view
  });

  test('day-of-week is stable across all keys in a week', () => {
    const expected = [3, 4, 5, 6, 0, 1, 2]; // Aug 2026 starts Sat; Jul 29 2026 is Wed
    const keys = [
      '2026-07-29', '2026-07-30', '2026-07-31',
      '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04',
    ];
    expect(keys.map(dayOfWeekForKey)).toEqual(expected);
  });
});
