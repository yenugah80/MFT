/**
 * GlassCard - Glassmorphism Card Component
 * Modern frosted glass effect with light borders and glows
 * Supports multiple variants and interactive states
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MODERN_CARDS, GLASS, GLOW, LIGHT_BORDER, INTERACTION } from '../constants/modernEffects';
import { RADIUS, SPACING } from '../constants/premiumTheme';

/**
 * GlassCard Component
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Content to render inside the card
 * @param {'glass'|'glassLit'|'hero'|'interactive'|'cta'|'compact'} props.variant - Card variant
 * @param {Function} props.onPress - Optional press handler (makes card touchable)
 * @param {Object} props.style - Additional styles to apply
 * @param {boolean} props.withGradientBorder - Whether to add gradient border effect
 * @param {Array<string>} props.gradientColors - Custom gradient colors for border
 * @param {boolean} props.withLightRay - Whether to add light ray accent in corner
 * @param {string} props.glowType - Type of glow effect ('subtle'|'medium'|'strong'|'success'|'warning'|'info')
 * @param {Object} props.containerStyle - Style for outer container
 */
export default function GlassCard({
  children,
  variant = 'glass',
  onPress,
  style,
  withGradientBorder = false,
  gradientColors = ['rgba(79, 143, 139, 0.4)', 'rgba(156, 201, 198, 0.2)'],
  withLightRay = false,
  glowType,
  containerStyle,
  ...rest
}) {
  // Get base card style from variant
  const baseStyle = MODERN_CARDS[variant] || MODERN_CARDS.glass;

  // Apply custom glow if specified
  const glowStyle = glowType ? GLOW[glowType] : {};

  // Merge all styles
  const cardStyle = [
    baseStyle,
    glowStyle,
    style,
  ];

  // Render card content
  const renderContent = () => (
    <View style={cardStyle} {...rest}>
      {/* Light ray accent in top-right corner */}
      {withLightRay && (
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.lightRay}
        />
      )}

      {/* Card content */}
      {children}
    </View>
  );

  // If gradient border requested, wrap in gradient
  if (withGradientBorder) {
    return (
      <View style={containerStyle}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientWrapper, { borderRadius: baseStyle.borderRadius || RADIUS.xl }]}
        >
          {onPress ? (
            <TouchableOpacity
              onPress={onPress}
              activeOpacity={0.85}
              style={styles.touchableInner}
            >
              {renderContent()}
            </TouchableOpacity>
          ) : (
            renderContent()
          )}
        </LinearGradient>
      </View>
    );
  }

  // Standard card (no gradient border)
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={containerStyle}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  gradientWrapper: {
    padding: 2, // Thickness of gradient border
  },

  touchableInner: {
    borderRadius: RADIUS.xl,
  },

  lightRay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    borderTopRightRadius: RADIUS.xl,
    opacity: 0.3,
    pointerEvents: 'none',
  },
});
