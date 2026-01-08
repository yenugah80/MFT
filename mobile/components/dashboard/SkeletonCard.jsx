/**
 * SkeletonCard Component
 * Animated skeleton placeholder for loading states
 * Improves perceived performance with shimmer animation
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { RADIUS } from '../../constants/designTokens';
import { LUXURY_SURFACES } from '../../constants/luxuryTheme';

/**
 * @param {Object} props
 * @param {number} props.height - Height of the skeleton card
 * @param {string|number} props.width - Width of the skeleton card (default: '100%')
 * @param {number} props.borderRadius - Border radius override
 */
export default function SkeletonCard({ height = 120, width = '100%', borderRadius = RADIUS.xl }) {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnimation]);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          height,
          width,
          borderRadius,
          opacity,
        },
      ]}
    />
  );
}

/**
 * Skeleton for text lines
 */
export function SkeletonText({ width = '100%', height = 16, marginBottom = 8 }) {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnimation]);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.skeletonText,
        {
          width,
          height,
          marginBottom,
          opacity,
        },
      ]}
    />
  );
}

/**
 * Skeleton for circular elements (avatars, icons)
 */
export function SkeletonCircle({ size = 40 }) {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnimation]);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.skeletonCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: LUXURY_SURFACES.glassUltra.background,
    borderWidth: 1,
    borderColor: LUXURY_SURFACES.glassUltra.border,
  },
  skeletonText: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.sm,
  },
  skeletonCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
