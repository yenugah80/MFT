/**
 * MoodTab — a range-scoped, evidence-first mood progress view.
 *
 * Mood intensity is not a wellbeing score. A high stressed intensity is not
 * "better" than a low calm intensity, so intensity, energy, frequency, and
 * mood mix are presented as separate signals.
 */

import React, { useMemo } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import MoodIcon3D from '../MoodTracker/MoodIcon3D';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import MiniLineChart from './MiniLineChart';
import RecommendationCard from './RecommendationCard';
import {
  BRAND,
  CARD_SYSTEM,
  MOOD_PALETTE,
  RADIUS,
  SPACING,
  SURFACES,
  TEXT,
  TYPOGRAPHY,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

const CHART_WIDTH = Dimensions.get('window').width - SPACING[4] * 4;
const FALLBACK_MOOD_COLOR = { base: '#8A7F78', bg: '#F5F2EF' };

const MOOD_LABELS = {
  happy: 'Happy',
  calm: 'Calm',
  focused: 'Focused',
  energized: 'Energized',
  neutral: 'Neutral',
  tired: 'Tired',
  stressed: 'Stressed',
  sad: 'Sad',
};

const PERIOD_COPY = {
  today: { eyebrow: 'TODAY', noun: 'today' },
  week: { eyebrow: 'THIS WEEK', noun: 'this week' },
  month: { eyebrow: 'THIS MONTH', noun: 'this month' },
};

const capitalizeMood = (mood) => (
  mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : 'Not available'
);

const formatTrendLabel = (date, period) => {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', period === 'month'
    ? { month: 'short', day: 'numeric' }
    : { weekday: 'narrow' });
};

