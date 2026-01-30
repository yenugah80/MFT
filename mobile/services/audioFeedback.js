/**
 * Audio Feedback Service
 * Provides TTS confirmations for app actions when accessibility mode is enabled
 *
 * Uses expo-speech for text-to-speech functionality
 * Respects user's accessibility and language preferences
 */

import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { getPreferences } from '../utils/preferences';
import { getTTSCode } from '../constants/languages';

// Base speech configuration (language will be added dynamically)
const BASE_SPEECH_CONFIG = {
  pitch: 1.0,
  rate: Platform.OS === 'ios' ? 0.9 : 0.85, // Slightly slower for clarity
};

// Cache for preferences to avoid async lookup on every call
let cachedPreferences = null;
let lastPreferenceCheck = 0;
const PREFERENCE_CACHE_TTL = 5000; // 5 seconds

/**
 * Refresh preferences cache
 */
async function refreshPreferencesCache() {
  try {
    cachedPreferences = await getPreferences();
    lastPreferenceCheck = Date.now();
    return true;
  } catch (error) {
    console.warn('[AudioFeedback] Failed to get preferences:', error);
    return false;
  }
}

/**
 * Get speech config with user's language preference
 */
function getSpeechConfig() {
  const voiceLanguage = cachedPreferences?.voiceLanguage || 'en';
  const ttsCode = getTTSCode(voiceLanguage);
  return {
    ...BASE_SPEECH_CONFIG,
    language: ttsCode,
  };
}

/**
 * Check if audio feedback is enabled
 * Uses cached preferences for performance
 */
async function isAudioFeedbackEnabled() {
  const now = Date.now();

  // Refresh cache if stale
  if (!cachedPreferences || now - lastPreferenceCheck > PREFERENCE_CACHE_TTL) {
    await refreshPreferencesCache();
  }

  // Audio feedback is enabled when audioConfirmations is on
  // Check both top-level and nested accessibility preferences for compatibility
  return cachedPreferences?.audioConfirmations === true ||
         cachedPreferences?.accessibility?.audioConfirmations === true;
}

/**
 * Speak text if audio feedback is enabled
 * @param {string} text - Text to speak
 * @param {object} options - Optional speech config overrides
 */
async function speak(text, options = {}) {
  const enabled = await isAudioFeedbackEnabled();
  if (!enabled) return;

  try {
    // Stop any ongoing speech first
    await Speech.stop();

    // Get speech config with user's language preference
    const speechConfig = getSpeechConfig();

    await Speech.speak(text, {
      ...speechConfig,
      ...options,
    });
  } catch (error) {
    console.warn('[AudioFeedback] Speech failed:', error);
  }
}

/**
 * Force speak (ignores preference - use sparingly)
 * For critical accessibility announcements
 */
async function speakAlways(text, options = {}) {
  try {
    await Speech.stop();

    // Refresh preferences for language even though we're ignoring the enabled check
    if (!cachedPreferences) {
      await refreshPreferencesCache();
    }
    const speechConfig = getSpeechConfig();

    await Speech.speak(text, {
      ...speechConfig,
      ...options,
    });
  } catch (error) {
    console.warn('[AudioFeedback] Speech failed:', error);
  }
}

/**
 * Clear preference cache (call when preferences change)
 */
function clearPreferenceCache() {
  cachedPreferences = null;
  lastPreferenceCheck = 0;
}

// ============================================================================
// FOOD LOGGING CONFIRMATIONS
// ============================================================================

/**
 * Announce food logged
 * @param {string} foodName - Name of the food
 * @param {number} calories - Calories in the food
 * @param {string} mealType - breakfast/lunch/dinner/snack
 */
async function announceFoodLogged(foodName, calories, mealType) {
  const cal = Math.round(calories);
  const meal = mealType || 'meal';

  // Keep it concise
  const text = cal > 0
    ? `${foodName}, ${cal} calories logged for ${meal}`
    : `${foodName} logged for ${meal}`;

  await speak(text);
}

/**
 * Announce meal logged with totals
 * @param {number} itemCount - Number of items
 * @param {number} totalCalories - Total calories
 * @param {string} mealType - Meal type
 */
async function announceMealLogged(itemCount, totalCalories, mealType) {
  const cal = Math.round(totalCalories);
  const items = itemCount === 1 ? 'item' : 'items';
  const meal = mealType || 'meal';

  const text = `${itemCount} ${items} logged for ${meal}. Total ${cal} calories.`;
  await speak(text);
}

// ============================================================================
// MOOD LOGGING CONFIRMATIONS
// ============================================================================

/**
 * Announce mood logged
 * @param {string} moodLabel - The mood (happy, sad, stressed, etc.)
 * @param {string} note - Optional note
 */
async function announceMoodLogged(moodLabel, note) {
  const text = note
    ? `Mood saved as ${moodLabel}`
    : `Feeling ${moodLabel}, saved`;

  await speak(text);
}

// ============================================================================
// HYDRATION LOGGING CONFIRMATIONS
// ============================================================================

/**
 * Announce water logged
 * @param {number} amount - Amount added in ml
 * @param {string} beverageType - Type of beverage (water, coffee, tea, etc.)
 */
async function announceWaterLogged(amount, beverageType = 'water') {
  const beverage = beverageType === 'water' ? '' : ` of ${beverageType}`;
  const text = `${amount} ml${beverage} added.`;
  await speak(text);
}

/**
 * Announce hydration goal reached
 */
async function announceHydrationGoalReached() {
  await speak("Congratulations! You've reached your hydration goal for today.");
}

// ============================================================================
// ACTIVITY LOGGING CONFIRMATIONS
// ============================================================================

/**
 * Announce activity logged
 * @param {string} activityName - Name of the activity
 * @param {number} duration - Duration in minutes
 * @param {number} caloriesBurned - Calories burned
 */
async function announceActivityLogged(activityName, duration, caloriesBurned) {
  const cal = Math.round(caloriesBurned);

  const text = cal > 0
    ? `${activityName} for ${duration} minutes logged. ${cal} calories burned.`
    : `${activityName} for ${duration} minutes logged.`;

  await speak(text);
}

// ============================================================================
// GENERAL CONFIRMATIONS
// ============================================================================

/**
 * Announce generic success
 * @param {string} action - What was done
 */
async function announceSuccess(action) {
  await speak(`${action} saved successfully`);
}

/**
 * Announce error
 * @param {string} action - What failed
 */
async function announceError(action) {
  await speak(`Sorry, ${action} failed. Please try again.`);
}

/**
 * Announce navigation (for screen readers)
 * @param {string} screenName - Name of screen
 */
async function announceScreen(screenName) {
  await speak(screenName);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Core
  speak,
  speakAlways,
  isAudioFeedbackEnabled,
  clearPreferenceCache,

  // Food
  announceFoodLogged,
  announceMealLogged,

  // Mood
  announceMoodLogged,

  // Hydration
  announceWaterLogged,
  announceHydrationGoalReached,

  // Activity
  announceActivityLogged,

  // General
  announceSuccess,
  announceError,
  announceScreen,
};

export default {
  speak,
  speakAlways,
  isAudioFeedbackEnabled,
  clearPreferenceCache,
  announceFoodLogged,
  announceMealLogged,
  announceMoodLogged,
  announceWaterLogged,
  announceHydrationGoalReached,
  announceActivityLogged,
  announceSuccess,
  announceError,
  announceScreen,
};
