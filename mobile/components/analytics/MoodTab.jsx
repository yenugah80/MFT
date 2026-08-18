/**
 * MoodTab - Enhanced analytics with personalized recommendations
 *
 * Displays:
 * - Key mood metrics (average score, dominant mood, trend)
 * - Personalized recommendations from AI
 * - Food-mood and activity-mood correlations
 * - Evidence-based insights
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import MetricCard from './MetricCard';
import RecommendationCard, { RecommendationSection } from './RecommendationCard';
import MiniLineChart from './MiniLineChart';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  CARD_SYSTEM,
  SEMANTIC,
  VIBRANT_WELLNESS,
  MOOD_PALETTE,
  BRAND,
} from '../../constants/premiumTheme';

// Screen width minus the container's own horizontal padding (SPACING[4] * 2)
// and the card's inner padding (CARD_SYSTEM.standard's SPACING[4] * 2).
const CHART_WIDTH = Dimensions.get('window').width - SPACING[4] * 4;

const MOOD_ICONS = {
  happy: 'happy',
  calm: 'leaf',
  focused: 'eye',
  energized: 'flash',
  neutral: 'remove',
  tired: 'moon',
  stressed: 'alert-circle',
  sad: 'sad',
};

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

// mood_log.mood is validated server-side to these 8 values on every write
// through the app (POST /mood/log rejects anything else), but historical
// rows written outside that path (seed/demo data, a future migration) can
// still contain something else. Falling back to "N/A"/dropping the entry
// silently, as this used to, turns one bad row into a badly broken card —
// capitalizing the raw value keeps the screen honest instead.
const capitalizeMood = (mood) => mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : 'N/A';
const FALLBACK_MOOD_COLOR = { base: '#9CA3AF', light: '#D1D5DB', dark: '#6B7280', bg: '#F3F4F6' };

export default function MoodTab({ data, period, recommendations = [], onRefresh, refreshing = false, onCompleteRecommendation, onDismissRecommendation }) {
  const router = useRouter();

  const handleViewPatterns = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights/mood-food-patterns');
  };

  // Empty state when no data and no recommendations
  if (!data && recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="happy-outline" size={48} color={TEXT.tertiary} />
        <Text style={styles.emptyText}>No mood data yet</Text>
        <Text style={styles.emptySubtext}>Track your mood to discover patterns and get personalized insights</Text>
      </View>
    );
  }

  const { avgScore, dominantMood, entriesLogged, bestDay, trend, hasDataInPeriod } = data || {};
  const moodColor = MOOD_PALETTE[dominantMood]?.base || VIBRANT_WELLNESS.mood.solid;
  // Single source of truth for "does this tab have anything to show" — the
  // same signal the insight cards below are generated from, so they can't
  // disagree with this empty-state check the way Nutrition/Hydration used to.
  const hasRealData = hasDataInPeriod ?? (entriesLogged || 0) > 0;
  const periodLabel = period === 'today' ? 'today' : period === 'month' ? 'this month' : 'this week';
  const periodAdjective = period === 'today' ? 'Today’s' : period === 'month' ? 'Monthly' : 'Weekly';

  // Separate recommendations by type
  const actionRecs = recommendations.filter(r => r.type === 'action');
  const insightRecs = recommendations.filter(r => r.type === 'insight');
  const patternRecs = recommendations.filter(r => r.type === 'pattern');
  const suggestionRecs = recommendations.filter(r => r.type === 'suggestion');

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={BRAND.primary}
          colors={[BRAND.primary]}
        />
      }
    >
      {/* Priority Actions */}
      {actionRecs.length > 0 && (
        <View style={styles.actionsSection}>
          {actionRecs.map((rec, idx) => (
            <RecommendationCard
              key={rec.id || idx}
              recommendation={rec}
              onComplete={onCompleteRecommendation}
              onDismiss={onDismissRecommendation}
            />
          ))}
        </View>
      )}

      {/* Key Metrics - Only show if we have real (non-zero) data, otherwise
          a friendly empty state instead of a wall of "0" cards */}
      {data && !hasRealData && (
        <AnalyticsEmptyState
          icon="happy-outline"
          iconColor={VIBRANT_WELLNESS.mood.solid}
          title="No mood data yet"
          subtitle="Track your mood to discover patterns and get personalized insights"
        />
      )}

      {data && hasRealData && (
        <>
          <View style={styles.metricsRow}>
            <MetricCard
              value={avgScore || '0.0'}
              label="Avg Score"
              subtitle="out of 10"
              icon="analytics"
              iconColor={VIBRANT_WELLNESS.mood.solid}
            />
            <MetricCard
              value={MOOD_LABELS[dominantMood] || capitalizeMood(dominantMood)}
              label="Top Mood"
              icon={MOOD_ICONS[dominantMood] || 'happy'}
              iconColor={moodColor}
            />
            <MetricCard
              value={entriesLogged || 0}
              label="Entries"
              subtitle={periodLabel}
              icon="journal"
              iconColor={VIBRANT_WELLNESS.mood.solid}
            />
          </View>

          {/* Mood Trend — previously hardcoded to the last 7 entries
              regardless of the selected period (trend itself is now the
              full period-scoped series from useAnalytics.js, so Month
              genuinely shows ~30 points instead of the same 7 as Week). */}
          {trend && trend.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{periodAdjective} Mood Trend</Text>
              <MiniLineChart
                data={trend.map((entry) => entry.intensity || 5)}
                labels={trend.map((entry) =>
                  // /mood/trends returns day-aggregate rows as { date, ... },
                  // not `loggedDate` — that mismatch produced "Invalid Date"
                  // on every point.
                  new Date(entry.date).toLocaleDateString('en-US', { weekday: 'narrow' })
                )}
                width={CHART_WIDTH}
                color={moodColor}
                showGrid
                showDots={trend.length <= 10}
              />
            </View>
          )}

          {/* Mood Distribution — built from moods actually present in
              `trend`, not a fixed list of known keys. Iterating only the
              known MOOD_PALETTE keys silently dropped any unrecognized
              value from the whole distribution (percentages that didn't
              sum to 100%, with no indication anything was missing). */}
          {trend && trend.length > 0 && (() => {
            const counts = {};
            trend.forEach((e) => {
              if (e.mood) counts[e.mood] = (counts[e.mood] || 0) + 1;
            });
            const rows = Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([mood, count]) => ({
                mood,
                count,
                percentage: Math.round((count / trend.length) * 100),
                colors: MOOD_PALETTE[mood] || FALLBACK_MOOD_COLOR,
                label: MOOD_LABELS[mood] || capitalizeMood(mood),
              }));

            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Mood Distribution</Text>
                <View style={styles.distributionContainer}>
                  {rows.map(({ mood, percentage, colors, label }) => (
                    <View key={mood} style={styles.distributionRow}>
                      <View style={styles.distributionHeader}>
                        <View style={styles.moodLabelRow}>
                          <View style={[styles.moodDot, { backgroundColor: colors.base }]} />
                          <Text style={styles.moodLabel}>{label}</Text>
                        </View>
                        <Text style={styles.moodPercentage}>{percentage}%</Text>
                      </View>
                      <View style={styles.distributionBarContainer}>
                        <View
                          style={[
                            styles.distributionBarFill,
                            { width: `${percentage}%`, backgroundColor: colors.base },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}
        </>
      )}

      {/* AI Insights Section */}
      {insightRecs.length > 0 && (
        <RecommendationSection
          title="Mood Insights"
          subtitle="Understanding your patterns"
          recommendations={insightRecs}
        />
      )}

      {/* Discovered Patterns */}
      {patternRecs.length > 0 && (
        <RecommendationSection
          title="Mood Patterns"
          subtitle="What affects your mood"
          recommendations={patternRecs}
        />
      )}

      {/* Smart Suggestions */}
      {suggestionRecs.length > 0 && (
        <RecommendationSection
          title="Mood Boosters"
          subtitle="Personalized tips"
          recommendations={suggestionRecs}
        />
      )}

      {/* Fallback static insights — gated on hasRealData too (not just
          recommendations.length), since bestDay/avgScore/dominantMood fall
          back to all-time stats when the period has zero entries. Without
          this, the tab showed "No mood data yet" and a populated Insights
          card side by side, contradicting each other. */}
      {recommendations.length === 0 && data && hasRealData && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>
          <View style={styles.insightsList}>
            {bestDay && (
              <InsightItem
                icon="star"
                color="#FBBF24"
                text={`Best mood day: ${bestDay}`}
              />
            )}
            <InsightItem
              icon="trending-up"
              color={parseFloat(avgScore) >= 6 ? SEMANTIC.success.base : SEMANTIC.warning.base}
              text={parseFloat(avgScore) >= 6 ? 'Your mood has been positive overall' : 'Room for improvement - try some self-care'}
            />
            <InsightItem
              icon="bulb"
              color={VIBRANT_WELLNESS.mood.solid}
              text={`Most common mood: ${MOOD_LABELS[dominantMood] || capitalizeMood(dominantMood)}`}
            />
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.patternsLink}
        onPress={handleViewPatterns}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="See mood and food patterns"
      >
        <Ionicons name="restaurant-outline" size={18} color={TEXT.primary} />
        <Text style={styles.patternsLinkText}>See Mood & Food Patterns</Text>
        <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  patternsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    ...CARD_SYSTEM.standard,
  },
  patternsLinkText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  distributionContainer: {
    gap: SPACING[3],
  },
  distributionRow: {
    gap: SPACING[1],
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  moodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  moodLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  moodPercentage: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  distributionBarContainer: {
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  distributionBarFill: {
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
  bottomPadding: {
    height: SPACING[8],
  },
});
