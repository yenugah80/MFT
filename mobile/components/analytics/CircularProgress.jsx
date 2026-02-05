/**
 * Circular Progress Component - Premium Design
 *
 * Research-based design following 2025 health app best practices:
 * - Simple, readable progress visualization
 * - Animated entrance for delight
 * - Gradient support for premium feel
 * - Semantic colors based on progress
 *
 * Design Principles:
 * - CLARITY: Instantly readable progress
 * - DELIGHT: Smooth animated entrance
 * - SEMANTIC: Color indicates status
 * - ACCESSIBILITY: High contrast, large targets
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { TEXT, BRAND, SURFACES, TYPOGRAPHY, SPACING } from '../../constants/premiumTheme';

// Semantic color thresholds
const getSemanticColor = (percentage) => {
  if (percentage >= 90) return '#10B981'; // Excellent - green
  if (percentage >= 70) return '#3B82F6'; // Good - blue
  if (percentage >= 50) return '#F59E0B'; // Moderate - amber
  if (percentage >= 30) return '#F97316'; // Low - orange
  return '#EF4444'; // Critical - red
};

/**
 * CircularProgress - Animated circular progress ring
 *
 * @param {number} percentage - Progress (0-100)
 * @param {number} size - Diameter in pixels (default 100)
 * @param {number} strokeWidth - Ring thickness (default 10)
 * @param {string} color - Progress color (default auto-semantic)
 * @param {string} backgroundColor - Track color
 * @param {boolean} showPercentage - Show % text in center (default true)
 * @param {boolean} animated - Enable entrance animation (default true)
 * @param {boolean} useSemanticColor - Auto-color based on percentage (default false)
 * @param {ReactNode} children - Custom content in center
 */
export default function CircularProgress({
  percentage = 0,
  size = 100,
  strokeWidth = 10,
  color,
  backgroundColor = SURFACES.background?.secondary || '#F3F4F6',
  showPercentage = true,
  animated = true,
  useSemanticColor = false,
  children,
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(percentage, 0), 100);

  // Determine color
  const progressColor = color || (useSemanticColor ? getSemanticColor(progress) : BRAND.primary);

  // Animate on mount
  useEffect(() => {
    if (animated) {
      Animated.spring(animatedValue, {
        toValue: progress,
        tension: 40,
        friction: 8,
        useNativeDriver: false, // strokeDashoffset doesn't support native driver
      }).start();
    } else {
      animatedValue.setValue(progress);
    }
  }, [progress, animated, animatedValue]);

  // For non-animated version
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
            stroke={progressColor}
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
          <Text style={[styles.percentageText, { color: progressColor }]}>
            {Math.round(progress)}%
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * NutrientProgressRing - Specialized for nutrients with label
 */
export function NutrientProgressRing({
  percentage = 0,
  size = 80,
  strokeWidth = 8,
  nutrient,
  value,
  unit = 'g',
  goal,
  color,
}) {
  const semanticColor = color || getSemanticColor(percentage);

  return (
    <View style={styles.nutrientRingContainer}>
      <CircularProgress
        percentage={percentage}
        size={size}
        strokeWidth={strokeWidth}
        color={semanticColor}
        showPercentage={false}
        animated
      >
        <Text style={[styles.nutrientValue, { color: semanticColor }]}>{value}</Text>
        <Text style={styles.nutrientUnit}>{unit}</Text>
      </CircularProgress>
      <Text style={styles.nutrientLabel}>{nutrient}</Text>
      {goal && (
        <Text style={styles.nutrientGoal}>of {goal}{unit}</Text>
      )}
    </View>
  );
}

/**
 * MacroProgressGroup - Display multiple macro nutrients
 */
export function MacroProgressGroup({ macros }) {
  const nutrients = [
    { key: 'protein', label: 'Protein', color: '#3B82F6' },
    { key: 'carbs', label: 'Carbs', color: '#F59E0B' },
    { key: 'fat', label: 'Fat', color: '#8B5CF6' },
    { key: 'fiber', label: 'Fiber', color: '#10B981' },
  ];

  return (
    <View style={styles.macroGroup}>
      {nutrients.map(({ key, label, color }) => {
        const data = macros?.[key];
        if (!data) return null;

        return (
          <NutrientProgressRing
            key={key}
            percentage={data.percentage || 0}
            nutrient={label}
            value={data.consumed || 0}
            goal={data.goal}
            color={color}
            size={70}
            strokeWidth={7}
          />
        );
      })}
    </View>
  );
}

/**
 * CalorieRing - Large calorie progress display
 */
export function CalorieRing({
  consumed = 0,
  budget = 2000,
  size = 140,
}) {
  const percentage = budget > 0 ? (consumed / budget) * 100 : 0;
  const remaining = Math.max(budget - consumed, 0);

  return (
    <View style={styles.calorieRingContainer}>
      <CircularProgress
        percentage={Math.min(percentage, 100)}
        size={size}
        strokeWidth={12}
        useSemanticColor
        showPercentage={false}
        animated
      >
        <Text style={styles.calorieConsumed}>{consumed.toLocaleString()}</Text>
        <Text style={styles.calorieLabel}>calories</Text>
        <View style={styles.calorieRemainingBadge}>
          <Text style={styles.calorieRemaining}>
            {remaining.toLocaleString()} left
          </Text>
        </View>
      </CircularProgress>
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
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
  },

  // Nutrient Ring styles
  nutrientRingContainer: {
    alignItems: 'center',
  },
  nutrientValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  nutrientUnit: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: -2,
  },
  nutrientLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.primary,
    marginTop: SPACING[2],
  },
  nutrientGoal: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Macro group styles
  macroGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: SPACING[4],
  },

  // Calorie ring styles
  calorieRingContainer: {
    alignItems: 'center',
    padding: SPACING[4],
  },
  calorieConsumed: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  calorieLabel: {
    fontSize: 12,
    color: TEXT.secondary,
    marginTop: -2,
  },
  calorieRemainingBadge: {
    backgroundColor: TEXT.tertiary + '15',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: SPACING[1],
  },
  calorieRemaining: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
});
