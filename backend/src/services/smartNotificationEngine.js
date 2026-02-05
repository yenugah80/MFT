/**
 * Smart Notification Engine (Backend) - Staff-Level Production System
 *
 * Server-side notification intelligence that complements mobile engine.
 *
 * Features:
 * - Optimal send time prediction using historical engagement data
 * - Notification fatigue prevention with DB persistence
 * - Personalized content with user context
 * - Deep link generation
 * - Engagement tracking & optimization
 * - Multi-channel delivery coordination (Push, In-App, Email)
 * - A/B testing integration for notification variants
 */

import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import NodeCache from 'node-cache';
import Expo from 'expo-server-sdk';

// Caches for notification optimization
const userEngagementCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
const sendTimeCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });
const fatigueCache = new NodeCache({ stdTTL: 86400, checkperiod: 600 });

// Expo SDK for push notifications
const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

// ============================================================================
// NOTIFICATION TYPES & PRIORITIES
// ============================================================================

export const NotificationTypes = {
  // Transactional (High Priority - Always Send)
  STREAK_AT_RISK: 'streak_at_risk',
  STREAK_BROKEN: 'streak_broken',
  STREAK_SAVED: 'streak_saved',
  GOAL_ACHIEVED: 'goal_achieved',
  LEVEL_UP: 'level_up',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',

  // Engagement (Medium Priority - Smart Timing)
  DAILY_REMINDER: 'daily_reminder',
  MEAL_REMINDER: 'meal_reminder',
  HYDRATION_NUDGE: 'hydration_nudge',
  MOOD_CHECK_IN: 'mood_check_in',

  // Insights (Low Priority - Batch Friendly)
  WEEKLY_SUMMARY: 'weekly_summary',
  INSIGHT_READY: 'insight_ready',
  RECOMMENDATION: 'recommendation',
  CORRELATION_DISCOVERED: 'correlation_discovered',

  // Re-engagement (Context Dependent)
  COME_BACK: 'come_back',
  MISSED_YOU: 'missed_you',
  NEW_FEATURE: 'new_feature',
};

export const NotificationPriority = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

export const NotificationChannels = {
  PUSH: 'push',
  IN_APP: 'in_app',
  EMAIL: 'email',
};

// Priority mapping
const TYPE_PRIORITIES = {
  [NotificationTypes.STREAK_AT_RISK]: NotificationPriority.CRITICAL,
  [NotificationTypes.STREAK_BROKEN]: NotificationPriority.HIGH,
  [NotificationTypes.STREAK_SAVED]: NotificationPriority.HIGH,
  [NotificationTypes.GOAL_ACHIEVED]: NotificationPriority.HIGH,
  [NotificationTypes.LEVEL_UP]: NotificationPriority.HIGH,
  [NotificationTypes.ACHIEVEMENT_UNLOCKED]: NotificationPriority.HIGH,
  [NotificationTypes.DAILY_REMINDER]: NotificationPriority.MEDIUM,
  [NotificationTypes.MEAL_REMINDER]: NotificationPriority.MEDIUM,
  [NotificationTypes.HYDRATION_NUDGE]: NotificationPriority.MEDIUM,
  [NotificationTypes.MOOD_CHECK_IN]: NotificationPriority.MEDIUM,
  [NotificationTypes.WEEKLY_SUMMARY]: NotificationPriority.LOW,
  [NotificationTypes.INSIGHT_READY]: NotificationPriority.LOW,
  [NotificationTypes.RECOMMENDATION]: NotificationPriority.LOW,
  [NotificationTypes.CORRELATION_DISCOVERED]: NotificationPriority.LOW,
  [NotificationTypes.COME_BACK]: NotificationPriority.MEDIUM,
  [NotificationTypes.MISSED_YOU]: NotificationPriority.LOW,
  [NotificationTypes.NEW_FEATURE]: NotificationPriority.LOW,
};

// ============================================================================
// OPTIMAL SEND TIME PREDICTION
// ============================================================================

/**
 * Predict optimal send time for a user based on historical engagement
 */
