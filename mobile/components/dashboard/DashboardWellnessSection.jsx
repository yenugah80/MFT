/**
 * DashboardWellnessSection - Complete wellness tracking
 *
 * Staff Design Principles:
 * - Hydration: Quick water logging
 * - Activity: Daily movement summary
 * - Sleep: Last night's rest quality
 * - Stress: Today's stress level
 * - Enhanced Mood Card with Wellness Score integration
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from './CollapsibleSection';
import HydrationHeartPath from './HydrationHeartPath';
// PersonalizedHydrationInsights REMOVED - was duplicating pace/status info shown in HydrationWellnessDashboard
import ActivitySummaryCard from './ActivitySummaryCard';
import SleepSummaryCard from './SleepSummaryCard';
import StressSummaryCard from './StressSummaryCard';
import EnhancedMoodCard from './EnhancedMoodCard';
import { TEXT, SPACING, RADIUS, BRAND } from '../../constants/premiumTheme';

export default function DashboardWellnessSection({
  styles,
  expanded,
  onToggle,
  today,
  goals,
  gamification,
  streak = 0, // CRITICAL FIX: Use dedicated streak prop (from trends.currentStreak) not gamification.streak
  hydrationEvents,
  hydrationLastLoggedAt,
  hydrationCelebratedKey,
  onCelebrateHydration,
  onOpenMoodInsights,
  onViewMoodHistory, // Navigate to mood history screen
  onOpenHydrationTracker,
  onViewHydrationHistory, // Navigate to hydration history/insights screen
  onViewFoodHistory, // Navigate to food history screen
  moodInsights,
  moodInsightsLoading,
  wellnessScore,
}) {
  return (
    <CollapsibleSection
      styles={styles}
      title="Wellness"
      icon="heart"
      expanded={expanded}
      onToggle={onToggle}
    >
      <View style={localStyles.compactStack}>
        {/* Hydration Tracker - Heart Path Journey design */}
        <HydrationHeartPath
          currentIntake={today?.waterIntakeLiters || 0}
          dailyGoal={goals?.waterLiters || 2.0}
          onOpenFullTracker={onOpenHydrationTracker}
          onViewHistory={onViewHydrationHistory}
        />

        {/* Activity Summary */}
        <ActivitySummaryCard />

        {/* Sleep + Stress Side by Side Grid - Staff Design: Compact wellness duo */}
        <View style={localStyles.wellnessGrid}>
          <View style={localStyles.gridItem}>
            <SleepSummaryCard compact={true} />
          </View>
          <View style={localStyles.gridItem}>
            <StressSummaryCard compact={true} />
          </View>
        </View>

        {/* Enhanced Mood Card with Wellness Score */}
        <EnhancedMoodCard
          insights={moodInsights}
          loading={moodInsightsLoading}
          wellnessScore={wellnessScore}
          onOpenInsights={onOpenMoodInsights}
          onViewHistory={onViewMoodHistory}
          showWellnessScore={false}
        />

        {/* Food History Quick Link */}
        {onViewFoodHistory && (
          <TouchableOpacity
            style={localStyles.foodHistoryLink}
            onPress={onViewFoodHistory}
            activeOpacity={0.7}
          >
            <View style={localStyles.foodHistoryIcon}>
              <Ionicons name="restaurant-outline" size={18} color={BRAND.primary} />
            </View>
            <Text style={localStyles.foodHistoryText}>View Food History</Text>
            <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
          </TouchableOpacity>
        )}
      </View>
    </CollapsibleSection>
  );
}

const localStyles = StyleSheet.create({
  // Compact stack with tighter spacing (no dividers)
  compactStack: {
    gap: SPACING[2], // Tight 8px gap between cards
  },
  // Side-by-side grid for Sleep + Stress
  wellnessGrid: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  gridItem: {
    flex: 1,
  },
  insightsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    backgroundColor: `${BRAND.primary}08`,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${BRAND.primary}15`,
  },
  insightsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: TEXT.secondary,
  },
  // Food History Link
  foodHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    backgroundColor: `${BRAND.primary}06`,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${BRAND.primary}10`,
  },
  foodHistoryIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: `${BRAND.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodHistoryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
});
