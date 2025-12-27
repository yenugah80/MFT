/**
 * Theme Analytics Service
 *
 * Comprehensive analytics tracking for theme system
 * Integrates with multiple analytics providers
 * Supports A/B testing and experimentation
 *
 * @version 1.0
 */

import { Platform } from 'react-native';
import storage, { STORAGE_KEYS } from '../utils/storage';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ANALYTICS_CONFIG = {
  enabled: true, // Always enabled (logs to backend)
  providers: {
    mixpanel: false,
    amplitude: false,
    firebase: false,
    custom: true, // Using custom backend
  },
  sampling: {
    rate: 1.0, // Track everything
  },
};

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

/**
 * Track theme-related events with comprehensive metadata
 */
export async function trackThemeEvent(eventName, properties = {}) {
  if (!ANALYTICS_CONFIG.enabled) {
    if (__DEV__) {
      console.log(`[ThemeAnalytics] ${eventName}`, properties);
    }
    return;
  }

  // Apply sampling
  if (Math.random() > ANALYTICS_CONFIG.sampling.rate) {
    return;
  }

  const enrichedProperties = await enrichEventProperties(properties);

  // Track to all enabled providers in parallel
  const trackingPromises = [];

  if (ANALYTICS_CONFIG.providers.mixpanel) {
    trackingPromises.push(trackToMixpanel(eventName, enrichedProperties));
  }

  if (ANALYTICS_CONFIG.providers.amplitude) {
    trackingPromises.push(trackToAmplitude(eventName, enrichedProperties));
  }

  if (ANALYTICS_CONFIG.providers.firebase) {
    trackingPromises.push(trackToFirebase(eventName, enrichedProperties));
  }

  if (ANALYTICS_CONFIG.providers.custom) {
    trackingPromises.push(trackToBackend(eventName, enrichedProperties));
  }

  try {
    await Promise.allSettled(trackingPromises);
  } catch (error) {
    console.error('[ThemeAnalytics] Tracking failed:', error);
  }
}

/**
 * Enrich event properties with device and user context
 */
async function enrichEventProperties(properties) {
  const [sessionData, userPreferences] = await Promise.all([
    getSessionData(),
    getUserPreferences(),
  ]);

  return {
    ...properties,
    // Timestamp
    timestamp: new Date().toISOString(),
    timestampUnix: Date.now(),

    // Device context
    platform: Platform.OS,
    platformVersion: Platform.Version,
    device: Platform.select({
      ios: 'iOS',
      android: 'Android',
      default: 'Unknown',
    }),

    // Session context
    ...sessionData,

    // User preferences
    ...userPreferences,

    // App context
    appVersion: '1.0.0', // TODO: Get from app.json or package.json

    // Category for filtering
    category: 'theme',
  };
}

/**
 * Get session data for analytics
 */
async function getSessionData() {
  try {
    // TODO: Implement proper session tracking
    return {
      sessionId: 'session_' + Date.now(), // Placeholder
      sessionStart: new Date().toISOString(),
    };
  } catch (error) {
    return {};
  }
}

/**
 * Get user preferences for context
 */
