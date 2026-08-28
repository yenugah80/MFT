import React, { useCallback, useState } from 'react';
import { Dimensions, LayoutAnimation, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import AnalyticsEmptyState from './AnalyticsEmptyState';
import GoalRealityCheckCard from './GoalRealityCheckCard';
import MiniLineChart from './MiniLineChart';
import RecommendationCard from './RecommendationCard';
import { SmartRecommendationSummary, SmartRecommendationsList } from './SmartRecommendationCard';
import { SmartRecommendationsLoadingSkeleton } from './SkeletonLoader';
import { useQuickLogCelebration } from './CelebrationAnimation';
import { ActionRow, InsightList, MetricRow, MetricTile, PERIOD_COPY, ProgressAction, ProgressBar, ProgressCard, ProgressHero, SectionHeader, SectionIntro } from './ProgressUI';
import { useSmartRecommendations } from '../../hooks/useRecommendations';
import { getGoalPaceLabel } from '../../utils/goalFraming';
import { getNutritionEmptySubtitle } from '../../utils/emptyStateCopy';
import { BRAND, CARD_SYSTEM, MACRO_COLORS, RADIUS, SPACING, TEXT, TYPOGRAPHY, VIBRANT_WELLNESS } from '../../constants/premiumTheme';

const COLOR = VIBRANT_WELLNESS.nutrition.solid;
const CHART_WIDTH = Dimensions.get('window').width - SPACING[4] * 4;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);

