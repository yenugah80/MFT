/**
 * Tests for the Insights summary aggregation shared by the Nutrition, Mood and
 * Hydration cards. The rules being guarded:
 *
 * - no data means null, not 0
 * - no previous period means changePercent null, not 0
 * - cumulative metrics average over calendar days; mood averages rated days
 */

import {
  calcChange,
  buildDailySeries,
  summariseCumulative,
  summariseMoodSeries,
  parseDayValue,
} from '../utils/insightsSummary';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

const dayEntry = (n, value) => ({ date: daysAgo(n), value });

const cumulative = (entries, days = 7, extra = {}) =>
  summariseCumulative({
    entries,
    days,
    getDate: (e) => e.date,
    getValue: (e) => e.value,
    unit: 'cal',
    ...extra,
  });

describe('calcChange', () => {
  it('returns null when there is no baseline', () => {
    expect(calcChange(100, 0)).toBeNull();
    expect(calcChange(100, undefined)).toBeNull();
    expect(calcChange(100, null)).toBeNull();
  });

  it('computes percentage change against the baseline', () => {
    expect(calcChange(150, 100)).toBe(50);
    expect(calcChange(50, 100)).toBe(-50);
    expect(calcChange(100, 100)).toBe(0);
  });
});

describe('buildDailySeries', () => {
  it('zero-fills both windows to the period length', () => {
    const { current, previous } = buildDailySeries({
      entries: [dayEntry(0, 500), dayEntry(8, 300)],
      days: 7,
      getDate: (e) => e.date,
      getValue: (e) => e.value,
    });

    expect(current).toHaveLength(7);
    expect(previous).toHaveLength(7);
    expect(current[6]).toBe(500); // today is the last slot
    expect(current.filter((v) => v > 0)).toEqual([500]);
    expect(previous.filter((v) => v > 0)).toEqual([300]);
  });

  it('sums multiple entries landing on the same day', () => {
    const { current } = buildDailySeries({
      entries: [dayEntry(1, 200), dayEntry(1, 300)],
      days: 7,
      getDate: (e) => e.date,
      getValue: (e) => e.value,
    });

    expect(current[5]).toBe(500);
  });

  it('skips entries with missing or unparseable dates', () => {
    const { current } = buildDailySeries({
      entries: [{ value: 100 }, { date: 'not-a-date', value: 100 }, dayEntry(0, 50)],
      days: 7,
      getDate: (e) => e.date,
      getValue: (e) => e.value,
    });

    expect(current.reduce((a, b) => a + b, 0)).toBe(50);
  });
});

describe('summariseCumulative', () => {
  it('reports null average when nothing was logged', () => {
    const summary = cumulative([]);
    expect(summary.average).toBeNull();
    expect(summary.daysWithData).toBe(0);
    expect(summary.changePercent).toBeNull();
    expect(summary.hasComparison).toBe(false);
  });

  it('averages over calendar days, not over logged days', () => {
    // 1400 cal logged across 2 days of a 7 day week -> 200/day, not 700/day
    const summary = cumulative([dayEntry(0, 700), dayEntry(2, 700)]);
    expect(summary.average).toBe(200);
    expect(summary.total).toBe(1400);
    expect(summary.daysWithData).toBe(2);
  });

  it('compares against the previous period', () => {
    const summary = cumulative([dayEntry(1, 1000), dayEntry(9, 500)]);
    expect(summary.changePercent).toBe(100);
    expect(summary.hasComparison).toBe(true);
  });

  it('keeps one decimal for litres', () => {
    const summary = summariseCumulative({
      entries: [{ date: daysAgo(0), value: 1.25 }, { date: daysAgo(1), value: 2.4 }],
      days: 7,
      getDate: (e) => e.date,
      getValue: (e) => e.value,
      unit: 'L',
      decimals: 1,
    });

    // 3.65 L, rounded to one decimal (float representation lands it at 3.6)
    expect(summary.total).toBeCloseTo(3.6, 1);
    expect(summary.average).toBe(0.5);
  });

  it('passes extra fields such as goal through', () => {
    expect(cumulative([], 7, { goal: 2200 }).goal).toBe(2200);
  });
});

describe('summariseMoodSeries', () => {
  const rated = (intensity) => ({ intensity, hasData: true });
  const unrated = () => ({ intensity: null, hasData: false });

  it('returns null average when no day was rated', () => {
    const summary = summariseMoodSeries(Array(14).fill(unrated()), 7);
    expect(summary.average).toBeNull();
    expect(summary.daysWithData).toBe(0);
    expect(summary.changePercent).toBeNull();
  });

  it('averages only the days that were actually rated', () => {
    // Unrated days must not drag the average toward zero
    const series = [...Array(7).fill(unrated()), ...Array(5).fill(unrated()), rated(8), rated(6)];
    const summary = summariseMoodSeries(series, 7);

    expect(summary.average).toBe(7);
    expect(summary.daysWithData).toBe(2);
  });

  it('compares rated averages across periods', () => {
    const previous = [...Array(6).fill(unrated()), rated(5)];
    const current = [...Array(6).fill(unrated()), rated(6)];
    const summary = summariseMoodSeries([...previous, ...current], 7);

    expect(summary.average).toBe(6);
    expect(summary.changePercent).toBe(20);
    expect(summary.hasComparison).toBe(true);
  });

  it('reports no comparison when the previous period is empty', () => {
    const summary = summariseMoodSeries([...Array(7).fill(unrated()), ...Array(6).fill(unrated()), rated(7)], 7);
    expect(summary.average).toBe(7);
    expect(summary.changePercent).toBeNull();
    expect(summary.hasComparison).toBe(false);
  });

  it('pads a short series rather than mis-splitting it', () => {
    const summary = summariseMoodSeries([rated(4), rated(6)], 7);
    expect(summary.dailyValues).toHaveLength(7);
    expect(summary.average).toBe(5);
  });

  it('tolerates undefined input', () => {
    expect(summariseMoodSeries(undefined, 7).average).toBeNull();
    expect(summariseMoodSeries(null, 7).daysWithData).toBe(0);
  });
});

describe('parseDayValue', () => {
  it('treats a plain YYYY-MM-DD key as a local date, not UTC midnight', () => {
    const parsed = parseDayValue('2026-08-02');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(2);
  });

  it('still parses full ISO timestamps', () => {
    const iso = '2026-08-02T15:30:00.000Z';
    expect(parseDayValue(iso).getTime()).toBe(new Date(iso).getTime());
  });

  it('buckets day-keyed aggregates on the right calendar day', () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { current } = buildDailySeries({
      entries: [{ date: key, value: 1.5 }],
      days: 7,
      getDate: (e) => e.date,
      getValue: (e) => e.value,
    });

    // Lands on today, the final slot — not yesterday
    expect(current[6]).toBe(1.5);
  });
});
