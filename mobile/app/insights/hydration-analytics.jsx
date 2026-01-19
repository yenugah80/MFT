/**
 * Hydration Analytics Screen
 *
 * ISOLATED hydration analytics - shows ONLY hydration data:
 * - Today's hydration progress and goal tracking from useHydrationAnalytics
 * - Hydration-specific predictions from useHydrationPrediction
 * - Hydration persona based on water intake patterns
 * - Contextual tips based on current hydration state
 *
 * Cross-category data (hydration-cognition correlations) belongs in:
 * - /insights/multi-factor-analytics - Cross-category correlations
 * - /insights/predictive - Multi-factor predictions
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
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
} from '../../constants/premiumTheme';

import HalfGaugeChart from '../../components/insights/HalfGaugeChart';
import ColdStartCard from '../../components/insights/ColdStartCard';
// Note: RelatedInsights removed - this screen shows ONLY hydration data

import { useHydrationAnalytics, useHydrationPrediction } from '../../hooks/useHydrationAnalytics';
// Note: useCorrelations removed - cross-category correlations belong in /insights/multi-factor-analytics
import { useWaterLog } from '../../hooks/useWaterLog';
import { useDecisionBrainHydrationInsights } from '../../hooks/useMoodInsights';

// Responsive layout for small devices
import { getResponsiveGaugeSize, IS_SMALL_DEVICE } from '../../utils/responsiveLayout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_CONFIG = getResponsiveGaugeSize('standard');
const DEFAULT_HYDRATION_GOAL = 2000; // ml

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HydrationAnalyticsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Accessibility
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription?.remove();
  }, []);

  // Decision Brain - ML-powered insights (PRIMARY data source)
  const { data: decisionBrainData, isLoading: dbLoading, refetch: refetchDB } = useDecisionBrainHydrationInsights();

  // Existing hooks as fallback
  const {
    analytics,
    isLoading: hydrationLoading,
    error: hydrationError,
    refetch: refetchHydration,
    coldStart,
    patterns,
    persona,
  } = useHydrationAnalytics();

  const { prediction: hydrationPrediction, isLoading: predictionLoading } = useHydrationPrediction();
  const { getTodayTotal } = useWaterLog();

  const isLoading = dbLoading || hydrationLoading || predictionLoading;
  // Critical error only if both Decision Brain and hydration analytics fail
  const hasError = !!hydrationError && !decisionBrainData?.success;

  // Calculate hydration metrics - PREFER Decision Brain stats, fall back to local
  const hydrationMetrics = useMemo(() => {
    // If Decision Brain returned stats, use them (ML-enhanced)
    if (decisionBrainData?.stats && decisionBrainData.hasEnoughData) {
      const stats = decisionBrainData.stats;
      const progress = stats.todayProgress || 0;

      // Determine status
      let status;
      if (progress >= 100) {
        status = { label: 'Goal Met', color: SEMANTIC.success.base, icon: 'water' };
      } else if (progress >= 70) {
        status = { label: 'On Track', color: VIBRANT_WELLNESS.hydration.solid, icon: 'water-outline' };
      } else if (progress >= 40) {
        status = { label: 'Low', color: SEMANTIC.warning.base, icon: 'alert-circle-outline' };
      } else {
        status = { label: 'Dehydrated', color: SEMANTIC.danger.base, icon: 'warning-outline' };
      }

      return {
        todayMl: stats.todayIntake || 0,
        goalMl: stats.dailyGoal || DEFAULT_HYDRATION_GOAL,
        progress: Math.min(progress, 150),
        avgMl: stats.avgDailyIntake || 0,
        avgPercentage: stats.goalAdherence || 0,
        streak: stats.streak || 0,
        status,
        daysLogged: stats.daysLogged || 0,
        remaining: Math.abs((stats.dailyGoal || DEFAULT_HYDRATION_GOAL) - (stats.todayIntake || 0)),
        exceeded: (stats.todayIntake || 0) > (stats.dailyGoal || DEFAULT_HYDRATION_GOAL),
        trend: stats.trend || 'stable',
      };
    }

    // Fallback to local calculation
    // CRITICAL FIX: getTodayTotal returns LITERS, convert to ml for display
    const todayLiters = getTodayTotal?.() || 0;
    const todayMl = Math.round(todayLiters * 1000);
    // Goal from patterns is in liters, convert to ml (default 2000ml = 2L)
    const goalLiters = patterns?.goalMl ? patterns.goalMl / 1000 : 2.0;
    const goalMl = Math.round(goalLiters * 1000) || DEFAULT_HYDRATION_GOAL;
    const avgMl = patterns?.avgMl || 0;
    const avgPercentage = patterns?.avgPercentage || 0;
    // Calculate progress from actual values to ensure consistency
    const progress = goalMl > 0 ? (todayMl / goalMl) * 100 : 0;

    // Determine status
    let status;
    if (progress >= 100) {
      status = { label: 'Goal Met', color: SEMANTIC.success.base, icon: 'water' };
    } else if (progress >= 70) {
      status = { label: 'On Track', color: VIBRANT_WELLNESS.hydration.solid, icon: 'water-outline' };
    } else if (progress >= 40) {
      status = { label: 'Low', color: SEMANTIC.warning.base, icon: 'alert-circle-outline' };
    } else {
      status = { label: 'Dehydrated', color: SEMANTIC.danger.base, icon: 'warning-outline' };
    }

    // Calculate streak from patterns
    const streak = patterns?.streak || 0;

    // Calculate remaining or exceeded amount
    const remaining = goalMl - todayMl;
    const exceeded = remaining < 0;

    return {
      todayMl,
      goalMl,
      progress: Math.min(progress, 150),
      avgMl,
      avgPercentage,
      streak,
      status,
      daysLogged: coldStart?.distinctDays || 0,
      remaining: Math.abs(remaining),
      exceeded,
    };
  }, [getTodayTotal, patterns, coldStart, decisionBrainData]);

  // ML-powered patterns from Decision Brain
  const hydrationPatterns = useMemo(() => {
    if (decisionBrainData?.patterns?.length > 0) {
      return decisionBrainData.patterns.slice(0, 5);
    }
    return [];
  }, [decisionBrainData]);

  // ML correlations with confidence scores
  const hydrationCorrelations = useMemo(() => {
    if (decisionBrainData?.correlations?.length > 0) {
      return decisionBrainData.correlations.slice(0, 4);
    }
    return [];
  }, [decisionBrainData]);

  // ML-powered recommendations (witty copy)
  const hydrationRecommendations = useMemo(() => {
    if (decisionBrainData?.recommendations?.length > 0) {
      return decisionBrainData.recommendations.slice(0, 3);
    }
    return [];
  }, [decisionBrainData]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await Promise.all([
      refetchDB?.(),
      refetchHydration?.(),
    ]);
    setRefreshing(false);
  }, [refetchDB, refetchHydration]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleLogWater = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/(tabs)/log');
  }, [router]);

  // Cold start check - show real data if user has ANY logs, not just 7+ days
  // Backend now returns hasBasicData for users with 1+ logs
  const hasAnyData = analytics?.hasBasicData || (coldStart?.totalLogs || 0) > 0;
  const hasEnoughForPatterns = analytics?.hasEnoughForPatterns || (coldStart?.distinctDays || 0) >= 7;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Hydration Analytics',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND.primary} />}
      >
        {/* Loading State */}
        {isLoading && !analytics && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND.primary} />
            <Text style={styles.loadingText}>Loading your hydration data...</Text>
          </View>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={SEMANTIC.danger.base} />
            <Text style={styles.errorTitle}>Unable to Load Data</Text>
            <Text style={styles.errorText}>
              {hydrationError?.message || 'Please check your connection and try again.'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cold Start - Only show if user has ZERO data */}
        {!isLoading && !hasAnyData && (
          <ColdStartCard
            category="hydration"
            distinctDays={coldStart?.distinctDays || 0}
            totalLogs={coldStart?.totalLogs || 0}
            onAction={handleLogWater}
            style={styles.coldStartCard}
          />
        )}

        {/* Main Hydration Score Card */}
        <View style={[styles.heroCard, CARD_SYSTEM.hero]}>
          <LinearGradient
            colors={['#F0F9FF', '#E0F2FE', '#F0F9FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroHeader}>
              <View>
                <Text style={styles.heroTitle}>Today&apos;s Hydration</Text>
                <Text style={[styles.heroStatus, { color: hydrationMetrics.status.color }]}>
                  {hydrationMetrics.status.label}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${hydrationMetrics.status.color}15` }]}>
                <Ionicons name={hydrationMetrics.status.icon} size={20} color={hydrationMetrics.status.color} />
              </View>
            </View>

            <View style={styles.gaugeContainer}>
              <HalfGaugeChart
                value={hydrationMetrics.progress}
                maxValue={100}
                label={`${hydrationMetrics.todayMl}ml`}
                sublabel={`of ${hydrationMetrics.goalMl}ml goal`}
                size={GAUGE_CONFIG.size}
                strokeWidth={GAUGE_CONFIG.strokeWidth}
                animated={!reducedMotion}
              />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(hydrationMetrics.avgPercentage)}%</Text>
                <Text style={styles.statLabel}>avg. daily</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: SEMANTIC.success.base }]}>{hydrationMetrics.streak}</Text>
                <Text style={styles.statLabel}>day streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, hydrationMetrics.exceeded && { color: SEMANTIC.success.base }]}>
                  {hydrationMetrics.exceeded ? '+' : ''}{hydrationMetrics.remaining}ml
                </Text>
                <Text style={styles.statLabel}>{hydrationMetrics.exceeded ? 'exceeded' : 'remaining'}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Persona Card */}
        {persona && (
          <View style={[styles.personaCard, CARD_SYSTEM.standard]}>
            <View style={styles.personaHeader}>
              <View style={[styles.personaIcon, { backgroundColor: `${VIBRANT_WELLNESS.hydration.solid}15` }]}>
                <Ionicons name={persona.icon || 'water'} size={24} color={VIBRANT_WELLNESS.hydration.solid} />
              </View>
              <View style={styles.personaContent}>
                <Text style={styles.personaTitle}>{persona.title}</Text>
                <Text style={styles.personaDescription}>{persona.description}</Text>
              </View>
            </View>
            {persona.recommendation && (
              <View style={styles.personaRecommendation}>
                <Ionicons name="bulb-outline" size={14} color={BRAND.primary} />
                <Text style={styles.personaRecommendationText}>{persona.recommendation}</Text>
              </View>
            )}
          </View>
        )}

        {/* ML Patterns Section - Decision Brain detected patterns */}
        {hydrationPatterns.length > 0 && (
          <View style={[styles.patternsCard, CARD_SYSTEM.standard]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="bulb-outline" size={20} color={VIBRANT_WELLNESS.hydration.solid} />
              <Text style={styles.sectionCardTitle}>Hydration Patterns</Text>
              <View style={styles.mlBadge}>
                <Text style={styles.mlBadgeText}>ML</Text>
              </View>
            </View>
            {hydrationPatterns.map((pattern, i) => (
              <View key={i} style={styles.patternRow}>
                <View style={[styles.patternIcon, { backgroundColor: (pattern.light || `${pattern.color}15`) }]}>
                  <Ionicons name={pattern.icon || 'water'} size={18} color={pattern.color || VIBRANT_WELLNESS.hydration.solid} />
                </View>
                <View style={styles.patternContent}>
                  <Text style={[styles.patternTitle, { color: pattern.color || TEXT.primary }]}>{pattern.title}</Text>
                  <Text style={styles.patternDescription}>{pattern.description}</Text>
                  {pattern.confidence && (
                    <Text style={styles.confidenceText}>{Math.round(pattern.confidence * 100)}% confidence</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ML Correlations Section - What affects your hydration */}
        {hydrationCorrelations.length > 0 && (
          <View style={[styles.correlationsCard, CARD_SYSTEM.standard]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="git-network-outline" size={20} color={BRAND.primary} />
              <Text style={styles.sectionCardTitle}>What We Noticed</Text>
              <View style={styles.mlBadge}>
                <Text style={styles.mlBadgeText}>ML</Text>
              </View>
            </View>
            {hydrationCorrelations.map((corr, i) => (
              <View key={corr.id || i} style={styles.correlationRow}>
                <View style={[styles.correlationIcon, { backgroundColor: corr.impactType === 'positive' ? SEMANTIC.success.light : SEMANTIC.warning.light }]}>
                  <Ionicons
                    name={corr.impactType === 'positive' ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={corr.impactType === 'positive' ? SEMANTIC.success.base : SEMANTIC.warning.base}
                  />
                </View>
                <View style={styles.correlationContent}>
                  <Text style={styles.correlationStatement}>{corr.statement}</Text>
                  <View style={styles.correlationMeta}>
                    <Text style={styles.correlationConfidence}>{Math.round(corr.confidence * 100)}% confident</Text>
                  </View>
                  {corr.suggestion && (
                    <View style={styles.suggestionRow}>
                      <Ionicons name="bulb-outline" size={12} color={TEXT.tertiary} />
                      <Text style={styles.suggestionText}>{corr.suggestion}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
            <View style={styles.mlAttribution}>
              <Ionicons name="sparkles" size={12} color={TEXT.muted} />
              <Text style={styles.mlAttributionText}>Powered by ML analysis of your data</Text>
            </View>
          </View>
        )}

        {/* ML Recommendations Section - Witty personalized tips */}
        {hydrationRecommendations.length > 0 && (
          <View style={[styles.recommendationsCard, CARD_SYSTEM.standard]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="sparkles-outline" size={20} color={VIBRANT_WELLNESS.hydration.solid} />
              <Text style={styles.sectionCardTitle}>Recommendations</Text>
            </View>
            {hydrationRecommendations.map((rec, i) => (
              <View key={i} style={styles.recommendationRow}>
                <View style={[styles.recommendationIcon, { backgroundColor: `${VIBRANT_WELLNESS.hydration.solid}15` }]}>
                  <Ionicons name={rec.icon || 'water'} size={18} color={VIBRANT_WELLNESS.hydration.solid} />
                </View>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>{rec.title}</Text>
                  <Text style={styles.recommendationDescription}>{rec.description}</Text>
                  {rec.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: rec.priority === 'high' ? SEMANTIC.danger.light : SEMANTIC.info.light }]}>
                      <Text style={[styles.priorityText, { color: rec.priority === 'high' ? SEMANTIC.danger.base : SEMANTIC.info.base }]}>
                        {rec.priority === 'high' ? 'Priority' : 'Tip'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tomorrow's Prediction */}
        {hydrationPrediction && (
          <View style={[styles.predictionCard, CARD_SYSTEM.standard]}>
            <View style={styles.predictionHeader}>
              <View style={styles.predictionIcon}>
                <Ionicons name="calendar" size={20} color={VIBRANT_WELLNESS.hydration.solid} />
              </View>
              <Text style={styles.predictionTitle}>Tomorrow&apos;s Prediction</Text>
            </View>
            <Text style={styles.predictionStatement}>
              Based on your patterns, aim for {hydrationPrediction.predictedMl || hydrationMetrics.goalMl}ml tomorrow.
            </Text>
            {hydrationPrediction.factors?.length > 0 && (
              <View style={styles.predictionFactors}>
                {hydrationPrediction.factors.map((factor, idx) => (
                  <View key={idx} style={styles.factorTag}>
                    <Text style={styles.factorText}>{factor}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Hydration Tips - Context-specific based on current state */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hydration Tips</Text>
          <Text style={styles.sectionSubtitle}>Based on your patterns</Text>
        </View>

        <View style={[styles.tipsCard, CARD_SYSTEM.standard]}>
          {getHydrationTips(hydrationMetrics).map((tip, index) => (
            <View key={index} style={[styles.tipRow, index < 2 && styles.tipRowBorder]}>
              <View style={[styles.tipIcon, { backgroundColor: `${tip.color}15` }]}>
                <Ionicons name={tip.icon} size={18} color={tip.color} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Log Button */}
        <TouchableOpacity
          onPress={handleLogWater}
          style={[styles.quickLogButton, { backgroundColor: VIBRANT_WELLNESS.hydration.solid }]}
        >
          <Ionicons name="add" size={24} color={TEXT.white} />
          <Text style={styles.quickLogText}>Log Water</Text>
        </TouchableOpacity>

        {/* Empty State - Show when user has data but not enough for patterns */}
        {!isLoading && !persona && hasAnyData && !hasEnoughForPatterns && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={TEXT.tertiary} />
            <Text style={styles.emptyStateTitle}>Building Your Profile</Text>
            <Text style={styles.emptyStateText}>
              {coldStart?.distinctDays || 0}/7 days logged. Keep going to unlock persona insights and predictions.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getHydrationTips(metrics) {
  const tips = [];
  const now = new Date();
  const hour = now.getHours();

  if (hour < 10 && metrics.todayMl < 500) {
    tips.push({
      icon: 'sunny-outline',
      color: '#FBBF24',
      title: 'Morning Hydration',
      description: 'Start your day with 500ml to kickstart your metabolism.',
    });
  }

  if (metrics.progress < 50 && hour > 12) {
    tips.push({
      icon: 'water',
      color: VIBRANT_WELLNESS.hydration.solid,
      title: 'Time to Catch Up',
      description: `Drink ${Math.ceil((metrics.goalMl - metrics.todayMl) / 250)} more glasses to reach your goal.`,
    });
  }

  if (metrics.streak > 0) {
    tips.push({
      icon: 'flame',
      color: SEMANTIC.success.base,
      title: 'Keep Your Streak',
      description: `You're on a ${metrics.streak}-day streak! Don't break it.`,
    });
  }

  // Default tips if none above apply
  if (tips.length === 0) {
    tips.push(
      {
        icon: 'time-outline',
        color: '#8B5CF6',
        title: 'Consistent Sipping',
        description: 'Drink small amounts throughout the day rather than large amounts at once.',
      },
      {
        icon: 'fitness-outline',
        color: VIBRANT_WELLNESS.activity.solid,
        title: 'Active Days Need More',
        description: 'Add 500ml for every hour of moderate exercise.',
      },
      {
        icon: 'cafe-outline',
        color: '#78350F',
        title: 'Watch Caffeine',
        description: 'Coffee and tea have mild diuretic effects. Balance with extra water.',
      }
    );
  }

  return tips.slice(0, 3);
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACES.background.primary },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[10] },
  headerButton: { padding: SPACING[2] },

  // Loading
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING[10] },
  loadingText: { marginTop: SPACING[3], fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary },

  // Cold Start
  coldStartCard: { marginTop: SPACING[4] },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING[10],
    paddingHorizontal: SPACING[4],
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginTop: SPACING[4],
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    marginTop: SPACING[2],
  },
  retryButton: {
    marginTop: SPACING[4],
    backgroundColor: BRAND.primary,
    paddingHorizontal: SPACING[6],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    color: TEXT.white,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Hero Card
  heroCard: { marginTop: SPACING[4], overflow: 'hidden', padding: 0 },
  heroGradient: { padding: SPACING[4] },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  heroStatus: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, marginTop: 2 },
  statusBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  gaugeContainer: { alignItems: 'center', marginVertical: SPACING[2] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: SPACING[3], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  statLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: SURFACES.divider },

  // Persona Card
  personaCard: { marginTop: SPACING[4] },
  personaHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  personaIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  personaContent: { flex: 1 },
  personaTitle: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary, marginBottom: 4 },
  personaDescription: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, lineHeight: 20 },
  personaRecommendation: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: SURFACES.background.tertiary, padding: SPACING[2], borderRadius: RADIUS.sm, marginTop: SPACING[3], gap: SPACING[1] },
  personaRecommendationText: { flex: 1, fontSize: TYPOGRAPHY.size.xs, color: BRAND.primary, fontWeight: TYPOGRAPHY.weight.medium },

  // Prediction Card
  predictionCard: { marginTop: SPACING[4] },
  predictionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING[2] },
  predictionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${VIBRANT_WELLNESS.hydration.solid}15`, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[2] },
  predictionTitle: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  predictionStatement: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, lineHeight: 20, marginBottom: SPACING[2] },
  predictionFactors: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[1] },
  factorTag: { backgroundColor: SURFACES.background.tertiary, paddingVertical: SPACING[1], paddingHorizontal: SPACING[2], borderRadius: RADIUS.sm },
  factorText: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary },

  // Section Header
  sectionHeader: { marginTop: SPACING[6], marginBottom: SPACING[3] },
  sectionTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  sectionSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.tertiary, marginTop: 2 },

  // Tips Card
  tipsCard: { marginTop: SPACING[3] },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING[3] },
  tipRowBorder: { borderBottomWidth: 1, borderBottomColor: SURFACES.divider },
  tipIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginBottom: 2 },
  tipDescription: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary, lineHeight: 18 },

  // Quick Log Button
  quickLogButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING[4], borderRadius: RADIUS.lg, marginTop: SPACING[4], gap: SPACING[2] },
  quickLogText: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.white },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: SPACING[10] },
  emptyStateTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginTop: SPACING[3] },
  emptyStateText: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, textAlign: 'center', marginTop: SPACING[2], paddingHorizontal: SPACING[4] },

  // ML Patterns Section
  patternsCard: { marginTop: SPACING[4] },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginBottom: SPACING[3] },
  sectionCardTitle: { flex: 1, fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  mlBadge: { backgroundColor: BRAND.primaryLight, paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: RADIUS.sm },
  mlBadgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.bold, color: BRAND.primary },
  patternRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING[2], borderBottomWidth: 1, borderBottomColor: SURFACES.divider },
  patternIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  patternContent: { flex: 1 },
  patternTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold },
  patternDescription: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary, marginTop: 2, lineHeight: 16 },
  confidenceText: { fontSize: 10, color: TEXT.muted, marginTop: SPACING[1], fontStyle: 'italic' },

  // ML Correlations Section
  correlationsCard: { marginTop: SPACING[4] },
  correlationRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING[3], borderBottomWidth: 1, borderBottomColor: SURFACES.divider },
  correlationIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  correlationContent: { flex: 1 },
  correlationStatement: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: TEXT.primary, lineHeight: 20 },
  correlationMeta: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING[1] },
  correlationConfidence: { fontSize: 11, color: TEXT.tertiary },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[1], marginTop: SPACING[2], paddingTop: SPACING[2], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  suggestionText: { flex: 1, fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary, lineHeight: 16 },
  mlAttribution: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING[1], marginTop: SPACING[3], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  mlAttributionText: { fontSize: 11, color: TEXT.muted },

  // ML Recommendations Section
  recommendationsCard: { marginTop: SPACING[4] },
  recommendationRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACING[3], borderBottomWidth: 1, borderBottomColor: SURFACES.divider },
  recommendationIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  recommendationContent: { flex: 1 },
  recommendationTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  recommendationDescription: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary, marginTop: 2, lineHeight: 16 },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: RADIUS.sm, marginTop: SPACING[1] },
  priorityText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.semibold },
});
