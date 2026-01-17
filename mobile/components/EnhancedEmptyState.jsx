/**
 * Enhanced Empty State Component
 *
 * A polished, animated empty state component that:
 * - Adapts to different tracking types (food, water, mood, activity, sleep, stress)
 * - Shows context-aware messaging based on user journey stage
 * - Includes micro-animations (breathing, pulsing, waving)
 * - Provides primary and secondary CTAs
 * - Shows goal-specific tips and encouragement
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from '../constants/premiumTheme';
import {
  getEmptyStateConfig,
  EMPTY_STATE_TYPES,
  EMPTY_STATE_ANIMATIONS,
} from '../constants/emptyStateConfig';

// Animation duration constants
const BREATHE_DURATION = 3000;
const PULSE_DURATION = 2000;
const BOUNCE_DURATION = 1500;

export default function EnhancedEmptyState({
  trackingType = 'food',
  stateType = EMPTY_STATE_TYPES.FIRST_TIME,
  userGoal = null,
  onPrimaryAction,
  onSecondaryAction,
  onQuickAdd,
  showTip = true,
  compact = false,
  style,
}) {
  // Get configuration
  const config = getEmptyStateConfig(trackingType, stateType, userGoal);
  const animationType = EMPTY_STATE_ANIMATIONS[trackingType] || 'pulse';

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Start animation based on type
  useEffect(() => {
    let animation;

    switch (animationType) {
      case 'breathe':
        animation = Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(scaleAnim, {
                toValue: 1.1,
                duration: BREATHE_DURATION / 2,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(opacityAnim, {
                toValue: 1,
                duration: BREATHE_DURATION / 2,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: BREATHE_DURATION / 2,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(opacityAnim, {
                toValue: 0.6,
                duration: BREATHE_DURATION / 2,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          ])
        );
        break;

      case 'pulse':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.05,
              duration: PULSE_DURATION / 2,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: PULSE_DURATION / 2,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'bounce':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: -10,
              duration: BOUNCE_DURATION / 4,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
              toValue: 0,
              duration: BOUNCE_DURATION / 4,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.delay(BOUNCE_DURATION / 2),
          ])
        );
        break;

      case 'wave':
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.03,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.97,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      default:
        animation = Animated.loop(
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        );
    }

    animation.start();
    return () => animation.stop();
  }, [animationType]);

  if (!config) return null;

  const handlePrimaryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPrimaryAction?.(config.primaryCTA?.action, config.primaryCTA?.params);
  };

  const handleSecondaryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSecondaryAction?.(config.secondaryCTA?.action, config.secondaryCTA?.params);
  };

  const handleQuickAdd = (option) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onQuickAdd?.(option);
  };

  // Compact version for inline use
  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={[styles.compactIconBg, { backgroundColor: `${config.color}15` }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle}>{config.title}</Text>
          {config.primaryCTA && (
            <TouchableOpacity
              style={[styles.compactButton, { borderColor: config.color }]}
              onPress={handlePrimaryPress}
            >
              <Text style={[styles.compactButtonText, { color: config.color }]}>
                {config.primaryCTA.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Animated Icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          { backgroundColor: `${config.color}15` },
          {
            transform: [
              { scale: scaleAnim },
              { translateY: bounceAnim },
            ],
            opacity: animationType === 'breathe' ? opacityAnim : 1,
          },
        ]}
      >
        <Ionicons name={config.icon} size={48} color={config.color} />
      </Animated.View>

      {/* Title */}
      <Text style={styles.title}>{config.title}</Text>

      {/* Description */}
      <Text style={styles.description}>{config.description}</Text>

      {/* Goal-specific message */}
      {config.goalMessage && (
        <View style={styles.goalMessageContainer}>
          <Ionicons name="bulb-outline" size={16} color={TEXT.tertiary} />
          <Text style={styles.goalMessage}>{config.goalMessage}</Text>
        </View>
      )}

      {/* Quick Add Options (for water, activity) */}
      {config.quickAddOptions && (
        <View style={styles.quickAddContainer}>
          {config.quickAddOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickAddButton, { borderColor: `${config.color}30` }]}
              onPress={() => handleQuickAdd(option)}
            >
              {option.icon && (
                <Ionicons name={option.icon} size={18} color={config.color} />
              )}
              <Text style={[styles.quickAddLabel, { color: config.color }]}>
                {option.label}
              </Text>
              {option.amount && (
                <Text style={styles.quickAddAmount}>{option.amount}ml</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Primary CTA */}
      {config.primaryCTA && (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handlePrimaryPress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[config.color, `${config.color}DD`]}
            style={styles.primaryButtonGradient}
          >
            {config.primaryCTA.icon && (
              <Ionicons name={config.primaryCTA.icon} size={20} color="#FFF" />
            )}
            <Text style={styles.primaryButtonText}>
              {config.primaryCTA.label}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Secondary CTA */}
      {config.secondaryCTA && (
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: config.color }]}
          onPress={handleSecondaryPress}
        >
          {config.secondaryCTA.icon && (
            <Ionicons name={config.secondaryCTA.icon} size={18} color={config.color} />
          )}
          <Text style={[styles.secondaryButtonText, { color: config.color }]}>
            {config.secondaryCTA.label}
          </Text>
        </TouchableOpacity>
      )}

      {/* Tip */}
      {showTip && config.tip && (
        <View style={styles.tipContainer}>
          <Ionicons name="information-circle-outline" size={16} color={TEXT.tertiary} />
          <Text style={styles.tipText}>{config.tip}</Text>
        </View>
      )}
    </View>
  );
}

