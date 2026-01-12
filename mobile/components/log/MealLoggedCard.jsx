/**
 * ============================================================================
 * MealLoggedCard - World-Class Meal Output Display
 * ============================================================================
 * Post-logging confirmation screen with Tufte principles:
 * - Maximum data-ink ratio (no chartjunk)
 * - Clear information hierarchy
 * - Elegant typography with proper scale
 * - Subtle animations for delight
 * - Glass morphism with premium gradients
 *
 * Design Philosophy:
 * "Above all else show the data" - Edward Tufte
 * - Primary: Nutrition values (what user cares about most)
 * - Secondary: Portion info and meal context
 * - Tertiary: Source confidence and edit options
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { BRAND, TEXT, SEMANTIC, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ICON_SIZES, SURFACES, MACRO_COLORS, NUTRISCORE, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';
import { NutriScoreGlow, HealthScoreBadge } from '../NutriScoreBadge';

// ============================================================================
// HELPER FUNCTIONS - Tufte-inspired Data Formatting
// ============================================================================

/**
 * Format macro value with appropriate precision
 * Tufte principle: Don't show false precision
 */
const formatMacro = (value) => {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) return '0';
  if (num < 1) return num.toFixed(1);
  return Math.round(num).toString();
};

/**
 * Format calories - whole numbers only
 */
const formatCalories = (value) => {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) return '0';
  return Math.round(num).toString();
};

/**
 * Get confidence color and label
 */
const getConfidenceDisplay = (confidence) => {
  if (confidence >= 0.9) return { color: SEMANTIC.success.base, label: 'Strong estimate', icon: 'checkmark-circle' };
  if (confidence >= 0.7) return { color: SEMANTIC.warning.base, label: 'Typical estimate', icon: 'information-circle' };
  return { color: SEMANTIC.danger.base, label: 'Needs adjustment', icon: 'warning' };
};

/**
 * Get source icon based on input method
 */
const getSourceIcon = (source) => {
  switch (source) {
    case 'voice': return 'mic';
    case 'photo': return 'camera';
    case 'barcode': return 'barcode';
    default: return 'create';
  }
};

/**
 * Get source label
 */
const getSourceLabel = (source) => {
  switch (source) {
    case 'voice': return 'Voice Input';
    case 'photo': return 'Photo Analysis';
    case 'barcode': return 'Barcode Scan';
    default: return 'Text Input';
  }
};

// ============================================================================
// MACRO BAR COMPONENT - Tufte Small Multiple
// ============================================================================

// Static version - no animation (prevents bridge overflow)
const StaticMacroBar = ({ label, value, unit, color, goal, icon }) => {
  // Guard against NaN: ensure goal > 0 and value is a valid number
  const safeValue = Number(value) || 0;
  const safeGoal = Number(goal) || 0;
  const percentage = safeGoal > 0 ? Math.min((safeValue / safeGoal) * 100, 100) : 0;

  return (
    <View style={styles.macroBar}>
      <View style={styles.macroHeader}>
        <View style={styles.macroLabelContainer}>
          <Ionicons name={icon} size={ICON_SIZES.sm} color={color} />
          <Text style={styles.macroLabel}>{label}</Text>
        </View>
        <View style={styles.macroValueContainer}>
          <Text style={styles.macroValue}>{formatMacro(value)}</Text>
          <Text style={styles.macroUnit}>{unit}</Text>
          {goal && (
            <Text style={styles.macroGoal}>/ {formatMacro(goal)}</Text>
          )}
        </View>
      </View>

      {/* Progress Track - static fill */}
      <View style={styles.macroTrack}>
        <View
          style={[
            styles.macroFill,
            {
              backgroundColor: color,
              flex: percentage / 100,
            },
          ]}
        />
        <View style={{ flex: (100 - percentage) / 100 }} />
      </View>
    </View>
  );
};

