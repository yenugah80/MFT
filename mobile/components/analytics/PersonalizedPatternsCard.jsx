/**
 * Personalized Patterns Card
 *
 * Displays deep behavioral patterns discovered from the correlation engine:
 * - "When you skip breakfast, your mood crashes around 3pm"
 * - "High-sugar dinners make you anxious the next morning"
 * - "On days you drink enough water, you're less irritable"
 * - "Morning workouts give you energy that lasts all day"
 *
 * These are temporal and cross-domain patterns that span multiple data types.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { TEXT, BRAND, SURFACES, SEMANTIC, SHADOWS, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/premiumTheme';
import { usePersonalizedPatterns } from '../../hooks/useInsights';

// Category icons and colors
const CATEGORY_CONFIG = {
  'meal-timing': {
    icon: 'sunny-outline',
    color: '#F59E0B', // Amber
    label: 'Meal Timing',
  },
  'next-day-carryover': {
    icon: 'moon-outline',
    color: '#8B5CF6', // Purple
    label: 'Next Day',
  },
  'hydration': {
    icon: 'water-outline',
    color: '#3B82F6', // Blue
    label: 'Hydration',
  },
  'activity': {
    icon: 'barbell-outline',
    color: '#10B981', // Green
    label: 'Activity',
  },
  'general': {
    icon: 'analytics-outline',
    color: BRAND.primary,
    label: 'Pattern',
  },
};

// Impact type styling
const IMPACT_STYLES = {
  positive: {
    backgroundColor: `${SEMANTIC.success.base}15`,
    borderColor: `${SEMANTIC.success.base}30`,
    textColor: SEMANTIC.success.base,
  },
  negative: {
    backgroundColor: `${SEMANTIC.warning.base}15`,
    borderColor: `${SEMANTIC.warning.base}30`,
    textColor: SEMANTIC.warning.base,
  },
  neutral: {
    backgroundColor: `${SEMANTIC.info.base}15`,
    borderColor: `${SEMANTIC.info.base}30`,
    textColor: SEMANTIC.info.base,
  },
};

/**
 * Single Pattern Item
 */
