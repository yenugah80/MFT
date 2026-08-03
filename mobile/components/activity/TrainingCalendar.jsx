/**
 * TrainingCalendar
 *
 * Merges consistency and history into one thing, because they were always the
 * same data: the heatmap showed which days you trained, the timeline showed
 * what you did on them, and you had to hold one in your head while reading the
 * other.
 *
 * Each day is a ring rather than a square. A square can only say yes or no; a
 * ring says how much — filled against a day's share of the weekly target. A
 * month of light training and a month of hard training look different, which
 * is the whole point of looking at a month.
 *
 * Tapping a day fills the panel below it. Nothing is computed on tap: the
 * sessions already travel with the cell.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ACTIVITY_TYPES } from '../../hooks/useActivityLog';
import { resolveIntensity } from '../../services/exerciseDatabase';
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

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const RING = 30;
const STROKE = 3;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

const typeLabel = (type) =>
  ACTIVITY_TYPES.find((t) => t.key === type)?.label || type || 'Activity';

function DayRing({ cell, selected, onPress }) {
  const dim = !cell.inMonth || cell.isFuture;

  return (
    <TouchableOpacity
      style={styles.cell}
      onPress={() => onPress(cell)}
      disabled={cell.isFuture || !cell.inMonth}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={
        cell.trained
          ? `${cell.date.toDateString()}, ${cell.minutes} minutes`
          : `${cell.date.toDateString()}, no training`
      }
    >
      <Svg width={RING} height={RING}>
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          stroke={selected ? BRAND.primary : `${BRAND.primary}1A`}
          strokeWidth={selected ? 2 : STROKE}
          fill={cell.isToday ? `${BRAND.primary}12` : 'transparent'}
        />
        {cell.progress > 0 && (
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            stroke={cell.progress >= 1 ? SEMANTIC.success.base : BRAND.primary}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={CIRC * (1 - cell.progress)}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        )}
      </Svg>
      <Text
        style={[
          styles.dayNumber,
          dim && styles.dayNumberDim,
          cell.isToday && styles.dayNumberToday,
        ]}
      >
        {cell.dayOfMonth}
      </Text>
    </TouchableOpacity>
  );
}

export default function TrainingCalendar({
  activities,
  buildMonth,
  highlights,
  onDelete,
  isDeleting,
}) {
  const [monthsAgo, setMonthsAgo] = useState(0);
  const [selectedKey, setSelectedKey] = useState(null);

  const month = useMemo(() => buildMonth(monthsAgo), [buildMonth, monthsAgo]);

  const step = useCallback((delta) => {
    Haptics.selectionAsync();
    setSelectedKey(null);
    setMonthsAgo((value) => Math.max(0, value + delta));
  }, []);

  const selectDay = useCallback((cell) => {
    Haptics.selectionAsync();
    setSelectedKey((current) => (current === cell.dayKey ? null : cell.dayKey));
  }, []);

  const cells = month.weeks.flat();
  // Default to today so the panel is never empty on arrival
  const selected =
    cells.find((c) => c.dayKey === selectedKey) ||
    cells.find((c) => c.isToday && c.inMonth) ||
    null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step(1)} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={18} color={TEXT.secondary} />
        </TouchableOpacity>
        <Text style={styles.month}>{month.monthLabel}</Text>
        <TouchableOpacity
          onPress={() => step(-1)}
          hitSlop={10}
          activeOpacity={0.7}
          disabled={!month.canGoForward}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={month.canGoForward ? TEXT.secondary : TEXT.muted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeader}>
        {DAY_INITIALS.map((initial, index) => (
          <Text key={`${initial}-${index}`} style={styles.weekHeaderText}>
            {initial}
          </Text>
        ))}
      </View>

      {month.weeks.map((week, index) => (
        <View key={index} style={styles.week}>
          {week.map((cell) => (
            <DayRing
              key={cell.dayKey}
              cell={cell}
              selected={selected?.dayKey === cell.dayKey}
              onPress={selectDay}
            />
          ))}
        </View>
      ))}

      <Text style={styles.summary}>
        {month.trainedDays} of {month.elapsedDays} days · {month.totalMinutes} min
        {month.dailyTarget ? ` · rings fill at ${month.dailyTarget} min` : ''}
      </Text>

      {!!selected && (
        <View style={styles.detail}>
          <Text style={styles.detailDate}>
            {selected.date.toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </Text>

          {selected.sessions.length === 0 ? (
            <Text style={styles.detailEmpty}>Rest day</Text>
          ) : (
            selected.sessions.map((activity, index) => {
              const intensity = resolveIntensity(activity.intensity);
              const coarse = typeLabel(activity.type);
              const name = activity.exerciseName || coarse;
              const badge = highlights?.get?.(activity.id);

              return (
                <View key={activity.id ?? index} style={styles.session}>
                  <View style={[styles.dot, { backgroundColor: intensity.color }]} />
                  <View style={styles.sessionBody}>
                    <Text style={styles.sessionName} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {activity.duration || 0} min · {intensity.label.toLowerCase()}
                      {activity.calories ? ` · ${Math.round(activity.calories)} kcal` : ''}
                    </Text>
                    {!!badge && (
                      <View style={styles.badge}>
                        <Ionicons name="trophy" size={10} color={SEMANTIC.warning.base} />
                        <Text style={styles.badgeText}>{badge}</Text>
                      </View>
                    )}
                  </View>
                  {!!onDelete && (
                    <TouchableOpacity
                      onPress={() => onDelete(activity.id)}
                      hitSlop={10}
                      disabled={isDeleting}
                      accessibilityLabel={`Delete ${name}`}
                    >
                      <Ionicons name="trash-outline" size={16} color={SEMANTIC.danger.base} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
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
  month: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: SPACING[1],
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },
  week: {
    flexDirection: 'row',
    marginBottom: SPACING[1],
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: RING + 4,
  },
  dayNumber: {
    position: 'absolute',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  dayNumberDim: {
    color: TEXT.muted,
    opacity: 0.5,
  },
  dayNumberToday: {
    color: BRAND.primary,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  summary: {
    marginTop: SPACING[2],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  detail: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  detailDate: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.tertiary,
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  detailEmpty: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },
  session: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    marginBottom: SPACING[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  sessionBody: {
    flex: 1,
  },
  sessionName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  sessionMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: 3,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: `${SEMANTIC.warning.base}18`,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.bold,
    color: SEMANTIC.warning.base,
  },
});
