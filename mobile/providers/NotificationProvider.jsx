import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { View, StyleSheet } from 'react-native';

import Toast from '../components/notifications/Toast';
import Modal from '../components/notifications/Modal';
import { setNotifyInstance } from '../utils/notify';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

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

  const showModal = useCallback((config) => {
    setModal(config);
  }, []);

  const hideModal = useCallback(() => {
    setModal(null);
  }, []);

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
  };

  // expose notify globally (safe, no cycle)
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
