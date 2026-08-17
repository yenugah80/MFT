/**
 * Pure-math regression tests for the Thompson Sampling bandit.
 *
 * This is the core learning loop behind every food recommendation the app
 * shows — a silent bug here doesn't crash anything, it just makes
 * recommendations quietly worse over weeks in a way nobody notices until
 * acceptance rates drop. Zero coverage existed for any of this before now.
 */
import {
  generateArmKey,
  getTimeBucket,
  betaMean,
  betaVariance,
  betaCredibleInterval,
  applyDecay,
  sampleBeta,
  sampleGamma,
} from '../src/services/thompsonSamplingService.js';

describe('generateArmKey', () => {
  it('composes recommendationType:mealType:timeBucket', () => {
    expect(generateArmKey({ recommendationType: 'PROTEIN_BOOST', mealType: 'breakfast', timeBucket: 'morning' }))
      .toBe('PROTEIN_BOOST:breakfast:morning');
  });
});

describe('getTimeBucket', () => {
  it.each([
    [4, 'night'],
    [5, 'morning'],
    [9, 'morning'],
    [10, 'midday'],
    [11, 'midday'],
    [12, 'afternoon'],
    [16, 'afternoon'],
    [17, 'evening'],
    [20, 'evening'],
    [21, 'night'],
    [23, 'night'],
  ])('hour %i -> %s', (hour, expected) => {
    expect(getTimeBucket(hour)).toBe(expected);
  });
});

describe('betaMean / betaVariance', () => {
  it('mean of a symmetric Beta(1,1) is 0.5', () => {
    expect(betaMean(1, 1)).toBeCloseTo(0.5, 10);
  });

  it('mean shifts toward alpha as successes accumulate', () => {
    expect(betaMean(10, 1)).toBeCloseTo(10 / 11, 10);
    expect(betaMean(1, 10)).toBeCloseTo(1 / 11, 10);
  });

  it('variance shrinks as trials accumulate (more confident posterior)', () => {
    const varFewTrials = betaVariance(2, 2);
    const varManyTrials = betaVariance(50, 50);
    expect(varManyTrials).toBeLessThan(varFewTrials);
  });
});

describe('betaCredibleInterval', () => {
  it('is centered near the mean and clamped to [0,1]', () => {
    const { lower, upper } = betaCredibleInterval(5, 5);
    expect(lower).toBeGreaterThanOrEqual(0);
    expect(upper).toBeLessThanOrEqual(1);
    expect(lower).toBeLessThan(betaMean(5, 5));
    expect(upper).toBeGreaterThan(betaMean(5, 5));
  });

  it('narrows as trial count grows', () => {
    const wide = betaCredibleInterval(2, 2);
    const narrow = betaCredibleInterval(200, 200);
    expect(narrow.upper - narrow.lower).toBeLessThan(wide.upper - wide.lower);
  });
});

describe('applyDecay', () => {
  const DEFAULT_ALPHA = 1;
  const DEFAULT_BETA = 1;

  it('does not decay updates from less than a day ago', () => {
    const justNow = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const result = applyDecay(20, 3, justNow);
    expect(result).toEqual({ alpha: 20, beta: 3 });
  });

  it('pulls parameters toward the uniform prior over time', () => {
    const twentyEightDaysAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000); // 2 half-lives
    const result = applyDecay(20, 3, twentyEightDaysAgo);
    // After 2 half-lives, ~75% of the way back to the (1,1) prior.
    expect(result.alpha).toBeLessThan(20);
    expect(result.alpha).toBeGreaterThan(DEFAULT_ALPHA);
    expect(result.beta).toBeLessThan(3);
    expect(result.beta).toBeGreaterThanOrEqual(DEFAULT_BETA);
  });

  it('never decays past the uniform prior floor, even after a very long time', () => {
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const result = applyDecay(20, 3, yearAgo);
    expect(result.alpha).toBeCloseTo(DEFAULT_ALPHA, 1);
    expect(result.beta).toBeCloseTo(DEFAULT_BETA, 1);
  });
});

describe('sampleGamma / sampleBeta statistical sanity', () => {
  // These are stochastic — assert distributional properties over many draws
  // rather than exact values, with generous tolerance to avoid flakiness.
  it('sampleGamma always returns a positive number', () => {
    for (let i = 0; i < 200; i++) {
      expect(sampleGamma(3, 1)).toBeGreaterThan(0);
    }
  });

  it('sampleGamma handles shape < 1 via the transformation branch without erroring', () => {
    for (let i = 0; i < 50; i++) {
      expect(sampleGamma(0.5, 1)).toBeGreaterThan(0);
    }
  });

  it('sampleBeta stays within [0,1] and its empirical mean converges near the analytic mean', () => {
    const alpha = 8, beta = 2;
    const n = 3000;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = sampleBeta(alpha, beta);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      sum += v;
    }
    const empiricalMean = sum / n;
    expect(empiricalMean).toBeCloseTo(betaMean(alpha, beta), 1); // within 0.05
  });
});
