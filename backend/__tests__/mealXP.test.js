/**
 * Meal XP correctness.
 *
 * calculateMealXP had three defects that compounded into silently wrong XP for
 * every user, and none of them were visible from the outside:
 *
 *  1. The meal-count query interpolated a JS Date into a raw `sql` template.
 *     Raw templates bypass Drizzle's column type mapping, so postgres.js got an
 *     unserialized Date and the query threw ERR_INVALID_ARG_TYPE on every call.
 *  2. The catch block returned the MAXIMUM tier (10 XP), so a query failing
 *     100% of the time looked exactly like normal operation.
 *  3. The day window was a UTC day while the daily nutrition summary in the
 *     same request used the user's LOCAL day, so meal numbering disagreed with
 *     the summary and reset at UTC midnight.
 *
 * These tests pin the fixed behaviour. dbConn is injectable, so the tier and
 * day-window logic is exercised without a live database; the Date-serialization
 * fix is driver-level and is verified separately against real Postgres.
 *
 * Offsets follow Date#getTimezoneOffset convention, matching X-Timezone-Offset:
 * EST = 300, IST = -330, UTC = 0.
 */

import { calculateMealXP } from '../src/services/gamificationRewardService.js';

const EST = 300;    // UTC-5
const IST = -330;   // UTC+5:30

/**
 * Recursively collect every Date bound into a Drizzle clause tree.
 * Guards against the cyclic references Drizzle's internal nodes contain.
 */
function collectDates(node, seen = new WeakSet(), found = []) {
  if (node === null || typeof node !== 'object') return found;
  if (seen.has(node)) return found;
  seen.add(node);

  if (node instanceof Date) {
    found.push(node);
    return found;
  }

  for (const value of Object.values(node)) {
    collectDates(value, seen, found);
  }
  return found;
}

/**
 * Minimal stand-in for the Drizzle query builder used by calculateMealXP,
 * capturing the values it filters on so the day window can be asserted.
 */
function stubDb(count, { throwOnQuery = false } = {}) {
  const captured = {};
  const chain = {
    select: () => chain,
    from: () => chain,
    where: (clause) => {
      if (throwOnQuery) throw new Error('simulated driver failure');
      // Deep-walk the clause for bound Date params. Not JSON.stringify: that
      // invokes Date.prototype.toJSON before the replacer runs, so the values
      // arrive as strings and `instanceof Date` never matches.
      captured.dates = collectDates(clause);
      return Promise.resolve([{ count }]);
    },
  };
  return { chain, captured };
}

const calcWith = (count, offset, date, opts) => {
  const { chain } = stubDb(count, opts);
  return calculateMealXP('u1', date, chain, offset);
};

describe('XP tiers', () => {
  it('awards 10 XP for each of the first three meals', async () => {
    expect((await calcWith(0, EST, new Date('2026-08-12T17:00:00Z'))).xp).toBe(10);
    expect((await calcWith(1, EST, new Date('2026-08-12T17:00:00Z'))).xp).toBe(10);
    expect((await calcWith(2, EST, new Date('2026-08-12T17:00:00Z'))).xp).toBe(10);
  });

  it('drops to 5 XP from the fourth meal on', async () => {
    expect((await calcWith(3, EST, new Date('2026-08-12T17:00:00Z'))).xp).toBe(5);
    expect((await calcWith(9, EST, new Date('2026-08-12T17:00:00Z'))).xp).toBe(5);
  });

  it('reports the meal number rather than a constant', async () => {
    // The broken fallback always said 1, which is what made the failure
    // indistinguishable from a genuine first meal of the day.
    expect((await calcWith(0, EST, new Date('2026-08-12T17:00:00Z'))).mealNumber).toBe(1);
    expect((await calcWith(4, EST, new Date('2026-08-12T17:00:00Z'))).mealNumber).toBe(5);
  });
});

describe('failure handling', () => {
  it('degrades to the MINIMUM tier, never the maximum', async () => {
    const res = await calcWith(0, EST, new Date('2026-08-12T17:00:00Z'), { throwOnQuery: true });
    expect(res.xp).toBe(5);
    expect(res.xp).not.toBe(10);
  });

  it('signals the error path with a null meal number', async () => {
    const res = await calcWith(0, EST, new Date('2026-08-12T17:00:00Z'), { throwOnQuery: true });
    expect(res.mealNumber).toBeNull();
  });

  it('never throws, so an XP problem cannot fail the meal log', async () => {
    await expect(
      calcWith(0, EST, new Date('2026-08-12T17:00:00Z'), { throwOnQuery: true })
    ).resolves.toBeDefined();
  });
});

describe('day window follows the user, not the server', () => {
  const boundsFor = async (offset, iso) => {
    const { chain, captured } = stubDb(0);
    await calculateMealXP('u1', new Date(iso), chain, offset);
    const dates = (captured.dates || []).slice().sort((a, b) => a - b);
    return { start: dates[0], end: dates[dates.length - 1] };
  };

  it('bounds an evening meal to the local day it was eaten', async () => {
    // 2026-08-13T01:00Z is 2026-08-12 20:00 EST. A UTC-day window would put
    // this on Aug 13 and restart meal numbering mid-evening.
    const { start, end } = await boundsFor(EST, '2026-08-13T01:00:00Z');
    expect(start.toISOString()).toBe('2026-08-12T05:00:00.000Z'); // Aug 12 00:00 EST
    expect(end.getTime()).toBeGreaterThan(new Date('2026-08-13T01:00:00Z').getTime());
  });

  it('bounds a pre-dawn UTC meal correctly east of UTC', async () => {
    // 2026-08-12T02:00Z is 2026-08-12 07:30 IST — same calendar day locally.
    const { start } = await boundsFor(IST, '2026-08-12T02:00:00Z');
    expect(start.toISOString()).toBe('2026-08-11T18:30:00.000Z'); // Aug 12 00:00 IST
  });

  it('produces a window that actually contains the meal', async () => {
    for (const [offset, iso] of [[EST, '2026-08-13T01:00:00Z'], [IST, '2026-08-12T02:00:00Z'], [0, '2026-08-12T12:00:00Z']]) {
      const { start, end } = await boundsFor(offset, iso);
      const t = new Date(iso).getTime();
      expect(start.getTime()).toBeLessThanOrEqual(t);
      expect(end.getTime()).toBeGreaterThanOrEqual(t);
    }
  });

  it('spans a single day', async () => {
    const { start, end } = await boundsFor(EST, '2026-08-12T17:00:00Z');
    const hours = (end.getTime() - start.getTime()) / 3_600_000;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThan(24.001);
  });
});
