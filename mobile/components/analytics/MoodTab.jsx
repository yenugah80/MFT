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
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MetricCard from './MetricCard';
import RecommendationCard, { RecommendationSection } from './RecommendationCard';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  CARD_SYSTEM,
  VIBRANT_WELLNESS,
  MOOD_PALETTE,
} from '../../constants/premiumTheme';

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

export default function MoodTab({ data, period, recommendations = [] }) {
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

  const { avgScore, dominantMood, entriesLogged, bestDay, trend } = data || {};
  const moodColor = MOOD_PALETTE[dominantMood]?.base || VIBRANT_WELLNESS.mood.solid;

  // Separate recommendations by type
  const actionRecs = recommendations.filter(r => r.type === 'action');
  const insightRecs = recommendations.filter(r => r.type === 'insight');
  const patternRecs = recommendations.filter(r => r.type === 'pattern');
  const suggestionRecs = recommendations.filter(r => r.type === 'suggestion');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Priority Actions */}
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
              value={avgScore || '0.0'}
              label="Avg Score"
              subtitle="out of 10"
              icon="analytics"
              iconColor={VIBRANT_WELLNESS.mood.solid}
            />
            <MetricCard
              value={MOOD_LABELS[dominantMood] || 'N/A'}
              label="Top Mood"
              icon={MOOD_ICONS[dominantMood] || 'happy'}
              iconColor={moodColor}
            />
            <MetricCard
              value={entriesLogged || 0}
              label="Entries"
              subtitle={period === 'today' ? 'today' : 'logged'}
              icon="journal"
              iconColor={VIBRANT_WELLNESS.mood.solid}
            />
          </View>

          {/* Mood Trend */}
          {trend && trend.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mood Trend</Text>
              <View style={styles.trendContainer}>
                {trend.slice(-7).map((entry, index) => {
                  const intensity = entry.intensity || 5;
                  const height = (intensity / 10) * 60;
                  const entryMood = entry.mood || 'neutral';
                  const entryColor = MOOD_PALETTE[entryMood]?.base || VIBRANT_WELLNESS.mood.solid;

                  return (
                    <View key={index} style={styles.trendBarWrapper}>
                      <View
                        style={[
                          styles.trendBar,
                          { height, backgroundColor: entryColor },
                        ]}
                      />
                      <Text style={styles.trendLabel}>
                        {new Date(entry.loggedDate).toLocaleDateString('en-US', { weekday: 'narrow' })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Mood Distribution */}
          {trend && trend.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mood Distribution</Text>
              <View style={styles.distributionContainer}>
                {Object.entries(MOOD_PALETTE).slice(0, 6).map(([mood, colors]) => {
                  const count = trend?.filter(e => e.mood === mood).length || 0;
                  const percentage = trend?.length > 0 ? Math.round((count / trend.length) * 100) : 0;

                  if (percentage === 0) return null;

                  return (
                    <View key={mood} style={styles.distributionRow}>
                      <View style={styles.distributionHeader}>
                        <View style={styles.moodLabelRow}>
                          <View style={[styles.moodDot, { backgroundColor: colors.base }]} />
                          <Text style={styles.moodLabel}>{MOOD_LABELS[mood]}</Text>
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
                  );
                })}
              </View>
            </View>
          )}
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

      {/* Fallback static insights */}
      {recommendations.length === 0 && data && (
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
              color={parseFloat(avgScore) >= 6 ? '#10B981' : '#F59E0B'}
              text={parseFloat(avgScore) >= 6 ? 'Your mood has been positive overall' : 'Room for improvement - try some self-care'}
            />
            <InsightItem
              icon="bulb"
              color={VIBRANT_WELLNESS.mood.solid}
              text={`Most common mood: ${MOOD_LABELS[dominantMood] || 'N/A'}`}
            />
          </View>
        </View>
      )}

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
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    gap: SPACING[2],
  },
  trendBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '80%',
    borderRadius: RADIUS.sm,
    minHeight: 8,
  },
  trendLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
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
