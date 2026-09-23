/**
 * Regression coverage for the combined-count contradiction found 2026-09:
 * a previous report's own timelines listed 6 local notifications while
 * LOCAL_ALLOCATION only summed to 5 (streak_at_risk was scheduled locally
 * by default but never counted), and separately allowed a 7th backend send
 * on top — both silently exceeding the stated 6/day combined cap. This
 * pins LOCAL_ALLOCATION's sum and confirms syncAllNotificationSchedules
 * registers local ownership of streak_at_risk (bringing it into the same
 * ownership-exclusivity model as the other four categories, replacing
 * reliance on best-effort delivery-time dedup as the primary mechanism).
 *
 * Same mocking setup as ownershipRetry.test.js — see that file's header
 * for why deviceIdentity.js is mocked directly.
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
  mockPost.mockResolvedValue({ success: true });
});

describe('LOCAL_ALLOCATION — combined budget', () => {
  test('sums to exactly 6 (the full account-wide daily cap), including streak_at_risk', async () => {
    const pn = await import('../../services/pushNotifications');
    const total = Object.values(pn.LOCAL_ALLOCATION).reduce((a, b) => a + b, 0);
    expect(total).toBe(6);
    expect(pn.LOCAL_ALLOCATION[pn.NOTIFICATION_CATEGORIES.STREAK_AT_RISK]).toBe(1);
  });

  test('every OWNABLE local category has exactly one LOCAL_ALLOCATION entry: hydration=2, food/activity/mood/streak=1 each', async () => {
    const pn = await import('../../services/pushNotifications');
    expect(pn.LOCAL_ALLOCATION[pn.NOTIFICATION_CATEGORIES.HYDRATION_NUDGE]).toBe(2);
    expect(pn.LOCAL_ALLOCATION[pn.NOTIFICATION_CATEGORIES.DAILY_REMINDER]).toBe(1);
    expect(pn.LOCAL_ALLOCATION[pn.NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER]).toBe(1);
    expect(pn.LOCAL_ALLOCATION[pn.NOTIFICATION_CATEGORIES.MOOD_CHECKIN]).toBe(1);
    expect(pn.LOCAL_ALLOCATION[pn.NOTIFICATION_CATEGORIES.STREAK_AT_RISK]).toBe(1);
  });
});

describe('syncAllNotificationSchedules — streak_at_risk ownership registration (streak fallback overlap fix)', () => {
  test('registers local ownership of streak_at_risk on successful scheduling, same as the other four categories', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.syncAllNotificationSchedules({}, {});

    const ownershipCalls = mockPost.mock.calls.filter(([path]) => path === '/profile/notifications/ownership');
    const categoriesClaimedLocal = ownershipCalls
      .filter(([, body]) => body.owner === 'local')
      .map(([, body]) => body.category);

    expect(categoriesClaimedLocal).toEqual(
      expect.arrayContaining([
        pn.NOTIFICATION_CATEGORIES.HYDRATION_NUDGE,
        pn.NOTIFICATION_CATEGORIES.DAILY_REMINDER,
        pn.NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER,
        pn.NOTIFICATION_CATEGORIES.MOOD_CHECKIN,
        pn.NOTIFICATION_CATEGORIES.STREAK_AT_RISK,
      ])
    );
  });

  test('releases local ownership of streak_at_risk (back to "backend") when streakProtection is turned off', async () => {
    const pn = await import('../../services/pushNotifications');
    const fake = createFakeNotifications();
    pn.__setNotificationsClientForTesting(fake);

    await pn.syncAllNotificationSchedules({ streakProtection: false }, {});

    const releaseCall = mockPost.mock.calls.find(
      ([path, body]) => path === '/profile/notifications/ownership' && body.category === pn.NOTIFICATION_CATEGORIES.STREAK_AT_RISK
    );
    expect(releaseCall?.[1]?.owner).toBe('backend');
  });
});
