/**
 * TimeframeSelector Component
 *
 * Allows switching between daily, weekly, and monthly analytics views.
 * Uses segmented control pattern for intuitive navigation.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEXT, SURFACES, BRAND, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/premiumTheme';

// Keys match the app-wide period convention (useAnalytics.js's
// getPeriodParams, backend query params) — not this component's own
// invented daily/weekly/monthly, since this is the only place it's used.
const TIMEFRAMES = [
  { key: 'today', label: 'Day', icon: 'today-outline' },
  { key: 'week', label: 'Week', icon: 'calendar-outline' },
  { key: 'month', label: 'Month', icon: 'calendar-number-outline' },
];

const TimeframeSelector = ({
  selected = 'week',
  onSelect,
  disabled = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]} accessibilityRole="tablist">
      {TIMEFRAMES.map((tf) => {
        const isSelected = selected === tf.key;
        return (
          <TouchableOpacity
            key={tf.key}
            style={[
              styles.option,
              isSelected && styles.optionSelected,
              disabled && styles.optionDisabled,
            ]}
            onPress={() => !disabled && onSelect?.(tf.key)}
            activeOpacity={0.7}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityLabel={`${tf.label} view`}
            accessibilityState={{ selected: isSelected, disabled }}
          >
            <Ionicons
              name={tf.icon}
              size={16}
              color={isSelected ? BRAND.primary : TEXT.tertiary}
            />
            <Text
              style={[
                styles.optionLabel,
                isSelected && styles.optionLabelSelected,
              ]}
            >
              {tf.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: SURFACES.divider,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: SPACING[1],
    paddingVertical: 8,
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
  },
  optionSelected: {
    backgroundColor: `${BRAND.primary}10`,
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  optionLabelSelected: {
    color: BRAND.primary,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});

export default TimeframeSelector;