async function getUserPreferences() {
  try {
    const themePreference = await storage.getItem(STORAGE_KEYS.THEME_PREFERENCE);

    return {
      savedThemeMode: themePreference || 'light',
    };
  } catch (error) {
    return {};
  }
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Track to Mixpanel
 * https://mixpanel.com/
 */
async function trackToMixpanel(eventName, properties) {
  try {
    // TODO: Integrate with Mixpanel SDK
    // Example:
    // const Mixpanel = require('mixpanel-react-native').default;
    // await Mixpanel.track(eventName, properties);

    if (__DEV__) {
      console.log('[Mixpanel]', eventName, properties);
    }
  } catch (error) {
    console.error('[ThemeAnalytics] Mixpanel tracking failed:', error);
  }
}

/**
 * Track to Amplitude
 * https://amplitude.com/
 */
async function trackToAmplitude(eventName, properties) {
  try {
    // TODO: Integrate with Amplitude SDK
    // Example:
    // import * as Amplitude from '@amplitude/analytics-react-native';
    // await Amplitude.track(eventName, properties);

    if (__DEV__) {
      console.log('[Amplitude]', eventName, properties);
    }
  } catch (error) {
    console.error('[ThemeAnalytics] Amplitude tracking failed:', error);
  }
}

/**
 * Track to Firebase Analytics
 * https://firebase.google.com/docs/analytics
 */
async function trackToFirebase(eventName, properties) {
  try {
    // TODO: Integrate with Firebase Analytics
    // Example:
    // import analytics from '@react-native-firebase/analytics';
    // await analytics().logEvent(eventName, properties);

    if (__DEV__) {
      console.log('[Firebase]', eventName, properties);
    }
  } catch (error) {
    console.error('[ThemeAnalytics] Firebase tracking failed:', error);
  }
}

/**
 * Track to custom backend
 */
async function trackToBackend(eventName, properties) {
  try {
    // Send to backend /api/analytics endpoint
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

    await fetch(`${API_URL}/api/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: eventName,
        properties,
        timestamp: new Date().toISOString(),
      }),
    });

    if (__DEV__) {
      console.log('[Analytics]', eventName, properties);
    }
  } catch (error) {
    // Fail silently - don't break app if analytics fail
    if (__DEV__) {
      console.error('[ThemeAnalytics] Backend tracking failed:', error);
    }
  }
}

// ============================================================================
// THEME-SPECIFIC ANALYTICS
// ============================================================================

/**
 * Track theme adoption metrics
 * Call this periodically (e.g., daily) to measure theme usage
 */
export async function trackThemeAdoption() {
  const themeMode = await storage.getItem(STORAGE_KEYS.THEME_PREFERENCE);

  await trackThemeEvent('theme_adoption_snapshot', {
    currentThemeMode: themeMode || 'light',
    measurementType: 'daily',
  });
}

/**
 * Track theme session duration
 * Useful for understanding how long users stay in each theme
 */
export class ThemeSessionTracker {
  constructor() {
    this.sessionStart = null;
    this.currentTheme = null;
  }

  startSession(theme) {
    this.currentTheme = theme;
    this.sessionStart = Date.now();
  }

  endSession() {
    if (!this.sessionStart) return;

    const duration = Date.now() - this.sessionStart;

    trackThemeEvent('theme_session_ended', {
      theme: this.currentTheme,
      durationMs: duration,
      durationSeconds: Math.round(duration / 1000),
      durationMinutes: Math.round(duration / 60000),
    });

    this.sessionStart = null;
    this.currentTheme = null;
  }

  switchTheme(newTheme) {
    this.endSession();
    this.startSession(newTheme);
  }
}

// ============================================================================
// A/B TESTING SUPPORT
// ============================================================================

/**
 * Assign user to A/B test variant
 * Supports experimenting with theme features
 */
export async function assignThemeExperiment(experimentName) {
  try {
    const existingVariant = await storage.getItem(`experiment_${experimentName}`);

    if (existingVariant) {
      return existingVariant;
    }

    // Random assignment (50/50 split)
    const variant = Math.random() < 0.5 ? 'control' : 'treatment';

    await storage.setItem(`experiment_${experimentName}`, variant);

    await trackThemeEvent('experiment_assigned', {
      experimentName,
      variant,
    });

    return variant;
  } catch (error) {
    console.error('[ThemeAnalytics] Experiment assignment failed:', error);
    return 'control'; // Default to control on error
  }
}

/**
 * Track experiment conversion
 */
export async function trackThemeExperimentConversion(experimentName, conversionType) {
  const variant = await storage.getItem(`experiment_${experimentName}`);

  await trackThemeEvent('experiment_conversion', {
    experimentName,
    variant,
    conversionType,
  });
}

// ============================================================================
// ANALYTICS QUERIES & REPORTS
// ============================================================================

/**
 * Generate theme usage report (for internal dashboards)
 * This would typically be implemented on your backend
 */
export function generateThemeReport() {
  // Example report structure for backend implementation:
  return {
    overview: {
      // Percentage of users on each theme
      lightModeUsage: 0, // Calculate from events
      darkModeUsage: 0,
      autoModeUsage: 0,
    },
    adoption: {
      // Theme adoption over time
      dailyActiveUsers: {
        light: 0,
        dark: 0,
        auto: 0,
      },
    },
    engagement: {
      // How often users switch themes
      averageSwitchesPerDay: 0,
      mostCommonSwitchTime: '', // e.g., "evening" (18:00-22:00)
    },
    retention: {
      // Do users stick with their theme choice?
      day1Retention: 0, // % still on same theme after 1 day
      day7Retention: 0,
      day30Retention: 0,
    },
    platform: {
      // Theme usage by platform
      ios: {
        light: 0,
        dark: 0,
        auto: 0,
      },
      android: {
        light: 0,
        dark: 0,
        auto: 0,
      },
    },
  };
}

// ============================================================================
// KEY METRICS TO TRACK
// ============================================================================

/**
 * Recommended metrics for theme analytics dashboard:
 *
 * 1. **Adoption Metrics**
 *    - % users on light vs dark vs auto
 *    - Theme preference by platform (iOS/Android)
 *    - Theme preference by user demographic
 *    - Theme adoption trend over time
 *
 * 2. **Engagement Metrics**
 *    - Average theme switches per user per day
 *    - Time of day when switches occur
 *    - Session duration in each theme
 *    - Feature usage by theme (e.g., do dark mode users log more meals?)
 *
 * 3. **Performance Metrics**
 *    - Theme switch latency (ms)
 *    - App crash rate by theme
 *    - Battery impact (if measurable)
 *
 * 4. **Business Metrics**
 *    - Conversion rate by theme
 *    - Retention rate by theme
 *    - Premium upgrade rate by theme
 *    - Daily/monthly active users by theme
 *
 * 5. **UX Metrics**
 *    - Theme discovery rate (% users who find toggle)
 *    - Theme stickiness (% who switch back to original)
 *    - User satisfaction scores by theme
 *
 * 6. **A/B Test Metrics**
 *    - Experiment variant distribution
 *    - Conversion rates per variant
 *    - Statistical significance of results
 */

export default {
  trackThemeEvent,
  trackThemeAdoption,
  ThemeSessionTracker,
  assignThemeExperiment,
  trackThemeExperimentConversion,
  generateThemeReport,
};
