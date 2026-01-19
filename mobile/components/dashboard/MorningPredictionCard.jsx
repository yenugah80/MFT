/**
 * MorningPredictionCard Component (Time-Aware Day Forecast)
 *
 * REDESIGNED: Focuses on PREDICTIONS & RISKS (not scores)
 * - Shows upcoming risks as a timeline
 * - Actionable prevention tips with navigation
 * - Distinct from wellness card (no duplicate score ring)
 *
 * Time periods:
 * - Morning: What to watch for today
 * - Midday: Afternoon crash risk
 * - Evening: Impact on sleep
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
import * as Haptics from 'expo-haptics';
import { useTimeAwarePrediction } from '../../hooks/usePredictions';
import { TEXT, SURFACES, BRAND } from '../../constants/premiumTheme';
import { DEPTH_SHADOWS } from '../../constants/modernColorPalette';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';

// Risk severity styles
const RISK_STYLES = {
  high: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#DC2626',
    icon: '#EF4444',
  },
  medium: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    text: '#D97706',
    icon: '#F59E0B',
  },
  low: {
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.3)',
    text: '#16A34A',
    icon: '#22C55E',
  },
};

// Time period icons
const TIME_ICONS = {
  morning: { name: 'sunny', color: '#F59E0B' },
  midday: { name: 'partly-sunny', color: '#F97316' },
  afternoon: { name: 'cloudy', color: '#6366F1' },
  evening: { name: 'moon', color: '#8B5CF6' },
  night: { name: 'moon', color: '#6366F1' },
};

// Risk timeline item
function RiskTimelineItem({ risk, isLast }) {
  const style = RISK_STYLES[risk.severity] || RISK_STYLES.medium;

  return (
    <View style={timelineStyles.item}>
      {/* Timeline connector */}
      <View style={timelineStyles.connector}>
        <View style={[timelineStyles.dot, { backgroundColor: style.icon }]} />
        {!isLast && <View style={[timelineStyles.line, { backgroundColor: style.bg }]} />}
      </View>

      {/* Risk content */}
      <View style={[timelineStyles.content, { backgroundColor: style.bg, borderColor: style.border }]}>
        <View style={timelineStyles.header}>
          <Ionicons name={risk.icon || 'warning-outline'} size={16} color={style.icon} />
          <Text style={[timelineStyles.time, { color: style.text }]}>{risk.timeWindow}</Text>
        </View>
        <Text style={[timelineStyles.title, { color: style.text }]}>{risk.title}</Text>
        {risk.description && (
          <Text style={timelineStyles.description} numberOfLines={2}>
            {risk.description}
          </Text>
        )}
      </View>
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  connector: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  content: {
    flex: 1,
    marginLeft: 8,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: TEXT.secondary,
    lineHeight: 16,
  },
});

// Prevention tip component - actionable
function PreventionTip({ tip, onPress }) {
  const iconMap = {
    water: 'water',
    nutrition: 'nutrition',
    egg: 'egg',
    sunny: 'sunny',
    walk: 'walk',
    cafe: 'cafe',
    bed: 'bed',
  };

  return (
    <TouchableOpacity
      style={tipStyles.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(tip);
      }}
      activeOpacity={0.7}
    >
      <View style={tipStyles.iconContainer}>
        <Ionicons
          name={iconMap[tip.icon] || 'bulb-outline'}
          size={18}
          color={BRAND.primary}
        />
      </View>
      <View style={tipStyles.content}>
        <Text style={tipStyles.action}>{tip.action}</Text>
        <Text style={tipStyles.reason} numberOfLines={1}>{tip.reason}</Text>
      </View>
      <View style={tipStyles.arrow}>
        <Ionicons name="chevron-forward" size={16} color={BRAND.primary} />
      </View>
    </TouchableOpacity>
  );
}

const tipStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: RADIUS.lg,
    padding: 12,
    marginTop: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 2,
  },
  reason: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function MorningPredictionCard({ onTipPress, onExpandPress }) {
  const {
    prediction,
    isLoading,
    error,
    timePeriod,
    greeting,
    forecastTitle,
    focusArea,
    risks,
    preventionTips,
    hasHighRisk,
    confidence,
    hasDeepInsights,
    loggingEncouragement,
  } = useTimeAwarePrediction();

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={BRAND.primary} />
          <Text style={styles.loadingText}>Analyzing patterns...</Text>
        </View>
      </View>
    );
  }

  // Error or no data
  if (error || !prediction) {
    return null;
  }

  // No risks detected - show positive state
  const showAllClear = !hasHighRisk && risks.length === 0;
  const timeIcon = TIME_ICONS[timePeriod] || TIME_ICONS.morning;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={hasHighRisk
          ? ['rgba(254,242,242,0.98)', 'rgba(255,255,255,0.98)']
          : ['rgba(249,250,251,0.98)', 'rgba(255,255,255,0.98)']
        }
        style={styles.card}
      >
        {/* Header - Time-aware title */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Ionicons name={timeIcon.name} size={18} color={timeIcon.color} />
              <Text style={styles.title}>What's Ahead</Text>
            </View>
            <Text style={styles.subtitle}>
              {focusArea?.title || `${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} forecast`}
            </Text>
          </View>
          {confidence > 0 && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{Math.round(confidence * 100)}%</Text>
            </View>
          )}
        </View>

        {/* Risk Timeline or All Clear */}
        {showAllClear ? (
          <View style={styles.allClearContainer}>
            <View style={styles.allClearIcon}>
              <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
            </View>
            <Text style={styles.allClearTitle}>Looking Good!</Text>
            <Text style={styles.allClearText}>
              No energy risks detected based on your patterns
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {risks.slice(0, 3).map((risk, index) => (
              <RiskTimelineItem
                key={index}
                risk={risk}
                isLast={index === Math.min(risks.length, 3) - 1}
              />
            ))}
          </View>
        )}

        {/* Deep insights summary */}
        {hasDeepInsights && (
          <View style={styles.insightBadge}>
            <Ionicons name="analytics" size={14} color="#8B5CF6" />
            <Text style={styles.insightText}>Based on 14-day pattern analysis</Text>
          </View>
        )}

        {/* Prevention Tips */}
        {preventionTips.length > 0 && (
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>
              <Ionicons name="shield-checkmark" size={14} color={BRAND.primary} />
              {' '}Stay ahead
            </Text>
            {preventionTips.slice(0, 2).map((tip, index) => (
              <PreventionTip key={index} tip={tip} onPress={onTipPress} />
            ))}
          </View>
        )}

        {/* Logging encouragement for new users */}
        {loggingEncouragement && !hasDeepInsights && (
          <View style={styles.encouragementContainer}>
            <Text style={styles.encouragementEmoji}>{loggingEncouragement.emoji}</Text>
            <Text style={styles.encouragementText}>{loggingEncouragement.message}</Text>
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
    backgroundColor: SURFACES.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  loadingText: {
    fontSize: 13,
    color: TEXT.secondary,
    marginTop: SPACING.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT.secondary,
    marginLeft: 26, // Align with title text
  },
  confidenceBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
  },

  // Timeline
  timelineContainer: {
    marginBottom: SPACING.md,
  },

  // All clear state
  allClearContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  allClearIcon: {
    marginBottom: 8,
  },
  allClearTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16A34A',
    marginBottom: 4,
  },
  allClearText: {
    fontSize: 13,
    color: TEXT.secondary,
    textAlign: 'center',
  },

  // Insight badge
  insightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  insightText: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },

  // Tips section
  tipsSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: SPACING.md,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT.secondary,
    marginBottom: 4,
  },

  // Encouragement
  encouragementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: 12,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  encouragementEmoji: {
    fontSize: 20,
  },
  encouragementText: {
    flex: 1,
    fontSize: 13,
    color: TEXT.secondary,
  },
});
