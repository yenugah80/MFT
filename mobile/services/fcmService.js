/**
 * Firebase Cloud Messaging Service
 * Handles FCM token retrieval and server-triggered notifications
 *
 * This module works alongside expo-notifications for:
 * - FCM: Server-triggered push notifications
 * - Expo: Local scheduled notifications (reminders, hydration)
 */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import apiClient from './apiClient';
import {
  getOrCreateDeviceId,
  getCachedDeregisterToken,
  clearCachedDeregisterToken,
  issueAndCacheDeregisterToken,
} from './deviceIdentity';
import {
  unregisterPushToken,
  cancelAllScheduledNotifications,
  retryPendingPreferenceSave,
  clearPendingPreferencesForSignOut,
} from './pushNotifications';

let messaging = null;
let firebaseApp = null;
let fcmInitialized = false;

/**
 * Check if running on a physical device (not simulator/emulator)
 * FCM requires a physical device for push notifications
 */
function isPhysicalDevice() {
  return Device.isDevice;
}

// Testing-only escape hatch, matching pushNotifications.js's
// __setNotificationsClientForTesting: @react-native-firebase/messaging is a
// native module loaded via dynamic import, which Jest cannot intercept via
// jest.mock() (confirmed this session across multiple approaches), and
// isPhysicalDevice() is always false under Jest anyway (no real device).
// Directly assigning the module-level `messaging` variable sidesteps both.
export function __setFirebaseMessagingForTesting(mockMessaging) {
  messaging = mockMessaging;
}

/**
 * Lazily load Firebase messaging to prevent import-time crashes
 * in development or when native modules aren't available
 */
async function loadFirebaseMessaging() {
  if (messaging !== null) return messaging;

  // Skip FCM on simulators/emulators - they don't support push notifications
  if (!isPhysicalDevice()) {
    console.log('[FCM] Skipping - running on simulator/emulator');
    return null;
  }

  try {
    const firebaseAppModule = await import('@react-native-firebase/app');
    const firebaseMessagingModule = await import('@react-native-firebase/messaging');

    firebaseApp = firebaseAppModule.default;
    messaging = firebaseMessagingModule.default();

    console.log('[FCM] Firebase messaging loaded successfully');
    return messaging;
  } catch (error) {
    console.warn('[FCM] Firebase messaging not available:', error.message);
    return null;
  }
}

/**
 * Check if FCM is available on this device
 */
export async function isFCMAvailable() {
  const fcm = await loadFirebaseMessaging();
  return fcm !== null;
}

/**
 * Request FCM notification permissions (iOS)
 * Android auto-grants by default for Android < 13
 * Android 13+ requires POST_NOTIFICATIONS permission
 */
export async function requestFCMPermission() {
  const fcm = await loadFirebaseMessaging();
  if (!fcm) return false;

  try {
    const authStatus = await fcm.requestPermission();
    const enabled =
      authStatus === 1 || // AUTHORIZED
      authStatus === 2;   // PROVISIONAL

    console.log('[FCM] Permission status:', enabled ? 'granted' : 'denied', `(${authStatus})`);
    return enabled;
  } catch (error) {
    console.warn('[FCM] Permission request failed:', error.message);
    return false;
  }
}

/**
 * Check current FCM permission status without prompting
 */
export async function checkFCMPermission() {
  const fcm = await loadFirebaseMessaging();
  if (!fcm) return 'unavailable';

  try {
    const authStatus = await fcm.hasPermission();
    if (authStatus === 1) return 'granted';
    if (authStatus === 2) return 'provisional';
    if (authStatus === 0) return 'denied';
    return 'undetermined';
  } catch (error) {
    console.warn('[FCM] Permission check failed:', error.message);
    return 'unavailable';
  }
}

/**
 * Get the FCM device token
 * This token is different from Expo push tokens
 */
export async function getFCMToken() {
  const fcm = await loadFirebaseMessaging();
  if (!fcm) return null;

  try {
    // Ensure permissions first
    const hasPermission = await requestFCMPermission();
    if (!hasPermission) {
      console.log('[FCM] No permission - cannot get token');
      return null;
    }

    const token = await fcm.getToken();
    console.log('[FCM] Token retrieved:', token?.substring(0, 30) + '...');
    return token;
  } catch (error) {
    console.warn('[FCM] Failed to get token:', error.message);
    return null;
  }
}

// Track pending retry for FCM token registration — mirrors the Expo push
// token retry pattern in pushNotifications.js. Without this, a single
// transient failure (network blip, backend cold start, profile not yet
// created) permanently drops the token: NotificationProvider only calls
// setupFCM() once per sign-in (gated on !fcmStatus.initialized, which gets
// set to true even on failure), so nothing else was ever retrying this.
let fcmTokenRetryTimeout = null;
let pendingFCMToken = null;

