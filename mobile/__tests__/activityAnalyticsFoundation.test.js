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

describe('consistency grid', () => {
  const { getConsistencyGrid } = require('../utils/activityAnalytics');

  it('returns weeks x 7 cells, Sunday first', () => {
    const { grid } = getConsistencyGrid([], { weeks: 5 });
    expect(grid).toHaveLength(5);
    grid.forEach((week) => expect(week).toHaveLength(7));
    expect(grid[0][0].date.getDay()).toBe(0); // Sunday
  });

  it('ends on the current week and marks today', () => {
    const { grid } = getConsistencyGrid([], { weeks: 3 });
    const flat = grid.flat();
    const todayCells = flat.filter((d) => d.isToday);
    expect(todayCells).toHaveLength(1);
  });

  it('does not count days that have not happened as rest days', () => {
    const { grid, elapsedDays } = getConsistencyGrid([], { weeks: 1 });
    const future = grid.flat().filter((d) => d.isFuture);
    // A week has 7 cells; only the elapsed ones count
    expect(elapsedDays + future.length).toBe(7);
    expect(elapsedDays).toBe(new Date().getDay() + 1);
  });

  it('marks a day with logged minutes as trained', () => {
    const result = getConsistencyGrid([session(0, { duration: 30 })], { weeks: 2 });
    const today = result.grid.flat().find((d) => d.isToday);

    expect(today.trained).toBe(true);
    expect(today.minutes).toBe(30);
    expect(today.sessions).toBe(1);
    expect(result.trainedDays).toBe(1);
    expect(result.totalMinutes).toBe(30);
  });

  it('sums multiple sessions on the same day', () => {
    const result = getConsistencyGrid(
      [session(0, { duration: 20 }), session(0, { duration: 25 })],
      { weeks: 1 }
    );
    const today = result.grid.flat().find((d) => d.isToday);
    expect(today.minutes).toBe(45);
    expect(today.sessions).toBe(2);
    expect(result.trainedDays).toBe(1);
  });

  it('does not count a zero-minute row as trained', () => {
    const result = getConsistencyGrid([session(0, { duration: 0 })], { weeks: 1 });
    expect(result.trainedDays).toBe(0);
  });

  it('measures the longest rest gap over elapsed days only', () => {
    // Trained today and 5 days ago -> a 4 day gap between them
    const result = getConsistencyGrid(
      [session(0, { duration: 30 }), session(5, { duration: 30 })],
      { weeks: 3 }
    );
    expect(result.longestGap).toBeGreaterThanOrEqual(4);
    expect(result.longestGapStart).toBeInstanceOf(Date);
  });

  it('reports no gap when every elapsed day was trained', () => {
    const everyDay = Array.from({ length: 40 }, (_, i) => session(i, { duration: 20 }));
    const result = getConsistencyGrid(everyDay, { weeks: 5 });
    expect(result.longestGap).toBe(0);
    expect(result.trainedDays).toBe(result.elapsedDays);
  });

  it('survives malformed input', () => {
    expect(getConsistencyGrid(undefined).grid).toHaveLength(5);
    expect(getConsistencyGrid(null).trainedDays).toBe(0);
    expect(getConsistencyGrid([{ timestamp: 'nope' }, {}]).trainedDays).toBe(0);
    // Nonsensical widths fall back to the 5-week default, not a 1-row grid
    expect(getConsistencyGrid([], { weeks: 0 }).weeks).toBe(5);
    expect(getConsistencyGrid([], { weeks: -3 }).weeks).toBe(5);
    expect(getConsistencyGrid([], { weeks: 'abc' }).weeks).toBe(5);
  });
});

