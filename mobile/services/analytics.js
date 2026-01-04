/**
 * Analytics Service (FREE - Uses Your Backend)
 *
 * Non-blocking analytics that sends events to your backend
 * - Failures are logged but don't crash the app
 * - Events are batched and sent asynchronously
 * - Can be upgraded to Mixpanel/Amplitude/Firebase later
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '../constants/api';

// Event queue for batching
let eventQueue = [];
let flushTimer = null;
let isAnalyticsReady = false;
let isFlushing = false;

// Configuration
const FLUSH_INTERVAL = 10000; // 10 seconds
const MAX_QUEUE_SIZE = 20;
const MAX_QUEUE_HISTORY = 100; // Max events to retain on failure
const FLUSH_TIMEOUT = 5000; // 5 second timeout per flush

// User properties
let userProperties = {};
let sessionId = null;
let sessionStart = null;
let initializeError = null;

/**
 * Initialize analytics session (non-blocking)
 *
 * IMPORTANT: This function does NOT throw or block startup
 * - Failures are logged but app continues normally
 * - Session ID is created immediately (idempotent - only once)
 * - Timer starts in background
 */
export const initAnalytics = async () => {
  try {
    // ✅ Only create session once - prevent duplicate sessions on re-initialization
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStart = new Date().toISOString();
    }

    // ✅ Only start flush timer once - prevent duplicate timers on re-initialization
    if (!__DEV__ && !flushTimer) {
      flushTimer = setInterval(() => {
        // Run in background, don't await
        flushEvents().catch((e) => {
          console.debug('[Analytics] Background flush error (logged, non-blocking):', e.message);
        });
      }, FLUSH_INTERVAL);
    }

    isAnalyticsReady = true;

    // Track app open asynchronously (fire and forget)
    trackEvent('app_opened', { session_id: sessionId });
  } catch (error) {
    // Store error but don't throw - app continues without analytics
    initializeError = error;
    console.warn('[Analytics] Initialize failed (continuing without analytics):', error.message);
  }
};

/**
 * Get device info for analytics
 */
const getDeviceInfo = () => ({
  platform: Platform.OS,
  os_version: String(Platform.Version),
  app_version: Constants.expoConfig?.version || '1.0.0',
  device: Constants.deviceName || 'unknown',
});

/**
 * Track an event (non-blocking, fire and forget)
 *
 * BEHAVIOR:
 * - Queues event for batching
 * - Auto-flushes when queue reaches MAX_QUEUE_SIZE
 * - Never throws or blocks app
 */
export const trackEvent = (eventName, properties = {}) => {
  if (!isAnalyticsReady && !initializeError) {
    // Analytics not initialized yet, skip
    return;
  }

  try {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      properties: {
        ...properties,
        ...userProperties,
        session_id: sessionId,
      },
      device: getDeviceInfo(),
    };

    if (__DEV__) {
      console.log('[Analytics]', eventName, properties);
      return;
    }

    eventQueue.push(event);

    // Flush if queue is full (non-blocking)
    if (eventQueue.length >= MAX_QUEUE_SIZE) {
      flushEvents().catch((e) => {
        console.debug('[Analytics] Queue flush error (non-blocking):', e.message);
      });
    }
  } catch (error) {
    // Silently fail - analytics shouldn't crash app
    console.debug('[Analytics] trackEvent error (silenced):', error.message);
  }
};

/**
 * Flush events to backend (non-blocking with timeout)
 *
 * STRATEGY:
 * - Never throws or blocks the app
 * - Has 5s timeout to prevent hangs
 * - Retries events on failure
 * - Logs errors for debugging
 */
const flushEvents = async () => {
  if (eventQueue.length === 0 || isFlushing) return;

  isFlushing = true;
  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    // Flush with timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FLUSH_TIMEOUT);

    const response = await fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsToSend }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.debug(
        `[Analytics] Server returned ${response.status}, retrying events...`
      );
      // Put events back for retry
      eventQueue = [...eventsToSend, ...eventQueue].slice(0, MAX_QUEUE_HISTORY);
    }
  } catch (error) {
    // Network or timeout error - queue for retry
    const errorType = error?.name === 'AbortError' ? 'timeout' : 'network';
    console.debug(`[Analytics] Flush ${errorType} error, queuing for retry:`, error.message);

    // Keep events for retry (maintain order, limit size)
    eventQueue = [...eventsToSend, ...eventQueue].slice(0, MAX_QUEUE_HISTORY);
  } finally {
    isFlushing = false;
  }
};

/**
 * Set user properties
 */
export const setUserProperties = (properties) => {
  userProperties = { ...userProperties, ...properties };
};

/**
 * Identify user
 */
export const identifyUser = (userId, properties = {}) => {
  userProperties = {
    user_id: userId,
    ...properties,
  };

  trackEvent('user_identified', { user_id: userId });
};

/**
 * Clear user on logout
 */
export const clearUser = () => {
  userProperties = {};
  trackEvent('user_logged_out');
};

/**
 * Track screen view
 */
export const trackScreen = (screenName, properties = {}) => {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
  });
};

/**
 * Cleanup on app close
 * Final flush of any pending events
 */
export const cleanupAnalytics = async () => {
  try {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }

    // Final flush with timeout
    if (eventQueue.length > 0) {
      await Promise.race([
        flushEvents(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Cleanup flush timeout')), 2000)
        ),
      ]);
    }
  } catch (error) {
    console.debug('[Analytics] Cleanup error (non-critical):', error.message);
    // Don't throw - cleanup should not block app shutdown
  }
};

/**
 * Get analytics status (for debugging)
 */
export const getAnalyticsStatus = () => ({
  ready: isAnalyticsReady,
  sessionId,
  sessionStart,
  queuedEvents: eventQueue.length,
  isFlushing,
  initializeError: initializeError?.message || null,
});

// ============================================================================
// PREDEFINED EVENTS (for consistency)
// ============================================================================

export const Events = {
  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Food Logging
  FOOD_LOG_STARTED: 'food_log_started',
  FOOD_LOGGED_TEXT: 'food_logged_text',
  FOOD_LOGGED_PHOTO: 'food_logged_photo',
  FOOD_LOGGED_VOICE: 'food_logged_voice',
  FOOD_LOGGED_BARCODE: 'food_logged_barcode',
  FOOD_LOG_FAILED: 'food_log_failed',

  // Mood
  MOOD_LOGGED: 'mood_logged',
  MOOD_INSIGHT_VIEWED: 'mood_insight_viewed',

  // Subscription
  PAYWALL_VIEWED: 'paywall_viewed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_COMPLETED: 'subscription_completed',
  SUBSCRIPTION_FAILED: 'subscription_failed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Engagement
  STREAK_ACHIEVED: 'streak_achieved',
  BADGE_EARNED: 'badge_earned',
  LEVEL_UP: 'level_up',
  RECOMMENDATION_VIEWED: 'recommendation_viewed',
  RECOMMENDATION_ACCEPTED: 'recommendation_accepted',

  // Features
  FEATURE_USED: 'feature_used',
  UPGRADE_PROMPT_SHOWN: 'upgrade_prompt_shown',
  UPGRADE_PROMPT_CLICKED: 'upgrade_prompt_clicked',
  UPGRADE_PROMPT_DISMISSED: 'upgrade_prompt_dismissed',
};

export default {
  initAnalytics,
  trackEvent,
  trackScreen,
  setUserProperties,
  identifyUser,
  clearUser,
  cleanupAnalytics,
  Events,
};
