/**
 * AnimatedChipSelector - Premium Reusable Chip Selection Component
 *
 * Features:
 * - Staggered entrance animations (50ms delay per chip)
 * - Spring press animation
 * - Haptic feedback on selection
 * - Single or multi-select modes
 * - Customizable colors and styles
 * - Accessible with proper roles
 *
 * Usage:
 *   <AnimatedChipSelector
 *     options={[{ key: 'option1', label: 'Option 1' }]}
 *     selected={['option1']}
 *     onSelect={(key) => handleSelect(key)}
 *     multiSelect={false}
 *   />
 */

import React, { useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { BRAND, SURFACES, TEXT, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ANIMATION, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';

/**
 * Individual Animated Chip
 */
const AnimatedChip = memo(({
  option,
  isSelected,
  onPress,
  index,
  disabled,
  variant = 'default',
  showCheckmark = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  // Staggered entrance animation
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 50,
      tension: ANIMATION.spring.tension,
      friction: ANIMATION.spring.friction,
      useNativeDriver: true,
    }).start();
  }, [index, scaleAnim]);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    Animated.spring(pressAnim, {
      toValue: 0.95,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [pressAnim, disabled]);

  const handlePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 400,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(option.key);
  }, [disabled, onPress, option.key]);

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          selectedBg: '#EF4444',
          selectedBorder: '#EF4444',
          selectedText: TEXT.white,
        };
      case 'success':
        return {
          selectedBg: '#10B981',
          selectedBorder: '#10B981',
          selectedText: TEXT.white,
        };
      case 'warning':
        return {
          selectedBg: '#F59E0B',
          selectedBorder: '#F59E0B',
          selectedText: TEXT.white,
        };
      case 'info':
        return {
          selectedBg: '#3B82F6',
          selectedBorder: '#3B82F6',
          selectedText: TEXT.white,
        };
      case 'default':
      default:
        return {
          selectedBg: BRAND.primary,
          selectedBorder: BRAND.primary,
          selectedText: TEXT.white,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Animated.View
      style={{
        transform: [{ scale: Animated.multiply(scaleAnim, pressAnim) }],
        opacity: scaleAnim,
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled }}
        accessibilityLabel={option.label}
        style={[
          styles.chip,
          isSelected && {
            backgroundColor: variantStyles.selectedBg,
            borderColor: variantStyles.selectedBorder,
          },
          disabled && styles.chipDisabled,
        ]}
      >
        {isSelected && showCheckmark && (
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={variantStyles.selectedText}
            style={styles.chipIcon}
          />
        )}
        {option.icon && !isSelected && (
          <Ionicons
            name={option.icon}
            size={16}
            color={TEXT.secondary}
            style={styles.chipIcon}
          />
        )}
        <Text
          style={[
            styles.chipText,
            isSelected && { color: variantStyles.selectedText },
          ]}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

AnimatedChip.displayName = 'AnimatedChip';

/**
 * AnimatedChipSelector Component
 */
const AnimatedChipSelector = ({
  options = [],
  selected = [],
  onSelect,
  multiSelect = false,
  disabled = false,
  variant = 'default',
  showCheckmark = true,
  style,
  chipStyle,
}) => {
  // Normalize selected to array
  const selectedArray = Array.isArray(selected) ? selected : [selected].filter(Boolean);

  const handleSelect = useCallback((key) => {
    if (multiSelect) {
      // Toggle selection in multi-select mode
      const newSelected = selectedArray.includes(key)
        ? selectedArray.filter(k => k !== key)
        : [...selectedArray, key];
      onSelect(newSelected);
    } else {
      // Single select mode
      onSelect(key);
    }
  }, [multiSelect, selectedArray, onSelect]);

  return (
    <View style={[styles.container, style]}>
      {options.map((option, index) => (
        <AnimatedChip
          key={option.key}
          option={option}
          isSelected={selectedArray.includes(option.key)}
          onPress={handleSelect}
          index={index}
          disabled={disabled || option.disabled}
          variant={variant}
          showCheckmark={showCheckmark}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.card.primary,
    borderWidth: 1.5,
    borderColor: `${SEMANTIC_ACTIONS.success}26`,
    ...SHADOWS.sm,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
});

export default memo(AnimatedChipSelector);
