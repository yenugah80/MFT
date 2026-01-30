import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getMicroBarColor } from '../utils/microsCalculations';
import { TEXT, SURFACES, TYPOGRAPHY } from '../constants/premiumTheme';

/**
 * Horizontal bar for individual micronutrient
 */
const MicroBar = ({ label, value, unit, percentage, rdi }) => {
  const barColor = getMicroBarColor(percentage);
  const barWidth = `${Math.min(percentage, 100)}%`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {value.toFixed(value < 10 ? 1 : 0)}{unit} / {rdi}{unit}
        </Text>
      </View>

      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: barWidth, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <Text style={[styles.percentage, { color: barColor }]}>
          {percentage}%
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  value: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  barContainer: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  footer: {
    alignItems: 'flex-end',
  },
  percentage: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});

export default MicroBar;
