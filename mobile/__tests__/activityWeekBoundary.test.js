/**
 * Regression test for the week boundary used by Activity Insights.
 *
 * The client anchored its week to MONDAY while the backend anchors weekly
 * progress to SUNDAY. On a Monday the two disagreed by a full day, so the
 * Activity Insights screen rendered "0 / 1500 kcal, 0 workouts, 0% complete"
 * directly above "Cardio 35 kcal, 100%" computed from the very same rows.
 */

import { getWeekStart, getThisWeekActivities, calculateWeeklyGoalProgress } from '../utils/activityAnalytics';

const at = (date, hour = 12) => {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

describe('week boundary', () => {
  it('anchors to Sunday, matching the backend', () => {
    // 2026-08-03 is a Monday; its week must start Sunday 2026-08-02
    expect(getWeekStart(new Date(2026, 7, 3)).getDay()).toBe(0);
    expect(getWeekStart(new Date(2026, 7, 3)).getDate()).toBe(2);
  });

  it('keeps Sunday in the same week as the Monday that follows it', () => {
    const monday = new Date(2026, 7, 3);
    const weekStart = getWeekStart(monday);
    expect(weekStart <= new Date(2026, 7, 2, 12)).toBe(true);
  });

  it('counts yesterday\'s Sunday workout when today is Monday', () => {
    // The reported case: one 35 kcal cardio session logged "yesterday"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const activities = [{ timestamp: at(yesterday), calories: 35, duration: 5, category: 'Cardio' }];
    const thisWeek = getThisWeekActivities(activities);

    // Only assert the Monday case explicitly; on other weekdays yesterday is
    // trivially inside the window, which the same expectation covers.
    if (new Date().getDay() === 1) {
      expect(thisWeek).toHaveLength(1);
    } else if (new Date().getDay() !== 0) {
      expect(thisWeek).toHaveLength(1);
    }
  });

  it('does not report zero calories while a breakdown shows some', () => {
    const today = new Date();
    const activities = [{ timestamp: at(today), calories: 35, duration: 5, category: 'Cardio' }];

    const progress = calculateWeeklyGoalProgress(activities);
    expect(progress.calories).toBe(35);
    expect(progress.workoutCount).toBe(1);
  });

  it('excludes activity from before this week', () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 9);
    expect(getThisWeekActivities([{ timestamp: at(lastWeek), calories: 500 }])).toHaveLength(0);
  });

  it('tolerates missing, malformed and non-array input', () => {
    expect(getThisWeekActivities(undefined)).toEqual([]);
    expect(getThisWeekActivities(null)).toEqual([]);
    expect(getThisWeekActivities([{ timestamp: 'nonsense' }, {}])).toEqual([]);
    expect(calculateWeeklyGoalProgress([]).calories).toBe(0);
  });
});
