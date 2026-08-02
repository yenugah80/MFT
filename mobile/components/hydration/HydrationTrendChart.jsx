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

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const HYDRATION = {
  met: '#0891B2',
  partial: '#7DD3EF',
  empty: '#E2E8F0',
  goalLine: '#94A3B8',
  today: '#0369A1',
};

export default function HydrationTrendChart({
  series = [],
  goalMl = 2000,
  height = 150,
  compact = false,
}) {
  // Scale to whichever is larger — the goal or the best day — plus headroom.
  // Without the headroom, a user who has never exceeded their goal gets
  // maxValue === goalMl, which puts the goal line at bottom:height, i.e.
  // entirely ABOVE the plot box, where its label collides with the card title.
  const maxValue = useMemo(() => {
    const best = series.reduce((m, d) => Math.max(m, d.ml || 0), 0);
    return Math.max(goalMl, best, 1) * 1.12;
  }, [series, goalMl]);

  if (!series.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No history yet</Text>
      </View>
    );
  }

  const goalRatio = Math.min(goalMl / maxValue, 1);
  // Show every other label on long ranges so the axis doesn't turn to mush
  const labelStride = series.length > 14 ? Math.ceil(series.length / 10) : 1;

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

        <View style={styles.bars}>
          {series.map((day, index) => {
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
      <View style={styles.labels}>
        {series.map((day, index) => {
          const show = index % labelStride === 0 || day.isToday;
          return (
            <View key={`label-${day.date || index}`} style={styles.barSlot}>
              <Text
                style={[styles.label, day.isToday && styles.labelToday]}
                numberOfLines={1}
              >
                {show ? DAY_INITIALS[day.dayOfWeek] : ''}
              </Text>
            </View>
          );
        })}
      </View>

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
    gap: SPACING[1],
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
    gap: SPACING[1],
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
