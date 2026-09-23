import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import AnalyticsEmptyState from './AnalyticsEmptyState';
import RecommendationCard from './RecommendationCard';
import { ActionRow, InsightList, MetricRow, MetricTile, PERIOD_COPY, ProgressAction, ProgressBar, ProgressCard, ProgressHero, SectionHeader, SectionIntro } from './ProgressUI';
import { BRAND, SEMANTIC, SPACING, VIBRANT_WELLNESS } from '../../constants/premiumTheme';

const COLOR = VIBRANT_WELLNESS.hydration.solid;

const liters = (ml) => `${(Number(ml || 0) / 1000).toFixed(1)}L`;

export default function HydrationTab({ data, period, recommendations = [], onRefresh, refreshing = false, onCompleteRecommendation, onDismissRecommendation }) {
  const router = useRouter();
  const copy = PERIOD_COPY[period] || PERIOD_COPY.week;
  const { todayMl = 0, goalMl = 2000, goalPercent = 0, streak = 0, avgDaily = 0, hasDataInPeriod, totalMlInPeriod = 0, daysLoggedInPeriod = 0, daysGoalMetInPeriod = 0 } = data || {};
  const hasRealData = hasDataInPeriod ?? todayMl > 0;
  const actionRecommendations = recommendations.filter((item) => item.type === 'action');
  const insightRecommendations = recommendations.filter((item) => item.type !== 'action').slice(0, 3);
  const periodDays = period === 'today' ? 1 : period === 'month' ? 30 : 7;
  const coverage = Math.min(100, Math.round((daysLoggedInPeriod / periodDays) * 100));
  const averagePercent = goalMl > 0 ? Math.round((avgDaily / goalMl) * 100) : 0;
  const navigate = (route) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(route); };
  const remaining = Math.max(0, goalMl - todayMl);

  const fallbackInsights = [
    { icon: goalPercent >= 100 ? 'checkmark-circle-outline' : 'water-outline', color: goalPercent >= 100 ? SEMANTIC.success.base : COLOR, title: goalPercent >= 100 ? 'Today’s goal is complete' : `${remaining}ml remains today`, message: `${liters(todayMl)} logged against your ${liters(goalMl)} daily goal.` },
    { icon: 'calendar-outline', color: '#6B82AD', title: `${daysLoggedInPeriod} day${daysLoggedInPeriod === 1 ? '' : 's'} logged ${copy.noun}`, message: `${coverage}% coverage in this selected range.` },
    { icon: 'trophy-outline', color: '#D89B36', title: `${daysGoalMetInPeriod} goal day${daysGoalMetInPeriod === 1 ? '' : 's'}`, message: `Daily goal was met on ${daysGoalMetInPeriod} logged day${daysGoalMetInPeriod === 1 ? '' : 's'} in this range.` },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}>
      {actionRecommendations.map((item, index) => <RecommendationCard key={item.id || index} recommendation={item} onComplete={onCompleteRecommendation} onDismiss={onDismissRecommendation} compact />)}
      {data && !hasRealData ? <AnalyticsEmptyState icon="water-outline" iconColor={COLOR} title="No hydration data yet" subtitle={`No water is logged ${copy.noun}. Log some to begin seeing daily averages, goal days, and consistency.`} /> : data && (
        <>
          <ProgressHero color={COLOR} tint="#ECFEFF" eyebrow={`${copy.eyebrow} · HYDRATION SNAPSHOT`} title={period === 'today' ? `${liters(todayMl)} logged today` : `${liters(avgDaily)} daily average`} subtitle={period === 'today' ? `${Math.round(goalPercent)}% of your ${liters(goalMl)} daily goal.` : `${liters(totalMlInPeriod)} total across ${daysLoggedInPeriod} logged day${daysLoggedInPeriod === 1 ? '' : 's'}.`} badge={period === 'today' ? 'Today’s progress' : 'Selected-range average'} icon="water" value={period === 'today' ? `${Math.round(goalPercent)}%` : `${Math.round(averagePercent)}%`} valueLabel="of daily goal" />
          <MetricRow>
            <MetricTile icon="water-outline" color={COLOR} value={liters(todayMl)} label="Today" hint={`of ${liters(goalMl)} goal`} />
            <MetricTile icon="stats-chart-outline" color="#6B82AD" value={liters(avgDaily)} label="Daily average" hint={copy.noun} />
            <MetricTile icon="flame-outline" color="#D97706" value={`${streak}`} label="Day streak" hint="goal met" />
          </MetricRow>
          <ProgressCard>
            <SectionHeader eyebrow="TODAY VS DAILY GOAL" title="Current-day progress" subtitle="Kept separate from the selected-range average" icon="water-outline" color={COLOR} />
            <ProgressBar label={`${liters(todayMl)} of ${liters(goalMl)}`} value={goalPercent} displayValue={`${Math.round(goalPercent)}%`} color={goalPercent >= 100 ? SEMANTIC.success.base : COLOR} icon="water" />
          </ProgressCard>
          {period !== 'today' && <ProgressCard>
            <SectionHeader eyebrow="RANGE CONSISTENCY" title={`Hydration ${copy.noun}`} subtitle="Logging coverage and days where the daily goal was reached" icon="calendar-outline" color={COLOR} />
            <ProgressBar label="Days with hydration logged" value={coverage} displayValue={`${daysLoggedInPeriod}/${periodDays}`} color={COLOR} icon="create-outline" />
            <ProgressBar label="Goal days among logged days" value={daysLoggedInPeriod ? (daysGoalMetInPeriod / daysLoggedInPeriod) * 100 : 0} displayValue={`${daysGoalMetInPeriod}/${daysLoggedInPeriod}`} color={SEMANTIC.success.base} icon="checkmark-circle-outline" />
          </ProgressCard>}
          <SectionIntro eyebrow="PERSONAL CONTEXT" title="What stands out" subtitle={insightRecommendations.length ? `Rolling ${insightRecommendations[0].windowDays || 14}-day observations from logged drinks. This is not medical advice or a diagnosis.` : `Selected-range observations from logged drinks ${copy.noun}.`} color={COLOR} />
          {insightRecommendations.length ? <View style={styles.recommendations}>{insightRecommendations.map((item, index) => <RecommendationCard key={item.id || index} recommendation={item} onComplete={onCompleteRecommendation} onDismiss={onDismissRecommendation} compact />)}</View> : <InsightList items={fallbackInsights} />}
          <ActionRow>
            <ProgressAction icon="analytics-outline" label="Hydration analytics" hint="Timing, mix & trends" color={COLOR} onPress={() => navigate('/analytics/hydration')} />
            <ProgressAction icon="add-circle-outline" label="Log water" hint="Add intake now" color={COLOR} onPress={() => navigate('/(tabs)/log?focus=hydration')} />
          </ActionRow>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: SPACING[4], paddingBottom: SPACING[10] }, recommendations: { gap: SPACING[2] } });
