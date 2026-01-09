/**
 * ============================================================================
 * HydrationInsightsCardV2 - Calm Luxury Premium Dashboard Card
 * ============================================================================
 *
 * Design Philosophy: "The Oura Ring of Hydration"
 * - Zero Cognitive Load: Primary action clear in <2 seconds
 * - Calm by Default: No flashing, bouncing, or celebratory animations
 * - Glanceable Intelligence: Text-based insights > charts
 * - Trust Over Delight: No gamification manipulation
 * - Effortless Interaction: <=1 tap for frequent actions
 *
 * Hard Budgets:
 * - Max 1 tap to log water
 * - Max 2 seconds to action
 * - Max 1 decision per screen
 * - Animation duration: 150-250ms only, ease-out
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
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
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import {
  HYDRATION_BASE,
  HYDRATION_ACCENT,
  HYDRATION_SEMANTIC,
  HYDRATION_PREDICTION,
  HYDRATION_EFFECTS,
  HYDRATION_TYPOGRAPHY,
  HYDRATION_SPACING,
  HYDRATION_MOTION,
  HYDRATION_PROGRESS_RING,
  HYDRATION_COLD_START,
} from '../../constants/hydrationTheme';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_QUICK_ADD_ML = 250; // 1-tap adds 250ml water

const COLD_START_MESSAGES = {
  'day0': {
    title: "We're learning your rhythm.",
    progress: 0,
    daysRemaining: 7,
    body: 'In a few days, we\'ll show you personalized insights based on your patterns.',
  },
  'days1-3': {
    title: "We're learning your rhythm.",
    progress: (days) => (days / 7) * 100,
    body: 'Patterns emerging soon...',
  },
  'days4-7': {
    title: "Almost there.",
    progress: (days) => (days / 7) * 100,
    body: 'Your hydration personality is taking shape.',
  },
};

// ============================================================================
// PROGRESS RING - Hero Element
// ============================================================================

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function PremiumProgressRing({ progress, size, strokeWidth }) {
  const animatedProgress = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Deliberate, slow animation - 600ms ease-out
    Animated.timing(animatedProgress, {
      toValue: Math.min(progress, 100),
      duration: HYDRATION_MOTION.duration.ring,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // Success state: emerald green glow at 100%
  const isComplete = progress >= 100;
  const shadowStyle = isComplete
    ? HYDRATION_EFFECTS.shadow.ringSuccess
    : HYDRATION_EFFECTS.shadow.ring;

  return (
    <View style={[styles.ringContainer, { width: size, height: size }, shadowStyle]}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="hydrationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={HYDRATION_ACCENT.primary} />
            <Stop offset="50%" stopColor={HYDRATION_ACCENT.gradient[1]} />
            <Stop offset="100%" stopColor={HYDRATION_ACCENT.primaryLight} />
          </SvgGradient>
          <SvgGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={HYDRATION_SEMANTIC.success.base} />
            <Stop offset="100%" stopColor={HYDRATION_SEMANTIC.success.light} />
          </SvgGradient>
        </Defs>

        {/* Track (unfilled) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={HYDRATION_PROGRESS_RING.trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress (filled) */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isComplete ? 'url(#successGradient)' : 'url(#hydrationGradient)'}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>

      {/* Center Content */}
      <View style={styles.ringCenterContent}>
        <Text style={[
          styles.ringPercentage,
          isComplete && { color: HYDRATION_SEMANTIC.success.base }
        ]}>
          {Math.round(progress)}%
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// COLD START LEARNING PROGRESS
// ============================================================================

function ColdStartProgress({ stage, daysWithData }) {
  const message = COLD_START_MESSAGES[stage] || COLD_START_MESSAGES['day0'];
  const progressPercent = typeof message.progress === 'function'
    ? message.progress(daysWithData)
    : message.progress;
  const daysRemaining = Math.max(0, 7 - daysWithData);

  return (
    <View style={styles.coldStartContainer}>
      <Text style={styles.coldStartTitle}>{message.title}</Text>

      {/* Progress Bar */}
      <View style={styles.coldStartProgressTrack}>
        <View
          style={[
            styles.coldStartProgressFill,
            { width: `${progressPercent}%` }
          ]}
        />
      </View>

      <Text style={styles.coldStartDays}>
        {daysRemaining > 0 ? `Day ${daysWithData + 1} of 7` : 'Ready'}
      </Text>

      <Text style={styles.coldStartBody}>{message.body}</Text>
    </View>
  );
}

// ============================================================================
// PREDICTION CARD (Established Users Only)
// ============================================================================

