/**
 * PremiumRing Component
 * Instrument-style progress ring with proper overflow handling
 * NO "200%+" SPAM - ring caps at 100%, overflow shown in text
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TYPOGRAPHY, detectDataState, formatters } from '../../constants/designTokens';
import { useTheme } from '../../providers/ThemeProvider';

/**
 * @param {Object} props
 * @param {number} props.value - Current value
 * @param {number} props.goal - Goal value
 * @param {string} props.label - Label text (e.g., "Calories")
 * @param {string} props.unit - Unit (e.g., "kcal")
 * @param {number} props.size - Ring diameter
 * @param {number} props.strokeWidth - Ring thickness
 */
export default function PremiumRing({
  value = 0,
  goal,
  label,
  unit = '',
  size = 140,
  strokeWidth = 12,
}) {
  const { colors, isDark } = useTheme();
  const textTertiary = colors.text.tertiary;
  const textMuted = colors.text.muted || colors.text.tertiary;
  const trackColor = isDark ? 'rgba(255, 255, 255, 0.1)' : colors.surface?.card?.border || 'rgba(0,0,0,0.08)';

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Detect data state
  const dataState = detectDataState(value, goal, { allowNull: false });
  const { color, ratio, isAnomaly } = dataState;

  // CRITICAL: Cap visual progress at 100%
  const visualRatio = Math.min(ratio || 0, 1.0);
  const strokeDashoffset = circumference * (1 - visualRatio);

  // Format center display
  const centerText = formatCenterText(value, goal, ratio, isAnomaly);

  return (
    <View style={styles.container}>
      {/* SVG Ring */}
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          {/* Gradient for progress ring */}
          <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Progress ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={[styles.centerValue, { color }]}>
          {centerText.primary}
        </Text>
        {centerText.secondary && (
          <Text style={[styles.centerSecondary, { color: textTertiary }]}>
            {centerText.secondary}
          </Text>
        )}
        {label && (
          <Text style={[styles.centerLabel, { color: textMuted }]}>{label}</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Format center text based on state
 * RULES:
 * - Normal: show value
 * - Over (< 1.5x): show "Over by X"
 * - Extreme (>= 1.5x): show "2.3×" multiplier
 * - Missing: show "—"
 */
function formatCenterText(value, goal, ratio, isAnomaly) {
  // Missing data
  if (value === null || value === undefined || value === 0) {
    return {
      primary: '—',
      secondary: 'No data',
    };
  }

  // No goal set
  if (!goal) {
    return {
      primary: formatters.number(value),
      secondary: 'No goal',
    };
  }

  // Normal range (< 100%)
  if (ratio < 1.0) {
    const remaining = goal - value;
    return {
      primary: formatters.number(value),
      secondary: `${formatters.number(remaining)} left`,
    };
  }

  // Over but reasonable (100-150%)
  if (ratio >= 1.0 && ratio < 1.5) {
    const over = value - goal;
    return {
      primary: formatters.number(value),
      secondary: `Over by ${formatters.number(over)}`,
    };
  }

  // Extreme overflow - show multiplier
  const multiplier = ratio.toFixed(1);
  return {
    primary: `${multiplier}×`,
    secondary: isAnomaly ? 'Check data' : 'Over goal',
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  centerSecondary: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    // color applied inline for theme support
    marginTop: 2,
  },
  centerLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    // color applied inline for theme support
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
  },
});
