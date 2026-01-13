/**
 * Hydration-Cognition Correlation Card
 *
 * Displays Hydration ↔ Mood/Cognition relationship analysis
 * Based on CDC NHANES research showing U-shaped curve (curvilinear relationship)
 *
 * Key insight: Both DEHYDRATION and OVERHYDRATION harm cognition
 *
 * Design inspired by top health apps with clear visual communication
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import GaugeChart from './GaugeChart';
import MiniLineChart from './MiniLineChart';
import { TEXT, BRAND, SURFACES, SEMANTIC, SHADOWS } from '../../constants/premiumTheme';
import { analyzeMultiFactorCorrelations, CONFIG } from '../../utils/multiFactorAnalytics';

/**
 * HydrationCognitionCard
 *
 * @param {Array} waterLogs - User's water logs
 * @param {Array} moodLogs - User's mood logs
 * @param {boolean} compact - Compact mode for dashboard (default true)
 */
export default function HydrationCognitionCard({
  waterLogs = [],
  moodLogs = [],
  compact = true,
}) {
  const router = useRouter();

  // Analyze correlation
  const analysis = useMemo(() => {
    return analyzeMultiFactorCorrelations({
      foodLogs: [],
      moodLogs,
      waterLogs,
      activityLogs: [],
      sleepLogs: [],
    });
  }, [waterLogs, moodLogs]);

  if (!analysis.canAnalyze) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="water-outline" size={24} color={BRAND.accent} />
          <Text style={styles.title}>Hydration → Cognition</Text>
        </View>
        <Text style={styles.insufficientData}>
          {analysis.message}
        </Text>
        <Text style={styles.helpText}>
          Log your water intake and mood to discover your optimal hydration range
        </Text>
      </View>
    );
  }

  const hydrationMoodAnalysis = analysis.correlations.hydration_mood;

  // Calculate average daily hydration
  const avgHydration = waterLogs.length > 0
    ? waterLogs.reduce((sum, log) => sum + (log.amount || 0), 0) / waterLogs.length
    : 0;

  // Determine status
  const getHydrationStatus = (amount) => {
    if (amount < CONFIG.HYDRATION_DEHYDRATION) return { status: 'Dehydrated', color: SEMANTIC.error, icon: 'alert-circle' };
    if (amount > CONFIG.HYDRATION_OVERHYDRATION) return { status: 'Overhydrated', color: SEMANTIC.warning, icon: 'warning' };
    if (amount >= CONFIG.HYDRATION_OPTIMAL_MIN && amount <= CONFIG.HYDRATION_OPTIMAL_MAX) {
      return { status: 'Optimal', color: SEMANTIC.success, icon: 'checkmark-circle' };
    }
    return { status: 'Adequate', color: SEMANTIC.info, icon: 'information-circle' };
  };

  const currentStatus = getHydrationStatus(avgHydration);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights/hydration-cognition');
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
              <Ionicons name="water-outline" size={24} color={BRAND.accent} />
              <View>
                <Text style={styles.title}>Hydration → Cognition</Text>
                <Text style={styles.subtitle}>
                  {analysis.daysAnalyzed} days analyzed
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
          </View>

          {/* Current Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <Ionicons name={currentStatus.icon} size={20} color={currentStatus.color} />
              <Text style={[styles.statusText, { color: currentStatus.color }]}>
                {currentStatus.status}
              </Text>
            </View>
            <Text style={styles.avgText}>
              {Math.round(avgHydration)} ml/day average
            </Text>
          </View>

          {/* U-shaped curve warning */}
          {hydrationMoodAnalysis.type === 'curvilinear' && (
            <View style={styles.warningBanner}>
              <Ionicons name="analytics-outline" size={16} color={SEMANTIC.warning} />
              <Text style={styles.warningText}>
                Your data shows a U-shaped pattern: both low and high hydration affect mood
              </Text>
            </View>
          )}

          {/* Optimal range indicator */}
          <View style={styles.rangeIndicator}>
            <View style={styles.rangeBar}>
              <View style={[styles.rangeZone, styles.rangeDehydrated]} />
              <View style={[styles.rangeZone, styles.rangeOptimal]} />
              <View style={[styles.rangeZone, styles.rangeOver]} />
            </View>
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>Low</Text>
              <Text style={[styles.rangeLabel, { color: SEMANTIC.success }]}>Optimal</Text>
              <Text style={styles.rangeLabel}>High</Text>
            </View>
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
          <Ionicons name="water-outline" size={32} color={BRAND.accent} />
          <View style={styles.headerTextExpanded}>
            <Text style={styles.titleExpanded}>Hydration → Cognition</Text>
            <Text style={styles.subtitleExpanded}>
              {analysis.daysAnalyzed} days analyzed
            </Text>
          </View>
        </View>

        {/* Current Status Gauge */}
        <View style={styles.gaugeSection}>
          <Text style={styles.sectionTitle}>Your Hydration Status</Text>
          <GaugeChart
            value={(avgHydration / CONFIG.HYDRATION_OPTIMAL_MAX) * 100}
            size={180}
            label="Average Daily Intake"
            zones={[
              { min: 0, max: 33, color: SEMANTIC.error, label: 'Dehydrated' },
              { min: 33, max: 67, color: SEMANTIC.success, label: 'Optimal' },
              { min: 67, max: 100, color: SEMANTIC.warning, label: 'Overhydrated' },
            ]}
          />
          <Text style={styles.gaugeValue}>{Math.round(avgHydration)} ml/day</Text>
        </View>

        {/* U-shaped Curve Explanation */}
        {hydrationMoodAnalysis.type === 'curvilinear' && (
          <View style={styles.scienceSection}>
            <View style={styles.scienceHeader}>
              <Ionicons name="flask-outline" size={20} color={BRAND.primary} />
              <Text style={styles.scienceTitle}>Research-Backed Insight</Text>
            </View>
            <Text style={styles.scienceText}>
              {hydrationMoodAnalysis.warning}
            </Text>
            <Text style={styles.mechanism}>
              {hydrationMoodAnalysis.mechanism}
            </Text>
            <View style={styles.sourcesRow}>
              <Ionicons name="library-outline" size={12} color={TEXT.tertiary} />
              <Text style={styles.sourcesText}>
                {hydrationMoodAnalysis.sources.join(' • ')}
              </Text>
            </View>
          </View>
        )}

        {/* Optimal Range */}
        <View style={styles.optimalSection}>
          <Text style={styles.sectionTitle}>Optimal Hydration Range</Text>
          <View style={styles.rangeCard}>
            <View style={styles.rangeItem}>
              <Text style={styles.rangeItemLabel}>Minimum</Text>
              <Text style={styles.rangeItemValue}>
                {CONFIG.HYDRATION_OPTIMAL_MIN} ml
              </Text>
            </View>
            <Ionicons name="swap-horizontal" size={24} color={BRAND.primary} />
            <View style={styles.rangeItem}>
              <Text style={styles.rangeItemLabel}>Maximum</Text>
              <Text style={styles.rangeItemValue}>
                {CONFIG.HYDRATION_OPTIMAL_MAX} ml
              </Text>
            </View>
          </View>
          <Text style={styles.rangeNote}>
            Based on CDC NHANES research showing U-shaped relationship
          </Text>
        </View>

        {/* Evidence Level */}
        <View style={styles.evidenceSection}>
          <View style={styles.evidenceBadge}>
            <Ionicons name="shield-checkmark" size={16} color={SEMANTIC.success} />
            <Text style={styles.evidenceText}>
              Evidence Level: {hydrationMoodAnalysis.evidenceLevel}
            </Text>
          </View>
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
  statusContainer: {
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avgText: {
    fontSize: 13,
    color: TEXT.secondary,
    marginTop: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: SEMANTIC.warning + '20',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: TEXT.primary,
    lineHeight: 16,
  },
  rangeIndicator: {
    marginTop: 16,
  },
  rangeBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  rangeZone: {
    flex: 1,
  },
  rangeDehydrated: {
    backgroundColor: SEMANTIC.error,
  },
  rangeOptimal: {
    backgroundColor: SEMANTIC.success,
  },
  rangeOver: {
    backgroundColor: SEMANTIC.warning,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
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
  gaugeSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.secondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
  },
  gaugeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
    marginTop: 12,
  },
  scienceSection: {
    backgroundColor: SURFACES.elevated,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  scienceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scienceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
  },
  scienceText: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  mechanism: {
    fontSize: 12,
    color: TEXT.tertiary,
    lineHeight: 16,
    fontStyle: 'italic',
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
  optimalSection: {
    marginBottom: 16,
  },
  rangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACES.elevated,
    padding: 16,
    borderRadius: 12,
  },
  rangeItem: {
    alignItems: 'center',
  },
  rangeItemLabel: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginBottom: 4,
  },
  rangeItemValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  rangeNote: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  evidenceSection: {
    alignItems: 'center',
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SEMANTIC.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  evidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: SEMANTIC.success,
  },
});