/**
 * Register FCM token with backend, scoped to this specific device.
 * @param {string} token - The FCM device token
 * @param {number} retryCount - Current retry attempt (internal use)
 */
export async function registerFCMTokenWithBackend(token, retryCount = 0) {
  if (!token) return false;

  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

  try {
    const deviceId = await getOrCreateDeviceId();
    // deviceId can only fail to resolve if SecureStore itself is broken —
    // fall back to the legacy account-wide endpoint rather than dropping
    // the token registration entirely.
    const response = deviceId
      ? await apiClient.post('/profile/devices/register', {
          deviceId,
          fcmToken: token,
          platform: Platform.OS,
        })
      : await apiClient.post('/profile/fcm-token', {
          fcmToken: token,
          platform: Platform.OS,
        });

    if (response.success) {
      console.log('[FCM] Token registered with backend');
      pendingFCMToken = null;
      // Refresh the cached cleanup token while we're online and
      // authenticated — this is what makes offline-at-sign-out recovery
      // possible later, when neither of those will be true anymore.
      if (deviceId) issueAndCacheDeregisterToken(deviceId).catch(() => {});
      return true;
    }

    // Handle retry scenario (profile not ready)
    if (response.retryAfterProfileCreation) {
      console.log('[FCM] Profile not ready, scheduling retry');
      pendingFCMToken = token;

      if (retryCount < MAX_RETRIES) {
        if (fcmTokenRetryTimeout) clearTimeout(fcmTokenRetryTimeout);
        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        fcmTokenRetryTimeout = setTimeout(() => {
          registerFCMTokenWithBackend(token, retryCount + 1);
        }, delay);
      }
      return false;
    }

    return false;
  } catch (error) {
    console.warn('[FCM] Token registration failed:', error?.message || error);

    if (retryCount < MAX_RETRIES) {
      pendingFCMToken = token;
      const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      fcmTokenRetryTimeout = setTimeout(() => {
        registerFCMTokenWithBackend(token, retryCount + 1);
      }, delay);
    }

    return false;
  }
}

/**
 * Manually trigger FCM token registration retry (e.g. after profile creation)
 */
export async function retryPendingFCMTokenRegistration() {
  if (pendingFCMToken) {
    return registerFCMTokenWithBackend(pendingFCMToken, 0);
  }
  return false;
}

/**
 * Unregister FCM token (call on logout) — deregisters THIS device's row so
 * a different account signing into the same physical phone next doesn't
 * share a still-live device row with the account that just signed out.
 * Without this, both accounts would resolve to the same underlying
 * Firebase installation token, and the signed-out account's event-driven
 * notifications (goal-achieved, insight-drop, etc.) could still reach the
 * new account's screen.
 *
 * Three independent safety nets, in order, each covering a different
 * offline scenario:
 *
 * 1. `fcm.deleteToken()` runs FIRST, unconditionally — this talks to
 *    Firebase directly, not our backend. It actively invalidates the old
 *    token at the source: any later send attempt against it (from ANY
 *    path, including a stale server-side row this function never reached)
 *    fails with `messaging/registration-token-not-registered`, which the
 *    existing shouldRemove cleanup already handles. This succeeds whenever
 *    the device has ANY general connectivity, independent of whether OUR
 *    backend specifically is reachable — covering the common case of "our
 *    API is briefly down/slow" without needing our own retry logic at all.
 * 2. Best-effort backend deregistration (two quick attempts — a brief blip
 *    shouldn't permanently strand a stale row) removes the device row
 *    outright, using the still-live account session.
 * 3. If both of those fail — the device was fully offline (no connectivity
 *    at all, not just "our API is down") at the exact moment of sign-out —
 *    retryDeregistrationWithToken() below picks this up later, once
 *    connectivity returns, using a narrow single-purpose token cached
 *    while still authenticated (see deviceIdentity.js's
 *    issueAndCacheDeregisterToken), specifically because retrying steps 1
 *    or 2 at that point is impossible: there is no session left to
 *    authenticate a normal deregistration call, and deliberately no
 *    account credential of any kind is kept around to work around that —
 *    the token can only ever delete this one already-identified row.
 *
 * Local reminders are cancelled regardless of any of this
 * (deregisterAllPushChannels calls cancelAllScheduledNotificationsAsync
 * first and unconditionally, before any of these run) — none of these
 * three steps affect local reminders, only event-driven and reminder
 * pushes the BACKEND might otherwise still route to this device.
 */