export async function predictOptimalSendTime(userId, notificationType) {
  const cacheKey = `optimal_time:${userId}:${notificationType}`;
  const cached = sendTimeCache.get(cacheKey);
  if (cached) return cached;

  try {
    // Get historical notification engagement
    const engagementData = await db.execute(sql`
      SELECT
        EXTRACT(HOUR FROM clicked_at) as hour,
        COUNT(*) as clicks,
        AVG(EXTRACT(EPOCH FROM (clicked_at - created_at))) as avg_response_seconds
      FROM notification_delivery_log
      WHERE user_id = ${userId}
        AND clicked_at IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM clicked_at)
      ORDER BY clicks DESC
    `);

    // Get app activity patterns as fallback
    const activityData = await db.execute(sql`
      SELECT
        EXTRACT(HOUR FROM timestamp) as hour,
        COUNT(*) as actions
      FROM analytics_events
      WHERE user_id = ${userId}
        AND timestamp > NOW() - INTERVAL '30 days'
        AND event_name IN ('food_logged', 'water_logged', 'mood_logged', 'app_opened')
      GROUP BY EXTRACT(HOUR FROM timestamp)
      ORDER BY actions DESC
    `);

    // Default times by notification type
    const defaultTimes = {
      [NotificationTypes.DAILY_REMINDER]: 8,
      [NotificationTypes.MEAL_REMINDER]: 12,
      [NotificationTypes.HYDRATION_NUDGE]: 14,
      [NotificationTypes.MOOD_CHECK_IN]: 20,
      [NotificationTypes.WEEKLY_SUMMARY]: 10,
      [NotificationTypes.STREAK_AT_RISK]: 20,
    };

    let optimalHour = defaultTimes[notificationType] || 10;
    let confidence = 0.3;
    let method = 'default';

    // Use engagement data if sufficient
    if (engagementData.rows.length >= 3) {
      optimalHour = parseInt(engagementData.rows[0].hour);
      confidence = Math.min(engagementData.rows[0].clicks / 20, 0.9);
      method = 'engagement';
    } else if (activityData.rows.length >= 3) {
      optimalHour = parseInt(activityData.rows[0].hour);
      confidence = Math.min(activityData.rows[0].actions / 50, 0.7);
      method = 'activity';
    }

    // Get timezone
    const timezoneResult = await db.execute(sql`
      SELECT timezone_offset FROM gamification WHERE user_id = ${userId}
    `);
    const timezoneOffset = timezoneResult.rows[0]?.timezone_offset || 0;

    const result = {
      optimalHour,
      optimalMinute: 0,
      confidence,
      method,
      timezoneOffset,
      calculatedAt: new Date().toISOString(),
    };

    sendTimeCache.set(cacheKey, result, 86400);
    return result;
  } catch (error) {
    console.error('[SmartNotification] Error predicting send time:', error.message);
    return { optimalHour: 10, optimalMinute: 0, confidence: 0.1, method: 'fallback' };
  }
}

/**
 * Check if current time is optimal for sending
 */
export async function isOptimalTimeToSend(userId, notificationType) {
  const optimal = await predictOptimalSendTime(userId, notificationType);
  const now = new Date();
  const userHour = (now.getUTCHours() + Math.floor(optimal.timezoneOffset / 60) + 24) % 24;

  // Quiet hours: 10 PM - 7 AM
  if (userHour >= 22 || userHour < 7) {
    return { optimal: false, reason: 'quiet_hours', nextOptimalHour: 8 };
  }

  // Check if within 2 hours of optimal
  const hourDiff = Math.abs(userHour - optimal.optimalHour);
  const isNearOptimal = hourDiff <= 2 || hourDiff >= 22;

  return {
    optimal: isNearOptimal,
    reason: isNearOptimal ? 'near_optimal' : 'suboptimal_time',
    currentHour: userHour,
    optimalHour: optimal.optimalHour,
    confidence: optimal.confidence,
  };
}

// ============================================================================
// FATIGUE PREVENTION
// ============================================================================

/**
 * Check notification fatigue using persistent tracking
 */
