import { buildMoodDistribution, getMoodTrendStartDate } from '../src/utils/moodTrends.js';

describe('mood trend range and distribution', () => {
  it('builds inclusive Day, Week, and Month windows in the user timezone', () => {
    const nowMs = Date.parse('2026-08-26T15:00:00.000Z');
    expect(getMoodTrendStartDate({ days: 1, offsetMinutes: 240, nowMs }).toISOString())
      .toBe('2026-08-26T04:00:00.000Z');
    expect(getMoodTrendStartDate({ days: 7, offsetMinutes: 240, nowMs }).toISOString())
      .toBe('2026-08-20T04:00:00.000Z');
    expect(getMoodTrendStartDate({ days: 30, offsetMinutes: 240, nowMs }).toISOString())
      .toBe('2026-07-28T04:00:00.000Z');
  });

  it('calculates distribution from raw check-ins rather than dominant days', () => {
    expect(buildMoodDistribution([
      { mood: 'happy' },
      { mood: 'happy' },
      { mood: 'calm' },
      { mood: 'stressed' },
    ])).toEqual([
      { mood: 'happy', count: 2, percentage: 50 },
      { mood: 'calm', count: 1, percentage: 25 },
      { mood: 'stressed', count: 1, percentage: 25 },
    ]);
  });
});
