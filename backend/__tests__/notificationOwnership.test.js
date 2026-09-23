import { describe, test, expect } from '@jest/globals';
import { filterRemindersForDevice, mapReminderJobCategoryToLocalCategory, OWNABLE_CATEGORIES } from '../src/utils/notificationOwnership.js';

function reminder(type) {
  return { type, title: 't', body: 'b', priority: 3 };
}

// Mirrors smartReminderJob.js's real getCategoryForType — REMINDER_TYPES
// values are lowercase snake_case (e.g. 'hydration_morning'), and the
// returned strings are the exact preference keys the settings screen
// writes, not made-up bucket names.
function categoryForType(type) {
  if (type.includes('hydration')) return 'hydrationNudges';
  if (type.includes('food')) return 'dailyReminder';
  if (type.includes('mood')) return 'moodCheckins';
  if (type.includes('activity')) return 'activityReminders';
  if (type === 'streak_at_risk') return 'streakProtection';
  return 'enabled';
}

const resolver = (type) => mapReminderJobCategoryToLocalCategory(categoryForType(type));

describe('mapReminderJobCategoryToLocalCategory', () => {
  test('maps every real preference key to the local scheduler category name, including streakProtection', () => {
    expect(mapReminderJobCategoryToLocalCategory('hydrationNudges')).toBe('hydration_nudge');
    expect(mapReminderJobCategoryToLocalCategory('dailyReminder')).toBe('daily_reminder');
    expect(mapReminderJobCategoryToLocalCategory('moodCheckins')).toBe('mood_checkin');
    expect(mapReminderJobCategoryToLocalCategory('activityReminders')).toBe('activity_reminder');
    // Fixed 2026-09: this mapping was previously missing, so
    // mapReminderJobCategoryToLocalCategory('streakProtection') fell through
    // to its no-match fallback and returned 'streakProtection' unchanged —
    // which never matched OWNABLE_CATEGORIES regardless of what was in it,
    // silently defeating ownership for this category. See
    // notificationOwnership.js's REMINDER_JOB_CATEGORY_TO_LOCAL docstring.
    expect(mapReminderJobCategoryToLocalCategory('streakProtection')).toBe('streak_at_risk');
  });

  test('passes through a genuinely unmapped key unchanged (enabled has no local-category equivalent)', () => {
    expect(mapReminderJobCategoryToLocalCategory('enabled')).toBe('enabled');
  });
});

describe('filterRemindersForDevice', () => {
  test('a device with no ownership rows gets every reminder, unchanged from today', () => {
    const reminders = [reminder('hydration_morning'), reminder('streak_at_risk'), reminder('food_lunch')];
    const result = filterRemindersForDevice(reminders, new Set(), resolver);
    expect(result).toEqual(reminders);
  });

  test('a device owning hydration_nudge has hydration reminders dropped, everything else untouched', () => {
    const reminders = [reminder('hydration_morning'), reminder('streak_at_risk'), reminder('food_lunch')];
    const result = filterRemindersForDevice(reminders, new Set(['hydration_nudge']), resolver);
    expect(result.map((r) => r.type)).toEqual(['streak_at_risk', 'food_lunch']);
  });

  test('streak_at_risk IS suppressed when the device owns it locally (2026-09: brought into ownership, no longer dedup-only)', () => {
    const reminders = [reminder('streak_at_risk'), reminder('food_lunch')];
    // streak_at_risk is now in OWNABLE_CATEGORIES — a device that has
    // registered local ownership of it (owner stored as the LOCAL category
    // name 'streak_at_risk', per setOwnership/getOwnedCategoriesForDevice)
    // never sees the backend's own candidate for it, structurally, not via
    // best-effort delivery-time dedup.
    const result = filterRemindersForDevice(reminders, new Set(['streak_at_risk']), resolver);
    expect(result.map((r) => r.type)).toEqual(['food_lunch']);
  });

  test('a device owning ALL FIVE ownable categories (including streak_at_risk) ends up with zero candidates when only those types are due', () => {
    const reminders = [reminder('hydration_morning'), reminder('food_lunch'), reminder('mood_checkin_morning'), reminder('activity_walk'), reminder('streak_at_risk')];
    const result = filterRemindersForDevice(reminders, new Set(OWNABLE_CATEGORIES), resolver);
    expect(result).toEqual([]);
    expect(OWNABLE_CATEGORIES.size).toBe(5); // guards against silently adding/removing a category without updating this test
  });

  test('repeated filtering calls are pure/idempotent — same input, same output, no mutation', () => {
    const reminders = [reminder('hydration_morning'), reminder('food_lunch')];
    const owned = new Set(['hydration_nudge']);
    const first = filterRemindersForDevice(reminders, owned, resolver);
    const second = filterRemindersForDevice(reminders, owned, resolver);
    expect(first).toEqual(second);
    expect(reminders.length).toBe(2); // original array untouched
  });
});
