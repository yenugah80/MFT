/**
 * Regression test for a real, pre-existing bug found while verifying that
 * turning a category off in the app actually stops the backend from
 * sending it: smartReminderJob.js's preference-key mapping (getCategoryForType,
 * mapTypeToExpo) used made-up bucket names / case-sensitive substring checks
 * that never matched the real preference keys the settings screen writes
 * (mobile/app/profile/notifications.jsx), so notifications?.[reminderCategory]
 * === false was always false — the per-category toggle never actually
 * suppressed anything on the backend side, for either delivery channel.
 *
 * Imports smartReminderJob.js directly (not duplicated logic) — confirmed
 * safe: postgres-js connections are lazy, and nothing at this module's
 * top level executes a query or starts the cron job (that only happens
 * inside initSmartReminderCronJob(), never called here).
 */
import { describe, test, expect } from '@jest/globals';
import { getCategoryForType, mapTypeToExpo } from '../src/jobs/smartReminderJob.js';
import { REMINDER_TYPES } from '../src/services/smartReminderService.js';
import { FCM_NOTIFICATION_TYPES } from '../src/services/fcmPushService.js';
import { NOTIFICATION_TYPES } from '../src/services/pushNotificationService.js';
import { filterRemindersForDevice } from '../src/utils/notificationOwnership.js';

describe('getCategoryForType — must resolve to the REAL settings-screen preference keys', () => {
  test.each([
    [REMINDER_TYPES.HYDRATION_MORNING, 'hydrationNudges'],
    [REMINDER_TYPES.HYDRATION_GOAL_PROGRESS, 'hydrationNudges'],
    [REMINDER_TYPES.FOOD_BREAKFAST, 'dailyReminder'],
    [REMINDER_TYPES.FOOD_LOG_REMINDER, 'dailyReminder'],
    [REMINDER_TYPES.MOOD_CHECKIN_MORNING, 'moodCheckins'],
    [REMINDER_TYPES.MOOD_POST_MEAL, 'moodCheckins'],
    [REMINDER_TYPES.ACTIVITY_MOVEMENT, 'activityReminders'],
    [REMINDER_TYPES.ACTIVITY_WALK, 'activityReminders'],
    [REMINDER_TYPES.STREAK_AT_RISK, 'streakProtection'],
  ])('%s -> %s', (type, expectedKey) => {
    expect(getCategoryForType(type)).toBe(expectedKey);
  });

  test('a user who disabled hydrationNudges would actually be matched and suppressed', () => {
    const prefs = { hydrationNudges: false };
    const category = getCategoryForType(REMINDER_TYPES.HYDRATION_MORNING);
    // This is the exact check processUserReminders performs — proving it
    // now actually fires for a real disabled preference, unlike before.
    expect(prefs[category] === false).toBe(true);
  });

  test('engagement types with no dedicated toggle fall through to the master switch only', () => {
    expect(getCategoryForType(REMINDER_TYPES.WEEKLY_SUMMARY)).toBe('enabled');
    expect(getCategoryForType(REMINDER_TYPES.ACHIEVEMENT_CLOSE)).toBe('enabled');
    expect(getCategoryForType(REMINDER_TYPES.COMEBACK)).toBe('enabled');
  });
});

describe('mapTypeToExpo — must actually differentiate categories (was always DAILY_REMINDER)', () => {
  test.each([
    [REMINDER_TYPES.HYDRATION_EVENING, NOTIFICATION_TYPES.HYDRATION_NUDGE],
    [REMINDER_TYPES.FOOD_DINNER, NOTIFICATION_TYPES.DAILY_REMINDER],
    [REMINDER_TYPES.MOOD_CHECKIN_EVENING, NOTIFICATION_TYPES.MOOD_CHECKIN],
    [REMINDER_TYPES.ACTIVITY_WALK, NOTIFICATION_TYPES.ACTIVITY_REMINDER],
    [REMINDER_TYPES.STREAK_AT_RISK, NOTIFICATION_TYPES.STREAK_CELEBRATION],
  ])('%s -> %s', (type, expected) => {
    expect(mapTypeToExpo(type)).toBe(expected);
  });

  test('every branch actually resolves to a DIFFERENT value — confirms the case-sensitivity bug is gone', () => {
    const results = new Set([
      mapTypeToExpo(REMINDER_TYPES.HYDRATION_MORNING),
      mapTypeToExpo(REMINDER_TYPES.FOOD_BREAKFAST),
      mapTypeToExpo(REMINDER_TYPES.MOOD_CHECKIN_MORNING),
      mapTypeToExpo(REMINDER_TYPES.ACTIVITY_MOVEMENT),
      mapTypeToExpo(REMINDER_TYPES.STREAK_AT_RISK),
    ]);
    expect(results.size).toBe(5); // previously all 5 collapsed to the same DAILY_REMINDER value
  });
});

describe('FCM_NOTIFICATION_TYPES — values must exactly match real preference keys', () => {
  test('hydration and daily-reminder values are the actual settings-screen keys, not placeholders', () => {
    expect(FCM_NOTIFICATION_TYPES.HYDRATION_NUDGE).toBe('hydrationNudges');
    expect(FCM_NOTIFICATION_TYPES.DAILY_REMINDER).toBe('dailyReminder');
    expect(FCM_NOTIFICATION_TYPES.MOOD_CHECKIN).toBe('moodCheckins');
    expect(FCM_NOTIFICATION_TYPES.ACTIVITY_REMINDER).toBe('activityReminders');
  });

  test('a disabled activityReminders preference would now actually match ACTIVITY_REMINDER sends', () => {
    const prefs = { activityReminders: false };
    expect(prefs[FCM_NOTIFICATION_TYPES.ACTIVITY_REMINDER] === false).toBe(true);
  });
});

describe('releasing local ownership must never accidentally reactivate a disabled category', () => {
  // Composes the two REAL, independent gates a reminder must pass through
  // once local ownership is released back to 'backend' (settings screen
  // turns a category off -> syncAllNotificationSchedules cancels the local
  // schedule and calls registerLocalOwnership(category, 'backend')):
  // 1. filterRemindersForDevice — ownership is now empty (nothing owned
  //    locally), so this stage lets the reminder through.
  // 2. processUserReminders' own preference check — must independently
  //    reject it because the user explicitly disabled the category.
  // Ownership release and preference enforcement are deliberately separate,
  // redundant gates: releasing ownership only means "I'm not handling this
  // locally anymore," never "please start sending this now."
  test('hydration reminder with released ownership AND hydrationNudges disabled is still rejected by the preference gate', () => {
    const reminders = [{ type: REMINDER_TYPES.HYDRATION_MORNING, title: 't', body: 'b', priority: 3 }];
    const ownedCategories = new Set(); // released back to 'backend'

    const passedOwnershipStage = filterRemindersForDevice(
      reminders,
      ownedCategories,
      (type) => getCategoryForType(type)
    );
    expect(passedOwnershipStage).toEqual(reminders); // ownership stage alone lets it through

    const notifications = { hydrationNudges: false }; // user explicitly turned this off
    const topReminder = passedOwnershipStage[0];
    const reminderCategory = getCategoryForType(topReminder.type);
    const wouldBeSuppressed = notifications?.[reminderCategory] === false;

    expect(wouldBeSuppressed).toBe(true); // the second, independent gate catches it
  });
});
