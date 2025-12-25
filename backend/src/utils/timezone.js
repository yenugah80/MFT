const MAX_OFFSET_MINUTES = 14 * 60;

export function parseTimezoneOffsetMinutes(req) {
  const raw = req.headers["x-timezone-offset"];
  if (raw === undefined) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  return Math.max(-MAX_OFFSET_MINUTES, Math.min(MAX_OFFSET_MINUTES, parsed));
}

export function getLocalDayRange(offsetMinutes, baseDate = new Date()) {
  if (!Number.isFinite(offsetMinutes)) {
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(baseDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const offsetMs = offsetMinutes * 60 * 1000;
  const localTime = new Date(baseDate.getTime() - offsetMs);

  const startLocal = new Date(localTime);
  startLocal.setUTCHours(0, 0, 0, 0);
  const endLocal = new Date(localTime);
  endLocal.setUTCHours(23, 59, 59, 999);

  return {
    start: new Date(startLocal.getTime() + offsetMs),
    end: new Date(endLocal.getTime() + offsetMs),
  };
}

export function getLocalDateUTC(offsetMinutes, baseDate = new Date()) {
  if (!Number.isFinite(offsetMinutes)) {
    const date = new Date(baseDate);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const offsetMs = offsetMinutes * 60 * 1000;
  const localTime = new Date(baseDate.getTime() - offsetMs);
  const year = localTime.getUTCFullYear();
  const month = localTime.getUTCMonth();
  const day = localTime.getUTCDate();
  return new Date(Date.UTC(year, month, day));
}

export function addDaysUTC(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function normalizeDateUTC(date) {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}
