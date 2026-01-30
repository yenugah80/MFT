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
import { NOTIFICATION_CATEGORIES } from '../constants/notificationTypes';

// Re-export for backward compatibility
export { NOTIFICATION_CATEGORIES };

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

// Track pending retry for token registration
let tokenRetryTimeout = null;
let pendingToken = null;

/**
 * Register push token with the backend
 * @param {string} token - The Expo push token
 * @param {number} retryCount - Current retry attempt (internal use)
 */
export async function registerPushTokenWithBackend(token, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

  try {
    const response = await apiClient.post('/profile/push-token', {
      expoPushToken: token,
    });

    if (response.success) {
      console.log('[PushNotifications] Token registered with backend');
      pendingToken = null;
      return true;
    }

    // Handle 202 response (profile not ready yet)
    if (response.retryAfterProfileCreation) {
      console.log('[PushNotifications] Profile not ready, scheduling retry');
      pendingToken = token;

      if (retryCount < MAX_RETRIES) {
        // Clear any existing retry
        if (tokenRetryTimeout) {
          clearTimeout(tokenRetryTimeout);
        }

        // Schedule retry
        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        tokenRetryTimeout = setTimeout(() => {
          console.log(`[PushNotifications] Retrying token registration (attempt ${retryCount + 2})`);
          registerPushTokenWithBackend(token, retryCount + 1);
        }, delay);
      }
      return false;
    }

    return false;
  } catch (error) {
    // Use console.warn to avoid red error screen in development
    // Push token registration failure is non-critical
    console.warn('[PushNotifications] Failed to register token (non-critical):', error?.message || error);

    // Retry on network errors
    if (retryCount < MAX_RETRIES && (error?.message?.includes('Network') || error?.message?.includes('timeout'))) {
      pendingToken = token;
      const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      tokenRetryTimeout = setTimeout(() => {
        registerPushTokenWithBackend(token, retryCount + 1);
      }, delay);
    }

    return false;
  }
}

/**
 * Manually trigger token registration retry (e.g., after profile creation)
 */
export async function retryPendingTokenRegistration() {
  if (pendingToken) {
    console.log('[PushNotifications] Manually retrying pending token registration');
    return registerPushTokenWithBackend(pendingToken, 0);
  }
  return false;
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

    // Set up notification categories for action buttons (iOS & Android)
    try {
      await setupNotificationCategories();
    } catch (categoryError) {
      console.warn('[PushNotifications] Failed to setup notification categories:', categoryError);
    }

    // Set up Android notification channels
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
 * Set up notification action categories
 * Allows interactive buttons on notifications (Log now, Snooze, etc.)
 */
async function setupNotificationCategories() {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot setup categories - module not available');
    return;
  }

  try {
    // Daily reminder category - Log now or Snooze
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.DAILY_REMINDER, [
      {
        identifier: 'LOG_NOW',
        buttonTitle: 'Log now',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE_30',
        buttonTitle: 'Snooze 30m',
        options: { opensAppToForeground: false },
      },
    ]);

    // Hydration category
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE, [
      {
        identifier: 'LOG_WATER',
        buttonTitle: 'Log water',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE_30',
        buttonTitle: 'Later',
        options: { opensAppToForeground: false },
      },
    ]);

    // Streak at risk category - urgent actions
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.STREAK_AT_RISK, [
      {
        identifier: 'LOG_NOW',
        buttonTitle: 'Save streak',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'DISMISS',
        buttonTitle: 'Dismiss',
        options: { opensAppToForeground: false },
      },
    ]);

    // Activity reminder category
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER, [
      {
        identifier: 'LOG_ACTIVITY',
        buttonTitle: 'Log activity',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE_60',
        buttonTitle: 'Remind in 1h',
        options: { opensAppToForeground: false },
      },
    ]);

    // Mood check-in category
    await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORIES.MOOD_CHECKIN, [
      {
        identifier: 'LOG_MOOD',
        buttonTitle: 'Check in',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE_30',
        buttonTitle: 'Later',
        options: { opensAppToForeground: false },
      },
    ]);

    console.log('[PushNotifications] Notification categories configured');
  } catch (error) {
    console.warn('[PushNotifications] Error setting up notification categories:', error);
  }
}

/**
 * Set up Android notification channels
 * Creates channels for all notification types with appropriate priorities
 */
