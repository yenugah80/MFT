/**
 * NotificationProvider - Unified Notification System
 *
 * Features:
 * - In-app toast notifications with animations
 * - Modal confirmations
 * - Push notification registration and handling
 * - Notification preference syncing
 * - Background notification listeners
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';

import Toast from '../components/notifications/Toast';
import Modal from '../components/notifications/Modal';
import { setNotifyInstance } from '../utils/notify';
import {
  setupPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  scheduleDailyReminder,
  scheduleHydrationReminders,
  scheduleActivityReminders,
  scheduleMoodCheckIn,
  scheduleStreakProtectionReminder,
  syncAllNotificationSchedules,
  cancelScheduledNotifications,
  getNotificationPermissionStatus,
  getScheduledNotifications,
  resetDailyNotifications,
  showLocalNotification,
} from '../services/pushNotifications';
import {
  NOTIFICATION_CATEGORIES,
  DEFAULT_PREFERENCES,
  DISMISS_REASONS,
  NOTIFICATION_LAYOUT,
} from '../constants/notificationTypes';
import { router } from 'expo-router';
import apiClient from '../services/apiClient';
import SmartNotificationEngine from '../services/smartNotificationEngine';
import fcmService from '../services/fcmService';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isSignedIn } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [pushStatus, setPushStatus] = useState({
    initialized: false,
    permissionStatus: 'undetermined',
    token: null,
    error: null,
  });
  const [fcmStatus, setFcmStatus] = useState({
    initialized: false,
    permissionStatus: 'undetermined',
    token: null,
    error: null,
  });
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  const notificationListener = useRef();
  const responseListener = useRef();
  const fcmListenersRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const lastResetDateRef = useRef(new Date().toDateString());

  // ============== Toast Management ==============
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Haptic feedback based on notification type/urgency
    // - Celebration: Medium impact (exciting feedback)
    // - Error/Urgent: Heavy impact (attention-grabbing)
    // - Warning: Medium impact
    // - Success/Info: Light impact (subtle)
    try {
      if (toast.celebration) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (toast.type === 'error' || toast.urgent) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (toast.type === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (toast.type === 'success') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      // Info notifications: no haptic (silent)
    } catch (hapticError) {
      // Haptics may not be available on all devices
      console.warn('[NotificationProvider] Haptic feedback unavailable:', hapticError?.message);
    }

    // Use standardized durations from NOTIFICATION_LAYOUT
    const defaultDuration = toast.celebration
      ? NOTIFICATION_LAYOUT.toast.duration.celebration
      : toast.type === 'error'
        ? NOTIFICATION_LAYOUT.toast.duration.error
        : NOTIFICATION_LAYOUT.toast.duration.default;
    const duration = toast.duration ?? defaultDuration;
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, [removeToast]);

  // ============== Modal Management ==============
  const showModal = useCallback((config) => {
    setModal(config);
  }, []);

  const hideModal = useCallback(() => {
    setModal(null);
  }, []);

  // ============== Push Notification Setup ==============
  const initializePushNotifications = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const result = await setupPushNotifications();

      setPushStatus({
        initialized: true,
        permissionStatus: result.permissionStatus,
        token: result.token,
        error: result.success ? null : 'Failed to register token',
      });

      // If successful, sync notification schedules with preferences
      if (result.success) {
        await syncNotificationSchedules();
      }
    } catch (error) {
      // Use console.warn to avoid red error screen in development
      console.warn('[NotificationProvider] Push setup error (non-critical):', error?.message || error);
      // Graceful degradation - don't crash if native module unavailable
      setPushStatus((prev) => ({
        ...prev,
        initialized: true,
        error: 'Push notifications unavailable on this device',
      }));
    }
  }, [isSignedIn]);

  // Navigate from notification tap
  const navigateFromNotification = useCallback((screen, category) => {
    // Define route mappings
    const screenRoutes = {
      log: '/(tabs)/log',
      water: '/(tabs)/log',
      dashboard: '/(tabs)/dashboard',
      profile: '/(tabs)/profile',
      activity: '/activity/today',
      mood: '/insights',
      insights: '/insights',
    };

    const categoryRoutes = {
      [NOTIFICATION_CATEGORIES.DAILY_REMINDER]: '/(tabs)/log',
      [NOTIFICATION_CATEGORIES.HYDRATION_NUDGE]: '/(tabs)/log',
      [NOTIFICATION_CATEGORIES.ACTIVITY_REMINDER]: '/activity/today',
      [NOTIFICATION_CATEGORIES.MOOD_CHECKIN]: '/insights',
      [NOTIFICATION_CATEGORIES.STREAK_AT_RISK]: '/(tabs)/log',
      [NOTIFICATION_CATEGORIES.STREAK_CELEBRATION]: '/(tabs)/profile',
      [NOTIFICATION_CATEGORIES.GOAL_ACHIEVED]: '/(tabs)/dashboard',
      [NOTIFICATION_CATEGORIES.INSIGHT_DROP]: '/insights',
    };

    try {
      const route = screenRoutes[screen] || categoryRoutes[category] || '/(tabs)/dashboard';
      console.log(`[NotificationProvider] Navigating to: ${route}`);
      setTimeout(() => { router.push(route); }, 100);
    } catch (error) {
      console.warn('[NotificationProvider] Navigation error:', error?.message || error);
      router.push('/(tabs)/dashboard');
    }
  }, []);

  // ============== FCM Setup (Server-triggered notifications) ==============
  const initializeFCM = useCallback(async () => {
    if (!isSignedIn) return;

    // Clean up any existing FCM listeners before re-initializing to prevent
    // duplicate listeners on sign-out → sign-in cycles.
    if (fcmListenersRef.current) {
      fcmListenersRef.current.foreground?.remove();
      fcmListenersRef.current.tokenRefresh?.remove();
      fcmListenersRef.current.backgroundOpen?.remove();
      fcmListenersRef.current = null;
    }

    try {
      // Setup FCM for server-triggered push notifications
      const result = await fcmService.setupFCM();

      setFcmStatus({
        initialized: true,
        permissionStatus: result.permissionStatus,
        token: result.token,
        error: result.error,
      });

      // Custom handlers for FCM that include navigation
      const handleFCMNavigation = (remoteMessage) => {
        const data = remoteMessage.data || {};
        const screen = data.screen;
        const category = data.category;
        navigateFromNotification(screen, category);
      };

      // Set up FCM message handlers for foreground notifications
      const listeners = await fcmService.setupFCMListeners(
        // Foreground message handler
        (message) => {
          // Show FCM messages as toasts when app is in foreground
          addToast({
            type: 'info',
            title: message.title,
            message: message.body,
            duration: 5000,
          });
        },
        // Cold start handler (app was killed, opened from notification)
        (initialNotification) => {
          if (initialNotification) {
            console.log('[NotificationProvider] FCM cold start navigation');
            // Delay to ensure router is ready
            setTimeout(() => {
              handleFCMNavigation(initialNotification);
            }, 500);
          }
        },
        // Background->Foreground handler (app was in background)
        (remoteMessage) => {
          console.log('[NotificationProvider] FCM background->foreground navigation');
          handleFCMNavigation(remoteMessage);
        }
      );

      fcmListenersRef.current = listeners;
      console.log('[NotificationProvider] FCM initialized successfully');
    } catch (error) {
      console.warn('[NotificationProvider] FCM setup error (non-critical):', error?.message || error);
      setFcmStatus({
        initialized: true,
        permissionStatus: 'unavailable',
        token: null,
        error: 'FCM unavailable on this device',
      });
    }
  }, [isSignedIn, addToast, navigateFromNotification]);

  // Sync notification schedules with user preferences
  const syncNotificationSchedules = useCallback(async () => {
    try {
      // Fetch current preferences from backend
      const data = await apiClient.get('/profile/notifications');
      const prefs = {
        dailyReminder: data?.dailyReminder !== false,
        hydrationNudges: data?.hydrationNudges !== false,
        activityReminders: data?.activityReminders !== false,
        moodCheckins: data?.moodCheckins !== false,
        streakProtection: data?.streakProtection !== false,
        insightDrops: data?.insightDrops !== false,
        streakCelebrations: data?.streakCelebrations !== false,
      };

      setPreferences(prefs);

      // Use smart notification engine for data-driven scheduling
      const optimalTimes = await SmartNotificationEngine.getOptimalNotificationTimes();

      // Use comprehensive sync function
      const result = await syncAllNotificationSchedules(prefs, optimalTimes);

      console.log('[NotificationProvider] Notification schedules synced:', result);
    } catch (error) {
      // Use console.warn to avoid red error screen in development
      console.warn('[NotificationProvider] Failed to sync schedules (non-critical):', error?.message || error);
    }
  }, []);

  // Track notification click for analytics
  const trackNotificationClick = useCallback(async (category, screen, actionId = null) => {
    try {
      await apiClient.post('/reminders/clicked', {
        notificationType: category,
        screenNavigated: screen,
        actionIdentifier: actionId,
      });
    } catch (error) {
      // Non-critical - don't block on analytics
      console.warn('[NotificationProvider] Failed to track click:', error?.message || error);
    }
  }, []);

  // Handle notification action buttons (Snooze, Log now, etc.)
  const handleNotificationAction = useCallback(async (actionIdentifier, category) => {
    console.log(`[NotificationProvider] Action: ${actionIdentifier} for ${category}`);

    switch (actionIdentifier) {
      case 'SNOOZE_30':
        // Snooze for 30 minutes - persist to backend
        try {
          await apiClient.post('/reminders/snooze', {
            reminderType: category,
            snoozeDuration: 30,
          });
          addToast({
            type: 'info',
            message: 'Snoozed for 30 minutes',
            duration: 3000,
          });
        } catch (error) {
          console.warn('[NotificationProvider] Failed to snooze:', error?.message || error);
        }
        break;

      case 'SNOOZE_60':
        // Snooze for 60 minutes
        try {
          await apiClient.post('/reminders/snooze', {
            reminderType: category,
            snoozeDuration: 60,
          });
          addToast({
            type: 'info',
            message: 'Snoozed for 1 hour',
            duration: 3000,
          });
        } catch (error) {
          console.warn('[NotificationProvider] Failed to snooze:', error?.message || error);
        }
        break;

      case 'DISMISS':
        // Dismiss and record for ML learning
        // Use 'other' as default - backend validates: ['not_relevant', 'too_frequent', 'wrong_time', 'other']
        try {
          await apiClient.post('/reminders/dismiss', {
            reminderType: category,
            reason: DISMISS_REASONS.OTHER,
          });
        } catch (error) {
          console.warn('[NotificationProvider] Failed to dismiss:', error?.message || error);
        }
        break;

      case 'LOG_NOW':
      case 'LOG_WATER':
      case 'LOG_ACTIVITY':
      case 'LOG_MOOD':
        // These open the app - navigation handled separately
        break;

      default:
        console.log('[NotificationProvider] Unknown action:', actionIdentifier);
    }
  }, [addToast]);

  // Generate and show smart data-driven notification
  const triggerSmartNotification = useCallback(async (type) => {
    try {
      // Check rate limiting first
      const canSend = await SmartNotificationEngine.shouldSendNotification(type);
      if (!canSend) {
        console.log(`[NotificationProvider] Rate limited: ${type}`);
        return null;
      }

      // Generate message based on actual user data
      let notification = null;
      switch (type) {
        case 'hydration':
          notification = await SmartNotificationEngine.generateHydrationMessage();
          break;
        case 'meal':
          notification = await SmartNotificationEngine.generateMealMessage();
          break;
        case 'activity':
          notification = await SmartNotificationEngine.generateActivityMessage();
          break;
        case 'mood':
          notification = await SmartNotificationEngine.generateMoodMessage();
          break;
        case 'reengagement':
          notification = await SmartNotificationEngine.generateReengagementMessage();
          break;
        default:
          console.warn(`[NotificationProvider] Unknown notification type: ${type}`);
          return null;
      }

      // Only send if we have data-driven content (no defaults!)
      if (!notification) {
        console.log(`[NotificationProvider] No relevant data for ${type} notification`);
        return null;
      }

      // Record that we're sending this notification
      await SmartNotificationEngine.recordNotificationSent(type);

      // Show as in-app toast if app is foregrounded
      addToast({
        type: 'info',
        message: notification.body,
        title: notification.title,
        duration: 5000, // 5 seconds for smart notifications
      });

      console.log(`[NotificationProvider] Smart ${type} notification triggered`);
      return notification;
    } catch (error) {
      console.warn(`[NotificationProvider] Failed to trigger smart notification:`, error?.message || error);
      return null;
    }
  }, [addToast]);

  // Update preferences and sync schedules
  const updateNotificationPreferences = useCallback(async (newPrefs) => {
    setPreferences(newPrefs);
    await syncNotificationSchedules();
  }, [syncNotificationSchedules]);

  // Check permission status
  const checkPermissionStatus = useCallback(async () => {
    const status = await getNotificationPermissionStatus();
    setPushStatus((prev) => ({
      ...prev,
      permissionStatus: status,
    }));
    return status;
  }, []);

  // Check if it's a new day and reset notifications
  const checkDailyReset = useCallback(async () => {
    const today = new Date().toDateString();
    if (lastResetDateRef.current !== today) {
      console.log('[NotificationProvider] New day detected, resetting notifications');
      lastResetDateRef.current = today;

      // Get optimal times for scheduling
      const optimalTimes = await SmartNotificationEngine.getOptimalNotificationTimes().catch(() => ({}));

      // Reset daily notifications (re-enable streak protection, hydration reminders)
      await resetDailyNotifications(preferences, optimalTimes);
    }
  }, [preferences]);

  // ============== Effects ==============

  // Initialize push notifications when signed in
  useEffect(() => {
    if (isSignedIn && !pushStatus.initialized) {
      // Initialize Expo push (for local scheduled notifications)
      initializePushNotifications();
    }
    if (isSignedIn && !fcmStatus.initialized) {
      // Initialize FCM (for server-triggered notifications)
      initializeFCM();
    }
  }, [isSignedIn, pushStatus.initialized, fcmStatus.initialized, initializePushNotifications, initializeFCM]);

  // Set up notification listeners
  useEffect(() => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('[NotificationProvider] Notification received:', notification);

      // Show as toast if app is in foreground
      const { title, body } = notification.request.content;
      addToast({
        type: 'info',
        message: body || title,
        title: title,
        duration: 5000, // 5 seconds for foreground notifications
      });
    });

    // Listener for user interaction with notifications
    responseListener.current = addNotificationResponseReceivedListener((response) => {
      console.log('[NotificationProvider] Notification response:', response);

      const data = response.notification.request.content.data;
      const category = data?.category;
      const screen = data?.screen;
      const actionIdentifier = response.actionIdentifier;

      // Track notification click for analytics
      trackNotificationClick(category, screen, actionIdentifier);

      // Handle action buttons (Snooze, Dismiss)
      if (actionIdentifier && actionIdentifier !== 'expo.modules.notifications.actions.DEFAULT') {
        handleNotificationAction(actionIdentifier, category);

        // Only navigate if action opens app (LOG_* actions)
        if (actionIdentifier.startsWith('LOG_')) {
          navigateFromNotification(screen, category);
        }
        return;
      }

      // Default tap - navigate based on screen data or category
      navigateFromNotification(screen, category);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      // Clean up FCM listeners
      if (fcmListenersRef.current) {
        fcmListenersRef.current.foreground?.remove();
        fcmListenersRef.current.tokenRefresh?.remove();
        fcmListenersRef.current.backgroundOpen?.remove();
      }
    };
  }, [addToast]);

  // Handle app state changes (re-check permissions when app comes to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground - recheck permission status
        checkPermissionStatus();

        // Check if it's a new day and reset daily notifications
        checkDailyReset().catch(() => {});
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkPermissionStatus, checkDailyReset]);

  // ============== Notify API ==============
  const notify = {
    success: (message, options = {}) => {
      // Debug: always log what message is being passed in dev
      if (__DEV__) {
        console.log('[NotificationProvider] success called with:', JSON.stringify({ message, type: typeof message }));
        if (!message || (typeof message === 'string' && !message.trim())) {
          console.warn('[NotificationProvider] Empty success message!', new Error().stack);
        }
      }
      // Ensure message is a non-empty string
      const finalMessage = (typeof message === 'string' && message.trim()) ? message : 'Success!';
      return addToast({ type: 'success', message: finalMessage, ...options });
    },

    error: (message, options = {}) =>
      addToast({
        type: 'error',
        message: message || 'An error occurred',
        // Duration handled by addToast using NOTIFICATION_LAYOUT.toast.duration.error
        ...options,
      }),

    warning: (message, options = {}) =>
      addToast({ type: 'warning', message: message || 'Warning', ...options }),

    info: (message, options = {}) => {
      if (__DEV__) {
        console.log('[NotificationProvider] info called with:', JSON.stringify({ message, type: typeof message }));
      }
      const finalMessage = (typeof message === 'string' && message.trim()) ? message : 'Info';
      return addToast({ type: 'info', message: finalMessage, ...options });
    },

    // Celebration notifications with Lottie animations
    celebrate: (message, options = {}) => {
      const finalMessage = (typeof message === 'string' && message.trim()) ? message : 'Awesome!';
      return addToast({
        type: 'success',
        message: finalMessage,
        celebration: true,
        lottieAnimation: options.lottieAnimation || 'celebration',
        // Duration handled by addToast using NOTIFICATION_LAYOUT.toast.duration.celebration
        ...options,
      });
    },

    // Goal celebration shortcuts
    celebrateGoal: (goalType, message, options = {}) => {
      const lottieMap = {
        hydration: 'sparkle',
        streak: 'streak',
        steps: 'success',
        meal: 'celebration',
        mood: 'stars',
        level: 'celebration',
        achievement: 'stars',
      };
      return addToast({
        type: 'success',
        message: message || `${goalType} goal achieved!`,
        domain: goalType,
        celebration: true,
        lottieAnimation: lottieMap[goalType] || 'celebration',
        // Duration handled by addToast using NOTIFICATION_LAYOUT.toast.duration.celebration
        ...options,
      });
    },

    modal: (config) => showModal(config),

    dismiss: (id) => {
      if (id) removeToast(id);
      else setToasts([]);
    },

    // Push notification status and controls
    push: {
      status: pushStatus,
      fcmStatus: fcmStatus,
      preferences,
      initialize: initializePushNotifications,
      initializeFCM: initializeFCM,
      checkPermission: checkPermissionStatus,
      updatePreferences: updateNotificationPreferences,
      syncSchedules: syncNotificationSchedules,
      // Debug: Get all scheduled notifications
      getScheduled: getScheduledNotifications,
      // Debug: Send a test notification to verify system works
      sendTest: async () => {
        const result = await showLocalNotification({
          title: '🔔 Test Notification',
          body: 'If you see this in the notification center, notifications are working!',
          data: { category: 'test', screen: 'dashboard' },
        });
        console.log('[NotificationProvider] Test notification sent:', result);
        return result;
      },
    },

    // Smart data-driven notifications (Zomato-style)
    smart: {
      trigger: triggerSmartNotification,
      // Expose individual generators for testing/debugging
      generateHydration: SmartNotificationEngine.generateHydrationMessage,
      generateMeal: SmartNotificationEngine.generateMealMessage,
      generateActivity: SmartNotificationEngine.generateActivityMessage,
      generateMood: SmartNotificationEngine.generateMoodMessage,
      analyzePatterns: SmartNotificationEngine.analyzeUserPatterns,
    },
  };

  // Expose notify globally
  useEffect(() => {
    setNotifyInstance(notify);
  }, [notify]);

  return (
    <NotificationContext.Provider value={notify}>
      {children}

      {/* Overlay layer */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {/* Toast stack */}
        <View style={styles.toastContainer}>
          {toasts.map((toast, index) => (
            <Toast
              key={toast.id}
              {...toast}
              onDismiss={() => removeToast(toast.id)}
              style={{ marginBottom: index < toasts.length - 1 ? 8 : 0 }}
            />
          ))}
        </View>

        {/* Modal */}
        {modal && (
          <Modal
            {...modal}
            visible
            onDismiss={hideModal}
            onConfirm={() => {
              modal.onConfirm?.();
              hideModal();
            }}
            onCancel={() => {
              modal.onCancel?.();
              hideModal();
            }}
          />
        )}
      </View>
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    pointerEvents: 'box-none',
    alignItems: 'stretch', // Full width toasts
  },
});

export default NotificationProvider;
