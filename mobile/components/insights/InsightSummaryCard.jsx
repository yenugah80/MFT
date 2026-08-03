/**
 * InsightSummaryCard
 * Clean, Apple Health-inspired summary card for each metric
 * Shows: icon, title, average value, trend chart, period comparison
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sparkline } from '../dashboard/Sparkline';
import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  VIBRANT_WELLNESS,
  SHADOWS,
} from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = SPACING[4];
const CHART_WIDTH = SCREEN_WIDTH - (SPACING[4] * 2) - (CARD_PADDING * 2);

/**
 * Metric configuration - colors, icons, labels
 */
const METRIC_CONFIG = {
  nutrition: {
    label: 'Nutrition',
    icon: 'nutrition',
    color: VIBRANT_WELLNESS.nutrition.solid,
    gradient: VIBRANT_WELLNESS.nutrition.gradient,
    bgColor: `${VIBRANT_WELLNESS.nutrition.solid}15`,
  },
  mood: {
    label: 'Mood',
    icon: 'happy',
    color: VIBRANT_WELLNESS.mood.solid,
    gradient: VIBRANT_WELLNESS.mood.gradient,
    bgColor: `${VIBRANT_WELLNESS.mood.solid}15`,
  },
  hydration: {
    label: 'Hydration',
    icon: 'water',
    color: VIBRANT_WELLNESS.hydration.solid,
    gradient: VIBRANT_WELLNESS.hydration.gradient,
    bgColor: `${VIBRANT_WELLNESS.hydration.solid}15`,
  },
  activity: {
    label: 'Activity',
    icon: 'fitness',
    color: VIBRANT_WELLNESS.activity.solid,
    gradient: VIBRANT_WELLNESS.activity.gradient,
    bgColor: `${VIBRANT_WELLNESS.activity.solid}15`,
  },
};

/**
 * Trend indicator component
 */
function TrendIndicator({ change }) {
  if (change === 0 || isNaN(change)) {
    return (
      <View style={styles.trendContainer}>
        <Ionicons name="remove" size={14} color={TEXT.tertiary} />
        <Text style={styles.trendTextNeutral}>--</Text>
      </View>
    );
  }

  const isPositive = change > 0;
  const color = isPositive ? '#10B981' : '#EF4444';
  const icon = isPositive ? 'arrow-up' : 'arrow-down';

  return (
    <View style={[styles.trendContainer, { backgroundColor: `${color}10` }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.trendText, { color }]}>
        {isPositive ? '+' : ''}{change}%
      </Text>
    </View>
  );
}

/**
 * Main InsightSummaryCard component
 */
export default function InsightSummaryCard({ metric, data, period, onPress }) {
  const config = METRIC_CONFIG[metric];

  if (!config) {
    console.warn(`[InsightSummaryCard] Unknown metric: ${metric}`);
    return null;
  }

  const {
    average,
    dailyValues,
    changePercent,
    unit,
    daysWithData = 0,
    periodDays = period === 'week' ? 7 : 30,
    hasComparison = false,
    scopeNote,
  } = data || {};

  // A single logged day draws a straight diagonal that reads as a trend it
  // isn't — two points of real data is the floor for showing a chart.
  const canChart = daysWithData >= 2 && Array.isArray(dailyValues) && dailyValues.length > 1;
  const hasTrend = hasComparison && Number.isFinite(changePercent);
  const periodWord = period === 'week' ? 'week' : 'month';

  const Card = onPress ? TouchableOpacity : View;
  const cardProps = onPress
    ? { onPress, activeOpacity: 0.85, accessibilityRole: 'button' }
    : {};

  return (
    <Card style={styles.card} {...cardProps}>
      {/* Header Row */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
        <Text style={styles.title}>{config.label}</Text>
        {!!scopeNote && <Text style={styles.scopeNote}>{scopeNote}</Text>}
        {!!onPress && <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />}
      </View>

      {/* Value Row — "--" when nothing was logged, never a hollow 0 */}
      <View style={styles.valueRow}>
        <Text style={styles.mainValue}>
          {average !== undefined && average !== null ? average.toLocaleString() : '--'}
        </Text>
        <Text style={styles.unit}>{unit} avg</Text>
        <View style={styles.trendWrapper}>
          {hasTrend && <TrendIndicator change={changePercent} />}
        </View>
      </View>

      {/* Chart */}
      {canChart ? (
        <View style={styles.chartContainer}>
          <Sparkline
            data={dailyValues}
            stroke={config.color}
            height={60}
            width={CHART_WIDTH}
            showAverage={false}
          />
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Ionicons name="analytics-outline" size={24} color={TEXT.muted} />
          <Text style={styles.emptyText}>
            {daysWithData === 0
              ? 'Nothing logged yet'
              : 'Log another day to see a trend'}
          </Text>
        </View>
      )}

      {/* Coverage — what the average is actually based on */}
      <View style={styles.footerRow}>
        <Text style={styles.coverage}>
          {daysWithData} of {periodDays} days logged
        </Text>
        <Text style={styles.comparison}>
          {hasTrend
            ? `${changePercent > 0 ? '+' : ''}${changePercent}% vs previous ${periodWord}`
            : 'No comparison yet'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: CARD_PADDING,
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[3],
    ...SHADOWS.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  title: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },

  // Value
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING[3],
  },
  mainValue: {
    fontSize: 32,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginRight: SPACING[1],
  },
  unit: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  trendWrapper: {
    flex: 1,
    alignItems: 'flex-end',
  },

  // Trend
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
    gap: 2,
  },
  trendText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  trendTextNeutral: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },

  // Chart
  chartContainer: {
    marginBottom: SPACING[2],
  },
  emptyChart: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[2],
    flexDirection: 'row',
    gap: SPACING[2],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.muted,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING[2],
  },
  coverage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  comparison: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  scopeNote: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
});
