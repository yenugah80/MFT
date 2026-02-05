/**
 * InsightSummaryCard
 * Clean, Apple Health-inspired summary card for each metric
 * Shows: icon, title, average value, trend chart, period comparison
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
export default function InsightSummaryCard({ metric, data, period }) {
  const config = METRIC_CONFIG[metric];

  if (!config) {
    console.warn(`[InsightSummaryCard] Unknown metric: ${metric}`);
    return null;
  }

  const { average, dailyValues, changePercent, unit } = data || {};
  const hasData = dailyValues && dailyValues.length > 0 && dailyValues.some(v => v > 0);

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
        <Text style={styles.title}>{config.label}</Text>
      </View>

      {/* Value Row */}
      <View style={styles.valueRow}>
        <Text style={styles.mainValue}>
          {average !== undefined && average !== null ? average.toLocaleString() : '--'}
        </Text>
        <Text style={styles.unit}>{unit} avg</Text>
        <View style={styles.trendWrapper}>
          <TrendIndicator change={changePercent} />
        </View>
      </View>

      {/* Chart */}
      {hasData ? (
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
          <Text style={styles.emptyText}>No data yet</Text>
        </View>
      )}

      {/* Period Comparison */}
      <Text style={styles.comparison}>
        {changePercent !== 0 && !isNaN(changePercent)
          ? `${changePercent > 0 ? '+' : ''}${changePercent}% vs previous ${period}`
          : `Track more to see trends`
        }
      </Text>
    </View>
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

  // Comparison
  comparison: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
});
