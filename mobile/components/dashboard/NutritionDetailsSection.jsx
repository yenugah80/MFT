/**
 * NutritionDetailsSection - Clean nutrition breakdown
 *
 * DESIGN PRINCIPLES:
 * - ZERO duplication: Each nutrient shown exactly once
 * - Progress bars for ALL nutrients (more informative than rings)
 * - Clear visual hierarchy with semantic colors
 * - Expandable for detailed view
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { TEXT, SURFACES, CARD_SYSTEM, BRAND } from '../../constants/premiumTheme';
import { MODERN_MACROS } from '../../constants/modernColorPalette';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Nutrient Progress Bar - single unified visualization
function NutrientBar({ label, value, goal, color, unit = 'g', icon, isPrimary = false }) {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const isOverGoal = value > goal;
  const remaining = Math.max(0, goal - value);

  return (
    <View style={[styles.nutrientRow, isPrimary && styles.primaryNutrientRow]}>
      <View style={styles.nutrientHeader}>
        <View style={styles.nutrientLabelContainer}>
          <View style={[styles.nutrientIcon, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={isPrimary ? 18 : 14} color={color} />
          </View>
          <Text style={[styles.nutrientLabel, isPrimary && styles.primaryLabel]}>{label}</Text>
        </View>
        <View style={styles.nutrientValueContainer}>
          <Text style={[styles.nutrientValue, isPrimary && styles.primaryValue, isOverGoal && styles.overGoalText]}>
            {Math.round(value)}
          </Text>
          <Text style={styles.nutrientUnit}>{unit}</Text>
          <Text style={styles.nutrientGoal}> / {Math.round(goal)}{unit}</Text>
        </View>
      </View>

      <View style={[styles.progressBarContainer, isPrimary && styles.primaryProgressBar]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: isOverGoal ? '#F59E0B' : color,
            },
          ]}
        />
      </View>

      <View style={styles.nutrientFooter}>
        <Text style={styles.percentageText}>{Math.round(percentage)}% of goal</Text>
        {!isOverGoal && remaining > 0 && (
          <Text style={styles.remainingText}>{Math.round(remaining)}{unit} remaining</Text>
        )}
        {isOverGoal && (
          <Text style={styles.overGoalBadge}>+{Math.round(value - goal)}{unit} over</Text>
        )}
      </View>
    </View>
  );
}

// Compact macro chip for collapsed summary
function MacroChip({ label, value, goal, color }) {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;

  return (
    <View style={[styles.macroChip, { borderColor: `${color}40` }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{Math.round(percentage)}%</Text>
    </View>
  );
}

export default function NutritionDetailsSection({
  today = {},
  goals = {},
  onViewFoodHistory,
}) {
  const router = useRouter();

  // Parse today's nutrition data
  const nutrition = today?.nutrition || {};
  const calories = nutrition.totalCalories || 0;
  const protein = nutrition.totalProtein || 0;
  const carbs = nutrition.totalCarbs || 0;
  const fat = nutrition.totalFats || 0;
  const fiber = nutrition.totalFiber || 0;
  const sugar = nutrition.totalSugar || 0;
  const sodium = nutrition.totalSodium || 0;

  // Parse goals
  const calorieGoal = goals?.dailyCalories || 2000;
  const proteinGoal = goals?.proteinG || 150;
  const carbsGoal = goals?.carbsG || 250;
  const fatGoal = goals?.fatsG || 65;
  const fiberGoal = goals?.fiberG || 30;
  const sugarGoal = goals?.sugarG || 50;
  const sodiumGoal = goals?.sodiumMg || 2300;

  const hasData = calories > 0 || protein > 0 || carbs > 0;

  // Nothing to hide when empty — start expanded so the empty-state preview
  // (0g macro bars + log CTAs) is visible immediately instead of behind a tap.
  const [expanded, setExpanded] = useState(!hasData);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleSnapMeal = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/(tabs)/log', params: { focus: 'camera' } });
  };

  const handleManualLog = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/log');
  };

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (!hasData) return 0;
    const calPct = Math.min((calories / calorieGoal) * 100, 100);
    const proPct = Math.min((protein / proteinGoal) * 100, 100);
    const carbPct = Math.min((carbs / carbsGoal) * 100, 100);
    const fatPct = Math.min((fat / fatGoal) * 100, 100);
    return Math.round((calPct + proPct + carbPct + fatPct) / 4);
  }, [calories, protein, carbs, fat, calorieGoal, proteinGoal, carbsGoal, fatGoal, hasData]);

  // Collapsed summary text
  const summaryText = useMemo(() => {
    if (!hasData) return 'Log meals to track nutrition';
    return `${Math.round(calories)} cal • ${overallProgress}% of daily goals`;
  }, [hasData, calories, overallProgress]);

  return (
    <View style={styles.container}>
      {/* Header - always visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="nutrition" size={22} color={MODERN_MACROS.calories.base} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Today's Nutrition</Text>
            <Text style={styles.headerSubtitle}>{summaryText}</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={TEXT.secondary}
        />
      </TouchableOpacity>

      {/* Collapsed: Quick macro summary chips */}
      {!expanded && hasData && (
        <View style={styles.collapsedSummary}>
          <MacroChip label="Pro" value={protein} goal={proteinGoal} color={MODERN_MACROS.protein.base} />
          <MacroChip label="Carb" value={carbs} goal={carbsGoal} color={MODERN_MACROS.carbs.base} />
          <MacroChip label="Fat" value={fat} goal={fatGoal} color={MODERN_MACROS.fat.base} />
          <MacroChip label="Fiber" value={fiber} goal={fiberGoal} color={MODERN_MACROS.fiber.base} />
        </View>
      )}

      {/* Expanded: Full breakdown */}
      {expanded && (
        <View style={styles.expandedContent}>
          {hasData ? (
            <>
              {/* Primary: Calories */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Energy</Text>
                <NutrientBar
                  label="Calories"
                  value={calories}
                  goal={calorieGoal}
                  color={MODERN_MACROS.calories.base}
                  unit=""
                  icon="flame"
                  isPrimary
                />
              </View>

              {/* Macronutrients */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Macronutrients</Text>
                <View style={styles.nutrientsContainer}>
                  <NutrientBar
                    label="Protein"
                    value={protein}
                    goal={proteinGoal}
                    color={MODERN_MACROS.protein.base}
                    icon="fitness"
                  />
                  <NutrientBar
                    label="Carbohydrates"
                    value={carbs}
                    goal={carbsGoal}
                    color={MODERN_MACROS.carbs.base}
                    icon="leaf"
                  />
                  <NutrientBar
                    label="Fat"
                    value={fat}
                    goal={fatGoal}
                    color={MODERN_MACROS.fat.base}
                    icon="flash"
                  />
                </View>
              </View>

              {/* Additional Nutrients - only show if data exists */}
              {(fiber > 0 || sugar > 0 || sodium > 0) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Additional Nutrients</Text>
                  <View style={styles.nutrientsContainer}>
                    {fiber > 0 && (
                      <NutrientBar
                        label="Fiber"
                        value={fiber}
                        goal={fiberGoal}
                        color={MODERN_MACROS.fiber.base}
                        icon="flower"
                      />
                    )}
                    {sugar > 0 && (
                      <NutrientBar
                        label="Sugar"
                        value={sugar}
                        goal={sugarGoal}
                        color="#EC4899"
                        icon="cube"
                      />
                    )}
                    {sodium > 0 && (
                      <NutrientBar
                        label="Sodium"
                        value={sodium}
                        goal={sodiumGoal}
                        color="#6366F1"
                        unit="mg"
                        icon="water-outline"
                      />
                    )}
                  </View>
                </View>
              )}

              {/* View Food Analytics Link */}
              {onViewFoodHistory && (
                <TouchableOpacity
                  style={styles.viewHistoryLink}
                  onPress={onViewFoodHistory}
                  activeOpacity={0.7}
                >
                  <View style={styles.viewHistoryIcon}>
                    <Ionicons name="analytics-outline" size={16} color="#6B4EFF" />
                  </View>
                  <Text style={styles.viewHistoryText}>View Food Analytics</Text>
                  <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateMessage}>
                Log your first meal to see today's picture take shape
              </Text>

              <View style={styles.emptyStateActions}>
                <TouchableOpacity
                  style={styles.snapButton}
                  onPress={handleSnapMeal}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Snap a meal"
                >
                  <Ionicons name="camera" size={18} color="#FFF" />
                  <Text style={styles.snapButtonText}>Snap a meal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.logButton}
                  onPress={handleManualLog}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Log manually"
                >
                  <Ionicons name="add" size={18} color={BRAND.primary} />
                  <Text style={styles.logButtonText}>Log</Text>
                </TouchableOpacity>
              </View>

              {/* Preview of what today's picture will look like once logged */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Energy</Text>
                <NutrientBar
                  label="Calories"
                  value={0}
                  goal={calorieGoal}
                  color={MODERN_MACROS.calories.base}
                  unit=""
                  icon="flame"
                  isPrimary
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Macronutrients</Text>
                <View style={styles.nutrientsContainer}>
                  <NutrientBar label="Protein" value={0} goal={proteinGoal} color={MODERN_MACROS.protein.base} icon="fitness" />
                  <NutrientBar label="Carbohydrates" value={0} goal={carbsGoal} color={MODERN_MACROS.carbs.base} icon="leaf" />
                  <NutrientBar label="Fat" value={0} goal={fatGoal} color={MODERN_MACROS.fat.base} icon="flash" />
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CARD_SYSTEM.standard,
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
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${MODERN_MACROS.calories.base}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Collapsed summary
  collapsedSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
  },
  macroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    borderWidth: 1,
    backgroundColor: SURFACES.background.secondary,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  chipValue: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },

  // Expanded content
  expandedContent: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
  },
  section: {
    marginBottom: SPACING[5],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },
  nutrientsContainer: {
    gap: SPACING[4],
  },

  // Nutrient bar
  nutrientRow: {
    gap: SPACING[2],
  },
  primaryNutrientRow: {
    paddingBottom: SPACING[2],
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  nutrientIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutrientLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  primaryLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  nutrientValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  nutrientValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  primaryValue: {
    fontSize: TYPOGRAPHY.size.xl,
  },
  overGoalText: {
    color: '#F59E0B',
  },
  nutrientUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    marginLeft: 2,
  },
  nutrientGoal: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  primaryProgressBar: {
    height: 12,
    borderRadius: RADIUS.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  nutrientFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  remainingText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  overGoalBadge: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#F59E0B',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },

  // Empty state — 0g macro bar preview + log CTAs
  emptyState: {
    gap: SPACING[5],
  },
  emptyStateMessage: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  emptyStateActions: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  snapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: BRAND.primary,
  },
  snapButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFF',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: `${BRAND.primary}30`,
  },
  logButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  // View Food History Link
  viewHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    backgroundColor: '#6B4EFF08',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#6B4EFF15',
    marginTop: SPACING[2],
  },
  viewHistoryIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: '#6B4EFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewHistoryText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
});
