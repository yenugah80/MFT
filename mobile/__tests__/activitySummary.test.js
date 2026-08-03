/**
 * Tests for summariseActivityHistory — the aggregation behind the Insights
 * activity card. Guards the period boundaries (a row from the previous week
 * must not count as current) and the type breakdown.
 */

import { summariseActivityHistory } from '../utils/insightsSummary';

const daysAgo = (n, hour = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const row = (overrides) => ({
  id: Math.random().toString(36).slice(2),
  type: 'strength',
  durationMinutes: 30,
  caloriesBurned: 150,
  loggedAt: daysAgo(0),
  ...overrides,
});

describe('summariseActivityHistory', () => {
  it('returns a zeroed summary with no history', () => {
    const summary = summariseActivityHistory([], 7, {});

    expect(summary.totalMinutes).toBe(0);
    expect(summary.workoutCount).toBe(0);
    expect(summary.activeDays).toBe(0);
    expect(summary.byType).toEqual([]);
    expect(summary.lastWorkout).toBeNull();
    expect(summary.changePercent).toBeNull();
    expect(summary.dailyValues).toHaveLength(7);
  });

  it('tolerates undefined or malformed input', () => {
    expect(summariseActivityHistory(undefined, 7).totalMinutes).toBe(0);
    expect(summariseActivityHistory(null, 7).workoutCount).toBe(0);
    // Rows without a timestamp are skipped rather than crashing
    expect(summariseActivityHistory([{ durationMinutes: 20 }], 7).totalMinutes).toBe(0);
  });

  it('counts only rows inside the current window', () => {
    const summary = summariseActivityHistory(
      [
        row({ durationMinutes: 30, loggedAt: daysAgo(0) }),
        row({ durationMinutes: 20, loggedAt: daysAgo(3) }),
        // 10 days back — previous window, must not inflate current totals
        row({ durationMinutes: 60, loggedAt: daysAgo(10) }),
      ],
      7,
      {}
    );

    expect(summary.totalMinutes).toBe(50);
    expect(summary.workoutCount).toBe(2);
    expect(summary.activeDays).toBe(2);
    expect(summary.periodDays).toBe(7);
  });

  it('compares against the previous period rather than a goal', () => {
    // 60 min this week, 30 min the week before -> +100%
    const summary = summariseActivityHistory(
      [
        row({ durationMinutes: 60, loggedAt: daysAgo(1) }),
        row({ durationMinutes: 30, loggedAt: daysAgo(9) }),
      ],
      7,
      {}
    );

    expect(summary.average).toBe(Math.round(60 / 7));
    expect(summary.changePercent).toBe(100);
  });

  it('reports no trend when there is nothing to compare against', () => {
    const summary = summariseActivityHistory([row({ durationMinutes: 45 })], 7, {});
    // null, not 0 — "no baseline" is not "unchanged"
    expect(summary.changePercent).toBeNull();
    expect(summary.hasComparison).toBe(false);
  });

  it('breaks minutes down by type, biggest first', () => {
    const summary = summariseActivityHistory(
      [
        row({ type: 'strength', durationMinutes: 20, caloriesBurned: 100 }),
        row({ type: 'strength', durationMinutes: 25, caloriesBurned: 125, loggedAt: daysAgo(2) }),
        row({ type: 'cardio', durationMinutes: 60, caloriesBurned: 400, loggedAt: daysAgo(1) }),
      ],
      7,
      {}
    );

    expect(summary.byType.map((t) => t.type)).toEqual(['cardio', 'strength']);
    expect(summary.byType[0]).toMatchObject({ minutes: 60, calories: 400, count: 1 });
    expect(summary.byType[1]).toMatchObject({ minutes: 45, calories: 225, count: 2 });
    expect(summary.totalCalories).toBe(625);
  });

  it('surfaces the most recent workout', () => {
    const summary = summariseActivityHistory(
      [
        row({ type: 'yoga', loggedAt: daysAgo(4) }),
        row({ type: 'running', loggedAt: daysAgo(0, 9) }),
        row({ type: 'cycling', loggedAt: daysAgo(2) }),
      ],
      7,
      {}
    );

    expect(summary.lastWorkout.type).toBe('running');
  });

  it('passes the weekly target through for the goal bar', () => {
    const summary = summariseActivityHistory([], 7, { target: 200, weeklyMinutes: 45 });
    expect(summary).toMatchObject({ target: 200, weeklyMinutes: 45 });
  });

  it('supports a 30 day period', () => {
    const summary = summariseActivityHistory(
      [
        row({ durationMinutes: 30, loggedAt: daysAgo(20) }),
        row({ durationMinutes: 30, loggedAt: daysAgo(40) }),
      ],
      30,
      {}
    );

    expect(summary.totalMinutes).toBe(30);
    expect(summary.periodDays).toBe(30);
    // Sparkline still shows the trailing 7 days only
    expect(summary.dailyValues).toHaveLength(7);
  });
});
