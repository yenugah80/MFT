/**
 * GlassCard Component
 * Premium glassmorphism card with frosted glass effect
 * Theme-aware: adapts to both light and dark modes
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../providers/ThemeProvider';
import { SPACING, RADIUS, SHADOWS as PREMIUM_SHADOWS } from '../../constants/premiumTheme';
import { DARK_SHADOWS } from '../../constants/darkPremiumTheme';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {Object} props.style - Additional styles
 * @param {'sm'|'md'|'lg'|'xl'} props.padding - Padding size
 * @param {boolean} props.glow - Add glow effect
 * @param {string} props.glowColor - Glow color for shadow
 * @param {'primary'|'secondary'|'elevated'} props.glassType - Glass intensity
 * @param {boolean} props.useBlur - Use native blur effect (iOS only, expensive)
 */
export default function GlassCard({
  children,
  style,
  padding = 'sm',
  glow = false,
  glowColor,
  glassType = 'primary',
  useBlur = false,
}) {
  const { theme, colors } = useTheme();

  const paddingValue = {
    sm: SPACING[3],
    md: SPACING[4],
    lg: SPACING[5],
    xl: SPACING[6],
  }[padding] || SPACING[3];

  const glowStyle = glow && glowColor ? {
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  } : {};

  // Theme-aware glass background
  const glassBackground = colors.card.background;
  const glassBorder = colors.card.border;

  // Theme-aware shadows
  const shadowStyle = theme === 'light' ? PREMIUM_SHADOWS.md : DARK_SHADOWS.glass;

  // If native blur is enabled (iOS), use BlurView
  if (useBlur) {
    return (
      <View style={[
        styles.cardContainer,
        { padding: paddingValue },
        glowStyle,
        style,
      ]}>
        <BlurView intensity={20} tint={theme === 'light' ? 'light' : 'dark'} style={styles.blur}>
          <View style={[
            styles.glassCard,
            {
              backgroundColor: glassBackground,
              borderColor: glassBorder,
            },
            shadowStyle,
          ]}>
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  // Default: Simple glassmorphism without native blur
  return (
    <View style={[
      styles.cardContainer,
      styles.glassCard,
      {
        padding: paddingValue,
        backgroundColor: glassBackground,
        borderColor: glassBorder,
      },
      shadowStyle,
      glowStyle,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    overflow: 'hidden',
  },
  glassCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    // borderColor and shadows are now applied dynamically based on theme
  },
  blur: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
});
