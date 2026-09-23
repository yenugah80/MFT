import { getDayKey } from './timezone.js';

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDayKey(value) {
  if (typeof value !== 'string' || !DAY_KEY_RE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}

function timestampDayKey(value, timezoneOffset, fallbackOffset) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const offset = Number.isFinite(timezoneOffset) ? timezoneOffset : fallbackOffset;
  return getDayKey(parsed, Number.isFinite(offset) ? offset : 0);
}

/**
 * Build the distinct local calendar days that qualify for the account-wide
 * logging streak. Keep this list aligned with every route that calls
 * updateStreak(): food, water, mood, activity, sleep and stress.
 */
export function collectTrackedDayKeys({
  foodLogs = [],
  waterLogs = [],
  moodLogs = [],
  activityLogs = [],
  sleepLogs = [],
  stressLogs = [],
  fallbackOffset = 0,
} = {}) {
  const days = new Set();
  const add = (value) => {
    if (value) days.add(value);
  };

  foodLogs.forEach((log) => add(timestampDayKey(log.loggedDate, null, fallbackOffset)));
  waterLogs.forEach((log) => add(timestampDayKey(log.loggedDate, null, fallbackOffset)));
  moodLogs.forEach((log) => add(
    validDayKey(log.dayKey) || timestampDayKey(log.loggedDate, log.timezoneOffset, fallbackOffset)
  ));
  activityLogs.forEach((log) => add(
    validDayKey(log.dayKey) || timestampDayKey(log.loggedAt, log.timezoneOffset, fallbackOffset)
  ));

  // Sleep credits the local day on which the session ended, matching the
  // wakeTimeDate passed to updateStreak() by the sleep route.
  sleepLogs.forEach((log) => add(
    timestampDayKey(log.wakeTime, log.timezoneOffset, fallbackOffset)
  ));
  stressLogs.forEach((log) => add(
    validDayKey(log.dayKey)
      || validDayKey(log.loggedDate)
      || timestampDayKey(log.loggedAt, log.timezoneOffset, fallbackOffset)
  ));

  return days;
}

export function calculateConsecutiveTrackedDays(dayKeys, todayKey) {
  const days = dayKeys instanceof Set ? dayKeys : new Set(dayKeys || []);
  const safeToday = validDayKey(todayKey);
  if (!safeToday) return 0;

  let cursor = new Date(`${safeToday}T00:00:00.000Z`);
  if (!days.has(safeToday)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  // A streak cannot contain more days than the distinct tracked-day set.
  // Basing the bound on real input keeps the loop finite without truncating
  // mature accounts at an arbitrary one-year limit.
  for (let i = 0; i < days.size + 1; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
