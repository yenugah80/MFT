/**
 * NutriScoreDial Component
 * 0-100 nutrition quality gauge (like Whoop recovery score)
 * Weighted formula based on: calorie adherence, protein adequacy, hydration, micros coverage
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/designTokens';

/**
 * Calculate nutrition score (0-100)
 * Inputs: dashboard data
 * Returns: score + breakdown
 */
export function calculateNutriScore(data) {
  if (!data || !data.today) {
    return {
      score: 0,
      message: 'Not enough data',
      breakdown: null,
    };
  }

  const { today, goals } = data;
  const scores = [];
  const weights = [];

  // 1. Calorie adherence (30% weight)
  if (goals?.calories && today.calories) {
    const calorieRatio = today.calories / goals.calories;
    // Perfect score at 90-110%, degrade outside
    let calorieScore = 0;
    if (calorieRatio >= 0.9 && calorieRatio <= 1.1) {
      calorieScore = 100;
    } else if (calorieRatio < 0.9) {
      calorieScore = Math.max(0, (calorieRatio / 0.9) * 100);
    } else {
      // Over eating - degrade more aggressively
      const overage = calorieRatio - 1.1;
      calorieScore = Math.max(0, 100 - (overage * 200));
    }
    scores.push(calorieScore);
    weights.push(0.3);
  }

  // 2. Protein adequacy (25% weight)
  if (goals?.protein && today.protein) {
    const proteinRatio = today.protein / goals.protein;
    // Perfect score at 90-120%, degrade below
    let proteinScore = 0;
    if (proteinRatio >= 0.9) {
      proteinScore = Math.min(100, (proteinRatio / 0.9) * 100);
    } else {
      proteinScore = (proteinRatio / 0.9) * 100;
    }
    scores.push(proteinScore);
    weights.push(0.25);
  }

  // 3. Hydration (20% weight)
  if (goals?.waterLiters && today.waterIntakeLiters !== undefined) {
    const hydrationRatio = today.waterIntakeLiters / goals.waterLiters;
    // Perfect at 80-120%
    let hydrationScore = 0;
    if (hydrationRatio >= 0.8 && hydrationRatio <= 1.2) {
      hydrationScore = 100;
    } else if (hydrationRatio < 0.8) {
      hydrationScore = (hydrationRatio / 0.8) * 100;
    } else {
      hydrationScore = Math.max(60, 100 - ((hydrationRatio - 1.2) * 50));
    }
    scores.push(hydrationScore);
    weights.push(0.2);
  }

  // 4. Micro coverage (15% weight)
  // If we have micronutrients data
  if (today.foodLogs && today.foodLogs.length > 0) {
    const logsWithMicros = today.foodLogs.filter(log =>
      log.micros && Object.keys(log.micros).length > 0
    );
    const microCoverageRatio = logsWithMicros.length / today.foodLogs.length;
    const microScore = microCoverageRatio * 100;
    scores.push(microScore);
    weights.push(0.15);
  }

  // 5. Meal consistency (10% weight)
  if (today.foodLogs && today.foodLogs.length > 0) {
    // Score based on number of meals (3-5 is ideal)
    const mealCount = today.foodLogs.length;
    let consistencyScore = 0;
    if (mealCount >= 3 && mealCount <= 5) {
      consistencyScore = 100;
    } else if (mealCount < 3) {
      consistencyScore = (mealCount / 3) * 100;
    } else {
      consistencyScore = Math.max(60, 100 - ((mealCount - 5) * 10));
    }
    scores.push(consistencyScore);
    weights.push(0.1);
  }

  // Calculate weighted average
  if (scores.length === 0) {
    return {
      score: 0,
      message: 'Log food to see score',
      breakdown: null,
    };
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const weightedSum = scores.reduce((sum, score, i) => sum + (score * weights[i]), 0);
  const finalScore = Math.round(weightedSum / totalWeight);

  // Message based on score
  let message = '';
  if (finalScore >= 80) message = 'Excellent nutrition';
  else if (finalScore >= 70) message = 'Good balance';
  else if (finalScore >= 50) message = 'Room for improvement';
  else message = 'Need more data';

  return {
    score: finalScore,
    message,
    breakdown: {
      calories: scores[0] || 0,
      protein: scores[1] || 0,
      hydration: scores[2] || 0,
      micros: scores[3] || 0,
      consistency: scores[4] || 0,
    },
  };
}

/**
 * NutriScoreDial component
 */
export default function NutriScoreDial({ data, size = 160 }) {
  const { score, message } = calculateNutriScore(data);

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius * 0.75; // 3/4 circle
  const strokeWidth = 16;

  // Map score to color
  const getScoreColor = (score) => {
    if (score >= 71) return COLORS.semantic.good;
    if (score >= 41) return COLORS.semantic.warn;
    return COLORS.semantic.over;
  };

  const color = getScoreColor(score);

  // Calculate arc progress
  const progress = score / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Nutrition score: ${score} out of 100. ${message}`}
      accessibilityHint="Your daily nutrition quality score based on calories, protein, hydration, and micronutrients"
    >
      {/* SVG Gauge */}
      <Svg width={size} height={size * 0.7} accessible={false}>
        <Defs>
          <LinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Path
          d={describeArc(size / 2, size * 0.6, radius, 135, 45)}
          stroke={COLORS.glass.border}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <Path
          d={describeArc(size / 2, size * 0.6, radius, 135, 45)}
          stroke="url(#scoreGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = 135 + (tick / 100) * 270;
          const tickRadius = radius + strokeWidth / 2 + 4;
          const x1 = size / 2 + tickRadius * Math.cos((angle * Math.PI) / 180);
          const y1 = size * 0.6 + tickRadius * Math.sin((angle * Math.PI) / 180);
          const x2 = size / 2 + (tickRadius + 6) * Math.cos((angle * Math.PI) / 180);
          const y2 = size * 0.6 + (tickRadius + 6) * Math.sin((angle * Math.PI) / 180);

          return (
            <Path
              key={tick}
              d={`M ${x1} ${y1} L ${x2} ${y2}`}
              stroke={COLORS.text.muted}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={styles.scoreLabel}>NUTRI</Text>
        <Text style={[styles.scoreValue, { color }]}>{score}</Text>
        <Text style={styles.scoreMessage}>{message}</Text>
      </View>
    </View>
  );
}

/**
 * Helper to describe SVG arc path
 */
function describeArc(x, y, radius, startAngle, endAngle) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '35%',
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text.muted,
    letterSpacing: TYPOGRAPHY.letterSpacing.widest,
  },
  scoreValue: {
    fontSize: TYPOGRAPHY.size['5xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    letterSpacing: TYPOGRAPHY.letterSpacing.tighter,
    marginTop: -4,
  },
  scoreMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
});
