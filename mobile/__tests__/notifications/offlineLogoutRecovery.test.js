/**
 * Verifies the scoped-token deregistration mechanism: completing an
 * offline-at-sign-out cleanup AFTER the account session is gone, without
 * retaining any account credential. deviceIdentity is mocked for the same
 * reason as other files in this directory (expo-crypto's randomUUID isn't
 * implemented by this Jest project's stub).
 */
const mockPost = jest.fn();
jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: {
    post: (...args) => mockPost(...args),
    get: jest.fn(),
    delete: jest.fn(() => Promise.resolve({ success: true })),
  },
}));

let mockCachedToken = null;
jest.mock('../../services/deviceIdentity', () => ({
  __esModule: true,
  getOrCreateDeviceId: jest.fn(() => Promise.resolve('test-device-id')),
  getCachedDeregisterToken: jest.fn(() => Promise.resolve(mockCachedToken)),
  setCachedDeregisterToken: jest.fn((token) => { mockCachedToken = token; return Promise.resolve(); }),
  clearCachedDeregisterToken: jest.fn(() => { mockCachedToken = null; return Promise.resolve(); }),
  issueAndCacheDeregisterToken: jest.fn((deviceId) => {
    mockCachedToken = `issued-for-${deviceId}`;
    return Promise.resolve();
  }),
}));

beforeEach(() => {
  mockPost.mockReset();
  mockCachedToken = null;
});

describe('issuing and caching a cleanup token while online + authenticated', () => {
  test('a successful FCM registration issues and caches a deregister token', async () => {
    const fcm = await import('../../services/fcmService');
    mockPost.mockResolvedValueOnce({ success: true }); // /profile/devices/register

    await fcm.registerFCMTokenWithBackend('f'.repeat(150));

    expect(mockCachedToken).toBe('issued-for-test-device-id');
  });
});

describe('retryDeregistrationWithToken — works with zero account session', () => {
  test('no-ops immediately when nothing is cached (the common case)', async () => {
    const fcm = await import('../../services/fcmService');
    const result = await fcm.retryDeregistrationWithToken();
    expect(result).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  test('uses only the cached token — no deviceId, no auth header, no account context needed', async () => {
    const fcm = await import('../../services/fcmService');
    mockCachedToken = 'cached-scoped-token-xyz';

    mockPost.mockResolvedValueOnce({ success: true, removed: true });
    const result = await fcm.retryDeregistrationWithToken();

    expect(result).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/device-cleanup/deregister', { token: 'cached-scoped-token-xyz' });
    expect(mockCachedToken).toBeNull(); // cleared after a successful call
  });

  test('a token already consumed by an earlier attempt (removed: false) still clears the cache — idempotent', async () => {
    const fcm = await import('../../services/fcmService');
    mockCachedToken = 'already-used-token';

    mockPost.mockResolvedValueOnce({ success: true, removed: false });
    const result = await fcm.retryDeregistrationWithToken();

    expect(result).toBe(false);
    expect(mockCachedToken).toBeNull(); // nothing left to retry either way
  });

  test('a network failure leaves the token cached for the next reconnect attempt', async () => {
    const fcm = await import('../../services/fcmService');
    mockCachedToken = 'still-pending-token';

    mockPost.mockRejectedValueOnce(new Error('offline'));
    const result = await fcm.retryDeregistrationWithToken();

    expect(result).toBe(false);
    expect(mockCachedToken).toBe('still-pending-token'); // not cleared — still retryable
  });

  test('repeated calls are safe (idempotent) once the token has been consumed', async () => {
    const fcm = await import('../../services/fcmService');
    mockCachedToken = 'one-shot-token';

    mockPost.mockResolvedValueOnce({ success: true, removed: true });
    await fcm.retryDeregistrationWithToken();

    // Second call: nothing cached anymore, must be a clean no-op, not a
    // repeat network call with a stale token.
    const secondResult = await fcm.retryDeregistrationWithToken();
    expect(secondResult).toBe(false);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});

describe('a successful authenticated deregistration at sign-out clears the cached token too', () => {
  test('unregisterFCMToken clears the cached token on success — nothing left for a later retry to do', async () => {
    const fcm = await import('../../services/fcmService');
    fcm.__setFirebaseMessagingForTesting({ deleteToken: jest.fn(() => Promise.resolve()) });
    mockCachedToken = 'now-redundant-token';

    mockPost.mockResolvedValueOnce({ success: true }); // /profile/devices/deregister succeeds
    await fcm.unregisterFCMToken();

    expect(mockCachedToken).toBeNull();
  });
});
