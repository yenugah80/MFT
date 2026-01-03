/**
 * Logging Utility
 * Provides consistent error categorization and logging across services
 * Differentiates between expected operational errors and real bugs
 */

/**
 * Error categories for appropriate logging levels
 */
export const ErrorCategory = {
  // Expected failures - log as debug
  NOT_FOUND: 'NOT_FOUND',           // Resource not found (e.g., USDA food not found)
  EXTERNAL_NOT_AVAILABLE: 'EXTERNAL_NOT_AVAILABLE', // External service unavailable
  VALIDATION: 'VALIDATION',         // Input validation failure
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED', // Feature not yet available

  // Real errors - log as error
  REAL_ERROR: 'REAL_ERROR',         // Unexpected operational errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

/**
 * Categorize an error based on common patterns
 * @param {Error} error - The error object
 * @param {string} [context] - Error context for better categorization
 * @returns {string} ErrorCategory
 */
export function categorizeError(error, context = '') {
  const message = error?.message || String(error);
  const status = error?.response?.status;
  const code = error?.code;

  // HTTP 404 errors - expected when resource not found
  if (status === 404) return ErrorCategory.NOT_FOUND;

  // HTTP 503, connection refused, timeout - external service issues
  if (status === 503 || status === 502 || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
    return ErrorCategory.EXTERNAL_NOT_AVAILABLE;
  }

  // Common not-found patterns
  if (message.includes('not found') || message.includes('not in database') || message.includes('No match found')) {
    return ErrorCategory.NOT_FOUND;
  }

  // External service unavailable patterns
  if (message.includes('unavailable') || message.includes('service not available') || message.includes('Cannot find native module')) {
    return ErrorCategory.EXTERNAL_NOT_AVAILABLE;
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid') || message.includes('Invalid')) {
    return ErrorCategory.VALIDATION;
  }

  // Database errors
  if (message.includes('database') || code === 'ENOTFOUND' || status === 500) {
    return ErrorCategory.DATABASE_ERROR;
  }

  // Auth errors
  if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('authentication')) {
    return ErrorCategory.AUTH_ERROR;
  }

  // Default to real error
  return ErrorCategory.REAL_ERROR;
}

/**
 * Log an error with appropriate level based on category
 * @param {string} label - Log label (e.g., '[ServiceName]')
 * @param {Error} error - The error object
 * @param {string} [context] - Error context
 * @param {boolean} [force] - Force log as error regardless of category
 */
export function logError(label, error, context = '', force = false) {
  const category = categorizeError(error, context);
  const message = error?.message || String(error);
  const fullMessage = context ? `${label} ${context}: ${message}` : `${label} ${message}`;

  // Log real errors and forced errors
  if (force || category === ErrorCategory.REAL_ERROR || category === ErrorCategory.DATABASE_ERROR || category === ErrorCategory.AUTH_ERROR || category === ErrorCategory.INTERNAL_ERROR) {
    console.error(fullMessage);
  } else {
    // Log expected errors as debug
    console.debug(fullMessage);
  }
}

/**
 * Log service operation result
 * @param {string} label - Service label
 * @param {string} operation - Operation name
 * @param {boolean} success - Whether operation succeeded
 * @param {any} [data] - Optional result data
 */
export function logServiceOperation(label, operation, success, data = null) {
  if (success) {
    const message = data ? `${operation} completed` : operation;
    console.debug(`${label} ✓ ${message}`);
  }
}

/**
 * Wrapped try-catch for services
 * @param {Function} asyncFn - Async function to execute
 * @param {string} label - Service label for logging
 * @param {object} options - Options { forceErrorLog, defaultReturn }
 * @returns {Promise<any>} Result or defaultReturn on error
 */
export async function tryServiceCall(asyncFn, label, options = {}) {
  const { forceErrorLog = false, defaultReturn = null } = options;
  try {
    return await asyncFn();
  } catch (error) {
    logError(label, error, '', forceErrorLog);
    return defaultReturn;
  }
}

/**
 * Create debug-level operation logger for service initialization
 * @param {string} label - Service label
 * @returns {object} Logger with methods
 */
export function createServiceLogger(label) {
  return {
    debug: (message) => console.debug(`${label} ${message}`),
    info: (message) => console.debug(`${label} ${message}`),
    warn: (message) => console.warn(`${label} ${message}`),
    error: (message, error) => {
      if (error) {
        logError(label, error, message);
      } else {
        console.error(`${label} ${message}`);
      }
    },
    logOperation: (op, success, data) => logServiceOperation(label, op, success, data),
  };
}

export default {
  categorizeError,
  logError,
  logServiceOperation,
  tryServiceCall,
  createServiceLogger,
  ErrorCategory,
};
