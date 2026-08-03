import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, TYPOGRAPHY, VIBRANT_WELLNESS } from '../constants/premiumTheme';
import WeeklyProgressHero from './activity/WeeklyProgressHero';
import WeekComparisonCard from './activity/WeekComparisonCard';
import {
  IntensityMixCard,
  TimeOfDayCard,
  PersonalBestsCard,
} from './activity/TrainingPatternCards';
import {
  MuscleBalanceCard,
  MoodActivityCard,
  NextSessionCard,
} from './activity/TrainingFocusCards';
import { getExerciseById } from '../services/exerciseDatabase';
import TrainingCalendar from './activity/TrainingCalendar';
import RecoveryHero from './activity/RecoveryHero';
import RecoveryTrendCard from './activity/RecoveryTrendCard';
import TrainingRibbon from './activity/TrainingRibbon';
import WhatYouTrainedCard from './activity/WhatYouTrainedCard';
import { CollapsibleSection } from './activity/layout';
import {
  getWeeklyPace,
  getActivityBreakdown,
  getSevenDayTrend,
  getConsistencyGrid,
  getMonthGrid,
  getExerciseBreakdown,
  getSessionHighlights,
  getIntensityMix,
  getTimeOfDayPattern,
  getPersonalBests,
  getMuscleBalance,
  getMoodActivityLink,
  getNextSessionSuggestion,
  generateActivityRecommendations,
  calculateActivityStreak,
} from '../utils/activityAnalytics';


/**
 * Activity Insights View
 * Shows comprehensive analytics, trends, and recommendations for activities
 */
