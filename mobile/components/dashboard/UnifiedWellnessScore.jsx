/**
 * UnifiedWellnessScore - Hero Wellness Ring Card
 *
 * Single prominent metric combining nutrition, hydration, mood, and consistency.
 * Inspired by Oura Ring's Readiness Score - one number to reduce cognitive load.
 *
 * Design Principles:
 * - Single metric focus: One score to understand daily wellness
 * - Honest uncertainty: Shows confidence level
 * - Progressive disclosure: Tap for detailed breakdown
 * - Premium animation: Smooth, native-driven ring fill
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  CARD_SYSTEM,
  CONFIDENCE_COLORS,
} from '../../constants/premiumTheme';
import { BOLD_GRADIENTS, WELLNESS_COLORS } from '../../constants/modernColorPalette';
import { ConfidenceBadge, ConfidenceInfoCard } from '../ConfidenceIndicator';

// Score tier configuration
const SCORE_TIERS = {
  excellent: { min: 85, label: 'Excellent', color: '#059669', icon: 'trophy' },
  great: { min: 70, label: 'Great', color: '#10B981', icon: 'thumbs-up' },
  good: { min: 55, label: 'Good', color: '#84CC16', icon: 'checkmark-circle' },
  fair: { min: 40, label: 'Building', color: '#EAB308', icon: 'trending-up' },
  starting: { min: 0, label: 'Starting', color: '#9CA3AF', icon: 'footsteps' },
};

const getTier = (score) => {
  if (score >= SCORE_TIERS.excellent.min) return SCORE_TIERS.excellent;
  if (score >= SCORE_TIERS.great.min) return SCORE_TIERS.great;
  if (score >= SCORE_TIERS.good.min) return SCORE_TIERS.good;
  if (score >= SCORE_TIERS.fair.min) return SCORE_TIERS.fair;
  return SCORE_TIERS.starting;
};

// Animated Progress Ring with 240° arc gradient
// Design: 240° half-closed arc (not full circle) per visual intelligence system
const AnimatedProgressRing = ({ progress, size = 140, strokeWidth = 12, delay = 0, arcDegrees = 240 }) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;

  // Calculate arc-specific circumference (only for the visible arc)
  const arcRadians = (arcDegrees * Math.PI) / 180;
  const arcLength = radius * arcRadians;

  // Start angle: -120° (top-left), so we rotate by -150° to center it
  const startAngle = (arcDegrees === 240) ? -120 : -90;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(animatedProgress, {
        toValue: Math.min(progress, 100),
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [progress, delay, animatedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [arcLength, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: `${startAngle + 90}deg` }] }}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4F46E5" />
            <Stop offset="50%" stopColor="#0EA5E9" />
            <Stop offset="100%" stopColor="#10B981" />
          </SvgGradient>
        </Defs>

        {/* Background track - only visible arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0, 0, 0, 0.06)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={arcLength}
          strokeDashoffset={0}
          strokeLinecap="round"
        />

        {/* Progress ring - animated arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
    </View>
  );
};

// Breakdown Item in Modal
const BreakdownItem = ({ label, value, max, icon, color, confidence }) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <View style={styles.breakdownItem}>
      <View style={styles.breakdownHeader}>
        <View style={[styles.breakdownIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.breakdownLabel}>{label}</Text>
        <View style={styles.breakdownRight}>
          <Text style={styles.breakdownValue}>{percentage}%</Text>
          {confidence && (
            <ConfidenceBadge source={confidence} showLabel={false} />
          )}
        </View>
      </View>
      <View style={styles.breakdownTrack}>
        <View
          style={[
            styles.breakdownFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

/**
 * Main UnifiedWellnessScore Component
 */
