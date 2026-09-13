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
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';
import { NOTIFICATION_CATEGORIES } from '../constants/notificationTypes';
import { getOrCreateDeviceId } from './deviceIdentity';

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

// Testing-only escape hatch. The dynamic `await import('expo-notifications')`
// above cannot be reliably intercepted by jest.mock() under this project's
// babel-jest setup — confirmed empirically across every approach tried
// (with/without `{virtual: true}`, jest-expo's own default native-module
// mocks, and both the "unit" and "components" jest projects): all fail
// identically with "Unexpected import statement in CJS module", a
// Babel/Jest interop limitation specific to this dynamic-import pattern, not
// something fixable by test configuration. This sidesteps the import
// machinery entirely by letting a test set the module's own lazily-loaded
// client directly, since every exported function below reads `Notifications`
// via closure over this module-level binding. Never called from production
// code — the dynamic import above is what always sets it there.
export function __setNotificationsClientForTesting(client) {
  Notifications = client;
}

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

      console.log('[PushNotifications] Got token:', tokenData.data.substring(0, 20) + '...');
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
 * Register push token with the backend, scoped to this specific device.
 * Same /profile/devices/register endpoint fcmService.js's FCM registration
 * uses — each call only supplies the field it has (fcmToken here is
 * omitted), so calling both from two independent flows merges onto the
 * same device row rather than clobbering the other token.
 * @param {string} token - The Expo push token
 * @param {number} retryCount - Current retry attempt (internal use)
 */
