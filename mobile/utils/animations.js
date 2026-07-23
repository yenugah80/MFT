/**
 * Animation Utilities - Smooth, Purposeful Motion
 *
 * Design Philosophy:
 * - Every animation communicates something
 * - Physics-based motion feels natural
 * - Performance is non-negotiable (60fps)
 * - Respect reduced motion preferences
 */

import { Animated, Easing, Platform, AccessibilityInfo } from 'react-native';
import { ANIMATION } from '../constants/premiumDesignSystem';
import { useRef, useEffect, useCallback } from 'react';

// ============================================================================
// EASING CURVES - Natural, Apple-inspired motion
// ============================================================================

export const EASING = {
  // Standard curves
  linear: Easing.linear,

  // Ease out - Deceleration (most common for UI)
  easeOut: Easing.bezier(0.33, 1, 0.68, 1),
  easeOutQuart: Easing.bezier(0.25, 1, 0.5, 1),
  easeOutExpo: Easing.bezier(0.16, 1, 0.3, 1),

  // Ease in - Acceleration
  easeIn: Easing.bezier(0.32, 0, 0.67, 0),
  easeInQuart: Easing.bezier(0.5, 0, 0.75, 0),

  // Ease in-out - Symmetric
  easeInOut: Easing.bezier(0.65, 0, 0.35, 1),
  easeInOutQuart: Easing.bezier(0.76, 0, 0.24, 1),

  // Spring-like
  overshoot: Easing.bezier(0.34, 1.56, 0.64, 1),
  bounce: Easing.bounce,

  // Apple's curves
  appleDefault: Easing.bezier(0.25, 0.1, 0.25, 1),
  appleKeyboard: Easing.bezier(0.17, 0.17, 0.67, 1),
};

// ============================================================================
// SPRING CONFIGURATIONS
// ============================================================================

export const SPRING = {
  // Snappy - Buttons, toggles, quick feedback
  snappy: {
    tension: 400,
    friction: 30,
    useNativeDriver: true,
  },

  // Smooth - Cards, modals, standard animations
  smooth: {
    tension: 200,
    friction: 26,
    useNativeDriver: true,
  },

  // Gentle - Page transitions, slow reveals
  gentle: {
    tension: 120,
    friction: 22,
    useNativeDriver: true,
  },

  // Bouncy - Celebrations, achievements, playful
  bouncy: {
    tension: 300,
    friction: 10,
    useNativeDriver: true,
  },

  // Stiff - Precise movements, no overshoot
  stiff: {
    tension: 500,
    friction: 50,
    useNativeDriver: true,
  },
};

// ============================================================================
// ANIMATION FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a spring animation
 */
export function spring(animatedValue, toValue, config = SPRING.smooth) {
  return Animated.spring(animatedValue, {
    toValue,
    ...config,
  });
}

/**
 * Create a timing animation
 */
export function timing(
  animatedValue,
  toValue,
  duration = ANIMATION.duration.normal,
  easing = EASING.easeOut
) {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing,
    useNativeDriver: true,
  });
}

/**
 * Create a decay animation (momentum-based)
 */
export function decay(animatedValue, velocity) {
  return Animated.decay(animatedValue, {
    velocity,
    deceleration: 0.997,
    useNativeDriver: true,
  });
}

// ============================================================================
// COMMON ANIMATION PATTERNS
// ============================================================================

/**
 * Fade in animation
 */
export function fadeIn(
  animatedValue,
  duration = ANIMATION.duration.normal,
  delay = 0
) {
  animatedValue.setValue(0);
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    delay,
    easing: EASING.easeOut,
    useNativeDriver: true,
  });
}

/**
 * Fade out animation
 */
export function fadeOut(
  animatedValue,
  duration = ANIMATION.duration.fast,
  delay = 0
) {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    delay,
    easing: EASING.easeIn,
    useNativeDriver: true,
  });
}

/**
 * Slide in from bottom
 */
export function slideInUp(
  translateY,
  opacity,
  distance = 30,
  duration = ANIMATION.duration.normal
) {
  translateY.setValue(distance);
  opacity?.setValue(0);

  const animations = [
    Animated.spring(translateY, {
      toValue: 0,
      ...SPRING.smooth,
    }),
  ];

  if (opacity) {
    animations.push(
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration * 0.6,
        easing: EASING.easeOut,
        useNativeDriver: true,
      })
    );
  }

  return Animated.parallel(animations);
}

/**
 * Slide out to bottom
 */
export function slideOutDown(
  translateY,
  opacity,
  distance = 30,
  duration = ANIMATION.duration.fast
) {
  const animations = [
    Animated.timing(translateY, {
      toValue: distance,
      duration,
      easing: EASING.easeIn,
      useNativeDriver: true,
    }),
  ];

  if (opacity) {
    animations.push(
      Animated.timing(opacity, {
        toValue: 0,
        duration: duration * 0.8,
        easing: EASING.easeIn,
        useNativeDriver: true,
      })
    );
  }

  return Animated.parallel(animations);
}

/**
 * Scale animation (press feedback)
 */
export function scalePressIn(animatedValue, scale = 0.97) {
  return Animated.spring(animatedValue, {
    toValue: scale,
    ...SPRING.snappy,
  });
}

export function scalePressOut(animatedValue) {
  return Animated.spring(animatedValue, {
    toValue: 1,
    ...SPRING.snappy,
  });
}

/**
 * Pulse animation (attention)
 */
export function pulse(animatedValue, intensity = 1.02) {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: intensity,
        duration: ANIMATION.duration.slow,
        easing: EASING.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: ANIMATION.duration.slow,
        easing: EASING.easeInOut,
        useNativeDriver: true,
      }),
    ])
  );
}

