/**
 * DashboardStatsGrid - Progress rings grid for key metrics
 * Apple Health inspired with vibrant colors
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CircularProgress from './CircularProgress';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { TEXT, SURFACES, CARD_SYSTEM } from '../../constants/premiumTheme';
import { MODERN_MACROS, WELLNESS_COLORS } from '../../constants/modernColorPalette';

export default function DashboardStatsGrid({ today = {}, goals = {}, onTapStat }) {
  // Parse nutrition data
  const nutrition = today?.nutrition || {};
  const calories = nutrition.totalCalories || 0;
  const protein = nutrition.totalProtein || 0;
  const carbs = nutrition.totalCarbs || 0;
  const fat = nutrition.totalFats || 0;
  const water = today?.waterIntakeLiters || 0;

  // Parse goals
  const calorieGoal = goals?.dailyCalories || 2000;
  const proteinGoal = goals?.proteinG || 150;
  const carbsGoal = goals?.carbsG || 250;
  const fatGoal = goals?.fatsG || 65;
  const waterGoal = goals?.waterLiters || 2.5;

  // Use semantic MODERN_MACROS colors for consistency
  const stats = [
    {
      id: 'calories',
      label: 'Calories',
      value: calories,
      goal: calorieGoal,
      unit: '',
      colors: MODERN_MACROS.calories.gradient, // Orange
      icon: 'flame',
    },
    {
      id: 'protein',
      label: 'Protein',
      value: protein,
      goal: proteinGoal,
      unit: 'g',
      colors: MODERN_MACROS.protein.gradient, // Purple
      icon: 'fitness',
    },
    {
      id: 'carbs',
      label: 'Carbs',
      value: carbs,
      goal: carbsGoal,
      unit: 'g',
      colors: MODERN_MACROS.carbs.gradient, // Amber
      icon: 'leaf',
    },
    {
      id: 'fat',
      label: 'Fat',
      value: fat,
      goal: fatGoal,
      unit: 'g',
      colors: MODERN_MACROS.fat.gradient, // Rose/Red
      icon: 'flash',
    },
    {
      id: 'hydration',
      label: 'Water',
      value: water,
      goal: waterGoal,
      unit: 'L',
      colors: WELLNESS_COLORS.hydration.gradient.slice(0, 2), // Cyan (water stays separate)
      icon: 'water',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={18} color={TEXT.primary} />
        <Text style={styles.headerTitle}>Today's Progress</Text>
      </View>

      <View style={styles.grid}>
        {stats.map((stat) => (
          <TouchableOpacity
            key={stat.id}
            style={styles.statCard}
            onPress={() => onTapStat?.(stat.id)}
            activeOpacity={0.7}
          >
            <CircularProgress
              value={stat.value}
              goal={stat.goal}
              size={90}
              strokeWidth={7}
              colors={stat.colors}
              label={stat.label}
              unit={stat.unit}
              showGoal={false}
            />
            <View style={styles.statDetails}>
              <Text style={styles.statValue}>
                {Math.round(stat.value)}
                <Text style={styles.statUnit}>{stat.unit}</Text>
              </Text>
              <Text style={styles.statGoal}>
                / {Math.round(stat.goal)}{stat.unit}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
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
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: SPACING[3],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  statDetails: {
    marginTop: SPACING[2],
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT.tertiary,
  },
  statGoal: {
    fontSize: 11,
    fontWeight: '500',
    color: TEXT.tertiary,
    marginTop: 2,
  },
});