export async function registerPushTokenWithBackend(token, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

  try {
    const deviceId = await getOrCreateDeviceId();
    const response = deviceId
      ? await apiClient.post('/profile/devices/register', {
          deviceId,
          expoPushToken: token,
          platform: Platform.OS,
        })
      : await apiClient.post('/profile/push-token', {
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

// Serializes cancel+schedule sequences per category. Without this, two
// near-simultaneous callers (e.g. a preference toggle POST resolving at the
// same moment an AppState foreground triggers a daily reset) can each read
// "all scheduled notifications" before the other's cancel has landed, then
// both schedule fresh ones — producing duplicate recurring notifications for
// the same category that persist until manually cleared.
const categoryLocks = new Map();

function withCategoryLock(category, fn) {
  const previous = categoryLocks.get(category) || Promise.resolve();
  const next = previous.then(fn, fn);
  categoryLocks.set(category, next.catch(() => {}));
  return next;
}

// Only streak protection uses a rolling window (see scheduleRollingWindow).
// The other 4 categories (daily/hydration/activity/mood) use plain,
// permanent repeating triggers — deliberately reverted back to that design
// after initially generalizing all 5 to rolling windows and reconsidering:
// cross-system dedup for those four only ever matters when the device has
// connectivity anyway (the backend can't send while offline, so there is
// nothing to duplicate against), and that overlap is already handled by the
// ack+background-handler mechanism (mobile/app/_layout.jsx) regardless of
// whether the local side is a rolling window. What a rolling window cost
// those four was real: unconditional, permanent offline coverage downgraded
// to a fixed multi-day floor requiring periodic reconnection. For low-stakes
// reminders, that trade was the wrong direction — see git history for the
// full generalize-then-revert reasoning.
//
// Streak keeps the rolling window because per-day "cancel just today" was
// the original, explicit requirement (a single repeating trigger has no such
// primitive — cancelling it to suppress tonight's occurrence removes every
// future occurrence too, permanently, which was a real, shipped bug), and
// because the stakes (losing an actual streak) justify the complexity. 7
// days of streak's single daily slot is 7 pending-notification slots total —
// trivially safe against iOS's 64-pending cap even alongside the other four
// categories' handful of permanent entries (at most 1+3+3+1 = 8, not
// multiplied by days, since those are ordinary repeating triggers).
const REMINDER_WINDOW_DAYS = {
  [NOTIFICATION_CATEGORIES.STREAK_AT_RISK]: 7,
  DEFAULT: 7,
};

export function windowDaysFor(category) {
  return REMINDER_WINDOW_DAYS[category] ?? REMINDER_WINDOW_DAYS.DEFAULT;
}

export function localDateKey(date) {
  // Local calendar date, not toISOString()'s UTC date — a naive UTC slice can
  // land on the wrong day near midnight in negative-UTC-offset zones, which
  // is exactly the class of bug this project has been bitten by before.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Schedules a rolling window of non-repeating, per-day-identified local
 * notifications for one category. Shared by all 5 local reminder categories.
 *
 * @param {string} category - a NOTIFICATION_CATEGORIES value
 * @param {(dayOffset: number, date: Date) => Array<{hour:number, minute?:number, title:string, body:string, data?:object}>} buildSlotsForDay
 *   Returns the slot(s) to schedule for a given upcoming day (e.g. hydration
 *   returns up to 3 slots/day; mood returns 1). Returning [] skips that day.
 * @returns {Promise<string[]>} scheduled notification identifiers
 */
async function scheduleRollingWindow(category, buildSlotsForDay) {
  if (!Notifications) {
    console.warn('[PushNotifications] Cannot schedule - module not available');
    return [];
  }

  return withCategoryLock(category, async () => {
    try {
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      const existingDateKeys = new Set(
        existing
          .filter((n) => n.content.data?.category === category)
          .map((n) => n.content.data?.dateKey)
          .filter(Boolean)
      );

      const identifiers = [];
      const today = new Date();

      const windowDays = windowDaysFor(category);
      for (let offset = 0; offset < windowDays; offset++) {
        const target = new Date(today);
        target.setDate(target.getDate() + offset);
        const dateKey = localDateKey(target);

        if (existingDateKeys.has(dateKey)) continue; // already scheduled, leave it alone

        const slots = buildSlotsForDay(offset, target) || [];
        for (const slot of slots) {
          const identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: slot.title,
              body: slot.body,
              // hour is stored explicitly (not re-derived from the native
              // trigger object later) so cancelNextOccurrenceForCategory can
              // reliably find the soonest not-yet-fired same-day slot —
              // needed for occurrence-level dedup on categories like
              // hydration/activity that have multiple slots per day.
              data: { category, dateKey, hour: slot.hour, ...(slot.data || {}) },
              categoryIdentifier: category,
            },
            trigger: {
              year: target.getFullYear(),
              month: target.getMonth(), // CalendarTriggerInput follows JS Date's 0-indexed month
              day: target.getDate(),
              hour: slot.hour,
              minute: slot.minute ?? 0,
              repeats: false,
            },
          });
          identifiers.push(identifier);
        }
      }

      console.log(`[PushNotifications] ${category} window topped up: ${identifiers.length} new slot(s) scheduled`);
      return identifiers;
    } catch (error) {
      console.warn(`[PushNotifications] Failed to schedule ${category} window:`, error?.message || error);
      return [];
    }
  });
}

/**
 * Cancels only TODAY's scheduled occurrence(s) for a category — every other
 * day in its rolling window is untouched. Used both when the user logs
 * something (the existing "don't nag about today" behavior) and when the
 * backend confirms it already delivered today's version remotely (new —
 * see applyRemoteDeliveryDedup).
 */
export async function cancelTodayForCategory(category) {
  if (!Notifications) return;
  return withCategoryLock(category, async () => {
    try {
      const todayKey = localDateKey(new Date());
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const todaysNotifications = scheduled.filter(
        (n) => n.content.data?.category === category && n.content.data?.dateKey === todayKey
      );
      for (const notification of todaysNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      if (todaysNotifications.length > 0) {
        console.log(`[PushNotifications] Cancelled ${todaysNotifications.length} ${category} notification(s) for today only`);
      }
    } catch (error) {
      console.warn(`[PushNotifications] Failed to cancel today's ${category} notification(s):`, error?.message || error);
    }
  });
}

/**
 * Cancels only the SOONEST not-yet-fired occurrence of a category today,
 * leaving any later same-day slot untouched. Categories like hydration and
 * activity can have up to 3 distinct slots/day (morning/midday/evening) —
 * each is a separate, intentional reminder occasion, not a duplicate of the
 * others. A remote hydration nudge corresponds to exactly ONE of those
 * occasions; cancelling the whole day (cancelTodayForCategory) would wrongly
 * suppress the user's remaining reminders for that day too. Categories with
 * only one slot/day (daily, mood, streak) behave identically to
 * cancelTodayForCategory here, since "next occurrence" and "today" are the
 * same thing when there's only one.
 */
export async function cancelNextOccurrenceForCategory(category) {
  if (!Notifications) return;
  return withCategoryLock(category, async () => {
    try {
      const todayKey = localDateKey(new Date());
      const currentHour = new Date().getHours();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const remainingToday = scheduled
        .filter((n) => n.content.data?.category === category &&
                       n.content.data?.dateKey === todayKey &&
                       typeof n.content.data?.hour === 'number' &&
                       n.content.data.hour >= currentHour)
        .sort((a, b) => a.content.data.hour - b.content.data.hour);

      const next = remainingToday[0];
      if (next) {
        await Notifications.cancelScheduledNotificationAsync(next.identifier);
        console.log(`[PushNotifications] Cancelled the next ${category} occurrence today (hour=${next.content.data.hour}) — later same-day occurrences, if any, are untouched`);
      }
    } catch (error) {
      console.warn(`[PushNotifications] Failed to cancel next ${category} occurrence:`, error?.message || error);
    }
  });
}

// Daily/hydration/activity/mood deliberately do NOT use scheduleRollingWindow
// (unlike streak, below). Reasoning, reconsidered after generalizing all 5
// categories to rolling windows initially: cross-system dedup for these four
// only ever matters when the device has connectivity in the first place (if
// truly offline, the backend never sends, so there is nothing to duplicate
// against) — the ack+background-handler mechanism (mobile/app/_layout.jsx,
// NotificationProvider.jsx) already suppresses the redundant local instance
// whenever that connectivity-dependent overlap can occur, for ANY category,
// including these. What the rolling-window generalization cost these four
// specifically was worse: unconditional, permanent offline coverage (a plain
// repeating trigger fires forever, needing zero app interaction, ever)
// downgraded to a fixed multi-day floor requiring periodic reconnection to
// keep extending. For low-stakes reminders (a missed hydration nudge is mild;
// a missed streak-protection nudge risks losing an actual achievement), that
// trade was the wrong direction. Reverted to permanent repeating triggers —
// simpler, and strictly more offline-durable than the windowed version was.
// Streak keeps the rolling window: it is the one category where per-day
// "cancel just today" was the original, explicit ask, and where the stakes
// justify the added complexity.

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

  return withCategoryLock(NOTIFICATION_CATEGORIES.DAILY_REMINDER, async () => {
    try {
      await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.DAILY_REMINDER);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍽️ Time to log your meal!',
          body: 'Keep your streak going - log what you ate today.',
          data: { category: NOTIFICATION_CATEGORIES.DAILY_REMINDER },
          categoryIdentifier: NOTIFICATION_CATEGORIES.DAILY_REMINDER,
        },
        trigger: { hour, minute, repeats: true },
      });

      console.log('[PushNotifications] Daily reminder scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.warn('[PushNotifications] Failed to schedule daily reminder:', error?.message || error);
      return null;
    }
  });
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

  return withCategoryLock(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE, async () => {
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
          trigger: { hour: hours[i], minute: 0, repeats: true },
        });
        identifiers.push(identifier);
      }

      console.log('[PushNotifications] Hydration reminders scheduled:', identifiers);
      return identifiers;
    } catch (error) {
      console.warn('[PushNotifications] Failed to schedule hydration reminders:', error?.message || error);
      return [];
    }
  });
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

  return withCategoryLock(NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER, async () => {
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
            data: { category: NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER, screen: 'activity' },
            categoryIdentifier: NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER,
          },
          trigger: { hour: hours[i], minute: 0, repeats: true },
        });
        identifiers.push(identifier);
      }

      console.log('[PushNotifications] Activity reminders scheduled:', identifiers);
      return identifiers;
    } catch (error) {
      console.warn('[PushNotifications] Failed to schedule activity reminders:', error?.message || error);
      return [];
    }
  });
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

  return withCategoryLock(NOTIFICATION_CATEGORIES.MOOD_CHECKIN, async () => {
    try {
      await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.MOOD_CHECKIN);

      const messages = [
        { title: 'How are you feeling?', body: 'Take a moment to check in with yourself.' },
        { title: 'Quick mood check', body: 'A few seconds of reflection goes a long way.' },
        { title: 'Evening check-in', body: "How's your energy? Let's track it." },
      ];
      const dayOfWeek = new Date().getDay();
      const msg = messages[dayOfWeek % messages.length];

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body: msg.body,
          data: { category: NOTIFICATION_CATEGORIES.MOOD_CHECKIN, screen: 'mood' },
          categoryIdentifier: NOTIFICATION_CATEGORIES.MOOD_CHECKIN,
        },
        trigger: { hour, minute: 0, repeats: true },
      });

      console.log('[PushNotifications] Mood check-in scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.warn('[PushNotifications] Failed to schedule mood check-in:', error?.message || error);
      return null;
    }
  });
}

