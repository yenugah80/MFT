/**
 * Insights Index - Navigation Hub
 *
 * Central navigation point for all insight screens
 * Organized by category with visual hierarchy
 *
 * Design: Apple Health/Oura inspired with clear sections
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  CARD_SYSTEM,
  VIBRANT_WELLNESS,
  BRAND,
  SHADOWS,
} from '../../constants/premiumTheme';

// Analytics components
import DomainAnalyticsCard from '../../components/analytics/DomainAnalyticsCard';
import TimeframeSelector from '../../components/analytics/TimeframeSelector';
import PremiumCalendarStrip from '../../components/dashboard/PremiumCalendarStrip';

// Hooks for quick stats
import { useDashboard } from '../../hooks/useDashboard';
import { useHydrationAnalytics } from '../../hooks/useHydrationAnalytics';
import { useMoodTrends } from '../../hooks/useMoodInsights';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// INSIGHT CATEGORIES
// ============================================================================

// ============================================================================
// CLEAN INSIGHT SECTIONS - No duplicates, clear hierarchy
// Each category has ONE dedicated screen
// ============================================================================

const INSIGHT_SECTIONS = [
  {
    title: 'Overview',
    subtitle: 'Your complete wellness picture',
    items: [
      {
        id: 'wellness-dashboard',
        title: 'Wellness Dashboard',
        description: 'Overall health score and personalized insights',
        icon: 'analytics',
        route: '/insights/recommendations-hub',
        gradient: [BRAND.primary, BRAND.primaryLight],
        featured: true,
      },
    ],
  },
  {
    title: 'Health Analytics',
    subtitle: 'Deep dive into each category',
    items: [
      {
        id: 'nutrition',
        title: 'Nutrition Analytics',
        description: 'Calorie & macro tracking with goal progress',
        icon: 'nutrition',
        route: '/insights/food-analytics', // Uses comprehensive analytics screen
        gradient: VIBRANT_WELLNESS.nutrition.gradient,
      },
      {
        id: 'activity',
        title: 'Activity Analytics',
        description: 'CDC guidelines progress and movement patterns',
        icon: 'fitness',
        route: '/insights/activity-analytics', // Uses comprehensive analytics screen
        gradient: VIBRANT_WELLNESS.activity.gradient,
      },
      {
        id: 'hydration',
        title: 'Hydration Analytics',
        description: 'Daily water intake and hydration patterns',
        icon: 'water',
        route: '/insights/hydration-analytics', // Uses comprehensive analytics screen
        gradient: VIBRANT_WELLNESS.hydration.gradient,
      },
      {
        id: 'mood',
        title: 'Mood Analytics',
        description: 'Emotional patterns and mood trends',
        icon: 'happy',
        route: '/insights/mood',
        gradient: VIBRANT_WELLNESS.mood.gradient,
      },
    ],
  },
  {
    title: 'Correlations',
    subtitle: 'How your habits connect',
    items: [
      {
        id: 'multi-factor',
        title: 'Multi-Factor Analysis',
        description: 'Advanced correlations across all metrics',
        icon: 'git-network',
        route: '/insights/multi-factor-analytics',
        gradient: ['#3B82F6', '#60A5FA'],
      },
      {
        id: 'activity-mood',
        title: 'Activity & Mood',
        description: 'How exercise affects your emotions',
        icon: 'trending-up',
        route: '/insights/activity-mood',
        gradient: ['#10B981', '#34D399'],
      },
      {
        id: 'food-mood',
        title: 'Food & Mood',
        description: 'Diet-emotion connections',
        icon: 'restaurant',
        route: '/insights/food-mood-correlation',
        gradient: ['#F59E0B', '#FBBF24'],
      },
    ],
  },
  {
    title: 'Predictions',
    subtitle: 'Tomorrow\'s forecast',
    items: [
      {
        id: 'predictive',
        title: 'Predictive Insights',
        description: 'Energy and mood predictions based on your data',
        icon: 'sunny',
        route: '/insights/predictive',
        gradient: ['#FBBF24', '#FDE68A'],
      },
    ],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InsightsIndex() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState('weekly');

  // Data hooks for quick stats
  const { data: dashboard } = useDashboard();
  const { analytics: hydrationData } = useHydrationAnalytics();
  const { data: moodData } = useMoodTrends({ period: 'week' });
  const { analytics: activityData } = useActivityAnalytics();

  // Build quick stats data for each domain using TODAY's actual data from dashboard
  // CRITICAL FIX: Use dashboard.today.* for TODAY's data, not analytics patterns
  const todayWaterLiters = dashboard?.today?.waterIntakeLiters || 0;
  const todayWaterGlasses = Math.round(todayWaterLiters * 4); // 1 liter ≈ 4 glasses (250ml each)

  // Get today's mood from moodLogs
  const todayMoodLogs = dashboard?.today?.moodLogs || [];
  const todayMoodScore = todayMoodLogs.length > 0
    ? todayMoodLogs.reduce((sum, log) => {
        // Convert mood string to score (1-5)
        const moodScores = { sad: 1, stressed: 2, neutral: 3, calm: 4, happy: 5, energized: 5 };
        return sum + (moodScores[log.mood] || log.energyLevel || 3);
      }, 0) / todayMoodLogs.length
    : null;

  // Get today's activity directly from dashboard (preferred) or analytics
  const todayActivityMinutes = dashboard?.today?.activityMinutes > 0
    ? dashboard.today.activityMinutes
    : (activityData?.weekData?.find(d => d?.date === new Date().toISOString().split('T')[0])?.minutes || null);

  const quickStats = {
    nutrition: {
      value: dashboard?.today?.nutrition?.totalCalories || null,
      goal: dashboard?.goals?.dailyCalories || 2000,
      trend: dashboard?.trends?.caloriesTrend ? {
        direction: dashboard.trends.caloriesTrend > 0 ? 'up' : 'down',
        change: Math.abs(dashboard.trends.caloriesTrend),
      } : null,
    },
    hydration: {
      value: todayWaterLiters > 0 ? todayWaterGlasses : null, // Show glasses if we have water logged
      goal: Math.round((dashboard?.goals?.waterLiters || 2) * 4), // Convert goal to glasses
      trend: hydrationData?.patterns?.streak > 0 ? {
        direction: 'up',
        change: hydrationData.patterns.streak,
      } : null,
    },
    mood: {
      value: todayMoodScore ? Math.round(todayMoodScore * 10) / 10 : null, // Use TODAY's mood
      trend: moodData?.trend ? {
        direction: moodData.trend,
        change: moodData.change || 0,
      } : null,
    },
    activity: {
      value: todayActivityMinutes, // Use TODAY's activity minutes
      goal: 30, // Daily recommendation (150/week = ~22-30/day)
      trend: activityData?.patterns?.streak > 0 ? {
        direction: 'up',
        change: activityData.patterns.streak,
      } : null,
    },
  };

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleItemPress = useCallback((route) => {
    Haptics.selectionAsync();
    router.push(route);
  }, [router]);

  const handleDomainPress = useCallback((domain) => {
    Haptics.selectionAsync();
    const routes = {
      nutrition: '/insights/food-analytics',
      hydration: '/insights/hydration-analytics',
      mood: '/insights/mood',
      activity: '/insights/activity-analytics',
    };
    router.push(routes[domain] || '/insights');
  }, [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Insights',
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Health Insights</Text>
          <Text style={styles.headerSubtitle}>
            Discover patterns, correlations, and personalized recommendations
          </Text>
        </View>

        {/* Timeframe Selector */}
        <TimeframeSelector
          selected={timeframe}
          onSelect={setTimeframe}
          style={styles.timeframeSelector}
        />

        {/* Calendar View - Historical data at a glance */}
        <View style={styles.calendarSection}>
          <PremiumCalendarStrip
            data={dashboard?.calendarData || {}}
            currentStreak={dashboard?.gamification?.currentStreak || 0}
          />
        </View>

        {/* Quick Stats - Today's Overview */}
        <View style={styles.quickStatsSection}>
          <Text style={styles.quickStatsTitle}>Today at a Glance</Text>
          <View style={styles.quickStatsGrid}>
            <DomainAnalyticsCard
              domain="nutrition"
              data={quickStats.nutrition}
              timeframe={timeframe}
              trend={quickStats.nutrition.trend}
              goal={quickStats.nutrition.goal}
              onPress={() => handleDomainPress('nutrition')}
              compact
            />
            <DomainAnalyticsCard
              domain="hydration"
              data={quickStats.hydration}
              timeframe={timeframe}
              trend={quickStats.hydration.trend}
              goal={quickStats.hydration.goal}
              onPress={() => handleDomainPress('hydration')}
              compact
            />
            <DomainAnalyticsCard
              domain="mood"
              data={quickStats.mood}
              timeframe={timeframe}
              trend={quickStats.mood.trend}
              onPress={() => handleDomainPress('mood')}
              compact
            />
            <DomainAnalyticsCard
              domain="activity"
              data={quickStats.activity}
              timeframe={timeframe}
              trend={quickStats.activity.trend}
              goal={quickStats.activity.goal}
              onPress={() => handleDomainPress('activity')}
              compact
            />
          </View>
        </View>

        {/* Sections */}
        {INSIGHT_SECTIONS.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
            </View>

            <View style={styles.itemsContainer}>
              {section.items.map((item, index) => (
                <InsightItem
                  key={item.id}
                  item={item}
                  onPress={() => handleItemPress(item.route)}
                  isLast={index === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Insights are generated from your logged data
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// INSIGHT ITEM COMPONENT
// ============================================================================

function InsightItem({ item, onPress, isLast }) {
  if (item.featured) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.featuredItem}
        activeOpacity={0.8}
        accessibilityLabel={item.title}
        accessibilityHint={item.description}
      >
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featuredGradient}
        >
          <View style={styles.featuredIcon}>
            <Ionicons name={item.icon} size={32} color={TEXT.white} />
          </View>
          <View style={styles.featuredContent}>
            <Text style={styles.featuredTitle}>{item.title}</Text>
            <Text style={styles.featuredDescription}>{item.description}</Text>
          </View>
          <View style={styles.featuredArrow}>
            <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.item, !isLast && styles.itemBorder]}
      activeOpacity={0.7}
      accessibilityLabel={item.title}
      accessibilityHint={item.description}
    >
      <View style={[styles.itemIcon, { backgroundColor: `${item.gradient[0]}15` }]}>
        <Ionicons name={item.icon} size={22} color={item.gradient[0]} />
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemDescription} numberOfLines={1}>
          {item.description}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING[10],
  },
  headerButton: {
    padding: SPACING[2],
  },

  // Header
  header: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
    lineHeight: 22,
  },

  // Timeframe Selector
  timeframeSelector: {
    marginHorizontal: SPACING[4],
    marginTop: SPACING[3],
  },

  // Calendar Section
  calendarSection: {
    marginHorizontal: SPACING[4],
    marginTop: SPACING[4],
  },

  // Quick Stats
  quickStatsSection: {
    marginTop: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  quickStatsTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  quickStatsGrid: {
    gap: SPACING[2],
  },

  // Section
  section: {
    marginTop: SPACING[5],
  },
  sectionHeader: {
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Items Container
  itemsContainer: {
    marginHorizontal: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    ...SHADOWS.sm,
  },

  // Featured Item
  featuredItem: {
    marginBottom: SPACING[3],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  featuredGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[4],
  },
  featuredIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  featuredContent: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
    marginBottom: 4,
  },
  featuredDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  featuredArrow: {
    padding: SPACING[2],
  },

  // Regular Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: SPACING[6],
    paddingHorizontal: SPACING[4],
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    textAlign: 'center',
  },
});
