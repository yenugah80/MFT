/**
 * MealScoreDial Component
 * Circular dial showing meal quality score (0-100)
 * Features: SVG arc with gradient fill, qualitative label
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { TYPOGRAPHY, SPACING } from '../../../constants/premiumTheme';
import { useTheme } from '../../../providers/ThemeProvider';
import { calculateMealScore, getScoreLabel, getArcColor } from './mealScoring';

export default function MealScoreDial({ item, size = 180 }) {
  const { colors, isDark } = useTheme();
  const score = calculateMealScore(item);
  const { label, color } = getScoreLabel(score);

  // SVG calculations
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  // Colors
  const trackColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  return (
    <View style={styles.container}>
      <View style={[styles.dialWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={getArcColor(score)}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.scoreValue, { color: textPrimary }]}>{score}</Text>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
        </View>
      </View>

      <Text style={[styles.subtitle, { color: textSecondary }]}>Meal Score</Text>
    </View>
  );
}

// Export for use in other components
export { calculateMealScore, getScoreLabel };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
  },
  dialWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.family.bold,
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    marginTop: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
