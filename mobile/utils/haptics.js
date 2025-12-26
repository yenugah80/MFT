/**
 * Haptic Feedback Utility
 * Premium tactile feedback for iOS and Android
 * Makes the app feel like a top 1% product
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const haptics = {
  /**
   * Light impact - for UI interactions like button presses
   */
  light: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Medium impact - for significant actions
   */
  medium: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Heavy impact - for important confirmations
   */
  heavy: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },

  /**
   * Success notification - for completed actions
   * Use when: Food logged, goal achieved, streak maintained
   */
  success: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  /**
   * Warning notification - for warnings
   * Use when: Approaching calorie limit, data sync issue
   */
  warning: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },

  /**
   * Error notification - for errors
   * Use when: Analysis failed, network error
   */
  error: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  /**
   * Selection feedback - for picker/slider changes
   * Use when: Adjusting serving size, selecting meal type
   */
  selection: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.selectionAsync();
    }
  },

  /**
   * Disabled - no feedback (for testing)
   */
  none: () => {
    // Do nothing
  },
};

// Usage examples:
// import { haptics } from '../utils/haptics';
//
// // On button press
// haptics.light();
//
// // On food logged
// haptics.success();
//
// // On error
// haptics.error();

export default haptics;
