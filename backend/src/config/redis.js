/**
 * Redis Configuration
 * Production-grade Redis client with connection pooling and error handling
 *
 * Usage:
 * - Caching: Nutrition data, user preferences
 * - Rate limiting: Distributed rate limiting across instances
 * - Session data: Optional session storage
 *
 * Configuration:
 * - Set REDIS_URL env var for Redis connection
 * - Falls back to in-memory when Redis unavailable
 */

import { createClient } from 'redis';

let redisClient = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Initialize Redis client
 * Returns null if Redis is not configured or unavailable
 */
export async function initializeRedis() {
  if (!process.env.REDIS_URL) {
    console.log('[Redis] No REDIS_URL configured - using in-memory caching');
    return null;
  }

  if (redisClient && isConnected) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 10000, // 10 seconds
        reconnectStrategy: (retries) => {
          connectionAttempts = retries;
          if (retries > MAX_RECONNECT_ATTEMPTS) {
            console.error('[Redis] Max reconnection attempts reached');
            return false; // Stop reconnecting
          }
          // Exponential backoff: 100ms, 200ms, 400ms, ... up to 3s
          const delay = Math.min(100 * Math.pow(2, retries), 3000);
          console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries}/${MAX_RECONNECT_ATTEMPTS})`);
          return delay;
        },
      },
    });

    // Event handlers
    redisClient.on('error', (err) => {
      console.error('[Redis] Client error:', err.message);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connecting...');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Connected and ready');
      isConnected = true;
      connectionAttempts = 0;
    });

    redisClient.on('end', () => {
      console.log('[Redis] Connection closed');
      isConnected = false;
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to connect:', error.message);
    isConnected = false;
    return null;
  }
}

/**
 * Get Redis client (lazy initialization)
 */
export async function getRedisClient() {
  if (!redisClient) {
    return initializeRedis();
  }
  return isConnected ? redisClient : null;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable() {
  return isConnected && redisClient !== null;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[Redis] Connection closed gracefully');
    } catch (error) {
      console.error('[Redis] Error closing connection:', error.message);
    }
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Parsed value or null
   */
  async get(key) {
    const client = await getRedisClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`[Redis] Cache get error for ${key}:`, error.message);
      return null;
    }
  },

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttlSeconds - Time to live in seconds (default: 1 hour)
   */
  async set(key, value, ttlSeconds = 3600) {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`[Redis] Cache set error for ${key}:`, error.message);
      return false;
    }
  },

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.warn(`[Redis] Cache del error for ${key}:`, error.message);
      return false;
    }
  },

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., "user:*")
   */
  async delPattern(pattern) {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (error) {
      console.warn(`[Redis] Cache delPattern error for ${pattern}:`, error.message);
      return false;
    }
  },

  /**
   * Check if key exists
   * @param {string} key - Cache key
   */
  async exists(key) {
    const client = await getRedisClient();
    if (!client) return false;

    try {
      return (await client.exists(key)) === 1;
    } catch (error) {
      console.warn(`[Redis] Cache exists error for ${key}:`, error.message);
      return false;
    }
  },
};

// Cache key generators for consistent naming
export const cacheKeys = {
  nutrition: (foodName) => `nutrition:${foodName.toLowerCase().trim()}`,
  userProfile: (userId) => `user:${userId}:profile`,
  userPreferences: (userId) => `user:${userId}:preferences`,
  userGoals: (userId) => `user:${userId}:goals`,
  dashboardData: (userId, date) => `dashboard:${userId}:${date}`,
  rateLimit: (userId, endpoint) => `ratelimit:${userId}:${endpoint}`,
};

export default {
  initializeRedis,
  getRedisClient,
  isRedisAvailable,
  closeRedis,
  cache,
  cacheKeys,
};
