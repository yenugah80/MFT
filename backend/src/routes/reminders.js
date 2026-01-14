/**
 * Smart Reminder API Routes
 *
 * Endpoints for intelligent notification scheduling and management.
 *
 * ENDPOINTS:
 * - GET /reminders/now - Get reminders due right now
 * - GET /reminders/schedule - Get scheduled reminders for next 24h
 * - GET /reminders/patterns - Get user's learned patterns
 * - PUT /reminders/preferences - Update notification preferences
 * - POST /reminders/dismiss - Dismiss a reminder
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import { db } from '../config/db.js';
import { accountSettingsTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  getSmartReminders,
  scheduleUserReminders,
  learnUserPatterns,
  REMINDER_TYPES,
  FREQUENCY_LIMITS,
} from '../services/smartReminderService.js';

const router = express.Router();

/**
 * GET /api/reminders/now
 * Get reminders that should be shown right now
 */
router.get('/now', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    const reminders = await getSmartReminders(userId);

    res.json({
      success: true,
      userId,
      reminders,
      count: reminders.length,
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
    const userId = req.auth.userId;

    const scheduled = await scheduleUserReminders(userId);

    res.json({
      success: true,
      userId,
      scheduled,
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
    const userId = req.auth.userId;

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

/**
 * GET /api/reminders/preferences
 * Get notification preferences
 */
router.get('/preferences', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

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
      motivation: true,
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
    const userId = req.auth.userId;
    const updates = req.body;

    // Validate input
    const allowedKeys = ['enabled', 'hydration', 'food', 'mood', 'motivation', 'quietHours'];
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
      // Update existing
      await db
        .update(accountSettingsTable)
        .set({
          notifications: newNotifications,
          updatedAt: new Date(),
        })
        .where(eq(accountSettingsTable.userId, userId));
    } else {
      // Create new
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

/**
 * POST /api/reminders/dismiss
 * Dismiss a reminder (tracks user feedback)
 */
router.post('/dismiss', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { reminderType, reason } = req.body;

    if (!reminderType) {
      return res.status(400).json({
        success: false,
        error: 'reminderType is required',
      });
    }

    // Log the dismissal for pattern learning
    console.log(`[Reminders] User ${userId} dismissed ${reminderType}: ${reason || 'no reason'}`);

    // In a full implementation, this would be stored for ML training
    // For now, just acknowledge

    res.json({
      success: true,
      message: 'Reminder dismissed',
      reminderType,
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

/**
 * POST /api/reminders/snooze
 * Snooze a reminder for a specified duration
 */
router.post('/snooze', requireAuth(), async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { reminderType, snoozeDuration = 30 } = req.body; // duration in minutes

    if (!reminderType) {
      return res.status(400).json({
        success: false,
        error: 'reminderType is required',
      });
    }

    // Calculate snooze until time
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + snoozeDuration);

    // In a full implementation, this would be stored
    console.log(`[Reminders] User ${userId} snoozed ${reminderType} until ${snoozeUntil.toISOString()}`);

    res.json({
      success: true,
      message: 'Reminder snoozed',
      reminderType,
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
      motivation: [
        REMINDER_TYPES.STREAK_AT_RISK,
        REMINDER_TYPES.WEEKLY_SUMMARY,
        REMINDER_TYPES.ACHIEVEMENT_CLOSE,
        REMINDER_TYPES.COMEBACK,
      ],
    },
  });
});

export default router;
