/**
 * HydrationTab - Enhanced analytics with personalized recommendations
 *
 * Displays:
 * - Key hydration metrics (water intake, goal, streak)
 * - Personalized recommendations from AI
 * - Hydration-energy correlations
 * - Evidence-based insights
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import MetricCard from './MetricCard';
import RecommendationCard, { RecommendationSection } from './RecommendationCard';
import ProgressRing from './ProgressRing';
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
  BRAND,
} from '../../constants/premiumTheme';

export default function HydrationTab({ data, period, recommendations = [], onRefresh, refreshing = false }) {
  const router = useRouter();

  const handleViewFullAnalytics = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/analytics/hydration');
  };

  // Empty state when no data and no recommendations
  if (!data && recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="water-outline" size={48} color={TEXT.tertiary} />
        <Text style={styles.emptyText}>No hydration data yet</Text>
        <Text style={styles.emptySubtext}>Log water intake to see your progress and get personalized insights</Text>
      </View>
    );
  }

  const { todayMl, goalMl, goalPercent, streak, avgDaily } = data || {};
  const hasRealData = (todayMl || 0) > 0;

  // Convert ml to liters for display
  const todayL = ((todayMl || 0) / 1000).toFixed(1);
  const goalL = ((goalMl || 2000) / 1000).toFixed(1);
  const avgL = ((avgDaily || 0) / 1000).toFixed(1);

  // Calculate glasses (250ml = 1 glass)
  const glasses = Math.round((todayMl || 0) / 250);
  const goalGlasses = Math.round((goalMl || 2000) / 250);

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
      {/* Hydration has a dedicated analytics screen (trend, timing, beverage
          mix, persona, forecast). This tab stays as the at-a-glance summary
          inside the cross-domain view and hands off to it. */}
      <TouchableOpacity
        style={styles.fullAnalyticsLink}
        onPress={handleViewFullAnalytics}
        activeOpacity={0.8}
      >
        <View style={styles.fullAnalyticsIcon}>
          <Ionicons name="water" size={18} color={VIBRANT_WELLNESS.hydration.solid} />
        </View>
        <View style={styles.fullAnalyticsText}>
          <Text style={styles.fullAnalyticsTitle}>Full hydration analytics</Text>
          <Text style={styles.fullAnalyticsSubtitle}>
            Daily trend, when &amp; what you drink, your hydration type
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
      </TouchableOpacity>

      {/* Priority Actions */}
      {actionRecs.length > 0 && (
        <View style={styles.actionsSection}>
          {actionRecs.map((rec, idx) => (
            <RecommendationCard key={rec.id || idx} recommendation={rec} />
          ))}
        </View>
      )}

      {/* Key Metrics - Only show if we have real (non-zero) data, otherwise
          a friendly empty state instead of a wall of "0" cards */}
      {data && !hasRealData && (
        <AnalyticsEmptyState
          icon="water-outline"
          iconColor={VIBRANT_WELLNESS.hydration.solid}
          title="No hydration data yet"
          subtitle="Log water intake to see your progress and get personalized insights"
        />
      )}

      {data && hasRealData && (
        <>
          <View style={styles.metricsRow}>
            <MetricCard
              value={`${todayL}L`}
              label="Today"
              subtitle={`of ${goalL}L goal`}
              icon="water"
              iconColor={VIBRANT_WELLNESS.hydration.solid}
            />
            <MetricCard
              value={`${goalPercent || 0}%`}
              label="of Goal"
              // A checkmark below goal reads as "done" at 15% — only show it
              // once the goal is actually met.
              icon={(goalPercent || 0) >= 100 ? 'checkmark-circle' : 'ellipse-outline'}
              iconColor={(goalPercent || 0) >= 100 ? SEMANTIC.success.base : VIBRANT_WELLNESS.hydration.solid}
            />
            <MetricCard
              value={streak || 0}
              label="Day Streak"
              subtitle="goal met"
              icon="flame"
              iconColor={(streak || 0) > 0 ? '#F97316' : TEXT.tertiary}
            />
          </View>

          {/* Progress Ring */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Daily Progress</Text>
            <View style={styles.ringContainer}>
              <ProgressRing
                value={todayMl || 0}
                goal={goalMl || 2000}
                color={getHydrationColor(goalPercent || 0)}
                icon="water"
                centerValue={glasses}
                centerLabel={`of ${goalGlasses} glasses`}
              />
            </View>
          </View>

          {/* Water Glasses Visual */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Glasses Today</Text>
            <View style={styles.glassesContainer}>
              {Array.from({ length: goalGlasses }).map((_, index) => {
                const isFilled = index < glasses;
                return (
                  <View
                    key={index}
                    style={[
                      styles.glass,
                      {
                        backgroundColor: isFilled
                          ? VIBRANT_WELLNESS.hydration.solid
                          : SURFACES.background.tertiary,
                      },
                    ]}
                  >
                    <Ionicons
                      name="water"
                      size={16}
                      color={isFilled ? '#FFFFFF' : TEXT.muted}
                    />
                  </View>
                );
              })}
            </View>
            <Text style={styles.glassesSubtext}>
              Each glass = 250ml
            </Text>
          </View>
        </>
      )}

      {/* AI Insights Section */}
      {insightRecs.length > 0 && (
        <RecommendationSection
          title="Hydration Insights"
          subtitle="Understanding your patterns"
          recommendations={insightRecs}
        />
      )}

      {/* Discovered Patterns */}
      {patternRecs.length > 0 && (
        <RecommendationSection
          title="Hydration Patterns"
          subtitle="How water affects you"
          recommendations={patternRecs}
        />
      )}

      {/* Smart Suggestions */}
      {suggestionRecs.length > 0 && (
        <RecommendationSection
          title="Hydration Tips"
          subtitle="Personalized guidance"
          recommendations={suggestionRecs}
        />
      )}

      {/* Fallback static insights */}
      {recommendations.length === 0 && data && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>
          <View style={styles.insightsList}>
            <InsightItem
              icon={(goalPercent || 0) >= 100 ? 'checkmark-circle' : 'alert-circle'}
              color={(goalPercent || 0) >= 100 ? SEMANTIC.success.base : SEMANTIC.warning.base}
              text={
                (goalPercent || 0) >= 100
                  ? 'You hit your hydration goal!'
                  : `${Math.round((goalMl || 2000) - (todayMl || 0))}ml to go today`
              }
            />
            {(avgDaily || 0) > 0 && (
              <InsightItem
                icon="stats-chart"
                color={VIBRANT_WELLNESS.hydration.solid}
                text={`Average daily intake: ${avgL}L`}
              />
            )}
            {(streak || 0) > 2 && (
              <InsightItem
                icon="flame"
                color="#F97316"
                text={`${streak} day streak - great consistency!`}
              />
            )}
            {(goalPercent || 0) < 50 && (
              <InsightItem
                icon="notifications"
                color={SEMANTIC.info.base}
                text="Tip: Set reminders to drink water throughout the day"
              />
            )}
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

function getHydrationColor(percentage) {
  // Below 100%, these are shades of the hydration domain's own blue getting
  // lighter the further you are from goal — not generic status colors, so
  // SEMANTIC tokens don't apply to the middle two tiers the way they do
  // for "goal met."
  if (percentage >= 100) return SEMANTIC.success.base;
  if (percentage >= 75) return VIBRANT_WELLNESS.hydration.solid;
  if (percentage >= 50) return '#06B6D4';
  return '#22D3EE';
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
  fullAnalyticsLink: {
    ...CARD_SYSTEM.standard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  fullAnalyticsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${VIBRANT_WELLNESS.hydration.solid}15`,
  },
  fullAnalyticsText: {
    flex: 1,
  },
  fullAnalyticsTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  fullAnalyticsSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
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
  ringContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  glassesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    justifyContent: 'center',
  },
  glass: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassesSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textAlign: 'center',
    marginTop: SPACING[3],
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
