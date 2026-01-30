/**
 * Recommendations Hub - Comprehensive Analytics & Insights Screen
 *
 * Design Principles:
 * - Half-gauge charts for visual progress indicators
 * - WCAG 2.1 AA compliant color contrast (4.5:1 minimum)
 * - Progressive disclosure (summary → details)
 * - Cross-linking to related insight screens
 * - Cold start handling with encouraging onboarding
 * - Evidence-based recommendations with research citations
 *
 * Research Backing:
 * - JMIR 2024: 7 engagement themes (personalization, reinforcement, etc.)
 * - Oura Ring: Today/Vitals/My Health navigation pattern
 * - Apple Health: Calm luxury aesthetic
 *
 * Features:
 * - Multi-factor health score with half-gauge visualization
 * - Category breakdowns (nutrition, activity, hydration, mood)
 * - AI-powered recommendations
 * - Correlation insights
 * - Action cards with one-tap logging
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Share,
  AccessibilityInfo,
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
  SEMANTIC,
  BRAND,
  SHADOWS,
} from '../../constants/premiumTheme';

// Components
import HalfGaugeChart, { MiniHalfGauge, ComparisonGauge } from '../../components/insights/HalfGaugeChart';
import ColdStartCard from '../../components/insights/ColdStartCard';
import PersonaCard from '../../components/insights/PersonaCard';
import InsightFeedback, { InlineFeedback } from '../../components/insights/InsightFeedback';
import { CompactReminder } from '../../components/analytics/ReminderNotification';
import MissingDataBanner from '../../components/analytics/MissingDataBanner';

// Hooks
import { useDashboard } from '../../hooks/useDashboard';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';
import { useHydrationAnalytics } from '../../hooks/useHydrationAnalytics';
import { useMoodTrends } from '../../hooks/useMoodInsights';
import { useRecommendations, useRecommendationHistory } from '../../hooks/useRecommendations';
import { useSmartReminders } from '../../hooks/useSmartReminders';
import { useDataAvailability } from '../../hooks/useUnifiedAnalytics';

// Responsive layout for small devices
import { getResponsiveGaugeSize, IS_SMALL_DEVICE, getHorizontalPadding } from '../../utils/responsiveLayout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_GAUGE = getResponsiveGaugeSize('hero');
const MINI_GAUGE = getResponsiveGaugeSize('mini');

// ============================================================================
// CATEGORY CONFIGURATIONS
// ============================================================================

const CATEGORIES = [
  {
    id: 'nutrition',
    label: 'Nutrition',
    icon: 'nutrition',
    color: VIBRANT_WELLNESS.nutrition.solid,
    gradient: VIBRANT_WELLNESS.nutrition.gradient,
    route: '/insights/nutrition',
    description: 'Track your macro balance',
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: 'fitness',
    color: VIBRANT_WELLNESS.activity.solid,
    gradient: VIBRANT_WELLNESS.activity.gradient,
    route: '/insights/activity',
    description: 'Monitor your movement',
  },
  {
    id: 'hydration',
    label: 'Hydration',
    icon: 'water',
    color: VIBRANT_WELLNESS.hydration.solid,
    gradient: VIBRANT_WELLNESS.hydration.gradient,
    route: '/insights/hydration',
    description: 'Stay well hydrated',
  },
  {
    id: 'mood',
    label: 'Mood',
    icon: 'happy',
    color: VIBRANT_WELLNESS.mood.solid,
    gradient: VIBRANT_WELLNESS.mood.gradient,
    route: '/insights/mood',
    description: 'Understand your emotions',
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RecommendationsHub() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    );
    return () => subscription?.remove();
  }, []);

  // Data hooks
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboard();
  const { analytics: activityData, refetch: refetchActivity } = useActivityAnalytics();
  const { analytics: hydrationData, refetch: refetchHydration } = useHydrationAnalytics();
  const { data: moodData, refetch: refetchMood } = useMoodTrends({ period: 'week' });

  // AI-powered recommendations from backend
  const {
    recommendations: aiRecommendations,
    loading: aiLoading,
    fetchRecommendations: refetchAI,
    trackInteraction,
    acceptRecommendation,
    rejectRecommendation,
  } = useRecommendations({ enabled: true });

  // Recommendation history and stats
  const {
    stats: recommendationStats,
    loading: statsLoading,
    fetchHistory: refetchStats,
  } = useRecommendationHistory();

  // Smart reminders
  const {
    reminders,
    reminderCount,
    dismissReminder,
    snoozeReminder,
    refetch: refetchReminders,
  } = useSmartReminders();

  // Data availability for missing data banner
  const { data: dataAvailability } = useDataAvailability();

  // Calculate overall wellness score
  const wellnessScore = useMemo(() => {
    const scores = [];

    // Nutrition score (based on goal adherence)
    if (dashboardData?.caloriesConsumed && dashboardData?.caloriesBudget) {
      const nutritionRatio = Math.min(dashboardData.caloriesConsumed / dashboardData.caloriesBudget, 1);
      scores.push({ category: 'nutrition', score: nutritionRatio * 100, weight: 0.3 });
    }

    // Activity score (based on CDC target)
    if (activityData?.patterns?.cdcProgress !== undefined) {
      scores.push({ category: 'activity', score: Math.min(activityData.patterns.cdcProgress * 100, 100), weight: 0.25 });
    }

    // Hydration score
    if (hydrationData?.patterns?.avgPercentage !== undefined) {
      scores.push({ category: 'hydration', score: Math.min(hydrationData.patterns.avgPercentage, 100), weight: 0.25 });
    }

    // Mood score (normalized to 100)
    if (moodData?.averageScore !== undefined) {
      scores.push({ category: 'mood', score: (moodData.averageScore / 10) * 100, weight: 0.2 });
    }

    if (scores.length === 0) return null;

    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    const weightedScore = scores.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;

    return {
      overall: Math.round(weightedScore),
      breakdown: scores,
      hasEnoughData: scores.length >= 2,
    };
  }, [dashboardData, activityData, hydrationData, moodData]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);

    await Promise.all([
      refetchDashboard?.(),
      refetchActivity?.(),
      refetchHydration?.(),
      refetchMood?.(),
      refetchAI?.(),
      refetchStats?.(),
      refetchReminders?.(),
    ]);

    setRefreshing(false);
  }, [refetchDashboard, refetchActivity, refetchHydration, refetchMood, refetchAI, refetchStats]);

  // Handle share
  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const message = wellnessScore
      ? `My wellness score is ${wellnessScore.overall}/100 today!\n\nTracked with MyFoodTracker`
      : 'Building my wellness journey with MyFoodTracker!';

    try {
      await Share.share({ message });
    } catch (error) {
      console.error('[RecommendationsHub] Share error:', error);
    }
  }, [wellnessScore]);

  // Handle category navigation
  const handleCategoryPress = useCallback((category) => {
    Haptics.selectionAsync();
    router.push(category.route);
  }, [router]);

  // Handle back
  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  // Check if we have enough data
  const hasData = wellnessScore?.hasEnoughData;
  const distinctDays = activityData?.coldStart?.distinctDays || 0;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Insights Hub',
          headerStyle: { backgroundColor: SURFACES.background.primary },
          headerTintColor: TEXT.primary,
          headerTitleStyle: { fontWeight: TYPOGRAPHY.weight.semibold },
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
          headerRight: () => (
            <TouchableOpacity
              onPress={handleShare}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Share insights"
            >
              <Ionicons name="share-outline" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        ref={scrollRef}
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
        {/* Cold Start Check */}
        {!hasData && (
          <ColdStartCard
            category="patterns"
            distinctDays={distinctDays}
            totalLogs={activityData?.coldStart?.totalLogs || 0}
            onAction={() => router.push('/(tabs)/log')}
            style={styles.coldStartCard}
          />
        )}

        {/* Smart Reminders - Friendly nudges */}
        {reminders && reminders.length > 0 && (
          <View style={styles.remindersSection}>
            {reminders.slice(0, 2).map((reminder, index) => (
              <CompactReminder
                key={reminder.id || index}
                reminder={reminder}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/(tabs)/log');
                }}
                onDismiss={(type) => dismissReminder({ reminderType: type, reason: 'dismissed' })}
              />
            ))}
          </View>
        )}

        {/* Missing Data Banner - Shows when there are gaps */}
        {dataAvailability?.gaps && dataAvailability.gaps.length > 0 && (
          <MissingDataBanner
            gaps={dataAvailability.gaps}
            severity={dataAvailability.gaps.length > 3 ? 'warning' : 'info'}
            onLogNow={() => router.push('/(tabs)/log')}
            compact
          />
        )}

        {/* Main Wellness Score Card */}
        <WellnessScoreCard
          score={wellnessScore}
          reducedMotion={reducedMotion}
          style={styles.heroCard}
        />

        {/* Period Selector */}
        <PeriodSelector
          selected={selectedPeriod}
          onSelect={setSelectedPeriod}
          style={styles.periodSelector}
        />

        {/* Category Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          <Text style={styles.sectionSubtitle}>Tap to explore details</Text>
        </View>

        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              score={getCategoryScore(category.id, wellnessScore)}
              onPress={() => handleCategoryPress(category)}
            />
          ))}
        </View>

        {/* Your Progress Stats - Warm, encouraging tone */}
        {recommendationStats && (
          <AcceptanceStatsCard
            stats={recommendationStats}
            loading={statsLoading}
            style={styles.statsCard}
          />
        )}

        {/* AI-Powered Recommendations */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Just for You</Text>
              <Text style={styles.sectionSubtitle}>Personalized to your unique patterns</Text>
            </View>
            {aiRecommendations?.length > 0 && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={BRAND.primary} />
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            )}
          </View>
        </View>

        {/* AI Recommendations with Micronutrients & Preference Strength */}
        <AIRecommendationsSection
          recommendations={aiRecommendations}
          loading={aiLoading}
          onAccept={acceptRecommendation}
          onReject={rejectRecommendation}
          onAction={(rec) => {
            Haptics.selectionAsync();
            trackInteraction(rec.id, 'view');
            router.push('/recommendations');
          }}
        />

        {/* Pattern-Based Quick Wins */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Wins</Text>
          <Text style={styles.sectionSubtitle}>Small steps, big impact</Text>
        </View>

        <RecommendationsSection
          dashboardData={dashboardData}
          activityData={activityData}
          hydrationData={hydrationData}
          moodData={moodData}
          onAction={(action) => {
            Haptics.selectionAsync();
            if (action.route) router.push(action.route);
          }}
        />

        {/* Correlation Insights */}
        {hasData && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pattern Insights</Text>
              <Text style={styles.sectionSubtitle}>Connections we've discovered</Text>
            </View>

            <CorrelationInsights
              activityData={activityData}
              moodData={moodData}
              hydrationData={hydrationData}
            />
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <QuickActionsRow router={router} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Insights powered by AI and research-backed algorithms
          </Text>
          <Text style={styles.footerSubtext}>
            Based on CDC guidelines and peer-reviewed studies
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// WELLNESS SCORE CARD
// ============================================================================

function WellnessScoreCard({ score, reducedMotion, style }) {
  const hasScore = score?.overall !== undefined;

  // Get status based on score
  const getStatus = () => {
    if (!hasScore) return { label: 'Building...', color: TEXT.tertiary };
    if (score.overall >= 80) return { label: 'Excellent', color: SEMANTIC.success.base };
    if (score.overall >= 60) return { label: 'Good', color: VIBRANT_WELLNESS.activity.solid };
    if (score.overall >= 40) return { label: 'Fair', color: SEMANTIC.warning.base };
    return { label: 'Needs Focus', color: SEMANTIC.danger.base };
  };

  const status = getStatus();

  return (
    <View style={[styles.heroContainer, CARD_SYSTEM.hero, style]}>
      <LinearGradient
        colors={SURFACES.background.gradientWarm}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        {/* Header */}
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroTitle}>Wellness Score</Text>
            <Text style={[styles.heroStatus, { color: status.color }]}>{status.label}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
            <Ionicons
              name={hasScore && score.overall >= 60 ? 'trending-up' : 'analytics'}
              size={16}
              color={status.color}
            />
          </View>
        </View>

        {/* Main Gauge */}
        <View style={styles.gaugeContainer}>
          <HalfGaugeChart
            value={hasScore ? score.overall : 0}
            maxValue={100}
            label={hasScore ? 'Overall Score' : 'Log more to unlock'}
            size={HERO_GAUGE.size}
            strokeWidth={HERO_GAUGE.strokeWidth}
            showTicks={true}
            tickCount={5}
            animated={!reducedMotion}
          />
        </View>

        {/* Breakdown Mini Gauges */}
        {hasScore && score.breakdown.length > 0 && (
          <View style={styles.breakdownRow}>
            {score.breakdown.map((item) => {
              const category = CATEGORIES.find((c) => c.id === item.category);
              return (
                <View key={item.category} style={styles.miniGaugeContainer}>
                  <MiniHalfGauge
                    value={item.score}
                    maxValue={100}
                    size={60}
                    strokeWidth={6}
                    color={category?.color}
                    gradient={category?.gradient}
                    label={category?.label || item.category}
                  />
                </View>
              );
            })}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

// ============================================================================
// PERIOD SELECTOR
// ============================================================================

const PERIODS = [
  { value: 7, label: '7D' },
  { value: 14, label: '14D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
];

function PeriodSelector({ selected, onSelect, style }) {
  return (
    <View style={[styles.periodContainer, style]}>
      {PERIODS.map((period) => (
        <TouchableOpacity
          key={period.value}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(period.value);
          }}
          style={[
            styles.periodButton,
            selected === period.value && styles.periodButtonActive,
          ]}
          accessibilityLabel={`${period.value} day view`}
          accessibilityState={{ selected: selected === period.value }}
        >
          <Text
            style={[
              styles.periodText,
              selected === period.value && styles.periodTextActive,
            ]}
          >
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// CATEGORY CARD
// ============================================================================

function CategoryCard({ category, score, onPress }) {
  const hasScore = score !== null && score !== undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.categoryCard, CARD_SYSTEM.compact]}
      activeOpacity={0.7}
      accessibilityLabel={`${category.label}: ${hasScore ? `${Math.round(score)}%` : 'No data'}`}
      accessibilityHint="Tap to view detailed insights"
    >
      <LinearGradient
        colors={[`${category.color}10`, `${category.color}05`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.categoryGradient}
      >
        {/* Icon */}
        <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}>
          <Ionicons name={category.icon} size={24} color={category.color} />
        </View>

        {/* Mini Gauge */}
        <MiniHalfGauge
          value={hasScore ? score : 0}
          maxValue={100}
          size={70}
          strokeWidth={6}
          color={category.color}
          gradient={category.gradient}
        />

        {/* Label */}
        <Text style={styles.categoryLabel}>{category.label}</Text>
        <Text style={styles.categoryDescription}>{category.description}</Text>

        {/* Arrow */}
        <View style={styles.categoryArrow}>
          <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ============================================================================
// ACCEPTANCE STATS CARD - Warm, Encouraging Tone
// ============================================================================

function AcceptanceStatsCard({ stats, loading, style }) {
  if (loading) {
    return (
      <View style={[styles.statsContainer, CARD_SYSTEM.compact, style]}>
        <Text style={styles.statsLoading}>Loading your progress...</Text>
      </View>
    );
  }

  if (!stats || Object.keys(stats).length === 0) {
    return null;
  }

  // Calculate acceptance rate with encouraging messaging
  const total = (stats.accepted || 0) + (stats.rejected || 0) + (stats.viewed || 0);
  const acceptanceRate = total > 0 ? Math.round((stats.accepted / total) * 100) : 0;

  // Determine encouraging message based on rate
  const getMessage = () => {
    if (total === 0) return { text: "Let's start your journey!", icon: 'rocket', color: BRAND.primary };
    if (acceptanceRate >= 70) return { text: 'Amazing progress!', icon: 'trophy', color: SEMANTIC.success.base };
    if (acceptanceRate >= 50) return { text: 'Great momentum!', icon: 'trending-up', color: VIBRANT_WELLNESS.activity.solid };
    if (acceptanceRate >= 30) return { text: 'Building habits!', icon: 'fitness', color: VIBRANT_WELLNESS.hydration.solid };
    return { text: 'Every step counts!', icon: 'heart', color: VIBRANT_WELLNESS.mood.solid };
  };

  const message = getMessage();

  return (
    <View style={[styles.statsContainer, CARD_SYSTEM.compact, style]}>
      <LinearGradient
        colors={[`${message.color}08`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsGradient}
      >
        {/* Header with encouraging icon */}
        <View style={styles.statsHeader}>
          <View style={[styles.statsIconContainer, { backgroundColor: `${message.color}15` }]}>
            <Ionicons name={message.icon} size={20} color={message.color} />
          </View>
          <View style={styles.statsHeaderText}>
            <Text style={[styles.statsMessage, { color: message.color }]}>{message.text}</Text>
            <Text style={styles.statsSubtext}>Your recommendation journey</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.accepted || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Suggested</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: message.color }]}>{acceptanceRate}%</Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.statsProgressContainer}>
          <View style={styles.statsProgressBar}>
            <View
              style={[
                styles.statsProgressFill,
                { width: `${acceptanceRate}%`, backgroundColor: message.color },
              ]}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

// ============================================================================
// AI RECOMMENDATIONS SECTION - Premium, Personalized Experience
// ============================================================================

function AIRecommendationsSection({ recommendations, loading, onAccept, onReject, onAction }) {
  if (loading) {
    return (
      <View style={styles.aiLoadingContainer}>
        <View style={styles.aiLoadingIcon}>
          <Ionicons name="sparkles" size={24} color={BRAND.primary} />
        </View>
        <Text style={styles.aiLoadingText}>Crafting your personalized recommendations...</Text>
        <Text style={styles.aiLoadingSubtext}>Analyzing your unique patterns</Text>
      </View>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <View style={[styles.aiEmptyContainer, CARD_SYSTEM.compact]}>
        <LinearGradient
          colors={[`${BRAND.primary}08`, 'transparent']}
          style={styles.aiEmptyGradient}
        >
          <Ionicons name="leaf-outline" size={40} color={BRAND.primary} />
          <Text style={styles.aiEmptyTitle}>Growing Your Insights</Text>
          <Text style={styles.aiEmptyText}>
            Keep logging your meals and activities. The more we learn about you, the more personalized your recommendations become.
          </Text>
          <View style={styles.aiEmptyProgress}>
            <View style={styles.aiEmptyProgressDot} />
            <View style={[styles.aiEmptyProgressDot, styles.aiEmptyProgressDotActive]} />
            <View style={styles.aiEmptyProgressDot} />
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.aiRecommendationsContainer}>
      {recommendations.slice(0, 3).map((rec, index) => (
        <AIRecommendationCard
          key={rec.id || index}
          recommendation={rec}
          onAccept={() => onAccept(rec)}
          onReject={() => onReject(rec.id, 'not_interested')}
          onPress={() => onAction(rec)}
          isHighlight={index === 0}
        />
      ))}

      {recommendations.length > 3 && (
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => onAction(recommendations[0])}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>View all {recommendations.length} recommendations</Text>
          <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// AI RECOMMENDATION CARD - With Micronutrients & Preference Strength
// ============================================================================

function AIRecommendationCard({ recommendation, onAccept, onReject, onPress, isHighlight }) {
  const rec = recommendation;

  // Extract data with fallbacks
  const confidence = Math.round((rec.confidence || 0.7) * 100);
  const preferenceStrength = rec.preferenceStrengthMatch || rec.preferenceStrength || 3;
  const micros = rec.micros || rec.micronutrients || {};

  // Get preference strength label with warm tone
  const getPreferenceLabel = (strength) => {
    if (strength >= 5) return { text: 'Perfect match', color: SEMANTIC.success.base };
    if (strength >= 4) return { text: 'Great fit', color: VIBRANT_WELLNESS.activity.solid };
    if (strength >= 3) return { text: 'Good choice', color: VIBRANT_WELLNESS.hydration.solid };
    if (strength >= 2) return { text: 'Worth trying', color: BRAND.primary };
    return { text: 'New discovery', color: TEXT.secondary };
  };

  const prefLabel = getPreferenceLabel(preferenceStrength);

  // Extract significant micronutrients (>10% DV)
  const significantMicros = Object.entries(micros)
    .filter(([key, value]) => {
      const numValue = typeof value === 'object' ? value.percentDV : value;
      return numValue && numValue >= 10;
    })
    .slice(0, 3)
    .map(([key, value]) => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: typeof value === 'object' ? value.percentDV : value,
    }));

  // Get meal type color
  const getMealColor = () => {
    const type = rec.mealType || rec.type || 'snack';
    const colors = {
      breakfast: VIBRANT_WELLNESS.nutrition.solid,
      lunch: VIBRANT_WELLNESS.activity.solid,
      dinner: VIBRANT_WELLNESS.mood.solid,
      snack: VIBRANT_WELLNESS.hydration.solid,
    };
    return colors[type.toLowerCase()] || BRAND.primary;
  };

  const mealColor = getMealColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.aiCard,
        CARD_SYSTEM.standard,
        isHighlight && styles.aiCardHighlight,
      ]}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={isHighlight ? [`${mealColor}12`, `${mealColor}04`] : [SURFACES.card.primary, SURFACES.card.primary]}
        style={styles.aiCardGradient}
      >
        {/* Header Row */}
        <View style={styles.aiCardHeader}>
          <View style={[styles.aiCardIcon, { backgroundColor: `${mealColor}15` }]}>
            <Ionicons
              name={rec.type === 'hydration' ? 'water' : 'nutrition'}
              size={22}
              color={mealColor}
            />
          </View>

          <View style={styles.aiCardHeaderContent}>
            <Text style={styles.aiCardTitle} numberOfLines={1}>
              {rec.title || rec.foodName || rec.name || 'Recommendation'}
            </Text>
            <View style={styles.aiCardMeta}>
              {/* Preference Strength Badge */}
              <View style={[styles.prefBadge, { backgroundColor: `${prefLabel.color}12` }]}>
                <Ionicons name="heart" size={10} color={prefLabel.color} />
                <Text style={[styles.prefBadgeText, { color: prefLabel.color }]}>
                  {prefLabel.text}
                </Text>
              </View>

              {/* Confidence */}
              <View style={styles.confidenceBadge}>
                <Ionicons name="shield-checkmark" size={10} color={TEXT.tertiary} />
                <Text style={styles.confidenceText}>{confidence}%</Text>
              </View>
            </View>
          </View>

          {isHighlight && (
            <View style={styles.highlightBadge}>
              <Ionicons name="star" size={12} color="#FFB800" />
            </View>
          )}
        </View>

        {/* Why this recommendation - Warm, explanatory tone */}
        {(rec.reason || rec.why) && (
          <Text style={styles.aiCardReason} numberOfLines={2}>
            {rec.reason || rec.why}
          </Text>
        )}

        {/* Nutrition Quick View */}
        <View style={styles.nutritionRow}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{rec.calories || 0}</Text>
            <Text style={styles.nutritionLabel}>cal</Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{rec.protein || 0}g</Text>
            <Text style={styles.nutritionLabel}>protein</Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{rec.carbs || 0}g</Text>
            <Text style={styles.nutritionLabel}>carbs</Text>
          </View>
          <View style={styles.nutritionDivider} />
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{rec.fats || 0}g</Text>
            <Text style={styles.nutritionLabel}>fat</Text>
          </View>
        </View>

        {/* Micronutrients - Show if significant */}
        {significantMicros.length > 0 && (
          <View style={styles.microsContainer}>
            <Text style={styles.microsLabel}>Key nutrients:</Text>
            <View style={styles.microsRow}>
              {significantMicros.map((micro, idx) => (
                <View key={idx} style={styles.microBadge}>
                  <Text style={styles.microName}>{micro.name}</Text>
                  <Text style={styles.microValue}>{micro.value}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.aiCardActions}>
          <TouchableOpacity
            onPress={onReject}
            style={styles.rejectButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={TEXT.tertiary} />
            <Text style={styles.rejectText}>Not now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onAccept}
            style={[styles.acceptButton, { backgroundColor: mealColor }]}
          >
            <Text style={styles.acceptText}>Add to Log</Text>
            <Ionicons name="add-circle" size={16} color={TEXT.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ============================================================================
// RECOMMENDATIONS SECTION (Pattern-based Quick Wins)
// ============================================================================

function RecommendationsSection({ dashboardData, activityData, hydrationData, moodData, onAction }) {
  // Generate smart recommendations based on data
  const recommendations = useMemo(() => {
    const recs = [];

    // Hydration recommendation
    if (hydrationData?.patterns?.avgPercentage < 80) {
      recs.push({
        id: 'hydration-boost',
        icon: 'water',
        color: VIBRANT_WELLNESS.hydration.solid,
        gradient: VIBRANT_WELLNESS.hydration.gradient,
        title: 'Boost Your Hydration',
        description: 'You\'re at ' + Math.round(hydrationData.patterns.avgPercentage || 0) + '% of your daily goal. Staying hydrated improves focus and energy.',
        action: 'Log Water',
        route: '/(tabs)/log',
        priority: 1,
      });
    }

    // Activity recommendation
    if (activityData?.patterns?.cdcProgress < 1) {
      recs.push({
        id: 'activity-reminder',
        icon: 'fitness',
        color: VIBRANT_WELLNESS.activity.solid,
        gradient: VIBRANT_WELLNESS.activity.gradient,
        title: 'Move More Today',
        description: `You're at ${Math.round((activityData?.patterns?.cdcProgress || 0) * 100)}% of CDC's recommended 150 min/week. Even a 10-minute walk helps!`,
        action: 'Log Activity',
        route: '/(tabs)/log',
        priority: 2,
      });
    }

    // Nutrition recommendation
    if (dashboardData?.caloriesRemaining > 500) {
      recs.push({
        id: 'nutrition-reminder',
        icon: 'nutrition',
        color: VIBRANT_WELLNESS.nutrition.solid,
        gradient: VIBRANT_WELLNESS.nutrition.gradient,
        title: 'Fuel Your Body',
        description: `You have ${dashboardData.caloriesRemaining} calories remaining. A balanced meal now supports your energy levels.`,
        action: 'Log Food',
        route: '/(tabs)/log',
        priority: 3,
      });
    }

    // Mood check-in
    const lastMoodHours = moodData?.lastLoggedAt
      ? (new Date() - new Date(moodData.lastLoggedAt)) / (1000 * 60 * 60)
      : 24;

    if (lastMoodHours > 8) {
      recs.push({
        id: 'mood-checkin',
        icon: 'happy',
        color: VIBRANT_WELLNESS.mood.solid,
        gradient: VIBRANT_WELLNESS.mood.gradient,
        title: 'How Are You Feeling?',
        description: 'Regular mood tracking helps identify patterns. It only takes a moment!',
        action: 'Log Mood',
        route: '/(tabs)/log',
        priority: 4,
      });
    }

    // Default encouragement if no specific recommendations
    if (recs.length === 0) {
      recs.push({
        id: 'keep-going',
        icon: 'trophy',
        color: SEMANTIC.success.base,
        gradient: ['#10B981', '#34D399'],
        title: 'Great Progress!',
        description: 'You\'re on track with your wellness goals. Keep up the excellent work!',
        action: 'View Details',
        route: '/insights/patterns',
        priority: 5,
      });
    }

    return recs.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [dashboardData, activityData, hydrationData, moodData]);

  return (
    <View style={styles.recommendationsContainer}>
      {recommendations.map((rec, index) => (
        <RecommendationCard
          key={rec.id}
          recommendation={rec}
          onAction={() => onAction(rec)}
          isFirst={index === 0}
        />
      ))}
    </View>
  );
}

function RecommendationCard({ recommendation, onAction, isFirst }) {
  return (
    <TouchableOpacity
      onPress={onAction}
      style={[
        styles.recommendationCard,
        CARD_SYSTEM.standard,
        isFirst && styles.recommendationCardFirst,
      ]}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[`${recommendation.color}08`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.recommendationGradient}
      >
        <View style={styles.recommendationContent}>
          <View style={[styles.recommendationIcon, { backgroundColor: `${recommendation.color}15` }]}>
            <Ionicons name={recommendation.icon} size={24} color={recommendation.color} />
          </View>
          <View style={styles.recommendationText}>
            <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
            <Text style={styles.recommendationDescription} numberOfLines={2}>
              {recommendation.description}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onAction}
          style={[styles.recommendationAction, { backgroundColor: recommendation.color }]}
        >
          <Text style={styles.recommendationActionText}>{recommendation.action}</Text>
          <Ionicons name="arrow-forward" size={14} color={TEXT.white} />
        </TouchableOpacity>

        {/* Inline Feedback */}
        <InlineFeedback
          onHelpful={() => console.log('Helpful:', recommendation.id)}
          onNotHelpful={() => console.log('Not helpful:', recommendation.id)}
          style={styles.recommendationFeedback}
        />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ============================================================================
// CORRELATION INSIGHTS
// ============================================================================

function CorrelationInsights({ activityData, moodData, hydrationData }) {
  // Extract correlations
  const correlations = useMemo(() => {
    const items = [];

    // Activity-Mood correlation
    if (activityData?.correlations?.activityMood) {
      const corr = activityData.correlations.activityMood;
      items.push({
        id: 'activity-mood',
        icon1: 'fitness',
        icon2: 'happy',
        color1: VIBRANT_WELLNESS.activity.solid,
        color2: VIBRANT_WELLNESS.mood.solid,
        strength: Math.abs(corr),
        direction: corr > 0 ? 'positive' : 'negative',
        label: 'Activity & Mood',
        description: corr > 0
          ? 'More activity correlates with better mood'
          : 'Activity may be affecting your mood negatively',
      });
    }

    // Hydration-Focus correlation
    if (hydrationData?.correlations?.hydrationFocus) {
      const corr = hydrationData.correlations.hydrationFocus;
      items.push({
        id: 'hydration-focus',
        icon1: 'water',
        icon2: 'bulb',
        color1: VIBRANT_WELLNESS.hydration.solid,
        color2: BRAND.primary,
        strength: Math.abs(corr),
        direction: corr > 0 ? 'positive' : 'negative',
        label: 'Hydration & Focus',
        description: 'Better hydration supports cognitive performance',
      });
    }

    return items;
  }, [activityData, moodData, hydrationData]);

  if (correlations.length === 0) {
    return (
      <View style={[styles.emptyCorrelations, CARD_SYSTEM.compact]}>
        <Ionicons name="analytics-outline" size={32} color={TEXT.tertiary} />
        <Text style={styles.emptyCorrelationsText}>
          Keep tracking to discover your unique patterns
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.correlationsContainer}>
      {correlations.map((corr) => (
        <View key={corr.id} style={[styles.correlationCard, CARD_SYSTEM.compact]}>
          <View style={styles.correlationIcons}>
            <View style={[styles.correlationIcon, { backgroundColor: `${corr.color1}15` }]}>
              <Ionicons name={corr.icon1} size={18} color={corr.color1} />
            </View>
            <Ionicons
              name={corr.direction === 'positive' ? 'link' : 'unlink'}
              size={14}
              color={corr.direction === 'positive' ? SEMANTIC.success.base : SEMANTIC.warning.base}
            />
            <View style={[styles.correlationIcon, { backgroundColor: `${corr.color2}15` }]}>
              <Ionicons name={corr.icon2} size={18} color={corr.color2} />
            </View>
          </View>

          <View style={styles.correlationContent}>
            <Text style={styles.correlationLabel}>{corr.label}</Text>
            <View style={styles.correlationStrengthBar}>
              <View
                style={[
                  styles.correlationStrengthFill,
                  {
                    width: `${corr.strength * 100}%`,
                    backgroundColor: corr.direction === 'positive' ? SEMANTIC.success.base : SEMANTIC.warning.base,
                  },
                ]}
              />
            </View>
            <Text style={styles.correlationDescription}>{corr.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

function QuickActionsRow({ router }) {
  const actions = [
    { icon: 'nutrition', label: 'Food', route: '/(tabs)/log', color: VIBRANT_WELLNESS.nutrition.solid },
    { icon: 'water', label: 'Water', route: '/(tabs)/log', color: VIBRANT_WELLNESS.hydration.solid },
    { icon: 'fitness', label: 'Activity', route: '/(tabs)/log', color: VIBRANT_WELLNESS.activity.solid },
    { icon: 'happy', label: 'Mood', route: '/(tabs)/log', color: VIBRANT_WELLNESS.mood.solid },
  ];

  return (
    <View style={styles.quickActionsContainer}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          onPress={() => {
            Haptics.selectionAsync();
            router.push(action.route);
          }}
          style={styles.quickAction}
          accessibilityLabel={`Log ${action.label}`}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
            <Ionicons name={action.icon} size={24} color={action.color} />
          </View>
          <Text style={styles.quickActionLabel}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryScore(categoryId, wellnessScore) {
  if (!wellnessScore?.breakdown) return null;
  const item = wellnessScore.breakdown.find((b) => b.category === categoryId);
  return item?.score ?? null;
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
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[10],
  },
  headerButton: {
    padding: SPACING[2],
  },
  coldStartCard: {
    marginTop: SPACING[4],
  },
  remindersSection: {
    marginTop: SPACING[3],
    gap: SPACING[2],
    marginHorizontal: -SPACING[4], // Extend to full width
  },

  // Hero Card
  heroContainer: {
    marginTop: SPACING[4],
    overflow: 'hidden',
    padding: 0,
  },
  heroGradient: {
    padding: SPACING[4],
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[2],
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  heroStatus: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    marginTop: 2,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeContainer: {
    alignItems: 'center',
    marginVertical: SPACING[2],
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  miniGaugeContainer: {
    alignItems: 'center',
  },

  // Period Selector
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.lg,
    padding: SPACING[1],
    marginTop: SPACING[4],
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  periodButtonActive: {
    backgroundColor: SURFACES.card.primary,
    ...SHADOWS.sm,
  },
  periodText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  periodTextActive: {
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Section Headers
  sectionHeader: {
    marginTop: SPACING[6],
    marginBottom: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  categoryCard: {
    width: (SCREEN_WIDTH - SPACING[4] * 2 - SPACING[3]) / 2,
    padding: 0,
    overflow: 'hidden',
  },
  categoryGradient: {
    padding: SPACING[3],
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  categoryLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginTop: SPACING[2],
  },
  categoryDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: 2,
  },
  categoryArrow: {
    position: 'absolute',
    top: SPACING[2],
    right: SPACING[2],
  },

  // Recommendations
  recommendationsContainer: {
    gap: SPACING[3],
  },
  recommendationCard: {
    padding: 0,
    overflow: 'hidden',
  },
  recommendationCardFirst: {
    borderWidth: 2,
    borderColor: BRAND.primary + '30',
  },
  recommendationGradient: {
    padding: SPACING[4],
  },
  recommendationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING[3],
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  recommendationText: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  recommendationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
    gap: SPACING[1],
  },
  recommendationActionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },
  recommendationFeedback: {
    position: 'absolute',
    top: SPACING[3],
    right: SPACING[3],
  },

  // Correlations
  correlationsContainer: {
    gap: SPACING[3],
  },
  emptyCorrelations: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[6],
  },
  emptyCorrelationsText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: SPACING[2],
  },
  correlationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
  },
  correlationIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginRight: SPACING[3],
  },
  correlationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  correlationContent: {
    flex: 1,
  },
  correlationLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  correlationStrengthBar: {
    height: 4,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  correlationStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  correlationDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    ...SHADOWS.sm,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  quickActionLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: SPACING[8],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  footerSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: 2,
  },

  // Section Header Row (with badge)
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${BRAND.primary}10`,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },

  // Acceptance Stats Card
  statsCard: {
    marginTop: SPACING[4],
  },
  statsContainer: {
    padding: 0,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: SPACING[4],
  },
  statsLoading: {
    padding: SPACING[4],
    textAlign: 'center',
    color: TEXT.tertiary,
    fontSize: TYPOGRAPHY.size.sm,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  statsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  statsHeaderText: {
    flex: 1,
  },
  statsMessage: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  statsSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.divider,
  },
  statsProgressContainer: {
    marginTop: SPACING[2],
  },
  statsProgressBar: {
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  statsProgressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // AI Recommendations Section
  aiLoadingContainer: {
    alignItems: 'center',
    padding: SPACING[6],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    ...SHADOWS.sm,
  },
  aiLoadingIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${BRAND.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  aiLoadingText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    textAlign: 'center',
  },
  aiLoadingSubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  aiEmptyContainer: {
    padding: 0,
    overflow: 'hidden',
  },
  aiEmptyGradient: {
    alignItems: 'center',
    padding: SPACING[6],
  },
  aiEmptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginTop: SPACING[3],
    marginBottom: SPACING[2],
  },
  aiEmptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING[2],
  },
  aiEmptyProgress: {
    flexDirection: 'row',
    marginTop: SPACING[4],
    gap: SPACING[2],
  },
  aiEmptyProgressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: `${BRAND.primary}20`,
  },
  aiEmptyProgressDotActive: {
    backgroundColor: BRAND.primary,
  },
  aiRecommendationsContainer: {
    gap: SPACING[3],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[3],
    gap: SPACING[2],
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: BRAND.primary,
  },

  // AI Recommendation Card
  aiCard: {
    padding: 0,
    overflow: 'hidden',
  },
  aiCardHighlight: {
    borderWidth: 2,
    borderColor: `${BRAND.primary}30`,
  },
  aiCardGradient: {
    padding: SPACING[4],
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  aiCardHeaderContent: {
    flex: 1,
  },
  aiCardTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  aiCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  prefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  prefBadgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  confidenceText: {
    fontSize: 10,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  highlightBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFB80015',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCardReason: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 18,
    marginTop: SPACING[3],
    marginBottom: SPACING[3],
  },
  nutritionRow: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.md,
    padding: SPACING[2],
    marginBottom: SPACING[3],
  },
  nutritionItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  nutritionLabel: {
    fontSize: 9,
    color: TEXT.tertiary,
    marginTop: 1,
  },
  nutritionDivider: {
    width: 1,
    backgroundColor: SURFACES.divider,
    marginHorizontal: SPACING[1],
  },
  microsContainer: {
    marginBottom: SPACING[3],
  },
  microsLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginBottom: SPACING[1],
  },
  microsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  microBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${SEMANTIC.success.base}10`,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  microName: {
    fontSize: 10,
    color: SEMANTIC.success.base,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  microValue: {
    fontSize: 10,
    color: SEMANTIC.success.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  aiCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: SPACING[2],
  },
  rejectText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    gap: SPACING[1],
  },
  acceptText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },
});
