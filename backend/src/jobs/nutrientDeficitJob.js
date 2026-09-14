/**
 * Nutrient Deficit Push Notification Job
 *
 * Runs hourly. For each user, fires only when it is currently their own
 * local 9 AM (TARGET_LOCAL_HOUR) — not once at a single fixed UTC instant
 * for everyone. Finds users with >= 3 consecutive days below 70% RDA for
 * any micronutrient and sends an actionable push notification recommending
 * foods that address the deficit.
 *
 * Previously ran once daily at a fixed 08:00 UTC for every timezone —
 * 1-4 AM local for most of the US, meaning the quiet-hours gate below
 * silently and PERMANENTLY suppressed this notification type for anyone in
 * those zones (not "not tonight," never). Moved to hourly + per-user local-
 * hour gating (2026-09) so eligibility is computed per user the same way
 * smartReminderJob.js already does, instead of once for the whole database.
 *
 * Why this can't produce a catch-up burst: eligibility is evaluated fresh
 * on every run purely from CURRENT state (is it this user's local 9 AM
 * right now, and have they not been notified in the last 48h) — there is no
 * queue of "missed" days to work through. If the server is down through a
 * user's entire 9 AM hour, that day's notification is simply skipped, not
 * queued — the 48h throttle means the next opportunity is their next local
 * 9 AM, one single notification, same as any other day.
 *
 * Safety rails:
 * - Max one deficit notification per user per 48 h (throttled via lastNotifiedAt cache)
 * - Respects user insightDrops notification preference
 * - Gated by the shared account-wide policy (utils/notificationPolicy.js):
 *   quiet hours (a safety net for a custom quiet-hours window that happens
 *   to cover 9 AM, e.g. a night-shift worker), the 6/day cap, and the
 *   60-minute minimum spacing floor — reserved atomically via
 *   withReservedNotificationSlot, same as every other backend send path.
 * - Skips users with no push token
 * - Paginates through ALL eligible candidate rows every hourly tick
 *   (PAGE_SIZE per page, cursor on profilesTable.id — see
 *   getUsersWithPushTokensPage), filtering to this hour's local-9-AM users
 *   in JS per page (reusing the already-verified getLocalHour, rather than
 *   duplicating its UTC-offset math as raw SQL in the WHERE clause). Fixed
 *   2026-09: this was previously a single SELECT capped at a flat 500-row
 *   limit with no pagination, silently and permanently excluding any user
 *   past that row for as long as the user base exceeded 500 — the local-hour
 *   filter happens after the fetch, so a user never reached by the capped
 *   SELECT could never be evaluated at all, for any hour, ever.
 */

import { CronJob } from 'cron';
import { db } from '../config/db.js';
import { foodLogTable, accountSettingsTable, profilesTable, devicesTable, gamificationTable } from '../db/schema.js';
import { eq, and, gt, gte, asc, isNotNull, or, sql } from 'drizzle-orm';
import { sendUserNotification, NOTIFICATION_TYPES } from '../services/pushNotificationService.js';
import { sendUserFCMNotification, FCM_NOTIFICATION_TYPES } from '../services/fcmPushService.js';
import { notificationDeliveryLogTable } from '../db/schema.js';
import { withReservedNotificationSlot, NOTIFICATION_POLICY } from '../utils/notificationPolicy.js';
import { getAccountEffectiveDailyCap } from '../utils/deviceRegistry.js';
import { getLocalHour } from '../utils/timezone.js';

const TARGET_LOCAL_HOUR = 9; // 9 AM local — well clear of default quiet hours (22:00-07:00)

// DB-backed 48-hour throttle — survives server restarts.
// In-memory Map is a fast-path cache to reduce DB queries within a single run.
const runSessionCache = new Map();

async function wasRecentlyNotified(userId) {
  if (runSessionCache.get(userId)) return true;
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(notificationDeliveryLogTable)
    .where(
      and(
        eq(notificationDeliveryLogTable.userId, userId),
        eq(notificationDeliveryLogTable.notificationType, 'nutrient_deficit'),
        gte(notificationDeliveryLogTable.createdAt, cutoff)
      )
    );
  return (row?.count ?? 0) > 0;
}

