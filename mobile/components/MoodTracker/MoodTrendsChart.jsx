/**
 * MoodTrendsChart - Animated Line Chart for Mood Trends
 *
 * Phase 4a Implementation: Simple line chart with smooth animations
 * Phase 4b (Future): Area fills, meal markers, gradient overlays
 *
 * Features:
 * - Animated path drawing (1500ms)
 * - Period selector (Day/Week/Month)
 * - Color-coded mood points
 * - Tap point for details
 * - Responsive to screen size
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, { Path, Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  MOOD_PALETTE,
} from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING[10];
const CHART_HEIGHT = 200;
const PADDING = { top: 20, right: 20, bottom: 30, left: 40 };

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MoodTrendsChart = ({ data = [], period = 'week', onPeriodChange }) => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const pathAnim = useRef(new Animated.Value(0)).current;
  const pointAnims = useRef([]).current;

  useEffect(() => {
    // Reset animation when data changes
    pathAnim.setValue(0);
    pointAnims.forEach(anim => anim.setValue(0));

    // Animate path drawing
    Animated.timing(pathAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Animate points sequentially
    data.forEach((_, i) => {
      if (!pointAnims[i]) {
        pointAnims[i] = new Animated.Value(0);
      }
      Animated.timing(pointAnims[i], {
        toValue: 1,
        delay: 150 + i * 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Calculate chart dimensions
  const chartWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const chartHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  // Generate SVG path data
  const { pathData, points } = useMemo(() => {
    if (data.length === 0) {
      return { pathData: '', points: [] };
    }

    const maxIntensity = 10;
    const minIntensity = 0;

    const calculatedPoints = data.map((point, i) => {
      const x = PADDING.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
      const y =
        PADDING.top +
        chartHeight -
        ((point.intensity - minIntensity) / (maxIntensity - minIntensity)) * chartHeight;

      return { x, y, ...point };
    });

    const path = calculatedPoints
      .map((point, i) => {
        if (i === 0) {
          return `M${point.x},${point.y}`;
        }
        // Smooth curve using quadratic bezier
        const prevPoint = calculatedPoints[i - 1];
        const cpX = (prevPoint.x + point.x) / 2;
        return `Q${cpX},${prevPoint.y} ${point.x},${point.y}`;
      })
      .join(' ');

    return { pathData: path, points: calculatedPoints };
  }, [data, chartWidth, chartHeight]);

  // Handle point tap
  const handlePointPress = (point, index) => {
    setSelectedPoint({ ...point, index });
  };

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mood Trends</Text>
          <PeriodSelector period={period} onChange={onPeriodChange} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={48} color={TEXT.tertiary} />
          <Text style={styles.emptyText}>No mood data yet</Text>
          <Text style={styles.emptySubtext}>Start logging your mood to see trends</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mood Trends</Text>
        <PeriodSelector period={period} onChange={onPeriodChange} />
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines (horizontal) */}
          {[0, 2.5, 5, 7.5, 10].map((value, i) => {
            const y = PADDING.top + chartHeight - (value / 10) * chartHeight;
            return (
              <G key={`grid-${i}`}>
                <Line
                  x1={PADDING.left}
                  y1={y}
                  x2={CHART_WIDTH - PADDING.right}
                  y2={y}
                  stroke={SURFACES.divider}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={PADDING.left - 10}
                  y={y + 4}
                  fontSize={10}
                  fill={TEXT.tertiary}
                  textAnchor="end"
                >
                  {value}
                </SvgText>
              </G>
            );
          })}

          {/* Animated line path */}
          <AnimatedPath
            d={pathData}
            stroke={SEMANTIC.info.base}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={1000}
            strokeDashoffset={pathAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1000, 0],
            })}
          />

          {/* Data points */}
          {points.map((point, i) => {
            const moodColor = MOOD_PALETTE[point.mood]?.base || SEMANTIC.info.base;
            const isSelected = selectedPoint?.index === i;

            return (
              <G key={`point-${i}`}>
                <AnimatedCircle
                  cx={point.x}
                  cy={point.y}
                  r={pointAnims[i]?.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, isSelected ? 8 : 6],
                  }) || 6}
                  fill={moodColor}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  onPress={() => handlePointPress(point, i)}
                />
              </G>
            );
          })}

          {/* X-axis labels */}
          {points.map((point, i) => {
            // Show every nth label to avoid crowding
            const showLabel = period === 'day' || i % Math.ceil(points.length / 5) === 0;
            if (!showLabel) return null;

            const label = formatDate(point.date, period);
            return (
              <SvgText
                key={`label-${i}`}
                x={point.x}
                y={CHART_HEIGHT - 5}
                fontSize={10}
                fill={TEXT.tertiary}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            );
          })}
        </Svg>

        {/* Selected Point Tooltip */}
        {selectedPoint && (
          <View
            style={[
              styles.tooltip,
              {
                left: selectedPoint.x - 60,
                top: selectedPoint.y - 60,
              },
            ]}
          >
            <Text style={styles.tooltipMood}>
              {selectedPoint.mood.charAt(0).toUpperCase() + selectedPoint.mood.slice(1)}
            </Text>
            <Text style={styles.tooltipIntensity}>
              Intensity: {selectedPoint.intensity}/10
            </Text>
            <Text style={styles.tooltipDate}>{formatDate(selectedPoint.date, 'full')}</Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: SEMANTIC.info.base }]} />
          <Text style={styles.legendText}>Mood Intensity</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Period Selector Component
 */
const PeriodSelector = ({ period, onChange }) => {
  const periods = ['day', 'week', 'month'];

  return (
    <View style={styles.periodSelector}>
      {periods.map((p) => (
        <TouchableOpacity
          key={p}
          style={[styles.periodButton, period === p && styles.periodButtonActive]}
          onPress={() => onChange?.(p)}
        >
          <Text
            style={[styles.periodText, period === p && styles.periodTextActive]}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

/**
 * Format date based on period
 */
function formatDate(dateString, period) {
  const date = new Date(dateString);

  if (period === 'day') {
    return date.toLocaleTimeString('en-US', { hour: 'numeric' });
  } else if (period === 'week') {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else if (period === 'month') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[1],
  },
  periodButton: {
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
  },
  periodButtonActive: {
    backgroundColor: SEMANTIC.info.base,
  },
  periodText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  periodTextActive: {
    color: TEXT.white,
  },
  chartContainer: {
    position: 'relative',
    marginBottom: SPACING[3],
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: SURFACES.background.primary,
    borderRadius: RADIUS.md,
    padding: SPACING[2],
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  tooltipMood: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  tooltipIntensity: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginBottom: SPACING[0.5],
  },
  tooltipDate: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING[2],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING[2],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING[1],
  },
  legendText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[8],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[3],
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
});

export default MoodTrendsChart;
