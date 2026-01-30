import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/premiumTheme';
import SwipeableIngredientItem from './SwipeableIngredientItem';
import AddIngredientModal from './AddIngredientModal';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * EnhancedIngredientEditor
 *
 * Production-grade ingredient editor with:
 * - Swipe-to-delete functionality
 * - Add ingredient modal
 * - Real-time nutrition recalculation
 * - Collapsible section
 *
 * Props:
 * - editableIngredients: Data from /api/food/resolve response
 * - originalNutrition: { calories, protein, carbs, fat }
 * - onNutritionChange: (updatedNutrition) => void
 * - isEditable: boolean (default true)
 * - foodName: string
 */
const EnhancedIngredientEditor = ({
  editableIngredients,
  originalNutrition,
  onNutritionChange,
  isEditable = true,
  foodName = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Local state for ingredients (allows modifications without backend calls)
  const [ingredients, setIngredients] = useState([]);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [addedIngredients, setAddedIngredients] = useState([]);

  // Initialize ingredients from props
  useEffect(() => {
    if (editableIngredients?.ingredients) {
      setIngredients(editableIngredients.ingredients);
    }
  }, [editableIngredients?.ingredients]);

  // Calculate current nutrition based on active ingredients
  const currentNutrition = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;

    // Sum active original ingredients
    for (const ing of ingredients) {
      if (!removedIds.has(ing.id)) {
        calories += ing.nutrition?.calories || 0;
        protein += ing.nutrition?.protein || 0;
        carbs += ing.nutrition?.carbs || 0;
        fat += ing.nutrition?.fat || 0;
        fiber += ing.nutrition?.fiber || 0;
      }
    }

    // Add new ingredients
    for (const ing of addedIngredients) {
      calories += ing.nutrition?.calories || 0;
      protein += ing.nutrition?.protein || 0;
      carbs += ing.nutrition?.carbs || 0;
      fat += ing.nutrition?.fat || 0;
      fiber += ing.nutrition?.fiber || 0;
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
    };
  }, [ingredients, removedIds, addedIngredients]);

  // Check if modified
  const isModified = removedIds.size > 0 || addedIngredients.length > 0;

  // Calorie difference from original
  const calorieDiff = currentNutrition.calories - (originalNutrition?.calories || editableIngredients?.totalNutrition?.calories || 0);

  // Get all active ingredients for display
  const activeIngredients = useMemo(() => {
    const active = ingredients.filter((ing) => !removedIds.has(ing.id));
    return [...active, ...addedIngredients];
  }, [ingredients, removedIds, addedIngredients]);

  // Notify parent of nutrition changes
  useEffect(() => {
    if (onNutritionChange) {
      onNutritionChange({
        ...currentNutrition,
        isModified,
        removedIngredients: Array.from(removedIds),
        addedIngredients: addedIngredients.map((ing) => ({
          name: ing.name,
          portion: ing.portion,
          nutrition: ing.nutrition,
        })),
      });
    }
  }, [currentNutrition, isModified, removedIds, addedIngredients, onNutritionChange]);

  // Toggle expansion
  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  }, []);

  // Remove ingredient
  const handleRemoveIngredient = useCallback((ingredientId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Check if it's an added ingredient
    const isAdded = addedIngredients.some((ing) => ing.id === ingredientId);
    if (isAdded) {
      setAddedIngredients((prev) => prev.filter((ing) => ing.id !== ingredientId));
    } else {
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.add(ingredientId);
        return next;
      });
    }
  }, [addedIngredients]);

  // Undo remove (restore ingredient)
  const handleRestoreIngredient = useCallback((ingredientId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(ingredientId);
      return next;
    });
  }, []);

  // Add new ingredient
  const handleAddIngredient = useCallback((ingredient) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAddedIngredients((prev) => [...prev, ingredient]);
  }, []);

  // Reset all modifications
  const handleReset = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRemovedIds(new Set());
    setAddedIngredients([]);
  }, []);

  // Don't render if no ingredient data
  if (!editableIngredients?.ingredients?.length && !editableIngredients?.isEditable) {
    return null;
  }

  const totalIngredients = ingredients.length;
  const activeCount = activeIngredients.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name="layers-outline"
            size={20}
            color={BRAND.primary}
          />
          <Text style={styles.headerTitle}>Ingredients</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {activeCount}{removedIds.size > 0 ? `/${totalIngredients}` : ''}
            </Text>
          </View>
          {isModified && (
            <View style={styles.modifiedBadge}>
              <Ionicons name="pencil" size={10} color={BRAND.primary} />
              <Text style={styles.modifiedBadgeText}>Edited</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {isModified && (
            <Text style={[
              styles.calorieDiff,
              calorieDiff > 0 ? styles.calorieDiffPositive : styles.calorieDiffNegative,
            ]}>
              {calorieDiff > 0 ? '+' : ''}{calorieDiff} cal
            </Text>
          )}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={TEXT.tertiary}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Swipe Hint */}
          {isEditable && activeIngredients.length > 0 && (
            <View style={styles.swipeHint}>
              <Ionicons name="arrow-back" size={14} color={TEXT.tertiary} />
              <Text style={styles.swipeHintText}>Swipe left to remove</Text>
            </View>
          )}

          {/* Active Ingredients List */}
          {activeIngredients.map((ingredient) => (
            <SwipeableIngredientItem
              key={ingredient.id}
              ingredient={ingredient}
              onRemove={handleRemoveIngredient}
              totalCalories={currentNutrition.calories || 100}
              disabled={!isEditable}
            />
          ))}

          {/* Removed Ingredients (Collapsed) */}
          {removedIds.size > 0 && (
            <View style={styles.removedSection}>
              <Text style={styles.removedTitle}>
                Removed ({removedIds.size})
              </Text>
              {ingredients
                .filter((ing) => removedIds.has(ing.id))
                .map((ingredient) => (
                  <TouchableOpacity
                    key={`removed-${ingredient.id}`}
                    style={styles.removedItem}
                    onPress={() => handleRestoreIngredient(ingredient.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.removedItemLeft}>
                      <Ionicons name="close-circle" size={16} color={TEXT.tertiary} />
                      <Text style={styles.removedItemName}>{ingredient.name}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.restoreButton}
                      onPress={() => handleRestoreIngredient(ingredient.id)}
                    >
                      <Ionicons name="refresh" size={14} color={BRAND.primary} />
                      <Text style={styles.restoreButtonText}>Restore</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Add Ingredient Button */}
          {isEditable && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={20} color={BRAND.primary} />
              <Text style={styles.addButtonText}>Add Ingredient</Text>
            </TouchableOpacity>
          )}

          {/* Updated Nutrition Summary */}
          {isModified && (
            <View style={styles.nutritionSummary}>
              <View style={styles.summaryHeader}>
                <Ionicons name="calculator-outline" size={16} color={BRAND.primary} />
                <Text style={styles.summaryTitle}>Updated Nutrition</Text>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleReset}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="refresh" size={14} color={TEXT.tertiary} />
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{currentNutrition.calories}</Text>
                  <Text style={styles.summaryLabel}>Calories</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{currentNutrition.protein}g</Text>
                  <Text style={styles.summaryLabel}>Protein</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{currentNutrition.carbs}g</Text>
                  <Text style={styles.summaryLabel}>Carbs</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{currentNutrition.fat}g</Text>
                  <Text style={styles.summaryLabel}>Fat</Text>
                </View>
              </View>
            </View>
          )}

          {/* Region Info */}
          {editableIngredients?.region && editableIngredients.region !== 'US' && (
            <View style={styles.regionInfo}>
              <Ionicons name="globe-outline" size={14} color={TEXT.tertiary} />
              <Text style={styles.regionInfoText}>
                Portions adjusted for {editableIngredients.region} region
              </Text>
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={14} color={TEXT.tertiary} />
            <Text style={styles.disclaimerText}>
              Ingredient amounts are estimates. Values may vary by preparation.
            </Text>
          </View>
        </View>
      )}

      {/* Add Ingredient Modal */}
      <AddIngredientModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddIngredient}
        foodName={foodName || editableIngredients?.foodName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[4],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  badge: {
    backgroundColor: SURFACES.background.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  modifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  modifiedBadgeText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calorieDiff: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  calorieDiffPositive: {
    color: '#EF4444',
  },
  calorieDiffNegative: {
    color: '#10B981',
  },
  content: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[4],
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.sm,
  },
  swipeHintText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  removedSection: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  removedTitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  removedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.sm,
    marginBottom: 6,
  },
  removedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removedItemName: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textDecorationLine: 'line-through',
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restoreButtonText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: BRAND.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: SPACING[3],
    backgroundColor: BRAND.primary + '10',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND.primary + '30',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
  nutritionSummary: {
    marginTop: SPACING[4],
    padding: SPACING[4],
    backgroundColor: BRAND.primary + '08',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND.primary + '15',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  summaryTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
    marginLeft: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetButtonText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  regionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING[3],
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.sm,
  },
  regionInfoText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    lineHeight: 16,
  },
});

export default EnhancedIngredientEditor;