export async function checkNotificationFatigue(userId, notificationType) {
  const cacheKey = `fatigue:${userId}`;
  let fatigueState = fatigueCache.get(cacheKey);

  if (!fatigueState) {
    // Load from database
    const result = await db.execute(sql`
      SELECT
        notification_type,
        COUNT(*) as sent_count,
        SUM(CASE WHEN delivery_status = 'clicked' THEN 1 ELSE 0 END) as clicked_count,
        MAX(created_at) as last_sent
      FROM notification_delivery_log
      WHERE user_id = ${userId}
        AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY notification_type
    `);

    fatigueState = {
      totalSent24h: 0,
      totalClicked24h: 0,
      byType: {},
      lastUpdated: Date.now(),
    };

    for (const row of result.rows) {
      const sent = parseInt(row.sent_count);
      const clicked = parseInt(row.clicked_count);
      fatigueState.totalSent24h += sent;
      fatigueState.totalClicked24h += clicked;
      fatigueState.byType[row.notification_type] = {
        sent,
        clicked,
        lastSent: row.last_sent,
      };
    }

    fatigueCache.set(cacheKey, fatigueState, 3600);
  }

  // Fatigue rules
  const rules = {
    maxNotifications24h: 8,
    minClickRate: 0.1,
    maxPerType24h: {
      [NotificationTypes.HYDRATION_NUDGE]: 3,
      [NotificationTypes.MEAL_REMINDER]: 3,
      [NotificationTypes.RECOMMENDATION]: 2,
      default: 2,
    },
    minGapMinutes: {
      [NotificationTypes.HYDRATION_NUDGE]: 180,
      [NotificationTypes.RECOMMENDATION]: 240,
      default: 60,
    },
  };

  // Check global limit
  if (fatigueState.totalSent24h >= rules.maxNotifications24h) {
    return { fatigued: true, reason: 'global_limit_reached', limit: rules.maxNotifications24h };
  }

  // Check click rate for fatigue signs
  const clickRate = fatigueState.totalSent24h > 0
    ? fatigueState.totalClicked24h / fatigueState.totalSent24h
    : 1;

  if (fatigueState.totalSent24h >= 4 && clickRate < rules.minClickRate) {
    return { fatigued: true, reason: 'low_engagement', clickRate };
  }

  // Check per-type limits
  const typeState = fatigueState.byType[notificationType];
  const typeLimit = rules.maxPerType24h[notificationType] || rules.maxPerType24h.default;

  if (typeState && typeState.sent >= typeLimit) {
    return { fatigued: true, reason: 'type_limit_reached', type: notificationType, limit: typeLimit };
  }

  // Check minimum gap
  if (typeState?.lastSent) {
    const gapMinutes = (Date.now() - new Date(typeState.lastSent).getTime()) / 60000;
    const minGap = rules.minGapMinutes[notificationType] || rules.minGapMinutes.default;

    if (gapMinutes < minGap) {
      return { fatigued: true, reason: 'too_soon', minutesRemaining: Math.ceil(minGap - gapMinutes) };
    }
  }

  return { fatigued: false, currentSent: fatigueState.totalSent24h };
}

/**
 * Update fatigue state after sending
 */
function updateFatigueState(userId, notificationType) {
  const cacheKey = `fatigue:${userId}`;
  const fatigueState = fatigueCache.get(cacheKey) || {
    totalSent24h: 0,
    totalClicked24h: 0,
    byType: {},
    lastUpdated: Date.now(),
  };

  fatigueState.totalSent24h++;
  fatigueState.byType[notificationType] = fatigueState.byType[notificationType] || { sent: 0, clicked: 0 };
  fatigueState.byType[notificationType].sent++;
  fatigueState.byType[notificationType].lastSent = new Date().toISOString();

  fatigueCache.set(cacheKey, fatigueState, 3600);
}

// ============================================================================
// PERSONALIZED CONTENT GENERATION
// ============================================================================

/**
 * Generate personalized notification content
 */
