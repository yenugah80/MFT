/**
 * Production-Grade API Client with Fast Retries & Health Checks
 *
 * IMPROVEMENTS:
 * - Fast retry delays: 200ms → 500ms → 1s (vs 1s → 2.8s → 4.8s)
 * - Request timeout: 10s max
 * - Backend health check
 * - Better error handling
 */

import { API_URL, API_BASE_URL, getTimezoneOffsetHeaders } from '@/constants/api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildUrlWithParams = (url, params) => {
  if (!params || typeof params !== 'object') {
    return url;
  }

  const resolvedUrl = new URL(url);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          resolvedUrl.searchParams.append(key, String(item));
        }
      });
      return;
    }

    resolvedUrl.searchParams.set(key, String(value));
  });

  return resolvedUrl.toString();
};

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
 * Fetch with timeout (supports per-request timeout)
 */
const fetchWithTimeout = (url, options, timeout = null) => {
  // Use custom timeout from options, or fall back to default
  const requestTimeout = timeout || options?._timeout || RETRY_CONFIG.timeout;

  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), requestTimeout)
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
    if (__DEV__) console.log(`[API] Client initialized with Base URL: ${this.baseURL}`);
  }

  setTokenProvider(provider) {
    this.tokenProvider = provider;
  }

  async getToken() {
    if (!this.tokenProvider) return null;
    try {
      return await this.tokenProvider();
    } catch (error) {
      if (__DEV__) console.error('[API] Token error:', error.message);
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

      if (__DEV__) console.log(`[API] Health: ${this.isHealthy ? '✅' : '⚠️'}`);
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      this.lastHealthCheck = now;
      if (__DEV__) console.error(`[API] ❌ Health check failed at ${this.baseURL}/health. Error: ${error.message}`);
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
      Object.assign(headers, getTimezoneOffsetHeaders());
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
      const { params, _timeout, ...fetchOptions } = options;
      const requestUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
      const fullUrl = buildUrlWithParams(requestUrl, params);

      if (__DEV__) {
        console.log(`[API] ${fetchOptions.method || 'GET'} ${fullUrl}`);
      }

      const response = await fetchWithTimeout(fullUrl, fetchOptions, _timeout);

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
          if (__DEV__) console.log(`[API] Retry (${attempt + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`);
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
        if (__DEV__) console.log('[API] ✅ Backend recovered');
      }

      return data;
    } catch (error) {
      // Network error - fast retry (but not timeouts or non-retryable errors)
      if (!error.response && isRetryableError(error) && attempt < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.delays[attempt];
        if (__DEV__) console.log(`[API] Network error, retry (${attempt + 1}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`);
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
          if (__DEV__ && error.message !== 'Request timeout') {
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

/**
 * Backend Warmup - fires immediately on module load
 * Wakes up Railway backend while user is still seeing splash screen.
 * Dramatically reduces perceived latency on cold starts.
 */
let warmupPromise = null;
export function warmupBackend() {
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    const startTime = Date.now();
    if (__DEV__) console.log('[API] 🔥 Warming up backend...');

    try {
      // Use a simple HEAD request to /health - minimal data transfer
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s for cold start

      const response = await fetch(`${apiClient.baseURL.replace('/api', '')}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if (response.ok) {
        if (__DEV__) console.log(`[API] ✅ Backend warm (${duration}ms)`);
        apiClient.isHealthy = true;
        apiClient.consecutiveFailures = 0;
      } else {
        if (__DEV__) console.log(`[API] ⚠️ Backend responded with ${response.status} (${duration}ms)`);
      }
    } catch (error) {
      if (__DEV__) {
        const duration = Date.now() - startTime;
        if (error.name === 'AbortError') {
          console.log(`[API] ⏱️ Warmup timeout after ${duration}ms - backend may still be starting`);
        } else {
          console.log(`[API] ⚠️ Warmup failed (${duration}ms): ${error.message}`);
        }
      }
    }
  })();

  return warmupPromise;
}

// Fire warmup immediately when module loads (before auth)
warmupBackend();

export default apiClient;
export { ApiClient };
