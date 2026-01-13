/**
 * Activity-Mood Correlation Card
 *
 * Displays Physical Activity ↔ Mood relationship analysis
 * Based on CDC Physical Activity Guidelines showing strong evidence for
 * immediate cognitive benefits and chronic mood improvements
 *
 * Design inspired by top fitness apps with clear impact visualization
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import CircularProgress from './CircularProgress';
import MiniLineChart from './MiniLineChart';
import { TEXT, BRAND, SURFACES, SEMANTIC, SHADOWS } from '../../constants/premiumTheme';
import { analyzeMultiFactorCorrelations, SCIENTIFIC_PRIORS } from '../../utils/multiFactorAnalytics';

/**
 * ActivityMoodCard
 *
 * @param {Array} activityLogs - User's activity logs
 * @param {Array} moodLogs - User's mood logs
 * @param {boolean} compact - Compact mode for dashboard (default true)
 */
export default function ActivityMoodCard({
  activityLogs = [],
  moodLogs = [],
  compact = true,
}) {
  const router = useRouter();

  // Analyze correlation
  const analysis = useMemo(() => {
    return analyzeMultiFactorCorrelations({
      foodLogs: [],
      moodLogs,
      waterLogs: [],
      activityLogs,
      sleepLogs: [],
    });
  }, [activityLogs, moodLogs]);

  // Get research priors
  const acuteEffect = SCIENTIFIC_PRIORS.ACTIVITY_MOOD.acute_exercise;
  const chronicEffect = SCIENTIFIC_PRIORS.ACTIVITY_MOOD.chronic_exercise;

  if (!analysis.canAnalyze) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="fitness-outline" size={24} color={SEMANTIC.success} />
          <Text style={styles.title}>Activity → Mood</Text>
        </View>
        <Text style={styles.insufficientData}>
          {analysis.message}
        </Text>
        <Text style={styles.helpText}>
          Track your physical activity and mood to see the powerful connection
        </Text>
        {/* Show research evidence even without personal data */}
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Research Shows:</Text>
          <View style={styles.previewItem}>
            <Ionicons name="flash" size={16} color={SEMANTIC.success} />
            <Text style={styles.previewText}>
              Immediate cognition boost after exercise
            </Text>
          </View>
          <View style={styles.previewItem}>
            <Ionicons name="trending-up" size={16} color={SEMANTIC.info} />
            <Text style={styles.previewText}>
              42% reduction in anxiety/depression with regular activity
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const activityMoodAnalysis = analysis.correlations.activity_mood;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights/activity-mood');
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
              <Ionicons name="fitness-outline" size={24} color={SEMANTIC.success} />
              <View>
                <Text style={styles.title}>Activity → Mood</Text>
                <Text style={styles.subtitle}>
                  {analysis.daysAnalyzed} days analyzed
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
          </View>

          {/* Insight */}
          <View style={styles.insightContainer}>
            <View style={styles.insightRow}>
              <Ionicons name="checkmark-circle" size={20} color={SEMANTIC.success} />
              <Text style={styles.insightText}>
                <Text style={styles.insightHighlight}>Strong evidence</Text>
                {' '}for activity-mood connection
              </Text>
            </View>
            <Text style={styles.effectText}>
              Exercise shows immediate cognitive benefits and long-term mood improvements
            </Text>
          </View>

          {/* Effect strength visualization */}
          <View style={styles.effectsRow}>
            <View style={styles.effectCard}>
              <Text style={styles.effectLabel}>Acute Effect</Text>
              <CircularProgress
                percentage={acuteEffect.effect * 100}
                size={50}
                strokeWidth={5}
                color={SEMANTIC.success}
                showPercentage={false}
              >
                <Ionicons name="flash" size={16} color={SEMANTIC.success} />
              </CircularProgress>
              <Text style={styles.effectValue}>+{Math.round(acuteEffect.effect * 100)}%</Text>
            </View>

            <View style={styles.effectCard}>
              <Text style={styles.effectLabel}>Chronic Effect</Text>
              <CircularProgress
                percentage={chronicEffect.effect * 100}
                size={50}
                strokeWidth={5}
                color={SEMANTIC.info}
                showPercentage={false}
              >
                <Ionicons name="trending-up" size={16} color={SEMANTIC.info} />
              </CircularProgress>
              <Text style={styles.effectValue}>+{Math.round(chronicEffect.effect * 100)}%</Text>
            </View>
          </View>

          {/* Evidence badge */}
          <View style={styles.evidenceBadge}>
            <Ionicons name="shield-checkmark" size={14} color={SEMANTIC.success} />
            <Text style={styles.evidenceText}>
              Strong Evidence • CDC Physical Activity Guidelines
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Expanded view
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[SURFACES.elevated, SURFACES.card]}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.headerExpanded}>
          <Ionicons name="fitness-outline" size={32} color={SEMANTIC.success} />
          <View style={styles.headerTextExpanded}>
            <Text style={styles.titleExpanded}>Activity → Mood Analysis</Text>
            <Text style={styles.subtitleExpanded}>
              {analysis.daysAnalyzed} days • Research-backed insights
            </Text>
          </View>
        </View>

        {/* Acute vs Chronic Effects */}
        <View style={styles.effectsSection}>
          <Text style={styles.sectionTitle}>Activity Impact on Mood</Text>

          {/* Acute Effect */}
          <View style={styles.effectItem}>
            <View style={styles.effectItemHeader}>
              <Ionicons name="flash" size={24} color={SEMANTIC.success} />
              <Text style={styles.effectItemTitle}>Immediate Benefits</Text>
            </View>
            <Text style={styles.effectItemDescription}>
              {acuteEffect.mechanism}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Effect Size</Text>
                <Text style={[styles.statValue, { color: SEMANTIC.success }]}>
                  +{Math.round(acuteEffect.effect * 100)}%
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Confidence</Text>
                <Text style={styles.statValue}>
                  {Math.round(acuteEffect.confidence * 100)}%
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Evidence</Text>
                <Text style={styles.statValue}>{acuteEffect.evidenceLevel}</Text>
              </View>
            </View>
            <Text style={styles.durationNote}>
              Duration: {acuteEffect.duration}
            </Text>
          </View>

          {/* Chronic Effect */}
          <View style={styles.effectItem}>
            <View style={styles.effectItemHeader}>
              <Ionicons name="trending-up" size={24} color={SEMANTIC.info} />
              <Text style={styles.effectItemTitle}>Long-Term Benefits</Text>
            </View>
            <Text style={styles.effectItemDescription}>
              {chronicEffect.mechanism}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Effect Size</Text>
                <Text style={[styles.statValue, { color: SEMANTIC.info }]}>
                  +{Math.round(chronicEffect.effect * 100)}%
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Confidence</Text>
                <Text style={styles.statValue}>
                  {Math.round(chronicEffect.confidence * 100)}%
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Evidence</Text>
                <Text style={styles.statValue}>{chronicEffect.evidenceLevel}</Text>
              </View>
            </View>
            <Text style={styles.durationNote}>
              Recommended: {chronicEffect.dosage}
            </Text>
          </View>
        </View>

        {/* Research Sources */}
        <View style={styles.sourcesSection}>
          <View style={styles.sourcesHeader}>
            <Ionicons name="library-outline" size={18} color={BRAND.primary} />
            <Text style={styles.sourcesTitle}>Scientific Evidence</Text>
          </View>
          <Text style={styles.sourcesText}>
            {acuteEffect.sources.join(' • ')}
          </Text>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaText}>
            Start logging your physical activity to see YOUR personal response pattern
          </Text>
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
  previewSection: {
    marginTop: 16,
    backgroundColor: SURFACES.elevated,
    padding: 12,
    borderRadius: 8,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: 8,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  previewText: {
    fontSize: 12,
    color: TEXT.secondary,
    flex: 1,
  },
  insightContainer: {
    marginTop: 8,
    gap: 8,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    color: TEXT.secondary,
  },
  insightHighlight: {
    fontWeight: '700',
    color: TEXT.primary,
  },
  effectText: {
    fontSize: 13,
    color: TEXT.tertiary,
    lineHeight: 18,
  },
  effectsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  effectCard: {
    flex: 1,
    backgroundColor: SURFACES.elevated,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  effectLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  effectValue: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: SEMANTIC.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 16,
  },
  evidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: SEMANTIC.success,
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
  effectsSection: {
    gap: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.secondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  effectItem: {
    backgroundColor: SURFACES.elevated,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  effectItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  effectItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  effectItemDescription: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT.primary,
  },
  durationNote: {
    fontSize: 11,
    color: TEXT.tertiary,
    fontStyle: 'italic',
  },
  sourcesSection: {
    backgroundColor: SURFACES.elevated,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  sourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sourcesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT.primary,
  },
  sourcesText: {
    fontSize: 11,
    color: TEXT.tertiary,
    lineHeight: 16,
  },
  ctaSection: {
    backgroundColor: BRAND.primary + '20',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.primary,
    textAlign: 'center',
  },
});
