/**
 * Tests for the calendar's two load-bearing functions.
 *
 * getMonthGrid draws the screen and getPeriodStats produces every figure in
 * its panel, and both shipped with no coverage at all. The things that most
 * need pinning are the boundaries: a day that belongs to a neighbouring month,
 * a day that has not happened, and what "the previous period" means.
 */

import { getMonthGrid, getPeriodStats } from '../utils/activityAnalytics';

const DAY_MS = 24 * 60 * 60 * 1000;

const at = (daysAgo, { duration = 30, calories = 175, hour = 12, ...rest } = {}) => {
  const d = new Date(Date.now() - daysAgo * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return { timestamp: d.toISOString(), duration, calories, ...rest };
};

const flat = (grid) => grid.weeks.flat();

describe('getMonthGrid', () => {
  it('lays out whole weeks starting on Sunday', () => {
    const grid = getMonthGrid([]);
    grid.weeks.forEach((week) => expect(week).toHaveLength(7));
    expect(grid.weeks[0][0].date.getDay()).toBe(0);
  });

  it('marks padding days from neighbouring months', () => {
    const grid = getMonthGrid([]);
    const cells = flat(grid);
    const padding = cells.filter((c) => !c.inMonth);

    // A month never starts and ends flush with a week unless it is exactly 28
    // days from a Sunday, so there is almost always padding
    padding.forEach((cell) => expect(cell.inMonth).toBe(false));
    expect(cells.filter((c) => c.inMonth).length).toBeGreaterThanOrEqual(28);
  });

  it('excludes padding and future days from the trained count', () => {
    const grid = getMonthGrid([at(0), at(1)]);
    const counted = flat(grid).filter((c) => c.inMonth && !c.isFuture);

    expect(grid.elapsedDays).toBe(counted.length);
    expect(grid.trainedDays).toBeLessThanOrEqual(grid.elapsedDays);
    flat(grid)
      .filter((c) => c.isFuture)
      .forEach((cell) => expect(cell.trained).toBe(false));
  });

  it('marks exactly one day as today, inside the current month', () => {
    const cells = flat(getMonthGrid([]));
    const todays = cells.filter((c) => c.isToday);
    expect(todays).toHaveLength(1);
    expect(todays[0].inMonth).toBe(true);
  });

  it('fills a ring against the daily target and caps it at full', () => {
    const grid = getMonthGrid([at(0, { duration: 10 })], { dailyTargetMinutes: 20 });
    const today = flat(grid).find((c) => c.isToday);
    expect(today.progress).toBeCloseTo(0.5, 2);

    const over = getMonthGrid([at(0, { duration: 90 })], { dailyTargetMinutes: 20 });
    expect(flat(over).find((c) => c.isToday).progress).toBe(1);
  });

  it('sums multiple sessions onto one day and keeps them for the panel', () => {
    const grid = getMonthGrid([at(0, { duration: 20 }), at(0, { duration: 25 })]);
    const today = flat(grid).find((c) => c.isToday);

    expect(today.minutes).toBe(45);
    expect(today.sessions).toHaveLength(2);
  });

  it('cannot navigate past the current month', () => {
    expect(getMonthGrid([], { monthsAgo: 0 }).canGoForward).toBe(false);
    expect(getMonthGrid([], { monthsAgo: 1 }).canGoForward).toBe(true);
  });

  it('shows an earlier month with its own days and no today', () => {
    const grid = getMonthGrid([], { monthsAgo: 1 });
    expect(flat(grid).some((c) => c.isToday)).toBe(false);
    expect(grid.monthLabel).toMatch(/\w+ \d{4}/);
  });

  it('survives malformed input', () => {
    expect(getMonthGrid(undefined).weeks.length).toBeGreaterThan(0);
    expect(getMonthGrid([{ timestamp: 'nope' }, {}]).trainedDays).toBe(0);
  });
});

describe('getPeriodStats', () => {
  it('scopes a day to that day alone', () => {
    const stats = getPeriodStats([at(0, { duration: 30 }), at(1, { duration: 40 })], {
      scope: 'day',
      anchor: new Date(),
    });

    expect(stats.minutes).toBe(30);
    expect(stats.sessions).toBe(1);
    // A day's share of the weekly target
    expect(stats.target).toBe(Math.round(150 / 7));
  });

  it('scopes a week Sunday to Saturday and targets the full week', () => {
    const stats = getPeriodStats([], { scope: 'week', anchor: new Date() });
    expect(stats.start.getDay()).toBe(0);
    expect(stats.target).toBe(150);
    expect(stats.totalDays).toBe(7);
  });

  it('scales a month target by its actual length', () => {
    const stats = getPeriodStats([], { scope: 'month', anchor: new Date(2026, 1, 10) });
    // February 2026 has 28 days
    expect(stats.totalDays).toBe(28);
    expect(stats.target).toBe(Math.round((150 / 7) * 28));
  });

  it('compares against the equal span immediately before', () => {
    // 60 min this week, 30 the week before
    const stats = getPeriodStats([at(1, { duration: 60 }), at(8, { duration: 30 })], {
      scope: 'week',
      anchor: new Date(),
    });

    // The previous window only contains the older session
    expect(stats.previousMinutes).toBeGreaterThan(0);
    expect(Number.isFinite(stats.changePercent)).toBe(true);
  });

  it('reports null, not zero, with nothing to compare against', () => {
    const stats = getPeriodStats([at(0, { duration: 30 })], { scope: 'week', anchor: new Date() });
    expect(stats.previousMinutes).toBe(0);
    expect(stats.changePercent).toBeNull();
  });

  it('says where the period should stand by now', () => {
    const stats = getPeriodStats([], { scope: 'week', anchor: new Date() });
    expect(stats.expectedByNow).toBe(
      Math.round((150 / 7) * Math.min(stats.elapsedDays, 7))
    );
    expect(stats.onPace).toBe(false);
    expect(stats.deltaMinutes).toBe(0 - stats.expectedByNow);
  });

  it('is on pace once enough is logged', () => {
    const stats = getPeriodStats([at(0, { duration: 150 })], { scope: 'week', anchor: new Date() });
    expect(stats.onPace).toBe(true);
  });

  it('treats a finished period as complete rather than behind', () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    expect(getPeriodStats([], { scope: 'month', anchor: lastMonth }).isComplete).toBe(true);
    expect(getPeriodStats([], { scope: 'week', anchor: new Date() }).isComplete).toBe(false);
  });

  it('counts active days rather than sessions', () => {
    const stats = getPeriodStats([at(0, { duration: 10 }), at(0, { duration: 20 })], {
      scope: 'week',
      anchor: new Date(),
    });
    expect(stats.sessions).toBe(2);
    expect(stats.activeDays).toBe(1);
  });

  it('carries the scoped breakdowns', () => {
    const stats = getPeriodStats(
      [at(0, { duration: 30, intensity: 'vigorous', exerciseId: 'leg-press', exerciseName: 'Leg Press' })],
      { scope: 'week', anchor: new Date() }
    );

    expect(stats.intensity.minutes.vigorous).toBe(30);
    expect(stats.byExercise[0].name).toBe('Leg Press');
    expect(stats.activities).toHaveLength(1);
  });

  it('omits balance unless a resolver is supplied', () => {
    const stats = getPeriodStats([at(0)], { scope: 'week', anchor: new Date() });
    expect(stats.balance).toBeNull();

    const withResolver = getPeriodStats(
      [at(0, { exerciseId: 'leg-press' })],
      {
        scope: 'week',
        anchor: new Date(),
        resolveExercise: () => ({ muscleGroup: 'Lower Body' }),
      }
    );
    expect(withResolver.balance.hasData).toBe(true);
  });

  it('defaults to a week and survives malformed input', () => {
    expect(getPeriodStats([], {}).scope).toBe('week');
    expect(getPeriodStats([], { scope: 'decade' }).scope).toBe('week');
    expect(getPeriodStats(undefined, { scope: 'day' }).minutes).toBe(0);
    expect(getPeriodStats([{ timestamp: 'nope' }], { scope: 'day' }).sessions).toBe(0);
  });

  it('never emits NaN for any figure', () => {
    ['day', 'week', 'month'].forEach((scope) => {
      const stats = getPeriodStats([at(0), at(3), at(20)], { scope, anchor: new Date() });
      [
        stats.minutes,
        stats.target,
        stats.percentage,
        stats.calories,
        stats.expectedByNow,
        stats.deltaMinutes,
        stats.elapsedDays,
        stats.totalDays,
      ].forEach((value) => expect(Number.isFinite(value)).toBe(true));
    });
  });
});
