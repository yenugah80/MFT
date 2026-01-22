/**
 * Macro Breakdown Section
 * Displays Protein, Carbs, Fat with horizontal progress bars
 * Inspired by reference nutrition tracking designs
 *
 * Uses light theme (premiumTheme.js) for consistent styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

// Macro-specific gradients
const MACRO_GRADIENTS = {
  protein: ['#10B981', '#059669'], // Green
  carbs: ['#F59E0B', '#D97706'],   // Amber
  fat: ['#8B5CF6', '#7C3AED'],     // Purple
};

// Macro-specific icons (replacing emojis with Ionicons)
const MACRO_ICONS = {
  protein: 'fitness',
  carbs: 'flash',
  fat: 'water',
};

export default function MacroBreakdownSection({
  protein = 68,
  carbs = 80,
  fat = 10,
  proteinGoal = 100,
  carbsGoal = 250,
  fatGoal = 65,
}) {
  const proteinPercent = Math.min((protein / proteinGoal) * 100, 100);
  const carbsPercent = Math.min((carbs / carbsGoal) * 100, 100);
  const fatPercent = Math.min((fat / fatGoal) * 100, 100);

  const MacroBar = ({ label, iconName, current, goal, percent, colors }) => (
    <View style={styles.macroItem}>
      {/* Label */}
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors[0]}15` }]}>
            <Ionicons name={iconName} size={16} color={colors[0]} />
          </View>
          <Text style={styles.macroLabel}>{label}</Text>
        </View>
        <Text style={styles.macroValue}>
          {current}g / {goal}g
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barBackground}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.barFilled, { width: `${percent}%` }]}
        />
      </View>

      {/* Percentage */}
      <Text style={styles.percentage}>{Math.round(percent)}%</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <Text style={styles.title}>Today's Macros</Text>

        {/* Protein */}
        <MacroBar
          label="Protein"
          iconName={MACRO_ICONS.protein}
          current={protein}
          goal={proteinGoal}
          percent={proteinPercent}
          colors={MACRO_GRADIENTS.protein}
        />

        {/* Carbs */}
        <MacroBar
          label="Carbs"
          iconName={MACRO_ICONS.carbs}
          current={carbs}
          goal={carbsGoal}
          percent={carbsPercent}
          colors={MACRO_GRADIENTS.carbs}
        />

        {/* Fat */}
        <MacroBar
          label="Fat"
          iconName={MACRO_ICONS.fat}
          current={fat}
          goal={fatGoal}
          percent={fatPercent}
          colors={MACRO_GRADIENTS.fat}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    padding: SPACING[4],

    // Premium shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[4],
  },
  macroItem: {
    marginBottom: SPACING[4],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  barBackground: {
    height: 12,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING[1],
  },
  barFilled: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  percentage: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'right',
  },
});
