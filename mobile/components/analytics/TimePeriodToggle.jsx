import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TEXT, SURFACES, BRAND, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/premiumTheme';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export default function TimePeriodToggle({ selected = 'week', onSelect }) {
  const handleSelect = (period) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect?.(period);
  };

  return (
    <View style={styles.container}>
      {PERIODS.map((period) => {
        const isActive = selected === period.key;
        return (
          <TouchableOpacity
            key={period.key}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => handleSelect(period.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[1],
    gap: SPACING[1],
  },
  pill: {
    flex: 1,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: SURFACES.card.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  labelActive: {
    color: TEXT.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});
