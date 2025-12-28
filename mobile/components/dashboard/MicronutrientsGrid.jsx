/**
 * MicronutrientsGrid - Professional micronutrient visualization
 *
 * Displays vitamins and minerals in a compact, scannable grid
 * Shows top priority nutrients with progress indicators
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import CompactNutrientRing from './CompactNutrientRing';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  SHADOWS,
} from '../../constants/premiumTheme';

// Micronutrient configuration with icons, colors, and daily values
const MICRO_CONFIG = {
  // Vitamins
  vitamin_a: {
    label: 'Vitamin A',
    shortLabel: 'Vit A',
    unit: 'μg',
    dv: 900,
    icon: 'eye',
    colors: ['#F59E0B', '#D97706'],
    category: 'vitamin',
  },
  vitamin_c: {
    label: 'Vitamin C',
    shortLabel: 'Vit C',
    unit: 'mg',
    dv: 90,
    icon: 'shield-checkmark',
    colors: ['#10B981', '#059669'],
    category: 'vitamin',
  },
  vitamin_d: {
    label: 'Vitamin D',
    shortLabel: 'Vit D',
    unit: 'μg',
    dv: 20,
    icon: 'sunny',
    colors: ['#FBBF24', '#F59E0B'],
    category: 'vitamin',
  },
  vitamin_e: {
    label: 'Vitamin E',
    shortLabel: 'Vit E',
    unit: 'mg',
    dv: 15,
    icon: 'heart',
    colors: ['#EC4899', '#DB2777'],
    category: 'vitamin',
  },
  vitamin_k: {
    label: 'Vitamin K',
    shortLabel: 'Vit K',
    unit: 'μg',
    dv: 120,
    icon: 'water',
    colors: ['#14B8A6', '#0D9488'],
    category: 'vitamin',
  },
  vitamin_b12: {
    label: 'Vitamin B12',
    shortLabel: 'B12',
    unit: 'μg',
    dv: 2.4,
    icon: 'flash',
    colors: ['#EF4444', '#DC2626'],
    category: 'vitamin',
  },
  folate: {
    label: 'Folate (B9)',
    shortLabel: 'Folate',
    unit: 'μg',
    dv: 400,
    icon: 'leaf',
    colors: ['#84CC16', '#65A30D'],
    category: 'vitamin',
  },

  // Minerals
  calcium: {
    label: 'Calcium',
    shortLabel: 'Calcium',
    unit: 'mg',
    dv: 1000,
    icon: 'body',
    colors: ['#3B82F6', '#2563EB'],
    category: 'mineral',
  },
  iron: {
    label: 'Iron',
    shortLabel: 'Iron',
    unit: 'mg',
    dv: 18,
    icon: 'fitness',
    colors: ['#DC2626', '#B91C1C'],
    category: 'mineral',
  },
  magnesium: {
    label: 'Magnesium',
    shortLabel: 'Magnesium',
    unit: 'mg',
    dv: 420,
    icon: 'pulse',
    colors: ['#8B5CF6', '#7C3AED'],
    category: 'mineral',
  },
  potassium: {
    label: 'Potassium',
    shortLabel: 'Potassium',
    unit: 'mg',
    dv: 4700,
    icon: 'water',
    colors: ['#06B6D4', '#0891B2'],
    category: 'mineral',
  },
  zinc: {
    label: 'Zinc',
    shortLabel: 'Zinc',
    unit: 'mg',
    dv: 11,
    icon: 'shield',
    colors: ['#64748B', '#475569'],
    category: 'mineral',
  },
  sodium: {
    label: 'Sodium',
    shortLabel: 'Sodium',
    unit: 'mg',
    dv: 2300,
    icon: 'alert-circle',
    colors: ['#F97316', '#EA580C'],
    category: 'mineral',
  },
};

// Micro nutrient item component
const MicroNutrientItem = ({ microKey, value, config }) => {
  const percentage = Math.min((value / config.dv) * 100, 100);

  return (
    <View style={styles.microItem}>
      <View style={styles.microHeader}>
        <LinearGradient colors={config.colors} style={styles.microIcon}>
          <Ionicons name={config.icon} size={12} color="#FFF" />
        </LinearGradient>
        <View style={styles.microInfo}>
          <Text style={styles.microLabel}>{config.shortLabel}</Text>
          <Text style={styles.microValue}>
            {Math.round(value)}
            <Text style={styles.microUnit}>{config.unit}</Text>
          </Text>
        </View>
      </View>

      {/* Mini progress bar */}
      <View style={styles.microProgress}>
        <LinearGradient
          colors={config.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.microProgressFill, { width: `${percentage}%` }]}
        />
      </View>
      <Text style={styles.microPercentage}>{Math.round(percentage)}%</Text>
    </View>
  );
};

