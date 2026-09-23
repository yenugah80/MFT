export function getMoodTrendStartDate({ days, offsetMinutes = 0, nowMs = Date.now() }) {
  const safeDays = Math.max(1, Number.isFinite(days) ? Math.floor(days) : 1);
  const safeOffset = Number.isFinite(offsetMinutes) ? offsetMinutes : 0;
  const nowLocal = new Date(nowMs - safeOffset * 60 * 1000);
  nowLocal.setUTCDate(nowLocal.getUTCDate() - (safeDays - 1));
  nowLocal.setUTCHours(0, 0, 0, 0);
  return new Date(nowLocal.getTime() + safeOffset * 60 * 1000);
}

export function buildMoodDistribution(moods = []) {
  const counts = moods.reduce((result, entry) => {
    if (entry?.mood) result[entry.mood] = (result[entry.mood] || 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: moods.length > 0 ? Math.round((count / moods.length) * 100) : 0,
    }));
}
