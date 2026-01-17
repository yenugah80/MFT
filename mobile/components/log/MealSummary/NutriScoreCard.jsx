/**
 * NutritionGradeCard Component
 * Simplified A-E nutrition quality grade
 *
 * NOTE: This is an ESTIMATED grade based on available nutrition data.
 * It is NOT the official European Nutri-Score® which requires
 * specific data points (saturated fat, fruit/veg %) that AI estimation
 * cannot reliably provide. We use a similar visual format for familiarity
 * but call it "Nutrition Grade" to avoid confusion with the official label.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../../constants/designTokens';
import { useTheme } from '../../../providers/ThemeProvider';

/**
 * Nutrition grade colors (inspired by Nutri-Score but not branded)
 */
const NUTRITION_GRADES = [
  { letter: 'A', color: '#038141', label: 'Excellent' },
  { letter: 'B', color: '#85BB2F', label: 'Good' },
  { letter: 'C', color: '#FECB02', label: 'Moderate' },
  { letter: 'D', color: '#EE8100', label: 'Limited' },
  { letter: 'E', color: '#E63E11', label: 'Poor' },
];

/**
 * Calculate nutrition grade from available data
 * Uses positive factors (protein, fiber) vs negative factors (sugar, fat, sodium)
 * This is a simplified estimate, not the official Nutri-Score algorithm
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

  // Calculate positive points (0-10) - simplified, honest scoring
  let positivePoints = 0;
  // Protein: up to 5 points (good for satiety)
  positivePoints += Math.min(5, Math.floor(protein / 4));
  // Fiber: up to 5 points (good for digestion)
  // NOTE: Not double-counting as "fruit/veg" since we can't estimate that from fiber alone
  positivePoints += Math.min(5, Math.floor(fiber / 1.5));

  // Calculate negative points (0-30) - adjusted for realistic meal portions
  let negativePoints = 0;
  // Energy: up to 10 points (400 kcal = 1 point, normal meal = ~2 points)
  negativePoints += Math.min(10, Math.floor(calories / 400));
  // Saturated fat (estimate as 35% of fat): up to 10 points
  const saturatedFat = fat * 0.35;
  negativePoints += Math.min(10, Math.floor(saturatedFat / 1.5));
  // Sugar: up to 5 points (more lenient - 6g = 1 point)
  negativePoints += Math.min(5, Math.floor(sugar / 6));
  // Sodium: up to 5 points (150mg = 1 point, more realistic for meals)
  negativePoints += Math.min(5, Math.floor(sodium / 150));

  // Calculate final score (realistic range: -10 to +20 for most meals)
  const finalScore = negativePoints - positivePoints;

  // Convert to letter grade - adjusted for realistic meal scoring
  // Healthy meal: high protein/fiber, low sugar/sodium → negative score → A/B
  // Balanced meal: moderate everything → low positive score → B/C
  // Indulgent meal: high sugar/fat, low protein/fiber → high positive → D/E
  if (finalScore <= 0) return 'A';   // Net positive nutrition
  if (finalScore <= 4) return 'B';   // Slightly negative but acceptable
  if (finalScore <= 8) return 'C';   // Average/neutral
  if (finalScore <= 12) return 'D';  // Below average
  return 'E';                        // Poor nutritional balance
}

export default function NutriScoreCard({ item, compact = false }) {
  const { colors, isDark } = useTheme();
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  const currentGrade = calculateNutriScoreGrade(item);
  const gradeInfo = NUTRITION_GRADES.find(g => g.letter === currentGrade);

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        // No background in compact mode - it's embedded in parent card
        !compact && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)' },
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Nutrition grade: ${currentGrade}. ${gradeInfo?.label || ''}`}
    >
      {!compact ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: textPrimary }]}>Nutrition Grade</Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>
            Estimated quality rating
          </Text>
        </View>
      ) : (
        <Text style={[styles.compactLabel, { color: textSecondary }]}>
          Nutrition Grade
        </Text>
      )}

      {/* A-E Grade Bar */}
      <View style={[styles.gradeBar, compact && styles.gradeBarCompact]}>
        {NUTRITION_GRADES.map((grade, index) => {
          const isActive = grade.letter === currentGrade;
          const isLeftEdge = index === 0;
          const isRightEdge = index === NUTRITION_GRADES.length - 1;

          return (
            <View
              key={grade.letter}
              style={[
                styles.gradeBlock,
                compact && styles.gradeBlockCompact,
                {
                  backgroundColor: isActive ? grade.color : `${grade.color}30`,
                  borderTopLeftRadius: isLeftEdge ? (compact ? 6 : 10) : 0,
                  borderBottomLeftRadius: isLeftEdge ? (compact ? 6 : 10) : 0,
                  borderTopRightRadius: isRightEdge ? (compact ? 6 : 10) : 0,
                  borderBottomRightRadius: isRightEdge ? (compact ? 6 : 10) : 0,
                },
                isActive && !compact && styles.gradeBlockActive,
              ]}
            >
              <Text
                style={[
                  styles.gradeLetter,
                  compact && styles.gradeLetterCompact,
                  { color: isActive ? '#FFFFFF' : `${grade.color}80` },
                  isActive && !compact && styles.gradeLetterActive,
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
export { calculateNutriScoreGrade, NUTRITION_GRADES };

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: SPACING[4],
    marginVertical: SPACING[2],
  },
  containerCompact: {
    padding: 0,
    marginVertical: 0,
    borderRadius: 0,
  },
  compactLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  gradeBarCompact: {
    height: 32,
    gap: 2,
  },
  gradeBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  gradeBlockCompact: {
    opacity: 0.6,
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
  gradeLetterCompact: {
    fontSize: TYPOGRAPHY.size.base,
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
