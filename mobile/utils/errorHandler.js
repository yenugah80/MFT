/**
 * Global Error Handler
 *
 * Centralized error handling and reporting for the entire application.
 * Integrates with the notification system to display user-friendly error messages.
 */

import { getNotifyInstance } from './notify';

/**
 * Error types for categorization
 */
export const ErrorType = {
  NETWORK: 'NETWORK',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
};

/**
 * User-friendly error messages
 */
const ErrorMessages = {
  [ErrorType.NETWORK]: 'Network connection failed. Please check your internet connection.',
  [ErrorType.VALIDATION]: 'Please check your input and try again.',
  [ErrorType.AUTHENTICATION]: 'Session expired. Please sign in again.',
  [ErrorType.AUTHORIZATION]: 'You do not have permission to perform this action.',
  [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorType.SERVER]: 'Server error. Please try again later.',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Classify error based on error object or status code
 */
export const classifyError = (error) => {
  // Network errors
  if (!error.response && error.request) {
    return ErrorType.NETWORK;
  }

  // HTTP status code errors
  if (error.response) {
    const status = error.response.status;
    if (status === 401) return ErrorType.AUTHENTICATION;
    if (status === 403) return ErrorType.AUTHORIZATION;
    if (status === 404) return ErrorType.NOT_FOUND;
    if (status === 422) return ErrorType.VALIDATION;
    if (status >= 500) return ErrorType.SERVER;
  }

  // Validation errors from API
  if (error.name === 'ValidationError') {
    return ErrorType.VALIDATION;
  }

  return ErrorType.UNKNOWN;
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error, customMessage = null) => {
  if (customMessage) return customMessage;

  // Check if error has a custom message from the API
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Use classified error type for message
  const errorType = classifyError(error);
  return ErrorMessages[errorType];
};

/**
 * Handle error globally - log and notify user
 */
export const handleError = (error, options = {}) => {
  const {
    silent = false,
    customMessage = null,
    context = '',
    showToast = true,
  } = options;

  // Log error for debugging
  console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);

  // Don't show notification if silent mode
  if (silent) return;

  const message = getErrorMessage(error, customMessage);
  const errorType = classifyError(error);

  // Show appropriate notification
  const notify = getNotifyInstance();
  if (!notify) {
    console.warn('Notification system not available');
    return;
  }

  if (showToast) {
    // For most errors, show a toast
    notify.error(message, { duration: 5000 });
  } else {
    // For critical errors, show a modal
    notify.modal({
      type: 'warning',
      title: 'Error',
      message,
      confirmText: 'OK',
      onConfirm: () => {},
    });
  }

  // You can integrate with error reporting service here
  // e.g., Sentry.captureException(error, { extra: { context, errorType } });
};

/**
 * Handle API errors specifically
 */
export const handleApiError = (error, context = '') => {
  handleError(error, {
    context: `API - ${context}`,
    showToast: true,
  });
};

/**
 * Async error wrapper - catches errors in async functions
 */
export const withErrorHandling = (fn, context = '') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, { context });
      throw error; // Re-throw so caller can handle if needed
    }
  };
};

/**
 * Extract validation errors from API response
 */
export const extractValidationErrors = (error) => {
  const errors = {};

  if (error.response?.data?.errors) {
    // Format: { errors: { field: ['error1', 'error2'] } }
    Object.entries(error.response.data.errors).forEach(([field, messages]) => {
      errors[field] = Array.isArray(messages) ? messages[0] : messages;
    });
  }

  return errors;
};

export default {
  handleError,
  handleApiError,
  withErrorHandling,
  classifyError,
  getErrorMessage,
  extractValidationErrors,
  ErrorType,
};
