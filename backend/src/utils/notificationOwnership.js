/**
 * Pure filtering logic for per-device reminder suppression — kept free of
 * `db` so it's trivially unit-testable. The `db`-touching half lives in
 * deviceRegistry.js (getOwnedCategoriesForDevice/setOwnership).
 *
 * streak_at_risk was PREVIOUSLY excluded from this set on the theory that
 * its existing dedup-on-delivery (applyRemoteDeliveryDedup, mobile-side)
 * already prevented a double-send. That was wrong on two counts, found
 * during a 2026-09 audit:
 *   1. Counting: mobile always schedules a local streak_at_risk backup
 *      (scheduleStreakProtectionReminder) whenever streakProtection isn't
 *      explicitly disabled, but that slot was never counted anywhere —
 *      LOCAL_ALLOCATION summed to 5, not 6, so the true local total (5
 *      allocated + 1 uncounted streak) plus the backend's own "effective
 *      cap" (which assumed 1 full slot was still free) could reach 7,
 *      exceeding the stated 6/day combined limit.
 *   2. Collision risk: backend's own streak_at_risk candidate (smartReminderService.js's
 *      generateMotivationReminders, hour window 20-22) was never excluded
 *      by ownership, so it could independently fire within the same hour
 *      as local's fixed STREAK_HOUR (21:00, mobile/services/pushNotifications.js)
 *      — a real, structural collision risk, not a rare coincidence.
 *      Relying on dedup-after-the-fact to catch this requires the device to
 *      be online AND its foreground/background message handler to run at
 *      the right moment — neither guaranteed, so it is a best-effort
 *      mitigation, not a guarantee (see applyRemoteDeliveryDedup's own
 *      docstring). Ownership exclusivity, extended to this category the
 *      same way it already works for the other four, removes the
 *      collision at the source: a device that owns streak_at_risk locally
 *      simply never has it generated as a backend candidate at all,
 *      structurally rather than via race-prone cleanup. Dedup is kept as a
 *      defensive backstop for the edge case where ownership registration
 *      itself hasn't succeeded yet (a fresh install mid-registration, or a
 *      legacy pre-ownership-feature app build) — explicitly best-effort in
 *      that case, not relied upon as the primary mechanism.
 */
export const OWNABLE_CATEGORIES = new Set([
  'hydration_nudge',
  'daily_reminder',
  'mood_checkin',
  'activity_reminder',
  'streak_at_risk',
]);

/**
 * How many of the account-wide 6/day combined budget
 * (NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY) each locally-
 * owned category is allowed to claim, enforced at schedule-creation time in
 * mobile/services/pushNotifications.js (LOCAL_ALLOCATION there — MUST be
 * kept numerically identical to this map; there is no shared package
 * between mobile and backend for these values, same as every other
 * category-name translation in this file). Sums to exactly 6 — the full
 * daily cap — because ALL FIVE of these categories are locally scheduled
 * by default (streak_at_risk included, previously miscounted as free).
 * There is deliberately no separate "reserved for backend" remainder any
 * more: a device with every category locally owned has an effective daily
 * cap of 0 (see getEffectiveDailyCap) — comeback/re-engagement messaging
 * (the one backend-only motivation type with no local equivalent) can be
 * fully crowded out on such a device. That is a real, acknowledged
 * tradeoff, not an oversight — see getEffectiveDailyCap and
 * getAccountEffectiveDailyCap's docstrings, and the release report's
 * "Unresolved tradeoffs" section.
 *
 * Values were 3/1/2/1 hydration/daily/activity/mood by mobile default
 * before this budget existed (7 total, already over budget on its own,
 * before even counting streak). Trimmed to fit: hydration keeps 2 slots
 * (benefits most from being spread across the day — it tracks an
 * accumulating goal), the other four keep 1 each (single-touch nudges, not
 * cumulative).
 */
export const LOCAL_ALLOCATION = {
  hydration_nudge: 2,
  daily_reminder: 1,
  activity_reminder: 1,
  mood_checkin: 1,
  streak_at_risk: 1,
};

/**
 * Sum of LOCAL_ALLOCATION across whichever categories a device owns
 * locally, i.e. how much of the shared daily budget that device's local
 * schedule has already claimed.
 */
export function getLocalBudgetClaimed(ownedCategories) {
  let claimed = 0;
  for (const category of ownedCategories) {
    claimed += LOCAL_ALLOCATION[category] || 0;
  }
  return claimed;
}

/**
 * The backend's own effective daily cap for one device, after subtracting
 * whatever that device's local schedule already claims for its owned
 * categories. Floored at 0 (not 1) — every locally-schedulable category,
 * including streak_at_risk, is now counted in LOCAL_ALLOCATION (see its
 * docstring), so a device that owns all five has correctly claimed the
 * entire 6/day budget already; there is no separate backend-only reserve
 * left to protect. The one backend-only motivation type with no local
 * equivalent — comeback/re-engagement (smartReminderService.js's
 * REMINDER_TYPES.COMEBACK, only relevant for a 2-7-day-inactive user) —
 * can therefore be fully crowded out on such a device. Not fixed here:
 * doing so would mean either exceeding 6/day (reintroducing the exact
 * over-count this function exists to prevent) or taking a slot away from a
 * category the user explicitly enabled (hydration/food/mood/activity are
 * user-requested — see mobile's LOCAL_ALLOCATION docstring — vs comeback,
 * which is a system-generated automatic nudge the user never asked for by
 * name). Left as an acknowledged, unresolved tradeoff.
 *
 * This is a STATIC, reservation-style split, not a real-time-coordinated
 * one, deliberately: the backend has no way to know whether a given local
 * notification actually fired today (device off, OS-level notifications
 * disabled, Do Not Disturb, no reliable delivery receipt for local
 * notifications at all) — trying to dynamically "give back" budget the
 * backend THINKS local didn't use would require knowledge this system
 * cannot have while the device may be offline. The guarantee this produces
 * is a ceiling on the combined total (backend will never send more than its
 * reduced share), not a floor (if local silently fails, the user may get
 * fewer than 6 total that day — under-delivery, never over-delivery).
 */
export function getEffectiveDailyCap(maxPerDay, ownedCategories) {
  return Math.max(0, maxPerDay - getLocalBudgetClaimed(ownedCategories));
}

// getAccountEffectiveDailyCap (the multi-device version of the above, for
// send paths that target an account rather than one specific device) lives
// in deviceRegistry.js, not here — it needs resolveSendTargets/
// getOwnedCategoriesForDevice, both `db`-touching, and this file is
// deliberately kept `db`-free (see header).

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
// the one place that translates between them. streakProtection was missing
// here before the 2026-09 fix that brought streak_at_risk into
// OWNABLE_CATEGORIES — without this entry, mapReminderJobCategoryToLocalCategory
// fell through to returning 'streakProtection' unchanged (its no-match
// fallback), which never matched OWNABLE_CATEGORIES regardless of what was
// added to that set, silently defeating the ownership filter for this
// category specifically.
const REMINDER_JOB_CATEGORY_TO_LOCAL = {
  hydrationNudges: 'hydration_nudge',
  dailyReminder: 'daily_reminder',
  moodCheckins: 'mood_checkin',
  activityReminders: 'activity_reminder',
  streakProtection: 'streak_at_risk',
};

export function mapReminderJobCategoryToLocalCategory(reminderJobCategory) {
  return REMINDER_JOB_CATEGORY_TO_LOCAL[reminderJobCategory] || reminderJobCategory;
}