function PatternItem({ pattern, onPress }) {
  const categoryConfig = CATEGORY_CONFIG[pattern.category] || CATEGORY_CONFIG.general;
  const impactStyle = IMPACT_STYLES[pattern.impactType] || IMPACT_STYLES.neutral;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(pattern);
  };

  return (
    <TouchableOpacity
      style={[styles.patternItem, { borderColor: impactStyle.borderColor }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={[styles.patternIcon, { backgroundColor: `${categoryConfig.color}20` }]}>
        <Ionicons name={pattern.icon || categoryConfig.icon} size={20} color={categoryConfig.color} />
      </View>

      {/* Content */}
      <View style={styles.patternContent}>
        <Text style={styles.patternStatement}>{pattern.statement}</Text>

        {/* Meta row */}
        <View style={styles.patternMeta}>
          {/* Confidence badge */}
          <View style={[styles.confidenceBadge, { backgroundColor: impactStyle.backgroundColor }]}>
            <Text style={[styles.confidenceText, { color: impactStyle.textColor }]}>
              {pattern.confidenceLabel}
            </Text>
          </View>

          {/* Category */}
          <Text style={styles.categoryLabel}>{categoryConfig.label}</Text>
        </View>

        {/* Suggestion (collapsed by default) */}
        {pattern.suggestion && (
          <Text style={styles.suggestionText} numberOfLines={2}>
            {pattern.suggestion}
          </Text>
        )}
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
    </TouchableOpacity>
  );
}

/**
 * Empty state component
 */
function EmptyState({ dataQuality }) {
  const getMessage = () => {
    if (!dataQuality) {
      return 'Keep logging meals, mood, water, and activities to discover your personal behavioral patterns.';
    }

    const { metrics } = dataQuality;
    const tips = [];

    if (metrics?.moodLogs < 5) {
      tips.push('Log your mood a few more times');
    }
    if (metrics?.foodLogs < 7) {
      tips.push('Track more meals');
    }
    if (metrics?.waterLogs < 3) {
      tips.push('Log your water intake');
    }

    if (tips.length > 0) {
      return tips.join(' • ');
    }

    return dataQuality.suggestion || 'Keep logging to discover patterns in your health data.';
  };

  return (
    <View style={styles.emptyState}>
      <Ionicons name="sparkles-outline" size={40} color={TEXT.muted} />
      <Text style={styles.emptyTitle}>Building Your Profile...</Text>
      <Text style={styles.emptyText}>{getMessage()}</Text>
      {dataQuality?.score > 0 && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(dataQuality.score, 100)}%` }]} />
        </View>
      )}
    </View>
  );
}

/**
 * Data quality indicator
 */
function DataQualityBadge({ quality }) {
  const colors = {
    excellent: SEMANTIC.success.base,
    good: SEMANTIC.success.base,
    moderate: SEMANTIC.warning.base,
    basic: TEXT.tertiary,
    insufficient: TEXT.muted,
  };

  const color = colors[quality.label] || TEXT.tertiary;

  return (
    <View style={styles.dataQualityBadge}>
      <Ionicons name="shield-checkmark-outline" size={12} color={color} />
      <Text style={[styles.dataQualityText, { color }]}>
        {quality.label} data • {quality.patternsFound} patterns
      </Text>
    </View>
  );
}

/**
 * PersonalizedPatternsCard
 *
 * @param {boolean} compact - Show compact version (default: true)
 * @param {number} limit - Max patterns to show in compact view (default: 3)
 * @param {function} onPatternPress - Callback when a pattern is tapped
 * @param {function} onViewAll - Callback for "View All" button
 */
export default function PersonalizedPatternsCard({
  compact = true,
  limit = 3,
  onPatternPress,
  onViewAll,
}) {
  const {
    patterns,
    patternsFound,
    topInsight,
    dataQuality,
    hasEnoughData,
    hasPatterns,
    isLoading,
    error,
    refetch,
    source,
  } = usePersonalizedPatterns();

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.card}>
        <LinearGradient colors={[SURFACES.background.secondary, SURFACES.card.primary]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={BRAND.primary} />
            <Text style={styles.loadingText}>Analyzing your patterns...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Only show error state for actual errors, not empty results
  // The hook now returns empty data instead of throwing errors for "no patterns"
  if (error && !patterns) {
    return (
      <View style={styles.card}>
        <LinearGradient colors={[SURFACES.background.secondary, SURFACES.card.primary]} style={styles.gradient}>
          <View style={styles.errorContainer}>
            <Ionicons name="refresh-outline" size={24} color={TEXT.tertiary} />
            <Text style={styles.errorText}>Tap to load patterns</Text>
            <TouchableOpacity onPress={refetch} style={styles.retryButton}>
              <Text style={styles.retryText}>Load</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Show empty state
  if (!hasEnoughData || !hasPatterns) {
    return (
      <View style={styles.card}>
        <LinearGradient colors={[SURFACES.background.secondary, SURFACES.card.primary]} style={styles.gradient}>
          <View style={styles.header}>
            <Ionicons name="sparkles" size={24} color={BRAND.primary} />
            <Text style={styles.title}>Your Patterns</Text>
          </View>
          <EmptyState dataQuality={dataQuality} />
        </LinearGradient>
      </View>
    );
  }

  // Patterns to display
  const displayPatterns = compact ? patterns.slice(0, limit) : patterns;
  const hasMore = patterns.length > limit;

  return (
    <View style={styles.card}>
      <LinearGradient colors={[SURFACES.background.secondary, SURFACES.card.primary]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={24} color={BRAND.primary} />
            <View>
              <Text style={styles.title}>Your Patterns</Text>
              <Text style={styles.subtitle}>
                {patternsFound} patterns discovered
              </Text>
            </View>
          </View>
          <DataQualityBadge quality={dataQuality} />
        </View>

        {/* Top Insight Highlight (if compact and has top insight) */}
        {compact && topInsight && (
          <View style={styles.topInsightContainer}>
            <View style={styles.topInsightBadge}>
              <Ionicons name="bulb" size={14} color="#F59E0B" />
              <Text style={styles.topInsightLabel}>Top Insight</Text>
            </View>
            <Text style={styles.topInsightText}>{topInsight.statement}</Text>
          </View>
        )}

        {/* Pattern List */}
        <View style={styles.patternList}>
          {displayPatterns.map((pattern, index) => (
            <PatternItem
              key={pattern.id || `pattern-${index}`}
              pattern={pattern}
              onPress={onPatternPress}
            />
          ))}
        </View>

        {/* View All Button */}
        {compact && hasMore && onViewAll && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onViewAll();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All {patterns.length} Patterns</Text>
            <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  gradient: {
    padding: SPACING[4],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Data quality badge
  dataQualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACES.card.primary.secondary,
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  dataQualityText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Top insight
  topInsightContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  topInsightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING[2],
  },
  topInsightLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topInsightText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    lineHeight: 20,
  },

  // Pattern list
  patternList: {
    gap: SPACING[3],
  },

  // Pattern item
  patternItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACES.card.primary.secondary,
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: SPACING[3],
  },
  patternIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternContent: {
    flex: 1,
    gap: SPACING[2],
  },
  patternStatement: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
    lineHeight: 20,
  },
  patternMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  confidenceBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textTransform: 'capitalize',
  },
  categoryLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  suggestionText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // View all button
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    marginTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.primary.secondary,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },

  // Loading state
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[6],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Error state
  errorContainer: {
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: SEMANTIC.danger,
  },
  retryButton: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    backgroundColor: BRAND.primary,
    borderRadius: RADIUS.lg,
    marginTop: SPACING[2],
  },
  retryText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
    gap: SPACING[2],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING[4],
  },
  progressBar: {
    width: '60%',
    height: 4,
    backgroundColor: SURFACES.card.primary.secondary,
    borderRadius: 2,
    marginTop: SPACING[3],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND.primary,
    borderRadius: 2,
  },
});
