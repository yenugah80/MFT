/**
 * RemainingBudgetCard - Single gentle nudge (no lists, no scores)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, SURFACES, TEXT, SPACING, SHADOWS } from '../../constants/premiumTheme';

export default function RemainingBudgetCard({ today = {}, goals = {}, onLogMeal }) {
  // Calculate remaining budget
  const budgets = useMemo(() => {
    const nutrition = today?.nutrition || {};
    const waterIntake = today?.waterIntakeLiters || 0;

    const dailyCalories = goals?.dailyCalories || 2000;
    const waterLiters = goals?.waterLiters || 2.0;

    const consumedCalories = nutrition?.totalCalories || 0;
    return {
      calories: {
        remaining: Math.max(0, dailyCalories - consumedCalories),
        total: dailyCalories,
        consumed: consumedCalories,
        percent: Math.min(100, (consumedCalories / dailyCalories) * 100),
        status: consumedCalories > dailyCalories ? 'over' : 'on-track',
      },
      water: {
        remaining: Math.max(0, waterLiters - waterIntake),
        total: waterLiters,
        consumed: waterIntake,
        percent: Math.min(100, (waterIntake / waterLiters) * 100),
        status: waterIntake >= waterLiters ? 'complete' : 'on-track',
      },
    };
  }, [today, goals]);

  const getNudge = () => {
    const hydrationRatio = budgets.water.total > 0
      ? budgets.water.consumed / budgets.water.total
      : 0;
    const caloriesRatio = budgets.calories.total > 0
      ? budgets.calories.consumed / budgets.calories.total
      : 0;

    if (hydrationRatio > 0 && hydrationRatio < 0.6) {
      return {
        title: "Today’s nudge",
        message: 'Hydration is still early today. A small glass now could help later.',
        icon: 'water-outline',
        actionLabel: null,
      };
    }

    if (caloriesRatio > 0 && caloriesRatio < 0.4) {
      return {
        title: "Today’s nudge",
        message: 'You have not logged much food yet. A simple snack would be a good start.',
        icon: 'restaurant-outline',
        actionLabel: 'Log a meal',
      };
    }

    if (caloriesRatio >= 1.05) {
      return {
        title: "Today’s nudge",
        message: 'You have logged plenty today. A lighter option can feel good.',
        icon: 'sparkles-outline',
        actionLabel: null,
      };
    }

    return {
      title: "Today’s nudge",
      message: 'No pressure today. Log one thing when you’re ready.',
      icon: 'leaf-outline',
      actionLabel: 'Log a meal',
    };
  };

  const nudge = getNudge();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name={nudge.icon} size={18} color={BRAND.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{nudge.title}</Text>
            <Text style={styles.subtitle}>Soft guidance, no pressure</Text>
          </View>
        </View>

        <Text style={styles.summaryText}>{nudge.message}</Text>
        {nudge.actionLabel && onLogMeal && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onLogMeal}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={nudge.actionLabel}
          >
            <Ionicons name="add-circle-outline" size={16} color={BRAND.primary} />
            <Text style={styles.actionText}>{nudge.actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    marginVertical: SPACING.md,
  },
  card: {
    borderRadius: 18,
    padding: SPACING.lg,
    backgroundColor: SURFACES.card.primary,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BRAND.primary}12`,
  },
  headerCopy: {
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  summaryText: {
    fontSize: 15,
    color: TEXT.secondary,
  },
  actionButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${BRAND.primary}30`,
    backgroundColor: `${BRAND.primary}08`,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.primary,
  },
});
