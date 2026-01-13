/**
 * Hydration-Cognition Correlation Screen
 *
 * Deep-dive analysis of Hydration ↔ Mood/Cognition relationship
 * Key insight: U-shaped curve (both dehydration AND overhydration harmful)
 *
 * Based on CDC NHANES research
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import HydrationCognitionCard from '../../components/analytics/HydrationCognitionCard';
import GaugeChart from '../../components/analytics/GaugeChart';
import MiniLineChart from '../../components/analytics/MiniLineChart';

import { useMoodTrends } from '../../hooks/useMoodTrends';
import { useWaterLog } from '../../hooks/useWaterLog';

import { TEXT, BRAND, SURFACES, SEMANTIC, SHADOWS } from '../../constants/premiumTheme';
import { analyzeMultiFactorCorrelations, CONFIG, EVIDENCE_TERMINOLOGY } from '../../utils/multiFactorAnalytics';

export default function HydrationCognitionScreen() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState(30);

  const { logs: waterLogs } = useWaterLog();
  const { data: moodData } = useMoodTrends({ days: timeRange });
  const moodLogs = moodData?.data || [];

  const analysis = useMemo(() => {
    return analyzeMultiFactorCorrelations({
      foodLogs: [],
      moodLogs,
      waterLogs,
      activityLogs: [],
      sleepLogs: [],
    });
  }, [waterLogs, moodLogs]);

  // Calculate daily hydration trend
  const dailyHydration = useMemo(() => {
    const last7Days = waterLogs.slice(-7);
    return last7Days.map(log => log.amount || 0);
  }, [waterLogs]);

  const avgHydration = dailyHydration.length > 0
    ? dailyHydration.reduce((sum, val) => sum + val, 0) / dailyHydration.length
    : 0;

  if (!analysis.canAnalyze) {
    return (
      <>
        <Stack.Screen options={{ title: 'Hydration → Cognition', headerShown: true }} />
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Ionicons name="water-outline" size={64} color={TEXT.tertiary} />
            <Text style={styles.emptyTitle}>Not Enough Data</Text>
            <Text style={styles.emptyText}>{analysis.message}</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
              <Text style={styles.emptyButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  const hydrationAnalysis = analysis.correlations.hydration_mood;

  return (
    <>
      <Stack.Screen options={{ title: 'Hydration → Cognition', headerShown: true }} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {[7, 30, 90].map(days => (
            <TouchableOpacity
              key={days}
              style={[styles.timeRangeButton, timeRange === days && styles.timeRangeButtonActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(days);
              }}
            >
              <Text style={[styles.timeRangeText, timeRange === days && styles.timeRangeTextActive]}>
                {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Expanded Card */}
        <HydrationCognitionCard waterLogs={waterLogs} moodLogs={moodLogs} compact={false} />

        {/* Current Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Hydration Status</Text>
          <View style={styles.statusCard}>
            <GaugeChart
              value={(avgHydration / CONFIG.HYDRATION_OPTIMAL_MAX) * 100}
              size={160}
              zones={[
                { min: 0, max: 33, color: SEMANTIC.error, label: 'Low' },
                { min: 33, max: 67, color: SEMANTIC.success, label: 'Optimal' },
                { min: 67, max: 100, color: SEMANTIC.warning, label: 'High' },
              ]}
            />
            <View style={styles.statusDetails}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Current Average</Text>
                <Text style={styles.statusValue}>{Math.round(avgHydration)} ml/day</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Optimal Range</Text>
                <Text style={styles.statusValue}>
                  {CONFIG.HYDRATION_OPTIMAL_MIN}-{CONFIG.HYDRATION_OPTIMAL_MAX} ml
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Trend Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7-Day Hydration Trend</Text>
          <View style={styles.chartCard}>
            <MiniLineChart
              data={dailyHydration}
              labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].slice(-dailyHydration.length)}
              width={SURFACES.width || 280}
              height={120}
              color={BRAND.accent}
              showGrid={true}
            />
            {/* Optimal range indicator */}
            <View style={styles.rangeIndicators}>
              <View style={styles.rangeIndicator}>
                <View style={[styles.rangeDot, { backgroundColor: SEMANTIC.success }]} />
                <Text style={styles.rangeLabel}>Optimal Range</Text>
              </View>
              <View style={styles.rangeIndicator}>
                <View style={[styles.rangeDot, { backgroundColor: SEMANTIC.error }]} />
                <Text style={styles.rangeLabel}>Dehydration ({'<'}{CONFIG.HYDRATION_DEHYDRATION}ml)</Text>
              </View>
              <View style={styles.rangeIndicator}>
                <View style={[styles.rangeDot, { backgroundColor: SEMANTIC.warning }]} />
                <Text style={styles.rangeLabel}>Overhydration ({'>'}{CONFIG.HYDRATION_OVERHYDRATION}ml)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* U-Shaped Curve Explanation */}
        {hydrationAnalysis.type === 'curvilinear' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why U-Shaped?</Text>
            <View style={styles.scienceCard}>
              <View style={styles.scienceIcon}>
                <Ionicons name="flask" size={32} color={BRAND.primary} />
              </View>
              <Text style={styles.scienceTitle}>CDC NHANES Research Finding</Text>
              <Text style={styles.scienceText}>
                {hydrationAnalysis.warning}
              </Text>
              <View style={styles.mechanismBox}>
                <Text style={styles.mechanismLabel}>Mechanism:</Text>
                <Text style={styles.mechanismText}>{hydrationAnalysis.mechanism}</Text>
              </View>
              <View style={styles.evidenceBadge}>
                <Ionicons name="shield-checkmark" size={16} color={SEMANTIC.success} />
                <Text style={styles.evidenceText}>
                  {EVIDENCE_TERMINOLOGY.getCausalFraming(hydrationAnalysis.evidenceLevel)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personalized Recommendations</Text>

          {avgHydration < CONFIG.HYDRATION_DEHYDRATION && (
            <View style={[styles.recommendationCard, { borderLeftColor: SEMANTIC.error }]}>
              <Ionicons name="alert-circle" size={24} color={SEMANTIC.error} />
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>Increase Hydration</Text>
                <Text style={styles.recommendationText}>
                  You&apos;re averaging {Math.round(avgHydration)}ml/day, which is below optimal.
                  Try to reach at least {CONFIG.HYDRATION_OPTIMAL_MIN}ml/day for better cognition.
                </Text>
              </View>
            </View>
          )}

          {avgHydration > CONFIG.HYDRATION_OVERHYDRATION && (
            <View style={[styles.recommendationCard, { borderLeftColor: SEMANTIC.warning }]}>
              <Ionicons name="warning" size={24} color={SEMANTIC.warning} />
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>Moderate Hydration</Text>
                <Text style={styles.recommendationText}>
                  You&apos;re averaging {Math.round(avgHydration)}ml/day, which may be too high.
                  Overhydration can dilute electrolytes. Aim for {CONFIG.HYDRATION_OPTIMAL_MIN}-{CONFIG.HYDRATION_OPTIMAL_MAX}ml/day.
                </Text>
              </View>
            </View>
          )}

          {avgHydration >= CONFIG.HYDRATION_OPTIMAL_MIN && avgHydration <= CONFIG.HYDRATION_OPTIMAL_MAX && (
            <View style={[styles.recommendationCard, { borderLeftColor: SEMANTIC.success }]}>
              <Ionicons name="checkmark-circle" size={24} color={SEMANTIC.success} />
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>Perfect Balance!</Text>
                <Text style={styles.recommendationText}>
                  Your hydration is in the optimal range. Keep it up!
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Research Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scientific Sources</Text>
          <View style={styles.sourcesCard}>
            <Ionicons name="library" size={24} color={BRAND.primary} />
            <Text style={styles.sourcesText}>
              {hydrationAnalysis.sources?.join(' • ') || 'CDC NHANES 2011-2014 • PMC Hydration-Cognition Studies'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SURFACES.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: SURFACES.card,
    padding: 4,
    borderRadius: 12,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: BRAND.primary,
  },
  timeRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  statusCard: {
    backgroundColor: SURFACES.card,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 20,
    ...SHADOWS.medium,
  },
  statusDetails: {
    width: '100%',
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: TEXT.tertiary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT.primary,
  },
  chartCard: {
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  rangeIndicators: {
    marginTop: 16,
    gap: 8,
  },
  rangeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rangeLabel: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  scienceCard: {
    backgroundColor: SURFACES.card,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.medium,
  },
  scienceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BRAND.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scienceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
    textAlign: 'center',
  },
  scienceText: {
    fontSize: 14,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  mechanismBox: {
    backgroundColor: SURFACES.elevated,
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  mechanismLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT.secondary,
    marginBottom: 4,
  },
  mechanismText: {
    fontSize: 12,
    color: TEXT.tertiary,
    lineHeight: 16,
    fontStyle: 'italic',
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
  recommendationCard: {
    flexDirection: 'row',
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderLeftWidth: 4,
    ...SHADOWS.small,
  },
  recommendationContent: {
    flex: 1,
    gap: 4,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
  },
  recommendationText: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  sourcesCard: {
    flexDirection: 'row',
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    ...SHADOWS.small,
  },
  sourcesText: {
    flex: 1,
    fontSize: 12,
    color: TEXT.tertiary,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
  },
  emptyText: {
    fontSize: 14,
    color: TEXT.tertiary,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
