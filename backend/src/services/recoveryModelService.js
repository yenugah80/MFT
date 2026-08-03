/**
 * Personal recovery model.
 *
 * The recovery score weights every signal the same for everyone — sleep 40%,
 * stress 25%, prior training 20%, hydration 10%, mood 5%. Those numbers were
 * chosen by a developer, not measured from anyone's data, yet they are
 * presented as if personal.
 *
 * This learns them per user instead, by correlating each signal against an
 * OUTCOME the signal did not produce.
 *
 * Choosing the outcome matters. Correlating the signals against the recovery
 * score itself would be circular: the score is a fixed-weight combination of
 * those same signals, so the exercise would just recover the hardcoded weights
 * and call them personal. Next-day mood is independent of the formula and is
 * already logged natively. When HealthKit lands, next-morning HRV is the
 * better outcome — it is involuntary — and slots in here unchanged.
 *
 * Nothing is reported below MIN_PAIRED_DAYS. A correlation over a handful of
 * days is noise, and dressing noise as "your personal model" would be the same
 * fabrication this replaces.
 */

/** Paired days needed before any weight is reported */
export const MIN_PAIRED_DAYS = 21;

/** Paired days needed for one individual signal to be included */
export const MIN_SIGNAL_PAIRS = 10;

/**
 * Same-day mood is excluded as an input: it is the outcome's own signal on a
 * neighbouring day and would correlate with itself.
 */
export const MODEL_SIGNALS = ['sleep', 'stress', 'hydration', 'activity_load'];

/** The generic weights this is trying to replace */
export const DEFAULT_WEIGHTS = {
  sleep: 0.4,
  stress: 0.25,
  activity_load: 0.2,
  hydration: 0.1,
};

/**
 * Pearson correlation. Returns null when the input cannot support one —
 * fewer than three pairs, or no variance on either side (a signal that never
 * changes explains nothing, however strongly it appears to line up).
 */
export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;

  const meanX = xs.reduce((sum, v) => sum + v, 0) / n;
  const meanY = ys.reduce((sum, v) => sum + v, 0) / n;

  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }

  if (sumSqX === 0 || sumSqY === 0) return null;

  const r = numerator / Math.sqrt(sumSqX * sumSqY);
  return Number.isFinite(r) ? r : null;
}

/**
 * Pair each day's signal values with the FOLLOWING day's outcome.
 *
 * @param {Array<{ dayKey: string, signals: Record<string, number> }>} days
 * @param {Record<string, number>} outcomeByDay - dayKey -> outcome value
 */
export function buildPairs(days, outcomeByDay) {
  const byKey = new Map((days || []).map((day) => [day.dayKey, day]));
  const pairs = [];

  byKey.forEach((day, dayKey) => {
    const next = new Date(`${dayKey}T00:00:00Z`);
    if (Number.isNaN(next.getTime())) return;
    next.setUTCDate(next.getUTCDate() + 1);
    const nextKey = next.toISOString().slice(0, 10);

    const outcome = outcomeByDay?.[nextKey];
    if (!Number.isFinite(outcome)) return;

    pairs.push({ dayKey, signals: day.signals || {}, outcome });
  });

  return pairs.sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1));
}

/**
 * Learn relative weights from paired days.
 *
 * Weights come from |r| normalised across the signals that cleared the pair
 * threshold, so they express relative influence rather than effect size. A
 * signal with too few pairs keeps its default and is marked as such.
 */
export function learnWeights(pairs) {
  const total = pairs?.length || 0;

  const signals = MODEL_SIGNALS.map((key) => {
    const xs = [];
    const ys = [];

    (pairs || []).forEach((pair) => {
      const value = pair.signals?.[key];
      if (Number.isFinite(value) && Number.isFinite(pair.outcome)) {
        xs.push(value);
        ys.push(pair.outcome);
      }
    });

    const r = xs.length >= MIN_SIGNAL_PAIRS ? pearson(xs, ys) : null;

    return {
      signal: key,
      pairs: xs.length,
      r: r === null ? null : Number(r.toFixed(3)),
      defaultWeight: DEFAULT_WEIGHTS[key] ?? 0,
      learned: r !== null,
    };
  });

  const learnable = signals.filter((s) => s.learned);
  const magnitude = learnable.reduce((sum, s) => sum + Math.abs(s.r), 0);

  const withWeights = signals.map((signal) => {
    if (!signal.learned || magnitude === 0) {
      return { ...signal, weight: signal.defaultWeight, source: 'default' };
    }
    return {
      ...signal,
      weight: Number((Math.abs(signal.r) / magnitude).toFixed(3)),
      source: 'learned',
    };
  });

  const ready = total >= MIN_PAIRED_DAYS && learnable.length >= 2;

  return {
    status: ready ? 'ready' : 'learning',
    sampleSize: total,
    minPairedDays: MIN_PAIRED_DAYS,
    // What the user still needs before this turns on
    daysRemaining: Math.max(0, MIN_PAIRED_DAYS - total),
    signals: withWeights.sort((a, b) => b.weight - a.weight),
    // Only meaningful once ready; kept out of the payload otherwise so the
    // client cannot accidentally present learning-phase numbers as findings
    ...(ready
      ? {
          strongest: withWeights.find((s) => s.source === 'learned') || null,
        }
      : {}),
  };
}

export default { pearson, buildPairs, learnWeights, MIN_PAIRED_DAYS, MODEL_SIGNALS };