export default function UnifiedWellnessScore({
  score = 0,
  breakdown = {},
  confidence = 0.75,
  onPress,
  style,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const tier = useMemo(() => getTier(score), [score]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Subtle press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setModalVisible(true);
    onPress?.();
  };

  const handleInfoPress = async () => {
    await Haptics.selectionAsync();
    setInfoVisible(true);
  };

  // Default breakdown structure
  const breakdownData = {
    nutrition: { value: breakdown.nutrition || 0, max: 100, icon: 'restaurant', color: WELLNESS_COLORS.nutrition.base },
    hydration: { value: breakdown.hydration || 0, max: 100, icon: 'water', color: WELLNESS_COLORS.hydration.base },
    mood: { value: breakdown.mood || 0, max: 100, icon: 'happy', color: WELLNESS_COLORS.mood.base },
    habits: { value: breakdown.habits || 0, max: 100, icon: 'fitness', color: WELLNESS_COLORS.fitness.base },
  };

  return (
    <>
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <TouchableOpacity
          style={styles.container}
          onPress={handlePress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Wellness score ${score} out of 100, ${tier.label}. Tap for details.`}
        >
          {/* Gradient Background */}
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Your Wellness Today</Text>
              <TouchableOpacity
                onPress={handleInfoPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="information-circle-outline" size={20} color={TEXT.tertiary} />
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
              {/* Progress Ring */}
              <View style={styles.ringContainer}>
                <AnimatedProgressRing progress={score} size={140} strokeWidth={12} delay={200} />

                {/* Center Score */}
                <View style={styles.ringCenter}>
                  <Text style={styles.scoreValue}>{Math.round(score)}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
              </View>

              {/* Tier Label */}
              <View style={[styles.tierBadge, { backgroundColor: `${tier.color}15` }]}>
                <Ionicons name={tier.icon} size={16} color={tier.color} />
                <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>~{Math.round(confidence * 100)}% confident</Text>
                <ConfidenceBadge confidenceScore={confidence} showLabel={false} />
              </View>
              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>Tap for breakdown</Text>
                <Ionicons name="chevron-forward" size={14} color={TEXT.muted} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Breakdown Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Wellness Breakdown</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={TEXT.secondary} />
            </TouchableOpacity>
          </View>

          {/* Score Summary */}
          <View style={styles.modalScoreSection}>
            <View style={styles.modalScoreRing}>
              <AnimatedProgressRing progress={score} size={100} strokeWidth={10} />
              <View style={styles.modalScoreCenter}>
                <Text style={styles.modalScoreValue}>{Math.round(score)}</Text>
              </View>
            </View>
            <View style={styles.modalScoreInfo}>
              <Text style={styles.modalScoreTier}>{tier.label}</Text>
              <Text style={styles.modalScoreDesc}>
                Your overall wellness based on nutrition, hydration, mood, and habits.
              </Text>
            </View>
          </View>

          {/* Breakdown Items */}
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Category Scores</Text>
            <BreakdownItem
              label="Nutrition"
              value={breakdownData.nutrition.value}
              max={breakdownData.nutrition.max}
              icon={breakdownData.nutrition.icon}
              color={breakdownData.nutrition.color}
              confidence="aiText"
            />
            <BreakdownItem
              label="Hydration"
              value={breakdownData.hydration.value}
              max={breakdownData.hydration.max}
              icon={breakdownData.hydration.icon}
              color={breakdownData.hydration.color}
              confidence="database"
            />
            <BreakdownItem
              label="Mood & Energy"
              value={breakdownData.mood.value}
              max={breakdownData.mood.max}
              icon={breakdownData.mood.icon}
              color={breakdownData.mood.color}
              confidence="userEstimate"
            />
            <BreakdownItem
              label="Consistency"
              value={breakdownData.habits.value}
              max={breakdownData.habits.max}
              icon={breakdownData.habits.icon}
              color={breakdownData.habits.color}
              confidence="database"
            />
          </View>

          {/* Explanation */}
          <View style={styles.explanationSection}>
            <Ionicons name="bulb-outline" size={16} color={TEXT.muted} />
            <Text style={styles.explanationText}>
              This score combines your daily progress across all wellness categories.
              It&apos;s meant to give you a quick overview, not a precise measurement.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Confidence Info Modal */}
      <Modal
        visible={infoVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setInfoVisible(false)}
      >
        <TouchableOpacity
          style={styles.infoOverlay}
          activeOpacity={1}
          onPress={() => setInfoVisible(false)}
        >
          <View style={styles.infoContainer}>
            <ConfidenceInfoCard
              source="mixedDish"
              confidenceScore={confidence}
              onClose={() => setInfoVisible(false)}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CARD_SYSTEM.hero,
    padding: 0,
    overflow: 'hidden',
  },
  gradient: {
    padding: SPACING[5],
    borderRadius: RADIUS['2xl'],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Content
  content: {
    alignItems: 'center',
    gap: SPACING[4],
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    lineHeight: 52,
  },
  scoreMax: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.muted,
    marginTop: -4,
  },

  // Tier
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
  },
  tierLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Footer
  footer: {
    marginTop: SPACING[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  confidenceLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  tapHintText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: SPACING[5],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[6],
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },

  // Modal Score Section
  modalScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[5],
    marginBottom: SPACING[6],
    paddingBottom: SPACING[6],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalScoreRing: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScoreCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  modalScoreValue: {
    fontSize: 32,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  modalScoreInfo: {
    flex: 1,
  },
  modalScoreTier: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  modalScoreDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: TYPOGRAPHY.size.sm * 1.5,
  },

  // Breakdown
  breakdownSection: {
    gap: SPACING[4],
  },
  breakdownTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  breakdownItem: {
    gap: SPACING[2],
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  breakdownIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  breakdownValue: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  breakdownTrack: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginLeft: 44, // Align with label
  },
  breakdownFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },

  // Explanation
  explanationSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    marginTop: SPACING[6],
    padding: SPACING[4],
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: RADIUS.lg,
  },
  explanationText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    lineHeight: TYPOGRAPHY.size.sm * 1.5,
  },

  // Info Overlay
  infoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[5],
  },
  infoContainer: {
    width: '100%',
    maxWidth: 360,
  },
});
