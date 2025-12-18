/**
 * BASE API CLIENT - Industrial-Grade Foundation
 * Features: Rate limiting, caching, circuit breaker, retry logic, metrics
 */

export class BaseApiClient {
  constructor(config) {
    this.name = config.name;
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 10000;
    this.apiKey = config.apiKey;

    // Rate limiting
    this.rateLimit = {
      maxRequests: config.rateLimit?.maxRequests || 60,
      windowMs: config.rateLimit?.windowMs || 60000, // 1 minute
      requests: [],
    };

    // Circuit breaker
    this.circuitBreaker = {
      failureThreshold: config.circuitBreaker?.failureThreshold || 5,
      resetTimeout: config.circuitBreaker?.resetTimeout || 60000,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failures: 0,
      lastFailureTime: null,
    };

    // Retry configuration
    this.retry = {
      maxAttempts: config.retry?.maxAttempts || 3,
      backoffMs: config.retry?.backoffMs || 1000,
      backoffMultiplier: config.retry?.backoffMultiplier || 2,
    };

    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    // In-memory cache (can be replaced with Redis)
    this.cache = new Map();
    this.cacheTTL = config.cacheTTL || 3600000; // 1 hour default
  }

  /**
   * Check if rate limit is exceeded
   */
  _checkRateLimit() {
    const now = Date.now();
    const windowStart = now - this.rateLimit.windowMs;

    // Clean old requests
    this.rateLimit.requests = this.rateLimit.requests.filter(
      (timestamp) => timestamp > windowStart
    );

    if (this.rateLimit.requests.length >= this.rateLimit.maxRequests) {
      const oldestRequest = this.rateLimit.requests[0];
      const waitTime = this.rateLimit.windowMs - (now - oldestRequest);

      console.warn(`[${this.name}] Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)}s`);

      return {
        exceeded: true,
        retryAfter: Math.ceil(waitTime / 1000),
      };
    }

    this.rateLimit.requests.push(now);
    return { exceeded: false };
  }

  /**
   * Check circuit breaker state
   */
  _checkCircuitBreaker() {
    const { state, failures, failureThreshold, resetTimeout, lastFailureTime } = this.circuitBreaker;

    if (state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - lastFailureTime;

      if (timeSinceLastFailure >= resetTimeout) {
        // Try half-open state
        this.circuitBreaker.state = 'HALF_OPEN';
        console.log(`[${this.name}] Circuit breaker entering HALF_OPEN state`);
        return { blocked: false };
      }

      console.warn(`[${this.name}] Circuit breaker OPEN. Retry in ${Math.ceil((resetTimeout - timeSinceLastFailure) / 1000)}s`);
      return {
        blocked: true,
        retryAfter: Math.ceil((resetTimeout - timeSinceLastFailure) / 1000),
      };
    }

    return { blocked: false };
  }

  /**
   * Record request success/failure for circuit breaker
   */
  _recordResult(success) {
    if (success) {
      this.circuitBreaker.failures = 0;
      if (this.circuitBreaker.state === 'HALF_OPEN') {
        this.circuitBreaker.state = 'CLOSED';
        console.log(`[${this.name}] Circuit breaker CLOSED`);
      }
      this.metrics.successfulRequests++;
    } else {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailureTime = Date.now();
      this.metrics.failedRequests++;

      if (this.circuitBreaker.failures >= this.circuitBreaker.failureThreshold) {
        this.circuitBreaker.state = 'OPEN';
        console.error(`[${this.name}] Circuit breaker OPEN after ${this.circuitBreaker.failures} failures`);
      }
    }
  }

  /**
   * Get from cache
   */
  _getFromCache(key) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      this.metrics.cacheHits++;
      console.log(`[${this.name}] Cache HIT: ${key}`);
      return cached.data;
    }

    if (cached) {
      this.cache.delete(key); // Expired
    }

    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Save to cache
   */
  _saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Simple cache size limit (keep last 1000 entries)
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Sleep utility for retry backoff
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make HTTP request with retry logic
   */
  async _fetchWithRetry(url, options = {}, attempt = 1) {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      this.metrics.totalLatency += latency;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const isLastAttempt = attempt >= this.retry.maxAttempts;

      if (isLastAttempt) {
        throw error;
      }

      // Calculate backoff
      const backoffTime = this.retry.backoffMs * Math.pow(this.retry.backoffMultiplier, attempt - 1);

      console.warn(`[${this.name}] Request failed (attempt ${attempt}/${this.retry.maxAttempts}). Retrying in ${backoffTime}ms...`);
      console.warn(`[${this.name}] Error:`, error.message);

      await this._sleep(backoffTime);
      return this._fetchWithRetry(url, options, attempt + 1);
    }
  }

  /**
   * Main request method with all guards
   */
  async request(url, options = {}, cacheKey = null) {
    this.metrics.totalRequests++;

    // Check cache first
    if (cacheKey) {
      const cached = this._getFromCache(cacheKey);
      if (cached) return cached;
    }

    // Check rate limit
    const rateLimitCheck = this._checkRateLimit();
    if (rateLimitCheck.exceeded) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`);
    }

    // Check circuit breaker
    const circuitCheck = this._checkCircuitBreaker();
    if (circuitCheck.blocked) {
      throw new Error(`Circuit breaker OPEN. Retry after ${circuitCheck.retryAfter}s`);
    }

    try {
      const data = await this._fetchWithRetry(url, options);

      this._recordResult(true);

      // Cache successful response
      if (cacheKey) {
        this._saveToCache(cacheKey, data);
      }

      return data;
    } catch (error) {
      this._recordResult(false);
      throw error;
    }
  }

  /**
   * Get client metrics
   */
  getMetrics() {
    const avgLatency = this.metrics.successfulRequests > 0
      ? Math.round(this.metrics.totalLatency / this.metrics.successfulRequests)
      : 0;

    const successRate = this.metrics.totalRequests > 0
      ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)
      : 0;

    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? ((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100).toFixed(2)
      : 0;

    return {
      name: this.name,
      totalRequests: this.metrics.totalRequests,
      successfulRequests: this.metrics.successfulRequests,
      failedRequests: this.metrics.failedRequests,
      successRate: `${successRate}%`,
      avgLatency: `${avgLatency}ms`,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      cacheHitRate: `${cacheHitRate}%`,
      circuitBreakerState: this.circuitBreaker.state,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log(`[${this.name}] Cache cleared`);
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker() {
    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.lastFailureTime = null;
    console.log(`[${this.name}] Circuit breaker manually reset`);
  }
}
