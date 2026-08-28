import {
  calculateMoodStats,
  generateMoodTrendData,
  moodWellbeingScore,
} from '../src/services/decisionBrainService.js';

const moodLog = (mood, intensity, loggedDate, energyLevel = 5) => ({
  mood,
  intensity,
  energyLevel,
  loggedDate: new Date(loggedDate),
});

describe('decision-brain mood semantics', () => {
  it('does not mistake strong distress for a high wellbeing score', () => {
    expect(moodWellbeingScore('happy', 9)).toBe(9);
    expect(moodWellbeingScore('stressed', 9)).toBe(2);
    expect(moodWellbeingScore('sad', 8)).toBe(3);
    expect(moodWellbeingScore('neutral', 9)).toBe(5);
  });

  it('detects improvement from intense stress to calm using valence-adjusted scores', () => {
    const logs = [
      moodLog('stressed', 9, '2026-08-20T12:00:00Z'),
      moodLog('stressed', 8, '2026-08-21T12:00:00Z'),
      moodLog('calm', 7, '2026-08-22T12:00:00Z'),
      moodLog('calm', 8, '2026-08-23T12:00:00Z'),
    ];

    const result = calculateMoodStats(logs);
    expect(result.trend).toBe('improving');
    expect(result.avgMood).toBe(5);
  });

  it('uses the same wellbeing semantics in seven-day trend points', () => {
    const now = new Date();
    const trend = generateMoodTrendData([
      moodLog('stressed', 9, now.toISOString()),
    ]);
    const today = trend.find((entry) => entry.isToday);
    expect(today.intensity).toBe(2);
  });
});
