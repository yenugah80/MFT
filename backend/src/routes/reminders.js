/**
 * Smart Reminder API Routes
 *
 * Production-grade endpoints for intelligent notification scheduling and management.
 * Now with full persistence for snooze, dismiss, and delivery tracking.
 *
 * ENDPOINTS:
 * - GET /reminders/now - Get reminders due right now (filters snoozed)
 * - GET /reminders/schedule - Get scheduled reminders for next 24h
 * - GET /reminders/patterns - Get user's learned patterns
 * - GET /reminders/preferences - Get notification preferences
 * - PUT /reminders/preferences - Update notification preferences
 * - POST /reminders/dismiss - Dismiss a reminder (persisted)
 * - POST /reminders/snooze - Snooze a reminder (persisted)
 * - GET /reminders/snoozes - Get active snoozes
 * - DELETE /reminders/snooze/:type - Clear a snooze
 * - GET /reminders/history - Get notification delivery history
 * - GET /reminders/analytics - Get notification analytics
 * - POST /reminders/clicked - Track notification click
 * - GET /reminders/types - Get all available reminder types
 *
 * @module RemindersRoutes
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../config/db.js';
import {
  accountSettingsTable,
  notificationSnoozesTable,
  notificationDismissalsTable,
  notificationDeliveryLogTable,
} from '../db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import {
  getSmartReminders,
  scheduleUserReminders,
  learnUserPatterns,
  REMINDER_TYPES,
  FREQUENCY_LIMITS,
} from '../services/smartReminderService.js';

const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get active snoozes for a user
 */
async function getActiveSnoozes(userId) {
  const now = new Date();
  const snoozes = await db
    .select()
    .from(notificationSnoozesTable)
    .where(
      and(
        eq(notificationSnoozesTable.userId, userId),
        gte(notificationSnoozesTable.snoozedUntil, now)
      )
    );

  return snoozes.reduce((acc, s) => {
    acc[s.reminderType] = s.snoozedUntil;
    return acc;
  }, {});
}

/**
 * Check if a reminder type is snoozed
 */
async function isReminderSnoozed(userId, reminderType) {
  const now = new Date();
  const [snooze] = await db
    .select()
    .from(notificationSnoozesTable)
    .where(
      and(
        eq(notificationSnoozesTable.userId, userId),
        eq(notificationSnoozesTable.reminderType, reminderType),
        gte(notificationSnoozesTable.snoozedUntil, now)
      )
    )
    .limit(1);

  return !!snooze;
}

/**
 * Log a notification delivery
 */
async function logNotificationDelivery(userId, notification, channel = 'api') {
  try {
    await db.insert(notificationDeliveryLogTable).values({
      userId,
      notificationType: notification.type,
      title: notification.title,
      body: notification.body,
      channel,
      priority: notification.priority || 3,
      deliveryStatus: 'sent',
    });
  } catch (error) {
    console.warn('[Reminders] Failed to log delivery:', error.message);
  }
}

// ============================================================================
// CORE REMINDER ENDPOINTS
// ============================================================================

/**
 * GET /api/reminders/now
 * Get reminders that should be shown right now (filters out snoozed)
 */
router.get('/now', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    // Get smart reminders
    const allReminders = await getSmartReminders(userId);

    // Get active snoozes
    const activeSnoozes = await getActiveSnoozes(userId);

    // Filter out snoozed reminders
    const reminders = allReminders.filter(r => !activeSnoozes[r.type]);

    res.json({
      success: true,
      userId,
      reminders,
      count: reminders.length,
      snoozedCount: allReminders.length - reminders.length,
      activeSnoozes,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Reminders API] Error getting current reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reminders',
      message: error.message,
    });
  }
});

/**
 * GET /api/reminders/schedule
 * Get scheduled reminders for the next 24 hours
 */
router.get('/schedule', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    const scheduled = await scheduleUserReminders(userId);
    const activeSnoozes = await getActiveSnoozes(userId);

    // Mark which scheduled reminders are currently snoozed
    const scheduledWithSnoozeStatus = scheduled.map(s => ({
      ...s,
      isSnoozed: !!activeSnoozes[s.type],
      snoozedUntil: activeSnoozes[s.type] || null,
    }));

    res.json({
      success: true,
      userId,
      scheduled: scheduledWithSnoozeStatus,
      count: scheduled.length,
      limits: FREQUENCY_LIMITS,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Reminders API] Error getting schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reminder schedule',
      message: error.message,
    });
  }
});

