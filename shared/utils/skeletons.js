/**
 * Loading Skeleton Components
 * Premium shimmer placeholders for all loading states
 * Replaces basic ActivityIndicator for 10/10 UX
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);
const { width } = Dimensions.get('window');

/**
 * Dashboard Nutrition Card Skeleton
 * Use: Dashboard calorie ring and macros
 */
export const NutritionCardSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.header}>
      <ShimmerPlaceholder style={styles.title} />
      <ShimmerPlaceholder style={styles.subtitle} />
    </View>

    {/* Calorie Ring Placeholder */}
    <View style={styles.ringContainer}>
      <ShimmerPlaceholder style={styles.ring} />
      <View style={styles.ringCenter}>
        <ShimmerPlaceholder style={styles.calorieNumber} />
        <ShimmerPlaceholder style={styles.calorieLabel} />
      </View>
    </View>

    {/* Macros Row */}
    <View style={styles.macrosRow}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.macroItem}>
          <ShimmerPlaceholder style={styles.macroValue} />
          <ShimmerPlaceholder style={styles.macroLabel} />
        </View>
      ))}
    </View>
  </View>
);

/**
 * Food Log Entry Skeleton
 * Use: Food log list items
 */
export const FoodLogEntrySkeleton = () => (
  <View style={styles.logEntry}>
    <View style={styles.logEntryLeft}>
      <ShimmerPlaceholder style={styles.foodIcon} />
      <View style={styles.logEntryInfo}>
        <ShimmerPlaceholder style={styles.foodName} />
        <ShimmerPlaceholder style={styles.foodDetails} />
      </View>
    </View>
    <ShimmerPlaceholder style={styles.foodCalories} />
  </View>
);

/**
 * Food Log List Skeleton
 * Use: Multiple food entries loading
 */
export const FoodLogListSkeleton = ({ count = 5 }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: count }).map((_, i) => (
      <FoodLogEntrySkeleton key={i} />
    ))}
  </View>
);

/**
 * Mood Card Skeleton
 * Use: Dashboard mood tracker
 */
export const MoodCardSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.header}>
      <ShimmerPlaceholder style={styles.title} />
      <ShimmerPlaceholder style={styles.subtitle} />
    </View>

    <View style={styles.moodContent}>
      <ShimmerPlaceholder style={styles.moodEmoji} />
      <ShimmerPlaceholder style={styles.moodLabel} />
      <ShimmerPlaceholder style={styles.moodNote} />
    </View>
  </View>
);

/**
 * Hydration Card Skeleton
 * Use: Water intake tracker
 */
export const HydrationCardSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.header}>
      <ShimmerPlaceholder style={styles.title} />
      <ShimmerPlaceholder style={styles.subtitle} />
    </View>

    <View style={styles.hydrationContent}>
      <ShimmerPlaceholder style={styles.waterGlass} />
      <View style={styles.hydrationProgress}>
        <ShimmerPlaceholder style={styles.progressBar} />
        <ShimmerPlaceholder style={styles.progressText} />
      </View>
    </View>
  </View>
);

/**
 * Stats Card Skeleton
 * Use: Dashboard stats, achievements, streaks
 */
export const StatsCardSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.header}>
      <ShimmerPlaceholder style={styles.title} />
    </View>

    <View style={styles.statsGrid}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.statItem}>
          <ShimmerPlaceholder style={styles.statIcon} />
          <ShimmerPlaceholder style={styles.statValue} />
          <ShimmerPlaceholder style={styles.statLabel} />
        </View>
      ))}
    </View>
  </View>
);

/**
 * Profile Section Skeleton
 * Use: Profile page loading
 */
export const ProfileSkeleton = () => (
  <View style={styles.profileContainer}>
    {/* Avatar and Name */}
    <View style={styles.profileHeader}>
      <ShimmerPlaceholder style={styles.avatar} />
      <ShimmerPlaceholder style={styles.userName} />
      <ShimmerPlaceholder style={styles.userEmail} />
    </View>

    {/* Stats */}
    <View style={styles.profileStats}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.profileStatItem}>
          <ShimmerPlaceholder style={styles.profileStatValue} />
          <ShimmerPlaceholder style={styles.profileStatLabel} />
        </View>
      ))}
    </View>

    {/* Settings Sections */}
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={styles.settingsSection}>
        <ShimmerPlaceholder style={styles.settingsSectionTitle} />
        <ShimmerPlaceholder style={styles.settingsItem} />
      </View>
    ))}
  </View>
);

/**
 * Analysis Loading Skeleton
 * Use: AI food analysis in progress
 */
export const AnalysisLoadingSkeleton = () => (
  <View style={styles.analysisContainer}>
    <ShimmerPlaceholder style={styles.analysisTitle} />
    <ShimmerPlaceholder style={styles.analysisSubtitle} />

    <View style={styles.analysisContent}>
      <ShimmerPlaceholder style={styles.analysisImage} />
      <ShimmerPlaceholder style={styles.analysisText} />
      <ShimmerPlaceholder style={styles.analysisText} />
      <ShimmerPlaceholder style={styles.analysisText} />
    </View>
  </View>
);

/**
 * Chart Skeleton
 * Use: Nutrition charts, mood charts
 */
