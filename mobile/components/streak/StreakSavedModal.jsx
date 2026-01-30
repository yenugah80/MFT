/**
 * StreakSavedModal - Snapchat-Style Freeze Auto-Save Notification
 *
 * Shown when a streak freeze was automatically consumed overnight
 * to preserve the user's streak. Celebratory but informative.
 */

import React, { useEffect, useRef } from 'react';
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
import LottieView from 'lottie-react-native';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/premiumTheme';

const { width } = Dimensions.get('window');

export default function StreakSavedModal({
  visible,
  streak,
  freezesRemaining,
  onClose,
}) {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const snowflakeRotate = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const lottieRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      snowflakeRotate.setValue(0);

      // Scale in with celebration
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }).start();

      // Snowflake rotation
      Animated.loop(
        Animated.timing(snowflakeRotate, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Play celebration animation
      if (lottieRef.current) {
        lottieRef.current.play();
      }
    }
  }, [visible]);

  const snowflakeSpin = snowflakeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <BlurView intensity={80} tint="dark" style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Background glow effect */}
          <Animated.View
            style={[
              styles.glowEffect,
              { opacity: glowAnim },
            ]}
          />

          {/* Lottie celebration in background */}
          <View style={styles.lottieContainer}>
            <LottieView
              ref={lottieRef}
              source={require('../../assets/animations/celebration.json')}
              style={styles.lottie}
              loop={false}
            />
          </View>

          {/* Snowflake Icon with animation */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.snowflakeWrapper,
                { transform: [{ rotate: snowflakeSpin }] },
              ]}
            >
              <LinearGradient
                colors={['#60A5FA', '#3B82F6', '#1D4ED8']}
                style={styles.iconGradient}
              >
                <Ionicons name="snow" size={48} color="#FFF" />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Streak Saved! ❄️🔥</Text>

          {/* Message */}
          <Text style={styles.message}>
            Your streak freeze kicked in overnight and saved your{' '}
            <Text style={styles.highlight}>{streak}-day streak</Text>!
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="flame" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, styles.freezeIcon]}>
                <Ionicons name="snow" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{freezesRemaining}</Text>
              <Text style={styles.statLabel}>Freezes Left</Text>
            </View>
          </View>

          {/* Warning if low on freezes */}
          {freezesRemaining <= 1 && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={16} color="#F59E0B" />
              <Text style={styles.warningText}>
                {freezesRemaining === 0
                  ? "You're out of freezes! Log daily to earn more."
                  : "Only 1 freeze left! Keep logging to earn more."}
              </Text>
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <Ionicons name="flame" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.continueText}>Keep the Fire Burning!</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Tip */}
          <Text style={styles.tipText}>
            Tip: Log any meal, water, or mood to maintain your streak
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
    borderColor: 'rgba(59, 130, 246, 0.3)',
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: -50,
    left: '50%',
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#3B82F6',
  },
  lottieContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    overflow: 'hidden',
  },
  lottie: {
    width: '100%',
    height: '100%',
  },
  iconContainer: {
    marginBottom: SPACING[4],
    zIndex: 1,
  },
  snowflakeWrapper: {
    ...SHADOWS.lg,
  },
  iconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
    marginBottom: SPACING[2],
    textAlign: 'center',
    zIndex: 1,
  },
  message: {
    fontSize: TYPOGRAPHY.size.md,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: SPACING[4],
    lineHeight: 22,
    zIndex: 1,
  },
  highlight: {
    color: '#F59E0B',
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    width: '100%',
    zIndex: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  freezeIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: SPACING[3],
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[4],
    gap: SPACING[2],
    zIndex: 1,
  },
  warningText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#F59E0B',
    flex: 1,
  },
  continueButton: {
    width: '100%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING[3],
    zIndex: 1,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
  },
  continueText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  tipText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#6B7280',
    textAlign: 'center',
    zIndex: 1,
  },
});
