const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toDayKey = (date, offsetMinutes) => {
  const offset = Number.isFinite(offsetMinutes) ? offsetMinutes : date.getTimezoneOffset();
  const localMs = date.getTime() - offset * 60 * 1000;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, '0');
  const day = String(local.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dayKeyToDate = (dayKey) => {
  if (!dayKey) return null;
  const [year, month, day] = dayKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

const getDaysAgo = (dayKey, todayKey) => {
  const dayDate = dayKeyToDate(dayKey);
  const todayDate = dayKeyToDate(todayKey);
  if (!dayDate || !todayDate) return 0;
  const diffMs = todayDate.getTime() - dayDate.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
};

const percentile = (values, p) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const winsorize = (values, lowerP = 0.1, upperP = 0.9) => {
  if (values.length < 5) return values;
  const lower = percentile(values, lowerP);
  const upper = percentile(values, upperP);
  if (lower === null || upper === null) return values;
  return values.map((value) => clamp(value, lower, upper));
};

const computeWeightedAverage = (values, weights) => {
  if (!values.length) return null;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) return null;
  const weightedSum = values.reduce((sum, v, i) => sum + v * weights[i], 0);
  return weightedSum / totalWeight;
};

const computeWeightedVariance = (values, weights, mean) => {
  if (!values.length) return 0;
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) return 0;
  const varianceSum = values.reduce((sum, v, i) => {
    const diff = v - mean;
    return sum + weights[i] * diff * diff;
  }, 0);
  return varianceSum / totalWeight;
};

const buildRecommendation = ({ latestMood, avgMood, confidenceLevel }) => {
  if (!latestMood || confidenceLevel === 'low') return null;

  const intensity = latestMood.intensity;
  const energy = latestMood.energyLevel;

  if (Number.isFinite(intensity) && intensity <= 3) {
    return 'Keep it gentle today: light movement, hydration, and a balanced meal can help reset.';
  }
  if (Number.isFinite(energy) && energy <= 3) {
    return 'Energy looks low. Try a protein-forward snack and a short stretch break.';
  }
  if (Number.isFinite(avgMood) && avgMood >= 7) {
    return 'Your mood is trending strong. Protect your sleep window and keep routines consistent.';
  }
  if (Number.isFinite(intensity) && intensity >= 8) {
    return 'Great mood momentum—capture what helped today so you can repeat it.';
  }
  return 'Look for one small win today: water, movement, or a balanced meal can lift your baseline.';
};

