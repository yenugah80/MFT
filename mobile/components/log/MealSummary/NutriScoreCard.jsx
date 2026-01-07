/**
 * NutriScoreCard Component
 * Official Nutri-Score A-E grading system
 * Adapted for meal summary screen with glassmorphism styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { useTheme } from '../../../providers/ThemeProvider';

/**
 * Official Nutri-Score colors
 */
const NUTRI_SCORE_GRADES = [
  { letter: 'A', color: '#038141', label: 'Excellent' },
  { letter: 'B', color: '#85BB2F', label: 'Good' },
  { letter: 'C', color: '#FECB02', label: 'Fair' },
  { letter: 'D', color: '#EE8100', label: 'Poor' },
  { letter: 'E', color: '#E63E11', label: 'Bad' },
];

/**
 * Calculate Nutri-Score grade from nutrition data
 * Based on: positive factors (protein, fiber, vitamins) vs negative factors (sugar, saturated fat, sodium)
 */
function calculateNutriScoreGrade(item) {
  if (!item?.macros) return 'C'; // Default to middle grade

  const macros = item.macros;
  const calories = macros.calories_kcal || 0;
  const protein = macros.protein_g || 0;
  const fiber = macros.fiber_g || 0;
  const sugar = macros.sugar_g || 0;
  const fat = macros.fat_g || 0;
  const sodium = macros.sodium_mg || 0;

  // Calculate positive points (0-15)
  let positivePoints = 0;
  // Protein: up to 5 points
  positivePoints += Math.min(5, Math.floor(protein / 3.2));
  // Fiber: up to 5 points
  positivePoints += Math.min(5, Math.floor(fiber / 0.9));
  // Fruits/vegetables (estimate from fiber): up to 5 points
  positivePoints += Math.min(5, Math.floor(fiber / 1.5));

  // Calculate negative points (0-40)
  let negativePoints = 0;
  // Energy: up to 10 points
  negativePoints += Math.min(10, Math.floor(calories / 335));
  // Saturated fat (estimate as 40% of fat): up to 10 points
  const saturatedFat = fat * 0.4;
  negativePoints += Math.min(10, Math.floor(saturatedFat / 1));
  // Sugar: up to 10 points
  negativePoints += Math.min(10, Math.floor(sugar / 4.5));
  // Sodium: up to 10 points
  negativePoints += Math.min(10, Math.floor(sodium / 90));

  // Calculate final score
  const finalScore = negativePoints - positivePoints;

  // Convert to letter grade
  if (finalScore <= -1) return 'A';
  if (finalScore <= 2) return 'B';
  if (finalScore <= 10) return 'C';
  if (finalScore <= 18) return 'D';
  return 'E';
}

export default function NutriScoreCard({ item, compact = false }) {
  const { colors, isDark } = useTheme();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  const currentGrade = calculateNutriScoreGrade(item);
  const gradeInfo = NUTRI_SCORE_GRADES.find(g => g.letter === currentGrade);

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' },
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Nutri-Score grade: ${currentGrade}. ${gradeInfo?.label || ''}`}
    >
      {!compact && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>Nutri-Score</Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Nutritional quality rating
          </Text>
        </View>
      )}

      {/* A-E Grade Bar */}
      <View style={styles.gradeBar}>
        {NUTRI_SCORE_GRADES.map((grade, index) => {
          const isActive = grade.letter === currentGrade;
          const isLeftEdge = index === 0;
          const isRightEdge = index === NUTRI_SCORE_GRADES.length - 1;

          return (
            <View
              key={grade.letter}
              style={[
                styles.gradeBlock,
                {
                  backgroundColor: isActive ? grade.color : `${grade.color}30`,
                  borderTopLeftRadius: isLeftEdge ? 10 : 0,
                  borderBottomLeftRadius: isLeftEdge ? 10 : 0,
                  borderTopRightRadius: isRightEdge ? 10 : 0,
                  borderBottomRightRadius: isRightEdge ? 10 : 0,
                },
                isActive && styles.gradeBlockActive,
              ]}
            >
              <Text
                style={[
                  styles.gradeLetter,
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

      {/* Grade description */}
      {!compact && gradeInfo && (
        <View style={styles.gradeDescription}>
          <View style={[styles.gradeBadge, { backgroundColor: gradeInfo.color }]}>
            <Text style={styles.gradeBadgeText}>{gradeInfo.letter}</Text>
          </View>
          <Text style={[styles.gradeLabel, { color: textSecondary }]}>
            {gradeInfo.label} nutritional quality
          </Text>
        </View>
      )}
    </View>
  );
}

// Export for use in other components
export { calculateNutriScoreGrade, NUTRI_SCORE_GRADES };

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING[4],
    marginVertical: SPACING[2],
  },
  containerCompact: {
    padding: SPACING[3],
  },
  header: {
    marginBottom: SPACING[3],
  },
  title: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 2,
  },
  gradeBar: {
    flexDirection: 'row',
    height: 48,
    gap: 3,
  },
  gradeBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  gradeBlockActive: {
    opacity: 1,
    transform: [{ scale: 1.08 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },
  gradeLetter: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    letterSpacing: -0.5,
  },
  gradeLetterActive: {
    fontSize: TYPOGRAPHY.size['3xl'],
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gradeDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[3],
    gap: SPACING[2],
  },
  gradeBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeBadgeText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.black,
  },
  gradeLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
