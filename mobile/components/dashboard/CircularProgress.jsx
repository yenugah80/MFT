/**
 * CircularProgress - Apple Health style progress ring
 * Vibrant, animated, with percentage and values
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { TEXT, TYPOGRAPHY } from '../../constants/premiumTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CircularProgress({
  value = 0,
  goal = 100,
  size = 100,
  strokeWidth = 8,
  colors = ['#8B5CF6', '#A78BFA'],
  label = '',
  unit = '',
  showGoal = true,
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate percentage (capped at 100%)
  const percentage = Math.min((value / goal) * 100, 100);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percentage / 100,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percentage, animatedValue]);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1]} />
          </SvgGradient>
        </Defs>

        {/* Background ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(143, 163, 199, 0.15)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress ring */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#gradient-${label})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [circumference, 0],
          })}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={styles.value}>
          {Math.round(value)}
          {unit && <Text style={styles.unit}>{unit}</Text>}
        </Text>
        {showGoal && (
          <Text style={styles.goal}>of {Math.round(goal)}</Text>
        )}
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },
  goal: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
