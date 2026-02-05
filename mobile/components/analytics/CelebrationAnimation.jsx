/**
 * CelebrationAnimation - Delightful success feedback
 *
 * Design Principles:
 * - Joy: Celebrate user achievements
 * - Motion: Purposeful, physics-based animations
 * - Restraint: Quick enough to not interrupt flow
 * - Personality: Warm, playful, encouraging
 *
 * Features:
 * - Confetti particle explosion
 * - Success checkmark with spring animation
 * - Toast notification with slide-in
 * - Haptic feedback integration
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CELEBRATION,
  ANIMATION,
  SMART_TYPOGRAPHY,
  SMART_SPACING,
  RADIUS,
  RECOMMENDATION_COLORS,
} from '../../constants/smartRecommendationTheme';
import { TEXT, SURFACES } from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// CONFETTI PARTICLE
// ============================================================================

function ConfettiParticle({ color, delay, startX, startY }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0)).current;

  // Random velocity and spin
  const velocityY = useRef(Math.random() * 300 + 200).current;
  const velocityX = useRef((Math.random() - 0.5) * 200).current;
  const rotationSpeed = useRef((Math.random() - 0.5) * 720).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        // Scale in
        Animated.spring(scale, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        // Fall with gravity
        Animated.timing(translateY, {
          toValue: velocityY,
          duration: CELEBRATION.duration,
          useNativeDriver: true,
        }),
        // Horizontal drift
        Animated.timing(translateX, {
          toValue: velocityX,
          duration: CELEBRATION.duration,
          useNativeDriver: true,
        }),
        // Rotation
        Animated.timing(rotate, {
          toValue: rotationSpeed,
          duration: CELEBRATION.duration,
          useNativeDriver: true,
        }),
        // Fade out at end
        Animated.sequence([
          Animated.delay(CELEBRATION.duration * 0.7),
          Animated.timing(opacity, {
            toValue: 0,
            duration: CELEBRATION.duration * 0.3,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, opacity, rotate, scale, translateX, translateY, rotationSpeed, velocityX, velocityY]);

  const spin = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const size = Math.random() * 8 + 6;
  const isCircle = Math.random() > 0.5;

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          width: size,
          height: isCircle ? size : size * 2,
          borderRadius: isCircle ? size / 2 : 2,
          left: startX,
          top: startY,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { rotate: spin },
            { scale },
          ],
        },
      ]}
    />
  );
}

// ============================================================================
// CONFETTI EXPLOSION
// ============================================================================

export function ConfettiExplosion({
  visible,
  originX = SCREEN_WIDTH / 2,
  originY = SCREEN_HEIGHT / 2,
  onComplete
}) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (visible) {
      // Generate particles
      const newParticles = Array.from({ length: CELEBRATION.particleCount }).map((_, i) => ({
        id: i,
        color: CELEBRATION.confettiColors[i % CELEBRATION.confettiColors.length],
        delay: Math.random() * 100,
        startX: originX + (Math.random() - 0.5) * 40,
        startY: originY,
      }));
      setParticles(newParticles);

      // Trigger haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Clean up after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, CELEBRATION.duration + 200);

      return () => clearTimeout(timer);
    }
  }, [visible, originX, originY, onComplete]);

  if (!visible || particles.length === 0) return null;

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          color={particle.color}
          delay={particle.delay}
          startX={particle.startX}
          startY={particle.startY}
        />
      ))}
    </View>
  );
}

// ============================================================================
// SUCCESS CHECKMARK
// ============================================================================

export function SuccessCheckmark({ visible, size = 80, color = RECOMMENDATION_COLORS.status.excellent }) {
  const scale = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        // Bounce in with rotation
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 1,
            duration: ANIMATION.duration.normal,
            useNativeDriver: true,
          }),
        ]),
        // Subtle pulse
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      scale.setValue(0);
      rotate.setValue(0);
    }
  }, [visible, rotate, scale]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-45deg', '0deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.checkmarkContainer,
        {
          width: size,
          height: size,
          backgroundColor: color + '20',
          borderRadius: size / 2,
          transform: [{ scale }, { rotate: spin }],
        },
      ]}
    >
      <Ionicons name="checkmark" size={size * 0.5} color={color} />
    </Animated.View>
  );
}

// ============================================================================
// SUCCESS TOAST
// ============================================================================

export function SuccessToast({
  visible,
  message = 'Success!',
  subtitle,
  icon = 'checkmark-circle',
  color = RECOMMENDATION_COLORS.status.excellent,
  onHide,
  duration = 2500,
}) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION.duration.fast,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: ANIMATION.duration.normal,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: ANIMATION.duration.normal,
            useNativeDriver: true,
          }),
        ]).start(() => onHide?.());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, translateY, opacity, duration, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.toastIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.toastTextContainer}>
        <Text style={styles.toastMessage}>{message}</Text>
        {subtitle && <Text style={styles.toastSubtitle}>{subtitle}</Text>}
      </View>
    </Animated.View>
  );
}

// ============================================================================
// QUICK LOG SUCCESS OVERLAY
// Full celebration experience for logging food
// ============================================================================

export function QuickLogSuccessOverlay({
  visible,
  foodName,
  calories,
  onComplete,
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (visible) {
      // Trigger confetti
      setShowConfetti(true);

      // Animate in
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: ANIMATION.duration.fast,
          useNativeDriver: true,
        }),
        Animated.spring(contentScale, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: ANIMATION.duration.normal,
            useNativeDriver: true,
          }),
          Animated.timing(contentScale, {
            toValue: 0.8,
            duration: ANIMATION.duration.normal,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowConfetti(false);
          onComplete?.();
        });
      }, 1800);

      return () => clearTimeout(timer);
    }
  }, [visible, overlayOpacity, contentScale, onComplete]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlayContainer, { opacity: overlayOpacity }]}>
        <ConfettiExplosion
          visible={showConfetti}
          originY={SCREEN_HEIGHT * 0.35}
        />

        <Animated.View
          style={[
            styles.successCard,
            { transform: [{ scale: contentScale }] }
          ]}
        >
          <View style={styles.successIconWrapper}>
            <LinearGradient
              colors={RECOMMENDATION_COLORS.gradient.success}
              style={styles.successIconGradient}
            >
              <Ionicons name="checkmark" size={40} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <Text style={styles.successTitle}>Logged!</Text>
          <Text style={styles.successFoodName}>{foodName}</Text>
          {calories && (
            <View style={styles.caloriesBadge}>
              <Ionicons name="flame" size={14} color={RECOMMENDATION_COLORS.nutrients.calories.primary} />
              <Text style={styles.caloriesText}>{calories} cal</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ============================================================================
// HOOK: useQuickLogCelebration
// ============================================================================

export function useQuickLogCelebration() {
  const [celebrationState, setCelebrationState] = useState({
    visible: false,
    foodName: '',
    calories: 0,
  });

  const celebrate = useCallback((foodName, calories) => {
    setCelebrationState({
      visible: true,
      foodName,
      calories,
    });
  }, []);

  const hideCelebration = useCallback(() => {
    setCelebrationState(prev => ({ ...prev, visible: false }));
  }, []);

  const CelebrationComponent = useCallback(() => (
    <QuickLogSuccessOverlay
      visible={celebrationState.visible}
      foodName={celebrationState.foodName}
      calories={celebrationState.calories}
      onComplete={hideCelebration}
    />
  ), [celebrationState, hideCelebration]);

  return {
    celebrate,
    CelebrationComponent,
    isVisible: celebrationState.visible,
  };
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
    zIndex: 1000,
  },
  confettiParticle: {
    position: 'absolute',
  },
  checkmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: SMART_SPACING.lg,
    right: SMART_SPACING.lg,
    backgroundColor: SURFACES.card,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SMART_SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 1001,
  },
  toastIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SMART_SPACING.md,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastMessage: {
    ...SMART_TYPOGRAPHY.cardTitle,
    color: TEXT.primary,
  },
  toastSubtitle: {
    ...SMART_TYPOGRAPHY.bodySmall,
    color: TEXT.secondary,
    marginTop: 2,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCard: {
    backgroundColor: SURFACES.card,
    borderRadius: RADIUS['2xl'],
    padding: SMART_SPACING['3xl'],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
    minWidth: 260,
  },
  successIconWrapper: {
    marginBottom: SMART_SPACING.lg,
  },
  successIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...SMART_TYPOGRAPHY.sectionTitle,
    color: TEXT.primary,
    marginBottom: SMART_SPACING.xs,
  },
  successFoodName: {
    ...SMART_TYPOGRAPHY.bodyLarge,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RECOMMENDATION_COLORS.nutrients.calories.bg,
    paddingHorizontal: SMART_SPACING.md,
    paddingVertical: SMART_SPACING.sm,
    borderRadius: RADIUS.full,
    marginTop: SMART_SPACING.md,
    gap: SMART_SPACING.xs,
  },
  caloriesText: {
    ...SMART_TYPOGRAPHY.pill,
    color: RECOMMENDATION_COLORS.nutrients.calories.primary,
  },
});

export default {
  ConfettiExplosion,
  SuccessCheckmark,
  SuccessToast,
  QuickLogSuccessOverlay,
  useQuickLogCelebration,
};
