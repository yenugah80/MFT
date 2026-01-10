/**
 * Nutrition Trends Screen - Detailed Analytics
 *
 * Design Philosophy: Comprehensive view of nutrition patterns over time
 * - Period selector (7/14/30/90 days)
 * - Macro breakdown with trends
 * - Goal progress visualization
 * - AI-powered recommendations
 *
 * Navigation:
 * - Back → Dashboard
 * - Tap recommendation → relevant action
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDashboard } from '../../hooks/useDashboard';
import {
  TEXT,
  SURFACES,
  BRAND,
  SHADOWS,
  SEMANTIC,
} from '../../constants/premiumTheme';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Period options
const PERIODS = [
  { key: 7, label: '7 days' },
  { key: 14, label: '14 days' },
  { key: 30, label: '30 days' },
  { key: 90, label: '90 days' },
];

// Macro colors
const MACRO_COLORS = {
  calories: { color: '#6B4EFF', bgColor: 'rgba(107, 78, 255, 0.10)' },
  protein: { color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.10)' },
  carbs: { color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.10)' },
  fat: { color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.10)' },
};

/**
 * Period selector chip
 */
function PeriodChip({ period, isActive, onPress }) {
  if (isActive) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={[BRAND.primary, '#8B6EFF']}
          style={styles.periodChipActive}
        >
          <Text style={styles.periodChipTextActive}>{period.label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.periodChip}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.periodChipText}>{period.label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Stat card component
 */
function StatCard({ icon, label, value, unit, trend, color, bgColor }) {
  const trendIsPositive = trend > 0;
  const trendColor = trendIsPositive ? SEMANTIC.success.base : SEMANTIC.error?.base || '#EF4444';

  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={styles.statCardHeader}>
        <View style={[styles.statCardIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        {trend !== 0 && trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: `${trendColor}15` }]}>
            <Ionicons
              name={trendIsPositive ? 'arrow-up' : 'arrow-down'}
              size={10}
              color={trendColor}
            />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.statCardValue}>
        {value}
        <Text style={styles.statCardUnit}>{unit}</Text>
      </Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

/**
 * Progress bar component
 */
function ProgressBar({ label, current, goal, color }) {
  const progress = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const isOver = current > goal;

  return (
    <View style={styles.progressItem}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={[styles.progressValue, isOver && { color: SEMANTIC.warning?.base || '#F59E0B' }]}>
          {Math.round(current)} / {Math.round(goal)}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: isOver ? (SEMANTIC.warning?.base || '#F59E0B') : color,
            },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * Insight card component
 */
function InsightCard({ insight }) {
  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightIcon, { backgroundColor: `${insight.color}15` }]}>
        <Ionicons name={insight.icon} size={18} color={insight.color} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightText}>{insight.text}</Text>
      </View>
    </View>
  );
}

// Default goals fallback (stable reference)
const DEFAULT_GOALS = {
  dailyCalories: 2000,
  proteinG: 150,
  carbsG: 250,
  fatG: 65,
};

/**
 * Main Nutrition Trends Screen
 */
