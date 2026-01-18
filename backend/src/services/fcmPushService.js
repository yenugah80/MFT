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
import { accountSettingsTable } from '../db/schema.js';
import { getMessaging, isFirebaseReady } from '../config/firebase.js';

/**
 * FCM Notification types
 * Maps to user preference keys in accountSettingsTable.notifications JSON
 */
export const FCM_NOTIFICATION_TYPES = {
  DAILY_REMINDER: 'dailyReminder',
  HYDRATION_NUDGE: 'hydrationNudges',
  INSIGHT_DROP: 'insightDrops',
  STREAK_CELEBRATION: 'streakCelebrations',
  GOAL_ACHIEVED: 'goalAchieved',
  CORRELATION_DISCOVERED: 'correlationDiscovered',
  WEEKLY_SUMMARY: 'weeklySummary',
  REAL_TIME_ALERT: 'realTimeAlert',
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
 * Send notification to a user via FCM (checks preferences)
 * @param {object} db - Database instance
 * @param {string} userId - User ID
 * @param {string} notificationType - Type from FCM_NOTIFICATION_TYPES
 * @param {object} notification - Notification content
 */
export async function sendUserFCMNotification(db, userId, notificationType, notification) {
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

    if (!settings?.fcmToken) {
      console.log(`[FCMService] User ${userId} has no FCM token`);
      return { success: false, reason: 'no_fcm_token' };
    }

    // Check notification preference (default to enabled)
    const prefs = settings.notifications || {};
    const isEnabled = prefs[notificationType] !== false;

    if (!isEnabled) {
      console.log(`[FCMService] User ${userId} has ${notificationType} disabled`);
      return { success: false, reason: 'preference_disabled' };
    }

    const result = await sendFCMNotification(settings.fcmToken, {
      ...notification,
      type: notificationType,
    });

    // Clean up invalid token
    if (result.shouldRemove) {
      console.log(`[FCMService] Removing invalid FCM token for user ${userId}`);
      await db
        .update(accountSettingsTable)
        .set({ fcmToken: null, fcmTokenUpdatedAt: new Date() })
        .where(eq(accountSettingsTable.userId, userId));
    }

    return result;
  } catch (error) {
    console.error(`[FCMService] Error sending to user ${userId}:`, error);
    return { success: false, error: error.message };
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
// PRE-BUILT NOTIFICATION TEMPLATES
// ============================================================================

/**
 * Send goal achieved notification
 */
export async function sendGoalAchievedNotification(db, userId, goalType, value) {
  const messages = {
    calories: `You hit your calorie goal of ${value} today!`,
    protein: `Protein goal reached: ${value}g!`,
    water: `Hydration goal complete: ${value}L!`,
    steps: `Step goal crushed: ${value.toLocaleString()} steps!`,
  };

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.GOAL_ACHIEVED, {
    title: 'Goal Achieved!',
    body: messages[goalType] || `You reached your ${goalType} goal!`,
    data: { goalType, value: String(value), screen: 'dashboard' },
    channelId: 'insights',
  });
}

/**
 * Send streak celebration notification
 */
export async function sendStreakCelebrationNotification(db, userId, streakDays) {
  const milestoneMessages = {
    7: 'One week strong! Keep it up!',
    14: 'Two weeks of consistency! Amazing progress!',
    30: 'One month milestone! You\'re crushing it!',
    50: '50 days! You\'re on fire!',
    100: '100 days! Legendary dedication!',
  };

  const body = milestoneMessages[streakDays] || `${streakDays} day streak! Keep going!`;

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.STREAK_CELEBRATION, {
    title: `${streakDays} Day Streak!`,
    body,
    data: { streakDays: String(streakDays), screen: 'profile' },
    channelId: 'insights',
  });
}

/**
 * Send correlation discovered notification
 */
export async function sendCorrelationDiscoveredNotification(db, userId, correlation) {
  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.CORRELATION_DISCOVERED, {
    title: 'New Pattern Discovered',
    body: correlation.summary || 'We found a new pattern in your health data!',
    data: {
      correlationId: String(correlation.id),
      type: correlation.type,
      screen: 'insights',
    },
    channelId: 'insights',
  });
}

/**
 * Send weekly summary notification
 */
export async function sendWeeklySummaryNotification(db, userId, summary) {
  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.WEEKLY_SUMMARY, {
    title: 'Your Weekly Summary',
    body: `${summary.mealsLogged} meals logged, ${summary.avgCalories} avg calories. Tap to see insights.`,
    data: { screen: 'insights', period: 'weekly' },
    channelId: 'insights',
  });
}

/**
 * Send hydration nudge notification
 */
export async function sendHydrationNudgeNotification(db, userId, currentMl, goalMl) {
  const remaining = Math.max(0, goalMl - currentMl);
  const percentage = Math.round((currentMl / goalMl) * 100);

  let body;
  if (percentage >= 100) {
    body = 'Amazing! You hit your hydration goal today!';
  } else if (percentage >= 75) {
    body = `Almost there! Just ${remaining}ml more to reach your goal.`;
  } else {
    body = `You've had ${currentMl}ml today. ${remaining}ml more to reach your goal.`;
  }

  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.HYDRATION_NUDGE, {
    title: 'Hydration Check',
    body,
    data: {
      currentMl: String(currentMl),
      goalMl: String(goalMl),
      screen: 'water',
    },
    channelId: 'hydration',
  });
}

/**
 * Send insight drop notification
 */
export async function sendInsightDropNotification(db, userId, insight) {
  return sendUserFCMNotification(db, userId, FCM_NOTIFICATION_TYPES.INSIGHT_DROP, {
    title: insight.title || 'New Insight',
    body: insight.body || insight.summary,
    data: {
      insightId: String(insight.id),
      insightType: insight.type,
      screen: 'insights',
    },
    channelId: 'insights',
  });
}

export default {
  FCM_NOTIFICATION_TYPES,
  sendFCMNotification,
  sendBatchFCMNotifications,
  sendUserFCMNotification,
  broadcastFCMNotification,
  sendGoalAchievedNotification,
  sendStreakCelebrationNotification,
  sendCorrelationDiscoveredNotification,
  sendWeeklySummaryNotification,
  sendHydrationNudgeNotification,
  sendInsightDropNotification,
};
