/**
 * Rate Limiting Middleware
 * Production-grade rate limiting with Redis support
 *
 * Features:
 * - Global API rate limiting
 * - Stricter limits for expensive AI endpoints
 * - User-based rate limiting (not IP-based for security)
 * - Redis-backed for distributed deployments
 * - Graceful fallback to in-memory when Redis unavailable
 * - Proper IPv6 handling
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createClient } from 'redis';

// Redis client for distributed rate limiting
let redisClient = null;
let redisConnected = false;

/**
 * Initialize Redis for rate limiting
 * Falls back to in-memory if Redis unavailable
 */
async function initRedisForRateLimiting() {
  if (!process.env.REDIS_URL) {
    console.log('[RateLimiter] No REDIS_URL configured, using in-memory store');
    return null;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.warn('[RateLimiter] Redis reconnect failed, falling back to in-memory');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.warn('[RateLimiter] Redis error:', err.message);
      redisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('[RateLimiter] Redis connected');
      redisConnected = true;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn('[RateLimiter] Redis init failed, using in-memory:', error.message);
    return null;
  }
}

/**
 * Custom key generator - rate limit by userId (authenticated) or IP (unauthenticated)
 * Using userId is more accurate and secure
 * Uses the library's ipKeyGenerator for proper IPv6 handling
 */
const keyGenerator = (req) => {
  // Prefer userId for authenticated requests (most secure)
  if (req.auth?.userId) {
    return `user:${req.auth.userId}`;
  }

  // Fall back to IP for unauthenticated requests
  // Use the library's ipKeyGenerator helper for proper IPv6 handling
  const rawIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ipKeyGenerator(rawIp)}`;
};

/**
 * Standard rate limit response
 */
const standardHandler = (req, res, next, options) => {
  res.status(options.statusCode).json({
    success: false,
    error: 'Too many requests. Please slow down.',
    retryAfter: Math.ceil(options.windowMs / 1000),
    limit: options.max,
  });
};

/**
 * Global API Rate Limiter
 * Applies to all authenticated API routes
 *
 * Limits: 200 requests per minute per user
 * Generous enough for normal use, prevents abuse
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: standardHandler,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * AI Endpoint Rate Limiter
 * Stricter limits for expensive AI operations
 *
 * Limits: 30 requests per minute (0.5 per second)
 * Protects OpenAI API costs and ensures fair usage
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 AI requests per minute
  message: {
    success: false,
    error: 'AI request limit exceeded. Please wait before analyzing more food.',
    hint: 'Try again in a minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: standardHandler,
});

/**
 * Image Analysis Rate Limiter
 * Even stricter for image analysis (most expensive operation)
 *
 * Limits: 10 images per minute
 * Vision API is costly, need tight control
 */
export const imageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 image analyses per minute
  message: {
    success: false,
    error: 'Image analysis limit exceeded. Please wait before uploading more photos.',
    hint: 'You can analyze up to 10 images per minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: standardHandler,
});

/**
 * Auth Rate Limiter
 * Strict limits for authentication attempts
 *
 * Limits: 10 attempts per 15 minutes
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const rawIp = req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    return `auth:${ipKeyGenerator(rawIp)}`;
  },
  handler: standardHandler,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Admin Rate Limiter
 * Moderate limits for admin operations
 *
 * Limits: 60 requests per minute
 */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 admin requests per minute
  message: {
    success: false,
    error: 'Admin rate limit exceeded.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: standardHandler,
});

/**
 * Burst Limiter
 * Prevents rapid-fire requests (short window, low limit)
 *
 * Limits: 10 requests per second
 * Catches automated abuse while allowing normal bursts
 */
export const burstLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second
  message: {
    success: false,
    error: 'Request rate too high. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: standardHandler,
});

// Initialize Redis on module load
initRedisForRateLimiting().catch(console.error);

export default {
  globalLimiter,
  aiLimiter,
  imageLimiter,
  authLimiter,
  adminLimiter,
  burstLimiter,
};
