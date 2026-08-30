import { eq, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { gamificationAuditLogTable, gamificationTable } from '../db/schema.js';
import { getLocalDateUTC, toDateStr } from '../utils/timezone.js';

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asDayKey(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * Select the safe stored projection for an ordinary create/read repair.
 * Canonical history can increase an under-count. It must not silently lower
 * a larger stored value because that difference may represent a streak freeze.
 */
export function selectCreateProjection(storedStreak, canonicalStreak) {
  return Math.max(asNumber(storedStreak), asNumber(canonicalStreak));
}

/**
 * Apply only the continuity lost by a deletion. Any pre-existing positive
 * offset is retained, which preserves a legitimate freeze while repairing the
 * deleted day. Historical under-counts are first lifted to the canonical
 * before-deletion value.
 */
export function selectDeletionProjection({ storedStreak, beforeStreak, afterStreak }) {
  const stored = asNumber(storedStreak);
  const before = asNumber(beforeStreak);
  const after = asNumber(afterStreak);
  const continuityLost = Math.max(0, before - after);
  return Math.max(0, Math.max(stored, before) - continuityLost);
}

function previousDayKey(dayKey) {
  const safe = asDayKey(dayKey);
  if (!safe) return null;
  const day = new Date(`${safe}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

/**
 * Select the continuity marker after a delete. If the latest actual day was
 * removed while a freeze offset remains, the marker moves back one calendar
 * day to the protected virtual day instead of pointing at the deleted row.
 */
export function selectDeletionTrackedDay({
  currentLastLogDay,
  beforeLatestDay,
  afterLatestDay,
  targetStreak,
  afterStreak,
}) {
  if (asNumber(targetStreak) === 0) return null;

  const current = asDayKey(currentLastLogDay);
  const before = asDayKey(beforeLatestDay);
  const after = asDayKey(afterLatestDay);
  if (before === after) return current || after;
  if (asNumber(targetStreak) <= asNumber(afterStreak)) return after;
  return previousDayKey(before) || current || after;
}

/**
 * Read actual streak-eligible local days across every logging domain.
 * The recursive CTE walks backward from today, or yesterday during the normal
 * grace period, and stops at the first missing calendar day. It has no 365-day
 * cap, so mature accounts remain accurate.
 */
export async function getTrackedDaySnapshot(
  userId,
  dbConn = db,
  timezoneOffset = 0,
  referenceDate = new Date()
) {
  const offset = Number.isFinite(timezoneOffset) ? timezoneOffset : 0;
  const todayKey = toDateStr(getLocalDateUTC(offset, referenceDate));

  const rows = await dbConn.execute(sql`
    WITH RECURSIVE tracked_days AS (
      SELECT DISTINCT tracked_day
      FROM (
        SELECT (logged_date - make_interval(mins => ${offset}))::date AS tracked_day
          FROM food_log WHERE user_id = ${userId}
        UNION ALL
        SELECT (logged_date - make_interval(mins => ${offset}))::date
          FROM water_log WHERE user_id = ${userId}
        UNION ALL
        SELECT COALESCE(
          day_key::date,
          (logged_date - make_interval(mins => COALESCE(timezone_offset, ${offset})))::date
        ) FROM mood_log WHERE user_id = ${userId}
        UNION ALL
        SELECT COALESCE(
          day_key::date,
          (logged_at - make_interval(mins => COALESCE(timezone_offset, ${offset})))::date
        ) FROM activity_log WHERE user_id = ${userId}
        UNION ALL
        SELECT (wake_time - make_interval(mins => COALESCE(timezone_offset, ${offset})))::date
          FROM sleep_log WHERE user_id = ${userId}
        UNION ALL
        SELECT COALESCE(
          day_key::date,
          logged_date::date,
          (logged_at - make_interval(mins => COALESCE(timezone_offset, ${offset})))::date
        ) FROM stress_log WHERE user_id = ${userId}
      ) eligible
      WHERE tracked_day IS NOT NULL
    ),
    anchor AS (
      SELECT CASE
        WHEN MAX(tracked_day) = ${todayKey}::date THEN ${todayKey}::date
        WHEN MAX(tracked_day) = (${todayKey}::date - 1) THEN (${todayKey}::date - 1)
        ELSE NULL
      END AS day_key
      FROM tracked_days
      WHERE tracked_day <= ${todayKey}::date
    ),
    consecutive(day_key) AS (
      SELECT day_key FROM anchor WHERE day_key IS NOT NULL
      UNION ALL
      SELECT tracked.tracked_day
      FROM consecutive current_day
      JOIN tracked_days tracked ON tracked.tracked_day = current_day.day_key - 1
    )
    SELECT
      (SELECT COUNT(*)::int FROM tracked_days) AS lifetime_tracked_days,
      (SELECT COUNT(*)::int FROM consecutive) AS current_streak,
      (SELECT MAX(tracked_day) FROM tracked_days) AS latest_tracked_day,
      EXISTS(SELECT 1 FROM tracked_days WHERE tracked_day = ${todayKey}::date) AS has_logged_today
  `);

  const row = rows[0] || {};
  return {
    todayKey,
    lifetimeTrackedDays: asNumber(row.lifetime_tracked_days),
    currentStreak: asNumber(row.current_streak),
    latestTrackedDay: asDayKey(row.latest_tracked_day),
    hasLoggedToday: Boolean(row.has_logged_today),
  };
}

async function writeProjection({
  userId,
  current,
  targetStreak,
  latestTrackedDay,
  updateTrackedDay,
  projectedTrackedDay,
  dbConn,
  source,
}) {
  const storedStreak = asNumber(current.streak);
  const storedLatest = asDayKey(current.lastLogDate);
  const nextLatest = projectedTrackedDay !== undefined
    ? projectedTrackedDay
    : (updateTrackedDay ? (latestTrackedDay || null) : storedLatest);

  if (targetStreak === storedStreak && nextLatest === storedLatest) {
    return { changed: false, streak: storedStreak };
  }

  const updateData = {
    streak: targetStreak,
    updatedAt: new Date(),
  };
  if ((updateTrackedDay || projectedTrackedDay !== undefined) && nextLatest) {
    const localMidnight = new Date(`${nextLatest}T00:00:00.000Z`);
    updateData.lastLogDate = localMidnight;
    updateData.lastStreakUpdatedAt = localMidnight;
  } else if (targetStreak === 0) {
    updateData.lastLogDate = null;
    updateData.lastStreakUpdatedAt = null;
  }

  await dbConn.update(gamificationTable)
    .set(updateData)
    .where(eq(gamificationTable.userId, userId));

  await dbConn.insert(gamificationAuditLogTable).values({
    userId,
    source,
    oldValues: {
      streak: storedStreak,
      lastLogDate: current.lastLogDate || null,
      lastStreakUpdatedAt: current.lastStreakUpdatedAt || null,
    },
    newValues: updateData,
    callSite: source,
  });

  return { changed: true, streak: targetStreak };
}

export async function reconcileStreakAfterCreate(
  userId,
  dbConn = db,
  timezoneOffset = 0,
  referenceDate = new Date()
) {
  const [current] = await dbConn.select().from(gamificationTable)
    .where(eq(gamificationTable.userId, userId));
  const snapshot = await getTrackedDaySnapshot(userId, dbConn, timezoneOffset, referenceDate);
  if (!current) return { changed: false, streak: snapshot.currentStreak, snapshot };

  const targetStreak = selectCreateProjection(current.streak, snapshot.currentStreak);
  const updateTrackedDay = snapshot.currentStreak > asNumber(current.streak);
  const result = await writeProjection({
    userId,
    current,
    targetStreak,
    latestTrackedDay: snapshot.latestTrackedDay,
    updateTrackedDay,
    dbConn,
    source: 'reconcile_after_create',
  });
  return { ...result, snapshot };
}

export async function reconcileStreakAfterDeletion({
  userId,
  beforeSnapshot,
  dbConn = db,
  timezoneOffset = 0,
  referenceDate = new Date(),
}) {
  const [current] = await dbConn.select().from(gamificationTable)
    .where(eq(gamificationTable.userId, userId));
  const afterSnapshot = await getTrackedDaySnapshot(userId, dbConn, timezoneOffset, referenceDate);
  if (!current) return { changed: false, streak: afterSnapshot.currentStreak, snapshot: afterSnapshot };

  const targetStreak = selectDeletionProjection({
    storedStreak: current.streak,
    beforeStreak: beforeSnapshot?.currentStreak,
    afterStreak: afterSnapshot.currentStreak,
  });
  const projectedTrackedDay = selectDeletionTrackedDay({
    currentLastLogDay: current.lastLogDate,
    beforeLatestDay: beforeSnapshot?.latestTrackedDay,
    afterLatestDay: afterSnapshot.latestTrackedDay,
    targetStreak,
    afterStreak: afterSnapshot.currentStreak,
  });
  const result = await writeProjection({
    userId,
    current,
    targetStreak,
    latestTrackedDay: afterSnapshot.latestTrackedDay,
    updateTrackedDay: false,
    projectedTrackedDay,
    dbConn,
    source: 'reconcile_after_delete',
  });
  return { ...result, snapshot: afterSnapshot };
}
