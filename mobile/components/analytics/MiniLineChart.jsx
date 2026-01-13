/**
 * Mini Line Chart Component
 *
 * Based on 2025 health visualization best practices:
 * - Line charts are among the most popular in health apps
 * - Show trends over time effectively
 * - Small-medium size for dashboard cards
 * - Simple, readable, familiar pattern
 *
 * Sources:
 * - PMC: "Line charts are the most popular type of visualizations"
 * - MyFitnessPal: Uses line charts for weight tracking, nutrition trends
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { TEXT, BRAND, SURFACES } from '../../constants/premiumTheme';

/**
 * MiniLineChart - Compact line chart for trends
 *
 * @param {Array} data - Array of numbers [value1, value2, ...]
 * @param {Array} labels - Optional labels for x-axis
 * @param {number} width - Chart width (default 280)
 * @param {number} height - Chart height (default 100)
 * @param {string} color - Line color (default BRAND.primary)
 * @param {Function} onPress - Optional tap handler
 * @param {boolean} showDots - Show data point dots (default true)
 * @param {boolean} showGrid - Show grid lines (default false)
 */
export default function MiniLineChart({
  data = [],
  labels = [],
  width = 280,
  height = 100,
  color = BRAND.primary,
  onPress = null,
  showDots = true,
  showGrid = false,
}) {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Find min/max for scaling
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const valueRange = maxValue - minValue || 1; // Avoid division by zero

  // Generate points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
    return { x, y, value };
  });

  // Generate polyline path
  const pathPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.container, { width, height }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Svg width={width} height={height}>
        {/* Grid lines (optional) */}
        {showGrid && (
          <>
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, index) => {
              const y = padding + chartHeight * (1 - fraction);
              return (
                <Line
                  key={index}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke={SURFACES.card}
                  strokeWidth={1}
                />
              );
            })}
          </>
        )}

        {/* Line */}
        <Polyline
          points={pathPoints}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots && points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={color}
          />
        ))}

        {/* Labels (if provided) */}
        {labels.length > 0 && labels.map((label, index) => {
          if (index >= points.length) return null;
          return (
            <SvgText
              key={index}
              x={points[index].x}
              y={height - 5}
              fontSize={10}
              fill={TEXT.tertiary}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Min/Max indicators */}
      <View style={styles.indicators}>
        <Text style={styles.maxLabel}>{maxValue.toFixed(1)}</Text>
        <Text style={styles.minLabel}>{minValue.toFixed(1)}</Text>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  emptyText: {
    fontSize: 14,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: 20,
  },
  indicators: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    justifyContent: 'space-between',
  },
  maxLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    fontWeight: '600',
  },
  minLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    fontWeight: '600',
  },
});
