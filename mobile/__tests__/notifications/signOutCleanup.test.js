/**
 * Verifies item 3 from the device-model review: signing out (including
 * fully offline) must cancel the outgoing account's local reminders
 * immediately, and a failed server deregistration must not prevent that or
 * crash the sign-out flow.
 *
 * deviceIdentity is mocked for the same reason as ownershipRetry.test.js:
 * this Jest project's expo-crypto stub doesn't implement randomUUID(), so
 * the real getOrCreateDeviceId() always fails here — unrelated to what
 * this file is testing.
 */
const mockPost = jest.fn();
const mockDelete = jest.fn();
jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: {
    post: (...args) => mockPost(...args),
    delete: (...args) => mockDelete(...args),
    get: jest.fn(),
  },
}));
jest.mock('../../services/deviceIdentity', () => ({
  __esModule: true,
  getOrCreateDeviceId: jest.fn(() => Promise.resolve('test-device-id')),
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
    cancelAllScheduledNotificationsAsync: jest.fn(() => {
      scheduled.length = 0;
      return Promise.resolve();
    }),
  };
}

beforeEach(() => {
  mockPost.mockReset();
  mockDelete.mockReset();
});

describe('offline-logout registration risk — fcm.deleteToken() as an independent safety net', () => {
  test('deleteToken() runs and succeeds even when the backend deregistration call fails — token is invalidated regardless of our API being reachable', async () => {
    const fcm = await import('../../services/fcmService');
    const deleteToken = jest.fn(() => Promise.resolve());
    fcm.__setFirebaseMessagingForTesting({ deleteToken });

    mockPost.mockRejectedValue(new Error('our backend is down'));
    mockDelete.mockRejectedValue(new Error('our backend is down'));

    const result = await fcm.unregisterFCMToken();

    expect(deleteToken).toHaveBeenCalledTimes(1); // Firebase-side invalidation happened
    expect(result).toBe(false); // honestly reports the backend half didn't fully succeed
  });

  test('a device fully offline (Firebase also unreachable) fails cleanly without throwing', async () => {
    const fcm = await import('../../services/fcmService');
    const deleteToken = jest.fn(() => Promise.reject(new Error('no connectivity at all')));
    fcm.__setFirebaseMessagingForTesting({ deleteToken });

    mockPost.mockRejectedValue(new Error('no connectivity at all'));
    mockDelete.mockRejectedValue(new Error('no connectivity at all'));

    const result = await fcm.unregisterFCMToken();

    expect(deleteToken).toHaveBeenCalledTimes(1);
    expect(result).toBe(false);
  });
});

describe('sign-out notification cleanup', () => {
  test('cancels every locally scheduled reminder across all categories on a normal (online) sign-out', async () => {
    const pn = await import('../../services/pushNotifications');
    const fcm = await import('../../services/fcmService');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleHydrationReminders([10, 14, 18]);
    await pn.scheduleStreakProtectionReminder(21);
    expect(fake.scheduled.length).toBeGreaterThan(0);

    mockPost.mockResolvedValue({ success: true });
    mockDelete.mockResolvedValue({ success: true });

    await fcm.deregisterAllPushChannels();

    expect(fake.scheduled.length).toBe(0);
  });

  test('still cancels every local reminder when the device is fully offline (all network calls reject)', async () => {
    const pn = await import('../../services/pushNotifications');
    const fcm = await import('../../services/fcmService');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleHydrationReminders([10, 14, 18]);
    await pn.scheduleActivityReminders([14, 17]);
    expect(fake.scheduled.length).toBeGreaterThan(0);

    mockPost.mockRejectedValue(new Error('offline'));
    mockDelete.mockRejectedValue(new Error('offline'));

    // Must not throw even though every network call fails.
    const result = await fcm.deregisterAllPushChannels();

    expect(fake.scheduled.length).toBe(0); // the critical guarantee: local cancellation is unconditional
    expect(result).toBe(false); // honestly reports the server-side part failed
  });

  test('local cancellation happens even if it is the very first thing that runs, before any network attempt resolves', async () => {
    const pn = await import('../../services/pushNotifications');
    const fcm = await import('../../services/fcmService');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.scheduleMoodCheckIn(20);
    expect(fake.scheduled.length).toBe(1);

    // Network calls hang until explicitly released — local cancellation
    // must not wait on either of them.
    let releasePost;
    let releaseDelete;
    mockPost.mockReturnValue(new Promise((resolve) => { releasePost = resolve; }));
    mockDelete.mockReturnValue(new Promise((resolve) => { releaseDelete = resolve; }));

    const pending = fcm.deregisterAllPushChannels();

    // Give microtasks a chance to run the synchronous-first cancellation step.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fake.scheduled.length).toBe(0);

    releasePost({ success: true });
    releaseDelete({ success: true });
    await pending;
  });
});
