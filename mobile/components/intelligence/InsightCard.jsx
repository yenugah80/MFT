/**
 * InsightCard - Displays decision brain recommendations
 *
 * Shows:
 * - Headline with decision type indicator
 * - Explanation with factors
 * - Suggested actions
 * - Model health indicator
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  BRAND,
  SEMANTIC,
} from '../../constants/premiumTheme';
import { useInsightFeedback } from '../../hooks/useInsightFeedback';

/**
 * Simple inline feedback buttons
 */
function InlineFeedback({ onHelpful, onNotHelpful, size = 'sm' }) {
  const iconSize = size === 'sm' ? 18 : 22;
  return (
    <View style={inlineFeedbackStyles.container}>
      <TouchableOpacity
        style={inlineFeedbackStyles.button}
        onPress={onHelpful}
        activeOpacity={0.7}
      >
        <Ionicons name="thumbs-up-outline" size={iconSize} color={SEMANTIC.success.base} />
      </TouchableOpacity>
      <TouchableOpacity
        style={inlineFeedbackStyles.button}
        onPress={onNotHelpful}
        activeOpacity={0.7}
      >
        <Ionicons name="thumbs-down-outline" size={iconSize} color={TEXT.tertiary} />
      </TouchableOpacity>
    </View>
  );
}

const inlineFeedbackStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  button: {
    padding: SPACING[2],
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.tertiary,
  },
});

const DECISION_TYPES = {
  SPEAK: {
    icon: 'megaphone',
    label: 'New Discovery',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#A78BFA'],
    description: 'We found something interesting in your data',
  },
  REINFORCE: {
    icon: 'checkmark-circle',
    label: 'Keep It Up',
    color: '#10B981',
    gradient: ['#10B981', '#34D399'],
    description: 'Your healthy habit is working well',
  },
  PREDICT: {
    icon: 'bulb',
    label: 'Tip For You',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#FBBF24'],
    description: 'Based on what we know about you',
  },
  SILENT: {
    icon: 'checkmark-done',
    label: 'All Good',
    color: '#6B7280',
    gradient: ['#6B7280', '#9CA3AF'],
    description: 'Nothing to report right now',
  },
};