const STREAK_HOUR = 21;

/**
 * (Re)fills the streak-protection window: schedules one non-repeating
 * reminder per day for the next STREAK_WINDOW_DAYS days (skipping any day
 * that already has one scheduled, so calling this repeatedly — e.g. on every
 * app foreground — doesn't create duplicates or disturb days already
 * cancelled via cancelStreakProtectionIfLoggedToday()).
 * @param {number} hour - Hour to fire (default: 9pm)
 */
export async function scheduleStreakProtectionReminder(hour = STREAK_HOUR) {
  const identifiers = await scheduleRollingWindow(NOTIFICATION_CATEGORIES.STREAK_AT_RISK, () => [{
    hour,
    title: 'Your streak is at risk',
    body: "Log something quick to keep your streak alive. Don't lose your momentum!",
    data: { screen: 'log', priority: 'high' },
  }]);
  return identifiers[0] || null;
}

// Tracks the most recently DESIRED ownership state per category that
// failed to reach the backend, so a later reconnect/foreground can retry
// exactly what's still outstanding. Keyed by category, so a newer call
// (e.g. the user flips a toggle again before the first failure ever
// retried) simply overwrites the stale intent rather than replaying it —
// only the latest desired state is ever worth converging on. This is what
// makes ownership "eventually converge without repeated manual toggling":
// local scheduling itself is never gated on this succeeding (it always ran
// first, unconditionally), only the backend's bookkeeping of who owns what
// needs to catch up once connectivity returns.
const pendingOwnershipChanges = new Map(); // category -> owner

