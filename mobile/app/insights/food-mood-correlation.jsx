/**
 * Food-Mood Correlation Screen
 *
 * Deep-dive analysis of Food → Mood relationship
 * Progressive disclosure from dashboard card
 *
 * Features:
 * - Detailed correlation analysis
 * - Nutritional factors breakdown (B vitamins, Omega-3, Magnesium, Protein, Sugar)
 * - Personal vs research comparison
 * - Temporal patterns
 * - Actionable recommendations
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import FoodMoodCorrelationCard from '../../components/analytics/FoodMoodCorrelationCard';
import MiniBarChart from '../../components/analytics/MiniBarChart';
import MiniLineChart from '../../components/analytics/MiniLineChart';
import CircularProgress from '../../components/analytics/CircularProgress';

import { useFoodLog } from '../../hooks/useFoodLog';
import { useMoodTrends } from '../../hooks/useMoodTrends';
import { useWaterLog } from '../../hooks/useWaterLog';
import { useNotification } from '../../providers/NotificationProvider';

import { TEXT, BRAND, SURFACES, SEMANTIC, SHADOWS } from '../../constants/premiumTheme';
import { analyzeMultiFactorCorrelations, analyzePersonalizedResponses, EVIDENCE_TERMINOLOGY } from '../../utils/multiFactorAnalytics';

export default function FoodMoodCorrelationScreen() {
  const router = useRouter();
  const notify = useNotification();

  const [timeRange, setTimeRange] = useState(30); // 7, 30, 90 days
  const [viewMode, setViewMode] = useState('overview'); // overview, nutrients, temporal, personal

  // Get data
  const { logs: foodLogs } = useFoodLog();
  const { data: moodData } = useMoodTrends({ days: timeRange });
  const { logs: waterLogs } = useWaterLog();

  const moodLogs = moodData?.data || [];

  // Analyze
  const analysis = useMemo(() => {
    return analyzeMultiFactorCorrelations({
      foodLogs,
      moodLogs,
      waterLogs,
      activityLogs: [],
      sleepLogs: [],
    });
  }, [foodLogs, moodLogs, waterLogs]);

  const personalPatterns = useMemo(() => {
    return analyzePersonalizedResponses({
      foodLogs,
      moodLogs,
      waterLogs,
      activityLogs: [],
      sleepLogs: [],
    });
  }, [foodLogs, moodLogs, waterLogs]);

  if (!analysis.canAnalyze) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Food → Mood',
            headerShown: true,
          }}
        />
        <View style={styles.container}>
          <View style={styles.emptyState}>
            <Ionicons name="nutrition-outline" size={64} color={TEXT.tertiary} />
            <Text style={styles.emptyTitle}>Not Enough Data</Text>
            <Text style={styles.emptyText}>{analysis.message}</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.back()}
            >
              <Text style={styles.emptyButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  const { correlations, overallStrength } = analysis.correlations.food_mood;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Food → Mood Analysis',
          headerShown: true,
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {[7, 30, 90].map(days => (
            <TouchableOpacity
              key={days}
              style={[
                styles.timeRangeButton,
                timeRange === days && styles.timeRangeButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(days);
              }}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === days && styles.timeRangeTextActive,
                ]}
              >
                {days}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* View Mode Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'overview', label: 'Overview', icon: 'analytics-outline' },
            { key: 'nutrients', label: 'Nutrients', icon: 'nutrition-outline' },
            { key: 'temporal', label: 'Patterns', icon: 'time-outline' },
            { key: 'personal', label: 'Your Response', icon: 'person-outline' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                viewMode === tab.key && styles.tabActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setViewMode(tab.key);
              }}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={viewMode === tab.key ? BRAND.primary : TEXT.tertiary}
              />
              <Text
                style={[
                  styles.tabText,
                  viewMode === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content based on view mode */}
        {viewMode === 'overview' && (
          <View style={styles.section}>
            {/* Expanded correlation card */}
            <FoodMoodCorrelationCard
              foodLogs={foodLogs}
              moodLogs={moodLogs}
              waterLogs={waterLogs}
              compact={false}
            />

            {/* Key Insights */}
            <View style={styles.insightsSection}>
              <Text style={styles.sectionTitle}>Key Insights</Text>
              {correlations.slice(0, 5).map((corr, index) => (
                <View key={index} style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Text style={styles.insightNumber}>{index + 1}</Text>
                    <Text style={styles.insightTitle}>{corr.factor}</Text>
                  </View>
                  <Text style={styles.insightDescription}>
                    {corr.mechanism}
                  </Text>
                  <View style={styles.insightStats}>
                    <View style={styles.insightStat}>
                      <Text style={styles.insightStatLabel}>Your Effect</Text>
                      <Text style={[
                        styles.insightStatValue,
                        { color: corr.effectSize > 0 ? SEMANTIC.success : SEMANTIC.warning }
                      ]}>
                        {corr.effectSize > 0 ? '+' : ''}{(corr.effectSize * 100).toFixed(0)}%
                      </Text>
                    </View>
                    <View style={styles.insightStat}>
                      <Text style={styles.insightStatLabel}>Research Prior</Text>
                      <Text style={styles.insightStatValue}>
                        {(corr.prior * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {viewMode === 'nutrients' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutritional Factors</Text>
            <Text style={styles.sectionSubtitle}>
              How different nutrients affect your mood
            </Text>

            {/* Nutrient breakdown with mini charts */}
            {correlations.map((corr, index) => (
              <View key={index} style={styles.nutrientCard}>
                <View style={styles.nutrientHeader}>
                  <View style={styles.nutrientTitleRow}>
                    <Ionicons
                      name={corr.effectSize > 0 ? 'trending-up' : 'trending-down'}
                      size={24}
                      color={corr.effectSize > 0 ? SEMANTIC.success : SEMANTIC.warning}
                    />
                    <Text style={styles.nutrientTitle}>{corr.factor}</Text>
                  </View>
                  <CircularProgress
                    percentage={Math.abs(corr.effectSize) * 100}
                    size={60}
                    strokeWidth={6}
                    color={corr.effectSize > 0 ? SEMANTIC.success : SEMANTIC.warning}
                  />
                </View>

                <Text style={styles.nutrientMechanism}>{corr.mechanism}</Text>

                <View style={styles.nutrientEvidence}>
                  <View style={styles.evidenceItem}>
                    <Text style={styles.evidenceLabel}>Evidence Level</Text>
                    <View style={styles.evidenceBadge}>
                      <Ionicons name="shield-checkmark" size={12} color={SEMANTIC.success} />
                      <Text style={styles.evidenceValue}>
                        {EVIDENCE_TERMINOLOGY.getCausalFraming(corr.evidenceLevel)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.evidenceItem}>
                    <Text style={styles.evidenceLabel}>Confidence</Text>
                    <Text style={styles.evidenceValue}>
                      {EVIDENCE_TERMINOLOGY.getConfidenceLabel(corr.confidence)}
                    </Text>
                  </View>
                </View>

                <View style={styles.nutrientSources}>
                  <Text style={styles.sourcesLabel}>Research Sources:</Text>
                  <Text style={styles.sourcesText}>
                    {corr.sources.join(' • ')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {viewMode === 'temporal' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Temporal Patterns</Text>
            <Text style={styles.sectionSubtitle}>
              When do these correlations appear strongest?
            </Text>

            <View style={styles.comingSoon}>
              <Ionicons name="time-outline" size={48} color={TEXT.tertiary} />
              <Text style={styles.comingSoonText}>
                Temporal pattern analysis coming soon
              </Text>
              <Text style={styles.comingSoonSubtext}>
                This will show how food-mood correlations vary by time of day, day of week, and seasonal patterns
              </Text>
            </View>
          </View>
        )}

        {viewMode === 'personal' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Personal Response</Text>
            <Text style={styles.sectionSubtitle}>
              Unique patterns based on YOUR data
            </Text>

            {personalPatterns.canAnalyze ? (
              <>
                {personalPatterns.patterns.map((pattern, index) => (
                  <View key={index} style={styles.patternCard}>
                    <View style={styles.patternHeader}>
                      <Ionicons
                        name={
                          pattern.type === 'success_pattern' ? 'star' :
                          pattern.type === 'struggle_pattern' ? 'warning' :
                          'analytics'
                        }
                        size={24}
                        color={
                          pattern.type === 'success_pattern' ? SEMANTIC.success :
                          pattern.type === 'struggle_pattern' ? SEMANTIC.warning :
                          BRAND.primary
                        }
                      />
                      <Text style={styles.patternTitle}>{pattern.outcome}</Text>
                    </View>
                    <Text style={styles.patternInsight}>{pattern.insight}</Text>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.insufficientData}>
                <Ionicons name="information-circle-outline" size={32} color={TEXT.tertiary} />
                <Text style={styles.insufficientDataText}>
                  {personalPatterns.message}
                </Text>
              </View>
            )}
          </View>
        )}
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
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: SURFACES.card,
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  tabActive: {
    backgroundColor: BRAND.primary + '20',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT.tertiary,
  },
  tabTextActive: {
    color: BRAND.primary,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: TEXT.tertiary,
    marginTop: -8,
  },
  insightsSection: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  insightNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
    flex: 1,
  },
  insightDescription: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  insightStats: {
    flexDirection: 'row',
    gap: 16,
  },
  insightStat: {
    flex: 1,
  },
  insightStatLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginBottom: 4,
  },
  insightStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  nutrientCard: {
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  nutrientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutrientTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  nutrientTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  nutrientMechanism: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  nutrientEvidence: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  evidenceItem: {
    flex: 1,
  },
  evidenceLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginBottom: 4,
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evidenceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.primary,
  },
  nutrientSources: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: SURFACES.elevated,
  },
  sourcesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.tertiary,
    marginBottom: 4,
  },
  sourcesText: {
    fontSize: 10,
    color: TEXT.tertiary,
    lineHeight: 14,
  },
  comingSoon: {
    backgroundColor: SURFACES.card,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  comingSoonText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT.secondary,
  },
  comingSoonSubtext: {
    fontSize: 12,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  patternCard: {
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  patternHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  patternTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
    flex: 1,
  },
  patternInsight: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  insufficientData: {
    backgroundColor: SURFACES.card,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  insufficientDataText: {
    fontSize: 13,
    color: TEXT.tertiary,
    textAlign: 'center',
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
