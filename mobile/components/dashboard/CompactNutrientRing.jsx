/**
 * CompactNutrientRing - Small, professional nutrient progress ring
 *
 * Designed for information-dense nutrition displays
 * Size: 60-70px diameter (compact)
 * Use cases: Macros, micros, daily values
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';
import { TEXT, TYPOGRAPHY, SPACING } from '../../constants/premiumTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CompactNutrientRing({
  value = 0,
  goal = 100,
  label,
  unit = 'g',
  size = 70,
  strokeWidth = 6,
  colors = ['#3B82F6', '#2563EB'], // Default blue gradient
  showPercentage = true,
  showValue = true,
}) {
  const percentage = Math.min((value / goal) * 100, 100);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: percentage,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const getStatusColor = () => {
    if (percentage >= 90) return colors[1]; // Deep color when near/at goal
    if (percentage >= 70) return colors[0]; // Primary color
    return `${colors[0]}80`; // Faded when low
  };

  return (
    <View style={styles.container}>
      {/* Ring SVG */}
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colors[0]} stopOpacity="1" />
              <Stop offset="100%" stopColor={colors[1]} stopOpacity="1" />
            </SvgGradient>
          </Defs>

          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`${colors[0]}15`}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress ring */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#gradient-${label})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          {showPercentage && (
            <Text style={[styles.percentageText, { color: getStatusColor() }]}>
              {Math.round(percentage)}%
            </Text>
          )}
          {showValue && (
            <Text style={styles.valueText}>
              {Math.round(value)}{unit}
            </Text>
          )}
        </View>
      </View>

      {/* Label */}
      {label && (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  ringContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: -0.5,
  },
  valueText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: 1,
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    textAlign: 'center',
    maxWidth: 80,
  },
});
