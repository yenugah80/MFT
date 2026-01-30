/**
 * WellnessTab - Cross-Domain Intelligence Dashboard
 *
 * Displays:
 * - Overall wellness score
 * - Cross-domain correlations (food-mood, hydration-energy, activity-mood)
 * - Power formula insights
 * - Focus recommendations
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export default function WellnessTab({ data, period, recommendations = [], stats }) {
  // Empty state when no data and no recommendations
  if (recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={48} color={TEXT.tertiary} />
        <Text style={styles.emptyText}>Cross-Domain Insights Coming</Text>
        <Text style={styles.emptySubtext}>
          Log data across nutrition, mood, activity, and hydration to discover how they connect
        </Text>
        <View style={styles.emptyHint}>
          <View style={styles.hintItem}>
            <Ionicons name="nutrition" size={20} color={VIBRANT_WELLNESS.nutrition.solid} />
            <Text style={styles.hintText}>Food</Text>
          </View>
          <Ionicons name="add" size={16} color={TEXT.tertiary} />
          <View style={styles.hintItem}>
            <Ionicons name="happy" size={20} color={VIBRANT_WELLNESS.mood.solid} />
            <Text style={styles.hintText}>Mood</Text>
          </View>
          <Ionicons name="add" size={16} color={TEXT.tertiary} />
          <View style={styles.hintItem}>
            <Ionicons name="water" size={20} color={VIBRANT_WELLNESS.hydration.solid} />
            <Text style={styles.hintText}>Water</Text>
          </View>
          <Ionicons name="add" size={16} color={TEXT.tertiary} />
          <View style={styles.hintItem}>
            <Ionicons name="fitness" size={20} color={VIBRANT_WELLNESS.activity.solid} />
            <Text style={styles.hintText}>Activity</Text>
          </View>
        </View>
      </View>
    );
  }

  // Separate recommendations by type
  const scoreRecs = recommendations.filter(r => r.id?.includes('wellness_score'));
  const focusRecs = recommendations.filter(r => r.id?.includes('focus') || r.id?.includes('strength'));
  const patternRecs = recommendations.filter(r => r.type === 'pattern');
  const insightRecs = recommendations.filter(r => r.type === 'insight' && !r.id?.includes('wellness_score') && !r.id?.includes('strength'));

  // Extract wellness score from the first score recommendation
  const wellnessScoreRec = scoreRecs[0];
  const wellnessScore = wellnessScoreRec?.metric?.overall || 0;
  const breakdown = wellnessScoreRec?.metric?.breakdown || {};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Wellness Score Card */}
      {wellnessScoreRec && (
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>Wellness Score</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{wellnessScore}</Text>
            </View>
          </View>
          <Text style={styles.scoreMessage}>{wellnessScoreRec.message}</Text>

          {/* Breakdown Bars */}
          <View style={styles.breakdownContainer}>
            <BreakdownBar
              label="Nutrition"
              value={breakdown.nutrition || 0}
              color={VIBRANT_WELLNESS.nutrition.solid}
              icon="nutrition"
            />
            <BreakdownBar
              label="Hydration"
              value={breakdown.hydration || 0}
              color={VIBRANT_WELLNESS.hydration.solid}
              icon="water"
            />
            <BreakdownBar
              label="Activity"
              value={breakdown.activity || 0}
              color={VIBRANT_WELLNESS.activity.solid}
              icon="fitness"
            />
            <BreakdownBar
              label="Mood"
              value={breakdown.mood || 0}
              color={VIBRANT_WELLNESS.mood.solid}
              icon="happy"
            />
          </View>
        </View>
      )}

      {/* Focus Areas */}
      {focusRecs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus & Strengths</Text>
          {focusRecs.map((rec, idx) => (
            <RecommendationCard key={rec.id || idx} recommendation={rec} />
          ))}
        </View>
      )}

      {/* Cross-Domain Patterns */}
      {patternRecs.length > 0 && (
        <RecommendationSection
          title="Cross-Domain Patterns"
          subtitle="Connections we found in your data"
          recommendations={patternRecs}
        />
      )}

      {/* Additional Insights */}
      {insightRecs.length > 0 && (
        <RecommendationSection
          title="Wellness Insights"
          subtitle="Understanding your overall health"
          recommendations={insightRecs}
        />
      )}

      {/* How It Works */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={20} color="#6366F1" />
          <Text style={styles.infoTitle}>How Wellness Score Works</Text>
        </View>
        <Text style={styles.infoText}>
          Your wellness score combines nutrition, hydration, activity, and mood.
          We analyze cross-domain patterns to discover what helps you feel your best.
        </Text>
        <View style={styles.infoExamples}>
          <Text style={styles.infoExample}>Food + Mood = How diet affects your emotions</Text>
          <Text style={styles.infoExample}>Water + Energy = How hydration impacts focus</Text>
          <Text style={styles.infoExample}>Activity + Mood = How movement lifts your spirit</Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

function BreakdownBar({ label, value, color, icon }) {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownLabel}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={styles.breakdownLabelText}>{label}</Text>
      </View>
      <View style={styles.breakdownBarContainer}>
        <View
          style={[
            styles.breakdownBarFill,
            { width: `${Math.min(value, 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.breakdownValue, { color }]}>{Math.round(value)}%</Text>
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
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[4],
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: SPACING[2],
    textAlign: 'center',
  },
  emptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[6],
    gap: SPACING[2],
  },
  hintItem: {
    alignItems: 'center',
    gap: SPACING[1],
  },
  hintText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  scoreCard: {
    ...CARD_SYSTEM.standard,
    marginBottom: SPACING[4],
    backgroundColor: '#EC489910',
    borderColor: '#EC489930',
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  scoreTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EC4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  scoreMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 20,
    marginBottom: SPACING[4],
  },
  breakdownContainer: {
    gap: SPACING[3],
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    width: 90,
  },
  breakdownLabelText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  breakdownValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
    width: 40,
    textAlign: 'right',
  },
  section: {
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    marginBottom: SPACING[3],
  },
  infoCard: {
    ...CARD_SYSTEM.standard,
    backgroundColor: '#6366F110',
    borderColor: '#6366F130',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  infoText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 20,
    marginBottom: SPACING[3],
  },
  infoExamples: {
    gap: SPACING[1],
  },
  infoExample: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    paddingLeft: SPACING[2],
    borderLeftWidth: 2,
    borderLeftColor: '#6366F130',
  },
  bottomPadding: {
    height: SPACING[8],
  },
});
