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
 *
 * Note: For React components, import useNotification directly from NotificationProvider instead
 */

// Removed circular dependency - don't import from NotificationProvider here
// Components should import useNotification directly from NotificationProvider

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

// Convenience exports for common patterns - using function declarations to avoid TDZ
function notifySuccess(message, options) {
  getNotifyInstance()?.success(message, options);
}

function notifyError(message, options) {
  getNotifyInstance()?.error(message, options);
}

function notifyWarning(message, options) {
  getNotifyInstance()?.warning(message, options);
}

function notifyInfo(message, options) {
  getNotifyInstance()?.info(message, options);
}

function notifyModal(config) {
  getNotifyInstance()?.modal(config);
}

// Export functions
export { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyModal };

// Default export for convenience - moved to end to avoid TDZ
export default {
  success: notifySuccess,
  error: notifyError,
  warning: notifyWarning,
  info: notifyInfo,
  modal: notifyModal,
};
