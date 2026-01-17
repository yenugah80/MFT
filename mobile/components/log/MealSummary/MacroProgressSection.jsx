/**
 * MacroProgressSection Component
 * Displays meal macronutrient breakdown
 *
 * DESIGN PRINCIPLE: Show meal nutrition clearly, daily context as secondary
 * - Primary: Absolute macro values for THIS meal
 * - Secondary: Macro ratios within the meal (P/C/F distribution)
 * - Tertiary: Optional daily goal context (not prominently displayed)
 *
 * This avoids confusion where "15% of daily calories" makes a normal meal
 * look inadequate when it's actually a reasonable portion of a 3-meal day.
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
 * Single macro display with meal ratio context
 * Shows: absolute value + percentage of this meal's calories from this macro
 */
function MacroBar({ type, current, mealRatioPercent }) {
  const { colors, isDark } = useTheme();
  const config = MACRO_CONFIG[type];
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

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
        </View>
      </View>

      {/* Bar shows proportion of meal calories from this macro */}
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
              width: `${Math.min(100, mealRatioPercent)}%`,
              backgroundColor: config.color,
            },
          ]}
        />
      </View>

      <View style={styles.progressFooter}>
        <Text style={[styles.percentageText, { color: textSecondary }]}>
          {Math.round(mealRatioPercent)}% of meal calories
        </Text>
      </View>
    </View>
  );
}

/**
 * Calories display (large number) - meal focused
 * Shows absolute calories without confusing daily goal context
 */
function CaloriesDisplay({ calories }) {
  const { colors } = useTheme();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  return (
    <View style={styles.caloriesContainer}>
      <View style={styles.caloriesMain}>
        <Text style={[styles.caloriesValue, { color: textPrimary }]}>
          {Math.round(calories)}
        </Text>
        <Text style={[styles.caloriesUnit, { color: textSecondary }]}>kcal</Text>
      </View>
      <Text style={[styles.mealLabel, { color: textSecondary }]}>
        This meal
      </Text>
    </View>
  );
}

export default function MacroProgressSection({ macros }) {
  const { colors, isDark } = useTheme();
  const textPrimary = colors.text.primary;

  // Extract values with fallbacks
  const calories = macros?.calories_kcal || 0;
  const protein = macros?.protein_g || 0;
  const carbs = macros?.carbs_g || 0;
  const fat = macros?.fat_g || 0;

  // Calculate macro ratios (% of meal calories from each macro)
  // Using Atwater factors: protein 4cal/g, carbs 4cal/g, fat 9cal/g
  const proteinCal = protein * 4;
  const carbsCal = carbs * 4;
  const fatCal = fat * 9;
  const totalMacroCal = proteinCal + carbsCal + fatCal || 1; // Avoid division by zero

  const proteinRatio = (proteinCal / totalMacroCal) * 100;
  const carbsRatio = (carbsCal / totalMacroCal) * 100;
  const fatRatio = (fatCal / totalMacroCal) * 100;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: textPrimary }]}>Meal Nutrition</Text>

      {/* Calories */}
      <CaloriesDisplay calories={calories} />

      {/* Divider */}
      <View
        style={[
          styles.divider,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
        ]}
      />

      {/* Macro bars - showing meal composition, not daily goals */}
      <View style={styles.macrosContainer}>
        <MacroBar type="protein" current={protein} mealRatioPercent={proteinRatio} />
        <MacroBar type="carbs" current={carbs} mealRatioPercent={carbsRatio} />
        <MacroBar type="fat" current={fat} mealRatioPercent={fatRatio} />
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
  mealLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
