/**
 * RemainingBudgetCard - Shows remaining nutrition budget for the day
 * Provides visual progress and actionable insights
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND, SURFACES, TEXT, SPACING, SHADOWS } from '../../constants/premiumTheme';

export default function RemainingBudgetCard({ today = {}, goals = {} }) {
  // Calculate remaining budget
  const budgets = useMemo(() => {
    const nutrition = today?.nutrition || {};
    const waterIntake = today?.waterIntakeLiters || 0;

    const dailyCalories = goals?.dailyCalories || 2000;
    const proteinG = goals?.proteinG || 150;
    const carbsG = goals?.carbsG || 225;
    const fatsG = goals?.fatsG || 65;
    const waterLiters = goals?.waterLiters || 2.0;

    const consumedCalories = nutrition?.totalCalories || 0;
    const consumedProtein = nutrition?.totalProtein || 0;
    const consumedCarbs = nutrition?.totalCarbs || 0;
    const consumedFats = nutrition?.totalFats || 0;

    return {
      calories: {
        remaining: Math.max(0, dailyCalories - consumedCalories),
        total: dailyCalories,
        consumed: consumedCalories,
        percent: Math.min(100, (consumedCalories / dailyCalories) * 100),
        status: consumedCalories > dailyCalories ? 'over' : 'on-track',
      },
      protein: {
        remaining: Math.max(0, proteinG - consumedProtein),
        total: proteinG,
        consumed: consumedProtein,
        percent: Math.min(100, (consumedProtein / proteinG) * 100),
        status: consumedProtein > proteinG ? 'over' : 'on-track',
      },
      carbs: {
        remaining: Math.max(0, carbsG - consumedCarbs),
        total: carbsG,
        consumed: consumedCarbs,
        percent: Math.min(100, (consumedCarbs / carbsG) * 100),
        status: consumedCarbs > carbsG ? 'over' : 'on-track',
      },
      fats: {
        remaining: Math.max(0, fatsG - consumedFats),
        total: fatsG,
        consumed: consumedFats,
        percent: Math.min(100, (consumedFats / fatsG) * 100),
        status: consumedFats > fatsG ? 'over' : 'on-track',
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

  const getNutrientColor = (nutrient) => {
    if (nutrient.status === 'over') return ['#FCA5A5', '#EF4444'];
    if (nutrient.status === 'complete') return ['#86EFAC', '#22C55E'];
    return [BRAND.primary, BRAND.secondary];
  };

  const NutrientBar = ({ label, nutrient, unit, icon }) => (
    <View style={styles.nutrientContainer}>
      <View style={styles.nutrientHeader}>
        <View style={styles.labelRow}>
          <Ionicons name={icon} size={18} color={BRAND.primary} />
          <Text style={styles.nutrientLabel}>{label}</Text>
        </View>
        <Text style={styles.nutrientValue}>
          {Math.round(nutrient.remaining)}{unit} left
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <LinearGradient
          colors={getNutrientColor(nutrient)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.progressBar,
            { width: `${nutrient.percent}%` },
          ]}
        />
      </View>

      <View style={styles.nutrientFooter}>
        <Text style={styles.consumedText}>
          {Math.round(nutrient.consumed)}{unit} / {Math.round(nutrient.total)}{unit}
        </Text>
        <Text style={[
          styles.statusText,
          { color: nutrient.status === 'over' ? '#EF4444' : '#22C55E' }
        ]}>
          {nutrient.status === 'over' ? '⚠️ Over' : '✓ On Track'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[SURFACES.gradient.primary[0], SURFACES.gradient.primary[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="speedometer-outline" size={24} color={TEXT.white} />
          <Text style={styles.title}>{"Today's Remaining Budget"}</Text>
        </View>

        {/* Nutrition Bars */}
        <View style={styles.nutrientsGrid}>
          <NutrientBar
            label="Calories"
            nutrient={budgets.calories}
            unit=" kcal"
            icon="flame-outline"
          />
          <NutrientBar
            label="Protein"
            nutrient={budgets.protein}
            unit="g"
            icon="barbell-outline"
          />
          <NutrientBar
            label="Carbs"
            nutrient={budgets.carbs}
            unit="g"
            icon="nutrition-outline"
          />
          <NutrientBar
            label="Fats"
            nutrient={budgets.fats}
            unit="g"
            icon="water-outline"
          />
          <NutrientBar
            label="Water"
            nutrient={budgets.water}
            unit="L"
            icon="water"
          />
        </View>

        {/* Quick Insights */}
        <View style={styles.insightsContainer}>
          {budgets.calories.remaining < 200 && (
            <View style={styles.insight}>
              <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.insightText}>
                Only {Math.round(budgets.calories.remaining)} calories remaining
              </Text>
            </View>
          )}
          {budgets.protein.remaining > 50 && (
            <View style={styles.insight}>
              <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
              <Text style={styles.insightText}>
                You need {Math.round(budgets.protein.remaining)}g more protein
              </Text>
            </View>
          )}
          {budgets.water.remaining > 1 && (
            <View style={styles.insight}>
              <Ionicons name="water-outline" size={16} color="#3B82F6" />
              <Text style={styles.insightText}>
                Drink {Math.round(budgets.water.remaining * 1000)}ml more water
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    marginVertical: SPACING.md,
  },
  card: {
    borderRadius: 16,
    padding: SPACING.lg,
    backgroundColor: SURFACES.background.primary,
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.white,
    marginLeft: SPACING.sm,
  },
  nutrientsGrid: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  nutrientContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: SPACING.md,
    backdropFilter: 'blur(10px)',
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  nutrientLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.white,
  },
  nutrientValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ADE80', // Bright green for visibility on gradient
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  nutrientFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  consumedText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  insightText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    flex: 1,
  },
});