export default function ActivityInsightsView({
  activities,
  onLogWorkout,
  targetMinutes,
  moodTrend,
  onDeleteActivity,
  isDeleting,
  backendRecommendation,
  recovery,
  strainTarget,
  recoveryHistory,
  onLogSignal,
  chartWidth,
}) {
  // Prefer the target the backend reports over the CDC default, so the screen
  // follows if that ever changes server-side.
  const goalOptions = { targetMinutes };
  // Calculate all insights
  const pace = getWeeklyPace(activities, goalOptions);
  const breakdown = getActivityBreakdown(activities);
  const exerciseBreakdown = getExerciseBreakdown(activities);
  const trend = getSevenDayTrend(activities);
  const consistency = getConsistencyGrid(activities, { weeks: 5 });
  const intensityMix = getIntensityMix(activities);
  const timeOfDay = getTimeOfDayPattern(activities);
  const bests = getPersonalBests(activities);
  const balance = getMuscleBalance(activities, getExerciseById);
  const moodLink = getMoodActivityLink(activities, moodTrend);
  const nextSession = getNextSessionSuggestion(pace, balance, backendRecommendation);
  const sessionHighlights = getSessionHighlights(activities);
  const sessionCount = Array.isArray(activities) ? activities.length : 0;

  // The calendar owns its month navigation; it asks for whichever month it
  // needs rather than the screen guessing.
  const buildMonth = useCallback(
    (monthsAgo) => getMonthGrid(activities, { monthsAgo, dailyTargetMinutes: (targetMinutes || 150) / 7 }),
    [activities, targetMinutes]
  );

  // The ribbon summarises the week section, so tapping it opens that section
  // rather than navigating away from the summary you just read.
  const [weekOpen, setWeekOpen] = useState(false);
  const handleOpenWeek = useCallback(() => setWeekOpen((v) => !v), []);
  const streak = calculateActivityStreak(activities);
  // The goal recommendation restates the Next session card almost verbatim —
  // same shortfall, same plan — so it is dropped rather than shown twice.
  const recommendations = generateActivityRecommendations(activities, [], goalOptions)
    .filter((rec) => rec.type !== 'goal');


  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Readiness first — it is the input to every decision below, and used
          to sit behind an unlabelled icon in the nav bar where it was missed */}
      {/* Three questions, one screenful: am I ready, what do I do, how is it
          going. Each holds one number. The evidence behind each — contribution
          rows, the ring and pace, the month grid — is one tap deeper, because
          arriving is not the same as studying. */}
      {!!recovery && (
        <RecoveryHero
          recovery={recovery}
          strainTarget={strainTarget}
          onLogSignal={onLogSignal}
          trend={<RecoveryTrendCard history={recoveryHistory} chartWidth={chartWidth} />}
        />
      )}

      <NextSessionCard suggestion={nextSession} onLogWorkout={onLogWorkout} />

      <TrainingRibbon
        consistency={consistency}
        pace={pace}
        onPress={handleOpenWeek}
      />

      {/* Review lives behind a tap. These answer weekly and monthly questions,
          not daily ones, and scrolling past them every visit is what made the
          merged screen overwhelming. */}
      <CollapsibleSection
        title="This week"
        subtitle={pace?.onPace ? 'On pace for your target' : `${pace?.remainingMinutes || 0} min to go`}
        icon="calendar-outline"
        accent={VIBRANT_WELLNESS.activity.solid}
        badge={`${pace?.percentage || 0}%`}
        open={weekOpen}
        onToggle={setWeekOpen}
      >
        <WeeklyProgressHero pace={pace} trend={trend} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Patterns"
        subtitle="Consistency, intensity and timing"
        icon="pulse-outline"
        accent={VIBRANT_WELLNESS.mood.solid}
        badge={intensityMix?.dominant ? intensityMix.dominant : undefined}
      >
        <WeekComparisonCard trend={trend} />
        <IntensityMixCard mix={intensityMix} />
        <TimeOfDayCard pattern={timeOfDay} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Progress"
        subtitle="Bests, balance and mood"
        icon="trophy-outline"
        accent={VIBRANT_WELLNESS.nutrition.solid}
        badge={streak?.current ? `${streak.current}d streak` : undefined}
      >
        <PersonalBestsCard bests={bests} streak={streak} />
        <WhatYouTrainedCard byExercise={exerciseBreakdown} byType={breakdown} />
        <MuscleBalanceCard balance={balance} onLogWorkout={onLogWorkout} />
        <MoodActivityCard link={moodLink} />
        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Ionicons name="bulb" size={24} color="#F59E0B" />
                <Text style={styles.cardTitle}>Personalized Insights</Text>
              </View>
            </View>
            <View style={styles.recommendationsList}>
              {recommendations.map((rec, index) => (
                <View key={index} style={[styles.recommendationCard, { borderLeftColor: rec.color || '#6366F1' }]}>
                  <View style={styles.recommendationHeader}>
                    <Ionicons name={rec.icon} size={20} color={rec.color || '#6366F1'} />
                    <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  </View>
                  <Text style={styles.recommendationMessage}>{rec.message}</Text>
                  {rec.action && onLogWorkout && (
                    <TouchableOpacity
                      style={styles.recommendationButton}
                      onPress={onLogWorkout}
                    >
                      <Text style={styles.recommendationButtonText}>{rec.action}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#6366F1" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </CollapsibleSection>




      <CollapsibleSection
        title="Calendar"
        subtitle="Every day, and what you did"
        icon="calendar-number-outline"
        accent={VIBRANT_WELLNESS.hydration.solid}
        badge={
          sessionCount ? `${sessionCount}` : undefined
        }
      >
        <TrainingCalendar
          buildMonth={buildMonth}
          highlights={sessionHighlights}
          onDelete={onDeleteActivity}
          isDeleting={isDeleting}
        />
      </CollapsibleSection>

      {/* Empty State */}
      {activities.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="fitness-outline" size={64} color={TEXT.tertiary} />
          <Text style={styles.emptyTitle}>No Activity Data Yet</Text>
          <Text style={styles.emptyText}>
            Start logging your workouts to see insights and trends!
          </Text>
          {onLogWorkout && (
            <TouchableOpacity style={styles.emptyButton} onPress={onLogWorkout}>
              <Text style={styles.emptyButtonText}>Log Your First Workout</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

// Helper function to get category colors - vibrant fitness palette

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.secondary, // Lighter, brighter background
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#1E293B',
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#1E293B',
  },
  recommendationMessage: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  recommendationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  recommendationButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#6366F1',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#fff',
  },
  bottomPadding: {
    height: 40,
  },
});
