/**
 * Recommendation5W2HCard - Story-First Recommendation Display
 *
 * Design Philosophy:
 * - 5W2H lives in logic and data, surfaces as context + rationale
 * - Feels like a "decision receipt", not a questionnaire
 * - Default view: Clear action + one-line summary (What + Why)
 * - Expanded: Full narrative + chips via ReasonCard
 * - The user sees "a clear explanation", not "7 fields"
 *
 * Layout Pattern:
 * ┌─────────────────────────────────────────────────────┐
 * │ [Type Icon]  Category         [Urgency badge]      │
 * │                                                    │
 * │ MAIN ACTION TITLE                                  │
 * │ Brief context (when/frequency)                     │
 * │                                                    │
 * │ ┌─────────────────────────────────────────────┐   │
 * │ │ "Why this?" ──────────── [Evidence badge]  │   │
 * │ │ Summary: What + Why fused into one line    │   │
 * │ │ [Tap to expand for narrative + chips]      │   │
 * │ └─────────────────────────────────────────────┘   │
 * │                                                    │
 * │ [✓ Mark as Done]        [Not Now]                 │
 * └─────────────────────────────────────────────────── │
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumDesignSystem';
import { usePressAnimation, SPRING } from '../../utils/animations';
import ReasonCard from './ReasonCard';

// ============================================================================
// TYPE CONFIGURATIONS
// ============================================================================

const TYPE_CONFIG = {
  food: {
    icon: 'nutrition',
    label: 'Nutrition',
    gradient: PREMIUM_COLORS.functional.nutrition.gradient,
    color: PREMIUM_COLORS.functional.nutrition.primary,
  },
  hydration: {
    icon: 'water',
    label: 'Hydration',
    gradient: PREMIUM_COLORS.functional.hydration.gradient,
    color: PREMIUM_COLORS.functional.hydration.primary,
  },
  mood: {
    icon: 'happy',
    label: 'Mood & Energy',
    gradient: PREMIUM_COLORS.functional.mood.gradient,
    color: PREMIUM_COLORS.functional.mood.primary,
  },
  activity: {
    icon: 'fitness',
    label: 'Activity',
    gradient: PREMIUM_COLORS.functional.activity.gradient,
    color: PREMIUM_COLORS.functional.activity.primary,
  },
  habit: {
    icon: 'repeat',
    label: 'Habit',
    gradient: PREMIUM_COLORS.functional.progress.gradient,
    color: PREMIUM_COLORS.functional.progress.primary,
  },
};

const URGENCY_CONFIG = {
  high: { color: PREMIUM_COLORS.semantic.error.primary, label: 'Act now', icon: 'flash' },
  medium: { color: PREMIUM_COLORS.semantic.warning.primary, label: 'Soon', icon: 'time' },
  low: { color: PREMIUM_COLORS.text.tertiary, label: 'When ready', icon: null },
};

// ============================================================================
// ACTION BUTTON
// ============================================================================

function ActionButton({ label, icon, variant = 'primary', onPress, disabled }) {
  const { scale, onPressIn, onPressOut } = usePressAnimation();
  const isPrimary = variant === 'primary';

  return (
    <Animated.View style={[styles.actionButtonContainer, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
          disabled && styles.actionButtonDisabled,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={isPrimary ? '#FFFFFF' : PREMIUM_COLORS.text.secondary}
          />
        )}
        <Text
          style={[
            styles.actionButtonText,
            isPrimary ? styles.actionButtonTextPrimary : styles.actionButtonTextSecondary,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================================
// STATUS INDICATOR
// ============================================================================

function StatusIndicator({ status }) {
  if (status === 'pending') return null;

  const config = {
    completed: { icon: 'checkmark-circle', color: PREMIUM_COLORS.semantic.success.primary, label: 'Done' },
    dismissed: { icon: 'close-circle', color: PREMIUM_COLORS.text.muted, label: 'Skipped' },
    snoozed: { icon: 'time', color: PREMIUM_COLORS.semantic.warning.primary, label: 'Later' },
  };

  const statusConfig = config[status];
  if (!statusConfig) return null;

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}15` }]}>
      <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
      <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Recommendation5W2HCard({
  recommendation,
  variant = 'full', // 'full' | 'compact'
  onComplete,
  onDismiss,
  onSnooze,
  onCopyReasoning,
  onPressDetails,
  style,
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const cardScale = useRef(new Animated.Value(1)).current;

  // Extract recommendation data
  const {
    id,
    who,
    what,
    when,
    where,
    why,
    how,
    howMuch,
    confidence,
    status = 'pending',
  } = recommendation;

  // Get type configuration
  const typeConfig = TYPE_CONFIG[what?.type] || TYPE_CONFIG.food;
  const urgencyConfig = URGENCY_CONFIG[when?.urgency] || URGENCY_CONFIG.low;

  // Build summary sentence (What + Why fused) - the "one clear explanation"
  const summary = useMemo(() => {
    const action = what?.action || 'Take action';
    const reason = why?.primaryReason || '';

    // Create a natural-sounding fused sentence
    if (reason) {
      // "Earlier, lighter dinners to improve your sleep comfort."
      // Not: "What: Eat earlier. Why: Sleep better."
      const cleanReason = reason.toLowerCase().replace(/^your /, '').replace(/\.$/, '');
      return `${action.replace(/\.$/, '')} to address ${cleanReason}.`;
    }
    return action;
  }, [what, why]);

  // Build narrative paragraph - the story, not the framework
  const narrative = useMemo(() => {
    const parts = [];

    // Lead with the observation/problem (Why)
    if (why?.primaryReason) {
      parts.push(why.primaryReason);
    }

    // Add the proposed solution (What + How)
    if (what?.action && how?.instructions?.[0]) {
      parts.push(`${what.action} ${how.instructions[0].toLowerCase()}`);
    } else if (what?.action) {
      parts.push(what.action);
    }

    // Add expected outcome (Health benefit)
    if (why?.healthBenefit) {
      parts.push(`This ${why.healthBenefit.toLowerCase()}.`);
    }

    return parts.join(' ');
  }, [what, why, how]);

  // Build chips content - short, user-friendly phrases (12-16 chars target)
  const chips = useMemo(() => ({
    what: what?.action ? truncateChip(what.action, 40) : null,
    why: why?.healthBenefit ? truncateChip(why.healthBenefit, 40) :
         why?.primaryReason ? truncateChip(why.primaryReason, 40) : null,
    who: who?.personalization ? truncateChip(who.personalization, 35) :
         `You (${who?.persona || 'personalized'})`,
    where: where?.context ? capitalizeFirst(where.context) :
           where?.preparation ? truncateChip(where.preparation, 35) : null,
    when: when?.specificTime || when?.timing ?
          truncateChip(when.specificTime || when.timing, 30) : null,
    how: how?.instructions?.[0] ? truncateChip(how.instructions[0], 40) :
         how?.difficulty ? `${capitalizeFirst(how.difficulty)} (${how.timeRequired})` : null,
    howMuch: howMuch?.quantity ? truncateChip(howMuch.quantity, 35) :
             howMuch?.nutritionImpact?.[0] ?
             `${howMuch.nutritionImpact[0].nutrient}: ${howMuch.nutritionImpact[0].percentDV}% DV` : null,
  }), [who, what, when, where, why, how, howMuch]);

  // Determine evidence type for badge
  const evidenceType = useMemo(() => {
    if (confidence?.source?.includes('USDA') || why?.scienceSource) {
      return 'evidenceBased';
    }
    if (confidence?.source?.includes('pattern') || why?.dataPoints?.length > 0) {
      return 'correlation';
    }
    return 'personalized';
  }, [confidence, why]);

  // Handle completion
  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(cardScale, { toValue: 1.02, duration: 100, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    onComplete?.(recommendation);
    setIsCompleting(false);
  }, [cardScale, recommendation, onComplete]);

  // Handle dismissal
  const handleDismiss = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.(recommendation);
  }, [recommendation, onDismiss]);

  // Handle pressing for details
  const handlePressDetails = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressDetails?.(recommendation);
  }, [recommendation, onPressDetails]);

  // Compact variant for lists - minimal, just the essence
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePressDetails}
        disabled={!onPressDetails}
      >
        <Animated.View style={[styles.compactContainer, { transform: [{ scale: cardScale }] }, style]}>
          <View style={styles.compactHeader}>
            <View style={[styles.typeIconSmall, { backgroundColor: `${typeConfig.color}15` }]}>
              <Ionicons name={typeConfig.icon} size={16} color={typeConfig.color} />
            </View>
            <View style={styles.compactContent}>
              <Text style={styles.compactAction} numberOfLines={2}>{what?.action}</Text>
              <Text style={styles.compactReason} numberOfLines={1}>{why?.primaryReason}</Text>
            </View>
            <StatusIndicator status={status} />
            {onPressDetails && (
              <Ionicons name="chevron-forward" size={18} color={PREMIUM_COLORS.text.muted} />
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Full variant - the complete story card
  return (
    <Animated.View style={[styles.container, { transform: [{ scale: cardScale }] }, style]}>
      {/* Gradient accent bar */}
      <LinearGradient
        colors={typeConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      {/* Header: Type & Status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.typeIcon, { backgroundColor: `${typeConfig.color}15` }]}>
            <Ionicons name={typeConfig.icon} size={18} color={typeConfig.color} />
          </View>
          <Text style={[styles.typeLabel, { color: typeConfig.color }]}>{typeConfig.label}</Text>
        </View>

        <View style={styles.headerRight}>
          {when?.urgency && when.urgency !== 'low' && urgencyConfig.icon && (
            <View style={[styles.urgencyBadge, { backgroundColor: `${urgencyConfig.color}15` }]}>
              <Ionicons name={urgencyConfig.icon} size={12} color={urgencyConfig.color} />
              <Text style={[styles.urgencyText, { color: urgencyConfig.color }]}>
                {urgencyConfig.label}
              </Text>
            </View>
          )}
          <StatusIndicator status={status} />
        </View>
      </View>

      {/* Main Action - The hero */}
      <View style={styles.mainContent}>
        <Text style={styles.actionTitle}>{what?.action}</Text>

        {/* Quick context line */}
        {(when?.specificTime || when?.frequency) && (
          <View style={styles.contextRow}>
            <Ionicons name="time-outline" size={14} color={PREMIUM_COLORS.text.tertiary} />
            <Text style={styles.contextText}>
              {when.specificTime}
              {when.frequency && when.specificTime && ' • '}
              {when.frequency}
            </Text>
          </View>
        )}
      </View>

      {/* Reason Card - Story-first 5W2H */}
      <ReasonCard
        summary={summary}
        narrative={narrative}
        chips={chips}
        evidenceType={evidenceType}
        confidence={confidence?.score}
        dataPoints={confidence?.dataPoints}
        source={confidence?.source || why?.scienceSource}
        style={styles.reasonCard}
        onCopyReasoning={onCopyReasoning}
      />

      {/* Action Buttons */}
      {status === 'pending' && (
        <View style={styles.actions}>
          <ActionButton
            label="Mark as Done"
            icon="checkmark-circle"
            variant="primary"
            onPress={handleComplete}
            disabled={isCompleting}
          />
          <ActionButton
            label="Not Now"
            icon="close-circle-outline"
            variant="secondary"
            onPress={handleDismiss}
          />
        </View>
      )}
    </Animated.View>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function truncateChip(text, maxLength) {
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// COMPACT EXPORT (for backward compatibility)
// ============================================================================

export function Recommendation5W2HCompact({ recommendation, onPress, style }) {
  return (
    <Recommendation5W2HCard
      recommendation={recommendation}
      variant="compact"
      onComplete={onPress}
      style={style}
    />
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[5],
    paddingTop: SPACING[4],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.md,
    overflow: 'hidden',
  },

  // Accent bar
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
    paddingTop: SPACING[1],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconSmall: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Urgency Badge
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  urgencyText: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Main Content
  mainContent: {
    marginBottom: SPACING[4],
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.text.primary,
    lineHeight: TYPOGRAPHY.size.title3 * 1.25,
    marginBottom: SPACING[2],
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1.5],
  },
  contextText: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Reason Card
  reasonCard: {
    marginBottom: SPACING[4],
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  actionButtonContainer: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
  },
  actionButtonPrimary: {
    backgroundColor: PREMIUM_COLORS.brand.primary,
  },
  actionButtonSecondary: {
    backgroundColor: PREMIUM_COLORS.surface.tertiary,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    color: PREMIUM_COLORS.text.secondary,
  },

  // Compact Variant
  compactContainer: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.sm,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  compactContent: {
    flex: 1,
  },
  compactAction: {
    fontSize: TYPOGRAPHY.size.body,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: 2,
  },
  compactReason: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
  },
});