export async function unregisterFCMToken() {
  const fcm = await loadFirebaseMessaging();

  try {
    // Delete token from Firebase
    if (fcm) {
      await fcm.deleteToken();
      console.log('[FCM] Token deleted from Firebase');
    }

    // Remove this device's registration from the backend — one quick retry
    // for a brief connectivity blip, no more (see docstring above).
    const deviceId = await getOrCreateDeviceId();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (deviceId) {
          await apiClient.post('/profile/devices/deregister', { deviceId });
        } else {
          // Fallback for the (should-be-rare) case SecureStore couldn't
          // resolve a device id — clears the legacy account-wide column so
          // there's at least no stale live token left behind.
          await apiClient.delete('/profile/fcm-token');
        }
        console.log('[FCM] Token removed from backend');
        // The row this token was scoped to is already gone — clear it so a
        // later reconnect doesn't waste a call on an already-handled token.
        if (deviceId) await clearCachedDeregisterToken();
        return true;
      } catch (attemptError) {
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          throw attemptError;
        }
      }
    }

    return true;
  } catch (error) {
    console.warn('[FCM] Failed to unregister token from backend (device is likely offline; local reminders are already cancelled regardless):', error?.message || error);
    return false;
  }
}

/**
 * Completes an offline-at-sign-out deregistration that unregisterFCMToken
 * couldn't finish — called with NO account session at all, which is exactly
 * why it can't just retry unregisterFCMToken's own authenticated call.
 * Wired into NotificationProvider's reconnect/foreground listeners, which
 * stay mounted regardless of sign-in state (NotificationProvider sits above
 * the auth gate in app/_layout.jsx), so this actually runs even while
 * sitting on the sign-in screen post-logout — not just after signing back
 * in. No-ops immediately if nothing is cached (the common case: either
 * nothing ever failed, or a previous run of this already cleared it).
 *
 * Idempotent by construction: the backend's deregister-by-token endpoint
 * treats "already deleted," "expired," and "wrong token" identically
 * (removed: false, never an error), so calling this repeatedly — e.g. on
 * every reconnect while sitting signed-out for a while — is always safe.
 */
export async function retryDeregistrationWithToken() {
  const token = await getCachedDeregisterToken();
  if (!token) return false;

  try {
    const response = await apiClient.post('/device-cleanup/deregister', { token });
    if (response?.success) {
      // removed:true means we just cleaned it up; removed:false means it
      // was already handled some other way (e.g. the account signed back
      // in and refreshed this same row). Either way, this token has
      // nothing left to do.
      await clearCachedDeregisterToken();
      return response.removed === true;
    }
    return false;
  } catch (error) {
    console.warn('[FCM] Failed to retry token-based deregistration (will try again on next reconnect):', error?.message || error);
    return false;
  }
}

/**
 * Full sign-out notification cleanup, called from every sign-out site right
 * before signOut() itself. Two genuinely different guarantees, in a
 * specific order:
 *
 * 1. Cancel every locally scheduled notification FIRST, synchronously and
 *    unconditionally. This is what actually protects a second account
 *    signing into this same physical device next from seeing the first
 *    account's hydration/meal/mood/activity/streak reminders — it needs
 *    zero connectivity and must never be skipped or reordered after the
 *    network calls below, including when this whole function is invoked
 *    while offline. Without this, a device switching accounts would keep
 *    firing the PREVIOUS account's local reminders indefinitely, since
 *    nothing else in the app ever calls cancelAllScheduledNotifications.
 * 2. Best-effort server deregistration (unregisterFCMToken covers the new
 *    per-device model's whole row; unregisterPushToken clears the legacy
 *    account-wide Expo column, harmless for pre-device-model installs).
 *    This part can fail if offline at the moment of sign-out — see
 *    unregisterFCMToken's docstring for why that residual risk is bounded
 *    and self-healing rather than something this function can fully
 *    guarantee. Never throws either way: a failed deregistration must not
 *    block sign-out.
 * 3. One last attempt at any still-pending preference save (see
 *    pushNotifications.js's retryPendingPreferenceSave), then discard it
 *    regardless of whether that attempt succeeded. It cannot be retried
 *    after this point the way ownership/token registration can, because
 *    retrying would need to authenticate as the account that just signed
 *    out — and it must not be left sitting in storage either, since that
 *    storage key isn't scoped per-account: a different person signing into
 *    this same physical device would otherwise inherit this account's
 *    unsent preference change on their own next sync. A genuinely offline
 *    sign-out with a pending save queued means that specific toggle is
 *    lost — recoverable by re-toggling after signing back in, which is a
 *    minor inconvenience next to the alternative of leaking one account's
 *    preference into another's.
 */
