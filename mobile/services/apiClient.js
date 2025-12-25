/**
 * Production-Grade API Client with Fast Retries & Health Checks
 *
 * IMPROVEMENTS:
 * - Fast retry delays: 200ms → 500ms → 1s (vs 1s → 2.8s → 4.8s)
 * - Request timeout: 10s max
 * - Backend health check
 * - Better error handling
 */

import { API_URL, API_BASE_URL } from '@/constants/api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Production-optimized retry config
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  delays: [200, 500, 1000], // Fast progressive retries
  timeout: 10000, // 10s timeout
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/**
 * Fetch with timeout
 */
const fetchWithTimeout = (url, options, timeout = RETRY_CONFIG.timeout) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    ),
  ]);
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error) => {
  if (error.message === 'Request timeout') return false;
  if (error.response?.status === 401 || error.response?.status === 403) return false;
  if (!error.response) return true;
  return RETRY_CONFIG.retryableStatuses.includes(error.response.status);
};

/**
 * API Client
 */
class ApiClient {
  constructor() {
    this.baseURL = API_URL;
    this.tokenProvider = null;
    this.isHealthy = null;
    this.lastHealthCheck = 0;
    this.consecutiveFailures = 0;
    this.OFFLINE_THRESHOLD = 3; // Only mark offline after 3 consecutive failures
    console.log(`[API] Client initialized with Base URL: ${this.baseURL}`);
  }

  setTokenProvider(provider) {
    this.tokenProvider = provider;
  }

  async getToken() {
    if (!this.tokenProvider) return null;
    try {
      return await this.tokenProvider();
    } catch (error) {
      console.error('[API] Token error:', error.message);
      return null;
    }
  }

  /**
   * Quick health check (3s timeout)
   */
  async healthCheck() {
    const now = Date.now();
    if (this.isHealthy === true && now - this.lastHealthCheck < 10000) {
      return this.isHealthy;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeout);
      this.isHealthy = response.ok;
      this.lastHealthCheck = now;

      console.log(`[API] Health: ${this.isHealthy ? '✅' : '⚠️'}`);
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = now;
      console.error(`[API] ❌ Health check failed at ${this.baseURL}/health. Error: ${error.message}`);
      return false;
    }
  }

  async buildHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    };

    if (!('X-Timezone-Offset' in headers) && !('x-timezone-offset' in headers)) {
      headers['X-Timezone-Offset'] = String(new Date().getTimezoneOffset());
    }

    const token = await this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    return headers;
  }

  /**
   * Fetch with fast retry
   */
  async fetchWithRetry(url, options = {}, attempt = 0) {
    try {
      const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

      if (__DEV__) {
        console.log(`[API] ${options.method || 'GET'} ${fullUrl}`);
      }

      const response = await fetchWithTimeout(fullUrl, options);

      if (__DEV__) {
        console.log(`[API] ${response.status} ${fullUrl}`);
      }

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: await response.json().catch(() => ({})),
        };

        // Fast retry logic
        if (isRetryableError(error) && attempt < RETRY_CONFIG.maxRetries) {
          const delay = RETRY_CONFIG.delays[attempt];
          console.log(`[API] Retry (${attempt + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`);
          await sleep(delay);
          return this.fetchWithRetry(url, options, attempt + 1);
        }

        throw error;
      }

      const data = await response.json();

      // Reset consecutive failures on success
      this.consecutiveFailures = 0;
      if (this.isHealthy === false) {
        this.isHealthy = true;
        console.log('[API] ✅ Backend recovered');
      }

      return data;
    } catch (error) {
      // Network error - fast retry
      if (!error.response && attempt < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.delays[attempt];
        console.log(`[API] Network error, retry (${attempt + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`);
        await sleep(delay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      // Only increment offline failures for actual network issues or timeouts
      const isConnectivityIssue = !error.response || error.message === 'Request timeout';
      
      if (isConnectivityIssue) {
        this.consecutiveFailures = (this.consecutiveFailures || 0) + 1;
      }

      if (this.consecutiveFailures >= this.OFFLINE_THRESHOLD) {
        if (this.isHealthy !== false) {
          this.isHealthy = false;
          if (error.message !== 'Request timeout') {
            const serverError = error.response?.data?.message || error.response?.data?.error || error.message;
            console.error(
              `[API] ❌ Backend Error (${error.response?.status || 'Offline'}).\n` +
              `URL: ${this.baseURL}\n` +
              `Details: ${serverError}`
            );
          }
        }
      }

      throw error;
    }
  }

  async get(endpoint, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, { method: 'GET', headers, ...options });
  }

  async post(endpoint, data, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(endpoint, data, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  }

  async patch(endpoint, data, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    const headers = await this.buildHeaders(options.headers);
    return this.fetchWithRetry(endpoint, { method: 'DELETE', headers, ...options });
  }

  async upload(endpoint, formData, options = {}) {
    const headers = await this.buildHeaders({
      'Content-Type': undefined,
      ...options.headers,
    });

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

const apiClient = new ApiClient();
export default apiClient;
export { ApiClient };
