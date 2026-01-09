/**
 * AnimatedMeshGradient - Premium Animated Background
 * Inspired by iOS 17 mesh gradients and Whoop/Levels premium feel
 *
 * Features:
 * - Smooth animated gradient movement
 * - Multiple gradient positions create mesh effect
 * - Customizable colors and animation speed
 * - Performance optimized with useNativeDriver
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AnimatedMeshGradient({
  colors = ['#0A0E27', '#1A1F3A', '#0F1420'],
  children,
  style,
  animationDuration = 8000,
  animationEnabled = true,
}) {
  // Animated values for gradient positions
  const gradient1 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const gradient2 = useRef(new Animated.ValueXY({ x: 1, y: 0 })).current;
  const gradient3 = useRef(new Animated.ValueXY({ x: 0.5, y: 1 })).current;

  // Opacity values for smooth blending
  const opacity1 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(0.8)).current;
  const opacity3 = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!animationEnabled) return;

    // Create looping animation sequence
    const createAnimation = () => {
      return Animated.parallel([
        // Gradient 1 movement - useNativeDriver: false required for ValueXY interpolation
        Animated.sequence([
          Animated.timing(gradient1, {
            toValue: { x: 0.7, y: 0.3 },
            duration: animationDuration / 3,
            useNativeDriver: false,
          }),
          Animated.timing(gradient1, {
            toValue: { x: 0.2, y: 0.8 },
            duration: animationDuration / 3,
            useNativeDriver: false,
          }),
          Animated.timing(gradient1, {
            toValue: { x: 0, y: 0 },
            duration: animationDuration / 3,
            useNativeDriver: false,
          }),
        ]),

        // Gradient 2 movement (offset timing)
        Animated.sequence([
          Animated.timing(gradient2, {
            toValue: { x: 0.3, y: 0.7 },
            duration: animationDuration / 3,
            useNativeDriver: false,
          }),
          Animated.timing(gradient2, {
            toValue: { x: 0.9, y: 0.2 },
            duration: animationDuration / 3,
            useNativeDriver: false,
          }),
          Animated.timing(gradient2, {
            toValue: { x: 1, y: 0 },
            duration: animationDuration / 3,
            useNativeDriver: false,
          }),
        ]),

        // Gradient 3 movement
        Animated.sequence([
          Animated.timing(gradient3, {
            toValue: { x: 0.8, y: 0.5 },
            duration: animationDuration / 3,
            useNativeDriver: false,
          }),
          Animated.timing(gradient3, {
            toValue: { x: 0.1, y: 0.3 },
            duration: animationDuration / 3,
            useNativeDriver: false,
          }),
          Animated.timing(gradient3, {
            toValue: { x: 0.5, y: 1 },
            duration: animationDuration / 3,
            useNativeDriver: false,
          }),
        ]),

        // Opacity pulsing for depth - useNativeDriver: false to match transforms
        Animated.sequence([
          Animated.timing(opacity2, {
            toValue: 1,
            duration: animationDuration / 2,
            useNativeDriver: false,
          }),
          Animated.timing(opacity2, {
            toValue: 0.8,
            duration: animationDuration / 2,
            useNativeDriver: false,
          }),
        ]),
      ]);
    };

    // Loop the animation
    const loopAnimation = () => {
      Animated.loop(createAnimation()).start();
    };

    loopAnimation();

    // Cleanup on unmount
    return () => {
      gradient1.stopAnimation();
      gradient2.stopAnimation();
      gradient3.stopAnimation();
      opacity1.stopAnimation();
      opacity2.stopAnimation();
      opacity3.stopAnimation();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationDuration, animationEnabled]);

  // Transform animated values to translateX/Y
  const gradient1Transform = {
    transform: [
      {
        translateX: gradient1.x.interpolate({
          inputRange: [0, 1],
          outputRange: [-width * 0.3, width * 0.3],
        }),
      },
      {
        translateY: gradient1.y.interpolate({
          inputRange: [0, 1],
          outputRange: [-height * 0.2, height * 0.2],
        }),
      },
    ],
    opacity: opacity1,
  };

  const gradient2Transform = {
    transform: [
      {
        translateX: gradient2.x.interpolate({
          inputRange: [0, 1],
          outputRange: [-width * 0.2, width * 0.4],
        }),
      },
      {
        translateY: gradient2.y.interpolate({
          inputRange: [0, 1],
          outputRange: [-height * 0.3, height * 0.3],
        }),
      },
    ],
    opacity: opacity2,
  };

  const gradient3Transform = {
    transform: [
      {
        translateX: gradient3.x.interpolate({
          inputRange: [0, 1],
          outputRange: [-width * 0.4, width * 0.2],
        }),
      },
      {
        translateY: gradient3.y.interpolate({
          inputRange: [0, 1],
          outputRange: [-height * 0.1, height * 0.4],
        }),
      },
    ],
    opacity: opacity3,
  };

  return (
    <View style={[styles.container, style]}>
      {/* Base gradient layer */}
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated gradient orbs */}
      <Animated.View style={[styles.gradientOrb, gradient1Transform]}>
        <LinearGradient
          colors={[colors[0] + '80', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.orb}
        />
      </Animated.View>

      <Animated.View style={[styles.gradientOrb, gradient2Transform]}>
        <LinearGradient
          colors={[colors[1] + '60', 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.orb}
        />
      </Animated.View>

      <Animated.View style={[styles.gradientOrb, gradient3Transform]}>
        <LinearGradient
          colors={[colors[2] + '40', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.orb}
        />
      </Animated.View>

      {/* Content layer */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradientOrb: {
    position: 'absolute',
    width: width * 1.5,
    height: height * 1.5,
    top: -height * 0.25,
    left: -width * 0.25,
  },
  orb: {
    flex: 1,
    borderRadius: width,
  },
});
