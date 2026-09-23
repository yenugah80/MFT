import {
  buildStressDailySummaries,
  normalizeHistoryQuery,
  summarizeClockTimes,
  summarizeSleepHistory,
  summarizeStressHistory,
} from '../src/utils/wellnessHistory.js';

describe('wellness history summaries', () => {
  it('normalizes and clamps untrusted query parameters', () => {
    expect(normalizeHistoryQuery({ days: '2', limit: '900', offset: '-8' }))
      .toEqual({ days: 7, limit: 100, offset: 0 });
    expect(normalizeHistoryQuery({ days: '90', limit: '25', offset: '5' }))
      .toEqual({ days: 90, limit: 25, offset: 5 });
    expect(normalizeHistoryQuery({ days: '30oops', limit: '2.5', offset: '1abc' }))
      .toEqual({ days: 30, limit: 100, offset: 0 });
  });

  it('summarizes the complete sleep range', () => {
    const result = summarizeSleepHistory([
      { sleepDate: '2026-08-24', durationMinutes: 480, quality: 8 },
      { sleepDate: '2026-08-25', durationMinutes: 360, quality: 6 },
    ]);
    expect(result).toMatchObject({
      avgDurationMinutes: 420,
      avgDurationHours: 7,
      avgQuality: 7,
      daysTracked: 2,
      goalNights: 1,
      restorativeNights: 1,
    });
  });

  it('treats bedtime values around midnight as close together', () => {
    const result = summarizeClockTimes([23 * 60 + 50, 10]);
    expect(result.averageMinutes).toBe(0);
    expect(result.standardDeviationMinutes).toBe(10);
  });

  it('groups stress check-ins by day for calm and high-stress counts', () => {
    const logs = [
      { loggedDate: '2026-08-24', level: 2, triggers: ['work'], copingUsed: ['breathing'] },
      { loggedDate: '2026-08-24', level: 4, triggers: ['work'], copingUsed: [] },
      { loggedDate: '2026-08-25', level: 8, triggers: ['health'], copingUsed: ['breathing'] },
    ];
    expect(summarizeStressHistory(logs)).toMatchObject({
      avgLevel: 4.7,
      entriesCount: 3,
      calmDays: 1,
      highStressDays: 1,
      daysWithData: 2,
      topTrigger: 'work',
      topCoping: 'breathing',
    });
    expect(buildStressDailySummaries(logs)).toEqual([
      { date: '2026-08-24', avgLevel: 3, latestLevel: 2, entriesCount: 2, highStress: false },
      { date: '2026-08-25', avgLevel: 8, latestLevel: 8, entriesCount: 1, highStress: true },
    ]);
  });
});
