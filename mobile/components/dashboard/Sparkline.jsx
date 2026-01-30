import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';
import { TEXT, BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

/**
 * Sparkline
 *
 * Minimal line chart showing trend over time.
 * No axis labels (layman-friendly).
 * Useful for: mood trends, energy trends, consistency, hydration, etc.
 *
 * @param {Object} props
 * @param {Array<number>} props.data - Array of data points (7, 14, or 30 days)
 * @param {string} [props.label] - Chart label
 * @param {number} [props.height] - Chart height (default: 50)
 * @param {number} [props.width] - Chart width (default: 300)
 * @param {string} [props.stroke] - Line color (default: #3B82F6 blue)
 * @param {boolean} [props.showAverage] - Show average line (default: true)
 * @returns {JSX.Element}
 */
export function Sparkline({
  data,
  label,
  height = 50,
  width = 300,
  stroke = '#3B82F6',
  showAverage = true,
}) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    // Normalize data to 0-100 for SVG coordinates
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return { x, y, value: val };
    });

    const average = data.reduce((a, b) => a + b, 0) / data.length;
    const averageY = height - ((average - min) / range) * height;

    return { points, average, averageY };
  }, [data, height, width]);

  if (!chartData) return null;

  const { points, average, averageY } = chartData;

  // Build path string for polyline
  const pathString = points.map((p, i) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}

      <Svg width={width} height={height} style={styles.chart}>
        {/* Average line (subtle) */}
        {showAverage && (
          <Path
            d={`M 0 ${averageY} L ${width} ${averageY}`}
            stroke="#D1D5DB"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}

        {/* Data line */}
        <Polyline
          points={pathString}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Fill area under curve */}
        <Path
          d={`M ${points[0].x} ${height} L ${pathString} L ${points[points.length - 1].x} ${height} Z`}
          fill={stroke}
          opacity={0.1}
        />
      </Svg>

      {/* Average indicator */}
      {showAverage && (
        <View style={styles.footer}>
          <Text style={styles.averageLabel}>
            Avg: {average.toFixed(1)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 6,
  },
  chart: {
    backgroundColor: 'transparent',
  },
  footer: {
    marginTop: 4,
  },
  averageLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
});
