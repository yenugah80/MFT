import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, TYPOGRAPHY, VIBRANT_WELLNESS } from '../constants/premiumTheme';
import {
  PersonalBestsCard,
} from './activity/TrainingPatternCards';
import {
  MoodActivityCard,
  NextSessionCard,
} from './activity/TrainingFocusCards';
import { getExerciseById } from '../services/exerciseDatabase';
import TrainingCalendar from './activity/TrainingCalendar';
import RecoveryHero from './activity/RecoveryHero';
import RecoveryTrendCard from './activity/RecoveryTrendCard';
import { CollapsibleSection } from './activity/layout';
import {
  getWeeklyPace,
  getMonthGrid,
  getPeriodStats,
  getSessionHighlights,
  getPersonalBests,
  getMuscleBalance,
  getMoodActivityLink,
  getNextSessionSuggestion,
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
  // Staleness is a standing fact ("legs untrained 9 days"), not a property of
  // whichever period happens to be selected
  const balance = getMuscleBalance(activities, getExerciseById);
  const bests = getPersonalBests(activities);
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

  const buildStats = useCallback(
    ({ scope, anchor }) =>
      getPeriodStats(activities, {
        scope,
        anchor,
        targetMinutes,
        resolveExercise: getExerciseById,
      }),
    [activities, targetMinutes]
  );

  const streak = calculateActivityStreak(activities);
  // The goal recommendation restates the Next session card almost verbatim —
  // same shortfall, same plan — so it is dropped rather than shown twice.


  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Readiness first — it is the input to every decision below, and used
          to sit behind an unlabelled icon in the nav bar where it was missed */}

      {/* Review lives behind a tap. These answer weekly and monthly questions,
          not daily ones, and scrolling past them every visit is what made the
          merged screen overwhelming. */}






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

      <CollapsibleSection
        title="Milestones"
        subtitle="Records and how movement affects mood"
        icon="trophy-outline"
        accent={VIBRANT_WELLNESS.nutrition.solid}
        badge={streak?.current ? `${streak.current}d streak` : undefined}
      >
        <PersonalBestsCard bests={bests} streak={streak} />
        <MoodActivityCard link={moodLink} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Your training"
        defaultOpen
        subtitle="Calendar, patterns and progress"
        icon="calendar-number-outline"
        accent={VIBRANT_WELLNESS.hydration.solid}
        badge={
          sessionCount ? `${sessionCount}` : undefined
        }
      >
        <TrainingCalendar
          buildMonth={buildMonth}
          buildStats={buildStats}
          highlights={sessionHighlights}
          onDelete={onDeleteActivity}
          isDeleting={isDeleting}
        />
      </CollapsibleSection>

      <NextSessionCard suggestion={nextSession} onLogWorkout={onLogWorkout} />

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
