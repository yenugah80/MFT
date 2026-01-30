/**
 * AppText - Centralized Typography Component
 *
 * Use this instead of <Text> throughout the app for consistent DM Sans typography.
 * This ensures every text element uses the correct font family automatically.
 *
 * Usage:
 *   <AppText variant="headingLarge">Dashboard</AppText>
 *   <AppText variant="bodyMedium" color={TEXT.secondary}>Description here</AppText>
 *   <AppText variant="numericLarge" color={BRAND.primary}>2,450</AppText>
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, TEXT } from '../constants/premiumTheme';

// Variant definitions - maps variant names to style objects
const VARIANTS = {
  // Display - Hero text, large headings
  displayLarge: {
    fontSize: TYPOGRAPHY.size['4xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    lineHeight: TYPOGRAPHY.size['4xl'] * 1.2,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    lineHeight: TYPOGRAPHY.size['3xl'] * 1.2,
    letterSpacing: -0.3,
  },
  displaySmall: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    lineHeight: TYPOGRAPHY.size['2xl'] * 1.25,
  },

  // Headings - Section titles
  headingLarge: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    lineHeight: TYPOGRAPHY.size.xl * 1.3,
  },
  headingMedium: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    lineHeight: TYPOGRAPHY.size.lg * 1.35,
  },
  headingSmall: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    lineHeight: TYPOGRAPHY.size.md * 1.4,
  },

  // Body - Paragraphs, descriptions
  bodyLarge: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.regular,
    lineHeight: TYPOGRAPHY.size.md * 1.5,
  },
  bodyMedium: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    lineHeight: TYPOGRAPHY.size.base * 1.5,
  },
  bodySmall: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    lineHeight: TYPOGRAPHY.size.sm * 1.5,
  },

  // Labels - Buttons, chips, form labels
  labelLarge: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    lineHeight: TYPOGRAPHY.size.md * 1.2,
  },
  labelMedium: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    lineHeight: TYPOGRAPHY.size.sm * 1.2,
  },
  labelSmall: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.medium,
    lineHeight: TYPOGRAPHY.size.xs * 1.3,
  },

  // Caption - Metadata, hints, timestamps
  caption: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    lineHeight: TYPOGRAPHY.size.xs * 1.4,
  },
  captionBold: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    lineHeight: TYPOGRAPHY.size.xs * 1.4,
  },

  // Numeric - Stats, values, scores
  numericLarge: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    lineHeight: TYPOGRAPHY.size['3xl'] * 1.1,
    letterSpacing: -0.5,
  },
  numericMedium: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    lineHeight: TYPOGRAPHY.size.xl * 1.1,
  },
  numericSmall: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    lineHeight: TYPOGRAPHY.size.md * 1.2,
  },
};

/**
 * AppText Component
 *
 * @param {string} variant - Text style variant (default: 'bodyMedium')
 * @param {string} color - Text color (default: TEXT.primary)
 * @param {string} align - Text alignment ('left', 'center', 'right')
 * @param {number} numberOfLines - Max lines before truncation
 * @param {object} style - Additional style overrides
 * @param {React.ReactNode} children - Text content
 */
export function AppText({
  variant = 'bodyMedium',
  color,
  align,
  numberOfLines,
  style,
  children,
  ...props
}) {
  const variantStyle = VARIANTS[variant] || VARIANTS.bodyMedium;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        variantStyle,
        { color: color || TEXT.primary },
        align && { textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

// Export variants for external use
export const TEXT_VARIANTS = Object.keys(VARIANTS);

export default AppText;
