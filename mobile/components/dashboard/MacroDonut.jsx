/**
 * MacroDonut Component
 * Premium single donut chart showing Protein/Carbs/Fat distribution
 * Replaces 3 separate rings with one cohesive visualization
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  calculateMacroPercentages,
  calculateCaloriesFromMacros,
} from '../../constants/designTokens';

/**
 * @param {Object} props
 * @param {number} props.protein - Protein grams
 * @param {number} props.carbs - Carbs grams
 * @param {number} props.fat - Fat grams
 * @param {number} props.size - Donut diameter
 * @param {number} props.strokeWidth - Donut thickness
 */
export default function MacroDonut({
  protein = 0,
  carbs = 0,
  fat = 0,
  size = 200,
  strokeWidth = 24,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate macro percentages by calorie contribution
  const percentages = calculateMacroPercentages(protein, carbs, fat);
  const totalCalories = calculateCaloriesFromMacros(protein, carbs, fat);

  // Check if we have data
  const hasData = totalCalories > 0;

  if (!hasData) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>No macros logged</Text>
        </View>
      </View>
    );
  }

  // Calculate arc paths for each macro
  const arcs = calculateArcPaths(percentages, radius, size / 2, size / 2, strokeWidth);

  return (
    <View style={styles.container}>
      {/* SVG Donut */}
      <Svg width={size} height={size}>
        <Defs>
          {/* Protein gradient */}
          <LinearGradient id="proteinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.macros.protein.base} stopOpacity="1" />
            <Stop offset="100%" stopColor={COLORS.macros.protein.light} stopOpacity="0.8" />
          </LinearGradient>
          {/* Carbs gradient */}
          <LinearGradient id="carbsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.macros.carbs.base} stopOpacity="1" />
            <Stop offset="100%" stopColor={COLORS.macros.carbs.light} stopOpacity="0.8" />
          </LinearGradient>
          {/* Fat gradient */}
          <LinearGradient id="fatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.macros.fat.base} stopOpacity="1" />
            <Stop offset="100%" stopColor={COLORS.macros.fat.light} stopOpacity="0.8" />
          </LinearGradient>
        </Defs>

        {/* Protein arc */}
        {arcs.protein && (
          <Path
            d={arcs.protein}
            stroke="url(#proteinGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Carbs arc */}
        {arcs.carbs && (
          <Path
            d={arcs.carbs}
            stroke="url(#carbsGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Fat arc */}
        {arcs.fat && (
          <Path
            d={arcs.fat}
            stroke="url(#fatGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>

      {/* Center content - Total calories */}
      <View style={styles.centerContent}>
        <Text style={styles.centerValue}>
          {Math.round(totalCalories)}
        </Text>
        <Text style={styles.centerLabel}>kcal</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem
          color={COLORS.macros.protein.base}
          label="Protein"
          grams={protein}
          percent={percentages.protein}
        />
        <LegendItem
          color={COLORS.macros.carbs.base}
          label="Carbs"
          grams={carbs}
          percent={percentages.carbs}
        />
        <LegendItem
          color={COLORS.macros.fat.base}
          label="Fat"
          grams={fat}
          percent={percentages.fat}
        />
      </View>
    </View>
  );
}

/**
 * Legend item component
 */
function LegendItem({ color, label, grams, percent }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View style={styles.legendTextContainer}>
        <Text style={styles.legendLabel}>{label}</Text>
        <Text style={styles.legendValue}>
          {Math.round(grams)}g • {Math.round(percent)}%
        </Text>
      </View>
    </View>
  );
}

/**
 * Calculate SVG arc paths for each macro
 * Adds small gaps between segments for visual separation
 */
function calculateArcPaths(percentages, radius, cx, cy, strokeWidth) {
  const gapAngle = 2; // degrees
  const { protein, carbs, fat } = percentages;

  // Start at top (-90deg)
  let startAngle = -90;

  const createArc = (percentage) => {
    if (percentage === 0) return null;

    // Convert percentage to angle (minus gap)
    const sweepAngle = (percentage / 100) * 360 - gapAngle;
    const endAngle = startAngle + sweepAngle;

    // Convert to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate start and end points
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    // Large arc flag
    const largeArcFlag = sweepAngle > 180 ? 1 : 0;

    // SVG arc path
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    // Update start angle for next arc
    startAngle = endAngle + gapAngle;

    return path;
  };

  return {
    protein: createArc(protein),
    carbs: createArc(carbs),
    fat: createArc(fat),
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80, // Offset for legend
  },
  centerValue: {
    fontSize: TYPOGRAPHY.size['4xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: COLORS.text.primary,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  centerLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  legend: {
    marginTop: SPACING[4],
    gap: SPACING[2],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.secondary,
  },
  legendValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.text.tertiary,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING[2],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.text.muted,
  },
});
