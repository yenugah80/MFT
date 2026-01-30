/**
 * StreakBrokenModal - Snapchat-Style Streak Loss Popup
 *
 * Shown when user's streak is broken but can be restored.
 * Features:
 * - Dramatic broken heart animation
 * - Clear restoration option with countdown timer
 * - Skip option to accept the loss gracefully
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { useTheme } from '../../providers/ThemeProvider';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/premiumTheme';

const { width, height } = Dimensions.get('window');

export default function StreakBrokenModal({
  visible,
  previousStreak,
  freezesAvailable,
  hoursRemaining,
  onRestore,
  onSkip,
  onClose,
}) {
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    hours: hoursRemaining || 24,
    minutes: 0,
    seconds: 0,
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/gamification/restore-streak');
      return response.data || response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
      onRestore?.(data);
      onClose?.();
    },
    onError: (error) => {
      console.error('Streak restore failed:', error);
    },
  });

  // Entry animation
  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      shakeAnim.setValue(0);
      countdownOpacity.setValue(0);

      // Sequence: scale in → shake → show countdown
      Animated.sequence([
        // Scale in with bounce
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        // Dramatic shake
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]),
        // Fade in countdown
        Animated.timing(countdownOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for restore button
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  // Countdown timer
  useEffect(() => {
    if (!visible) return;

    const totalSeconds = (hoursRemaining || 24) * 3600;
    let remaining = totalSeconds;

    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timer);
        onClose?.(); // Auto-close when expired
        return;
      }

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, hoursRemaining]);

  const handleRestore = () => {
    if (freezesAvailable > 0) {
      restoreMutation.mutate();
    }
  };

  const formatTime = (num) => String(num).padStart(2, '0');

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <BlurView intensity={90} tint="dark" style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                { scale: scaleAnim },
                { translateX: shakeAnim },
              ],
            },
          ]}
        >
          {/* Broken Heart Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.brokenHeartWrapper}>
              <Ionicons name="heart-dislike" size={80} color="#EF4444" />
              <View style={styles.crackOverlay}>
                <Ionicons name="flash" size={40} color="#FFF" style={styles.crackIcon} />
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Streak Lost! 💔</Text>

          {/* Previous Streak Info */}
          <View style={styles.streakInfoContainer}>
            <Text style={styles.streakValue}>{previousStreak}</Text>
            <Text style={styles.streakLabel}>day streak was broken</Text>
          </View>

          {/* Countdown Timer */}
          <Animated.View style={[styles.countdownContainer, { opacity: countdownOpacity }]}>
            <Text style={styles.countdownLabel}>Restore within:</Text>
            <View style={styles.timerRow}>
              <View style={styles.timerBlock}>
                <Text style={styles.timerValue}>{formatTime(timeLeft.hours)}</Text>
                <Text style={styles.timerUnit}>hrs</Text>
              </View>
              <Text style={styles.timerSeparator}>:</Text>
              <View style={styles.timerBlock}>
                <Text style={styles.timerValue}>{formatTime(timeLeft.minutes)}</Text>
                <Text style={styles.timerUnit}>min</Text>
              </View>
              <Text style={styles.timerSeparator}>:</Text>
              <View style={styles.timerBlock}>
                <Text style={styles.timerValue}>{formatTime(timeLeft.seconds)}</Text>
                <Text style={styles.timerUnit}>sec</Text>
              </View>
            </View>
          </Animated.View>

          {/* Restore Button */}
          {freezesAvailable > 0 ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={restoreMutation.isPending}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.restoreGradient}
                >
                  <Ionicons name="snow" size={24} color="#FFF" style={styles.buttonIcon} />
                  <View style={styles.restoreTextContainer}>
                    <Text style={styles.restoreButtonText}>
                      {restoreMutation.isPending ? 'Restoring...' : 'Use Streak Freeze'}
                    </Text>
                    <Text style={styles.freezeCount}>
                      {freezesAvailable} freeze{freezesAvailable > 1 ? 's' : ''} available
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.noFreezesContainer}>
              <Ionicons name="snow-outline" size={24} color="#9CA3AF" />
              <Text style={styles.noFreezesText}>No freezes available</Text>
              <Text style={styles.noFreezesHint}>
                Earn freezes by maintaining 7-day streaks!
              </Text>
            </View>
          )}

          {/* Skip Button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              onSkip?.();
              onClose?.();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>
              Start Fresh Instead
            </Text>
          </TouchableOpacity>

          {/* Motivational Message */}
          <Text style={styles.motivationalText}>
            {freezesAvailable > 0
              ? "Don't let your progress slip away!"
              : "Every champion has setbacks. Your comeback starts now!"}
          </Text>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[4],
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1F2937',
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
    alignItems: 'center',
    ...SHADOWS.xl,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  iconContainer: {
    marginBottom: SPACING[4],
  },
  brokenHeartWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crackOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  crackIcon: {
    opacity: 0.8,
  },
  title: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  streakInfoContainer: {
    alignItems: 'center',
    marginBottom: SPACING[4],
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
  },
  streakValue: {
    fontSize: 48,
    fontWeight: TYPOGRAPHY.weight.black,
    color: '#EF4444',
    lineHeight: 56,
  },
  streakLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#9CA3AF',
    marginTop: SPACING[1],
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: SPACING[5],
    width: '100%',
  },
  countdownLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#9CA3AF',
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBlock: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    minWidth: 50,
  },
  timerValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#3B82F6',
  },
  timerUnit: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  timerSeparator: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#6B7280',
    marginHorizontal: SPACING[1],
  },
  restoreButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING[3],
  },
  restoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  buttonIcon: {
    marginRight: SPACING[2],
  },
  restoreTextContainer: {
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  freezeCount: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  noFreezesContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    padding: SPACING[4],
    borderRadius: RADIUS.lg,
    width: '100%',
    marginBottom: SPACING[3],
  },
  noFreezesText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#9CA3AF',
    marginTop: SPACING[2],
  },
  noFreezesHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#6B7280',
    marginTop: SPACING[1],
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  skipButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
  motivationalText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: SPACING[4],
    fontStyle: 'italic',
  },
});
