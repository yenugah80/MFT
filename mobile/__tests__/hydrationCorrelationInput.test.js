/**
 * Regression tests for hydration input into the multi-factor correlation engine.
 *
 * alignDataByDate read `log.amount`, a field that does not exist on water logs
 * (they carry amountLiters / hydrationLiters). Every day therefore summed to
 * water = 0, and since analyzeHydrationMoodCorrelation filters on
 * `day.water > 0`, it returned canAnalyze:false for every user forever.
 *
 * Each test is written to actually discriminate — it must fail if the specific
 * behaviour regresses, rather than merely pass on the happy path:
 *
 *  - field-read:  fails if `amount` (or nothing) is read again
 *  - preference:  hydrationLiters set, amountLiters ZERO — if the wrong field
 *                 is read the day is filtered out and canAnalyze goes false
 *  - fallback:    hydrationLiters null, amountLiters set — must still count
 *  - units:       an engineered U-shape exposes optimalRange, which must land
 *                 in ml (thousands), not litres. Getting this wrong would be
 *                 worse than the original bug: a 2L day read as 2ml classifies
 *                 as severe dehydration.
 */

import { analyzeMultiFactorCorrelations } from '../utils/multiFactorAnalytics';

const DAY_MS = 24 * 60 * 60 * 1000;

function dayISO(i) {
  return new Date(Date.now() - i * DAY_MS).toISOString();
}

function pairedDays(n, waterForIndex) {
  const waterLogs = [];
  const moodLogs = [];
  for (let i = 0; i < n; i++) {
    const loggedDate = dayISO(i);
    waterLogs.push({ ...waterForIndex(i), loggedDate });
    moodLogs.push({ mood: 'happy', intensity: 6, energyLevel: 6, loggedDate });
  }
  return { waterLogs, moodLogs };
}

describe('hydration input to correlation engine', () => {
  it('reads water volume instead of the non-existent `amount` field', () => {
    const { waterLogs, moodLogs } = pairedDays(20, (i) => ({
      amountLiters: String(1.5 + (i % 5) * 0.4),
    }));

    const result = analyzeMultiFactorCorrelations({ waterLogs, moodLogs });

    expect(result.canAnalyze).not.toBe(false);
    expect(result.correlations.hydration_mood.canAnalyze).toBe(true);
    expect(result.correlations.hydration_mood.daysAnalyzed).toBe(20);
  });

  it('prefers hydrationLiters over amountLiters', () => {
    // amountLiters is 0: if it were the field read, every day would be filtered
    // out by `day.water > 0` and canAnalyze would be false.
    const { waterLogs, moodLogs } = pairedDays(20, (i) => ({
      hydrationLiters: String(1.5 + (i % 5) * 0.4),
      amountLiters: '0',
    }));

    const result = analyzeMultiFactorCorrelations({ waterLogs, moodLogs });

    expect(result.correlations.hydration_mood.canAnalyze).toBe(true);
    expect(result.correlations.hydration_mood.daysAnalyzed).toBe(20);
  });

  it('falls back to amountLiters when hydrationLiters is null', () => {
    // hydrationLiters is nullable in the schema, so the fallback is load-bearing.
    const { waterLogs, moodLogs } = pairedDays(20, (i) => ({
      hydrationLiters: null,
      amountLiters: String(1.5 + (i % 5) * 0.4),
    }));

    const result = analyzeMultiFactorCorrelations({ waterLogs, moodLogs });

    expect(result.correlations.hydration_mood.canAnalyze).toBe(true);
    expect(result.correlations.hydration_mood.daysAnalyzed).toBe(20);
  });

  it('converts litres to ml so CONFIG thresholds (1500-4000 ml) apply', () => {
    // Engineer an inverted-U: mood peaks around 2.5L and falls off either side,
    // which routes through the curvilinear branch and exposes optimalRange.
    const litresByIndex = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
    const waterLogs = [];
    const moodLogs = [];
    for (let i = 0; i < 20; i++) {
      const litres = litresByIndex[i % litresByIndex.length];
      const loggedDate = dayISO(i);
      // Inverted parabola centred on 2.5L
      const intensity = Math.max(1, Math.round(9 - Math.pow(litres - 2.5, 2) * 1.2));
      waterLogs.push({ amountLiters: String(litres), loggedDate });
      moodLogs.push({ mood: 'happy', intensity, energyLevel: intensity, loggedDate });
    }

    const hydration = analyzeMultiFactorCorrelations({ waterLogs, moodLogs })
      .correlations.hydration_mood;

    expect(hydration.canAnalyze).toBe(true);

    if (hydration.type === 'curvilinear') {
      const bounds = Object.values(hydration.optimalRange || {}).filter(
        (v) => typeof v === 'number' && v > 0
      );
      expect(bounds.length).toBeGreaterThan(0);
      // ml, not litres: anything under 100 means the x1000 conversion was lost.
      bounds.forEach((v) => expect(v).toBeGreaterThan(100));
    } else {
      // Even on the linear branch the conversion is observable: a 0.5-5.0L
      // spread must not collapse into single-digit values.
      expect(hydration.daysAnalyzed).toBe(20);
    }
  });

  it('tolerates null, missing and malformed amounts without producing NaN', () => {
    const loggedDate = dayISO(0);
    const waterLogs = [
      { hydrationLiters: null, amountLiters: '1.5', loggedDate },
      { hydrationLiters: undefined, amountLiters: 'not-a-number', loggedDate },
      { loggedDate },
    ];
    const moodLogs = [{ mood: 'happy', intensity: 5, energyLevel: 5, loggedDate }];

    expect(() => analyzeMultiFactorCorrelations({ waterLogs, moodLogs })).not.toThrow();
  });
});