/**
 * Claims or releases this device's local-delivery ownership of a category
 * with the backend (see backend/src/utils/deviceRegistry.js). Never throws
 * — a failed call just leaves ownership at its previous state (defaulting
 * to 'backend' for a device that has never successfully registered), which
 * is the safe direction: the user still gets SOME reminder for that
 * category rather than silently getting none. Failures are queued for
 * retryPendingOwnership() to flush later.
 */
export async function registerLocalOwnership(category, owner) {
  try {
    const deviceId = await getOrCreateDeviceId();
    if (!deviceId) {
      pendingOwnershipChanges.set(category, owner);
      return false;
    }
    const response = await apiClient.post('/profile/notifications/ownership', { deviceId, category, owner });
    if (response?.success === true) {
      pendingOwnershipChanges.delete(category);
      return true;
    }
    pendingOwnershipChanges.set(category, owner);
    return false;
  } catch (error) {
    console.warn(`[PushNotifications] Failed to register '${owner}' ownership for ${category}:`, error?.message || error);
    pendingOwnershipChanges.set(category, owner);
    return false;
  }
}

/**
 * Retries every ownership claim/release that failed to reach the backend,
 * called from NotificationProvider's reconnect and foreground handlers
 * alongside the existing token-registration retries. No-ops immediately if
 * nothing is pending. Each retry either clears itself from the queue on
 * success or stays queued (registerLocalOwnership re-adds it) — a
 * category that keeps failing simply gets retried again next time.
 */
