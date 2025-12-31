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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import {
  BRAND,
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  SURFACES,
  MACRO_COLORS,
} from '../../constants/premiumTheme';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================================================
// HELPER FUNCTIONS - Tufte-inspired Data Formatting
// ============================================================================

/**
 * Format macro value with appropriate precision
 * Tufte principle: Don't show false precision
 */
const formatMacro = (value) => {
  if (value === null || value === undefined) return '0';
  if (value < 1) return value.toFixed(1);
  return Math.round(value).toString();
};

/**
 * Format calories - whole numbers only
 */
const formatCalories = (value) => {
  if (value === null || value === undefined) return '0';
  return Math.round(value).toString();
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

const MacroBar = ({ label, value, unit, color, goal, icon }) => {
  const [fillAnim] = useState(new Animated.Value(0));
  const percentage = goal ? Math.min((value / goal) * 100, 100) : 0;

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: percentage,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

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
              width: fillAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

// ============================================================================
// COMPARISON BAR COMPONENT - Shows impact on daily goals
// ============================================================================

const ComparisonBar = ({ label, mealValue, dailyTotal, goal, unit, color, onViewTrends }) => {
  const totalAfter = (dailyTotal || 0) + (mealValue || 0);
  
  const mealPct = goal ? Math.min((mealValue / goal) * 100, 100) : 0;
  const totalBeforePct = goal ? Math.min((dailyTotal / goal) * 100, 100) : 0;

  const [fillAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: 1,
      delay: 400, // Delay to start after main card animation
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, []);

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
      <View style={styles.comparisonTrack}>
        {/* Daily Total Before */}
        <Animated.View style={[styles.comparisonFill, { 
          backgroundColor: `${color}40`, // Lighter shade for background
          width: fillAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${totalBeforePct}%`]
          })
        }]} />
        {/* This Meal */}
        <Animated.View style={[styles.comparisonFill, { 
          position: 'absolute',
          backgroundColor: color,
          left: `${totalBeforePct}%`,
          width: fillAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${mealPct}%`]
          })
        }]} />
        {/* Goal Marker */}
        <View style={styles.goalMarker} />
      </View>
    </View>
  );
};

// ============================================================================
// MICRONUTRIENT ROW - Compact Data Display
// ============================================================================

const MicroRow = ({ name, value, unit, dv }) => {
  const percentage = dv ? Math.round((value / dv) * 100) : null;
  const color = percentage >= 100 ? SEMANTIC.success.base : percentage >= 50 ? SEMANTIC.warning.base : TEXT.tertiary;

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
  onSaveAsMeal,
  onViewHistory,
}) {
  const [scaleAnim] = useState(new Animated.Value(0.9));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
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
        {/* SECONDARY DATA - Macronutrients */}
        {/* ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <View style={styles.macroContainer}>
            <MacroBar
              label="Protein"
              value={meal.protein}
              unit="g"
              color={MACRO_COLORS.protein.base}
              goal={dailyGoals?.proteinG}
              icon="barbell"
            />
            <MacroBar
              label="Carbs"
              value={meal.carbs}
              unit="g"
              color={MACRO_COLORS.carbs.base}
              goal={dailyGoals?.carbsG}
              icon="nutrition"
            />
            <MacroBar
              label="Fat"
              value={meal.fat}
              unit="g"
              color={MACRO_COLORS.fat.base}
              goal={dailyGoals?.fatG}
              icon="flame"
            />
            {meal.fiber !== null && meal.fiber !== undefined && (
              <MacroBar
                label="Fiber"
                value={meal.fiber}
                unit="g"
                color={MACRO_COLORS.fiber.base}
                goal={dailyGoals?.fiberG}
                icon="leaf"
              />
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
              <ComparisonBar 
                label="Calories"
                mealValue={meal.calories}
                // Calculate the daily total *before* this meal was added
                dailyTotal={(dailyTotals.totalCalories || 0) - (meal.calories || 0)}
                goal={dailyGoals.dailyCalories}
                unit="kcal"
                color={SEMANTIC.info.base} // Using a neutral color for calories
                onViewTrends={() => onViewTrends && onViewTrends('calories')}
              />
              <ComparisonBar 
                label="Protein"
                mealValue={meal.protein}
                dailyTotal={(dailyTotals.totalProtein || 0) - (meal.protein || 0)}
                goal={dailyGoals.proteinG}
                unit="g"
                color={MACRO_COLORS.protein.base}
                onViewTrends={() => onViewTrends && onViewTrends('protein')}
              />
              <ComparisonBar 
                label="Carbs"
                mealValue={meal.carbs}
                dailyTotal={(dailyTotals.totalCarbs || 0) - (meal.carbs || 0)}
                goal={dailyGoals.carbsG}
                unit="g"
                color={MACRO_COLORS.carbs.base}
                onViewTrends={() => onViewTrends && onViewTrends('carbs')}
              />
              <ComparisonBar 
                label="Fat"
                mealValue={meal.fat}
                dailyTotal={(dailyTotals.totalFats || 0) - (meal.fat || 0)}
                goal={dailyGoals.fatG}
                unit="g"
                color={MACRO_COLORS.fat.base}
                onViewTrends={() => onViewTrends && onViewTrends('fat')}
              />
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
          <TouchableOpacity style={styles.secondaryButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={ICON_SIZES.md} color={BRAND.primary} />
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onSaveAsMeal}>
            <Ionicons name="bookmark-outline" size={ICON_SIZES.md} color={BRAND.primary} />
            <Text style={styles.secondaryButtonText}>Save</Text>
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
    borderColor: 'rgba(107, 78, 255, 0.1)',
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
    borderBottomColor: 'rgba(107, 78, 255, 0.05)',
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
