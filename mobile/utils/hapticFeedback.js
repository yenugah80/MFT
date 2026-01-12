import * as Haptics from 'expo-haptics';

/**
 * Centralized haptic feedback patterns
 *
 * Provides consistent haptic feedback across all components.
 * Use these instead of calling Haptics directly.
 *
 * Example:
 * await hapticFeedback.success();
 * await hapticFeedback.error();
 * await hapticFeedback.light();
 */

export const hapticFeedback = {
  /**
   * Light tap feedback
   * Use for: Button hovers, option selection, light interactions
   */
  light: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('[hapticFeedback] Light feedback failed:', error);
    }
  },

  /**
   * Medium press feedback
   * Use for: Button presses, form submissions, main actions
   */
  medium: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('[hapticFeedback] Medium feedback failed:', error);
    }
  },

  /**
   * Heavy impact feedback
   * Use for: Important actions, critical confirmations, warnings
   */
  heavy: async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('[hapticFeedback] Heavy feedback failed:', error);
    }
  },

  /**
   * Success notification (positive ding)
   * Use for: Action completed, form submitted, goal reached
   */
  success: async () => {
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch (error) {
      console.warn('[hapticFeedback] Success notification failed:', error);
    }
  },

  /**
   * Error notification (negative buzz)
   * Use for: Validation failed, network error, action failed
   */
  error: async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn('[hapticFeedback] Error notification failed:', error);
    }
  },

  /**
   * Warning notification
   * Use for: Caution, validation warning, something to be careful about
   */
  warning: async () => {
    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning
      );
    } catch (error) {
      console.warn('[hapticFeedback] Warning notification failed:', error);
    }
  },

  /**
   * Selection change feedback
   * Use for: Radio button selection, option toggle, list selection
   */
  selection: async () => {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.warn('[hapticFeedback] Selection feedback failed:', error);
    }
  },

  /**
   * Sequence: Press → action → success
   * Use for: Complete action flow with user feedback
   */
  actionFlow: async () => {
    try {
      // Press feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Small delay for sequential feel
      await new Promise((resolve) => setTimeout(resolve, 150));
      // Success feedback
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    } catch (error) {
      console.warn('[hapticFeedback] Action flow failed:', error);
    }
  },

  /**
   * Gentle pulse (light impact repeated)
   * Use for: Notifications, reminders, attention seeking
   */
  pulse: async (count = 3, interval = 150) => {
    try {
      for (let i = 0; i < count; i++) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (i < count - 1) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      }
    } catch (error) {
      console.warn('[hapticFeedback] Pulse feedback failed:', error);
    }
  },
};

/**
 * Haptic feedback presets for common scenarios
 */
export const hapticPresets = {
  // User accepts recommendation
  acceptRecommendation: () => hapticFeedback.actionFlow(),

  // User dismisses something
  dismiss: () => hapticFeedback.light(),

  // Modal opens
  modalOpen: () => hapticFeedback.light(),

  // Modal closes
  modalClose: () => hapticFeedback.light(),

  // Form validation error
  validationError: () => hapticFeedback.warning(),

  // Network error
  networkError: () => hapticFeedback.error(),

  // Data loaded successfully
  dataLoaded: () => hapticFeedback.success(),

  // Important alert
  alert: () => hapticFeedback.heavy(),
};