export async function generatePersonalizedContent(userId, notificationType, data = {}) {
  const context = await getUserNotificationContext(userId);

  const templates = {
    [NotificationTypes.STREAK_AT_RISK]: () => ({
      title: `${context.streak} day streak at risk!`,
      body: context.name
        ? `${context.name}, log something today to keep it going!`
        : `Don't lose your ${context.streak} day streak - log something now!`,
      emoji: '',
    }),

    [NotificationTypes.STREAK_SAVED]: () => ({
      title: 'Streak saved!',
      body: context.name
        ? `Phew ${context.name}! Your streak freeze kicked in. ${context.streak} days safe.`
        : `Your streak freeze saved your ${context.streak} day streak!`,
      emoji: '',
    }),

    [NotificationTypes.GOAL_ACHIEVED]: () => ({
      title: data.goalType === 'calories' ? 'Calorie goal smashed!' : `${data.goalType} goal achieved!`,
      body: context.name
        ? `Amazing work, ${context.name}! You hit your ${data.goalType} goal today.`
        : `You hit your ${data.goalType} goal today. Keep it up!`,
      emoji: '',
    }),

    [NotificationTypes.LEVEL_UP]: () => ({
      title: `Level ${data.newLevel} unlocked!`,
      body: getLevelUpMessage(data.newLevel, context.name),
      emoji: '',
    }),

    [NotificationTypes.ACHIEVEMENT_UNLOCKED]: () => ({
      title: `Achievement unlocked: ${data.achievementName}!`,
      body: data.xpReward
        ? `+${data.xpReward} XP earned. ${context.name ? `Nice one, ${context.name}!` : 'Nice one!'}`
        : `${context.name ? `Congrats, ${context.name}!` : 'Congrats!'} Keep crushing it.`,
      emoji: data.emoji || '',
    }),

    [NotificationTypes.DAILY_REMINDER]: () => {
      const greeting = getTimeBasedGreeting(context.timezoneOffset);
      return {
        title: `${greeting.greeting}${context.name ? `, ${context.name}` : ''}!`,
        body: getContextualReminderBody(context),
        emoji: greeting.emoji,
      };
    },

    [NotificationTypes.HYDRATION_NUDGE]: () => ({
      title: 'Time for water!',
      body: context.hydrationPercent < 50
        ? `You're at ${context.hydrationPercent}% of your water goal. Have a glass!`
        : `${100 - context.hydrationPercent}% left to hit your hydration goal.`,
      emoji: '',
    }),

    [NotificationTypes.WEEKLY_SUMMARY]: () => ({
      title: 'Your week in review',
      body: generateWeeklySummaryBody(data.stats, context.name),
      emoji: '',
    }),

    [NotificationTypes.INSIGHT_READY]: () => ({
      title: 'New insight discovered!',
      body: data.insightPreview || 'We found something interesting about your patterns.',
      emoji: '',
    }),

    [NotificationTypes.COME_BACK]: () => ({
      title: context.name ? `We miss you, ${context.name}!` : 'We miss you!',
      body: getComeBackMessage(context.daysSinceActive),
      emoji: '',
    }),
  };

  const generator = templates[notificationType];
  if (generator) {
    return generator();
  }

  // Default content
  return {
    title: data.title || 'Update from MyFoodTracker',
    body: data.body || 'Check out what\'s new!',
    emoji: '',
  };
}

/**
 * Get user context for personalization
 */