/**
 * GET /api/reminders/patterns
 * Get user's learned patterns for debugging/display
 */
router.get('/patterns', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const patterns = await learnUserPatterns(userId);

    res.json({
      success: true,
      ...patterns,
    });
  } catch (error) {
    console.error('[Reminders API] Error getting patterns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user patterns',
      message: error.message,
    });
  }
});

// ============================================================================
// PREFERENCES ENDPOINTS
// ============================================================================

/**
 * GET /api/reminders/preferences
 * Get notification preferences
 */
router.get('/preferences', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    const [settings] = await db
      .select()
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId))
      .limit(1);

    const notifications = settings?.notifications || {
      enabled: true,
      hydration: true,
      food: true,
      mood: true,
      activity: true,
      motivation: true,        // legacy key — kept for backwards compat
      streakProtection: true,  // granular: streak-at-risk alerts
      insightDrops: true,      // granular: insight/correlation discoveries
      streakCelebrations: true, // granular: daily streak milestones
      quietHours: { start: 22, end: 7 },
    };

    res.json({
      success: true,
      userId,
      preferences: notifications,
      availableTypes: Object.keys(REMINDER_TYPES),
    });
  } catch (error) {
    console.error('[Reminders API] Error getting preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification preferences',
      message: error.message,
    });
  }
});

/**
 * PUT /api/reminders/preferences
 * Update notification preferences
 */
router.put('/preferences', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const updates = req.body;

    // Validate input
    const allowedKeys = [
      'enabled', 'hydration', 'food', 'mood', 'activity',
      'motivation',          // legacy
      'streakProtection',    // granular
      'insightDrops',        // granular
      'streakCelebrations',  // granular
      'quietHours',
    ];
    const sanitizedUpdates = {};
    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    // Get existing settings
    const [existing] = await db
      .select()
      .from(accountSettingsTable)
      .where(eq(accountSettingsTable.userId, userId))
      .limit(1);

    const currentNotifications = existing?.notifications || {};
    const newNotifications = { ...currentNotifications, ...sanitizedUpdates };

    if (existing) {
      await db
        .update(accountSettingsTable)
        .set({
          notifications: newNotifications,
          updatedAt: new Date(),
        })
        .where(eq(accountSettingsTable.userId, userId));
    } else {
      await db
        .insert(accountSettingsTable)
        .values({
          userId,
          notifications: newNotifications,
        });
    }

    res.json({
      success: true,
      userId,
      preferences: newNotifications,
    });
  } catch (error) {
    console.error('[Reminders API] Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences',
      message: error.message,
    });
  }
});

// ============================================================================
// SNOOZE ENDPOINTS (WITH PERSISTENCE)
// ============================================================================

/**
 * POST /api/reminders/snooze
 * Snooze a reminder for a specified duration (persisted to database)
 */
router.post('/snooze', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { reminderType, snoozeDuration = 30 } = req.body; // duration in minutes

    if (!reminderType) {
      return res.status(400).json({
        success: false,
        error: 'reminderType is required',
      });
    }

    // Validate snooze duration (15 min to 24 hours)
    const duration = Math.max(15, Math.min(snoozeDuration, 1440));

    // Calculate snooze until time
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + duration);

    // Upsert snooze record
    await db
      .insert(notificationSnoozesTable)
      .values({
        userId,
        reminderType,
        snoozedUntil: snoozeUntil,
        snoozeCount: 1,
      })
      .onConflictDoUpdate({
        target: [notificationSnoozesTable.userId, notificationSnoozesTable.reminderType],
        set: {
          snoozedUntil: snoozeUntil,
          snoozeCount: sql`${notificationSnoozesTable.snoozeCount} + 1`,
          updatedAt: new Date(),
        },
      });

    console.log(`[Reminders] User ${userId} snoozed ${reminderType} until ${snoozeUntil.toISOString()}`);

    res.json({
      success: true,
      message: 'Reminder snoozed',
      reminderType,
      snoozeDuration: duration,
      snoozeUntil: snoozeUntil.toISOString(),
    });
  } catch (error) {
    console.error('[Reminders API] Error snoozing reminder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to snooze reminder',
      message: error.message,
    });
  }
});

/**
 * GET /api/reminders/snoozes
 * Get all active snoozes for the user
 */
