/**
 * RecoveryTrendCard (combo D: designs 3 + 7)
 *
 * Recovery over time, plus what changed since the last measured day.
 *
 * Only days that were actually computed appear. Gaps stay gaps — a day nobody
 * opened the app is not interpolated into a score, because that would be the
 * same fabrication as reporting the 50 baseline as a measurement.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';

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

const CHART_HEIGHT = 92;

const shortDay = (dayKey) => {
  if (!dayKey) return '';
  const [y, m, d] = String(dayKey).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'narrow' });
};

export default function RecoveryTrendCard({ history, chartWidth = 300 }) {
  const snapshots = history?.snapshots || [];
  const average = history?.average;
  const hasTrend = history?.hasTrend && snapshots.length >= 2;

  if (!hasTrend) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Recovery trend</Text>
        <Text style={styles.empty}>
          {snapshots.length === 0
            ? 'Your recovery score is recorded each day you open this screen. Come back tomorrow and a trend starts here.'
            : 'One day recorded so far — a second gives you something to compare against.'}
        </Text>
      </View>
    );
  }

  const scores = snapshots.map((s) => s.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  // Keep a floor on the range so a flat week does not draw as a jagged line
  const range = Math.max(max - min, 10);
  const floor = Math.min(min, max - range);

  const step = snapshots.length > 1 ? chartWidth / (snapshots.length - 1) : 0;
  const points = snapshots.map((snapshot, index) => ({
    x: index * step,
    y: CHART_HEIGHT - ((snapshot.score - floor) / range) * CHART_HEIGHT,
    snapshot,
  }));

  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2];
  const delta = latest.score - previous.score;
  const vsAverage = Number.isFinite(average) ? latest.score - average : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Recovery trend</Text>
        <Text style={styles.headerMeta}>
          {snapshots.length}-day avg {average}
        </Text>
      </View>

      <Svg width={chartWidth} height={CHART_HEIGHT} style={styles.chart}>
        <Polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={BRAND.primary}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p) => (
          <Circle
            key={p.snapshot.dayKey}
            cx={p.x}
            cy={p.y}
            r={p.snapshot === latest ? 4 : 2.5}
            fill={p.snapshot === latest ? BRAND.primary : SURFACES.card.primary}
            stroke={BRAND.primary}
            strokeWidth={1.5}
          />
        ))}
      </Svg>

      <View style={styles.axis}>
        {snapshots.map((snapshot) => (
          <Text key={snapshot.dayKey} style={styles.axisLabel}>
            {shortDay(snapshot.dayKey)}
          </Text>
        ))}
      </View>

      <View style={styles.readout}>
        <Text style={styles.readoutValue}>{latest.score}</Text>
        <View style={styles.readoutBody}>
          <Text
            style={[
              styles.readoutDelta,
              {
                color:
                  delta > 0
                    ? SEMANTIC.success.base
                    : delta < 0
                    ? SEMANTIC.danger.base
                    : TEXT.tertiary,
              },
            ]}
          >
            {delta > 0 ? `▲ ${delta} since last reading` : delta < 0 ? `▼ ${Math.abs(delta)} since last reading` : 'unchanged since last reading'}
          </Text>
          {vsAverage !== null && (
            <Text style={styles.readoutMeta}>
              {vsAverage === 0
                ? 'exactly your average'
                : `${Math.abs(vsAverage)} ${vsAverage > 0 ? 'above' : 'below'} your average`}
            </Text>
          )}
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
    marginBottom: SPACING[3],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headerMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  empty: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    lineHeight: 19,
  },
  chart: {
    alignSelf: 'center',
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[1],
  },
  axisLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  readoutValue: {
    fontSize: 30,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  readoutBody: {
    flex: 1,
  },
  readoutDelta: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  readoutMeta: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
});