export async function retryPendingOwnership() {
  if (pendingOwnershipChanges.size === 0) return { retried: 0, succeeded: 0 };

  const entries = Array.from(pendingOwnershipChanges.entries());
  let succeeded = 0;
  for (const [category, owner] of entries) {
    const ok = await registerLocalOwnership(category, owner);
    if (ok) succeeded++;
  }
  return { retried: entries.length, succeeded };
}

// Testing-only escape hatch, matching __setNotificationsClientForTesting.
export function __resetPendingOwnershipForTesting() {
  pendingOwnershipChanges.clear();
}

// ============================================================================
// NOTIFICATION PREFERENCE PERSISTENCE (survives app termination)
//
// Unlike pendingOwnershipChanges above (an in-memory Map, safe to lose on
// app kill because the next normal sync re-derives and re-claims ownership
// from scratch regardless), a preference save has no equivalent self-heal:
// the next sync on relaunch does a GET, not a re-push of local state, so a
// save that failed and was then forgotten would silently make the user's
// last toggle disappear on restart, overwritten by the stale server value.
// This is persisted to AsyncStorage specifically so it survives that case.
// ============================================================================

const PENDING_PREFERENCES_KEY = 'mft_pending_notification_preferences';

// In-memory cache mirrors AsyncStorage so repeated reads within one process
// lifetime don't round-trip to disk; undefined means "not loaded yet",
// distinct from null ("loaded, nothing pending").
let cachedPendingPreferences;

async function loadPendingPreferences() {
  if (cachedPendingPreferences !== undefined) return cachedPendingPreferences;
  try {
    const raw = await AsyncStorage.getItem(PENDING_PREFERENCES_KEY);
    cachedPendingPreferences = raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[PushNotifications] Failed to read pending preferences:', error?.message || error);
    cachedPendingPreferences = null;
  }
  return cachedPendingPreferences;
}

async function setPendingPreferences(prefs) {
  cachedPendingPreferences = prefs;
  try {
    if (prefs === null) {
      await AsyncStorage.removeItem(PENDING_PREFERENCES_KEY);
    } else {
      await AsyncStorage.setItem(PENDING_PREFERENCES_KEY, JSON.stringify(prefs));
    }
  } catch (error) {
    console.warn('[PushNotifications] Failed to persist pending preferences:', error?.message || error);
  }
}

/**
 * Saves notification preferences to the backend. On failure, persists the
 * attempted value so retryPendingPreferenceSave (called on reconnect,
 * foreground, and app launch — see NotificationProvider.jsx) can complete
 * it later, even across an app restart in between.
 */
export async function savePreferencesToBackend(prefs) {
  try {
    await apiClient.post('/profile/notifications', { notifications: prefs });
    await setPendingPreferences(null);
    return true;
  } catch (error) {
    console.warn('[PushNotifications] Failed to save preferences to backend, will retry:', error?.message || error);
    await setPendingPreferences(prefs);
    return false;
  }
}

export async function retryPendingPreferenceSave() {
  const pending = await loadPendingPreferences();
  if (!pending) return false;
  return savePreferencesToBackend(pending);
}

/**
 * Returns the pending (not-yet-saved) preferences if one exists, else null.
 * Used on app launch to decide whether to trust a fresh GET from the
 * backend or a not-yet-synced local choice from before the last kill.
 */
export async function getPendingPreferences() {
  return loadPendingPreferences();
}

