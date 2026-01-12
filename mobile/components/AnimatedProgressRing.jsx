/**
 * AnimatedProgressRing - Modern Progress Ring with Glow
 * Half-closed gauge ring with smooth animations and light effects
 * Perfect for health metrics and goal tracking
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { BRAND, TEXT, TYPOGRAPHY, SPACING } from '../constants/premiumTheme';
import { PROGRESS_RING, GLOW } from '../constants/modernEffects';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * AnimatedProgressRing Component
 *
 * @param {Object} props
 * @param {number} props.progress - Progress value (0-100)
 * @param {'small'|'medium'|'large'|'hero'} props.size - Ring size
 * @param {string} props.color - Progress color
 * @param {Array<string>} props.gradientColors - Optional gradient colors [start, end]
 * @param {string} props.backgroundColor - Background track color
 * @param {string} props.label - Center label text
 * @param {string} props.value - Center value text
 * @param {string} props.unit - Unit text (e.g., '%', 'kcal')
 * @param {boolean} props.withGlow - Whether to show glow effect
 * @param {boolean} props.halfRing - Whether to show as half-closed gauge (180°)
 * @param {number} props.animationDuration - Animation duration in ms
 */
export default function AnimatedProgressRing({
  progress = 0,
  size = 'medium',
  color = BRAND.primary,
  gradientColors,
  backgroundColor = 'rgba(79, 143, 139, 0.12)',
  label,
  value,
  unit,
  withGlow = true,
  halfRing = false,
  animationDuration = 1000,
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Get size configuration
  const sizeConfig = PROGRESS_RING[size] || PROGRESS_RING.medium;
  const { size: ringSize, strokeWidth, radius } = sizeConfig;

  // Calculate circle properties
  const circumference = 2 * Math.PI * radius;
  const startAngle = halfRing ? 90 : 0; // Start from bottom for half ring
  const sweepAngle = halfRing ? 180 : 360; // Half or full circle
  const maxStrokeDashoffset = (sweepAngle / 360) * circumference;

  // Animate progress
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: Math.min(Math.max(progress, 0), 100),
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
  }, [progress, animationDuration]);

  // Calculate stroke dash offset
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [maxStrokeDashoffset, 0],
  });

  return (
    <View style={[styles.container, { width: ringSize, height: halfRing ? ringSize / 2 + 20 : ringSize }]}>
      <Svg width={ringSize} height={ringSize} style={styles.svg}>
        <Defs>
          {/* Gradient definition if colors provided */}
          {gradientColors && (
            <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="1" />
            </SvgLinearGradient>
          )}
        </Defs>

        <G rotation={startAngle} origin={`${ringSize / 2}, ${ringSize / 2}`}>
          {/* Background circle */}
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${maxStrokeDashoffset} ${circumference}`}
            strokeLinecap="round"
          />

          {/* Progress circle */}
          <AnimatedCircle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={gradientColors ? 'url(#progressGradient)' : color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${maxStrokeDashoffset} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            opacity={0.95}
          />
        </G>
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {value !== undefined && (
          <View style={styles.valueContainer}>
            <Text style={[styles.value, getSizeTextStyle(size)]}>
              {value}
            </Text>
            {unit && (
              <Text style={[styles.unit, getSizeUnitStyle(size)]}>
                {unit}
              </Text>
            )}
          </View>
        )}

        {label && (
          <Text style={[styles.label, getSizeLabelStyle(size)]}>
            {label}
          </Text>
        )}
      </View>

      {/* Glow effect overlay */}
      {withGlow && progress > 0 && (
        <View
          style={[
            styles.glowOverlay,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              shadowColor: color,
              ...GLOW.subtle,
            },
          ]}
        />
      )}
    </View>
  );
}

// Helper functions for text sizing
function getSizeTextStyle(size) {
  switch (size) {
    case 'small':
      return { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold };
    case 'large':
      return { fontSize: TYPOGRAPHY.size['3xl'], fontWeight: TYPOGRAPHY.weight.extrabold };
    case 'hero':
      return { fontSize: TYPOGRAPHY.size['4xl'], fontWeight: TYPOGRAPHY.weight.black };
    case 'medium':
    default:
      return { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold };
  }
}

function getSizeUnitStyle(size) {
  switch (size) {
    case 'small':
      return { fontSize: TYPOGRAPHY.size.xs };
    case 'large':
      return { fontSize: TYPOGRAPHY.size.md };
    case 'hero':
      return { fontSize: TYPOGRAPHY.size.lg };
    case 'medium':
    default:
      return { fontSize: TYPOGRAPHY.size.sm };
  }
}

function getSizeLabelStyle(size) {
  switch (size) {
    case 'small':
      return { fontSize: TYPOGRAPHY.size.xs };
    case 'large':
      return { fontSize: TYPOGRAPHY.size.base };
    case 'hero':
      return { fontSize: TYPOGRAPHY.size.md };
    case 'medium':
    default:
      return { fontSize: TYPOGRAPHY.size.sm };
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  svg: {
    position: 'absolute',
  },

  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  value: {
    color: TEXT.primary,
  },

  unit: {
    color: TEXT.secondary,
    marginLeft: SPACING[1],
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  label: {
    color: TEXT.tertiary,
    marginTop: SPACING[1],
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  glowOverlay: {
    position: 'absolute',
    zIndex: 0,
    opacity: 0.6,
    pointerEvents: 'none',
  },
});
