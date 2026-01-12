/**
 * MicrosGrid Component
 * 2-column grid displaying vitamins and minerals with %DV bars
 * Features: Progress bars, DV percentages, organized by category
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { DAILY_VALUES } from '../../../constants/dailyValues';
import { useTheme } from '../../../providers/ThemeProvider';

/**
 * Key micronutrients to display (simplified for initial version)
 * These 5 are the most commonly tracked and clinically relevant
 */
const KEY_MICRONUTRIENTS = ['calcium', 'iron', 'magnesium', 'potassium', 'sodium'];

/**
 * Micronutrient display names and categories
 * Limited to 5 key minerals for initial version
 */
const MICRO_CONFIG = {
  // Key Minerals (displayed)
  calcium: { label: 'Calcium', category: 'mineral', key: 'calcium' },
  iron: { label: 'Iron', category: 'mineral', key: 'iron' },
  magnesium: { label: 'Magnesium', category: 'mineral', key: 'magnesium' },
  potassium: { label: 'Potassium', category: 'mineral', key: 'potassium' },
  sodium: { label: 'Sodium', category: 'mineral', key: 'sodium' },
};

/**
 * Calculate %DV for a micronutrient
 */
function calculateDVPercentage(microKey, value) {
  const config = MICRO_CONFIG[microKey];
  if (!config) return 0;

  const dv = DAILY_VALUES[config.key];
  if (!dv || !dv.value) return 0;

  return Math.round((value / dv.value) * 100);
}

/**
 * Single micronutrient cell
 */
function MicroCell({ microKey, value, unit }) {
  const { colors, isDark } = useTheme();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  const config = MICRO_CONFIG[microKey] || { label: microKey, category: 'other' };
  const dvPercentage = calculateDVPercentage(microKey, value);
  const isHighDV = dvPercentage >= 20; // 20% DV is considered "high"
  const isLowDV = dvPercentage < 5;

  // Get bar color based on DV percentage
  const getBarColor = () => {
    if (dvPercentage >= 50) return '#10B981'; // Green - excellent
    if (dvPercentage >= 20) return '#3B82F6'; // Blue - good
    if (dvPercentage >= 10) return '#F59E0B'; // Amber - moderate
    return '#9CA3AF'; // Gray - low
  };

  return (
    <View
      style={[
        styles.microCell,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
      ]}
    >
      <View style={styles.microHeader}>
        <Text style={[styles.microLabel, { color: textPrimary }]} numberOfLines={1}>
          {config.label}
        </Text>
        <Text
          style={[
            styles.dvPercentage,
            {
              color: isHighDV ? '#10B981' : isLowDV ? textSecondary : '#3B82F6',
            },
          ]}
        >
          {dvPercentage}%
        </Text>
      </View>

      <View style={styles.microBarContainer}>
        <View
          style={[
            styles.microBarFill,
            {
              width: `${Math.min(100, dvPercentage)}%`,
              backgroundColor: getBarColor(),
            },
          ]}
        />
      </View>

      <Text style={[styles.microValue, { color: textSecondary }]}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit || ''}
      </Text>
    </View>
  );
}

export default function MicrosGrid({ micros }) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  // Process micros into array format - only 5 key micronutrients
  const processedMicros = React.useMemo(() => {
    if (!micros || typeof micros !== 'object') return [];

    return Object.entries(micros)
      .filter(([key, val]) => {
        // Only include the 5 key micronutrients
        if (!KEY_MICRONUTRIENTS.includes(key.toLowerCase())) return false;
        // Filter out invalid entries
        if (!val) return false;
        const value = typeof val === 'object' ? val.value : val;
        return value > 0;
      })
      .map(([key, val]) => ({
        key: key.toLowerCase(),
        value: typeof val === 'object' ? val.value : val,
        unit: typeof val === 'object' ? val.unit : 'mg',
      }))
      .sort((a, b) => {
        // Sort by predefined order
        return KEY_MICRONUTRIENTS.indexOf(a.key) - KEY_MICRONUTRIENTS.indexOf(b.key);
      });
  }, [micros]);

  // Don't render if no micros
  if (processedMicros.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
      ]}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Vitamins and Minerals section, ${processedMicros.length} nutrients, ${expanded ? 'collapse' : 'expand'}`}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="leaf-outline" size={18} color="#10B981" />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>
            Key Minerals
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{processedMicros.length}</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={textSecondary}
        />
      </TouchableOpacity>

      {/* Info text */}
      {expanded && (
        <Text style={[styles.infoText, { color: textSecondary }]}>
          % Daily Value based on 2000 calorie diet
        </Text>
      )}

      {/* Grid */}
      {expanded && (
        <View style={styles.grid}>
          {processedMicros.map((micro) => (
            <MicroCell
              key={micro.key}
              microKey={micro.key}
              value={micro.value}
              unit={micro.unit}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING[4],
    marginVertical: SPACING[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  countBadge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  infoText: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: SPACING[2],
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING[3],
    gap: SPACING[2],
  },
  microCell: {
    width: '48%',
    borderRadius: 10,
    padding: SPACING[3],
  },
  microHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  microLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    flex: 1,
  },
  dvPercentage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  microBarContainer: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING[1],
  },
  microBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  microValue: {
    fontSize: 10,
  },
});
