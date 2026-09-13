/**
 * Smart Reminder Cron Job
 *
 * Production-grade scheduled notification system that:
 * - Runs every 15 minutes to check for due reminders
 * - Processes users in batches to handle scale
 * - Respects user preferences and quiet hours
 * - Uses both Expo and FCM for maximum delivery
 * - Implements circuit breaker for reliability
 * - Tracks delivery metrics for observability
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    Smart Reminder Job                           │
 * │  ┌───────────┐   ┌──────────────┐   ┌────────────────────────┐ │
 * │  │ Scheduler │ → │ User Batcher │ → │ Reminder Generator     │ │
 * │  │ (cron)    │   │ (100/batch)  │   │ (smartReminderService) │ │
 * │  └───────────┘   └──────────────┘   └────────────────────────┘ │
 * │                                              ↓                  │
 * │  ┌───────────────────────────────────────────────────────────┐ │
 * │  │              Delivery Layer (parallel)                    │ │
 * │  │  ┌─────────────┐         ┌─────────────┐                 │ │
 * │  │  │ Expo Push   │    +    │ FCM Push    │                 │ │
 * │  │  │ (fallback)  │         │ (primary)   │                 │ │
 * │  │  └─────────────┘         └─────────────┘                 │ │
 * │  └───────────────────────────────────────────────────────────┘ │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * @module SmartReminderJob
 */

import cron from 'cron';
import { randomUUID } from 'node:crypto';
import { db } from '../config/db.js';
import {
  accountSettingsTable,
  gamificationTable,
  profilesTable,
  waterLogTable,
  nutritionGoalsTable,
  notificationDeliveryLogTable,
  devicesTable,
} from '../db/schema.js';
import { eq, isNotNull, or, and, sql, gte, lte, isNull } from 'drizzle-orm';
import { getSmartReminders, REMINDER_TYPES } from '../services/smartReminderService.js';
import {
  sendUserFCMNotification,
  FCM_NOTIFICATION_TYPES,
  sendHydrationNudgeNotification,
  sendMealReminderNotification,
  sendMoodCheckInNotification,
  sendActivityNudgeNotification,
  sendStreakCelebrationNotification,
  sendReengagementNotification,
} from '../services/fcmPushService.js';
import {
  sendUserNotification,
  NOTIFICATION_TYPES
} from '../services/pushNotificationService.js';
import { isFirebaseReady } from '../config/firebase.js';
import { resolveSendTargets, getOwnedCategoriesForDevice } from '../utils/deviceRegistry.js';
import { filterRemindersForDevice, mapReminderJobCategoryToLocalCategory } from '../utils/notificationOwnership.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Batch processing
  BATCH_SIZE: 100,
  BATCH_DELAY_MS: 1000, // 1 second between batches to avoid overwhelming

  // Rate limiting
  MAX_NOTIFICATIONS_PER_USER_PER_HOUR: 2,
  MAX_NOTIFICATIONS_PER_USER_PER_DAY: 8,

  // Circuit breaker
  FAILURE_THRESHOLD: 10, // Consecutive failures before opening circuit
  CIRCUIT_RESET_MS: 5 * 60 * 1000, // 5 minutes

  // Scheduling
  CRON_SCHEDULE: '*/15 * * * *', // Every 15 minutes

  // Quiet hours (default, can be overridden per user)
  DEFAULT_QUIET_START: 22, // 10 PM
  DEFAULT_QUIET_END: 7,    // 7 AM
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let circuitState = {
  isOpen: false,
  failures: 0,
  lastFailureAt: null,
  openedAt: null,
};

let metrics = {
  lastRunAt: null,
  totalProcessed: 0,
  totalSent: 0,
  totalFailed: 0,
  totalSkipped: 0,
  byType: {},
};

// In-memory fast-path cache for rate limiting (keyed by userId:hour).
// This is a best-effort guard only — the authoritative check uses the DB
// so server restarts don't allow burst notifications.
const rateLimitCache = new Map();

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

function checkCircuitBreaker() {
  if (!circuitState.isOpen) return true;

  // Check if circuit should be reset
  const timeSinceOpen = Date.now() - circuitState.openedAt;
  if (timeSinceOpen > CONFIG.CIRCUIT_RESET_MS) {
    console.log('[SmartReminderJob] Circuit breaker reset - attempting recovery');
    circuitState.isOpen = false;
    circuitState.failures = 0;
    return true;
  }

  console.log('[SmartReminderJob] Circuit breaker OPEN - skipping notification delivery');
  return false;
}

