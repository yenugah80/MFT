import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';

/**
 * Quantity Adjuster Component
 *
 * Allows users to adjust the quantity of countable foods (roti, egg, idli, etc.)
 * Shows real-time calorie updates as quantity changes.
 *
 * Features:
 * - Stepper control (+/-)
 * - Quick buttons (1, 2, 3)
 * - Real-time calorie calculation
 * - Smooth animations
 */
const QuantityAdjuster = ({
  foodName,
  initialQuantity = 1,
  caloriesPerUnit,
  macrosPerUnit,
  unitLabel = 'piece',
  minQuantity = 0.5,
  maxQuantity = 10,
  step = 0.5,
  onQuantityChange,
  isCountable = true,
  adjustmentOptions = [],
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [scaleAnim] = useState(new Animated.Value(1));

  const animatePulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  const handleQuantityChange = useCallback(
    (newQuantity) => {
      const clampedQuantity = Math.max(
        minQuantity,
        Math.min(maxQuantity, newQuantity)
      );
      setQuantity(clampedQuantity);
      animatePulse();

      if (onQuantityChange) {
        const calories = caloriesPerUnit
          ? Math.round(caloriesPerUnit * clampedQuantity)
          : null;
        const macros = macrosPerUnit
          ? {
              protein: Math.round(macrosPerUnit.protein * clampedQuantity * 10) / 10,
              carbs: Math.round(macrosPerUnit.carbs * clampedQuantity * 10) / 10,
              fat: Math.round(macrosPerUnit.fat * clampedQuantity * 10) / 10,
              fiber: Math.round((macrosPerUnit.fiber || 0) * clampedQuantity * 10) / 10,
            }
          : null;

        onQuantityChange({
          quantity: clampedQuantity,
          calories,
          macros,
        });
      }
    },
    [minQuantity, maxQuantity, caloriesPerUnit, macrosPerUnit, onQuantityChange, animatePulse]
  );

  const increment = () => handleQuantityChange(quantity + step);
  const decrement = () => handleQuantityChange(quantity - step);

  const currentCalories = caloriesPerUnit
    ? Math.round(caloriesPerUnit * quantity)
    : null;

  // Don't render if not countable
  if (!isCountable) return null;

  // Format quantity for display (remove .0 for whole numbers)
  const formatQuantity = (q) => (q % 1 === 0 ? q.toString() : q.toFixed(1));

  // Get plural form
  const getPluralUnit = (q, unit) => {
    if (q === 1) return unit;
    // Simple pluralization
    if (unit.endsWith('s')) return unit;
    return `${unit}s`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quantity</Text>
        {currentCalories && (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Text style={styles.caloriesLabel}>
              <Text style={styles.caloriesValue}>{currentCalories}</Text> cal
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.controlsRow}>
        {/* Stepper Control */}
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[
              styles.stepperButton,
              quantity <= minQuantity && styles.stepperButtonDisabled,
            ]}
            onPress={decrement}
            disabled={quantity <= minQuantity}
            activeOpacity={0.7}
          >
            <Ionicons
              name="remove"
              size={20}
              color={quantity <= minQuantity ? TEXT.tertiary : BRAND.primary}
            />
          </TouchableOpacity>

          <View style={styles.quantityDisplay}>
            <Text style={styles.quantityText}>{formatQuantity(quantity)}</Text>
            <Text style={styles.unitText}>
              {getPluralUnit(quantity, unitLabel)}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.stepperButton,
              quantity >= maxQuantity && styles.stepperButtonDisabled,
            ]}
            onPress={increment}
            disabled={quantity >= maxQuantity}
            activeOpacity={0.7}
          >
            <Ionicons
              name="add"
              size={20}
              color={quantity >= maxQuantity ? TEXT.tertiary : BRAND.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Quick Buttons */}
        <View style={styles.quickButtons}>
          {[1, 2, 3].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.quickButton,
                quantity === num && styles.quickButtonActive,
              ]}
              onPress={() => handleQuantityChange(num)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.quickButtonText,
                  quantity === num && styles.quickButtonTextActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Per-unit info */}
      {caloriesPerUnit && (
        <View style={styles.perUnitInfo}>
          <Ionicons name="information-circle-outline" size={14} color={TEXT.tertiary} />
          <Text style={styles.perUnitText}>
            {caloriesPerUnit} cal per {unitLabel}
          </Text>
        </View>
      )}

      {/* Custom Options (if provided) */}
      {adjustmentOptions?.suggestedOptions?.length > 0 && (
        <View style={styles.optionsSection}>
          <Text style={styles.optionsTitle}>Quick select</Text>
          <View style={styles.optionsRow}>
            {adjustmentOptions.suggestedOptions.slice(0, 4).map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.optionPill,
                  quantity === option.quantity && styles.optionPillActive,
                ]}
                onPress={() => handleQuantityChange(option.quantity)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionPillText,
                    quantity === option.quantity && styles.optionPillTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {option.calories && (
                  <Text
                    style={[
                      styles.optionCalories,
                      quantity === option.quantity && styles.optionCaloriesActive,
                    ]}
                  >
                    {option.calories} cal
                  </Text>
                )}
              </TouchableOpacity>
            ))}
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
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
  },
  caloriesLabel: {
    fontSize: 14,
    color: TEXT.secondary,
  },
  caloriesValue: {
    fontSize: 18,
    fontWeight: '700',
    color: BRAND.primary,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.background.primary,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACES.background.tertiary,
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  quantityDisplay: {
    alignItems: 'center',
    paddingHorizontal: 16,
    minWidth: 80,
  },
  quantityText: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT.primary,
  },
  unitText: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: -2,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACES.background.primary,
    borderWidth: 1,
    borderColor: SURFACES.border.light,
  },
  quickButtonActive: {
    backgroundColor: BRAND.primary,
    borderColor: BRAND.primary,
  },
  quickButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  quickButtonTextActive: {
    color: '#FFFFFF',
  },
  perUnitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SURFACES.border.light,
  },
  perUnitText: {
    fontSize: 13,
    color: TEXT.tertiary,
  },
  optionsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SURFACES.border.light,
  },
  optionsTitle: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: SURFACES.background.primary,
    borderWidth: 1,
    borderColor: SURFACES.border.light,
    alignItems: 'center',
  },
  optionPillActive: {
    backgroundColor: BRAND.primary + '15',
    borderColor: BRAND.primary,
  },
  optionPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT.secondary,
  },
  optionPillTextActive: {
    color: BRAND.primary,
  },
  optionCalories: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  optionCaloriesActive: {
    color: BRAND.primary,
  },
});

export default QuantityAdjuster;
