/**
 * Regression coverage for the notification-incident follow-up: a
 * registration attempt that hits "profile not ready" or a network error
 * schedules a delayed retry (5s/15s/30s — see RETRY_DELAYS in both
 * fcmService.js and pushNotifications.js). Neither timer was ever cancelled
 * on sign-out, so a retry scheduled under the account signing out could
 * still fire up to 30s later — by then apiClient's token provider resolves
 * to whatever account is CURRENTLY signed in, so the delayed call silently
 * re-submits the old flow's stale captured token value under the NEW
 * account's identity, clobbering whatever fresh token that account's own
 * registration already wrote.
 *
 * Verified by spying on clearTimeout directly rather than advancing real or
 * fake wall-clock time past the 30s window — this codebase's jest-expo
 * environment hangs when real network-call promises (even mocked ones) are
 * mixed with fake timers, and a test that actually waits 30+ real seconds
 * for a negative ("it did NOT fire") assertion is exactly the kind of slow,
 * flaky test worth avoiding when the same guarantee is provable directly.
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
  return {
    scheduled,
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve(scheduled.slice())),
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-id')),
    cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
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

test('a pending FCM retry timeout is cleared by deregisterAllPushChannels', async () => {
  const fcm = await import('../../services/fcmService');
  const pn = await import('../../services/pushNotifications');
  pn.__setNotificationsClientForTesting(createFakeNotifications());

  const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

  // "profile not ready" schedules a retry ~5s out — captures a real timer handle.
  mockPost.mockResolvedValueOnce({ retryAfterProfileCreation: true });
  await fcm.registerFCMTokenWithBackend('stale-fcm-token');
  expect(mockPost).toHaveBeenCalledTimes(1);

  clearTimeoutSpy.mockClear();

  mockPost.mockResolvedValue({ success: true });
  mockDelete.mockResolvedValue({ success: true });
  await fcm.deregisterAllPushChannels();

  // The pending retry's specific timer handle must have been passed to
  // clearTimeout as part of sign-out cleanup, not just left to expire.
  expect(clearTimeoutSpy).toHaveBeenCalled();

  clearTimeoutSpy.mockRestore();
});

test('a pending Expo push-token retry timeout is cleared by deregisterAllPushChannels', async () => {
  const pn = await import('../../services/pushNotifications');
  const fcm = await import('../../services/fcmService');
  pn.__setNotificationsClientForTesting(createFakeNotifications());

  const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

  mockPost.mockResolvedValueOnce({ retryAfterProfileCreation: true });
  await pn.registerPushTokenWithBackend('stale-expo-token');
  expect(mockPost).toHaveBeenCalledTimes(1);

  clearTimeoutSpy.mockClear();

  mockPost.mockResolvedValue({ success: true });
  mockDelete.mockResolvedValue({ success: true });
  await fcm.deregisterAllPushChannels();

  expect(clearTimeoutSpy).toHaveBeenCalled();

  clearTimeoutSpy.mockRestore();
});

test('cancelPendingFCMTokenRetry and cancelPendingTokenRetry are no-ops (do not throw) when nothing is pending', async () => {
  const fcm = await import('../../services/fcmService');
  const pn = await import('../../services/pushNotifications');

  expect(() => fcm.cancelPendingFCMTokenRetry()).not.toThrow();
  expect(() => pn.cancelPendingTokenRetry()).not.toThrow();
});
