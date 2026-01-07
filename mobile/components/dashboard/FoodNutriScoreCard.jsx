/**
 * Food Nutri-Score Card
 * Shows individual food items logged today with their official Nutri-Score grades (A-E)
 * THEME-AWARE: Works in both light and dark modes
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { useTheme } from '../../providers/ThemeProvider';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/premiumTheme';

/**
 * Official Nutri-Score colors (from public health standards)
 */
const NUTRI_SCORE_CONFIG = {
  A: { color: '#038141', bgColor: '#038141', label: 'Best', score: 'A' },
  B: { color: '#85BB2F', bgColor: '#85BB2F', label: 'Good', score: 'B' },
  C: { color: '#FECB02', bgColor: '#FECB02', label: 'Fair', score: 'C' },
  D: { color: '#EE8100', bgColor: '#EE8100', label: 'Poor', score: 'D' },
  E: { color: '#E63E11', bgColor: '#E63E11', label: 'Avoid', score: 'E' },
};

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

export default function FoodNutriScoreCard({ foodLogs = [], compact = false }) {
  const { colors, isDark } = useTheme();

  // Theme-aware colors
  const textPrimary = colors.text.primary;
  const textTertiary = colors.text.tertiary;
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const averageGrade = useMemo(() => calculateAverageGrade(foodLogs), [foodLogs]);
  const logsWithScores = useMemo(() => foodLogs.filter(f => f.nutriscore), [foodLogs]);
  const logsWithoutScores = useMemo(() => foodLogs.filter(f => !f.nutriscore), [foodLogs]);

  // Food Row component with theme support
  const FoodRow = ({ food }) => {
    const config = NUTRI_SCORE_CONFIG[food.nutriscore] || NUTRI_SCORE_CONFIG.C;
    const badgeTextColor = ['C', 'D', 'E'].includes(food.nutriscore) ? '#000' : '#FFF';

    return (
      <View style={[styles.foodRow, { borderBottomColor: borderColor }]}>
        <View style={styles.foodInfo}>
          <Text style={[styles.foodName, { color: textPrimary }]} numberOfLines={1}>
            {food.foodName}
          </Text>
          {food.calories && (
            <Text style={[styles.foodCalories, { color: textTertiary }]}>
              {Math.round(food.calories)} kcal
            </Text>
          )}
        </View>

        {food.nutriscore ? (
          <View style={[styles.scoreGradeBadge, { backgroundColor: config.bgColor }]}>
            <Text style={[styles.scoreGradeText, { color: badgeTextColor }]}>
              {config.score}
            </Text>
          </View>
        ) : (
          <View style={styles.noScoreBadge}>
            <Ionicons name="help-circle-outline" size={16} color={textTertiary} />
          </View>
        )}
      </View>
    );
  };

  if (!foodLogs || foodLogs.length === 0) {
    return (
      <GlassCard padding="lg">
        <View style={styles.emptyState}>
          <Ionicons name="fast-food-outline" size={32} color={textTertiary} />
          <Text style={[styles.emptyStateText, { color: textTertiary }]}>No foods logged yet</Text>
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
          <Text style={[styles.title, { color: textPrimary }]}>Food Nutri-Score</Text>
          <Text style={[styles.subtitle, { color: textTertiary }]}>Today ({foodLogs.length} items)</Text>
        </View>
        {averageConfig && (
          <View style={styles.headerRight}>
            <View style={[styles.averageBadge, { backgroundColor: averageConfig.bgColor }]}>
              <Text style={[styles.averageText, { color: averageTextColor }]}>
                {averageGrade}
              </Text>
            </View>
            <Text style={[styles.averageLabel, { color: textTertiary }]}>Avg</Text>
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

      {/* Foods without scores */}
      {logsWithoutScores.length > 0 && (
        <View style={[styles.noScoreSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <View style={styles.noScoreHeader}>
            <Ionicons name="alert-circle-outline" size={14} color={textTertiary} />
            <Text style={[styles.noScoreTitle, { color: textTertiary }]}>
              {logsWithoutScores.length} item{logsWithoutScores.length > 1 ? 's' : ''} missing score
            </Text>
          </View>
          <Text style={[styles.noScoreHint, { color: textTertiary }]}>
            Scan barcode or search to get Nutri-Score data
          </Text>
        </View>
      )}

      {/* Legend */}
      {!compact && (
        <View style={[styles.legend, { borderTopColor: borderColor }]}>
          <Text style={[styles.legendTitle, { color: textTertiary }]}>Grades</Text>
          <View style={styles.legendItems}>
            {Object.entries(NUTRI_SCORE_CONFIG).map(([grade, config]) => (
              <View key={grade} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: config.bgColor }]} />
                <Text style={[styles.legendLabel, { color: textTertiary }]}>{grade}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: { gap: 2, flex: 1 },
  headerRight: { alignItems: 'center', gap: SPACING[1] },
  title: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  averageBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  averageText: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    letterSpacing: -1,
  },
  averageLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[6],
    gap: SPACING[2],
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  section: { marginBottom: SPACING[4] },
  foodList: { maxHeight: 200 },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
  },
  foodInfo: { flex: 1, marginRight: SPACING[2] },
  foodName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  foodCalories: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 2,
  },
  scoreGradeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreGradeText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  noScoreBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noScoreSection: {
    borderRadius: RADIUS.md,
    padding: SPACING[3],
    marginBottom: SPACING[4],
  },
  noScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[1],
  },
  noScoreTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  noScoreHint: {
    fontSize: TYPOGRAPHY.size.xs,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING[3],
    borderTopWidth: 1,
  },
  legendTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  legendItems: {
    flexDirection: 'row',
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
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
