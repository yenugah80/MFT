/**
 * IngredientsSection Component
 * Text-only list of ingredients with portion and calorie info
 * Features: Collapsible, shows components breakdown for complex meals
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { useTheme } from '../../../providers/ThemeProvider';

/**
 * Single ingredient row
 */
function IngredientRow({ ingredient, index }) {
  const { colors } = useTheme();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;

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

  return (
    <View style={styles.ingredientRow}>
      <View style={styles.ingredientIndex}>
        <Text style={[styles.indexNumber, { color: textTertiary }]}>{index + 1}</Text>
      </View>
      <View style={styles.ingredientInfo}>
        <Text style={[styles.ingredientName, { color: textPrimary }]} numberOfLines={1}>
          {name}
        </Text>
        {portion ? (
          <Text style={[styles.ingredientPortion, { color: textSecondary }]}>
            {portion}
          </Text>
        ) : null}
      </View>
      <View style={styles.ingredientNutrition}>
        {calories > 0 ? (
          <Text style={[styles.ingredientCalories, { color: textPrimary }]}>
            {Math.round(calories)} cal
          </Text>
        ) : null}
        {(protein > 0 || carbs > 0 || fat > 0) ? (
          <Text style={[styles.ingredientMacros, { color: textTertiary }]}>
            P:{Math.round(protein)}g C:{Math.round(carbs)}g F:{Math.round(fat)}g
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function IngredientsSection({ ingredients, isComplex = false }) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  // Don't render if no ingredients
  if (!ingredients || ingredients.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
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
            name="restaurant-outline"
            size={18}
            color="#6B4EFF"
          />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Ingredients
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
            <Text style={[styles.complexNote, { color: textSecondary }]}>
              This is a complex dish with multiple components
            </Text>
          )}
          {ingredients.map((ingredient, index) => (
            <IngredientRow
              key={index}
              ingredient={ingredient}
              index={index}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
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
    backgroundColor: '#6B4EFF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  ingredientsList: {
    marginTop: SPACING[3],
    gap: SPACING[2],
  },
  complexNote: {
    fontSize: TYPOGRAPHY.size.xs,
    fontStyle: 'italic',
    marginBottom: SPACING[2],
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  ingredientIndex: {
    width: 24,
    alignItems: 'center',
  },
  indexNumber: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  ingredientInfo: {
    flex: 1,
    paddingRight: SPACING[2],
  },
  ingredientName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  ingredientPortion: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 2,
  },
  ingredientNutrition: {
    alignItems: 'flex-end',
  },
  ingredientCalories: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  ingredientMacros: {
    fontSize: 10,
    marginTop: 2,
  },
});