async function setupAndroidNotificationChannels() {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot setup channels - module not available');
    return;
  }

  try {
    // Default channel - high priority
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6B4EFF',
    });

    // Daily meal reminders - high priority
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily Reminders',
      description: 'Meal logging reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#6B4EFF',
    });

    // Hydration nudges - default priority
    await Notifications.setNotificationChannelAsync('hydration', {
      name: 'Hydration Nudges',
      description: 'Water intake reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: '#3B82F6',
    });

    // Activity reminders - default priority
    await Notifications.setNotificationChannelAsync('activity', {
      name: 'Activity Reminders',
      description: 'Movement and exercise nudges',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: '#10B981',
    });

    // Mood check-ins - default priority
    await Notifications.setNotificationChannelAsync('mood', {
      name: 'Mood Check-ins',
      description: 'Evening mood reflection prompts',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: '#8B5CF6',
    });

    // Streak protection - HIGH priority (urgent)
    await Notifications.setNotificationChannelAsync('streak', {
      name: 'Streak Alerts',
      description: 'Streak at risk warnings',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 100, 250],
      lightColor: '#EF4444',
    });

    // Insights & achievements - default priority
    await Notifications.setNotificationChannelAsync('insights', {
      name: 'Insights & Achievements',
      description: 'Pattern insights and celebrations',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#F59E0B',
    });

    console.log('[PushNotifications] Android notification channels configured');
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
 * Schedule activity reminder notifications
 * Nudges users to move at optimal times based on their patterns
 * @param {number[]} hours - Array of hours to remind (default: afternoon/evening)
 */
export async function scheduleActivityReminders(hours = [14, 17]) {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot schedule - module not available');
    return [];
  }

  try {
    await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER);

    const identifiers = [];
    const messages = [
      { title: 'Move break', body: 'A quick walk does wonders. Your body will thank you.' },
      { title: 'Stretch time', body: "Been sitting a while? Let's get those steps in." },
      { title: 'Activity check', body: 'How about a short walk? Even 10 minutes helps.' },
    ];

    for (let i = 0; i < hours.length; i++) {
      const msg = messages[i % messages.length];
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
          data: {
            category: NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER,
            screen: 'activity',
          },
          categoryIdentifier: NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER,
        },
        trigger: {
          hour: hours[i],
          minute: 0,
          repeats: true,
        },
      });
      identifiers.push(identifier);
    }

    console.log('[PushNotifications] Activity reminders scheduled:', identifiers);
    return identifiers;
  } catch (error) {
    console.warn('[PushNotifications] Failed to schedule activity reminders:', error?.message || error);
    return [];
  }
}

/**
 * Schedule mood check-in reminder notifications
 * Encourages users to reflect on their mood at optimal times
 * @param {number} hour - Hour of day for mood check-in (default: 8pm)
 */
export async function scheduleMoodCheckIn(hour = 20) {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot schedule - module not available');
    return null;
  }

  try {
    await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.MOOD_CHECKIN);

    const messages = [
      { title: 'How are you feeling?', body: 'Take a moment to check in with yourself.' },
      { title: 'Quick mood check', body: 'A few seconds of reflection goes a long way.' },
      { title: 'Evening check-in', body: "How's your energy? Let's track it." },
    ];

    // Rotate messages based on day of week
    const dayOfWeek = new Date().getDay();
    const msg = messages[dayOfWeek % messages.length];

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        data: {
          category: NOTIFICATION_CATEGORIES.MOOD_CHECKIN,
          screen: 'mood',
        },
        categoryIdentifier: NOTIFICATION_CATEGORIES.MOOD_CHECKIN,
      },
      trigger: {
        hour,
        minute: 0,
        repeats: true,
      },
    });

    console.log('[PushNotifications] Mood check-in scheduled:', identifier);
    return identifier;
  } catch (error) {
    console.warn('[PushNotifications] Failed to schedule mood check-in:', error?.message || error);
    return null;
  }
}

/**
 * Schedule streak protection reminder
 * Fires in the evening if user hasn't logged anything that day
 * @param {number} hour - Hour to check (default: 9pm)
 */
export async function scheduleStreakProtectionReminder(hour = 21) {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot schedule - module not available');
    return null;
  }

  try {
    await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.STREAK_AT_RISK);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your streak is at risk',
        body: "Log something quick to keep your streak alive. Don't lose your momentum!",
        data: {
          category: NOTIFICATION_CATEGORIES.STREAK_AT_RISK,
          screen: 'log',
          priority: 'high',
        },
        categoryIdentifier: NOTIFICATION_CATEGORIES.STREAK_AT_RISK,
      },
      trigger: {
        hour,
        minute: 0,
        repeats: true,
      },
    });

    console.log('[PushNotifications] Streak protection reminder scheduled:', identifier);
    return identifier;
  } catch (error) {
    console.warn('[PushNotifications] Failed to schedule streak protection:', error?.message || error);
    return null;
  }
}

/**
 * Sync all notification schedules based on user preferences
 * Call this when preferences change or on app launch
 * @param {object} preferences - User notification preferences
 * @param {object} optimalTimes - Optimal times from smart notification engine
 */
