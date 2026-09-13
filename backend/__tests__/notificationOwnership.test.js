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
  test('maps every real preference key to the local scheduler category name', () => {
    expect(mapReminderJobCategoryToLocalCategory('hydrationNudges')).toBe('hydration_nudge');
    expect(mapReminderJobCategoryToLocalCategory('dailyReminder')).toBe('daily_reminder');
    expect(mapReminderJobCategoryToLocalCategory('moodCheckins')).toBe('mood_checkin');
    expect(mapReminderJobCategoryToLocalCategory('activityReminders')).toBe('activity_reminder');
  });

  test('passes through unmapped keys unchanged (streakProtection/enabled are never ownable)', () => {
    expect(mapReminderJobCategoryToLocalCategory('streakProtection')).toBe('streakProtection');
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

  test('streak_at_risk is never suppressed, even if somehow passed as an owned category', () => {
    const reminders = [reminder('streak_at_risk')];
    // 'streakProtection'/'streak_at_risk' is not in OWNABLE_CATEGORIES, so
    // even a (deliberately invalid) attempt to own it has no suppression
    // effect — this is the structural guarantee that streak stays untouched
    // by this feature, not just a convention callers are expected to follow.
    const result = filterRemindersForDevice(reminders, new Set(['streakProtection', 'streak_at_risk']), resolver);
    expect(result).toEqual(reminders);
  });

  test('a device owning ALL four ownable categories ends up with zero candidates when only those types are due', () => {
    const reminders = [reminder('hydration_morning'), reminder('food_lunch'), reminder('mood_checkin_morning'), reminder('activity_walk')];
    const result = filterRemindersForDevice(reminders, new Set(OWNABLE_CATEGORIES), resolver);
    expect(result).toEqual([]);
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
