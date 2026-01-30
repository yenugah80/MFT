/**
 * Quick Stats Row - Minimal stats below calorie ring
 * Shows: Target | Consumed | Burned
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/designSystem';

export default function QuickStatsRow({ target = 2000, consumed = 1620, burned = 120 }) {
  const remaining = Math.max(target - consumed, 0);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.stat}>
          <Text style={styles.label}>Target</Text>
          <Text style={styles.value}>{target}</Text>
          <Text style={styles.unit}>cal</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={styles.label}>Consumed</Text>
          <Text style={styles.value}>{consumed}</Text>
          <Text style={styles.unit}>cal</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.stat}>
          <Text style={styles.label}>Burned</Text>
          <Text style={styles.value}>{burned}</Text>
          <Text style={styles.unit}>cal</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingVertical: SPACING.md,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.text.inverse,
    marginBottom: SPACING.xs,
  },
  unit: {
    fontSize: TYPOGRAPHY.size.caption,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
