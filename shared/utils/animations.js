/**
 * Animation Utilities
 * Premium Lottie animations for delightful UX
 * Includes success, error, loading, and celebration animations
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { haptics } from './haptics';

/**
 * Success Animation
 * Use when: Food logged, goal achieved, sync completed
 *
 * Usage:
 * import { SuccessAnimation } from '../utils/animations';
 * <SuccessAnimation size={120} autoPlay loop={false} />
 */
export const SuccessAnimation = ({ size = 100, autoPlay = true, loop = false, onComplete }) => {
  const animationRef = useRef(null);

  useEffect(() => {
    if (autoPlay && animationRef.current) {
      haptics.success();
      animationRef.current.play();
    }
  }, [autoPlay]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        ref={animationRef}
        source={require('../assets/animations/success.json')}
        autoPlay={autoPlay}
        loop={loop}
        style={{ width: size, height: size }}
        onAnimationFinish={onComplete}
      />
    </View>
  );
};

/**
 * Error Animation
 * Use when: API error, validation failed, network issue
 *
 * Usage:
 * import { ErrorAnimation } from '../utils/animations';
 * <ErrorAnimation size={120} />
 */
export const ErrorAnimation = ({ size = 100, autoPlay = true, loop = false, onComplete }) => {
  const animationRef = useRef(null);

  useEffect(() => {
    if (autoPlay && animationRef.current) {
      haptics.error();
      animationRef.current.play();
    }
  }, [autoPlay]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        ref={animationRef}
        source={require('../assets/animations/error.json')}
        autoPlay={autoPlay}
        loop={loop}
        style={{ width: size, height: size }}
        onAnimationFinish={onComplete}
      />
    </View>
  );
};

/**
 * Loading Animation
 * Use when: Processing AI analysis, syncing data
 *
 * Usage:
 * import { LoadingAnimation } from '../utils/animations';
 * <LoadingAnimation size={80} />
 */
export const LoadingAnimation = ({ size = 80, autoPlay = true }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        source={require('../assets/animations/loading.json')}
        autoPlay={autoPlay}
        loop={true}
        style={{ width: size, height: size }}
      />
    </View>
  );
};

/**
 * Celebration Animation (confetti)
 * Use when: Streak milestone, level up, achievement unlocked
 *
 * Usage:
 * import { CelebrationAnimation } from '../utils/animations';
 * <CelebrationAnimation size={200} />
 */
export const CelebrationAnimation = ({ size = 200, autoPlay = true, loop = false, onComplete }) => {
  const animationRef = useRef(null);

  useEffect(() => {
    if (autoPlay && animationRef.current) {
      haptics.success();
      animationRef.current.play();
    }
  }, [autoPlay]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        ref={animationRef}
        source={require('../assets/animations/celebration.json')}
        autoPlay={autoPlay}
        loop={loop}
        style={{ width: size, height: size }}
        onAnimationFinish={onComplete}
      />
    </View>
  );
};

/**
 * Food Logging Animation
 * Use when: Analyzing food photo or text
 *
 * Usage:
 * import { FoodAnalysisAnimation } from '../utils/animations';
 * <FoodAnalysisAnimation size={120} />
 */
export const FoodAnalysisAnimation = ({ size = 120, autoPlay = true }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        source={require('../assets/animations/food-analysis.json')}
        autoPlay={autoPlay}
        loop={true}
        style={{ width: size, height: size }}
      />
    </View>
  );
};

/**
 * Empty State Animation
 * Use when: No data, first-time user
 *
 * Usage:
 * import { EmptyStateAnimation } from '../utils/animations';
 * <EmptyStateAnimation size={150} />
 */
export const EmptyStateAnimation = ({ size = 150, autoPlay = true }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        source={require('../assets/animations/empty-state.json')}
        autoPlay={autoPlay}
        loop={true}
        style={{ width: size, height: size }}
      />
    </View>
  );
};

/**
 * Sync Animation
 * Use when: Syncing with cloud
 *
 * Usage:
 * import { SyncAnimation } from '../utils/animations';
 * <SyncAnimation size={60} />
 */
export const SyncAnimation = ({ size = 60, autoPlay = true }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        source={require('../assets/animations/sync.json')}
        autoPlay={autoPlay}
        loop={true}
        style={{ width: size, height: size }}
      />
    </View>
  );
};

/**
 * Streak Fire Animation
 * Use when: Showing active streak
 *
 * Usage:
 * import { StreakAnimation } from '../utils/animations';
 * <StreakAnimation size={40} />
 */
export const StreakAnimation = ({ size = 40, autoPlay = true }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        source={require('../assets/animations/streak.json')}
        autoPlay={autoPlay}
        loop={true}
        style={{ width: size, height: size }}
      />
    </View>
  );
};

/**
 * Generic Animation Wrapper
 * For custom Lottie files
 *
 * Usage:
 * import { Animation } from '../utils/animations';
 * <Animation source={require('./my-animation.json')} size={100} />
 */
export const Animation = ({
  source,
  size = 100,
  autoPlay = true,
  loop = false,
  speed = 1,
  onComplete,
  style,
}) => {
  const animationRef = useRef(null);

  useEffect(() => {
    if (autoPlay && animationRef.current) {
      animationRef.current.play();
    }
  }, [autoPlay]);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <LottieView
        ref={animationRef}
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        style={{ width: size, height: size }}
        onAnimationFinish={onComplete}
      />
    </View>
  );
};

/**
 * Animation Presets
 * Quick access to common animation patterns
 */
export const AnimationPresets = {
  // Quick success (non-looping, auto-play)
  quickSuccess: () => <SuccessAnimation size={100} autoPlay loop={false} />,

  // Food logged celebration
  foodLogged: (onComplete) => (
    <CelebrationAnimation size={180} autoPlay loop={false} onComplete={onComplete} />
  ),

  // Goal achieved celebration
  goalAchieved: (onComplete) => (
    <CelebrationAnimation size={220} autoPlay loop={false} onComplete={onComplete} />
  ),

  // AI analyzing food
  analyzingFood: () => <FoodAnalysisAnimation size={140} autoPlay />,

  // Syncing with backend
  syncing: () => <SyncAnimation size={50} autoPlay />,

  // General loading
  loading: () => <LoadingAnimation size={70} autoPlay />,

  // Empty state
  emptyState: () => <EmptyStateAnimation size={160} autoPlay />,

  // Active streak
  activeStreak: () => <StreakAnimation size={36} autoPlay />,
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default {
  SuccessAnimation,
  ErrorAnimation,
  LoadingAnimation,
  CelebrationAnimation,
  FoodAnalysisAnimation,
  EmptyStateAnimation,
  SyncAnimation,
  StreakAnimation,
  Animation,
  AnimationPresets,
};
