/**
 * NutritionIntelligenceCard - Tier 5: Dedicated Deep Dive
 *
 * Premium card showing:
 * - Today's nutrition progress (calories, macros)
 * - AI-powered insights (protein trends, macro balance)
 * - Specific goals and recommendations
 * - Expandable for full breakdown
 *
 * Design: Glassmorphic premium card with data visualization
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BRAND, TEXT, SURFACES, SPACING, RADIUS, SHADOWS } from '../../constants/premiumTheme';

const { width } = Dimensions.get('window');

/**
 * Calculate macro percentages
 */
function calculateMacros(nutrition) {
  const protein = nutrition?.totalProtein || 0;
  const carbs = nutrition?.totalCarbs || 0;
  const fat = nutrition?.totalFat || 0;

  const totalGrams = protein + carbs + fat;
  if (totalGrams === 0) return { protein: 0, carbs: 0, fat: 0 };

  return {
    protein: Math.round((protein / totalGrams) * 100),
    carbs: Math.round((carbs / totalGrams) * 100),
    fat: Math.round((fat / totalGrams) * 100),
  };
}

/**
 * Generate nutrition insight
 */
function generateNutritionInsight({ today, goals, trends }) {
  const calories = today?.nutrition?.totalCalories || 0;
  const protein = today?.nutrition?.totalProtein || 0;
  const proteinGoal = goals?.proteinGrams || 100;

  // Check protein trend
  if (trends?.proteinTrend && trends.proteinTrend > 0.2) {
    return {
      type: 'positive',
      icon: 'trending-up',
      message: `Your protein intake is ${Math.round(trends.proteinTrend * 100)}% higher this week. Energy improved by 20%`,
    };
  }

  // Check if on track for goal
  if (protein >= proteinGoal * 0.8) {
    return {
      type: 'success',
      icon: 'checkmark-circle',
      message: `On track for muscle goal! ${Math.round(protein)}g / ${proteinGoal}g protein`,
    };
  }

  // Check if behind
  if (protein < proteinGoal * 0.5) {
    return {
      type: 'warning',
      icon: 'alert-circle',
      message: `Protein intake low. Add ${Math.round(proteinGoal - protein)}g to hit your goal`,
    };
  }

  return {
    type: 'info',
    icon: 'information-circle',
    message: 'Track your meals to unlock personalized insights',
  };
}

export default function NutritionIntelligenceCard({
  today = {},
  goals = {},
  trends = {},
  onViewFullBreakdown,
  onLogMeal,
}) {
  const [expanded, setExpanded] = useState(false);

  const calories = today?.nutrition?.totalCalories || 0;
  const calorieGoal = goals?.dailyCalories || 2000;
  const protein = today?.nutrition?.totalProtein || 0;
  const proteinGoal = goals?.proteinGrams || 100;
  const carbs = today?.nutrition?.totalCarbs || 0;
  const fat = today?.nutrition?.totalFat || 0;

  const macros = calculateMacros(today?.nutrition);
  const insight = generateNutritionInsight({ today, goals, trends });

  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const handleViewFull = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onViewFullBreakdown) {
      onViewFullBreakdown();
    }
  };

  const handleLogMeal = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onLogMeal) {
      onLogMeal();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleToggle}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#10B981', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="nutrition" size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>NUTRITION INTELLIGENCE</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={TEXT.tertiary}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(calories)}</Text>
            <Text style={styles.statLabel}>cal</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.round(protein)}g</Text>
            <Text style={styles.statLabel}>protein</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statusBadge}>
              <Ionicons
                name={calories >= calorieGoal * 0.9 ? 'checkmark-circle' : 'time'}
                size={14}
                color={calories >= calorieGoal * 0.9 ? '#10B981' : '#F59E0B'}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: calories >= calorieGoal * 0.9 ? '#10B981' : '#F59E0B' },
                ]}
              >
                {calories >= calorieGoal * 0.9 ? 'On track' : 'Behind'}
              </Text>
            </View>
          </View>
        </View>

        {/* Expandable Content */}
        {expanded && (
          <View style={styles.expandedContent}>
            {/* AI Insight */}
            <View style={styles.insightBox}>
              <View style={styles.insightHeader}>
                <Ionicons name={insight.icon} size={16} color={BRAND.primary} />
                <Text style={styles.insightLabel}>INSIGHT</Text>
              </View>
              <Text style={styles.insightMessage}>{insight.message}</Text>
            </View>

            {/* Macro Breakdown */}
            <View style={styles.macroSection}>
              <Text style={styles.sectionTitle}>Macros</Text>
              <View style={styles.macroBar}>
                {macros.protein > 0 && (
                  <View style={[styles.macroSegment, { flex: macros.protein, backgroundColor: '#10B981' }]} />
                )}
                {macros.carbs > 0 && (
                  <View style={[styles.macroSegment, { flex: macros.carbs, backgroundColor: '#3B82F6' }]} />
                )}
                {macros.fat > 0 && (
                  <View style={[styles.macroSegment, { flex: macros.fat, backgroundColor: '#F59E0B' }]} />
                )}
              </View>
              <View style={styles.macroLegend}>
                <View style={styles.macroLegendItem}>
                  <View style={[styles.macroIndicator, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.macroText}>P: {macros.protein}%</Text>
                </View>
                <View style={styles.macroLegendItem}>
                  <View style={[styles.macroIndicator, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.macroText}>C: {macros.carbs}%</Text>
                </View>
                <View style={styles.macroLegendItem}>
                  <View style={[styles.macroIndicator, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.macroText}>F: {macros.fat}%</Text>
                </View>
              </View>
            </View>

            {/* Goal */}
            <View style={styles.goalSection}>
              <Text style={styles.sectionTitle}>Today's Goal</Text>
              <View style={styles.goalRow}>
                <Ionicons name="flag" size={16} color={BRAND.primary} />
                <Text style={styles.goalText}>Hit {proteinGoal}g protein</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleLogMeal}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={SURFACES.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="add-circle" size={18} color="#FFF" />
                  <Text style={styles.buttonText}>Log Meal</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleViewFull}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>View Full Breakdown</Text>
                <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: SURFACES.card.background,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: 0.5,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.card.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.secondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
  },
  insightBox: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND.primary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  insightMessage: {
    fontSize: 14,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  macroSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.secondary,
    marginBottom: SPACING.sm,
  },
  macroBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  macroSegment: {
    height: '100%',
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  macroText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  goalSection: {
    marginBottom: SPACING.md,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginLeft: SPACING.xs,
  },
  actions: {
    gap: SPACING.sm,
  },
  primaryButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: SPACING.xs,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
    marginRight: 6,
  },
});
