/**
 * Food Analytics Screen
 *
 * ISOLATED nutrition analytics - shows ONLY food/nutrition data:
 * - Nutrition balance score and macro tracking from useDashboard
 * - AI food recommendations from useRecommendations
 *
 * Cross-category data (food-mood correlations, predictions) belongs in:
 * - /insights/food-mood-correlation - Food-mood pattern analysis
 * - /insights/multi-factor-analytics - Cross-category correlations
 * - /insights/predictive - Predictions based on multiple factors
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
  MACRO_COLORS,
} from '../../constants/premiumTheme';

import HalfGaugeChart, { MiniHalfGauge } from '../../components/insights/HalfGaugeChart';
import ColdStartCard from '../../components/insights/ColdStartCard';
// Note: RelatedInsights removed - this screen shows ONLY nutrition data

import { useDashboard } from '../../hooks/useDashboard';
// Note: useCorrelations removed - cross-category correlations belong in /insights/food-mood-correlation
import { useRecommendations } from '../../hooks/useRecommendations';
import { useDecisionBrainNutritionInsights } from '../../hooks/useMoodInsights';

// Responsive layout for small devices
import { getResponsiveGaugeSize, IS_SMALL_DEVICE, getHorizontalPadding } from '../../utils/responsiveLayout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_CONFIG = getResponsiveGaugeSize('standard');

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FoodAnalyticsScreen() {
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
  const { data: decisionBrainData, isLoading: dbLoading, refetch: refetchDB } = useDecisionBrainNutritionInsights();

  // Dashboard as fallback for basic metrics
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useDashboard();
  const { recommendations, isLoading: recsLoading, refetch: refetchRecs, acceptRecommendation } = useRecommendations();

  const isLoading = dbLoading || dashboardLoading || recsLoading;
  // Critical error only if both Decision Brain and dashboard fail
  const hasError = !!dashboardError && !decisionBrainData?.success;

  // Calculate nutrition metrics - PREFER Decision Brain stats, fall back to dashboard
  const nutritionMetrics = useMemo(() => {
    // If Decision Brain returned stats, use them (ML-enhanced)
    if (decisionBrainData?.stats && decisionBrainData.hasEnoughData) {
      const stats = decisionBrainData.stats;
      return {
        calories: {
          consumed: stats.todayCalories || 0,
          budget: stats.calorieGoal || 2000,
          remaining: (stats.calorieGoal || 2000) - (stats.todayCalories || 0),
          isOverBudget: (stats.todayCalories || 0) > (stats.calorieGoal || 2000),
          progress: stats.calorieGoalAdherence || 0,
        },
        macros: {
          protein: { consumed: stats.todayProtein || 0, goal: stats.proteinGoal || 120, progress: stats.proteinProgress || 0 },
          carbs: { consumed: stats.todayCarbs || 0, goal: stats.carbsGoal || 250, progress: stats.carbsProgress || 0 },
          fat: { consumed: stats.todayFat || 0, goal: stats.fatGoal || 65, progress: stats.fatProgress || 0 },
        },
        balanceScore: stats.nutritionScore || 50,
        mealsToday: stats.mealsToday || 0,
        totalMealsLogged: stats.totalMealsLogged || 0,
        totalDaysWithLogs: stats.totalDaysWithLogs || 0,
        trend: stats.trend || 'stable',
        avgCalories: stats.avgCalories || 0,
      };
    }

    // Fallback to dashboard data
    if (!dashboard) return null;

    // Extract data from correct dashboard structure
    const todayNutrition = dashboard.today?.nutrition || {};
    const goals = dashboard.goals || {};
    const userLifecycle = dashboard.userLifecycle || {};

    // Use goals if available, otherwise defaults
    const caloriesBudget = goals.dailyCalories || 2000;
    const proteinGoal = goals.proteinG || 120;
    const carbsGoal = goals.carbsG || 250;
    const fatGoal = goals.fatsG || 65;

    // Get consumed from today's nutrition summary
    const caloriesConsumed = todayNutrition.totalCalories || 0;
    const proteinConsumed = todayNutrition.totalProtein || 0;
    const carbsConsumed = todayNutrition.totalCarbs || 0;
    const fatConsumed = todayNutrition.totalFats || 0;

    // Allow negative remaining to show "over budget" - don't clamp to 0
    const caloriesRemaining = caloriesBudget - caloriesConsumed;
    const isOverBudget = caloriesRemaining < 0;

    // Calculate actual percentages - don't cap for display, cap only for gauge visual
    const proteinProgress = proteinGoal > 0 ? (proteinConsumed / proteinGoal) * 100 : 0;
    const carbsProgress = carbsGoal > 0 ? (carbsConsumed / carbsGoal) * 100 : 0;
    const fatProgress = fatGoal > 0 ? (fatConsumed / fatGoal) * 100 : 0;

    // Calculate balance score based on how close each macro is to 100%
    const getScore = (progress) => {
      if (progress >= 80 && progress <= 120) return 100;
      if (progress >= 60 && progress <= 140) return 80;
      if (progress >= 40 && progress <= 160) return 60;
      return 40;
    };
    const balanceScore = Math.round((getScore(proteinProgress) + getScore(carbsProgress) + getScore(fatProgress)) / 3);

    // Get meal counts from correct locations
    const mealsToday = dashboard.today?.foodLogs?.length || 0;
    const totalMealsLogged = userLifecycle.totalMealsLogged || 0;
    const totalDaysWithLogs = userLifecycle.totalDaysWithLogs || 0;

    return {
      calories: {
        consumed: caloriesConsumed,
        budget: caloriesBudget,
        remaining: caloriesRemaining,
        isOverBudget,
        progress: caloriesBudget > 0 ? (caloriesConsumed / caloriesBudget) * 100 : 0,
      },
      macros: {
        protein: { consumed: proteinConsumed, goal: proteinGoal, progress: proteinProgress },
        carbs: { consumed: carbsConsumed, goal: carbsGoal, progress: carbsProgress },
        fat: { consumed: fatConsumed, goal: fatGoal, progress: fatProgress },
      },
      balanceScore,
      mealsToday,
      totalMealsLogged,
      totalDaysWithLogs,
    };
  }, [dashboard, decisionBrainData]);

  // Recommendations - PREFER Decision Brain witty recommendations, fall back to AI recs
  const foodRecommendations = useMemo(() => {
    // Decision Brain returns witty, personalized recommendations
    if (decisionBrainData?.recommendations?.length > 0) {
      return decisionBrainData.recommendations.slice(0, 3);
    }
    if (!recommendations) return [];
    return recommendations.slice(0, 3);
  }, [recommendations, decisionBrainData]);

  // ML-powered patterns from Decision Brain
  const nutritionPatterns = useMemo(() => {
    if (decisionBrainData?.patterns?.length > 0) {
      return decisionBrainData.patterns.slice(0, 5);
    }
    return [];
  }, [decisionBrainData]);

  // ML correlations with confidence scores
  const nutritionCorrelations = useMemo(() => {
    if (decisionBrainData?.correlations?.length > 0) {
      return decisionBrainData.correlations.slice(0, 4);
    }
    return [];
  }, [decisionBrainData]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await Promise.all([
      refetchDB?.(),
      refetchDashboard?.(),
      refetchRecs?.(),
    ]);
    setRefreshing(false);
  }, [refetchDB, refetchDashboard, refetchRecs]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  const handleAcceptRecommendation = useCallback(async (rec) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await acceptRecommendation?.(rec);
    } catch (error) {
      console.error('Failed to accept recommendation:', error);
    }
  }, [acceptRecommendation]);

  // Cold start check - show real data if user has ANY logged meals
  // Only show cold start screen for users with zero food history
  const hasAnyData = (
    (nutritionMetrics?.totalMealsLogged || 0) > 0 ||
    (nutritionMetrics?.mealsToday || 0) > 0
  );

  // Enough data for AI recommendations and advanced insights (7+ days)
  const hasEnoughForInsights = (
    (foodRecommendations?.length || 0) > 0 ||
    (nutritionMetrics?.totalDaysWithLogs || 0) >= 7
  );

  // Get status based on balance score
  const getStatus = (score) => {
    if (score >= 80) return { label: 'Excellent', color: SEMANTIC.success.base };
    if (score >= 60) return { label: 'Good', color: VIBRANT_WELLNESS.nutrition.solid };
    if (score >= 40) return { label: 'Fair', color: SEMANTIC.warning.base };
    return { label: 'Needs Focus', color: SEMANTIC.danger.base };
  };

  const status = getStatus(nutritionMetrics?.balanceScore || 0);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Food Analytics',
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
        {isLoading && !nutritionMetrics && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND.primary} />
            <Text style={styles.loadingText}>Loading your nutrition data...</Text>
          </View>
        )}

        {/* Error State */}
        {hasError && !isLoading && (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={SEMANTIC.danger.base} />
            <Text style={styles.errorTitle}>Unable to Load Data</Text>
            <Text style={styles.errorText}>
              {dashboardError?.message || 'Please check your connection and try again.'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cold Start - Only show if user has ZERO logged meals */}
        {!isLoading && !hasAnyData && (
          <ColdStartCard
            category="nutrition"
            distinctDays={nutritionMetrics?.totalDaysWithLogs || 0}
            totalLogs={nutritionMetrics?.totalMealsLogged || 0}
            onAction={() => router.push('/(tabs)/log')}
            style={styles.coldStartCard}
          />
        )}

        {/* Main Nutrition Score Card */}
        {nutritionMetrics && (
          <View style={[styles.heroCard, CARD_SYSTEM.hero]}>
            <LinearGradient
              colors={SURFACES.background.gradientWarm}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroHeader}>
                <View>
                  <Text style={styles.heroTitle}>Nutrition Balance</Text>
                  <Text style={[styles.heroStatus, { color: status.color }]}>{status.label}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
                  <Ionicons name="nutrition" size={20} color={status.color} />
                </View>
              </View>

              <View style={styles.gaugeContainer}>
                <HalfGaugeChart
                  value={nutritionMetrics.balanceScore}
                  maxValue={100}
                  label="Balance Score"
                  sublabel={`${nutritionMetrics.calories.consumed} / ${nutritionMetrics.calories.budget} cal`}
                  size={GAUGE_CONFIG.size}
                  strokeWidth={GAUGE_CONFIG.strokeWidth}
                  animated={!reducedMotion}
                />
              </View>

              <View style={styles.calorieRow}>
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{nutritionMetrics.calories.consumed}</Text>
                  <Text style={styles.calorieLabel}>consumed</Text>
                </View>
                <View style={styles.calorieDivider} />
                <View style={styles.calorieItem}>
                  <Text style={[
                    styles.calorieValue,
                    { color: nutritionMetrics.calories.isOverBudget ? SEMANTIC.danger.base : SEMANTIC.success.base }
                  ]}>
                    {nutritionMetrics.calories.isOverBudget
                      ? `+${Math.abs(nutritionMetrics.calories.remaining)}`
                      : nutritionMetrics.calories.remaining}
                  </Text>
                  <Text style={styles.calorieLabel}>
                    {nutritionMetrics.calories.isOverBudget ? 'over' : 'remaining'}
                  </Text>
                </View>
                <View style={styles.calorieDivider} />
                <View style={styles.calorieItem}>
                  <Text style={styles.calorieValue}>{nutritionMetrics.calories.budget}</Text>
                  <Text style={styles.calorieLabel}>budget</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Macro Breakdown */}
        {nutritionMetrics && (
          <View style={[styles.macroCard, CARD_SYSTEM.standard]}>
            <Text style={styles.cardTitle}>Macro Breakdown</Text>
            <View style={styles.macroGauges}>
              {[
                { key: 'protein', label: 'Protein', ...nutritionMetrics.macros.protein, color: MACRO_COLORS.protein.base },
                { key: 'carbs', label: 'Carbs', ...nutritionMetrics.macros.carbs, color: MACRO_COLORS.carbs.base },
                { key: 'fat', label: 'Fat', ...nutritionMetrics.macros.fat, color: MACRO_COLORS.fat.base },
              ].map((macro) => (
                <View key={macro.key} style={styles.macroGaugeItem}>
                  <MiniHalfGauge
                    value={macro.progress}
                    maxValue={100}
                    size={80}
                    strokeWidth={8}
                    color={macro.color}
                  />
                  <Text style={styles.macroLabel}>{macro.label}</Text>
                  <Text style={styles.macroValue}>
                    {Math.round(macro.consumed)}<Text style={styles.macroUnit}>/{macro.goal}g</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ML Patterns Section - Decision Brain detected patterns */}
        {nutritionPatterns.length > 0 && (
          <View style={[styles.patternsCard, CARD_SYSTEM.standard]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="bulb-outline" size={20} color={VIBRANT_WELLNESS.nutrition.solid} />
              <Text style={styles.cardTitle}>Nutrition Patterns</Text>
              <View style={styles.mlBadge}>
                <Text style={styles.mlBadgeText}>ML</Text>
              </View>
            </View>
            {nutritionPatterns.map((pattern, i) => (
              <View key={i} style={styles.patternRow}>
                <View style={[styles.patternIcon, { backgroundColor: (pattern.light || `${pattern.color}15`) }]}>
                  <Ionicons name={pattern.icon || 'nutrition'} size={18} color={pattern.color || VIBRANT_WELLNESS.nutrition.solid} />
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

        {/* ML Correlations Section - What affects your nutrition */}
        {nutritionCorrelations.length > 0 && (
          <View style={[styles.correlationsCard, CARD_SYSTEM.standard]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="git-network-outline" size={20} color={BRAND.primary} />
              <Text style={styles.cardTitle}>What We Noticed</Text>
              <View style={styles.mlBadge}>
                <Text style={styles.mlBadgeText}>ML</Text>
              </View>
            </View>
            {nutritionCorrelations.map((corr, i) => (
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

        {/* AI Food Recommendations */}
        {foodRecommendations.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{decisionBrainData?.recommendations?.length > 0 ? 'Recommendations' : 'AI Recommendations'}</Text>
              <Text style={styles.sectionSubtitle}>Personalized for your goals</Text>
            </View>

            {foodRecommendations.map((rec, index) => (
              <View key={rec.id || index} style={[styles.recommendationCard, CARD_SYSTEM.standard]}>
                <View style={styles.recommendationContent}>
                  <View style={[styles.recommendationIcon, { backgroundColor: `${VIBRANT_WELLNESS.nutrition.solid}15` }]}>
                    <Ionicons name={rec.icon || 'restaurant'} size={24} color={VIBRANT_WELLNESS.nutrition.solid} />
                  </View>
                  <View style={styles.recommendationText}>
                    <Text style={styles.recommendationTitle}>{rec.name || rec.title}</Text>
                    <Text style={styles.recommendationDescription} numberOfLines={2}>
                      {rec.reason || rec.description}
                    </Text>
                    {rec.calories && (
                      <Text style={styles.recommendationMacros}>
                        {rec.calories} cal • {rec.protein}g protein
                      </Text>
                    )}
                    {rec.priority && (
                      <View style={[styles.priorityBadge, { backgroundColor: rec.priority === 'high' ? SEMANTIC.danger.light : SEMANTIC.info.light }]}>
                        <Text style={[styles.priorityText, { color: rec.priority === 'high' ? SEMANTIC.danger.base : SEMANTIC.info.base }]}>
                          {rec.priority === 'high' ? 'Priority' : 'Tip'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {!decisionBrainData?.recommendations?.length && (
                  <TouchableOpacity
                    onPress={() => handleAcceptRecommendation(rec)}
                    style={[styles.actionButton, { backgroundColor: VIBRANT_WELLNESS.nutrition.solid }]}
                  >
                    <Text style={styles.actionButtonText}>Add to Log</Text>
                    <Ionicons name="add" size={16} color={TEXT.white} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {/* Empty State - Show when user has data but not enough for AI recommendations */}
        {!isLoading && foodRecommendations.length === 0 && hasAnyData && !hasEnoughForInsights && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={TEXT.tertiary} />
            <Text style={styles.emptyStateTitle}>Building Your Profile</Text>
            <Text style={styles.emptyStateText}>
              {nutritionMetrics?.totalDaysWithLogs || 0}/7 days logged. Keep going to unlock AI-powered recommendations.
            </Text>
          </View>
        )}
      </ScrollView>
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
  calorieRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: SPACING[3], paddingTop: SPACING[3], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  calorieItem: { alignItems: 'center' },
  calorieValue: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  calorieLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 2 },
  calorieDivider: { width: 1, height: 40, backgroundColor: SURFACES.divider },

  // Macro Card
  macroCard: { marginTop: SPACING[4] },
  cardTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginBottom: SPACING[3] },
  macroGauges: { flexDirection: 'row', justifyContent: 'space-around' },
  macroGaugeItem: { alignItems: 'center' },
  macroLabel: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginTop: SPACING[1] },
  macroValue: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary },
  macroUnit: { color: TEXT.tertiary },

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
  recommendationMacros: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 4 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING[2], paddingHorizontal: SPACING[4], borderRadius: RADIUS.md, gap: SPACING[1] },
  actionButtonText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.white },

  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: SPACING[10] },
  emptyStateTitle: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginTop: SPACING[3] },
  emptyStateText: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary, textAlign: 'center', marginTop: SPACING[2], paddingHorizontal: SPACING[4] },

  // ML Patterns Section
  patternsCard: { marginTop: SPACING[4] },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2], marginBottom: SPACING[3] },
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

  // Priority Badge for recommendations
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: SPACING[2], paddingVertical: 2, borderRadius: RADIUS.sm, marginTop: SPACING[1] },
  priorityText: { fontSize: 10, fontWeight: TYPOGRAPHY.weight.semibold },
});
