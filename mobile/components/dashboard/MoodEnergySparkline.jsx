/**
 * MoodEnergySparkline - Compact Trend Chart
 *
 * 7-day mood/energy trend visualization
 * Minimal design: thin line, no axes, dot on today
 *
 * Design:
 * - Thin purple stroke
 * - No grid, no axes labels
 * - Dot marker on today's value (rightmost)
 * - Trend indicator (↑ up, ↓ down)
 * - CTA: "View mood analysis →"
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { PREMIUM_COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/premiumDesignSystem';
import GlassCard from './GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * MoodEnergySparkline Component
 */
export default function MoodEnergySparkline({
  scores = [6, 7, 5, 8, 7, 6, 7], // 7-day array (Mon-Sun)
  todayIndex = 6, // Position of today (0-6)
  average = 7.2,
  trend = 'up', // 'up', 'down', or null
  onPress,
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  // Get trend color and icon
  const getTrendInfo = () => {
    if (trend === 'up') {
      return { icon: 'trending-up', color: PREMIUM_COLORS.semantic.success.primary, label: 'Improving' };
    }
    if (trend === 'down') {
      return { icon: 'trending-down', color: PREMIUM_COLORS.semantic.error.primary, label: 'Declining' };
    }
    return { icon: 'remove', color: PREMIUM_COLORS.text.tertiary, label: 'Stable' };
  };

  const trendInfo = getTrendInfo();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Mood and energy trend. Average ${average.toFixed(1)} out of 10.`}
      >
        <GlassCard variant="standard">
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Mood & Energy</Text>
              <Text style={styles.subtitle}>7-day trend</Text>
            </View>
            <Ionicons
              name="happy"
              size={24}
              color={PREMIUM_COLORS.functional.mood.primary}
            />
          </View>

          {/* Sparkline Chart */}
          <View style={styles.chartContainer}>
            <SparklineChart
              scores={scores}
              todayIndex={todayIndex}
              width={SCREEN_WIDTH - SPACING[10] - SPACING[5] * 2}
              height={80}
            />
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>7-day avg</Text>
              <Text style={styles.statValue}>{average.toFixed(1)}/10</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Trend</Text>
              <View style={styles.trendBadge}>
                <Ionicons
                  name={trendInfo.icon}
                  size={14}
                  color={trendInfo.color}
                />
                <Text style={[styles.trendLabel, { color: trendInfo.color }]}>
                  {trendInfo.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Micro text */}
          <Text style={styles.microText}>Based on {scores.length} mood logs</Text>

          {/* CTA */}
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>View mood analysis</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={PREMIUM_COLORS.text.tertiary}
            />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * SparklineChart - Minimal line chart
 * No axes, no grid, just a line + dot on today
 */
function SparklineChart({ scores, todayIndex, width, height }) {
  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Normalize scores to 0-10 scale
  const min = 0;
  const max = 10;
  const range = max - min;

  // Calculate points
  const points = scores.map((score, i) => {
    const x = padding + (i / (scores.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((score - min) / range) * chartHeight;
    return { x, y, score };
  });

  // Create smooth path using quadratic Bezier curves
  let pathData = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const controlX = (prev.x + curr.x) / 2;
    const controlY = (prev.y + curr.y) / 2;
    pathData += ` Q ${controlX} ${controlY} ${curr.x} ${curr.y}`;
  }

  const todayPoint = points[todayIndex];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={PREMIUM_COLORS.functional.mood.primary} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={PREMIUM_COLORS.functional.mood.primary} stopOpacity="0.05" />
        </SvgGradient>
      </Defs>

      {/* Main line */}
      <Path
        d={pathData}
        stroke={PREMIUM_COLORS.functional.mood.primary}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Today dot - larger, emphasized */}
      <Circle
        cx={todayPoint.x}
        cy={todayPoint.y}
        r={5}
        fill={PREMIUM_COLORS.functional.mood.primary}
        stroke="#FFFFFF"
        strokeWidth={2}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Chart
  chartContainer: {
    marginVertical: SPACING[4],
    alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
    marginBottom: SPACING[3],
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
    marginBottom: SPACING[1],
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.text.primary,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: PREMIUM_COLORS.border.light,
    marginHorizontal: SPACING[3],
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  trendLabel: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Micro text
  microText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: SPACING[3],
  },

  // CTA
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
    gap: SPACING[1],
  },
  ctaText: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
});
