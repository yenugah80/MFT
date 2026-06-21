/**
 * Skeleton Loader Components
 *
 * Beautiful skeleton screens with shimmer effect for better perceived performance
 * Follows iOS/Material Design skeleton UI patterns
 *
 * Design Principles:
 * - Match actual content layout
 * - Smooth shimmer animation
 * - Progressive disclosure (show structure before content)
 * - Reduce perceived wait time
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SURFACES, TEXT } from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Base Skeleton Component with Shimmer Effect
 */
export function Skeleton({ width, height, borderRadius = 8, style }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 255, 255, 0)',
            'rgba(255, 255, 255, 0.5)',
            'rgba(255, 255, 255, 0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/**
 * Analytics Dashboard Skeleton
 */
export function AnalyticsDashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Hero Section Skeleton */}
      <View style={styles.heroSkeleton}>
        <Skeleton width={60} height={60} borderRadius={30} style={{ alignSelf: 'center' }} />
        <Skeleton width={200} height={24} style={{ alignSelf: 'center', marginTop: 16 }} />
        <Skeleton width={280} height={16} style={{ alignSelf: 'center', marginTop: 8 }} />

        {/* Primary KPI */}
        <Skeleton width={100} height={48} style={{ alignSelf: 'center', marginTop: 24 }} />
        <Skeleton width={150} height={16} style={{ alignSelf: 'center', marginTop: 8 }} />

        {/* Secondary Stats */}
        <View style={styles.statsRow}>
          <Skeleton width={80} height={40} />
          <Skeleton width={1} height={40} />
          <Skeleton width={80} height={40} />
        </View>
      </View>

      {/* Time Range Selector Skeleton */}
      <View style={styles.timeRangeSkeleton}>
        <Skeleton width={60} height={36} borderRadius={8} />
        <Skeleton width={60} height={36} borderRadius={8} />
        <Skeleton width={60} height={36} borderRadius={8} />
      </View>

      {/* Tabs Skeleton */}
      <View style={styles.tabsSkeleton}>
        <Skeleton width={80} height={60} borderRadius={12} />
        <Skeleton width={80} height={60} borderRadius={12} />
        <Skeleton width={80} height={60} borderRadius={12} />
        <Skeleton width={80} height={60} borderRadius={12} />
      </View>

      {/* Content Cards Skeleton */}
      <View style={styles.contentSkeleton}>
        <Skeleton width={SCREEN_WIDTH - 32} height={180} borderRadius={16} />
        <Skeleton width={SCREEN_WIDTH - 32} height={180} borderRadius={16} />
        <Skeleton width={SCREEN_WIDTH - 32} height={150} borderRadius={16} />
      </View>
    </View>
  );
}

/**
 * Correlation Card Skeleton
 */
export function CorrelationCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconRow}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width={32} height={32} borderRadius={16} />
        </View>
        <Skeleton width={120} height={20} style={{ marginTop: 12 }} />
        <Skeleton width={80} height={14} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width="100%" height={60} borderRadius={8} style={{ marginTop: 12 }} />
      <Skeleton width={100} height={24} borderRadius={12} style={{ marginTop: 8 }} />
    </View>
  );
}

/**
 * Pattern Card Skeleton
 */
export function PatternCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={24} height={24} borderRadius={12} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width="80%" height={18} />
          <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Skeleton width="100%" height={60} style={{ marginTop: 12 }} />
      <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

/**
 * List Item Skeleton (for recommendations, etc.)
 */