async function markNotified(userId) {
  runSessionCache.set(userId, true);
  // The delivery log insert in the send block below serves as the DB record.
}

// ─── RDA reference (same as nutrition.js endpoint) ───────────────────────────

const MICRONUTRIENT_RDA = {
  calcium:    { rda: 1000, unit: 'mg',  label: 'Calcium'     },
  iron:       { rda: 18,   unit: 'mg',  label: 'Iron'        },
  magnesium:  { rda: 400,  unit: 'mg',  label: 'Magnesium'   },
  potassium:  { rda: 3500, unit: 'mg',  label: 'Potassium'   },
  zinc:       { rda: 11,   unit: 'mg',  label: 'Zinc'        },
  vitaminA:   { rda: 900,  unit: 'mcg', label: 'Vitamin A'   },
  vitaminC:   { rda: 90,   unit: 'mg',  label: 'Vitamin C'   },
  vitaminD:   { rda: 20,   unit: 'mcg', label: 'Vitamin D'   },
  vitaminB12: { rda: 2.4,  unit: 'mcg', label: 'Vitamin B12' },
  folate:     { rda: 400,  unit: 'mcg', label: 'Folate'      },
};

// Foods to suggest for each deficit (simple lookup table — avoids an AI call per user)
const DEFICIT_FOOD_HINTS = {
  calcium:    'dairy, fortified plant milk, or leafy greens',
  iron:       'lean red meat, spinach, or lentils',
  magnesium:  'nuts, seeds, or dark chocolate',
  potassium:  'bananas, sweet potatoes, or avocado',
  zinc:       'pumpkin seeds, chickpeas, or beef',
  vitaminA:   'carrots, sweet potato, or eggs',
  vitaminC:   'citrus fruits, bell peppers, or broccoli',
  vitaminD:   'fatty fish, fortified milk, or sunlight',
  vitaminB12: 'meat, dairy, or fortified cereal',
  folate:     'leafy greens, legumes, or fortified bread',
};

const DEFICIT_STREAK_THRESHOLD = 3; // consecutive days < 70 % RDA
const PAGE_SIZE = 500; // rows per page — bounds memory per page, not total users reachable (see getUsersWithPushTokensPage)

// ─── Core logic ──────────────────────────────────────────────────────────────

/**
 * Base table is profilesTable, not accountSettingsTable — same reason as
 * smartReminderJob.js's getEligibleUsersBatched: a user who has only ever
 * called /profile/devices/register (never the legacy /profile/fcm-token or
 * /profile/notifications) has no accountSettingsTable row at all, and
 * selecting FROM it would silently exclude them regardless of the WHERE
 * clause. Actual token resolution happens per-user inside
 * sendUserNotification/sendUserFCMNotification below, which are
 * device-aware — this query only needs to decide who's even worth checking.
 *
 * Cursor-paginated on profilesTable.id — a single unbounded SELECT was
 * previously capped at a flat 500-row limit with no way to reach anyone
 * past that row, silently and permanently excluding users beyond the cap
 * once the table grew past it (a real bug: the local-hour gate in
 * runNutrientDeficitJob filters AFTER this fetch, so a user whose eligible
 * local-9-AM hour never coincides with the first 500 rows by id would
 * simply never be reached, forever). Paginating removes the ceiling — the
 * caller loops pages until one comes back short, at PAGE_SIZE per page to
 * keep memory bounded per page, same intent as the original cap, without
 * the coverage bug.
 */