// Animated version - deferred rendering
const MacroBar = ({ label, value, unit, color, goal, icon, delay = 0 }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  // Guard against NaN: ensure goal > 0 and value is a valid number
  const safeValue = Number(value) || 0;
  const safeGoal = Number(goal) || 0;
  const percentage = safeGoal > 0 ? Math.min((safeValue / safeGoal) * 100, 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(fillAnim, {
        toValue: percentage,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percentage, delay]);

  const animatedFlex = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.macroBar}>
      <View style={styles.macroHeader}>
        <View style={styles.macroLabelContainer}>
          <Ionicons name={icon} size={ICON_SIZES.sm} color={color} />
          <Text style={styles.macroLabel}>{label}</Text>
        </View>
        <View style={styles.macroValueContainer}>
          <Text style={styles.macroValue}>{formatMacro(value)}</Text>
          <Text style={styles.macroUnit}>{unit}</Text>
          {goal && (
            <Text style={styles.macroGoal}>/ {formatMacro(goal)}</Text>
          )}
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.macroTrack}>
        <Animated.View
          style={[
            styles.macroFill,
            {
              backgroundColor: color,
              flex: animatedFlex,
            },
          ]}
        />
        {/* Empty space for remaining percentage */}
        <View style={{ flex: (100 - percentage) / 100 }} />
      </View>
    </View>
  );
};

// ============================================================================
// COMPARISON BAR COMPONENT - Shows impact on daily goals
// ============================================================================

