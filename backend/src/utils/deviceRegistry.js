/**
 * Per-device registration, dependency-injected on `db` for the same reason
 * as deliveryAck.js: profileController.js transitively imports server.js,
 * which calls app.listen() unconditionally at module scope, so anything
 * meant to be unit-testable needs to avoid that import chain entirely.
 *
 * Additive model: accountSettingsTable's single fcmToken/expoPushToken
 * columns are untouched and keep serving app builds that have never called
 * /profile/devices/register. A user is resolved as either all-legacy (zero
 * rows in `devices`) or all-per-device (>=1 row) — see resolveSendTargets.
 */
import { randomUUID } from 'node:crypto';
import { and, eq, gt, ne } from 'drizzle-orm';
import { devicesTable, notificationOwnershipTable } from '../db/schema.js';

const DEREGISTER_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function registerDevice(db, userId, { deviceId, fcmToken, expoPushToken, platform }) {
  if (!deviceId || typeof deviceId !== 'string') {
    throw new Error('registerDevice requires a string deviceId');
  }

  const now = new Date();
  const updateData = { lastSeenAt: now, updatedAt: now };
  if (fcmToken) {
    updateData.fcmToken = fcmToken;
    updateData.fcmTokenUpdatedAt = now;
  }
  if (expoPushToken) {
    updateData.expoPushToken = expoPushToken;
    updateData.expoPushTokenUpdatedAt = now;
  }
  if (platform) updateData.platform = platform;

  const [row] = await db
    .insert(devicesTable)
    .values({
      userId,
      deviceId,
      platform: platform || null,
      fcmToken: fcmToken || null,
      fcmTokenUpdatedAt: fcmToken ? now : null,
      expoPushToken: expoPushToken || null,
      expoPushTokenUpdatedAt: expoPushToken ? now : null,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [devicesTable.userId, devicesTable.deviceId],
      set: updateData,
    })
    .returning();

  // deviceId is a client-persisted UUID that survives an ordinary sign-out
  // (only account deletion clears it — see accountDeletion.js), so the same
  // physical device signing into a different account reuses the same
  // deviceId. The (userId, deviceId) composite key means that's a distinct
  // row, not an overwrite — if the PREVIOUS account's deregisterDevice call
  // never ran (predates this feature, or failed silently), its row and
  // token stay live indefinitely, sending that account's own reminders to
  // a device it no longer owns. Same backstop as savePushToken/
  // saveFCMToken: clear the matching token from any other row for this
  // exact deviceId, regardless of whether that account ever formally
  // deregisters.
  if (fcmToken) {
    await db
      .update(devicesTable)
      .set({ fcmToken: null, fcmTokenUpdatedAt: now, updatedAt: now })
      .where(and(eq(devicesTable.deviceId, deviceId), eq(devicesTable.fcmToken, fcmToken), ne(devicesTable.userId, userId)));
  }
  if (expoPushToken) {
    await db
      .update(devicesTable)
      .set({ expoPushToken: null, expoPushTokenUpdatedAt: now, updatedAt: now })
      .where(and(eq(devicesTable.deviceId, deviceId), eq(devicesTable.expoPushToken, expoPushToken), ne(devicesTable.userId, userId)));
  }

  return row;
}

export async function deregisterDevice(db, userId, deviceId) {
  if (!deviceId) return { removed: false };
  const deleted = await db
    .delete(devicesTable)
    .where(and(eq(devicesTable.userId, userId), eq(devicesTable.deviceId, deviceId)))
    .returning({ id: devicesTable.id });
  return { removed: deleted.length > 0 };
}

export async function getDevicesForUser(db, userId) {
  return db.select().from(devicesTable).where(eq(devicesTable.userId, userId));
}

/**
 * Issues a fresh, narrow, single-use cleanup credential for one device row
 * — called only while the caller IS authenticated (on every successful FCM/
 * Expo token registration; see fcmService.js/pushNotifications.js), so it's
 * already cached client-side by the time it might ever be needed without a
 * session. Overwrites any previous token for this device (only the latest
 * is ever valid — an old cached client copy simply stops working, which is
 * fine since the client refreshes its cached copy on every reissue too).
 */
