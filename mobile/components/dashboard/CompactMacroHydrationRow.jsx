/**
 * CompactMacroHydrationRow - Two-in-One Analytics Card
 *
 * Combines Macro distribution (donut) + Hydration progress (half-ring)
 * in a single glass card for dashboard space efficiency.
 *
 * Design:
 * - Glass card container
 * - Left: MacroDonut (120px compact)
 * - Center: Vertical divider line
 * - Right: Hydration half-ring (120px, 180°)
 * - Each side independently tappable
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { PREMIUM_COLORS, SPACING, RADIUS } from '../../constants/premiumDesignSystem';
import MacroDonut from './MacroDonut';
import GlassCard from './GlassCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * CompactMacroHydrationRow Component
 * Displays both macro nutrition and hydration metrics in compact form
 */
export default function CompactMacroHydrationRow({
  macros = { protein: 0, carbs: 0, fat: 0, totalCalories: 0 },
  hydration = { current: 0, goal: 2.0, progress: 0 },
  onMacroPress,
  onHydrationPress,
  style,
}) {
  const macroScaleAnim = useRef(new Animated.Value(1)).current;
  const hydrationScaleAnim = useRef(new Animated.Value(1)).current;

  const handleMacroPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(macroScaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(macroScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onMacroPress?.();
  };

  const handleHydrationPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(hydrationScaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(hydrationScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onHydrationPress?.();
  };

  // Calculate hydration percentage (capped at 100% for visual purposes)
  const hydrationPercent = Math.min(
    (hydration.current / hydration.goal) * 100,
    100
  );

  return (
    <View style={[styles.container, style]}>
      <GlassCard variant="standard">
        <View style={styles.contentRow}>
          {/* Left: Macro Donut */}
          <Animated.View style={[{ transform: [{ scale: macroScaleAnim }] }]}>
            <TouchableOpacity
              onPress={handleMacroPress}
              activeOpacity={0.9}
              style={styles.macroTouchable}
              accessibilityRole="button"
              accessibilityLabel={`Macro nutrition. Total ${Math.round(macros.totalCalories)} calories.`}
            >
              <MacroDonut
                protein={macros.protein}
                carbs={macros.carbs}
                fat={macros.fat}
                totalCalories={macros.totalCalories}
                size={120}
                strokeWidth={16}
                compact={true}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Center: Divider */}
          <View style={styles.divider} />

          {/* Right: Hydration Half-Ring */}
          <Animated.View style={[{ transform: [{ scale: hydrationScaleAnim }] }]}>
            <TouchableOpacity
              onPress={handleHydrationPress}
              activeOpacity={0.9}
              style={styles.hydrationTouchable}
              accessibilityRole="button"
              accessibilityLabel={`Hydration. ${Math.round(hydration.current)} of ${hydration.goal} liters. ${Math.round(hydrationPercent)} percent.`}
            >
              <View style={styles.hydrationContainer}>
                {/* Half-ring using AnimatedProgressRing */}
                <View style={styles.ringWrapper}>
                  <HydrationHalfRing
                    progress={hydrationPercent}
                    size={120}
                    strokeWidth={14}
                  />

                  {/* Center content */}
                  <View style={styles.hydrationCenter}>
                    <View style={styles.hydrationValue}>
                      <Ionicons
                        name="water"
                        size={16}
                        color={PREMIUM_COLORS.functional.hydration.primary}
                      />
                    </View>
                  </View>
                </View>

                {/* Below ring: hydration status */}
                <View style={styles.hydrationStatus}>
                  <Ionicons
                    name={hydrationPercent >= 100 ? 'checkmark-circle' : 'help-circle-outline'}
                    size={16}
                    color={
                      hydrationPercent >= 100
                        ? PREMIUM_COLORS.semantic.success.primary
                        : PREMIUM_COLORS.text.tertiary
                    }
                  />
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </GlassCard>
    </View>
  );
}

/**
 * HydrationHalfRing - SVG-based 180° half-ring for hydration progress
 * Shows water intake as a gauge (0-100%) using react-native-svg
 */
function HydrationHalfRing({ progress = 50, size = 120, strokeWidth = 14 }) {
  const radius = (size - strokeWidth) / 2;
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength - (progress / 100) * arcLength;

  return (
    <Svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
      <Defs>
        <SvgGradient id="hydrationGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={PREMIUM_COLORS.functional.hydration.primary} />
          <Stop offset="100%" stopColor={PREMIUM_COLORS.semantic.success.primary} />
        </SvgGradient>
      </Defs>

      {/* Background track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(0, 0, 0, 0.06)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={arcLength}
        strokeDashoffset={0}
        strokeLinecap="round"
        style={{ transform: [{ rotate: '180deg' }] }}
      />

      {/* Progress arc */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#hydrationGrad)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={arcLength}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transform: [{ rotate: '180deg' }] }}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  // Main Row Layout
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
  },

  // Macro Side
  macroTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  // Divider
  divider: {
    width: 1,
    height: 100,
    backgroundColor: PREMIUM_COLORS.border.light,
    marginHorizontal: SPACING[3],
  },

  // Hydration Side
  hydrationTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  hydrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  hydrationCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 8,
  },
  hydrationValue: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hydrationStatus: {
    marginTop: SPACING[2],
    alignItems: 'center',
  },
});
