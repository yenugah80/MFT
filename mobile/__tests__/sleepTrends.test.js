import { calculateSleepTrends, summarizeClockTimes } from '../utils/sleepTrends';

describe('sleep trend calculations', () => {
  test('averages bedtimes across midnight without drifting toward noon', () => {
    const summary = summarizeClockTimes([23 * 60 + 50, 10]);

    expect(summary.averageMinutes).toBe(0);
    expect(summary.standardDeviationMinutes).toBe(10);
  });

  test('builds range KPIs and tag associations from history records', () => {
    const trends = calculateSleepTrends([
      {
        bedTime: '2026-08-21T02:30:00.000Z',
        wakeTime: '2026-08-21T10:30:00.000Z',
        sleepDate: '2026-08-20',
        timezoneOffset: 240,
        durationMinutes: 480,
        quality: 9,
        tags: { exercise: true },
      },
      {
        bedTime: '2026-08-22T03:00:00.000Z',
        wakeTime: '2026-08-22T10:00:00.000Z',
        sleepDate: '2026-08-21',
        timezoneOffset: 240,
        durationMinutes: 420,
        quality: 5,
        tags: { screenTime: true },
      },
      {
        bedTime: '2026-08-23T02:45:00.000Z',
        wakeTime: '2026-08-23T10:15:00.000Z',
        sleepDate: '2026-08-22',
        timezoneOffset: 240,
        durationMinutes: 450,
        quality: 8,
        tags: { exercise: true },
      },
    ]);

    expect(trends).toMatchObject({
      avgDurationMinutes: 450,
      avgDurationHours: 7.5,
      avgQuality: 7.3,
      avgBedTime: '22:45',
      avgWakeTime: '6:15',
      daysTracked: 3,
    });
    expect(trends.consistencyScore).toBeGreaterThan(80);
    expect(trends.tagImpact.exercise).toEqual({ impact: 3.5, occurrences: 2 });
    expect(trends.tagImpact.screenTime).toEqual({ impact: -3.5, occurrences: 1 });
    expect(trends.durationBuckets).toEqual({
      short: { label: 'Under 7h', count: 0, percentage: 0 },
      goal: { label: '7–9h', count: 3, percentage: 100 },
      long: { label: 'Over 9h', count: 0, percentage: 0 },
    });
    expect(trends.dayOfWeek).toMatchObject({
      Thursday: { count: 1, avgQuality: 9, avgDurationHours: 8 },
      Friday: { count: 1, avgQuality: 5, avgDurationHours: 7 },
      Saturday: { count: 1, avgQuality: 8, avgDurationHours: 7.5 },
    });
    expect(trends.trend).toMatchObject({ direction: 'improving', recentAvg: 8, olderAvg: 7 });
  });

  test('returns no analytics until at least three valid nights exist', () => {
    expect(calculateSleepTrends([
      { bedTime: '2026-08-21T02:30:00.000Z', durationMinutes: 480, quality: 8 },
    ])).toBeNull();
  });
});
