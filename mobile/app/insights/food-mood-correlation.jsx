/**
 * Food-Mood Correlation Screen
 *
 * Deep-dive analysis of Food → Mood relationship
 * Shows how nutrition affects mood based on your personal data
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import FoodMoodCorrelationCard from '../../components/analytics/FoodMoodCorrelationCard';
import CircularProgress from '../../components/analytics/CircularProgress';

import { useFoodLog } from '../../hooks/useFoodLog';
import { useMoodTrends } from '../../hooks/useMoodTrends';
import { useWaterLog } from '../../hooks/useWaterLog';

import { TEXT, BRAND, SURFACES, SEMANTIC, SHADOWS, SPACING, RADIUS, TYPOGRAPHY } from '../../constants/premiumTheme';
import { analyzeMultiFactorCorrelations, analyzePersonalizedResponses } from '../../utils/multiFactorAnalytics';
import { calculateMoodNutrientScore } from '../../utils/moodNutrients';

export default function FoodMoodCorrelationScreen() {
  const router = useRouter();

  const [timeRange, setTimeRange] = useState(30);
  const [viewMode, setViewMode] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Get data
  const { logs: foodLogs, refetch: refetchFood, isLoading: foodLoading } = useFoodLog();
  const { data: moodData, refetch: refetchMood, isLoading: moodLoading } = useMoodTrends({ days: timeRange });
  const { logs: waterLogs, refetch: refetchWater } = useWaterLog();

  const moodLogs = moodData?.data || [];
  const isLoading = foodLoading || moodLoading;

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchFood?.(), refetchMood?.(), refetchWater?.()]);
    setRefreshing(false);
  }, [refetchFood, refetchMood, refetchWater]);

  // Back handler
  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [router]);

  // Analyze
  const analysis = useMemo(() => {
    return analyzeMultiFactorCorrelations({
      foodLogs,
      moodLogs,
      waterLogs,
      activityLogs: [],
      sleepLogs: [],
    });
  }, [foodLogs, moodLogs, waterLogs]);

  const personalPatterns = useMemo(() => {
    return analyzePersonalizedResponses({
      foodLogs,
      moodLogs,
      waterLogs,
      activityLogs: [],
      sleepLogs: [],
    });
  }, [foodLogs, moodLogs, waterLogs]);

  // Calculate mood-supporting nutrient intake
  const moodNutrientAnalysis = useMemo(() => {
    if (!foodLogs || foodLogs.length === 0) {
      return { score: 0, level: 'unknown', deficiencies: [], adequate: [] };
    }

    const aggregatedNutrients = {};
    const daysTracked = new Set();

    foodLogs.forEach(log => {
      const date = new Date(log.date || log.loggedDate).toDateString();
      daysTracked.add(date);

      const macros = log.macros || log;
      if (macros.omega3 || macros.omega3_g) aggregatedNutrients.omega3 = (aggregatedNutrients.omega3 || 0) + (macros.omega3 || macros.omega3_g || 0);
      if (macros.vitaminB6 || macros.vitamin_b6_mg) aggregatedNutrients.vitaminB6 = (aggregatedNutrients.vitaminB6 || 0) + (macros.vitaminB6 || macros.vitamin_b6_mg || 0);
      if (macros.vitaminB12 || macros.vitamin_b12_mcg) aggregatedNutrients.vitaminB12 = (aggregatedNutrients.vitaminB12 || 0) + (macros.vitaminB12 || macros.vitamin_b12_mcg || 0);
      if (macros.folate || macros.folate_mcg) aggregatedNutrients.folate = (aggregatedNutrients.folate || 0) + (macros.folate || macros.folate_mcg || 0);
      if (macros.magnesium || macros.magnesium_mg) aggregatedNutrients.magnesium = (aggregatedNutrients.magnesium || 0) + (macros.magnesium || macros.magnesium_mg || 0);
      if (macros.iron || macros.iron_mg) aggregatedNutrients.iron = (aggregatedNutrients.iron || 0) + (macros.iron || macros.iron_mg || 0);
      if (macros.zinc || macros.zinc_mg) aggregatedNutrients.zinc = (aggregatedNutrients.zinc || 0) + (macros.zinc || macros.zinc_mg || 0);
      if (macros.vitaminD || macros.vitamin_d_iu) aggregatedNutrients.vitaminD = (aggregatedNutrients.vitaminD || 0) + (macros.vitaminD || macros.vitamin_d_iu || 0);
      if (macros.tryptophan || macros.tryptophan_mg) aggregatedNutrients.tryptophan = (aggregatedNutrients.tryptophan || 0) + (macros.tryptophan || macros.tryptophan_mg || 0);
    });

    const numDays = Math.max(daysTracked.size, 1);
    const dailyAverage = {};
    Object.keys(aggregatedNutrients).forEach(key => {
      dailyAverage[key] = aggregatedNutrients[key] / numDays;
    });

    return calculateMoodNutrientScore(dailyAverage);
  }, [foodLogs]);

  // Empty/Loading states
  if (isLoading && !refreshing) {
    return (
      <>
        <Stack.Screen options={{ title: 'Food → Mood', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Analyzing your data...</Text>
        </View>
      </>
    );
  }

  if (!analysis.canAnalyze) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Food → Mood',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.headerButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Ionicons name="nutrition-outline" size={64} color={TEXT.tertiary} />
            <Text style={styles.emptyTitle}>Not Enough Data</Text>
            <Text style={styles.emptyText}>{analysis.message}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/log')}
              accessibilityLabel="Log a meal"
              accessibilityRole="button"
            >
              <Text style={styles.emptyButtonText}>Log a Meal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  const { correlations, overallStrength } = analysis.correlations.food_mood;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Food → Mood',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
          />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {[{ days: 7, label: '7d' }, { days: 30, label: '30d' }, { days: 90, label: '90d' }].map(({ days, label }) => (
            <TouchableOpacity
              key={days}
              style={[styles.timeRangeButton, timeRange === days && styles.timeRangeButtonActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(days);
              }}
              accessibilityLabel={`Show ${label} data`}
              accessibilityRole="button"
              accessibilityState={{ selected: timeRange === days }}
            >
              <Text style={[styles.timeRangeText, timeRange === days && styles.timeRangeTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* View Mode Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: 'analytics-outline' },
            { key: 'nutrients', label: 'Nutrients', icon: 'nutrition-outline' },
            { key: 'personal', label: 'Patterns', icon: 'person-outline' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, viewMode === tab.key && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode(tab.key);
              }}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: viewMode === tab.key }}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={viewMode === tab.key ? BRAND.primary : TEXT.tertiary}
              />
              <Text style={[styles.tabText, viewMode === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Tab */}
        {viewMode === 'overview' && (
          <View style={styles.section}>
            <FoodMoodCorrelationCard
              foodLogs={foodLogs}
              moodLogs={moodLogs}
              waterLogs={waterLogs}
              compact={false}
            />

            {/* Key Insights */}
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>Key Insights</Text>
              {correlations.slice(0, 5).map((corr, index) => (
                <View key={index} style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <View style={[styles.insightNumber, { backgroundColor: corr.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base }]}>
                      <Text style={styles.insightNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.insightTitle}>{corr.factor}</Text>
                    <View style={[styles.effectBadge, { backgroundColor: corr.effectSize > 0 ? `${SEMANTIC.success.base}15` : `${SEMANTIC.warning.base}15` }]}>
                      <Ionicons
                        name={corr.effectSize > 0 ? 'trending-up' : 'trending-down'}
                        size={14}
                        color={corr.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base}
                      />
                      <Text style={[styles.effectText, { color: corr.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base }]}>
                        {corr.effectSize > 0 ? '+' : ''}{(corr.effectSize * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.insightDescription}>{corr.mechanism}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Nutrients Tab */}
        {viewMode === 'nutrients' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mood-Supporting Nutrients</Text>

            {/* Score Card */}
            <View style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreValue}>{moodNutrientAnalysis.score}</Text>
                  <Text style={styles.scoreLabel}>/ 100</Text>
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={styles.scoreTitle}>Nutrient Score</Text>
                  <Text style={[
                    styles.scoreLevel,
                    moodNutrientAnalysis.level === 'excellent' && { color: SEMANTIC.success.base },
                    moodNutrientAnalysis.level === 'good' && { color: BRAND.primary },
                    moodNutrientAnalysis.level === 'fair' && { color: SEMANTIC.warning.base },
                    moodNutrientAnalysis.level === 'low' && { color: SEMANTIC.danger.base },
                  ]}>
                    {moodNutrientAnalysis.level === 'excellent' ? 'Excellent' :
                     moodNutrientAnalysis.level === 'good' ? 'Good' :
                     moodNutrientAnalysis.level === 'fair' ? 'Fair' :
                     moodNutrientAnalysis.level === 'low' ? 'Needs Work' : 'Tracking...'}
                  </Text>
                </View>
              </View>

              {/* Deficiencies */}
              {moodNutrientAnalysis.deficiencies?.length > 0 && (
                <View style={styles.deficienciesSection}>
                  <Text style={styles.sectionLabel}>Areas to Improve</Text>
                  {moodNutrientAnalysis.deficiencies.slice(0, 3).map((def, idx) => (
                    <View key={idx} style={styles.deficiencyItem}>
                      <View style={styles.deficiencyHeader}>
                        <Ionicons name={def.icon || 'nutrition'} size={16} color={def.color || SEMANTIC.warning.base} />
                        <Text style={styles.deficiencyName}>{def.name}</Text>
                        <Text style={styles.deficiencyPercent}>{Math.round(def.percentage)}%</Text>
                      </View>
                      <Text style={styles.deficiencyFoods}>
                        Try: {def.topFoods?.slice(0, 3).join(', ')}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Adequate */}
              {moodNutrientAnalysis.adequate?.length > 0 && (
                <View style={styles.adequateSection}>
                  <Text style={styles.sectionLabel}>Meeting Goals</Text>
                  <View style={styles.adequateChips}>
                    {moodNutrientAnalysis.adequate.slice(0, 4).map((nut, idx) => (
                      <View key={idx} style={[styles.adequateChip, { backgroundColor: `${nut.color}15`, borderColor: nut.color }]}>
                        <Text style={[styles.adequateChipText, { color: nut.color }]}>{nut.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Nutrient Breakdown */}
            {correlations.map((corr, index) => (
              <View key={index} style={styles.nutrientCard}>
                <View style={styles.nutrientHeader}>
                  <View style={styles.nutrientTitleRow}>
                    <Ionicons
                      name={corr.effectSize > 0 ? 'trending-up' : 'trending-down'}
                      size={24}
                      color={corr.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base}
                    />
                    <Text style={styles.nutrientTitle}>{corr.factor}</Text>
                  </View>
                  <CircularProgress
                    percentage={Math.abs(corr.effectSize) * 100}
                    size={50}
                    strokeWidth={5}
                    color={corr.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base}
                  />
                </View>
                <Text style={styles.nutrientDescription}>{corr.mechanism}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Patterns Tab */}
        {viewMode === 'personal' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Patterns</Text>
            <Text style={styles.sectionSubtitle}>Based on your personal data</Text>

            {personalPatterns.canAnalyze ? (
              <>
                {personalPatterns.patterns.map((pattern, index) => (
                  <View key={index} style={styles.patternCard}>
                    <View style={styles.patternHeader}>
                      <Ionicons
                        name={
                          pattern.type === 'success_pattern' ? 'star' :
                          pattern.type === 'struggle_pattern' ? 'alert-circle' :
                          'analytics'
                        }
                        size={24}
                        color={
                          pattern.type === 'success_pattern' ? SEMANTIC.success.base :
                          pattern.type === 'struggle_pattern' ? SEMANTIC.warning.base :
                          BRAND.primary
                        }
                      />
                      <Text style={styles.patternTitle}>{pattern.outcome}</Text>
                    </View>
                    <Text style={styles.patternInsight}>{pattern.insight}</Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.insufficientData}>
                <Ionicons name="time-outline" size={48} color={TEXT.tertiary} />
                <Text style={styles.insufficientDataTitle}>Keep Logging</Text>
                <Text style={styles.insufficientDataText}>
                  Log more meals and moods to discover your personal patterns
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background.primary,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  headerButton: {
    padding: SPACING[2],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACES.background.primary,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: SURFACES.card.primary,
    padding: 4,
    borderRadius: 12,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: BRAND.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: SURFACES.card.primary,
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  tabActive: {
    backgroundColor: BRAND.primary + '20',
  },
  tabText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
  },
  tabTextActive: {
    color: BRAND.primary,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: -8,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginBottom: 8,
  },
  insightsSection: {
    gap: 12,
    marginTop: 8,
  },
  insightCard: {
    backgroundColor: SURFACES.card.primary,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  insightNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  insightTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    flex: 1,
  },
  effectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  effectText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  insightDescription: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  scoreCard: {
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: `${BRAND.primary}20`,
    ...SHADOWS.md,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${BRAND.primary}10`,
    borderWidth: 3,
    borderColor: BRAND.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
  },
  scoreLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: -2,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: 4,
  },
  scoreLevel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  deficienciesSection: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  deficiencyItem: {
    backgroundColor: `${SEMANTIC.warning.base}10`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[2],
    borderLeftWidth: 3,
    borderLeftColor: SEMANTIC.warning.base,
  },
  deficiencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: 4,
  },
  deficiencyName: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  deficiencyPercent: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
    color: SEMANTIC.warning.base,
  },
  deficiencyFoods: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  adequateSection: {
    marginTop: SPACING[3],
  },
  adequateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  adequateChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  adequateChipText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  nutrientCard: {
    backgroundColor: SURFACES.card.primary,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutrientTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  nutrientTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  nutrientDescription: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  patternCard: {
    backgroundColor: SURFACES.card.primary,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.sm,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  patternTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    flex: 1,
  },
  patternInsight: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  insufficientData: {
    backgroundColor: SURFACES.card.primary,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  insufficientDataTitle: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  insufficientDataText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },
});
