/**
 * Shared backend notification policy — hourly/daily caps, minimum spacing,
 * and quiet hours — for every backend path that calls
 * sendUserFCMNotification/sendUserNotification, not just the smart-reminder
 * cron.
 *
 * Extracted from smartReminderJob.js, which originally defined and enforced
 * these checks on itself only. A repo-wide audit (2026-09) found three other
 * live send paths — nutrientDeficitJob.js (daily insight-drop cron),
 * predictionLearningService.js (event-driven check-in follow-ups), and
 * gamificationRewardService.js (event-driven level-up/streak-milestone) —
 * none of which consulted these checks, and two of which
 * (predictionLearningService.js, gamificationRewardService.js) never even
 * wrote to notificationDeliveryLogTable, so their sends were invisible to
 * every other job's rate-limit accounting too. This module is the single
 * implementation all four now share, so "6/day, 60-minute spacing" is an
 * actual account-wide guarantee instead of a per-job one.
 *
 * CONCURRENCY: a plain "SELECT count, decide, INSERT afterward" check has a
 * real race — two concurrent callers for the same userId (smartReminderJob's
 * tick and nutrientDeficitJob's daily run overlapping; two devices' sends
 * interleaving across awaits; in principle two server instances) can both
 * read the same pre-send counts, both decide "allowed," and both insert,
 * exceeding the cap or violating the spacing floor. reserveNotificationSlot
 * below closes this with a per-user Postgres advisory transaction lock
 * (pg_advisory_xact_lock(hashtext(userId))) wrapped around the check AND the
 * reservation insert as one atomic unit — a second concurrent caller for the
 * SAME userId blocks until the first's transaction commits, then re-evaluates
 * against the now-committed row, not a stale pre-insert snapshot. Different
 * users never contend with each other (a hash collision between two
 * different userIds costs a moment of unnecessary serialization between
 * them, never a correctness bug — it can only make the check stricter, not
 * looser).
 *
 * Deliberately NOT covered here: purely local, on-device
 * (expo-notifications-scheduled) reminders in mobile/services/
 * pushNotifications.js. Those have no network round-trip to gate — there is
 * nothing for a backend check to intercept before they fire. Their own
 * mitigation is a fixed per-category schedule allocation enforced at
 * creation time (see LOCAL_ALLOCATION in utils/notificationOwnership.js) and
 * getEffectiveDailyCap below, which reduces THIS module's own daily cap by
 * however much of the shared budget a device's local schedule already
 * claims — the two mechanisms compose into one combined budget without
 * needing real-time coordination (impossible when the device is offline;
 * see getEffectiveDailyCap's own docstring).
 */
import { and, eq, gt, gte, lt, or, sql } from 'drizzle-orm';
import {
  notificationDeliveryLogTable,
  accountSettingsTable,
  gamificationTable,
} from '../db/schema.js';
import { getLocalHour } from './timezone.js';

export const NOTIFICATION_POLICY = {
  MAX_NOTIFICATIONS_PER_USER_PER_HOUR: 2,
  MAX_NOTIFICATIONS_PER_USER_PER_DAY: 6,
  MIN_SPACING_MINUTES: 60,
  DEFAULT_QUIET_START: 22, // 10 PM
  DEFAULT_QUIET_END: 7,    // 7 AM
};

// A 'reserved' row older than this is treated as abandoned (the process
// that created it crashed or hung before calling finalizeReservation) and
// excluded from every count below, so a stuck reservation can never
// permanently eat a slot — it just self-heals after this TTL instead of
// needing a cleanup job.
const RESERVATION_STALE_MS = 5 * 60 * 1000;

/**
 * Every count query in this file shares this WHERE fragment: rows in the
 * window, excluding stale abandoned reservations. A fresh (<5 min old)
 * 'reserved' row DOES count — that's what makes two concurrent reservation
 * attempts for the same user correctly see each other once serialized by
 * the advisory lock below.
 */
function notStaleReservation() {
  const staleCutoff = new Date(Date.now() - RESERVATION_STALE_MS);
  return or(
    sql`${notificationDeliveryLogTable.deliveryStatus} != 'reserved'`,
    gt(notificationDeliveryLogTable.createdAt, staleCutoff)
  );
}

