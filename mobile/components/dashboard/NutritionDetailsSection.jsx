/**
 * NutritionDetailsSection - Today's Nutrition dashboard card
 *
 * DESIGN PRINCIPLES:
 * - ZERO duplication: each value (consumed/remaining/goal/macro) shown exactly once
 * - One clear hierarchy: ring -> one Log food action -> macro grid -> insight -> meals
 * - Calorie/macro input methods (camera/barcode/voice/search) live inside the
 *   log flow itself, not on the dashboard
 */

import React, { useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { TEXT, SURFACES, CARD_SYSTEM, BRAND, SEMANTIC } from '../../constants/premiumTheme';
import { MODERN_MACROS } from '../../constants/modernColorPalette';
import { generateInsights } from '../../utils/healthCalculations';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Fat uses a neutral blue here instead of MODERN_MACROS.fat's red — red is
// reserved for warnings/over-goal states on this card specifically.
const FAT_COLOR = SEMANTIC.info.base;

// Same time-of-day thresholds as app/meal/[id].jsx's detectMealType — kept
// as a local copy (not imported) since that screen doesn't export it and
// touching it just to add an export would be an unrelated change.
function detectMealType(timestamp) {
  if (!timestamp) return 'snack';
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 18 || hour < 1) return 'dinner';
  return 'snack';
}

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline', availableFromHour: 0 },
  { key: 'lunch', label: 'Lunch', icon: 'partly-sunny-outline', availableFromHour: 11 },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline', availableFromHour: 17 },
  { key: 'snack', label: 'Snack', icon: 'cafe-outline', availableFromHour: 0 },
];

function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Calorie ring — consumed in the center, progress toward goal as the arc.
 * Same math/pattern as the (currently unused) DailyCalorieRing.jsx, rebuilt
 * here with this file's own design tokens.
 */
function CalorieRing({ consumed, goal }) {
  const size = 168;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const isOverGoal = consumed > goal;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const percent = goal > 0 ? Math.round((consumed / goal) * 100) : 0;
  const remaining = Math.max(0, goal - consumed);
  const ringLabel = isOverGoal
    ? `Calories: ${Math.round(consumed)} of ${Math.round(goal)} consumed, ${Math.round(consumed - goal)} over goal`
    : `Calories: ${Math.round(consumed)} of ${Math.round(goal)} consumed, ${percent} percent of daily goal, ${Math.round(remaining)} remaining`;

  return (
    // Grouped as one accessible element — a screen reader hears a single
    // coherent summary instead of "306... kcal... consumed... 23%..." as
    // disconnected fragments.
    <View
      style={styles.ringWrapper}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={ringLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(percent, 100) }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={SURFACES.background.tertiary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isOverGoal ? SEMANTIC.danger.base : MODERN_MACROS.calories.base}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{
            transformOrigin: `${size / 2}px ${size / 2}px`,
            transform: [{ rotate: '-90deg' }],
          }}
        />
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Ionicons name="flame" size={20} color={MODERN_MACROS.calories.base} />
        <Text style={styles.ringValue}>{Math.round(consumed)}</Text>
        <Text style={styles.ringUnit}>kcal</Text>
        <Text style={styles.ringSubtext}>consumed</Text>
      </View>
      <View style={styles.ringBadge} pointerEvents="none">
        <Text style={styles.ringBadgeText}>{percent}% of daily goal</Text>
      </View>
    </View>
  );
}

