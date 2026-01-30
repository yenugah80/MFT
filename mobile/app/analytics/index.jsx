/**
 * Analytics Screen - Intelligence Dashboard
 *
 * Showcases the real recommendation system with:
 * - Domain-specific analytics (Nutrition, Mood, Activity, Hydration)
 * - Personalized recommendations from Day 1
 * - Cross-domain correlations and insights
 * - Evidence-anchored patterns
 * - Netflix/LinkedIn-style personalization
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useDashboard } from '../../hooks/useDashboard';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useUnifiedIntelligence } from '../../hooks/useUnifiedIntelligence';
// Intelligence components - used by domain tabs if needed
import { CorrelationCard, InsightCard } from '../../components/intelligence';

// Import domain-specific analytics tabs
import NutritionTab from '../../components/analytics/NutritionTab';
import MoodTab from '../../components/analytics/MoodTab';
import ActivityTab from '../../components/analytics/ActivityTab';
import HydrationTab from '../../components/analytics/HydrationTab';
import WellnessTab from '../../components/analytics/WellnessTab';
import AnalyticsTabBar from '../../components/analytics/AnalyticsTabBar';

import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  BRAND,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

// Period options for time filtering
const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const [activeDomain, setActiveDomain] = useState('wellness');
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('week');

  // Unified intelligence hook - single source of truth
  const {
    intelligence,
    primaryInsight,
    recommendations: intelligenceRecs,
    patterns: intelligencePatterns,
    getRecommendations,
    getPatterns,
    trackShown,
    trackCompleted,
    trackDismissed,
    recordSatisfaction,
    isLoading: intelligenceLoading,
    refetch: refetchIntelligence,
  } = useUnifiedIntelligence(period);

  // Analytics hook for domain-specific data
  const {
    nutrition,
    mood,
    activity,
    hydration,
    wellness,
    recommendations,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useAnalytics(period);

  const { data: dashboardData } = useDashboard();

  const isLoading = analyticsLoading || intelligenceLoading;
  const refetch = async () => {
    await Promise.all([refetchAnalytics(), refetchIntelligence()]);
  };

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleDomainChange = useCallback((domain) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveDomain(domain);
  }, []);

  const handlePeriodChange = useCallback((newPeriod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(newPeriod);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Combine recommendations from both sources
  const combinedRecommendations = useMemo(() => {
    return {
      wellness: [...(recommendations?.wellness || []), ...(getRecommendations('wellness') || [])],
      nutrition: [...(recommendations?.nutrition || []), ...(getRecommendations('nutrition') || [])],
      mood: [...(recommendations?.mood || []), ...(getRecommendations('mood') || [])],
      activity: [...(recommendations?.activity || []), ...(getRecommendations('activity') || [])],
      hydration: [...(recommendations?.hydration || []), ...(getRecommendations('hydration') || [])],
    };
  }, [recommendations, getRecommendations]);

  // Get patterns for the active domain
  const domainPatterns = useMemo(() => {
    return getPatterns(activeDomain);
  }, [activeDomain, getPatterns]);

  // Render domain-specific analytics with recommendations and patterns
  const renderDomainContent = () => {
    const props = {
      period,
      patterns: domainPatterns,
      primaryInsight: activeDomain === 'wellness' ? primaryInsight : null,
      // Tracking handlers for recommendation cards
      onRecommendationShown: trackShown,
      onRecommendationAction: trackCompleted,
      onRecommendationDismiss: trackDismissed,
      onRecordSatisfaction: recordSatisfaction,
    };

    switch (activeDomain) {
      case 'wellness':
        return (
          <WellnessTab
            data={wellness}
            recommendations={combinedRecommendations.wellness}
            stats={recommendations?.stats}
            {...props}
          />
        );
      case 'nutrition':
        return (
          <NutritionTab
            data={nutrition}
            recommendations={combinedRecommendations.nutrition}
            {...props}
          />
        );
      case 'mood':
        return (
          <MoodTab
            data={mood}
            recommendations={combinedRecommendations.mood}
            {...props}
          />
        );
      case 'activity':
        return (
          <ActivityTab
            data={activity}
            recommendations={combinedRecommendations.activity}
            {...props}
          />
        );
      case 'hydration':
        return (
          <HydrationTab
            data={hydration}
            recommendations={combinedRecommendations.hydration}
            {...props}
          />
        );
      default:
        return (
          <WellnessTab
            data={wellness}
            recommendations={combinedRecommendations.wellness}
            stats={recommendations?.stats}
            {...props}
          />
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Simplified Header - Always shows period picker */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={28} color={TEXT.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Insights</Text>
        <View style={styles.periodPicker}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodButton, period === p.key && styles.periodButtonActive]}
              onPress={() => handlePeriodChange(p.key)}
            >
              <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Domain Tab Bar - Always visible */}
      <AnalyticsTabBar selected={activeDomain} onSelect={handleDomainChange} />

      {/* Content */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading insights...</Text>
        </View>
      ) : (
        renderDomainContent()
      )}
    </SafeAreaView>
  );
}

