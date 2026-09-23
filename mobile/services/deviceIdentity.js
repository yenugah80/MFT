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

/**
 * Cache for the narrow, single-purpose device-deregistration token issued
 * by POST /profile/devices/issue-deregister-token (see fcmService.js,
 * called on every successful push-token registration — i.e. while online
 * and authenticated, well before it's ever needed). This is what lets
 * sign-out clean up this device's server-side row even after the account
 * session is gone and offline at the moment of sign-out prevented the
 * normal authenticated deregistration from completing. It is deliberately
 * NOT a cached account session or API key — see devicesTable's
 * deregisterToken comment in backend/src/db/schema.js for the full
 * rationale (single action, single device, expires, single-use).
 *
 * A single global SecureStore key (not scoped per-account) is intentional
 * and safe: whichever account is active when this gets used, using it only
 * ever deletes the ONE row it was issued for — never anything belonging to
 * whichever account happens to be signed in (or signed out) at the moment
 * it's retried. The overwrite-on-every-reissue behavior means a fresh
 * account's own registration naturally replaces a previous account's
 * leftover token as soon as that fresh registration succeeds.
 */
const DEREGISTER_TOKEN_KEY = 'mft_device_deregister_token';

export async function getCachedDeregisterToken() {
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(DEREGISTER_TOKEN_KEY);
  } catch (error) {
    console.warn('[DeviceIdentity] Failed to read cached deregister token:', error?.message || error);
    return null;
  }
}

export async function setCachedDeregisterToken(token) {
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(DEREGISTER_TOKEN_KEY, token);
  } catch (error) {
    console.warn('[DeviceIdentity] Failed to cache deregister token:', error?.message || error);
  }
}

export async function clearCachedDeregisterToken() {
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(DEREGISTER_TOKEN_KEY);
  } catch (error) {
    console.warn('[DeviceIdentity] Failed to clear cached deregister token:', error?.message || error);
  }
}

/**
 * Fetches a fresh deregistration token for this device and caches it —
 * called after every successful FCM/Expo token registration (both
 * fcmService.js and pushNotifications.js import this, which is why it
 * lives here rather than in either of those: importing across those two
 * modules directly would be circular, since fcmService.js already imports
 * from pushNotifications.js for the sign-out cleanup flow).
 */
export async function issueAndCacheDeregisterToken(deviceId) {
  if (!deviceId) return;
  try {
    const apiClient = (await import('./apiClient')).default;
    const response = await apiClient.post('/profile/devices/issue-deregister-token', { deviceId });
    if (response?.success && response?.token) {
      await setCachedDeregisterToken(response.token);
    }
  } catch (error) {
    // Non-critical: the previously-cached token (if any) simply stays in
    // place until the next successful registration refreshes it.
    console.warn('[DeviceIdentity] Failed to issue/cache deregister token:', error?.message || error);
  }
}
