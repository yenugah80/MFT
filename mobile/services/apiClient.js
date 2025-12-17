/**
 * Enhanced API Client with Interceptors and Retry Logic
 *
 * Features:
 * - Automatic token injection from Clerk
 * - Exponential backoff retry for failed requests
 * - Request/Response logging in development
 * - Integrated error handling with notifications
 * - Network error detection
 */

import { API_URL } from '@/constants/api';
import { handleApiError } from '@/utils/errorHandler';

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  // Retry on these status codes
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error) => {
  // Network errors (no response from server)
  if (!error.response) {
    return true;
  }

  // Check status code
  const status = error.response?.status;
  return RETRY_CONFIG.retryableStatuses.includes(status);
};

/**
 * Calculate retry delay with exponential backoff
 */
const getRetryDelay = (attemptNumber) => {
  const delay = Math.min(
    RETRY_CONFIG.initialDelay * Math.pow(2, attemptNumber),
    RETRY_CONFIG.maxDelay
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
};

/**
 * API Client class
 */
class ApiClient {
  constructor() {
    this.baseURL = API_URL;
    this.tokenProvider = null;
  }

  /**
   * Set token provider function (usually from Clerk)
   */
  setTokenProvider(provider) {
    this.tokenProvider = provider;
  }

  /**
   * Get authentication token
   */
  async getToken() {
    if (!this.tokenProvider) {
      console.warn('[API Client] No token provider set');
      return null;
    }
    try {
      return await this.tokenProvider();
    } catch (error) {
      console.error('[API Client] Failed to get token:', error);
      return null;
    }
  }

  /**
   * Build request headers
   */
  async buildHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Add auth token if available
    const token = await this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Core fetch with retry logic
   */
  async fetchWithRetry(url, options = {}, attemptNumber = 0) {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

      // Log request in development
      if (__DEV__) {
        console.log(`[API] ${options.method || 'GET'} ${fullUrl}`);
      }

      const response = await fetch(fullUrl, options);

      // Log response in development
      if (__DEV__) {
        console.log(`[API] ${response.status} ${fullUrl}`);
      }

      // Handle non-OK responses
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: await response.json().catch(() => ({})),
        };

        // Check if we should retry
        if (
          isRetryableError(error) &&
          attemptNumber < RETRY_CONFIG.maxRetries
        ) {
          const delay = getRetryDelay(attemptNumber);
          console.log(
            `[API] Retrying request (${attemptNumber + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`
          );
          await sleep(delay);
          return this.fetchWithRetry(url, options, attemptNumber + 1);
        }

        throw error;
      }

      // Parse JSON response
      const data = await response.json();
      return data;
    } catch (error) {
      // Network error - retry if attempts remaining
      if (
        !error.response &&
        attemptNumber < RETRY_CONFIG.maxRetries
      ) {
        const delay = getRetryDelay(attemptNumber);
        console.log(
          `[API] Network error, retrying (${attemptNumber + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`
        );
        await sleep(delay);
        return this.fetchWithRetry(url, options, attemptNumber + 1);
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, {
      method: 'GET',
      headers,
      ...options,
    });
  }

  /**
   * POST request
   */
  async post(endpoint, data, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * PUT request
   */
  async put(endpoint, data, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, {
      method: 'DELETE',
      headers,
      ...options,
    });
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload(endpoint, formData, options = {}) {
    const headers = await this.buildHeaders({
      // Don't set Content-Type for FormData, let browser set it with boundary
      'Content-Type': undefined,
      ...options.headers,
    });

    // Remove Content-Type if it's undefined
    if (headers['Content-Type'] === undefined) {
      delete headers['Content-Type'];
    }

    return this.fetchWithRetry(endpoint, {
      method: 'POST',
      headers,
      body: formData,
      ...options,
    });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
export { ApiClient };
