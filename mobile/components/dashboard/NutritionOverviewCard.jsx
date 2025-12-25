/**
 * NutritionOverviewCard - Professional nutrition visualization
 *
 * Senior Product Designer approach:
 * - Information-dense but readable
 * - Compact macro rings in grid
 * - Quick stats for calories and key nutrients
 * - Premium visual hierarchy
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import CompactNutrientRing from './CompactNutrientRing';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SURFACES,
  SEMANTIC,
} from '../../constants/premiumTheme';

// ============================================================================
// SMART CONTEXT ENGINE - Nutrition Advice
// ============================================================================
const getNutritionAdvice = (percentage) => {
  const hour = new Date().getHours();
  
  if (percentage >= 100) return "Goal hit! You're fueled up 🔥";
  if (percentage >= 90) return "So close! Finish strong 🎯";
  
  if (hour < 11) return percentage < 15 ? "Fuel your morning 🍳" : "Great start to the day 🚀";
  if (hour < 15) return percentage < 40 ? "Don't forget lunch! 🥗" : "Keeping energy steady ⚡";
  if (hour < 20) return percentage < 70 ? "Dinner time approaching 🍽️" : "On track for the day 👌";
  return "Winding down for rest 🌙";
};

export default function NutritionOverviewCard({
  calories = 0,
  calorieGoal = 2000,
  protein = 0,
  proteinGoal = 150,
  carbs = 0,
  carbsGoal = 250,
  fat = 0,
  fatGoal = 65,
  fiber = 0,
  fiberGoal = 30,
  sugar = 0,
  sugarGoal = 50,
}) {
  const caloriePercentage = Math.round((calories / calorieGoal) * 100);

  // Calculate macro calories
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalMacroCals = proteinCals + carbsCals + fatCals;

  // Macro distribution percentages
  const proteinPercent = totalMacroCals > 0 ? Math.round((proteinCals / totalMacroCals) * 100) : 0;
  const carbsPercent = totalMacroCals > 0 ? Math.round((carbsCals / totalMacroCals) * 100) : 0;
  const fatPercent = totalMacroCals > 0 ? Math.round((fatCals / totalMacroCals) * 100) : 0;

  const smartAdvice = getNutritionAdvice(caloriePercentage);

  return (
    <GlassCard padding="lg">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={SURFACES.gradient.primary}
            style={styles.headerIcon}
          >
            <Ionicons name="nutrition" size={20} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Nutrition</Text>
            <Text style={styles.headerSubtitle}>{smartAdvice}</Text>
          </View>
        </View>
        <Text style={styles.headerBadge}>{caloriePercentage}% of goal</Text>
      </View>

      {/* Calorie Summary */}
      <View style={styles.calorieSection}>
        <View style={styles.calorieMain}>
          <Text style={styles.calorieValue}>{Math.round(calories)}</Text>
          <Text style={styles.calorieLabel}>/ {calorieGoal} kcal</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill,
              {
                width: `${Math.min(caloriePercentage, 100)}%`,
                backgroundColor: caloriePercentage >= 100 ? '#10B981' : '#3B82F6'
              }
            ]} />
          </View>
          <Text style={styles.progressBarText}>
            {calorieGoal - calories > 0
              ? `${Math.round(calorieGoal - calories)} kcal remaining`
              : `Goal reached! (+${Math.round(calories - calorieGoal)} kcal)`}
          </Text>
        </View>
      </View>

      {/* Macronutrient Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Macronutrients</Text>
        <View style={styles.macroGrid}>
          <CompactNutrientRing
            value={protein}
            goal={proteinGoal}
            label="Protein"
            unit="g"
            size={70}
            strokeWidth={6}
            colors={['#F59E0B', '#D97706']} // Orange
          />
          <CompactNutrientRing
            value={carbs}
            goal={carbsGoal}
            label="Carbs"
            unit="g"
            size={70}
            strokeWidth={6}
            colors={['#8B5CF6', '#7C3AED']} // Purple
          />
          <CompactNutrientRing
            value={fat}
            goal={fatGoal}
            label="Fat"
            unit="g"
            size={70}
            strokeWidth={6}
            colors={['#EC4899', '#DB2777']} // Pink
          />
        </View>

        {/* Macro Distribution */}
        <View style={styles.macroDistribution}>
          <View style={styles.distributionBar}>
            {proteinPercent > 0 && (
              <View
                style={[
                  styles.distributionSegment,
                  { width: `${proteinPercent}%`, backgroundColor: '#F59E0B' },
                ]}
              />
            )}
            {carbsPercent > 0 && (
              <View
                style={[
                  styles.distributionSegment,
                  { width: `${carbsPercent}%`, backgroundColor: '#8B5CF6' },
                ]}
              />
            )}
            {fatPercent > 0 && (
              <View
                style={[
                  styles.distributionSegment,
                  { width: `${fatPercent}%`, backgroundColor: '#EC4899' },
                ]}
              />
            )}
          </View>
          <View style={styles.distributionLabels}>
            <Text style={styles.distributionLabel}>
              <Text style={[styles.dot, { color: '#F59E0B' }]}>●</Text> {proteinPercent}%
            </Text>
            <Text style={styles.distributionLabel}>
              <Text style={[styles.dot, { color: '#8B5CF6' }]}>●</Text> {carbsPercent}%
            </Text>
            <Text style={styles.distributionLabel}>
              <Text style={[styles.dot, { color: '#EC4899' }]}>●</Text> {fatPercent}%
            </Text>
          </View>
        </View>
      </View>

      {/* Additional Nutrients */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional</Text>
        <View style={styles.additionalGrid}>
          <CompactNutrientRing
            value={fiber}
            goal={fiberGoal}
            label="Fiber"
            unit="g"
            size={60}
            strokeWidth={5}
            colors={['#10B981', '#059669']} // Green
          />
          <CompactNutrientRing
            value={sugar}
            goal={sugarGoal}
            label="Sugar"
            unit="g"
            size={60}
            strokeWidth={5}
            colors={['#EF4444', '#DC2626']} // Red
            showValue={true}
          />
        </View>
      </View>

      {/* Macro Calories Breakdown */}
      <View style={styles.calorieBreakdown}>
        <View style={styles.breakdownItem}>
          <Ionicons name="flame" size={14} color="#F59E0B" />
          <Text style={styles.breakdownText}>
            Protein: <Text style={styles.breakdownValue}>{proteinCals} kcal</Text>
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Ionicons name="flame" size={14} color="#8B5CF6" />
          <Text style={styles.breakdownText}>
            Carbs: <Text style={styles.breakdownValue}>{carbsCals} kcal</Text>
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Ionicons name="flame" size={14} color="#EC4899" />
          <Text style={styles.breakdownText}>
            Fat: <Text style={styles.breakdownValue}>{fatCals} kcal</Text>
          </Text>
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  headerBadge: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: SEMANTIC.info.base,
  },

  // Calorie Section
  calorieSection: {
    marginBottom: SPACING[5],
  },
  calorieMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  calorieValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.primary,
    letterSpacing: -1,
  },
  calorieLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    color: TEXT.secondary,
  },
  progressBarContainer: {
    gap: SPACING[2],
  },
  progressBarBg: {
    height: 8,
    backgroundColor: `${SEMANTIC.info.base}15`,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  progressBarText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: `${TEXT.primary}08`,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },

  // Macro Grid
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING[4],
  },

  // Macro Distribution
  macroDistribution: {
    gap: SPACING[2],
  },
  distributionBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    backgroundColor: `${TEXT.primary}08`,
  },
  distributionSegment: {
    height: '100%',
  },
  distributionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  distributionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  dot: {
    fontSize: TYPOGRAPHY.size.sm,
  },

  // Additional Grid
  additionalGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  // Calorie Breakdown
  calorieBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: `${TEXT.primary}08`,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  breakdownText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  breakdownValue: {
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
});