async function getUserNotificationContext(userId) {
  const cacheKey = `user_notif_context:${userId}`;
  const cached = userEngagementCache.get(cacheKey);
  if (cached) return cached;

  try {
    const result = await db.execute(sql`
      SELECT
        p.full_name,
        g.streak,
        g.level,
        g.timezone_offset,
        (
          SELECT COALESCE(SUM(amount_liters), 0) * 1000
          FROM water_log
          WHERE user_id = ${userId}
            AND logged_date::date = CURRENT_DATE
        ) as water_today_ml,
        (
          SELECT water_liters * 1000
          FROM nutrition_goals
          WHERE user_id = ${userId}
        ) as water_goal_ml,
        (
          SELECT MAX(created_at)
          FROM food_log
          WHERE user_id = ${userId}
        ) as last_food_log
      FROM profiles p
      LEFT JOIN gamification g ON g.user_id = p.user_id
      WHERE p.user_id = ${userId}
    `);

    if (result.rows.length === 0) {
      return { name: null, streak: 0, level: 1 };
    }

    const row = result.rows[0];
    const context = {
      name: row.full_name?.split(' ')[0] || null,
      streak: row.streak || 0,
      level: row.level || 1,
      timezoneOffset: row.timezone_offset || 0,
      hydrationPercent: row.water_goal_ml > 0
        ? Math.round((row.water_today_ml / row.water_goal_ml) * 100)
        : 0,
      daysSinceActive: row.last_food_log
        ? Math.floor((Date.now() - new Date(row.last_food_log).getTime()) / 86400000)
        : null,
    };

    userEngagementCache.set(cacheKey, context, 1800);
    return context;
  } catch (error) {
    console.error('[SmartNotification] Error getting user context:', error.message);
    return { name: null, streak: 0, level: 1 };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getTimeBasedGreeting(timezoneOffset) {
  const now = new Date();
  const userHour = (now.getUTCHours() + Math.floor(timezoneOffset / 60) + 24) % 24;

  if (userHour >= 5 && userHour < 12) return { greeting: 'Good morning', emoji: '' };
  if (userHour >= 12 && userHour < 17) return { greeting: 'Good afternoon', emoji: '' };
  if (userHour >= 17 && userHour < 21) return { greeting: 'Good evening', emoji: '' };
  return { greeting: 'Hi there', emoji: '' };
}

function getContextualReminderBody(context) {
  if (context.streak > 0) {
    return `Day ${context.streak + 1} awaits! Log your first meal to keep the streak.`;
  }
  return 'Ready to start tracking? Log your first meal of the day!';
}

function getLevelUpMessage(level, name) {
  const messages = [
    `${name ? name + ', you\'re' : 'You\'re'} on fire! Level ${level} achieved.`,
    `New level unlocked! ${name ? 'Keep crushing it, ' + name : 'Keep crushing it'}!`,
    `Level ${level}! Your consistency is paying off.`,
  ];
  return messages[level % messages.length];
}

function getComeBackMessage(daysSinceActive) {
  if (daysSinceActive === null) return 'Your health journey awaits!';
  if (daysSinceActive <= 3) {
    return 'It\'s been a few days. Ready to pick up where you left off?';
  }
  if (daysSinceActive <= 7) {
    return 'We\'ve got some new features to show you. Come check them out!';
  }
  return 'Your health journey is waiting. Let\'s get back on track together!';
}

function generateWeeklySummaryBody(stats, name) {
  const greeting = name ? `${name}, ` : '';
  if (!stats) return `${greeting}check out your weekly progress!`;

  const highlights = [];
  if (stats.mealsLogged > 0) highlights.push(`${stats.mealsLogged} meals logged`);
  if (stats.streakDays > 0) highlights.push(`${stats.streakDays} day streak`);
  if (stats.goalsHit > 0) highlights.push(`${stats.goalsHit} goals achieved`);

  return `${greeting}${highlights.join(', ')} this week!`;
}

// ============================================================================
// DEEP LINK GENERATION
// ============================================================================

function buildDeepLink(notificationType, data = {}) {
  const deepLinks = {
    [NotificationTypes.STREAK_AT_RISK]: '/(tabs)/log',
    [NotificationTypes.STREAK_SAVED]: '/achievements',
    [NotificationTypes.GOAL_ACHIEVED]: '/(tabs)/dashboard',
    [NotificationTypes.LEVEL_UP]: '/achievements',
    [NotificationTypes.ACHIEVEMENT_UNLOCKED]: '/achievements',
    [NotificationTypes.DAILY_REMINDER]: '/(tabs)/log',
    [NotificationTypes.HYDRATION_NUDGE]: '/(tabs)/log?section=water',
    [NotificationTypes.MOOD_CHECK_IN]: '/(tabs)/log?section=mood',
    [NotificationTypes.WEEKLY_SUMMARY]: '/analytics',
    [NotificationTypes.INSIGHT_READY]: '/insights',
    [NotificationTypes.RECOMMENDATION]: '/(tabs)/log',
    [NotificationTypes.COME_BACK]: '/(tabs)/dashboard',
  };

  return deepLinks[notificationType] || '/(tabs)/dashboard';
}

// ============================================================================
// MAIN SEND FUNCTION
// ============================================================================

/**
 * Smart send notification with all optimizations
 */
export async function smartSendNotification(userId, notificationType, data = {}, options = {}) {
  const { force = false, channel = NotificationChannels.PUSH, scheduleIfSuboptimal = false } = options;
  const priority = TYPE_PRIORITIES[notificationType] || NotificationPriority.MEDIUM;

  try {
    // Step 1: Check user preferences
    const preferencesResult = await db.execute(sql`
      SELECT notifications FROM account_settings WHERE user_id = ${userId}
    `);

    const preferences = preferencesResult.rows[0]?.notifications || {};
    if (preferences[notificationType] === false && priority > NotificationPriority.HIGH) {
      return { sent: false, reason: 'user_disabled', type: notificationType };
    }

    // Step 2: Check fatigue (skip for critical)
    if (!force && priority > NotificationPriority.CRITICAL) {
      const fatigue = await checkNotificationFatigue(userId, notificationType);
      if (fatigue.fatigued) {
        return { sent: false, reason: 'fatigued', details: fatigue };
      }
    }

    // Step 3: Check timing (skip for critical/high)
    if (!force && priority >= NotificationPriority.MEDIUM) {
      const timing = await isOptimalTimeToSend(userId, notificationType);
      if (!timing.optimal && !scheduleIfSuboptimal) {
        const optimal = await predictOptimalSendTime(userId, notificationType);
        return {
          sent: false,
          reason: 'suboptimal_time',
          scheduledFor: optimal.optimalHour,
          currentHour: timing.currentHour,
        };
      }
    }

    // Step 4: Generate personalized content
    const content = await generatePersonalizedContent(userId, notificationType, data);

    // Step 5: Build deep link
    const deepLink = buildDeepLink(notificationType, data);

    // Step 6: Send via appropriate channel
    let sendResult;
    if (channel === NotificationChannels.PUSH) {
      sendResult = await sendPushNotification(userId, content, deepLink, priority);
    } else if (channel === NotificationChannels.IN_APP) {
      sendResult = await createInAppNotification(userId, content, deepLink, notificationType);
    }

    // Step 7: Log delivery
    await logNotificationDelivery(userId, notificationType, content, channel, sendResult);

    // Step 8: Update fatigue state
    if (sendResult.success) {
      updateFatigueState(userId, notificationType);
    }

    return {
      sent: sendResult.success,
      notificationId: sendResult.notificationId,
      channel,
      content: { title: content.title },
    };
  } catch (error) {
    console.error('[SmartNotification] Send error:', error.message);
    return { sent: false, reason: 'error', error: error.message };
  }
}

/**
 * Send push notification via Expo
 */
async function sendPushNotification(userId, content, deepLink, priority) {
  // Get user's push token
  const tokenResult = await db.execute(sql`
    SELECT expo_push_token, fcm_token
    FROM account_settings
    WHERE user_id = ${userId}
  `);

  const tokens = tokenResult.rows[0];
  if (!tokens?.expo_push_token && !tokens?.fcm_token) {
    return { success: false, reason: 'no_push_token' };
  }

  const pushToken = tokens.expo_push_token || tokens.fcm_token;

  // Validate Expo push token
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn('[SmartNotification] Invalid Expo push token:', pushToken);
    return { success: false, reason: 'invalid_token' };
  }

  const message = {
    to: pushToken,
    title: content.title,
    body: content.body,
    data: { deepLink, type: content.type },
    priority: priority <= 2 ? 'high' : 'normal',
    sound: priority === NotificationPriority.CRITICAL ? 'default' : null,
    channelId: getChannelId(priority),
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    const ticket = tickets[0];
    if (ticket.status === 'ok') {
      return { success: true, notificationId: ticket.id };
    } else {
      console.error('[SmartNotification] Push failed:', ticket.message);
      return { success: false, reason: ticket.message };
    }
  } catch (error) {
    console.error('[SmartNotification] Push error:', error.message);
    return { success: false, reason: error.message };
  }
}

function getChannelId(priority) {
  if (priority === NotificationPriority.CRITICAL) return 'critical';
  if (priority <= NotificationPriority.HIGH) return 'important';
  return 'default';
}

/**
 * Create in-app notification
 */
async function createInAppNotification(userId, content, deepLink, notificationType) {
  await db.execute(sql`
    INSERT INTO user_notifications (user_id, type, title, message, read, created_at)
    VALUES (${userId}, ${notificationType}, ${content.title}, ${content.body}, false, NOW())
  `);

  return { success: true, notificationId: `inapp_${Date.now()}` };
}

/**
 * Log notification delivery
 */
async function logNotificationDelivery(userId, notificationType, content, channel, result) {
  try {
    await db.execute(sql`
      INSERT INTO notification_delivery_log (
        user_id, notification_type, title, body, channel, priority,
        delivery_status, error_message, created_at
      ) VALUES (
        ${userId}, ${notificationType}, ${content.title}, ${content.body},
        ${channel}, ${TYPE_PRIORITIES[notificationType] || 3},
        ${result.success ? 'sent' : 'failed'},
        ${result.reason || null}, NOW()
      )
    `);
  } catch (error) {
    console.error('[SmartNotification] Error logging delivery:', error.message);
  }
}

// ============================================================================
// ANALYTICS & ENGAGEMENT TRACKING
// ============================================================================

/**
 * Record notification click
 */
export async function recordNotificationClick(userId, notificationId, screenNavigated = null) {
  try {
    await db.execute(sql`
      UPDATE notification_delivery_log
      SET
        delivery_status = 'clicked',
        clicked_at = NOW(),
        screen_navigated = ${screenNavigated}
      WHERE user_id = ${userId}
        AND id = ${parseInt(notificationId.replace(/\D/g, ''))}
    `);

    // Update fatigue cache
    const cacheKey = `fatigue:${userId}`;
    const fatigueState = fatigueCache.get(cacheKey);
    if (fatigueState && fatigueState.totalSent24h > 0) {
      fatigueState.totalClicked24h++;
      fatigueCache.set(cacheKey, fatigueState, 3600);
    }

    return { success: true };
  } catch (error) {
    console.error('[SmartNotification] Error recording click:', error.message);
    return { success: false };
  }
}

/**
 * Get notification analytics for a user
 */
export async function getNotificationAnalytics(userId, days = 30) {
  const result = await db.execute(sql`
    SELECT
      notification_type,
      COUNT(*) as sent,
      SUM(CASE WHEN delivery_status = 'clicked' THEN 1 ELSE 0 END) as clicked,
      AVG(EXTRACT(EPOCH FROM (clicked_at - created_at))) as avg_response_seconds,
      COUNT(DISTINCT DATE(created_at)) as active_days
    FROM notification_delivery_log
    WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '1 day' * ${days}
    GROUP BY notification_type
    ORDER BY sent DESC
  `);

  const summary = await db.execute(sql`
    SELECT
      COUNT(*) as total_sent,
      SUM(CASE WHEN delivery_status = 'clicked' THEN 1 ELSE 0 END) as total_clicked,
      AVG(EXTRACT(EPOCH FROM (clicked_at - created_at))) as avg_response_time
    FROM notification_delivery_log
    WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '1 day' * ${days}
  `);

  return {
    userId,
    periodDays: days,
    summary: {
      totalSent: parseInt(summary.rows[0]?.total_sent || 0),
      totalClicked: parseInt(summary.rows[0]?.total_clicked || 0),
      clickRate: summary.rows[0]?.total_sent > 0
        ? ((summary.rows[0].total_clicked / summary.rows[0].total_sent) * 100).toFixed(1) + '%'
        : '0%',
      avgResponseSeconds: Math.round(summary.rows[0]?.avg_response_time || 0),
    },
    byType: result.rows.map(row => ({
      type: row.notification_type,
      sent: parseInt(row.sent),
      clicked: parseInt(row.clicked),
      clickRate: ((row.clicked / row.sent) * 100).toFixed(1) + '%',
      avgResponseSeconds: Math.round(row.avg_response_seconds || 0),
    })),
  };
}

/**
 * Get global notification performance metrics
 */
export async function getGlobalNotificationMetrics(days = 7) {
  const result = await db.execute(sql`
    SELECT
      DATE(created_at) as date,
      notification_type,
      COUNT(*) as sent,
      SUM(CASE WHEN delivery_status = 'clicked' THEN 1 ELSE 0 END) as clicked,
      SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM notification_delivery_log
    WHERE created_at > NOW() - INTERVAL '1 day' * ${days}
    GROUP BY DATE(created_at), notification_type
    ORDER BY date DESC, sent DESC
  `);

  return {
    periodDays: days,
    dailyMetrics: result.rows,
  };
}

export default {
  smartSendNotification,
  predictOptimalSendTime,
  isOptimalTimeToSend,
  checkNotificationFatigue,
  generatePersonalizedContent,
  recordNotificationClick,
  getNotificationAnalytics,
  getGlobalNotificationMetrics,
  NotificationTypes,
  NotificationPriority,
  NotificationChannels,
};