describe('intensity mix', () => {
  const { getIntensityMix, normaliseIntensity } = require('../utils/activityAnalytics');
  const at = (intensity, duration) => ({ ...session(0, { duration }), intensity });

  it('maps legacy values instead of lumping them into moderate', () => {
    // Rows predating the picker change still hold low / high / very_high
    expect(normaliseIntensity('low')).toBe('light');
    expect(normaliseIntensity('high')).toBe('vigorous');
    expect(normaliseIntensity('very_high')).toBe('vigorous');
    expect(normaliseIntensity('VIGOROUS')).toBe('vigorous');
    expect(normaliseIntensity(undefined)).toBe('moderate');
    expect(normaliseIntensity('sideways')).toBe('moderate');
  });

  it('splits minutes by bucket and shares to 100', () => {
    const mix = getIntensityMix([at('light', 20), at('moderate', 30), at('vigorous', 50)]);

    expect(mix.minutes).toEqual({ light: 20, moderate: 30, vigorous: 50 });
    expect(mix.total).toBe(100);
    expect(mix.shares.light + mix.shares.moderate + mix.shares.vigorous).toBe(100);
    expect(mix.dominant).toBe('vigorous');
  });

  it('folds legacy rows into the right bucket', () => {
    const mix = getIntensityMix([at('low', 10), at('very_high', 10)]);
    expect(mix.minutes.light).toBe(10);
    expect(mix.minutes.vigorous).toBe(10);
    expect(mix.minutes.moderate).toBe(0);
  });

  it('counts vigorous minutes double toward the guideline', () => {
    const mix = getIntensityMix([at('moderate', 30), at('vigorous', 30)]);
    expect(mix.guidelineMinutes).toBe(30 + 60);
  });

  it('reports no data rather than a fake split', () => {
    const mix = getIntensityMix([]);
    expect(mix.hasData).toBe(false);
    expect(mix.dominant).toBeNull();
    expect(mix.shares).toEqual({ light: 0, moderate: 0, vigorous: 0 });
  });

  it('ignores zero-length and malformed rows', () => {
    expect(getIntensityMix([at('light', 0)]).hasData).toBe(false);
    expect(getIntensityMix(undefined).total).toBe(0);
    expect(getIntensityMix([{}]).total).toBe(0);
  });
});

describe('time of day pattern', () => {
  const { getTimeOfDayPattern } = require('../utils/activityAnalytics');
  const atHour = (hour, duration = 30) => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(hour, 0, 0, 0);
    return { timestamp: d.toISOString(), duration, calories: 100 };
  };

  it('buckets sessions by local hour', () => {
    const pattern = getTimeOfDayPattern([atHour(6), atHour(9), atHour(13), atHour(19), atHour(22)]);
    const byKey = Object.fromEntries(pattern.buckets.map((b) => [b.key, b.sessions]));

    expect(byKey).toEqual({ early: 1, morning: 1, midday: 1, evening: 1, night: 1 });
    expect(pattern.totalSessions).toBe(5);
  });

  it('handles the night bucket wrapping past midnight', () => {
    const pattern = getTimeOfDayPattern([atHour(23), atHour(2)]);
    const night = pattern.buckets.find((b) => b.key === 'night');
    expect(night.sessions).toBe(2);
  });

  it('reports the dominant slot and its average length', () => {
    const pattern = getTimeOfDayPattern([atHour(9, 20), atHour(9, 40), atHour(19, 10)]);
    expect(pattern.dominant.key).toBe('morning');
    expect(pattern.dominant.averageMinutes).toBe(30);
  });

  it('refuses to claim a pattern from too few sessions', () => {
    expect(getTimeOfDayPattern([atHour(9), atHour(9)]).hasPattern).toBe(false);
    expect(getTimeOfDayPattern([]).hasPattern).toBe(false);
    expect(getTimeOfDayPattern([]).dominant).toBeNull();
  });

  it('survives malformed timestamps', () => {
    expect(getTimeOfDayPattern([{ timestamp: 'nope' }, {}]).totalSessions).toBe(0);
    expect(getTimeOfDayPattern(undefined).totalSessions).toBe(0);
  });
});

