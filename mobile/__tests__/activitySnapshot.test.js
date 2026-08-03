/**
 * Regression tests for deriveTodaySnapshot.
 *
 * DashboardContent read `todayData` off useActivityLog — a key that hook has
 * never returned — so WellnessScoreCard received
 * { minutes: 0, intensity: 'moderate', types: [] } for every user, and the
 * activity quarter of the wellness score (25 of 100 points) was permanently 0.
 *
 * These tests pin the shape that call site depends on: `types` must be an
 * ARRAY (wellnessScore.js reads .length for the variety bonus) even though the
 * API sends a { type: minutes } map, and `intensity` must be one of the
 * backend's light/moderate/vigorous values.
 */

import { deriveTodaySnapshot } from '../utils/activitySnapshot';

describe('deriveTodaySnapshot', () => {
  it('maps the API summary onto the wellness score contract', () => {
    const snapshot = deriveTodaySnapshot(
      { totalMinutes: 45, totalCalories: 320, activityCount: 2, types: { cardio: 30, strength: 15 } },
      [
        { intensity: 'vigorous', durationMinutes: 30 },
        { intensity: 'moderate', durationMinutes: 15 },
      ]
    );

    expect(snapshot.minutes).toBe(45);
    expect(snapshot.calories).toBe(320);
    expect(snapshot.count).toBe(2);
    expect(snapshot.types).toEqual(['cardio', 'strength']);
    expect(snapshot.intensity).toBe('vigorous');
  });

  it('returns types as an array, never the raw map', () => {
    const snapshot = deriveTodaySnapshot({ types: { yoga: 20 } }, []);
    // wellnessScore.js reads activityTypes.length — an object would score 0
    expect(Array.isArray(snapshot.types)).toBe(true);
    expect(snapshot.types).toHaveLength(1);
  });

  it('picks the intensity carrying the most minutes, not the most rows', () => {
    const snapshot = deriveTodaySnapshot({ totalMinutes: 70 }, [
      { intensity: 'light', durationMinutes: 10 },
      { intensity: 'light', durationMinutes: 10 },
      { intensity: 'vigorous', durationMinutes: 50 },
    ]);

    expect(snapshot.intensity).toBe('vigorous');
  });

  it('falls back to moderate when no activity is logged', () => {
    const snapshot = deriveTodaySnapshot({}, []);
    expect(snapshot).toEqual({
      minutes: 0,
      calories: 0,
      count: 0,
      types: [],
      intensity: 'moderate',
    });
  });

  it('survives undefined, null and malformed input', () => {
    expect(deriveTodaySnapshot(undefined, undefined).minutes).toBe(0);
    expect(deriveTodaySnapshot(null, null).types).toEqual([]);
    expect(deriveTodaySnapshot({}, 'not-an-array').intensity).toBe('moderate');
    expect(deriveTodaySnapshot({ totalMinutes: null }, [{}]).minutes).toBe(0);
  });

  it('treats rows with a missing intensity as moderate', () => {
    const snapshot = deriveTodaySnapshot({ totalMinutes: 20 }, [{ durationMinutes: 20 }]);
    expect(snapshot.intensity).toBe('moderate');
  });

  it('coerces string numerics rather than concatenating them', () => {
    const snapshot = deriveTodaySnapshot(
      { totalMinutes: '45', totalCalories: '320', activityCount: '2' },
      [{ intensity: 'light', durationMinutes: '30' }]
    );

    expect(snapshot.minutes).toBe(45);
    expect(snapshot.calories).toBe(320);
    expect(snapshot.count).toBe(2);
    expect(snapshot.intensity).toBe('light');
  });
});
