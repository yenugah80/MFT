import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, TYPOGRAPHY } from '../constants/premiumTheme';
import WeeklyProgressHero from './activity/WeeklyProgressHero';
import WeekComparisonCard from './activity/WeekComparisonCard';
import ConsistencyHeatmap from './activity/ConsistencyHeatmap';
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
import SessionTimeline from './activity/SessionTimeline';
import RecoveryHero from './activity/RecoveryHero';
import RecoveryTrendCard from './activity/RecoveryTrendCard';
import TrainingRibbon from './activity/TrainingRibbon';
import { CollapsibleSection } from './activity/layout';
import {
  getWeeklyPace,
  getActivityBreakdown,
  getSevenDayTrend,
  getConsistencyGrid,
  getIntensityMix,
  getTimeOfDayPattern,
  getPersonalBests,
  getMuscleBalance,
  getMoodActivityLink,
  getNextSessionSuggestion,
  groupSessionsByDay,
  getTopExercises,
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
  const trend = getSevenDayTrend(activities);
  const consistency = getConsistencyGrid(activities, { weeks: 5 });
  const intensityMix = getIntensityMix(activities);
  const timeOfDay = getTimeOfDayPattern(activities);
  const bests = getPersonalBests(activities);
  const balance = getMuscleBalance(activities, getExerciseById);
  const moodLink = getMoodActivityLink(activities, moodTrend);
  const nextSession = getNextSessionSuggestion(pace, balance, backendRecommendation);
  const sessionGroups = groupSessionsByDay(activities, { limit: 15 });

  // The ribbon summarises the week section, so tapping it opens that section
  // rather than navigating away from the summary you just read.
  const [weekOpen, setWeekOpen] = useState(false);
  const handleOpenWeek = useCallback(() => setWeekOpen((v) => !v), []);
  const topExercises = getTopExercises(activities, 5);
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
        subtitle={`${pace?.minutes || 0} of ${pace?.targetMinutes || 150} min`}
        open={weekOpen}
        onToggle={setWeekOpen}
      >
        <WeeklyProgressHero pace={pace} trend={trend} />
        <RecoveryTrendCard history={recoveryHistory} chartWidth={chartWidth} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Patterns"
        subtitle={
          consistency?.trainedDays
            ? `${consistency.trainedDays} of last ${consistency.elapsedDays} days trained`
            : 'Consistency, intensity and timing'
        }
      >
        <WeekComparisonCard trend={trend} />
        <ConsistencyHeatmap consistency={consistency} />
        <IntensityMixCard mix={intensityMix} />
        <TimeOfDayCard pattern={timeOfDay} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Progress"
        subtitle={
          streak?.current
            ? `${streak.current} day streak · bests, balance and mood`
            : 'Bests, balance and mood'
        }
      >
        <PersonalBestsCard bests={bests} streak={streak} />
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
        {/* By activity type — works for rows without exercise identity */}
        {Object.keys(breakdown).length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>By activity type</Text>
            </View>
            <View style={styles.breakdownList}>
              {Object.entries(breakdown).map(([category, data], index) => (
                <View key={category} style={styles.breakdownItem}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownDot, { backgroundColor: getCategoryColor(index) }]} />
                    <Text style={styles.breakdownCategory}>{category}</Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <Text style={styles.breakdownCalories}>{Math.round(data.duration)} min</Text>
                    <Text style={styles.breakdownPercentage}>{Math.round(data.calories)} kcal</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        {/* Top Exercises */}
        {topExercises.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Top Exercises</Text>
            </View>
            <View style={styles.exerciseList}>
              {topExercises.map((exercise, index) => (
                <View key={index} style={styles.exerciseItem}>
                  <View style={styles.exerciseRank}>
                    <Text style={styles.exerciseRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.exerciseIconContainer}>
                    <Ionicons name={exercise.icon} size={20} color="#6366F1" />
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseStats}>
                      {exercise.count}x • {Math.round(exercise.totalDuration)} min • {Math.round(exercise.totalCalories)} kcal
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </CollapsibleSection>




      <CollapsibleSection
        title="History"
        subtitle={
          sessionGroups.length
            ? `${sessionGroups.reduce((n, g) => n + g.sessions.length, 0)} recent sessions`
            : 'Recent sessions'
        }
      >
        <SessionTimeline groups={sessionGroups} onDelete={onDeleteActivity} isDeleting={isDeleting} />
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
const getCategoryColor = (index) => {
  const colors = [
    '#10B981', // Emerald Green - Cardio
    '#F59E0B', // Amber - Strength
    '#8B5CF6', // Purple - Yoga
    '#EC4899', // Pink - Sports
    '#3B82F6', // Blue - Swimming
    '#EF4444', // Red - HIIT
  ];
  return colors[index % colors.length];
};

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
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownCategory: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#1E293B',
  },
  breakdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownCalories: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#1E293B',
  },
  breakdownPercentage: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    width: 40,
    textAlign: 'right',
  },
  exerciseList: {
    gap: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseRankText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#6366F1',
  },
  exerciseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#1E293B',
  },
  exerciseStats: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: 2,
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
