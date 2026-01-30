/**
 * User Preferences Manager
 *
 * Centralized management of user preferences with type-safe getters/setters
 */

import { getItem, setItem, STORAGE_KEYS } from './storage';

/**
 * Default preferences
 */
const DEFAULT_PREFERENCES = {
  theme: 'light', // 'light' | 'dark' | 'auto'
  notifications: {
    enabled: true,
    dailyReminder: true,
    reminderTime: '09:00',
    achievementAlerts: true,
    goalAlerts: true,
  },
  units: {
    weight: 'kg', // 'kg' | 'lbs'
    height: 'cm', // 'cm' | 'ft'
    water: 'liters', // 'liters' | 'oz'
  },
  privacy: {
    analytics: true,
    crashReporting: true,
  },
  accessibility: {
    fontSize: 'medium', // 'small' | 'medium' | 'large'
    reduceMotion: false,
    assistedVoiceMode: false, // Enables larger buttons, audio guidance, auto-confirm for voice logging
  },
  // Top-level app preferences (synced with server)
  autoAnalyze: true, // Instant nutrition insights as you type
  hapticFeedback: true, // Subtle taps for key actions
  metricUnits: true, // Use metric units (g, kg, ml, liters)
  audioConfirmations: false, // Spoken feedback when logging food, mood, or water
  assistedVoiceMode: false, // Larger buttons, audio guidance, simplified voice logging
  voiceLanguage: 'en', // Language for voice recognition and TTS (en, hi, te, es, zh, fr, etc.)
  lastViewedScreen: null,
  onboardingCompleted: false,
  appVersion: null,
};

/**
 * Get all user preferences
 */
export const getPreferences = async () => {
  try {
    const stored = await getItem(STORAGE_KEYS.USER_PREFERENCES);
    return {
      ...DEFAULT_PREFERENCES,
      ...stored,
    };
  } catch (error) {
    console.error('[Preferences] Failed to get preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Update user preferences (merge with existing)
 */
export const updatePreferences = async (updates) => {
  try {
    const current = await getPreferences();
    const updated = {
      ...current,
      ...updates,
    };
    await setItem(STORAGE_KEYS.USER_PREFERENCES, updated);
    return updated;
  } catch (error) {
    console.error('[Preferences] Failed to update preferences:', error);
    throw error;
  }
};

/**
 * Get specific preference value
 */
export const getPreference = async (key) => {
  try {
    const prefs = await getPreferences();
    return prefs[key];
  } catch (error) {
    console.error(`[Preferences] Failed to get preference "${key}":`, error);
    return DEFAULT_PREFERENCES[key];
  }
};

/**
 * Set specific preference value
 */
export const setPreference = async (key, value) => {
  try {
    return await updatePreferences({ [key]: value });
  } catch (error) {
    console.error(`[Preferences] Failed to set preference "${key}":`, error);
    throw error;
  }
};

/**
 * Reset preferences to defaults
 */
export const resetPreferences = async () => {
  try {
    await setItem(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('[Preferences] Failed to reset preferences:', error);
    throw error;
  }
};

/**
 * Check if onboarding is completed
 */
export const isOnboardingCompleted = async () => {
  try {
    const prefs = await getPreferences();
    return prefs.onboardingCompleted === true;
  } catch (error) {
    console.error('[Preferences] Failed to check onboarding status:', error);
    return false;
  }
};

/**
 * Mark onboarding as completed
 */
export const completeOnboarding = async () => {
  try {
    return await setPreference('onboardingCompleted', true);
  } catch (error) {
    console.error('[Preferences] Failed to mark onboarding as completed:', error);
    throw error;
  }
};

export default {
  getPreferences,
  updatePreferences,
  getPreference,
  setPreference,
  resetPreferences,
  isOnboardingCompleted,
  completeOnboarding,
  DEFAULT_PREFERENCES,
};
