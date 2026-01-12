/**
 * DashboardWellnessSection - Clean, focused wellness tracking
 *
 * Staff Design Principles:
 * - Hydration: Quick water logging
 * - Activity: Daily movement summary
 * - Enhanced Mood Card with Wellness Score integration
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from './CollapsibleSection';
import HydrationWellnessDashboard from './HydrationWellnessDashboard';
import ActivitySummaryCard from './ActivitySummaryCard';
import EnhancedMoodCard from './EnhancedMoodCard';
import { TEXT, SPACING, RADIUS, BRAND } from '../../constants/premiumTheme';

export default function DashboardWellnessSection({
  styles,
  expanded,
  onToggle,
  today,
  goals,
  gamification,
  hydrationEvents,
  hydrationLastLoggedAt,
  hydrationCelebratedKey,
  onCelebrateHydration,
  onOpenMoodInsights,
  onOpenHydrationTracker,
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
      <View style={styles.wellnessStack}>
        {/* Hydration Tracker */}
        <HydrationWellnessDashboard
          currentIntake={today?.waterIntakeLiters || 0}
          dailyGoal={goals?.waterLiters || 2.0}
          streak={gamification?.streak || 0}
          intakeEvents={hydrationEvents}
          lastLoggedAt={hydrationLastLoggedAt}
          celebratedTodayKey={hydrationCelebratedKey}
          onCelebrate={onCelebrateHydration}
          onOpenFullTracker={onOpenHydrationTracker}
          compact={true}
        />

        <View style={styles.wellnessDivider} />

        {/* Activity Summary */}
        <ActivitySummaryCard />

        <View style={styles.wellnessDivider} />

        {/* Enhanced Mood Card with Wellness Score */}
        <EnhancedMoodCard
          insights={moodInsights}
          loading={moodInsightsLoading}
          wellnessScore={wellnessScore}
          onOpenInsights={onOpenMoodInsights}
          showWellnessScore={false}
        />
      </View>
    </CollapsibleSection>
  );
}

const localStyles = StyleSheet.create({
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
});
