/**
 * Verifies item 1 from the device-model review: a failed ownership claim
 * or release must not be lost — it has to converge once connectivity
 * returns, without the user re-toggling anything. Local scheduling itself
 * must never depend on this succeeding.
 *
 * deviceIdentity.js is mocked directly (a plain, statically-imported
 * module — unlike expo-notifications' dynamic import, jest.mock() works
 * fine here) because this Jest project's expo-crypto stub doesn't
 * implement randomUUID(), so the real getOrCreateDeviceId() always fails
 * here with "Invalid value provided to SecureStore" — a test-environment
 * gap, not a production behavior. Mocking it out keeps this file testing
 * the actual retry/queue logic instead of that unrelated stub gap.
 */
const mockPost = jest.fn();
jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: {
    post: (...args) => mockPost(...args),
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
  };
}

beforeEach(() => {
  mockPost.mockReset();
});

describe('ownership retry convergence', () => {
  test('a failed claim is retried and succeeds once connectivity returns, without any manual re-toggle', async () => {
    const pn = await import('../../services/pushNotifications');
    pn.__resetPendingOwnershipForTesting();

    mockPost.mockRejectedValueOnce(new Error('network unreachable'));
    const firstAttempt = await pn.registerLocalOwnership('hydration_nudge', 'local');
    expect(firstAttempt).toBe(false);

    // Simulate connectivity returning: retryPendingOwnership is called with
    // no further action from the user (no toggle, no re-schedule).
    mockPost.mockResolvedValueOnce({ success: true });
    const result = await pn.retryPendingOwnership();

    expect(result.retried).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenLastCalledWith('/profile/notifications/ownership', expect.objectContaining({ category: 'hydration_nudge', owner: 'local' }));
  });

  test('a category that keeps failing stays queued and is retried again on the next reconnect', async () => {
    const pn = await import('../../services/pushNotifications');
    pn.__resetPendingOwnershipForTesting();

    mockPost.mockRejectedValue(new Error('still down'));
    await pn.registerLocalOwnership('mood_checkin', 'local');

    const firstRetry = await pn.retryPendingOwnership();
    expect(firstRetry).toEqual({ retried: 1, succeeded: 0 });

    // Still queued — a second reconnect retries it again.
    mockPost.mockResolvedValueOnce({ success: true });
    const secondRetry = await pn.retryPendingOwnership();
    expect(secondRetry).toEqual({ retried: 1, succeeded: 1 });

    // Now converged — a third retry call is a true no-op (no network call at all).
    mockPost.mockClear();
    const thirdRetry = await pn.retryPendingOwnership();
    expect(thirdRetry).toEqual({ retried: 0, succeeded: 0 });
    expect(mockPost).not.toHaveBeenCalled();
  });

  test('a later call for the same category overwrites the queued intent rather than replaying a stale one', async () => {
    const pn = await import('../../services/pushNotifications');
    pn.__resetPendingOwnershipForTesting();

    mockPost.mockRejectedValueOnce(new Error('down'));
    await pn.registerLocalOwnership('activity_reminder', 'local'); // fails, queued as 'local'

    mockPost.mockRejectedValueOnce(new Error('still down'));
    await pn.registerLocalOwnership('activity_reminder', 'backend'); // user disabled it before the retry ever ran — queued as 'backend'

    mockPost.mockResolvedValueOnce({ success: true });
    await pn.retryPendingOwnership();

    // The retry must have sent the LATEST desired state ('backend'), not the stale first one ('local').
    expect(mockPost).toHaveBeenLastCalledWith('/profile/notifications/ownership', expect.objectContaining({ category: 'activity_reminder', owner: 'backend' }));
  });

  test('local scheduling succeeds regardless of the ownership call outcome — never gated on it', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);
    pn.__resetPendingOwnershipForTesting();

    mockPost.mockRejectedValue(new Error('backend unreachable'));

    const ids = await pn.scheduleHydrationReminders([10, 15]);

    expect(ids.length).toBe(2);
    expect(fake.scheduled.length).toBe(2);
  });
});
