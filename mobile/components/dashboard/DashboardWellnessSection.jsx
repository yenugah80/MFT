/**
 * DashboardWellnessSection - Premium Staff-Level Wellness Tracking
 *
 * Design Philosophy:
 * - Hydration: Premium insights card with smart recommendations
 * - Activity: Daily movement summary
 * - Mood: Wellness insights with score
 * - Progressive disclosure pattern
 * - Visual storytelling with data
 *
 * V2 Features (behind HYDRATION_V2_DASHBOARD flag):
 * - Calm luxury design (Oura Ring aesthetic)
 * - 1-tap water logging
 * - Cold start progressive disclosure
 * - Predictive hydration intelligence
 */

import React, { useCallback } from 'react';
import { View } from 'react-native';
import CollapsibleSection from './CollapsibleSection';
import HydrationInsightsCard from './HydrationInsightsCard';
import HydrationInsightsCardV2 from './HydrationInsightsCardV2';
import ActivitySummaryCard from './ActivitySummaryCard';
import EnhancedMoodCard from './EnhancedMoodCard';
import { useFeatureFlag, FLAG_NAMES } from '../../hooks/useFeatureFlags';

export default function DashboardWellnessSection({
  styles,
  expanded,
  onToggle,
  today,
  goals,
  onOpenMoodInsights,
  onOpenHydrationInsights,
  onOpenHydrationTracker,
  onQuickAddWater,
  onOpenBeveragePicker,
  moodInsights,
  moodInsightsLoading,
  wellnessScore,
  waterLogs = [],
  hydrationWeekData = [],
  hydrationStreak = 0,
  // V2 props
  hydrationAnalytics = null,
}) {
  // Feature flag for V2 hydration card
  const { enabled: useV2Card } = useFeatureFlag(FLAG_NAMES.HYDRATION_V2_DASHBOARD);

  // Extract cold start and prediction data from analytics
  const coldStartStage = hydrationAnalytics?.coldStart?.stage || 'established';
  const daysWithData = hydrationAnalytics?.coldStart?.distinctDays || 7;
  const prediction = hydrationAnalytics?.prediction || null;

  // Handler to explain prediction (opens tracker with explanation modal)
  const handleExplainPrediction = useCallback(() => {
    onOpenHydrationTracker?.({ showPredictionExplanation: true });
  }, [onOpenHydrationTracker]);

  return (
    <CollapsibleSection
      styles={styles}
      title="Wellness"
      icon="heart"
      expanded={expanded}
      onToggle={onToggle}
    >
      <View style={styles.wellnessStack}>
        {/* Hydration Card - V1 or V2 based on feature flag */}
        {useV2Card ? (
          <HydrationInsightsCardV2
            currentIntake={today?.waterIntakeLiters || 0}
            dailyGoal={goals?.waterLiters || 2.0}
            coldStartStage={coldStartStage}
            daysWithData={daysWithData}
            prediction={prediction}
            onQuickAdd={onQuickAddWater}
            onOpenBeveragePicker={onOpenBeveragePicker}
            onExplainPrediction={handleExplainPrediction}
            onOpenTracker={onOpenHydrationTracker}
            onOpenInsights={onOpenHydrationInsights}
          />
        ) : (
          <HydrationInsightsCard
            currentIntake={today?.waterIntakeLiters || 0}
            dailyGoal={goals?.waterLiters || 2.0}
            logs={waterLogs}
            weekData={hydrationWeekData}
            streak={hydrationStreak}
            onQuickAdd={onQuickAddWater}
            onOpenTracker={onOpenHydrationTracker}
          />
        )}

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