router.get('/snoozes', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const now = new Date();

    const snoozes = await db
      .select()
      .from(notificationSnoozesTable)
      .where(
        and(
          eq(notificationSnoozesTable.userId, userId),
          gte(notificationSnoozesTable.snoozedUntil, now)
        )
      );

    res.json({
      success: true,
      userId,
      snoozes: snoozes.map(s => ({
        reminderType: s.reminderType,
        snoozedUntil: s.snoozedUntil,
        snoozeCount: s.snoozeCount,
      })),
      count: snoozes.length,
    });
  } catch (error) {
    console.error('[Reminders API] Error getting snoozes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get snoozes',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/reminders/snooze/:type
 * Clear a snooze for a specific reminder type
 */
router.delete('/snooze/:type', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { type } = req.params;

    await db
      .delete(notificationSnoozesTable)
      .where(
        and(
          eq(notificationSnoozesTable.userId, userId),
          eq(notificationSnoozesTable.reminderType, type)
        )
      );

    res.json({
      success: true,
      message: 'Snooze cleared',
      reminderType: type,
    });
  } catch (error) {
    console.error('[Reminders API] Error clearing snooze:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear snooze',
      message: error.message,
    });
  }
});

// ============================================================================
// DISMISS ENDPOINTS (WITH PERSISTENCE)
// ============================================================================

/**
 * POST /api/reminders/dismiss
 * Dismiss a reminder (persisted for ML learning)
 */
router.post('/dismiss', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { reminderType, reason } = req.body;

    if (!reminderType) {
      return res.status(400).json({
        success: false,
        error: 'reminderType is required',
      });
    }

    // Validate reason
    const validReasons = ['not_relevant', 'too_frequent', 'wrong_time', 'other'];
    const sanitizedReason = validReasons.includes(reason) ? reason : 'other';

    // Persist dismissal for ML training
    await db.insert(notificationDismissalsTable).values({
      userId,
      notificationType: reminderType,
      reason: sanitizedReason,
    });

    console.log(`[Reminders] User ${userId} dismissed ${reminderType}: ${sanitizedReason}`);

    res.json({
      success: true,
      message: 'Reminder dismissed',
      reminderType,
      reason: sanitizedReason,
    });
  } catch (error) {
    console.error('[Reminders API] Error dismissing reminder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to dismiss reminder',
      message: error.message,
    });
  }
});

// ============================================================================
// DELIVERY TRACKING ENDPOINTS
// ============================================================================

/**
 * POST /api/reminders/clicked
 * Track when a user clicks on a notification
 */
router.post('/clicked', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const { notificationId, notificationType, screenNavigated } = req.body;

    if (notificationId) {
      // Update existing delivery log entry
      await db
        .update(notificationDeliveryLogTable)
        .set({
          deliveryStatus: 'clicked',
          clickedAt: new Date(),
          screenNavigated,
        })
        .where(
          and(
            eq(notificationDeliveryLogTable.id, notificationId),
            eq(notificationDeliveryLogTable.userId, userId)
          )
        );
    } else if (notificationType) {
      // Log click event without specific notification ID
      await db.insert(notificationDeliveryLogTable).values({
        userId,
        notificationType,
        title: 'Click tracked',
        body: '',
        channel: 'click_tracking',
        deliveryStatus: 'clicked',
        clickedAt: new Date(),
        screenNavigated,
      });
    }

    res.json({
      success: true,
      message: 'Click tracked',
    });
  } catch (error) {
    console.error('[Reminders API] Error tracking click:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track click',
      message: error.message,
    });
  }
});

/**
 * GET /api/reminders/history
 * Get notification delivery history for the user
 */
router.get('/history', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const history = await db
      .select()
      .from(notificationDeliveryLogTable)
      .where(eq(notificationDeliveryLogTable.userId, userId))
      .orderBy(desc(notificationDeliveryLogTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      userId,
      history: history.map(h => ({
        id: h.id,
        type: h.notificationType,
        title: h.title,
        body: h.body,
        channel: h.channel,
        status: h.deliveryStatus,
        clickedAt: h.clickedAt,
        createdAt: h.createdAt,
      })),
      count: history.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Reminders API] Error getting history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification history',
      message: error.message,
    });
  }
});

/**
 * GET /api/reminders/analytics
 * Get notification analytics for the user
 */
