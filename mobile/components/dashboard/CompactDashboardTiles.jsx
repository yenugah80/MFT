/**
 * CompactDashboardTiles - Glassmorphic compact tiles row
 * Premium UI: 2 compact tiles showing macros donut and hydration bar
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Svg, { Circle, G } from 'react-native-svg';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { TEXT, SHADOWS, CARD_SYSTEM } from '../../constants/premiumTheme';
import { MODERN_MACROS } from '../../constants/modernColorPalette';

// Mini Donut Chart for macros
function MiniDonut({ protein, carbs, fat, size = 48 }) {
  const total = protein + carbs + fat;
  if (total === 0) {
    return (
      <View style={[styles.miniDonutPlaceholder, { width: size, height: size }]}>
        <Ionicons name="pie-chart-outline" size={size * 0.5} color={TEXT.tertiary} />
      </View>
    );
  }

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const proteinPct = protein / total;
  const carbsPct = carbs / total;
  const fatPct = fat / total;

  const proteinStroke = circumference * proteinPct;
  const carbsStroke = circumference * carbsPct;
  const fatStroke = circumference * fatPct;

  let currentRotation = -90; // Start at top

  return (
    <Svg width={size} height={size}>
      <G rotation={currentRotation} origin={`${center}, ${center}`}>
        {/* Protein - Blue */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={MODERN_MACROS.protein.base}
          strokeWidth={strokeWidth}
          strokeDasharray={`${proteinStroke} ${circumference - proteinStroke}`}
          strokeDashoffset={0}
          fill="none"
          strokeLinecap="round"
        />
        {/* Carbs - Green */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={MODERN_MACROS.carbs.base}
          strokeWidth={strokeWidth}
          strokeDasharray={`${carbsStroke} ${circumference - carbsStroke}`}
          strokeDashoffset={-proteinStroke}
          fill="none"
          strokeLinecap="round"
        />
        {/* Fat - Amber */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={MODERN_MACROS.fat.base}
          strokeWidth={strokeWidth}
          strokeDasharray={`${fatStroke} ${circumference - fatStroke}`}
          strokeDashoffset={-(proteinStroke + carbsStroke)}
          fill="none"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

export default function CompactDashboardTiles({
  today,
  onTapMacros,
}) {
  // Parse values
  const protein = today?.nutrition?.totalProtein ?? 0;
  const carbs = today?.nutrition?.totalCarbs ?? 0;
  const fat = today?.nutrition?.totalFats ?? 0;

  return (
    <View style={styles.container}>
      {/* Macros Tile */}
      <TouchableOpacity
        style={styles.tile}
        onPress={onTapMacros}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Macros balance"
      >
        <BlurView intensity={20} tint="light" style={styles.blurContainer}>
          <View style={styles.tileContent}>
            <MiniDonut protein={protein} carbs={carbs} fat={fat} size={44} />
            <View style={styles.tileTextContainer}>
              <Text style={styles.tileValue}>Macros</Text>
              <Text style={styles.tileLabel}>Balance view</Text>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  tile: {
    flex: 1,
    overflow: 'hidden',
    ...CARD_SYSTEM.compact,
    marginBottom: 0, // Override default margin since container handles spacing
  },
  blurContainer: {
    padding: SPACING[3],
  },
  tileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  tileTextContainer: {
    flex: 1,
  },
  tileValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  tileLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  miniDonutPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 999,
  },
});
