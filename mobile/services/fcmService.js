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

/**
 * Register FCM token with backend
 * @param {string} token - The FCM device token
 */
export async function registerFCMTokenWithBackend(token) {
  if (!token) return false;

  try {
    const response = await apiClient.post('/profile/fcm-token', {
      fcmToken: token,
      platform: Platform.OS,
    });

    if (response.success) {
      console.log('[FCM] Token registered with backend');
      return true;
    }

    // Handle retry scenario (profile not ready)
    if (response.retryAfterProfileCreation) {
      console.log('[FCM] Profile not ready, will retry later');
      return false;
    }

    return false;
  } catch (error) {
    console.warn('[FCM] Token registration failed:', error?.message || error);
    return false;
  }
}

/**
 * Unregister FCM token (call on logout)
 */
export async function unregisterFCMToken() {
  const fcm = await loadFirebaseMessaging();

  try {
    // Delete token from Firebase
    if (fcm) {
      await fcm.deleteToken();
      console.log('[FCM] Token deleted from Firebase');
    }

    // Remove from backend
    await apiClient.delete('/profile/fcm-token');
    console.log('[FCM] Token removed from backend');

    return true;
  } catch (error) {
    console.warn('[FCM] Failed to unregister token:', error?.message || error);
    return false;
  }
}

/**
 * Set up FCM message handlers
 * @param {Function} onForegroundMessage - Handler for messages when app is in foreground
 * @returns {object} - Cleanup functions for listeners
 */
export async function setupFCMListeners(onForegroundMessage) {
  const fcm = await loadFirebaseMessaging();
  if (!fcm) {
    return {
      foreground: { remove: () => {} },
      tokenRefresh: { remove: () => {} },
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

  // Check if app was opened from a notification
  const initialNotification = await fcm.getInitialNotification();
  if (initialNotification) {
    console.log('[FCM] App opened from notification:', initialNotification.notification?.title);
    // You can handle navigation here based on initialNotification.data
  }

  // Handle notification that opened the app from background
  fcm.onNotificationOpenedApp((remoteMessage) => {
    console.log('[FCM] Notification opened app from background:', remoteMessage.notification?.title);
    // You can handle navigation here based on remoteMessage.data
  });

  fcmInitialized = true;

  return {
    foreground: { remove: unsubscribeForeground },
    tokenRefresh: { remove: unsubscribeTokenRefresh },
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
  unregisterFCMToken,
  setupFCMListeners,
  setBackgroundMessageHandler,
  setupFCM,
  isFCMInitialized,
};
