/**
 * FadeInView - Animated Container with Entrance Effects
 * Gentle animations for dashboard elements
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { MOTION } from '../constants/modernEffects';

/**
 * FadeInView Component
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Content to animate
 * @param {'fadeIn'|'slideUp'|'scaleIn'|'floatIn'} props.animation - Animation type
 * @param {number} props.delay - Delay before animation starts (ms)
 * @param {number} props.duration - Animation duration (ms)
 * @param {ViewStyle} props.style - Additional styles
 */
export default function FadeInView({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration,
  style,
}) {
  // floatIn combines slide + scale for premium floating effect
  const isFloatIn = animation === 'floatIn';
  const isSlideUp = animation === 'slideUp' || isFloatIn;
  const isScaleIn = animation === 'scaleIn' || isFloatIn;

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(isSlideUp ? (isFloatIn ? 30 : 20) : 0)).current;
  const scale = useRef(new Animated.Value(isScaleIn ? (isFloatIn ? 0.92 : 0.95) : 1)).current;

  useEffect(() => {
    const animationConfig = MOTION[animation] || MOTION.fadeIn;
    const animDuration = duration || (isFloatIn ? 500 : animationConfig.duration);

    const animations = [];

    // Opacity animation
    animations.push(
      Animated.timing(opacity, {
        toValue: 1,
        duration: animDuration,
        delay,
        useNativeDriver: true,
      })
    );

    // Slide up animation (for slideUp and floatIn)
    if (isSlideUp) {
      animations.push(
        Animated.timing(translateY, {
          toValue: 0,
          duration: animDuration,
          delay,
          useNativeDriver: true,
        })
      );
    }

    // Scale animation (for scaleIn and floatIn)
    if (isScaleIn) {
      animations.push(
        Animated.spring(scale, {
          toValue: 1,
          friction: isFloatIn ? 7 : 8,
          tension: isFloatIn ? 50 : 40,
          delay,
          useNativeDriver: true,
        })
      );
    }

    Animated.parallel(animations).start();
  }, [animation, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [
            { translateY },
            { scale },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
