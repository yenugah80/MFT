import React, { useState, useCallback, useMemo } from 'react';
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
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Editable Ingredients Section
 *
 * Shows ingredient breakdown for foods with the ability to:
 * - View all ingredients with their nutrition contribution
 * - Toggle removable ingredients on/off
 * - Add optional add-ons (like ghee, chutney)
 * - See real-time nutrition updates
 *
 * Props:
 * - ingredientBreakdown: Full ingredient data from backend
 * - onNutritionChange: Callback when nutrition changes
 * - isEditable: Whether user can edit (default true)
 */
const EditableIngredientsSection = ({
  ingredientBreakdown,
  totalCalories,
  onNutritionChange,
  isEditable = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [removedIngredients, setRemovedIngredients] = useState(new Set());
  const [addedAddOns, setAddedAddOns] = useState(new Set());

  // Don't render if no ingredient data
  if (!ingredientBreakdown?.ingredients?.length) {
    return null;
  }

  const { ingredients, optionalAddOns } = ingredientBreakdown;

  // Calculate current nutrition based on active ingredients
  const currentNutrition = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;

    // Sum active ingredients
    for (const ing of ingredients) {
      if (!removedIngredients.has(ing.name)) {
        calories += ing.calories || 0;
        protein += ing.macros?.protein || 0;
        carbs += ing.macros?.carbs || 0;
        fat += ing.macros?.fat || 0;
        fiber += ing.macros?.fiber || 0;
      }
    }

    // Add selected add-ons
    for (const addOnName of addedAddOns) {
      const addOn = optionalAddOns?.find((a) => a.name === addOnName);
      if (addOn) {
        calories += addOn.calories || 0;
        protein += addOn.macros?.protein || 0;
        carbs += addOn.macros?.carbs || 0;
        fat += addOn.macros?.fat || 0;
        fiber += addOn.macros?.fiber || 0;
      }
    }

    return {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
    };
  }, [ingredients, optionalAddOns, removedIngredients, addedAddOns]);

  // Check if nutrition has been modified
  const isModified = removedIngredients.size > 0 || addedAddOns.size > 0;

  // Toggle ingredient
  const toggleIngredient = useCallback(
    (ingredientName, isRemovable) => {
      if (!isEditable || !isRemovable) return;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      setRemovedIngredients((prev) => {
        const next = new Set(prev);
        if (next.has(ingredientName)) {
          next.delete(ingredientName);
        } else {
          next.add(ingredientName);
        }
        return next;
      });
    },
    [isEditable]
  );

  // Toggle add-on
  const toggleAddOn = useCallback(
    (addOnName) => {
      if (!isEditable) return;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      setAddedAddOns((prev) => {
        const next = new Set(prev);
        if (next.has(addOnName)) {
          next.delete(addOnName);
        } else {
          next.add(addOnName);
        }
        return next;
      });
    },
    [isEditable]
  );

  // Notify parent of nutrition changes
  React.useEffect(() => {
    if (onNutritionChange && isModified) {
      onNutritionChange({
        ...currentNutrition,
        isModified: true,
        removedIngredients: Array.from(removedIngredients),
        addedAddOns: Array.from(addedAddOns),
      });
    }
  }, [currentNutrition, isModified, onNutritionChange, removedIngredients, addedAddOns]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  // Get calorie bar width
  const getCalorieBarWidth = (ingredientCalories) => {
    const baseCalories = totalCalories || ingredientBreakdown.totalCalories || 100;
    const percentage = Math.min((ingredientCalories / baseCalories) * 100, 100);
    return `${percentage}%`;
  };

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
            name="list-outline"
            size={18}
            color={TEXT.secondary}
          />
          <Text style={styles.headerTitle}>Ingredients</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{ingredients.length}</Text>
          </View>
          {isModified && (
            <View style={styles.modifiedBadge}>
              <Text style={styles.modifiedBadgeText}>Modified</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {isModified && (
            <Text style={styles.calorieChange}>
              {currentNutrition.calories} cal
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
          {/* Ingredients List */}
          {ingredients.map((ingredient, index) => {
            const isRemoved = removedIngredients.has(ingredient.name);
            const isRemovable = ingredient.isRemovable;

            return (
              <TouchableOpacity
                key={ingredient.name}
                style={[
                  styles.ingredientRow,
                  isRemoved && styles.ingredientRowRemoved,
                  !isRemovable && styles.ingredientRowLocked,
                ]}
                onPress={() => toggleIngredient(ingredient.name, isRemovable)}
                disabled={!isEditable || !isRemovable}
                activeOpacity={isRemovable ? 0.7 : 1}
              >
                {/* Checkbox/Lock icon */}
                <View style={styles.ingredientCheckbox}>
                  {isRemovable ? (
                    <Ionicons
                      name={isRemoved ? 'square-outline' : 'checkbox'}
                      size={20}
                      color={isRemoved ? TEXT.tertiary : BRAND.primary}
                    />
                  ) : (
                    <Ionicons
                      name="lock-closed"
                      size={16}
                      color={TEXT.tertiary}
                    />
                  )}
                </View>

                {/* Ingredient info */}
                <View style={styles.ingredientInfo}>
                  <Text
                    style={[
                      styles.ingredientName,
                      isRemoved && styles.ingredientNameRemoved,
                    ]}
                  >
                    {ingredient.name}
                  </Text>
                  <View style={styles.ingredientMeta}>
                    <Text style={styles.ingredientCalories}>
                      {ingredient.calories} cal
                    </Text>
                    {ingredient.percentage && (
                      <Text style={styles.ingredientPercentage}>
                        {ingredient.percentage}%
                      </Text>
                    )}
                  </View>
                </View>

                {/* Calorie bar */}
                <View style={styles.calorieBarContainer}>
                  <View
                    style={[
                      styles.calorieBar,
                      { width: getCalorieBarWidth(ingredient.calories) },
                      isRemoved && styles.calorieBarRemoved,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Optional Add-ons */}
          {optionalAddOns?.length > 0 && (
            <View style={styles.addOnsSection}>
              <Text style={styles.addOnsTitle}>Optional Add-ons</Text>
              <View style={styles.addOnsRow}>
                {optionalAddOns.map((addOn) => {
                  const isAdded = addedAddOns.has(addOn.name);
                  return (
                    <TouchableOpacity
                      key={addOn.name}
                      style={[
                        styles.addOnPill,
                        isAdded && styles.addOnPillActive,
                      ]}
                      onPress={() => toggleAddOn(addOn.name)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
                        size={16}
                        color={isAdded ? '#FFFFFF' : BRAND.primary}
                      />
                      <Text
                        style={[
                          styles.addOnText,
                          isAdded && styles.addOnTextActive,
                        ]}
                      >
                        {addOn.name}
                      </Text>
                      <Text
                        style={[
                          styles.addOnCalories,
                          isAdded && styles.addOnCaloriesActive,
                        ]}
                      >
                        +{addOn.calories}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Nutrition Summary when modified */}
          {isModified && (
            <View style={styles.nutritionSummary}>
              <View style={styles.summaryHeader}>
                <Ionicons name="calculator-outline" size={16} color={BRAND.primary} />
                <Text style={styles.summaryTitle}>Updated Nutrition</Text>
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

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={14} color={TEXT.tertiary} />
            <Text style={styles.disclaimerText}>
              Ingredient amounts are estimated. Actual values may vary based on preparation.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    fontWeight: '600',
    color: TEXT.secondary,
  },
  modifiedBadge: {
    backgroundColor: BRAND.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  modifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calorieChange: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.border.light,
  },
  ingredientRowRemoved: {
    opacity: 0.5,
  },
  ingredientRowLocked: {
    opacity: 0.9,
  },
  ingredientCheckbox: {
    width: 32,
    alignItems: 'center',
  },
  ingredientInfo: {
    flex: 1,
    marginLeft: 8,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT.primary,
    marginBottom: 2,
  },
  ingredientNameRemoved: {
    textDecorationLine: 'line-through',
    color: TEXT.tertiary,
  },
  ingredientMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  ingredientCalories: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  ingredientPercentage: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  calorieBarContainer: {
    width: 60,
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  calorieBar: {
    height: '100%',
    backgroundColor: BRAND.primary,
    borderRadius: 3,
  },
  calorieBarRemoved: {
    backgroundColor: TEXT.tertiary,
  },
  addOnsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACES.border.light,
  },
  addOnsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  addOnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addOnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: SURFACES.background.primary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BRAND.primary + '40',
  },
  addOnPillActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  addOnText: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT.primary,
  },
  addOnTextActive: {
    color: '#FFFFFF',
  },
  addOnCalories: {
    fontSize: 11,
    color: TEXT.tertiary,
  },
  addOnCaloriesActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  nutritionSummary: {
    marginTop: 16,
    padding: 16,
    backgroundColor: BRAND.primary + '10',
    borderRadius: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SURFACES.border.light,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: TEXT.tertiary,
    lineHeight: 16,
  },
});

export default EditableIngredientsSection;
