/**
 * DashboardWellnessSection - Clean, focused wellness tracking
 *
 * Staff Design Principles:
 * - Hydration: Quick water logging
 * - Activity: Daily movement summary
 * - Enhanced Mood Card with Wellness Score integration
 */

import React from 'react';
import { View } from 'react-native';
import CollapsibleSection from './CollapsibleSection';
import HydrationWellnessDashboard from './HydrationWellnessDashboard';
import ActivitySummaryCard from './ActivitySummaryCard';
import EnhancedMoodCard from './EnhancedMoodCard';

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
  onQuickAddWater, // New: quick-add water callback
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
          onQuickAddWater={onQuickAddWater}
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
        />
      </View>
    </CollapsibleSection>
  );
}

// Unused localStyles removed (was for insightsLink)
