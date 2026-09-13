/**
 * Verifies the preference-persistence redesign: a preference save that
 * fails must survive app termination (not just live in an in-memory ref,
 * which the pre-fix implementation used), retry automatically on the next
 * launch/reconnect, and never leak across an account switch on the same
 * physical device.
 *
 * AsyncStorage is the project's real official mock (jest.setup.js), an
 * actual in-memory store — not a stub — so this exercises real read/write/
 * remove behavior, not mocked-away assertions.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockPost = jest.fn();
const mockDelete = jest.fn(() => Promise.resolve({ success: true }));
jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: {
    post: (...args) => mockPost(...args),
    get: jest.fn(),
    delete: (...args) => mockDelete(...args),
  },
}));

beforeEach(async () => {
  mockPost.mockReset();
  mockDelete.mockClear();
  await AsyncStorage.clear();
});

describe('preference persistence — survives app termination', () => {
  test('a failed save is persisted to AsyncStorage, not just held in memory', async () => {
    const pn = await import('../../services/pushNotifications');
    pn.__resetPendingPreferencesForTesting();

    mockPost.mockRejectedValueOnce(new Error('offline'));
    const result = await pn.savePreferencesToBackend({ hydrationNudges: false });
    expect(result).toBe(false);

    const raw = await AsyncStorage.getItem('mft_pending_notification_preferences');
    expect(JSON.parse(raw)).toEqual({ hydrationNudges: false });
  });

  test('simulating app termination: a fresh module load still finds the pending save and retries it', async () => {
    // Persist a pending save exactly as a failed savePreferencesToBackend would.
    await AsyncStorage.setItem('mft_pending_notification_preferences', JSON.stringify({ moodCheckins: false }));

    // Fresh in-memory cache — this is what "app relaunch" looks like for
    // this module: no memory of the failure, only what's on disk.
    const pn = await import('../../services/pushNotifications');
    pn.__resetPendingPreferencesForTesting();

    const pending = await pn.getPendingPreferences();
    expect(pending).toEqual({ moodCheckins: false });

    mockPost.mockResolvedValueOnce({ success: true });
    const retried = await pn.retryPendingPreferenceSave();
    expect(retried).toBe(true);
    expect(mockPost).toHaveBeenCalledWith('/profile/notifications', { notifications: { moodCheckins: false } });

    const rawAfter = await AsyncStorage.getItem('mft_pending_notification_preferences');
    expect(rawAfter).toBeNull(); // cleared once the retry succeeds
  });

  test('a successful save clears the pending record — nothing left to retry', async () => {
    const pn = await import('../../services/pushNotifications');
    pn.__resetPendingPreferencesForTesting();

    mockPost.mockResolvedValueOnce({ success: true });
    await pn.savePreferencesToBackend({ activityReminders: true });

    expect(await pn.getPendingPreferences()).toBeNull();
    const retried = await pn.retryPendingPreferenceSave();
    expect(retried).toBe(false); // nothing pending, no network call made
    expect(mockPost).toHaveBeenCalledTimes(1); // only the original save
  });
});

describe('preference persistence — cannot leak across an account switch on the same device', () => {
  test('clearPendingPreferencesForSignOut removes the record so the next account never sees it', async () => {
    const pn = await import('../../services/pushNotifications');
    pn.__resetPendingPreferencesForTesting();

    mockPost.mockRejectedValueOnce(new Error('offline at sign-out'));
    await pn.savePreferencesToBackend({ hydrationNudges: false }); // account A's unsent change

    expect(await pn.getPendingPreferences()).toEqual({ hydrationNudges: false });

    await pn.clearPendingPreferencesForSignOut();

    expect(await pn.getPendingPreferences()).toBeNull();
    const raw = await AsyncStorage.getItem('mft_pending_notification_preferences');
    expect(raw).toBeNull();
  });

  test('sign-out attempts one last save before discarding — a brief reconnect right at sign-out still saves it', async () => {
    const fcm = await import('../../services/fcmService');
    const pn = await import('../../services/pushNotifications');
    pn.__resetPendingPreferencesForTesting();
    fcm.__setFirebaseMessagingForTesting({ deleteToken: jest.fn(() => Promise.resolve()) });

    mockPost.mockRejectedValueOnce(new Error('offline earlier'));
    await pn.savePreferencesToBackend({ dailyReminder: false });
    expect(await pn.getPendingPreferences()).toEqual({ dailyReminder: false });

    // Connectivity is back by the time sign-out actually runs.
    mockPost.mockResolvedValue({ success: true });

    await fcm.deregisterAllPushChannels();

    expect(await pn.getPendingPreferences()).toBeNull();
    expect(mockPost).toHaveBeenCalledWith('/profile/notifications', { notifications: { dailyReminder: false } });
  });
});
