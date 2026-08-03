/**
 * Regression tests for the Activity Insights analytics foundation.
 *
 * Three shipped defects are pinned here:
 *
 * 1. Weekly progress scored against 1500 kcal/week and 5 workouts/week —
 *    numbers the user never set, the backend never tracked and no guideline
 *    specifies. A real 35 kcal session read as "2% of your goal".
 * 2. Those fabricated denominators fed the recommendation engine, which
 *    suggested "try a 733 kcal workout" — literally half the remaining
 *    fiction (1500 - 35) / 2.
 * 3. The 7-day trend returned 0% when the previous week was empty, rendering
 *    a neutral "0%" badge directly above "35 kcal this week vs 0 last week".
 */

import {
  DEFAULT_WEEKLY_MINUTES_TARGET,
  calculateWeeklyGoalProgress,
  getWeeklyPace,
  getSevenDayTrend,
  generateActivityRecommendations,
} from '../utils/activityAnalytics';

const DAY_MS = 24 * 60 * 60 * 1000;
const session = (daysAgo, { duration = 30, calories = 175, category = 'Strength' } = {}) => {
  const d = new Date(Date.now() - daysAgo * DAY_MS);
  d.setHours(12, 0, 0, 0);
  return { timestamp: d.toISOString(), duration, calories, category, name: category };
};

/** Days since Sunday, so tests can place a session inside the current week */
const dayOfWeek = () => new Date().getDay();

describe('weekly progress uses the real target', () => {
  it('measures minutes against 150, the CDC/backend target', () => {
    expect(DEFAULT_WEEKLY_MINUTES_TARGET).toBe(150);

    const progress = calculateWeeklyGoalProgress([session(0, { duration: 75 })]);
    expect(progress.targetMinutes).toBe(150);
    expect(progress.minutes).toBe(75);
    expect(progress.percentage).toBe(50);
    expect(progress.remainingMinutes).toBe(75);
  });

  it('no longer reports a calorie goal or a workout goal', () => {
    const progress = calculateWeeklyGoalProgress([session(0)]);
    expect(progress.goal).toBeUndefined();
    expect(progress.workoutGoal).toBeUndefined();
  });

  it('still reports calories and session count as plain facts', () => {
    const progress = calculateWeeklyGoalProgress([
      session(0, { duration: 20, calories: 140 }),
      session(0, { duration: 10, calories: 60 }),
    ]);

    expect(progress.calories).toBe(200);
    expect(progress.workoutCount).toBe(2);
    expect(progress.activeDays).toBe(1);
  });

  it('accepts the target the backend reports', () => {
    const progress = calculateWeeklyGoalProgress([session(0, { duration: 60 })], { targetMinutes: 120 });
    expect(progress.targetMinutes).toBe(120);
    expect(progress.percentage).toBe(50);
  });

  it('ignores a nonsensical target rather than dividing by zero', () => {
    expect(calculateWeeklyGoalProgress([], { targetMinutes: 0 }).targetMinutes).toBe(150);
    expect(calculateWeeklyGoalProgress([], { targetMinutes: -5 }).targetMinutes).toBe(150);
    expect(calculateWeeklyGoalProgress([], { targetMinutes: 'abc' }).targetMinutes).toBe(150);
  });

  it('caps at 100% instead of reporting 340%', () => {
    expect(calculateWeeklyGoalProgress([session(0, { duration: 500 })]).percentage).toBe(100);
  });

  it('handles a user with no activity', () => {
    const progress = calculateWeeklyGoalProgress([]);
    expect(progress).toMatchObject({ minutes: 0, percentage: 0, calories: 0, workoutCount: 0 });
    expect(progress.remainingMinutes).toBe(150);
  });
});

describe('weekly pace', () => {
  it('counts Sunday as one elapsed day, not zero', () => {
    const pace = getWeeklyPace([]);
    expect(pace.elapsedDays).toBe(dayOfWeek() + 1);
    expect(pace.elapsedDays).toBeGreaterThanOrEqual(1);
    expect(pace.daysLeft).toBe(7 - pace.elapsedDays);
  });

  it('reports the gap against where you should be by now', () => {
    const pace = getWeeklyPace([]);
    expect(pace.expectedByNow).toBe(Math.round((150 / 7) * pace.elapsedDays));
    expect(pace.deltaMinutes).toBe(0 - pace.expectedByNow);
    expect(pace.onPace).toBe(false);
  });

  it('is on pace once enough minutes are logged', () => {
    const pace = getWeeklyPace([session(0, { duration: 150 })]);
    expect(pace.onPace).toBe(true);
  });
});

