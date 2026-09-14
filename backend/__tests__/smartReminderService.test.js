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
  const emptyTodayStats = { food: { totalMeals: 0 }, water: { totalLogs: 0 }, mood: { totalLogs: 0 } };

  test('streak-at-risk fires at its real window (19:00) and returns valid content', () => {
    const reminders = generateMotivationReminders({
      currentHour: 19,
      gamification: { streak: 6 },
      todayStats: emptyTodayStats,
      patterns: {},
    });
    expectValidReminders(reminders);
    expect(reminders.some((r) => r.type === 'streak_at_risk')).toBe(true);
  });

  // Regression test for the local/remote time-collision fix: mobile's local
  // streak-protection backup fires at a fixed hour (STREAK_HOUR = 21 in
  // pushNotifications.js). The backend's own streak_at_risk candidate must
  // never be generated within 60 minutes of that hour — ownership
  // exclusivity is the primary mechanism (a device that owns streak_at_risk
  // locally never sees this candidate regardless of hour), but this window
  // is the defense-in-depth backstop for a device where ownership hasn't
  // registered yet, so it must hold on its own too.
  test('streak-at-risk window stays >=60 minutes clear of local STREAK_HOUR (21:00) at every hour of the day', () => {
    const LOCAL_STREAK_HOUR = 21; // MUST match mobile/services/pushNotifications.js's STREAK_HOUR
    for (let hour = 0; hour < 24; hour++) {
      const reminders = generateMotivationReminders({
        currentHour: hour,
        gamification: { streak: 6 },
        todayStats: emptyTodayStats,
        patterns: {},
      });
      const fired = reminders.some((r) => r.type === 'streak_at_risk');
      if (fired) {
        const hourDiff = Math.min(
          Math.abs(hour - LOCAL_STREAK_HOUR),
          24 - Math.abs(hour - LOCAL_STREAK_HOUR)
        );
        expect(hourDiff).toBeGreaterThanOrEqual(1); // >= 60 minutes, since candidates are hour-granular
      }
    }
  });

  test('streak-at-risk does NOT fire outside its window, even with a real streak and no logs today', () => {
    const reminders = generateMotivationReminders({
      currentHour: 21, // local's own hour — backend must stay silent here
      gamification: { streak: 6 },
      todayStats: emptyTodayStats,
      patterns: {},
    });
    expect(reminders.some((r) => r.type === 'streak_at_risk')).toBe(false);
  });

  // Regression test for the dead-code bug found alongside the reduction
  // fix: calculateDaysSinceLastLog previously could only ever return 0 or
  // 1, so this branch was unreachable regardless of how long a user had
  // actually been inactive. Now driven by gamification.lastLogDate.
  test('comeback fires on day 2 (a backed-off day), using a real lastLogDate', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const reminders = generateMotivationReminders({
      currentHour: 12,
      gamification: { streak: 0, lastLogDate: twoDaysAgo, timezoneOffset: 0 },
      todayStats: emptyTodayStats,
      patterns: {},
    });
    expectValidReminders(reminders);
    expect(reminders.some((r) => r.type === 'comeback')).toBe(true);
  });

  test('comeback does NOT fire on day 3 (not one of the backed-off days 2/4/7) — the repetition reduction', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const reminders = generateMotivationReminders({
      currentHour: 12,
      gamification: { streak: 0, lastLogDate: threeDaysAgo, timezoneOffset: 0 },
      todayStats: emptyTodayStats,
      patterns: {},
    });
    expect(reminders.some((r) => r.type === 'comeback')).toBe(false);
  });

  test('comeback fires on day 7 but not day 8+ (the window still ends)', () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

    const day7 = generateMotivationReminders({
      currentHour: 12,
      gamification: { streak: 0, lastLogDate: sevenDaysAgo, timezoneOffset: 0 },
      todayStats: emptyTodayStats,
      patterns: {},
    });
    expect(day7.some((r) => r.type === 'comeback')).toBe(true);

    const day8 = generateMotivationReminders({
      currentHour: 12,
      gamification: { streak: 0, lastLogDate: eightDaysAgo, timezoneOffset: 0 },
      todayStats: emptyTodayStats,
      patterns: {},
    });
    expect(day8.some((r) => r.type === 'comeback')).toBe(false);
  });

  test('no lastLogDate at all (new/unknown account) never triggers comeback', () => {
    const reminders = generateMotivationReminders({
      currentHour: 12,
      gamification: { streak: 0 },
      todayStats: emptyTodayStats,
      patterns: {},
    });
    expect(reminders.some((r) => r.type === 'comeback')).toBe(false);
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
