/**
 * MacroProgressSection Component
 * Displays macro progress bars with daily goal context
 * Features: Protein, Carbs, Fat bars with percentages
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { useTheme } from '../../../providers/ThemeProvider';

/**
 * Macro configuration with colors
 */
const MACRO_CONFIG = {
  protein: {
    label: 'Protein',
    color: '#3B82F6', // Blue
    bgColor: 'rgba(59, 130, 246, 0.15)',
    unit: 'g',
  },
  carbs: {
    label: 'Carbs',
    color: '#10B981', // Green
    bgColor: 'rgba(16, 185, 129, 0.15)',
    unit: 'g',
  },
  fat: {
    label: 'Fat',
    color: '#F59E0B', // Amber
    bgColor: 'rgba(245, 158, 11, 0.15)',
    unit: 'g',
  },
};

/**
 * Single macro progress bar
 */
function MacroBar({ type, current, goal, showGoal = true }) {
  const { colors, isDark } = useTheme();
  const config = MACRO_CONFIG[type];
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  // Calculate percentage
  const percentage = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const isOverGoal = current > goal;

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <View style={styles.macroLabelContainer}>
          <View style={[styles.macroDot, { backgroundColor: config.color }]} />
          <Text style={[styles.macroLabel, { color: textPrimary }]}>{config.label}</Text>
        </View>
        <View style={styles.macroValues}>
          <Text style={[styles.macroCurrent, { color: textPrimary }]}>
            {Math.round(current)}{config.unit}
          </Text>
          {showGoal && goal > 0 && (
            <Text style={[styles.macroGoal, { color: textSecondary }]}>
              / {Math.round(goal)}{config.unit}
            </Text>
          )}
        </View>
      </View>

      <View
        style={[
          styles.progressBarContainer,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : config.bgColor },
        ]}
      >
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(100, percentage)}%`,
              backgroundColor: isOverGoal ? '#EF4444' : config.color,
            },
          ]}
        />
      </View>

      <View style={styles.progressFooter}>
        <Text
          style={[
            styles.percentageText,
            { color: isOverGoal ? '#EF4444' : config.color },
          ]}
        >
          {Math.round(percentage)}% {showGoal && 'of daily goal'}
        </Text>
      </View>
    </View>
  );
}

/**
 * Calories display (large number)
 */
function CaloriesDisplay({ calories, goal }) {
  const { colors } = useTheme();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  const percentage = goal > 0 ? Math.round((calories / goal) * 100) : 0;
  const isOverGoal = calories > goal;

  return (
    <View style={styles.caloriesContainer}>
      <View style={styles.caloriesMain}>
        <Text style={[styles.caloriesValue, { color: textPrimary }]}>
          {Math.round(calories)}
        </Text>
        <Text style={[styles.caloriesUnit, { color: textSecondary }]}>kcal</Text>
      </View>
      {goal > 0 && (
        <View style={styles.caloriesGoal}>
          <Text
            style={[
              styles.caloriesPercentage,
              { color: isOverGoal ? '#EF4444' : '#6B4EFF' },
            ]}
          >
            {percentage}%
          </Text>
          <Text style={[styles.caloriesGoalText, { color: textSecondary }]}>
            of {Math.round(goal)} daily
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MacroProgressSection({ macros, dailyValues }) {
  const { colors, isDark } = useTheme();
  const textPrimary = colors.text.primary;

  // Extract values with fallbacks
  const calories = macros?.calories_kcal || 0;
  const protein = macros?.protein_g || 0;
  const carbs = macros?.carbs_g || 0;
  const fat = macros?.fat_g || 0;

  // Daily goals with fallbacks
  const calorieGoal = dailyValues?.calories || 2000;
  const proteinGoal = dailyValues?.protein || 150;
  const carbsGoal = dailyValues?.carbs || 250;
  const fatGoal = dailyValues?.fat || 65;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: textPrimary }]}>Macronutrients</Text>

      {/* Calories */}
      <CaloriesDisplay calories={calories} goal={calorieGoal} />

      {/* Divider */}
      <View
        style={[
          styles.divider,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
        ]}
      />

      {/* Macro bars */}
      <View style={styles.macrosContainer}>
        <MacroBar type="protein" current={protein} goal={proteinGoal} />
        <MacroBar type="carbs" current={carbs} goal={carbsGoal} />
        <MacroBar type="fat" current={fat} goal={fatGoal} />
      </View>

      {/* Macro breakdown summary */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Fiber', value: macros?.fiber_g || 0, unit: 'g' },
          { label: 'Sugar', value: macros?.sugar_g || 0, unit: 'g' },
          { label: 'Sodium', value: macros?.sodium_mg || 0, unit: 'mg' },
        ].map((item) => (
          <View key={item.label} style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: textPrimary }]}>
              {Math.round(item.value)}{item.unit}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.text.tertiary }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING[4],
    marginVertical: SPACING[2],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: SPACING[3],
  },
  caloriesContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  caloriesMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  caloriesValue: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  caloriesUnit: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  caloriesGoal: {
    alignItems: 'flex-end',
  },
  caloriesPercentage: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  caloriesGoalText: {
    fontSize: TYPOGRAPHY.size.xs,
  },
  divider: {
    height: 1,
    marginVertical: SPACING[3],
  },
  macrosContainer: {
    gap: SPACING[4],
  },
  macroRow: {
    gap: SPACING[1],
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  macroValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  macroCurrent: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  macroGoal: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    marginTop: 2,
  },
  percentageText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 2,
  },
});
