/**
 * Wiring tests: the Insights summary transforms against REAL upstream shapes.
 *
 * The unit tests elsewhere feed hand-made objects, which is exactly how the
 * shipped bugs survived — the mood card read `moodData.data`, a key
 * aggregateMoodInsights has never produced, so mood showed 0/10 for everyone
 * regardless of what they logged.
 *
 * These tests run the genuine producers (aggregateMoodInsights, and payloads
 * shaped exactly like GET /water/history and GET /activity/history return) into
 * the summarisers, so a rename on either side fails here.
 */

import { aggregateMoodInsights } from '../utils/moodAggregation';
import {
  summariseMoodSeries,
  summariseCumulative,
  summariseActivityHistory,
} from '../utils/insightsSummary';

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDaysAgo = (n, hour = 12) => {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
/** `YYYY-MM-DD` in local time — the shape water/nutrition day keys arrive in */
const dayKeyDaysAgo = (n) => {
  const d = new Date(Date.now() - n * DAY_MS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('mood: aggregateMoodInsights -> summariseMoodSeries', () => {
  // Raw rows as GET /mood/history returns them (moodLogTable)
  const moodLog = (daysAgo, intensity) => ({
    id: daysAgo + 1,
    mood: 'happy',
    intensity,
    energyLevel: 7,
    loggedDate: isoDaysAgo(daysAgo),
  });

  it('produces a real average from the aggregator output', () => {
    const aggregate = aggregateMoodInsights({
      logs: [moodLog(0, 8), moodLog(1, 7), moodLog(2, 9)],
      windowDays: 14,
      trendDays: 14,
    });

    const summary = summariseMoodSeries(aggregate.trendData, 7);

    // The bug: reading `.data` off this object yields undefined -> 0/10
    expect(aggregate.data).toBeUndefined();
    expect(Array.isArray(aggregate.trendData)).toBe(true);
    expect(summary.average).toBeGreaterThan(0);
    expect(summary.daysWithData).toBe(3);
  });

  it('keeps unlogged days out of the average', () => {
    // One 9/10 day in an otherwise empty week must read 9, not 9/7
    const aggregate = aggregateMoodInsights({
      logs: [moodLog(1, 9)],
      windowDays: 14,
      trendDays: 14,
    });

    const summary = summariseMoodSeries(aggregate.trendData, 7);
    expect(summary.average).toBeGreaterThanOrEqual(8);
    expect(summary.daysWithData).toBe(1);
  });

  it('reports no data — not zero — for a user who has never logged mood', () => {
    const aggregate = aggregateMoodInsights({ logs: [], windowDays: 14, trendDays: 14 });
    const summary = summariseMoodSeries(aggregate.trendData, 7);

    expect(summary.average).toBeNull();
    expect(summary.daysWithData).toBe(0);
    expect(summary.changePercent).toBeNull();
    expect(summary.hasComparison).toBe(false);
  });

  it('compares this week against the previous one', () => {
    const aggregate = aggregateMoodInsights({
      logs: [moodLog(1, 8), moodLog(2, 8), moodLog(8, 4), moodLog(9, 4)],
      windowDays: 14,
      trendDays: 14,
    });

    const summary = summariseMoodSeries(aggregate.trendData, 7);
    expect(summary.hasComparison).toBe(true);
    expect(summary.changePercent).toBeGreaterThan(0);
  });
});

describe('hydration: GET /water/history dailyAggregates -> summariseCumulative', () => {
  // Exactly the shape backend/src/routes/water.js builds
  const aggregate = (daysAgo, hydrationLiters) => ({
    date: dayKeyDaysAgo(daysAgo),
    totalLiters: hydrationLiters + 0.2,
    hydrationLiters,
    count: 3,
    beverageTypes: { water: 3 },
  });

  const summarise = (entries, days = 7) =>
    summariseCumulative({
      entries,
      days,
      getDate: (day) => day.date,
      getValue: (day) => day.hydrationLiters || day.totalLiters || 0,
      unit: 'L',
      decimals: 1,
    });

  it('prefers hydrationLiters over totalLiters', () => {
    const summary = summarise([aggregate(0, 2.0)]);
    expect(summary.total).toBe(2); // not 2.2
  });

  it('compares against the previous week, not the first half of this one', () => {
    // 6L this week vs 3L last week -> +100%
    const summary = summarise([aggregate(1, 3.0), aggregate(2, 3.0), aggregate(8, 3.0)]);

    expect(summary.total).toBe(6);
    expect(summary.changePercent).toBe(100);
    expect(summary.hasComparison).toBe(true);
  });

  it('claims no comparison when there is no previous week', () => {
    const summary = summarise([aggregate(0, 2.5)]);
    expect(summary.changePercent).toBeNull();
    expect(summary.hasComparison).toBe(false);
  });

  it('places a day-keyed aggregate on the correct local day', () => {
    const summary = summarise([aggregate(0, 1.5)]);
    // Today is the last slot; a UTC-parsed key would land it on yesterday
    expect(summary.dailyValues[6]).toBe(1.5);
    expect(summary.daysWithData).toBe(1);
  });

  it('handles a user with no water logs', () => {
    const summary = summarise([]);
    expect(summary.average).toBeNull();
    expect(summary.total).toBe(0);
    expect(summary.dailyValues).toHaveLength(7);
  });
});

describe('activity: GET /activity/history rows -> summariseActivityHistory', () => {
  // Exactly the shape activityLogTable rows are returned in
  const activityRow = (daysAgo, overrides = {}) => ({
    id: daysAgo + 100,
    userId: 'user_test',
    type: 'strength',
    durationMinutes: 30,
    intensity: 'moderate',
    metValue: '5.00',
    caloriesBurned: 175,
    dayKey: dayKeyDaysAgo(daysAgo),
    clientEventId: `evt-${daysAgo}`,
    loggedAt: isoDaysAgo(daysAgo),
    ...overrides,
  });

  it('summarises a realistic week', () => {
    const summary = summariseActivityHistory(
      [
        activityRow(0, { type: 'cardio', durationMinutes: 20, caloriesBurned: 140 }),
        activityRow(2, { type: 'strength', durationMinutes: 45, caloriesBurned: 260 }),
        activityRow(9, { type: 'strength', durationMinutes: 30, caloriesBurned: 175 }),
      ],
      7,
      { target: 150, weeklyMinutes: 65 }
    );

    expect(summary.totalMinutes).toBe(65);
    expect(summary.totalCalories).toBe(400);
    expect(summary.workoutCount).toBe(2);
    expect(summary.activeDays).toBe(2);
    expect(summary.byType[0]).toMatchObject({ type: 'strength', minutes: 45 });
    expect(summary.lastWorkout.type).toBe('cardio');
    expect(summary.changePercent).toBeGreaterThan(0);
  });

  it('tolerates a null caloriesBurned (column is nullable)', () => {
    const summary = summariseActivityHistory([activityRow(0, { caloriesBurned: null })], 7, {});
    expect(summary.totalCalories).toBe(0);
    expect(summary.totalMinutes).toBe(30);
  });

  it('handles the empty history the API returns on error', () => {
    // fetchHistory swallows failures and returns { activities: [], total: 0, summary: {} }
    const summary = summariseActivityHistory([], 7, {});
    expect(summary.totalMinutes).toBe(0);
    expect(summary.workoutCount).toBe(0);
    expect(summary.lastWorkout).toBeNull();
    expect(summary.byType).toEqual([]);
  });
});
