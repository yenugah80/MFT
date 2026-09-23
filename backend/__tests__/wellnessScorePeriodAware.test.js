import { generateCrossDomainRecommendations } from '../src/services/analyticsRecommendationService.js';

function makeStats({ avgCaloriesPerDay, avgDailyMl, avgMinutesPerDay, avgIntensityInPeriod, todayCalories = 999999, todayMl = 999999, weeklyMinutes = 999999, avgIntensityThisWeek = 1 }) {
  return {
    totalDataPoints: 10,
    food: { todayCalories, avgCaloriesPerDay },
    water: { todayMl, avgDailyMl },
    activity: { weeklyMinutes, avgMinutesPerDay },
    mood: { avgIntensityThisWeek, avgIntensityInPeriod },
    goals: { calorieGoal: 2000, waterGoalMl: 2000, activityGoalMinutes: 150 },
  };
}

const emptyLogs = { foodLogs: [], moodLogs: [], waterLogs: [], activityLogs: [] };

function scoreFor(stats) {
  const recs = generateCrossDomainRecommendations(stats, emptyLogs, [], {});
  return recs.find((r) => r.id === 'wellness_score');
}

describe('Wellness Score period-awareness', () => {
  it('changes when the period-scoped stats change, holding today/weekly fixed', () => {
    const low = scoreFor(makeStats({ avgCaloriesPerDay: 500, avgDailyMl: 500, avgMinutesPerDay: 5, avgIntensityInPeriod: 2 }));
    const high = scoreFor(makeStats({ avgCaloriesPerDay: 2000, avgDailyMl: 2000, avgMinutesPerDay: 21, avgIntensityInPeriod: 9 }));

    expect(low.metric.overall).not.toBe(high.metric.overall);
    expect(high.metric.overall).toBeGreaterThan(low.metric.overall);
  });

  it('does NOT change when only the today/weekly fields change (regression guard)', () => {
    // This is the actual bug this test protects against: the score used to
    // read food.todayCalories/water.todayMl/activity.weeklyMinutes/
    // mood.avgIntensityThisWeek directly, so it never varied with period.
    const periodScoped = { avgCaloriesPerDay: 1000, avgDailyMl: 1000, avgMinutesPerDay: 15, avgIntensityInPeriod: 5 };

    const a = scoreFor(makeStats({ ...periodScoped, todayCalories: 0, todayMl: 0, weeklyMinutes: 0, avgIntensityThisWeek: 0 }));
    const b = scoreFor(makeStats({ ...periodScoped, todayCalories: 5000, todayMl: 5000, weeklyMinutes: 5000, avgIntensityThisWeek: 10 }));

    expect(a.metric.overall).toBe(b.metric.overall);
    expect(a.metric.breakdown).toEqual(b.metric.breakdown);
  });

  it('scales the activity score against a daily-equivalent CDC target, not the raw weekly figure', () => {
    // 150 min/week goal -> ~21.4 min/day equivalent. 21.4 min/day should
    // score at (approximately) 100, not the ~14% you'd get from naively
    // dividing a daily figure by the weekly goal number.
    const rec = scoreFor(makeStats({ avgCaloriesPerDay: 0, avgDailyMl: 0, avgMinutesPerDay: 150 / 7, avgIntensityInPeriod: 0 }));
    expect(rec.metric.breakdown.activity).toBeGreaterThanOrEqual(99);
  });
});