export async function checkHourlyRateLimit(db, userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(notificationDeliveryLogTable)
    .where(
      and(
        eq(notificationDeliveryLogTable.userId, userId),
        gte(notificationDeliveryLogTable.createdAt, oneHourAgo),
        notStaleReservation()
      )
    );
  return (row?.count ?? 0) < NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_HOUR;
}

/**
 * maxPerDay defaults to the flat account-wide cap but accepts an override —
 * used by smartReminderJob.js to pass a per-device EFFECTIVE cap that's
 * already been reduced by that device's local-schedule allocation (see
 * getEffectiveDailyCap).
 */
export async function checkDailyRateLimit(db, userId, maxPerDay = NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(notificationDeliveryLogTable)
    .where(
      and(
        eq(notificationDeliveryLogTable.userId, userId),
        gte(notificationDeliveryLogTable.createdAt, oneDayAgo),
        notStaleReservation()
      )
    );
  return (row?.count ?? 0) < maxPerDay;
}

export async function checkMinSpacing(db, userId) {
  const cutoff = new Date(Date.now() - NOTIFICATION_POLICY.MIN_SPACING_MINUTES * 60 * 1000);
  const [row] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(notificationDeliveryLogTable)
    .where(
      and(
        eq(notificationDeliveryLogTable.userId, userId),
        gte(notificationDeliveryLogTable.createdAt, cutoff),
        notStaleReservation()
      )
    );
  return (row?.count ?? 0) === 0;
}

/**
 * Pure quiet-hours check — takes already-resolved fields so callers that
 * batch-fetch users (smartReminderJob.js) don't pay a redundant per-user
 * query. offsetMinutes follows Date.getTimezoneOffset()'s convention
 * (positive = west of UTC; local = UTC - offset), matching getLocalDayRange/
 * getLocalDateUTC elsewhere in this codebase.
 */
export function isInQuietHours({ notifications, timezoneOffset }) {
  const prefs = notifications || {};
  const quietHours = prefs.quietHours || {
    start: NOTIFICATION_POLICY.DEFAULT_QUIET_START,
    end: NOTIFICATION_POLICY.DEFAULT_QUIET_END,
  };

  const localHour = getLocalHour(timezoneOffset || 0);
  const { start, end } = quietHours;

  if (start > end) {
    return localHour >= start || localHour < end;
  }
  return localHour >= start && localHour < end;
}

/**
 * Self-contained quiet-hours check for callers that don't already have
 * notifications/timezoneOffset loaded (every send path other than
 * smartReminderJob.js's batched loop). Two extra point queries per user —
 * acceptable for jobs that run once a day or once per live event, not a
 * 15-minute hot loop.
 */
export async function isInQuietHoursForUser(db, userId) {
  const [account] = await db
    .select({ notifications: accountSettingsTable.notifications })
    .from(accountSettingsTable)
    .where(eq(accountSettingsTable.userId, userId));
  const [gami] = await db
    .select({ timezoneOffset: gamificationTable.timezoneOffset })
    .from(gamificationTable)
    .where(eq(gamificationTable.userId, userId));

  return isInQuietHours({
    notifications: account?.notifications,
    timezoneOffset: gami?.timezoneOffset,
  });
}

/**
 * Atomically checks quiet hours + hourly/daily/spacing caps AND reserves the
 * slot, all inside one Postgres transaction serialized per-userId by an
 * advisory lock — see this file's header for why a plain check-then-insert
 * isn't safe under concurrency. On success, the reservation is a real
 * 'reserved' row in notificationDeliveryLogTable that already counts toward
 * every subsequent check; the caller MUST call finalizeReservation exactly
 * once (success or failure) so the row either becomes the real delivery
 * record or is removed so it stops consuming budget.
 *
 * @returns {Promise<{allowed:boolean, reason?:string, reservationId?:number}>}
 */