// Specialized empty state for water with wave animation
export function WaterEmptyState({ onQuickAdd, userGoal, style }) {
  return (
    <EnhancedEmptyState
      trackingType="water"
      stateType={EMPTY_STATE_TYPES.FIRST_TIME}
      userGoal={userGoal}
      onQuickAdd={onQuickAdd}
      style={style}
    />
  );
}

// Specialized empty state for mood with breathing animation
export function MoodEmptyState({ onPrimaryAction, style }) {
  return (
    <EnhancedEmptyState
      trackingType="mood"
      stateType={EMPTY_STATE_TYPES.FIRST_TIME}
      onPrimaryAction={onPrimaryAction}
      style={style}
    />
  );
}

// Specialized empty state for activity
export function ActivityEmptyState({ onPrimaryAction, onQuickAdd, userGoal, style }) {
  return (
    <EnhancedEmptyState
      trackingType="activity"
      stateType={EMPTY_STATE_TYPES.FIRST_TIME}
      userGoal={userGoal}
      onPrimaryAction={onPrimaryAction}
      onQuickAdd={onQuickAdd}
      style={style}
    />
  );
}

// Specialized empty state for sleep
export function SleepEmptyState({ onPrimaryAction, style }) {
  return (
    <EnhancedEmptyState
      trackingType="sleep"
      stateType={EMPTY_STATE_TYPES.FIRST_TIME}
      onPrimaryAction={onPrimaryAction}
      style={style}
    />
  );
}

// Specialized empty state for stress
export function StressEmptyState({ onPrimaryAction, style }) {
  return (
    <EnhancedEmptyState
      trackingType="stress"
      stateType={EMPTY_STATE_TYPES.FIRST_TIME}
      onPrimaryAction={onPrimaryAction}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SPACING[5],
    paddingVertical: SPACING[6],
  },

  // Icon
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },

  // Title
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    textAlign: 'center',
    marginBottom: SPACING[2],
  },

  // Description
  description: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: SPACING[3],
  },

  // Goal Message
  goalMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
  },
  goalMessage: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    flex: 1,
  },

  // Quick Add
  quickAddContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  quickAddLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  quickAddAmount: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Primary Button
  primaryButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING[3],
    ...SHADOWS.sm,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFF',
  },

  // Secondary Button
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING[4],
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Tip
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
    marginTop: SPACING[2],
  },
  tipText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    flex: 1,
    lineHeight: 16,
  },

  // Compact Version
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: SPACING[3],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  compactIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
    flex: 1,
  },
  compactButton: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  compactButtonText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});