export async function deregisterAllPushChannels() {
  await cancelAllScheduledNotifications().catch(() => {});

  const results = await Promise.allSettled([unregisterFCMToken(), unregisterPushToken()]);

  await retryPendingPreferenceSave().catch(() => {});
  await clearPendingPreferencesForSignOut().catch(() => {});

  return results.every((r) => r.status === 'fulfilled' && r.value === true);
}

/**
 * Set up FCM message handlers
 * @param {Function} onForegroundMessage - Handler for messages when app is in foreground
 * @param {Function} onColdStart - Handler for when app was opened from killed state via notification
 * @param {Function} onBackgroundToForeground - Handler for when app comes from background via notification
 * @returns {object} - Cleanup functions for listeners
 */
export async function setupFCMListeners(onForegroundMessage, onColdStart, onBackgroundToForeground) {
  const fcm = await loadFirebaseMessaging();
  if (!fcm) {
    return {
      foreground: { remove: () => {} },
      tokenRefresh: { remove: () => {} },
      backgroundOpen: { remove: () => {} },
    };
  }

  // Foreground message handler - app is open and visible
  const unsubscribeForeground = fcm.onMessage(async (remoteMessage) => {
    console.log('[FCM] Foreground message received:', remoteMessage.notification?.title);

    if (onForegroundMessage) {
      onForegroundMessage({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: remoteMessage.data,
      });
    }
  });

  // Token refresh handler - Firebase may rotate tokens
  const unsubscribeTokenRefresh = fcm.onTokenRefresh(async (newToken) => {
    console.log('[FCM] Token refreshed, re-registering...');
    await registerFCMTokenWithBackend(newToken);
  });

  // Check if app was opened from a notification (cold start)
  const initialNotification = await fcm.getInitialNotification();
  if (initialNotification) {
    console.log('[FCM] App opened from notification (cold start):', initialNotification.notification?.title);
    if (onColdStart) {
      onColdStart(initialNotification);
    }
  }

  // Handle notification that opened the app from background
  const unsubscribeBackgroundOpen = fcm.onNotificationOpenedApp((remoteMessage) => {
    console.log('[FCM] Notification opened app from background:', remoteMessage.notification?.title);
    if (onBackgroundToForeground) {
      onBackgroundToForeground(remoteMessage);
    }
  });

  fcmInitialized = true;

  return {
    foreground: { remove: unsubscribeForeground },
    tokenRefresh: { remove: unsubscribeTokenRefresh },
    backgroundOpen: { remove: unsubscribeBackgroundOpen },
  };
}

/**
 * Set up background message handler
 * IMPORTANT: This must be called outside of any component, at the app entry level
 * Typically in index.js or _layout.jsx before the app renders
 */
export async function setBackgroundMessageHandler(handler) {
  const fcm = await loadFirebaseMessaging();
  if (!fcm) return;

  fcm.setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM] Background message received:', remoteMessage.notification?.title);
    if (handler) {
      handler(remoteMessage);
    }
  });
}

/**
 * Full FCM setup flow
 * Call this after user signs in
 */
export async function setupFCM() {
  const result = {
    success: false,
    token: null,
    permissionStatus: 'undetermined',
    error: null,
  };

  try {
    // Check if FCM is available
    const available = await isFCMAvailable();
    if (!available) {
      result.permissionStatus = 'unavailable';
      result.error = 'FCM not available on this device';
      return result;
    }

    // Request permissions
    const hasPermission = await requestFCMPermission();
    result.permissionStatus = hasPermission ? 'granted' : 'denied';

    if (!hasPermission) {
      result.error = 'Permission denied';
      return result;
    }

    // Get FCM token
    const token = await getFCMToken();
    if (!token) {
      result.error = 'Failed to get FCM token';
      return result;
    }
    result.token = token;

    // Register with backend
    const registered = await registerFCMTokenWithBackend(token);
    result.success = registered;

    if (!registered) {
      result.error = 'Failed to register token with backend';
    }

    return result;
  } catch (error) {
    console.warn('[FCM] Setup failed:', error.message);
    result.error = error.message;
    return result;
  }
}

/**
 * Get FCM initialization status
 */
export function isFCMInitialized() {
  return fcmInitialized;
}

export default {
  isFCMAvailable,
  requestFCMPermission,
  checkFCMPermission,
  getFCMToken,
  registerFCMTokenWithBackend,
  retryPendingFCMTokenRegistration,
  unregisterFCMToken,
  retryDeregistrationWithToken,
  setupFCMListeners,
  setBackgroundMessageHandler,
  setupFCM,
  isFCMInitialized,
};
