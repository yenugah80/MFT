/**
 * ProgressRing - small reusable single-value SVG progress ring
 *
 * Same pattern as the calorie ring on the dashboard's Nutrition card
 * (components/dashboard/NutritionDetailsSection.jsx), generalized for reuse
 * across analytics tabs that need a "value toward goal" ring instead of a
 * flat linear bar.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { TEXT, SURFACES, TYPOGRAPHY } from '../../constants/premiumTheme';

export default function ProgressRing({
  value = 0,
  goal = 100,
  size = 140,
  strokeWidth = 12,
  color,
  overColor,
  centerValue,
  centerLabel,
  icon,
  iconColor,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const isOverGoal = value > goal;
  const progress = goal > 0 ? Math.min(value / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={SURFACES.background.tertiary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isOverGoal ? (overColor || color) : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{
            transformOrigin: `${size / 2}px ${size / 2}px`,
            transform: [{ rotate: '-90deg' }],
          }}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {icon ? <Ionicons name={icon} size={28} color={iconColor || color} style={styles.icon} /> : null}
        <Text style={styles.value}>{centerValue}</Text>
        {centerLabel ? <Text style={styles.label}>{centerLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 2,
  },
  value: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
});
