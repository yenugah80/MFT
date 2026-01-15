/**
 * Push Notifications Service
 * Handles Expo push notification registration, permissions, and scheduling
 *
 * Features:
 * - Permission request with graceful degradation
 * - Push token registration with backend
 * - Local notification scheduling for reminders
 * - Notification category handling
 * - Works in development environments without full native builds
 */

import { Platform } from 'react-native';
import apiClient from './apiClient';

// Lazy-load all native modules to prevent import-time crashes
let Device = null;
let Constants = null;
let Notifications = null;
let NativeModulesFailed = {};

// Helper to safely load native modules
async function loadNativeModules() {
  // Load expo-device
  try {
    Device = await import('expo-device');
  } catch (error) {
    NativeModulesFailed['expo-device'] = error.message;
    console.warn('[PushNotifications] expo-device not available:', error.message);
    Device = { isDevice: false }; // Stub
  }

  // Load expo-constants
  try {
    Constants = await import('expo-constants');
  } catch (error) {
    NativeModulesFailed['expo-constants'] = error.message;
    console.warn('[PushNotifications] expo-constants not available:', error.message);
    Constants = { expoConfig: {} }; // Stub
  }

  // Load expo-notifications
  try {
    Notifications = await import('expo-notifications');

    // Configure notification handler
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (err) {
      console.warn('[PushNotifications] Could not set handler:', err.message);
    }
  } catch (error) {
    NativeModulesFailed['expo-notifications'] = error.message;
    console.warn('[PushNotifications] expo-notifications not available:', error.message);
    Notifications = null; // Will be checked before use
  }
}

// Load modules in background without blocking
loadNativeModules().catch(err => {
  console.warn('[PushNotifications] Error loading native modules:', err.message);
});

/**
 * Notification categories for different reminder types
 */
export const NOTIFICATION_CATEGORIES = {
  DAILY_REMINDER: 'daily_reminder',
  HYDRATION_NUDGE: 'hydration_nudge',
  INSIGHT_DROP: 'insight_drop',
  STREAK_CELEBRATION: 'streak_celebration',
  GOAL_ACHIEVED: 'goal_achieved',
};

/**
 * Check if push notifications are available on this device
 */
export async function isPushNotificationsAvailable() {
  if (!Notifications) {
    return false;
  }

  if (!Device?.isDevice) {
    console.log('[PushNotifications] Not a physical device - push not available');
    return false;
  }

  if (Platform.OS === 'web') {
    return false;
  }

  return true;
}

/**
 * Get current notification permission status
 * @returns {'granted' | 'denied' | 'undetermined'}
 */
export async function getNotificationPermissionStatus() {
  if (!Notifications) {
    return 'undetermined';
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    console.warn('[PushNotifications] Could not get permission status:', error.message);
    return 'undetermined';
  }
}

/**
 * Request notification permissions from the user
 * @returns {boolean} Whether permissions were granted
 */
export async function requestNotificationPermissions() {
  if (!Notifications) {
    console.warn('[PushNotifications] Notifications module not available');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted');
      return false;
    }

    console.log('[PushNotifications] Permission granted');
    return true;
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Error requesting permissions:', error?.message || error);
    return false;
  }
}

/**
 * Get the Expo push token for this device
 * @returns {string | null} The push token or null if unavailable
 */
export async function getExpoPushToken() {
  try {
    // Check device capability
    if (!await isPushNotificationsAvailable()) {
      return null;
    }

    if (!Notifications) {
      console.warn('[PushNotifications] Notifications module not available');
      return null;
    }

    // Get project ID from constants
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.warn('[PushNotifications] No project ID found in app config');
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      console.log('[PushNotifications] Got token:', tokenData.data);
      return tokenData.data;
    } catch (nativeError) {
      // Handle native module not found gracefully
      if (nativeError.message?.includes('ExpoPushTokenManager') || nativeError.message?.includes('Cannot find native module')) {
        console.warn('[PushNotifications] Native push module not available - running in development?');
        return null;
      }
      throw nativeError;
    }
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Error getting push token:', error?.message || error);
    return null;
  }
}

/**
 * Register push token with the backend
 * @param {string} token - The Expo push token
 */
export async function registerPushTokenWithBackend(token) {
  try {
    const response = await apiClient.post('/profile/push-token', {
      expoPushToken: token,
    });

    if (response.success) {
      console.log('[PushNotifications] Token registered with backend');
      return true;
    }

    // Handle 202 response (profile not ready yet)
    if (response.retryAfterProfileCreation) {
      console.log('[PushNotifications] Profile not ready, will retry later');
      return false;
    }

    return false;
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    // Push token registration failure is non-critical
    console.warn('[PushNotifications] Failed to register token (non-critical):', error?.message || error);
    return false;
  }
}

/**
 * Remove push token from backend (e.g., on logout)
 */
export async function unregisterPushToken() {
  try {
    await apiClient.delete('/profile/push-token');
    console.log('[PushNotifications] Token unregistered from backend');
    return true;
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Failed to unregister token:', error?.message || error);
    return false;
  }
}

/**
 * Full push notification setup flow
 * Call this after user authentication
 * @returns {{ success: boolean, token: string | null, permissionStatus: string }}
 */
