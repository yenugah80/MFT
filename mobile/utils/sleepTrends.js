const MINUTES_PER_DAY = 24 * 60;

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function shortestClockDistance(minutes, referenceMinutes) {
  const distance = Math.abs(minutes - referenceMinutes);
  return Math.min(distance, MINUTES_PER_DAY - distance);
}

export function summarizeClockTimes(minutes = []) {
  const validMinutes = minutes.filter(
    (value) => Number.isFinite(value) && value >= 0 && value < MINUTES_PER_DAY
  );
  if (!validMinutes.length) return null;

  const angles = validMinutes.map((value) => (value / MINUTES_PER_DAY) * Math.PI * 2);
  const meanSin = angles.reduce((sum, angle) => sum + Math.sin(angle), 0) / angles.length;
  const meanCos = angles.reduce((sum, angle) => sum + Math.cos(angle), 0) / angles.length;
  let meanAngle = Math.atan2(meanSin, meanCos);
  if (meanAngle < 0) meanAngle += Math.PI * 2;

  const averageMinutes = Math.round((meanAngle / (Math.PI * 2)) * MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const variance = validMinutes.reduce((sum, value) => {
    const distance = shortestClockDistance(value, averageMinutes);
    return sum + (distance * distance);
  }, 0) / validMinutes.length;

  return {
    averageMinutes,
    standardDeviationMinutes: Math.sqrt(variance),
  };
}

function localClockMinutes(entry, field, fallbackOffsetMinutes) {
  const timestamp = new Date(entry[field]);
  if (Number.isNaN(timestamp.getTime())) return null;

  const parsedOffset = Number(entry.timezoneOffset);
  const hasEntryOffset = entry.timezoneOffset !== null
    && entry.timezoneOffset !== undefined
    && Number.isFinite(parsedOffset);
  const offsetMinutes = hasEntryOffset ? parsedOffset : fallbackOffsetMinutes;
  const localTime = new Date(timestamp.getTime() - offsetMinutes * 60000);
  return localTime.getUTCHours() * 60 + localTime.getUTCMinutes();
}

function formatClockMinutes(minutes) {
  if (!Number.isFinite(minutes)) return null;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function sleepDayName(entry) {
  const dayKey = typeof entry.sleepDate === 'string' ? entry.sleepDate : entry.dayKey;
  const parsed = new Date(`${dayKey}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime())
    ? null
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parsed.getUTCDay()];
}

export function calculateSleepTrends(sleepLogs = [], fallbackOffsetMinutes = new Date().getTimezoneOffset()) {
  const validLogs = sleepLogs.filter((entry) => (
    Number.isFinite(Number(entry.durationMinutes))
    && Number(entry.durationMinutes) > 0
    && Number.isFinite(Number(entry.quality))
    && Number(entry.quality) >= 1
    && Number(entry.quality) <= 10
  ));
  if (validLogs.length < 3) return null;

  const avgDuration = validLogs.reduce((sum, entry) => sum + Number(entry.durationMinutes), 0) / validLogs.length;
  const avgQuality = validLogs.reduce((sum, entry) => sum + Number(entry.quality), 0) / validLogs.length;
  const clockSummary = summarizeClockTimes(
    validLogs.map((entry) => localClockMinutes(entry, 'bedTime', fallbackOffsetMinutes)).filter(Number.isFinite)
  );
  const wakeClockSummary = summarizeClockTimes(
    validLogs.map((entry) => localClockMinutes(entry, 'wakeTime', fallbackOffsetMinutes)).filter(Number.isFinite)
  );

  const dayGroups = {};
  validLogs.forEach((entry) => {
    const day = sleepDayName(entry);
    if (!day) return;
    dayGroups[day] = dayGroups[day] || [];
    dayGroups[day].push(entry);
  });
  const dayOfWeek = Object.fromEntries(Object.entries(dayGroups).map(([day, entries]) => [day, {
    count: entries.length,
    avgQuality: roundToTenth(average(entries.map((entry) => Number(entry.quality)))),
    avgDurationHours: roundToTenth(average(entries.map((entry) => Number(entry.durationMinutes))) / 60),
  }]));

  const durationBuckets = {
    short: { label: 'Under 7h', count: validLogs.filter((entry) => Number(entry.durationMinutes) < 420).length },
    goal: { label: '7–9h', count: validLogs.filter((entry) => Number(entry.durationMinutes) >= 420 && Number(entry.durationMinutes) <= 540).length },
    long: { label: 'Over 9h', count: validLogs.filter((entry) => Number(entry.durationMinutes) > 540).length },
  };
  Object.values(durationBuckets).forEach((bucket) => {
    bucket.percentage = Math.round((bucket.count / validLogs.length) * 100);
  });

  const sortedLogs = [...validLogs].sort((a, b) => {
    const aDate = String(a.sleepDate || a.dayKey || a.bedTime || '');
    const bDate = String(b.sleepDate || b.dayKey || b.bedTime || '');
    return bDate.localeCompare(aDate);
  });
  const halfPoint = Math.max(1, Math.floor(sortedLogs.length / 2));
  const recentAvg = average(sortedLogs.slice(0, halfPoint).map((entry) => Number(entry.quality)));
  const olderAvg = average(sortedLogs.slice(halfPoint).map((entry) => Number(entry.quality)));
  const trendChange = roundToTenth(recentAvg - olderAvg);
  const trend = {
    direction: trendChange > 0.5 ? 'improving' : trendChange < -0.5 ? 'declining' : 'stable',
    change: trendChange,
    recentAvg: roundToTenth(recentAvg),
    olderAvg: roundToTenth(olderAvg),
  };

  const tagCounts = {};
  validLogs.forEach((entry) => {
    Object.entries(entry.tags || {}).forEach(([key, enabled]) => {
      if (enabled === true) tagCounts[key] = (tagCounts[key] || 0) + 1;
    });
  });

  const tagImpact = {};
  Object.entries(tagCounts).forEach(([tag, occurrences]) => {
    const withTag = validLogs.filter((entry) => entry.tags?.[tag] === true);
    const withoutTag = validLogs.filter((entry) => entry.tags?.[tag] !== true);
    if (!withTag.length || !withoutTag.length) return;

    const avgWith = withTag.reduce((sum, entry) => sum + Number(entry.quality), 0) / withTag.length;
    const avgWithout = withoutTag.reduce((sum, entry) => sum + Number(entry.quality), 0) / withoutTag.length;
    tagImpact[tag] = { impact: roundToTenth(avgWith - avgWithout), occurrences };
  });

  const averageMinutes = clockSummary?.averageMinutes;
  const consistencyScore = clockSummary
    ? Math.max(0, Math.round((1 - clockSummary.standardDeviationMinutes / 120) * 100))
    : 0;

  return {
    avgDurationMinutes: Math.round(avgDuration),
    avgDurationHours: roundToTenth(avgDuration / 60),
    avgQuality: roundToTenth(avgQuality),
    consistencyScore,
    avgBedTime: formatClockMinutes(averageMinutes),
    avgWakeTime: formatClockMinutes(wakeClockSummary?.averageMinutes),
    daysTracked: validLogs.length,
    trend,
    dayOfWeek,
    durationBuckets,
    tagCounts,
    tagImpact,
  };
}