export default function MicronutrientsGrid({ micros = {}, showAll = false }) {
  // Get available micros from the data
  const availableMicros = Object.keys(micros)
    .filter((key) => MICRO_CONFIG[key] && micros[key] > 0)
    .sort((a, b) => {
      // Sort by percentage completion (highest first)
      const percentA = (micros[a] / MICRO_CONFIG[a].dv) * 100;
      const percentB = (micros[b] / MICRO_CONFIG[b].dv) * 100;
      return percentB - percentA;
    });

  // Show top 6 by default, or all if showAll is true
  const displayMicros = showAll ? availableMicros : availableMicros.slice(0, 6);

  if (displayMicros.length === 0) {
    return (
      <GlassCard padding="md">
        <View style={styles.emptyState}>
          <Ionicons name="flask-outline" size={40} color={TEXT.secondary} />
          <Text style={styles.emptyText}>No micronutrient data yet</Text>
          <Text style={styles.emptyHint}>Log meals to see vitamins & minerals</Text>
        </View>
      </GlassCard>
    );
  }

  // Separate vitamins and minerals
  const vitamins = displayMicros.filter(
    (key) => MICRO_CONFIG[key].category === 'vitamin'
  );
  const minerals = displayMicros.filter(
    (key) => MICRO_CONFIG[key].category === 'mineral'
  );

  return (
    <GlassCard padding="md">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient colors={SURFACES.gradient.info} style={styles.headerIcon}>
            <Ionicons name="flask" size={18} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Micronutrients</Text>
            <Text style={styles.headerNote}>Estimated</Text>
          </View>
        </View>
        <Text style={styles.headerBadge}>
          {displayMicros.length} tracked
        </Text>
      </View>

      {/* Vitamins Section */}
      {vitamins.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vitamins</Text>
          <View style={styles.microGrid}>
            {vitamins.map((microKey) => (
              <MicroNutrientItem
                key={microKey}
                microKey={microKey}
                value={micros[microKey]}
                config={MICRO_CONFIG[microKey]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Minerals Section */}
      {minerals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Minerals</Text>
          <View style={styles.microGrid}>
            {minerals.map((microKey) => (
              <MicroNutrientItem
                key={microKey}
                microKey={microKey}
                value={micros[microKey]}
                config={MICRO_CONFIG[microKey]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Show more hint */}
      {!showAll && availableMicros.length > 6 && (
        <Text style={styles.moreHint}>
          +{availableMicros.length - 6} more nutrients tracked
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerNote: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: 2,
  },
  headerBadge: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },

  // Sections
  section: {
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },

  // Micro Grid
  microGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },

  // Micro Item
  microItem: {
    width: '48%',
    backgroundColor: `${TEXT.primary}03`,
    borderRadius: RADIUS.md,
    padding: SPACING[2],
    gap: SPACING[1],
  },
  microHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  microIcon: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microInfo: {
    flex: 1,
  },
  microLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  microValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  microUnit: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.normal,
    color: TEXT.secondary,
  },
  microProgress: {
    height: 3,
    backgroundColor: `${TEXT.primary}10`,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  microProgressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  microPercentage: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    textAlign: 'right',
  },

  // More hint
  moreHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    textAlign: 'center',
    marginTop: SPACING[2],
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
    gap: SPACING[2],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  emptyHint: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.muted,
  },
});
