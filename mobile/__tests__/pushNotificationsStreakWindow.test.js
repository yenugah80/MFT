/**
 * Regression coverage for a real bug: streak-protection reminders used a
 * single repeating trigger, and cancelling it to suppress "tonight's"
 * reminder (because the user already logged) removed EVERY future
 * occurrence too — the very feature meant to work without opening the app
 * would permanently stop firing until the user happened to reopen it.
 *
 * Fix (services/pushNotifications.js): a rolling window of individually-
 * identified, non-repeating triggers (one per upcoming day, tagged with a
 * localDateKey), so cancelling "today" leaves every other day intact. This
 * was later generalized to all 5 local reminder categories (not just
 * streak), both to close the same bug class everywhere and to let
 * applyRemoteDeliveryDedup cancel "today" for any category the backend
 * confirms it already delivered — the cross-system dedup mechanism.
 *
 * These tests cover localDateKey and windowDaysFor — the two pieces of that
 * fix most prone to a subtle, high-impact bug (a timezone/midnight-boundary
 * error, exactly the class this project has shipped before per CLAUDE.md's
 * TZ note; and a notification-budget miscalculation, which is exactly what
 * caught a real near-miss during this work — a uniform 7-day window across
 * all 5 categories computes to 63 of iOS's 64-notification cap, one slot of
 * margin with no room for the moment old+new entries briefly coexist during
 * a top-up). The scheduling orchestration itself (scheduleRollingWindow's
 * skip-already-scheduled loop, cancelTodayForCategory's full-day lookup,
 * cancelNextOccurrenceForCategory's soonest-slot lookup, and
 * applyRemoteDeliveryDedup's fetch-and-cancel) is NOT covered by an
 * automated test here: pushNotifications.js dynamically `await import()`s
 * expo-notifications at runtime (deliberately, to avoid import-time crashes
 * when the native module is unavailable), and that dynamic import cannot be
 * reliably intercepted by jest.mock() under this project's babel-jest/CJS
 * setup (confirmed: every attempt fails with "Unexpected import statement in
 * CJS module", a Babel/Jest interop limitation, not a defect in the source
 * under test). That logic is consequently verified by code review only —
 * flagging explicitly rather than skipping silently.
 */

import { NOTIFICATION_CATEGORIES } from '../constants/notificationTypes';

describe('localDateKey', () => {
  test('formats using local calendar components, not UTC', async () => {
    const { localDateKey } = await import('../services/pushNotifications');
    // 2026-03-01 23:30 local time — a UTC slice of this instant could land on
    // 2026-03-02 in a negative-UTC-offset zone. Constructing via local
    // year/month/day args (not an ISO string) keeps this test's own
    // expectation independent of the machine's actual timezone.
    const date = new Date(2026, 2, 1, 23, 30); // month is 0-indexed: 2 = March
    expect(localDateKey(date)).toBe('2026-03-01');
  });

  test('pads single-digit month and day', async () => {
    const { localDateKey } = await import('../services/pushNotifications');
    const date = new Date(2026, 0, 5); // Jan 5
    expect(localDateKey(date)).toBe('2026-01-05');
  });

  test('handles a leap-day date correctly', async () => {
    const { localDateKey } = await import('../services/pushNotifications');
    const date = new Date(2028, 1, 29); // Feb 29, 2028 (leap year)
    expect(localDateKey(date)).toBe('2028-02-29');
  });

  test('handles a year boundary correctly', async () => {
    const { localDateKey } = await import('../services/pushNotifications');
    const date = new Date(2026, 11, 31, 23, 59);
    expect(localDateKey(date)).toBe('2026-12-31');
  });

  test('two Date instances on the same local day produce the same key regardless of time', async () => {
    const { localDateKey } = await import('../services/pushNotifications');
    const morning = new Date(2026, 5, 15, 0, 1);
    const night = new Date(2026, 5, 15, 23, 58);
    expect(localDateKey(morning)).toBe(localDateKey(night));
  });
});

describe('windowDaysFor — notification budget', () => {
  test('streak protection gets the full 7-day window', async () => {
    const { windowDaysFor } = await import('../services/pushNotifications');
    expect(windowDaysFor(NOTIFICATION_CATEGORIES.STREAK_AT_RISK)).toBe(7);
  });

  test('worst-case total pending notifications stays safely under the iOS 64 cap', async () => {
    const { windowDaysFor } = await import('../services/pushNotifications');
    // Only streak protection uses a rolling window (reconsidered after
    // initially generalizing all 5 — see the code comment above
    // REMINDER_WINDOW_DAYS for the full reasoning: cross-system dedup for
    // the other 4 doesn't need per-day granularity, and giving it up would
    // have cost those categories their unconditional offline durability for
    // no real benefit). Daily/hydration/activity/mood are ordinary permanent
    // repeating triggers — a fixed, small number of entries regardless of
    // how many days pass, not multiplied by a window.
    const permanentTriggerSlots = 1 /* daily */ + 3 /* hydration, server-capped */ +
      3 /* activity, server-capped */ + 1 /* mood */;
    const streakWindowSlots = 1 * windowDaysFor(NOTIFICATION_CATEGORIES.STREAK_AT_RISK);
    const worstCaseTotal = permanentTriggerSlots + streakWindowSlots;

    expect(worstCaseTotal).toBe(15);
    expect(worstCaseTotal).toBeLessThan(64);
  });
});