// dbConn defaults to this module's own db (config/db.js) but accepts an
// override — same dependency-injection pattern as deviceRegistry.js/
// pushTokenOwnership.js/deliveryAck.js, and for the same reason: it lets an
// integration test point this at a real local Postgres connection directly,
// without needing config/db.js's own DATABASE_URL (which jest.setup.js
// hardcodes to a non-existent fake host for the rest of the unit-test suite).
async function getUsersWithPushTokensPage(afterId, dbConn = db) {
  const eligibility = or(
    isNotNull(accountSettingsTable.expoPushToken),
    isNotNull(accountSettingsTable.fcmToken),
    sql`EXISTS (SELECT 1 FROM ${devicesTable} WHERE ${devicesTable.userId} = ${profilesTable.userId})`
  );

  return dbConn
    .select({
      id: profilesTable.id,
      userId: profilesTable.userId,
      notifications: accountSettingsTable.notifications,
      timezoneOffset: gamificationTable.timezoneOffset,
    })
    .from(profilesTable)
    .leftJoin(accountSettingsTable, eq(profilesTable.userId, accountSettingsTable.userId))
    .leftJoin(gamificationTable, eq(profilesTable.userId, gamificationTable.userId))
    .where(afterId != null ? and(gt(profilesTable.id, afterId), eligibility) : eligibility)
    .orderBy(asc(profilesTable.id))
    .limit(PAGE_SIZE);
}

/**
 * Aggregate daily micronutrient totals for the last N days for a single user.
 * Returns a map of { 'YYYY-MM-DD': { calcium: number, iron: number, … } }
 * Uses the same parsing strategy as the /micronutrient-trends endpoint:
 * values may be raw numbers OR strings like "10mg".
 */
async function getDailyMicroTotals(userId, days = 7) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  try {
    const rows = await db
      .select({ loggedDate: foodLogTable.loggedDate, micros: foodLogTable.micros })
      .from(foodLogTable)
      .where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, since)))
      .orderBy(foodLogTable.loggedDate);

    // Aggregate into { day → { nutrientKey → total } }
    const byDay = {};
    for (const row of rows) {
      const day = (row.loggedDate instanceof Date
        ? row.loggedDate.toISOString()
        : String(row.loggedDate)).slice(0, 10);

      if (!byDay[day]) byDay[day] = {};

      const micros = row.micros || {};
      for (const [key, raw] of Object.entries(micros)) {
        const val = typeof raw === 'number' ? raw
          : typeof raw === 'object' && raw !== null ? parseFloat(raw.value ?? 0)
          : parseFloat(String(raw).replace(/[^0-9.]/g, '') || '0');
        if (!isNaN(val)) byDay[day][key] = (byDay[day][key] || 0) + val;
      }
    }

    // Return sorted array of { date, <nutrientKey>: total, … }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, totals]) => ({ date, ...totals }));
  } catch {
    return [];
  }
}

/**
 * Identify nutrients with a deficit streak of >= DEFICIT_STREAK_THRESHOLD
 * looking at the most recent N days of data.
 */
function findDeficits(dailyRows) {
  const deficits = [];

  for (const [key, meta] of Object.entries(MICRONUTRIENT_RDA)) {
    // Compute trailing consecutive days below threshold
    let streak = 0;
    for (let i = dailyRows.length - 1; i >= 0; i--) {
      const dayTotal = Number(dailyRows[i][key] ?? 0);
      if (dayTotal < meta.rda * 0.7) {
        streak++;
      } else {
        break;
      }
    }
    if (streak >= DEFICIT_STREAK_THRESHOLD) {
      deficits.push({ key, label: meta.label, streak });
    }
  }

  return deficits;
}

function buildNotification(deficits) {
  if (deficits.length === 0) return null;

  const top = deficits.sort((a, b) => b.streak - a.streak)[0];
  const hint = DEFICIT_FOOD_HINTS[top.key] || 'nutrient-rich whole foods';

  return {
    title: `⚠️ ${top.label} has been low for ${top.streak} days`,
    body: `Try adding ${hint} to your meals today to hit your daily target.`,
    data: { type: 'nutrient_deficit', nutrient: top.key, screen: '/insights' },
    channelId: 'insights',
    priority: 'normal',
  };
}

