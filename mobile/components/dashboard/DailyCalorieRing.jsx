/**
 * Daily Calorie Ring - Hero Metric
 * Displays calorie intake vs goal with circular progress ring
 * Inspired by premium health tracking apps (Apple Health, Oura)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DailyCalorieRing({
  consumed = 1250,
  goal = 2000,
  burned = 120,
  showDetails = true,
  isDarkMode = false,
}) {
  const ringSize = Math.min(SCREEN_WIDTH - SPACING.lg * 4, 220);
  const radius = ringSize / 2;
  const circumference = 2 * Math.PI * (radius - 20); // Inner radius

  // Calculate progress and status
  const isOverGoal = consumed > goal;
  const remaining = goal - consumed;
  const overage = consumed - goal;
  const progress = isOverGoal ? 1 : Math.min(consumed / goal, 1);
  const strokeDashoffset = circumference * (1 - progress);

  // Display values based on status
  const displayValue = isOverGoal ? Math.round(overage) : Math.round(remaining);
  const displayLabel = isOverGoal ? 'Over Goal' : (remaining > 0 ? 'Cal Left' : 'On Goal!');
  const ringColor = isOverGoal ? '#EF4444' : COLORS.nutrition.primary; // Red when over

  // Theme-aware colors
  const textColor = isDarkMode ? COLORS.text.inverse : COLORS.text.primary;
  const bgColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : COLORS.surface.secondary;
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : COLORS.border.light;
  const ringBgColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : COLORS.border.medium;

  return (
    <View style={styles.container}>
      {/* Background card */}
      <View style={[styles.card, { backgroundColor: bgColor, borderColor: borderColor }]}>
        {/* SVG Ring */}
        <View style={styles.ringContainer}>
          <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
            <G>
              {/* Background ring */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius - 20}
                fill="none"
                stroke={ringBgColor}
                strokeWidth={16}
              />

              {/* Progress ring (dynamic color: orange on track, red when over) */}
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius - 20}
                fill="none"
                stroke={ringColor}
                strokeWidth={16}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transformOrigin: `${ringSize / 2}px ${ringSize / 2}px`,
                  transform: [{ rotate: '-90deg' }],
                }}
              />

              {/* Center text */}
              <SvgText
                x={ringSize / 2}
                y={ringSize / 2 - 15}
                textAnchor="middle"
                fontSize={TYPOGRAPHY.size.hero}
                fontWeight={TYPOGRAPHY.weight.bold}
                fill={textColor}
              >
                {displayValue}
              </SvgText>

              <SvgText
                x={ringSize / 2}
                y={ringSize / 2 + 25}
                textAnchor="middle"
                fontSize={TYPOGRAPHY.size.subhead}
                fill={textColor}
                opacity={0.7}
              >
                {displayLabel}
              </SvgText>
            </G>
          </Svg>
        </View>

        {/* Stats below ring */}
        {showDetails && (
          <View style={[styles.statsRow, { borderTopColor: borderColor }]}>
            {/* Target */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : COLORS.text.secondary }]}>Target</Text>
              <Text style={[styles.statValue, { color: textColor }]}>{goal}</Text>
              <Text style={[styles.statUnit, { color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : COLORS.text.secondary }]}>cal</Text>
            </View>

            {/* Consumed */}
            <View style={[styles.statItem, styles.centerItem, { borderColor: borderColor }]}>
              <Text style={[styles.statLabel, { color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : COLORS.text.secondary }]}>Consumed</Text>
              <Text style={[styles.statValue, { color: textColor }]}>{consumed}</Text>
              <Text style={[styles.statUnit, { color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : COLORS.text.secondary }]}>cal</Text>
            </View>

            {/* Burned */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : COLORS.text.secondary }]}>Burned</Text>
              <Text style={[styles.statValue, { color: textColor }]}>{burned}</Text>
              <Text style={[styles.statUnit, { color: isDarkMode ? 'rgba(255, 255, 255, 0.6)' : COLORS.text.secondary }]}>cal</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  centerItem: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.lg,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.inverse,
    opacity: 0.6,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.inverse,
    marginBottom: SPACING.xs,
  },
  statUnit: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.text.inverse,
    opacity: 0.6,
  },
});
