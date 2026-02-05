/**
 * Food-Mood Correlation Card
 *
 * Simple card showing how food affects mood
 * Clean, user-friendly design
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import CircularProgress from './CircularProgress';
import {
  TEXT,
  BRAND,
  SURFACES,
  SEMANTIC,
  SHADOWS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';
import { analyzeMultiFactorCorrelations } from '../../utils/multiFactorAnalytics';

export default function FoodMoodCorrelationCard({
  foodLogs = [],
  moodLogs = [],
  waterLogs = [],
  compact = true,
}) {
  const router = useRouter();

  // Analyze correlation
  const analysis = useMemo(() => {
    return analyzeMultiFactorCorrelations({
      foodLogs,
      moodLogs,
      waterLogs,
      activityLogs: [],
      sleepLogs: [],
    });
  }, [foodLogs, moodLogs, waterLogs]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights');
  };

  // Not enough data
  if (!analysis.canAnalyze) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: `${VIBRANT_WELLNESS.nutrition.solid}20` }]}>
            <Ionicons name="nutrition" size={24} color={VIBRANT_WELLNESS.nutrition.solid} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Food & Mood</Text>
            <Text style={styles.subtitle}>Track to see patterns</Text>
          </View>
        </View>
        <Text style={styles.emptyText}>
          Log meals and mood to see how your food affects how you feel
        </Text>
      </View>
    );
  }

  const { correlations } = analysis.correlations.food_mood;

  // Get top correlation
  const topCorrelation = correlations
    .sort((a, b) => Math.abs(b.effectSize) - Math.abs(a.effectSize))[0];

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityLabel="Food and mood insights"
        accessibilityRole="button"
      >
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: `${VIBRANT_WELLNESS.nutrition.solid}20` }]}>
            <Ionicons name="nutrition" size={24} color={VIBRANT_WELLNESS.nutrition.solid} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Food & Mood</Text>
            <Text style={styles.subtitle}>{analysis.daysAnalyzed} days tracked</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
        </View>

        {topCorrelation ? (
          <>
            <View style={styles.insightRow}>
              <Ionicons
                name={topCorrelation.effectSize > 0 ? 'trending-up' : 'trending-down'}
                size={18}
                color={topCorrelation.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base}
              />
              <Text style={styles.insightText}>
                <Text style={styles.insightHighlight}>{topCorrelation.factor}</Text>
                {' '}affects your mood
              </Text>
            </View>

            <View style={styles.impactRow}>
              <CircularProgress
                percentage={Math.abs(topCorrelation.effectSize) * 100}
                size={50}
                strokeWidth={5}
                color={topCorrelation.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base}
                showPercentage={false}
              >
                <Ionicons
                  name={topCorrelation.effectSize > 0 ? 'arrow-up' : 'arrow-down'}
                  size={16}
                  color={topCorrelation.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base}
                />
              </CircularProgress>
              <View style={styles.impactText}>
                <Text style={styles.impactValue}>
                  {topCorrelation.effectSize > 0 ? '+' : ''}
                  {Math.round(topCorrelation.effectSize * 100)}%
                </Text>
                <Text style={styles.impactLabel}>mood impact</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>
            Keep logging to discover patterns
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // Expanded view
  const topCorrelations = correlations
    .sort((a, b) => Math.abs(b.effectSize) - Math.abs(a.effectSize))
    .slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.headerExpanded}>
        <View style={[styles.iconBgLarge, { backgroundColor: `${VIBRANT_WELLNESS.nutrition.solid}20` }]}>
          <Ionicons name="nutrition" size={32} color={VIBRANT_WELLNESS.nutrition.solid} />
        </View>
        <View style={styles.headerTextExpanded}>
          <Text style={styles.titleExpanded}>Food & Mood</Text>
          <Text style={styles.subtitleExpanded}>
            {analysis.daysAnalyzed} days • {correlations.length} patterns found
          </Text>
        </View>
      </View>

      {/* Top Patterns */}
      <View style={styles.patternsSection}>
        <Text style={styles.sectionTitle}>Your Top Patterns</Text>
        {topCorrelations.map((corr, index) => (
          <View key={index} style={styles.patternCard}>
            <View style={styles.patternHeader}>
              <Text style={styles.patternName}>{corr.factor}</Text>
              <View style={[
                styles.effectBadge,
                { backgroundColor: corr.effectSize > 0 ? `${SEMANTIC.success.base}15` : `${SEMANTIC.warning.base}15` }
              ]}>
                <Ionicons
                  name={corr.effectSize > 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={corr.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base}
                />
                <Text style={[
                  styles.effectText,
                  { color: corr.effectSize > 0 ? SEMANTIC.success.base : SEMANTIC.warning.base }
                ]}>
                  {corr.effectSize > 0 ? '+' : ''}{Math.round(corr.effectSize * 100)}%
                </Text>
              </View>
            </View>
            <Text style={styles.patternDesc}>{corr.mechanism}</Text>
          </View>
        ))}
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Ionicons name="bulb" size={20} color={VIBRANT_WELLNESS.nutrition.solid} />
        <Text style={styles.tipText}>
          Tap "View Details" for personalized food recommendations
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },

  // Insight Row
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  insightText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  insightHighlight: {
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },

  // Impact Row
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    backgroundColor: SURFACES.background.secondary,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
  },
  impactText: {
    flex: 1,
  },
  impactValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  impactLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },

  // Expanded View
  headerExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[4],
  },
  iconBgLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextExpanded: {
    flex: 1,
  },
  titleExpanded: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  subtitleExpanded: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },

  // Patterns Section
  patternsSection: {
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  patternCard: {
    backgroundColor: SURFACES.background.secondary,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    gap: SPACING[2],
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patternName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  effectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  effectText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  patternDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 18,
  },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: `${VIBRANT_WELLNESS.nutrition.solid}10`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
  },
  tipText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
});
