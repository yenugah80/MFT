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
} from '../../constants/premiumTheme';

const CDC_WEEKLY_GOAL = 150; // minutes

export default function ActivityTab({ data, period, recommendations = [] }) {
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

  const { totalMinutes, cdcGoalPercent, activeDays, weekData, streak } = data || {};

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
              value={totalMinutes || 0}
              label="Minutes"
              subtitle={period === 'week' ? 'this week' : period}
              icon="time"
              iconColor={VIBRANT_WELLNESS.activity.solid}
            />
            <MetricCard
              value={`${Math.min(cdcGoalPercent || 0, 100)}%`}
              label="CDC Goal"
              subtitle="150 min/wk"
              icon="ribbon"
              iconColor={(cdcGoalPercent || 0) >= 100 ? '#10B981' : VIBRANT_WELLNESS.activity.solid}
            />
            <MetricCard
              value={activeDays || 0}
              label="Active Days"
              subtitle={`${streak || 0} day streak`}
              icon="calendar"
              iconColor={VIBRANT_WELLNESS.activity.solid}
            />
          </View>

          {/* CDC Goal Progress */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Goal Progress</Text>
            <View style={styles.goalContainer}>
              <View style={styles.arcContainer}>
                <View style={styles.arcBackground}>
                  <View
                    style={[
                      styles.arcFill,
                      {
                        width: `${Math.min(cdcGoalPercent || 0, 100)}%`,
                        backgroundColor: getGoalColor(cdcGoalPercent || 0),
                      },
                    ]}
                  />
                </View>
                <View style={styles.arcCenter}>
                  <Text style={styles.arcValue}>{totalMinutes || 0}</Text>
                  <Text style={styles.arcLabel}>of {CDC_WEEKLY_GOAL} min</Text>
                </View>
              </View>
              <Text style={styles.goalSubtext}>
                {(cdcGoalPercent || 0) >= 100
                  ? 'You hit your CDC goal!'
                  : `${CDC_WEEKLY_GOAL - (totalMinutes || 0)} minutes to go`}
              </Text>
            </View>
          </View>

          {/* Weekly Activity */}
          {weekData && weekData.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Week</Text>
              <View style={styles.weekContainer}>
                {weekData.map((day, index) => {
                  const height = day.minutes > 0 ? Math.min((day.minutes / 60) * 50, 50) : 4;
                  const isActive = day.minutes > 0;

                  return (
                    <View key={index} style={styles.dayColumn}>
                      <Text style={styles.dayMinutes}>
                        {day.minutes > 0 ? day.minutes : ''}
                      </Text>
                      <View
                        style={[
                          styles.dayBar,
                          {
                            height,
                            backgroundColor: isActive
                              ? VIBRANT_WELLNESS.activity.solid
                              : SURFACES.background.tertiary,
                          },
                        ]}
                      />
                      <Text style={styles.dayLabel}>{day.label}</Text>
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
      {recommendations.length === 0 && data && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Insights</Text>
          <View style={styles.insightsList}>
            <InsightItem
              icon={(cdcGoalPercent || 0) >= 100 ? 'checkmark-circle' : 'alert-circle'}
              color={(cdcGoalPercent || 0) >= 100 ? '#10B981' : '#F59E0B'}
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
  if (percentage >= 100) return '#10B981';
  if (percentage >= 70) return '#34D399';
  if (percentage >= 40) return '#F59E0B';
  return '#EF4444';
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
  goalContainer: {
    alignItems: 'center',
    gap: SPACING[3],
  },
  arcContainer: {
    width: '100%',
    alignItems: 'center',
  },
  arcBackground: {
    width: '100%',
    height: 16,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  arcFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  arcCenter: {
    alignItems: 'center',
    marginTop: SPACING[3],
  },
  arcValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  arcLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  goalSubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  weekContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING[1],
  },
  dayMinutes: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    height: 14,
  },
  dayBar: {
    width: '60%',
    borderRadius: RADIUS.sm,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
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