export const aggregateMoodInsights = ({
  logs = [],
  windowDays = 30,
  trendDays = 7,
  today = new Date(),
} = {}) => {
  const normalized = logs
    .map((log) => {
      if (!log?.loggedDate) return null;
      const loggedAt = new Date(log.loggedDate);
      if (Number.isNaN(loggedAt.getTime())) return null;

      const intensity = clamp(Number(log.intensity ?? 5), 1, 10);
      const energyLevel = clamp(Number(log.energyLevel ?? 5), 1, 10);
      const mood = typeof log.mood === 'string' ? log.mood.toLowerCase() : 'neutral';
      const dayKey = log.dayKey || toDayKey(loggedAt);

      return {
        ...log,
        mood,
        intensity,
        energyLevel,
        loggedAt,
        dayKey,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());

  const latestMood = normalized[0] || null;
  const totalLogs = normalized.length;
  const effectiveOffset = today.getTimezoneOffset();
  const todayKey = toDayKey(today, effectiveOffset);

  const dayBuckets = new Map();
  normalized.forEach((log) => {
    if (!dayBuckets.has(log.dayKey)) {
      dayBuckets.set(log.dayKey, []);
    }
    dayBuckets.get(log.dayKey).push(log);
  });

  const dailySummaries = Array.from(dayBuckets.entries()).map(([dayKey, entries]) => {
    const intensities = entries.map((entry) => entry.intensity);
    const capped = winsorize(intensities);
    const avgIntensity = capped.reduce((sum, v) => sum + v, 0) / capped.length;
    const moodCounts = {};
    entries.forEach((entry) => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    const moods = Object.keys(moodCounts);
    const dominantMood = moods.length === 0
      ? 'neutral'
      : moods.sort((a, b) => moodCounts[b] - moodCounts[a])[0];
    return {
      dayKey,
      intensity: Number(avgIntensity.toFixed(1)),
      count: entries.length,
      dominantMood,
    };
  });

  const sortedSummaries = dailySummaries.sort((a, b) => (a.dayKey > b.dayKey ? 1 : -1));
  const filteredSummaries = sortedSummaries.filter((summary) => {
    return getDaysAgo(summary.dayKey, todayKey) <= Math.max(0, windowDays - 1);
  });
  const daysWithLogs = filteredSummaries.length;
  const summaryByDay = new Map(filteredSummaries.map((summary) => [summary.dayKey, summary]));

  const trendKeys = [];
  const cursor = new Date(today);
  for (let i = 0; i < trendDays; i++) {
    trendKeys.unshift(toDayKey(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }

  const trendData = trendKeys.map((dayKey) => {
    const summary = summaryByDay.get(dayKey);
    return {
      dayKey,
      intensity: summary?.intensity ?? null,
      count: summary?.count ?? 0,
      hasData: Boolean(summary),
    };
  });

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todaySummary = summaryByDay.get(todayKey);
  const yesterdayKey = toDayKey(yesterday, effectiveOffset);
  const yesterdaySummary = summaryByDay.get(yesterdayKey);
  const delta = todaySummary && yesterdaySummary
    ? Number((todaySummary.intensity - yesterdaySummary.intensity).toFixed(1))
    : null;
  let direction = 'insufficient';
  if (delta !== null) {
    if (delta > 0.2) direction = 'up';
    else if (delta < -0.2) direction = 'down';
    else direction = 'flat';
  }

  const decayWeights = filteredSummaries.map((summary) => {
    const daysAgo = getDaysAgo(summary.dayKey, todayKey);
    return Math.exp(-daysAgo / 3);
  });
  const intensityValues = filteredSummaries.map((summary) => summary.intensity);
  const weightedAvg = computeWeightedAverage(intensityValues, decayWeights);
  const weightedVariance = weightedAvg !== null
    ? computeWeightedVariance(intensityValues, decayWeights, weightedAvg)
    : 0;

  const bestDay = filteredSummaries.reduce((best, current) => {
    if (!best) return current;
    return current.intensity > best.intensity ? current : best;
  }, null);

  const stats = {
    avgMood: weightedAvg !== null ? weightedAvg.toFixed(1) : null,
    bestDay: bestDay ? bestDay.dayKey : null,
    patternsDetected: filteredSummaries.length >= 7 && weightedVariance > 2,
  };

  const showStats = totalLogs >= 4;
  const showTrend = daysWithLogs >= 3;
  const showRecommendation = totalLogs >= 3;

  const lastLogDaysAgo = latestMood?.dayKey ? getDaysAgo(latestMood.dayKey, todayKey) : null;
  const coverageRatio = trendDays > 0 ? daysWithLogs / trendDays : 0;
  let confidenceLevel = 'low';
  if (
    totalLogs >= 10 &&
    daysWithLogs >= 5 &&
    coverageRatio >= 0.6 &&
    (lastLogDaysAgo === null || lastLogDaysAgo <= 2)
  ) {
    confidenceLevel = 'high';
  } else if (
    totalLogs >= 5 &&
    daysWithLogs >= 3 &&
    (lastLogDaysAgo === null || lastLogDaysAgo <= 7)
  ) {
    confidenceLevel = 'medium';
  }

  const recommendation = showRecommendation
    ? buildRecommendation({ latestMood, avgMood: Number(stats.avgMood), confidenceLevel })
    : null;

  return {
    latestMood,
    trendData,
    trendSummary: {
      direction,
      delta,
      lastIntensity: todaySummary?.intensity ?? null,
    },
    stats,
    confidenceLevel,
    dataQuality: {
      totalLogs,
      daysWithLogs,
      windowDays,
    },
    flags: {
      showStats,
      showTrend,
      showRecommendation,
    },
    recommendation,
  };
};