export async function syncAllNotificationSchedules(preferences = {}, optimalTimes = {}) {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot sync - module not available');
    return { scheduled: [], cancelled: [] };
  }

  const scheduled = [];
  const cancelled = [];

  try {
    // Daily meal reminder
    if (preferences.dailyReminder !== false) {
      const mealHour = optimalTimes.meals?.[0] || 12;
      const id = await scheduleDailyReminder(mealHour, 0);
      if (id) scheduled.push({ type: 'daily_reminder', hour: mealHour });
    } else {
      await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.DAILY_REMINDER);
      cancelled.push('daily_reminder');
    }

    // Hydration reminders
    if (preferences.hydrationNudges !== false) {
      const hydrationHours = optimalTimes.hydration?.length > 0
        ? optimalTimes.hydration
        : [10, 14, 18];
      const ids = await scheduleHydrationReminders(hydrationHours);
      if (ids.length) scheduled.push({ type: 'hydration', hours: hydrationHours });
    } else {
      await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE);
      cancelled.push('hydration');
    }

    // Activity reminders
    if (preferences.activityReminders !== false) {
      const activityHours = optimalTimes.activity?.length > 0
        ? optimalTimes.activity
        : [14, 17];
      const ids = await scheduleActivityReminders(activityHours);
      if (ids.length) scheduled.push({ type: 'activity', hours: activityHours });
    } else {
      await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER);
      cancelled.push('activity');
    }

    // Mood check-in
    if (preferences.moodCheckins !== false) {
      const moodHour = optimalTimes.mood || 20;
      const id = await scheduleMoodCheckIn(moodHour);
      if (id) scheduled.push({ type: 'mood', hour: moodHour });
    } else {
      await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.MOOD_CHECKIN);
      cancelled.push('mood');
    }

    // Streak protection (always on if user has a streak)
    if (preferences.streakProtection !== false) {
      const streakHour = 21;
      const id = await scheduleStreakProtectionReminder(streakHour);
      if (id) scheduled.push({ type: 'streak_protection', hour: streakHour });
    } else {
      await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.STREAK_AT_RISK);
      cancelled.push('streak_protection');
    }

    console.log('[PushNotifications] Sync complete:', { scheduled: scheduled.length, cancelled: cancelled.length });
    return { scheduled, cancelled };
  } catch (error) {
    console.warn('[PushNotifications] Sync failed:', error?.message || error);
    return { scheduled, cancelled, error: error.message };
  }
}

/**
 * Get all currently scheduled notifications
 * Useful for debugging and displaying to user
 */
export async function getScheduledNotifications() {
  if (!Notifications) {
    return [];
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.map(n => ({
      id: n.identifier,
      title: n.content.title,
      body: n.content.body,
      category: n.content.data?.category,
      screen: n.content.data?.screen,
      trigger: n.trigger,
    }));
  } catch (error) {
    console.warn('[PushNotifications] Failed to get scheduled notifications:', error?.message || error);
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
 * Smart cancellation: Cancel streak protection notification when user logs food
 * Call this after successful food/water/activity logging
 */
export async function cancelStreakProtectionIfLoggedToday() {
  try {
    await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.STREAK_AT_RISK);
    console.log('[PushNotifications] Streak protection cancelled - user logged today');
  } catch (error) {
    console.warn('[PushNotifications] Failed to cancel streak protection:', error?.message || error);
  }
}

/**
 * Smart cancellation: Cancel hydration reminders when goal is reached
 * @param {number} currentMl - Current water intake in ml
 * @param {number} goalMl - Daily water goal in ml
 */
export async function cancelHydrationIfGoalReached(currentMl, goalMl) {
  if (currentMl >= goalMl) {
    try {
      await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE);
      console.log('[PushNotifications] Hydration reminders cancelled - goal reached');
    } catch (error) {
      console.warn('[PushNotifications] Failed to cancel hydration reminders:', error?.message || error);
    }
  }
}

/**
 * Re-schedule notifications for the next day
 * Call this at midnight or when app resumes after midnight
 */
export async function resetDailyNotifications(preferences = {}, optimalTimes = {}) {
  // Re-enable streak protection for new day
  if (preferences.streakProtection !== false) {
    await scheduleStreakProtectionReminder(21);
  }

  // Re-schedule hydration reminders
  if (preferences.hydrationNudges !== false) {
    const hydrationHours = optimalTimes.hydration?.length > 0
      ? optimalTimes.hydration
      : [10, 14, 18];
    await scheduleHydrationReminders(hydrationHours);
  }

  console.log('[PushNotifications] Daily notifications reset');
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
