/**
 * ActivityProgressIntelligenceCard - Tier 5: Dedicated Deep Dive for Activity & Progress
 *
 * Premium card showing:
 * - Weekly activity summary
 * - Logging quality and consistency
 * - Trend analysis
 * - Achievement unlocks
 *
 * Design: Premium glassmorphic card celebrating progress
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BRAND, TEXT, SURFACES, SPACING, RADIUS, SHADOWS } from '../../constants/premiumTheme';

/**
 * Calculate logging quality score
 */
function calculateQualityScore(foodLogs) {
  if (!foodLogs || foodLogs.length === 0) return 0;

  // Count nutrient-dense meals (those with protein, complex carbs, healthy fats)
  const nutrientDenseMeals = foodLogs.filter(meal => {
    const protein = meal.protein || 0;
    const carbs = meal.carbs || 0;
    const fat = meal.fat || 0;
    // Consider nutrient-dense if it has all three macros
    return protein > 5 && carbs > 10 && fat > 3;
  });

  return Math.round((nutrientDenseMeals.length / foodLogs.length) * 100);
}

/**
 * Generate achievement based on progress
 */
function generateAchievement({ foodLogs, moodLogs, streak, trends }) {
  // Check for "Consistent Logger" achievement
  if (foodLogs?.length >= 21 && streak >= 7) {
    return {
      type: 'achievement',
      icon: 'trophy',
      title: 'ACHIEVEMENT UNLOCKED',
      name: 'Consistent Logger',
      description: 'You logged every day this week!',
      color: '#F59E0B',
    };
  }

  // Check for "Pattern Detective" achievement
  if (trends?.patternsDiscovered >= 3) {
    return {
      type: 'achievement',
      icon: 'bulb',
      title: 'ACHIEVEMENT UNLOCKED',
      name: 'Pattern Detective',
      description: 'You discovered 3 food-mood patterns!',
      color: '#8B5CF6',
    };
  }

  // Check for "Nutrition Expert" achievement
  if (foodLogs?.length >= 50) {
    return {
      type: 'achievement',
      icon: 'school',
      title: 'ACHIEVEMENT UNLOCKED',
      name: 'Nutrition Expert',
      description: 'You logged 50+ meals!',
      color: '#10B981',
    };
  }

  // Default: Encourage more logging
  return {
    type: 'progress',
    icon: 'flag',
    title: 'NEXT MILESTONE',
    name: 'Keep logging to unlock achievements',
    description: `${7 - (streak || 0)} more days for "Consistent Logger"`,
    color: BRAND.primary,
  };
}

export default function ActivityProgressIntelligenceCard({
  foodLogs = [],
  moodLogs = [],
  waterLogs = [],
  streak = 0,
  trends = {},
  onViewTimeline,
}) {
  const [expanded, setExpanded] = useState(false);

  const weekMeals = foodLogs?.length || 0;
  const qualityScore = calculateQualityScore(foodLogs);
  const achievement = generateAchievement({ foodLogs, moodLogs, streak, trends });

  // Calculate trends
  const avgCalories = trends?.avgCalories || 0;
  const proteinTrend = trends?.proteinTrend || 0;
  const hydrationTrend = trends?.hydrationTrend || 0;

  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const handleViewTimeline = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onViewTimeline) {
      onViewTimeline();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleToggle}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#F59E0B', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="bar-chart" size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>ACTIVITY & PROGRESS</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={TEXT.tertiary}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{weekMeals}</Text>
            <Text style={styles.statLabel}>meals logged</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: qualityScore >= 80 ? '#10B981' : '#F59E0B' }]}>
              {qualityScore}%
            </Text>
            <Text style={styles.statLabel}>quality</Text>
          </View>
        </View>

        {/* Expandable Content */}
        {expanded && (
          <View style={styles.expandedContent}>
            {/* Achievement Box */}
            <View style={[styles.achievementBox, { backgroundColor: achievement.color + '20', borderLeftColor: achievement.color }]}>
              <View style={styles.achievementHeader}>
                <Ionicons name={achievement.icon} size={20} color={achievement.color} />
                <Text style={[styles.achievementTitle, { color: achievement.color }]}>
                  {achievement.title}
                </Text>
              </View>
              <Text style={styles.achievementName}>{achievement.name}</Text>
              <Text style={styles.achievementDescription}>{achievement.description}</Text>
            </View>

            {/* Trends Section */}
            <View style={styles.trendsSection}>
              <Text style={styles.sectionTitle}>Trends</Text>
              <View style={styles.trendsList}>
                <View style={styles.trendItem}>
                  <View style={styles.trendLeft}>
                    <Ionicons name="flame" size={16} color={TEXT.tertiary} />
                    <Text style={styles.trendLabel}>Calories</Text>
                  </View>
                  <View style={styles.trendRight}>
                    <Text style={styles.trendValue}>{Math.round(avgCalories)}/day</Text>
                    <Text style={styles.trendChange}>Stable</Text>
                  </View>
                </View>

                <View style={styles.trendItem}>
                  <View style={styles.trendLeft}>
                    <Ionicons name="fitness" size={16} color={TEXT.tertiary} />
                    <Text style={styles.trendLabel}>Protein</Text>
                  </View>
                  <View style={styles.trendRight}>
                    <Ionicons
                      name={proteinTrend > 0 ? 'trending-up' : 'remove'}
                      size={16}
                      color={proteinTrend > 0 ? '#10B981' : TEXT.tertiary}
                    />
                    <Text style={[styles.trendChange, { color: proteinTrend > 0 ? '#10B981' : TEXT.tertiary }]}>
                      {proteinTrend > 0 ? `↑ ${Math.round(proteinTrend * 100)}%` : 'Stable'}
                    </Text>
                  </View>
                </View>

                <View style={styles.trendItem}>
                  <View style={styles.trendLeft}>
                    <Ionicons name="water" size={16} color={TEXT.tertiary} />
                    <Text style={styles.trendLabel}>Hydration</Text>
                  </View>
                  <View style={styles.trendRight}>
                    <Ionicons
                      name={hydrationTrend > 0 ? 'trending-up' : 'remove'}
                      size={16}
                      color={hydrationTrend > 0 ? '#10B981' : TEXT.tertiary}
                    />
                    <Text style={[styles.trendChange, { color: hydrationTrend > 0 ? '#10B981' : TEXT.tertiary }]}>
                      {hydrationTrend > 0 ? `↑ ${Math.round(hydrationTrend * 100)}%` : 'Stable'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleViewTimeline}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>View Full Timeline</Text>
              <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: SURFACES.card.background,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
  },
  achievementBox: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  achievementTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: TEXT.secondary,
  },
  trendsSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.secondary,
    marginBottom: SPACING.sm,
  },
  trendsList: {
    gap: SPACING.sm,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  trendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 14,
    color: TEXT.secondary,
    marginLeft: SPACING.xs,
  },
  trendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  trendChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
    marginRight: 6,
  },
});
