/**
 * MacroBreakdownCard - Interactive expandable macro visualization
 * Tap to expand and see detailed breakdown
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { TEXT, SURFACES, CARD_SYSTEM } from '../../constants/premiumTheme';
import { WELLNESS_COLORS } from '../../constants/modernColorPalette';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function MacroBar({ label, value, goal, color, unit = 'g' }) {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;

  return (
    <View style={styles.macroBar}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {Math.round(value)}{unit} <Text style={styles.macroGoal}>/ {Math.round(goal)}{unit}</Text>
        </Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.macroPercentage}>{Math.round(percentage)}%</Text>
    </View>
  );
}

export default function MacroBreakdownCard({ today = {}, goals = {} }) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  // Parse data
  const nutrition = today?.nutrition || {};
  const protein = nutrition.totalProtein || 0;
  const carbs = nutrition.totalCarbs || 0;
  const fat = nutrition.totalFats || 0;
  const fiber = nutrition.totalFiber || 0;

  const proteinGoal = goals?.proteinG || 150;
  const carbsGoal = goals?.carbsG || 250;
  const fatGoal = goals?.fatsG || 65;
  const fiberGoal = 30;

  const total = protein + carbs + fat;
  const hasMacros = total > 0;

  // Calculate percentages for donut visualization
  const proteinPct = hasMacros ? (protein / total) * 100 : 33.3;
  const carbsPct = hasMacros ? (carbs / total) * 100 : 33.3;
  const fatPct = hasMacros ? (fat / total) * 100 : 33.3;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={toggleExpand}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="pie-chart" size={20} color={TEXT.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Macro Balance</Text>
            <Text style={styles.headerSubtitle}>
              {hasMacros ? 'Tap to view breakdown' : 'Log meals to see balance'}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={TEXT.secondary}
        />
      </View>

      {!expanded && hasMacros && (
        <View style={styles.compactView}>
          <View style={styles.macroChips}>
            <View style={[styles.chip, { borderColor: '#8B5CF6' }]}>
              <View style={[styles.chipDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={styles.chipText}>Protein {Math.round(proteinPct)}%</Text>
            </View>
            <View style={[styles.chip, { borderColor: WELLNESS_COLORS.fitness.base }]}>
              <View style={[styles.chipDot, { backgroundColor: WELLNESS_COLORS.fitness.base }]} />
              <Text style={styles.chipText}>Carbs {Math.round(carbsPct)}%</Text>
            </View>
            <View style={[styles.chip, { borderColor: '#FBBF24' }]}>
              <View style={[styles.chipDot, { backgroundColor: '#FBBF24' }]} />
              <Text style={styles.chipText}>Fat {Math.round(fatPct)}%</Text>
            </View>
          </View>
        </View>
      )}

      {expanded && (
        <View style={styles.expandedView}>
          <MacroBar
            label="Protein"
            value={protein}
            goal={proteinGoal}
            color="#8B5CF6"
          />
          <MacroBar
            label="Carbs"
            value={carbs}
            goal={carbsGoal}
            color={WELLNESS_COLORS.fitness.base}
          />
          <MacroBar
            label="Fat"
            value={fat}
            goal={fatGoal}
            color="#FBBF24"
          />
          <MacroBar
            label="Fiber"
            value={fiber}
            goal={fiberGoal}
            color="#A78BFA"
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CARD_SYSTEM.standard,
    marginHorizontal: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACES.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  compactView: {
    marginTop: SPACING[4],
  },
  macroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    backgroundColor: SURFACES.background.secondary,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.primary,
  },
  expandedView: {
    marginTop: SPACING[4],
    gap: SPACING[4],
  },
  macroBar: {
    gap: SPACING[2],
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  macroGoal: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.md,
  },
  macroPercentage: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    textAlign: 'right',
  },
});
