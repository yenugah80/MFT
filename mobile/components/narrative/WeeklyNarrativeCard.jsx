/**
 * WeeklyNarrativeCard - Your Week in Review
 *
 * Premium feature: A personalized story about the user's week
 * - Narrative paragraph about their health journey
 * - Key metrics at a glance
 * - Focus areas for next week
 *
 * Design Philosophy:
 * - Story-first: Read like a health coach's weekly check-in
 * - Data-backed: Every insight tied to real patterns
 * - Actionable: Clear focus areas, not just reflection
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// METRIC CHIP
// ============================================================================

function MetricChip({ icon, label, value, trend, color }) {
  const trendIcon = trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : null;
  const trendColor = trend === 'up'
    ? PREMIUM_COLORS.semantic.success.primary
    : trend === 'down'
      ? PREMIUM_COLORS.semantic.error.primary
      : PREMIUM_COLORS.text.tertiary;

  return (
    <View style={styles.metricChip}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={styles.metricValueRow}>
          <Text style={styles.metricValue}>{value}</Text>
          {trendIcon && (
            <Ionicons name={trendIcon} size={12} color={trendColor} style={styles.trendIcon} />
          )}
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// FOCUS AREA ITEM
// ============================================================================

function FocusAreaItem({ number, text, priority }) {
  const priorityColors = {
    high: PREMIUM_COLORS.brand.primary,
    medium: PREMIUM_COLORS.functional.insights.primary,
    low: PREMIUM_COLORS.text.tertiary,
  };

  const color = priorityColors[priority] || priorityColors.medium;

  return (
    <View style={styles.focusItem}>
      <View style={[styles.focusNumber, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.focusNumberText, { color }]}>{number}</Text>
      </View>
      <Text style={styles.focusText}>{text}</Text>
    </View>
  );
}

// ============================================================================
// NUTRI-SCORE BADGE
// ============================================================================

function NutriScoreBadge({ current, previous }) {
  const grades = ['A', 'B', 'C', 'D', 'E'];
  const colors = {
    A: '#038141',
    B: '#85BB2F',
    C: '#FECB02',
    D: '#EE8100',
    E: '#E63E11',
  };

  const improved = grades.indexOf(current) < grades.indexOf(previous);
  const declined = grades.indexOf(current) > grades.indexOf(previous);

  return (
    <View style={styles.nutriScoreContainer}>
      <View style={[styles.nutriScoreBadge, { backgroundColor: colors[current] }]}>
        <Text style={styles.nutriScoreText}>{current}</Text>
      </View>
      {previous && previous !== current && (
        <View style={styles.nutriScoreChange}>
          <Text style={styles.nutriScorePrevious}>was {previous}</Text>
          {improved && (
            <Ionicons name="arrow-up" size={12} color={PREMIUM_COLORS.semantic.success.primary} />
          )}
          {declined && (
            <Ionicons name="arrow-down" size={12} color={PREMIUM_COLORS.semantic.error.primary} />
          )}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WeeklyNarrativeCard({
  // Date range
  weekRange = 'This Week',
  dateLabel,
  // The story narrative
  narrative,
  // Highlights (bullet points)
  highlights = [],
  // Metrics summary
  metrics = {
    mealsLogged: { value: '0/21', trend: null },
    nutriScore: { current: 'C', previous: null },
    waterGoalDays: { value: '0/7', trend: null },
    moodAverage: { value: '0/10', trend: null },
  },
  // Focus areas for next week
  focusAreas = [],
  // Callbacks
  onFullReport,
  onShareProgress,
  // Style
  style,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggleExpanded} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="book" size={18} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerLabel}>YOUR WEEK IN REVIEW</Text>
            <Text style={styles.headerDate}>{dateLabel || weekRange}</Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={PREMIUM_COLORS.text.tertiary}
        />
      </TouchableOpacity>

      {/* Collapsed Preview: Key Metrics */}
      {!isExpanded && (
        <View style={styles.previewMetrics}>
          <View style={styles.previewMetricRow}>
            <NutriScoreBadge
              current={metrics.nutriScore?.current || 'C'}
              previous={metrics.nutriScore?.previous}
            />
            <View style={styles.previewDivider} />
            <View style={styles.previewStat}>
              <Text style={styles.previewStatValue}>{metrics.waterGoalDays?.value || '0/7'}</Text>
              <Text style={styles.previewStatLabel}>Water days</Text>
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewStat}>
              <Text style={styles.previewStatValue}>{metrics.moodAverage?.value || '7.0'}</Text>
              <Text style={styles.previewStatLabel}>Mood avg</Text>
            </View>
          </View>
          <Text style={styles.tapToExpand}>Tap to read your weekly story</Text>
        </View>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* The Story */}
          <View style={styles.storySection}>
            <View style={styles.storySectionHeader}>
              <Ionicons name="document-text" size={16} color={PREMIUM_COLORS.brand.primary} />
              <Text style={styles.storySectionTitle}>THE STORY</Text>
            </View>
            <Text style={styles.narrativeText}>{narrative}</Text>
          </View>

          {/* Highlights */}
          {highlights.length > 0 && (
            <View style={styles.highlightsSection}>
              {highlights.map((highlight, index) => (
                <View key={index} style={styles.highlightItem}>
                  <Ionicons name="sparkles" size={14} color={PREMIUM_COLORS.functional.progress.primary} />
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>
          )}

          {/* By the Numbers */}
          <View style={styles.metricsSection}>
            <Text style={styles.metricsSectionTitle}>BY THE NUMBERS</Text>
            <View style={styles.metricsGrid}>
              <MetricChip
                icon="restaurant"
                label="Meals logged"
                value={metrics.mealsLogged?.value || '18/21'}
                trend={metrics.mealsLogged?.trend}
                color={PREMIUM_COLORS.functional.nutrition.primary}
              />
              <MetricChip
                icon="water"
                label="Water goal days"
                value={metrics.waterGoalDays?.value || '5/7'}
                trend={metrics.waterGoalDays?.trend}
                color={PREMIUM_COLORS.functional.hydration.primary}
              />
              <MetricChip
                icon="happy"
                label="Mood average"
                value={metrics.moodAverage?.value || '7.2/10'}
                trend={metrics.moodAverage?.trend}
                color={PREMIUM_COLORS.functional.mood.primary}
              />
              <View style={styles.nutriScoreMetric}>
                <Text style={styles.nutriScoreMetricLabel}>Avg Nutri-Score</Text>
                <NutriScoreBadge
                  current={metrics.nutriScore?.current || 'B'}
                  previous={metrics.nutriScore?.previous}
                />
              </View>
            </View>
          </View>

          {/* Focus for Next Week */}
          {focusAreas.length > 0 && (
            <View style={styles.focusSection}>
              <View style={styles.focusSectionHeader}>
                <Ionicons name="flag" size={16} color={PREMIUM_COLORS.brand.primary} />
                <Text style={styles.focusSectionTitle}>FOCUS FOR NEXT WEEK</Text>
              </View>
              <Text style={styles.focusSubtitle}>Based on your patterns, prioritize:</Text>
              {focusAreas.map((area, index) => (
                <FocusAreaItem
                  key={index}
                  number={index + 1}
                  text={area.text || area}
                  priority={area.priority || 'medium'}
                />
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {onFullReport && (
              <TouchableOpacity style={styles.actionButton} onPress={onFullReport}>
                <Ionicons name="document-text-outline" size={18} color={PREMIUM_COLORS.brand.primary} />
                <Text style={styles.actionButtonText}>Full Report</Text>
              </TouchableOpacity>
            )}
            {onShareProgress && (
              <TouchableOpacity style={styles.actionButton} onPress={onShareProgress}>
                <Ionicons name="share-outline" size={18} color={PREMIUM_COLORS.brand.primary} />
                <Text style={styles.actionButtonText}>Share Progress</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: SPACING[3],
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  headerDate: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: PREMIUM_COLORS.text.primary,
    marginTop: 2,
  },

  // Preview (collapsed)
  previewMetrics: {
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
  },
  previewMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  previewDivider: {
    width: 1,
    height: 32,
    backgroundColor: PREMIUM_COLORS.border.light,
  },
  previewStat: {
    alignItems: 'center',
  },
  previewStatValue: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: PREMIUM_COLORS.text.primary,
  },
  previewStatLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
    marginTop: 2,
  },
  tapToExpand: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
    textAlign: 'center',
    marginTop: SPACING[3],
  },

  // Nutri-Score Badge
  nutriScoreContainer: {
    alignItems: 'center',
  },
  nutriScoreBadge: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriScoreText: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  nutriScoreChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  nutriScorePrevious: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
  },

  // Expanded Content
  expandedContent: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
  },

  // Story Section
  storySection: {
    marginBottom: SPACING[4],
  },
  storySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  storySectionTitle: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.muted,
    letterSpacing: 0.5,
  },
  narrativeText: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.body * 1.6,
  },

  // Highlights
  highlightsSection: {
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[4],
    gap: SPACING[2],
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
  },
  highlightText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.subhead * 1.4,
  },

  // Metrics Section
  metricsSection: {
    marginBottom: SPACING[4],
  },
  metricsSectionTitle: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.muted,
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[2.5],
    flex: 1,
    minWidth: '45%',
    gap: SPACING[2],
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
  },
  trendIcon: {
    marginLeft: 4,
  },
  nutriScoreMetric: {
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[2.5],
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriScoreMetricLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
    marginBottom: SPACING[1],
  },

  // Focus Section
  focusSection: {
    backgroundColor: `${PREMIUM_COLORS.brand.primary}08`,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[4],
  },
  focusSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[1],
  },
  focusSectionTitle: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.brand.primary,
    letterSpacing: 0.5,
  },
  focusSubtitle: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.tertiary,
    marginBottom: SPACING[3],
  },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  focusNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusNumberText: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  focusText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2.5],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: PREMIUM_COLORS.brand.primary,
  },
});
