import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { TEXT, BRAND } from '../../constants/premiumTheme';

/**
 * ActionItem
 *
 * Clickable action button with:
 * - Haptic feedback on press
 * - Navigation to relevant screen
 * - Post-action success feedback (checkmark + haptic + message)
 * - Scale animation on press
 *
 * @param {Object} props
 * @param {string} props.icon - Emoji icon (e.g., "🥗")
 * @param {string} props.text - Action text (e.g., "Add protein")
 * @param {string} props.description - Description (e.g., "Stabilizes blood sugar")
 * @param {Function} props.onTap - Async function for navigation/action
 * @param {Function} [props.onSuccess] - Called after success state completes
 * @returns {JSX.Element}
 */
export function ActionItem({ icon, text, description, onTap, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handlePress = async () => {
    // Prevent multiple taps
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Press feedback - medium haptic
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Scale animation: 1.0 → 0.98 → 1.0 (subtle press effect)
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Execute the action (typically navigation)
      await onTap?.();

      // Success feedback - success notification
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      // Show success state with checkmark
      setShowSuccess(true);

      // Fade in success message
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 2 seconds
      setTimeout(() => {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccess(false);
        });
      }, 2000);

      // Callback after success
      onSuccess?.();
    } catch (error) {
      // Error feedback
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );
      console.error('[ActionItem] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isLoading && styles.buttonActive,
        ]}
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={0.7}
        accessible
        accessibilityRole="button"
        accessibilityLabel={text}
        accessibilityHint={description}
      >
        <Animated.View
          style={[
            styles.buttonContent,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.text}>{text}</Text>
          <Text style={styles.description}>{description}</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Success Overlay - appears after action completes */}
      {showSuccess && (
        <Animated.View
          style={[
            styles.successOverlay,
            { opacity: opacityAnim },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>Nice choice</Text>
          <Text style={styles.successSubtext}>
            This supports energy stability
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 80,
    minWidth: 70,
  },
  button: {
    flex: 1,
    backgroundColor: BRAND.emerald,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,  // iOS/Android minimum touch target

    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,

    // Shadow for Android
    elevation: 3,
  },
  buttonActive: {
    backgroundColor: '#059669',  // Darker emerald
    opacity: 0.9,
  },
  buttonContent: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    marginBottom: 6,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 14,
  },

  // Success overlay (appears on top of button)
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BRAND.emerald,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 32,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 2,
  },
  successSubtext: {
    fontSize: 11,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 13,
  },
});
