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
  const [preferences, setPreferences] = useState({
    dailyReminder: true,
    hydrationNudges: true,
    insightDrops: true,
    streakCelebrations: true,
  });

  const notificationListener = useRef();
  const responseListener = useRef();
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
      console.error('[NotificationProvider] Push setup error:', error);
      // Graceful degradation - don't crash if native module unavailable
      setPushStatus((prev) => ({
        ...prev,
        initialized: true,
        error: 'Push notifications unavailable on this device',
      }));
    }
  }, [isSignedIn]);

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

      // Schedule or cancel based on preferences
      if (prefs.dailyReminder) {
        await scheduleDailyReminder(12, 0); // Noon reminder
      } else {
        await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.DAILY_REMINDER);
      }

      if (prefs.hydrationNudges) {
        await scheduleHydrationReminders([10, 14, 18]); // 10am, 2pm, 6pm
      } else {
        await cancelScheduledNotifications(NOTIFICATION_CATEGORIES.HYDRATION_NUDGE);
      }

      console.log('[NotificationProvider] Notification schedules synced');
    } catch (error) {
      console.error('[NotificationProvider] Failed to sync schedules:', error);
    }
  }, []);

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
      initializePushNotifications();
    }
  }, [isSignedIn, pushStatus.initialized, initializePushNotifications]);

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
      preferences,
      initialize: initializePushNotifications,
      checkPermission: checkPermissionStatus,
      updatePreferences: updateNotificationPreferences,
      syncSchedules: syncNotificationSchedules,
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