// Stat Card Component
function StatCard({ icon, iconColor, value, label, onPress }) {
  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// Section Component
function Section({ title, subtitle, children, onSeeAll }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={16} color={BRAND.primary} />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

// Empty States
function EmptyState({ userContext }) {
  const daysActive = userContext?.daysActive || 0;

  return (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="analytics" size={32} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>
        {daysActive === 0 ? 'Start Your Journey' : 'Building Your Intelligence'}
      </Text>
      <Text style={styles.emptyText}>
        {daysActive === 0
          ? 'Log your first meal to start building your personal AI insights!'
          : daysActive < 2
          ? 'Come back tomorrow for your first AI insights!'
          : 'Keep logging to improve prediction accuracy.'}
      </Text>
      <View style={styles.emptyMilestones}>
        <MilestoneItem
          icon="checkmark-circle"
          label="Day 1"
          description="Start tracking"
          achieved={daysActive >= 1}
        />
        <MilestoneItem
          icon="analytics"
          label="Day 2"
          description="Predictions & Discoveries"
          achieved={daysActive >= 2}
        />
        <MilestoneItem
          icon="sparkles"
          label="Day 7+"
          description="Deep pattern analysis"
          achieved={daysActive >= 7}
        />
      </View>
    </View>
  );
}

function EmptyPatterns({ userContext }) {
  const daysActive = userContext?.daysActive || 0;
  // Unlocks from Day 2
  const UNLOCK_DAYS = 2;
  const progress = Math.min(100, Math.round((daysActive / UNLOCK_DAYS) * 100));
  const daysRemaining = Math.max(0, UNLOCK_DAYS - daysActive);

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconGradient}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
          style={styles.emptyIconBg}
        >
          <Ionicons name="git-network-outline" size={32} color="#8B5CF6" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>
        {daysActive === 0 ? 'Start Your Journey' : 'Almost There!'}
      </Text>
      <Text style={styles.emptyText}>
        {daysActive === 0
          ? 'Log your first meal to begin building your personal health patterns. Patterns unlock on Day 2!'
          : daysRemaining > 0
          ? `Just ${daysRemaining} more day until patterns are detected!`
          : 'Keep logging meals and moods to detect more patterns.'}
      </Text>
      {daysActive > 0 && daysRemaining > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{daysActive}/{UNLOCK_DAYS} days</Text>
        </View>
      )}
      <View style={styles.emptyTips}>
        <Text style={styles.tipLabel}>Tips for today:</Text>
        <Text style={styles.tipItem}>• Log 2-3 meals</Text>
        <Text style={styles.tipItem}>• Track your mood</Text>
        <Text style={styles.tipItem}>• Log water intake</Text>
      </View>
    </View>
  );
}

function EmptyPredictions({ userContext }) {
  const daysActive = userContext?.daysActive || 0;
  // Unlocks from Day 2
  const UNLOCK_DAYS = 2;
  const progress = Math.min(100, Math.round((daysActive / UNLOCK_DAYS) * 100));
  const daysRemaining = Math.max(0, UNLOCK_DAYS - daysActive);

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconGradient}>
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.05)']}
          style={styles.emptyIconBg}
        >
          <Ionicons name="trending-up-outline" size={32} color="#10B981" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>
        {daysActive === 0 ? 'AI Predictions Await' : 'Almost There!'}
      </Text>
      <Text style={styles.emptyText}>
        {daysActive === 0
          ? 'Log your first meal to start building predictions. Forecasts unlock on Day 2!'
          : daysRemaining > 0
          ? `Just ${daysRemaining} more day until AI can predict your patterns!`
          : 'Your predictions are being calculated...'}
      </Text>
      {daysActive > 0 && daysRemaining > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, styles.progressFillGreen, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{daysActive}/{UNLOCK_DAYS} days</Text>
        </View>
      )}
      <View style={styles.emptyFeatures}>
        <Text style={styles.featureLabel}>Unlocks tomorrow:</Text>
        <View style={styles.featureItem}>
          <Ionicons name="flash-outline" size={16} color="#F59E0B" />
          <Text style={styles.featureText}>Energy level predictions</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="happy-outline" size={16} color="#EC4899" />
          <Text style={styles.featureText}>Mood forecasts</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="nutrition-outline" size={16} color="#10B981" />
          <Text style={styles.featureText}>Nutrient insights</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyDiscoveries({ userContext }) {
  const daysActive = userContext?.daysActive || 0;
  // Unlocks from Day 2
  const UNLOCK_DAYS = 2;
  const progress = Math.min(100, Math.round((daysActive / UNLOCK_DAYS) * 100));
  const daysRemaining = Math.max(0, UNLOCK_DAYS - daysActive);

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconGradient}>
        <LinearGradient
          colors={['rgba(236, 72, 153, 0.15)', 'rgba(236, 72, 153, 0.05)']}
          style={styles.emptyIconBg}
        >
          <Ionicons name="sparkles-outline" size={32} color="#EC4899" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>
        {daysActive === 0 ? 'Hidden Patterns Await' : 'Almost There!'}
      </Text>
      <Text style={styles.emptyText}>
        {daysActive === 0
          ? 'Our AI will scan for surprising correlations unique to you. Discoveries unlock on Day 2!'
          : daysRemaining > 0
          ? `Just ${daysRemaining} more day until AI discovers your unique patterns!`
          : 'Scanning for novel correlations...'}
      </Text>
      {daysActive > 0 && daysRemaining > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, styles.progressFillPink, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{daysActive}/{UNLOCK_DAYS} days</Text>
        </View>
      )}
      <View style={styles.emptyExamples}>
        <Text style={styles.exampleLabel}>What you'll discover:</Text>
        <Text style={styles.exampleItem}>"Your best mood days have this in common..."</Text>
        <Text style={styles.exampleItem}>"This food pattern affects your energy"</Text>
      </View>
    </View>
  );
}

