import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, SURFACES, TYPOGRAPHY, VIBRANT_WELLNESS, SPACING, RADIUS, SHADOWS, SEMANTIC } from '../constants/premiumTheme';
import {
  PersonalBestsCard,
} from './activity/TrainingPatternCards';
import {
  MoodActivityCard,
  NextSessionCard,
} from './activity/TrainingFocusCards';
import { getExerciseById } from '../services/exerciseDatabase';
import TrainingCalendar from './activity/TrainingCalendar';
import SmartInsightsCard from './activity/SmartInsightsCard';
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
  getActivityCalendarDate,
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
  smartInsights,
  onRefresh,
  refreshing = false,
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
  const historyActiveDays = useMemo(
    () => new Set(
      activities
        .map((activity) => getActivityCalendarDate(activity)?.toDateString())
        .filter(Boolean)
    ).size,
    [activities]
  );
  const historyDateRange = useMemo(() => {
    const dates = activities
      .map((activity) => getActivityCalendarDate(activity))
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (dates.length === 0) return '';
    const format = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const first = format(dates[0]);
    const last = format(dates[dates.length - 1]);
    return first === last ? first : `${first}–${last}`;
  }, [activities]);

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


  const recoveryReliable = recovery?.coverage?.isReliable ?? Number.isFinite(recovery?.score);
  const recoveryScore = recoveryReliable ? Number(recovery?.score) : null;
  const headline = recoveryScore === null
    ? 'Build today’s readiness picture'
    : recoveryScore >= 80
      ? 'Ready for a stronger workout'
      : recoveryScore >= 60
        ? 'Good day to move'
        : recoveryScore >= 40
          ? 'Keep today’s effort moderate'
          : 'Make recovery the priority';
  const paceLabel = pace.percentage >= 100
    ? 'Weekly target complete'
    : pace.onPace
      ? `${pace.remainingMinutes} min to the weekly goal`
      : `${Math.abs(pace.deltaMinutes)} min behind today’s pace · ${pace.remainingMinutes} min to goal`;
  const weeklyStatus = pace.percentage >= 100
    ? { label: 'Goal met', color: SEMANTIC.success.base }
    : pace.onPace
      ? { label: 'On pace', color: SEMANTIC.success.base }
      : { label: 'Behind pace', color: SEMANTIC.warning.base };
  const recoverySignalCount = recovery?.coverage?.counted
    ?? recovery?.factors?.filter((factor) => factor?.counted ?? factor?.value !== null).length
    ?? 0;
  // Recovery has five configured inputs. Older servers reported the number of
  // returned factors as `total`, which made 4/4 look complete when mood was
  // actually missing.
  const recoverySignalTotal = Math.max(Number(recovery?.coverage?.total) || 0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VIBRANT_WELLNESS.activity.solid} colors={[VIBRANT_WELLNESS.activity.solid]} />}
    >
      <LinearGradient colors={['#F0FDF7', '#F8FBFF']} style={styles.overviewHero}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>TODAY’S TRAINING OUTLOOK</Text>
            <Text style={styles.heroTitle}>{headline}</Text>
            <Text style={styles.heroSubtitle}>
              {recoveryScore === null
                ? 'Log sleep or stress to make readiness guidance more personal.'
                : `${recovery?.label || 'Recovery'} recovery based on ${recoverySignalCount} of ${recoverySignalTotal} signals`}
            </Text>
          </View>
          <View style={[styles.recoveryOrb, { borderColor: recovery?.color || VIBRANT_WELLNESS.activity.solid }]}>
            <Text style={[styles.recoveryValue, { color: recovery?.color || VIBRANT_WELLNESS.activity.solid }]}>{recoveryScore ?? '—'}</Text>
            <Text style={styles.recoveryLabel}>recovery</Text>
          </View>
        </View>

      </LinearGradient>

      {activities.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><Ionicons name="walk-outline" size={30} color={VIBRANT_WELLNESS.activity.solid} /></View>
          <Text style={styles.emptyTitle}>Your training story starts here</Text>
          <Text style={styles.emptyText}>Log your first workout to unlock weekly pace, personal bests, patterns, and movement–mood comparisons.</Text>
          {!!onLogWorkout && <TouchableOpacity style={styles.emptyButton} onPress={onLogWorkout}><Text style={styles.emptyButtonText}>Log first workout</Text></TouchableOpacity>}
        </View>
      ) : (
        <>
          <View style={styles.weeklyCard} testID="weekly-training-card">
            <View style={styles.weeklyHeader}>
              <View style={styles.weeklyHeading}>
                <View style={styles.weeklyIcon}><Ionicons name="calendar-clear-outline" size={18} color={VIBRANT_WELLNESS.activity.solid} /></View>
                <View>
                  <Text style={styles.sectionEyebrow}>THIS WEEK</Text>
                  <Text style={styles.weeklyTitle}>Training progress</Text>
                </View>
              </View>
              <View style={[styles.statusPill, { backgroundColor: `${weeklyStatus.color}12` }]}>
                <Text style={[styles.statusText, { color: weeklyStatus.color }]}>{weeklyStatus.label}</Text>
              </View>
            </View>

            <View accessible accessibilityLabel={`${pace.minutes} of ${pace.targetMinutes} weekly activity minutes, ${paceLabel}`}>
              <View style={styles.weeklyValueRow}>
                <Text style={styles.weeklyValue}>{pace.minutes}</Text>
                <Text style={styles.weeklyUnit}> of {pace.targetMinutes} min</Text>
              </View>
              <View style={styles.weeklyTrack}><View style={[styles.weeklyFill, { width: `${Math.min(pace.percentage, 100)}%` }]} /></View>
              <Text style={[styles.paceLabel, { color: weeklyStatus.color }]}>{paceLabel}</Text>
            </View>

            <View style={styles.weeklyFacts}>
              <WeeklyFact
                value={`${pace.activeDays} / ${pace.elapsedDays}`}
                label="days with a workout"
                accessibilityLabel={`${pace.activeDays} of ${pace.elapsedDays} elapsed days have a workout this week`}
              />
              <View style={styles.factDivider} />
              <WeeklyFact value={pace.workoutCount} label={pace.workoutCount === 1 ? 'workout logged' : 'workouts logged'} />
              <View style={styles.factDivider} />
              <WeeklyFact value={streak?.current || 0} label="consecutive days" />
            </View>

            <CollapsibleSection
              embedded
              title="Calendar details"
              subtitle="Inspect any day, week or month"
              icon="calendar-number-outline"
              accent={VIBRANT_WELLNESS.activity.solid}
            >
              <TrainingCalendar buildMonth={buildMonth} buildStats={buildStats} highlights={sessionHighlights} onDelete={onDeleteActivity} isDeleting={isDeleting} />
            </CollapsibleSection>
          </View>

          <View style={styles.sectionIntro}>
            <Text style={styles.sectionEyebrow}>TODAY’S PLAN</Text>
          </View>
          <NextSessionCard suggestion={nextSession} onLogWorkout={onLogWorkout} />

          {!!recovery && (
            <CollapsibleSection title="Recovery details" subtitle="Signals, score factors and readiness trend" icon="pulse-outline" accent={recovery?.color || VIBRANT_WELLNESS.activity.solid} badge={`${recoverySignalCount}/${recoverySignalTotal}`}>
              <RecoveryHero detailOnly recovery={recovery} strainTarget={strainTarget} onLogSignal={onLogSignal} trend={<RecoveryTrendCard history={recoveryHistory} chartWidth={chartWidth} />} />
            </CollapsibleSection>
          )}

          <View style={styles.sectionIntro}>
            <Text style={styles.sectionEyebrow}>HISTORY & PATTERNS</Text>
            <Text style={styles.sectionTitle}>Your movement history</Text>
            <Text
              style={styles.sectionMeta}
              accessibilityLabel={`${activities.length} workouts logged on ${historyActiveDays} calendar days from ${historyDateRange}`}
            >
              {activities.length} workouts logged on {historyActiveDays} calendar days · {historyDateRange}
            </Text>
          </View>
          <CollapsibleSection title="Progress patterns" subtitle="Personal bests, streaks and movement–mood context" icon="trophy-outline" accent={VIBRANT_WELLNESS.activity.solid}>
            <PersonalBestsCard bests={bests} streak={streak} />
            <MoodActivityCard link={moodLink} />
          </CollapsibleSection>

          {!!smartInsights && (
            <CollapsibleSection title="Smart insights" subtitle="Optional AI review of your last 30 days" icon="sparkles-outline" accent={VIBRANT_WELLNESS.activity.solid} badge={smartInsights.insights?.length ? `${smartInsights.insights.length}` : undefined}>
              <SmartInsightsCard embedded {...smartInsights} />
            </CollapsibleSection>
          )}
        </>
      )}
    </ScrollView>
  );
}

