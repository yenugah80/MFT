/**
 * WeekComparisonCard (design 3)
 *
 * This week against last week, minute for minute, day by day. Minutes rather
 * than calories because minutes are what the weekly target is expressed in.
 *
 * The delta is null — not 0% — when last week has nothing to compare against,
 * and the card says so instead of implying the weeks were identical.
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
  SEMANTIC,
  BRAND,
} from '../../constants/premiumTheme';

const CHART_HEIGHT = 96;

export default function WeekComparisonCard({ trend }) {
  const days = trend?.days || [];
  const previousDays = trend?.previousDays || [];

  const thisWeekMinutes = trend?.thisWeekMinutes || 0;
  const prevWeekMinutes = trend?.prevWeekMinutes || 0;
  const change = trend?.minutesChangePercentage;
  const hasChange = Number.isFinite(change);

  // One scale for both series so the bars are actually comparable
  const peak = Math.max(
    ...days.map((d) => d.minutes || 0),
    ...previousDays.map((d) => d.minutes || 0),
    1
  );

  const heightFor = (minutes) => Math.max(minutes > 0 ? 4 : 0, ((minutes || 0) / peak) * CHART_HEIGHT);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Week over week</Text>
        {hasChange ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: `${change >= 0 ? SEMANTIC.success.base : SEMANTIC.danger.base}15`,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: change >= 0 ? SEMANTIC.success.base : SEMANTIC.danger.base },
              ]}
            >
              {change > 0 ? '▲ +' : change < 0 ? '▼ ' : ''}
              {change}%
            </Text>
          </View>
        ) : (
          <Text style={styles.noBaseline}>no baseline</Text>
        )}
      </View>

      <View style={styles.chart}>
        {days.map((day, index) => {
          const previous = previousDays[index];
          return (
            <View key={day.dayKey || index} style={styles.column}>
              <View style={styles.bars}>
                <View
                  style={[
                    styles.barPrevious,
                    { height: heightFor(previous?.minutes) },
                  ]}
                />
                <View
                  style={[
                    styles.barCurrent,
                    {
                      height: heightFor(day.minutes),
                      backgroundColor: day.isToday ? BRAND.primary : `${BRAND.primary}CC`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                {day.dayName?.[0]}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: BRAND.primary }]} />
          <Text style={styles.legendText}>This week {thisWeekMinutes} min</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, styles.swatchPrevious]} />
          <Text style={styles.legendText}>Last week {prevWeekMinutes} min</Text>
        </View>
      </View>
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
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  badge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  noBaseline: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },

  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 22,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: CHART_HEIGHT,
  },
  barPrevious: {
    width: 9,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  barCurrent: {
    width: 9,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  dayLabel: {
    marginTop: SPACING[1],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  dayLabelToday: {
    color: BRAND.primary,
    fontFamily: TYPOGRAPHY.family.bold,
  },

  legend: {
    flexDirection: 'row',
    gap: SPACING[4],
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
  swatchPrevious: {
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
});
