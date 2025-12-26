/**
 * Toast Notification Utility
 * Premium, non-intrusive feedback system
 * Replaces Alert.alert() for 10/10 UX
 */

import Toast from 'react-native-toast-message';
import { haptics } from './haptics';

/**
 * Toast notification utility
 * Modern replacement for Alert.alert()
 *
 * Usage:
 * import { toast } from '../utils/toast';
 *
 * toast.success('Food logged!', 'Your meal has been saved');
 * toast.error('Network error', 'Please try again');
 * toast.info('Tip', 'Try using voice input for faster logging');
 */

export const toast = {
  /**
   * Success toast - for completed actions
   * Use when: Food logged, goal achieved, sync completed
   */
  success: (title, message, options = {}) => {
    haptics.success(); // Haptic feedback
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
      ...options,
    });
  },

  /**
   * Error toast - for errors and failures
   * Use when: API error, validation failed, network issue
   */
  error: (title, message, options = {}) => {
    haptics.error(); // Haptic feedback
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
      ...options,
    });
  },

  /**
   * Info toast - for informational messages
   * Use when: Tips, helpful hints, neutral updates
   */
  info: (title, message, options = {}) => {
    haptics.light(); // Haptic feedback
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
      ...options,
    });
  },

  /**
   * Warning toast - for warnings and cautions
   * Use when: Approaching limit, data conflict, user attention needed
   */
  warning: (title, message, options = {}) => {
    haptics.warning(); // Haptic feedback
    Toast.show({
      type: 'error', // Use error type for warning (same visual treatment)
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
      ...options,
    });
  },

  /**
   * Custom toast with full control
   * Use when: Need custom styling or behavior
   */
  custom: (config) => {
    Toast.show(config);
  },

  /**
   * Hide current toast
   */
  hide: () => {
    Toast.hide();
  },

  /**
   * Quick success (just message, no title)
   */
  quickSuccess: (message, options = {}) => {
    haptics.success();
    Toast.show({
      type: 'success',
      text1: message,
      position: 'top',
      visibilityTime: 2000,
      autoHide: true,
      topOffset: 60,
      ...options,
    });
  },

  /**
   * Quick error (just message, no title)
   */
  quickError: (message, options = {}) => {
    haptics.error();
    Toast.show({
      type: 'error',
      text1: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
      ...options,
    });
  },

  /**
   * Loading toast (stays visible until manually hidden)
   * Use when: Long operation in progress
   */
  loading: (message = 'Loading...', options = {}) => {
    Toast.show({
      type: 'info',
      text1: message,
      position: 'top',
      autoHide: false,
      topOffset: 60,
      ...options,
    });
  },
};

/**
 * Custom toast configurations for common scenarios
 */
export const toastConfig = {
  /**
   * Food logged successfully
   */
  foodLogged: (foodName) => {
    toast.success(
      '✓ Food Logged',
      `${foodName} has been added to your diary`,
      { visibilityTime: 2500 }
    );
  },

  /**
   * Goal achieved
   */
  goalAchieved: (goalName) => {
    toast.success(
      '🎉 Goal Achieved!',
      `You've reached your ${goalName} goal`,
      { visibilityTime: 4000 }
    );
  },

  /**
   * Streak maintained
   */
  streakMaintained: (days) => {
    toast.success(
      '🔥 Streak Alive!',
      `${days} day${days > 1 ? 's' : ''} and counting`,
      { visibilityTime: 3000 }
    );
  },

  /**
   * Analysis complete
   */
  analysisComplete: () => {
    toast.success(
      'Analysis Complete',
      'Your meal has been analyzed',
      { visibilityTime: 2000 }
    );
  },

  /**
   * Network error
   */
  networkError: () => {
    toast.error(
      'Network Error',
      'Please check your connection and try again',
      { visibilityTime: 4000 }
    );
  },

  /**
   * Sync complete
   */
  syncComplete: () => {
    toast.quickSuccess('Synced with cloud', { visibilityTime: 2000 });
  },

  /**
   * Approaching calorie limit
   */
  approachingLimit: (remaining) => {
    toast.warning(
      'Approaching Daily Limit',
      `${remaining} calories remaining`,
      { visibilityTime: 3500 }
    );
  },

  /**
   * Data saved locally (offline)
   */
  savedOffline: () => {
    toast.info(
      'Saved Offline',
      'Will sync when connection is restored',
      { visibilityTime: 3000 }
    );
  },

  /**
   * Photo analysis failed
   */
  photoAnalysisFailed: () => {
    toast.error(
      'Analysis Failed',
      'Please try again with a clearer photo',
      { visibilityTime: 3500 }
    );
  },

  /**
   * Voice transcription failed
   */
  voiceFailed: () => {
    toast.error(
      'Voice Recognition Failed',
      'Please speak clearly and try again',
      { visibilityTime: 3500 }
    );
  },

  /**
   * Barcode not found
   */
  barcodeNotFound: () => {
    toast.warning(
      'Barcode Not Found',
      'Try entering the food manually',
      { visibilityTime: 3500 }
    );
  },

  /**
   * Premium feature (for future monetization)
   */
  premiumFeature: () => {
    toast.info(
      '⭐ Premium Feature',
      'Upgrade to unlock unlimited AI analysis',
      { visibilityTime: 4000 }
    );
  },
};

export default toast;