export default function MoodTab({
  data,
  period,
  recommendations = [],
  onRefresh,
  refreshing = false,
  onCompleteRecommendation,
  onDismissRecommendation,
}) {
  const router = useRouter();
  const copy = PERIOD_COPY[period] || PERIOD_COPY.week;
  const hasRealData = data?.hasDataInPeriod ?? (data?.entriesLogged || 0) > 0;
  const dominantMood = data?.dominantMood || 'neutral';
  const dominantLabel = MOOD_LABELS[dominantMood] || capitalizeMood(dominantMood);
  const moodColors = MOOD_PALETTE[dominantMood] || FALLBACK_MOOD_COLOR;
  const moodColor = moodColors.base || VIBRANT_WELLNESS.mood.solid;
  const trend = Array.isArray(data?.trend) ? data.trend : [];
  const distribution = Array.isArray(data?.distribution) ? data.distribution : [];
  const actionRecommendations = recommendations.filter((item) => item.type === 'action');
  const insightRecommendations = recommendations.filter((item) => item.type !== 'action').slice(0, 3);

  const trendFacts = useMemo(() => {
    if (!trend.length) return [];
    const facts = [];
    if (data?.highestIntensityDay && Number.isFinite(data?.highestIntensity)) {
      facts.push({
        icon: 'pulse-outline',
        label: 'Highest intensity',
        value: `${data.highestIntensityDay} · ${Number(data.highestIntensity).toFixed(1)}`,
      });
    }
    if (data?.intensityRange) {
      facts.push({
        icon: 'swap-vertical-outline',
        label: 'Observed range',
        value: `${Number(data.intensityRange.min).toFixed(1)}–${Number(data.intensityRange.max).toFixed(1)}`,
      });
    }
    return facts;
  }, [data, trend.length]);

  const fallbackInsights = useMemo(() => {
    if (!hasRealData) return [];
    const coverage = data?.coveragePercent || 0;
    const observedMoodCount = distribution.length;
    return [
      {
        icon: 'calendar-outline',
        color: '#6B82AD',
        title: coverage >= 70 ? 'A clear picture is forming' : 'More check-ins will sharpen this view',
        message: `You checked in on ${data?.trackedDays || 0} of ${data?.periodDays || 0} days (${coverage}%).`,
      },
      {
        icon: 'color-palette-outline',
        color: moodColor,
        title: `${observedMoodCount} mood${observedMoodCount === 1 ? '' : 's'} observed`,
        message: `${dominantLabel} was most frequent. Distribution reflects individual check-ins, not daily averages.`,
      },
      {
        icon: 'flash-outline',
        color: '#D89B36',
        title: `Average energy ${data?.avgEnergy || '0.0'}/10`,
        message: 'Energy is separate from intensity, so changes are not mistaken for better or worse mood.',
      },
    ];
  }, [data, distribution.length, dominantLabel, hasRealData, moodColor]);

  const handleViewHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/history/mood');
  };

  const handleViewPatterns = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights/mood-food-patterns');
  };

  if (!data && recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <AnalyticsEmptyState
          icon="happy-outline"
          iconColor={VIBRANT_WELLNESS.mood.solid}
          title="No mood data yet"
          subtitle="Log a mood to begin seeing intensity, energy, and check-in patterns."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={(
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} colors={[BRAND.primary]} />
      )}
    >
      {actionRecommendations.map((recommendation, index) => (
        <RecommendationCard
          key={recommendation.id || index}
          recommendation={recommendation}
          onComplete={onCompleteRecommendation}
          onDismiss={onDismissRecommendation}
          compact
        />
      ))}

      {data && !hasRealData && (
        <AnalyticsEmptyState
          icon="happy-outline"
          iconColor={VIBRANT_WELLNESS.mood.solid}
          title={`No mood check-ins ${copy.noun}`}
          subtitle="Try another range or log how you feel to start building a pattern."
        />
      )}

      {data && hasRealData && (
        <>
          <LinearGradient
            colors={[moodColors.bg || '#F5F2EF', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { borderColor: `${moodColor}24` }]}
          >
            <View style={styles.heroCopy}>
              <Text style={[styles.eyebrow, { color: moodColor }]}>{copy.eyebrow} · MOOD SNAPSHOT</Text>
              <Text style={styles.heroTitle}>{dominantLabel} showed up most</Text>
              <Text style={styles.heroSubtitle}>
                {data.entriesLogged} check-in{data.entriesLogged === 1 ? '' : 's'} across {data.trackedDays} day{data.trackedDays === 1 ? '' : 's'}
              </Text>
              <View style={[styles.heroBadge, { backgroundColor: `${moodColor}12` }]}>
                <Ionicons name="information-circle-outline" size={14} color={moodColor} />
                <Text style={[styles.heroBadgeText, { color: moodColor }]}>Frequency, not a judgment</Text>
              </View>
            </View>
            <View style={[styles.heroMood, { backgroundColor: `${moodColor}12` }]}>
              <MoodIcon3D mood={dominantMood} size={64} showLabel={false} selected={false} interactive={false} compact resizeMode="contain" />
            </View>
          </LinearGradient>

          <View style={styles.metricsRow}>
            <MetricTile icon="pulse-outline" color={moodColor} value={`${data.avgIntensity || data.avgScore}/10`} label="Avg intensity" hint="Strength of feeling" />
            <MetricTile icon="flash-outline" color="#D89B36" value={`${data.avgEnergy}/10`} label="Avg energy" hint="Separate signal" />
            <MetricTile icon="calendar-clear-outline" color="#6B82AD" value={`${data.trackedDays}/${data.periodDays}`} label="Days checked in" hint={`${data.coveragePercent}% coverage`} />
          </View>

          {trend.length > 0 && (
            <View style={styles.card}>
              <SectionHeader eyebrow="INTENSITY OVER TIME" title="How strongly moods showed up" subtitle="Fixed 1–10 scale · higher means stronger, not better" icon="analytics-outline" color={moodColor} />
              <MiniLineChart
                data={trend.map((entry) => Number(entry.intensity || 0))}
                labels={trend.map((entry) => formatTrendLabel(entry.date, period))}
                width={CHART_WIDTH}
                height={132}
                color={moodColor}
                showGrid
                showDots={trend.length <= 10}
                minDomain={1}
                maxDomain={10}
                maxLabels={period === 'month' ? 6 : 7}
                accessibilityLabel={`${copy.eyebrow.toLowerCase()} mood intensity trend on a fixed scale from 1 to 10`}
              />
              {trendFacts.length > 0 && (
                <View style={styles.factRow}>
                  {trendFacts.map((fact) => (
                    <View key={fact.label} style={styles.fact} accessible accessibilityLabel={`${fact.label}, ${fact.value}`}>
                      <Ionicons name={fact.icon} size={15} color={TEXT.tertiary} />
                      <View style={styles.factCopy}>
                        <Text style={styles.factLabel}>{fact.label}</Text>
                        <Text style={styles.factValue}>{fact.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {distribution.length > 0 && (
            <View style={styles.card}>
              <SectionHeader eyebrow="MOOD MIX" title="What you logged" subtitle={`${data.entriesLogged} individual check-in${data.entriesLogged === 1 ? '' : 's'} ${copy.noun}`} icon="color-palette-outline" color={moodColor} />
              <View style={styles.distributionList}>
                {distribution.slice(0, 6).map((row) => {
                  const colors = MOOD_PALETTE[row.mood] || FALLBACK_MOOD_COLOR;
                  const label = MOOD_LABELS[row.mood] || capitalizeMood(row.mood);
                  return (
                    <View key={row.mood} style={styles.distributionRow} accessible accessibilityLabel={`${label}, ${row.count} check-ins, ${row.percentage} percent`}>
                      <View style={styles.distributionHeader}>
                        <View style={styles.distributionName}>
                          <View style={[styles.moodDot, { backgroundColor: colors.base }]} />
                          <Text style={styles.moodLabel}>{label}</Text>
                          <Text style={styles.moodCount}>{row.count}</Text>
                        </View>
                        <Text style={styles.moodPercentage}>{row.percentage}%</Text>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${row.percentage}%`, backgroundColor: colors.base }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionEyebrow}>PERSONAL CONTEXT</Text>
            <Text style={styles.sectionTitle}>What stands out</Text>
            <Text style={styles.sectionSubtitle}>{insightRecommendations.length ? `Rolling ${insightRecommendations[0].windowDays || 14}-day observations from logged moods—not diagnoses or claims of cause.` : `Selected-range observations from logged moods ${copy.noun}.`}</Text>
          </View>

          {insightRecommendations.length > 0 ? (
            <View style={styles.recommendations}>
              {insightRecommendations.map((recommendation, index) => (
                <RecommendationCard key={recommendation.id || index} recommendation={recommendation} onComplete={onCompleteRecommendation} onDismiss={onDismissRecommendation} compact />
              ))}
            </View>
          ) : (
            <View style={styles.insightCard}>
              {fallbackInsights.map((insight, index) => (
                <View key={insight.title} style={[styles.insightRow, index > 0 && styles.insightDivider]}>
                  <View style={[styles.insightIcon, { backgroundColor: `${insight.color}12` }]}>
                    <Ionicons name={insight.icon} size={19} color={insight.color} />
                  </View>
                  <View style={styles.insightCopy}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightMessage}>{insight.message}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionsRow}>
            <ProgressAction icon="time-outline" label="Mood history" hint="Review every check-in" color={moodColor} onPress={handleViewHistory} />
            <ProgressAction icon="git-compare-outline" label="Mood & food" hint="Explore associations" color={moodColor} onPress={handleViewPatterns} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

function MetricTile({ icon, color, value, label, hint }) {
  return (
    <View style={styles.metricTile} accessible accessibilityLabel={`${label}, ${value}. ${hint}`}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}12` }]}><Ionicons name={icon} size={18} color={color} /></View>
      <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricHint} numberOfLines={1}>{hint}</Text>
    </View>
  );
}

function SectionHeader({ eyebrow, title, subtitle, icon, color }) {
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.cardIcon, { backgroundColor: `${color}12` }]}><Ionicons name={icon} size={19} color={color} /></View>
      <View style={styles.cardHeaderCopy}>
        <Text style={[styles.cardEyebrow, { color }]}>{eyebrow}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function ProgressAction({ icon, label, hint, color, onPress }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}>
      <View style={[styles.actionIcon, { backgroundColor: `${color}12` }]}><Ionicons name={icon} size={18} color={color} /></View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING[4], paddingBottom: SPACING[10] },
  emptyContainer: { flex: 1, padding: SPACING[4] },
  heroCard: {
    minHeight: 154,
    borderRadius: RADIUS['2xl'],
    borderWidth: 1,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroCopy: { flex: 1, paddingRight: SPACING[3] },
  eyebrow: { fontSize: 10, letterSpacing: 1.1, fontFamily: TYPOGRAPHY.family.bold, marginBottom: SPACING[1] },
  heroTitle: { fontSize: TYPOGRAPHY.size['2xl'], lineHeight: 29, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  heroSubtitle: { marginTop: SPACING[1], fontSize: TYPOGRAPHY.size.sm, lineHeight: 18, color: TEXT.secondary },
  heroBadge: { marginTop: SPACING[3], alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.full, paddingHorizontal: SPACING[2], paddingVertical: 5 },
  heroBadgeText: { fontSize: 10, fontFamily: TYPOGRAPHY.family.semibold },
  heroMood: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  metricsRow: { flexDirection: 'row', gap: SPACING[2], marginBottom: SPACING[3] },
  metricTile: {
    ...CARD_SYSTEM.compact,
    flex: 1,
    minWidth: 0,
    minHeight: 122,
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    padding: SPACING[3],
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  metricIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING[2] },
  metricValue: { width: '100%', fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  metricLabel: { marginTop: 2, fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary },
  metricHint: { marginTop: 3, width: '100%', fontSize: 9, color: TEXT.tertiary },
  card: { ...CARD_SYSTEM.standard, borderRadius: RADIUS['2xl'], marginBottom: SPACING[3] },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING[3] },
  cardIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: SPACING[3] },
  cardHeaderCopy: { flex: 1 },
  cardEyebrow: { fontSize: 9, letterSpacing: 0.9, fontFamily: TYPOGRAPHY.family.bold, marginBottom: 2 },
  cardTitle: { fontSize: TYPOGRAPHY.size.md, lineHeight: 20, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  cardSubtitle: { marginTop: 3, fontSize: 11, lineHeight: 15, color: TEXT.tertiary },
  factRow: { flexDirection: 'row', gap: SPACING[2], paddingTop: SPACING[3], marginTop: SPACING[1], borderTopWidth: 1, borderTopColor: SURFACES.divider },
  fact: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  factCopy: { flex: 1 },
  factLabel: { fontSize: 9, color: TEXT.tertiary },
  factValue: { marginTop: 1, fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  distributionList: { gap: SPACING[3] },
  distributionRow: { gap: 6 },
  distributionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  distributionName: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  moodDot: { width: 10, height: 10, borderRadius: 5 },
  moodLabel: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  moodCount: { minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full, backgroundColor: SURFACES.background.tertiary, textAlign: 'center', fontSize: 9, color: TEXT.tertiary },
  moodPercentage: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.secondary },
  track: { height: 7, overflow: 'hidden', borderRadius: RADIUS.full, backgroundColor: SURFACES.background.tertiary },
  fill: { height: '100%', borderRadius: RADIUS.full },
  sectionHeading: { marginTop: SPACING[2], marginBottom: SPACING[3] },
  sectionEyebrow: { fontSize: 10, letterSpacing: 1, fontFamily: TYPOGRAPHY.family.bold, color: VIBRANT_WELLNESS.mood.solid },
  sectionTitle: { marginTop: 3, fontSize: TYPOGRAPHY.size.xl, fontFamily: TYPOGRAPHY.family.bold, color: TEXT.primary },
  sectionSubtitle: { marginTop: 4, fontSize: TYPOGRAPHY.size.sm, lineHeight: 18, color: TEXT.tertiary },
  recommendations: { gap: SPACING[2] },
  insightCard: { ...CARD_SYSTEM.standard, borderRadius: RADIUS['2xl'], marginBottom: SPACING[3] },
  insightRow: { flexDirection: 'row', paddingVertical: SPACING[2] },
  insightDivider: { borderTopWidth: 1, borderTopColor: SURFACES.divider, marginTop: SPACING[2], paddingTop: SPACING[4] },
  insightIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: SPACING[3] },
  insightCopy: { flex: 1 },
  insightTitle: { fontSize: TYPOGRAPHY.size.sm, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  insightMessage: { marginTop: 3, fontSize: 11, lineHeight: 16, color: TEXT.secondary },
  actionsRow: { flexDirection: 'row', gap: SPACING[2], marginTop: SPACING[1] },
  action: { flex: 1, minWidth: 0, minHeight: 72, flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACES.card.primary, borderWidth: 1, borderColor: SURFACES.card.border, borderRadius: RADIUS.xl, padding: SPACING[3] },
  actionIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: SPACING[2] },
  actionCopy: { flex: 1, minWidth: 0 },
  actionLabel: { fontSize: 11, fontFamily: TYPOGRAPHY.family.semibold, color: TEXT.primary },
  actionHint: { marginTop: 2, fontSize: 9, color: TEXT.tertiary },
});
