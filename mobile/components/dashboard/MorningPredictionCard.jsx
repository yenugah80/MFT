/**
 * MorningPredictionCard Component (Time-Aware Day Forecast)
 *
 * Premium "Day Forecast" card that adapts throughout the day:
 * - Morning (5am-11am): Day forecast, breakfast impact
 * - Midday (11am-2pm): Lunch guidance, hydration check
 * - Afternoon (2pm-5pm): Energy crash prevention
 * - Evening (5pm-9pm): Dinner impact on sleep
 * - Night (9pm-5am): Tomorrow prep
 *
 * Key differentiator: PREDICT before it happens
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTimeAwarePrediction } from '../../hooks/usePredictions';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';
import { BOLD_GRADIENTS, DEPTH_SHADOWS } from '../../constants/modernColorPalette';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

// Energy level colors
const ENERGY_COLORS = {
  high: ['#22C55E', '#16A34A'],
  moderate: ['#F59E0B', '#D97706'],
  low: ['#EF4444', '#DC2626'],
  crash: ['#DC2626', '#991B1B'],
  unknown: ['#6B7280', '#4B5563'],
};

// Progress ring component
function EnergyRing({ score, size = 100, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  // Determine color based on score
  let color = '#22C55E';
  if (score < 40) color = '#EF4444';
  else if (score < 60) color = '#F59E0B';
  else if (score < 75) color = '#84CC16';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgLinearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={color} stopOpacity="0.7" />
          </SvgLinearGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#energyGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={styles.scoreValue}>{score}</Text>
        <Text style={styles.scoreLabel}>Energy</Text>
      </View>
    </View>
  );
}

// Risk badge component
function RiskBadge({ risk }) {
  const severityColors = {
    high: { bg: 'rgba(239, 68, 68, 0.12)', text: '#DC2626', icon: '#EF4444' },
    medium: { bg: 'rgba(245, 158, 11, 0.12)', text: '#D97706', icon: '#F59E0B' },
    low: { bg: 'rgba(34, 197, 94, 0.12)', text: '#16A34A', icon: '#22C55E' },
  };

  const colors = severityColors[risk.severity] || severityColors.medium;

  return (
    <View style={[styles.riskBadge, { backgroundColor: colors.bg }]}>
      <Ionicons name={risk.icon || 'warning-outline'} size={16} color={colors.icon} />
      <View style={styles.riskContent}>
        <Text style={[styles.riskTitle, { color: colors.text }]}>{risk.title}</Text>
        <Text style={styles.riskTime}>{risk.timeWindow}</Text>
      </View>
    </View>
  );
}

// Prevention tip component
function PreventionTip({ tip, onPress }) {
  const iconMap = {
    water: 'water',
    nutrition: 'nutrition',
    egg: 'egg',
    sunny: 'sunny',
    walk: 'walk',
  };

  return (
    <TouchableOpacity
      style={styles.tipCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(tip);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.tipIconContainer}>
        <Ionicons
          name={iconMap[tip.icon] || 'bulb-outline'}
          size={18}
          color={BRAND.primary}
        />
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipAction}>{tip.action}</Text>
        <Text style={styles.tipReason}>{tip.reason}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
    </TouchableOpacity>
  );
}

export default function MorningPredictionCard({ onTipPress, onExpandPress }) {
  const {
    prediction,
    isLoading,
    error,
    // Time-aware fields
    timePeriod,
    greeting,
    forecastTitle,
    focusArea,
    nextMilestone,
    // Base fields
    energyScore,
    risks,
    preventionTips,
    hasHighRisk,
    confidence,
    // Deep insights (14-day analysis)
    hasDeepInsights,
    trends,
    crashPatterns,
    loggingEncouragement,
    deepInsightsSummary,
  } = useTimeAwarePrediction();

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(249,250,251,0.95)']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="small" color={BRAND.primary} />
          <Text style={styles.loadingText}>Analyzing your patterns...</Text>
        </LinearGradient>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={24} color={TEXT.tertiary} />
          <Text style={styles.errorText}>Couldn't load prediction</Text>
        </View>
      </View>
    );
  }

  // No data yet
  if (!prediction) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={hasHighRisk
          ? ['rgba(254,242,242,0.98)', 'rgba(255,255,255,0.98)']
          : ['rgba(240,253,244,0.98)', 'rgba(255,255,255,0.98)']
        }
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerBadge}>
              <Ionicons
                name={timePeriod === 'morning' ? 'sunny' : timePeriod === 'evening' || timePeriod === 'night' ? 'moon' : 'partly-sunny'}
                size={14}
                color={timePeriod === 'night' ? '#8B5CF6' : '#F59E0B'}
              />
              <Text style={styles.headerBadgeText}>{forecastTitle || 'YOUR FORECAST'}</Text>
            </View>
            <Text style={styles.greeting}>{greeting || 'Hello'}</Text>
          </View>
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onExpandPress?.();
            }}
          >
            <Ionicons name="expand-outline" size={18} color={TEXT.secondary} />
          </TouchableOpacity>
        </View>

        {/* Main content */}
        <View style={styles.mainContent}>
          {/* Energy ring */}
          <View style={styles.energySection}>
            <EnergyRing score={energyScore ?? 70} size={90} strokeWidth={7} />
          </View>

          {/* Context and risks */}
          <View style={styles.contextSection}>
            {/* Focus Area - Time-specific priority */}
            {focusArea && (
              <View style={[
                styles.focusAreaBadge,
                { backgroundColor: focusArea.priority === 'high' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }
              ]}>
                <Ionicons
                  name={`${focusArea.icon || 'flag'}-outline`}
                  size={14}
                  color={focusArea.priority === 'high' ? '#EF4444' : BRAND.primary}
                />
                <View style={styles.focusAreaContent}>
                  <Text style={[
                    styles.focusAreaTitle,
                    { color: focusArea.priority === 'high' ? '#DC2626' : TEXT.primary }
                  ]}>
                    {focusArea.title}
                  </Text>
                  <Text style={styles.focusAreaDesc} numberOfLines={1}>
                    {focusArea.description}
                  </Text>
                </View>
              </View>
            )}

            {/* Risks */}
            {risks.length > 0 && (
              <View style={styles.risksContainer}>
                {risks.slice(0, 2).map((risk, index) => (
                  <RiskBadge key={index} risk={risk} />
                ))}
              </View>
            )}

            {/* Next Milestone */}
            {nextMilestone && nextMilestone.type !== 'complete' && (
              <View style={styles.milestoneBadge}>
                <Ionicons name={`${nextMilestone.icon || 'flag'}-outline`} size={12} color={BRAND.primary} />
                <Text style={styles.milestoneText}>{nextMilestone.label}</Text>
              </View>
            )}

            {/* Deep Insights or Logging Encouragement */}
            {hasDeepInsights ? (
              <View style={styles.deepInsightsBadge}>
                <Ionicons name="analytics" size={12} color="#8B5CF6" />
                <Text style={styles.deepInsightsText}>
                  {trends?.trends?.[0]?.message || crashPatterns?.message || 'Deep patterns detected'}
                </Text>
              </View>
            ) : loggingEncouragement ? (
              <View style={styles.encouragementBadge}>
                <Text style={styles.encouragementEmoji}>{loggingEncouragement.emoji}</Text>
                <Text style={styles.encouragementText}>{loggingEncouragement.message}</Text>
              </View>
            ) : null}

            {/* Confidence indicator */}
            {confidence > 0 && (
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceText}>
                  {Math.round(confidence * 100)}% confidence
                </Text>
                <Text style={styles.dataPointsText}>
                  {prediction?.dataPointsUsed || 0} data points
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Prevention tips */}
        {preventionTips.length > 0 && (
          <View style={styles.tipsSection}>
            <View style={styles.tipsDivider} />
            <Text style={styles.tipsHeader}>
              <Ionicons name="shield-checkmark-outline" size={14} color={BRAND.primary} />
              {' '}Prevention
            </Text>
            {preventionTips.slice(0, 2).map((tip, index) => (
              <PreventionTip key={index} tip={tip} onPress={onTipPress} />
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...DEPTH_SHADOWS.medium,
  },
  loadingContainer: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: TEXT.secondary,
    marginTop: SPACING.sm,
  },
  errorContainer: {
    backgroundColor: SURFACES.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: TEXT.tertiary,
    marginTop: SPACING.xs,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  headerBadgeText: {
    ...TYPOGRAPHY.overline,
    color: '#D97706',
    letterSpacing: 1,
  },
  greeting: {
    ...TYPOGRAPHY.h3,
    color: TEXT.primary,
  },
  expandButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },

  // Main content
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  energySection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    ...TYPOGRAPHY.h1,
    color: TEXT.primary,
    fontSize: 28,
    lineHeight: 32,
  },
  scoreLabel: {
    ...TYPOGRAPHY.overline,
    color: TEXT.tertiary,
    fontSize: 9,
  },

  // Context section
  contextSection: {
    flex: 1,
    gap: SPACING.sm,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  contextText: {
    ...TYPOGRAPHY.caption,
    color: TEXT.secondary,
    fontSize: 11,
  },
  risksContainer: {
    gap: SPACING.xs,
  },

  // Focus area
  focusAreaBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  focusAreaContent: {
    flex: 1,
  },
  focusAreaTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  focusAreaDesc: {
    ...TYPOGRAPHY.caption,
    color: TEXT.secondary,
    fontSize: 10,
    marginTop: 1,
  },

  // Milestone
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  milestoneText: {
    ...TYPOGRAPHY.caption,
    color: BRAND.primary,
    fontSize: 10,
    fontWeight: '500',
  },

  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  confidenceText: {
    ...TYPOGRAPHY.caption,
    color: TEXT.tertiary,
    fontSize: 10,
  },
  dataPointsText: {
    ...TYPOGRAPHY.caption,
    color: TEXT.quaternary,
    fontSize: 10,
  },

  // Deep insights badge
  deepInsightsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  deepInsightsText: {
    ...TYPOGRAPHY.caption,
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '500',
  },

  // Logging encouragement badge
  encouragementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  encouragementEmoji: {
    fontSize: 12,
  },
  encouragementText: {
    ...TYPOGRAPHY.caption,
    color: TEXT.secondary,
    fontSize: 10,
  },

  // Risk badge
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  riskContent: {
    flex: 1,
  },
  riskTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  riskTime: {
    ...TYPOGRAPHY.caption,
    color: TEXT.tertiary,
    fontSize: 10,
  },

  // Tips section
  tipsSection: {
    marginTop: SPACING.md,
  },
  tipsDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: SPACING.md,
  },
  tipsHeader: {
    ...TYPOGRAPHY.overline,
    color: BRAND.primary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  tipIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34,197,94,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipAction: {
    ...TYPOGRAPHY.bodySmall,
    color: TEXT.primary,
    fontWeight: '600',
  },
  tipReason: {
    ...TYPOGRAPHY.caption,
    color: TEXT.secondary,
    fontSize: 11,
  },
});
