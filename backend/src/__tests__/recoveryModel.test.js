/**
 * Tests for the personal recovery model.
 *
 * The thing being guarded is restraint: this must report nothing until there
 * are enough paired days, and must never present learning-phase noise as a
 * finding. That is the whole reason it exists — the weights it replaces
 * (40/25/20/10) were picked by a developer and presented as personal.
 */

import {
  pearson,
  buildPairs,
  learnWeights,
  MIN_PAIRED_DAYS,
  MODEL_SIGNALS,
  DEFAULT_WEIGHTS,
} from '../services/recoveryModelService.js';

const dayKey = (offset) => {
  const d = new Date(Date.UTC(2026, 0, 1));
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

describe('pearson', () => {
  it('finds a perfect positive relationship', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5);
  });

  it('finds a perfect negative relationship', () => {
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 5);
  });

  it('refuses fewer than three pairs', () => {
    expect(pearson([1, 2], [2, 4])).toBeNull();
    expect(pearson([], [])).toBeNull();
  });

  it('refuses a signal with no variance', () => {
    // A value that never changes explains nothing, however well it lines up
    expect(pearson([5, 5, 5, 5], [1, 2, 3, 4])).toBeNull();
    expect(pearson([1, 2, 3, 4], [7, 7, 7, 7])).toBeNull();
  });
});

describe('buildPairs', () => {
  it('pairs a day with the FOLLOWING day outcome', () => {
    const days = [
      { dayKey: dayKey(0), signals: { sleep: 80 } },
      { dayKey: dayKey(1), signals: { sleep: 40 } },
    ];
    const outcomes = { [dayKey(1)]: 7, [dayKey(2)]: 4 };

    const pairs = buildPairs(days, outcomes);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toMatchObject({ dayKey: dayKey(0), outcome: 7 });
    expect(pairs[1]).toMatchObject({ dayKey: dayKey(1), outcome: 4 });
  });

  it('drops days whose next day has no outcome', () => {
    const days = [{ dayKey: dayKey(0), signals: { sleep: 80 } }];
    expect(buildPairs(days, {})).toEqual([]);
    expect(buildPairs(days, { [dayKey(5)]: 6 })).toEqual([]);
  });

  it('survives malformed input', () => {
    expect(buildPairs(undefined, undefined)).toEqual([]);
    expect(buildPairs([{ dayKey: 'nonsense', signals: {} }], { x: 1 })).toEqual([]);
  });
});

describe('learnWeights', () => {
  /** n days where sleep tracks the outcome and hydration is pure noise */
  const buildSample = (n) =>
    Array.from({ length: n }, (_, i) => ({
      dayKey: dayKey(i),
      signals: {
        sleep: 40 + (i % 10) * 6,
        stress: 50,
        hydration: (i * 37) % 100,
        activity_load: 50 + ((i % 4) - 2) * 5,
      },
      outcome: 3 + (i % 10) * 0.6,
    }));

  it('stays in the learning phase below the threshold', () => {
    const model = learnWeights(buildSample(MIN_PAIRED_DAYS - 1));

    expect(model.status).toBe('learning');
    expect(model.daysRemaining).toBe(1);
    // Learning-phase numbers must not be presented as findings
    expect(model.strongest).toBeUndefined();
  });

  it('reports zero sample honestly', () => {
    const model = learnWeights([]);
    expect(model.status).toBe('learning');
    expect(model.sampleSize).toBe(0);
    expect(model.daysRemaining).toBe(MIN_PAIRED_DAYS);
  });

  it('turns on once there are enough paired days', () => {
    const model = learnWeights(buildSample(MIN_PAIRED_DAYS + 5));

    expect(model.status).toBe('ready');
    expect(model.daysRemaining).toBe(0);
    expect(model.strongest).toBeTruthy();
  });

  it('ranks the signal that actually tracks the outcome first', () => {
    const model = learnWeights(buildSample(30));
    expect(model.signals[0].signal).toBe('sleep');
    expect(model.signals[0].source).toBe('learned');
  });

  it('keeps the default weight for a signal with too few pairs', () => {
    const sample = buildSample(30).map((day, i) => ({
      ...day,
      // Hydration logged on only a handful of days
      signals: { ...day.signals, hydration: i < 4 ? day.signals.hydration : undefined },
    }));

    const model = learnWeights(sample);
    const hydration = model.signals.find((s) => s.signal === 'hydration');

    expect(hydration.source).toBe('default');
    expect(hydration.weight).toBe(DEFAULT_WEIGHTS.hydration);
  });

  it('keeps defaults for a signal that never varies', () => {
    const model = learnWeights(buildSample(30));
    const stress = model.signals.find((s) => s.signal === 'stress');
    // Constant at 50 across every day — no variance, so nothing to learn
    expect(stress.source).toBe('default');
    expect(stress.r).toBeNull();
  });

  it('covers every modelled signal exactly once', () => {
    const model = learnWeights(buildSample(30));
    expect(model.signals.map((s) => s.signal).sort()).toEqual([...MODEL_SIGNALS].sort());
  });

  it('never emits NaN weights', () => {
    [0, 1, 5, 21, 40].forEach((n) => {
      learnWeights(buildSample(n)).signals.forEach((signal) => {
        expect(Number.isFinite(signal.weight)).toBe(true);
      });
    });
  });
});
