/**
 * Crash Reporting Service (FREE - Uses Your Backend)
 *
 * Sends crash reports to your existing backend instead of paid services.
 * Can be upgraded to Sentry/Firebase later when budget allows.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '../constants/api';

// Get device info safely
const getDeviceInfo = () => {
  try {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      appVersion: Constants.expoConfig?.version || '1.0.0',
      buildNumber: Platform.OS === 'ios'
        ? Constants.expoConfig?.ios?.buildNumber
        : Constants.expoConfig?.android?.versionCode,
      expoVersion: Constants.expoConfig?.sdkVersion,
      deviceName: Constants.deviceName,
    };
  } catch (e) {
    return { platform: Platform.OS };
  }
};

// Queue for offline crash reports
let crashQueue = [];
let isProcessingQueue = false;

/**
 * Report a crash/error to the backend
 */
export const reportCrash = async (error, errorInfo = {}, context = {}) => {
  const crashReport = {
    timestamp: new Date().toISOString(),
    error: {
      message: error?.message || String(error),
      name: error?.name || 'Error',
      stack: error?.stack || null,
    },
    errorInfo: {
      componentStack: errorInfo?.componentStack || null,
    },
    context: {
      screen: context.screen || null,
      action: context.action || null,
      userId: context.userId || null,
      ...context,
    },
    device: getDeviceInfo(),
    environment: __DEV__ ? 'development' : 'production',
  };

  // In dev, just log to console
  if (__DEV__) {
    console.log('[CrashReporting] Error captured:', crashReport);
    return;
  }

  // Add to queue and process
  crashQueue.push(crashReport);
  processQueue();
};

/**
 * Process queued crash reports
 */
const processQueue = async () => {
  if (isProcessingQueue || crashQueue.length === 0) return;

  isProcessingQueue = true;

  while (crashQueue.length > 0) {
    const report = crashQueue[0];

    try {
      await fetch(`${API_URL}/crash-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });

      // Remove from queue on success
      crashQueue.shift();
    } catch (e) {
      // Keep in queue, retry later
      console.warn('[CrashReporting] Failed to send, will retry:', e.message);
      break;
    }
  }

  isProcessingQueue = false;
};

/**
 * Set user context for crash reports
 */
let userContext = {};
export const setUserContext = (user) => {
  userContext = {
    userId: user?.id || null,
    email: user?.email || null,
  };
};

/**
 * Clear user context (on logout)
 */
export const clearUserContext = () => {
  userContext = {};
};

/**
 * Capture a message (for non-error logging)
 */
export const captureMessage = (message, level = 'info', context = {}) => {
  if (__DEV__) {
    console.log(`[CrashReporting] ${level.toUpperCase()}: ${message}`);
    return;
  }

  const report = {
    timestamp: new Date().toISOString(),
    message,
    level, // 'info', 'warning', 'error'
    context: { ...userContext, ...context },
    device: getDeviceInfo(),
    environment: 'production',
  };

  fetch(`${API_URL}/crash-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  }).catch(() => {});
};

/**
 * Global error handler for unhandled JS errors
 */
export const setupGlobalErrorHandler = () => {
  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportCrash(error, {}, { isFatal, type: 'unhandled' });

    // Call original handler
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
};

/**
 * Promise rejection handler
 */
export const setupUnhandledRejectionHandler = () => {
  const originalHandler = global.onunhandledrejection;

  global.onunhandledrejection = (event) => {
    reportCrash(
      event.reason,
      {},
      { type: 'unhandled_promise_rejection' }
    );

    if (originalHandler) {
      originalHandler(event);
    }
  };
};

export default {
  reportCrash,
  captureMessage,
  setUserContext,
  clearUserContext,
  setupGlobalErrorHandler,
  setupUnhandledRejectionHandler,
};