/**
 * Shake animation (error feedback)
 */
export function shake(animatedValue, intensity = 10) {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: 50,
      easing: EASING.easeOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity,
      duration: 100,
      easing: EASING.easeInOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: intensity * 0.5,
      duration: 100,
      easing: EASING.easeInOut,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 50,
      easing: EASING.easeIn,
      useNativeDriver: true,
    }),
  ]);
}

/**
 * Progress animation (smooth counting)
 */
export function animateProgress(
  animatedValue,
  toValue,
  duration = ANIMATION.duration.slow
) {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing: EASING.easeOutQuart,
    useNativeDriver: false, // Required for width/color animations
  });
}

// ============================================================================
// STAGGERED ANIMATIONS
// ============================================================================

/**
 * Stagger multiple animations with delay
 */
export function stagger(animations, delay = 50) {
  return Animated.stagger(delay, animations);
}

/**
 * Stagger children with fade-in-up effect
 */
export function staggeredFadeInUp(
  items,
  translateYValues,
  opacityValues,
  baseDelay = 50
) {
  const animations = items.map((_, index) => {
    const translateY = translateYValues[index];
    const opacity = opacityValues[index];

    translateY.setValue(20);
    opacity.setValue(0);

    return Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * baseDelay,
        ...SPRING.smooth,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * baseDelay,
        easing: EASING.easeOut,
        useNativeDriver: true,
      }),
    ]);
  });

  return Animated.parallel(animations);
}

// ============================================================================
// INTERPOLATION HELPERS
// ============================================================================

/**
 * Create a clamped interpolation
 */
export function interpolate(
  animatedValue,
  inputRange,
  outputRange,
  extrapolate = 'clamp'
) {
  return animatedValue.interpolate({
    inputRange,
    outputRange,
    extrapolate,
  });
}

/**
 * Create a color interpolation
 */
export function interpolateColor(animatedValue, inputRange, outputColors) {
  return animatedValue.interpolate({
    inputRange,
    outputRange: outputColors,
  });
}

// ============================================================================
// GESTURE ANIMATIONS
// ============================================================================

/**
 * Create scroll-linked animation
 */
export function createScrollAnimation(scrollY, outputRange, inputRange = [0, 100]) {
  return scrollY.interpolate({
    inputRange,
    outputRange,
    extrapolate: 'clamp',
  });
}

/**
 * Parallax effect
 */
export function parallax(scrollY, speed = 0.5, maxOffset = 100) {
  return scrollY.interpolate({
    inputRange: [0, maxOffset],
    outputRange: [0, maxOffset * speed],
    extrapolate: 'clamp',
  });
}

// ============================================================================
// ACCESSIBILITY
// ============================================================================

let reduceMotionEnabled = false;

// Check for reduced motion preference
AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
  reduceMotionEnabled = enabled;
});

// Subscribe to changes
AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotionEnabled = enabled;
});

/**
 * Get appropriate animation duration based on accessibility settings
 */
export function getAnimationDuration(normalDuration) {
  if (reduceMotionEnabled) {
    return 0; // Instant for reduced motion
  }
  return normalDuration;
}

/**
 * Create an animation that respects reduced motion
 */
export function accessibleAnimation(
  animatedValue,
  toValue,
  config = {}
) {
  if (reduceMotionEnabled) {
    animatedValue.setValue(toValue);
    return { start: (cb) => cb && cb({ finished: true }) };
  }

  return config.type === 'spring'
    ? Animated.spring(animatedValue, { toValue, ...SPRING.smooth, ...config })
    : Animated.timing(animatedValue, {
        toValue,
        duration: ANIMATION.duration.normal,
        easing: EASING.easeOut,
        useNativeDriver: true,
        ...config,
      });
}

// ============================================================================
// HOOKS (for use in components)
// ============================================================================

/**
 * Hook for fade-in animation on mount
 */
export function useFadeIn(delay = 0, duration = ANIMATION.duration.normal) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeIn(opacity, duration, delay).start();
  }, [opacity, delay, duration]);

  return opacity;
}

/**
 * Hook for slide-in animation on mount
 */
export function useSlideIn(delay = 0, distance = 20) {
  const translateY = useRef(new Animated.Value(distance)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      slideInUp(translateY, opacity, distance).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [translateY, opacity, delay, distance]);

  return { translateY, opacity };
}

/**
 * Hook for press animation
 */
export function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    scalePressIn(scale).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    scalePressOut(scale).start();
  }, [scale]);

  return { scale, onPressIn, onPressOut };
}

/**
 * Hook for animated value
 */
export function useAnimatedValue(initialValue = 0) {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;
  return animatedValue;
}

/**
 * Hook for animated progress (e.g., progress bars)
 */
export function useAnimatedProgress(targetValue, duration = ANIMATION.duration.slow) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animateProgress(progress, targetValue, duration).start();
  }, [progress, targetValue, duration]);

  return progress;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Constants
  EASING,
  SPRING,

  // Factory functions
  spring,
  timing,
  decay,

  // Patterns
  fadeIn,
  fadeOut,
  slideInUp,
  slideOutDown,
  scalePressIn,
  scalePressOut,
  pulse,
  shake,
  animateProgress,

  // Staggered
  stagger,
  staggeredFadeInUp,

  // Interpolation
  interpolate,
  interpolateColor,

  // Gesture
  createScrollAnimation,
  parallax,

  // Accessibility
  getAnimationDuration,
  accessibleAnimation,

  // Hooks
  useFadeIn,
  useSlideIn,
  usePressAnimation,
  useAnimatedValue,
  useAnimatedProgress,
};
