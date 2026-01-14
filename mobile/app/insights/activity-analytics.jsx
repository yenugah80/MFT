/**
 * Activity Analytics Screen
 *
 * ISOLATED activity analytics - shows ONLY activity data:
 * - Weekly CDC progress and activity metrics from useActivityAnalytics
 * - Activity-specific predictions and recommendations from useActivityAnalytics
 * - Activity persona based on movement patterns
 *
 * Cross-category data (activity-mood correlations, energy predictions) belongs in:
 * - /insights/activity-mood - Activity-mood pattern analysis
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
import Svg, { Rect, Defs, LinearGradient as SvgGradient, Stop, G, Line, Circle } from 'react-native-svg';
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
// Note: RelatedInsights removed - this screen shows ONLY activity data

import { useActivityAnalytics, calculateActivityStreak } from '../../hooks/useActivityAnalytics';
// Note: useCorrelations removed - cross-category correlations belong in /insights/activity-mood

// Responsive layout for small devices
import { getResponsiveGaugeSize, IS_SMALL_DEVICE } from '../../utils/responsiveLayout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_CONFIG = getResponsiveGaugeSize('standard');
const CDC_WEEKLY_GOAL = 150; // CDC recommends 150 min/week of moderate activity

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ActivityAnalyticsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Accessibility
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => subscription?.remove();
  }, []);

  // Real data hooks - ONLY activity-specific data
  // Cross-category correlations belong in /insights/activity-mood
  const {
    analytics,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity,
    coldStart,
    persona,
    prediction: activityPrediction,
    recommendations: activityRecommendations,
    weekData,
  } = useActivityAnalytics();

  const isLoading = activityLoading;
  // Critical error if main activity data fails
  const hasError = !!activityError;

  // Calculate activity metrics from real data
  const activityMetrics = useMemo(() => {
    const data = weekData || [];
    const weeklyMinutes = data.reduce((sum, day) => sum + (day?.minutes || 0), 0);
    const cdcProgress = Math.min((weeklyMinutes / CDC_WEEKLY_GOAL) * 100, 150);
    const streak = calculateActivityStreak(data);
    const daysActive = data.filter(d => (d?.minutes || 0) > 0).length;

    // Determine status
    let status;
    if (cdcProgress >= 100) {
      status = { label: 'Goal Met', color: SEMANTIC.success.base, icon: 'trophy' };
    } else if (cdcProgress >= 70) {
      status = { label: 'On Track', color: VIBRANT_WELLNESS.activity.solid, icon: 'trending-up' };
    } else if (cdcProgress >= 40) {
      status = { label: 'Building', color: SEMANTIC.warning.base, icon: 'fitness' };
    } else {
      status = { label: 'Getting Started', color: TEXT.secondary, icon: 'walk' };
    }

    return {
      weeklyMinutes,
      cdcProgress,
      streak,
      daysActive,
      status,
      weekData: data,
    };
  }, [weekData]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await refetchActivity?.();
    setRefreshing(false);
  }, [refetchActivity]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleLogActivity = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/(tabs)/log');
  }, [router]);

  // Cold start check - show data if user has ANY activity logged
  const hasAnyData = (coldStart?.totalLogs || 0) > 0 || activityMetrics.weeklyMinutes > 0;
  const hasEnoughForPatterns = (coldStart?.distinctDays || 0) >= 7;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Activity Analytics',
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
            <Text style={styles.loadingText}>Loading your activity data...</Text>
          </View>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={SEMANTIC.danger.base} />
            <Text style={styles.errorTitle}>Unable to Load Data</Text>
            <Text style={styles.errorText}>
              {activityError?.message || 'Please check your connection and try again.'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cold Start - Only show if user has ZERO data */}
        {!isLoading && !hasAnyData && (
          <ColdStartCard
            category="activity"
            distinctDays={coldStart?.distinctDays || 0}
            totalLogs={coldStart?.totalLogs || 0}
            onAction={handleLogActivity}
            style={styles.coldStartCard}
          />
        )}

        {/* CDC Progress Card */}
        <View style={[styles.heroCard, CARD_SYSTEM.hero]}>
          <LinearGradient
            colors={SURFACES.background.gradientCool}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroHeader}>
              <View>
                <Text style={styles.heroTitle}>Weekly Activity</Text>
                <Text style={[styles.heroStatus, { color: activityMetrics.status.color }]}>
                  {activityMetrics.status.label}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${activityMetrics.status.color}15` }]}>
                <Ionicons name={activityMetrics.status.icon} size={20} color={activityMetrics.status.color} />
              </View>
            </View>

            <View style={styles.gaugeContainer}>
              <HalfGaugeChart
                value={activityMetrics.cdcProgress}
                maxValue={100}
                label={`${activityMetrics.weeklyMinutes} min`}
                sublabel={`of ${CDC_WEEKLY_GOAL} min goal`}
                size={GAUGE_CONFIG.size}
                strokeWidth={GAUGE_CONFIG.strokeWidth}
                animated={!reducedMotion}
              />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activityMetrics.daysActive}</Text>
                <Text style={styles.statLabel}>days active</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: SEMANTIC.success.base }]}>{activityMetrics.streak}</Text>
                <Text style={styles.statLabel}>day streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(activityMetrics.cdcProgress)}%</Text>
                <Text style={styles.statLabel}>of goal</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Week Chart */}
        <WeekActivityChart weekData={activityMetrics.weekData} />

        {/* Persona Card */}
        {persona && (
          <View style={[styles.personaCard, CARD_SYSTEM.standard]}>
            <View style={styles.personaHeader}>
              <View style={[styles.personaIcon, { backgroundColor: `${VIBRANT_WELLNESS.activity.solid}15` }]}>
                <Ionicons name={persona.icon || 'person'} size={24} color={VIBRANT_WELLNESS.activity.solid} />
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

        {/* Tomorrow's Activity Prediction - Activity-specific from useActivityAnalytics */}
        {activityPrediction?.hasPrediction && (
          <View style={[styles.predictionCard, CARD_SYSTEM.standard]}>
            <View style={styles.predictionHeader}>
              <View style={[styles.predictionIcon, { backgroundColor: `${SEMANTIC.info.base}15` }]}>
                <Ionicons name="calendar" size={20} color={SEMANTIC.info.base} />
              </View>
              <Text style={styles.predictionTitle}>Tomorrow&apos;s Prediction</Text>
            </View>
            <Text style={styles.predictionStatement}>
              Based on your patterns, you are likely to be active for about {activityPrediction.predictedMinutes} minutes tomorrow.
            </Text>
            {activityPrediction.factors?.length > 0 && (
              <View style={styles.predictionFactors}>
                {activityPrediction.factors.map((factor, idx) => (
                  <View key={idx} style={styles.factorTag}>
                    <Text style={styles.factorText}>{factor}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* AI Recommendations - Activity-specific from useActivityAnalytics */}
        {activityRecommendations?.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personalized Tips</Text>
              <Text style={styles.sectionSubtitle}>Based on your activity patterns</Text>
            </View>

            {activityRecommendations.slice(0, 3).map((rec, index) => (
              <View key={index} style={[styles.recommendationCard, CARD_SYSTEM.standard]}>
                <View style={styles.recommendationContent}>
                  <View style={[styles.recommendationIcon, { backgroundColor: `${VIBRANT_WELLNESS.activity.solid}15` }]}>
                    <Ionicons name={rec.icon || 'fitness'} size={24} color={VIBRANT_WELLNESS.activity.solid} />
                  </View>
                  <View style={styles.recommendationText}>
                    <Text style={styles.recommendationTitle}>{rec.title}</Text>
                    <Text style={styles.recommendationDescription} numberOfLines={2}>{rec.description}</Text>
                  </View>
                </View>
                {rec.action && (
                  <TouchableOpacity
                    onPress={handleLogActivity}
                    style={[styles.actionButton, { backgroundColor: VIBRANT_WELLNESS.activity.solid }]}
                  >
                    <Text style={styles.actionButtonText}>{rec.action}</Text>
                    <Ionicons name="arrow-forward" size={14} color={TEXT.white} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {/* Empty State - Show when user has data but not enough for patterns */}
        {!isLoading && !activityRecommendations?.length && hasAnyData && !hasEnoughForPatterns && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={TEXT.tertiary} />
            <Text style={styles.emptyStateTitle}>Building Your Profile</Text>
            <Text style={styles.emptyStateText}>
              {coldStart?.distinctDays || 0}/7 days logged. Keep going to unlock personalized activity insights.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// WEEK ACTIVITY CHART
// ============================================================================

function WeekActivityChart({ weekData }) {
  const chartWidth = SCREEN_WIDTH - SPACING[8];
  const chartHeight = 120;
  const barWidth = 32;

  const data = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    // weekData is ordered by date (oldest to newest), with proper labels
    // Use full weekday abbreviations to distinguish Tuesday (Tu) from Thursday (Th)
    return (weekData || []).map((day, index) => ({
      // Use 2-char label for Tu/Th disambiguation, 1-char for others
      label: day.label || new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' }),
      minutes: day.minutes || 0,
      // Compare actual dates, not index positions
      isToday: day.date === today,
    }));
  }, [weekData]);

  const maxValue = Math.max(60, ...data.map(d => d.minutes));

  return (
    <View style={[styles.chartCard, CARD_SYSTEM.standard]}>
      <Text style={styles.cardTitle}>This Week</Text>

      <Svg width={chartWidth} height={chartHeight + 30}>
        <Defs>
          <SvgGradient id="activityBar" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={VIBRANT_WELLNESS.activity.solid} />
            <Stop offset="100%" stopColor={`${VIBRANT_WELLNESS.activity.solid}80`} />
          </SvgGradient>
        </Defs>

        {/* Goal line - CDC recommends 150 min/week = ~21 min/day average */}
        <Line
          x1={0}
          y1={chartHeight - (21 / maxValue) * chartHeight}
          x2={chartWidth}
          y2={chartHeight - (21 / maxValue) * chartHeight}
          stroke={SEMANTIC.success.base}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.5}
        />

        {/* Bars */}
        {data.map((day, index) => {
          const barHeight = (day.minutes / maxValue) * chartHeight;
          const numBars = Math.max(data.length - 1, 1);
          const x = (index * (chartWidth - barWidth)) / numBars;
          const y = chartHeight - barHeight;
          // Goal met if at or above daily average (21 min) for CDC weekly goal
          const isGoalMet = day.minutes >= 21;

          return (
            <G key={index}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 4)}
                rx={barWidth / 2}
                fill={isGoalMet ? SEMANTIC.success.base : 'url(#activityBar)'}
                opacity={day.isToday ? 1 : 0.8}
              />
              {day.isToday && (
                <Circle cx={x + barWidth / 2} cy={y - 8} r={3} fill={BRAND.primary} />
              )}
            </G>
          );
        })}
      </Svg>

      <View style={styles.dayLabels}>
        {data.map((day, index) => (
          <Text key={index} style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
            {day.label}
          </Text>
        ))}
      </View>
    </View>
  );
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

  // Chart Card
  chartCard: { marginTop: SPACING[4] },
  cardTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginBottom: SPACING[3] },
  dayLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING[1], marginTop: -20 },
  dayLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, width: 32, textAlign: 'center' },
  dayLabelToday: { color: BRAND.primary, fontWeight: TYPOGRAPHY.weight.bold },

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
  predictionIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${VIBRANT_WELLNESS.activity.solid}15`, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[2] },
  predictionTitle: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  predictionStatement: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, lineHeight: 20, marginBottom: SPACING[2] },
  predictionSuggestion: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: SURFACES.background.tertiary, padding: SPACING[2], borderRadius: RADIUS.sm, gap: SPACING[1] },
  predictionSuggestionText: { flex: 1, fontSize: TYPOGRAPHY.size.xs, color: BRAND.primary, fontWeight: TYPOGRAPHY.weight.medium },
  predictionFactors: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[1], marginTop: SPACING[2] },
  factorTag: { backgroundColor: SURFACES.background.tertiary, paddingVertical: SPACING[1], paddingHorizontal: SPACING[2], borderRadius: RADIUS.sm },
  factorText: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary },

  // Section Header
  sectionHeader: { marginTop: SPACING[6], marginBottom: SPACING[3] },
  sectionTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  sectionSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.tertiary, marginTop: 2 },

  // Recommendation Card
  recommendationCard: { marginTop: SPACING[3] },
  recommendationContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING[3] },
  recommendationIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING[3] },
  recommendationText: { flex: 1 },
  recommendationTitle: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginBottom: 2 },
  recommendationDescription: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, lineHeight: 20 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING[2], paddingHorizontal: SPACING[4], borderRadius: RADIUS.md, gap: SPACING[1] },
  actionButtonText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.white },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: SPACING[10] },
  emptyStateTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginTop: SPACING[3] },
  emptyStateText: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, textAlign: 'center', marginTop: SPACING[2], paddingHorizontal: SPACING[4] },
});
