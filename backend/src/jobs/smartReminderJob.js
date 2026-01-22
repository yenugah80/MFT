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
import { db } from '../config/db.js';
import {
  accountSettingsTable,
  gamificationTable,
  profilesTable
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

// In-memory rate limiting (reset hourly)
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

function checkRateLimit(userId) {
  const key = `${userId}:${new Date().getHours()}`;
  const current = rateLimitCache.get(key) || 0;

  if (current >= CONFIG.MAX_NOTIFICATIONS_PER_USER_PER_HOUR) {
    return false;
  }

  rateLimitCache.set(key, current + 1);
  return true;
}

function clearOldRateLimits() {
  const currentHour = new Date().getHours();
  for (const [key] of rateLimitCache) {
    const [, hour] = key.split(':');
    if (parseInt(hour) !== currentHour) {
      rateLimitCache.delete(key);
    }
  }
}

// ============================================================================
// USER FETCHING
// ============================================================================

/**
 * Get users eligible for notifications in batches
 * Filters: has push token, notifications enabled, not in quiet hours
 */
async function* getEligibleUsersBatched() {
  let offset = 0;

  while (true) {
    const users = await db
      .select({
        userId: accountSettingsTable.userId,
        expoPushToken: accountSettingsTable.expoPushToken,
        fcmToken: accountSettingsTable.fcmToken,
        notifications: accountSettingsTable.notifications,
        timezoneOffset: gamificationTable.timezoneOffset,
        streak: gamificationTable.streak,
        fullName: profilesTable.fullName,
      })
      .from(accountSettingsTable)
      .leftJoin(gamificationTable, eq(accountSettingsTable.userId, gamificationTable.userId))
      .leftJoin(profilesTable, eq(accountSettingsTable.userId, profilesTable.userId))
      .where(
        or(
          isNotNull(accountSettingsTable.expoPushToken),
          isNotNull(accountSettingsTable.fcmToken)
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
  [REMINDER_TYPES.FOOD_BREAKFAST]: 'meal',
  [REMINDER_TYPES.FOOD_LUNCH]: 'meal',
  [REMINDER_TYPES.FOOD_DINNER]: 'meal',
  [REMINDER_TYPES.FOOD_LOG_REMINDER]: 'meal',
  [REMINDER_TYPES.FOOD_STREAK]: 'streak',
  [REMINDER_TYPES.MOOD_CHECKIN_MORNING]: 'mood',
  [REMINDER_TYPES.MOOD_CHECKIN_AFTERNOON]: 'mood',
  [REMINDER_TYPES.MOOD_CHECKIN_EVENING]: 'mood',
  [REMINDER_TYPES.ACTIVITY_MOVEMENT]: 'activity',
  [REMINDER_TYPES.ACTIVITY_WALK]: 'activity',
  [REMINDER_TYPES.STREAK_AT_RISK]: 'streak',
  [REMINDER_TYPES.COMEBACK]: 'reengagement',
};

/**
 * Send notification via both FCM and Expo (with fallback)
 */
async function deliverNotification(user, reminder) {
  const { userId, fcmToken, expoPushToken, streak } = user;
  const { type, title, body, priority } = reminder;

  const notification = {
    title,
    body,
    data: {
      type,
      priority: String(priority),
      screen: getScreenForType(type),
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
        case 'hydration':
          result = await sendHydrationNudgeNotification(db, userId, 0, 2000, { streak });
          break;
        case 'meal':
          result = await sendMealReminderNotification(db, userId, { streak });
          break;
        case 'mood':
          result = await sendMoodCheckInNotification(db, userId, {});
          break;
        case 'activity':
          result = await sendActivityNudgeNotification(db, userId, {});
          break;
        case 'streak':
          result = await sendStreakCelebrationNotification(db, userId, streak || 0);
          break;
        case 'reengagement':
          result = await sendReengagementNotification(db, userId, {});
          break;
        default:
          result = await sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.DAILY_REMINDER, notification);
      }

      fcmSuccess = result?.success === true;
    } catch (err) {
      console.warn(`[SmartReminderJob] FCM delivery failed for ${userId}:`, err.message);
    }
  }

  // Fallback to Expo if FCM failed or unavailable
  if (!fcmSuccess && expoPushToken) {
    try {
      const result = await sendUserNotification(db, userId, mapTypeToExpo(type), notification);
      expoSuccess = result?.success === true;
    } catch (err) {
      console.warn(`[SmartReminderJob] Expo delivery failed for ${userId}:`, err.message);
    }
  }

  return fcmSuccess || expoSuccess;
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
  const localHour = (now.getUTCHours() + Math.floor(offsetMinutes / 60)) % 24;

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

  // Check rate limit
  if (!checkRateLimit(userId)) {
    runMetrics.skipped++;
    return;
  }

  try {
    // Get smart reminders for this user
    const reminders = await getSmartReminders(userId);

    if (!reminders || reminders.length === 0) {
      return;
    }

    // Send only the highest priority reminder to avoid spam
    const topReminder = reminders[0];

    // Check if this reminder type is enabled for user
    const reminderCategory = getCategoryForType(topReminder.type);
    if (notifications?.[reminderCategory] === false) {
      runMetrics.skipped++;
      return;
    }

    // Deliver the notification
    const success = await deliverNotification(user, topReminder);

    if (success) {
      runMetrics.sent++;
      runMetrics.byType[topReminder.type] = (runMetrics.byType[topReminder.type] || 0) + 1;
      console.log(`[SmartReminderJob] Sent ${topReminder.type} to user ${userId}`);
    } else {
      runMetrics.failed++;
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
