/**
 * Notification Utility - Centralized notification API
 *
 * Import this module to use notifications anywhere in the app:
 * import notify from '@/utils/notify'
 *
 * Usage:
 * - notify.success('Profile updated successfully!')
 * - notify.error('Failed to save data')
 * - notify.warning('You have unsaved changes')
 * - notify.info('Tip: You can scan barcodes for faster logging')
 * - notify.modal({ title: 'Delete Item?', message: '...', destructive: true, onConfirm: () => {} })
 */

import { useNotification } from '@/providers/NotificationProvider';

// This is a helper to be used in components
export { useNotification };

// Export a singleton for use outside of React components (e.g., in API interceptors)
let notifyInstance = null;

export const setNotifyInstance = (instance) => {
  notifyInstance = instance;
};

export const getNotifyInstance = () => {
  if (!notifyInstance) {
    console.warn('Notification system not initialized. Make sure NotificationProvider is mounted.');
  }
  return notifyInstance;
};

// Convenience exports for common patterns
export const notifySuccess = (message, options) => {
  getNotifyInstance()?.success(message, options);
};

export const notifyError = (message, options) => {
  getNotifyInstance()?.error(message, options);
};

export const notifyWarning = (message, options) => {
  getNotifyInstance()?.warning(message, options);
};

export const notifyInfo = (message, options) => {
  getNotifyInstance()?.info(message, options);
};

export const notifyModal = (config) => {
  getNotifyInstance()?.modal(config);
};

// Default export for convenience
const notify = {
  success: notifySuccess,
  error: notifyError,
  warning: notifyWarning,
  info: notifyInfo,
  modal: notifyModal,
};

export default notify;