export default function NutritionTab({ data, period, recommendations = [], onRefresh, refreshing = false, onCompleteRecommendation, onDismissRecommendation }) {
  const router = useRouter();
  const copy = PERIOD_COPY[period] || PERIOD_COPY.week;
  const [showSmartRecs, setShowSmartRecs] = useState(false);
  const [loggingId, setLoggingId] = useState(null);
  const { celebrate, CelebrationComponent } = useQuickLogCelebration();
  const { recommendations: smartRecs, summary, nutritionalStatus, loading: smartLoading, fetchRecommendations, quickLog, hasRecommendations: hasSmartRecs, blocked: smartRecsBlocked, blockedReason: smartRecsBlockedReason } = useSmartRecommendations({ enabled: showSmartRecs });
  const { calories = {}, macros = {}, mealsLogged = 0, weekData = [], weeklyAverages, primaryGoal, hasDataInPeriod } = data || {};
  const hasRealData = hasDataInPeriod ?? (calories.consumed || mealsLogged) > 0;
  const hasTrend = weekData.some((day) => Number(day.calories) > 0);
  const actionRecommendations = recommendations.filter((item) => item.type === 'action');
  const insightRecommendations = recommendations.filter((item) => item.type !== 'action').slice(0, 3);
  const averageCalories = Math.round(weeklyAverages?.avgCalories || calories.consumed || 0);
  const todayPace = getGoalPaceLabel(calories.consumed || 0, calories.budget || 2000, primaryGoal);
  const rangePace = getGoalPaceLabel(averageCalories, calories.budget || 2000, primaryGoal);

  const navigate = (route) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(route); };
  const handleRefresh = useCallback(async () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (onRefresh) await onRefresh(); if (showSmartRecs) await fetchRecommendations(); }, [fetchRecommendations, onRefresh, showSmartRecs]);
  const toggleSmartRecs = useCallback(() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); const next = !showSmartRecs; setShowSmartRecs(next); if (next && !hasSmartRecs) fetchRecommendations(); }, [fetchRecommendations, hasSmartRecs, showSmartRecs]);
  const handleQuickLog = useCallback(async (recommendation) => { setLoggingId(recommendation.id); const result = await quickLog(recommendation); setLoggingId(null); if (result.success) celebrate(recommendation.name, recommendation.nutrition?.calories); else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }, [celebrate, quickLog]);

  const fallbackInsights = [
    { icon: 'flame-outline', color: COLOR, title: period === 'today' ? `${calories.percentage || 0}% of today’s calorie target` : `${averageCalories.toLocaleString()} calorie daily average`, message: period === 'today' ? (todayPace || 'Compared with your configured daily calorie goal.') : `${rangePace || 'Compared with your configured goal'} ${copy.noun}.` },
    { icon: 'restaurant-outline', color: '#6B82AD', title: `${mealsLogged} meal${mealsLogged === 1 ? '' : 's'} logged today`, message: 'Meal count is today-only and is not presented as a selected-range total.' },
    { icon: 'information-circle-outline', color: '#D89B36', title: 'Logged intake is an estimate', message: 'Patterns depend on portion accuracy and how consistently meals are recorded.' },
  ];

  return (
    <>
      <CelebrationComponent />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}>
        {actionRecommendations.map((item, index) => <RecommendationCard key={item.id || index} recommendation={item} onComplete={onCompleteRecommendation} onDismiss={onDismissRecommendation} compact />)}
        {data && !hasRealData ? <AnalyticsEmptyState icon="nutrition-outline" iconColor={COLOR} title="No nutrition data yet" subtitle={getNutritionEmptySubtitle(primaryGoal) || `No meals are logged ${copy.noun}. Log one to begin seeing calorie and macro patterns.`} /> : data && (
          <>
            <ProgressHero color={COLOR} tint="#FFF4EC" eyebrow={`${copy.eyebrow} · NUTRITION SNAPSHOT`} title={period === 'today' ? `${Number(calories.consumed || 0).toLocaleString()} calories today` : `${averageCalories.toLocaleString()} daily average`} subtitle={period === 'today' ? `${mealsLogged} meal${mealsLogged === 1 ? '' : 's'} logged against a ${Number(calories.budget || 2000).toLocaleString()} calorie goal.` : `${rangePace || 'Your logged calorie pattern'} ${copy.noun}.`} badge={period === 'today' ? 'Today’s intake' : 'Average of logged days'} icon="nutrition" value={period === 'today' ? `${calories.percentage || 0}%` : `${Math.round((averageCalories / (calories.budget || 2000)) * 100)}%`} valueLabel="of daily goal" />
            <MetricRow>
              <MetricTile icon="flame-outline" color={COLOR} value={Number(calories.consumed || 0).toLocaleString()} label="Calories today" hint={`of ${Number(calories.budget || 2000).toLocaleString()}`} />
              <MetricTile icon="stats-chart-outline" color="#6B82AD" value={averageCalories.toLocaleString()} label="Daily average" hint={copy.noun} />
              <MetricTile icon="restaurant-outline" color="#D89B36" value={`${mealsLogged}`} label="Meals today" hint="today-only count" />
            </MetricRow>
            {hasTrend && period !== 'today' && <ProgressCard>
              <SectionHeader eyebrow="CALORIES OVER TIME" title={`Daily logged intake ${copy.noun}`} subtitle="Calendar days without meals remain visible as zero-log days" icon="analytics-outline" color={COLOR} />
              <MiniLineChart data={weekData.map((day) => Number(day.calories || 0))} labels={weekData.map((day) => day.label)} width={CHART_WIDTH} height={132} color={COLOR} showGrid showDots={weekData.length <= 10} minDomain={0} maxLabels={period === 'month' ? 6 : 7} accessibilityLabel={`${copy.eyebrow.toLowerCase()} logged calorie trend`} />
            </ProgressCard>}
            {weeklyAverages && <ProgressCard>
              <SectionHeader eyebrow="DAILY MACRO AVERAGES" title={`Macro balance ${copy.noun}`} subtitle="Averages compared with your configured daily targets" icon="options-outline" color={COLOR} />
              <ProgressBar label="Protein" value={macroPercentage(weeklyAverages.avgProtein, macros.protein?.goal)} displayValue={`${Math.round(weeklyAverages.avgProtein || 0)}g / ${macros.protein?.goal || 150}g`} color={MACRO_COLORS.protein.base} />
              <ProgressBar label="Carbs" value={macroPercentage(weeklyAverages.avgCarbs, macros.carbs?.goal)} displayValue={`${Math.round(weeklyAverages.avgCarbs || 0)}g / ${macros.carbs?.goal || 250}g`} color={MACRO_COLORS.carbs.base} />
              <ProgressBar label="Fat" value={macroPercentage(weeklyAverages.avgFats, macros.fat?.goal)} displayValue={`${Math.round(weeklyAverages.avgFats || 0)}g / ${macros.fat?.goal || 65}g`} color={MACRO_COLORS.fat.base} />
            </ProgressCard>}
            <GoalRealityCheckCard weeklyAverages={weeklyAverages} primaryGoal={primaryGoal} calorieGoal={calories.budget || 2000} />
          </>
        )}

        <View style={styles.smartCard}>
          <TouchableOpacity style={styles.smartHeader} onPress={toggleSmartRecs} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Smart Food Picks" accessibilityState={{ expanded: showSmartRecs }}>
            <View style={styles.smartHeaderLeft}><View style={styles.smartIcon}><Ionicons name="sparkles" size={18} color={BRAND.primary} /></View><View style={styles.smartCopy}><Text style={styles.smartEyebrow}>OPTIONAL SUPPORT</Text><Text style={styles.smartTitle}>Smart Food Picks</Text><Text style={styles.smartSubtitle}>{showSmartRecs ? 'Personalized options based on logged nutrition gaps' : 'Open food ideas based on your logged gaps'}</Text></View></View>
            <Ionicons name={showSmartRecs ? 'chevron-up' : 'chevron-down'} size={20} color={TEXT.tertiary} />
          </TouchableOpacity>
          {showSmartRecs && <View style={styles.smartContent}>{smartLoading ? <SmartRecommendationsLoadingSkeleton cardCount={3} /> : smartRecsBlocked ? <View style={styles.smartEmpty}><Ionicons name="shield-outline" size={30} color={TEXT.tertiary} /><Text style={styles.smartEmptyText}>{smartRecsBlockedReason || "Couldn't verify dietary safety right now — try again shortly"}</Text></View> : hasSmartRecs ? <>{summary && <SmartRecommendationSummary summary={summary} nutritionalStatus={nutritionalStatus} />}<SmartRecommendationsList recommendations={smartRecs} onQuickLog={handleQuickLog} loggingId={loggingId} /></> : <View style={styles.smartEmpty}><Ionicons name="leaf-outline" size={30} color={TEXT.tertiary} /><Text style={styles.smartEmptyText}>Log some meals to get personalized recommendations</Text></View>}</View>}
        </View>

        {data && hasRealData && <>
          <SectionIntro eyebrow="PERSONAL CONTEXT" title="What stands out" subtitle={insightRecommendations.length ? `Rolling ${insightRecommendations[0].windowDays || 14}-day observations from logged meals—not medical advice or proof of cause.` : `Selected-range observations from logged meals ${copy.noun}.`} color={COLOR} />
          {insightRecommendations.length ? <View style={styles.recommendations}>{insightRecommendations.map((item, index) => <RecommendationCard key={item.id || index} recommendation={item} onComplete={onCompleteRecommendation} onDismiss={onDismissRecommendation} compact />)}</View> : <InsightList items={fallbackInsights} />}
        </>}
        <ActionRow>
          <ProgressAction icon="analytics-outline" label="Nutrition analytics" hint="Calories, macros & goals" color={COLOR} onPress={() => navigate('/analytics/nutrition')} />
          <ProgressAction icon="add-circle-outline" label="Log food" hint="Add a meal now" color={COLOR} onPress={() => navigate('/(tabs)/log')} />
        </ActionRow>
      </ScrollView>
    </>
  );
}