function PredictionCard({ prediction, onExplain }) {
  if (!prediction?.hasPrediction) return null;

  const { predictedNeedLiters, factors, confidence } = prediction;
  const factorSummary = factors?.slice(0, 2).map(f => f.type).join(' + ') || 'typical day';

  return (
    <TouchableOpacity
      style={styles.predictionCard}
      onPress={onExplain}
      activeOpacity={0.8}
    >
      <View style={styles.predictionIndicator}>
        <View style={styles.predictionDot} />
        <Text style={styles.predictionLabel}>Tomorrow</Text>
      </View>

      <Text style={styles.predictionValue}>
        You'll likely need {(predictedNeedLiters * 1000).toFixed(0)}ml
      </Text>

      <Text style={styles.predictionContext}>
        {factorSummary}
      </Text>

      <View style={styles.predictionExplain}>
        <Text style={styles.predictionExplainText}>How we know this</Text>
        <Ionicons name="chevron-forward" size={14} color={HYDRATION_PREDICTION.primary} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// PRIMARY CTA BUTTON
// ============================================================================

function PrimaryAddButton({ onPress, isLoading, defaultAmount = 250 }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(async () => {
    // Haptic feedback - medium impact
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Quick scale feedback (150ms)
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: HYDRATION_MOTION.duration.quick,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: HYDRATION_MOTION.duration.quick,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.(defaultAmount / 1000); // Convert to liters
  }, [onPress, defaultAmount, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={isLoading}
        activeOpacity={1}
        style={styles.primaryButtonTouchable}
      >
        <LinearGradient
          colors={HYDRATION_ACCENT.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryButton}
        >
          <Ionicons name="add" size={20} color={HYDRATION_BASE.text.inverse} />
          <Text style={styles.primaryButtonText}>Add {defaultAmount}ml</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// SECONDARY ACTION
// ============================================================================

function SecondaryAction({ onPress, label = 'Other amount' }) {
  return (
    <TouchableOpacity
      style={styles.secondaryAction}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
    >
      <Text style={styles.secondaryActionText}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={HYDRATION_BASE.text.secondary} />
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HydrationInsightsCardV2({
  // Progress data
  currentIntake = 0,
  dailyGoal = 2.0,

  // Cold start
  coldStartStage = 'established',
  daysWithData = 7,

  // Prediction (established users)
  prediction = null,

  // Callbacks
  onQuickAdd,
  onOpenBeveragePicker,
  onExplainPrediction,
  onOpenTracker,

  // Loading state
  isLoading = false,
}) {
  const progress = dailyGoal > 0 ? (currentIntake / dailyGoal) * 100 : 0;

  // Determine if user is in cold start
  const isColdStart = ['day0', 'days1-3', 'days4-7'].includes(coldStartStage);
  const showPrediction = !isColdStart && prediction?.hasPrediction;

  // Ring sizing based on context
  const ringConfig = HYDRATION_PROGRESS_RING.dashboard;

  const handleQuickAdd = useCallback(async (amountLiters) => {
    if (onQuickAdd) {
      await onQuickAdd(amountLiters, 'water');
    }
  }, [onQuickAdd]);

  return (
    <View style={styles.container}>
      {/* Progress Ring Section */}
      <View style={styles.progressSection}>
        <PremiumProgressRing
          progress={progress}
          size={ringConfig.size}
          strokeWidth={ringConfig.strokeWidth}
        />

        {/* Goal subtitle */}
        <Text style={styles.progressSubtitle}>
          {(currentIntake * 1000).toFixed(0)} of {(dailyGoal * 1000).toFixed(0)}ml today
        </Text>
      </View>

      {/* Cold Start or Prediction */}
      {isColdStart ? (
        <ColdStartProgress stage={coldStartStage} daysWithData={daysWithData} />
      ) : showPrediction ? (
        <PredictionCard
          prediction={prediction}
          onExplain={onExplainPrediction}
        />
      ) : null}

      {/* Actions Section */}
      <View style={styles.actionsSection}>
        <PrimaryAddButton
          onPress={handleQuickAdd}
          isLoading={isLoading}
          defaultAmount={DEFAULT_QUICK_ADD_ML}
        />

        <SecondaryAction
          onPress={onOpenBeveragePicker}
          label="Other amount"
        />
      </View>
    </View>
  );
}

// ============================================================================
// STYLES - Calm Luxury Theme
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: HYDRATION_BASE.surfaceElevated,
    borderRadius: HYDRATION_EFFECTS.radius.xl,
    padding: HYDRATION_SPACING.lg,
    ...HYDRATION_EFFECTS.shadow.lg,
  },

  // Progress Section
  progressSection: {
    alignItems: 'center',
    marginBottom: HYDRATION_SPACING.lg,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercentage: {
    fontSize: 34,
    fontWeight: HYDRATION_TYPOGRAPHY.weight.semibold,
    color: HYDRATION_BASE.text.primary,
    letterSpacing: -1,
  },
  progressSubtitle: {
    fontSize: HYDRATION_TYPOGRAPHY.size.bodySmall,
    color: HYDRATION_BASE.text.secondary,
    marginTop: HYDRATION_SPACING.md,
    fontWeight: HYDRATION_TYPOGRAPHY.weight.regular,
  },

  // Cold Start
  coldStartContainer: {
    backgroundColor: HYDRATION_BASE.surface,
    borderRadius: HYDRATION_EFFECTS.radius.lg,
    padding: HYDRATION_SPACING.md,
    marginBottom: HYDRATION_SPACING.lg,
  },
  coldStartTitle: {
    fontSize: HYDRATION_TYPOGRAPHY.size.body,
    fontWeight: HYDRATION_TYPOGRAPHY.weight.medium,
    color: HYDRATION_BASE.text.primary,
    marginBottom: HYDRATION_SPACING.sm,
  },
  coldStartProgressTrack: {
    height: 4,
    backgroundColor: HYDRATION_PROGRESS_RING.trackColor,
    borderRadius: HYDRATION_EFFECTS.radius.full,
    marginBottom: HYDRATION_SPACING.sm,
    overflow: 'hidden',
  },
  coldStartProgressFill: {
    height: '100%',
    backgroundColor: HYDRATION_ACCENT.primary,
    borderRadius: HYDRATION_EFFECTS.radius.full,
  },
  coldStartDays: {
    fontSize: HYDRATION_TYPOGRAPHY.size.caption,
    color: HYDRATION_BASE.text.tertiary,
    fontWeight: HYDRATION_TYPOGRAPHY.weight.medium,
    marginBottom: HYDRATION_SPACING.xs,
  },
  coldStartBody: {
    fontSize: HYDRATION_TYPOGRAPHY.size.bodySmall,
    color: HYDRATION_BASE.text.secondary,
    lineHeight: HYDRATION_TYPOGRAPHY.size.bodySmall * HYDRATION_TYPOGRAPHY.lineHeight.relaxed,
  },

  // Prediction Card
  predictionCard: {
    backgroundColor: '#F8FAFC', // Slate 50 - cool tint for differentiation
    borderRadius: HYDRATION_EFFECTS.radius.lg,
    padding: HYDRATION_SPACING.md,
    marginBottom: HYDRATION_SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: HYDRATION_PREDICTION.primary,
  },
  predictionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HYDRATION_SPACING.xs,
    marginBottom: HYDRATION_SPACING.xs,
  },
  predictionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: HYDRATION_PREDICTION.primary,
  },
  predictionLabel: {
    fontSize: HYDRATION_TYPOGRAPHY.size.caption,
    color: HYDRATION_PREDICTION.primary,
    fontWeight: HYDRATION_TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  predictionValue: {
    fontSize: HYDRATION_TYPOGRAPHY.size.body,
    fontWeight: HYDRATION_TYPOGRAPHY.weight.medium,
    color: HYDRATION_BASE.text.primary,
    marginBottom: HYDRATION_SPACING.xs,
  },
  predictionContext: {
    fontSize: HYDRATION_TYPOGRAPHY.size.caption,
    color: HYDRATION_BASE.text.tertiary,
    marginBottom: HYDRATION_SPACING.sm,
  },
  predictionExplain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HYDRATION_SPACING.xs,
    alignSelf: 'flex-end',
  },
  predictionExplainText: {
    fontSize: HYDRATION_TYPOGRAPHY.size.caption,
    color: HYDRATION_PREDICTION.primary,
    fontWeight: HYDRATION_TYPOGRAPHY.weight.medium,
  },

  // Actions
  actionsSection: {
    alignItems: 'center',
  },
  primaryButtonTouchable: {
    width: '100%',
  },
  primaryButton: {
    height: 52,
    borderRadius: HYDRATION_EFFECTS.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: HYDRATION_SPACING.sm,
    ...HYDRATION_EFFECTS.shadow.md,
  },
  primaryButtonText: {
    fontSize: HYDRATION_TYPOGRAPHY.size.body,
    fontWeight: HYDRATION_TYPOGRAPHY.weight.semibold,
    color: HYDRATION_BASE.text.inverse,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HYDRATION_SPACING.xs,
    marginTop: HYDRATION_SPACING.md,
    paddingVertical: HYDRATION_SPACING.sm,
  },
  secondaryActionText: {
    fontSize: HYDRATION_TYPOGRAPHY.size.bodySmall,
    color: HYDRATION_BASE.text.secondary,
    fontWeight: HYDRATION_TYPOGRAPHY.weight.medium,
  },
});
