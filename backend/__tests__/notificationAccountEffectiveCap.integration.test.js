/**
 * Real-Postgres integration coverage for getAccountEffectiveDailyCap
 * (backend/src/utils/deviceRegistry.js) — the multi-device accounting path
 * that account-level send functions (nutrientDeficitJob.js,
 * predictionLearningService.js, gamificationRewardService.js) use instead
 * of a single device's own cap.
 *
 * This connects to a REAL local Postgres directly (bypassing jest.setup.js's
 * hardcoded fake DATABASE_URL, the same way this session's disposable probe
 * scripts have throughout) — the functions under test are dependency-
 * injected on `db` specifically so they're testable this way without
 * importing server.js's app.listen()-on-import chain. Requires local
 * Postgres reachable at postgres://<user>@localhost:5432/mft_dev with the
 * schema migrated (see backend/README or CLAUDE.md's db:migrate).
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import {
  profilesTable,
  devicesTable,
  notificationOwnershipTable,
} from '../src/db/schema.js';
import { getAccountEffectiveDailyCap, setOwnership } from '../src/utils/deviceRegistry.js';
import { NOTIFICATION_POLICY } from '../src/utils/notificationPolicy.js';

const USER = 'itest_account_cap_user';
let client;
let db;

beforeAll(async () => {
  process.env.TZ = 'UTC';
  client = postgres('postgres://harikay@localhost:5432/mft_dev');
  db = drizzle(client);
  await db.insert(profilesTable).values({ userId: USER, fullName: 'Integration Test User' }).onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(devicesTable).where(eq(devicesTable.userId, USER));
  await db.delete(profilesTable).where(eq(profilesTable.userId, USER));
  await client.end();
});

beforeEach(async () => {
  await db.delete(devicesTable).where(eq(devicesTable.userId, USER));
});

describe('getAccountEffectiveDailyCap — two devices with different local ownership', () => {
  test('a user with zero real device rows gets the flat, unreduced cap', async () => {
    const cap = await getAccountEffectiveDailyCap(db, USER, null, NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY);
    expect(cap).toBe(6);
  });

  test('two devices, one owning nothing and one owning everything — the account cap is the MOST RESTRICTIVE (0), not an average or the looser device', async () => {
    const [deviceA] = await db.insert(devicesTable).values({
      userId: USER, deviceId: 'device-a', platform: 'ios',
    }).returning({ id: devicesTable.id });
    const [deviceB] = await db.insert(devicesTable).values({
      userId: USER, deviceId: 'device-b', platform: 'android',
    }).returning({ id: devicesTable.id });

    // Device A owns nothing locally (full backend cap available: 6).
    // Device B owns all five categories locally (backend cap: 0).
    for (const category of ['hydration_nudge', 'daily_reminder', 'activity_reminder', 'mood_checkin', 'streak_at_risk']) {
      await setOwnership(db, deviceB.id, category, 'local');
    }

    const cap = await getAccountEffectiveDailyCap(db, USER, null, NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY);
    // An account-level send (no specific deviceId) reaches BOTH devices at
    // once — sending up to 6 would exceed device B's already-exhausted
    // local budget the instant it arrives there, so the account-wide cap
    // must be governed by the device with the LEAST room, not device A's.
    expect(cap).toBe(0);

    void deviceA; // referenced for setup symmetry/clarity only
  });

  test('two devices with partial, different ownership — cap reflects the smaller remainder', async () => {
    const [deviceA] = await db.insert(devicesTable).values({
      userId: USER, deviceId: 'device-a', platform: 'ios',
    }).returning({ id: devicesTable.id });
    const [deviceB] = await db.insert(devicesTable).values({
      userId: USER, deviceId: 'device-b', platform: 'android',
    }).returning({ id: devicesTable.id });

    // Device A owns only hydration (claims 2) — effective cap 4.
    await setOwnership(db, deviceA.id, 'hydration_nudge', 'local');
    // Device B owns hydration + mood + activity (claims 2+1+1=4) — effective cap 2.
    await setOwnership(db, deviceB.id, 'hydration_nudge', 'local');
    await setOwnership(db, deviceB.id, 'mood_checkin', 'local');
    await setOwnership(db, deviceB.id, 'activity_reminder', 'local');

    const cap = await getAccountEffectiveDailyCap(db, USER, null, NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY);
    expect(cap).toBe(2); // min(4, 2)
  });

  test('a legacy pseudo-device (no real device rows) never contributes ownership — only real devices count', async () => {
    // No devicesTable rows inserted for this user in this test — resolveSendTargets
    // would fall back to a legacy pseudo-device if given an accountSettingsRow
    // with a token, but getAccountEffectiveDailyCap explicitly filters those
    // out (device.id !== null) before computing caps.
    const cap = await getAccountEffectiveDailyCap(
      db, USER,
      { userId: USER, fcmToken: 'legacy-token', expoPushToken: null },
      NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY
    );
    expect(cap).toBe(6);
  });
});
