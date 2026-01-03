/**
 * Push Notification Service
 * Sends push notifications to users via Expo's push notification service
 *
 * Features:
 * - Send individual notifications
 * - Batch notification sending
 * - Notification type filtering based on user preferences
 * - Error handling and logging
 */

import { eq, and, isNotNull } from 'drizzle-orm';
import { accountSettingsTable } from '../db/schema.js';

// Expo Push Notification API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Notification types that map to user preferences
 */
export const NOTIFICATION_TYPES = {
  DAILY_REMINDER: 'dailyReminder',
  HYDRATION_NUDGE: 'hydrationNudges',
  INSIGHT_DROP: 'insightDrops',
  STREAK_CELEBRATION: 'streakCelebrations',
  GOAL_ACHIEVED: 'goalAchieved',
};

/**
 * Send a single push notification
 * @param {string} expoPushToken - The Expo push token
 * @param {object} notification - The notification content
 * @returns {Promise<object>} - The response from Expo
 */
export async function sendPushNotification(expoPushToken, notification) {
  if (!expoPushToken || !notification) {
    console.error('[PushService] Missing token or notification');
    return { success: false, error: 'Missing token or notification' };
  }

  // Validate Expo push token format
  if (!expoPushToken.startsWith('ExponentPushToken[') && !expoPushToken.startsWith('ExpoPushToken[')) {
    console.error('[PushService] Invalid push token format:', expoPushToken);
    return { success: false, error: 'Invalid push token format' };
  }

  const message = {
    to: expoPushToken,
    sound: notification.sound ?? 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data ?? {},
    priority: notification.priority ?? 'high',
    channelId: notification.channelId ?? 'default',
    badge: notification.badge,
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data?.status === 'error') {
      console.error('[PushService] Push error:', result.data.message);
      return { success: false, error: result.data.message };
    }

    console.log('[PushService] Push sent successfully to:', expoPushToken.substring(0, 30) + '...');
    return { success: true, ticketId: result.data?.id };
  } catch (error) {
    console.error('[PushService] Failed to send push:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notifications in batch (up to 100 at a time)
 * @param {Array<{token: string, notification: object}>} messages
 * @returns {Promise<object>} - Results summary
 */
export async function sendBatchPushNotifications(messages) {
  if (!messages || messages.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  // Expo allows max 100 notifications per request
  const BATCH_SIZE = 100;
  let sent = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    const formattedMessages = batch.map(({ token, notification }) => ({
      to: token,
      sound: notification.sound ?? 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data ?? {},
      priority: notification.priority ?? 'high',
      channelId: notification.channelId ?? 'default',
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedMessages),
      });

      const result = await response.json();

      if (result.data) {
        result.data.forEach((item, index) => {
          if (item.status === 'ok') {
            sent++;
          } else {
            failed++;
            errors.push({
              token: batch[index]?.token?.substring(0, 30),
              error: item.message,
            });
          }
        });
      }
    } catch (error) {
      console.error('[PushService] Batch send error:', error);
      failed += batch.length;
    }
  }

  console.log(`[PushService] Batch complete: ${sent} sent, ${failed} failed`);
  return { success: true, sent, failed, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Send a notification to a user if they have the preference enabled
 * @param {object} db - Database instance
 * @param {string} userId - The user ID
 * @param {string} notificationType - The type from NOTIFICATION_TYPES
 * @param {object} notification - The notification content
 */
export async function sendUserNotification(db, userId, notificationType, notification) {
  try {
    // Get user's push token and notification preferences
    const [settings] = await db
      .select({
        expoPushToken: accountSettingsTable.expoPushToken,
        notifications: accountSettingsTable.notifications,
      })
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId));

    if (!settings?.expoPushToken) {
      console.log(`[PushService] User ${userId} has no push token`);
      return { success: false, reason: 'no_token' };
    }

    // Check if user has this notification type enabled
    const preferences = settings.notifications || {};
    const isEnabled = preferences[notificationType] !== false; // Default to true

    if (!isEnabled) {
      console.log(`[PushService] User ${userId} has ${notificationType} disabled`);
      return { success: false, reason: 'preference_disabled' };
    }

    // Send the notification
    const result = await sendPushNotification(settings.expoPushToken, notification);
    return result;
  } catch (error) {
    console.error(`[PushService] Error sending to user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a notification to all users with a specific preference enabled
 * @param {object} db - Database instance
 * @param {string} notificationType - The type from NOTIFICATION_TYPES
 * @param {object} notification - The notification content
 */
export async function sendBroadcastNotification(db, notificationType, notification) {
  try {
    // Get all users with push tokens
    const users = await db
      .select({
        userId: accountSettingsTable.userId,
        expoPushToken: accountSettingsTable.expoPushToken,
        notifications: accountSettingsTable.notifications,
      })
      .from(accountSettingsTable)
      .where(isNotNull(accountSettingsTable.expoPushToken));

    // Filter users who have this notification type enabled
    const eligibleUsers = users.filter((user) => {
      const preferences = user.notifications || {};
      return preferences[notificationType] !== false;
    });

    if (eligibleUsers.length === 0) {
      console.log(`[PushService] No eligible users for ${notificationType}`);
      return { success: true, sent: 0, total: users.length };
    }

    // Prepare batch messages
    const messages = eligibleUsers.map((user) => ({
      token: user.expoPushToken,
      notification,
    }));

    const result = await sendBatchPushNotifications(messages);
    console.log(`[PushService] Broadcast ${notificationType}: ${result.sent}/${eligibleUsers.length} sent`);

    return {
      ...result,
      eligible: eligibleUsers.length,
      total: users.length,
    };
  } catch (error) {
    console.error(`[PushService] Broadcast error for ${notificationType}:`, error);
    return { success: false, error: error.message };
  }
}

// ============== Pre-built Notification Templates ==============

/**
 * Send a daily check-in reminder
 */
export async function sendDailyReminderNotification(db, userId) {
  return sendUserNotification(db, userId, NOTIFICATION_TYPES.DAILY_REMINDER, {
    title: 'Time to log your day!',
    body: 'Track your meals and mood to keep your streak going.',
    data: { type: 'daily_reminder', screen: 'home' },
    channelId: 'reminders',
  });
}

/**
 * Send a hydration nudge
 */
export async function sendHydrationNudge(db, userId, currentIntake, goal) {
  const remaining = Math.max(0, goal - currentIntake);
  return sendUserNotification(db, userId, NOTIFICATION_TYPES.HYDRATION_NUDGE, {
    title: 'Stay hydrated!',
    body: `You've had ${currentIntake.toFixed(1)}L today. ${remaining.toFixed(1)}L more to reach your goal.`,
    data: { type: 'hydration_nudge', screen: 'water' },
    channelId: 'hydration',
  });
}

/**
 * Send a streak celebration
 */
export async function sendStreakCelebration(db, userId, streakDays) {
  const messages = {
    7: 'One week strong! Keep it up!',
    14: 'Two weeks of consistency! Amazing progress!',
    30: 'One month milestone! You\'re crushing it!',
    50: '50 days! You\'re on fire!',
    100: '100 days! Legendary dedication!',
  };

  const body = messages[streakDays] || `${streakDays} day streak! Keep going!`;

  return sendUserNotification(db, userId, NOTIFICATION_TYPES.STREAK_CELEBRATION, {
    title: `🔥 ${streakDays} Day Streak!`,
    body,
    data: { type: 'streak_celebration', streakDays, screen: 'profile' },
    channelId: 'insights',
  });
}

/**
 * Send an insight drop notification
 */
export async function sendInsightNotification(db, userId, insight) {
  return sendUserNotification(db, userId, NOTIFICATION_TYPES.INSIGHT_DROP, {
    title: '💡 New Insight',
    body: insight,
    data: { type: 'insight_drop', screen: 'insights' },
    channelId: 'insights',
  });
}

/**
 * Send a goal achievement notification
 */
export async function sendGoalAchievedNotification(db, userId, goalType, value) {
  const goalMessages = {
    calories: `You hit your calorie goal of ${value} today!`,
    protein: `Protein goal reached: ${value}g!`,
    water: `Hydration goal complete: ${value}L!`,
    streak: `New streak milestone: ${value} days!`,
  };

  return sendUserNotification(db, userId, NOTIFICATION_TYPES.GOAL_ACHIEVED, {
    title: '🎉 Goal Achieved!',
    body: goalMessages[goalType] || `You reached your ${goalType} goal!`,
    data: { type: 'goal_achieved', goalType, value, screen: 'home' },
    channelId: 'insights',
  });
}

export default {
  sendPushNotification,
  sendBatchPushNotifications,
  sendUserNotification,
  sendBroadcastNotification,
  sendDailyReminderNotification,
  sendHydrationNudge,
  sendStreakCelebration,
  sendInsightNotification,
  sendGoalAchievedNotification,
  NOTIFICATION_TYPES,
};
