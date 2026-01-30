import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

const SWIPE_THRESHOLD = -80;
const DELETE_BUTTON_WIDTH = 80;

/**
 * SwipeableIngredientItem
 *
 * Individual ingredient item with swipe-to-delete functionality.
 * Swipe left to reveal delete button.
 *
 * Props:
 * - ingredient: { id, name, portion, nutrition, isRemovable, category }
 * - onRemove: (ingredientId) => void
 * - onTap: (ingredient) => void (for editing)
 * - totalCalories: number (for percentage bar)
 * - disabled: boolean
 */
const SwipeableIngredientItem = ({
  ingredient,
  onRemove,
  onTap,
  totalCalories = 100,
  disabled = false,
}) => {
  const pan = useRef(new Animated.Value(0)).current;
  const isSwipeOpen = useRef(false);

  const resetPosition = useCallback(() => {
    Animated.spring(pan, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
    isSwipeOpen.current = false;
  }, [pan]);

  const openSwipe = useCallback(() => {
    Animated.spring(pan, {
      toValue: -DELETE_BUTTON_WIDTH,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
    isSwipeOpen.current = true;
  }, [pan]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Remove Ingredient?',
      `Are you sure you want to remove "${ingredient.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: resetPosition,
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onRemove?.(ingredient.id || ingredient.name);
          },
        },
      ],
      { cancelable: true }
    );
  }, [ingredient, onRemove, resetPosition]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        pan.setOffset(pan._value);
        pan.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative dx), limit to delete button width
        const newValue = Math.max(-DELETE_BUTTON_WIDTH, Math.min(0, gestureState.dx));
        pan.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Swiped past threshold - open delete button
          openSwipe();
        } else {
          // Snap back to closed
          resetPosition();
        }
      },
      onPanResponderTerminate: () => {
        resetPosition();
      },
    })
  ).current;

  const handleTap = useCallback(() => {
    if (isSwipeOpen.current) {
      resetPosition();
    } else {
      onTap?.(ingredient);
    }
  }, [ingredient, onTap, resetPosition]);

  const caloriePercentage = Math.min(
    ((ingredient.nutrition?.calories || 0) / totalCalories) * 100,
    100
  );

  const isRemovable = ingredient.isRemovable !== false;

  return (
    <View style={styles.container}>
      {/* Delete Button (Behind) */}
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Content (Front) */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            transform: [{ translateX: isRemovable && !disabled ? pan : 0 }],
          },
        ]}
        {...(isRemovable && !disabled ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity
          style={styles.ingredientRow}
          onPress={handleTap}
          activeOpacity={0.7}
          disabled={disabled}
        >
          {/* Category Icon */}
          <View style={[styles.categoryIcon, getCategoryStyle(ingredient.category)]}>
            <Ionicons
              name={getCategoryIconName(ingredient.category)}
              size={16}
              color="#FFFFFF"
            />
          </View>

          {/* Ingredient Info */}
          <View style={styles.ingredientInfo}>
            <Text style={styles.ingredientName} numberOfLines={1}>
              {ingredient.name}
            </Text>
            <View style={styles.ingredientMeta}>
              <Text style={styles.ingredientPortion}>
                {ingredient.portion || '1 serving'}
              </Text>
              {!isRemovable && (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={10} color={TEXT.tertiary} />
                  <Text style={styles.lockedText}>Required</Text>
                </View>
              )}
            </View>
          </View>

          {/* Nutrition Info */}
          <View style={styles.nutritionInfo}>
            <Text style={styles.calorieValue}>
              {Math.round(ingredient.nutrition?.calories || 0)}
            </Text>
            <Text style={styles.calorieLabel}>cal</Text>
          </View>

          {/* Calorie Bar */}
          <View style={styles.calorieBarContainer}>
            <View
              style={[
                styles.calorieBar,
                { width: `${caloriePercentage}%` },
                getCategoryBarStyle(ingredient.category),
              ]}
            />
          </View>

          {/* Swipe Hint */}
          {isRemovable && !disabled && (
            <View style={styles.swipeHint}>
              <Ionicons name="chevron-back" size={14} color={TEXT.tertiary} />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Helper functions for category styling
const getCategoryIconName = (category) => {
  const icons = {
    protein: 'fish-outline',
    cheese: 'cube-outline',
    sauce: 'water-outline',
    vegetable: 'leaf-outline',
    carb: 'restaurant-outline',
    drink: 'cafe-outline',
    condiment: 'color-fill-outline',
    default: 'ellipse-outline',
  };
  return icons[category] || icons.default;
};

const getCategoryStyle = (category) => {
  const colors = {
    protein: { backgroundColor: '#EF4444' },
    cheese: { backgroundColor: '#F59E0B' },
    sauce: { backgroundColor: '#8B5CF6' },
    vegetable: { backgroundColor: '#10B981' },
    carb: { backgroundColor: '#F97316' },
    drink: { backgroundColor: '#06B6D4' },
    condiment: { backgroundColor: '#EC4899' },
    default: { backgroundColor: TEXT.tertiary },
  };
  return colors[category] || colors.default;
};

const getCategoryBarStyle = (category) => {
  const colors = {
    protein: { backgroundColor: '#EF4444' },
    cheese: { backgroundColor: '#F59E0B' },
    sauce: { backgroundColor: '#8B5CF6' },
    vegetable: { backgroundColor: '#10B981' },
    carb: { backgroundColor: '#F97316' },
    drink: { backgroundColor: '#06B6D4' },
    condiment: { backgroundColor: '#EC4899' },
    default: { backgroundColor: BRAND.primary },
  };
  return colors[category] || colors.default;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.medium,
    marginTop: 2,
  },
  contentContainer: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientInfo: {
    flex: 1,
    minWidth: 0,
  },
  ingredientName: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  ingredientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientPortion: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SURFACES.background.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockedText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  nutritionInfo: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  calorieValue: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  calorieLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  calorieBarContainer: {
    width: 40,
    height: 4,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  calorieBar: {
    height: '100%',
    borderRadius: 2,
  },
  swipeHint: {
    opacity: 0.4,
  },
});

export default SwipeableIngredientItem;