describe('seven day trend', () => {
  it('returns null, not 0%, when there is no previous week', () => {
    const trend = getSevenDayTrend([session(1, { calories: 35, duration: 5 })]);

    expect(trend.prevWeekTotal).toBe(0);
    expect(trend.changePercentage).toBeNull();
    expect(trend.hasComparison).toBe(false);
    expect(trend.trend).toBe('insufficient');
  });

  it('computes a real change when both weeks have data', () => {
    const trend = getSevenDayTrend([
      session(1, { calories: 200, duration: 30 }),
      session(8, { calories: 100, duration: 15 }),
    ]);

    expect(trend.changePercentage).toBe(100);
    expect(trend.minutesChangePercentage).toBe(100);
    expect(trend.hasComparison).toBe(true);
    expect(trend.trend).toBe('up');
  });

  it('detects a decline', () => {
    const trend = getSevenDayTrend([
      session(1, { calories: 50 }),
      session(8, { calories: 200 }),
    ]);
    expect(trend.changePercentage).toBe(-75);
    expect(trend.trend).toBe('down');
  });

  it('reports minutes per day alongside calories', () => {
    const trend = getSevenDayTrend([session(0, { duration: 45, calories: 260 })]);
    expect(trend.days).toHaveLength(7);
    expect(trend.days[6].isToday).toBe(true);
    expect(trend.days[6].minutes).toBe(45);
    expect(trend.thisWeekMinutes).toBe(45);
  });

  it('survives malformed rows and non-arrays', () => {
    expect(getSevenDayTrend(undefined).days).toHaveLength(7);
    expect(getSevenDayTrend([{ timestamp: 'nope' }, {}]).thisWeekTotal).toBe(0);
  });
});

describe('recommendations are grounded in real numbers', () => {
  const messages = (recs) => recs.map((r) => r.message).join(' | ');

  it('never invents a calorie target for a workout', () => {
    const recs = generateActivityRecommendations([session(1, { duration: 5, calories: 35 })]);
    // The old engine produced "Try a 733 kcal workout!"
    expect(messages(recs)).not.toMatch(/kcal workout/i);
    expect(messages(recs)).not.toMatch(/733/);
  });

  it('states the shortfall in minutes with a concrete plan', () => {
    const recs = generateActivityRecommendations([session(1, { duration: 5, calories: 35 })]);
    const goalRec = recs.find((r) => r.type === 'goal');

    expect(goalRec).toBeDefined();
    expect(goalRec.message).toMatch(/min/);
    // "N x M min gets you there" or the last-day variant
    expect(goalRec.message).toMatch(/\d/);
  });

  it('congratulates only when the real target is met', () => {
    const recs = generateActivityRecommendations([session(0, { duration: 150 })]);
    const goalRec = recs.find((r) => r.type === 'goal');
    expect(goalRec.title).toBe('Weekly target hit');
    expect(goalRec.message).toMatch(/150/);
  });

  it('respects a caller-supplied target', () => {
    const recs = generateActivityRecommendations([session(0, { duration: 60 })], [], { targetMinutes: 60 });
    const goalRec = recs.find((r) => r.type === 'goal');
    expect(goalRec.title).toBe('Weekly target hit');
  });

  it('returns an array for a user with no history', () => {
    const recs = generateActivityRecommendations([]);
    expect(Array.isArray(recs)).toBe(true);
    expect(messages(recs)).not.toMatch(/NaN|undefined/);
  });

  it('never emits NaN or undefined in any message', () => {
    const recs = generateActivityRecommendations([
      session(0, { duration: 10 }),
      session(3, { duration: 20 }),
      session(9, { duration: 40 }),
    ]);
    recs.forEach((r) => {
      expect(r.message).not.toMatch(/NaN|undefined|null/);
      expect(r.title).not.toMatch(/NaN|undefined|null/);
    });
  });
});