// One macro tile in the 2x2 grid — reuses the same percentage/remaining/
// over-goal math the previous stacked NutrientBar used, just laid out compactly.
function MacroTile({ label, value, goal, color, icon, unit = 'g' }) {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const isOverGoal = value > goal;
  const remaining = Math.max(0, goal - value);
  const remainingText = isOverGoal ? `${Math.round(value - goal)}${unit} over` : `${Math.round(remaining)}${unit} left`;
  const tileLabel = `${label}: ${Math.round(value)} of ${Math.round(goal)} ${unit}, ${Math.round(percentage)} percent, ${remainingText}`;

  return (
    // Grouped as one accessible element for the same reason as CalorieRing —
    // one coherent announcement instead of value/percent/remaining read separately.
    <View
      style={[styles.macroTile, { backgroundColor: `${color}12` }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={tileLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percentage) }}
    >
      <View style={styles.macroTileHeader}>
        <View style={[styles.macroTileIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.macroTileLabel}>{label}</Text>
      </View>
      <Text style={styles.macroTileValue}>
        {Math.round(value)}{unit} <Text style={styles.macroTileGoal}>/ {Math.round(goal)}{unit}</Text>
      </Text>
      <View style={styles.macroTileBarRow}>
        <View style={styles.macroTileBarTrack}>
          <View
            style={[
              styles.macroTileBarFill,
              { width: `${percentage}%`, backgroundColor: isOverGoal ? SEMANTIC.danger.base : color },
            ]}
          />
        </View>
        <Text style={styles.macroTilePercent}>{Math.round(percentage)}%</Text>
      </View>
      <Text style={styles.macroTileRemaining}>{remainingText}</Text>
    </View>
  );
}

function MealRow({ meal, onPress }) {
  const name = meal.foodName || 'Meal';
  const time = formatTime(meal.loggedDate);
  const calories = Math.round(meal.calories || 0);

  return (
    <TouchableOpacity
      style={styles.mealRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${time}, ${calories} kilocalories`}
      accessibilityHint="Opens meal details"
    >
      {meal.imageUrl ? (
        <Image source={{ uri: meal.imageUrl }} style={styles.mealThumbnail} accessible={false} />
      ) : (
        <View style={styles.mealThumbnailPlaceholder}>
          <Ionicons name="restaurant-outline" size={18} color={TEXT.tertiary} />
        </View>
      )}
      <View style={styles.mealRowInfo}>
        <Text style={styles.mealRowName} numberOfLines={1}>{name}</Text>
        <Text style={styles.mealRowTime}>{time}</Text>
      </View>
      <Text style={styles.mealRowCalories}>{calories} kcal</Text>
      <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
    </TouchableOpacity>
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

  // Parse goals
  const calorieGoal = goals?.dailyCalories || 2000;
  const proteinGoal = goals?.proteinG || 150;
  const carbsGoal = goals?.carbsG || 250;
  const fatGoal = goals?.fatsG || 65;
  const fiberGoal = goals?.fiberG || 30;

  const meals = useMemo(() => (Array.isArray(today?.foodLogs) ? today.foodLogs : []), [today]);
  const hasData = meals.length > 0 || calories > 0 || protein > 0 || carbs > 0;

  // Expanded by default — this card is the primary dashboard entry point for
  // nutrition (ring, log action, macros, meals), not a secondary summary a
  // user has to tap open. Collapse state then persists for the rest of the
  // screen session via this component staying mounted.
  const [expanded, setExpanded] = useState(true);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const handleLogFood = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/log');
  };

  const handleMealPress = async (meal) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const mealId = meal.clientEventId || meal.mealId || meal.id;
    if (mealId) router.push(`/meal/${mealId}`);
  };

  const remaining = Math.max(0, calorieGoal - calories);

  // Group logged meals by detected meal-time slot, chronologically within each.
  const mealsBySlot = useMemo(() => {
    const grouped = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const meal of meals) {
      const slot = detectMealType(meal.loggedDate);
      (grouped[slot] || grouped.snack).push(meal);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => new Date(a.loggedDate) - new Date(b.loggedDate));
    }
    return grouped;
  }, [meals]);

  const currentHour = new Date().getHours();

  // Only calorie/protein pacing is backed by an existing rule (generateInsights) —
  // no fiber rule exists anywhere in the codebase, so no fiber insight is shown.
  const insight = useMemo(() => {
    if (!hasData) return null;
    const results = generateInsights({
      currentCalories: calories,
      calorieGoal,
      currentProtein: protein,
      proteinGoal,
      currentHydration: 1, // neutralized — this card doesn't own hydration data
      hydrationGoal: 1,
      streak: 0, // neutralized — streak-at-risk insight belongs elsewhere
      timeOfDay: currentHour,
    });
    return results.find((r) => r.title?.toLowerCase().includes('protein') || r.title?.toLowerCase().includes('calorie')) || null;
  }, [hasData, calories, calorieGoal, protein, proteinGoal, currentHour]);

  const summaryText = hasData
    ? `${Math.round(calories)} / ${Math.round(calorieGoal)} kcal · ${meals.length} meal${meals.length === 1 ? '' : 's'}`
    : 'Log meals to track nutrition';

  return (
    <View style={styles.container}>
      {/* Header - title, subtitle, Insights action, collapse control */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={toggleExpand} activeOpacity={0.7}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="nutrition" size={22} color={MODERN_MACROS.calories.base} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Today's Nutrition</Text>
            <Text style={styles.headerSubtitle}>{summaryText}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {onViewFoodHistory && (
            <TouchableOpacity
              style={styles.insightsButton}
              onPress={onViewFoodHistory}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View detailed nutrition insights"
            >
              <Ionicons name="stats-chart-outline" size={14} color={TEXT.secondary} />
              <Text style={styles.insightsButtonText}>Insights</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={toggleExpand}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Collapse nutrition card' : 'Expand nutrition card'}
          >
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={TEXT.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsed: calories consumed/goal, remaining, meal count */}
      {!expanded && (
        <View style={styles.collapsedSummary}>
          <View style={styles.collapsedStat}>
            <Text style={styles.collapsedStatValue}>{Math.round(calories)} / {Math.round(calorieGoal)}</Text>
            <Text style={styles.collapsedStatLabel}>kcal consumed</Text>
          </View>
          <View style={styles.collapsedDivider} />
          <View style={styles.collapsedStat}>
            <Text style={styles.collapsedStatValue}>{Math.round(remaining)}</Text>
            <Text style={styles.collapsedStatLabel}>remaining</Text>
          </View>
          <View style={styles.collapsedDivider} />
          <View style={styles.collapsedStat}>
            <Text style={styles.collapsedStatValue}>{meals.length}</Text>
            <Text style={styles.collapsedStatLabel}>{meals.length === 1 ? 'meal' : 'meals'}</Text>
          </View>
        </View>
      )}

      {/* Expanded */}
      {expanded && (
        <View style={styles.expandedContent}>
          <CalorieRing consumed={calories} goal={calorieGoal} />
          <Text style={styles.remainingLine}>
            {calories > calorieGoal
              ? `${Math.round(calories - calorieGoal)} kcal over your ${Math.round(calorieGoal)} kcal goal`
              : `${Math.round(remaining)} kcal remaining of ${Math.round(calorieGoal)} kcal goal`}
          </Text>

          <TouchableOpacity
            style={styles.logFoodButton}
            onPress={handleLogFood}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Log food"
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.logFoodButtonText}>Log food</Text>
          </TouchableOpacity>

          <View style={styles.macroGrid}>
            <MacroTile label="Protein" value={protein} goal={proteinGoal} color={MODERN_MACROS.protein.base} icon="fitness" />
            <MacroTile label="Carbs" value={carbs} goal={carbsGoal} color={MODERN_MACROS.carbs.base} icon="leaf" />
            <MacroTile label="Fat" value={fat} goal={fatGoal} color={FAT_COLOR} icon="water" />
            <MacroTile label="Fiber" value={fiber} goal={fiberGoal} color={MODERN_MACROS.fiber.base} icon="flower" />
          </View>

          {insight && (
            <View style={styles.insightCard}>
              <Ionicons name={insight.icon || 'bulb-outline'} size={18} color={BRAND.primary} />
              <Text style={styles.insightText}>{insight.message}</Text>
            </View>
          )}

          {/* Meals — grouped by slot; empty slots at/before the current hour get an Add chip */}
          <View style={styles.mealsSection}>
            <Text style={styles.mealsSectionTitle}>Meals</Text>
            {MEAL_SLOTS.map((slot) => {
              const slotMeals = mealsBySlot[slot.key];
              const showAddChip = slotMeals.length === 0 && currentHour >= slot.availableFromHour && hasData;
              if (slotMeals.length === 0 && !showAddChip) return null;
              return (
                <View key={slot.key} style={styles.mealSlotGroup}>
                  {slotMeals.map((meal) => (
                    <MealRow
                      key={meal.clientEventId || meal.id || `${slot.key}-${meal.loggedDate}`}
                      meal={meal}
                      onPress={() => handleMealPress(meal)}
                    />
                  ))}
                  {showAddChip && (
                    <TouchableOpacity
                      style={styles.addMealChip}
                      onPress={handleLogFood}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${slot.label}`}
                    >
                      <Ionicons name={slot.icon} size={16} color={BRAND.primary} />
                      <Text style={styles.addMealChipText}>Add {slot.label}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {!hasData && (
              <TouchableOpacity
                style={styles.addMealChip}
                onPress={handleLogFood}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Add ${MEAL_SLOTS.find((s) => detectMealType(new Date()) === s.key)?.label || 'meal'}`}
              >
                <Ionicons name="add-circle-outline" size={16} color={BRAND.primary} />
                <Text style={styles.addMealChipText}>
                  Add {MEAL_SLOTS.find((s) => detectMealType(new Date()) === s.key)?.label || 'a meal'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
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
  insightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  insightsButtonText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },

  // Collapsed summary
  collapsedSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
  },
  collapsedStat: {
    flex: 1,
    alignItems: 'center',
  },
  collapsedStatValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  collapsedStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  collapsedDivider: {
    width: 1,
    height: 28,
    backgroundColor: SURFACES.card.border,
  },

  // Expanded content
  expandedContent: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
    alignItems: 'center',
  },

  // Calorie ring
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 32,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginTop: 2,
  },
  ringUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  ringSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  ringBadge: {
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    backgroundColor: `${MODERN_MACROS.calories.base}15`,
  },
  ringBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: MODERN_MACROS.calories.dark,
  },
  remainingLine: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    marginBottom: SPACING[4],
  },

  // Log food button — single primary action
  logFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    alignSelf: 'stretch',
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: BRAND.primary,
    marginBottom: SPACING[5],
  },
  logFoodButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFF',
  },

  // 2x2 macro grid
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
    alignSelf: 'stretch',
    marginBottom: SPACING[4],
  },
  macroTile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
  },
  macroTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  macroTileIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroTileLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  macroTileValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  macroTileGoal: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  macroTileBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  macroTileBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: SURFACES.background.tertiary,
    overflow: 'hidden',
  },
  macroTileBarFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  macroTilePercent: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  macroTileRemaining: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },

  // Insight card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    alignSelf: 'stretch',
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: `${BRAND.primary}0C`,
    marginBottom: SPACING[4],
  },
  insightText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 19,
  },

  // Meals section
  mealsSection: {
    alignSelf: 'stretch',
  },
  mealsSectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },
  mealSlotGroup: {
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[2],
  },
  mealThumbnail: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
  },
  mealThumbnailPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealRowInfo: {
    flex: 1,
  },
  mealRowName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  mealRowTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  mealRowCalories: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  addMealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${BRAND.primary}40`,
  },
  addMealChipText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
});