function recordFailure() {
  circuitState.failures++;
  circuitState.lastFailureAt = Date.now();

  if (circuitState.failures >= CONFIG.FAILURE_THRESHOLD) {
    circuitState.isOpen = true;
    circuitState.openedAt = Date.now();
    console.error(`[SmartReminderJob] Circuit breaker OPENED after ${circuitState.failures} consecutive failures`);
  }
}

function recordSuccess() {
  circuitState.failures = 0;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

function checkRateLimitInMemory(userId) {
  const key = `${userId}:${new Date().getHours()}`;
  const current = rateLimitCache.get(key) || 0;
  if (current >= CONFIG.MAX_NOTIFICATIONS_PER_USER_PER_HOUR) return false;
  rateLimitCache.set(key, current + 1);
  return true;
}

async function checkRateLimitFromDB(userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(notificationDeliveryLogTable)
    .where(
      and(
        eq(notificationDeliveryLogTable.userId, userId),
        gte(notificationDeliveryLogTable.createdAt, oneHourAgo)
      )
    );
  return (row?.count ?? 0) < CONFIG.MAX_NOTIFICATIONS_PER_USER_PER_HOUR;
}

async function checkRateLimit(userId) {
  // Fast path: in-memory check (avoids DB round-trip on most calls)
  if (!checkRateLimitInMemory(userId)) return false;
  // Authoritative path: DB check survives server restarts
  return checkRateLimitFromDB(userId);
}

function clearOldRateLimits() {
  const currentHour = new Date().getHours();
  for (const [key] of rateLimitCache) {
    const [, hour] = key.split(':');
    if (parseInt(hour) !== currentHour) rateLimitCache.delete(key);
  }
}

// ============================================================================
// USER FETCHING
// ============================================================================

/**
 * Get users eligible for notifications in batches
 * Filters: has a push token (legacy column OR at least one registered
 * device), notifications enabled, not in quiet hours
 *
 * Base table is deliberately profilesTable, not accountSettingsTable: a
 * user who has only ever called /profile/devices/register (never touched
 * /profile/notifications or the legacy /profile/fcm-token, which are what
 * actually create an accountSettingsTable row) would have NO row there at
 * all — selecting FROM accountSettingsTable would silently exclude them
 * regardless of what the WHERE clause checks, since a left-joined table can
 * never appear in a query's own FROM-driven row set. profilesTable is safe
 * as the base: registerDeviceEndpoint requires a profile to already exist
 * before it will create a device row, so every device-registered user is
 * guaranteed to have one. Caught by _verifyEligibleQuery.mjs against real
 * Postgres — the original accountSettingsTable-rooted version returned zero
 * rows for a device-only user even with the EXISTS clause present.
 */
async function* getEligibleUsersBatched() {
  let offset = 0;

  while (true) {
    const users = await db
      .select({
        userId: profilesTable.userId,
        expoPushToken: accountSettingsTable.expoPushToken,
        fcmToken: accountSettingsTable.fcmToken,
        notifications: accountSettingsTable.notifications,
        timezoneOffset: gamificationTable.timezoneOffset,
        streak: gamificationTable.streak,
        fullName: profilesTable.fullName,
      })
      .from(profilesTable)
      .leftJoin(accountSettingsTable, eq(profilesTable.userId, accountSettingsTable.userId))
      .leftJoin(gamificationTable, eq(profilesTable.userId, gamificationTable.userId))
      .where(
        or(
          isNotNull(accountSettingsTable.expoPushToken),
          isNotNull(accountSettingsTable.fcmToken),
          sql`EXISTS (SELECT 1 FROM ${devicesTable} WHERE ${devicesTable.userId} = ${profilesTable.userId})`
        )
      )
      .limit(CONFIG.BATCH_SIZE)
      .offset(offset);

    if (users.length === 0) break;

    yield users;
    offset += CONFIG.BATCH_SIZE;

    // Delay between batches to avoid overwhelming the system
    await sleep(CONFIG.BATCH_DELAY_MS);
  }
}

// ============================================================================
// NOTIFICATION DELIVERY
// ============================================================================

/**
 * Map reminder types to FCM notification functions
 */
const REMINDER_TO_FCM_MAP = {
  [REMINDER_TYPES.HYDRATION_MORNING]: 'hydration',
  [REMINDER_TYPES.HYDRATION_MIDDAY]: 'hydration',
  [REMINDER_TYPES.HYDRATION_AFTERNOON]: 'hydration',
  [REMINDER_TYPES.HYDRATION_EVENING]: 'hydration',
  [REMINDER_TYPES.HYDRATION_GOAL_PROGRESS]: 'hydration',
  [REMINDER_TYPES.HYDRATION_STREAK]: 'hydration',
  [REMINDER_TYPES.FOOD_BREAKFAST]: 'meal',
  [REMINDER_TYPES.FOOD_LUNCH]: 'meal',
  [REMINDER_TYPES.FOOD_DINNER]: 'meal',
  [REMINDER_TYPES.FOOD_LOG_REMINDER]: 'meal',
  [REMINDER_TYPES.FOOD_STREAK]: 'streak',
  [REMINDER_TYPES.MOOD_CHECKIN_MORNING]: 'mood',
  [REMINDER_TYPES.MOOD_CHECKIN_AFTERNOON]: 'mood',
  [REMINDER_TYPES.MOOD_CHECKIN_EVENING]: 'mood',
  [REMINDER_TYPES.MOOD_POST_MEAL]: 'mood',
  [REMINDER_TYPES.ACTIVITY_MOVEMENT]: 'activity',
  [REMINDER_TYPES.ACTIVITY_WALK]: 'activity',
  [REMINDER_TYPES.STREAK_AT_RISK]: 'streak',
  [REMINDER_TYPES.ACHIEVEMENT_CLOSE]: 'streak',
  [REMINDER_TYPES.WEEKLY_SUMMARY]: 'general',
  [REMINDER_TYPES.COMEBACK]: 'reengagement',
};

/**
 * Query today's water intake and goal for a user.
 * Returns ml values so WittyMessageEngine gets accurate hydration percentages.
 */
async function getTodayHydration(userId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [waterRow] = await db
    .select({ totalLiters: sql`COALESCE(SUM(${waterLogTable.amountLiters}::numeric), 0)` })
    .from(waterLogTable)
    .where(and(eq(waterLogTable.userId, userId), gte(waterLogTable.loggedDate, todayStart)));

  const [goalRow] = await db
    .select({ waterLiters: nutritionGoalsTable.waterLiters })
    .from(nutritionGoalsTable)
    .where(eq(nutritionGoalsTable.userId, userId))
    .limit(1);

  const currentMl = Math.round(parseFloat(waterRow?.totalLiters ?? 0) * 1000);
  const goalMl = goalRow?.waterLiters ? Math.round(parseFloat(goalRow.waterLiters) * 1000) : 2000;
  return { currentMl, goalMl };
}

/**
 * Send notification via both FCM and Expo (with fallback) to ONE specific
 * device. `device` is either a real `devices` row (has a real `id`) or the
 * legacy pseudo-device shape from resolveSendTargets (`id: null`) — both
 * carry the same {id, fcmToken, expoPushToken} shape so this function never
 * needs to branch on which kind it got.
 */
async function deliverNotification(user, device, reminder) {
  const { userId, streak } = user;
  const { id: deviceId, fcmToken, expoPushToken } = device;
  const { type, title, body, priority } = reminder;

  // Unique per send, embedded in the push itself so the receiving device can
  // acknowledge THIS specific message. A timestamp-window correlation can't
  // tell two sends close together apart and can't validate the acker
  // actually owns this delivery — see acknowledgePushReceived.
  const deliveryId = randomUUID();

  const notification = {
    title,
    body,
    data: {
      type,
      priority: String(priority),
      screen: getScreenForType(type),
      deliveryId,
    },
  };

  let fcmSuccess = false;
  let expoSuccess = false;

  // Try FCM first (primary channel for Android)
  if (fcmToken && isFirebaseReady()) {
    try {
      const fcmType = REMINDER_TO_FCM_MAP[type] || 'general';
      let result;

      // Use specialized FCM functions for better witty messages
      switch (fcmType) {
        case 'hydration': {
          const { currentMl, goalMl } = await getTodayHydration(userId);
          result = await sendHydrationNudgeNotification(db, userId, currentMl, goalMl, { streak, deliveryId, deviceId });
          break;
        }
        case 'meal':
          result = await sendMealReminderNotification(db, userId, { streak, deliveryId, deviceId });
          break;
        case 'mood':
          result = await sendMoodCheckInNotification(db, userId, { deliveryId, deviceId });
          break;
        case 'activity':
          result = await sendActivityNudgeNotification(db, userId, { deliveryId, deviceId });
          break;
        case 'streak':
          result = await sendStreakCelebrationNotification(db, userId, streak || 0, { deliveryId, deviceId });
          break;
        case 'reengagement':
          result = await sendReengagementNotification(db, userId, { deliveryId, deviceId });
          break;
        default:
          result = await sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.DAILY_REMINDER, notification, { deviceId });
      }

      fcmSuccess = result?.success === true;
    } catch (err) {
      console.warn(`[SmartReminderJob] FCM delivery failed for ${userId}:`, err.message);
    }
  }

  // Fallback to Expo if FCM failed or unavailable
  if (!fcmSuccess && expoPushToken) {
    try {
      const result = await sendUserNotification(db, userId, mapTypeToExpo(type), notification, { deviceId });
      expoSuccess = result?.success === true;
    } catch (err) {
      console.warn(`[SmartReminderJob] Expo delivery failed for ${userId}:`, err.message);
    }
  }

  const delivered = fcmSuccess || expoSuccess;

  // Log every successful delivery to the DB — this is the source of truth for
  // the DB-backed rate limiter (checkRateLimitFromDB) and analytics, and for
  // the delivery-id-based ack (acknowledgePushReceived/getDeliveredToday).
  if (delivered) {
    try {
      await db.insert(notificationDeliveryLogTable).values({
        userId,
        deviceId,
        notificationType: type,
        title,
        body,
        channel: fcmSuccess ? 'fcm' : 'expo',
        priority: reminder.priority || 3,
        deliveryStatus: 'sent',
        deliveryId,
      });
    } catch (logErr) {
      console.warn('[SmartReminderJob] Failed to log delivery (non-critical):', logErr.message);
    }
  }

  return delivered;
}

