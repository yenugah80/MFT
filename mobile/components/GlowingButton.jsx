/**
 * GlowingButton - Interactive Button with Glow Effect
 * Modern button with glassmorphism, glow, and smooth animations
 * Perfect for CTAs and important actions
 */

import React, { useRef } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BRAND, SURFACES, TEXT, RADIUS, SPACING, TYPOGRAPHY } from '../constants/premiumTheme';
import { GLOW, GLASS, INTERACTION } from '../constants/modernEffects';

/**
 * GlowingButton Component
 *
 * @param {Object} props
 * @param {string} props.title - Button text
 * @param {Function} props.onPress - Press handler
 * @param {'primary'|'success'|'warning'|'info'|'glass'} props.variant - Button style variant
 * @param {'small'|'medium'|'large'} props.size - Button size
 * @param {string} props.icon - Optional Ionicons icon name
 * @param {boolean} props.iconRight - Whether to place icon on right side
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {boolean} props.loading - Whether button is in loading state
 * @param {boolean} props.withGlow - Whether to show glow effect
 * @param {boolean} props.withHaptics - Whether to trigger haptic feedback
 * @param {Object} props.style - Additional styles
 */
export default function GlowingButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconRight = false,
  disabled = false,
  loading = false,
  withGlow = true,
  withHaptics = true,
  style,
  ...rest
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Get variant styles
  const variantConfig = getVariantConfig(variant);
  const sizeConfig = getSizeConfig(size);

  // Handle press with animation and haptics
  const handlePressIn = () => {
    if (withHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;
    onPress?.();
  };

  // Render button content
  const renderContent = () => (
    <View style={styles.contentContainer}>
      {icon && !iconRight && (
        <Ionicons
          name={icon}
          size={sizeConfig.iconSize}
          color={variantConfig.textColor}
          style={styles.iconLeft}
        />
      )}

      <Text
        style={[
          styles.text,
          { color: variantConfig.textColor },
          sizeConfig.textStyle,
        ]}
      >
        {loading ? 'Loading...' : title}
      </Text>

      {icon && iconRight && (
        <Ionicons
          name={icon}
          size={sizeConfig.iconSize}
          color={variantConfig.textColor}
          style={styles.iconRight}
        />
      )}
    </View>
  );

  // Get glow style
  const glowStyle = withGlow && !disabled ? variantConfig.glow : {};

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {variantConfig.gradient ? (
        // Gradient button
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={0.85}
          {...rest}
        >
          <LinearGradient
            colors={variantConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.button,
              sizeConfig.buttonStyle,
              glowStyle,
              disabled && INTERACTION.disabled,
            ]}
          >
            {renderContent()}
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        // Solid/glass button
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={0.85}
          style={[
            styles.button,
            sizeConfig.buttonStyle,
            variantConfig.backgroundColor && { backgroundColor: variantConfig.backgroundColor },
            variantConfig.borderColor && {
              borderWidth: 1,
              borderColor: variantConfig.borderColor,
            },
            glowStyle,
            disabled && INTERACTION.disabled,
          ]}
          {...rest}
        >
          {renderContent()}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// Variant configurations
function getVariantConfig(variant) {
  switch (variant) {
    case 'primary':
      return {
        gradient: SURFACES.gradient.primary,
        textColor: TEXT.white,
        glow: GLOW.medium,
      };

    case 'success':
      return {
        gradient: SURFACES.gradient.success,
        textColor: TEXT.white,
        glow: GLOW.success,
      };

    case 'warning':
      return {
        gradient: SURFACES.gradient.warning,
        textColor: TEXT.white,
        glow: GLOW.warning,
      };

    case 'info':
      return {
        gradient: SURFACES.gradient.purple,
        textColor: TEXT.white,
        glow: GLOW.info,
      };

    case 'glass':
      return {
        backgroundColor: GLASS.light.backgroundColor,
        borderColor: GLASS.light.borderColor,
        textColor: TEXT.primary,
        glow: GLOW.subtle,
      };

    default:
      return {
        gradient: SURFACES.gradient.primary,
        textColor: TEXT.white,
        glow: GLOW.medium,
      };
  }
}

// Size configurations
function getSizeConfig(size) {
  switch (size) {
    case 'small':
      return {
        buttonStyle: {
          paddingVertical: SPACING[2],
          paddingHorizontal: SPACING[3],
          borderRadius: RADIUS.md,
        },
        textStyle: {
          fontSize: TYPOGRAPHY.size.sm,
          fontWeight: TYPOGRAPHY.weight.semibold,
        },
        iconSize: 16,
      };

    case 'large':
      return {
        buttonStyle: {
          paddingVertical: SPACING[4],
          paddingHorizontal: SPACING[6],
          borderRadius: RADIUS.xl,
        },
        textStyle: {
          fontSize: TYPOGRAPHY.size.lg,
          fontWeight: TYPOGRAPHY.weight.bold,
        },
        iconSize: 24,
      };

    case 'medium':
    default:
      return {
        buttonStyle: {
          paddingVertical: SPACING[3],
          paddingHorizontal: SPACING[5],
          borderRadius: RADIUS.lg,
        },
        textStyle: {
          fontSize: TYPOGRAPHY.size.base,
          fontWeight: TYPOGRAPHY.weight.semibold,
        },
        iconSize: 20,
      };
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    textAlign: 'center',
  },

  iconLeft: {
    marginRight: SPACING[2],
  },

  iconRight: {
    marginLeft: SPACING[2],
  },
});
