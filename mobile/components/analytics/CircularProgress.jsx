/**
 * Circular Progress Component
 *
 * Research-based design following 2025 health app best practices:
 * - Simple, readable progress visualization
 * - NOT confusing circular time-based charts (avoid per UX research)
 * - Used for goal completion, score visualization
 * - Small-medium size for dashboard cards
 *
 * Based on best practices from:
 * - MyFitnessPal: Clear goal tracking
 * - Noom: Progress visualization
 * - UX Research (PMC): Avoid confusing circular time charts
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, BRAND, SURFACES } from '../../constants/premiumTheme';

/**
 * CircularProgress - Animated circular progress ring
 *
 * @param {number} percentage - Progress (0-100)
 * @param {number} size - Diameter in pixels (default 100)
 * @param {number} strokeWidth - Ring thickness (default 10)
 * @param {string} color - Progress color (default BRAND.primary)
 * @param {string} backgroundColor - Track color (default SURFACES.card)
 * @param {boolean} showPercentage - Show % text in center (default true)
 * @param {ReactNode} children - Custom content in center
 */
export default function CircularProgress({
  percentage = 0,
  size = 100,
  strokeWidth = 10,
  color = BRAND.primary,
  backgroundColor = SURFACES.card,
  showPercentage = true,
  children,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(percentage, 0), 100); // Clamp 0-100
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {children || (showPercentage && (
          <Text style={[styles.percentageText, { color }]}>
            {Math.round(progress)}%
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
