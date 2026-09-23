export const HYDRATION_RANGE_OPTIONS = [
  { key: 'day', days: 1, label: 'Day' },
  { key: 'week', days: 7, label: '7 days' },
  { key: 'month', days: 30, label: '30 days' },
  { key: 'quarter', days: 90, label: '90 days' },
];

export const HYDRATION_PERIODS = [
  { key: 'morning', label: 'Morning', hours: '5am to 12pm' },
  { key: 'afternoon', label: 'Afternoon', hours: '12pm to 5pm' },
  { key: 'evening', label: 'Evening', hours: '5pm to 9pm' },
  { key: 'night', label: 'Night', hours: '9pm to 5am' },
];

export function getLocalDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getHydrationPeriod(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function parseLocalDayKey(dateKey) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Turns dense daily history into calendar-week averages for a readable chart.
 * Only days with an entry contribute to the average. A week with no entries
 * remains at zero so missing coverage stays visible instead of being invented.
 */
export function groupHydrationSeriesByWeek(series = [], goalMl = 2000) {
  const buckets = [];
  const bucketByWeek = new Map();

  series.forEach((day) => {
    const date = parseLocalDayKey(day?.date);
    if (!date) return;

    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = getLocalDayKey(weekStart);

    let bucket = bucketByWeek.get(weekKey);
    if (!bucket) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      bucket = {
        date: weekKey,
        endDate: getLocalDayKey(weekEnd),
        dayOfWeek: 0,
        isToday: false,
        loggedTotalMl: 0,
        trackedDays: 0,
        daysOnTarget: 0,
      };
      bucketByWeek.set(weekKey, bucket);
      buckets.push(bucket);
    }

    const ml = Math.max(0, Number(day.ml) || 0);
    if (ml > 0) {
      bucket.loggedTotalMl += ml;
      bucket.trackedDays += 1;
      if (ml >= goalMl) bucket.daysOnTarget += 1;
    }
    if (day.isToday) bucket.isToday = true;
  });

  return buckets.map(({ loggedTotalMl, ...bucket }) => ({
    ...bucket,
    ml: bucket.trackedDays ? Math.round(loggedTotalMl / bucket.trackedDays) : 0,
  }));
}

function getHydrationMl(log) {
  const hydrationLiters = Number(log?.hydrationLiters);
  const rawLiters = Number(log?.amountLiters);
  const liters = Number.isFinite(hydrationLiters) && hydrationLiters > 0
    ? hydrationLiters
    : (Number.isFinite(rawLiters) ? rawLiters : 0);
  return Math.max(0, Math.round(liters * 1000));
}

export function summarizeHydrationRange({
  fullSeries = [],
  logs = [],
  rangeDays = 7,
  goalMl = 2000,
}) {
  const series = fullSeries.slice(-rangeDays);
  const dateKeys = new Set(series.map((day) => day.date));
  const rangeLogs = logs.filter((log) => dateKeys.has(getLocalDayKey(log.loggedDate)));
  const loggedDays = series.filter((day) => Number(day.ml) > 0);
  const totalMl = loggedDays.reduce((sum, day) => sum + Number(day.ml || 0), 0);
  const daysOnTarget = series.filter((day) => Number(day.ml) >= goalMl).length;
  const bestDay = loggedDays.reduce(
    (best, day) => (!best || Number(day.ml) > Number(best.ml) ? day : best),
    null,
  );

  let streak = 0;
  for (let index = fullSeries.length - 1; index >= 0; index -= 1) {
    const day = fullSeries[index];
    if (Number(day.ml) >= goalMl * 0.8) streak += 1;
    else if (day.isToday) continue;
    else break;
  }

  const beverageTotals = {};
  const periodTotals = Object.fromEntries(
    HYDRATION_PERIODS.map((period) => [period.key, 0]),
  );
  rangeLogs.forEach((log) => {
    const amountMl = getHydrationMl(log);
    const beverageType = log.beverageType || 'water';
    beverageTotals[beverageType] = (beverageTotals[beverageType] || 0) + amountMl;

    const date = new Date(log.loggedDate);
    if (!Number.isNaN(date.getTime())) {
      const period = getHydrationPeriod(date.getHours());
      periodTotals[period] += amountMl;
    }
  });

  const beverageEntries = Object.entries(beverageTotals).sort((a, b) => b[1] - a[1]);
  const beverageTotalMl = beverageEntries.reduce((sum, [, ml]) => sum + ml, 0);
  const [topBeverageType, topBeverageMl = 0] = beverageEntries[0] || [];
  const periodEntries = Object.entries(periodTotals).sort((a, b) => b[1] - a[1]);
  const [peakPeriod, peakPeriodMl = 0] = periodEntries[0] || [];

  return {
    series,
    rangeLogs,
    totalMl,
    daysTracked: loggedDays.length,
    daysOnTarget,
    averageLoggedDayMl: loggedDays.length ? Math.round(totalMl / loggedDays.length) : 0,
    goalRate: series.length ? Math.round((daysOnTarget / series.length) * 100) : 0,
    trackingRate: series.length ? Math.round((loggedDays.length / series.length) * 100) : 0,
    bestDay,
    streak,
    topBeverageType: topBeverageType || null,
    topBeverageShare: beverageTotalMl > 0
      ? Math.round((topBeverageMl / beverageTotalMl) * 100)
      : 0,
    beverageTotals,
    peakPeriod: peakPeriodMl > 0 ? peakPeriod : null,
    periodTotals,
  };
}

export function buildHydrationInsights(summary, goalMl) {
  if (!summary?.daysTracked) {
    return [{
      key: 'start',
      icon: 'water-outline',
      title: 'No intake logged in this range',
      body: 'Log a drink to begin tracking this period.',
    }];
  }

  const insights = [
    {
      key: 'consistency',
      icon: 'calendar-outline',
      title: `${summary.daysTracked} of ${summary.series.length} days tracked`,
      body: summary.daysTracked === summary.series.length
        ? 'Every day in this range has at least one hydration entry.'
        : 'Days without an entry stay visible, so gaps are not hidden.',
    },
    {
      key: 'goal',
      icon: 'flag-outline',
      title: `${summary.daysOnTarget} goal ${summary.daysOnTarget === 1 ? 'day' : 'days'}`,
      body: summary.averageLoggedDayMl > 0
        ? `Your logged-day average is ${Math.round((summary.averageLoggedDayMl / Math.max(goalMl, 1)) * 100)}% of your daily goal.`
        : 'There is not enough intake data to compare with your goal yet.',
    },
  ];

  if (summary.topBeverageType) {
    insights.push({
      key: 'beverage',
      icon: 'cafe-outline',
      title: `${summary.topBeverageShare}% from your top drink`,
      body: 'Drink mix uses hydration-adjusted volume, not raw serving size.',
    });
  }

  if (summary.peakPeriod) {
    const period = HYDRATION_PERIODS.find((item) => item.key === summary.peakPeriod);
    insights.push({
      key: 'timing',
      icon: 'time-outline',
      title: `${period?.label || 'One period'} has your most logged volume`,
      body: 'This reflects when entries were recorded, which may differ from when you drank.',
    });
  }

  return insights;
}
