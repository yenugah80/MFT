/**
 * Timezone Utilities
 *
 * IMPORTANT: All functions require a valid timezone offset from the client.
 * The mobile app sends X-Timezone-Offset header with every request.
 * Never default to UTC (0) - this causes incorrect day calculations for non-UTC users.
 *
 * JavaScript's getTimezoneOffset() returns:
 * - Negative for timezones EAST of UTC (e.g., UTC+5:30 India = -330)
 * - Positive for timezones WEST of UTC (e.g., UTC-5 EST = 300)
 */

const MAX_OFFSET_MINUTES = 14 * 60;

/**
 * Parse timezone offset from request header
 * @returns {number|null} Offset in minutes, or null if not provided
 */
export function parseTimezoneOffsetMinutes(req) {
  const raw = req.headers["x-timezone-offset"];
  if (raw === undefined) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  return Math.max(-MAX_OFFSET_MINUTES, Math.min(MAX_OFFSET_MINUTES, parsed));
}

/**
 * Get day range (start/end timestamps) for a user's local day
 * @param {number} offsetMinutes - User's timezone offset (REQUIRED for correct calculation)
 * @param {Date} baseDate - The reference date
 * @returns {{ start: Date, end: Date }}
 *
 * WARNING: If offsetMinutes is not finite, falls back to SERVER's local time.
 * Callers should validate offset before calling this function.
 */
export function getLocalDayRange(offsetMinutes, baseDate = new Date()) {
  if (!Number.isFinite(offsetMinutes)) {
    // FALLBACK: Uses server's local time (not user's timezone!)
    // Callers should validate offset before calling this function
    console.warn('[Timezone] getLocalDayRange called without valid offset - using server local time');
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

/**
 * Get the Sunday-Saturday calendar week containing `baseDate` in the user's
 * local timezone. The returned timestamps are UTC instants suitable for
 * timestamp-column comparisons.
 */
export function getLocalWeekRange(offsetMinutes, baseDate = new Date()) {
  const { start: todayStart } = getLocalDayRange(offsetMinutes, baseDate);

  if (!Number.isFinite(offsetMinutes)) {
    const start = new Date(todayStart);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start, end };
  }

  const offsetMs = offsetMinutes * 60 * 1000;
  const localTime = new Date(baseDate.getTime() - offsetMs);
  const localWeekday = localTime.getUTCDay();
  const start = new Date(todayStart.getTime() - localWeekday * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/**
 * Get the hour-of-day (0-23) in the user's local time.
 *
 * Same offsetMinutes convention as every other function in this file
 * (Date.getTimezoneOffset(): positive = west of UTC). Exists because
 * notification content-selection code (smartReminderService.js,
 * wittyMessageEngine.js) had several independent, ad-hoc hour computations
 * — some using the server's raw UTC hour with no offset at all, one
 * (smartReminderJob.js's isInQuietHours) applying the offset with the wrong
 * sign — so a "midday" (11am-1pm local) message could fire at 9am for an
 * EDT user, or quiet hours could be evaluated against a local hour several
 * hours off from reality. One correct implementation, reused everywhere.
 *
 * @param {number} offsetMinutes - User's timezone offset (REQUIRED for correct calculation)
 * @param {Date} baseDate - The reference instant
 * @returns {number} 0-23
 *
 * WARNING: If offsetMinutes is not finite, falls back to SERVER's local hour.
 */
export function getLocalHour(offsetMinutes, baseDate = new Date()) {
  if (!Number.isFinite(offsetMinutes)) {
    console.warn('[Timezone] getLocalHour called without valid offset - using server local time');
    return baseDate.getHours();
  }
  const offsetMs = offsetMinutes * 60 * 1000;
  const localTime = new Date(baseDate.getTime() - offsetMs);
  return localTime.getUTCHours();
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

// Convert a Date to YYYY-MM-DD string using UTC components.
// Required for Drizzle ORM `date` column comparisons with postgres-js:
// the driver expects a string, not a Date object, for `date` type columns.
export function toDateStr(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

export function normalizeDateUTC(date) {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Get day key string (YYYY-MM-DD) for a date in user's local timezone
 * @param {Date} date - The date to convert
 * @param {number} offsetMinutes - User's timezone offset in minutes
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getDayKey(date, offsetMinutes = 0) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    date = new Date();
  }

  if (!Number.isFinite(offsetMinutes)) {
    offsetMinutes = 0;
  }

  // Adjust for timezone offset
  const offsetMs = offsetMinutes * 60 * 1000;
  const localTime = new Date(date.getTime() - offsetMs);

  const year = localTime.getUTCFullYear();
  const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(localTime.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
