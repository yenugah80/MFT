/**
 * WeeklyProgressHero
 *
 * Wave 1 of the Activity Insights redesign: a dense stat band, a ring showing
 * minutes against the real weekly target, and a pace read on whether this week
 * is on track.
 *
 * Everything here traces to a logged row or to the 150 min/week target the API
 * reports. There is deliberately no calorie goal: the product has never had
 * one, and inventing it is what produced "0 / 1500 kcal" and advice to "try a
 * 733 kcal workout".
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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

const RING_SIZE = 148;
const RING_STROKE = 12;
const RADIUS_INNER = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS_INNER;

/** Signed delta, or an em dash when there is no baseline to compare against */
function Delta({ value, suffix = '%' }) {
  if (!Number.isFinite(value)) {
    return <Text style={styles.deltaNeutral}>—</Text>;
  }
  const up = value > 0;
  const color = up ? SEMANTIC.success.base : value < 0 ? SEMANTIC.danger.base : TEXT.tertiary;
  return (
    <Text style={[styles.delta, { color }]}>
      {value > 0 ? '▲' : value < 0 ? '▼' : '—'}
      {value !== 0 ? `${Math.abs(value)}${suffix}` : ''}
    </Text>
  );
}

function Stat({ value, label, delta, deltaSuffix }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Delta value={delta} suffix={deltaSuffix} />
    </View>
  );
}

export default function WeeklyProgressHero({ pace, trend }) {
  const {
    minutes = 0,
    targetMinutes = 150,
    percentage = 0,
    remainingMinutes = 0,
    calories = 0,
    workoutCount = 0,
    activeDays = 0,
    expectedByNow = 0,
    deltaMinutes = 0,
    onPace = false,
    daysLeft = 0,
  } = pace || {};

  const hasLoggedAnything = minutes > 0 || workoutCount > 0;
  const progress = Math.max(0, Math.min(percentage, 100)) / 100;
  const dashoffset = CIRCUMFERENCE * (1 - progress);

  // Rest days only make sense for days that have already happened
  const elapsedDays = 7 - daysLeft;
  const restDays = Math.max(0, elapsedDays - activeDays);

  const ringColor = percentage >= 100
    ? SEMANTIC.success.base
    : onPace
    ? BRAND.primary
    : SEMANTIC.warning.base;

  return (
    <View style={styles.card}>
      {/* Dense band — every figure carries its own week-over-week delta */}
      <View style={styles.statBand}>
        <Stat value={minutes} label="min" delta={trend?.minutesChangePercentage} />
        <View style={styles.statDivider} />
        <Stat value={workoutCount} label={workoutCount === 1 ? 'session' : 'sessions'} />
        <View style={styles.statDivider} />
        <Stat value={calories} label="kcal" delta={trend?.changePercentage} />
        <View style={styles.statDivider} />
        <Stat value={restDays} label={restDays === 1 ? 'rest day' : 'rest days'} />
      </View>

      {/* Ring: minutes against the target the backend tracks */}
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS_INNER}
            stroke={`${ringColor}22`}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          {progress > 0 && (
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS_INNER}
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          )}
        </Svg>
        <View style={styles.ringCentre} pointerEvents="none">
          <Text style={styles.ringValue}>{minutes}</Text>
          <Text style={styles.ringOf}>of {targetMinutes} min</Text>
        </View>
      </View>

      <Text style={styles.ringCaption}>
        {percentage >= 100
          ? 'Weekly target reached'
          : `${percentage}% · ${remainingMinutes} min to go`}
      </Text>

      {/* Pace: are you where you should be by now? */}
      {hasLoggedAnything || elapsedDays > 1 ? (
        <View style={styles.paceBlock}>
          <View style={styles.paceTrack}>
            <View style={[styles.paceFill, { width: `${progress * 100}%`, backgroundColor: ringColor }]} />
            {/* Where the week should stand today */}
            <View
              style={[
                styles.paceMarker,
                { left: `${Math.min((expectedByNow / targetMinutes) * 100, 100)}%` },
              ]}
            />
          </View>
          <View style={styles.paceLegend}>
            <Ionicons
              name={onPace ? 'checkmark-circle' : 'alert-circle-outline'}
              size={15}
              color={onPace ? SEMANTIC.success.base : SEMANTIC.warning.base}
            />
            <Text style={styles.paceText}>
              {percentage >= 100
                ? `Target met with ${daysLeft} day${daysLeft === 1 ? '' : 's'} to spare`
                : onPace
                ? `On pace — ${expectedByNow} min expected by today`
                : `${Math.abs(deltaMinutes)} min behind pace (${expectedByNow} min expected by today)`}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.paceEmpty}>
          Nothing logged yet this week — {targetMinutes} min across {7 - daysLeft > 0 ? daysLeft : 7} remaining day
          {daysLeft === 1 ? '' : 's'}.
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

  // Stat band
  statBand: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: SPACING[4],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginVertical: 2,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  delta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  deltaNeutral: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },

  // Ring
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCentre: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 40,
    lineHeight: 44,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  ringOf: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  ringCaption: {
    textAlign: 'center',
    marginTop: SPACING[2],
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },

  // Pace
  paceBlock: {
    marginTop: SPACING[4],
    gap: SPACING[2],
  },
  paceTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'visible',
    justifyContent: 'center',
  },
  paceFill: {
    height: 8,
    borderRadius: 4,
  },
  paceMarker: {
    position: 'absolute',
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: TEXT.secondary,
  },
  paceLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  paceText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  paceEmpty: {
    marginTop: SPACING[4],
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    lineHeight: 17,
  },
});