export async function setupPushNotifications() {
  const result = {
    success: false,
    token: null,
    permissionStatus: 'undetermined',
  };

  try {
    // Check availability
    if (!await isPushNotificationsAvailable()) {
      result.permissionStatus = 'unavailable';
      return result;
    }

    // Request permissions
    const permissionGranted = await requestNotificationPermissions();
    result.permissionStatus = permissionGranted ? 'granted' : 'denied';

    if (!permissionGranted) {
      return result;
    }

    // Get push token - may be null if native module unavailable
    const token = await getExpoPushToken();
    if (!token) {
      console.log('[PushNotifications] Push token unavailable (expected in dev)');
      result.permissionStatus = permissionGranted ? 'granted' : 'denied';
      return result;
    }

    result.token = token;

    // Register with backend
    const registered = await registerPushTokenWithBackend(token);
    result.success = registered;

    // Set up Android notification channel - also handle gracefully
    if (Platform.OS === 'android') {
      try {
        await setupAndroidNotificationChannels();
      } catch (channelError) {
        console.warn('[PushNotifications] Failed to setup Android notification channels:', channelError);
      }
    }

    return result;
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Setup error:', error?.message || error);
    return result;
  }
}

/**
 * Set up Android notification channels
 */
async function setupAndroidNotificationChannels() {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot setup channels - module not available');
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6B4EFF',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#6B4EFF',
    });

    await Notifications.setNotificationChannelAsync('hydration', {
      name: 'Hydration Nudges',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: '#3B82F6',
    });

    await Notifications.setNotificationChannelAsync('insights', {
      name: 'Insights & Achievements',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#10B981',
    });
  } catch (error) {
    console.warn('[PushNotifications] Error setting up Android notification channels:', error);
  }
}

// ============== Local Notification Scheduling ==============

/**
 * Schedule a daily reminder notification
 * @param {number} hour - Hour of day (0-23)
 * @param {number} minute - Minute (0-59)
 */
export async function scheduleDailyReminder(hour = 12, minute = 0) {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot schedule - module not available');
    return null;
  }

  try {
    await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.DAILY_REMINDER);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🍽️ Time to log your meal!',
        body: 'Keep your streak going - log what you ate today.',
        data: { category: NOTIFICATION_CATEGORIES.DAILY_REMINDER },
        categoryIdentifier: NOTIFICATION_CATEGORIES.DAILY_REMINDER,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    console.log('[PushNotifications] Daily reminder scheduled:', identifier);
    return identifier;
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Failed to schedule daily reminder:', error?.message || error);
    return null;
  }
}

/**
 * Schedule hydration reminder notifications
 * @param {number[]} hours - Array of hours to remind (e.g., [10, 14, 18])
 */
export async function scheduleHydrationReminders(hours = [10, 14, 18]) {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot schedule - module not available');
    return [];
  }

  try {
    await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE);

    const identifiers = [];
    const messages = [
      '💧 Stay hydrated! Time for some water.',
      '🥤 How about a water break?',
      '💦 Keep sipping! Your body will thank you.',
    ];

    for (let i = 0; i < hours.length; i++) {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hydration Reminder',
          body: messages[i % messages.length],
          data: { category: NOTIFICATION_CATEGORIES.HYDRATION_NUDGE },
          categoryIdentifier: NOTIFICATION_CATEGORIES.HYDRATION_NUDGE,
        },
        trigger: {
          hour: hours[i],
          minute: 0,
          repeats: true,
        },
      });
      identifiers.push(identifier);
    }

    console.log('[PushNotifications] Hydration reminders scheduled:', identifiers);
    return identifiers;
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Failed to schedule hydration reminders:', error?.message || error);
    return [];
  }
}

/**
 * Cancel scheduled notifications by category
 * @param {string} category - The notification category to cancel
 */
export async function cancelScheduledNotifications(category) {
  if (!Notifications) {
    return;
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(
      (n) => n.content.data?.category === category
    );

    for (const notification of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    console.log(`[PushNotifications] Cancelled ${toCancel.length} ${category} notifications`);
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Failed to cancel notifications:', error?.message || error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications() {
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[PushNotifications] All scheduled notifications cancelled');
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Failed to cancel all notifications:', error?.message || error);
  }
}

/**
 * Show an immediate local notification
 * @param {object} options - Notification options
 */
export async function showLocalNotification({ title, body, data = {} }) {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot show notification - module not available');
    return null;
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Immediate
    });
    return identifier;
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Failed to show local notification:', error?.message || error);
    return null;
  }
}

/**
 * Get the badge count
 */
export async function getBadgeCount() {
  if (!Notifications) {
    return 0;
  }

  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    return 0;
  }
}

/**
 * Set the badge count
 * @param {number} count
 */
export async function setBadgeCount(count) {
  if (!Notifications) {
    return;
  }

  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    console.warn('[PushNotifications] Failed to set badge count:', error?.message || error);
  }
}

/**
 * Clear the badge count
 */
export async function clearBadgeCount() {
  await setBadgeCount(0);
}

// Export notification event listeners for use in components
export const addNotificationReceivedListener = (callback) => {
  if (!Notifications || typeof Notifications.addNotificationReceivedListener !== 'function') {
    console.warn('[PushNotifications] addNotificationReceivedListener not available');
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseReceivedListener = (callback) => {
  if (!Notifications || typeof Notifications.addNotificationResponseReceivedListener !== 'function') {
    console.warn('[PushNotifications] addNotificationResponseReceivedListener not available');
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(callback);
};
