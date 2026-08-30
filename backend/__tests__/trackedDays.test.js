import {
  calculateConsecutiveTrackedDays,
  collectTrackedDayKeys,
} from '../src/utils/trackedDays.js';

describe('account-wide tracked days', () => {
  it('counts every streak-eligible logging domain once per local day', () => {
    const days = collectTrackedDayKeys({
      foodLogs: [{ loggedDate: '2026-08-20T12:00:00.000Z' }],
      waterLogs: [{ loggedDate: '2026-08-20T18:00:00.000Z' }],
      moodLogs: [{ loggedDate: '2026-08-21T02:00:00.000Z', dayKey: '2026-08-20', timezoneOffset: 240 }],
      activityLogs: [{ loggedAt: '2026-08-21T14:00:00.000Z', dayKey: '2026-08-21', timezoneOffset: 240 }],
      sleepLogs: [{ wakeTime: '2026-08-22T11:00:00.000Z', timezoneOffset: 240 }],
      stressLogs: [{ loggedAt: '2026-08-23T01:00:00.000Z', dayKey: '2026-08-22', loggedDate: '2026-08-22' }],
      fallbackOffset: 240,
    });

    expect([...days].sort()).toEqual(['2026-08-20', '2026-08-21', '2026-08-22']);
  });

  it('matches the stored-streak grace rule when today has no entry yet', () => {
    const days = new Set(['2026-08-26', '2026-08-27', '2026-08-28']);

    expect(calculateConsecutiveTrackedDays(days, '2026-08-29')).toBe(3);
  });

  it('stops at the first missing calendar day', () => {
    const days = new Set(['2026-08-25', '2026-08-27', '2026-08-28', '2026-08-29']);

    expect(calculateConsecutiveTrackedDays(days, '2026-08-29')).toBe(3);
  });

  it('does not truncate mature streaks at one year', () => {
    const end = new Date('2026-08-29T00:00:00.000Z');
    const days = new Set();
    for (let index = 0; index < 500; index += 1) {
      const day = new Date(end);
      day.setUTCDate(day.getUTCDate() - index);
      days.add(day.toISOString().slice(0, 10));
    }

    expect(calculateConsecutiveTrackedDays(days, '2026-08-29')).toBe(500);
  });
});
