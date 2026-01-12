/**
 * Macro Breakdown Section
 * Displays Protein, Carbs, Fat with horizontal progress bars
 * Inspired by reference nutrition tracking designs
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MacroBreakdownSection({
  protein = 68,
  carbs = 80,
  fat = 10,
  proteinGoal = 100,
  carbsGoal = 250,
  fatGoal = 65,
  isDarkMode = false,
}) {
  const proteinPercent = Math.min((protein / proteinGoal) * 100, 100);
  const carbsPercent = Math.min((carbs / carbsGoal) * 100, 100);
  const fatPercent = Math.min((fat / fatGoal) * 100, 100);

  // Theme-aware colors
  const titleColor = isDarkMode ? '#FFFFFF' : COLORS.text.primary;
  const labelColor = isDarkMode ? '#FFFFFF' : COLORS.text.primary;
  const valueColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : COLORS.text.secondary;
  const bgColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : COLORS.surface.secondary;
  const borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : COLORS.border.light;
  const barBgColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : COLORS.border.medium;

  const MacroBar = ({ label, emoji, current, goal, percent, colors }) => (
    <View style={styles.macroItem}>
      {/* Label */}
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.macroLabel, { color: labelColor }]}>{label}</Text>
        </View>
        <Text style={[styles.macroValue, { color: valueColor }]}>
          {current}g / {goal}g
        </Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.barBackground, { backgroundColor: barBgColor }]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.barFilled, { width: `${percent}%` }]}
        />
      </View>

      {/* Percentage */}
      <Text style={[styles.percentage, { color: valueColor }]}>{Math.round(percent)}%</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: bgColor, borderColor: borderColor }]}>
        {/* Header */}
        <Text style={[styles.title, { color: titleColor }]}>Today's Macros</Text>

        {/* Protein */}
        <MacroBar
          label="Protein"
          emoji="💪"
          current={protein}
          goal={proteinGoal}
          percent={proteinPercent}
          colors={[COLORS.nutrition.primary, COLORS.nutrition.secondary]}
        />

        {/* Carbs */}
        <MacroBar
          label="Carbs"
          emoji="🍚"
          current={carbs}
          goal={carbsGoal}
          percent={carbsPercent}
          colors={[COLORS.progress[0], COLORS.progress[1]]}
        />

        {/* Fat */}
        <MacroBar
          label="Fat"
          emoji="🌰"
          current={fat}
          goal={fatGoal}
          percent={fatPercent}
          colors={[COLORS.activity[0], COLORS.activity[1]]}
        />
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
  title: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.lg,
  },
  macroItem: {
    marginBottom: SPACING.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: TYPOGRAPHY.size.title2,
    marginRight: SPACING.sm,
  },
  macroLabel: {
    fontSize: TYPOGRAPHY.size.body,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  barBackground: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  barFilled: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  percentage: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
});
