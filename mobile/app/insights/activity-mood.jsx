/**
 * Activity-Mood Correlation Screen
 *
 * Deep-dive analysis of Physical Activity ↔ Mood relationship
 * Based on CDC Physical Activity Guidelines
 *
 * Shows both acute (immediate) and chronic (long-term) benefits
 */

import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import ActivityMoodCard from '../../components/analytics/ActivityMoodCard';
import CircularProgress from '../../components/analytics/CircularProgress';

import { useMoodTrends } from '../../hooks/useMoodTrends';

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
import { SCIENTIFIC_PRIORS, CONFIG, EVIDENCE_TERMINOLOGY } from '../../utils/multiFactorAnalytics';

export default function ActivityMoodScreen() {
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
              colors={[`${SEMANTIC.success.base}20`, SURFACES.card.primary]}
              style={styles.benefitGradient}
            >
              <View style={styles.benefitHeader}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="flash" size={28} color={SEMANTIC.success.base} />
                </View>
                <View style={styles.benefitTitle}>
                  <Text style={styles.benefitName}>Immediate Benefits</Text>
                  <Text style={styles.benefitSubtitle}>Post-Exercise Period</Text>
                </View>
                <CircularProgress
                  percentage={acuteEffect.effect * 100}
                  size={60}
                  strokeWidth={6}
                  color={SEMANTIC.success.base}
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
                  <Ionicons name="shield-checkmark-outline" size={16} color={SEMANTIC.success.base} />
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
              colors={[`${SEMANTIC.info.base}20`, SURFACES.card.primary]}
              style={styles.benefitGradient}
            >
              <View style={styles.benefitHeader}>
                <View style={[styles.benefitIcon, { backgroundColor: `${SEMANTIC.info.base}20` }]}>
                  <Ionicons name="trending-up" size={28} color={SEMANTIC.info.base} />
                </View>
                <View style={styles.benefitTitle}>
                  <Text style={styles.benefitName}>Long-Term Benefits</Text>
                  <Text style={styles.benefitSubtitle}>Regular Activity</Text>
                </View>
                <CircularProgress
                  percentage={chronicEffect.effect * 100}
                  size={60}
                  strokeWidth={6}
                  color={SEMANTIC.info.base}
                  showPercentage={false}
                >
                  <Text style={[styles.progressText, { color: SEMANTIC.info.base }]}>
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
                  <Ionicons name="shield-checkmark-outline" size={16} color={SEMANTIC.info.base} />
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
              colors={[BRAND.primary + '20', SURFACES.card.primary]}
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
                <Ionicons name="walk" size={24} color={SEMANTIC.info.base} />
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
              <View style={[styles.guidelineIcon, { backgroundColor: `${SEMANTIC.success.base}20` }]}>
                <Ionicons name="fitness" size={24} color={SEMANTIC.success.base} />
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
                <Ionicons name="shield-checkmark" size={14} color={SEMANTIC.success.base} />
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
    backgroundColor: SURFACES.background.primary,
  },
  content: {
    padding: SPACING[4],
    gap: SPACING[4],
  },
  timeRangeContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[1],
    borderRadius: RADIUS.md,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: VIBRANT_WELLNESS.activity.solid,
  },
  timeRangeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
  },
  timeRangeTextActive: {
    color: TEXT.white,
  },
  section: {
    gap: SPACING[3],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  benefitCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  benefitGradient: {
    padding: SPACING[4],
    gap: SPACING[3],
  },
  benefitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  benefitIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${SEMANTIC.success.base}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    flex: 1,
  },
  benefitName: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  benefitSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  progressText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.success.base,
  },
  benefitDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  benefitStats: {
    flexDirection: 'row',
    gap: SPACING[4],
    marginTop: SPACING[1],
  },
  benefitStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1.5],
  },
  benefitStatText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  guidelinesCard: {
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[4],
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  guidelineItem: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  guidelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${SEMANTIC.info.base}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelineContent: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  guidelineTarget: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: VIBRANT_WELLNESS.activity.solid,
    marginTop: SPACING[1],
  },
  guidelineExample: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  guidelineDivider: {
    height: 1,
    backgroundColor: SURFACES.divider,
    marginVertical: SPACING[4],
  },
  sourcesCard: {
    flexDirection: 'row',
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[4],
    borderRadius: RADIUS.lg,
    gap: SPACING[3],
    ...SHADOWS.md,
  },
  sourcesIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${VIBRANT_WELLNESS.activity.solid}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourcesContent: {
    flex: 1,
    gap: SPACING[1.5],
  },
  sourcesTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  sourcesText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    lineHeight: 15,
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    alignSelf: 'flex-start',
    backgroundColor: `${SEMANTIC.success.base}20`,
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.md,
  },
  evidenceText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: SEMANTIC.success.base,
  },
  ctaCard: {
    backgroundColor: `${VIBRANT_WELLNESS.activity.solid}10`,
    padding: SPACING[6],
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    gap: SPACING[3],
    ...SHADOWS.sm,
  },
  ctaTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: VIBRANT_WELLNESS.activity.solid,
    paddingHorizontal: SPACING[8],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.md,
    marginTop: SPACING[2],
  },
  ctaButtonText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },
});
