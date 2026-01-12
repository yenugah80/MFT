/**
 * PressableCard - Premium Interactive Card Component
 *
 * Design Philosophy:
 * - Smooth, physics-based press feedback
 * - Subtle glow effects on interaction
 * - Respects accessibility preferences
 * - Consistent with premium design system
 */

import React, { useRef, useCallback, useMemo } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  PREMIUM_COLORS,
  CARDS,
  SHADOWS,
  RADIUS,
  SPACING,
} from '../../constants/premiumDesignSystem';
import { SPRING, scalePressIn, scalePressOut } from '../../utils/animations';

/**
 * Card variants
 */
const VARIANTS = {
  hero: 'hero',
  standard: 'standard',
  compact: 'compact',
  glass: 'glass',
  gradient: 'gradient',
};

/**
 * Glow color presets
 */
const GLOW_PRESETS = {
  nutrition: SHADOWS.glow.nutrition,
  hydration: SHADOWS.glow.hydration,
  mood: SHADOWS.glow.mood,
  activity: SHADOWS.glow.activity,
  progress: SHADOWS.glow.progress,
  brand: SHADOWS.glow.brand,
  none: null,
};

/**
 * Gradient presets
 */
const GRADIENT_PRESETS = {
  nutrition: PREMIUM_COLORS.functional.nutrition.gradient,
  hydration: PREMIUM_COLORS.functional.hydration.gradient,
  mood: PREMIUM_COLORS.functional.mood.gradient,
  activity: PREMIUM_COLORS.functional.activity.gradient,
  insights: PREMIUM_COLORS.functional.insights.gradient,
  progress: PREMIUM_COLORS.functional.progress.gradient,
};

export default function PressableCard({
  children,
  onPress,
  onLongPress,
  variant = 'standard',
  glow = 'none',
  gradient = null,
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  disabled = false,
  hapticFeedback = true,
  style,
  contentContainerStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) {
  // Animation values
  const scaleValue = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Get card style based on variant
  const cardStyle = useMemo(() => {
    switch (variant) {
      case VARIANTS.hero:
        return CARDS.hero;
      case VARIANTS.compact:
        return CARDS.compact;
      case VARIANTS.glass:
        return CARDS.glass;
      case VARIANTS.gradient:
        return {
          ...CARDS.standard,
          backgroundColor: 'transparent',
        };
      default:
        return CARDS.standard;
    }
  }, [variant]);

  // Get glow shadow
  const glowShadow = useMemo(() => {
    if (glow === 'none') return null;
    return GLOW_PRESETS[glow] || null;
  }, [glow]);

  // Get gradient colors
  const gradientColors = useMemo(() => {
    if (!gradient) return null;
    return GRADIENT_PRESETS[gradient] || gradient;
  }, [gradient]);

  // Handle press in
  const handlePressIn = useCallback(() => {
    // Scale animation
    Animated.spring(scaleValue, {
      toValue: 0.98,
      ...SPRING.snappy,
    }).start();

    // Glow animation
    if (glowShadow) {
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
  }, [scaleValue, glowOpacity, glowShadow]);

  // Handle press out
  const handlePressOut = useCallback(() => {
    // Scale animation
    Animated.spring(scaleValue, {
      toValue: 1,
      ...SPRING.snappy,
    }).start();

    // Glow animation
    if (glowShadow) {
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [scaleValue, glowOpacity, glowShadow]);

  // Handle press
  const handlePress = useCallback(() => {
    if (disabled) return;

    // Haptic feedback
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress?.();
  }, [disabled, hapticFeedback, onPress]);

  // Handle long press
  const handleLongPress = useCallback(() => {
    if (disabled || !onLongPress) return;

    // Haptic feedback
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onLongPress?.();
  }, [disabled, hapticFeedback, onLongPress]);

  // Animated style
  const animatedStyle = useMemo(
    () => ({
      transform: [{ scale: scaleValue }],
    }),
    [scaleValue]
  );

  // Combine styles
  const combinedCardStyle = useMemo(
    () => [
      styles.card,
      cardStyle,
      glowShadow && {
        ...glowShadow,
        shadowOpacity: glowOpacity.interpolate({
          inputRange: [0, 1],
          outputRange: [0, glowShadow.shadowOpacity],
        }),
      },
      disabled && styles.disabled,
      style,
    ],
    [cardStyle, glowShadow, glowOpacity, disabled, style]
  );

  // Render content wrapper
  const renderContent = () => {
    if (gradientColors) {
      return (
        <LinearGradient
          colors={gradientColors}
          start={gradientStart}
          end={gradientEnd}
          style={[styles.gradientContainer, { borderRadius: cardStyle.borderRadius }]}
        >
          <View style={[styles.contentContainer, contentContainerStyle]}>
            {children}
          </View>
        </LinearGradient>
      );
    }

    return (
      <View style={[styles.contentContainer, contentContainerStyle]}>
        {children}
      </View>
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <Animated.View style={[combinedCardStyle, animatedStyle]}>
        {renderContent()}
      </Animated.View>
    </Pressable>
  );
}

/**
 * Non-pressable card variant (for display-only cards)
 */
export function Card({
  children,
  variant = 'standard',
  glow = 'none',
  gradient = null,
  gradientStart = { x: 0, y: 0 },
  gradientEnd = { x: 1, y: 1 },
  style,
  contentContainerStyle,
}) {
  const cardStyle = useMemo(() => {
    switch (variant) {
      case 'hero':
        return CARDS.hero;
      case 'compact':
        return CARDS.compact;
      case 'glass':
        return CARDS.glass;
      default:
        return CARDS.standard;
    }
  }, [variant]);

  const glowShadow = useMemo(() => {
    if (glow === 'none') return null;
    return GLOW_PRESETS[glow] || null;
  }, [glow]);

  const gradientColors = useMemo(() => {
    if (!gradient) return null;
    return GRADIENT_PRESETS[gradient] || gradient;
  }, [gradient]);

  if (gradientColors) {
    return (
      <View style={[styles.card, cardStyle, glowShadow, style]}>
        <LinearGradient
          colors={gradientColors}
          start={gradientStart}
          end={gradientEnd}
          style={[styles.gradientContainer, { borderRadius: cardStyle.borderRadius }]}
        >
          <View style={[styles.contentContainer, contentContainerStyle]}>
            {children}
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.card, cardStyle, glowShadow, style]}>
      <View style={[styles.contentContainer, contentContainerStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.6,
  },
});
