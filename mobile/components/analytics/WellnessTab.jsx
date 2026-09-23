import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import AnalyticsEmptyState from './AnalyticsEmptyState';
import RecommendationCard from './RecommendationCard';
import { ActionRow, InsightList, MetricRow, MetricTile, PERIOD_COPY, ProgressAction, ProgressBar, ProgressCard, ProgressHero, SectionHeader, SectionIntro } from './ProgressUI';
import { BRAND, SPACING, VIBRANT_WELLNESS } from '../../constants/premiumTheme';

const WELLNESS_COLOR = BRAND.primary;
const DOMAIN_ROWS = [
  { key: 'nutrition', label: 'Nutrition', icon: 'nutrition', color: VIBRANT_WELLNESS.nutrition.solid },
  { key: 'hydration', label: 'Hydration', icon: 'water', color: VIBRANT_WELLNESS.hydration.solid },
  { key: 'activity', label: 'Activity', icon: 'fitness', color: VIBRANT_WELLNESS.activity.solid },
  { key: 'mood', label: 'Mood', icon: 'happy', color: VIBRANT_WELLNESS.mood.solid },
];

export default function WellnessTab({ period, recommendations = [], onRefresh, refreshing = false }) {
  const router = useRouter();
  const copy = PERIOD_COPY[period] || PERIOD_COPY.week;
  const scoreRecommendation = recommendations.find((item) => item.id?.includes('wellness_score'));
  const wellnessScore = Number(scoreRecommendation?.metric?.overall || 0);
  const breakdown = scoreRecommendation?.metric?.breakdown || {};
  const visibleDomains = DOMAIN_ROWS.filter((item) => Number(breakdown[item.key]) > 0);
  const strongest = [...visibleDomains].sort((a, b) => Number(breakdown[b.key]) - Number(breakdown[a.key]))[0];
  const focus = [...visibleDomains].sort((a, b) => Number(breakdown[a.key]) - Number(breakdown[b.key]))[0];
  const contextRecommendations = recommendations.filter((item) => item !== scoreRecommendation && item.type !== 'action').slice(0, 3);
  const navigate = (route) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(route); };
  const hasScore = !!scoreRecommendation;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />}>
      {!hasScore ? (
        <AnalyticsEmptyState icon="heart-outline" iconColor={WELLNESS_COLOR} title="Your wellness picture is still forming" subtitle="Log nutrition, hydration, activity, and mood to unlock a balanced cross-domain view." />
      ) : (
        <>
          <ProgressHero color={WELLNESS_COLOR} tint="#F3F0FF" eyebrow={`${copy.eyebrow} · WHOLE-PERSON SNAPSHOT`} title={`${Math.round(wellnessScore)} out of 100`} subtitle={scoreRecommendation.message || 'A balanced view of four wellness signals.'} badge="An average of the four domain scores" icon="heart" value={wellnessScore >= 80 ? 'Strong' : wellnessScore >= 60 ? 'Steady' : wellnessScore >= 40 ? 'Building' : 'Starting'} valueLabel="overall balance" />
          <MetricRow>
            <MetricTile icon={strongest?.icon || 'sparkles-outline'} color={strongest?.color || WELLNESS_COLOR} value={strongest ? `${Math.round(breakdown[strongest.key])}%` : '—'} label="Strongest signal" hint={strongest?.label || 'More data needed'} />
            <MetricTile icon={focus?.icon || 'compass-outline'} color={focus?.color || WELLNESS_COLOR} value={focus ? `${Math.round(breakdown[focus.key])}%` : '—'} label="Focus area" hint={focus?.label || 'More data needed'} />
            <MetricTile icon="layers-outline" color={WELLNESS_COLOR} value={`${visibleDomains.length}/4`} label="Signals present" hint={copy.noun} />
          </MetricRow>
          <ProgressCard>
            <SectionHeader eyebrow="BALANCE BY DOMAIN" title="The score, unpacked" subtitle="Each bar contributes equally to the overall average" icon="options-outline" color={WELLNESS_COLOR} />
            {DOMAIN_ROWS.map((item) => <ProgressBar key={item.key} label={item.label} value={breakdown[item.key] || 0} color={item.color} icon={item.icon} />)}
          </ProgressCard>
          <SectionIntro eyebrow="PERSONAL CONTEXT" title="What stands out" subtitle="Observations from your logged data—not diagnoses or proof of cause." color={WELLNESS_COLOR} />
          {contextRecommendations.length > 0 ? <View style={styles.recommendations}>{contextRecommendations.map((item, index) => <RecommendationCard key={item.id || index} recommendation={item} compact />)}</View> : <InsightList items={[
            { icon: strongest?.icon || 'checkmark-circle-outline', color: strongest?.color || WELLNESS_COLOR, title: strongest ? `${strongest.label} is supporting your score` : 'Keep logging across domains', message: strongest ? `${Math.round(breakdown[strongest.key])}% is the strongest observed domain in this range.` : 'Cross-domain observations become clearer as coverage grows.' },
            { icon: focus?.icon || 'compass-outline', color: focus?.color || WELLNESS_COLOR, title: focus ? `${focus.label} has the most room to move` : 'No focus area yet', message: focus ? `At ${Math.round(breakdown[focus.key])}%, small consistent changes here may improve overall balance.` : 'The app will identify a focus after enough data is available.' },
          ]} />}
        </>
      )}
      <SectionIntro eyebrow="DEEP DIVES" title="Explore your patterns" subtitle="Open the detailed history and pattern screens already connected to your data." color={WELLNESS_COLOR} />
      <ActionRow>
        <ProgressAction icon="moon-outline" label="Sleep analytics" hint="Rest trends & patterns" color={VIBRANT_WELLNESS.sleep.solid} onPress={() => navigate('/insights/sleep-analytics')} />
        <ProgressAction icon="pulse-outline" label="Stress patterns" hint="Triggers & support" color={VIBRANT_WELLNESS.stress.solid} onPress={() => navigate('/insights/stress-patterns')} />
      </ActionRow>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: SPACING[4], paddingBottom: SPACING[10] }, recommendations: { gap: SPACING[2] } });