/**
 * Map reminder type to screen for deep linking
 */
function getScreenForType(type) {
  if (type.includes('HYDRATION') || type.includes('hydration')) return 'water';
  if (type.includes('FOOD') || type.includes('food')) return 'log';
  if (type.includes('MOOD') || type.includes('mood')) return 'mood';
  if (type.includes('ACTIVITY') || type.includes('activity')) return 'activity';
  if (type.includes('STREAK') || type.includes('streak')) return 'profile';
  return 'dashboard';
}

/**
 * Map reminder type to Expo notification type
 */
function mapTypeToExpo(reminderType) {
  if (reminderType.includes('HYDRATION')) return NOTIFICATION_TYPES.HYDRATION_NUDGE;
  if (reminderType.includes('FOOD')) return NOTIFICATION_TYPES.DAILY_REMINDER;
  if (reminderType.includes('STREAK')) return NOTIFICATION_TYPES.STREAK_CELEBRATION;
  if (reminderType.includes('MOOD') || reminderType.includes('ACTIVITY')) return NOTIFICATION_TYPES.INSIGHT_DROP;
  return NOTIFICATION_TYPES.DAILY_REMINDER;
}

// ============================================================================
// QUIET HOURS CHECK
// ============================================================================

function isInQuietHours(user) {
  const notifications = user.notifications || {};
  const quietHours = notifications.quietHours || {
    start: CONFIG.DEFAULT_QUIET_START,
    end: CONFIG.DEFAULT_QUIET_END,
  };

  // Calculate user's local hour
  const offsetMinutes = user.timezoneOffset || 0;
  const now = new Date();
  // Double modulo handles negative offsets (e.g. UTC-5): JS % can return negative values.
  const localHour = ((now.getUTCHours() + Math.floor(offsetMinutes / 60)) % 24 + 24) % 24;

  const { start, end } = quietHours;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (start > end) {
    return localHour >= start || localHour < end;
  }
  return localHour >= start && localHour < end;
}