export async function issueDeregisterToken(db, userId, deviceId) {
  const deviceRowId = await resolveDeviceRowId(db, userId, deviceId);
  if (!deviceRowId) return null;

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + DEREGISTER_TOKEN_TTL_MS);
  await db
    .update(devicesTable)
    .set({ deregisterToken: token, deregisterTokenExpiresAt: expiresAt })
    .where(eq(devicesTable.id, deviceRowId));

  return { token, expiresAt };
}

/**
 * Deletes a device row by its cleanup token alone — deliberately the ONLY
 * lookup key, with no userId/deviceId required, so this can run with zero
 * session of any kind. Possession of the (securely random, 122-bit) token
 * is the sole proof of authorization, the same trust model as a password-
 * reset or unsubscribe link. Expired or already-consumed (row already
 * deleted, or a newer token issued since) tokens simply match nothing —
 * this function never distinguishes "wrong token" from "already handled,"
 * both just report removed: false, so it can't be used to probe validity.
 */
export async function deregisterByToken(db, token) {
  if (!token || typeof token !== 'string') return { removed: false };
  const deleted = await db
    .delete(devicesTable)
    .where(and(eq(devicesTable.deregisterToken, token), gt(devicesTable.deregisterTokenExpiresAt, new Date())))
    .returning({ id: devicesTable.id });
  return { removed: deleted.length > 0 };
}

/**
 * Resolves the client's own deviceId string (from SecureStore) to the
 * numeric `devices.id` row for this user — used wherever a mobile request
 * carries the string form (ack, ownership registration) but the internal
 * model keys everything by the real row id.
 */
export async function resolveDeviceRowId(db, userId, deviceId) {
  if (!deviceId) return null;
  const [row] = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(and(eq(devicesTable.userId, userId), eq(devicesTable.deviceId, deviceId)));
  return row?.id ?? null;
}

/**
 * Wraps the legacy single-token accountSettingsTable shape into the same
 * device-like shape real rows have, so send-path code never needs two
 * branches for "does this user have a real device row or not."
 */
export function resolveLegacyPseudoDevice(accountSettingsRow) {
  if (!accountSettingsRow?.fcmToken && !accountSettingsRow?.expoPushToken) return null;
  return {
    id: null, // null id is the legacy-device marker throughout this feature
    userId: accountSettingsRow.userId,
    deviceId: null,
    platform: accountSettingsRow.fcmTokenPlatform || null,
    fcmToken: accountSettingsRow.fcmToken || null,
    expoPushToken: accountSettingsRow.expoPushToken || null,
  };
}

/**
 * Resolves the list of send targets for a user: real device rows if any
 * exist, otherwise the one legacy pseudo-device (or an empty array if the
 * user has neither).
 */
export async function resolveSendTargets(db, userId, accountSettingsRow) {
  const devices = await getDevicesForUser(db, userId);
  if (devices.length > 0) return devices;
  const legacy = resolveLegacyPseudoDevice(accountSettingsRow);
  return legacy ? [legacy] : [];
}

export async function getOwnedCategoriesForDevice(db, deviceId) {
  if (!deviceId) return new Set(); // legacy pseudo-devices never own anything
  const rows = await db
    .select({ category: notificationOwnershipTable.category, owner: notificationOwnershipTable.owner })
    .from(notificationOwnershipTable)
    .where(and(eq(notificationOwnershipTable.deviceId, deviceId), eq(notificationOwnershipTable.owner, 'local')));
  return new Set(rows.map((r) => r.category));
}

export async function setOwnership(db, deviceId, category, owner) {
  if (!deviceId || !category) throw new Error('setOwnership requires deviceId and category');
  await db
    .insert(notificationOwnershipTable)
    .values({ deviceId, category, owner, registeredAt: new Date() })
    .onConflictDoUpdate({
      target: [notificationOwnershipTable.deviceId, notificationOwnershipTable.category],
      set: { owner, registeredAt: new Date() },
    });
}
