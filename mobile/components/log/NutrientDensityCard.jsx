/**
 * NutrientDensityCard - Visual Nutrient Quality Analysis
 *
 * Shows how nutrient-dense a meal is relative to its calories.
 * Helps users understand the QUALITY of their food, not just quantity.
 *
 * Key Metrics:
 * - Nutrient Density Score (nutrients per 100 kcal)
 * - Protein Efficiency (protein per calorie)
 * - Fiber Ratio (fiber vs carbs)
 * - Micronutrient Coverage (%DV per calorie)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TEXT,
  SURFACES,
  BRAND,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from '../../constants/premiumTheme';

// ═══════════════════════════════════════════════════════════════════════════════
// DENSITY CALCULATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const calculateDensityMetrics = (meal) => {
  const macros = meal.macros || meal.nutrition || {};
  const micros = meal.micros || {};

  const calories = macros.calories_kcal || macros.calories || 0;
  const protein = macros.protein_g || macros.protein || 0;
  const fiber = macros.fiber_g || macros.fiber || 0;
  const carbs = macros.carbs_g || macros.carbs || 0;
  const sugar = macros.sugar_g || macros.sugar || 0;

  if (calories === 0) {
    return null;
  }

  // Protein per 100 kcal (ideal: 7-10g per 100 kcal)
  const proteinPer100 = (protein / calories) * 100;
  const proteinEfficiency = Math.min(proteinPer100 / 10, 1) * 100;

  // Fiber ratio (fiber as % of carbs, ideal: 10%+)
  const fiberRatio = carbs > 0 ? (fiber / carbs) * 100 : 0;
  const fiberScore = Math.min(fiberRatio / 15, 1) * 100;

  // Sugar penalty (sugar as % of carbs, ideal: <20%)
  const sugarRatio = carbs > 0 ? (sugar / carbs) * 100 : 0;
  const sugarScore = Math.max(0, 100 - (sugarRatio * 2));

  // Micronutrient coverage per 100 kcal
  let microScore = 0;
  const keyMicros = ['iron', 'calcium', 'potassium', 'magnesium', 'vitaminC', 'vitaminA'];
  const dvValues = {
    iron: 18, calcium: 1000, potassium: 3500, magnesium: 400, vitaminC: 90, vitaminA: 900,
  };

  keyMicros.forEach((micro) => {
    const value = getMicroValue(micros, micro);
    if (value > 0 && dvValues[micro]) {
      const dvPercent = (value / dvValues[micro]) * 100;
      const perCalorie = (dvPercent / calories) * 100;
      microScore += Math.min(perCalorie, 10); // Cap at 10 points per micro
    }
  });
  microScore = Math.min(microScore, 100);

  // Overall density score (weighted average)
  const overallScore = Math.round(
    (proteinEfficiency * 0.35) +
    (fiberScore * 0.25) +
    (sugarScore * 0.20) +
    (microScore * 0.20)
  );

  return {
    overallScore,
    proteinPer100: Math.round(proteinPer100 * 10) / 10,
    proteinEfficiency: Math.round(proteinEfficiency),
    fiberRatio: Math.round(fiberRatio * 10) / 10,
    fiberScore: Math.round(fiberScore),
    sugarRatio: Math.round(sugarRatio),
    sugarScore: Math.round(sugarScore),
    microScore: Math.round(microScore),
    calories,
  };
};

const getMicroValue = (micros, key) => {
  const value = micros[key];
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value.value) return parseFloat(value.value) || 0;
  return parseFloat(value) || 0;
};

const getDensityGrade = (score) => {
  if (score >= 80) return { grade: 'A', label: 'Excellent', color: '#10B981', bg: '#ECFDF5' };
  if (score >= 65) return { grade: 'B', label: 'Good', color: '#3B82F6', bg: '#EFF6FF' };
  if (score >= 50) return { grade: 'C', label: 'Average', color: '#F59E0B', bg: '#FEF3C7' };
  if (score >= 35) return { grade: 'D', label: 'Below Average', color: '#F97316', bg: '#FFF7ED' };
  return { grade: 'E', label: 'Low', color: '#EF4444', bg: '#FEF2F2' };
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: MetricBar
// ═══════════════════════════════════════════════════════════════════════════════

const MetricBar = ({ label, value, maxValue, suffix, color, description }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <View style={styles.metricBar}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>
          {value}{suffix}
        </Text>
      </View>
      <View style={styles.metricTrack}>
        <View
          style={[
            styles.metricFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      {description && (
        <Text style={styles.metricDescription}>{description}</Text>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: NutrientDensityCard
// ═══════════════════════════════════════════════════════════════════════════════

const NutrientDensityCard = ({ meal, compact = false }) => {
  const metrics = useMemo(() => calculateDensityMetrics(meal), [meal]);

  if (!metrics) {
    return null;
  }

  const grade = getDensityGrade(metrics.overallScore);

  return (
    <View style={styles.container}>
      {/* Header with Overall Grade */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="diamond" size={20} color={BRAND.primary} />
          <Text style={styles.headerTitle}>Nutrient Density</Text>
        </View>
        <View style={[styles.gradeBadge, { backgroundColor: grade.bg }]}>
          <Text style={[styles.gradeText, { color: grade.color }]}>
            {grade.grade}
          </Text>
          <Text style={[styles.gradeLabel, { color: grade.color }]}>
            {grade.label}
          </Text>
        </View>
      </View>

      {/* Score Summary */}
      <View style={styles.scoreSummary}>
        <View style={[styles.scoreCircle, { borderColor: grade.color }]}>
          <Text style={[styles.scoreValue, { color: grade.color }]}>
            {metrics.overallScore}
          </Text>
          <Text style={styles.scoreLabel}>/ 100</Text>
        </View>
        <View style={styles.scoreExplanation}>
          <Text style={styles.scoreExplanationTitle}>
            {metrics.overallScore >= 70
              ? 'High-quality nutrition'
              : metrics.overallScore >= 50
              ? 'Moderate nutrition quality'
              : 'Consider adding nutrients'}
          </Text>
          <Text style={styles.scoreExplanationSubtitle}>
            Measures nutrients relative to calories
          </Text>
        </View>
      </View>

      {/* Detailed Metrics */}
      {!compact && (
        <View style={styles.metricsGrid}>
          <MetricBar
            label="Protein Efficiency"
            value={metrics.proteinPer100}
            maxValue={10}
            suffix="g/100cal"
            color={metrics.proteinEfficiency >= 60 ? '#10B981' : metrics.proteinEfficiency >= 40 ? '#F59E0B' : '#EF4444'}
            description={metrics.proteinPer100 >= 7 ? 'Excellent protein density' : 'Could add more protein'}
          />

          <MetricBar
            label="Fiber Quality"
            value={metrics.fiberRatio}
            maxValue={15}
            suffix="% of carbs"
            color={metrics.fiberScore >= 60 ? '#10B981' : metrics.fiberScore >= 40 ? '#F59E0B' : '#EF4444'}
            description={metrics.fiberRatio >= 10 ? 'Good complex carbs' : 'Add more whole grains/veggies'}
          />

          <MetricBar
            label="Sugar Control"
            value={100 - metrics.sugarRatio}
            maxValue={100}
            suffix="% non-sugar"
            color={metrics.sugarScore >= 60 ? '#10B981' : metrics.sugarScore >= 40 ? '#F59E0B' : '#EF4444'}
            description={metrics.sugarRatio <= 20 ? 'Low sugar content' : 'Consider reducing sugar'}
          />

          <MetricBar
            label="Micronutrient Coverage"
            value={metrics.microScore}
            maxValue={100}
            suffix="%"
            color={metrics.microScore >= 50 ? '#10B981' : metrics.microScore >= 30 ? '#F59E0B' : '#EF4444'}
            description={metrics.microScore >= 50 ? 'Rich in vitamins & minerals' : 'Add colorful vegetables'}
          />
        </View>
      )}

      {/* Quick Tips */}
      <View style={styles.tipsContainer}>
        <Ionicons name="bulb-outline" size={14} color={TEXT.tertiary} />
        <Text style={styles.tipsText}>
          {metrics.overallScore >= 70
            ? 'Great choice! This meal packs nutrients efficiently.'
            : metrics.proteinPer100 < 5
            ? 'Tip: Add protein (eggs, chicken, tofu) to boost density.'
            : metrics.fiberRatio < 8
            ? 'Tip: Swap refined carbs for whole grains to improve quality.'
            : 'Tip: Add leafy greens to increase micronutrient density.'}
        </Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  gradeText: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  gradeLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  scoreSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: SPACING[4],
    paddingBottom: SPACING[4],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACES.background.secondary,
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: -2,
  },
  scoreExplanation: {
    flex: 1,
  },
  scoreExplanationTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  scoreExplanationSubtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  metricsGrid: {
    gap: 16,
  },
  metricBar: {
    marginBottom: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  metricValue: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  metricTrack: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricDescription: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  tipsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 18,
  },
});

export default NutrientDensityCard;
