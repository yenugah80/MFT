/**
 * Regression test for a field-name bug found 2026-08-16 while wiring "Your
 * Progress" onto the decision-brain Insight Engine: calculateActivityStats
 * and generateActivityTrendData read `log.loggedDate` on activity_log rows,
 * but that table's timestamp column is `loggedAt` (loggedDate belongs to
 * food_log/mood_log/water_log). Every activity_log row therefore produced
 * `new Date(undefined)`, and `.toISOString()`/`.getHours()` on an Invalid
 * Date throws — GET /api/decision-brain/activity-insights 500'd for every
 * user, always, since this code was written. It's called both by the
 * Dashboard (useIntelligence.js) and, as of this session, the Your Progress
 * Activity tab.
 */
import { calculateActivityStats, generateActivityTrendData } from '../src/services/decisionBrainService.js';

const activityLog = (overrides) => ({
  durationMinutes: 30,
  caloriesBurned: 200,
  type: 'walking',
  loggedAt: new Date(),
  ...overrides,
});

describe('calculateActivityStats', () => {
  it('does not throw and returns real stats for logs with only `loggedAt` (no loggedDate field)', () => {
    const logs = [
      activityLog({ loggedAt: new Date('2026-08-11T08:00:00Z'), durationMinutes: 20 }),
      activityLog({ loggedAt: new Date('2026-08-12T08:00:00Z'), durationMinutes: 25 }),
      activityLog({ loggedAt: new Date('2026-08-13T08:00:00Z'), durationMinutes: 30 }),
    ];

    let result;
    expect(() => { result = calculateActivityStats(logs, []); }).not.toThrow();
    expect(result.activeDays).toBe(3);
    expect(result.totalMinutesThisWeek + 0).not.toBeNaN();
    expect(result.mostActiveDay).not.toBeNull();
    expect(result.preferredTime).not.toBeNull();
  });

  it('would previously have thrown RangeError: Invalid time value on any non-empty input', () => {
    // Guard against the fix regressing back to `log.loggedDate`: a log
    // object that ONLY has loggedAt (matches the real activity_log schema)
    // must not produce an Invalid Date internally.
    const logs = [activityLog()];
    expect(() => calculateActivityStats(logs, [])).not.toThrow(/Invalid time value/);
  });

  it('handles the empty-logs short-circuit without touching dates at all', () => {
    const result = calculateActivityStats([], []);
    expect(result.activeDays).toBe(0);
    expect(result.mostActiveDay).toBeNull();
  });
});

describe('generateActivityTrendData', () => {
  it('does not throw and correctly buckets logs by day using loggedAt', () => {
    const today = new Date();
    const logs = [activityLog({ loggedAt: today, durationMinutes: 40, caloriesBurned: 300 })];

    let trend;
    expect(() => { trend = generateActivityTrendData(logs); }).not.toThrow();
    expect(trend).toHaveLength(7);

    const todayEntry = trend.find((d) => d.isToday);
    expect(todayEntry.hasData).toBe(true);
    expect(todayEntry.minutes).toBe(40);
    expect(todayEntry.caloriesBurned).toBe(300);
  });

  it('marks days with no activity as hasData: false rather than crashing', () => {
    const trend = generateActivityTrendData([]);
    expect(trend.every((d) => d.hasData === false)).toBe(true);
  });
});
