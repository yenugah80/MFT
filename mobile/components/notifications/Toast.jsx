import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Toast Component - Premium, Personality-Driven Notifications
 *
 * Features:
 * - Gradient accent bar for visual punch
 * - Icon in colored circle for prominence
 * - Domain-specific theming (food, hydration, mood, activity)
 * - Smooth spring animations with bounce
 * - Glassmorphism-inspired design
 */
const Toast = ({ type = 'info', domain, title, message, onDismiss, style }) => {
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
  const domainConfig = {
    food: {
      icon: 'restaurant',
      color: '#f97316',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(249, 115, 22, 0.15)',
      gradient: ['#f97316', '#ea580c'],
      iconBg: 'rgba(249, 115, 22, 0.12)',
    },
    hydration: {
      icon: 'water',
      color: '#0ea5e9',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(14, 165, 233, 0.15)',
      gradient: ['#0ea5e9', '#0284c7'],
      iconBg: 'rgba(14, 165, 233, 0.12)',
    },
    mood: {
      icon: 'happy',
      color: '#a855f7',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(168, 85, 247, 0.15)',
      gradient: ['#a855f7', '#9333ea'],
      iconBg: 'rgba(168, 85, 247, 0.12)',
    },
    activity: {
      icon: 'fitness',
      color: '#22c55e',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(34, 197, 94, 0.15)',
      gradient: ['#22c55e', '#16a34a'],
      iconBg: 'rgba(34, 197, 94, 0.12)',
    },
    prediction: {
      icon: 'sparkles',
      color: '#6366f1',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(99, 102, 241, 0.15)',
      gradient: ['#6366f1', '#4f46e5'],
      iconBg: 'rgba(99, 102, 241, 0.12)',
    },
    streak: {
      icon: 'flame',
      color: '#f59e0b',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(245, 158, 11, 0.15)',
      gradient: ['#f59e0b', '#d97706'],
      iconBg: 'rgba(245, 158, 11, 0.12)',
    },
    insight: {
      icon: 'bulb',
      color: '#06b6d4',
      backgroundColor: '#ffffff',
      borderColor: 'rgba(6, 182, 212, 0.15)',
      gradient: ['#06b6d4', '#0891b2'],
      iconBg: 'rgba(6, 182, 212, 0.12)',
    },
  };

  // Determine config based on domain (if provided) or type
  const activeConfig = domain && domainConfig[domain]
    ? domainConfig[domain]
    : (standardConfig[type] || standardConfig.info);

  const { icon, color, backgroundColor, borderColor, gradient, iconBg } = activeConfig;

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
      {/* Gradient accent bar */}
      <LinearGradient
        colors={gradient}
        style={styles.accentBar}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Icon in colored circle */}
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      {/* Content */}
      <View style={styles.textContainer}>
        {typeof title === 'string' && title.trim() ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {typeof message === 'string' && message.trim() ? (
          <Text style={[styles.message, { color }]} numberOfLines={2}>
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
    alignItems: 'center',
    minHeight: 64,
    minWidth: 300,
    maxWidth: 380,
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
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
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
