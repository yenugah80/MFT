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

/**
 * Calculate meal score from nutrition data
 * Factors: confidence, macro balance, nutrient density
 */
function calculateMealScore(item) {
  if (!item) return 50;

  const scores = [];
  const weights = [];

  // 1. Confidence score (30% weight)
  const confidence = item.confidence || 0.7;
  scores.push(confidence * 100);
  weights.push(0.3);

  // 2. Macro balance score (40% weight)
  const macros = item.macros || {};
  const protein = macros.protein_g || 0;
  const carbs = macros.carbs_g || 0;
  const fat = macros.fat_g || 0;
  const calories = macros.calories_kcal || 0;

  if (calories > 0) {
    // Calculate macro percentages
    const proteinCal = protein * 4;
    const carbsCal = carbs * 4;
    const fatCal = fat * 9;
    const totalCal = proteinCal + carbsCal + fatCal || 1;

    const proteinPct = (proteinCal / totalCal) * 100;
    const carbsPct = (carbsCal / totalCal) * 100;
    const fatPct = (fatCal / totalCal) * 100;

    // Ideal ranges: protein 15-35%, carbs 45-65%, fat 20-35%
    let macroScore = 100;
    if (proteinPct < 10) macroScore -= 20;
    else if (proteinPct > 40) macroScore -= 10;
    if (carbsPct > 70) macroScore -= 15;
    if (fatPct > 45) macroScore -= 20;
    else if (fatPct < 15) macroScore -= 10;

    scores.push(Math.max(0, macroScore));
    weights.push(0.4);
  }

  // 3. Fiber score (15% weight)
  const fiber = macros.fiber_g || 0;
  const fiberScore = Math.min(100, (fiber / 5) * 100); // 5g fiber = 100%
  scores.push(fiberScore);
  weights.push(0.15);

  // 4. Low sugar score (15% weight)
  const sugar = macros.sugar_g || 0;
  const sugarScore = Math.max(0, 100 - (sugar / 20) * 100); // <20g sugar = good
  scores.push(sugarScore);
  weights.push(0.15);

  // Calculate weighted average
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);
  return Math.round(weightedSum / totalWeight);
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
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    marginTop: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
