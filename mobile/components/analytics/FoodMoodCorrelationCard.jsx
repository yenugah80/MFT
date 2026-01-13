/**
 * Food-Mood Correlation Card
 *
 * Displays bidirectional Food ↔ Mood relationship analysis
 * Based on WHO nutritional psychiatry research and user's personal data
 *
 * Design inspired by:
 * - Noom: Psychology-focused insights with clear visualizations
 * - MyFitnessPal: Nutrition tracking with impact analysis
 * - Progressive disclosure: High-level insight → tap to dive deeper
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import CircularProgress from './CircularProgress';
import MiniBarChart from './MiniBarChart';
import { TEXT, BRAND, SURFACES, SEMANTIC, SHADOWS } from '../../constants/premiumTheme';
import { analyzeMultiFactorCorrelations } from '../../utils/multiFactorAnalytics';

/**
 * FoodMoodCorrelationCard
 *
 * @param {Array} foodLogs - User's food logs
 * @param {Array} moodLogs - User's mood logs
 * @param {Array} waterLogs - User's water logs
 * @param {boolean} compact - Compact mode for dashboard (default true)
 */
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

  if (!analysis.canAnalyze) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="nutrition-outline" size={24} color={BRAND.primary} />
          <Text style={styles.title}>Food → Mood</Text>
        </View>
        <Text style={styles.insufficientData}>
          {analysis.message}
        </Text>
        <Text style={styles.helpText}>
          Keep logging your meals and mood to discover your personal patterns
        </Text>
      </View>
    );
  }

  const { correlations } = analysis.correlations.food_mood;

  // Get top 3 correlations
  const topCorrelations = correlations
    .sort((a, b) => Math.abs(b.effectSize) - Math.abs(a.effectSize))
    .slice(0, 3);

  // Calculate overall strength (0-100 for gauge)
  const overallStrength = analysis.correlations.food_mood.overallStrength * 100;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights/food-mood-correlation');
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[SURFACES.elevated, SURFACES.card]}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="nutrition-outline" size={24} color={BRAND.primary} />
              <View>
                <Text style={styles.title}>Food → Mood</Text>
                <Text style={styles.subtitle}>
                  {analysis.daysAnalyzed} days analyzed
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
          </View>

          {/* Insight */}
          {topCorrelations.length > 0 ? (
            <View style={styles.insightContainer}>
              <Text style={styles.insightText}>
                <Text style={styles.insightHighlight}>{topCorrelations[0].factor}</Text>
                {' '}shows a{' '}
                <Text style={styles.insightHighlight}>
                  {Math.abs(topCorrelations[0].effectSize) > 0.5 ? 'strong' : 'moderate'}
                </Text>
                {' '}correlation with your mood
              </Text>
              <View style={styles.confidenceBadge}>
                <Ionicons name="shield-checkmark" size={14} color={SEMANTIC.success} />
                <Text style={styles.confidenceText}>
                  {Math.round(topCorrelations[0].confidence * 100)}% confidence
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noPatterns}>
              Continue logging to discover patterns
            </Text>
          )}

          {/* Mini visualization */}
          {topCorrelations.length > 0 && (
            <View style={styles.miniViz}>
              <CircularProgress
                percentage={Math.abs(topCorrelations[0].effectSize) * 100}
                size={60}
                strokeWidth={6}
                color={topCorrelations[0].effectSize > 0 ? SEMANTIC.success : SEMANTIC.warning}
                showPercentage={false}
              >
                <Ionicons
                  name={topCorrelations[0].effectSize > 0 ? 'arrow-up' : 'arrow-down'}
                  size={20}
                  color={topCorrelations[0].effectSize > 0 ? SEMANTIC.success : SEMANTIC.warning}
                />
              </CircularProgress>
              <View style={styles.miniVizLabel}>
                <Text style={styles.miniVizValue}>
                  {topCorrelations[0].effectSize > 0 ? '+' : ''}
                  {Math.round(topCorrelations[0].effectSize * 100)}%
                </Text>
                <Text style={styles.miniVizText}>Impact</Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Expanded view (for dedicated screen)
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[SURFACES.elevated, SURFACES.card]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.headerExpanded}>
          <Ionicons name="nutrition-outline" size={32} color={BRAND.primary} />
          <View style={styles.headerTextExpanded}>
            <Text style={styles.titleExpanded}>Food → Mood Analysis</Text>
            <Text style={styles.subtitleExpanded}>
              {analysis.daysAnalyzed} days • {correlations.length} factors analyzed
            </Text>
          </View>
        </View>

        {/* Overall Strength */}
        <View style={styles.overallSection}>
          <Text style={styles.sectionTitle}>Overall Correlation Strength</Text>
          <View style={styles.strengthViz}>
            <CircularProgress
              percentage={overallStrength}
              size={100}
              strokeWidth={10}
              color={
                overallStrength > 75 ? SEMANTIC.success :
                overallStrength > 50 ? SEMANTIC.info :
                SEMANTIC.warning
              }
            />
            <Text style={styles.strengthLabel}>
              {overallStrength > 75 ? 'Strong' : overallStrength > 50 ? 'Moderate' : 'Weak'}
            </Text>
          </View>
        </View>

        {/* Top Correlations */}
        <View style={styles.correlationsSection}>
          <Text style={styles.sectionTitle}>Top Food-Mood Factors</Text>
          {topCorrelations.map((corr, index) => (
            <View key={index} style={styles.correlationItem}>
              <View style={styles.correlationHeader}>
                <Text style={styles.correlationFactor}>{corr.factor}</Text>
                <View style={[
                  styles.effectBadge,
                  { backgroundColor: corr.effectSize > 0 ? SEMANTIC.success + '20' : SEMANTIC.warning + '20' }
                ]}>
                  <Ionicons
                    name={corr.effectSize > 0 ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={corr.effectSize > 0 ? SEMANTIC.success : SEMANTIC.warning}
                  />
                  <Text style={[
                    styles.effectText,
                    { color: corr.effectSize > 0 ? SEMANTIC.success : SEMANTIC.warning }
                  ]}>
                    {corr.effectSize > 0 ? 'Positive' : 'Negative'}
                  </Text>
                </View>
              </View>

              <Text style={styles.mechanism}>{corr.mechanism}</Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Effect Size</Text>
                  <Text style={styles.statValue}>
                    {Math.abs(corr.effectSize).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Confidence</Text>
                  <Text style={styles.statValue}>
                    {Math.round(corr.confidence * 100)}%
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Evidence</Text>
                  <Text style={styles.statValue}>{corr.evidenceLevel}</Text>
                </View>
              </View>

              <View style={styles.sourcesRow}>
                <Ionicons name="library-outline" size={12} color={TEXT.tertiary} />
                <Text style={styles.sourcesText}>
                  {corr.sources.join(' • ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  gradient: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  insufficientData: {
    fontSize: 14,
    color: TEXT.secondary,
    marginTop: 8,
  },
  helpText: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  insightContainer: {
    marginTop: 8,
  },
  insightText: {
    fontSize: 14,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  insightHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: SEMANTIC.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: SEMANTIC.success,
  },
  noPatterns: {
    fontSize: 14,
    color: TEXT.tertiary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  miniViz: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: SURFACES.card,
  },
  miniVizLabel: {
    flex: 1,
  },
  miniVizValue: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT.primary,
  },
  miniVizText: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  headerExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  headerTextExpanded: {
    flex: 1,
  },
  titleExpanded: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
  },
  subtitleExpanded: {
    fontSize: 13,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  overallSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  strengthViz: {
    alignItems: 'center',
    gap: 12,
  },
  strengthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
  },
  correlationsSection: {
    gap: 16,
  },
  correlationItem: {
    backgroundColor: SURFACES.elevated,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  correlationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  correlationFactor: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
    flex: 1,
  },
  effectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  effectText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mechanism: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT.primary,
  },
  sourcesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: SURFACES.card,
  },
  sourcesText: {
    fontSize: 10,
    color: TEXT.tertiary,
    flex: 1,
    lineHeight: 14,
  },
});
