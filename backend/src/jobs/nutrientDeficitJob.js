/**
 * Nutrient Deficit Push Notification Job
 *
 * Runs daily at 8:00 AM UTC. Finds users with >= 3 consecutive days
 * below 70% RDA for any micronutrient and sends an actionable push
 * notification recommending foods that address the deficit.
 *
 * Safety rails:
 * - Max one deficit notification per user per 48 h (throttled via lastNotifiedAt cache)
 * - Respects user insightDrops notification preference
 * - Skips users with no push token
 * - Caps at 500 users per run to avoid memory spikes
 */

import { CronJob } from 'cron';
import { db } from '../config/db.js';
import { foodLogTable, accountSettingsTable } from '../db/schema.js';
import { eq, and, gte, isNotNull, or, sql } from 'drizzle-orm';
import { sendPushNotification } from '../services/pushNotificationService.js';
import { sendFCMNotification } from '../services/fcmPushService.js';
import { notificationDeliveryLogTable } from '../db/schema.js';

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
const MAX_USERS_PER_RUN = 500;

// ─── Core logic ──────────────────────────────────────────────────────────────

async function getUsersWithPushTokens() {
  return db
    .select({
      userId: accountSettingsTable.userId,
      expoPushToken: accountSettingsTable.expoPushToken,
      fcmToken: accountSettingsTable.fcmToken,
      notifications: accountSettingsTable.notifications,
    })
    .from(accountSettingsTable)
    .where(
      or(
        isNotNull(accountSettingsTable.expoPushToken),
        isNotNull(accountSettingsTable.fcmToken)
      )
    )
    .limit(MAX_USERS_PER_RUN);
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
    const users = await getUsersWithPushTokens();

    for (const user of users) {
      checked++;

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

      // Try Expo first; fall back to FCM for users without an Expo token
      let result;
      if (user.expoPushToken) {
        result = await sendPushNotification(user.expoPushToken, notification);
      } else if (user.fcmToken) {
        result = await sendFCMNotification(user.fcmToken, notification);
      }

      if (result?.success) {
        sent++;
        await markNotified(user.userId);
        // Persist delivery to DB so wasRecentlyNotified works across restarts
        try {
          await db.insert(notificationDeliveryLogTable).values({
            userId: user.userId,
            notificationType: 'nutrient_deficit',
            title: notification.title,
            body: notification.body,
            channel: user.expoPushToken ? 'expo' : 'fcm',
            priority: 3,
            deliveryStatus: 'sent',
          });
        } catch (logErr) {
          console.warn('[NutrientDeficitJob] Failed to log delivery:', logErr.message);
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
  // Fire at 08:00 UTC every day
  const job = new CronJob('0 8 * * *', runNutrientDeficitJob, null, true, 'UTC');
  console.log('[NutrientDeficitJob] Scheduled — daily at 08:00 UTC');
  return job;
}

export { runNutrientDeficitJob };
