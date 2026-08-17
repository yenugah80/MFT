/**
 * Regression tests for the shared confidence/severity math and two
 * representative pattern detectors in correlationEngineService.js — the
 * engine behind every "your mood dips when X" insight shown on the
 * Dashboard and (per the Insight Engine / Food Engine split documented in
 * docs/architecture/recommendation-engine.md) eventually on Your Progress.
 *
 * Scope note: this file is a foundation, not full coverage. The service has
 * 25+ individual pattern-detector functions (dehydration, stress-eating,
 * caffeine crash, late-meal sleep impact, etc.) — testing all of them is a
 * separate, larger follow-up. This covers the shared confidence-scaling
 * math every detector's output flows through, plus two representative
 * detectors as a template for the rest.
 */
import {
  getScaledConfidence,
  hasInsufficientData,
  mapMoodToValence,
  calculateConfidence,
  determineHealthImpactSeverity,
  detectDehydrationFatigue,
  detectStressEatingPattern,
} from '../src/services/correlationEngineService.js';

describe('getScaledConfidence', () => {
  it('returns 0 below the minimum occurrence threshold (3)', () => {
    expect(getScaledConfidence(2, 0.9)).toBe(0);
    expect(getScaledConfidence(0, 0.9)).toBe(0);
  });

  it('scales up with more occurrences (early pattern -> statistically robust)', () => {
    const low = getScaledConfidence(3, 0.8);
    const mid = getScaledConfidence(10, 0.8);
    const high = getScaledConfidence(30, 0.8);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });

  it('never exceeds baseConfidence (30+ occurrences = 1.0 scale factor)', () => {
    expect(getScaledConfidence(30, 0.8)).toBeCloseTo(0.8, 10);
    expect(getScaledConfidence(100, 0.9)).toBeCloseTo(0.9, 10);
  });

  it('never exceeds 1.0 even with an inflated base confidence', () => {
    expect(getScaledConfidence(30, 1.5)).toBeLessThanOrEqual(1.0);
  });
});

describe('hasInsufficientData', () => {
  const logs = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));

  it('flags insufficient when below MIN_FOOD_LOGS (3) or MIN_MOOD_LOGS (2)', () => {
    expect(hasInsufficientData(logs(1), logs(5), logs(5)).isInsufficient).toBe(true);
    expect(hasInsufficientData(logs(5), logs(1), logs(5)).isInsufficient).toBe(true);
  });

  it('is sufficient once both food and mood minimums are met', () => {
    expect(hasInsufficientData(logs(3), logs(2), logs(0)).isInsufficient).toBe(false);
  });
});

describe('mapMoodToValence', () => {
  it('maps known moods to their documented valence', () => {
    expect(mapMoodToValence('happy')).toBe(1.0);
    expect(mapMoodToValence('sad')).toBe(-1.0);
    expect(mapMoodToValence('neutral')).toBe(0);
  });

  it('defaults unknown moods to neutral (0), never throws', () => {
    expect(mapMoodToValence('unknown_mood_xyz')).toBe(0);
    expect(mapMoodToValence(undefined)).toBe(0);
  });
});

describe('calculateConfidence', () => {
  it('increases with more occurrences, up to the 3-occurrence saturation point', () => {
    const one = calculateConfidence(1, 0.9, {});
    const three = calculateConfidence(3, 0.9, {});
    const six = calculateConfidence(6, 0.9, {});
    expect(one).toBeLessThan(three);
    expect(three).toBeCloseTo(six, 10); // occurrences/3 is capped at 1.0
  });

  it('applies confounder penalties multiplicatively and stacks them', () => {
    const clean = calculateConfidence(6, 0.9, {});
    const withSleep = calculateConfidence(6, 0.9, { hasPoorSleep: true });
    const withAll = calculateConfidence(6, 0.9, { hasPoorSleep: true, hasHighStress: true, hasExercise: true });
    expect(withSleep).toBeLessThan(clean);
    expect(withAll).toBeLessThan(withSleep);
  });

  it('never goes negative even with maximal confounding', () => {
    const result = calculateConfidence(1, 0.9, { hasPoorSleep: true, hasHighStress: true, hasExercise: true });
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('determineHealthImpactSeverity', () => {
  it('is always "positive" for beneficial patterns, regardless of domain count', () => {
    expect(determineHealthImpactSeverity(['mood', 'energy', 'sleep'], 10, true)).toBe('positive');
  });

  it('scales severity with number of affected domains and repetition', () => {
    expect(determineHealthImpactSeverity(['mood'], 1, false)).toBe('low');
    expect(determineHealthImpactSeverity(['mood', 'energy'], 1, false)).toBe('moderate');
    expect(determineHealthImpactSeverity(['mood', 'energy', 'sleep'], 3, false)).toBe('high');
  });
});

describe('detectDehydrationFatigue (representative detector)', () => {
  it('returns null when mood signals are missing', () => {
    expect(detectDehydrationFatigue(500, null, 2500)).toBeNull();
  });

  it('returns null when hydration is adequate, even with bad mood', () => {
    const badMood = { isNegativeMood: true, isLowEnergy: true, mood: 'tired', energyLevel: 3 };
    expect(detectDehydrationFatigue(2400, badMood, 2500)).toBeNull(); // 96% of goal
  });

  it('returns null when severely dehydrated but mood is fine', () => {
    const goodMood = { isNegativeMood: false, isLowEnergy: false, mood: 'happy', energyLevel: 8 };
    expect(detectDehydrationFatigue(500, goodMood, 2500)).toBeNull(); // 20% of goal
  });

  it('flags the pattern when both severely dehydrated AND negative low-energy mood', () => {
    const badMood = { isNegativeMood: true, isLowEnergy: true, mood: 'tired', energyLevel: 2 };
    const result = detectDehydrationFatigue(500, badMood, 2500); // 20% of goal
    expect(result).not.toBeNull();
    expect(result.ruleName).toBe('dehydration_fatigue_mood');
    expect(result.evidence.hydrationDeficit).toBeCloseTo(80, 0);
  });
});

describe('detectStressEatingPattern (representative detector)', () => {
  it('returns null below the high-stress threshold (6/10)', () => {
    expect(detectStressEatingPattern(5, 1, 3, 800)).toBeNull();
  });

  it('returns null at high stress if eating pattern is normal', () => {
    expect(detectStressEatingPattern(8, 3, 3, 100)).toBeNull();
  });

  it('flags meal_skipping at high stress with a low meal count', () => {
    const result = detectStressEatingPattern(8, 1, 3, 0);
    expect(result?.evidence.pattern).toBe('meal_skipping');
  });

  it('flags comfort_eating at high stress with a large calorie overage', () => {
    const result = detectStressEatingPattern(8, 3, 3, 600);
    expect(result?.evidence.pattern).toBe('comfort_eating');
  });
});