async function runNutrientDeficitJob() {
  const startTime = Date.now();
  console.log('[NutrientDeficitJob] Starting run');

  let checked = 0;
  let sent = 0;
  let skipped = 0;

  try {
    let cursor = null;
    let hasMorePages = true;

    while (hasMorePages) {
      const page = await getUsersWithPushTokensPage(cursor);
      if (page.length === 0) break;
      cursor = page[page.length - 1].id;
      hasMorePages = page.length === PAGE_SIZE;

      for (const user of page) {
        checked++;

        // Local-hour gate: only users currently at their own 9 AM. See file
        // header — this is what replaces the old single-fixed-UTC-run design.
        const localHour = getLocalHour(user.timezoneOffset || 0);
        if (localHour !== TARGET_LOCAL_HOUR) { skipped++; continue; }

        // Respect insightDrops preference
        const prefs = user.notifications || {};
        if (prefs.insightDrops === false) { skipped++; continue; }

        // Throttle: skip if notified in last 48 h (DB-backed — survives restarts)
        if (await wasRecentlyNotified(user.userId)) { skipped++; continue; }

        const dailyRows = await getDailyMicroTotals(user.userId, 7);
        if (dailyRows.length < DEFICIT_STREAK_THRESHOLD) { skipped++; continue; }

        const deficits = findDeficits(dailyRows);
        if (deficits.length === 0) { skipped++; continue; }

        const notification = buildNotification(deficits);
        if (!notification) { skipped++; continue; }

        // Effective cap reduced by whatever this account's devices already
        // claim locally (the most restrictive device wins — see
        // getAccountEffectiveDailyCap) — this send has no specific device
        // target, so it must respect every device's local allocation at once.
        const effectiveDailyCap = await getAccountEffectiveDailyCap(db, user.userId, null, NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY);

        // Atomically reserves the slot (quiet hours + daily cap + spacing,
        // race-safe against smartReminderJob's own concurrent ticks — see
        // notificationPolicy.js) and only then attempts delivery. Try Expo
        // first; fall back to FCM. Both are device-aware: they fan out to
        // every real device row for this user, or fall back to the legacy
        // accountSettingsTable column only if the user has zero device rows —
        // never both, so a migrated user's stale legacy token can't fire
        // alongside their real device row's current one.
        const result = await withReservedNotificationSlot(db, user.userId, { maxPerDay: effectiveDailyCap }, async () => {
          let sendResult = await sendUserNotification(db, user.userId, NOTIFICATION_TYPES.INSIGHT_DROP, notification);
          let channel = sendResult?.success ? 'expo' : null;
          if (!sendResult?.success) {
            sendResult = await sendUserFCMNotification(db, user.userId, FCM_NOTIFICATION_TYPES.INSIGHT_DROP, notification);
            channel = sendResult?.success ? 'fcm' : null;
          }
          return {
            success: sendResult?.success === true,
            deliveryLog: {
              notificationType: 'nutrient_deficit',
              title: notification.title,
              body: notification.body,
              channel,
              priority: 3,
            },
          };
        });

        if (result.success) {
          sent++;
          await markNotified(user.userId);
        } else {
          skipped++;
        }
      }
    }
  } catch (err) {
    console.error('[NutrientDeficitJob] Fatal error:', err);
  }

  const durationMs = Date.now() - startTime;
  console.log(`[NutrientDeficitJob] Done in ${durationMs}ms — checked:${checked} sent:${sent} skipped:${skipped}`);
  return { checked, sent, skipped };
}

// ─── Cron export ─────────────────────────────────────────────────────────────

export function initNutrientDeficitJob() {
  // Hourly, on the hour — each run's local-hour gate (TARGET_LOCAL_HOUR)
  // picks out whichever slice of the user base is currently at their own
  // 9 AM, so every timezone gets its own appropriately-timed run instead of
  // one fixed UTC instant for everyone.
  const job = new CronJob('0 * * * *', runNutrientDeficitJob, null, true, 'UTC');
  console.log(`[NutrientDeficitJob] Scheduled — hourly, per-user local ${TARGET_LOCAL_HOUR}:00 gate`);
  return job;
}

export { runNutrientDeficitJob, getUsersWithPushTokensPage, PAGE_SIZE };
