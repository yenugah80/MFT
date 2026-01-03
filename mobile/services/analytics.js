/**
 * Analytics Service (FREE - Uses Your Backend)
 *
 * Simple analytics that sends events to your backend.
 * Can be upgraded to Mixpanel/Amplitude/Firebase later.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_URL } from '../constants/api';

// Event queue for batching
let eventQueue = [];
let flushTimer = null;
const FLUSH_INTERVAL = 10000; // 10 seconds
const MAX_QUEUE_SIZE = 20;

// User properties
let userProperties = {};
let sessionId = null;
let sessionStart = null;

/**
 * Initialize analytics session
 */
export const initAnalytics = () => {
  sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStart = new Date().toISOString();

  // Start flush timer
  if (!__DEV__) {
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL);
  }

  // Track app open
  trackEvent('app_opened', {
    session_id: sessionId,
  });
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
 * Track an event
 */
export const trackEvent = (eventName, properties = {}) => {
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

  // Flush if queue is full
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushEvents();
  }
};

/**
 * Flush events to backend
 */
const flushEvents = async () => {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    await fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: eventsToSend }),
    });
  } catch (e) {
    // Put events back in queue on failure
    eventQueue = [...eventsToSend, ...eventQueue].slice(0, 100);
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
 */
export const cleanupAnalytics = () => {
  if (flushTimer) {
    clearInterval(flushTimer);
  }
  flushEvents(); // Final flush
};

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