/**
 * Discards any pending preference save without attempting to send it —
 * called on sign-out, after one last save attempt already ran. Required
 * because this storage key is not scoped per-account: without clearing it,
 * a different account signing into the same device would inherit the
 * previous account's unsent preference change on its own next sync.
 */
export async function clearPendingPreferencesForSignOut() {
  cachedPendingPreferences = null;
  try {
    await AsyncStorage.removeItem(PENDING_PREFERENCES_KEY);
  } catch (error) {
    console.warn('[PushNotifications] Failed to clear pending preferences on sign-out:', error?.message || error);
  }
}

// Testing-only escape hatch.
export function __resetPendingPreferencesForTesting() {
  cachedPendingPreferences = undefined;
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
      if (id) {
        scheduled.push({ type: 'daily_reminder', hour: mealHour });
        // Ownership is only claimed once scheduling is CONFIRMED successful
        // (a real identifier came back) — a failed schedule leaves ownership
        // at 'backend' so the user still gets some reminder for this category.
        await registerLocalOwnership(NOTIFICATION_CATEGORIES.DAILY_REMINDER, 'local');
      }
    } else {
      await withCategoryLock(NOTIFICATION_CATEGORIES.DAILY_REMINDER, () => cancelScheduledNotifications(NOTIFICATION_CATEGORIES.DAILY_REMINDER));
      cancelled.push('daily_reminder');
      await registerLocalOwnership(NOTIFICATION_CATEGORIES.DAILY_REMINDER, 'backend');
    }

    // Hydration reminders
    if (preferences.hydrationNudges !== false) {
      const hydrationHours = optimalTimes.hydration?.length > 0
        ? optimalTimes.hydration
        : [10, 14, 18];
      const ids = await scheduleHydrationReminders(hydrationHours);
      if (ids.length) {
        scheduled.push({ type: 'hydration', hours: hydrationHours });
        await registerLocalOwnership(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE, 'local');
      }
    } else {
      await withCategoryLock(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE, () => cancelScheduledNotifications(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE));
      cancelled.push('hydration');
      await registerLocalOwnership(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE, 'backend');
    }

    // Activity reminders
    if (preferences.activityReminders !== false) {
      const activityHours = optimalTimes.activity?.length > 0
        ? optimalTimes.activity
        : [14, 17];
      const ids = await scheduleActivityReminders(activityHours);
      if (ids.length) {
        scheduled.push({ type: 'activity', hours: activityHours });
        await registerLocalOwnership(NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER, 'local');
      }
    } else {
      await withCategoryLock(NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER, () => cancelScheduledNotifications(NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER));
      cancelled.push('activity');
      await registerLocalOwnership(NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER, 'backend');
    }

    // Mood check-in
    if (preferences.moodCheckins !== false) {
      const moodHour = optimalTimes.mood || 20;
      const id = await scheduleMoodCheckIn(moodHour);
      if (id) {
        scheduled.push({ type: 'mood', hour: moodHour });
        await registerLocalOwnership(NOTIFICATION_CATEGORIES.MOOD_CHECKIN, 'local');
      }
    } else {
      await withCategoryLock(NOTIFICATION_CATEGORIES.MOOD_CHECKIN, () => cancelScheduledNotifications(NOTIFICATION_CATEGORIES.MOOD_CHECKIN));
      cancelled.push('mood');
      await registerLocalOwnership(NOTIFICATION_CATEGORIES.MOOD_CHECKIN, 'backend');
    }

    // Streak protection (always on if user has a streak)
    if (preferences.streakProtection !== false) {
      const streakHour = 21;
      const id = await scheduleStreakProtectionReminder(streakHour);
      if (id) scheduled.push({ type: 'streak_protection', hour: streakHour });
    } else {
      await withCategoryLock(NOTIFICATION_CATEGORIES.STREAK_AT_RISK, () => cancelScheduledNotifications(NOTIFICATION_CATEGORIES.STREAK_AT_RISK));
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
      // dateKey/hour are only present on rolling-window entries (currently
      // just streak_at_risk) — undefined here for the permanent repeating
      // categories (hydration/meal/mood/activity), which is itself
      // diagnostic: it's how you tell the two scheduling models apart when
      // inspecting this list during device testing.
      dateKey: n.content.data?.dateKey,
      hour: n.content.data?.hour,
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
  return cancelTodayForCategory(NOTIFICATION_CATEGORIES.STREAK_AT_RISK);
}

