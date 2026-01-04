/**
 * Food Nutri-Score Card
 * Shows individual food items logged today with their official Nutri-Score grades (A-E)
 * Uses real Nutri-Score data from food log API responses
 *
 * Design philosophy: Clean, scannable list of foods with color-coded nutrition grades
 * Based on user research: users want quick visual identification of food quality
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { TEXT, TYPOGRAPHY, SPACING, RADIUS } from '../../constants/premiumTheme';

/**
 * Official Nutri-Score colors (from public health standards)
 * Green = Good (A, B)
 * Yellow = Fair (C)
 * Orange/Red = Poor (D, E)
 */
const NUTRI_SCORE_CONFIG = {
  A: {
    color: '#038141',
    bgColor: '#038141',
    label: 'Best',
    score: 'A',
  },
  B: {
    color: '#85BB2F',
    bgColor: '#85BB2F',
    label: 'Good',
    score: 'B',
  },
  C: {
    color: '#FECB02',
    bgColor: '#FECB02',
    label: 'Fair',
    score: 'C',
  },
  D: {
    color: '#EE8100',
    bgColor: '#EE8100',
    label: 'Poor',
    score: 'D',
  },
  E: {
    color: '#E63E11',
    bgColor: '#E63E11',
    label: 'Avoid',
    score: 'E',
  },
};

/**
 * Calculate average Nutri-Score for the day
 * Maps A=5, B=4, C=3, D=2, E=1 for averaging
 */
function calculateAverageGrade(foodLogs) {
  if (!foodLogs || foodLogs.length === 0) return null;

  const scoreValues = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const logsWithScores = foodLogs.filter(f => f.nutriscore);

  if (logsWithScores.length === 0) return null;

  const total = logsWithScores.reduce((sum, f) => sum + (scoreValues[f.nutriscore] || 0), 0);
  const average = total / logsWithScores.length;

  if (average >= 4.5) return 'A';
  if (average >= 3.5) return 'B';
  if (average >= 2.5) return 'C';
  if (average >= 1.5) return 'D';
  return 'E';
}

/**
 * Individual food row showing name and Nutri-Score badge
 */
function FoodRow({ food }) {
  const config = NUTRI_SCORE_CONFIG[food.nutriscore] || NUTRI_SCORE_CONFIG.C;
  const textColor = ['C', 'D', 'E'].includes(food.nutriscore) ? '#000' : '#FFF';

  return (
    <View style={styles.foodRow}>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName} numberOfLines={1}>
          {food.foodName}
        </Text>
        {food.calories && (
          <Text style={styles.foodCalories}>
            {Math.round(food.calories)} kcal
          </Text>
        )}
      </View>

      {food.nutriscore ? (
        <View
          style={[
            styles.scoreGradeBadge,
            { backgroundColor: config.bgColor },
          ]}
        >
          <Text
            style={[
              styles.scoreGradeText,
              { color: textColor },
            ]}
          >
            {config.score}
          </Text>
        </View>
      ) : (
        <View style={styles.noScoreBadge}>
          <Ionicons name="help-circle-outline" size={16} color={TEXT.tertiary} />
        </View>
      )}
    </View>
  );
}

export default function FoodNutriScoreCard({ foodLogs = [], compact = false }) {
  const averageGrade = useMemo(() => calculateAverageGrade(foodLogs), [foodLogs]);
  const logsWithScores = useMemo(() => foodLogs.filter(f => f.nutriscore), [foodLogs]);
  const logsWithoutScores = useMemo(() => foodLogs.filter(f => !f.nutriscore), [foodLogs]);

  if (!foodLogs || foodLogs.length === 0) {
    return (
      <GlassCard padding="lg">
        <View style={styles.emptyState}>
          <Ionicons name="fast-food-outline" size={32} color={TEXT.tertiary} />
          <Text style={styles.emptyStateText}>No foods logged yet</Text>
        </View>
      </GlassCard>
    );
  }

  const averageConfig = averageGrade ? NUTRI_SCORE_CONFIG[averageGrade] : null;
  const averageTextColor = averageGrade && ['C', 'D', 'E'].includes(averageGrade) ? '#000' : '#FFF';

  return (
    <GlassCard padding="lg">
      {/* Header with title and average score */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Food Nutri-Score</Text>
          <Text style={styles.subtitle}>Today ({foodLogs.length} items)</Text>
        </View>
        {averageConfig && (
          <View style={styles.headerRight}>
            <View
              style={[
                styles.averageBadge,
                { backgroundColor: averageConfig.bgColor },
              ]}
            >
              <Text
                style={[
                  styles.averageText,
                  { color: averageTextColor },
                ]}
              >
                {averageGrade}
              </Text>
            </View>
            <Text style={styles.averageLabel}>Avg</Text>
          </View>
        )}
      </View>

      {/* Foods with scores */}
      {logsWithScores.length > 0 && (
        <View style={styles.section}>
          <ScrollView
            scrollEnabled={logsWithScores.length > 4}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            style={styles.foodList}
          >
            {logsWithScores.map((food) => (
              <FoodRow key={food.id} food={food} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Foods without scores - data not available */}
      {logsWithoutScores.length > 0 && (
        <View style={styles.noScoreSection}>
          <View style={styles.noScoreHeader}>
            <Ionicons name="alert-circle-outline" size={14} color={TEXT.tertiary} />
            <Text style={styles.noScoreTitle}>
              {logsWithoutScores.length} item{logsWithoutScores.length > 1 ? 's' : ''} missing score
            </Text>
          </View>
          <Text style={styles.noScoreHint}>
            Scan barcode or search to get Nutri-Score data
          </Text>
        </View>
      )}

      {/* Legend */}
      {!compact && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Grades</Text>
          <View style={styles.legendItems}>
            {Object.entries(NUTRI_SCORE_CONFIG).map(([grade, config]) => (
              <View key={grade} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: config.bgColor },
                  ]}
                />
                <Text style={styles.legendLabel}>{grade}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    gap: 2,
    flex: 1,
  },
  headerRight: {
    alignItems: 'center',
    gap: SPACING[1],
  },
  title: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },

  // Average badge
  averageBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  averageText: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    letterSpacing: -1,
  },
  averageLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
    gap: SPACING[2],
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Food list
  section: {
    marginBottom: SPACING[4],
  },
  foodList: {
    maxHeight: 200,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: `${TEXT.primary}08`,
  },
  foodInfo: {
    flex: 1,
    marginRight: SPACING[2],
  },
  foodName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
  },
  foodCalories: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Score badges
  scoreGradeBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: TYPOGRAPHY.weight.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  scoreGradeText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.black,
    letterSpacing: -0.5,
  },
  noScoreBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${TEXT.primary}08`,
  },

  // No score section
  noScoreSection: {
    backgroundColor: `${TEXT.primary}05`,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    marginTop: SPACING[2],
    borderLeftWidth: 3,
    borderLeftColor: TEXT.tertiary,
  },
  noScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[1],
  },
  noScoreTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  noScoreHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    lineHeight: 16,
  },

  // Legend
  legend: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: `${TEXT.primary}08`,
  },
  legendTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.secondary,
    textTransform: 'uppercase',
    marginBottom: SPACING[2],
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: RADIUS.full,
  },
  legendLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
