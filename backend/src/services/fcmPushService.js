/**
 * FCM Push Notification Service
 * Sends push notifications via Firebase Cloud Messaging
 *
 * Use this for:
 * - Server-triggered notifications (real-time alerts)
 * - Broadcast messages to multiple users
 * - Backend-initiated push notifications
 *
 * For local scheduled notifications, mobile app uses expo-notifications directly.
 */

import { eq, isNotNull } from 'drizzle-orm';
import { accountSettingsTable, devicesTable } from '../db/schema.js';
import { getMessaging, isFirebaseReady } from '../config/firebase.js';
import { getDevicesForUser } from '../utils/deviceRegistry.js';
import WittyMessageEngine from './wittyMessageEngine.js';

/**
 * FCM Notification types
 * Maps to user preference keys in accountSettingsTable.notifications JSON
 */
export const FCM_NOTIFICATION_TYPES = {
  DAILY_REMINDER: 'food',
  HYDRATION_NUDGE: 'hydration',
  INSIGHT_DROP: 'insightDrops',          // granular preference key
  STREAK_CELEBRATION: 'streakCelebrations', // granular preference key
  STREAK_AT_RISK: 'streakProtection',    // granular preference key
  GOAL_ACHIEVED: 'insightDrops',
  CORRELATION_DISCOVERED: 'insightDrops',
  WEEKLY_SUMMARY: 'insightDrops',
  REAL_TIME_ALERT: 'enabled',
};

/**
 * Send a single FCM notification
 * @param {string} fcmToken - The FCM device token
 * @param {object} notification - The notification content
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {object} notification.data - Custom data payload
 * @param {string} notification.channelId - Android notification channel
 * @param {number} notification.badge - iOS badge count
 * @returns {Promise<object>} - Send result
 */
export async function sendFCMNotification(fcmToken, notification) {
  const messaging = getMessaging();

  if (!messaging) {
    console.warn('[FCMService] Firebase messaging not initialized - notification not sent');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!fcmToken) {
    return { success: false, error: 'No FCM token provided' };
  }

  const message = {
    token: fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: {
      ...(notification.data || {}),
      type: notification.type || 'general',
      timestamp: Date.now().toString(),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: notification.channelId || 'default',
        sound: 'default',
        priority: 'high',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: notification.badge,
          'mutable-content': 1,
          // Required for iOS to wake the app's background message handler
          // for a visible-alert push while backgrounded/killed — without
          // this, the client's local/remote dedup and delivery-ack logic
          // (see mobile/services/fcmService.js) never run on iOS when the
          // app isn't already open, which is the exact scenario they exist
          // to handle.
          'content-available': 1,
        },
      },
    },
  };

  try {
    const response = await messaging.send(message);
    console.log('[FCMService] Notification sent:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('[FCMService] Send failed:', error.code, error.message);

    // Handle invalid/expired token
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      return { success: false, error: 'invalid_token', shouldRemove: true };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Send FCM notifications in batch (up to 500 per request)
 * @param {Array<{token: string, notification: object}>} messages
 * @returns {Promise<object>} - Batch send results
 */
export async function sendBatchFCMNotifications(messages) {
  const messaging = getMessaging();

  if (!messaging) {
    return { success: false, error: 'Firebase not initialized', sent: 0, failed: 0 };
  }

  if (!messages || messages.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const BATCH_SIZE = 500; // FCM limit
  let sent = 0;
  let failed = 0;
  const invalidTokens = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const fcmMessages = batch.map(({ token, notification }) => ({
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...(notification.data || {}),
        type: notification.type || 'general',
        timestamp: Date.now().toString(),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: notification.channelId || 'default',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'default' },
        },
      },
    }));

    try {
      const response = await messaging.sendEach(fcmMessages);

      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          sent++;
        } else {
          failed++;
          // Track invalid tokens for cleanup
          if (
            resp.error?.code === 'messaging/registration-token-not-registered' ||
            resp.error?.code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(batch[idx].token);
          }
        }
      });
    } catch (error) {
      console.error('[FCMService] Batch send error:', error);
      failed += batch.length;
    }
  }

  console.log(`[FCMService] Batch complete: ${sent} sent, ${failed} failed`);
  return { success: true, sent, failed, invalidTokens };
}

/**
 * Send notification to a user via FCM (checks preferences).
 *
 * Device routing:
 * - `options.deviceId` given → send only to that specific `devices` row
 *   (used by smartReminderJob's per-device loop, which already decided
 *   this exact device should get this exact reminder).
 * - No `deviceId` → fan out to every real `devices` row for this user, or
 *   fall back to the legacy single-token accountSettingsTable column if
 *   the user has zero device rows. This keeps every non-reminder-job
 *   caller (goal-achieved, insight-drop, weekly-summary, correlation) working
 *   unchanged for both pre- and post-device-model app installs — see
 *   docs/architecture and deviceRegistry.js for why the fallback exists.
 *
 * @param {object} db - Database instance
 * @param {string} userId - User ID
 * @param {string} notificationType - Type from FCM_NOTIFICATION_TYPES
 * @param {object} notification - Notification content
 * @param {{deviceId?: number}} [options]
 */
