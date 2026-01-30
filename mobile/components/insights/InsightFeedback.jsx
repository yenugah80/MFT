/**
 * InsightFeedback - Unified feedback component for insights
 *
 * Design Principles:
 * - Non-intrusive feedback collection
 * - Animated transitions
 * - Dismissible with reason tracking
 * - Accessible (WCAG 2.1 AA)
 *
 * Research Backing (JMIR 2024):
 * - Reinforcement theme: Feedback mechanisms increase engagement
 * - Personalization: User feedback improves recommendation quality
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SEMANTIC,
} from '../../constants/premiumTheme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Dismiss reasons
const DISMISS_REASONS = [
  { id: 'not_relevant', label: 'Not relevant', icon: 'close-circle-outline' },
  { id: 'already_know', label: 'Already knew this', icon: 'checkmark-circle-outline' },
  { id: 'not_accurate', label: 'Not accurate', icon: 'alert-circle-outline' },
  { id: 'too_frequent', label: 'Too many insights', icon: 'notifications-off-outline' },
];

export default function InsightFeedback({
  insightId,
  insightType,
  onFeedback,
  onDismiss,
  initialState = 'idle', // 'idle' | 'expanded' | 'submitted' | 'dismissed'
  showDismiss = true,
  compact = false,
  style,
}) {
  const [state, setState] = useState(initialState);
  const [showReasons, setShowReasons] = useState(false);
  const animatedOpacity = useRef(new Animated.Value(1)).current;
  const animatedScale = useRef(new Animated.Value(1)).current;

  const handleHelpful = useCallback(async (wasHelpful) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate feedback
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setState('submitted');

    if (onFeedback) {
      await onFeedback({
        insightId,
        insightType,
        wasHelpful,
        timestamp: new Date().toISOString(),
      });
    }
  }, [insightId, insightType, onFeedback]);

  const handleDismiss = useCallback(async (reason) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setState('dismissed');

    if (onDismiss) {
      await onDismiss({
        insightId,
        insightType,
        dismissReason: reason,
        timestamp: new Date().toISOString(),
      });
    }
  }, [insightId, insightType, onDismiss]);

  const toggleReasons = useCallback(() => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowReasons(!showReasons);
  }, [showReasons]);

  // Submitted state
  if (state === 'submitted') {
    return (
      <Animated.View
        style={[
          styles.container,
          styles.submittedContainer,
          { opacity: animatedOpacity, transform: [{ scale: animatedScale }] },
          style,
        ]}
      >
        <Ionicons name="checkmark-circle" size={16} color={SEMANTIC.success.base} />
        <Text style={styles.submittedText}>Thanks for your feedback!</Text>
      </Animated.View>
    );
  }

  // Dismissed state
  if (state === 'dismissed') {
    return null;
  }

  // Compact version
  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          { opacity: animatedOpacity, transform: [{ scale: animatedScale }] },
          style,
        ]}
      >
        <TouchableOpacity
          onPress={() => handleHelpful(true)}
          style={styles.compactButton}
          accessibilityLabel="This insight was helpful"
          accessibilityRole="button"
        >
          <Ionicons name="thumbs-up-outline" size={16} color={TEXT.tertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleHelpful(false)}
          style={styles.compactButton}
          accessibilityLabel="This insight was not helpful"
          accessibilityRole="button"
        >
          <Ionicons name="thumbs-down-outline" size={16} color={TEXT.tertiary} />
        </TouchableOpacity>
        {showDismiss && (
          <TouchableOpacity
            onPress={toggleReasons}
            style={styles.compactButton}
            accessibilityLabel="Dismiss this insight"
            accessibilityRole="button"
          >
            <Ionicons name="close-outline" size={18} color={TEXT.tertiary} />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

  // Full version
  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: animatedOpacity, transform: [{ scale: animatedScale }] },
        style,
      ]}
    >
      {/* Main feedback row */}
      <View style={styles.feedbackRow}>
        <Text style={styles.promptText}>Was this helpful?</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            onPress={() => handleHelpful(true)}
            style={[styles.feedbackButton, styles.helpfulButton]}
            accessibilityLabel="Yes, this was helpful"
            accessibilityRole="button"
          >
            <Ionicons name="thumbs-up" size={16} color={SEMANTIC.success.base} />
            <Text style={[styles.buttonText, { color: SEMANTIC.success.base }]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleHelpful(false)}
            style={[styles.feedbackButton, styles.notHelpfulButton]}
            accessibilityLabel="No, this was not helpful"
            accessibilityRole="button"
          >
            <Ionicons name="thumbs-down" size={16} color={SEMANTIC.danger.base} />
            <Text style={[styles.buttonText, { color: SEMANTIC.danger.base }]}>No</Text>
          </TouchableOpacity>
        </View>

        {showDismiss && (
          <TouchableOpacity
            onPress={toggleReasons}
            style={styles.dismissToggle}
            accessibilityLabel="Show dismiss options"
            accessibilityRole="button"
          >
            <Ionicons
              name={showReasons ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={TEXT.tertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Dismiss reasons */}
      {showReasons && (
        <View style={styles.reasonsContainer}>
          <Text style={styles.reasonsTitle}>Why are you dismissing this?</Text>
          <View style={styles.reasonsGrid}>
            {DISMISS_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                onPress={() => handleDismiss(reason.id)}
                style={styles.reasonButton}
                accessibilityLabel={`Dismiss because: ${reason.label}`}
                accessibilityRole="button"
              >
                <Ionicons name={reason.icon} size={18} color={TEXT.secondary} />
                <Text style={styles.reasonText}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Inline feedback dots (minimalist version)
 */
export function InlineFeedback({
  onHelpful,
  onNotHelpful,
  size = 'sm',
  style,
}) {
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = useCallback((wasHelpful) => {
    Haptics.selectionAsync();
    setSubmitted(true);
    if (wasHelpful) {
      onHelpful?.();
    } else {
      onNotHelpful?.();
    }
  }, [onHelpful, onNotHelpful]);

  if (submitted) {
    return (
      <View style={[styles.inlineContainer, style]}>
        <Ionicons name="checkmark" size={14} color={SEMANTIC.success.base} />
      </View>
    );
  }

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <View style={[styles.inlineContainer, style]}>
      <TouchableOpacity
        onPress={() => handleFeedback(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Helpful"
      >
        <Ionicons name="thumbs-up-outline" size={iconSize} color={TEXT.tertiary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleFeedback(false)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Not helpful"
      >
        <Ionicons name="thumbs-down-outline" size={iconSize} color={TEXT.tertiary} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Star rating feedback
 */
export function StarRating({
  maxStars = 5,
  initialRating = 0,
  onRate,
  size = 24,
  style,
}) {
  const [rating, setRating] = useState(initialRating);
  const [submitted, setSubmitted] = useState(false);

  const handleRate = useCallback((stars) => {
    Haptics.selectionAsync();
    setRating(stars);
    setSubmitted(true);
    onRate?.(stars);
  }, [onRate]);

  return (
    <View style={[styles.starContainer, style]}>
      {Array.from({ length: maxStars }, (_, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => !submitted && handleRate(i + 1)}
          disabled={submitted}
          accessibilityLabel={`Rate ${i + 1} stars`}
        >
          <Ionicons
            name={i < rating ? 'star' : 'star-outline'}
            size={size}
            color={i < rating ? '#FBBF24' : TEXT.muted}
          />
        </TouchableOpacity>
      ))}
      {submitted && (
        <Text style={styles.starThanks}>Thanks!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    marginTop: SPACING[3],
  },
  submittedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
  },
  submittedText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.success.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promptText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.sm,
    gap: SPACING[1],
  },
  helpfulButton: {
    backgroundColor: `${SEMANTIC.success.base}15`,
  },
  notHelpfulButton: {
    backgroundColor: `${SEMANTIC.danger.base}15`,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  dismissToggle: {
    marginLeft: SPACING[2],
    padding: SPACING[1],
  },
  reasonsContainer: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  reasonsTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  reasonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    gap: SPACING[2],
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  reasonText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },

  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  compactButton: {
    padding: SPACING[1],
  },

  // Inline styles
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },

  // Star rating styles
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  starThanks: {
    marginLeft: SPACING[2],
    fontSize: TYPOGRAPHY.size.xs,
    color: SEMANTIC.success.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
});
