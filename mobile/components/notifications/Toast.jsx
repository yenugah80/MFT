import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { TYPOGRAPHY } from '../../constants/premiumTheme';
import { NOTIFICATION_COLORS } from '../../constants/notificationTypes';

// Lottie animation assets for celebrations
const LOTTIE_ANIMATIONS = {
  celebration: require('../../assets/animations/celebration.json'),
  success: require('../../assets/animations/success.json'),
  sparkle: require('../../assets/animations/sparkle.json'),
  streak: require('../../assets/animations/streak.json'),
  stars: require('../../assets/animations/stars.json'),
};

/**
 * Toast Component - Premium, Personality-Driven Notifications
 *
 * Features:
 * - Gradient accent bar for visual punch
 * - Icon in colored circle for prominence
 * - Domain-specific theming (food, hydration, mood, activity)
 * - Smooth spring animations with bounce
 * - Glassmorphism-inspired design
 * - Optional Lottie animations for celebrations
 */
const Toast = ({ type = 'info', domain, title, message, onDismiss, style, celebration = false, lottieAnimation }) => {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Premium entry animation: slide + fade + scale with spring
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDismiss = () => {
    // Smooth exit animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  // Standard toast types with gradient accents
  const standardConfig = {
    success: {
      icon: 'checkmark-circle',
      color: '#10b981',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(16, 185, 129, 0.15)',
      gradient: ['#10b981', '#059669'],
      iconBg: 'rgba(16, 185, 129, 0.12)',
    },
    error: {
      icon: 'close-circle',
      color: '#ef4444',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(239, 68, 68, 0.15)',
      gradient: ['#ef4444', '#dc2626'],
      iconBg: 'rgba(239, 68, 68, 0.12)',
    },
    warning: {
      icon: 'warning',
      color: '#f59e0b',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(245, 158, 11, 0.15)',
      gradient: ['#f59e0b', '#d97706'],
      iconBg: 'rgba(245, 158, 11, 0.12)',
    },
    info: {
      icon: 'information-circle',
      color: '#3b82f6',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(59, 130, 246, 0.15)',
      gradient: ['#3b82f6', '#2563eb'],
      iconBg: 'rgba(59, 130, 246, 0.12)',
    },
  };

  // Domain-themed toast configurations (premium wellness theming)
  // Uses unified colors from notificationTypes.js for consistency
  const domainConfig = {
    food: {
      icon: 'restaurant',
      color: NOTIFICATION_COLORS.food,
      backgroundColor: '#ffffff',
      borderColor: `${NOTIFICATION_COLORS.food}26`, // 15% opacity
      gradient: [NOTIFICATION_COLORS.food, '#ea580c'],
      iconBg: `${NOTIFICATION_COLORS.food}1F`, // 12% opacity
    },
    hydration: {
      icon: 'water',
      color: NOTIFICATION_COLORS.hydration,
      backgroundColor: '#ffffff',
      borderColor: `${NOTIFICATION_COLORS.hydration}26`,
      gradient: [NOTIFICATION_COLORS.hydration, '#60A5FA'],
      iconBg: `${NOTIFICATION_COLORS.hydration}1F`,
    },
    mood: {
      icon: 'happy',
      color: NOTIFICATION_COLORS.mood,
      backgroundColor: '#ffffff',
      borderColor: `${NOTIFICATION_COLORS.mood}26`,
      gradient: [NOTIFICATION_COLORS.mood, '#A78BFA'],
      iconBg: `${NOTIFICATION_COLORS.mood}1F`,
    },
    activity: {
      icon: 'fitness',
      color: NOTIFICATION_COLORS.activity,
      backgroundColor: '#ffffff',
      borderColor: `${NOTIFICATION_COLORS.activity}26`,
      gradient: [NOTIFICATION_COLORS.activity, '#34D399'],
      iconBg: `${NOTIFICATION_COLORS.activity}1F`,
    },
    prediction: {
      icon: 'sparkles',
      color: NOTIFICATION_COLORS.prediction,
      backgroundColor: '#ffffff',
      borderColor: `${NOTIFICATION_COLORS.prediction}26`,
      gradient: [NOTIFICATION_COLORS.prediction, '#4f46e5'],
      iconBg: `${NOTIFICATION_COLORS.prediction}1F`,
    },
    streak: {
      icon: 'flame',
      color: NOTIFICATION_COLORS.streak,
      backgroundColor: '#ffffff',
      borderColor: `${NOTIFICATION_COLORS.streak}26`,
      gradient: [NOTIFICATION_COLORS.streak, '#d97706'],
      iconBg: `${NOTIFICATION_COLORS.streak}1F`,
    },
    insight: {
      icon: 'bulb',
      color: NOTIFICATION_COLORS.insight,
      backgroundColor: '#ffffff',
      borderColor: `${NOTIFICATION_COLORS.insight}26`,
      gradient: [NOTIFICATION_COLORS.insight, '#0891b2'],
      iconBg: `${NOTIFICATION_COLORS.insight}1F`,
    },
  };

  // Determine config based on domain (if provided) or type
  const activeConfig = domain && domainConfig[domain]
    ? domainConfig[domain]
    : (standardConfig[type] || standardConfig.info);

  const { icon, color, backgroundColor, borderColor, gradient, iconBg } = activeConfig;

  // Determine which Lottie animation to use
  const getLottieSource = () => {
    if (lottieAnimation && LOTTIE_ANIMATIONS[lottieAnimation]) {
      return LOTTIE_ANIMATIONS[lottieAnimation];
    }
    if (celebration) {
      // Auto-select based on domain or type
      if (domain === 'streak') return LOTTIE_ANIMATIONS.streak;
      if (type === 'success') return LOTTIE_ANIMATIONS.success;
      return LOTTIE_ANIMATIONS.celebration;
    }
    return null;
  };

  const lottieSource = getLottieSource();
  const showLottie = celebration || lottieAnimation;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          opacity,
          transform: [{ translateY }, { scale }],
        },
        style,
      ]}
    >
      {/* Celebration Lottie overlay */}
      {showLottie && lottieSource && (
        <View style={styles.lottieOverlay} pointerEvents="none">
          <LottieView
            source={lottieSource}
            autoPlay
            loop={false}
            style={styles.lottieAnimation}
            speed={1.2}
          />
        </View>
      )}

      {/* Gradient accent bar */}
      <LinearGradient
        colors={gradient}
        style={styles.accentBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Icon in colored circle - or mini Lottie for celebrations */}
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        {showLottie && lottieSource ? (
          <LottieView
            source={LOTTIE_ANIMATIONS.sparkle}
            autoPlay
            loop
            style={styles.iconLottie}
          />
        ) : (
          <Ionicons name={icon} size={22} color={color} />
        )}
      </View>

      {/* Content */}
      <View style={styles.textContainer}>
        {typeof title === 'string' && title.trim() ? (
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        ) : null}
        {typeof message === 'string' && message.trim() ? (
          <Text style={[styles.message, { color }]} numberOfLines={4}>
            {message}
          </Text>
        ) : (
          <Text style={[styles.message, { color }]}>
            {type === 'success' ? 'Done!' : type === 'error' ? 'Oops!' : 'Hey there!'}
          </Text>
        )}
      </View>

      {/* Dismiss button */}
      <TouchableOpacity
        onPress={handleDismiss}
        style={[styles.closeButton, { backgroundColor: `${color}10` }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color={color} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 64,
    width: '100%',
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 0, // Accent bar takes the left
    borderRadius: 16,
    borderWidth: 1,
    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  lottieOverlay: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieAnimation: {
    width: 150,
    height: 150,
  },
  iconLottie: {
    width: 32,
    height: 32,
  },
  accentBar: {
    width: 5,
    height: '100%',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    marginRight: 14,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    zIndex: 20, // Above Lottie overlay
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#1f2937',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.medium,
    lineHeight: 20,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});

export default Toast;