router.get('/analytics', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get delivery stats by type
    const deliveryStats = await db
      .select({
        notificationType: notificationDeliveryLogTable.notificationType,
        total: sql`COUNT(*)::int`,
        clicked: sql`COUNT(*) FILTER (WHERE ${notificationDeliveryLogTable.deliveryStatus} = 'clicked')::int`,
      })
      .from(notificationDeliveryLogTable)
      .where(
        and(
          eq(notificationDeliveryLogTable.userId, userId),
          gte(notificationDeliveryLogTable.createdAt, since)
        )
      )
      .groupBy(notificationDeliveryLogTable.notificationType);

    // Get dismissal stats
    const dismissalStats = await db
      .select({
        notificationType: notificationDismissalsTable.notificationType,
        reason: notificationDismissalsTable.reason,
        count: sql`COUNT(*)::int`,
      })
      .from(notificationDismissalsTable)
      .where(
        and(
          eq(notificationDismissalsTable.userId, userId),
          gte(notificationDismissalsTable.dismissedAt, since)
        )
      )
      .groupBy(notificationDismissalsTable.notificationType, notificationDismissalsTable.reason);

    // Calculate engagement metrics
    const totalSent = deliveryStats.reduce((sum, d) => sum + d.total, 0);
    const totalClicked = deliveryStats.reduce((sum, d) => sum + d.clicked, 0);
    const totalDismissed = dismissalStats.reduce((sum, d) => sum + d.count, 0);

    res.json({
      success: true,
      userId,
      period: { days, since: since.toISOString() },
      summary: {
        totalSent,
        totalClicked,
        totalDismissed,
        clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : 0,
      },
      byType: deliveryStats.map(d => ({
        type: d.notificationType,
        sent: d.total,
        clicked: d.clicked,
        clickRate: d.total > 0 ? ((d.clicked / d.total) * 100).toFixed(1) : 0,
      })),
      dismissals: dismissalStats,
    });
  } catch (error) {
    console.error('[Reminders API] Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      message: error.message,
    });
  }
});

// ============================================================================
// METADATA ENDPOINTS
// ============================================================================

/**
 * GET /api/reminders/types
 * Get all available reminder types
 */
router.get('/types', requireAuth(), async (req, res) => {
  res.json({
    success: true,
    types: REMINDER_TYPES,
    categories: {
      hydration: [
        REMINDER_TYPES.HYDRATION_MORNING,
        REMINDER_TYPES.HYDRATION_MIDDAY,
        REMINDER_TYPES.HYDRATION_AFTERNOON,
        REMINDER_TYPES.HYDRATION_EVENING,
        REMINDER_TYPES.HYDRATION_GOAL_PROGRESS,
        REMINDER_TYPES.HYDRATION_STREAK,
      ],
      food: [
        REMINDER_TYPES.FOOD_BREAKFAST,
        REMINDER_TYPES.FOOD_LUNCH,
        REMINDER_TYPES.FOOD_DINNER,
        REMINDER_TYPES.FOOD_LOG_REMINDER,
        REMINDER_TYPES.FOOD_STREAK,
      ],
      mood: [
        REMINDER_TYPES.MOOD_CHECKIN_MORNING,
        REMINDER_TYPES.MOOD_CHECKIN_AFTERNOON,
        REMINDER_TYPES.MOOD_CHECKIN_EVENING,
        REMINDER_TYPES.MOOD_POST_MEAL,
      ],
      activity: [
        REMINDER_TYPES.ACTIVITY_MOVEMENT,
        REMINDER_TYPES.ACTIVITY_WALK,
      ],
      motivation: [
        REMINDER_TYPES.STREAK_AT_RISK,
        REMINDER_TYPES.WEEKLY_SUMMARY,
        REMINDER_TYPES.ACHIEVEMENT_CLOSE,
        REMINDER_TYPES.COMEBACK,
      ],
    },
    snoozeDurations: [
      { value: 15, label: '15 minutes' },
      { value: 30, label: '30 minutes' },
      { value: 60, label: '1 hour' },
      { value: 120, label: '2 hours' },
      { value: 240, label: '4 hours' },
      { value: 480, label: '8 hours' },
      { value: 1440, label: '24 hours' },
    ],
    dismissReasons: [
      { value: 'not_relevant', label: 'Not relevant to me' },
      { value: 'too_frequent', label: 'Too frequent' },
      { value: 'wrong_time', label: 'Wrong time' },
      { value: 'other', label: 'Other' },
    ],
  });
});

export default router;
