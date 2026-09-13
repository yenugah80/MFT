/**
 * Stable per-install device identity, used to scope push-token registration
 * and local-notification ownership to THIS physical device rather than the
 * account as a whole (see backend/src/utils/deviceRegistry.js). Generated
 * once and persisted in SecureStore, matching the project's existing
 * Crypto.randomUUID() convention for ids (hooks/useWaterLog.js etc.).
 *
 * expo-secure-store and expo-crypto are lazily imported inside the function
 * below, not at module scope — matching pushNotifications.js's own "lazy-
 * load all native modules to prevent import-time crashes" convention. A
 * top-level import here previously crashed the mobile "unit" Jest project
 * (its stripped RN environment has no native modules registered at all)
 * for every test that transitively imports pushNotifications.js, which
 * statically imports this module.
 *
 * Survives ordinary sign-out (SecureStore isn't touched by signOut() or by
 * any of the app's sign-out call sites — only full account deletion clears
 * it, via services/accountDeletion.js's AsyncStorage.multiRemove, which is
 * a different store). This is intentional: the SAME physical device should
 * keep the SAME identity across a logout/login-as-someone-else cycle, so
 * the backend's (userId, deviceId) composite key produces a fresh, fully
 * isolated device row for the new account rather than colliding with or
 * needing to clean up the previous account's row.
 *
 * A fresh install has no SecureStore data at all, so it naturally gets a
 * brand new id — exactly the desired "reinstall = new device, starts with
 * no local-ownership claims" behavior, with no extra handling required.
 */

const DEVICE_ID_KEY = 'mft_device_id';

let cachedDeviceId = null;

export async function getOrCreateDeviceId() {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const SecureStore = await import('expo-secure-store');
    const Crypto = await import('expo-crypto');

    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
    }
    cachedDeviceId = deviceId;
    return deviceId;
  } catch (error) {
    console.warn('[DeviceIdentity] Failed to read/persist device id:', error?.message || error);
    return null;
  }
}

// Testing-only escape hatch, matching the pattern already used in
// pushNotifications.js's __setNotificationsClientForTesting.
export function __resetDeviceIdCacheForTesting() {
  cachedDeviceId = null;
}
