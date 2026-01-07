/**
 * IngredientsSection Component
 * Enhanced ingredient list with per-ingredient nutrition and visual breakdown
 * Features: Collapsible, calorie contribution bars, color-coded macros
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { BRAND, TEXT, SURFACES } from '../../../constants/premiumTheme';

// Macro colors
const MACRO_COLORS = {
  protein: '#3B82F6', // Blue
  carbs: '#10B981',   // Green
  fat: '#F59E0B',     // Amber
};

/**
 * Single ingredient row with enhanced nutrition display
 */
function IngredientRow({ ingredient, index, totalCalories }) {
  const { colors, isDark } = useTheme();
  const textPrimary = isDark ? colors.text.primary : TEXT.primary;
  const textSecondary = isDark ? colors.text.secondary : TEXT.secondary;
  const textTertiary = isDark ? colors.text.tertiary : TEXT.tertiary;

  // Handle both object and string ingredients
  const name = typeof ingredient === 'string'
    ? ingredient
    : ingredient?.name || 'Unknown';
  const portion = typeof ingredient === 'object'
    ? ingredient?.portion || ''
    : '';
  const calories = typeof ingredient === 'object'
    ? ingredient?.calories || 0
    : 0;
  const protein = typeof ingredient === 'object' ? ingredient?.protein || 0 : 0;
  const carbs = typeof ingredient === 'object' ? ingredient?.carbs || 0 : 0;
  const fat = typeof ingredient === 'object' ? ingredient?.fat || 0 : 0;

  // Calculate calorie percentage for progress bar
  const caloriePercent = totalCalories > 0 ? Math.min((calories / totalCalories) * 100, 100) : 0;
  const hasNutrition = calories > 0 || protein > 0 || carbs > 0 || fat > 0;

  return (
    <View style={styles.ingredientRow}>
      {/* Index Badge */}
      <View style={[styles.ingredientIndex, { backgroundColor: isDark ? 'rgba(107,78,255,0.2)' : 'rgba(107,78,255,0.1)' }]}>
        <Text style={[styles.indexNumber, { color: BRAND.primary }]}>{index + 1}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.ingredientContent}>
        {/* Name and Portion Row */}
        <View style={styles.nameRow}>
          <View style={styles.nameContainer}>
            <Text style={[styles.ingredientName, { color: textPrimary }]} numberOfLines={1}>
              {name}
            </Text>
            {portion ? (
              <Text style={[styles.ingredientPortion, { color: textTertiary }]}>
                {portion}
              </Text>
            ) : null}
          </View>

          {/* Calories Badge */}
          {calories > 0 && (
            <View style={styles.caloriesBadge}>
              <Text style={styles.caloriesValue}>{Math.round(calories)}</Text>
              <Text style={styles.caloriesUnit}>cal</Text>
            </View>
          )}
        </View>

        {/* Macro Row - Only show if has nutrition data */}
        {hasNutrition && (protein > 0 || carbs > 0 || fat > 0) && (
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: MACRO_COLORS.protein }]} />
              <Text style={[styles.macroText, { color: textSecondary }]}>
                {Math.round(protein)}g P
              </Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: MACRO_COLORS.carbs }]} />
              <Text style={[styles.macroText, { color: textSecondary }]}>
                {Math.round(carbs)}g C
              </Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: MACRO_COLORS.fat }]} />
              <Text style={[styles.macroText, { color: textSecondary }]}>
                {Math.round(fat)}g F
              </Text>
            </View>
          </View>
        )}

        {/* Calorie Contribution Bar */}
        {caloriePercent > 0 && (
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={[BRAND.primary, BRAND.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBar, { width: `${caloriePercent}%` }]}
            />
            <Text style={[styles.percentText, { color: textTertiary }]}>
              {Math.round(caloriePercent)}% of meal
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function IngredientsSection({ ingredients, isComplex = false, totalMealCalories = 0 }) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const textPrimary = isDark ? colors.text.primary : TEXT.primary;
  const textSecondary = isDark ? colors.text.secondary : TEXT.secondary;

  // Don't render if no ingredients
  if (!ingredients || ingredients.length === 0) {
    return null;
  }

  // Calculate total calories from ingredients if not provided
  const totalCalories = useMemo(() => {
    if (totalMealCalories > 0) return totalMealCalories;
    return ingredients.reduce((sum, ing) => {
      const cal = typeof ing === 'object' ? (ing.calories || 0) : 0;
      return sum + cal;
    }, 0);
  }, [ingredients, totalMealCalories]);

  // Check if any ingredients have nutrition data
  const hasNutritionData = useMemo(() => {
    return ingredients.some(ing =>
      typeof ing === 'object' && (ing.calories > 0 || ing.protein > 0 || ing.carbs > 0 || ing.fat > 0)
    );
  }, [ingredients]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : SURFACES.background.tertiary },
      ]}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Ingredients section, ${ingredients.length} items, ${expanded ? 'collapse' : 'expand'}`}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name="layers-outline"
            size={20}
            color={BRAND.primary}
          />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Ingredient Breakdown
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{ingredients.length}</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={textSecondary}
        />
      </TouchableOpacity>

      {/* Ingredients list */}
      {expanded && (
        <View style={styles.ingredientsList}>
          {isComplex && (
            <View style={styles.complexNoteContainer}>
              <Ionicons name="information-circle-outline" size={14} color={BRAND.primary} />
              <Text style={[styles.complexNote, { color: textSecondary }]}>
                Complex dish with multiple components
              </Text>
            </View>
          )}

          {hasNutritionData && (
            <Text style={[styles.nutritionHint, { color: textSecondary }]}>
              Per-ingredient nutrition breakdown
            </Text>
          )}

          {ingredients.map((ingredient, index) => (
            <IngredientRow
              key={index}
              ingredient={ingredient}
              index={index}
              totalCalories={totalCalories}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: SPACING[4],
    marginVertical: SPACING[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  countBadge: {
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  ingredientsList: {
    marginTop: SPACING[4],
  },
  complexNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING[3],
    paddingHorizontal: SPACING[2],
  },
  complexNote: {
    fontSize: TYPOGRAPHY.size.xs,
  },
  nutritionHint: {
    fontSize: 11,
    marginBottom: SPACING[3],
    paddingHorizontal: SPACING[2],
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING[3],
    marginBottom: SPACING[2],
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    paddingHorizontal: SPACING[3],
  },
  ingredientIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  indexNumber: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  ingredientContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameContainer: {
    flex: 1,
    paddingRight: SPACING[2],
  },
  ingredientName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    lineHeight: 18,
  },
  ingredientPortion: {
    fontSize: 11,
    marginTop: 2,
  },
  caloriesBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(107,78,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  caloriesValue: {
    fontSize: 14,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: BRAND.primary,
  },
  caloriesUnit: {
    fontSize: 10,
    color: BRAND.primary,
    marginLeft: 2,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  progressBarContainer: {
    height: 16,
    backgroundColor: 'rgba(107,78,255,0.08)',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    borderRadius: 8,
    opacity: 0.8,
  },
  percentText: {
    position: 'absolute',
    right: 8,
    top: 2,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
