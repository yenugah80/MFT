/**
 * Wave 4 of the Activity Insights redesign.
 *
 * MuscleBalanceCard (design 5)  — what actually got trained
 * MoodActivityCard  (design 10) — whether moving changes how the day feels
 * NextSessionCard   (design 11) — what to do next, from real gaps
 *
 * Balance and next-session depend on exercise identity (migration 0041), which
 * only newly logged sessions carry. Both say so plainly rather than rendering
 * an empty chart that looks broken.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SEMANTIC,
  BRAND,
} from '../../constants/premiumTheme';

const GROUP_ORDER = ['Upper Body', 'Lower Body', 'Core', 'Full Body'];

export function MuscleBalanceCard({ balance, onLogWorkout }) {
  const { groups = [], stalest, unattributedMinutes = 0, hasData } = balance || {};
  const peak = Math.max(...groups.map((g) => g.minutes), 1);

  // Keep a stable visual order rather than reordering as volumes shift
  const ordered = [...groups].sort(
    (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Balance</Text>

      {!hasData ? (
        <>
          <Text style={styles.empty}>
            Which muscles you train is recorded from your next logged session onward.
            {unattributedMinutes > 0
              ? ` ${unattributedMinutes} min of earlier sessions could not be attributed.`
              : ''}
          </Text>
          {!!onLogWorkout && (
            <TouchableOpacity style={styles.ghostButton} onPress={onLogWorkout} activeOpacity={0.8}>
              <Text style={styles.ghostButtonText}>Log a workout</Text>
              <Ionicons name="chevron-forward" size={14} color={BRAND.primary} />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          {ordered.map((entry) => (
            <View key={entry.group} style={styles.row}>
              <Text style={styles.rowLabel}>{entry.group}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(entry.minutes / peak) * 100}%` }]} />
              </View>
              <Text style={styles.rowValue}>{entry.minutes}m</Text>
            </View>
          ))}

          {!!stalest && Number.isFinite(stalest.daysSince) && stalest.daysSince >= 4 && (
            <View style={styles.flag}>
              <Ionicons name="alert-circle-outline" size={15} color={SEMANTIC.warning.base} />
              <Text style={styles.flagText}>
                {stalest.group} last trained {stalest.daysSince} days ago
              </Text>
            </View>
          )}

          {unattributedMinutes > 0 && (
            <Text style={styles.note}>
              {unattributedMinutes} min from earlier sessions are not attributed to a muscle group.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

export function MoodActivityCard({ link }) {
  const {
    activeDays = 0,
    restDays = 0,
    activeMean,
    restMean,
    difference,
    hasComparison,
    sampleSize = 0,
  } = link || {};

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Movement &amp; mood</Text>

      {!hasComparison ? (
        <Text style={styles.empty}>
          {sampleSize === 0
            ? 'Log mood alongside your training and this will compare how active and rest days feel.'
            : `${activeDays} active and ${restDays} rest day${restDays === 1 ? '' : 's'} rated so far — three of each are needed before a comparison means anything.`}
        </Text>
      ) : (
        <>
          <View style={styles.compareRow}>
            <View style={styles.compareCell}>
              <Text style={styles.compareValue}>{activeMean}</Text>
              <Text style={styles.compareLabel}>active days</Text>
              <Text style={styles.compareMeta}>n={activeDays}</Text>
            </View>
            <View style={styles.compareDivider} />
            <View style={styles.compareCell}>
              <Text style={styles.compareValue}>{restMean}</Text>
              <Text style={styles.compareLabel}>rest days</Text>
              <Text style={styles.compareMeta}>n={restDays}</Text>
            </View>
          </View>

          <Text style={styles.note}>
            {difference > 0
              ? `Mood averages ${difference} points higher on days you move.`
              : difference < 0
              ? `Mood averages ${Math.abs(difference)} points lower on days you move.`
              : 'Mood averages the same either way.'}{' '}
            Based on {sampleSize} rated days — a pattern, not a cause.
          </Text>
        </>
      )}
    </View>
  );
}

export function NextSessionCard({ suggestion, onLogWorkout }) {
  const { focus, minutes = 30, reasons = [], hasSuggestion } = suggestion || {};

  if (!hasSuggestion) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Next session</Text>
        <Text style={styles.empty}>
          You are on top of the week and nothing has gone stale. Train because you want to.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Next session</Text>

      <Text style={styles.suggestion}>
        {focus ? `${focus} · ` : ''}
        {minutes} min
      </Text>

      {reasons.map((reason) => (
        <View key={reason} style={styles.reasonRow}>
          <View style={styles.reasonDot} />
          <Text style={styles.reasonText}>{reason}</Text>
        </View>
      ))}

      {!!onLogWorkout && (
        <TouchableOpacity style={styles.primaryButton} onPress={onLogWorkout} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {focus ? `Find ${focus.toLowerCase()} exercises` : 'Log a workout'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOWS.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  empty: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    lineHeight: 19,
  },
  note: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 17,
  },

  // Balance
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  rowLabel: {
    width: 84,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: `${BRAND.primary}18`,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: BRAND.primary,
  },
  rowValue: {
    width: 40,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[2],
  },
  flagText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: SEMANTIC.warning.base,
  },

  // Mood comparison
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compareCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  compareDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  compareValue: {
    fontSize: 28,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  compareLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  compareMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },

  // Next session
  suggestion: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginBottom: SPACING[1],
  },
  reasonDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TEXT.tertiary,
    marginTop: 7,
  },
  reasonText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 17,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: BRAND.primary,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#fff',
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    marginTop: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    backgroundColor: `${BRAND.primary}12`,
  },
  ghostButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
});
