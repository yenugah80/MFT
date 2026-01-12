/**
 * NutriScore Component
 * Official Nutri-Score A-E grading system with historical trends
 * Weighted formula based on: calorie adherence, protein adequacy, hydration, meal consistency
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY, SPACING } from '../../constants/designTokens';
import { SEMANTIC, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';
import { useTheme } from '../../providers/ThemeProvider';

/**
 * Calculate nutrition score for a single day (0-100)
 * @param {Object} dayData - Single day's nutrition data
 * @param {Object} goals - User's nutrition goals
 * @returns {number} Score 0-100
 */
function calculateDayScore(dayData, goals) {
  if (!dayData || !goals) return 0;

  const scores = [];
  const weights = [];

  // 1. Calorie adherence (30% weight)
  if (goals?.calories && dayData.calories) {
    const calorieRatio = dayData.calories / goals.calories;
    let calorieScore = 0;
    if (calorieRatio >= 0.9 && calorieRatio <= 1.1) {
      calorieScore = 100;
    } else if (calorieRatio < 0.9) {
      calorieScore = Math.max(0, (calorieRatio / 0.9) * 100);
    } else {
      const overage = calorieRatio - 1.1;
      calorieScore = Math.max(0, 100 - (overage * 200));
    }
    scores.push(calorieScore);
    weights.push(0.3);
  }

  // 2. Protein adequacy (25% weight)
  if (goals?.protein && dayData.protein) {
    const proteinRatio = dayData.protein / goals.protein;
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
  if (goals?.waterLiters && dayData.waterIntakeLiters !== undefined) {
    const hydrationRatio = dayData.waterIntakeLiters / goals.waterLiters;
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

  // 4. Meal consistency (25% weight)
  if (dayData.foodLogs && dayData.foodLogs.length > 0) {
    const mealCount = dayData.foodLogs.length;
    let consistencyScore = 0;
    if (mealCount >= 3 && mealCount <= 5) {
      consistencyScore = 100;
    } else if (mealCount < 3) {
      consistencyScore = (mealCount / 3) * 100;
    } else {
      consistencyScore = Math.max(60, 100 - ((mealCount - 5) * 10));
    }
    scores.push(consistencyScore);
    weights.push(0.25);
  }

  if (scores.length === 0) return 0;

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const weightedSum = scores.reduce((sum, score, i) => sum + (score * weights[i]), 0);
  return Math.round(weightedSum / totalWeight);
}

/**
 * Calculate nutrition score with historical context
 * @param {Object} data - Dashboard data with today + trends
 * @returns {Object} Score info with today + historical averages
 */
export function calculateNutriScore(data) {
  if (!data || !data.today) {
    return {
      score: 0,
      message: 'Log food to see score',
      breakdown: null,
      historical: null,
    };
  }

  const { today, goals, trends } = data;

  // Calculate today's score
  const todayScore = calculateDayScore(today, goals);

  // Calculate historical averages if available
  let historical = null;
  if (trends?.weekSummaries && trends.weekSummaries.length > 0) {
    const weekScores = trends.weekSummaries.map(summary => {
      const dayData = {
        calories: summary.totalCalories || 0,
        protein: summary.totalProtein || 0,
        carbs: summary.totalCarbs || 0,
        fat: summary.totalFats || 0,
        // Note: weekSummaries don't have hydration/micros, so scores will be lower
        foodLogs: summary.mealCount ? new Array(summary.mealCount).fill({}) : [],
        waterIntakeLiters: 0, // Not available in summary
      };
      return calculateDayScore(dayData, goals);
    });

    const avg7Day = Math.round(
      weekScores.reduce((sum, score) => sum + score, 0) / weekScores.length
    );

    // Calculate trend direction (today vs 7-day average)
    const trendDiff = todayScore - avg7Day;
    let trendDirection = 'stable';
    if (trendDiff >= 5) trendDirection = 'improving';
    else if (trendDiff <= -5) trendDirection = 'declining';

    historical = {
      avg7Day,
      trendDirection,
      trendDiff,
    };
  }

  // Message based on today's score
  let message = '';
  if (todayScore >= 80) message = 'Excellent nutrition';
  else if (todayScore >= 60) message = 'Good balance';
  else if (todayScore >= 40) message = 'Fair';
  else if (todayScore >= 20) message = 'Room for improvement';
  else message = 'Need more data';

  // Add trend context to message
  if (historical) {
    if (historical.trendDirection === 'improving') {
      message += ' ↑';
    } else if (historical.trendDirection === 'declining') {
      message += ' ↓';
    }
  }

  return {
    score: todayScore,
    message,
    breakdown: {
      calories: 0, // Would need to recalculate individual components
      protein: 0,
      hydration: 0,
      consistency: 0,
    },
    historical,
  };
}

/**
 * Convert 0-100 score to A-E grade
 */
function scoreToGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'E';
}

/**
 * Official Nutri-Score colors
 */
const NUTRI_SCORE_GRADES = [
  { letter: 'A', color: '#038141', bgColor: '#038141', label: 'Excellent' }, // Dark green
  { letter: 'B', color: '#85BB2F', bgColor: '#85BB2F', label: 'Good' },      // Light green
  { letter: 'C', color: '#FECB02', bgColor: '#FECB02', label: 'Fair' },      // Yellow
  { letter: 'D', color: '#EE8100', bgColor: '#EE8100', label: 'Poor' },      // Orange
  { letter: 'E', color: '#E63E11', bgColor: '#E63E11', label: 'Bad' },       // Red
];

/**
 * NutriScore component - Official A-E grade display with historical trends
 * Compact mode: Visual-only (no header, numeric score, or trends)
 */
export default function NutriScoreDial({ data, showNumericScore = true, showTrends = true, compact = false, grade }) {
  const { colors, isDark } = useTheme();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;

  // If grade is passed directly, use it; otherwise calculate from data
  const { score, message, historical } = data ? calculateNutriScore(data) : { score: 0, message: '', historical: null };
  const currentGrade = grade || scoreToGrade(score);
  const avg7DayGrade = historical ? scoreToGrade(historical.avg7Day) : null;

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Nutrition grade: ${currentGrade}.${score ? ` Score: ${score} out of 100. ${message}` : ''}`}
      accessibilityHint="Your daily nutrition quality based on calories, protein, hydration, and meal consistency"
    >
      {/* Header - NOT shown in compact mode */}
      {!compact && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: textPrimary }]}>Nutri-Score</Text>
            <Text style={[styles.subtitle, { color: textTertiary }]}>Today</Text>
          </View>
          {showNumericScore && (
            <View style={styles.headerRight}>
              <Text style={[styles.numericScore, { color: textPrimary }]}>{score}/100</Text>
              {historical && showTrends && (
                <View style={[styles.trendBadge, { backgroundColor: isDark ? `${SEMANTIC_ACTIONS.success}33` : `${SEMANTIC_ACTIONS.success}1A` }]}>
                  <Ionicons
                    name={
                      historical.trendDirection === 'improving' ? 'trending-up' :
                      historical.trendDirection === 'declining' ? 'trending-down' :
                      'remove'
                    }
                    size={12}
                    color={
                      historical.trendDirection === 'improving' ? SEMANTIC.success.base :
                      historical.trendDirection === 'declining' ? SEMANTIC.danger.base :
                      textTertiary
                    }
                  />
                  <Text style={[styles.trendText, { color: textSecondary }]}>
                    {historical.trendDiff > 0 ? '+' : ''}{historical.trendDiff}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* A-E Grade Bar - Main visual element */}
      <View style={[styles.gradeBar, compact && styles.gradeBarCompact]}>
        {NUTRI_SCORE_GRADES.map((grade, index) => {
          const isActive = grade.letter === currentGrade;
          const isLeftEdge = index === 0;
          const isRightEdge = index === NUTRI_SCORE_GRADES.length - 1;

          return (
            <View
              key={grade.letter}
              style={[
                styles.gradeBlock,
                compact && styles.gradeBlockCompact,
                {
                  backgroundColor: isActive ? grade.bgColor : `${grade.bgColor}30`,
                  borderTopLeftRadius: isLeftEdge ? 12 : 0,
                  borderBottomLeftRadius: isLeftEdge ? 12 : 0,
                  borderTopRightRadius: isRightEdge ? 12 : 0,
                  borderBottomRightRadius: isRightEdge ? 12 : 0,
                },
                isActive && [styles.gradeBlockActive, compact && styles.gradeBlockActiveCompact],
              ]}
            >
              <Text
                style={[
                  styles.gradeLetter,
                  compact && styles.gradeLetterCompact,
                  { color: isActive ? '#FFFFFF' : `${grade.color}80` },
                  isActive && styles.gradeLetterActive,
                ]}
              >
                {grade.letter}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Micro text - Only in compact mode */}
      {compact && (
        <Text style={[styles.compactFooter, { color: textTertiary }]}>Based on today's meals</Text>
      )}

      {/* Historical Comparison - NOT shown in compact mode */}
      {!compact && historical && showTrends && (
        <View style={styles.historicalBar}>
          <Text style={[styles.historicalLabel, { color: textTertiary }]}>7-day avg: {avg7DayGrade}</Text>
          <View style={styles.historicalMini}>
            {NUTRI_SCORE_GRADES.map((grade) => {
              const isActive = grade.letter === avg7DayGrade;
              return (
                <View
                  key={`hist-${grade.letter}`}
                  style={[
                    styles.historicalBlock,
                    {
                      backgroundColor: isActive ? grade.bgColor : `${grade.bgColor}25`,
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* Message - NOT shown in compact mode */}
      {!compact && message && (
        <Text style={[styles.message, { color: textTertiary }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING[3],
  },
  containerCompact: {
    paddingVertical: SPACING[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING[3],
    paddingHorizontal: SPACING[1],
  },
  headerLeft: {
    gap: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  title: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    // color applied inline for theme support
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    // color applied inline for theme support
  },
  numericScore: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    // color applied inline for theme support
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
    borderRadius: 8,
  },
  trendText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    // color applied inline for theme support
  },
  gradeBar: {
    flexDirection: 'row',
    width: '100%',
    height: 56,
    gap: 4,
  },
  gradeBarCompact: {
    height: 48,
    gap: 2,
  },
  gradeBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  gradeBlockCompact: {
    height: 48,
  },
  gradeBlockActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  gradeBlockActiveCompact: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.1,
  },
  gradeLetter: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  gradeLetterCompact: {
    fontSize: TYPOGRAPHY.size.xl,
  },
  gradeLetterActive: {
    fontSize: TYPOGRAPHY.size['4xl'],
  },
  historicalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[1],
  },
  historicalLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    // color applied inline for theme support
  },
  historicalMini: {
    flexDirection: 'row',
    gap: 2,
  },
  historicalBlock: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  message: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    // color applied inline for theme support
    marginTop: SPACING[2],
    textAlign: 'center',
  },
  compactFooter: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    marginTop: SPACING[1],
  },
});
