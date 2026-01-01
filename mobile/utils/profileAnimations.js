/**
 * Profile Animation Utilities
 * Reusable animation helpers for smooth, polished interactions
 */

import { Animated, Easing } from 'react-native';

// Animation timing constants
export const ANIMATION_TIMING = {
  fast: 150,
  normal: 250,
  slow: 400,
};

// Material Design easing curve
const materialCurve = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Create a fade-in animation
 * @param {number} duration - Animation duration in ms
 * @returns {Object} Animation object with value and start function
 */
export const createFadeInAnimation = (duration = ANIMATION_TIMING.normal) => {
  const animValue = new Animated.Value(0);

  return {
    value: animValue,
    start: () => {
      Animated.timing(animValue, {
        toValue: 1,
        duration,
        easing: materialCurve,
        useNativeDriver: true,
      }).start();
    },
    style: {
      opacity: animValue,
    },
  };
};

/**
 * Create a slide-in animation from bottom
 * @param {number} distance - Distance to slide in pixels
 * @param {number} duration - Animation duration in ms
 * @returns {Object} Animation object with value and start function
 */
export const createSlideUpAnimation = (
  distance = 50,
  duration = ANIMATION_TIMING.normal
) => {
  const animValue = new Animated.Value(distance);

  return {
    value: animValue,
    start: () => {
      Animated.timing(animValue, {
        toValue: 0,
        duration,
        easing: materialCurve,
        useNativeDriver: true,
      }).start();
    },
    style: {
      transform: [{ translateY: animValue }],
    },
  };
};

/**
 * Create a scale animation
 * @param {number} duration - Animation duration in ms
 * @param {number} targetScale - Target scale value (default 1.0)
 * @returns {Object} Animation object with value and start function
 */
export const createScaleAnimation = (
  duration = ANIMATION_TIMING.normal,
  targetScale = 1.0
) => {
  const animValue = new Animated.Value(0.9);

  return {
    value: animValue,
    start: () => {
      Animated.timing(animValue, {
        toValue: targetScale,
        duration,
        easing: materialCurve,
        useNativeDriver: true,
      }).start();
    },
    style: {
      transform: [{ scale: animValue }],
    },
  };
};

/**
 * Create a shake animation (for errors)
 * @param {Animated.Value} animValue - Existing animation value
 * @param {number} intensity - Shake intensity in pixels
 * @returns {void}
 */
export const createShakeAnimation = (animValue, intensity = 5) => {
  Animated.sequence([
    Animated.timing(animValue, {
      toValue: intensity,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animValue, {
      toValue: -intensity,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(animValue, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }),
  ]).start();
};

/**
 * Create a success checkmark animation (rotation + scale)
 * @returns {Object} Animation object with values and start function
 */
export const createSuccessAnimation = () => {
  const rotateValue = new Animated.Value(0);
  const scaleValue = new Animated.Value(0);

  return {
    rotateValue,
    scaleValue,
    start: () => {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 4,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 600,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
      ]).start();
    },
    style: {
      scale: scaleValue,
      rotation: rotateValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    },
  };
};

/**
 * Create a pulse animation (for loading states)
 * @returns {Object} Animation object with value and start function
 */
export const createPulseAnimation = () => {
  const animValue = new Animated.Value(0.8);

  return {
    value: animValue,
    start: () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0.8,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    },
    style: {
      opacity: animValue,
    },
  };
};

/**
 * Create a combined fade + slide animation
 * @param {number} distance - Distance to slide
 * @param {number} duration - Animation duration
 * @returns {Object} Animation object
 */
export const createFadeSlideAnimation = (
  distance = 30,
  duration = ANIMATION_TIMING.normal
) => {
  const opacityValue = new Animated.Value(0);
  const slideValue = new Animated.Value(distance);

  return {
    opacityValue,
    slideValue,
    start: () => {
      Animated.parallel([
        Animated.timing(opacityValue, {
          toValue: 1,
          duration,
          easing: materialCurve,
          useNativeDriver: true,
        }),
        Animated.timing(slideValue, {
          toValue: 0,
          duration,
          easing: materialCurve,
          useNativeDriver: true,
        }),
      ]).start();
    },
    style: {
      opacity: opacityValue,
      transform: [{ translateY: slideValue }],
    },
  };
};

/**
 * Stagger multiple animations with delay between them
 * @param {Array} animations - Array of animation values
 * @param {number} delay - Delay between each animation
 * @param {number} duration - Duration of each animation
 * @returns {void}
 */
export const staggerAnimations = (
  animations,
  delay = 100,
  duration = ANIMATION_TIMING.normal
) => {
  Animated.stagger(
    delay,
    animations.map((anim) =>
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: materialCurve,
        useNativeDriver: true,
      })
    )
  ).start();
};

/**
 * Create a spring animation for interactive elements
 * @param {number} targetValue - Target animation value
 * @returns {Object} Animation object with value and start function
 */
export const createSpringAnimation = (targetValue = 1) => {
  const animValue = new Animated.Value(0);

  return {
    value: animValue,
    start: () => {
      Animated.spring(animValue, {
        toValue: targetValue,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }).start();
    },
    style: {
      transform: [{ scale: animValue }],
    },
  };
};