// Static version - no animation (prevents bridge overflow)
const StaticComparisonBar = ({ label, mealValue, dailyTotal, goal, unit, color, onViewTrends }) => {
  // Guard against NaN
  const safeMealValue = Number(mealValue) || 0;
  const safeDailyTotal = Number(dailyTotal) || 0;
  const safeGoal = Number(goal) || 0;
  const totalAfter = safeDailyTotal + safeMealValue;
  const mealPct = safeGoal > 0 ? Math.min((safeMealValue / safeGoal) * 100, 100) : 0;
  const totalBeforePct = safeGoal > 0 ? Math.min((safeDailyTotal / safeGoal) * 100, 100) : 0;

  return (
    <View style={styles.comparisonBar}>
      <View style={styles.comparisonHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.comparisonLabel}>{label}</Text>
          {onViewTrends && (
            <TouchableOpacity onPress={() => {
              Haptics.selectionAsync();
              onViewTrends();
            }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="stats-chart" size={14} color={TEXT.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.comparisonValueText}>
          {formatMacro(totalAfter)}<Text style={styles.comparisonUnit}> / {formatMacro(goal)} {unit}</Text>
        </Text>
      </View>
      <View style={[styles.comparisonTrack, { flexDirection: 'row' }]}>
        <View style={[styles.comparisonFill, {
          backgroundColor: `${color}40`,
          flex: totalBeforePct / 100,
        }]} />
        <View style={[styles.comparisonFill, {
          backgroundColor: color,
          flex: mealPct / 100,
        }]} />
        <View style={{ flex: Math.max(0, (100 - totalBeforePct - mealPct)) / 100 }} />
        <View style={[styles.goalMarker, { position: 'absolute', right: 0 }]} />
      </View>
    </View>
  );
};

// Animated version - deferred rendering with staggered delays
const ComparisonBar = ({ label, mealValue, dailyTotal, goal, unit, color, onViewTrends, delay = 0 }) => {
  // Guard against NaN
  const safeMealValue = Number(mealValue) || 0;
  const safeDailyTotal = Number(dailyTotal) || 0;
  const safeGoal = Number(goal) || 0;
  const totalAfter = safeDailyTotal + safeMealValue;
  const mealPct = safeGoal > 0 ? Math.min((safeMealValue / safeGoal) * 100, 100) : 0;
  const totalBeforePct = safeGoal > 0 ? Math.min((safeDailyTotal / safeGoal) * 100, 100) : 0;

  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(fillAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  const animatedMealFlex = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, mealPct / 100],
  });

  const animatedTotalFlex = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, totalBeforePct / 100],
  });

  return (
    <View style={styles.comparisonBar}>
      <View style={styles.comparisonHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.comparisonLabel}>{label}</Text>
          {onViewTrends && (
            <TouchableOpacity onPress={() => {
              Haptics.selectionAsync();
              onViewTrends();
            }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="stats-chart" size={14} color={TEXT.tertiary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.comparisonValueText}>
          {formatMacro(totalAfter)}<Text style={styles.comparisonUnit}> / {formatMacro(goal)} {unit}</Text>
        </Text>
      </View>
      <View style={[styles.comparisonTrack, { flexDirection: 'row' }]}>
        {/* Daily Total Before (lighter shade) */}
        <Animated.View style={[styles.comparisonFill, {
          backgroundColor: `${color}40`,
          flex: animatedTotalFlex,
        }]} />
        {/* This Meal (main color) */}
        <Animated.View style={[styles.comparisonFill, {
          backgroundColor: color,
          flex: animatedMealFlex,
        }]} />
        {/* Remaining space */}
        <View style={{ flex: Math.max(0, (100 - totalBeforePct - mealPct)) / 100 }} />
        {/* Goal Marker */}
        <View style={[styles.goalMarker, { position: 'absolute', right: 0 }]} />
      </View>
    </View>
  );
};

// ============================================================================
// MICRONUTRIENT ROW - Compact Data Display
// ============================================================================

const MicroRow = ({ name, value, unit, dv }) => {
  const safeValue = Number(value) || 0;
  const safeDv = Number(dv) || 0;
  const percentage = safeDv > 0 ? Math.round((safeValue / safeDv) * 100) : null;
  const color = percentage !== null && percentage >= 100 ? SEMANTIC.success.base : percentage !== null && percentage >= 50 ? SEMANTIC.warning.base : TEXT.tertiary;

  return (
    <View style={styles.microRow}>
      <Text style={styles.microName}>{name}</Text>
      <View style={styles.microRight}>
        <Text style={styles.microValue}>
          {value < 1 ? value.toFixed(1) : Math.round(value)}{unit}
        </Text>
        {percentage !== null && (
          <Text style={[styles.microPercent, { color }]}>
            {percentage}%
          </Text>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MealLoggedCard({
  meal,
  onEdit,
  onShare,
  onClose,
  dailyGoals,
  dailyTotals,
  onViewTrends,
  onViewHistory,
}) {
  const router = useRouter();
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [fadeAnim] = useState(new Animated.Value(0));
  // Defer animated child components to prevent bridge overflow
  const [animatedComponentsReady, setAnimatedComponentsReady] = useState(false);
  const interactionRef = useRef(null);

  // Navigate to meal detail screen
  const handleViewDetails = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Check all possible ID fields (clientEventId, mealId, id, local_id)
    const mealId = meal.clientEventId || meal.mealId || meal.id || meal.local_id;
    if (mealId) {
      router.push(`/meal/${mealId}`);
    }
  };

  useEffect(() => {
    // Skip all animations to prevent bridge overflow
    // Set values directly without animation
    scaleAnim.setValue(1);
    fadeAnim.setValue(1);

    // Delay animated children significantly to prevent bridge overflow
    // Use InteractionManager for safer deferral
    const handle = InteractionManager.runAfterInteractions(() => {
      const timer = setTimeout(() => {
        setAnimatedComponentsReady(true);
      }, 400);
      interactionRef.current = timer;
    });

    return () => {
      handle.cancel();
      if (interactionRef.current) {
        clearTimeout(interactionRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!meal) return null;

  const confidenceDisplay = getConfidenceDisplay(meal.confidence ?? 0.7);
  const sourceIcon = getSourceIcon(meal.source);
  const sourceLabel = getSourceLabel(meal.source);

  // Extract micronutrients (top 6 most important)
  const microsEntries = meal.micros && typeof meal.micros === 'object'
    ? Object.entries(meal.micros)
    : [];
  const importantMicros = microsEntries
    .filter(([, val]) => val && val.value > 0)
    .slice(0, 6);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ──────────────────────────────────────────── */}
        {/* HEADER - Success Confirmation */}
        {/* ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark-circle" size={ICON_SIZES['2xl']} color={SEMANTIC.success.base} />
          </View>
          <Text style={styles.headerTitle}>Meal Logged</Text>
          <Text style={styles.headerSubtitle}>{meal.foodName}</Text>
        </View>

        {/* ──────────────────────────────────────────── */}
        {/* PRIMARY DATA - Calories (Largest Visual Weight) */}
        {/* ──────────────────────────────────────────── */}
        <View style={styles.primaryCard}>
          <LinearGradient
            colors={SURFACES.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryGradient}
          >
            <Text style={styles.caloriesLabel}>Calories</Text>
            <Text style={styles.caloriesValue}>{formatCalories(meal.calories)}</Text>
            <Text style={styles.caloriesUnit}>kcal</Text>
            {dailyGoals?.dailyCalories && (
              <Text style={styles.caloriesGoal}>
                {Math.round((meal.calories / dailyGoals.dailyCalories) * 100)}% of daily goal
              </Text>
            )}
          </LinearGradient>
        </View>

        {/* ──────────────────────────────────────────── */}
        {/* HEALTH METRICS - NutriScore & Health Score */}
        {/* ──────────────────────────────────────────── */}
        {(meal.nutriScore || meal.healthScore) && (
          <View style={styles.healthMetricsCard}>
            {meal.nutriScore && (
              <View style={styles.nutriScoreSection}>
                <NutriScoreGlow grade={meal.nutriScore} size="lg" />
                <View style={styles.nutriScoreInfo}>
                  <Text style={styles.nutriScoreLabel}>NutriScore</Text>
                  <Text style={[styles.nutriScoreGrade, { color: NUTRISCORE[meal.nutriScore]?.text || TEXT.primary }]}>
                    Grade {meal.nutriScore}
                  </Text>
                </View>
              </View>
            )}

            {meal.healthScore !== null && meal.healthScore !== undefined && (
              <View style={styles.healthScoreSection}>
                <HealthScoreBadge score={meal.healthScore} size="lg" />
                <View style={styles.healthScoreInfo}>
                  <Text style={styles.healthScoreLabel}>Health Score</Text>
                  <Text style={styles.healthScoreValue}>{meal.healthScore}/100</Text>
                </View>
              </View>
            )}

            {meal.healthAnalysis && (
              <Text style={styles.healthAnalysis}>{meal.healthAnalysis}</Text>
            )}
          </View>
        )}

        {/* ──────────────────────────────────────────── */}
        {/* SECONDARY DATA - Macronutrients */}
        {/* ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <View style={styles.macroContainer}>
            {animatedComponentsReady ? (
              <>
                <MacroBar
                  label="Protein"
                  value={meal.protein}
                  unit="g"
                  color={MACRO_COLORS.protein.base}
                  goal={dailyGoals?.proteinG}
                  icon="barbell"
                  delay={0}
                />
                <MacroBar
                  label="Carbs"
                  value={meal.carbs}
                  unit="g"
                  color={MACRO_COLORS.carbs.base}
                  goal={dailyGoals?.carbsG}
                  icon="nutrition"
                  delay={50}
                />
                <MacroBar
                  label="Fat"
                  value={meal.fat}
                  unit="g"
                  color={MACRO_COLORS.fat.base}
                  goal={dailyGoals?.fatG}
                  icon="flame"
                  delay={100}
                />
                {meal.fiber !== null && meal.fiber !== undefined && (
                  <MacroBar
                    label="Fiber"
                    value={meal.fiber}
                    unit="g"
                    color={MACRO_COLORS.fiber.base}
                    goal={dailyGoals?.fiberG}
                    icon="leaf"
                    delay={150}
                  />
                )}
              </>
            ) : (
              <>
                <StaticMacroBar
                  label="Protein"
                  value={meal.protein}
                  unit="g"
                  color={MACRO_COLORS.protein.base}
                  goal={dailyGoals?.proteinG}
                  icon="barbell"
                />
                <StaticMacroBar
                  label="Carbs"
                  value={meal.carbs}
                  unit="g"
                  color={MACRO_COLORS.carbs.base}
                  goal={dailyGoals?.carbsG}
                  icon="nutrition"
                />
                <StaticMacroBar
                  label="Fat"
                  value={meal.fat}
                  unit="g"
                  color={MACRO_COLORS.fat.base}
                  goal={dailyGoals?.fatG}
                  icon="flame"
                />
                {meal.fiber !== null && meal.fiber !== undefined && (
                  <StaticMacroBar
                    label="Fiber"
                    value={meal.fiber}
                    unit="g"
                    color={MACRO_COLORS.fiber.base}
                    goal={dailyGoals?.fiberG}
                    icon="leaf"
                  />
                )}
              </>
            )}
          </View>
        </View>

        {/* ──────────────────────────────────────────── */}
        {/* IMPACT ON YOUR DAY - Comparison View */}
        {/* ──────────────────────────────────────────── */}
        {dailyTotals && dailyGoals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impact on Your Day</Text>
            <View style={styles.comparisonContainer}>
              {animatedComponentsReady ? (
                <>
                  <ComparisonBar
                    label="Calories"
                    mealValue={meal.calories}
                    dailyTotal={(dailyTotals.totalCalories || 0) - (meal.calories || 0)}
                    goal={dailyGoals.dailyCalories}
                    unit="kcal"
                    color={SEMANTIC.info.base}
                    onViewTrends={() => onViewTrends && onViewTrends('calories')}
                    delay={200}
                  />
                  <ComparisonBar
                    label="Protein"
                    mealValue={meal.protein}
                    dailyTotal={(dailyTotals.totalProtein || 0) - (meal.protein || 0)}
                    goal={dailyGoals.proteinG}
                    unit="g"
                    color={MACRO_COLORS.protein.base}
                    onViewTrends={() => onViewTrends && onViewTrends('protein')}
                    delay={250}
                  />
                  <ComparisonBar
                    label="Carbs"
                    mealValue={meal.carbs}
                    dailyTotal={(dailyTotals.totalCarbs || 0) - (meal.carbs || 0)}
                    goal={dailyGoals.carbsG}
                    unit="g"
                    color={MACRO_COLORS.carbs.base}
                    onViewTrends={() => onViewTrends && onViewTrends('carbs')}
                    delay={300}
                  />
                  <ComparisonBar
                    label="Fat"
                    mealValue={meal.fat}
                    dailyTotal={(dailyTotals.totalFats || 0) - (meal.fat || 0)}
                    goal={dailyGoals.fatG}
                    unit="g"
                    color={MACRO_COLORS.fat.base}
                    onViewTrends={() => onViewTrends && onViewTrends('fat')}
                    delay={350}
                  />
                </>
              ) : (
                <>
                  <StaticComparisonBar
                    label="Calories"
                    mealValue={meal.calories}
                    dailyTotal={(dailyTotals.totalCalories || 0) - (meal.calories || 0)}
                    goal={dailyGoals.dailyCalories}
                    unit="kcal"
                    color={SEMANTIC.info.base}
                    onViewTrends={() => onViewTrends && onViewTrends('calories')}
                  />
                  <StaticComparisonBar
                    label="Protein"
                    mealValue={meal.protein}
                    dailyTotal={(dailyTotals.totalProtein || 0) - (meal.protein || 0)}
                    goal={dailyGoals.proteinG}
                    unit="g"
                    color={MACRO_COLORS.protein.base}
                    onViewTrends={() => onViewTrends && onViewTrends('protein')}
                  />
                  <StaticComparisonBar
                    label="Carbs"
                    mealValue={meal.carbs}
                    dailyTotal={(dailyTotals.totalCarbs || 0) - (meal.carbs || 0)}
                    goal={dailyGoals.carbsG}
                    unit="g"
                    color={MACRO_COLORS.carbs.base}
                    onViewTrends={() => onViewTrends && onViewTrends('carbs')}
                  />
                  <StaticComparisonBar
                    label="Fat"
                    mealValue={meal.fat}
                    dailyTotal={(dailyTotals.totalFats || 0) - (meal.fat || 0)}
                    goal={dailyGoals.fatG}
                    unit="g"
                    color={MACRO_COLORS.fat.base}
                    onViewTrends={() => onViewTrends && onViewTrends('fat')}
                  />
                </>
              )}
            </View>
          </View>
        )}

        {/* ──────────────────────────────────────────── */}
        {/* NET CARBS - Important for low-carb diets */}
        {/* ──────────────────────────────────────────── */}
        {meal.netCarbs !== null && meal.netCarbs !== undefined && (
          <View style={styles.netCarbsCard}>
            <View style={styles.netCarbsContent}>
              <Text style={styles.netCarbsLabel}>Net Carbs</Text>
              <Text style={styles.netCarbsValue}>{formatMacro(meal.netCarbs)}g</Text>
            </View>
            <Text style={styles.netCarbsFormula}>
              Total Carbs ({formatMacro(meal.carbs)}g) - Fiber ({formatMacro(meal.fiber)}g)
            </Text>
          </View>
        )}

        {/* ──────────────────────────────────────────── */}
        {/* TERTIARY DATA - Micronutrients (if available) */}
        {/* ──────────────────────────────────────────── */}
        {importantMicros.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Key Micronutrients</Text>
              <Text style={styles.sectionNote}>Estimated</Text>
            </View>
            <View style={styles.microContainer}>
              {importantMicros.map(([name, data]) => (
                <MicroRow
                  key={name}
                  name={name.charAt(0).toUpperCase() + name.slice(1)}
                  value={data.value}
                  unit={data.unit || ''}
                  dv={data.dv}
                />
              ))}
            </View>
          </View>
        )}

        {/* ──────────────────────────────────────────── */}
        {/* METADATA - Portion & Source Info */}
        {/* ──────────────────────────────────────────── */}
        <View style={styles.metadataCard}>
          <View style={styles.metadataRow}>
            <Ionicons name="restaurant" size={ICON_SIZES.sm} color={TEXT.tertiary} />
            <Text style={styles.metadataLabel}>Portion</Text>
            <Text style={styles.metadataValue}>
              {meal.servingSize || '1 serving'}
            </Text>
          </View>

          <View style={styles.metadataRow}>
            <Ionicons name={sourceIcon} size={ICON_SIZES.sm} color={TEXT.tertiary} />
            <Text style={styles.metadataLabel}>Source</Text>
            <Text style={styles.metadataValue}>{sourceLabel}</Text>
          </View>

          {meal.confidence !== null && meal.confidence !== undefined && (
            <View style={styles.metadataRow}>
              <Ionicons
                name={confidenceDisplay.icon}
                size={ICON_SIZES.sm}
                color={confidenceDisplay.color}
              />
              <Text style={styles.metadataLabel}>Estimate</Text>
              <Text style={[styles.metadataValue, { color: confidenceDisplay.color }]}>
                {confidenceDisplay.label} ({Math.round(meal.confidence * 100)}%)
              </Text>
            </View>
          )}
        </View>

        {/* ──────────────────────────────────────────── */}
        {/* ACTIONS */}
        {/* ──────────────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleViewDetails}>
            <Ionicons name="nutrition-outline" size={ICON_SIZES.md} color={BRAND.primary} />
            <Text style={styles.secondaryButtonText}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={ICON_SIZES.md} color={BRAND.primary} />
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onShare}>
            <Ionicons name="share-outline" size={ICON_SIZES.md} color={BRAND.primary} />
            <Text style={styles.secondaryButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Action Row - History & Done */}
        <View style={styles.bottomActions}>
          {onViewHistory && (
            <TouchableOpacity style={styles.secondaryButton} onPress={onViewHistory}>
              <Ionicons name="time-outline" size={ICON_SIZES.md} color={BRAND.primary} />
              <Text style={styles.secondaryButtonText}>History</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, onViewHistory && { flex: 1 }]}
            onPress={onClose}
          >
            <LinearGradient
              colors={SURFACES.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ============================================================================
// STYLES - Tufte Principles Applied
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[5],
    paddingBottom: SPACING[10],
  },

  // ──────────────────────────────────────────────
  // HEADER
  // ──────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: SPACING[6],
  },
  successBadge: {
    marginBottom: SPACING[3],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    textAlign: 'center',
  },

  // ──────────────────────────────────────────────
  // PRIMARY CARD - Calories (Maximum Visual Weight)
  // ──────────────────────────────────────────────
  primaryCard: {
    borderRadius: RADIUS.xl,
    marginBottom: SPACING[5],
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  primaryGradient: {
    paddingVertical: SPACING[8],
    paddingHorizontal: SPACING[6],
    alignItems: 'center',
  },
  caloriesLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING[2],
  },
  caloriesValue: {
    fontSize: 64,
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.white,
    lineHeight: 64,
  },
  caloriesUnit: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING[1],
  },
  caloriesGoal: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: SPACING[2],
  },

  // ──────────────────────────────────────────────
  // HEALTH METRICS CARD
  // ──────────────────────────────────────────────
  healthMetricsCard: {
    backgroundColor: SURFACES.card.glass,
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[5],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.md,
  },
  nutriScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[4],
    paddingBottom: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  nutriScoreInfo: {
    flex: 1,
  },
  nutriScoreLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    marginBottom: SPACING[1],
  },
  nutriScoreGrade: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  healthScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[3],
  },
  healthScoreInfo: {
    flex: 1,
  },
  healthScoreLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    marginBottom: SPACING[1],
  },
  healthScoreValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  healthAnalysis: {
    fontSize: TYPOGRAPHY.size.sm,
    fontStyle: 'italic',
    color: TEXT.secondary,
    textAlign: 'center',
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: `${SEMANTIC_ACTIONS.success}1A`,
  },

  // ──────────────────────────────────────────────
  // SECTION
  // ──────────────────────────────────────────────
  section: {
    marginBottom: SPACING[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[4],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionNote: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // ──────────────────────────────────────────────
  // MACRO BARS - Small Multiples (Tufte)
  // ──────────────────────────────────────────────
  macroContainer: {
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
  macroLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  macroLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  macroValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[1],
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  macroUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  macroGoal: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.muted,
  },
  macroTrack: {
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  macroFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },

  // ──────────────────────────────────────────────
  // COMPARISON BARS
  // ──────────────────────────────────────────────
  comparisonContainer: {
    backgroundColor: SURFACES.card.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    gap: SPACING[4],
  },
  comparisonBar: {
    gap: SPACING[2],
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  comparisonLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  comparisonValueText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  comparisonUnit: {
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },
  comparisonTrack: {
    height: 10,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    position: 'relative',
  },
  comparisonFill: {
    height: '100%',
  },
  goalMarker: {
    position: 'absolute',
    left: '100%',
    top: -2,
    bottom: -2,
    width: 2,
    backgroundColor: `${SEMANTIC.success.base}80`, // Semi-transparent
  },

  // ──────────────────────────────────────────────
  // NET CARBS CARD
  // ──────────────────────────────────────────────
  netCarbsCard: {
    backgroundColor: SURFACES.card.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[5],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  netCarbsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  netCarbsLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  netCarbsValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: BRAND.primary,
  },
  netCarbsFormula: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    fontStyle: 'italic',
  },

  // ──────────────────────────────────────────────
  // MICRONUTRIENTS - Compact Table
  // ──────────────────────────────────────────────
  microContainer: {
    backgroundColor: SURFACES.card.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    gap: SPACING[2],
  },
  microRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: `${SEMANTIC_ACTIONS.success}0D`,
  },
  microName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  microRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  microValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  microPercent: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    minWidth: 40,
    textAlign: 'right',
  },

  // ──────────────────────────────────────────────
  // METADATA CARD
  // ──────────────────────────────────────────────
  metadataCard: {
    backgroundColor: SURFACES.card.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[6],
    gap: SPACING[3],
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  metadataLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    flex: 1,
  },
  metadataValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },

  // ──────────────────────────────────────────────
  // ACTIONS
  // ──────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  bottomActions: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: BRAND.primary,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  primaryButton: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  primaryButtonGradient: {
    paddingVertical: SPACING[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },
});
