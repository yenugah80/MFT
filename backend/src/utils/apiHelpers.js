/**
 * API Helper Utilities
 * Provides retry logic, timeout protection, and error handling for API calls
 */

/**
 * Retry a promise with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Result of successful call
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = (error) => {
      // Retry on network errors and 5xx server errors
      if (error.message?.includes('timeout')) return true;
      if (error.message?.includes('network')) return true;
      if (error.status >= 500 && error.status < 600) return true;
      return false;
    },
  } = options;

  let lastError;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      // Log retry
      console.log(
        `[RetryHelper] Attempt ${attempt}/${maxAttempts} failed: ${error.message}. ` +
        `Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Execute a promise with a timeout
 * @param {Promise} promise - Promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Error message if timeout occurs
 * @returns {Promise} - Result or timeout error
 */
export async function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Retry with timeout protection
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Combined retry and timeout options
 * @returns {Promise} - Result of successful call
 */
export async function retryWithTimeout(fn, options = {}) {
  const {
    timeoutMs = 30000,
    errorMessage = 'Request timed out',
    ...retryOptions
  } = options;

  return retryWithBackoff(
    () => withTimeout(fn(), timeoutMs, errorMessage),
    retryOptions
  );
}

/**
 * Validate API response structure
 * @param {Object} data - Response data
 * @param {Object} schema - Expected schema
 * @returns {Object} - Validated data with safe defaults
 */
export function validateResponse(data, schema) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response: expected object');
  }

  const validated = {};

  for (const [key, validator] of Object.entries(schema)) {
    const value = data[key];

    if (validator.required && value === undefined) {
      throw new Error(`Missing required field: ${key}`);
    }

    if (value === undefined || value === null) {
      validated[key] = validator.default;
      continue;
    }

    // Type validation
    if (validator.type === 'string' && typeof value !== 'string') {
      validated[key] = validator.default;
    } else if (validator.type === 'number' && !Number.isFinite(value)) {
      validated[key] = validator.default;
    } else if (validator.type === 'array' && !Array.isArray(value)) {
      validated[key] = validator.default;
    } else if (validator.type === 'object' && typeof value !== 'object') {
      validated[key] = validator.default;
    } else {
      validated[key] = value;
    }

    // Custom validation
    if (validator.validate && !validator.validate(validated[key])) {
      throw new Error(`Validation failed for field: ${key}`);
    }
  }

  return validated;
}

/**
 * Safe number parsing with bounds
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default if invalid
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} - Safe number
 */
export function safeNumber(value, defaultValue = 0, min = -Infinity, max = Infinity) {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return defaultValue;
  }

  // Prevent negative nutrition values
  const bounded = Math.max(min, Math.min(max, num));

  return bounded;
}

/**
 * Safe array mapping with error handling
 * @param {Array} array - Array to map
 * @param {Function} fn - Mapping function
 * @param {Array} defaultValue - Default if error
 * @returns {Array} - Mapped array
 */
export function safeMap(array, fn, defaultValue = []) {
  if (!Array.isArray(array)) {
    return defaultValue;
  }

  try {
    return array.map((item, index) => {
      try {
        return fn(item, index);
      } catch (error) {
        console.warn(`[SafeMap] Error mapping item at index ${index}:`, error.message);
        return null;
      }
    }).filter(item => item !== null);
  } catch (error) {
    console.error('[SafeMap] Fatal error during mapping:', error);
    return defaultValue;
  }
}

/**
 * Circuit breaker pattern
 * Prevents cascading failures by stopping requests after threshold
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 60000; // 1 minute
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      // Check if we should try to recover
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        console.log('[CircuitBreaker] Attempting recovery (HALF_OPEN)');
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - too many failures');
      }
    }

    try {
      const result = await fn();

      // Success - reset failures
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 2) {
          console.log('[CircuitBreaker] Recovery successful (CLOSED)');
          this.state = 'CLOSED';
          this.failures = 0;
        }
      } else {
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        console.error(`[CircuitBreaker] Threshold reached (${this.failures} failures) - circuit OPEN`);
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }
}
