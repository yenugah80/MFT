import { describe, test, expect } from '@jest/globals';
import { mapReminderTypesToLocalCategories } from '../src/utils/deliveredTodayMapping.js';

// Regression coverage for the local/remote reminder ownership model: the
// backend cron is the primary sender for every category, and local
// on-device scheduling only fires as an offline fallback. The client
// suppresses today's local reminder for any category this mapping says was
// already delivered remotely today — get this mapping wrong and either
// duplicates return (prefix missing) or a category goes silently unnotified
// (prefix too broad).
describe('mapReminderTypesToLocalCategories', () => {
  test('maps every real REMINDER_TYPES value to its local category', () => {
    const cases = [
      ['hydration_morning', 'hydration_nudge'],
      ['hydration_midday', 'hydration_nudge'],
      ['hydration_afternoon', 'hydration_nudge'],
      ['hydration_evening', 'hydration_nudge'],
      ['hydration_goal_progress', 'hydration_nudge'],
      ['hydration_streak', 'hydration_nudge'],
      ['food_breakfast', 'daily_reminder'],
      ['food_lunch', 'daily_reminder'],
      ['food_dinner', 'daily_reminder'],
      ['food_log_reminder', 'daily_reminder'],
      ['food_streak', 'daily_reminder'],
      ['mood_checkin_morning', 'mood_checkin'],
      ['mood_checkin_afternoon', 'mood_checkin'],
      ['mood_checkin_evening', 'mood_checkin'],
      ['mood_post_meal', 'mood_checkin'],
      ['activity_movement', 'activity_reminder'],
      ['activity_walk', 'activity_reminder'],
      ['streak_at_risk', 'streak_at_risk'],
    ];
    for (const [type, expectedCategory] of cases) {
      expect(mapReminderTypesToLocalCategories([type])).toEqual([expectedCategory]);
    }
  });

  test('deduplicates multiple sends of the same category into one entry', () => {
    const result = mapReminderTypesToLocalCategories(['hydration_morning', 'hydration_afternoon']);
    expect(result).toEqual(['hydration_nudge']);
  });

  test('does not confuse comeback/weekly_summary/achievement_close with a local category', () => {
    // These motivation types have no local on-device equivalent — they
    // should not be treated as a match for any category.
    expect(mapReminderTypesToLocalCategories(['comeback'])).toEqual([]);
    expect(mapReminderTypesToLocalCategories(['weekly_summary'])).toEqual([]);
    expect(mapReminderTypesToLocalCategories(['achievement_close'])).toEqual([]);
  });

  test('returns an empty list for no deliveries', () => {
    expect(mapReminderTypesToLocalCategories([])).toEqual([]);
  });

  test('handles multiple distinct categories delivered the same day', () => {
    const result = mapReminderTypesToLocalCategories(['hydration_morning', 'mood_checkin_evening', 'streak_at_risk']);
    expect(result.sort()).toEqual(['hydration_nudge', 'mood_checkin', 'streak_at_risk'].sort());
  });
});
