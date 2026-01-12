/**
 * IngredientsBreakdown Component
 * Displays individual ingredient nutrition breakdown from AI analysis
 *
 * Used by: FoodItemsList, food analysis results
 *
 * Example data structure:
 * ingredients: [
 *   { name: "rice", amount: "1 cup", calories: 200, protein: 4, carbs: 45, fat: 0 },
 *   { name: "dal", amount: "0.5 cup", calories: 115, protein: 9, carbs: 20, fat: 0.5 }
 * ]
 */

import React, { useState } from 'react';
import { TEXT, SURFACES } from '../../constants/premiumTheme';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BRAND = {
  primary: '#4F46E5',
  success: '#10B981',
  error: '#EF4444'
};

const TEXT = {
  primary: TEXT.primary,
  secondary: '#6B7280',
  tertiary: '#9CA3AF'
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
};

export function IngredientsBreakdown({ ingredients = [] }) {
  const [expanded, setExpanded] = useState(false);

  // Don't show component if no ingredients
  if (!ingredients || ingredients.length === 0) {
    return null;
  }

  const totalCalories = ingredients.reduce((sum, ing) => sum + (ing.calories || 0), 0);
  const totalProtein = ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);
  const totalCarbs = ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
  const totalFat = ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);

  return (
    <View style={styles.container}>
      {/* Header - Click to expand/collapse */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="restaurant-outline" size={20} color={BRAND.primary} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>
              Ingredients ({ingredients.length})
            </Text>
            <Text style={styles.headerSubtitle}>
              {Math.round(totalCalories)} cal
              {totalProtein > 0 && ` • ${totalProtein.toFixed(1)}g protein`}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={TEXT.secondary}
        />
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.ingredientsList}>
          {ingredients.map((ing, index) => (
            <View key={index} style={styles.ingredientItem}>
              {/* Ingredient name and amount */}
              <View style={styles.ingredientHeader}>
                <Text style={styles.ingredientName}>
                  {ing.name || `Ingredient ${index + 1}`}
                </Text>
                <Text style={styles.ingredientAmount}>
                  {ing.amount || 'N/A'}
                </Text>
              </View>

              {/* Nutrition breakdown */}
              <View style={styles.ingredientNutrition}>
                <Text style={styles.nutritionText}>
                  {Math.round(ing.calories || 0)} cal
                </Text>
                {ing.protein !== undefined && ing.protein > 0 && (
                  <Text style={styles.nutritionText}>
                    • P: {ing.protein.toFixed(1)}g
                  </Text>
                )}
                {ing.carbs !== undefined && ing.carbs > 0 && (
                  <Text style={styles.nutritionText}>
                    • C: {ing.carbs.toFixed(1)}g
                  </Text>
                )}
                {ing.fat !== undefined && ing.fat > 0 && (
                  <Text style={styles.nutritionText}>
                    • F: {ing.fat.toFixed(1)}g
                  </Text>
                )}
              </View>

              {/* Divider between items (except last) */}
              {index < ingredients.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}

          {/* Summary footer if multiple ingredients */}
          {ingredients.length > 1 && (
            <View style={styles.summaryFooter}>
              <Text style={styles.summaryTitle}>Total from ingredients:</Text>
              <View style={styles.summaryNutrition}>
                <Text style={styles.summaryText}>
                  {Math.round(totalCalories)} cal
                </Text>
                {totalProtein > 0 && (
                  <Text style={styles.summaryText}>
                    • {totalProtein.toFixed(1)}g protein
                  </Text>
                )}
                {totalCarbs > 0 && (
                  <Text style={styles.summaryText}>
                    • {totalCarbs.toFixed(1)}g carbs
                  </Text>
                )}
                {totalFat > 0 && (
                  <Text style={styles.summaryText}>
                    • {totalFat.toFixed(1)}g fat
                  </Text>
                )}
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACES.divider,
    overflow: 'hidden'
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#FFFFFF'
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm
  },

  headerTextContainer: {
    flex: 1
  },

  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: SPACING.xs
  },

  headerSubtitle: {
    fontSize: 12,
    color: TEXT.secondary
  },

  // Ingredients list
  ingredientsList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#FAFBFC'
  },

  ingredientItem: {
    marginBottom: SPACING.md
  },

  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },

  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT.primary,
    flex: 1,
    textTransform: 'capitalize'
  },

  ingredientAmount: {
    fontSize: 13,
    color: TEXT.secondary,
    marginLeft: SPACING.sm
  },

  ingredientNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs
  },

  nutritionText: {
    fontSize: 12,
    color: TEXT.tertiary,
    lineHeight: 16
  },

  divider: {
    height: 1,
    backgroundColor: SURFACES.divider,
    marginVertical: SPACING.sm
  },

  // Summary footer
  summaryFooter: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: 8
  },

  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.secondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  summaryNutrition: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs
  },

  summaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: BRAND.primary
  }
});