export async function sendUserFCMNotification(db, userId, notificationType, notification, options = {}) {
  if (!isFirebaseReady()) {
    console.log(`[FCMService] Firebase not ready - skipping notification for user ${userId}`);
    return { success: false, reason: 'firebase_not_ready' };
  }

  try {
    const [settings] = await db
      .select({
        fcmToken: accountSettingsTable.fcmToken,
        notifications: accountSettingsTable.notifications,
      })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    const prefs = settings?.notifications || {};
    const isEnabled = prefs[notificationType] !== false;
    if (!isEnabled) {
      console.log(`[FCMService] User ${userId} has ${notificationType} disabled`);
      return { success: false, reason: 'preference_disabled' };
    }

    const targets = await resolveFCMSendTargets(db, userId, options.deviceId, settings);
    if (targets.length === 0) {
      console.log(`[FCMService] User ${userId} has no FCM token`);
      return { success: false, reason: 'no_fcm_token' };
    }

    const results = await Promise.all(targets.map(async (target) => {
      const result = await sendFCMNotification(target.fcmToken, {
        ...notification,
        type: notificationType,
      });
      if (result.shouldRemove) {
        await clearInvalidFCMToken(db, userId, target);
      }
      return result;
    }));

    // Preserve the single-object shape existing callers (deliveryId cleanup
    // logic, etc.) already expect when there's exactly one target — which
    // is every case except an explicit multi-device fan-out.
    return targets.length === 1 ? results[0] : { success: results.some((r) => r.success), results };
  } catch (error) {
    console.error(`[FCMService] Error sending to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Resolves which device(s) to actually send an FCM message to for a user.
 */
export async function resolveFCMSendTargets(db, userId, explicitDeviceId, legacySettings) {
  if (explicitDeviceId != null) {
    const [device] = await db.select().from(devicesTable).where(eq(devicesTable.id, explicitDeviceId));
    return device?.fcmToken ? [{ deviceRowId: device.id, fcmToken: device.fcmToken }] : [];
  }

  const devices = await getDevicesForUser(db, userId);
  const withToken = devices.filter((d) => d.fcmToken);
  if (withToken.length > 0) {
    return withToken.map((d) => ({ deviceRowId: d.id, fcmToken: d.fcmToken }));
  }

  return legacySettings?.fcmToken ? [{ deviceRowId: null, fcmToken: legacySettings.fcmToken }] : [];
}

async function clearInvalidFCMToken(db, userId, target) {
  if (target.deviceRowId != null) {
    console.log(`[FCMService] Removing invalid FCM token for device ${target.deviceRowId} (user ${userId})`);
    await db
      .update(devicesTable)
      .set({ fcmToken: null, fcmTokenUpdatedAt: new Date() })
      .where(eq(devicesTable.id, target.deviceRowId));
  } else {
    console.log(`[FCMService] Removing invalid legacy FCM token for user ${userId}`);
    await db
      .update(accountSettingsTable)
      .set({ fcmToken: null, fcmTokenUpdatedAt: new Date() })
      .where(eq(accountSettingsTable.userId, userId));
  }
}

/**
 * Broadcast FCM notification to all users with FCM tokens
 * @param {object} db - Database instance
 * @param {string} notificationType - Notification type (for preference filtering)
 * @param {object} notification - Notification content
 */
export async function broadcastFCMNotification(db, notificationType, notification) {
  if (!isFirebaseReady()) {
    console.log('[FCMService] Firebase not ready - skipping broadcast');
    return { success: false, reason: 'firebase_not_ready' };
  }

  try {
    const users = await db
      .select({
        userId: accountSettingsTable.userId,
        fcmToken: accountSettingsTable.fcmToken,
        notifications: accountSettingsTable.notifications,
      })
      .from(accountSettingsTable)
      .where(isNotNull(accountSettingsTable.fcmToken));

    // Filter by preference
    const eligible = users.filter((user) => {
      const prefs = user.notifications || {};
      return prefs[notificationType] !== false;
    });

    if (eligible.length === 0) {
      console.log(`[FCMService] No eligible users for ${notificationType} broadcast`);
      return { success: true, sent: 0, total: users.length };
    }

    const messages = eligible.map((user) => ({
      token: user.fcmToken,
      notification,
    }));

    const result = await sendBatchFCMNotifications(messages);

    // Clean up invalid tokens
    if (result.invalidTokens?.length > 0) {
      console.log(`[FCMService] Cleaning up ${result.invalidTokens.length} invalid tokens`);
      for (const token of result.invalidTokens) {
        await db
          .update(accountSettingsTable)
          .set({ fcmToken: null, fcmTokenUpdatedAt: new Date() })
          .where(eq(accountSettingsTable.fcmToken, token));
      }
    }

    return {
      ...result,
      eligible: eligible.length,
      total: users.length,
    };
  } catch (error) {
    console.error('[FCMService] Broadcast error:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// WITTY NOTIFICATION TEMPLATES (Zomato-style)
// ============================================================================

/**
 * Send goal achieved notification with witty copy
 */
export async function sendGoalAchievedNotification(db, userId, goalType, value, context = {}) {
  let message;

  switch (goalType) {
    case 'water':
    case 'hydration':
      message = WittyMessageEngine.getHydrationMessage({
        percentage: 100,
        currentMl: value,
        goalMl: value,
        streak: context.streak || 0,
      });
      break;
    case 'steps':
      message = WittyMessageEngine.getActivityMessage({
        steps: value,
        stepGoal: value,
      });
      break;
    default:
      // For calories, protein, etc. - use domain-specific witty messages
      message = {
        title: "You did that 💪",
        body: `${goalType.charAt(0).toUpperCase() + goalType.slice(1)} goal: crushed. Your body is running on premium today.`,
      };
  }

  // Fallback if no witty message generated
  if (!message) {
    message = {
      title: "Goal achieved!",
      body: `Your ${goalType} goal is complete. That's what consistency looks like.`,
    };
  }

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.GOAL_ACHIEVED, {
    title: message.title,
    body: message.body,
    data: { goalType, value: String(value), screen: 'dashboard' },
    channelId: 'insights',
  });
}

