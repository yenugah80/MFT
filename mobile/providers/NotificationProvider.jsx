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

import Toast from '../components/notifications/Toast';
import Modal from '../components/notifications/Modal';
import { setNotifyInstance } from '../utils/notify';
import {
  setupPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  scheduleDailyReminder,
  scheduleHydrationReminders,
  cancelScheduledNotifications,
  NOTIFICATION_CATEGORIES,
  getNotificationPermissionStatus,
} from '../services/pushNotifications';
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
  const [preferences, setPreferences] = useState({
    dailyReminder: true,
    hydrationNudges: true,
    insightDrops: true,
    streakCelebrations: true,
  });

  const notificationListener = useRef();
  const responseListener = useRef();
  const fcmListenersRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // ============== Toast Management ==============
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 3000;
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

  // ============== FCM Setup (Server-triggered notifications) ==============
  const initializeFCM = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      // Setup FCM for server-triggered push notifications
      const result = await fcmService.setupFCM();

      setFcmStatus({
        initialized: true,
        permissionStatus: result.permissionStatus,
        token: result.token,
        error: result.error,
      });

      // Set up FCM message handlers for foreground notifications
      const listeners = await fcmService.setupFCMListeners((message) => {
        // Show FCM messages as toasts when app is in foreground
        addToast({
          type: 'info',
          title: message.title,
          message: message.body,
          duration: 4000,
        });
      });

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
  }, [isSignedIn, addToast]);

  // Sync notification schedules with user preferences
  const syncNotificationSchedules = useCallback(async () => {
    try {
      // Fetch current preferences from backend
      const data = await apiClient.get('/profile/notifications');
      const prefs = {
        dailyReminder: data?.dailyReminder !== false,
        hydrationNudges: data?.hydrationNudges !== false,
        insightDrops: data?.insightDrops !== false,
        streakCelebrations: data?.streakCelebrations !== false,
      };

      setPreferences(prefs);

      // Use smart notification engine for data-driven scheduling
      const optimalTimes = await SmartNotificationEngine.getOptimalNotificationTimes();

      // Schedule or cancel based on preferences AND user patterns
      if (prefs.dailyReminder) {
        // Use user's optimal meal times if available, otherwise default to noon
        const mealHour = optimalTimes.meals?.[0] || 12;
        await scheduleDailyReminder(mealHour, 0);
      } else {
        await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.DAILY_REMINDER);
      }

      if (prefs.hydrationNudges) {
        // Use user's optimal hydration times if available
        const hydrationHours = optimalTimes.hydration?.length > 0
          ? optimalTimes.hydration
          : [10, 14, 18];
        await scheduleHydrationReminders(hydrationHours);
      } else {
        await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE);
      }

      console.log('[NotificationProvider] Notification schedules synced with user patterns');
    } catch (error) {
      // Use console.warn to avoid red error screen in development
      console.warn('[NotificationProvider] Failed to sync schedules (non-critical):', error?.message || error);
    }
  }, []);

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
        duration: 4000,
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
        duration: 4000,
      });
    });

    // Listener for user interaction with notifications
    responseListener.current = addNotificationResponseReceivedListener((response) => {
      console.log('[NotificationProvider] Notification tapped:', response);

      const data = response.notification.request.content.data;
      // Handle navigation based on notification category
      if (data?.category === NOTIFICATION_CATEGORIES.DAILY_REMINDER) {
        // Could navigate to food log screen
      } else if (data?.category === NOTIFICATION_CATEGORIES.HYDRATION_NUDGE) {
        // Could navigate to water log screen
      }
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
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkPermissionStatus]);

  // ============== Notify API ==============
  const notify = {
    success: (message, options = {}) =>
      addToast({ type: 'success', message, ...options }),

    error: (message, options = {}) =>
      addToast({
        type: 'error',
        message,
        duration: options.duration ?? 5000,
        ...options,
      }),

    warning: (message, options = {}) =>
      addToast({ type: 'warning', message, ...options }),

    info: (message, options = {}) =>
      addToast({ type: 'info', message, ...options }),

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
    right: 16,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});

export default NotificationProvider;
