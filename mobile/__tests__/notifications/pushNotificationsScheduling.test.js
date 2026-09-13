/**
 * Real, executable verification of the local-scheduling cancellation
 * behavior — not just code review. Uses __setNotificationsClientForTesting
 * (services/pushNotifications.js) to inject a fake expo-notifications
 * client directly, sidestepping the dynamic `await import('expo-notifications')`
 * that cannot be reliably intercepted by jest.mock() under this project's
 * babel-jest setup (confirmed empirically across multiple approaches, with
 * and without `{virtual: true}}`, jest-expo's own default native-module
 * mocks, and both the "unit" and "components" jest projects — all fail
 * identically with "Unexpected import statement in CJS module"). This file
 * lives under __tests__/notifications/, routed through the "components"
 * jest project (see jest.config.js) because expo-notifications only loads
 * (doesn't crash on import) under that project's fuller RN environment —
 * the "unit" project's stripped react-native stub can't support it at all.
 */

function createFakeNotifications() {
  const scheduled = [];
  let nextId = 0;
  return {
    scheduled,
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve(scheduled.slice())),
    scheduleNotificationAsync: jest.fn((request) => {
      const identifier = `mock-${nextId++}`;
      scheduled.push({ identifier, content: request.content, trigger: request.trigger });
      return Promise.resolve(identifier);
    }),
    cancelScheduledNotificationAsync: jest.fn((identifier) => {
      const idx = scheduled.findIndex((n) => n.identifier === identifier);
      if (idx >= 0) scheduled.splice(idx, 1);
      return Promise.resolve();
    }),
  };
}

describe('cancelNextOccurrenceForCategory — streak protection rolling window', () => {
  test('cancelling today preserves every other day, and re-scheduling does not re-add today or disturb the rest', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleStreakProtectionReminder(21);
    expect(fake.scheduled.length).toBe(7);

    const todayKey = pn.localDateKey(new Date());
    const todayEntryBefore = fake.scheduled.find((n) => n.content.data.dateKey === todayKey);
    expect(todayEntryBefore).toBeDefined();

    const otherDaysBefore = fake.scheduled.filter((n) => n.content.data.dateKey !== todayKey);
    expect(otherDaysBefore.length).toBe(6);
    // Snapshot identifiers + triggers so we can prove they are byte-for-byte
    // untouched afterward, not just "still present in some form".
    const otherDaysSnapshot = otherDaysBefore.map((n) => ({ identifier: n.identifier, trigger: n.trigger }));

    await pn.cancelNextOccurrenceForCategory('streak_at_risk');

    // Today's occurrence is suppressed.
    expect(fake.scheduled.some((n) => n.content.data.dateKey === todayKey)).toBe(false);
    expect(fake.scheduled.length).toBe(6);

    // Every other day — including tomorrow — is untouched: same identifiers,
    // same triggers, still present. This is the actual claim under test:
    // these are independent, already-registered OS-level scheduled
    // notifications that need zero further app action to fire; nothing here
    // "makes tomorrow fire" because tomorrow's entry was never touched.
    const otherDaysAfter = fake.scheduled.map((n) => ({ identifier: n.identifier, trigger: n.trigger }));
    expect(otherDaysAfter.sort((a, b) => a.identifier.localeCompare(b.identifier)))
      .toEqual(otherDaysSnapshot.sort((a, b) => a.identifier.localeCompare(b.identifier)));

    // Re-running the scheduler (simulating a later app foreground/resync)
    // tops up the window without re-adding today or duplicating any day.
    await pn.scheduleStreakProtectionReminder(21);
    expect(fake.scheduled.length).toBe(7); // topped back up to a full week
    expect(fake.scheduled.some((n) => n.content.data.dateKey === todayKey)).toBe(true);
    // The newly-added "today" entry is a fresh schedule, not a resurrection
    // of the cancelled one — confirm no duplicate today entries exist.
    expect(fake.scheduled.filter((n) => n.content.data.dateKey === todayKey).length).toBe(1);
  });

  test('repeated cancellation calls for the same day cannot progressively cancel additional slots', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleStreakProtectionReminder(21);
    expect(fake.scheduled.length).toBe(7);

    // Simulates 3 redundant dedup checks for the SAME remote delivery
    // (background handler + foreground onMessage + AppState foreground all
    // firing for one push) — none of them should reach into a different day.
    await pn.cancelNextOccurrenceForCategory('streak_at_risk');
    const afterFirst = fake.scheduled.length;
    await pn.cancelNextOccurrenceForCategory('streak_at_risk');
    const afterSecond = fake.scheduled.length;
    await pn.cancelNextOccurrenceForCategory('streak_at_risk');
    const afterThird = fake.scheduled.length;

    expect(afterFirst).toBe(6); // today's one entry removed
    expect(afterSecond).toBe(6); // nothing left matching "today" — safe no-op
    expect(afterThird).toBe(6); // still safe — never reaches into tomorrow
  });

  test('cancelTodayForCategory (full-day scope) also leaves other days untouched — used by the "user logged" trigger, not dedup', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleStreakProtectionReminder(21);
    await pn.cancelStreakProtectionIfLoggedToday();

    const todayKey = pn.localDateKey(new Date());
    expect(fake.scheduled.some((n) => n.content.data.dateKey === todayKey)).toBe(false);
    expect(fake.scheduled.length).toBe(6);
  });
});

describe('cancelHydrationIfGoalReached — must not remove the repeating schedule', () => {
  test('reaching the goal does not cancel any scheduled hydration reminder', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleHydrationReminders([10, 14, 18]);
    expect(fake.scheduled.length).toBe(3);
    const before = fake.scheduled.map((n) => n.identifier).sort();

    // This used to call cancelTodayForCategory, which — for a permanent
    // repeating trigger with no per-day dateKey tags — would either silently
    // match nothing (harmless but misleadingly-named dead code) or, in an
    // earlier design, wipe every future occurrence permanently. Verifying
    // directly: reaching the goal must leave the repeating schedule intact.
    await pn.cancelHydrationIfGoalReached(2000, 2000); // goal reached exactly

    expect(fake.scheduled.length).toBe(3);
    expect(fake.scheduled.map((n) => n.identifier).sort()).toEqual(before);
  });

  test('reaching the goal well past 100% still does not cancel anything', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleHydrationReminders([10, 14, 18]);
    await pn.cancelHydrationIfGoalReached(3000, 2000); // 150% of goal
    expect(fake.scheduled.length).toBe(3);
  });
});

describe('scheduleHydrationReminders / scheduleActivityReminders / scheduleMoodCheckIn / scheduleDailyReminder — permanent repeating triggers', () => {
  test('each category schedules exactly one repeating trigger per configured hour, with repeats: true', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleHydrationReminders([10, 14, 18]);
    expect(fake.scheduled.length).toBe(3);
    fake.scheduled.forEach((n) => expect(n.trigger.repeats).toBe(true));
    // No per-day tagging on these — confirms they are NOT part of the
    // rolling-window mechanism and therefore immune to the "cancel just
    // today" bug class entirely, by construction (nothing ever removes them
    // except an explicit full-category cancel).
    fake.scheduled.forEach((n) => expect(n.content.data.dateKey).toBeUndefined());
  });

  test('re-scheduling replaces the previous set rather than accumulating duplicates', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleHydrationReminders([10, 14, 18]);
    await pn.scheduleHydrationReminders([10, 14, 18]);
    expect(fake.scheduled.length).toBe(3); // not 6
  });
});
