/**
 * DashboardSkeleton - Premium Loading State
 * Shows app layout structure while data loads
 * Provides visual feedback during backend cold starts
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { SPACING, RADIUS } from '../../constants/designTokens';
import { SURFACES, BRAND, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';

// Shared shimmer animation hook
function useShimmer() {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  return shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.7],
  });
}

// Base skeleton element with shimmer (kept for potential future use)
// eslint-disable-next-line no-unused-vars
function SkeletonElement({ style, children }) {
  const opacity = useShimmer();

  return (
    <Animated.View style={[styles.skeletonBase, style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

// Circular skeleton (avatars, icons)
function SkeletonCircle({ size = 44 }) {
  const opacity = useShimmer();
  return (
    <Animated.View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, opacity },
      ]}
    />
  );
}

// Text line skeleton
function SkeletonLine({ width = '100%', height = 16, marginBottom = 8 }) {
  const opacity = useShimmer();
  return (
    <Animated.View
      style={[
        styles.line,
        { width, height, marginBottom, opacity },
      ]}
    />
  );
}

// Header Section Skeleton
function HeaderSkeleton() {
  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <SkeletonLine width={220} height={32} marginBottom={8} />
        <SkeletonLine width={140} height={14} marginBottom={0} />
      </View>
      <View style={styles.headerActions}>
        <SkeletonCircle size={36} />
        <SkeletonCircle size={36} />
      </View>
    </View>
  );
}

// Primary Card Skeleton (Calories Ring)
function PrimaryCardSkeleton() {
  const opacity = useShimmer();

  return (
    <Animated.View style={[styles.primaryCard, { opacity }]}>
      <View style={styles.primaryCardContent}>
        {/* Central ring placeholder */}
        <View style={styles.ringContainer}>
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <SkeletonLine width={80} height={36} marginBottom={4} />
              <SkeletonLine width={60} height={14} marginBottom={0} />
            </View>
          </View>
        </View>

        {/* Macro pills */}
        <View style={styles.macroPills}>
          <View style={styles.macroPill}>
            <SkeletonCircle size={32} />
            <SkeletonLine width={40} height={12} marginBottom={0} />
          </View>
          <View style={styles.macroPill}>
            <SkeletonCircle size={32} />
            <SkeletonLine width={40} height={12} marginBottom={0} />
          </View>
          <View style={styles.macroPill}>
            <SkeletonCircle size={32} />
            <SkeletonLine width={40} height={12} marginBottom={0} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// Budget Card Skeleton
function BudgetCardSkeleton() {
  const opacity = useShimmer();

  return (
    <Animated.View style={[styles.budgetCard, { opacity }]}>
      <View style={styles.budgetHeader}>
        <SkeletonCircle size={40} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonLine width={140} height={18} marginBottom={4} />
          <SkeletonLine width={100} height={12} marginBottom={0} />
        </View>
      </View>

      {/* Budget items */}
      <View style={styles.budgetItems}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.budgetItem}>
            <View style={styles.budgetItemLeft}>
              <SkeletonCircle size={28} />
              <SkeletonLine width={60} height={14} marginBottom={0} />
            </View>
            <SkeletonLine width={50} height={14} marginBottom={0} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// Recommendations Card Skeleton
function RecommendationsCardSkeleton() {
  const opacity = useShimmer();

  return (
    <Animated.View style={[styles.recommendationsCard, { opacity }]}>
      <View style={styles.cardHeader}>
        <SkeletonCircle size={36} />
        <SkeletonLine width={160} height={18} marginBottom={0} />
      </View>

      {/* Recommendation items */}
      <View style={styles.recommendationsList}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.recommendationItem}>
            <SkeletonCircle size={48} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonLine width="80%" height={16} marginBottom={6} />
              <SkeletonLine width="60%" height={12} marginBottom={0} />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// Section Card Skeleton (Collapsible sections)
function SectionCardSkeleton({ title }) {
  const opacity = useShimmer();

  return (
    <Animated.View style={[styles.sectionCard, { opacity }]}>
      <View style={styles.sectionHeader}>
        <SkeletonCircle size={40} />
        <SkeletonLine width={120} height={18} marginBottom={0} />
        <View style={{ flex: 1 }} />
        <SkeletonCircle size={24} />
      </View>
    </Animated.View>
  );
}

// Nutri-Score Card Skeleton
function NutriScoreCardSkeleton() {
  const opacity = useShimmer();

  return (
    <Animated.View style={[styles.nutriScoreCard, { opacity }]}>
      <View style={styles.cardHeader}>
        <SkeletonCircle size={36} />
        <SkeletonLine width={140} height={18} marginBottom={0} />
      </View>

      {/* Score badges */}
      <View style={styles.scoreRow}>
        {['A', 'B', 'C', 'D', 'E'].map((grade) => (
          <View key={grade} style={styles.scoreBadge}>
            <SkeletonLine width={32} height={32} marginBottom={0} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// Main Dashboard Skeleton Component
export default function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <HeaderSkeleton />

      {/* Primary Calories Card */}
      <PrimaryCardSkeleton />

      {/* Remaining Budget Card */}
      <BudgetCardSkeleton />

      {/* Smart Recommendations */}
      <RecommendationsCardSkeleton />

      {/* Nutri-Score Card */}
      <NutriScoreCardSkeleton />

      {/* Collapsible Sections */}
      <SectionCardSkeleton title="Nutrition" />
      <SectionCardSkeleton title="Wellness" />
      <SectionCardSkeleton title="Progress" />

      {/* Loading indicator text */}
      <View style={styles.loadingHint}>
        <View style={styles.loadingDots}>
          <LoadingDot delay={0} />
          <LoadingDot delay={200} />
          <LoadingDot delay={400} />
        </View>
      </View>
    </View>
  );
}

// Animated loading dot
function LoadingDot({ delay }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scaleAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.loadingDot,
        { transform: [{ scale: scaleAnim }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING[5],
    backgroundColor: SURFACES.background.primary,
  },

  // Base skeleton styling
  skeletonBase: {
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
    borderRadius: RADIUS.lg,
  },
  circle: {
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  line: {
    backgroundColor: `${SEMANTIC_ACTIONS.success}1A`,
    borderRadius: RADIUS.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[5],
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING[2],
  },

  // Primary Card (Calories)
  primaryCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryCardContent: {
    alignItems: 'center',
  },
  ringContainer: {
    marginBottom: SPACING[5],
  },
  ringOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: `${SEMANTIC_ACTIONS.success}26`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {
    alignItems: 'center',
  },
  macroPills: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  macroPill: {
    alignItems: 'center',
    gap: SPACING[2],
  },

  // Budget Card
  budgetCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  budgetItems: {
    gap: SPACING[3],
  },
  budgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },

  // Recommendations Card
  recommendationsCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  recommendationsList: {
    gap: SPACING[3],
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
    backgroundColor: `${SEMANTIC_ACTIONS.success}0A`,
    borderRadius: RADIUS.lg,
  },

  // Nutri-Score Card
  nutriScoreCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: `${SEMANTIC_ACTIONS.success}0F`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Cards
  sectionCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}1A`,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },

  // Loading hint
  loadingHint: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
  },
  loadingDots: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.primary,
  },
});
