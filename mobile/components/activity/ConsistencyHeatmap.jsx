/**
 * ConsistencyHeatmap (design 2)
 *
 * Five weeks of trained / rest days. Deliberately honest at low volume: a
 * sparse history looks sparse, because the point of the card is to show
 * whether the habit is holding, not to flatter it.
 *
 * Days that have not happened yet are drawn as outlines rather than rest days.
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

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const formatRange = (start, end) => {
  if (!start) return null;
  const opts = { month: 'short', day: 'numeric' };
  const from = start.toLocaleDateString('en-US', opts);
  if (!end || start.toDateString() === end.toDateString()) return from;
  return `${from}–${end.toLocaleDateString('en-US', { day: 'numeric' })}`;
};

/** Deeper fill for a harder session, so volume reads at a glance */
const intensityFor = (minutes) => {
  if (minutes >= 60) return 1;
  if (minutes >= 30) return 0.75;
  if (minutes >= 15) return 0.55;
  return 0.4;
};

export default function ConsistencyHeatmap({ consistency }) {
  const {
    grid = [],
    trainedDays = 0,
    elapsedDays = 0,
    longestGap = 0,
    longestGapStart,
    longestGapEnd,
  } = consistency || {};

  const gapRange = formatRange(longestGapStart, longestGapEnd);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Consistency</Text>
        <Text style={styles.headerMeta}>
          {trainedDays} of last {elapsedDays} days
        </Text>
      </View>

      <View style={styles.dayHeaderRow}>
        {DAY_INITIALS.map((initial, index) => (
          <Text key={`${initial}-${index}`} style={styles.dayHeader}>
            {initial}
          </Text>
        ))}
      </View>

      {grid.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day) => (
            <View key={day.dayKey} style={styles.cellWrap}>
              <View
                style={[
                  styles.cell,
                  day.isFuture && styles.cellFuture,
                  day.trained && {
                    backgroundColor: BRAND.primary,
                    opacity: intensityFor(day.minutes),
                  },
                  day.isToday && styles.cellToday,
                ]}
              />
            </View>
          ))}
        </View>
      ))}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.cell} />
          <Text style={styles.legendText}>rest</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.cell, { backgroundColor: BRAND.primary, opacity: 0.55 }]} />
          <Text style={styles.legendText}>trained</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.cell, styles.cellToday]} />
          <Text style={styles.legendText}>today</Text>
        </View>
      </View>

      {longestGap > 1 && (
        <Text style={styles.footnote}>
          Longest break: {longestGap} days{gapRange ? ` (${gapRange})` : ''}
        </Text>
      )}
      {trainedDays === 0 && (
        <Text style={styles.footnote}>No sessions logged in this window yet.</Text>
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
  headerMeta: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },

  dayHeaderRow: {
    flexDirection: 'row',
    marginBottom: SPACING[1],
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cellWrap: {
    flex: 1,
    alignItems: 'center',
  },
  cell: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  cellFuture: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cellToday: {
    borderWidth: 2,
    borderColor: BRAND.primary,
  },

  legend: {
    flexDirection: 'row',
    gap: SPACING[4],
    alignItems: 'center',
    marginTop: SPACING[3],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  footnote: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
});
