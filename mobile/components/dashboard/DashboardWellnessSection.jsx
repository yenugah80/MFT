import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CollapsibleSection from './CollapsibleSection';
import HydrationWellnessDashboard from './HydrationWellnessDashboard';
import EnhancedMoodCard from './EnhancedMoodCard';
import ActivitySummaryCard from './ActivitySummaryCard';
import { TEXT } from '../../constants/premiumTheme';

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
  moodInsightsData,
  moodInsightsLoading,
  onOpenMoodInsights,
  onOpenHydrationTracker,
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
        <HydrationWellnessDashboard
          currentIntake={today.waterIntakeLiters || 0}
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

        <EnhancedMoodCard
          insights={moodInsightsData}
          loading={moodInsightsLoading}
          onOpenInsights={onOpenMoodInsights}
        />
        <TouchableOpacity
          style={styles.moodInsightsLink}
          onPress={onOpenMoodInsights}
          accessibilityRole="button"
          accessibilityLabel="View mood insights"
          accessibilityHint="Opens your historical mood insights and recommendations"
        >
          <Ionicons name="analytics-outline" size={16} color={TEXT.secondary} />
          <Text style={styles.moodInsightsText}>View mood insights</Text>
        </TouchableOpacity>

        <View style={styles.wellnessDivider} />

        <ActivitySummaryCard />
      </View>
    </CollapsibleSection>
  );
}
