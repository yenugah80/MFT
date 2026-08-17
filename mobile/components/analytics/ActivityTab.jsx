/**
 * ActivityTab - Enhanced analytics with personalized recommendations
 *
 * Displays:
 * - Key activity metrics (minutes, CDC goal, streak)
 * - Personalized recommendations from AI
 * - Activity-mood correlations
 * - Evidence-based insights
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MetricCard from './MetricCard';
import RecommendationCard, { RecommendationSection } from './RecommendationCard';
import ProgressRing from './ProgressRing';
import MiniBarChart from './MiniBarChart';
import MiniLineChart from './MiniLineChart';
import AnalyticsEmptyState from './AnalyticsEmptyState';
import { getActivityEmptySubtitle } from '../../utils/emptyStateCopy';
import {
  TEXT,
  SURFACES,
  SPACING,
  TYPOGRAPHY,
  CARD_SYSTEM,
  SEMANTIC,
  VIBRANT_WELLNESS,
  BRAND,
} from '../../constants/premiumTheme';

// Per-day scaling reference for the weekly bar chart — matches the previous
// hand-rolled bar's own assumption (60 min = a "full" day's bar).
const DAY_BAR_MAX_MINUTES = 60;

// MiniBarChart lays out one horizontal row per data point within a fixed
// height; past ~10 rows the per-row height goes negative. Month view now
// passes 30 days, so it switches to MiniLineChart instead.
const MAX_BAR_CHART_DAYS = 10;
const CHART_WIDTH = Dimensions.get('window').width - SPACING[4] * 4;

const CDC_WEEKLY_GOAL = 150; // minutes

export default function ActivityTab({ data, period, recommendations = [], onRefresh, refreshing = false, onCompleteRecommendation, onDismissRecommendation }) {
  // Empty state when no data and no recommendations
  if (!data && recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="fitness-outline" size={48} color={TEXT.tertiary} />
        <Text style={styles.emptyText}>No activity data yet</Text>
        <Text style={styles.emptySubtext}>Log a workout to see your progress and get personalized insights</Text>
      </View>
    );
  }

  const { totalMinutes, weeklyGoalMinutes, cdcGoalPercent, activeDays, weekData, streak, primaryGoal, hasDataInPeriod } = data || {};
  // Single source of truth for "does this tab have anything to show" — the
  // same period-scoped signal the insight cards below are generated from.
  const hasRealData = hasDataInPeriod ?? (totalMinutes || 0) > 0;
  const periodLabel = period === 'today' ? 'today' : period === 'month' ? 'this month' : 'this week';

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
          icon="fitness-outline"
          iconColor={VIBRANT_WELLNESS.activity.solid}
          title="No activity data yet"
          subtitle={getActivityEmptySubtitle(primaryGoal) || 'Log a workout to see your progress and get personalized insights'}
        />
      )}

      {data && hasRealData && (
        <>
          <View style={styles.metricsRow}>
            <MetricCard
              value={totalMinutes || 0}
              label="Minutes"
              subtitle={periodLabel}
              icon="time"
              iconColor={VIBRANT_WELLNESS.activity.solid}
            />
            <MetricCard
              value={`${Math.min(cdcGoalPercent || 0, 100)}%`}
              label="CDC Goal"
              subtitle="150 min/wk"
              icon="ribbon"
              iconColor={(cdcGoalPercent || 0) >= 100 ? SEMANTIC.success.base : VIBRANT_WELLNESS.activity.solid}
            />
            {/* CDC guideline is inherently weekly — this card intentionally
                does not change with the Day/Week/Month toggle. */}
            <MetricCard
              value={activeDays || 0}
              label="Active Days"
              subtitle={`${streak || 0} day streak`}
              icon="calendar"
              iconColor={VIBRANT_WELLNESS.activity.solid}
            />
          </View>

          {/* CDC Goal Progress — always "this week", regardless of the
              Day/Week/Month toggle above (see weeklyGoalMinutes comment
              in useAnalytics.js). */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Goal Progress</Text>
            <View style={styles.goalContainer}>
              <ProgressRing
                value={weeklyGoalMinutes || 0}
                goal={CDC_WEEKLY_GOAL}
                color={getGoalColor(cdcGoalPercent || 0)}
                centerValue={weeklyGoalMinutes || 0}
                centerLabel={`of ${CDC_WEEKLY_GOAL} min`}
              />
              <Text style={styles.goalSubtext}>
                {(cdcGoalPercent || 0) >= 100
                  ? 'You hit your CDC goal!'
                  : `${CDC_WEEKLY_GOAL - (weeklyGoalMinutes || 0)} minutes to go`}
              </Text>
            </View>
          </View>

          {/* Activity trend — genuinely reflects the selected period now.
              MiniBarChart's one-row-per-day layout only works up to
              MAX_BAR_CHART_DAYS; Month (30 days) switches to a line chart. */}
          {weekData && weekData.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {period === 'today' ? 'Today' : period === 'month' ? 'This Month' : 'This Week'}
              </Text>
              {weekData.length <= MAX_BAR_CHART_DAYS ? (
                <MiniBarChart
                  data={weekData.map((day) => ({
                    label: day.label,
                    value: day.minutes || 0,
                    maxValue: DAY_BAR_MAX_MINUTES,
                    color: (day.minutes || 0) > 0 ? VIBRANT_WELLNESS.activity.solid : SURFACES.background.tertiary,
                  }))}
                  unit="min"
                />
              ) : (
                <MiniLineChart
                  data={weekData.map((day) => day.minutes || 0)}
                  labels={weekData.map((day) => day.label)}
                  width={CHART_WIDTH}
                  color={VIBRANT_WELLNESS.activity.solid}
                  showDots={false}
                  showGrid
                />
              )}
            </View>
          )}
        </>
      )}

      {/* AI Insights Section */}
      {insightRecs.length > 0 && (
        <RecommendationSection
          title="Activity Insights"
          subtitle="Understanding your movement"
          recommendations={insightRecs}
        />
      )}

      {/* Discovered Patterns */}
      {patternRecs.length > 0 && (
        <RecommendationSection
          title="Activity Patterns"
          subtitle="How movement affects you"
          recommendations={patternRecs}
        />
      )}

      {/* Smart Suggestions */}
      {suggestionRecs.length > 0 && (
        <RecommendationSection
          title="Activity Ideas"
          subtitle="Personalized tips"
          recommendations={suggestionRecs}
        />
      )}

      {/* Fallback static insights */}
      {recommendations.length === 0 && data && hasRealData && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>
          <View style={styles.insightsList}>
            <InsightItem
              icon={(cdcGoalPercent || 0) >= 100 ? 'checkmark-circle' : 'alert-circle'}
              color={(cdcGoalPercent || 0) >= 100 ? SEMANTIC.success.base : SEMANTIC.warning.base}
              text={
                (cdcGoalPercent || 0) >= 100
                  ? 'Meeting CDC recommendation of 150 min/week'
                  : `${Math.round(cdcGoalPercent || 0)}% toward CDC weekly goal`
              }
            />
            {(streak || 0) > 0 && (
              <InsightItem
                icon="flame"
                color="#F97316"
                text={`${streak} day activity streak - keep it up!`}
              />
            )}
            {(activeDays || 0) >= 5 && (
              <InsightItem
                icon="trophy"
                color="#FBBF24"
                text="Great consistency - active 5+ days this week"
              />
            )}
            {(totalMinutes || 0) > 0 && (totalMinutes || 0) < 30 && (
              <InsightItem
                icon="walk"
                color={VIBRANT_WELLNESS.activity.solid}
                text="Even a short walk counts toward your goal"
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

function getGoalColor(percentage) {
  if (percentage >= 100) return SEMANTIC.success.base;
  if (percentage >= 70) return SEMANTIC.success.light;
  if (percentage >= 40) return SEMANTIC.warning.base;
  return SEMANTIC.danger.base;
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
  goalContainer: {
    alignItems: 'center',
    gap: SPACING[3],
  },
  goalSubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
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
