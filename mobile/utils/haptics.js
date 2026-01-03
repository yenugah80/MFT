/**
 * Centralized Haptic Feedback Utility
 * Premium tactile feedback for iOS and Android
 * Provides consistent patterns matching top-tier nutrition apps
 *
 * Usage:
 *   import { haptics, HAPTICS } from '../utils/haptics';
 *   haptics.light();     // Basic patterns
 *   HAPTICS.celebration(); // Advanced patterns
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Basic haptic patterns (backward compatible)
 */
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

/**
 * Advanced haptic patterns for premium UX
 */
export const HAPTICS = {
  /**
   * Light tap for button presses and minor interactions
   */
  buttonPress: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Light tap for chip/tag selection
   */
  chipSelect: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Medium impact for save actions
   */
  save: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Medium impact for toggle switches
   */
  toggle: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Heavy impact for delete actions
   */
  delete: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },

  /**
   * Success notification pattern
   */
  success: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  /**
   * Warning notification pattern
   */
  warning: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },

  /**
   * Error notification pattern
   */
  error: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  /**
   * Celebration pattern - Success + double light tap
   * Used for goal achievement, streaks, etc.
   */
  celebration: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise(resolve => setTimeout(resolve, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise(resolve => setTimeout(resolve, 80));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Soft tap for scrolling interactions
   */
  scroll: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.selectionAsync();
    }
  },

  /**
   * Selection feedback for pickers and sliders
   */
  selection: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.selectionAsync();
    }
  },

  /**
   * Card press feedback
   */
  cardPress: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Tab change feedback
   */
  tabChange: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Modal open/close feedback
   */
  modal: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Pull to refresh feedback
   */
  refresh: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Swipe action feedback
   */
  swipe: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Long press feedback
   */
  longPress: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  },

  /**
   * Drag start feedback
   */
  dragStart: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Drag end/drop feedback
   */
  dragEnd: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Progress milestone feedback (e.g., 50%, 100%)
   */
  milestone: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },

  /**
   * Goal reached celebration pattern
   * More elaborate than standard celebration
   */
  goalReached: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise(resolve => setTimeout(resolve, 150));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise(resolve => setTimeout(resolve, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise(resolve => setTimeout(resolve, 80));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Streak continuation feedback
   */
  streak: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise(resolve => setTimeout(resolve, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Add item feedback (meal logged, etc.)
   */
  addItem: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  },

  /**
   * Remove item feedback
   */
  removeItem: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  },

  /**
   * Input focus feedback
   */
  inputFocus: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.selectionAsync();
    }
  },

  /**
   * Form validation error feedback
   */
  validationError: async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },
};

/**
 * Check if haptics are available on the device
 * Note: expo-haptics handles unavailability gracefully,
 * but this can be used for conditional UI
 */
export const isHapticsAvailable = async () => {
  try {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return false;
    }
    await Haptics.selectionAsync();
    return true;
  } catch {
    return false;
  }
};

export default haptics;
