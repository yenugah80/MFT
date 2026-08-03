/**
 * Insights summary aggregation
 *
 * Pure helpers behind the Insights screen cards. Kept out of the hook so the
 * arithmetic is unit-testable and every metric follows the same rules:
 *
 * - a period is `days` calendar days ending today; the comparison period is the
 *   `days` immediately before it
 * - a day with no log means zero for cumulative metrics (calories, litres,
 *   minutes) but *no data* for rated metrics (mood) — you can't average a 0/10
 *   mood on a day nobody rated
 * - `changePercent` is null, never 0, when there is nothing to compare against,
 *   so cards can say so instead of implying "no change"
 * - `average` is null, never 0, when nothing was logged
 */

/** Percentage change, or null when there's no baseline to compare against */
export function calcChange(current, previous) {
  if (!previous || previous === 0 || !Number.isFinite(previous)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Parse a timestamp or a plain `YYYY-MM-DD` day key.
 *
 * `new Date('2026-08-02')` is UTC midnight, which reads as Aug 1 anywhere west
 * of GMT — day-keyed aggregates (water, nutrition) must be treated as local.
 */
export function parseDayValue(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }
  return new Date(value);
}

/** Local calendar-day key for grouping */
const dayKey = (value) => parseDayValue(value).toDateString();

/**
 * Bucket entries into a zero-filled per-day series covering the current period
 * and the one before it.
 *
 * @returns {{ current: number[], previous: number[] }} oldest day first
 */
export function buildDailySeries({ entries = [], days = 7, getDate, getValue }) {
  // A zero or negative period would divide by zero downstream
  const span = Math.max(1, Math.floor(days) || 1);
  const totals = new Map();

  (entries || []).forEach((entry) => {
    const stamp = getDate(entry);
    if (!stamp) return;
    const parsed = parseDayValue(stamp);
    if (Number.isNaN(parsed.getTime())) return;
    const key = parsed.toDateString();
    totals.set(key, (totals.get(key) || 0) + (Number(getValue(entry)) || 0));
  });

  const series = [];
  for (let offset = span * 2 - 1; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    series.push(totals.get(dayKey(day)) || 0);
  }

  return { previous: series.slice(0, span), current: series.slice(span) };
}

const sum = (values) => values.reduce((total, value) => total + value, 0);

/**
 * Summarise a cumulative metric (calories, litres, minutes) over both periods.
 *
 * `average` is per calendar day — a week where you logged twice averages over
 * seven days, not two, otherwise a single big day reads as a great week.
 */
export function summariseCumulative({
  entries = [],
  days = 7,
  getDate,
  getValue,
  unit,
  decimals = 0,
  ...rest
}) {
  const span = Math.max(1, Math.floor(days) || 1);
  const { current, previous } = buildDailySeries({ entries, days: span, getDate, getValue });

  const currentTotal = sum(current);
  const previousTotal = sum(previous);
  const daysWithData = current.filter((value) => value > 0).length;
  const round = (value) =>
    decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value);

  return {
    average: daysWithData > 0 ? round(currentTotal / span) : null,
    total: round(currentTotal),
    dailyValues: current.map((value) => round(value)),
    daysWithData,
    periodDays: span,
    // Both windows are the same length, so totals compare directly — rounding
    // the averages first distorts the percentage on small numbers.
    changePercent: calcChange(currentTotal, previousTotal),
    hasComparison: previousTotal > 0,
    unit,
    ...rest,
  };
}

/**
 * Summarise mood from the aggregated trend series.
 *
 * Expects entries shaped like moodAggregation's trendData
 * ({ dayKey, intensity, hasData }), oldest first, covering 2 x days.
 */
export function summariseMoodSeries(trendData = [], days = 7, unit = '/10') {
  const span = Math.max(1, Math.floor(days) || 1);
  const series = Array.isArray(trendData) ? trendData : [];
  // Take the trailing 2 x days so a longer window still splits correctly
  const window = series.slice(-span * 2);
  const padded = [
    ...Array(Math.max(0, span * 2 - window.length)).fill(null),
    ...window,
  ];

  const ratedOf = (slice) =>
    slice
      .map((entry) => (entry && entry.hasData !== false ? entry.intensity : null))
      .filter((value) => typeof value === 'number' && Number.isFinite(value));

  const previousRated = ratedOf(padded.slice(0, span));
  const currentSlice = padded.slice(span);
  const currentRated = ratedOf(currentSlice);

  const mean = (values) =>
    values.length > 0 ? values.reduce((total, v) => total + v, 0) / values.length : null;

  const currentMean = mean(currentRated);
  const previousMean = mean(previousRated);

  return {
    // Rated metric: average only the days that were actually rated
    average: currentMean !== null ? Number(currentMean.toFixed(1)) : null,
    dailyValues: currentSlice.map((entry) =>
      entry && typeof entry.intensity === 'number' ? entry.intensity : 0
    ),
    daysWithData: currentRated.length,
    periodDays: span,
    changePercent:
      currentMean !== null && previousMean !== null
        ? calcChange(currentMean, previousMean)
        : null,
    hasComparison: previousMean !== null,
    unit,
  };
}

/**
 * Reduce raw activity history rows into everything the Insights activity card
 * needs: the daily minute series for this period and the one before it, the
 * period-over-period trend, and the concrete breakdown of what was trained.
 *
 * @param {Array} rows - /activity/history rows covering at least 2 x days
 * @param {number} days - length of one period (7 or 30)
 * @param {{ target?: number, weeklyMinutes?: number }} weeklyProgress
 */
export function summariseActivityHistory(rows = [], days = 7, weeklyProgress = {}) {
  const history = Array.isArray(rows) ? rows : [];
  const stampOf = (row) => row.loggedAt || row.createdAt;

  const base = summariseCumulative({
    entries: history,
    days,
    getDate: stampOf,
    getValue: (row) => row.durationMinutes || 0,
    unit: 'min',
  });

  // Rows inside the current window, newest first — what the card describes
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - (days - 1));
  windowStart.setHours(0, 0, 0, 0);

  const currentRows = history
    .filter((row) => {
      const stamp = stampOf(row);
      return stamp && new Date(stamp) >= windowStart;
    })
    .sort((a, b) => new Date(stampOf(b)) - new Date(stampOf(a)));

  // Minutes and calories per activity type, biggest first
  const typeTotals = new Map();
  let totalCalories = 0;
  currentRows.forEach((row) => {
    totalCalories += row.caloriesBurned || 0;
    const entry = typeTotals.get(row.type) || { type: row.type, minutes: 0, calories: 0, count: 0 };
    entry.minutes += row.durationMinutes || 0;
    entry.calories += row.caloriesBurned || 0;
    entry.count += 1;
    typeTotals.set(row.type, entry);
  });

  return {
    ...base,
    dailyValues: base.dailyValues.slice(-7),
    totalMinutes: base.total,
    totalCalories,
    workoutCount: currentRows.length,
    activeDays: base.daysWithData,
    byType: [...typeTotals.values()].sort((a, b) => b.minutes - a.minutes),
    lastWorkout: currentRows[0] || null,
    target: weeklyProgress?.target || 150,
    weeklyMinutes: weeklyProgress?.weeklyMinutes || 0,
  };
}
