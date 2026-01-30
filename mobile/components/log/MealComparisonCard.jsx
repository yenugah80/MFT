/**
 * MealComparisonCard - Historical Context & Patterns
 *
 * Shows how this meal compares to:
 * - User's typical meals at this time
 * - Yesterday's same meal type
 * - Weekly averages
 * - Similar foods logged before
 *
 * Provides context that makes data meaningful.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
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
// COMPARISON GENERATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

const generateComparisons = (meal, historicalData, mealType) => {
  const comparisons = [];
  const macros = meal.macros || meal.nutrition || {};
  const calories = macros.calories_kcal || macros.calories || 0;

  // No historical data? Return empty - don't show fake comparisons
  if (!historicalData) {
    return comparisons;
  }

  const history = historicalData;

  // NOTE: Weekly average comparisons are handled by SmartMealInsights
  // This component focuses on: yesterday comparison, meal type, timing

  // Compare to yesterday's same meal type
  if (history.yesterdaySameMeal && mealType) {
    const yesterdayDiff = calories - history.yesterdaySameMeal.calories;
    if (Math.abs(yesterdayDiff) > 50) {
      comparisons.push({
        type: 'comparison',
        icon: 'calendar',
        metric: 'yesterday',
        value: Math.abs(yesterdayDiff),
        context: `vs yesterday's ${mealType}`,
        insight: yesterdayDiff > 0
          ? `${Math.abs(yesterdayDiff)} cal more than yesterday`
          : `${Math.abs(yesterdayDiff)} cal less than yesterday`,
      });
    }
  }

  // Meal type context
  if (mealType && history.mealTypeAverage) {
    const typeAverage = history.mealTypeAverage[mealType.toLowerCase()];
    if (typeAverage) {
      const typeDiff = calories - typeAverage;
      const typePercent = Math.round((typeDiff / typeAverage) * 100);

      if (Math.abs(typePercent) > 15) {
        comparisons.push({
          type: 'context',
          icon: typeDiff > 0 ? 'restaurant' : 'leaf',
          metric: 'meal_type',
          context: `for ${mealType}`,
          insight: typeDiff > 0
            ? `Larger than your typical ${mealType}`
            : `Lighter ${mealType} than usual`,
        });
      }
    }
  }

  // Time of day context
  const hour = new Date().getHours();
  if (hour >= 21 && calories > 400) {
    comparisons.push({
      type: 'timing',
      icon: 'moon',
      metric: 'timing',
      context: 'Late night meal',
      insight: 'Heavy meals after 9pm may affect sleep quality',
    });
  } else if (hour >= 6 && hour <= 9 && calories > 500) {
    comparisons.push({
      type: 'positive',
      icon: 'sunny',
      metric: 'timing',
      context: 'Morning fuel',
      insight: 'Good energy for the day ahead!',
    });
  }

  return comparisons.slice(0, 4);
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: ComparisonItem
// ═══════════════════════════════════════════════════════════════════════════════

const ComparisonItem = ({ comparison }) => {
  const typeStyles = {
    higher: { color: '#F59E0B', bg: '#FEF3C7' },
    lower: { color: '#10B981', bg: '#ECFDF5' },
    comparison: { color: '#3B82F6', bg: '#EFF6FF' },
    positive: { color: '#10B981', bg: '#ECFDF5' },
    timing: { color: '#8B5CF6', bg: '#F5F3FF' },
    context: { color: TEXT.secondary, bg: SURFACES.background.tertiary },
  };

  const style = typeStyles[comparison.type] || typeStyles.context;

  return (
    <View style={[styles.comparisonItem, { backgroundColor: style.bg }]}>
      <View style={[styles.comparisonIcon, { backgroundColor: style.color + '20' }]}>
        <Ionicons name={comparison.icon} size={16} color={style.color} />
      </View>
      <View style={styles.comparisonContent}>
        <Text style={styles.comparisonInsight}>{comparison.insight}</Text>
        {comparison.context && (
          <Text style={styles.comparisonContext}>{comparison.context}</Text>
        )}
      </View>
      {comparison.value && (
        <View style={styles.comparisonValue}>
          <Text style={[styles.comparisonValueText, { color: style.color }]}>
            {comparison.type === 'higher' ? '+' : comparison.type === 'lower' ? '-' : ''}
            {comparison.value}
            {comparison.unit || ''}
          </Text>
        </View>
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: TrendIndicator
// ═══════════════════════════════════════════════════════════════════════════════

const TrendIndicator = ({ trend, mealType }) => {
  const trendConfig = {
    increasing: {
      icon: 'trending-up',
      color: '#F59E0B',
      label: 'Calories trending up this week',
    },
    decreasing: {
      icon: 'trending-down',
      color: '#10B981',
      label: 'Calories trending down this week',
    },
    stable: {
      icon: 'remove',
      color: '#3B82F6',
      label: 'Consistent eating pattern',
    },
  };

  const config = trendConfig[trend] || trendConfig.stable;

  return (
    <View style={styles.trendContainer}>
      <Ionicons name={config.icon} size={14} color={config.color} />
      <Text style={[styles.trendText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: SkeletonLoader
// ═══════════════════════════════════════════════════════════════════════════════

const SkeletonLoader = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.skeletonIcon, { opacity }]} />
          <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        </View>
      </View>
      <View style={styles.comparisonsList}>
        {[1, 2].map((i) => (
          <Animated.View key={i} style={[styles.skeletonCard, { opacity }]} />
        ))}
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: MealComparisonCard
// ═══════════════════════════════════════════════════════════════════════════════

const MealComparisonCard = ({
  meal,
  mealType,
  historicalData,
  showTrend = true,
  isLoading = false,
}) => {
  const comparisons = useMemo(
    () => generateComparisons(meal, historicalData, mealType),
    [meal, historicalData, mealType]
  );

  // Show skeleton while loading
  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (comparisons.length === 0) {
    return null;
  }

  const trend = historicalData?.monthlyTrend || 'stable';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics" size={20} color={BRAND.primary} />
          <Text style={styles.headerTitle}>How This Compares</Text>
        </View>
        {showTrend && <TrendIndicator trend={trend} mealType={mealType} />}
      </View>

      {/* Comparisons List */}
      <View style={styles.comparisonsList}>
        {comparisons.map((comparison, index) => (
          <ComparisonItem key={`${comparison.metric}-${index}`} comparison={comparison} />
        ))}
      </View>

      {/* Context Footer */}
      <View style={styles.footer}>
        <Ionicons name="information-circle-outline" size={14} color={TEXT.tertiary} />
        <Text style={styles.footerText}>
          Based on your last 7 days of meals
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
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  comparisonsList: {
    gap: 10,
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    gap: 12,
  },
  comparisonIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparisonContent: {
    flex: 1,
  },
  comparisonInsight: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  comparisonContext: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  comparisonValue: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 6,
  },
  comparisonValueText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  footerText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  // Skeleton styles
  skeletonIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: SURFACES.background.tertiary,
  },
  skeletonTitle: {
    width: 130,
    height: 16,
    borderRadius: 4,
    backgroundColor: SURFACES.background.tertiary,
  },
  skeletonCard: {
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.tertiary,
  },
});

export default MealComparisonCard;