describe('personal bests', () => {
  const { getPersonalBests } = require('../utils/activityAnalytics');

  it('finds the longest session and biggest burn', () => {
    const bests = getPersonalBests([
      session(1, { duration: 30, calories: 200 }),
      session(9, { duration: 75, calories: 150 }),
      session(20, { duration: 20, calories: 520 }),
    ]);

    expect(bests.longestSession.duration).toBe(75);
    expect(bests.biggestBurn.calories).toBe(520);
    expect(bests.totalSessions).toBe(3);
  });

  it('finds the best week by minutes, grouped from Sunday', () => {
    const bests = getPersonalBests([
      session(1, { duration: 20 }),
      session(2, { duration: 25 }),
      session(30, { duration: 90 }),
    ]);

    expect(bests.bestWeek.minutes).toBe(90);
    expect(bests.bestWeek.weekStart.getDay()).toBe(0);
  });

  it('reports a single session as the best rather than inventing a record', () => {
    const bests = getPersonalBests([session(0, { duration: 12, calories: 60 })]);
    expect(bests.longestSession.duration).toBe(12);
    expect(bests.bestWeek.sessions).toBe(1);
  });

  it('returns nulls for an empty history', () => {
    expect(getPersonalBests([])).toEqual({
      longestSession: null,
      biggestBurn: null,
      bestWeek: null,
      totalSessions: 0,
    });
  });

  it('does not report a zero-duration or zero-calorie best', () => {
    const bests = getPersonalBests([session(0, { duration: 0, calories: 0 })]);
    expect(bests.longestSession).toBeNull();
    expect(bests.biggestBurn).toBeNull();
  });

  it('ignores rows with unparseable timestamps', () => {
    expect(getPersonalBests([{ timestamp: 'nope', duration: 99 }]).totalSessions).toBe(0);
  });
});

describe('muscle balance', () => {
  const { getMuscleBalance } = require('../utils/activityAnalytics');
  const CATALOGUE = {
    'leg-press': { muscleGroup: 'Lower Body' },
    'lat-pulldown': { muscleGroup: 'Upper Body' },
    plank: { muscleGroup: 'Core' },
  };
  const resolve = (id) => CATALOGUE[id];
  const withExercise = (daysAgo, exerciseId, duration = 30) => ({
    ...session(daysAgo, { duration }),
    exerciseId,
  });

  it('groups minutes by muscle group and ranks them', () => {
    const balance = getMuscleBalance(
      [
        withExercise(0, 'leg-press', 40),
        withExercise(1, 'lat-pulldown', 20),
        withExercise(2, 'lat-pulldown', 30),
      ],
      resolve
    );

    expect(balance.groups.map((g) => g.group)).toEqual(['Upper Body', 'Lower Body']);
    expect(balance.groups[0]).toMatchObject({ minutes: 50, sessions: 2 });
    expect(balance.attributedMinutes).toBe(90);
    expect(balance.hasData).toBe(true);
  });

  it('does not guess a muscle group for rows without exercise identity', () => {
    // Everything logged before migration 0041
    const balance = getMuscleBalance([session(0, { duration: 45 })], resolve);

    expect(balance.hasData).toBe(false);
    expect(balance.groups).toEqual([]);
    expect(balance.unattributedMinutes).toBe(45);
  });

  it('keeps identified and legacy rows separate', () => {
    const balance = getMuscleBalance(
      [withExercise(0, 'plank', 10), session(1, { duration: 50 })],
      resolve
    );

    expect(balance.attributedMinutes).toBe(10);
    expect(balance.unattributedMinutes).toBe(50);
  });

  it('reports days since each group was last trained', () => {
    const balance = getMuscleBalance(
      [withExercise(0, 'leg-press'), withExercise(9, 'lat-pulldown')],
      resolve
    );

    const upper = balance.groups.find((g) => g.group === 'Upper Body');
    expect(upper.daysSince).toBe(9);
    expect(balance.stalest.group).toBe('Upper Body');
  });

  it('handles an unknown exercise id and malformed input', () => {
    expect(getMuscleBalance([withExercise(0, 'not-real')], resolve).hasData).toBe(false);
    expect(getMuscleBalance(undefined, resolve).hasData).toBe(false);
    expect(getMuscleBalance([withExercise(0, 'plank')], undefined).hasData).toBe(false);
  });
});

describe('mood and activity link', () => {
  const { getMoodActivityLink } = require('../utils/activityAnalytics');
  const dayKey = (daysAgo) => {
    const d = new Date(Date.now() - daysAgo * DAY_MS);
    return d.toISOString().slice(0, 10);
  };
  const rated = (daysAgo, intensity) => ({ dayKey: dayKey(daysAgo), intensity, hasData: true });

  it('compares mood on active days against rest days', () => {
    const activities = [0, 1, 2].map((d) => session(d, { duration: 30 }));
    const trend = [
      rated(0, 8), rated(1, 8), rated(2, 8),
      rated(3, 5), rated(4, 5), rated(5, 5),
    ];

    const link = getMoodActivityLink(activities, trend);
    expect(link.activeDays).toBe(3);
    expect(link.restDays).toBe(3);
    expect(link.activeMean).toBe(8);
    expect(link.restMean).toBe(5);
    expect(link.difference).toBe(3);
    expect(link.hasComparison).toBe(true);
  });

  it('refuses a comparison when either side is too thin', () => {
    const link = getMoodActivityLink([session(0)], [rated(0, 7), rated(1, 5)]);
    expect(link.hasComparison).toBe(false);
  });

  it('ignores unrated days', () => {
    const link = getMoodActivityLink([], [
      { dayKey: dayKey(0), intensity: null, hasData: false },
      rated(1, 6),
    ]);
    expect(link.sampleSize).toBe(1);
    expect(link.restDays).toBe(1);
  });

  it('survives malformed input', () => {
    expect(getMoodActivityLink(undefined, undefined).sampleSize).toBe(0);
    expect(getMoodActivityLink([{ timestamp: 'nope' }], [rated(0, 5)]).restDays).toBe(1);
  });
});