export default function NutritionTrendsScreen() {
  const router = useRouter();
  const { data, refetch } = useDashboard();
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [refreshing, setRefreshing] = useState(false);

  // Get goals - memoized to avoid reference changes
  const goals = useMemo(() => data?.goals || DEFAULT_GOALS, [data?.goals]);

  // Calculate period stats
  const periodStats = useMemo(() => {
    const weekSummaries = data?.trends?.weekSummaries || [];

    if (weekSummaries.length === 0) {
      return {
        avgCalories: 0,
        avgProtein: 0,
        avgCarbs: 0,
        avgFat: 0,
        totalMeals: 0,
        daysWithData: 0,
        caloriesTrend: 0,
        proteinTrend: 0,
      };
    }

    // Get data for selected period
    const daysToInclude = Math.min(selectedPeriod, weekSummaries.length);
    const periodData = weekSummaries.slice(0, daysToInclude);
    const daysWithData = periodData.filter(d => d.totalCalories > 0).length;

    // Calculate averages (only for days with data)
    const avgCalories = daysWithData > 0
      ? periodData.reduce((sum, d) => sum + (d.totalCalories || 0), 0) / daysWithData
      : 0;
    const avgProtein = daysWithData > 0
      ? periodData.reduce((sum, d) => sum + (d.totalProtein || 0), 0) / daysWithData
      : 0;
    const avgCarbs = daysWithData > 0
      ? periodData.reduce((sum, d) => sum + (d.totalCarbs || 0), 0) / daysWithData
      : 0;
    const avgFat = daysWithData > 0
      ? periodData.reduce((sum, d) => sum + (d.totalFat || 0), 0) / daysWithData
      : 0;

    // Calculate trends (compare first half vs second half)
    let caloriesTrend = 0;
    let proteinTrend = 0;
    if (daysToInclude >= 4) {
      const halfPoint = Math.floor(daysToInclude / 2);
      const recentDays = periodData.slice(0, halfPoint);
      const olderDays = periodData.slice(halfPoint);

      const recentCalAvg = recentDays.reduce((s, d) => s + (d.totalCalories || 0), 0) / recentDays.length;
      const olderCalAvg = olderDays.reduce((s, d) => s + (d.totalCalories || 0), 0) / olderDays.length;

      if (olderCalAvg > 0) {
        caloriesTrend = Math.round(((recentCalAvg - olderCalAvg) / olderCalAvg) * 100);
      }

      const recentProtAvg = recentDays.reduce((s, d) => s + (d.totalProtein || 0), 0) / recentDays.length;
      const olderProtAvg = olderDays.reduce((s, d) => s + (d.totalProtein || 0), 0) / olderDays.length;

      if (olderProtAvg > 0) {
        proteinTrend = Math.round(((recentProtAvg - olderProtAvg) / olderProtAvg) * 100);
      }
    }

    return {
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      totalMeals: periodData.reduce((sum, d) => sum + (d.mealCount || 0), 0),
      daysWithData,
      caloriesTrend,
      proteinTrend,
    };
  }, [data, selectedPeriod]);

  // Generate insights based on data
  const insights = useMemo(() => {
    const generatedInsights = [];

    // Protein insight
    if (periodStats.avgProtein < goals.proteinG * 0.8) {
      generatedInsights.push({
        icon: 'nutrition-outline',
        color: BRAND.primary,
        title: 'Boost Your Protein',
        text: `Your average protein (${Math.round(periodStats.avgProtein)}g) is below your goal. Try adding eggs, Greek yogurt, or lean meats.`,
      });
    } else if (periodStats.avgProtein >= goals.proteinG) {
      generatedInsights.push({
        icon: 'checkmark-circle',
        color: SEMANTIC.success.base,
        title: 'Great Protein Intake!',
        text: `You're consistently hitting your protein goal of ${goals.proteinG}g.`,
      });
    }

    // Calorie insight
    if (periodStats.avgCalories > 0 && periodStats.avgCalories < goals.dailyCalories * 0.7) {
      generatedInsights.push({
        icon: 'warning-outline',
        color: '#F59E0B',
        title: 'Low Calorie Intake',
        text: `Your average of ${Math.round(periodStats.avgCalories)} cal is well below your ${goals.dailyCalories} cal goal. Make sure you're eating enough.`,
      });
    }

    // Consistency insight
    if (periodStats.daysWithData < selectedPeriod * 0.5) {
      generatedInsights.push({
        icon: 'calendar-outline',
        color: '#3B82F6',
        title: 'Log More Consistently',
        text: `You've logged ${periodStats.daysWithData} of ${selectedPeriod} days. More data = better insights!`,
      });
    } else if (periodStats.daysWithData >= selectedPeriod * 0.8) {
      generatedInsights.push({
        icon: 'ribbon',
        color: SEMANTIC.success.base,
        title: 'Excellent Consistency!',
        text: `You've logged ${periodStats.daysWithData} of ${selectedPeriod} days. Keep it up!`,
      });
    }

    // Trend insight
    if (periodStats.proteinTrend > 10) {
      generatedInsights.push({
        icon: 'trending-up',
        color: SEMANTIC.success.base,
        title: 'Protein Trending Up',
        text: `Your protein intake increased ${periodStats.proteinTrend}% recently. Great progress!`,
      });
    }

    return generatedInsights;
  }, [periodStats, goals, selectedPeriod]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/dashboard');
            }
          }}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={TEXT.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Nutrition Trends</Text>
          <Text style={styles.headerSubtitle}>
            {periodStats.daysWithData} days of data
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND.primary}
          />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((period) => (
            <PeriodChip
              key={period.key}
              period={period}
              isActive={selectedPeriod === period.key}
              onPress={() => setSelectedPeriod(period.key)}
            />
          ))}
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Daily Averages</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="flame"
            label="avg cal/day"
            value={Math.round(periodStats.avgCalories)}
            unit=""
            trend={periodStats.caloriesTrend}
            color={MACRO_COLORS.calories.color}
            bgColor={MACRO_COLORS.calories.bgColor}
          />
          <StatCard
            icon="barbell"
            label="avg protein"
            value={Math.round(periodStats.avgProtein)}
            unit="g"
            trend={periodStats.proteinTrend}
            color={MACRO_COLORS.protein.color}
            bgColor={MACRO_COLORS.protein.bgColor}
          />
          <StatCard
            icon="leaf"
            label="avg carbs"
            value={Math.round(periodStats.avgCarbs)}
            unit="g"
            trend={0}
            color={MACRO_COLORS.carbs.color}
            bgColor={MACRO_COLORS.carbs.bgColor}
          />
          <StatCard
            icon="water"
            label="avg fat"
            value={Math.round(periodStats.avgFat)}
            unit="g"
            trend={0}
            color={MACRO_COLORS.fat.color}
            bgColor={MACRO_COLORS.fat.bgColor}
          />
        </View>

        {/* Goal Progress */}
        <Text style={styles.sectionTitle}>Goal Progress</Text>
        <View style={styles.progressCard}>
          <ProgressBar
            label="Calories"
            current={periodStats.avgCalories}
            goal={goals.dailyCalories}
            color={MACRO_COLORS.calories.color}
          />
          <ProgressBar
            label="Protein"
            current={periodStats.avgProtein}
            goal={goals.proteinG}
            color={MACRO_COLORS.protein.color}
          />
          <ProgressBar
            label="Carbs"
            current={periodStats.avgCarbs}
            goal={goals.carbsG}
            color={MACRO_COLORS.carbs.color}
          />
          <ProgressBar
            label="Fat"
            current={periodStats.avgFat}
            goal={goals.fatG}
            color={MACRO_COLORS.fat.color}
          />
        </View>

        {/* Insights */}
        {insights.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Insights</Text>
            <View style={styles.insightsList}>
              {insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </View>
          </>
        )}

        {/* Summary Stats */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{periodStats.totalMeals}</Text>
              <Text style={styles.summaryLabel}>Total Meals</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{periodStats.daysWithData}</Text>
              <Text style={styles.summaryLabel}>Days Logged</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {periodStats.daysWithData > 0
                  ? Math.round(periodStats.totalMeals / periodStats.daysWithData * 10) / 10
                  : 0}
              </Text>
              <Text style={styles.summaryLabel}>Meals/Day</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: SURFACES.background.primary,
  },
  backButton: {
    padding: SPACING[2],
    marginLeft: -SPACING[2],
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },

  // Period Selector
  periodRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[5],
  },
  periodChip: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(107, 78, 255, 0.06)',
  },
  periodChipActive: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
  },
  periodChipText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  periodChipTextActive: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },

  // Section Title
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
    marginBottom: SPACING[5],
  },
  statCard: {
    width: (SCREEN_WIDTH - SPACING[4] * 2 - SPACING[3]) / 2,
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    ...SHADOWS.sm,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  statCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  trendText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  statCardValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statCardUnit: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  statCardLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Progress Card
  progressCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    gap: SPACING[4],
    marginBottom: SPACING[5],
    ...SHADOWS.sm,
  },
  progressItem: {
    gap: SPACING[2],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
  },
  progressValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Insights
  insightsList: {
    gap: SPACING[3],
    marginBottom: SPACING[5],
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.sm,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  insightText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    lineHeight: 18,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
  },
});
