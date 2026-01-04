/**
 * Production-Grade Error Handler & Logger
 *
 * Centralized error handling for:
 * - API errors
 * - Validation errors
 * - Network errors
 * - Application errors
 *
 * Features:
 * - User-friendly error messages
 * - Error logging/tracking
 * - Error recovery suggestions
 * - Fallback behaviors
 */

import { captureException, captureMessage } from '@sentry/react-native';

/**
 * Error types and user messages
 */
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect. Check your internet connection.',
  TIMEOUT_ERROR: 'Request took too long. Please try again.',
  OFFLINE: 'You appear to be offline. Some features may be limited.',

  // API errors
  API_ERROR: 'Server error. Please try again later.',
  API_401: 'Session expired. Please log in again.',
  API_403: 'You do not have permission to do this.',
  API_404: 'Resource not found.',
  API_409: 'This data was changed. Please refresh and try again.',
  API_429: 'Too many requests. Please wait a moment and try again.',
  API_500: 'Server error. Our team has been notified.',

  // Validation errors
  VALIDATION_ERROR: 'Invalid data received. Please refresh and try again.',
  DATA_CORRUPTION: 'Data validation failed. Please contact support.',

  // App errors
  STORAGE_ERROR: 'Unable to save data locally.',
  PERMISSION_ERROR: 'Missing required permissions.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Parse API error response
 */
function parseAPIError(error) {
  const status = error.response?.status;
  const data = error.response?.data || {};
  const message = data.message || data.error || error.message;

  return {
    status,
    message,
    details: data,
  };
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error, context = 'Unknown operation') {
  // Validation errors
  if (error.message?.includes('validation failed')) {
    return ERROR_MESSAGES.VALIDATION_ERROR;
  }

  // Network errors
  if (error.message === 'Request timeout') {
    return ERROR_MESSAGES.TIMEOUT_ERROR;
  }
  if (!error.response) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // HTTP status errors
  const status = error.response?.status;
  switch (status) {
    case 401:
    case 403:
      return ERROR_MESSAGES.API_401;
    case 404:
      return ERROR_MESSAGES.API_404;
    case 409:
      return ERROR_MESSAGES.API_409;
    case 429:
      return ERROR_MESSAGES.API_429;
    case 500:
    case 502:
    case 503:
      return ERROR_MESSAGES.API_500;
    default:
      return `${context} failed. Please try again.`;
  }
}

/**
 * Determine error severity
 */
export function getErrorSeverity(error) {
  const status = error.response?.status;

  // Critical errors
  if (error.message?.includes('validation failed')) {
    return ERROR_SEVERITY.CRITICAL;
  }

  // High severity
  if (status === 500 || status === 502 || status === 503) {
    return ERROR_SEVERITY.HIGH;
  }

  // Medium severity
  if (status === 429 || status === 408) {
    return ERROR_SEVERITY.MEDIUM;
  }

  // Low severity
  return ERROR_SEVERITY.LOW;
}

/**
 * Log error for debugging/tracking
 */
export function logError(error, context = {}) {
  const severity = getErrorSeverity(error);
  const isProd = !__DEV__;

  // Console logging (development)
  if (__DEV__) {
    console.error(
      `[ERROR] ${severity.toUpperCase()}: ${error.message}`,
      {
        ...parseAPIError(error),
        ...context,
      }
    );
  }

  // Error tracking (production)
  if (isProd && severity !== ERROR_SEVERITY.LOW) {
    captureException(error, {
      tags: {
        severity,
        context: context.operation || 'unknown',
      },
      extra: {
        ...parseAPIError(error),
        ...context,
      },
    });
  }
}

/**
 * Handle and log error with user message
 */
export function handleError(error, context = {}) {
  const userMessage = getUserMessage(error, context.operation);
  const severity = getErrorSeverity(error);

  logError(error, context);

  return {
    message: userMessage,
    severity,
    details: parseAPIError(error),
    retry: shouldRetry(error),
  };
}

/**
 * Determine if error is retryable
 */
export function shouldRetry(error) {
  const status = error.response?.status;

  // Retryable errors
  if (error.message === 'Request timeout') return true;
  if (!error.response) return true;
  if (status === 408 || status === 429) return true;
  if (status >= 500) return true;

  // Non-retryable errors
  return false;
}

/**
 * Capture API validation error
 */
export function captureValidationError(validationError, endpoint, body) {
  const message = `API Validation Failed: ${endpoint}`;

  logError(validationError, {
    operation: 'API validation',
    endpoint,
    bodyKeys: Object.keys(body || {}),
  });

  // Report to error tracking
  if (!__DEV__) {
    captureMessage(message, 'error', {
      tags: {
        type: 'validation',
        endpoint,
      },
      extra: {
        validationError: validationError.message,
      },
    });
  }
}

/**
 * Capture data corruption (critical)
 */
export function captureDataCorruption(error, context) {
  const message = `DATA CORRUPTION DETECTED: ${error.message}`;

  console.error('⚠️ CRITICAL:', message, context);

  // Always report data corruption
  captureException(error, {
    tags: {
      severity: ERROR_SEVERITY.CRITICAL,
      type: 'data_corruption',
    },
    extra: context,
  });
}

/**
 * Wrap async function with error handling
 */
export async function withErrorHandler(fn, context = {}) {
  try {
    return await fn();
  } catch (error) {
    return handleError(error, context);
  }
}

/**
 * Safe data access with fallback
 */
export function safeGet(obj, path, fallback = null) {
  try {
    const value = path.split('.').reduce((acc, part) => acc?.[part], obj);
    return value !== undefined ? value : fallback;
  } catch (error) {
    return fallback;
  }
}

/**
 * Validate required fields
 */
export function validateRequired(data, requiredFields) {
  const missing = requiredFields.filter(
    field => data[field] === null || data[field] === undefined || data[field] === ''
  );

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    logError(error, {
      operation: 'validation',
      missing,
      data: Object.keys(data),
    });
    throw error;
  }

  return true;
}

export default {
  ERROR_MESSAGES,
  ERROR_SEVERITY,
  getUserMessage,
  getErrorSeverity,
  logError,
  handleError,
  shouldRetry,
  captureValidationError,
  captureDataCorruption,
  withErrorHandler,
  safeGet,
  validateRequired,
};