function macroPercentage(consumed, goal) { return goal > 0 ? Math.min(((consumed || 0) / goal) * 100, 100) : 0; }

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING[4], paddingBottom: SPACING[10] },
  recommendations: { gap: SPACING[2] },
  smartCard: { ...CARD_SYSTEM.standard, borderRadius: RADIUS['2xl'], padding: 0, overflow: 'hidden' },
  smartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING[4], backgroundColor: `${BRAND.primary}08` },
  smartHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  smartIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: `${BRAND.primary}12`, alignItems: 'center', justifyContent: 'center', marginRight: SPACING[3] },
  smartCopy: { flex: 1, paddingRight: SPACING[2] },
  smartEyebrow: { fontSize: 9, letterSpacing: 0.9, fontFamily: TYPOGRAPHY.family.bold, color: BRAND.primary },
  smartTitle: { marginTop: 2, fontSize: TYPOGRAPHY.size.md, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  smartSubtitle: { marginTop: 3, fontSize: 11, lineHeight: 15, color: TEXT.tertiary },
  smartContent: { padding: SPACING[4], paddingTop: 0 },
  smartEmpty: { alignItems: 'center', justifyContent: 'center', padding: SPACING[6], gap: SPACING[2] },
  smartEmptyText: { fontSize: TYPOGRAPHY.size.sm, color: TEXT.tertiary, textAlign: 'center' },
});
