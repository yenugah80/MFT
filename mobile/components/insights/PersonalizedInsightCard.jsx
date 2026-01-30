/**
 * PersonalizedInsightCard - World-class Personalized Insight Display
 *
 * Design Philosophy: Clean, narrative-driven, premium feel
 * - Oura/WHOOP inspired aesthetics
 * - Story-first, data-second
 * - Clear confidence indicators
 * - Actionable recommendations
 *
 * This component displays insights discovered from the user's OWN data,
 * not generic advice. Every insight references their actual patterns.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, SURFACES, BRAND, SEMANTIC, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/premiumTheme';

// ==================== Sub-Components ====================

/**
 * Confidence Badge - Shows how confident we are in the insight
 */
const ConfidenceBadge = ({ confidence }) => {
  const getColor = () => {
    if (confidence >= 70) return '#10B981'; // Green - High confidence
    if (confidence >= 50) return '#F59E0B'; // Yellow - Medium confidence
    return '#6B7280'; // Gray - Low confidence
  };

  const getLabel = () => {
    if (confidence >= 70) return 'Strong pattern';
    if (confidence >= 50) return 'Emerging pattern';
    return 'Early signal';
  };

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: getColor() + '15' }]}>
      <View style={[styles.confidenceDot, { backgroundColor: getColor() }]} />
      <Text style={[styles.confidenceText, { color: getColor() }]}>
        {getLabel()} ({confidence}%)
      </Text>
    </View>
  );
};

/**
 * Food Impact Badge - Shows if a food is good/watch for this user
 */
const FoodImpactBadge = ({ food, impact, type }) => {
  const isPositive = type === 'good';
  const color = isPositive ? '#10B981' : '#F59E0B';

  return (
    <View style={[styles.foodBadge, { borderColor: color + '30' }]}>
      <Ionicons
        name={isPositive ? 'arrow-up' : 'alert-circle'}
        size={14}
        color={color}
      />
      <Text style={styles.foodName}>{food}</Text>
      <Text style={[styles.foodImpact, { color }]}>
        {isPositive ? `+${impact}%` : `${impact}%`}
      </Text>
    </View>
  );
};

/**
 * Cross-Domain Correlation Badge - Shows activity, sleep, hydration, stress correlations
 */
