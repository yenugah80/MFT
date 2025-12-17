import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * Circular progress ring component
 *
 * @param {number} value - Current value
 * @param {number} maxValue - Maximum value (100%)
 * @param {number} size - Diameter of the circle
 * @param {number} strokeWidth - Width of the ring
 * @param {string} color - Color of the progress arc
 * @param {string} backgroundColor - Color of the background arc
 * @param {ReactNode} children - Content to display in the center
 */
const CircularProgress = ({
  value = 0,
  maxValue = 100,
  size = 120,
  strokeWidth = 10,
  color = '#4f46e5',
  backgroundColor = '#e5e7eb',
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(Math.max(value / maxValue, 0), 1);
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
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
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.centerContent}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CircularProgress;
