/**
 * RecommendationCard - Netflix/LinkedIn-style recommendation component
 *
 * Displays personalized recommendations with:
 * - Type-specific styling (action, insight, suggestion, pattern)
 * - Evidence anchoring
 * - Progress metrics
 * - Actionable CTAs
 * - Action tracking (shown, clicked, completed, dismissed)
 * - Satisfaction feedback collection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  VIBRANT_WELLNESS,
  BRAND,
} from '../../constants/premiumTheme';

// Type-specific styling
const TYPE_STYLES = {
  action: {
    gradient: ['#3B82F6', '#1D4ED8'],
    icon: 'arrow-forward-circle',
    label: 'Action',
    bgColor: '#3B82F615',
    borderColor: '#3B82F630',
  },
  insight: {
    gradient: ['#8B5CF6', '#6D28D9'],
    icon: 'bulb',
    label: 'Insight',
    bgColor: '#8B5CF615',
    borderColor: '#8B5CF630',
  },
  suggestion: {
    gradient: ['#10B981', '#047857'],
    icon: 'sparkles',
    label: 'Suggestion',
    bgColor: '#10B98115',
    borderColor: '#10B98130',
  },
  pattern: {
    gradient: ['#F59E0B', '#D97706'],
    icon: 'git-network',
    label: 'Pattern',
    bgColor: '#F59E0B15',
    borderColor: '#F59E0B30',
  },
};

// Domain-specific icons
const DOMAIN_ICONS = {
  nutrition: 'nutrition',
  mood: 'happy',
  hydration: 'water',
  activity: 'fitness',
  wellness: 'heart',
};

export default function RecommendationCard({
  recommendation,
  onAction,
  onComplete,
  onDismiss,
  onTrackShown,
  onRecordSatisfaction,
  compact = false,
  showEvidence = true,
  showActions = true,
}) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [trackingId, setTrackingId] = useState(null);

  if (!recommendation) return null;

  const {
    id,
    type = 'insight',
    domain,
    title,
    message,
    icon,
    color,
    metric,
    evidence,
    action,
    correlation,
    microActions = [],
    predictionLink,
  } = recommendation;

  const typeStyle = TYPE_STYLES[type] || TYPE_STYLES.insight;
  const iconName = icon || typeStyle.icon;
  const iconColor = color || typeStyle.gradient[0];

  // Track when card is shown (on mount)
  useEffect(() => {
    if (onTrackShown && id) {
      onTrackShown(id);
    }
  }, [id, onTrackShown]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (microActions.length > 0) {
      setIsExpanded(!isExpanded);
    } else if (action?.type === 'navigate' && action.target) {
      router.push(`/(tabs)/${action.target}`);
    } else if (onAction) {
      onAction(recommendation);
    }
  }, [microActions, isExpanded, action, router, onAction, recommendation]);

  const handleStepComplete = useCallback((stepIndex) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newCompleted = [...completedSteps, stepIndex];
    setCompletedSteps(newCompleted);

    // Check if all steps completed
    if (newCompleted.length >= microActions.length) {
      handleActionComplete();
    }
  }, [completedSteps, microActions.length]);

  const handleActionComplete = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (onComplete) {
      const result = await onComplete(id, { recommendation });
      if (result?.trackingId) {
        setTrackingId(result.trackingId);
      }
    }

    // Show satisfaction prompt after short delay
    setTimeout(() => {
      showSatisfactionPrompt();
    }, 1500);
  }, [id, onComplete, recommendation]);

  const showSatisfactionPrompt = useCallback(() => {
    Alert.alert(
      'How helpful was this?',
      title,
      [
        {
          text: 'Not helpful',
          onPress: () => recordSatisfaction(false, 2),
          style: 'destructive',
        },
        {
          text: 'Somewhat',
          onPress: () => recordSatisfaction(true, 3),
        },
        {
          text: 'Very helpful!',
          onPress: () => recordSatisfaction(true, 5),
        },
      ],
      { cancelable: true }
    );
  }, [title, recordSatisfaction]);

  const recordSatisfaction = useCallback(async (helpful, rating) => {
    console.log(`[RecommendationCard] Recording satisfaction: helpful=${helpful}, rating=${rating}, trackingId=${trackingId}`);

    // Call the parent's satisfaction handler with trackingId and satisfaction data
    if (onRecordSatisfaction && trackingId) {
      try {
        await onRecordSatisfaction(trackingId, { helpful, rating });
        console.log(`[RecommendationCard] Satisfaction recorded successfully`);
      } catch (error) {
        console.error(`[RecommendationCard] Failed to record satisfaction:`, error);
      }
    } else if (!trackingId) {
      console.warn(`[RecommendationCard] No trackingId available for satisfaction recording`);
    }
  }, [trackingId, onRecordSatisfaction]);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onDismiss) {
      onDismiss(id, { recommendation });
    }
  }, [id, onDismiss, recommendation]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: typeStyle.bgColor, borderColor: typeStyle.borderColor },
        compact && styles.containerCompact,
        pressed && styles.containerPressed,
      ]}
      onPress={handlePress}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={iconName} size={compact ? 18 : 22} color={iconColor} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={compact ? 1 : 2}>
              {title}
            </Text>
            {type === 'pattern' && metric?.confidence && (
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>{metric.confidence}%</Text>
              </View>
            )}
          </View>
          {!compact && (
            <View style={styles.typeBadge}>
              <Text style={[styles.typeText, { color: iconColor }]}>{typeStyle.label}</Text>
            </View>
          )}
        </View>
        {action && (
          <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
        )}
      </View>

      {/* Message */}
      <Text style={[styles.message, compact && styles.messageCompact]} numberOfLines={compact ? 2 : 4}>
        {message}
      </Text>

      {/* Metric Display */}
      {metric && !compact && (
        <View style={styles.metricContainer}>
          {metric.percentage !== undefined && (
            <View style={styles.progressWrapper}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(metric.percentage, 100)}%`,
                      backgroundColor: iconColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {metric.current !== undefined && metric.goal !== undefined
                  ? `${formatNumber(metric.current)}${metric.unit ? ` ${metric.unit}` : ''} / ${formatNumber(metric.goal)}${metric.unit ? ` ${metric.unit}` : ''}`
                  : `${metric.percentage}%`}
              </Text>
            </View>
          )}
          {metric.average !== undefined && (
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Average</Text>
              <Text style={styles.metricValue}>{metric.average}{metric.unit ? ` ${metric.unit}` : ''}</Text>
            </View>
          )}
          {metric.trend && (
            <View style={styles.trendIndicator}>
              <Ionicons
                name={metric.trend === 'up' ? 'trending-up' : metric.trend === 'down' ? 'trending-down' : 'remove'}
                size={14}
                color={metric.trend === 'up' ? '#10B981' : metric.trend === 'down' ? '#EF4444' : TEXT.tertiary}
              />
              <Text style={[styles.trendText, { color: metric.trend === 'up' ? '#10B981' : metric.trend === 'down' ? '#EF4444' : TEXT.tertiary }]}>
                {metric.trend === 'up' ? 'Improving' : metric.trend === 'down' ? 'Declining' : 'Stable'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Evidence Display */}
      {showEvidence && evidence && !compact && (
        <View style={styles.evidenceContainer}>
          {evidence.type === 'correlation' && evidence.examples?.length > 0 && (
            <View style={styles.evidenceExamples}>
              <Text style={styles.evidenceLabel}>Based on your data:</Text>
              {evidence.examples.slice(0, 2).map((ex, idx) => (
                <View key={idx} style={styles.evidenceItem}>
                  <Ionicons name="checkmark-circle" size={12} color={iconColor} />
                  <Text style={styles.evidenceText}>
                    {ex.date ? formatDateShort(ex.date) : ''}{ex.trigger ? `: ${ex.trigger}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {evidence.type === 'cross_domain' && (
            <View style={styles.crossDomainEvidence}>
              <Ionicons name="git-merge" size={14} color={iconColor} />
              <Text style={styles.evidenceText}>
                Analyzed {evidence.highWaterDays || evidence.activeDays || 0}+ days
              </Text>
            </View>
          )}
          {evidence.delta !== undefined && (
            <View style={styles.deltaEvidence}>
              <Text style={styles.deltaLabel}>Impact:</Text>
              <Text style={[styles.deltaValue, { color: evidence.delta > 0 ? '#10B981' : '#EF4444' }]}>
                {evidence.delta > 0 ? '+' : ''}{evidence.delta} points
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Pattern-specific: Comparison Stats */}
      {type === 'pattern' && metric?.moodWith !== undefined && metric?.moodWithout !== undefined && !compact && (
        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>With</Text>
            <Text style={[styles.comparisonValue, { color: '#10B981' }]}>{metric.moodWith}/10</Text>
          </View>
          <View style={styles.comparisonDivider} />
          <View style={styles.comparisonItem}>
            <Text style={styles.comparisonLabel}>Without</Text>
            <Text style={[styles.comparisonValue, { color: TEXT.tertiary }]}>{metric.moodWithout}/10</Text>
          </View>
        </View>
      )}

      {/* Prediction Link Badge - Shows when recommendation addresses a predicted risk */}
      {predictionLink && !compact && (
        <View style={styles.predictionBadge}>
          <Ionicons name="flash" size={12} color="#F59E0B" />
          <Text style={styles.predictionBadgeText}>{predictionLink.message}</Text>
        </View>
      )}

      {/* Micro Actions - Expandable steps for completing the recommendation */}
      {isExpanded && microActions.length > 0 && !compact && (
        <View style={styles.microActionsContainer}>
          <Text style={styles.microActionsTitle}>Steps to complete:</Text>
          {microActions.map((step, index) => {
            const isCompleted = completedSteps.includes(index);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.microActionItem, isCompleted && styles.microActionItemCompleted]}
                onPress={() => !isCompleted && handleStepComplete(index)}
                disabled={isCompleted}
              >
                <View style={[styles.microActionCheck, isCompleted && { backgroundColor: iconColor }]}>
                  {isCompleted && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <Text style={[styles.microActionText, isCompleted && styles.microActionTextCompleted]}>
                  {step.label || step}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Action Buttons - Show when actions are enabled and not compact */}
      {showActions && type === 'action' && !compact && !isExpanded && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary, { backgroundColor: iconColor }]}
            onPress={handleActionComplete}
          >
            <Text style={styles.actionButtonTextPrimary}>Done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDismiss}
          >
            <Text style={styles.actionButtonText}>Later</Text>
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Compact recommendation row for list views
 */
export function RecommendationRow({ recommendation, onPress }) {
  if (!recommendation) return null;

  const { type = 'insight', title, message, icon, color } = recommendation;
  const typeStyle = TYPE_STYLES[type] || TYPE_STYLES.insight;
  const iconColor = color || typeStyle.gradient[0];

  return (
    <TouchableOpacity style={styles.rowContainer} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon || typeStyle.icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowMessage} numberOfLines={1}>{message}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={TEXT.muted} />
    </TouchableOpacity>
  );
}

/**
 * Section header for recommendation groups
 */
export function RecommendationSection({ title, subtitle, recommendations = [], onSeeAll }) {
  if (!recommendations.length) return null;

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
        {onSeeAll && recommendations.length > 2 && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={14} color={BRAND.primary} />
          </TouchableOpacity>
        )}
      </View>
      {recommendations.slice(0, 3).map((rec, idx) => (
        <RecommendationCard
          key={rec.id || idx}
          recommendation={rec}
          compact={idx > 0}
        />
      ))}
    </View>
  );
}

// Helper functions
function formatNumber(num) {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return Math.round(num);
}

function formatDateShort(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING[4],
    marginBottom: SPACING[3],
  },
  containerCompact: {
    padding: SPACING[3],
    marginBottom: SPACING[2],
  },
  containerPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING[2],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  titleCompact: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  typeBadge: {
    marginTop: SPACING[1],
  },
  typeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  confidenceBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[0.5],
    borderRadius: RADIUS.sm,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#F59E0B',
  },
  message: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
    marginBottom: SPACING[2],
  },
  messageCompact: {
    fontSize: TYPOGRAPHY.size.xs,
    lineHeight: 16,
    marginBottom: 0,
  },
  metricContainer: {
    marginTop: SPACING[2],
  },
  progressWrapper: {
    marginBottom: SPACING[2],
  },
  progressBar: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING[1],
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  progressText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'right',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[1],
  },
  trendText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  evidenceContainer: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  evidenceLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    marginBottom: SPACING[2],
  },
  evidenceExamples: {},
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[1],
  },
  evidenceText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  crossDomainEvidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  deltaEvidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  deltaLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  deltaValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  comparisonItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
  },
  comparisonDivider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.divider,
  },
  comparisonLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginBottom: SPACING[1],
  },
  comparisonValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  // Row styles
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING[2],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[0.5],
  },
  rowMessage: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  // Section styles
  sectionContainer: {
    marginBottom: SPACING[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[0.5],
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  // Prediction Link Badge styles
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: '#F59E0B15',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
    marginTop: SPACING[2],
    alignSelf: 'flex-start',
  },
  predictionBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#F59E0B',
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  // Micro Actions styles
  microActionsContainer: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  microActionsTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    marginBottom: SPACING[2],
  },
  microActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING[2],
  },
  microActionItemCompleted: {
    opacity: 0.6,
  },
  microActionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: SURFACES.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microActionText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    flex: 1,
  },
  microActionTextCompleted: {
    textDecorationLine: 'line-through',
    color: TEXT.tertiary,
  },
  // Action Buttons styles
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: SPACING[3],
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    alignItems: 'center',
    backgroundColor: SURFACES.background.secondary,
  },
  actionButtonPrimary: {
    flex: 2,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  actionButtonTextPrimary: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});
