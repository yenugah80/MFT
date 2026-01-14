/**
 * FoodItemCard Component
 * Individual food item with editable quantity for multi-item breakdowns
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, SEMANTIC_ACTIONS, SEMANTIC } from '../../constants/premiumTheme';

/**
 * Unit picker options
 */
const UNITS = ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'serving'];

/**
 * Key micronutrients to display (simplified for initial version)
 * These are the most commonly tracked and clinically relevant
 */
const KEY_MICRONUTRIENTS = ['calcium', 'iron', 'magnesium', 'potassium', 'sodium'];

/**
 * FoodItemCard Component
 */
export function FoodItemCard({ item, onUpdateQuantity, onRemove, onRemoveIngredient }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [amount, setAmount] = useState(item.portion?.amount?.toString() || '1');
  const [unit, setUnit] = useState(item.portion?.unit || 'g');
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [showCollapsedItems, setShowCollapsedItems] = useState(false);

  if (!item) return null;

  const handleApplyQuantity = () => {
    const numAmount = parseFloat(amount) || 1;
    onUpdateQuantity(item.itemId, numAmount, unit);
    setEditingQuantity(false);
  };

  const handleCancelEdit = () => {
    setAmount(item.portion?.amount?.toString() || '1');
    setUnit(item.portion?.unit || 'g');
    setEditingQuantity(false);
  };

  const handleRemoveIngredient = (ingredientIndex, ingredientName) => {
    if (!onRemoveIngredient) return;

    // Show confirmation dialog before removing
    Alert.alert(
      'Remove Item?',
      `Are you sure you want to remove "${ingredientName || 'this item'}"? This will update the meal's nutrition totals.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveIngredient(item.itemId, ingredientIndex),
        },
      ],
      { cancelable: true }
    );
  };

  // Get confidence color
  const confidence = item.sourceEvidence?.[0]?.confidence || 0.5;
  const confidenceColor = confidence >= 0.7 ? SEMANTIC_ACTIONS.success : confidence >= 0.5 ? SEMANTIC_ACTIONS.warning : SEMANTIC_ACTIONS.danger;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.foodName} numberOfLines={2}>
          {item.display_name || item.name}
        </Text>
        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeButton}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessible
          accessibilityLabel="Remove item"
        >
          <Ionicons name="close" size={16} color={TEXT.tertiary} />
        </TouchableOpacity>
      </View>

      {/* Portion Editor with Source Badge */}
      <View style={styles.portionRow}>
        <View style={styles.portionContainer}>
          {editingQuantity ? (
            <View style={styles.editingRow}>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                style={styles.quantityInput}
                placeholder="Amount (e.g., 150)"
                accessible
                accessibilityLabel="Quantity amount"
              />
              <TouchableOpacity
                style={styles.unitButton}
                onPress={() => setUnitPickerVisible(!unitPickerVisible)}
              >
                <Text style={styles.unitButtonText}>{unit}</Text>
                <Text style={styles.unitButtonArrow}>▼</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyQuantity}
              >
                <Text style={styles.applyButtonText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.portionButton}
              onPress={() => setEditingQuantity(true)}
              accessible
              accessibilityLabel="Edit portion size"
            >
              <Text style={styles.portionText}>
                {item.portion?.amount}{item.portion?.unit} • Tap to edit
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Portion Source Badge */}
        {item.portion_source && (
          <View
            style={[
              styles.portionSourceBadge,
              item.portion_source === 'estimated' && styles.estimatedBadge,
              item.portion_source === 'user_specified' && styles.userSpecifiedBadge,
              item.portion_source === 'learned' && styles.learnedBadge,
            ]}
          >
            <Text
              style={[
                styles.portionSourceText,
                item.portion_source === 'estimated' && styles.estimatedText,
                item.portion_source === 'user_specified' && styles.userSpecifiedText,
                item.portion_source === 'learned' && styles.learnedText,
              ]}
            >
              {item.portion_source === 'estimated' && '📊 Estimated'}
              {item.portion_source === 'user_specified' && '✓ You set'}
              {item.portion_source === 'learned' && '🎯 Your usual'}
            </Text>
          </View>
        )}
      </View>

      {/* Unit Picker */}
      {editingQuantity && unitPickerVisible && (
        <View style={styles.unitPicker}>
          {UNITS.map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.unitOption, unit === u && styles.unitOptionSelected]}
              onPress={() => {
                setUnit(u);
                setUnitPickerVisible(false);
              }}
            >
              <Text style={[styles.unitOptionText, unit === u && styles.unitOptionTextSelected]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Complex Recipe Warning */}
      {item.long_ingredient_list && (
        <View style={styles.complexRecipeWarning}>
          <Text style={styles.complexRecipeIcon}>ℹ️</Text>
          <Text style={styles.complexRecipeText}>
            {item.ui_message || 'This looks like a complex recipe. Ingredients were grouped for clarity.'}
          </Text>
        </View>
      )}

      {/* Collapsed Group Expansion */}
      {item.is_collapsed_group && item.collapsed_items && item.collapsed_items.length > 0 && (
        <View style={styles.collapsedGroupSection}>
          <TouchableOpacity
            style={styles.collapsedGroupHeader}
            onPress={() => setShowCollapsedItems(!showCollapsedItems)}
          >
            <Text style={styles.collapsedGroupToggle}>
              {showCollapsedItems ? '▼' : '▶'}
            </Text>
            <Text style={styles.collapsedGroupTitle}>
              {item.collapsed_items.length} items grouped
            </Text>
          </TouchableOpacity>

          {showCollapsedItems && (
            <View style={styles.collapsedItemsList}>
              {item.collapsed_items.map((subItem, idx) => (
                <View key={idx} style={styles.collapsedItem}>
                  <Text style={styles.collapsedItemName}>• {subItem.name}</Text>
                  <Text style={styles.collapsedItemDetail}>
                    {subItem.quantity} {subItem.unit}
                    {subItem.calories_kcal ? ` • ${Math.round(subItem.calories_kcal)} cal` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Quick Macros Summary */}
      <View style={styles.macrosRow}>
        <View style={styles.caloriesBadge}>
          <Text style={styles.caloriesText}>{Math.round(item.macros?.calories_kcal || 0)}</Text>
          <Text style={styles.caloriesLabel}>cal</Text>
        </View>
        <View style={styles.macrosGrid}>
          <Text style={styles.macroText}>P: {Math.round(item.macros?.protein_g || 0)}g</Text>
          <Text style={styles.macroText}>C: {Math.round(item.macros?.carbs_g || 0)}g</Text>
          <Text style={styles.macroText}>F: {Math.round(item.macros?.fat_g || 0)}g</Text>
        </View>
      </View>

      {/* Component/Ingredients Breakdown - Show if components OR ingredients exist */}
      {((item.isComplex && item.components && item.components.length > 0) ||
        (item.ingredients && item.ingredients.length > 0)) && (
        <View style={styles.componentsSection}>
          <Text style={styles.componentsSectionTitle}>
            🍽️ What's inside (estimated):
          </Text>
          {/* Use components if available, otherwise use ingredients */}
          {(item.components || item.ingredients || []).slice(0, 3).map((ingredient, index) => (
            <View key={index} style={styles.componentRowCompact}>
              <Text style={styles.componentNameCompact}>
                • {ingredient.name || ingredient.foodName || ingredient}
              </Text>
              <View style={styles.componentRightSection}>
                <Text style={styles.componentCaloriesCompact}>
                  {ingredient.calories || ingredient.calories_kcal || ingredient.macros?.calories_kcal || ''}
                  {(ingredient.calories || ingredient.calories_kcal || ingredient.macros?.calories_kcal) ? ' cal' : ''}
                </Text>
                {onRemoveIngredient && (
                  <TouchableOpacity
                    onPress={() => handleRemoveIngredient(index, ingredient.name || ingredient.foodName || (typeof ingredient === 'string' ? ingredient : 'this item'))}
                    style={styles.ingredientRemoveButton}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessible
                    accessibilityLabel={`Remove ${ingredient.name || ingredient.foodName || 'ingredient'}`}
                  >
                    <Ionicons name="close-circle" size={18} color={TEXT.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {(item.components || item.ingredients || []).length > 3 && (
            <Text style={styles.showMoreComponents}>
              + {(item.components || item.ingredients).length - 3} more (tap &quot;Show details&quot; below)
            </Text>
          )}
        </View>
      )}

      {/* Confidence Badge - Simplified to just show percentage */}
      <View style={[styles.badge, { borderColor: confidenceColor }]}>
        <View style={[styles.badgeDot, { backgroundColor: confidenceColor }]} />
        <Text style={styles.badgeText}>
          {Math.round(confidence * 100)}% confidence
        </Text>
      </View>

      {/* Expandable Details */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.expandButtonText}>
          {isExpanded ? '▼ Hide details' : '▶ Show details'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.details}>
          {/* Component/Ingredients Breakdown (for all foods with ingredients) */}
          {((item.isComplex && item.components && item.components.length > 0) ||
            (item.ingredients && item.ingredients.length > 0)) && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>
                🍽️ What's in this dish
              </Text>
              <View style={styles.componentsNote}>
                <Text style={styles.componentsNoteText}>
                  Estimated breakdown. Tap any to adjust or remove.
                </Text>
              </View>
              {(item.components || item.ingredients || []).map((ingredient, index) => {
                // Handle different ingredient data structures
                const name = ingredient.name || ingredient.foodName || (typeof ingredient === 'string' ? ingredient : 'Unknown');
                // Handle portion - can be string or object {amount, unit, servingText}
                const rawPortion = ingredient.portion || ingredient.servingSize || '';
                const portion = typeof rawPortion === 'object'
                  ? rawPortion?.servingText || `${rawPortion?.amount || ''} ${rawPortion?.unit || ''}`.trim()
                  : rawPortion || '';
                const calories = ingredient.calories || ingredient.calories_kcal || ingredient.macros?.calories_kcal || 0;
                const protein = ingredient.protein || ingredient.protein_g || ingredient.macros?.protein_g || 0;
                const carbs = ingredient.carbs || ingredient.carbs_g || ingredient.macros?.carbs_g || 0;
                const fat = ingredient.fat || ingredient.fat_g || ingredient.macros?.fat_g || 0;

                return (
                  <View key={index} style={styles.componentRow}>
                    <View style={styles.componentInfo}>
                      <Text style={styles.componentName}>{name}</Text>
                      <Text style={styles.componentPortion}>{portion}</Text>
                    </View>
                    <View style={styles.componentMacrosWithDelete}>
                      <View style={styles.componentMacros}>
                        <Text style={styles.componentCalories}>{Math.round(calories)} cal</Text>
                        <Text style={styles.componentMacroText}>
                          P:{Math.round(protein)}g C:{Math.round(carbs)}g F:{Math.round(fat)}g
                        </Text>
                      </View>
                      {onRemoveIngredient && (
                        <TouchableOpacity
                          onPress={() => handleRemoveIngredient(index, name)}
                          style={styles.ingredientRemoveButtonLarge}
                          activeOpacity={0.6}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          accessible
                          accessibilityLabel={`Remove ${name}`}
                        >
                          <View style={styles.removeButtonInner}>
                            <Ionicons name="trash-outline" size={14} color={SEMANTIC_ACTIONS.danger} />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
              <View style={styles.infoNote}>
                <Text style={styles.infoNoteIcon}>💡</Text>
                <Text style={styles.infoNoteText}>
                  {item._smartResolver?.limitation || 'Estimated values - may vary by brand/preparation'}
                </Text>
              </View>
            </View>
          )}

          {/* Detailed macros */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Macronutrients</Text>
            <View style={styles.detailGrid}>
              <DetailRow label="Fiber" value={`${(item.macros?.fiber_g || 0).toFixed(1)}g`} />
              <DetailRow label="Sugar" value={`${(item.macros?.sugar_g || 0).toFixed(1)}g`} />
              {item.macros?.sodium_mg !== undefined && (
                <DetailRow label="Sodium" value={`${Math.round(item.macros.sodium_mg)}mg`} />
              )}
            </View>
          </View>

          {/* Micronutrients - Limited to 5 key ones */}
          {item.micros && Object.keys(item.micros).length > 0 && (
            <View style={styles.detailSection}>
              <View style={styles.detailSectionHeader}>
                <Text style={styles.detailSectionTitle}>Key Micronutrients</Text>
                <Text style={styles.detailSectionNote}>Estimated</Text>
              </View>
              <View style={styles.detailGrid}>
                {Object.entries(item.micros)
                  .filter(([key]) => KEY_MICRONUTRIENTS.includes(key.toLowerCase()))
                  .map(([key, value]) => {
                    // Format value with unit
                    const displayValue = typeof value === 'object' && value.value !== undefined
                      ? `${Math.round(value.value)}${value.unit || 'mg'}`
                      : value;

                    return (
                      <DetailRow
                        key={key}
                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                        value={displayValue}
                      />
                    );
                  })}
              </View>
              {/* Variance note for composite foods */}
              {(/bowl|plate|cup|serving|meal|mix|homemade|cooked/i.test(item.name)) && (
                <View style={styles.infoNote}>
                  <Text style={styles.infoNoteIcon}>ℹ️</Text>
                  <Text style={styles.infoNoteText}>
                    Micronutrient values may vary based on ingredients and cooking methods
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Low Confidence Warning */}
      {confidence < 0.6 && (
        <View style={styles.warning}>
          <Text style={styles.warningIcon}>⚠</Text>
          <Text style={styles.warningText}>Low estimate - consider adjusting</Text>
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: TEXT.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  foodName: {
    fontSize: 18,
    fontWeight: '600',
    color: TEXT.primary,
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: SURFACES.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  portionContainer: {
    flex: 1,
  },
  portionButton: {
    backgroundColor: SURFACES.divider,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  portionText: {
    fontSize: 14,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  editingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: SURFACES.card.primary,
    borderWidth: 1,
    borderColor: BRAND.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: TEXT.primary,
  },
  unitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    borderWidth: 1,
    borderColor: BRAND.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  unitButtonText: {
    fontSize: 16,
    color: TEXT.primary,
    fontWeight: '500',
  },
  unitButtonArrow: {
    fontSize: 10,
    color: TEXT.secondary,
  },
  applyButton: {
    backgroundColor: SEMANTIC_ACTIONS.success,
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 18,
    color: TEXT.white,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: SEMANTIC_ACTIONS.danger,
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    color: TEXT.white,
    fontWeight: '600',
  },
  unitPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
    padding: 8,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 8,
  },
  unitOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: SURFACES.card.primary,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  unitOptionSelected: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  unitOptionText: {
    fontSize: 14,
    color: TEXT.secondary,
  },
  unitOptionTextSelected: {
    color: TEXT.white,
    fontWeight: '600',
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  caloriesBadge: {
    backgroundColor: SEMANTIC.info.bg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  caloriesText: {
    fontSize: 24,
    fontWeight: '700',
    color: BRAND.primary,
  },
  caloriesLabel: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  macrosGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroText: {
    fontSize: 14,
    color: TEXT.secondary,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  expandButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 14,
    color: BRAND.primary,
    fontWeight: '500',
  },
  details: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 8,
  },
  detailSectionNote: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginBottom: 8,
  },
  detailGrid: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: TEXT.secondary,
  },
  detailValue: {
    fontSize: 14,
    color: TEXT.primary,
    fontWeight: '500',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SEMANTIC.warning.bg,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningIcon: {
    fontSize: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: SEMANTIC.warning.text,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SEMANTIC.info.bg,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  infoNoteIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: SEMANTIC.info.text,
    lineHeight: 16,
  },
  // Component breakdown styles
  componentsNote: {
    backgroundColor: SEMANTIC.warning.bg,
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  componentsNoteText: {
    fontSize: 11,
    color: SEMANTIC.warning.text,
    textAlign: 'center',
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACES.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.primary,
  },
  componentInfo: {
    flex: 1,
    marginRight: 12,
  },
  componentName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 2,
  },
  componentPortion: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  componentMacros: {
    alignItems: 'flex-end',
  },
  componentCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
    marginBottom: 2,
  },
  componentMacroText: {
    fontSize: 11,
    color: TEXT.secondary,
  },
  // Compact component display (always visible)
  componentsSection: {
    backgroundColor: SURFACES.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: SEMANTIC_ACTIONS.success,
  },
  componentsSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 8,
  },
  componentRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  componentNameCompact: {
    fontSize: 13,
    color: TEXT.secondary,
    flex: 1,
  },
  componentCaloriesCompact: {
    fontSize: 12,
    fontWeight: '500',
    color: SEMANTIC_ACTIONS.success,
  },
  showMoreComponents: {
    fontSize: 11,
    color: TEXT.secondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Portion source badge styles
  portionSourceBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  estimatedBadge: {
    backgroundColor: SEMANTIC.warning.bg,
    borderWidth: 1,
    borderColor: SEMANTIC_ACTIONS.warning,
  },
  userSpecifiedBadge: {
    backgroundColor: SEMANTIC.success.bg,
    borderWidth: 1,
    borderColor: SEMANTIC.success.light,
  },
  learnedBadge: {
    backgroundColor: SEMANTIC.info.bg,
    borderWidth: 1,
    borderColor: SEMANTIC.info.light,
  },
  portionSourceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  estimatedText: {
    color: SEMANTIC.warning.text,
  },
  userSpecifiedText: {
    color: SEMANTIC.success.dark,
  },
  learnedText: {
    color: SEMANTIC.info.dark,
  },
  // Complex recipe warning
  complexRecipeWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SEMANTIC.info.bg,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: SEMANTIC.info.base,
  },
  complexRecipeIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  complexRecipeText: {
    flex: 1,
    fontSize: 12,
    color: SEMANTIC.info.dark,
    lineHeight: 16,
  },
  // Collapsed group styles
  collapsedGroupSection: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: BRAND.primary,
    overflow: 'hidden',
  },
  collapsedGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  collapsedGroupToggle: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  collapsedGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.primary,
  },
  collapsedItemsList: {
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: SURFACES.card.primary,
  },
  collapsedItem: {
    marginBottom: 8,
  },
  collapsedItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT.primary,
    marginBottom: 2,
  },
  collapsedItemDetail: {
    fontSize: 11,
    color: TEXT.secondary,
  },
  // Ingredient delete button styles - Premium UX
  componentRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ingredientRemoveButton: {
    padding: 2,
    opacity: 0.7,
  },
  ingredientRemoveButtonLarge: {
    marginLeft: 12,
  },
  removeButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: SEMANTIC.danger.bg,
    borderWidth: 1,
    borderColor: SEMANTIC.danger.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  componentMacrosWithDelete: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