function WeeklyFact({ value, label, accessibilityLabel }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={accessibilityLabel || `${value} ${label}`}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.secondary,
  },
  content: { padding: SPACING[4], paddingBottom: SPACING[10] },
  overviewHero: { borderRadius: RADIUS['2xl'], padding: SPACING[4], borderWidth: 1, borderColor: '#BDEAD6', marginBottom: SPACING[3], ...SHADOWS.sm },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[3] },
  heroCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9, letterSpacing: 1.05, fontFamily: TYPOGRAPHY.family.bold, color: VIBRANT_WELLNESS.activity.solid },
  heroTitle: { marginTop: 5, fontSize: TYPOGRAPHY.size['2xl'], lineHeight: 29, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  heroSubtitle: { marginTop: 5, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.secondary },
  recoveryOrb: { width: 78, height: 78, borderRadius: 25, borderWidth: 2, backgroundColor: '#FFFFFFAA', alignItems: 'center', justifyContent: 'center' },
  recoveryValue: { fontSize: 28, lineHeight: 31, fontFamily: TYPOGRAPHY.family.bold },
  recoveryLabel: { fontSize: 9, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.tertiary },
  weeklyCard: { padding: SPACING[4], borderRadius: RADIUS['2xl'], backgroundColor: SURFACES.card.primary, marginBottom: SPACING[5], ...SHADOWS.sm },
  weeklyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING[2], marginBottom: SPACING[3] },
  weeklyHeading: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  weeklyIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: `${VIBRANT_WELLNESS.activity.solid}12` },
  weeklyTitle: { marginTop: 2, fontSize: TYPOGRAPHY.size.md, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  statusPill: { paddingHorizontal: SPACING[3], paddingVertical: 6, borderRadius: RADIUS.full },
  statusText: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.bold },
  weeklyValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: SPACING[2] },
  weeklyValue: { fontSize: 28, lineHeight: 32, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  weeklyUnit: { fontSize: TYPOGRAPHY.size.xs, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary },
  weeklyTrack: { height: 8, borderRadius: 4, backgroundColor: '#E7ECE9', overflow: 'hidden' },
  weeklyFill: { height: '100%', borderRadius: 4, backgroundColor: VIBRANT_WELLNESS.activity.solid },
  paceLabel: { marginTop: 6, fontSize: 10, fontFamily: TYPOGRAPHY.family.semibold },
  weeklyFacts: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING[3], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  fact: { flex: 1, alignItems: 'center' },
  factValue: { fontSize: TYPOGRAPHY.size.md, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  factLabel: { marginTop: 1, fontSize: 9, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary },
  factDivider: { width: 1, height: 25, backgroundColor: SURFACES.divider },
  sectionIntro: { marginTop: SPACING[1], marginBottom: SPACING[3], paddingHorizontal: 2 },
  sectionEyebrow: { fontSize: 9, letterSpacing: 1, fontFamily: TYPOGRAPHY.family.bold, color: VIBRANT_WELLNESS.activity.solid },
  sectionTitle: { marginTop: 3, fontSize: TYPOGRAPHY.size.lg, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  sectionMeta: { marginTop: 4, fontSize: TYPOGRAPHY.size.xs, lineHeight: 17, fontFamily: TYPOGRAPHY.family.regular, color: TEXT.tertiary },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[8],
    paddingHorizontal: SPACING[5],
    borderRadius: RADIUS['2xl'],
    backgroundColor: SURFACES.card.primary,
    ...SHADOWS.sm,
  },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: `${VIBRANT_WELLNESS.activity.solid}12`, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginTop: SPACING[3],
    marginBottom: SPACING[2],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING[4],
  },
  emptyButton: {
    backgroundColor: VIBRANT_WELLNESS.activity.solid,
    paddingHorizontal: SPACING[5],
    minHeight: 46,
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
  },
  emptyButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#fff',
  },
});
