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

const INTENSITY_COLORS = {
  light: SEMANTIC.success.base,
  moderate: SEMANTIC.warning.base,
  vigorous: SEMANTIC.danger.base,
};

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

const SCOPES = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export default function TrainingCalendar({
  buildMonth,
  buildStats,
  highlights,
  onDelete,
  isDeleting,
}) {
  const [monthsAgo, setMonthsAgo] = useState(0);
  const [selectedKey, setSelectedKey] = useState(null);
  // What the panel below describes: the selected day, its week, or the month
  const [scope, setScope] = useState('week');

  const month = useMemo(() => buildMonth(monthsAgo), [buildMonth, monthsAgo]);

  const step = useCallback((delta) => {
    Haptics.selectionAsync();
    setSelectedKey(null);
    setMonthsAgo((value) => Math.max(0, value + delta));
  }, []);

  const selectDay = useCallback((cell) => {
    Haptics.selectionAsync();
    setSelectedKey(cell.dayKey);
  }, []);

  const chooseScope = useCallback((next) => {
    Haptics.selectionAsync();
    setScope(next);
  }, []);

  const cells = month.weeks.flat();
  // Default to today so the panel is never empty on arrival
  const selected =
    cells.find((c) => c.dayKey === selectedKey) ||
    cells.find((c) => c.isToday && c.inMonth) ||
    cells.find((c) => c.inMonth && !c.isFuture) ||
    null;

  // One analysis, scoped to whatever is selected — the sections this replaced
  // were the same questions asked of a fixed window
  const stats = useMemo(
    () => (selected ? buildStats({ scope, anchor: selected.date }) : null),
    [buildStats, scope, selected]
  );

  const panelTitle = useMemo(() => {
    if (!selected) return '';
    if (scope === 'day') {
      return selected.date
        .toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })
        .toUpperCase();
    }
    if (scope === 'week') {
      const start = stats?.start;
      return start
        ? `WEEK OF ${start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()}`
        : 'THIS WEEK';
    }
    return month.monthLabel.toUpperCase();
  }, [scope, selected, stats, month.monthLabel]);

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
              selected={
                // A day that has not happened is not part of what you did,
                // whatever period is selected
                cell.isFuture || !cell.inMonth
                  ? false
                  : scope === 'week'
                  ? week.some((d) => d.dayKey === selected?.dayKey)
                  : scope === 'month'
                  ? true
                  : selected?.dayKey === cell.dayKey
              }
              onPress={selectDay}
            />
          ))}
        </View>
      ))}

      <View style={styles.scopeRow}>
        {SCOPES.map((option) => {
          const active = scope === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => chooseScope(option.key)}
              activeOpacity={0.8}
              style={[styles.scopeButton, active && styles.scopeButtonActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.scopeText, active && styles.scopeTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!!stats && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{panelTitle}</Text>

          <View style={styles.headline}>
            <Text style={styles.headlineValue}>{stats.minutes}</Text>
            <Text style={styles.headlineUnit}>of {stats.target} min</Text>
            {Number.isFinite(stats.changePercent) && (
              <Text
                style={[
                  styles.delta,
                  {
                    color:
                      stats.changePercent > 0
                        ? SEMANTIC.success.base
                        : stats.changePercent < 0
                        ? SEMANTIC.danger.base
                        : TEXT.tertiary,
                  },
                ]}
              >
                {stats.changePercent > 0 ? '▲' : stats.changePercent < 0 ? '▼' : '—'}
                {Math.abs(stats.changePercent)}%
              </Text>
            )}
          </View>

          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${stats.percentage}%`,
                  backgroundColor:
                    stats.percentage >= 100 ? SEMANTIC.success.base : BRAND.primary,
                },
              ]}
            />
          </View>

          <Text style={styles.factLine}>
            {stats.sessions} session{stats.sessions === 1 ? '' : 's'} · {stats.calories} kcal ·{' '}
            {stats.activeDays} of {stats.elapsedDays} day{stats.elapsedDays === 1 ? '' : 's'}
          </Text>

          {stats.intensity?.hasData && (
            <View style={styles.intensityRow}>
              <View style={styles.intensityBar}>
                {['light', 'moderate', 'vigorous'].map((key) =>
                  stats.intensity.minutes[key] > 0 ? (
                    <View
                      key={key}
                      style={{
                        flex: stats.intensity.minutes[key],
                        backgroundColor: INTENSITY_COLORS[key],
                      }}
                    />
                  ) : null
                )}
              </View>
              <Text style={styles.intensityLabel}>
                mostly {stats.intensity.dominant}
              </Text>
            </View>
          )}

          {stats.timeOfDay?.hasPattern && (
            <Text style={styles.factLine}>
              Mostly {stats.timeOfDay.dominant.label.toLowerCase()}s · avg{' '}
              {stats.timeOfDay.dominant.averageMinutes} min
            </Text>
          )}

          {scope !== 'day' && stats.balance?.hasData && (
            <View style={styles.balance}>
              {stats.balance.groups.slice(0, 4).map((group) => (
                <View key={group.group} style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>{group.group}</Text>
                  <View style={styles.balanceTrack}>
                    <View
                      style={[
                        styles.balanceFill,
                        { width: `${Math.min(group.share, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.balanceValue}>{group.minutes}m</Text>
                </View>
              ))}
              {!!stats.balance.stalest && stats.balance.stalest.daysSince >= 4 && (
                <Text style={styles.balanceFlag}>
                  {stats.balance.stalest.group} last trained {stats.balance.stalest.daysSince} days ago
                </Text>
              )}
            </View>
          )}

          {stats.byExercise.length > 0 && (
            <View style={styles.exerciseList}>
              {stats.byExercise.map((entry) => (
                <View key={entry.exerciseId || entry.name} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  <Text style={styles.exerciseMeta}>
                    {entry.count}× · {entry.minutes}m
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Individual sessions only make sense at day scope; at week or month
              this would be a list, and the list is what the calendar replaced */}
          {scope === 'day' && (
            <View style={styles.sessions}>
              {stats.activities.length === 0 ? (
                <Text style={styles.detailEmpty}>Rest day</Text>
              ) : (
                stats.activities.map((activity, index) => {
                  const intensity = resolveIntensity(activity.intensity);
                  const name = activity.exerciseName || typeLabel(activity.type);
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
  scopeRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: RADIUS.md,
    padding: 3,
    marginTop: SPACING[3],
  },
  scopeButton: {
    flex: 1,
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  scopeButtonActive: {
    backgroundColor: SURFACES.card.primary,
    ...SHADOWS.sm,
  },
  scopeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },
  scopeTextActive: {
    color: TEXT.primary,
  },

  panel: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  panelTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.tertiary,
    letterSpacing: 0.6,
    marginBottom: SPACING[2],
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[2],
  },
  headlineValue: {
    fontSize: 30,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headlineUnit: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  delta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginTop: SPACING[2],
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  factLine: {
    marginTop: SPACING[2],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[2],
  },
  intensityBar: {
    flex: 1,
    flexDirection: 'row',
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  intensityLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  exerciseList: {
    marginTop: SPACING[2],
    gap: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING[2],
  },
  exerciseName: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  exerciseMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  sessions: {
    marginTop: SPACING[3],
  },
  balance: {
    marginTop: SPACING[3],
    gap: 3,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  balanceLabel: {
    width: 74,
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  balanceTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${BRAND.primary}18`,
    overflow: 'hidden',
  },
  balanceFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: BRAND.primary,
  },
  balanceValue: {
    width: 32,
    textAlign: 'right',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  balanceFlag: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: SEMANTIC.warning.base,
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
