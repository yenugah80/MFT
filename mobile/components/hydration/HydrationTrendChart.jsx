/**
 * HydrationTrendChart - vertical day-by-day bars with a goal reference line
 *
 * The analytics tab only ever showed *today* (ring + glasses grid), which is
 * the same number the tracker modal already shows. This is the piece that
 * makes a separate analytics screen worth opening: how the last N days
 * actually went, and which of them cleared the goal.
 *
 * Days that met goal use the solid hydration blue; misses use a lighter tint
 * so the shortfall reads at a glance without turning into a red/green scorecard.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TEXT, SURFACES, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/premiumTheme';
import { groupHydrationSeriesByWeek } from '../../utils/hydrationHistory';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const HYDRATION = {
  met: '#0891B2',
  partial: '#7DD3EF',
  empty: '#E2E8F0',
  goalLine: '#94A3B8',
  today: '#0369A1',
};

function formatAxisDate(dateKey) {
  if (!dateKey) return '';
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return '';
  return `${month}/${day}`;
}

export default function HydrationTrendChart({
  series = [],
  goalMl = 2000,
  height = 150,
  compact = false,
}) {
  const isWeekly = series.length > 14;
  const chartSeries = useMemo(
    () => (isWeekly ? groupHydrationSeriesByWeek(series, goalMl) : series),
    [goalMl, isWeekly, series],
  );

  // Scale to whichever is larger, the goal or the best day, plus headroom.
  // Without the headroom, a user who has never exceeded their goal gets
  // maxValue === goalMl, which puts the goal line at bottom:height, i.e.
  // entirely ABOVE the plot box, where its label collides with the card title.
  const maxValue = useMemo(() => {
    const best = chartSeries.reduce((m, d) => Math.max(m, d.ml || 0), 0);
    return Math.max(goalMl, best, 1) * 1.12;
  }, [chartSeries, goalMl]);

  if (!series.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No history yet</Text>
      </View>
    );
  }

  const goalRatio = Math.min(goalMl / maxValue, 1);
  const condensedAxis = isWeekly;
  const axisLabelCount = Math.min(chartSeries.length, chartSeries.length > 8 ? 5 : chartSeries.length);
  const condensedAxisIndexes = condensedAxis
    ? Array.from({ length: axisLabelCount }, (_, index) => (
      axisLabelCount === 1
        ? 0
        : Math.round((index * (chartSeries.length - 1)) / (axisLabelCount - 1))
    ))
    : [];
  const barGap = isWeekly ? SPACING[2] : SPACING[1];

  return (
    <View>
      <View style={[styles.plot, { height }]}>
        {/* Goal reference line */}
        <View
          style={[styles.goalLine, { bottom: goalRatio * height }]}
          pointerEvents="none"
        >
          {/* Explicit dash segments: RN's borderStyle:'dashed' needs a full
              border box and renders solid on Android with only a bottom width. */}
          <View style={styles.goalDash}>
            {Array.from({ length: 22 }).map((_, i) => (
              <View key={i} style={styles.goalDashSegment} />
            ))}
          </View>
          <Text style={styles.goalLabel}>{(goalMl / 1000).toFixed(1)}L</Text>
        </View>

        <View style={[styles.bars, { gap: barGap }]}>
          {chartSeries.map((day, index) => {
            const ratio = Math.min((day.ml || 0) / maxValue, 1);
            const barHeight = Math.max(ratio * height, day.ml > 0 ? 4 : 3);
            const metGoal = (day.ml || 0) >= goalMl;
            const color = day.ml > 0
              ? (metGoal ? HYDRATION.met : HYDRATION.partial)
              : HYDRATION.empty;

            return (
              <View key={day.date || index} style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: color,
                      borderRadius: RADIUS.sm,
                      borderWidth: day.isToday ? 2 : 0,
                      borderColor: HYDRATION.today,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Day labels */}
      {condensedAxis ? (
        <View style={styles.condensedLabels}>
          {condensedAxisIndexes.map((index) => {
            const day = chartSeries[index];
            return (
              <Text
                key={`label-${day?.date || index}`}
                style={[styles.condensedLabel, day?.isToday && styles.labelToday]}
                numberOfLines={1}
              >
                {formatAxisDate(day?.date)}
              </Text>
            );
          })}
        </View>
      ) : (
        <View style={[styles.labels, { gap: barGap }]}>
          {chartSeries.map((day, index) => (
            <View key={`label-${day.date || index}`} style={styles.barSlot}>
              <Text
                style={[styles.label, day.isToday && styles.labelToday]}
                numberOfLines={1}
              >
                {DAY_INITIALS[day.dayOfWeek]}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!compact && (
        <View style={styles.legend}>
          <LegendDot color={HYDRATION.met} label="Goal met" />
          <LegendDot color={HYDRATION.partial} label="Under goal" />
          <LegendDot color={HYDRATION.empty} label="No logs" />
        </View>
      )}
    </View>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    justifyContent: 'flex-end',
    position: 'relative',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
  },
  barSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '78%',
    maxWidth: 28,
    borderRadius: RADIUS.sm,
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  goalDash: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 1,
    overflow: 'hidden',
  },
  goalDashSegment: {
    flex: 1,
    height: 1,
    marginRight: 3,
    backgroundColor: HYDRATION.goalLine,
    opacity: 0.7,
  },
  goalLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  labels: {
    flexDirection: 'row',
    marginTop: SPACING[2],
  },
  condensedLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[2],
  },
  condensedLabel: {
    minWidth: 30,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  labelToday: {
    color: HYDRATION.today,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[4],
    marginTop: SPACING[3],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
});