describe('next session suggestion', () => {
  const { getNextSessionSuggestion } = require('../utils/activityAnalytics');

  it('suggests a session sized to the remaining days', () => {
    const suggestion = getNextSessionSuggestion(
      { remainingMinutes: 90, daysLeft: 3, percentage: 40 },
      { stalest: null }
    );

    expect(suggestion.hasSuggestion).toBe(true);
    expect(suggestion.minutes).toBeGreaterThanOrEqual(15);
    expect(suggestion.minutes).toBeLessThanOrEqual(60);
    expect(suggestion.reasons[0]).toMatch(/90 min from your weekly target/);
  });

  it('names a stale muscle group as the focus', () => {
    const suggestion = getNextSessionSuggestion(
      { remainingMinutes: 60, daysLeft: 2, percentage: 60 },
      { stalest: { group: 'Lower Body', daysSince: 9 } }
    );

    expect(suggestion.focus).toBe('Lower Body');
    expect(suggestion.reasons.join(' ')).toMatch(/lower body last trained 9 days ago/);
  });

  it('does not call a group stale after a single rest day', () => {
    const suggestion = getNextSessionSuggestion(
      { remainingMinutes: 30, daysLeft: 2, percentage: 80 },
      { stalest: { group: 'Core', daysSince: 1 } }
    );
    expect(suggestion.focus).toBeNull();
  });

  it('says nothing when the target is met and nothing is stale', () => {
    const suggestion = getNextSessionSuggestion(
      { remainingMinutes: 0, daysLeft: 1, percentage: 100 },
      { stalest: { group: 'Core', daysSince: 1 } }
    );
    expect(suggestion.hasSuggestion).toBe(false);
    expect(suggestion.reasons).toEqual([]);
  });

  it('never emits NaN for missing inputs', () => {
    const suggestion = getNextSessionSuggestion(undefined, undefined);
    expect(Number.isFinite(suggestion.minutes)).toBe(true);
    expect(suggestion.reasons.join(' ')).not.toMatch(/NaN|undefined/);
  });
});

describe('session timeline grouping', () => {
  const { groupSessionsByDay } = require('../utils/activityAnalytics');

  it('groups by day, newest first, and sums minutes', () => {
    const groups = groupSessionsByDay([
      session(0, { duration: 20 }),
      session(0, { duration: 25 }),
      session(1, { duration: 30 }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Today');
    expect(groups[0].sessions).toHaveLength(2);
    expect(groups[0].minutes).toBe(45);
    expect(groups[1].label).toBe('Yesterday');
  });

  it('uses weekday names inside the last week and dates beyond it', () => {
    const recent = groupSessionsByDay([session(3)])[0];
    expect(recent.label).toMatch(/^(Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)day$/);

    const old = groupSessionsByDay([session(20)])[0];
    expect(old.label).toMatch(/\d/);
  });

  it('orders sessions within the newest bucket first overall', () => {
    const groups = groupSessionsByDay([session(5), session(0), session(2)]);
    expect(groups.map((g) => g.daysAgo)).toEqual([0, 2, 5]);
  });

  it('respects the limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => session(i));
    expect(groupSessionsByDay(many, { limit: 5 }).length).toBeLessThanOrEqual(5);
  });

  it('drops rows with unparseable timestamps', () => {
    expect(groupSessionsByDay([{ timestamp: 'nope' }, {}])).toEqual([]);
    expect(groupSessionsByDay(undefined)).toEqual([]);
  });
});
