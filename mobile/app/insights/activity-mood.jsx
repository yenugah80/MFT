/**
 * Activity-Mood Correlation Screen
 *
 * Deep-dive analysis of Physical Activity ↔ Mood relationship
 * Based on CDC Physical Activity Guidelines
 *
 * Shows both acute (immediate) and chronic (long-term) benefits
 */

import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import ActivityMoodCard from '../../components/analytics/ActivityMoodCard';
import CircularProgress from '../../components/analytics/CircularProgress';
import MiniBarChart from '../../components/analytics/MiniBarChart';

import { useMoodTrends } from '../../hooks/useMoodTrends';

import { TEXT, BRAND, SURFACES, SEMANTIC, SHADOWS } from '../../constants/premiumTheme';
import { SCIENTIFIC_PRIORS, CONFIG, EVIDENCE_TERMINOLOGY } from '../../utils/multiFactorAnalytics';

export default function ActivityMoodScreen() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState(30);

  const { data: moodData } = useMoodTrends({ days: timeRange });
  const moodLogs = moodData?.data || [];

  // For now, showing research-backed insights
  // Activity tracking to be added later
  const activityLogs = [];

  const acuteEffect = SCIENTIFIC_PRIORS.ACTIVITY_MOOD.acute_exercise;
  const chronicEffect = SCIENTIFIC_PRIORS.ACTIVITY_MOOD.chronic_exercise;
  const cognitiveProtection = SCIENTIFIC_PRIORS.ACTIVITY_MOOD.cognitive_decline_prevention;

  return (
    <>
      <Stack.Screen options={{ title: 'Activity → Mood', headerShown: true }} />

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
        <ActivityMoodCard activityLogs={activityLogs} moodLogs={moodLogs} compact={false} />

        {/* Benefits Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise Benefits</Text>

          {/* Acute Benefits */}
          <View style={styles.benefitCard}>
            <LinearGradient
              colors={[SEMANTIC.success + '20', SURFACES.card]}
              style={styles.benefitGradient}
            >
              <View style={styles.benefitHeader}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="flash" size={28} color={SEMANTIC.success} />
                </View>
                <View style={styles.benefitTitle}>
                  <Text style={styles.benefitName}>Immediate Benefits</Text>
                  <Text style={styles.benefitSubtitle}>Post-Exercise Period</Text>
                </View>
                <CircularProgress
                  percentage={acuteEffect.effect * 100}
                  size={60}
                  strokeWidth={6}
                  color={SEMANTIC.success}
                  showPercentage={false}
                >
                  <Text style={styles.progressText}>+{Math.round(acuteEffect.effect * 100)}%</Text>
                </CircularProgress>
              </View>

              <Text style={styles.benefitDescription}>{acuteEffect.mechanism}</Text>

              <View style={styles.benefitStats}>
                <View style={styles.benefitStat}>
                  <Ionicons name="time-outline" size={16} color={TEXT.tertiary} />
                  <Text style={styles.benefitStatText}>{acuteEffect.duration}</Text>
                </View>
                <View style={styles.benefitStat}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={SEMANTIC.success} />
                  <Text style={styles.benefitStatText}>
                    {EVIDENCE_TERMINOLOGY.getConfidenceLabel(acuteEffect.confidence)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Chronic Benefits */}
          <View style={styles.benefitCard}>
            <LinearGradient
              colors={[SEMANTIC.info + '20', SURFACES.card]}
              style={styles.benefitGradient}
            >
              <View style={styles.benefitHeader}>
                <View style={[styles.benefitIcon, { backgroundColor: SEMANTIC.info + '20' }]}>
                  <Ionicons name="trending-up" size={28} color={SEMANTIC.info} />
                </View>
                <View style={styles.benefitTitle}>
                  <Text style={styles.benefitName}>Long-Term Benefits</Text>
                  <Text style={styles.benefitSubtitle}>Regular Activity</Text>
                </View>
                <CircularProgress
                  percentage={chronicEffect.effect * 100}
                  size={60}
                  strokeWidth={6}
                  color={SEMANTIC.info}
                  showPercentage={false}
                >
                  <Text style={[styles.progressText, { color: SEMANTIC.info }]}>
                    +{Math.round(chronicEffect.effect * 100)}%
                  </Text>
                </CircularProgress>
              </View>

              <Text style={styles.benefitDescription}>{chronicEffect.mechanism}</Text>

              <View style={styles.benefitStats}>
                <View style={styles.benefitStat}>
                  <Ionicons name="calendar-outline" size={16} color={TEXT.tertiary} />
                  <Text style={styles.benefitStatText}>{chronicEffect.dosage}</Text>
                </View>
                <View style={styles.benefitStat}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={SEMANTIC.info} />
                  <Text style={styles.benefitStatText}>
                    {EVIDENCE_TERMINOLOGY.getConfidenceLabel(chronicEffect.confidence)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Cognitive Protection */}
          <View style={styles.benefitCard}>
            <LinearGradient
              colors={[BRAND.primary + '20', SURFACES.card]}
              style={styles.benefitGradient}
            >
              <View style={styles.benefitHeader}>
                <View style={[styles.benefitIcon, { backgroundColor: BRAND.primary + '20' }]}>
                  <Ionicons name="shield" size={28} color={BRAND.primary} />
                </View>
                <View style={styles.benefitTitle}>
                  <Text style={styles.benefitName}>Brain Health Protection</Text>
                  <Text style={styles.benefitSubtitle}>Dementia Prevention</Text>
                </View>
                <CircularProgress
                  percentage={cognitiveProtection.effect * 100}
                  size={60}
                  strokeWidth={6}
                  color={BRAND.primary}
                  showPercentage={false}
                >
                  <Text style={[styles.progressText, { color: BRAND.primary }]}>
                    +{Math.round(cognitiveProtection.effect * 100)}%
                  </Text>
                </CircularProgress>
              </View>

              <Text style={styles.benefitDescription}>{cognitiveProtection.mechanism}</Text>

              <View style={styles.benefitStats}>
                <View style={styles.benefitStat}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={BRAND.primary} />
                  <Text style={styles.benefitStatText}>
                    {EVIDENCE_TERMINOLOGY.getConfidenceLabel(cognitiveProtection.confidence)}
                  </Text>
                </View>
                <View style={styles.benefitStat}>
                  <Ionicons name="medal-outline" size={16} color={BRAND.primary} />
                  <Text style={styles.benefitStatText}>
                    {EVIDENCE_TERMINOLOGY.getCausalFraming(cognitiveProtection.evidenceLevel)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* CDC Guidelines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CDC Activity Guidelines</Text>
          <View style={styles.guidelinesCard}>
            <View style={styles.guidelineItem}>
              <View style={styles.guidelineIcon}>
                <Ionicons name="walk" size={24} color={SEMANTIC.info} />
              </View>
              <View style={styles.guidelineContent}>
                <Text style={styles.guidelineTitle}>Moderate Activity</Text>
                <Text style={styles.guidelineTarget}>
                  {CONFIG.ACTIVITY_MODERATE_MIN} minutes/week
                </Text>
                <Text style={styles.guidelineExample}>
                  Examples: Brisk walking, dancing, light cycling
                </Text>
              </View>
            </View>

            <View style={styles.guidelineDivider} />

            <View style={styles.guidelineItem}>
              <View style={[styles.guidelineIcon, { backgroundColor: SEMANTIC.success + '20' }]}>
                <Ionicons name="fitness" size={24} color={SEMANTIC.success} />
              </View>
              <View style={styles.guidelineContent}>
                <Text style={styles.guidelineTitle}>Vigorous Activity</Text>
                <Text style={styles.guidelineTarget}>
                  {CONFIG.ACTIVITY_VIGOROUS_MIN} minutes/week
                </Text>
                <Text style={styles.guidelineExample}>
                  Examples: Running, HIIT, swimming, sports
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Research Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scientific Evidence</Text>
          <View style={styles.sourcesCard}>
            <View style={styles.sourcesIcon}>
              <Ionicons name="library" size={28} color={BRAND.primary} />
            </View>
            <View style={styles.sourcesContent}>
              <Text style={styles.sourcesTitle}>Research-Backed</Text>
              <Text style={styles.sourcesText}>
                {acuteEffect.sources.join(' • ')}
              </Text>
              <View style={styles.evidenceBadge}>
                <Ionicons name="shield-checkmark" size={14} color={SEMANTIC.success} />
                <Text style={styles.evidenceText}>
                  {EVIDENCE_TERMINOLOGY.getCausalFraming(acuteEffect.evidenceLevel)} - {EVIDENCE_TERMINOLOGY.getConfidenceLabel(acuteEffect.confidence)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Call to Action */}
        <View style={styles.ctaCard}>
          <Ionicons name="rocket" size={32} color={BRAND.primary} />
          <Text style={styles.ctaTitle}>Start Tracking Your Activity</Text>
          <Text style={styles.ctaText}>
            Log your physical activity to see YOUR personal mood improvements
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Navigate to activity logging (to be implemented)
            }}
          >
            <Text style={styles.ctaButtonText}>Coming Soon</Text>
          </TouchableOpacity>
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
  benefitCard: {
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  benefitGradient: {
    padding: 16,
    gap: 12,
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SEMANTIC.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    flex: 1,
  },
  benefitName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  benefitSubtitle: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: SEMANTIC.success,
  },
  benefitDescription: {
    fontSize: 13,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  benefitStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  benefitStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitStatText: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  guidelinesCard: {
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 16,
    ...SHADOWS.medium,
  },
  guidelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  guidelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SEMANTIC.info + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelineContent: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
  },
  guidelineTarget: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.primary,
    marginTop: 4,
  },
  guidelineExample: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  guidelineDivider: {
    height: 1,
    backgroundColor: SURFACES.elevated,
    marginVertical: 16,
  },
  sourcesCard: {
    flexDirection: 'row',
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 16,
    gap: 12,
    ...SHADOWS.medium,
  },
  sourcesIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourcesContent: {
    flex: 1,
    gap: 6,
  },
  sourcesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT.primary,
  },
  sourcesText: {
    fontSize: 11,
    color: TEXT.tertiary,
    lineHeight: 15,
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: SEMANTIC.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  evidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: SEMANTIC.success,
  },
  ctaCard: {
    backgroundColor: BRAND.primary + '10',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.small,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 14,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