/**
 * Send streak celebration notification with personality for EVERY day
 */
export async function sendStreakCelebrationNotification(db, userId, streakDays, context = {}) {
  // Get witty message for ANY streak day (not just milestones)
  const message = WittyMessageEngine.getStreakMessage(streakDays);

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.STREAK_CELEBRATION, {
    title: message.title,
    body: message.body,
    data: { streakDays: String(streakDays), screen: 'profile', deliveryId: context.deliveryId },
    channelId: 'insights',
  }, { deviceId: context.deviceId });
}

/**
 * Send correlation discovered notification with intrigue
 */
export async function sendCorrelationDiscoveredNotification(db, userId, correlation) {
  // Make pattern discovery feel like a revelation
  const titleOptions = [
    "We noticed something interesting 🔍",
    "Pattern unlocked",
    "Your data revealed something",
    "Insight discovered",
  ];

  const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];

  // Use correlation summary or generate curiosity
  const body = correlation.summary ||
    `Your ${correlation.type || 'wellness'} patterns just taught us something new. Tap to see.`;

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.CORRELATION_DISCOVERED, {
    title,
    body,
    data: {
      correlationId: String(correlation.id),
      type: correlation.type,
      screen: 'insights',
    },
    channelId: 'insights',
  });
}

/**
 * Send weekly summary with personality
 */
export async function sendWeeklySummaryNotification(db, userId, summary) {
  const { mealsLogged = 0, avgCalories = 0, streakDays = 0, hydrationAvg = 0 } = summary;

  // Build a personalized summary based on highlights
  let title, body;

  if (streakDays >= 7) {
    title = "Your week in review 🔥";
    body = `${mealsLogged} meals logged, ${streakDays}-day streak going strong. You're in rhythm.`;
  } else if (mealsLogged >= 14) {
    title = "Solid week 📊";
    body = `${mealsLogged} meals tracked at ~${avgCalories} cal avg. Your data is getting smarter.`;
  } else if (mealsLogged >= 7) {
    title = "Week wrapped up";
    body = `${mealsLogged} meals logged this week. Every entry helps us help you.`;
  } else {
    title = "Weekly check-in";
    body = `${mealsLogged} meals this week. More logs = better insights. Just saying.`;
  }

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.WEEKLY_SUMMARY, {
    title,
    body,
    data: { screen: 'insights', period: 'weekly' },
    channelId: 'insights',
  });
}

/**
 * Send hydration nudge with witty, contextual copy
 */
