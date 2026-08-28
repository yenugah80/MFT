import { calculateRecoveryScore, RECOVERY_FACTOR_WEIGHTS } from '../services/activityRecommendationEngine.js';

describe('activity recovery coverage', () => {
  it('reports every configured signal and does not hide absent stress', () => {
    const result = calculateRecoveryScore(
      {
        sleep: { durationHours: 8, quality: 8 },
        hydration: { isAdequate: true },
        mood: { score: 7 },
      },
      { daysSinceLastActivity: 2 }
    );

    expect(result.factors.map((factor) => factor.factor)).toEqual(Object.keys(RECOVERY_FACTOR_WEIGHTS));
    expect(result.factors.find((factor) => factor.factor === 'stress')).toMatchObject({
      counted: false,
      value: null,
      weight: 0.25,
    });
    expect(result.coverage).toMatchObject({
      counted: 4,
      total: 5,
      countedWeight: 75,
      missingWeight: 25,
      missing: ['stress'],
      isReliable: true,
    });
  });

  it('withholds reliability when the configured weight with data is below half', () => {
    const result = calculateRecoveryScore({}, { daysSinceLastActivity: null });

    expect(result.coverage.total).toBe(5);
    expect(result.coverage.counted).toBe(0);
    expect(result.coverage.missingWeight).toBe(100);
    expect(result.coverage.isReliable).toBe(false);
  });
});