export default function InsightCard({
  recommendation,
  onAction,
  onDismiss,
  showFeedback = true,
}) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  if (!recommendation) return null;

  const {
    decision,
    headline,
    subtitle,
    actions = [],
    explanation,
    userContext,
    modelHealth,
  } = recommendation;

  const decisionType = decision?.type || 'SPEAK';
  const typeConfig = DECISION_TYPES[decisionType] || DECISION_TYPES.SPEAK;
  const shouldSpeak = decision?.shouldSpeak !== false;

  // Generate a unique ID for feedback tracking
  const insightId = recommendation.id || `${decisionType}-${Date.now()}`;

  // Use the feedback hook
  const { handleHelpful, isSubmitting } = useInsightFeedback(
    insightId,
    'recommendation'
  );

  // Don't render if SILENT and shouldn't speak
  if (decisionType === 'SILENT' && !shouldSpeak) {
    return null;
  }

  const handleAction = (action) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAction?.(action);
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.();
  };

  const handleFeedbackSubmit = async (wasHelpful) => {
    try {
      await handleHelpful(wasHelpful, headline);
      setFeedbackSubmitted(true);
    } catch (error) {
      console.warn('[InsightCard] Feedback error:', error.message);
    }
  };

  return (
    <View style={styles.card}>
      {/* Gradient header */}
      <LinearGradient
        colors={typeConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name={typeConfig.icon} size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.decisionLabel}>{typeConfig.label}</Text>
              <Text style={styles.decisionDescription}>{typeConfig.description}</Text>
            </View>
          </View>
          {decision?.confidence && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {Math.round(decision.confidence * 100)}%
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Main content */}
      <View style={styles.body}>
        {/* Headline */}
        <Text style={styles.headline}>{headline}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {/* Explanation */}
        {explanation && (
          <View style={styles.explanationContainer}>
            <Text style={styles.sectionTitle}>Why This Matters</Text>
            <Text style={styles.explanationText}>{explanation.summary}</Text>

            {explanation.factors && explanation.factors.length > 0 && (
              <View style={styles.factorsList}>
                {explanation.factors.slice(0, 3).map((factor, index) => (
                  <View key={index} style={styles.factorItem}>
                    <View style={styles.factorBullet} />
                    <Text style={styles.factorText}>{factor}</Text>
                  </View>
                ))}
              </View>
            )}

            {explanation.limitations && explanation.limitations.length > 0 && (
              <View style={styles.limitationsContainer}>
                <Ionicons name="information-circle" size={14} color={TEXT.tertiary} />
                <Text style={styles.limitationsText}>
                  {explanation.limitations[0]}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* User context / lifecycle stage */}
        {userContext && (
          <View style={styles.contextContainer}>
            <View style={styles.contextBadge}>
              <Ionicons name="person" size={14} color={BRAND.primary} />
              <Text style={styles.contextLabel}>Your Profile</Text>
            </View>
            <Text style={styles.contextDays}>
              {userContext.daysActive} days logged
            </Text>
          </View>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.actionButton,
                  index === 0 && styles.primaryAction,
                ]}
                onPress={() => handleAction(action)}
                activeOpacity={0.7}
              >
                {action.icon && (
                  <Ionicons
                    name={action.icon}
                    size={18}
                    color={index === 0 ? '#FFFFFF' : typeConfig.color}
                  />
                )}
                <Text style={[
                  styles.actionText,
                  index === 0 && styles.primaryActionText,
                ]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Feedback section */}
        {showFeedback && !feedbackSubmitted && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackPrompt}>Was this helpful?</Text>
            <InlineFeedback
              onHelpful={() => handleFeedbackSubmit(true)}
              onNotHelpful={() => handleFeedbackSubmit(false)}
              size="sm"
            />
          </View>
        )}

        {feedbackSubmitted && (
          <View style={styles.feedbackThanks}>
            <Ionicons name="checkmark-circle" size={14} color={SEMANTIC.success.base} />
            <Text style={styles.feedbackThanksText}>Thanks for your feedback!</Text>
          </View>
        )}
      </View>

      {/* Model health indicator */}
      {modelHealth && modelHealth.status !== 'healthy' && (
        <View style={styles.healthWarning}>
          <Ionicons name="alert-circle" size={14} color="#F59E0B" />
          <Text style={styles.healthText}>
            {modelHealth.status === 'drift_detected'
              ? 'Your patterns are changing - we\'re adapting'
              : 'Limited data - predictions may vary'}
          </Text>
        </View>
      )}

      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={TEXT.tertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    shadowColor: '#3D3633',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  header: {
    padding: SPACING[4],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  decisionDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  body: {
    padding: SPACING[4],
  },
  headline: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    marginTop: SPACING[2],
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  explanationContainer: {
    marginTop: SPACING[4],
    padding: SPACING[3],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
  },
  explanationText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    lineHeight: 20,
  },
  factorsList: {
    marginTop: SPACING[3],
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    paddingVertical: SPACING[1],
  },
  factorBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND.primary,
    marginTop: 6,
  },
  factorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    flex: 1,
    lineHeight: 18,
  },
  limitationsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  limitationsText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    flex: 1,
    fontStyle: 'italic',
  },
  contextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: `${BRAND.primary}15`,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  contextLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: BRAND.primary,
  },
  contextDays: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: SPACING[4],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.tertiary,
  },
  primaryAction: {
    backgroundColor: BRAND.primary,
  },
  actionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
  healthWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: '#FEF3C7',
  },
  healthText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#92400E',
    flex: 1,
  },
  dismissButton: {
    position: 'absolute',
    top: SPACING[3],
    right: SPACING[3],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  feedbackPrompt: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  feedbackThanks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  feedbackThanksText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.success.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
});
