import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CircularProgress from './CircularProgress';

/**
 * Macro nutrient display with circular progress
 */
const MacroRing = ({ label, value, target, unit = 'g', color, size = 100 }) => {
  const percentage = target > 0 ? (value / target) * 100 : 0;

  return (
    <View style={styles.container}>
      <CircularProgress
        value={value}
        maxValue={target || 100}
        size={size}
        strokeWidth={8}
        color={color}
        backgroundColor="#f9e6a3ff"
      >
        <View style={styles.centerContent}>
          <Text style={styles.value}>{Math.round(value)}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </CircularProgress>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.target}>
        {target > 0 ? `${Math.round(percentage)}%` : '—'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  centerContent: {
    alignItems: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  unit: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  target: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
});

export default MacroRing;
