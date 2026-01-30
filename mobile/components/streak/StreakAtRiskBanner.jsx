/**
 * StreakAtRiskBanner - Floating Notification Banner
 *
 * A persistent but dismissible banner that appears when:
 * - User's streak is at risk (hasn't logged today)
 * - Shows hours remaining before streak resets
 * - Pulses to grab attention
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/premiumTheme';

const { width } = Dimensions.get('window');

export default function StreakAtRiskBanner({
  visible,
  streak,
  hoursRemaining,
  onLogNow,
  onDismiss,
  onUseFreeze,
  freezesAvailable = 0,
}) {
  const insets = useSafeAreaInsets();

  // Animation values
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Urgency level based on time remaining
  const isUrgent = hoursRemaining <= 2;
  const isCritical = hoursRemaining <= 1;

  useEffect(() => {
    if (visible) {
      // Slide in from top
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();

      // Pulse animation (more intense if urgent)
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: isUrgent ? 1.03 : 1.01,
            duration: isUrgent ? 500 : 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: isUrgent ? 500 : 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Shake if critical
      if (isCritical) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 2, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -2, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 2, duration: 100, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
            Animated.delay(2000),
          ])
        ).start();
      }
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, isUrgent, isCritical]);

  if (!visible) return null;

  const gradientColors = isCritical
    ? ['#DC2626', '#EF4444'] // Red for critical
    : isUrgent
    ? ['#F59E0B', '#D97706'] // Orange for urgent
    : ['#1F2937', '#374151']; // Dark for normal

  const formatTimeRemaining = () => {
    if (hoursRemaining < 1) {
      const minutes = Math.round(hoursRemaining * 60);
      return `${minutes}m`;
    }
    return `${Math.floor(hoursRemaining)}h`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { translateX: shakeAnim },
            { scale: pulseAnim },
          ],
          top: insets.top + 8,
        },
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {/* Left: Warning Icon + Message */}
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isCritical ? 'warning' : 'flame'}
              size={24}
              color="#FFF"
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>
              {isCritical
                ? '🚨 Streak Ending Soon!'
                : isUrgent
                ? '⚠️ Streak At Risk!'
                : '🔥 Keep Your Streak!'}
            </Text>
            <Text style={styles.subtitle}>
              {streak} day streak • {formatTimeRemaining()} left
            </Text>
          </View>
        </View>

        {/* Right: Action Buttons */}
        <View style={styles.rightContent}>
          {freezesAvailable > 0 && (
            <TouchableOpacity
              style={styles.freezeButton}
              onPress={onUseFreeze}
              activeOpacity={0.7}
            >
              <Ionicons name="snow" size={16} color="#3B82F6" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.logButton}
            onPress={onLogNow}
            activeOpacity={0.8}
          >
            <Text style={styles.logButtonText}>Log Now</Text>
            <Ionicons name="add-circle" size={16} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING[3],
    right: SPACING[3],
    zIndex: 1000,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[2],
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  freezeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    gap: SPACING[1],
  },
  logButtonText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  dismissButton: {
    padding: SPACING[1],
  },
});