export async function sendHydrationNudgeNotification(db, userId, currentMl, goalMl, context = {}) {
  const percentage = goalMl > 0 ? Math.round((currentMl / goalMl) * 100) : 0;

  // Get witty message from engine with full context
  const message = WittyMessageEngine.getHydrationMessage({
    percentage,
    currentMl,
    goalMl,
    hoursSinceLastLog: context.hoursSinceLastLog,
    streak: context.streak || 0,
    logCount: context.logCount || 0,
    hasCaffeine: context.hasCaffeine || false,
    temperature: context.temperature,
  });

  // Use witty message or fallback with personality
  const notification = message || {
    title: "Quick hydration check 💧",
    body: percentage < 50
      ? "Your water bottle is feeling neglected. Just an observation."
      : `${percentage}% there. Keep the momentum going.`,
  };

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.HYDRATION_NUDGE, {
    title: notification.title,
    body: notification.body,
    data: {
      currentMl: String(currentMl),
      goalMl: String(goalMl),
      screen: 'water',
      deliveryId: context.deliveryId,
    },
    channelId: 'hydration',
  }, { deviceId: context.deviceId });
}

/**
 * Send insight drop notification with curiosity hooks
 */
export async function sendInsightDropNotification(db, userId, insight) {
  // Make insights feel like discoveries, not just information
  let title = insight.title;
  let body = insight.body || insight.summary;

  // Add personality if the insight has generic title
  if (!title || title === 'New Insight') {
    const titleHooks = [
      "Something to think about 💭",
      "Your data has a story",
      "Worth knowing",
      "Quick insight",
    ];
    title = titleHooks[Math.floor(Math.random() * titleHooks.length)];
  }

  // Add curiosity if body is too generic
  if (!body || body.length < 20) {
    body = "We found something interesting in your patterns. Tap to explore.";
  }

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.INSIGHT_DROP, {
    title,
    body,
    data: {
      insightId: String(insight.id),
      insightType: insight.type,
      screen: 'insights',
    },
    channelId: 'insights',
  });
}

/**
 * Send re-engagement notification with personality (not guilt)
 */
export async function sendReengagementNotification(db, userId, context = {}) {
  const message = WittyMessageEngine.getReengagementMessage({
    daysInactive: context.daysInactive || 3,
    previousStreak: context.previousStreak || 0,
    totalDays: context.totalDays || 0,
  });

  if (!message) {
    // Don't send if no relevant message
    return { success: false, reason: 'no_relevant_message' };
  }

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.DAILY_REMINDER, {
    title: message.title,
    body: message.body,
    data: { screen: 'dashboard', type: 'reengagement', deliveryId: context.deliveryId },
    channelId: 'reminders',
  }, { deviceId: context.deviceId });
}

/**
 * Send meal reminder notification with context
 */
export async function sendMealReminderNotification(db, userId, context = {}) {
  const message = WittyMessageEngine.getFoodMessage({
    mealsLogged: context.mealsLogged || 0,
    totalCalories: context.totalCalories || 0,
    calorieGoal: context.calorieGoal || 2000,
    streak: context.streak || 0,
  });

  if (!message) {
    return { success: false, reason: 'no_relevant_message' };
  }

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.DAILY_REMINDER, {
    title: message.title,
    body: message.body,
    data: { screen: 'log', type: 'meal_reminder', deliveryId: context.deliveryId },
    channelId: 'reminders',
  }, { deviceId: context.deviceId });
}

/**
 * Send mood check-in notification
 */
export async function sendMoodCheckInNotification(db, userId, context = {}) {
  const message = WittyMessageEngine.getMoodMessage({
    hour: new Date().getHours(),
    pattern: context.pattern,
  });

  if (!message) {
    return { success: false, reason: 'no_relevant_message' };
  }

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.INSIGHT_DROP, {
    title: message.title,
    body: message.body,
    data: { screen: 'mood', type: 'mood_checkin', deliveryId: context.deliveryId },
    channelId: 'insights',
  }, { deviceId: context.deviceId });
}

/**
 * Send activity nudge notification
 */
export async function sendActivityNudgeNotification(db, userId, context = {}) {
  const message = WittyMessageEngine.getActivityMessage({
    steps: context.steps || 0,
    stepGoal: context.stepGoal || 10000,
    sedentaryHours: context.sedentaryHours || 0,
    justWorkedOut: context.justWorkedOut || false,
  });

  if (!message) {
    return { success: false, reason: 'no_relevant_message' };
  }

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.DAILY_REMINDER, {
    title: message.title,
    body: message.body,
    data: { screen: 'activity', type: 'activity_nudge', deliveryId: context.deliveryId },
    channelId: 'reminders',
  }, { deviceId: context.deviceId });
}

export default {
  FCM_NOTIFICATION_TYPES,
  sendFCMNotification,
  sendBatchFCMNotifications,
  sendUserFCMNotification,
  broadcastFCMNotification,
  // Witty notification functions
  sendGoalAchievedNotification,
  sendStreakCelebrationNotification,
  sendCorrelationDiscoveredNotification,
  sendWeeklySummaryNotification,
  sendHydrationNudgeNotification,
  sendInsightDropNotification,
  sendReengagementNotification,
  sendMealReminderNotification,
  sendMoodCheckInNotification,
  sendActivityNudgeNotification,
};
