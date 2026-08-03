/**
 * ActivityInsightCard
 *
 * Activity's slot on the Insights summary. The generic metric card ("N min avg"
 * plus a sparkline) says nothing about what was actually trained, so this one
 * reports the concrete picture: what got logged this period, how it splits by
 * activity type, progress against the weekly target, and the most recent session.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ACTIVITY_TYPES } from '../../hooks/useActivityLog';
import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SEMANTIC,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

const ACCENT = VIBRANT_WELLNESS.activity.solid;

const typeLabel = (type) =>
  ACTIVITY_TYPES.find((t) => t.key === type)?.label || type || 'Activity';

/** "today", "yesterday", or a short date */
const relativeDay = (stamp) => {
  if (!stamp) return '';
  const date = new Date(stamp);
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((dayStart(new Date()) - dayStart(date)) / 86400000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function Stat({ icon, color, value, label }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ActivityInsightCard({ data, period, onPress }) {
  const {
    totalMinutes = 0,
    totalCalories = 0,
    workoutCount = 0,
    activeDays = 0,
    periodDays = 7,
    byType = [],
    lastWorkout,
    changePercent,
    target = 150,
    weeklyMinutes = 0,
  } = data || {};

  const periodLabel = period === 'week' ? 'this week' : 'this month';
  const hasActivity = workoutCount > 0;
  const goalPercent = target > 0 ? Math.min(Math.round((weeklyMinutes / target) * 100), 100) : 0;
  const topTypes = byType.slice(0, 3);
  const maxTypeMinutes = topTypes.length > 0 ? topTypes[0].minutes : 0;
  // null when there was no activity in the previous period to compare against
  const hasTrend = Number.isFinite(changePercent) && changePercent !== 0;
  const trendUp = changePercent > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="fitness" size={22} color={ACCENT} />
        </View>
        <Text style={styles.title}>Activity</Text>
        {hasActivity && hasTrend && (
          <View
            style={[
              styles.trendPill,
              { backgroundColor: `${trendUp ? SEMANTIC.success.base : SEMANTIC.danger.base}15` },
            ]}
          >
            <Ionicons
              name={trendUp ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={trendUp ? SEMANTIC.success.base : SEMANTIC.danger.base}
            />
            <Text
              style={[
                styles.trendText,
                { color: trendUp ? SEMANTIC.success.base : SEMANTIC.danger.base },
              ]}
            >
              {Math.abs(changePercent)}%
            </Text>
          </View>
        )}
        {!!onPress && <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />}
      </View>

      {!hasActivity ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No workouts logged {periodLabel}</Text>
          <Text style={styles.emptyText}>
            Log a session from the Activity tab and your training shows up here.
          </Text>
        </View>
      ) : (
        <>
          {/* Headline */}
          <View style={styles.headline}>
            <Text style={styles.headlineValue}>{totalMinutes}</Text>
            <Text style={styles.headlineUnit}>min {periodLabel}</Text>
          </View>

          {/* Concrete counts */}
          <View style={styles.statsRow}>
            <Stat icon="flame" color={SEMANTIC.warning.base} value={totalCalories} label="kcal" />
            <View style={styles.statDivider} />
            <Stat icon="barbell" color={ACCENT} value={workoutCount} label={workoutCount === 1 ? 'workout' : 'workouts'} />
            <View style={styles.statDivider} />
            <Stat
              icon="calendar"
              color={TEXT.secondary}
              value={`${activeDays}/${periodDays}`}
              label="active days"
            />
          </View>

          {/* What was trained */}
          <View style={styles.breakdown}>
            {topTypes.map((entry) => (
              <View key={entry.type} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel} numberOfLines={1}>
                  {typeLabel(entry.type)}
                </Text>
                <View style={styles.breakdownTrack}>
                  <View
                    style={[
                      styles.breakdownFill,
                      { width: `${maxTypeMinutes > 0 ? (entry.minutes / maxTypeMinutes) * 100 : 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.breakdownValue}>{entry.minutes}m</Text>
              </View>
            ))}
            {byType.length > topTypes.length && (
              <Text style={styles.breakdownMore}>
                +{byType.length - topTypes.length} more activity {byType.length - topTypes.length === 1 ? 'type' : 'types'}
              </Text>
            )}
          </View>

          {/* Weekly target — always the current week, whatever period is selected */}
          <View style={styles.goal}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Weekly target</Text>
              <Text style={styles.goalValue}>
                {weeklyMinutes} / {target} min
              </Text>
            </View>
            <View style={styles.goalTrack}>
              <View style={[styles.goalFill, { width: `${goalPercent}%` }]} />
            </View>
          </View>

          {/* Most recent session */}
          {!!lastWorkout && (
            <Text style={styles.footer}>
              Last: {typeLabel(lastWorkout.type)} • {lastWorkout.durationMinutes} min •{' '}
              {relativeDay(lastWorkout.loggedAt || lastWorkout.createdAt)}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOWS.sm,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${ACCENT}15`,
  },
  title: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
  },
  trendText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  headline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[1],
    marginBottom: SPACING[3],
  },
  headlineValue: {
    fontSize: 32,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headlineUnit: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[3],
    marginBottom: SPACING[3],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  breakdown: {
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  breakdownLabel: {
    width: 78,
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  breakdownTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${ACCENT}20`,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  breakdownValue: {
    width: 42,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  breakdownMore: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  goal: {
    marginBottom: SPACING[2],
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  goalLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  goalValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  goalTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: `${ACCENT}20`,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: ACCENT,
  },

  footer: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  empty: {
    gap: SPACING[1],
    paddingBottom: SPACING[1],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    lineHeight: 18,
  },
});
