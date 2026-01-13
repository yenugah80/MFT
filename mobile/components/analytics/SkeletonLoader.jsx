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
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
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
});

export default {
  Skeleton,
  AnalyticsDashboardSkeleton,
  CorrelationCardSkeleton,
  PatternCardSkeleton,
  ListItemSkeleton,
  ChartSkeleton,
};
