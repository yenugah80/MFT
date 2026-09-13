/**
 * Verifies two things about the per-device local-ownership feature:
 * (1) local scheduling never depends on the ownership-registration network
 *     call succeeding — offline coverage is preserved even if the backend
 *     is unreachable; (2) registerLocalOwnership itself degrades safely
 *     (returns false, never throws) when the network call fails.
 *
 * Uses the same __setNotificationsClientForTesting injection harness as
 * pushNotificationsScheduling.test.js, for the same reason: expo-
 * notifications' dynamic import can't be intercepted by jest.mock() here.
 */
jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(() => Promise.reject(new Error('network unreachable'))),
    get: jest.fn(),
  },
}));

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

describe('local scheduling is never gated on the ownership-registration network call', () => {
  test('scheduleHydrationReminders still schedules its full set even when the backend is unreachable', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    const ids = await pn.scheduleHydrationReminders([10, 14, 18]);

    expect(ids.length).toBe(3);
    expect(fake.scheduled.length).toBe(3);
  });

  test('registerLocalOwnership degrades safely (returns false, never throws) on network failure', async () => {
    const pn = await import('../../services/pushNotifications');
    await expect(pn.registerLocalOwnership('hydration_nudge', 'local')).resolves.toBe(false);
  });

  test('syncAllNotificationSchedules still completes and returns scheduled categories even though every ownership call fails', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    const result = await pn.syncAllNotificationSchedules(
      { dailyReminder: true, hydrationNudges: true, activityReminders: true, moodCheckins: true, streakProtection: false },
      {}
    );

    expect(result.error).toBeUndefined();
    expect(result.scheduled.map((s) => s.type).sort()).toEqual(['activity', 'daily_reminder', 'hydration', 'mood']);
  });
});