// ============================================================================
// MAIN JOB LOGIC
// ============================================================================

async function runSmartReminderJob() {
  const startTime = Date.now();
  console.log('[SmartReminderJob] Starting scheduled notification run');

  // Check circuit breaker
  if (!checkCircuitBreaker()) {
    return;
  }

  // Clear old rate limits
  clearOldRateLimits();

  // Reset run metrics
  const runMetrics = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    byType: {},
  };

  try {
    // Process users in batches
    for await (const userBatch of getEligibleUsersBatched()) {
      // Process users in parallel within batch
      const results = await Promise.allSettled(
        userBatch.map(user => processUserReminders(user, runMetrics))
      );

      // Check for too many failures in batch
      const failures = results.filter(r => r.status === 'rejected').length;
      if (failures > userBatch.length * 0.5) {
        recordFailure();
        console.error(`[SmartReminderJob] High failure rate in batch: ${failures}/${userBatch.length}`);
      } else {
        recordSuccess();
      }
    }

    // Update global metrics
    metrics.lastRunAt = new Date().toISOString();
    metrics.totalProcessed += runMetrics.processed;
    metrics.totalSent += runMetrics.sent;
    metrics.totalFailed += runMetrics.failed;
    metrics.totalSkipped += runMetrics.skipped;

    const duration = Date.now() - startTime;
    console.log(`[SmartReminderJob] Completed in ${duration}ms:`, {
      processed: runMetrics.processed,
      sent: runMetrics.sent,
      failed: runMetrics.failed,
      skipped: runMetrics.skipped,
    });

  } catch (error) {
    recordFailure();
    console.error('[SmartReminderJob] Fatal error:', error);
  }
}