export const ChartSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.header}>
      <ShimmerPlaceholder style={styles.title} />
      <ShimmerPlaceholder style={styles.subtitle} />
    </View>

    <View style={styles.chartContent}>
      <ShimmerPlaceholder style={styles.chart} />
      <View style={styles.chartLegend}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.legendItem}>
            <ShimmerPlaceholder style={styles.legendDot} />
            <ShimmerPlaceholder style={styles.legendLabel} />
          </View>
        ))}
      </View>
    </View>
  </View>
);

/**
 * Generic Card Skeleton
 * Use: Any card-based content
 */
export const CardSkeleton = ({ height = 150 }) => (
  <View style={[styles.card, { height }]}>
    <ShimmerPlaceholder style={styles.cardTitle} />
    <ShimmerPlaceholder style={styles.cardContent} />
  </View>
);

/**
 * Button Skeleton
 * Use: Loading buttons
 */
export const ButtonSkeleton = ({ width = 120, height = 48 }) => (
  <ShimmerPlaceholder style={{ width, height, borderRadius: 24 }} />
);

/**
 * List Item Skeleton
 * Use: Generic list items
 */
export const ListItemSkeleton = () => (
  <View style={styles.listItem}>
    <ShimmerPlaceholder style={styles.listItemIcon} />
    <View style={styles.listItemContent}>
      <ShimmerPlaceholder style={styles.listItemTitle} />
      <ShimmerPlaceholder style={styles.listItemSubtitle} />
    </View>
    <ShimmerPlaceholder style={styles.listItemAction} />
  </View>
);

const styles = StyleSheet.create({
  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Header
  header: {
    marginBottom: 16,
  },
  title: {
    width: 150,
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitle: {
    width: 100,
    height: 16,
    borderRadius: 4,
  },

  // Calorie Ring
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  ring: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  calorieNumber: {
    width: 80,
    height: 32,
    borderRadius: 4,
    marginBottom: 8,
  },
  calorieLabel: {
    width: 60,
    height: 16,
    borderRadius: 4,
  },

  // Macros
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    width: 50,
    height: 24,
    borderRadius: 4,
    marginBottom: 6,
  },
  macroLabel: {
    width: 70,
    height: 14,
    borderRadius: 4,
  },

  // Food Log Entry
  logEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  foodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  logEntryInfo: {
    flex: 1,
  },
  foodName: {
    width: '80%',
    height: 18,
    borderRadius: 4,
    marginBottom: 6,
  },
  foodDetails: {
    width: '60%',
    height: 14,
    borderRadius: 4,
  },
  foodCalories: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },

  // List Container
  listContainer: {
    backgroundColor: '#fff',
  },

  // Mood Content
  moodContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  moodEmoji: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  moodLabel: {
    width: 100,
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  moodNote: {
    width: '80%',
    height: 16,
    borderRadius: 4,
  },

  // Hydration
  hydrationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  waterGlass: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  hydrationProgress: {
    flex: 1,
  },
  progressBar: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  progressText: {
    width: 80,
    height: 16,
    borderRadius: 4,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 8,
  },
  statValue: {
    width: 60,
    height: 24,
    borderRadius: 4,
    marginBottom: 6,
  },
  statLabel: {
    width: 80,
    height: 14,
    borderRadius: 4,
  },

  // Profile
  profileContainer: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  userName: {
    width: 150,
    height: 24,
    borderRadius: 4,
    marginBottom: 8,
  },
  userEmail: {
    width: 200,
    height: 16,
    borderRadius: 4,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    width: 50,
    height: 28,
    borderRadius: 4,
    marginBottom: 6,
  },
  profileStatLabel: {
    width: 70,
    height: 14,
    borderRadius: 4,
  },
  settingsSection: {
    marginVertical: 12,
  },
  settingsSectionTitle: {
    width: 120,
    height: 18,
    borderRadius: 4,
    marginBottom: 12,
  },
  settingsItem: {
    width: '100%',
    height: 56,
    borderRadius: 8,
  },

  // Analysis
  analysisContainer: {
    padding: 20,
    alignItems: 'center',
  },
  analysisTitle: {
    width: 200,
    height: 28,
    borderRadius: 4,
    marginBottom: 12,
  },
  analysisSubtitle: {
    width: 250,
    height: 18,
    borderRadius: 4,
    marginBottom: 24,
  },
  analysisContent: {
    width: '100%',
    alignItems: 'center',
  },
  analysisImage: {
    width: width - 80,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  analysisText: {
    width: '90%',
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
  },

  // Chart
  chartContent: {
    paddingVertical: 16,
  },
  chart: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendLabel: {
    width: 60,
    height: 14,
    borderRadius: 4,
  },

  // Generic Card
  cardTitle: {
    width: 150,
    height: 20,
    borderRadius: 4,
    marginBottom: 12,
  },
  cardContent: {
    width: '100%',
    height: 80,
    borderRadius: 8,
  },

  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    width: '70%',
    height: 18,
    borderRadius: 4,
    marginBottom: 6,
  },
  listItemSubtitle: {
    width: '50%',
    height: 14,
    borderRadius: 4,
  },
  listItemAction: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});

export default {
  NutritionCardSkeleton,
  FoodLogEntrySkeleton,
  FoodLogListSkeleton,
  MoodCardSkeleton,
  HydrationCardSkeleton,
  StatsCardSkeleton,
  ProfileSkeleton,
  AnalysisLoadingSkeleton,
  ChartSkeleton,
  CardSkeleton,
  ButtonSkeleton,
  ListItemSkeleton,
};
