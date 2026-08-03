/**
 * WhatYouTrainedCard
 *
 * Replaces two cards that answered the same question at different zoom levels:
 * "By activity type" (Cardio 140 kcal) sat directly above "Top Exercises"
 * (Cardio 1x 5 min 35 kcal) — the same rows, sliced twice.
 *
 * This shows the most specific breakdown the data supports. Once sessions
 * carry exercise identity (migration 0041) it names the movement — "Leg
 * Press", "Lat Pulldown". For older rows that only have a coarse type it falls
 * back to the type, and says which it is showing so the two are never confused.
 *
 * Muscle balance stays a separate card: "am I neglecting legs" is a different
 * question from "what did I do", and it is the only one that needs answering
 * even when the answer is uncomfortable.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  BRAND,
} from '../../constants/premiumTheme';

export default function WhatYouTrainedCard({ byExercise = [], byType = {}, limit = 5 }) {
  // Prefer named exercises; fall back to coarse types for rows without identity
  const usingExercises = byExercise.length > 0;

  const rows = usingExercises
    ? byExercise.slice(0, limit).map((entry) => ({
        key: entry.exerciseId || entry.name,
        name: entry.name,
        minutes: entry.minutes,
        calories: entry.calories,
        count: entry.count,
      }))
    : Object.entries(byType)
        .slice(0, limit)
        .map(([category, data]) => ({
          key: category,
          name: category,
          minutes: Math.round(data.duration || 0),
          calories: Math.round(data.calories || 0),
          count: data.count || 0,
        }));

  if (rows.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>What you trained</Text>
        <Text style={styles.empty}>Nothing logged in this window yet.</Text>
      </View>
    );
  }

  const peak = Math.max(...rows.map((r) => r.minutes), 1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>What you trained</Text>
        <Text style={styles.meta}>{usingExercises ? 'by exercise' : 'by type'}</Text>
      </View>

      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <View style={styles.labelWrap}>
            <Text style={styles.name} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={styles.stats}>
              {row.count}× · {row.calories} kcal
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(row.minutes / peak) * 100}%` }]} />
          </View>
          <Text style={styles.minutes}>{row.minutes}m</Text>
        </View>
      ))}

      {!usingExercises && (
        <Text style={styles.note}>
          Individual exercises appear here once you log from the Activity tab.
        </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  meta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  empty: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  labelWrap: {
    width: 116,
  },
  name: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  stats: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
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
  minutes: {
    width: 38,
    textAlign: 'right',
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  note: {
    marginTop: SPACING[2],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
});
