import { describe, test, expect } from '@jest/globals';
import {
  generateHydrationReminders,
  generateFoodReminders,
  generateMoodReminders,
  generateMotivationReminders,
  generateActivityReminders,
} from '../src/services/smartReminderService.js';

// Regression coverage for a real production bug: HYDRATION_MESSAGES / FOOD_MESSAGES /
// MOOD_MESSAGES / MOTIVATION_MESSAGES / ACTIVITY_MESSAGES were migrated to a
// `{ getMessage: (ctx) => ... }` shape, but every generate*Reminders() function still
// piped the selected template into the old formatTemplate(template, vars) helper,
// which read template.title/.body — undefined on the new shape — and threw
// `Cannot read properties of undefined (reading 'replace')`. Because all 5
// categories ran inside one try/catch in getSmartReminders(), one crash (most often
// hydration, whose time windows span most of the day) silently discarded every
// other category's reminders for that user, for that entire cron run. Production
// logs showed `sent: 0` on nearly every 15-minute run for this reason.
//
// Assert every reminder returned has a real, non-empty title/body — not just that
// nothing throws — since a caught exception would previously have looked like an
// empty (not crashing) result too.
function expectValidReminders(reminders) {
  expect(Array.isArray(reminders)).toBe(true);
  for (const reminder of reminders) {
    expect(typeof reminder.title).toBe('string');
    expect(reminder.title.length).toBeGreaterThan(0);
    expect(typeof reminder.body).toBe('string');
    expect(reminder.body.length).toBeGreaterThan(0);
    expect(typeof reminder.type).toBe('string');
    expect(typeof reminder.priority).toBe('number');
  }
}

describe('generateHydrationReminders', () => {
  const baseContext = {
    todayStats: { water: { totalLiters: 0.2, totalLogs: 0 } },
    goals: { waterLiters: 2.5 },
    gamification: { streak: 5 },
  };

  test.each([
    ['morning window', 8],
    ['midday window', 12],
    ['afternoon window', 16],
    ['evening window', 20],
  ])('does not throw and returns valid content — %s', (_label, currentHour) => {
    const reminders = generateHydrationReminders({ ...baseContext, currentHour });
    expectValidReminders(reminders);
  });

  test('returns nothing once the goal is already met', () => {
    const reminders = generateHydrationReminders({
      ...baseContext,
      currentHour: 8,
      todayStats: { water: { totalLiters: 3, totalLogs: 2 } },
    });
    expect(reminders).toEqual([]);
  });
});

describe('generateFoodReminders', () => {
  const baseContext = {
    currentHour: 8,
    todayStats: { food: { totalMeals: 0, totalCalories: 0, mealTypes: {} }, water: { totalLogs: 0 }, mood: { totalLogs: 0 } },
    patterns: {
      mealTimes: { breakfast: { hour: 8 }, lunch: { hour: 12 }, dinner: { hour: 19 } },
      engagementLevel: 'engaged',
    },
    gamification: { streak: 4 },
    goals: { dailyCalories: 2200 },
  };

  test.each([
    ['breakfast window', 8],
    ['lunch window', 12],
    ['dinner window', 19],
    ['streak protection window', 20],
    ['gentle nudge window', 17],
  ])('does not throw and returns valid content — %s', (_label, currentHour) => {
    const reminders = generateFoodReminders({ ...baseContext, currentHour });
    expectValidReminders(reminders);
  });
});

describe('generateMoodReminders', () => {
  const baseContext = {
    todayStats: { mood: { totalLogs: 0 } },
    patterns: { engagementLevel: 'engaged', patterns: { mood: { peakHours: [9] } } },
  };

  test.each([
    ['morning window', 9],
    ['afternoon window', 15],
    ['evening window', 21],
  ])('does not throw and returns valid content — %s', (_label, currentHour) => {
    const reminders = generateMoodReminders({ ...baseContext, currentHour });
    expectValidReminders(reminders);
  });

  test('skips a disengaged new user entirely', () => {
    const reminders = generateMoodReminders({
      currentHour: 9,
      todayStats: { mood: { totalLogs: 0 } },
      patterns: { engagementLevel: 'new', patterns: { mood: { peakHours: [] } } },
    });
    expect(reminders).toEqual([]);
  });
});

describe('generateMotivationReminders', () => {
  test('streak-at-risk window does not throw and returns valid content', () => {
    const reminders = generateMotivationReminders({
      currentHour: 21,
      gamification: { streak: 6 },
      todayStats: { food: { totalMeals: 0 }, water: { totalLogs: 0 }, mood: { totalLogs: 0 } },
      patterns: {},
    });
    expectValidReminders(reminders);
  });

  test('comeback window does not throw and returns valid content', () => {
    const reminders = generateMotivationReminders({
      currentHour: 12,
      gamification: { streak: 0 },
      todayStats: {
        food: { totalMeals: 0, lastLoggedDate: null },
        water: { totalLogs: 0, lastLoggedDate: null },
        mood: { totalLogs: 0, lastLoggedDate: null },
      },
      patterns: {},
    });
    expectValidReminders(reminders);
  });
});

describe('generateActivityReminders', () => {
  const baseContext = {
    todayStats: { activity: { totalLogs: 3, steps: 500, sedentaryHours: 4 } },
    patterns: { engagementLevel: 'engaged' },
    goals: { stepGoal: 10000 },
  };

  test.each([
    ['morning movement window', 9],
    ['midday walk window', 13],
    ['afternoon sedentary window', 16],
    ['evening step-goal window', 19],
  ])('does not throw and returns valid content — %s', (_label, currentHour) => {
    const reminders = generateActivityReminders({ ...baseContext, currentHour });
    expectValidReminders(reminders);
  });
});
