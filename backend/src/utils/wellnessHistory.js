const roundOne = (value) => Math.round(value * 10) / 10;

export function normalizeHistoryQuery(query = {}) {
  const integer = (value, fallback) => {
    if (typeof value === 'string' && !/^-?\d+$/.test(value.trim())) return fallback;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : fallback;
  };

  return {
    days: Math.min(365, Math.max(7, integer(query.days, 30))),
    limit: Math.min(100, Math.max(1, integer(query.limit, 100))),
    offset: Math.max(0, integer(query.offset, 0)),
  };
}

export function summarizeClockTimes(minutes = []) {
  if (!minutes.length) {
    return { averageMinutes: 0, standardDeviationMinutes: 0 };
  }

  const fullDay = 24 * 60;
  const radians = minutes.map((minute) => ((Number(minute) % fullDay + fullDay) % fullDay) * (2 * Math.PI / fullDay));
  const meanSin = radians.reduce((sum, angle) => sum + Math.sin(angle), 0) / radians.length;
  const meanCos = radians.reduce((sum, angle) => sum + Math.cos(angle), 0) / radians.length;
  let meanAngle = Math.atan2(meanSin, meanCos);
  if (meanAngle < 0) meanAngle += 2 * Math.PI;

  const averageMinutes = Math.round(meanAngle * fullDay / (2 * Math.PI)) % fullDay;
  const squaredDistances = minutes.map((minute) => {
    const normalized = ((Number(minute) % fullDay) + fullDay) % fullDay;
    const direct = Math.abs(normalized - averageMinutes);
    const circularDistance = Math.min(direct, fullDay - direct);
    return circularDistance ** 2;
  });

  return {
    averageMinutes,
    standardDeviationMinutes: Math.sqrt(
      squaredDistances.reduce((sum, distance) => sum + distance, 0) / squaredDistances.length
    ),
  };
}

export function summarizeSleepHistory(logs = []) {
  if (!logs.length) {
    return {
      avgDurationMinutes: 0,
      avgDurationHours: 0,
      avgQuality: 0,
      daysTracked: 0,
      goalNights: 0,
      restorativeNights: 0,
    };
  }

  const totalDuration = logs.reduce((sum, log) => sum + (Number(log.durationMinutes) || 0), 0);
  const totalQuality = logs.reduce((sum, log) => sum + (Number(log.quality) || 0), 0);
  const avgDurationMinutes = Math.round(totalDuration / logs.length);

  return {
    avgDurationMinutes,
    avgDurationHours: roundOne(avgDurationMinutes / 60),
    avgQuality: roundOne(totalQuality / logs.length),
    daysTracked: new Set(logs.map((log) => log.sleepDate)).size,
    goalNights: logs.filter((log) => log.durationMinutes >= 420 && log.durationMinutes <= 540).length,
    restorativeNights: logs.filter((log) => log.quality >= 7).length,
  };
}

export function summarizeStressHistory(logs = []) {
  if (!logs.length) {
    return {
      avgLevel: 0,
      entriesCount: 0,
      highStressDays: 0,
      calmDays: 0,
      daysWithData: 0,
      topTrigger: null,
      topCoping: null,
    };
  }

  const days = new Map();
  const triggerCounts = {};
  const copingCounts = {};

  logs.forEach((log) => {
    const levels = days.get(log.loggedDate) || [];
    levels.push(Number(log.level) || 0);
    days.set(log.loggedDate, levels);
    (Array.isArray(log.triggers) ? log.triggers : []).forEach((key) => {
      triggerCounts[key] = (triggerCounts[key] || 0) + 1;
    });
    (Array.isArray(log.copingUsed) ? log.copingUsed : []).forEach((key) => {
      copingCounts[key] = (copingCounts[key] || 0) + 1;
    });
  });

  const dailyAverages = [...days.values()].map(
    (levels) => levels.reduce((sum, level) => sum + level, 0) / levels.length
  );
  const mostFrequent = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    avgLevel: roundOne(logs.reduce((sum, log) => sum + (Number(log.level) || 0), 0) / logs.length),
    entriesCount: logs.length,
    highStressDays: dailyAverages.filter((level) => level >= 7).length,
    calmDays: dailyAverages.filter((level) => level <= 3).length,
    daysWithData: days.size,
    topTrigger: mostFrequent(triggerCounts),
    topCoping: mostFrequent(copingCounts),
  };
}

export function buildStressDailySummaries(logs = []) {
  const groups = new Map();
  logs.forEach((log) => {
    const group = groups.get(log.loggedDate) || [];
    group.push(log);
    groups.set(log.loggedDate, group);
  });

  return [...groups.entries()]
    .map(([date, entries]) => ({
      date,
      avgLevel: roundOne(entries.reduce((sum, entry) => sum + entry.level, 0) / entries.length),
      latestLevel: entries[0]?.level || null,
      entriesCount: entries.length,
      highStress: entries.some((entry) => entry.level >= 7),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