const CorrelationBadge = ({ correlation, type }) => {
  const getTypeConfig = () => {
    switch (type) {
      case 'activity':
        return { icon: 'fitness', color: '#8B5CF6', label: 'Activity' };
      case 'sleep':
        return { icon: 'moon', color: '#6366F1', label: 'Sleep' };
      case 'hydration':
        return { icon: 'water', color: '#06B6D4', label: 'Hydration' };
      case 'stress':
        return { icon: 'pulse', color: '#EC4899', label: 'Stress' };
      default:
        return { icon: 'analytics', color: BRAND.primary, label: 'Pattern' };
    }
  };

  const config = getTypeConfig();
  const impact = correlation.moodImpact || correlation.energyImpact || correlation.sleepImpact || 0;
  const isPositive = correlation.direction === 'positive';

  return (
    <View style={[styles.correlationBadge, { borderColor: config.color + '30' }]}>
      <View style={[styles.correlationIconContainer, { backgroundColor: config.color + '15' }]}>
        <Ionicons name={config.icon} size={14} color={config.color} />
      </View>
      <View style={styles.correlationContent}>
        <Text style={styles.correlationInsight} numberOfLines={2}>
          {correlation.insight}
        </Text>
        {impact !== 0 && (
          <Text style={[styles.correlationImpact, { color: isPositive ? '#10B981' : '#F59E0B' }]}>
            {isPositive ? '+' : ''}{Math.round(impact)}% impact
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Cross-Domain Section - Displays correlations for a wellness domain
 */
const CrossDomainSection = ({ title, icon, iconColor, correlations, onCorrelationPress }) => {
  if (!correlations || correlations.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={iconColor} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {correlations.slice(0, 3).map((correlation, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onCorrelationPress?.(correlation)}
          activeOpacity={0.7}
          style={styles.correlationItem}
        >
          <Text style={styles.correlationInsightText}>{correlation.insight}</Text>
          {correlation.recommendation && (
            <View style={styles.correlationRecommendation}>
              <Ionicons name="arrow-forward-circle" size={14} color={BRAND.primary} />
              <Text style={styles.correlationRecommendationText}>{correlation.recommendation}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

/**
 * Data Progress Ring - Shows data collection progress
 */
const DataProgressRing = ({ percentage, label }) => {
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (percentage / 100) * circumference;

  return (
    <View style={styles.progressRingContainer}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[styles.progressRingBg, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth }]} />
        <View style={[styles.progressRingFill, {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: BRAND.primary,
          transform: [{ rotate: '-90deg' }],
          borderTopColor: 'transparent',
          borderRightColor: percentage > 25 ? BRAND.primary : 'transparent',
          borderBottomColor: percentage > 50 ? BRAND.primary : 'transparent',
          borderLeftColor: percentage > 75 ? BRAND.primary : 'transparent',
        }]} />
        <Text style={styles.progressRingText}>{percentage}%</Text>
      </View>
      <Text style={styles.progressRingLabel}>{label}</Text>
    </View>
  );
};

// ==================== Main Component ====================

export default function PersonalizedInsightCard({
  // Quick insight for compact display
  quickInsight = null,

  // Full narrative sections
  narrative = null,

  // Food correlations
  goodFoods = [],
  watchFoods = [],

  // Timing patterns
  timingPatterns = [],
  bestDay = null,
  challengingDay = null,

  // Cross-domain correlations (NEW)
  activityCorrelations = [],
  sleepCorrelations = [],
  hydrationCorrelations = [],
  stressCorrelations = [],

  // Data status
  hasInsights = false,
  dataStatus = 'building',
  dataProgress = { food: 0, mood: 0 },
  dataSufficiency = null,

  // Callbacks
  onViewDetails,
  onFoodPress,
  onActionPress,
  onCorrelationPress,

  // Display mode
  mode = 'compact', // 'compact' | 'expanded' | 'full'

  style,
}) {
  const [expanded, setExpanded] = useState(mode === 'expanded');

  const toggleExpanded = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  // ==================== Building State ====================
  if (dataStatus === 'building' || !hasInsights) {
    return (
      <View style={[styles.container, styles.buildingContainer, style]}>
        <View style={styles.buildingHeader}>
          <View style={styles.buildingIconContainer}>
            <Ionicons name="sparkles-outline" size={24} color={BRAND.primary} />
          </View>
          <View style={styles.buildingTextContainer}>
            <Text style={styles.buildingTitle}>Discovering Your Patterns</Text>
            <Text style={styles.buildingSubtitle}>
              Keep logging to unlock personalized insights
            </Text>
          </View>
        </View>

        {/* Progress Rings */}
        <View style={styles.progressRow}>
          <DataProgressRing percentage={dataProgress.food} label="Meals" />
          <DataProgressRing percentage={dataProgress.mood} label="Moods" />
        </View>

        <Text style={styles.buildingHint}>
          We need about 10 meals and 7 mood logs to start finding patterns in your data
        </Text>
      </View>
    );
  }

  // ==================== Compact Mode ====================
  if (mode === 'compact' && quickInsight) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.compactContainer, style]}
        onPress={onViewDetails}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#F0FDF4', '#DCFCE7']}
          style={styles.compactGradient}
        >
          <View style={styles.compactContent}>
            <View style={styles.compactIconContainer}>
              <Ionicons name="bulb" size={20} color="#10B981" />
            </View>
            <View style={styles.compactTextContainer}>
              <Text style={styles.compactLabel}>Your Pattern</Text>
              <Text style={styles.compactInsight} numberOfLines={2}>
                {quickInsight.text}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
          </View>

          {quickInsight.confidence && (
            <ConfidenceBadge confidence={quickInsight.confidence} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // ==================== Expanded/Full Mode ====================
  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="analytics" size={20} color={BRAND.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Your Nutrition Fingerprint</Text>
            <Text style={styles.headerSubtitle}>
              Patterns unique to you
            </Text>
          </View>
        </View>
        {onViewDetails && (
          <TouchableOpacity onPress={onViewDetails} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color={BRAND.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Insight Highlight */}
      {quickInsight && (
        <View style={styles.highlightCard}>
          <LinearGradient
            colors={['#EEF2FF', '#E0E7FF']}
            style={styles.highlightGradient}
          >
            <Ionicons name="sparkles" size={18} color="#6366F1" />
            <Text style={styles.highlightText}>{quickInsight.text}</Text>
          </LinearGradient>
          {quickInsight.confidence && (
            <ConfidenceBadge confidence={quickInsight.confidence} />
          )}
        </View>
      )}

      {/* Foods That Work For You */}
      {goodFoods.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={16} color="#10B981" />
            <Text style={styles.sectionTitle}>Foods That Boost Your Energy</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodScroll}>
            {goodFoods.slice(0, 5).map((food, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => onFoodPress?.(food)}
                activeOpacity={0.7}
              >
                <FoodImpactBadge
                  food={food.food}
                  impact={food.energyBoost}
                  type="good"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Foods to Watch */}
      {watchFoods.length > 0 && expanded && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={16} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Foods to Be Mindful Of</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.foodScroll}>
            {watchFoods.slice(0, 5).map((food, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => onFoodPress?.(food)}
                activeOpacity={0.7}
              >
                <FoodImpactBadge
                  food={food.food}
                  impact={food.energyImpact}
                  type="watch"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Timing Patterns */}
      {timingPatterns.length > 0 && expanded && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={16} color={BRAND.primary} />
            <Text style={styles.sectionTitle}>Your Timing Patterns</Text>
          </View>
          {timingPatterns.slice(0, 3).map((pattern, index) => (
            <View key={index} style={styles.timingItem}>
              <Text style={styles.timingInsight}>{pattern.insight}</Text>
              {pattern.recommendation && (
                <TouchableOpacity
                  style={styles.timingAction}
                  onPress={() => onActionPress?.(pattern)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-forward-circle" size={14} color={BRAND.primary} />
                  <Text style={styles.timingActionText}>{pattern.recommendation}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Cross-Domain Correlations (NEW) */}
      {expanded && (
        <>
          {/* Activity Patterns */}
          <CrossDomainSection
            title="Activity Patterns"
            icon="fitness"
            iconColor="#8B5CF6"
            correlations={activityCorrelations}
            onCorrelationPress={onCorrelationPress}
          />

          {/* Sleep Patterns */}
          <CrossDomainSection
            title="Sleep Patterns"
            icon="moon"
            iconColor="#6366F1"
            correlations={sleepCorrelations}
            onCorrelationPress={onCorrelationPress}
          />

          {/* Hydration Patterns */}
          <CrossDomainSection
            title="Hydration Patterns"
            icon="water"
            iconColor="#06B6D4"
            correlations={hydrationCorrelations}
            onCorrelationPress={onCorrelationPress}
          />

          {/* Stress Patterns */}
          <CrossDomainSection
            title="Stress Patterns"
            icon="pulse"
            iconColor="#EC4899"
            correlations={stressCorrelations}
            onCorrelationPress={onCorrelationPress}
          />
        </>
      )}

      {/* Best/Challenging Days */}
      {(bestDay || challengingDay) && expanded && (
        <View style={styles.daysContainer}>
          {bestDay && (
            <View style={[styles.dayCard, styles.bestDayCard]}>
              <Ionicons name="sunny" size={20} color="#10B981" />
              <Text style={styles.dayLabel}>Best Day</Text>
              <Text style={styles.dayValue}>{bestDay}</Text>
            </View>
          )}
          {challengingDay && (
            <View style={[styles.dayCard, styles.challengingDayCard]}>
              <Ionicons name="cloudy" size={20} color="#F59E0B" />
              <Text style={styles.dayLabel}>Needs Support</Text>
              <Text style={styles.dayValue}>{challengingDay}</Text>
            </View>
          )}
        </View>
      )}

      {/* Expand/Collapse Button */}
      {mode !== 'full' && (
        watchFoods.length > 0 ||
        timingPatterns.length > 0 ||
        activityCorrelations.length > 0 ||
        sleepCorrelations.length > 0 ||
        hydrationCorrelations.length > 0 ||
        stressCorrelations.length > 0
      ) && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? 'Show Less' : 'See More Patterns'}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={BRAND.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  // Building state
  buildingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[5],
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  buildingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  buildingTextContainer: {
    flex: 1,
  },
  buildingTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  buildingSubtitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  progressRow: {
    flexDirection: 'row',
    gap: SPACING[6],
    marginVertical: SPACING[4],
  },
  progressRingContainer: {
    alignItems: 'center',
  },
  progressRingBg: {
    position: 'absolute',
    borderColor: '#E5E7EB',
  },
  progressRingFill: {
    position: 'absolute',
  },
  progressRingText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  progressRingLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  buildingHint: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
    paddingHorizontal: SPACING[4],
  },

  // Compact mode
  compactContainer: {
    padding: 0,
    overflow: 'hidden',
  },
  compactGradient: {
    padding: SPACING[3],
    borderRadius: RADIUS.xl,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  compactTextContainer: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#059669',
    marginBottom: 2,
  },
  compactInsight: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    lineHeight: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  // Confidence badge
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    marginTop: SPACING[2],
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SPACING[1],
  },
  confidenceText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.medium,
  },

  // Highlight card
  highlightCard: {
    marginBottom: SPACING[4],
  },
  highlightGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[2],
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#4338CA',
    lineHeight: 20,
  },

  // Sections
  section: {
    marginBottom: SPACING[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },

  // Food badges
  foodScroll: {
    marginHorizontal: -SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  foodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.elevated,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginRight: SPACING[2],
    gap: SPACING[1],
  },
  foodName: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  foodImpact: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.bold,
  },

  // Timing patterns
  timingItem: {
    marginBottom: SPACING[3],
  },
  timingInsight: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 19,
  },
  timingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[1],
  },
  timingActionText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: BRAND.primary,
  },

  // Days container
  daysContainer: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  dayCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
  },
  bestDayCard: {
    backgroundColor: '#10B98110',
  },
  challengingDayCard: {
    backgroundColor: '#F59E0B10',
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  dayValue: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginTop: 2,
  },

  // Expand button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING[2],
    gap: SPACING[1],
  },
  expandButtonText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  // Cross-domain correlation styles
  correlationBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACES.elevated,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING[2],
    gap: SPACING[2],
  },
  correlationIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correlationContent: {
    flex: 1,
  },
  correlationInsight: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    lineHeight: 18,
  },
  correlationImpact: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.bold,
    marginTop: 2,
  },
  correlationItem: {
    marginBottom: SPACING[3],
  },
  correlationInsightText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 19,
  },
  correlationRecommendation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[1],
  },
  correlationRecommendationText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: BRAND.primary,
    flex: 1,
  },
});
