import { filterRemindersForDevice, mapReminderJobCategoryToLocalCategory, OWNABLE_CATEGORIES } from '../src/utils/notificationOwnership.js';

function reminder(type) {
  return { type, title: 't', body: 'b', priority: 3 };
}

// Mirrors smartReminderJob.js's getCategoryForType bucketing for test inputs.
function bucketForType(type) {
  if (type.startsWith('HYDRATION')) return 'hydration';
  if (type.startsWith('FOOD')) return 'food';
  if (type.startsWith('MOOD')) return 'mood';
  if (type.startsWith('ACTIVITY')) return 'activity';
  if (type.startsWith('STREAK')) return 'motivation';
  return 'enabled';
}

const resolver = (type) => mapReminderJobCategoryToLocalCategory(bucketForType(type));

describe('mapReminderJobCategoryToLocalCategory', () => {
  test('maps every reminder-job bucket to the local scheduler category name', () => {
    expect(mapReminderJobCategoryToLocalCategory('hydration')).toBe('hydration_nudge');
    expect(mapReminderJobCategoryToLocalCategory('food')).toBe('daily_reminder');
    expect(mapReminderJobCategoryToLocalCategory('mood')).toBe('mood_checkin');
    expect(mapReminderJobCategoryToLocalCategory('activity')).toBe('activity_reminder');
  });

  test('passes through unmapped buckets unchanged (motivation/enabled are never ownable)', () => {
    expect(mapReminderJobCategoryToLocalCategory('motivation')).toBe('motivation');
    expect(mapReminderJobCategoryToLocalCategory('enabled')).toBe('enabled');
  });
});

describe('filterRemindersForDevice', () => {
  test('a device with no ownership rows gets every reminder, unchanged from today', () => {
    const reminders = [reminder('HYDRATION_MORNING'), reminder('STREAK_AT_RISK'), reminder('FOOD_LUNCH')];
    const result = filterRemindersForDevice(reminders, new Set(), resolver);
    expect(result).toEqual(reminders);
  });

  test('a device owning hydration_nudge has hydration reminders dropped, everything else untouched', () => {
    const reminders = [reminder('HYDRATION_MORNING'), reminder('STREAK_AT_RISK'), reminder('FOOD_LUNCH')];
    const result = filterRemindersForDevice(reminders, new Set(['hydration_nudge']), resolver);
    expect(result.map((r) => r.type)).toEqual(['STREAK_AT_RISK', 'FOOD_LUNCH']);
  });

  test('streak_at_risk is never suppressed, even if somehow passed as an owned category', () => {
    const reminders = [reminder('STREAK_AT_RISK')];
    // 'motivation'/'streak_at_risk' is not in OWNABLE_CATEGORIES, so even a
    // (deliberately invalid) attempt to own it has no suppression effect —
    // this is the structural guarantee that streak stays untouched by this
    // feature, not just a convention callers are expected to follow.
    const result = filterRemindersForDevice(reminders, new Set(['motivation', 'streak_at_risk']), resolver);
    expect(result).toEqual(reminders);
  });

  test('a device owning ALL four ownable categories ends up with zero candidates when only those types are due', () => {
    const reminders = [reminder('HYDRATION_MORNING'), reminder('FOOD_LUNCH'), reminder('MOOD_CHECKIN_MORNING'), reminder('ACTIVITY_WALK')];
    const result = filterRemindersForDevice(reminders, new Set(OWNABLE_CATEGORIES), resolver);
    expect(result).toEqual([]);
  });

  test('repeated filtering calls are pure/idempotent — same input, same output, no mutation', () => {
    const reminders = [reminder('HYDRATION_MORNING'), reminder('FOOD_LUNCH')];
    const owned = new Set(['hydration_nudge']);
    const first = filterRemindersForDevice(reminders, owned, resolver);
    const second = filterRemindersForDevice(reminders, owned, resolver);
    expect(first).toEqual(second);
    expect(reminders.length).toBe(2); // original array untouched
  });
});
