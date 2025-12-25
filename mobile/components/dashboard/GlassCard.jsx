/**
 * GlassCard Component
 * Premium glass morphism card for dashboard
 * Reusable, production-ready, no gimmicks
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SPACING, RADIUS } from '../../constants/designTokens';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {Object} props.style - Additional styles
 * @param {'sm'|'md'|'lg'|'xl'} props.padding - Padding size
 * @param {boolean} props.glow - Add glow effect
 * @param {string} props.glowColor - Glow color for shadow
 */
export default function GlassCard({
  children,
  style,
  padding = 'md',
  glow = false,
  glowColor,
}) {
  const paddingValue = {
    sm: SPACING[2],
    md: SPACING[4],
    lg: SPACING[5],
    xl: SPACING[6],
  }[padding] || SPACING[4];

  const glowStyle = glow && glowColor ? {
    shadowColor: glowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  } : {};

  return (
    <View style={[
      styles.card,
      { padding: paddingValue },
      glowStyle,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', // Clean white card
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)', // Subtle gray border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
});