export async function reserveNotificationSlot(db, userId, { checkQuietHours = true, maxPerDay } = {}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);

    if (checkQuietHours && (await isInQuietHoursForUser(tx, userId))) {
      return { allowed: false, reason: 'quiet_hours' };
    }

    const [hourlyOk, dailyOk, spacingOk] = await Promise.all([
      checkHourlyRateLimit(tx, userId),
      checkDailyRateLimit(tx, userId, maxPerDay),
      checkMinSpacing(tx, userId),
    ]);
    if (!hourlyOk) return { allowed: false, reason: 'hourly_cap' };
    if (!dailyOk) return { allowed: false, reason: 'daily_cap' };
    if (!spacingOk) return { allowed: false, reason: 'min_spacing' };

    const [reservation] = await tx
      .insert(notificationDeliveryLogTable)
      .values({
        userId,
        notificationType: 'reserved',
        title: 'reserved',
        deliveryStatus: 'reserved',
      })
      .returning({ id: notificationDeliveryLogTable.id });

    return { allowed: true, reservationId: reservation.id };
  });
}

/**
 * Resolves a reservation from reserveNotificationSlot. On success, fills in
 * the real delivery fields and flips status to 'sent' — the row's createdAt
 * (set at reservation time, inside the lock) is preserved, which is what
 * actually enforces the spacing floor: the slot was claimed the instant the
 * send was authorized, not whenever the provider call happened to finish.
 * On failure, the row is deleted — a failed send never reached the user, so
 * it must not consume budget a retry could legitimately use.
 */
export async function finalizeReservation(db, reservationId, {
  success,
  deviceId = null,
  notificationType,
  title,
  body,
  channel,
  priority = 3,
  deliveryId = null,
} = {}) {
  if (!reservationId) return;
  try {
    if (success) {
      await db
        .update(notificationDeliveryLogTable)
        .set({ deviceId, notificationType, title, body, channel, priority, deliveryStatus: 'sent', deliveryId })
        .where(eq(notificationDeliveryLogTable.id, reservationId));
    } else {
      await db.delete(notificationDeliveryLogTable).where(eq(notificationDeliveryLogTable.id, reservationId));
    }
  } catch (err) {
    console.warn('[NotificationPolicy] Failed to finalize reservation (non-critical):', err.message);
  }
}

/**
 * Reserve → run the actual provider send → finalize, in one call. This is
 * the function every send path should use instead of manually orchestrating
 * reserve/finalize — a caller that reserves and then throws before
 * finalizing would otherwise leak a slot for up to RESERVATION_STALE_MS.
 *
 * sendFn is called only if the reservation succeeds, and must return
 * { success: boolean, deliveryLog?: { deviceId?, notificationType, title,
 * body, channel, priority?, deliveryId? } } — deliveryLog is required when
 * success is true (it becomes the finalized row's real content) and ignored
 * otherwise.
 *
 * @returns {Promise<{success:boolean, held?:string, ...rest}>} — on a held
 *   (not-allowed) reservation, returns { success:false, held: reason }
 *   without ever calling sendFn. Otherwise returns whatever sendFn returned.
 */
export async function withReservedNotificationSlot(db, userId, options, sendFn) {
  const reservation = await reserveNotificationSlot(db, userId, options);
  if (!reservation.allowed) {
    return { success: false, held: reservation.reason };
  }

  let result;
  try {
    result = await sendFn();
  } catch (err) {
    await finalizeReservation(db, reservation.reservationId, { success: false });
    throw err;
  }

  if (result?.success) {
    await finalizeReservation(db, reservation.reservationId, { success: true, ...result.deliveryLog });
  } else {
    await finalizeReservation(db, reservation.reservationId, { success: false });
  }
  return result;
}

/**
 * Shared delivery-log write for the rare caller that logs a delivery
 * without going through the reservation flow (none currently do — kept as
 * the one general-purpose insert helper finalizeReservation itself doesn't
 * need, since it UPDATEs an existing reserved row rather than inserting).
 * Non-throwing: a logging failure must never block or retry a notification
 * that already went out.
 */
export async function logNotificationDelivery(db, {
  userId,
  deviceId = null,
  notificationType,
  title,
  body,
  channel,
  priority = 3,
  deliveryStatus = 'sent',
  deliveryId = null,
}) {
  try {
    await db.insert(notificationDeliveryLogTable).values({
      userId,
      deviceId,
      notificationType,
      title,
      body,
      channel,
      priority,
      deliveryStatus,
      deliveryId,
    });
  } catch (err) {
    console.warn('[NotificationPolicy] Failed to log delivery (non-critical):', err.message);
  }
}
