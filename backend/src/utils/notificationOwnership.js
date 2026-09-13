/**
 * Pure filtering logic for per-device reminder suppression — kept free of
 * `db` so it's trivially unit-testable. The `db`-touching half lives in
 * deviceRegistry.js (getOwnedCategoriesForDevice/setOwnership).
 *
 * Only these four categories can ever be locally owned. streak_at_risk is
 * deliberately excluded — it keeps its existing backend-primary rolling-
 * window design, unaffected by this feature.
 */
export const OWNABLE_CATEGORIES = new Set([
  'hydration_nudge',
  'daily_reminder',
  'mood_checkin',
  'activity_reminder',
]);

/**
 * Drops any reminder whose resolved local category is in ownedCategories.
 * Reminders whose category isn't in OWNABLE_CATEGORIES (e.g. streak/
 * motivation) always pass through untouched, regardless of ownership.
 *
 * @param {Array} reminders - candidate reminders, highest priority first
 * @param {Set<string>} ownedCategories - categories this device owns locally
 * @param {(type: string) => string} categoryResolverFn - maps a reminder's
 *   `type` to the local category key (e.g. smartReminderJob's getCategoryForType,
 *   itself mapped again to the local NOTIFICATION_CATEGORIES naming)
 */
export function filterRemindersForDevice(reminders, ownedCategories, categoryResolverFn) {
  if (!ownedCategories || ownedCategories.size === 0) return reminders;
  return reminders.filter((reminder) => {
    const category = categoryResolverFn(reminder.type);
    if (!OWNABLE_CATEGORIES.has(category)) return true;
    return !ownedCategories.has(category);
  });
}

// Maps smartReminderJob's getCategoryForType() output — the settings
// screen's real preference-key names ('hydrationNudges' | 'dailyReminder' |
// 'moodCheckins' | 'activityReminders' | 'streakProtection' | 'enabled') —
// to the local NOTIFICATION_CATEGORIES naming mobile's pushNotifications.js
// uses. Kept separate from OWNABLE_CATEGORIES because the reminder job's
// preference-key vocabulary is unrelated to the local scheduler's — this is
// the one place that translates between them.
const REMINDER_JOB_CATEGORY_TO_LOCAL = {
  hydrationNudges: 'hydration_nudge',
  dailyReminder: 'daily_reminder',
  moodCheckins: 'mood_checkin',
  activityReminders: 'activity_reminder',
};

export function mapReminderJobCategoryToLocalCategory(reminderJobCategory) {
  return REMINDER_JOB_CATEGORY_TO_LOCAL[reminderJobCategory] || reminderJobCategory;
}
