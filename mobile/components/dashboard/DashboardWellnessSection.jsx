/**
 * DashboardWellnessSection - Clean, focused wellness tracking
 *
 * Staff Design Principles:
 * - Hydration: Quick water logging with ONE action-focused card
 * - Activity: Daily movement summary
 * - Mood: Wellness insights
 * - NO pseudoscience health claims
 */

import React from 'react';
import { View } from 'react-native';
import CollapsibleSection from './CollapsibleSection';
import PremiumHydrationCard from './PremiumHydrationCard';
import ActivitySummaryCard from './ActivitySummaryCard';
import EnhancedMoodCard from './EnhancedMoodCard';

export default function DashboardWellnessSection({
  styles,
  expanded,
  onToggle,
  today,
  goals,
  onOpenMoodInsights,
  onOpenHydrationTracker,
  onQuickAddWater,
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
        {/* Premium Hydration Card - Clean, honest, action-focused */}
        <PremiumHydrationCard
          currentIntake={today?.waterIntakeLiters || 0}
          dailyGoal={goals?.waterLiters || 2.0}
          onQuickAdd={onQuickAddWater}
          onOpenFullTracker={onOpenHydrationTracker}
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