/**
 * Process reminders for a single user
 */
async function processUserReminders(user, runMetrics) {
  const { userId, notifications } = user;

  runMetrics.processed++;

  // Skip if notifications globally disabled
  if (notifications?.enabled === false) {
    runMetrics.skipped++;
    return;
  }

  // Skip if in quiet hours
  if (isInQuietHours(user)) {
    runMetrics.skipped++;
    return;
  }

  // Check rate limit (async — DB-backed to survive restarts)
  if (!await checkRateLimit(userId)) {
    runMetrics.skipped++;
    return;
  }

  try {
    // Reminders reflect account-level patterns (not per-device state), so
    // they're computed once and then filtered independently per device.
    const reminders = await getSmartReminders(userId);

    if (!reminders || reminders.length === 0) {
      runMetrics.skipped++;
      return;
    }

    // Real devices from the new per-device model, or the one legacy
    // pseudo-device wrapping accountSettingsTable's single token — never
    // both (see resolveSendTargets).
    const targets = await resolveSendTargets(db, userId, user);
    if (targets.length === 0) {
      runMetrics.skipped++;
      return;
    }

    for (const device of targets) {
      // Legacy pseudo-devices (device.id === null) never own anything —
      // getOwnedCategoriesForDevice returns an empty set for them, so they
      // always see the full candidate list, exactly like every device did
      // before this feature existed.
      const ownedCategories = await getOwnedCategoriesForDevice(db, device.id);
      const candidates = filterRemindersForDevice(
        reminders,
        ownedCategories,
        (type) => mapReminderJobCategoryToLocalCategory(getCategoryForType(type))
      );

      if (candidates.length === 0) {
        // Every candidate reminder for this device this cycle falls under a
        // category it owns locally — correct suppression, not a failure.
        continue;
      }

      // Send only the highest priority remaining reminder to avoid spam
      const topReminder = candidates[0];

      // Check if this reminder type is enabled for user (account-level pref)
      const reminderCategory = getCategoryForType(topReminder.type);
      if (notifications?.[reminderCategory] === false) {
        continue;
      }

      const success = await deliverNotification(user, device, topReminder);

      if (success) {
        runMetrics.sent++;
        runMetrics.byType[topReminder.type] = (runMetrics.byType[topReminder.type] || 0) + 1;
        console.log(`[SmartReminderJob] Sent ${topReminder.type} to user ${userId} (device ${device.id ?? 'legacy'})`);
      } else {
        runMetrics.failed++;
      }
    }

  } catch (error) {
    runMetrics.failed++;
    console.error(`[SmartReminderJob] Error processing user ${userId}:`, error.message);
  }
}

/**
 * Get notification category for preference checking
 */
function getCategoryForType(type) {
  if (type.includes('HYDRATION') || type.includes('hydration')) return 'hydration';
  if (type.includes('FOOD') || type.includes('food')) return 'food';
  if (type.includes('MOOD') || type.includes('mood')) return 'mood';
  if (type.includes('ACTIVITY') || type.includes('activity')) return 'activity';
  if (type.includes('STREAK') || type.includes('COMEBACK')) return 'motivation';
  return 'enabled';
}

// ============================================================================
// UTILITIES
// ============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// JOB INITIALIZATION
// ============================================================================

/**
 * Initialize the smart reminder cron job
 * @returns {cron.CronJob} The cron job instance
 */
export function initSmartReminderCronJob() {
  const job = new cron.CronJob(
    CONFIG.CRON_SCHEDULE,
    runSmartReminderJob,
    null,
    true,
    'UTC'
  );

  console.log(`[SmartReminderJob] Initialized - runs every 15 minutes (${CONFIG.CRON_SCHEDULE})`);
  return job;
}

/**
 * Get current metrics for monitoring
 */
export function getSmartReminderMetrics() {
  return {
    ...metrics,
    circuitState: {
      isOpen: circuitState.isOpen,
      failures: circuitState.failures,
    },
    rateLimitCacheSize: rateLimitCache.size,
  };
}

/**
 * Manually trigger a reminder run (for testing)
 */
export async function triggerSmartReminderRun() {
  console.log('[SmartReminderJob] Manual trigger requested');
  await runSmartReminderJob();
}

export default {
  initSmartReminderCronJob,
  getSmartReminderMetrics,
  triggerSmartReminderRun,
};
