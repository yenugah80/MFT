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

export default function HydrationTab({ data, period, recommendations = [] }) {
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
              value={`${todayL}L`}
              label="Today"
              subtitle={`of ${goalL}L goal`}
              icon="water"
              iconColor={VIBRANT_WELLNESS.hydration.solid}
            />
            <MetricCard
              value={`${goalPercent || 0}%`}
              label="of Goal"
              icon="checkmark-circle"
              iconColor={(goalPercent || 0) >= 100 ? '#10B981' : VIBRANT_WELLNESS.hydration.solid}
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
              <View style={styles.ringWrapper}>
                <View style={styles.ringBackground}>
                  <View
                    style={[
                      styles.ringFill,
                      {
                        width: `${Math.min(goalPercent || 0, 100)}%`,
                        backgroundColor: getHydrationColor(goalPercent || 0),
                      },
                    ]}
                  />
                </View>
                <View style={styles.ringCenter}>
                  <Ionicons name="water" size={32} color={VIBRANT_WELLNESS.hydration.solid} />
                  <Text style={styles.ringValue}>{glasses}</Text>
                  <Text style={styles.ringLabel}>of {goalGlasses} glasses</Text>
                </View>
              </View>
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
              color={(goalPercent || 0) >= 100 ? '#10B981' : '#F59E0B'}
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
                color="#3B82F6"
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
  if (percentage >= 100) return '#10B981';
  if (percentage >= 75) return '#0891B2';
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
  ringWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  ringBackground: {
    width: '100%',
    height: 16,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  ringFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  ringCenter: {
    alignItems: 'center',
    marginTop: SPACING[4],
  },
  ringValue: {
    fontSize: TYPOGRAPHY.size['4xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginTop: SPACING[1],
  },
  ringLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
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
