/**
 * Wave 3 of the Activity Insights redesign.
 *
 * IntensityMixCard (design 4)  — how hard the training was
 * TimeOfDayCard   (design 6)  — when it actually happens
 * PersonalBestsCard (design 8) — the records, degrading honestly at low volume
 *
 * Each refuses to state a pattern it cannot support: the time-of-day card
 * needs five sessions before it will claim a habit, and the bests card shows
 * the single session you have rather than dressing it up as a record.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

const INTENSITY_META = {
  light: { label: 'Light', color: SEMANTIC.success.base },
  moderate: { label: 'Moderate', color: SEMANTIC.warning.base },
  vigorous: { label: 'Vigorous', color: SEMANTIC.danger.base },
};

const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

export function IntensityMixCard({ mix }) {
  const { minutes = {}, shares = {}, total = 0, dominant, guidelineMinutes = 0, hasData } = mix || {};

  return (
    <View style={styles.card}>
      <Text style={styles.title}>How hard you trained</Text>

      {!hasData ? (
        <Text style={styles.empty}>No sessions with a duration logged yet.</Text>
      ) : (
        <>
          <View style={styles.stack}>
            {['light', 'moderate', 'vigorous'].map((key) =>
              minutes[key] > 0 ? (
                <View
                  key={key}
                  style={{
                    flex: minutes[key],
                    backgroundColor: INTENSITY_META[key].color,
                  }}
                />
              ) : null
            )}
          </View>

          <View style={styles.legendRow}>
            {['light', 'moderate', 'vigorous'].map((key) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: INTENSITY_META[key].color }]} />
                <Text style={styles.legendText}>
                  {INTENSITY_META[key].label} {minutes[key] || 0}m
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.note}>
            Mostly {INTENSITY_META[dominant]?.label?.toLowerCase() || 'moderate'} ({shares[dominant] || 0}% of {total} min).
            {minutes.vigorous > 0
              ? ` Vigorous minutes count double, so this is worth ${guidelineMinutes} guideline minutes.`
              : ' Vigorous minutes count double toward the guideline.'}
          </Text>
        </>
      )}
    </View>
  );
}

export function TimeOfDayCard({ pattern }) {
  const { buckets = [], totalSessions = 0, dominant, hasPattern } = pattern || {};
  const peak = Math.max(...buckets.map((b) => b.sessions), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>When you train</Text>

      {totalSessions === 0 ? (
        <Text style={styles.empty}>Nothing logged yet.</Text>
      ) : (
        <>
          {buckets.map((bucket) => (
            <View key={bucket.key} style={styles.bucketRow}>
              <Text style={styles.bucketLabel}>{bucket.label}</Text>
              <View style={styles.bucketTrack}>
                <View
                  style={[
                    styles.bucketFill,
                    {
                      width: `${(bucket.sessions / peak) * 100}%`,
                      backgroundColor: dominant?.key === bucket.key ? BRAND.primary : `${BRAND.primary}55`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.bucketValue}>{bucket.sessions}</Text>
            </View>
          ))}

          <Text style={styles.note}>
            {hasPattern
              ? `You train ${dominant.label.toLowerCase()}s ${dominant.share}% of the time, averaging ${dominant.averageMinutes} min.`
              : `${totalSessions} session${totalSessions === 1 ? '' : 's'} so far — a few more and a pattern will show here.`}
          </Text>
        </>
      )}
    </View>
  );
}

export function PersonalBestsCard({ bests, streak }) {
  const { longestSession, biggestBurn, bestWeek, totalSessions = 0 } = bests || {};

  const rows = [
    longestSession && {
      icon: 'time-outline',
      label: 'Longest session',
      value: `${longestSession.duration} min`,
      meta: shortDate(longestSession.timestamp),
    },
    biggestBurn && {
      icon: 'flame-outline',
      label: 'Biggest burn',
      value: `${Math.round(biggestBurn.calories)} kcal`,
      meta: shortDate(biggestBurn.timestamp),
    },
    bestWeek && {
      icon: 'calendar-outline',
      label: 'Best week',
      value: `${bestWeek.minutes} min`,
      meta: `${bestWeek.sessions} session${bestWeek.sessions === 1 ? '' : 's'}`,
    },
    {
      icon: 'flash-outline',
      label: 'Current streak',
      value: `${streak?.current || 0} day${(streak?.current || 0) === 1 ? '' : 's'}`,
      meta: streak?.longest ? `best ${streak.longest}` : null,
    },
  ].filter(Boolean);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your bests</Text>

      {totalSessions === 0 ? (
        <Text style={styles.empty}>Log a session and your records start here.</Text>
      ) : (
        <>
          {rows.map((row) => (
            <View key={row.label} style={styles.bestRow}>
              <Ionicons name={row.icon} size={17} color={BRAND.primary} />
              <Text style={styles.bestLabel}>{row.label}</Text>
              <Text style={styles.bestValue}>{row.value}</Text>
              {!!row.meta && <Text style={styles.bestMeta}>{row.meta}</Text>}
            </View>
          ))}
          {totalSessions < 5 && (
            <Text style={styles.note}>
              Based on {totalSessions} session{totalSessions === 1 ? '' : 's'} — these will move as you log more.
            </Text>
          )}
        </>
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
  },
  note: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 17,
  },

  // Intensity
  stack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
    marginTop: SPACING[3],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },

  // Time of day
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  bucketLabel: {
    width: 62,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  bucketTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  bucketFill: {
    height: '100%',
    borderRadius: 4,
  },
  bucketValue: {
    width: 22,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },

  // Bests
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
  },
  bestLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  bestValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  bestMeta: {
    width: 74,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
});
