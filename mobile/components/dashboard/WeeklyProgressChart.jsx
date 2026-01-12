/**
 * Weekly Progress Chart
 * Displays 7-day calorie intake as bar chart
 * Inspired by reference nutrition tracking designs
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;
const BAR_WIDTH = (CHART_WIDTH - SPACING.md * 6) / 7;
const CHART_HEIGHT = 140;
const MAX_CALORIES = 2500;

const getDayLabel = (daysAgo) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return days[date.getDay()];
};

export default function WeeklyProgressChart({
  weekData = [
    { day: 0, calories: 1800 },
    { day: 1, calories: 2100 },
    { day: 2, calories: 1600 },
    { day: 3, calories: 2300 },
    { day: 4, calories: 1900 },
    { day: 5, calories: 2000 },
    { day: 6, calories: 1750 }, // Today
  ],
  goal = 2000,
  isDarkMode = false,
}) {
  const stats = useMemo(() => {
    const total = weekData.reduce((sum, d) => sum + d.calories, 0);
    const average = Math.round(total / weekData.length);
    return { total, average };
  }, [weekData]);

  // Theme-aware colors
  const titleColor = isDarkMode ? '#FFFFFF' : COLORS.text.primary;
  const labelColor = isDarkMode ? 'rgba(255, 255, 255, 0.6)' : COLORS.text.secondary;
  const bgColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : COLORS.surface.secondary;
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : COLORS.border.light;
  const yAxisLabelColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : COLORS.text.tertiary;
  const goalLineColor = isDarkMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)';
  const statBgColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : COLORS.border.light;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: bgColor, borderColor: borderColor }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: titleColor }]}>Weekly Progress</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: statBgColor }]}>
              <Text style={[styles.statLabel, { color: labelColor }]}>Avg</Text>
              <Text style={[styles.statValue, { color: titleColor }]}>{stats.average}</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: statBgColor }]}>
              <Text style={[styles.statLabel, { color: labelColor }]}>Total</Text>
              <Text style={[styles.statValue, { color: titleColor }]}>{stats.total}</Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          {/* Y-axis labels */}
          <View style={styles.yAxisLabels}>
            <Text style={[styles.yLabel, { color: yAxisLabelColor }]}>{goal}</Text>
            <Text style={[styles.yLabel, { color: yAxisLabelColor }]}>{Math.round(goal / 2)}</Text>
            <Text style={[styles.yLabel, { color: yAxisLabelColor }]}>0</Text>
          </View>

          {/* Bars */}
          <View style={[styles.chartArea, { borderColor: borderColor }]}>
            {/* Goal line */}
            <View
              style={[
                styles.goalLine,
                {
                  bottom: (goal / MAX_CALORIES) * CHART_HEIGHT,
                  backgroundColor: goalLineColor,
                },
              ]}
            />

            {/* Bars */}
            <View style={styles.barsContainer}>
              {weekData.map((item, index) => {
                const height = (item.calories / MAX_CALORIES) * CHART_HEIGHT;
                const isToday = index === weekData.length - 1;
                const isAboveGoal = item.calories > goal;

                return (
                  <View key={index} style={styles.barWrapper}>
                    {/* Bar */}
                    <LinearGradient
                      colors={
                        isAboveGoal
                          ? [COLORS.nutrition.primary, COLORS.nutrition.secondary]
                          : ['rgba(249, 115, 22, 0.5)', 'rgba(251, 146, 60, 0.5)']
                      }
                      start={{ x: 0, y: 1 }}
                      end={{ x: 0, y: 0 }}
                      style={[
                        styles.bar,
                        {
                          height: `${(item.calories / MAX_CALORIES) * 100}%`,
                          borderTopLeftRadius: isAboveGoal ? RADIUS.sm : 0,
                          borderTopRightRadius: isAboveGoal ? RADIUS.sm : 0,
                        },
                      ]}
                    />

                    {/* Day label */}
                    <Text
                      style={[
                        styles.dayLabel,
                        { color: isToday ? COLORS.nutrition.primary : labelColor },
                        isToday && styles.dayLabelToday,
                      ]}
                    >
                      {getDayLabel(weekData.length - 1 - index)}
                    </Text>

                    {/* Value */}
                    <Text style={[styles.barValue, { color: labelColor }]}>{Math.round(item.calories / 100) * 100}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
  },
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT + 60,
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    width: 45,
    paddingRight: SPACING.sm,
  },
  yLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.5)',
    height: 20,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(249, 115, 22, 0.3)',
    borderStyle: 'dashed',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.sm,
    height: CHART_HEIGHT,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    gap: SPACING.xs,
  },
  bar: {
    width: '100%',
    maxWidth: BAR_WIDTH - SPACING.xs,
  },
  dayLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: SPACING.xs,
  },
  dayLabelToday: {
    color: COLORS.nutrition.primary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  barValue: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: SPACING.xs,
  },
});