/**
 * Smart cancellation: Cancel hydration reminders when goal is reached
 * @param {number} currentMl - Current water intake in ml
 * @param {number} goalMl - Daily water goal in ml
 */
export async function cancelHydrationIfGoalReached(_currentMl, _goalMl) {
  // Intentional no-op. Hydration reminders are a plain, permanent repeating
  // trigger (see the comment above scheduleHydrationReminders for why —
  // reverted from a per-day rolling window to preserve unconditional offline
  // coverage). A repeating trigger has no "skip just today" primitive:
  // cancelling it to suppress the rest of today's nudges after the goal is
  // hit would silently end ALL future hydration reminders too, permanently —
  // the exact bug class this function used to have (it called
  // cancelTodayForCategory, which — after the revert — matches zero entries
  // against a category with no per-day tags, and was silently a no-op in
  // practice already; this makes that explicit rather than leaving
  // dead-looking code with a misleading comment). The accepted trade-off:
  // an occasional reminder after the goal is already met is a much smaller
  // harm than losing all future hydration reminders — kept as a named,
  // callable no-op (rather than removed) so useWaterLog.js's call site
  // doesn't need to change, and so the intent stays documented at the one
  // place a future change is most likely to be made.
}

/**
 * De-duplicates local reminders against the backend's own delivery record.
 * The backend cron is the primary sender for every category whenever the
 * device has connectivity; local scheduling exists only as an offline
 * fallback. Call this on app foreground: for any category the server
 * confirms it already delivered today, cancel today's remaining local
 * occurrence(s) so the user isn't nudged twice for the same thing. If the
 * request fails, nothing is cancelled — the local reminder stays as the
 * safe (at worst redundant, never silent) fallback.
 * @param {(path: string) => Promise<any>} apiGet - an authenticated GET function, e.g. apiClient.get
 */
export async function applyRemoteDeliveryDedup(apiGet) {
  try {
    const response = await apiGet('/profile/notifications/delivered-today');
    const deliveredToday = response?.deliveredToday || [];
    for (const category of deliveredToday) {
      // Occurrence-level, not full-day: the server confirmed ONE reminder
      // reached the device, not that every remaining occasion today is
      // redundant. cancelTodayForCategory (full-day) stays reserved for
      // triggers where that IS the correct scope, e.g. cancelHydrationIfGoalReached.
      await cancelNextOccurrenceForCategory(category);
    }
    if (deliveredToday.length > 0) {
      console.log('[PushNotifications] Suppressed today\'s local reminder(s) already delivered remotely:', deliveredToday);
    }
    return deliveredToday;
  } catch (error) {
    console.warn('[PushNotifications] Remote-delivery dedup check failed (local reminders remain as fallback):', error?.message || error);
    return [];
  }
}

/**
 * Re-schedule notifications for the next day
 * Call this at midnight or when app resumes after midnight
 */
export async function resetDailyNotifications(preferences = {}, optimalTimes = {}) {
  // All 5 local categories are now rolling windows (see scheduleRollingWindow)
  // and each needs periodic top-up as days pass out of its window — not just
  // streak/hydration, which is what this function covered before that
  // generalization. syncAllNotificationSchedules already does exactly this
  // per-category top-up (schedule functions skip days already scheduled, so
  // calling it repeatedly is safe/idempotent), so delegate to it rather than
  // maintain a second, now-inconsistent partial list here.
  await syncAllNotificationSchedules(preferences, optimalTimes);
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