function MilestoneItem({ icon, label, description, achieved }) {
  return (
    <View style={[styles.milestoneItem, achieved && styles.milestoneAchieved]}>
      <Ionicons
        name={achieved ? icon : `${icon.replace('-circle', '')}-outline`}
        size={20}
        color={achieved ? '#10B981' : TEXT.tertiary}
      />
      <View>
        <Text style={[styles.milestoneLabel, achieved && styles.milestoneLabelAchieved]}>
          {label}
        </Text>
        <Text style={styles.milestoneDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    backgroundColor: SURFACES.card.primary,
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: SURFACES.background.tertiary,
  },
  title: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    textAlign: 'center',
    marginHorizontal: SPACING[3],
  },
  periodPicker: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: 2,
  },
  periodButton: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1.5],
    borderRadius: RADIUS.sm,
  },
  periodButtonActive: {
    backgroundColor: SURFACES.card.primary,
  },
  periodText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  periodTextActive: {
    color: TEXT.primary,
  },
  viewModeBar: {
    flexDirection: 'row',
    backgroundColor: SURFACES.card.primary,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    gap: SPACING[2],
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2.5],
    borderRadius: RADIUS.md,
    backgroundColor: SURFACES.background.tertiary,
  },
  viewModeTabActive: {
    backgroundColor: BRAND.primary,
  },
  viewModeLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  viewModeLabelActive: {
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: SURFACES.card.primary,
    paddingHorizontal: SPACING[2],
    paddingBottom: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: SURFACES.divider,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING[2],
    gap: SPACING[1],
  },
  tabActive: {},
  tabLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  tabLabelActive: {
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  scrollView: {
    flex: 1,
    padding: SPACING[4],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[4],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  statCard: {
    width: '47%',
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
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
    marginTop: SPACING[1],
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING[4],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  sectionHeader: {
    marginBottom: SPACING[4],
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
    marginTop: SPACING[0.5],
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING[8],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING[4],
  },
  emptyMilestones: {
    width: '100%',
    gap: SPACING[2],
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: SPACING[3],
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
  },
  milestoneAchieved: {
    backgroundColor: '#10B98115',
  },
  milestoneLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  milestoneLabelAchieved: {
    color: '#10B981',
  },
  milestoneDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  // Enhanced empty state styles
  emptyIconGradient: {
    marginBottom: SPACING[4],
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    width: '100%',
    marginBottom: SPACING[4],
  },
  progressBar: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING[2],
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: RADIUS.full,
  },
  progressFillGreen: {
    backgroundColor: '#10B981',
  },
  progressFillPink: {
    backgroundColor: '#EC4899',
  },
  progressText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'right',
  },
  emptyTips: {
    width: '100%',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
  },
  tipLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING[2],
  },
  tipItem: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginBottom: SPACING[1],
  },
  emptyFeatures: {
    width: '100%',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
  },
  featureLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING[2],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  featureText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  emptyExamples: {
    width: '100%',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING[3],
  },
  exampleLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING[2],
  },
  exampleItem: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontStyle: 'italic',
    marginBottom: SPACING[1],
    lineHeight: 18,
  },
  bottomPadding: {
    height: SPACING[8],
  },
});
