/**
 * Preference Strength Selector — compact inline 3-level control
 * (matches the warm-cream / deep-green editorial brand)
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AUTH_COLORS } from '../auth/constants';

const LEVELS = [
  { value: 2, label: 'A little' },
  { value: 3, label: 'A lot' },
  { value: 5, label: 'Must-have' },
];

const closestLevel = (strength) =>
  LEVELS.reduce((closest, level) =>
    Math.abs(level.value - strength) < Math.abs(closest.value - strength) ? level : closest,
  LEVELS[1]).value;

export default function PreferenceStrengthSelector({
  preferenceLabel = '',
  currentStrength = 3,
  onStrengthChange = () => {},
}) {
  const activeValue = closestLevel(currentStrength);

  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>{preferenceLabel}</Text>
      <View style={styles.segmentGroup}>
        {LEVELS.map((level) => {
          const isActive = activeValue === level.value;
          return (
            <Pressable
              key={level.value}
              onPress={() => onStrengthChange(level.value)}
              style={[styles.segment, isActive && styles.segmentActive]}
              accessibilityRole="button"
              accessibilityLabel={`${preferenceLabel}: ${level.label}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {level.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  label: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.ink,
    textTransform: 'capitalize',
  },
  segmentGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  segment: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  segmentActive: {
    backgroundColor: AUTH_COLORS.primary,
  },
  segmentText: {
    fontSize: 9.5,
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.muted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
});
