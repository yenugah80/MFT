/**
 * NutritionTab - Premium Analytics with Personalized Recommendations
 *
 * Design Principles:
 * 1. DELIGHT - Celebration animations on quick-log success
 * 2. CLARITY - Clear visual hierarchy for scanning
 * 3. PERSONALITY - Encouraging, time-contextual messaging
 * 4. PERFORMANCE - Skeleton loaders for perceived speed
 *
 * Features:
 * - Key nutrition metrics with circular progress
 * - Smart AI-powered food recommendations with quick-log
 * - Celebration animation on successful logging
 * - Pull-to-refresh capability
 * - Skeleton loading states
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import MetricCard from './MetricCard';
import RecommendationCard, { RecommendationSection } from './RecommendationCard';
import { SmartRecommendationSummary, SmartRecommendationsList } from './SmartRecommendationCard';
import { SmartRecommendationsLoadingSkeleton } from './SkeletonLoader';
import { useQuickLogCelebration } from './CelebrationAnimation';
import MiniLineChart from './MiniLineChart';
import { useSmartRecommendations } from '../../hooks/useRecommendations';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  CARD_SYSTEM,
  VIBRANT_WELLNESS,
  MACRO_COLORS,
  BRAND,
} from '../../constants/premiumTheme';

// Screen width minus the container's own horizontal padding (SPACING[4] * 2)
// and the card's inner padding (CARD_SYSTEM.standard's SPACING[4] * 2).
const CHART_WIDTH = Dimensions.get('window').width - SPACING[4] * 4;

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function NutritionTab({ data, period, recommendations = [], onRefresh, refreshing = false }) {
  const [showSmartRecs, setShowSmartRecs] = useState(false);
  const [loggingId, setLoggingId] = useState(null);

  // Celebration hook for quick-log success
  const { celebrate, CelebrationComponent } = useQuickLogCelebration();

  // Smart recommendations hook - only fetch when section is expanded
  const {
    recommendations: smartRecs,
    summary,
    nutritionalStatus,
    loading: smartLoading,
    fetchRecommendations,
    quickLog,
    hasRecommendations: hasSmartRecs,
  } = useSmartRecommendations({ enabled: showSmartRecs });

  // Handle pull-to-refresh — refreshing state is owned by the parent screen
  // (same refreshing/onRefresh props all 5 tabs receive); this also refreshes
  // smart recs alongside the shared refetch.
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onRefresh) await onRefresh();
    if (showSmartRecs) await fetchRecommendations();
  }, [onRefresh, showSmartRecs, fetchRecommendations]);

  // Handle toggling smart recommendations section
  const handleToggleSmartRecs = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newState = !showSmartRecs;
    setShowSmartRecs(newState);
    if (newState && !hasSmartRecs) {
      fetchRecommendations();
    }
  }, [showSmartRecs, hasSmartRecs, fetchRecommendations]);

  // Handle quick log from smart recommendation with celebration
  const handleQuickLog = useCallback(async (recommendation) => {
    setLoggingId(recommendation.id);
    const result = await quickLog(recommendation);
    setLoggingId(null);

    if (result.success) {
      // Trigger celebration animation
      celebrate(recommendation.name, recommendation.nutrition?.calories);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [quickLog, celebrate]);

  // Empty state when no data and no recommendations
  if (!data && recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="nutrition-outline" size={48} color={TEXT.tertiary} />
        <Text style={styles.emptyText}>No nutrition data yet</Text>
        <Text style={styles.emptySubtext}>Log your meals to see analytics and personalized insights</Text>
      </View>
    );
  }

  const { calories, macros, mealsLogged, weekData = [], weeklyAverages } = data || { calories: {}, macros: {}, mealsLogged: 0 };
  const hasWeekTrend = weekData.some((d) => d.calories > 0);

  // Separate recommendations by type for organized display
  const actionRecs = recommendations.filter(r => r.type === 'action');
  const insightRecs = recommendations.filter(r => r.type === 'insight');
  const patternRecs = recommendations.filter(r => r.type === 'pattern');
  const suggestionRecs = recommendations.filter(r => r.type === 'suggestion');

  return (
    <>
      {/* Celebration overlay */}
      <CelebrationComponent />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND.primary}
            colors={[BRAND.primary]}
          />
        }
      >
        {/* Priority Actions - Show first if any */}
        {actionRecs.length > 0 && (
          <View style={styles.actionsSection}>
            {actionRecs.map((rec, idx) => (
              <RecommendationCard key={rec.id || idx} recommendation={rec} />
            ))}
          </View>
        )}

        {/* Key Metrics - Only show if we have data */}
        {data && (
          <>
            <View style={styles.metricsRow}>
            <MetricCard
              value={calories.consumed?.toLocaleString() || '0'}
              label="Calories"
              subtitle={`of ${calories.budget?.toLocaleString() || '2000'}`}
              icon="flame"
              iconColor={VIBRANT_WELLNESS.nutrition.solid}
            />
            <MetricCard
              value={`${calories.percentage || 0}%`}
              label="of Goal"
              icon="pie-chart"
              iconColor={(calories.percentage || 0) >= 100 ? '#10B981' : VIBRANT_WELLNESS.nutrition.solid}
            />
            <MetricCard
              value={mealsLogged || 0}
              label="Meals"
              subtitle={period === 'today' ? 'today' : 'logged'}
              icon="restaurant"
              iconColor={VIBRANT_WELLNESS.nutrition.solid}
            />
          </View>

          {/* Weekly Trend — the dashboard's Nutrition card already shows today's
              calorie ring in full detail, so this leans into what it doesn't:
              how intake has moved across the week. */}
          {hasWeekTrend && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weekly Trend</Text>
              <MiniLineChart
                data={weekData.map((d) => d.calories)}
                labels={weekData.map((d) => d.label)}
                width={CHART_WIDTH}
                color={VIBRANT_WELLNESS.nutrition.solid}
                showGrid
              />
              {weeklyAverages && (
                <Text style={styles.trendSubtext}>
                  Averaging {Math.round(weeklyAverages.avgCalories).toLocaleString()} cal/day this week
                </Text>
              )}
            </View>
          )}

          {/* Weekly Macro Averages — same protein/carbs/fat the dashboard card
              tracks, but averaged across the week instead of restating today's
              totals in a different widget shape. */}
          {weeklyAverages && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weekly Macro Averages</Text>
              <View style={styles.macroList}>
                <MacroBar
                  name="Protein"
                  consumed={Math.round(weeklyAverages.avgProtein || 0)}
                  goal={macros.protein?.goal || 150}
                  percentage={macroPercentage(weeklyAverages.avgProtein, macros.protein?.goal)}
                  color={MACRO_COLORS.protein.base}
                  unit="g"
                />
                <MacroBar
                  name="Carbs"
                  consumed={Math.round(weeklyAverages.avgCarbs || 0)}
                  goal={macros.carbs?.goal || 250}
                  percentage={macroPercentage(weeklyAverages.avgCarbs, macros.carbs?.goal)}
                  color={MACRO_COLORS.carbs.base}
                  unit="g"
                />
                <MacroBar
                  name="Fat"
                  consumed={Math.round(weeklyAverages.avgFats || 0)}
                  goal={macros.fat?.goal || 65}
                  percentage={macroPercentage(weeklyAverages.avgFats, macros.fat?.goal)}
                  color={MACRO_COLORS.fat.base}
                  unit="g"
                />
              </View>
            </View>
          )}
          </>
        )}

        {/* Smart Food Recommendations Section */}
        <View style={styles.smartRecsSection}>
          <TouchableOpacity
            style={styles.smartRecsHeader}
            onPress={handleToggleSmartRecs}
            activeOpacity={0.7}
          >
            <View style={styles.smartRecsHeaderLeft}>
              <View style={styles.smartRecsIcon}>
                <Ionicons name="sparkles" size={18} color={BRAND.primary} />
              </View>
              <View>
                <Text style={styles.smartRecsTitle}>Smart Food Picks</Text>
                <Text style={styles.smartRecsSubtitle}>
                  {showSmartRecs ? 'Tap to hide' : 'AI-powered recommendations based on your gaps'}
                </Text>
              </View>
            </View>
            <Ionicons
              name={showSmartRecs ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={TEXT.tertiary}
            />
          </TouchableOpacity>

          {showSmartRecs && (
            <View style={styles.smartRecsContent}>
              {smartLoading ? (
                <SmartRecommendationsLoadingSkeleton cardCount={3} />
              ) : hasSmartRecs ? (
                <>
                  {summary && (
                    <SmartRecommendationSummary
                      summary={summary}
                      nutritionalStatus={nutritionalStatus}
                    />
                  )}
                  <SmartRecommendationsList
                    recommendations={smartRecs}
                    onQuickLog={handleQuickLog}
                    loggingId={loggingId}
                  />
                </>
              ) : (
                <View style={styles.smartRecsEmpty}>
                  <Ionicons name="leaf-outline" size={32} color={TEXT.tertiary} />
                  <Text style={styles.smartRecsEmptyText}>
                    Log some meals to get personalized recommendations
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* AI Insights Section */}
        {insightRecs.length > 0 && (
          <RecommendationSection
            title="Nutrition Insights"
            subtitle="Based on your data"
            recommendations={insightRecs}
          />
        )}

        {/* Discovered Patterns */}
        {patternRecs.length > 0 && (
          <RecommendationSection
            title="Nutrition Patterns"
            subtitle="Food-mood connections we found"
            recommendations={patternRecs}
          />
        )}

        {/* Smart Suggestions */}
        {suggestionRecs.length > 0 && (
          <RecommendationSection
            title="Suggestions for You"
            subtitle="Personalized tips"
            recommendations={suggestionRecs}
          />
        )}

        {/* Fallback static insights if no recommendations but have data */}
        {recommendations.length === 0 && data && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Insights</Text>
            <View style={styles.insightsList}>
              <InsightItem
                icon="checkmark-circle"
                color="#10B981"
                text={`${calories.percentage || 0}% of your calorie goal reached`}
              />
              {(macros?.protein?.percentage || 0) >= 80 && (
                <InsightItem
                  icon="thumbs-up"
                  color="#10B981"
                  text="Great protein intake today!"
                />
              )}
              {(macros?.protein?.percentage || 0) < 50 && macros?.protein?.percentage !== undefined && (
                <InsightItem
                  icon="alert-circle"
                  color="#F59E0B"
                  text="Consider adding more protein-rich foods"
                />
              )}
              {mealsLogged === 0 && (
                <InsightItem
                  icon="restaurant-outline"
                  color="#3B82F6"
                  text="Log your first meal to start tracking"
                />
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
}

function MacroBar({ name, consumed, goal, percentage, color, unit }) {
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroName}>{name}</Text>
        <Text style={styles.macroValue}>
          {consumed}{unit} / {goal}{unit}
        </Text>
      </View>
      <View style={styles.macroBarContainer}>
        <View
          style={[
            styles.macroBarFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function InsightItem({ icon, color, text }) {
  return (
    <View style={styles.insightRow}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

function macroPercentage(consumed, goal) {
  return goal > 0 ? Math.min(((consumed || 0) / goal) * 100, 100) : 0;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING[4],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[8],
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[4],
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[2],
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: SPACING[2],
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  card: {
    ...CARD_SYSTEM.standard,
    marginBottom: SPACING[4],
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  trendSubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    marginTop: SPACING[3],
  },
  macroList: {
    gap: SPACING[3],
  },
  macroRow: {
    gap: SPACING[1],
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  macroBarContainer: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  insightsList: {
    gap: SPACING[2],
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  insightText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    flex: 1,
  },
  // Smart Recommendations Section Styles
  smartRecsSection: {
    ...CARD_SYSTEM.standard,
    marginBottom: SPACING[4],
    padding: 0,
    overflow: 'hidden',
  },
  smartRecsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[4],
    backgroundColor: BRAND.primary + '08',
  },
  smartRecsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  smartRecsIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: BRAND.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  smartRecsTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  smartRecsSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  smartRecsContent: {
    padding: SPACING[4],
    paddingTop: 0,
  },
  smartRecsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[6],
    gap: SPACING[3],
  },
  smartRecsLoadingText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  smartRecsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[6],
    gap: SPACING[2],
  },
  smartRecsEmptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: SPACING[8],
  },
});
