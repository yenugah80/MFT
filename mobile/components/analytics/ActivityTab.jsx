import React from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import AnalyticsEmptyState from './AnalyticsEmptyState';
import MiniLineChart from './MiniLineChart';
import RecommendationCard from './RecommendationCard';
import { ActionRow, InsightList, MetricRow, MetricTile, PERIOD_COPY, ProgressAction, ProgressBar, ProgressCard, ProgressHero, SectionHeader, SectionIntro } from './ProgressUI';
import { BRAND, SEMANTIC, SPACING, VIBRANT_WELLNESS } from '../../constants/premiumTheme';
import { getActivityEmptySubtitle } from '../../utils/emptyStateCopy';

const COLOR = VIBRANT_WELLNESS.activity.solid;
const CHART_WIDTH = Dimensions.get('window').width - SPACING[4] * 4;
const CDC_WEEKLY_GOAL = 150;

export default function ActivityTab({ data, period, recommendations = [], onRefresh, refreshing = false, onCompleteRecommendation, onDismissRecommendation }) {
  const router = useRouter();
  const copy = PERIOD_COPY[period] || PERIOD_COPY.week;
  const { totalMinutes = 0, weeklyGoalMinutes = 0, cdcGoalPercent = 0, activeDays = 0, weekData = [], streak = 0, primaryGoal, hasDataInPeriod } = data || {};
  const hasRealData = hasDataInPeriod ?? totalMinutes > 0;
  const actionRecommendations = recommendations.filter((item) => item.type === 'action');
  // The decision-brain endpoint historically called a rolling window “this
  // week”. Drop that one goal card and replace it with the canonical
  // Sunday-Saturday value already shown in this tab; keep its other genuine
  // patterns (consistency, favorite activity, correlations).
  const nonGoalRecommendations = recommendations.filter((item) => {
    if (item.type === 'action') return false;
    const copyText = `${item.title || ''} ${item.message || item.description || ''}`;
    return !/meeting activity guidelines|minutes this week|\bthis week\b.*\bmin/i.test(copyText);
  });
  const canonicalWeeklyInsight = {
    id: 'activity-current-calendar-week',
    type: 'insight',
    icon: cdcGoalPercent >= 100 ? 'checkmark-circle-outline' : 'walk-outline',
    color: cdcGoalPercent >= 100 ? SEMANTIC.success.base : COLOR,
    title: cdcGoalPercent >= 100 ? 'Current-week target reached' : `${Math.max(0, CDC_WEEKLY_GOAL - weeklyGoalMinutes)} minutes remain this week`,
    message: `${weeklyGoalMinutes} of ${CDC_WEEKLY_GOAL} minutes in the current Sunday–Saturday week.`,
  };
  const insightRecommendations = [canonicalWeeklyInsight, ...nonGoalRecommendations].slice(0, 3);
  const activeDayPercent = weekData.length ? Math.round((activeDays / weekData.length) * 100) : 0;
  const navigate = (route) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(route); };
  const fallbackInsights = [
    { icon: cdcGoalPercent >= 100 ? 'checkmark-circle-outline' : 'walk-outline', color: cdcGoalPercent >= 100 ? SEMANTIC.success.base : COLOR, title: cdcGoalPercent >= 100 ? 'Weekly movement target reached' : `${Math.max(0, CDC_WEEKLY_GOAL - weeklyGoalMinutes)} minutes remain this week`, message: `${weeklyGoalMinutes} of ${CDC_WEEKLY_GOAL} minutes toward the fixed weekly guideline.` },
    { icon: 'calendar-outline', color: '#6B82AD', title: `${activeDays} active day${activeDays === 1 ? '' : 's'} ${copy.noun}`, message: `${activeDayPercent}% of days in the selected range include logged movement.` },
    { icon: 'flame-outline', color: '#D97706', title: streak > 0 ? `${streak}-day current streak` : 'Consistency starts with one entry', message: 'Streak is based on consecutive days with logged activity.' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}>
      {actionRecommendations.map((item, index) => <RecommendationCard key={item.id || index} recommendation={item} onComplete={onCompleteRecommendation} onDismiss={onDismissRecommendation} compact />)}
      {data && !hasRealData ? <AnalyticsEmptyState icon="fitness-outline" iconColor={COLOR} title={`No activity logged ${copy.noun}`} subtitle={getActivityEmptySubtitle(primaryGoal) || 'Log a workout to begin seeing movement patterns.'} /> : data && (
        <>
          <ProgressHero color={COLOR} tint="#ECFDF5" eyebrow={`${copy.eyebrow} · MOVEMENT SNAPSHOT`} title={`${totalMinutes} active minute${totalMinutes === 1 ? '' : 's'}`} subtitle={`${activeDays} active day${activeDays === 1 ? '' : 's'} in the selected range.`} badge="Rolling-range totals and calendar-week goal are shown separately" icon="fitness" value={`${Math.min(cdcGoalPercent, 999)}%`} valueLabel="this week" />
          <MetricRow>
            <MetricTile icon="time-outline" color={COLOR} value={`${totalMinutes}`} label="Range minutes" hint={copy.noun} />
            <MetricTile icon="calendar-clear-outline" color="#6B82AD" value={`${activeDays}/${weekData.length || (period === 'today' ? 1 : period === 'month' ? 30 : 7)}`} label="Active days" hint={`${activeDayPercent}% coverage`} />
            <MetricTile icon="flame-outline" color="#D97706" value={`${streak}`} label="Day streak" hint="consecutive days" />
          </MetricRow>
          <ProgressCard>
            <SectionHeader eyebrow="CURRENT WEEK" title="150-minute progress" subtitle="Sunday–Saturday calendar week, independent of the rolling range above" icon="ribbon-outline" color={COLOR} />
            <ProgressBar label={`${weeklyGoalMinutes} of ${CDC_WEEKLY_GOAL} minutes`} value={cdcGoalPercent} displayValue={`${Math.round(cdcGoalPercent)}%`} color={cdcGoalPercent >= 100 ? SEMANTIC.success.base : COLOR} icon="walk-outline" />
          </ProgressCard>
          {weekData.length > 0 && <ProgressCard>
            <SectionHeader eyebrow="MOVEMENT OVER TIME" title={`Daily minutes ${copy.noun}`} subtitle="Logged activity minutes by calendar day" icon="analytics-outline" color={COLOR} />
            <MiniLineChart data={weekData.map((day) => Number(day.minutes || 0))} labels={weekData.map((day) => day.label)} width={CHART_WIDTH} height={132} color={COLOR} showGrid showDots={weekData.length <= 10} minDomain={0} maxLabels={period === 'month' ? 6 : 7} accessibilityLabel={`${copy.eyebrow.toLowerCase()} daily activity minutes`} />
          </ProgressCard>}
          <SectionIntro eyebrow="PERSONAL CONTEXT" title="What stands out" subtitle={insightRecommendations.length ? `Rolling ${insightRecommendations[0].windowDays || 14}-day observations from logged movement—not medical advice or proof of cause.` : `Selected-range observations from logged movement ${copy.noun}.`} color={COLOR} />
          {insightRecommendations.length ? <View style={styles.recommendations}>{insightRecommendations.map((item, index) => <RecommendationCard key={item.id || index} recommendation={item} onComplete={onCompleteRecommendation} onDismiss={onDismissRecommendation} compact />)}</View> : <InsightList items={fallbackInsights} />}
          <ActionRow>
            <ProgressAction icon="analytics-outline" label="Activity insights" hint="Recovery & patterns" color={COLOR} onPress={() => navigate('/insights/activity-insights')} />
            <ProgressAction icon="add-circle-outline" label="Log activity" hint="Add movement now" color={COLOR} onPress={() => navigate('/(tabs)/activity')} />
          </ActionRow>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: SPACING[4], paddingBottom: SPACING[10] }, recommendations: { gap: SPACING[2] } });
