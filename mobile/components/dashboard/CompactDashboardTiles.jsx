/**
 * CompactDashboardTiles - Glassmorphic compact tiles row
 * Premium UI: 2 compact tiles showing macros donut and hydration bar
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, G } from 'react-native-svg';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { TEXT, SEMANTIC, SHADOWS, CARD_SYSTEM } from '../../constants/premiumTheme';

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
          stroke="#3B82F6"
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
          stroke="#10B981"
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
          stroke="#F59E0B"
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

// Compact hydration bar
function MiniHydrationBar({ current, goal, width = 60 }) {
  const percentage = Math.min(100, Math.round((current / goal) * 100));
  const fillWidth = (percentage / 100) * width;

  return (
    <View style={[styles.hydrationBarContainer, { width }]}>
      <View style={styles.hydrationBarBg}>
        <LinearGradient
          colors={['#3B82F6', '#60A5FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.hydrationBarFill, { width: fillWidth }]}
        />
      </View>
      <Text style={styles.hydrationBarText}>{percentage}%</Text>
    </View>
  );
}

export default function CompactDashboardTiles({
  today,
  goals,
  onTapMacros,
  onTapHydration,
}) {
  // Parse values
  const protein = today?.nutrition?.totalProtein ?? 0;
  const carbs = today?.nutrition?.totalCarbs ?? 0;
  const fat = today?.nutrition?.totalFats ?? 0;
  const totalCalories = today?.nutrition?.totalCalories ?? 0;
  const calorieGoal = goals?.dailyCalories ?? 2000;

  const waterIntake = parseFloat(today?.waterIntakeLiters) || 0;
  const waterGoal = parseFloat(goals?.waterLiters) || 2.0;

  // Calculate calorie percentage
  const caloriePercent = Math.min(100, Math.round((totalCalories / calorieGoal) * 100));

  return (
    <View style={styles.container}>
      {/* Macros Tile */}
      <TouchableOpacity
        style={styles.tile}
        onPress={onTapMacros}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Macros: ${caloriePercent}% of calorie goal`}
      >
        <BlurView intensity={20} tint="light" style={styles.blurContainer}>
          <View style={styles.tileContent}>
            <MiniDonut protein={protein} carbs={carbs} fat={fat} size={44} />
            <View style={styles.tileTextContainer}>
              <Text style={styles.tileValue}>{caloriePercent}%</Text>
              <Text style={styles.tileLabel}>Macros</Text>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>

      {/* Hydration Tile */}
      <TouchableOpacity
        style={styles.tile}
        onPress={onTapHydration}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Hydration: ${waterIntake.toFixed(1)}L of ${waterGoal}L`}
      >
        <BlurView intensity={20} tint="light" style={styles.blurContainer}>
          <View style={styles.tileContent}>
            <View style={styles.hydrationIconContainer}>
              <Ionicons name="water" size={20} color={SEMANTIC.info.base} />
            </View>
            <View style={styles.tileTextContainer}>
              <Text style={styles.tileValue}>{waterIntake.toFixed(1)}L</Text>
              <MiniHydrationBar current={waterIntake} goal={waterGoal} width={50} />
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
    fontSize: TYPOGRAPHY.size.lg,
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
  hydrationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hydrationBarContainer: {
    marginTop: 4,
  },
  hydrationBarBg: {
    height: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  hydrationBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  hydrationBarText: {
    fontSize: 9,
    color: TEXT.tertiary,
    marginTop: 2,
  },
});