export function ListItemSkeleton() {
  return (
    <View style={styles.listItem}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="90%" height={14} style={{ marginTop: 6 }} />
        <Skeleton width="50%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/**
 * Chart Skeleton
 */
export function ChartSkeleton({ height = 200 }) {
  return (
    <View style={[styles.card, { height }]}>
      <Skeleton width="40%" height={20} />
      <Skeleton width="30%" height={14} style={{ marginTop: 4 }} />
      <Skeleton width="100%" height={height - 80} borderRadius={8} style={{ marginTop: 16 }} />
      <View style={styles.legendSkeleton}>
        <Skeleton width={60} height={12} />
        <Skeleton width={60} height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}

// ============================================================================
// SMART RECOMMENDATION SKELETONS
// Premium loading states for smart recommendations
// ============================================================================

/**
 * Smart Recommendation Card Skeleton
 * Matches the exact layout of SmartRecommendationCard
 */
export function SmartRecommendationCardSkeleton() {
  return (
    <View style={styles.smartRecCard}>
      {/* Header Row */}
      <View style={styles.smartRecHeader}>
        <View style={styles.smartRecHeaderLeft}>
          <Skeleton width={28} height={20} borderRadius={6} />
          <Skeleton width={40} height={40} borderRadius={12} />
          <View style={styles.smartRecTitleArea}>
            <Skeleton width="75%" height={17} />
            <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
          </View>
        </View>
        <Skeleton width={24} height={24} borderRadius={12} />
      </View>

      {/* Explanation Box */}
      <View style={styles.smartRecExplanation}>
        <Skeleton width={14} height={14} borderRadius={7} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Skeleton width="100%" height={12} />
          <Skeleton width="70%" height={12} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Nutrient Pills */}
      <View style={styles.smartRecPills}>
        <Skeleton width={52} height={28} borderRadius={6} />
        <Skeleton width={52} height={28} borderRadius={6} />
        <Skeleton width={52} height={28} borderRadius={6} />
        <Skeleton width={52} height={28} borderRadius={6} />
      </View>

      {/* Quick Log Button */}
      <Skeleton width="100%" height={44} borderRadius={12} />
    </View>
  );
}

/**
 * Smart Summary Card Skeleton
 */
export function SmartSummaryCardSkeleton() {
  return (
    <View style={styles.smartSummaryCard}>
      {/* Headline */}
      <Skeleton width="55%" height={22} />
      <Skeleton width="75%" height={14} style={{ marginTop: 8 }} />

      {/* Status Pills Row */}
      <View style={styles.smartStatusRow}>
        <View style={styles.smartStatusPill}>
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width={60} height={14} />
        </View>
        <View style={styles.smartStatusPill}>
          <Skeleton width={16} height={16} borderRadius={8} />
          <Skeleton width={60} height={14} />
        </View>
      </View>

      {/* Priority Tags */}
      <View style={styles.smartPriorityRow}>
        <Skeleton width={55} height={13} />
        <Skeleton width={50} height={24} borderRadius={6} />
        <Skeleton width={45} height={24} borderRadius={6} />
        <Skeleton width={55} height={24} borderRadius={6} />
      </View>
    </View>
  );
}

/**
 * Full Smart Recommendations Loading State
 */
export function SmartRecommendationsLoadingSkeleton({ cardCount = 3 }) {
  return (
    <View style={styles.smartRecsContainer}>
      <SmartSummaryCardSkeleton />
      {Array.from({ length: cardCount }).map((_, idx) => (
        <SmartRecommendationCardSkeleton key={idx} />
      ))}
    </View>
  );
}

/**
 * Nutrient Progress Ring Skeleton
 */
export function NutrientRingSkeleton({ size = 80 }) {
  return (
    <View style={[styles.nutrientRingContainer, { width: size, height: size }]}>
      <Skeleton width={size} height={size} borderRadius={size / 2} />
    </View>
  );
}

/**
 * Metrics Row Skeleton for Nutrition Tab
 */
export function NutritionMetricsRowSkeleton() {
  return (
    <View style={styles.nutritionMetricsRow}>
      <View style={styles.nutritionMetricCard}>
        <Skeleton width={20} height={20} borderRadius={10} />
        <Skeleton width={50} height={24} style={{ marginTop: 8 }} />
        <Skeleton width={40} height={12} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.nutritionMetricCard}>
        <Skeleton width={20} height={20} borderRadius={10} />
        <Skeleton width={50} height={24} style={{ marginTop: 8 }} />
        <Skeleton width={40} height={12} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.nutritionMetricCard}>
        <Skeleton width={20} height={20} borderRadius={10} />
        <Skeleton width={50} height={24} style={{ marginTop: 8 }} />
        <Skeleton width={40} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

/**
 * Calorie Progress Skeleton
 */
export function CalorieProgressSkeleton() {
  return (
    <View style={styles.calorieProgressCard}>
      <Skeleton width={110} height={17} />
      <View style={styles.progressBarContainer}>
        <Skeleton width="100%" height={12} borderRadius={6} />
      </View>
      <Skeleton width={140} height={14} style={{ alignSelf: 'center' }} />
    </View>
  );
}

/**
 * Macros Section Skeleton
 */
export function MacrosSkeleton() {
  return (
    <View style={styles.macrosCard}>
      <Skeleton width={60} height={17} />
      {[1, 2, 3].map((idx) => (
        <View key={idx} style={styles.macroRowSkeleton}>
          <View style={styles.macroHeaderSkeleton}>
            <Skeleton width={55} height={14} />
            <Skeleton width={70} height={13} />
          </View>
          <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

/**
 * Complete Nutrition Tab Skeleton
 */
export function NutritionTabSkeleton() {
  return (
    <View style={styles.nutritionTabContainer}>
      <NutritionMetricsRowSkeleton />
      <CalorieProgressSkeleton />
      <MacrosSkeleton />

      {/* Smart Recommendations Header */}
      <View style={styles.smartRecsHeaderSkeleton}>
        <View style={styles.smartRecsHeaderLeft}>
          <Skeleton width={36} height={36} borderRadius={10} />
          <View style={{ marginLeft: 12 }}>
            <Skeleton width={110} height={16} />
            <Skeleton width={180} height={12} style={{ marginTop: 4 }} />
          </View>
        </View>
        <Skeleton width={20} height={20} borderRadius={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: TEXT.tertiary + '15',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: SURFACES.background,
    padding: 16,
    gap: 16,
  },
  heroSkeleton: {
    backgroundColor: SURFACES.card,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  timeRangeSkeleton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: SURFACES.card,
    padding: 4,
    borderRadius: 12,
  },
  tabsSkeleton: {
    flexDirection: 'row',
    gap: 8,
  },
  contentSkeleton: {
    gap: 12,
  },
  card: {
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 16,
  },
  cardHeader: {
    alignItems: 'flex-start',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 12,
  },
  legendSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },

  // ============================================================================
  // SMART RECOMMENDATION SKELETON STYLES
  // ============================================================================

  smartRecCard: {
    backgroundColor: SURFACES.card,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: TEXT.tertiary + '30',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  smartRecHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  smartRecHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  smartRecTitleArea: {
    flex: 1,
    marginLeft: 4,
  },
  smartRecExplanation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: TEXT.tertiary + '08',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  smartRecPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  smartSummaryCard: {
    backgroundColor: TEXT.tertiary + '08',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TEXT.tertiary + '15',
  },
  smartStatusRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  smartStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  smartPriorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  smartRecsContainer: {
    paddingTop: 8,
  },
  nutrientRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  nutritionMetricCard: {
    flex: 1,
    backgroundColor: SURFACES.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  calorieProgressCard: {
    backgroundColor: SURFACES.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressBarContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  macrosCard: {
    backgroundColor: SURFACES.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  macroRowSkeleton: {
    marginTop: 12,
  },
  macroHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionTabContainer: {
    padding: 16,
  },
  smartRecsHeaderSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACES.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  smartRecsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
});

export default {
  Skeleton,
  AnalyticsDashboardSkeleton,
  CorrelationCardSkeleton,
  PatternCardSkeleton,
  ListItemSkeleton,
  ChartSkeleton,
  SmartRecommendationCardSkeleton,
  SmartSummaryCardSkeleton,
  SmartRecommendationsLoadingSkeleton,
  NutrientRingSkeleton,
  NutritionMetricsRowSkeleton,
  CalorieProgressSkeleton,
  MacrosSkeleton,
  NutritionTabSkeleton,
};
