/**
 * Mini Bar Chart Component
 *
 * Based on 2025 health visualization best practices:
 * - Bar charts are the MOST POPULAR visualization in health apps
 * - Simple, readable, familiar to users
 * - Small-medium size for dashboard cards
 * - Progressive disclosure: High-level at a glance, tap to dive deeper
 *
 * Sources:
 * - PMC: "Bar and line charts are the most popular type of visualizations"
 * - UX Research: "Use patterns people recognize and feel comfortable reading"
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TEXT, BRAND, SURFACES, SEMANTIC } from '../../constants/premiumTheme';

/**
 * MiniBarChart - Compact horizontal bar chart
 *
 * @param {Array} data - [{label, value, maxValue, color}]
 * @param {number} height - Total height (default 120)
 * @param {Function} onPress - Optional tap handler for progressive disclosure
 * @param {boolean} showValues - Show value labels (default true)
 * @param {string} unit - Unit suffix (e.g., 'g', 'kcal')
 */
export default function MiniBarChart({
  data = [],
  height = 120,
  onPress = null,
  showValues = true,
  unit = '',
}) {
  if (data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const barHeight = (height - (data.length - 1) * 8) / data.length;

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.container, { height }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {data.map((item, index) => {
        const percentage = (item.value / item.maxValue) * 100;
        const barColor = item.color || BRAND.primary;

        return (
          <View key={index} style={styles.barRow}>
            {/* Label */}
            <Text style={styles.barLabel} numberOfLines={1}>
              {item.label}
            </Text>

            {/* Bar */}
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${percentage}%`,
                    height: barHeight,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>

            {/* Value */}
            {showValues && (
              <Text style={styles.barValue}>
                {item.value}{unit}
              </Text>
            )}
          </View>
        );
      })}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  emptyText: {
    fontSize: 14,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: 20,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 12,
    color: TEXT.secondary,
    fontWeight: '600',
    width: 60,
  },
  barContainer: {
    flex: 1,
    height: '100%',
    backgroundColor: SURFACES.card,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 4,
  },
  barValue: {
    fontSize: 12,
    color: TEXT.primary,
    fontWeight: '700',
    width: 50,
    textAlign: 'right',
  },
});
