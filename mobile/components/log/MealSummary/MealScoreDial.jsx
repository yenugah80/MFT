/**
 * MealScoreDial Component
 * Circular dial showing meal quality score (0-100)
 * Features: SVG arc with gradient fill, qualitative label
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { useTheme } from '../../../providers/ThemeProvider';
import { calculateMicroBonus } from '../../../utils/macroBalance';

/**
 * Calculate meal score from nutrition data
 *
 * DESIGN PHILOSOPHY: Nutritional quality matters most
 * - Macro balance is the PRIMARY factor (not AI confidence)
 * - Confidence only affects a small penalty for uncertainty
 * - Carb-heavy, protein-deficient meals should NOT score "Excellent"
 */
function calculateMealScore(item) {
  if (!item) return 50;

  const macros = item.macros || {};
  const protein = macros.protein_g || 0;
  const carbs = macros.carbs_g || 0;
  const fat = macros.fat_g || 0;
  const fiber = macros.fiber_g || 0;
  const sugar = macros.sugar_g || 0;
  const calories = macros.calories_kcal || 0;

  // If no calorie data, return neutral score
  if (calories <= 0) return 50;

  // Calculate macro percentages by calories
  const proteinCal = protein * 4;
  const carbsCal = carbs * 4;
  const fatCal = fat * 9;
  const totalCal = proteinCal + carbsCal + fatCal || 1;

  const proteinPct = (proteinCal / totalCal) * 100;
  const carbsPct = (carbsCal / totalCal) * 100;
  const fatPct = (fatCal / totalCal) * 100;

  // =========================================================================
  // 1. MACRO BALANCE SCORE (60% weight) - This is the PRIMARY factor
  // =========================================================================
  // Ideal ranges: protein 20-35%, carbs 40-55%, fat 25-35%
  let macroScore = 100;

  // PROTEIN penalties (stricter)
  if (proteinPct < 10) {
    macroScore -= 35; // Severely protein-deficient
  } else if (proteinPct < 15) {
    macroScore -= 25; // Low protein
  } else if (proteinPct < 20) {
    macroScore -= 10; // Slightly low protein
  } else if (proteinPct > 45) {
    macroScore -= 15; // Very high protein (less of a concern)
  }

  // CARB penalties (stricter for carb-dominant meals)
  if (carbsPct > 75) {
    macroScore -= 30; // Severely carb-heavy (like dal+rice at 77%)
  } else if (carbsPct > 65) {
    macroScore -= 20; // Carb-heavy
  } else if (carbsPct > 55) {
    macroScore -= 5;  // Slightly high carbs
  } else if (carbsPct < 30) {
    macroScore -= 10; // Very low carb (keto-ish)
  }

  // FAT penalties (important for satiety and nutrient absorption)
  if (fatPct < 10) {
    macroScore -= 25; // Severely low fat (dal+rice ~2.5%)
  } else if (fatPct < 20) {
    macroScore -= 15; // Low fat
  } else if (fatPct > 50) {
    macroScore -= 25; // Very high fat
  } else if (fatPct > 40) {
    macroScore -= 10; // High fat
  }

  macroScore = Math.max(0, macroScore);

  // =========================================================================
  // 2. FIBER SCORE (20% weight) - Important for gut health
  // =========================================================================
  // 8g fiber per meal = excellent (3 meals = 24g daily)
  const fiberScore = Math.min(100, (fiber / 8) * 100);

  // =========================================================================
  // 3. SUGAR SCORE (15% weight) - Penalize added sugars
  // =========================================================================
  // <5g sugar = 100%, >25g = 0%
  const sugarScore = Math.max(0, 100 - (sugar / 25) * 100);

  // =========================================================================
  // 4. CONFIDENCE MODIFIER (5% weight) - Minor adjustment, NOT primary factor
  // =========================================================================
  // Low confidence slightly reduces score (uncertainty about data)
  const confidence = item.confidence || 0.7;
  const confidenceModifier = confidence >= 0.7 ? 100 : confidence * 143; // 0.7+ = full score

  // =========================================================================
  // 5. MICRONUTRIENT BONUS (up to 10 points) - Rewards nutrient-dense meals
  // =========================================================================
  // Bonus for meals rich in key micronutrients (calcium, iron, vitamins, etc.)
  const microBonus = calculateMicroBonus(item.micros);

  // =========================================================================
  // CALCULATE FINAL SCORE
  // =========================================================================
  // Base score (90% max) + micro bonus (10% max)
  const baseScore =
    macroScore * 0.55 +
    fiberScore * 0.20 +
    sugarScore * 0.15 +
    confidenceModifier * 0.05;

  // Add micro bonus (up to 10 points)
  const finalScore = Math.min(100, baseScore + microBonus);

  return Math.round(finalScore);
}

/**
 * Get qualitative label for score
 */
function getScoreLabel(score) {
  if (score >= 80) return { label: 'Excellent', color: '#10B981' };
  if (score >= 60) return { label: 'Good', color: '#3B82F6' };
  if (score >= 40) return { label: 'Fair', color: '#F59E0B' };
  return { label: 'Poor', color: '#EF4444' };
}

/**
 * Get arc color based on score
 */
function getArcColor(score) {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#3B82F6'; // Blue
  if (score >= 40) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

export default function MealScoreDial({ item, size = 180 }) {
  const { colors, isDark } = useTheme();
  const score = calculateMealScore(item);
  const { label, color } = getScoreLabel(score);

  // SVG calculations
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  // Colors
  const trackColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  return (
    <View style={styles.container}>
      <View style={[styles.dialWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#10B981" />
              <Stop offset="50%" stopColor="#3B82F6" />
              <Stop offset="100%" stopColor="#6B4EFF" />
            </LinearGradient>
          </Defs>

          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={getArcColor(score)}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.scoreValue, { color: textPrimary }]}>{score}</Text>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
        </View>
      </View>

      <Text style={[styles.subtitle, { color: textSecondary }]}>Meal Score</Text>
    </View>
  );
}

// Export for use in other components
export { calculateMealScore, getScoreLabel };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
  },
  dialWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.family.bold,
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    marginTop: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
