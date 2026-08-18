/**
 * Shared Redis client for application-level caching (CF candidates,
 * hydration signals, etc.) — separate from rateLimiter.js's own Redis
 * connection, which is wired specifically into express-rate-limit's store
 * interface and shouldn't be reused for general get/set/del traffic.
 *
 * Connects lazily on first use and follows the same resilience pattern
 * already established for rate limiting: no REDIS_URL, or any connection
 * failure, means every caller falls back to its own in-memory cache
 * instead of failing the request.
 */
import { createClient } from 'redis';

let client = null;
let isConnected = false;
let connectPromise = null;

function createAndConnect() {
  const c = createClient({
    url: process.env.REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.warn('[Redis] Cache client reconnect failed, staying on in-memory fallback');
          return false;
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  c.on('error', (err) => {
    console.warn('[Redis] Cache client error:', err.message);
    isConnected = false;
  });
  c.on('connect', () => {
    console.log('[Redis] Cache client connected');
    isConnected = true;
  });
  c.on('end', () => {
    isConnected = false;
  });

  return c.connect()
    .then(() => c)
    .catch((err) => {
      console.warn('[Redis] Cache client init failed, using in-memory fallback:', err.message);
      client = null;
      return null;
    });
}

/**
 * Resolves to the connected Redis client, or null if Redis isn't
 * configured/reachable — callers must treat null as "use your fallback."
 * Safe to call on every request; the connection is only established once.
 */
export async function ensureRedisReady() {
  if (!process.env.REDIS_URL) return null;

  if (!connectPromise) {
    connectPromise = createAndConnect().then((c) => {
      client = c;
      return c;
    });
  }

  await connectPromise;
  return isConnected ? client : null;
}

export function isRedisCacheConnected() {
  return isConnected;
}
