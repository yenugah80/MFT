/**
 * ColdStartCard - Unified cold start state component
 *
 * Consolidates duplicate implementations from:
 * - activity.jsx (lines 723-855)
 * - hydration.jsx (lines 633-699)
 * - patterns.jsx (lines 1169-1231)
 *
 * Design Principles:
 * - Encouraging tone ("You're building something great!")
 * - Visual progress indicator (day dots)
 * - Clear action guidance
 * - WCAG 2.1 AA compliant
 *
 * Stages:
 * - day0: First visit, no data yet
 * - days1-3: Building foundation
 * - days4-7: Gaining momentum
 * - established: Full insights available (7+ days)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  CARD_SYSTEM,
  BRAND,
  VIBRANT_WELLNESS,
  SEMANTIC,
} from '../../constants/premiumTheme';

// Stage configuration with encouraging messages
const STAGE_CONFIG = {
  day0: {
    title: 'Start Your Journey',
    message: "Log your first entry to begin discovering personalized insights.",
    encouragement: "Every great journey begins with a single step.",
    icon: 'rocket-outline',
    gradient: ['#6B4EFF', '#8B6EFF'],
    progress: 0,
  },
  'days1-3': {
    title: 'Building Your Foundation',
    message: "You're off to a great start! Keep logging to unlock smarter insights.",
    encouragement: "Consistency is the key to understanding your patterns.",
    icon: 'construct-outline',
    gradient: ['#F59E0B', '#FBBF24'],
    progress: 0.3,
  },
  'days4-7': {
    title: 'Gaining Momentum',
    message: "Almost there! A few more days and your personalized insights will be ready.",
    encouragement: "Your dedication is paying off. Patterns are emerging!",
    icon: 'trending-up-outline',
    gradient: ['#10B981', '#34D399'],
    progress: 0.7,
  },
  established: {
    title: 'Insights Ready',
    message: "Your personalized analytics are now available!",
    encouragement: "Time to discover what makes you thrive.",
    icon: 'analytics-outline',
    gradient: VIBRANT_WELLNESS.activity.gradient,
    progress: 1,
  },
};

// Category-specific configurations
const CATEGORY_CONFIG = {
  activity: {
    icon: 'fitness-outline',
    ctaText: 'Log Activity',
    ctaRoute: '/(tabs)/log',
    accentColor: VIBRANT_WELLNESS.activity.solid,
    gradient: VIBRANT_WELLNESS.activity.gradient,
    minDays: 7,
    dataLabel: 'activity logs',
  },
  hydration: {
    icon: 'water-outline',
    ctaText: 'Log Water',
    ctaRoute: '/(tabs)/log',
    accentColor: VIBRANT_WELLNESS.hydration.solid,
    gradient: VIBRANT_WELLNESS.hydration.gradient,
    minDays: 7,
    dataLabel: 'hydration entries',
  },
  mood: {
    icon: 'happy-outline',
    ctaText: 'Log Mood',
    ctaRoute: '/(tabs)/log',
    accentColor: VIBRANT_WELLNESS.mood.solid,
    gradient: VIBRANT_WELLNESS.mood.gradient,
    minDays: 7,
    dataLabel: 'mood entries',
  },
  nutrition: {
    icon: 'nutrition-outline',
    ctaText: 'Log Food',
    ctaRoute: '/(tabs)/log',
    accentColor: VIBRANT_WELLNESS.nutrition.solid,
    gradient: VIBRANT_WELLNESS.nutrition.gradient,
    minDays: 7,
    dataLabel: 'food logs',
  },
  patterns: {
    icon: 'pulse-outline',
    ctaText: 'Start Tracking',
    ctaRoute: '/(tabs)/log',
    accentColor: BRAND.primary,
    gradient: [BRAND.primary, BRAND.primaryLight],
    minDays: 7,
    dataLabel: 'tracking days',
  },
};

/**
 * Determine cold start stage based on data
 */
function determineStage(distinctDays, minDays = 7) {
  if (distinctDays === 0) return 'day0';
  if (distinctDays <= 3) return 'days1-3';
  if (distinctDays < minDays) return 'days4-7';
  return 'established';
}

export default function ColdStartCard({
  category = 'patterns',
  distinctDays = 0,
  totalLogs = 0,
  onAction,
  onDismiss,
  style,
  compact = false,
}) {
  const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.patterns;
  const stage = determineStage(distinctDays, categoryConfig.minDays);
  const stageConfig = STAGE_CONFIG[stage];

  const daysRemaining = Math.max(0, categoryConfig.minDays - distinctDays);
  const progressPercentage = Math.min((distinctDays / categoryConfig.minDays) * 100, 100);

  // Generate progress dots
  const progressDots = useMemo(() => {
    return Array.from({ length: categoryConfig.minDays }, (_, i) => ({
      filled: i < distinctDays,
      current: i === distinctDays - 1,
    }));
  }, [distinctDays, categoryConfig.minDays]);

  if (stage === 'established') {
    return null; // Don't show card when fully established
  }

  if (compact) {
    return (
      <CompactColdStartCard
        stage={stage}
        stageConfig={stageConfig}
        categoryConfig={categoryConfig}
        daysRemaining={daysRemaining}
        progressPercentage={progressPercentage}
        onAction={onAction}
        style={style}
      />
    );
  }

  return (
    <View style={[styles.container, CARD_SYSTEM.standard, style]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={stageConfig.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name={stageConfig.icon} size={28} color={TEXT.white} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{stageConfig.title}</Text>
            <Text style={styles.subtitle}>
              {daysRemaining > 0
                ? `${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''} to unlock insights`
                : 'Insights ready!'}
            </Text>
          </View>
        </View>

        {/* Dismiss button */}
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Dismiss cold start card"
          >
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.message}>{stageConfig.message}</Text>

        {/* Progress Dots */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            Day {distinctDays} of {categoryConfig.minDays}
          </Text>
          <View style={styles.dotsContainer}>
            {progressDots.map((dot, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  dot.filled && styles.progressDotFilled,
                  dot.current && styles.progressDotCurrent,
                  { backgroundColor: dot.filled ? categoryConfig.accentColor : SURFACES.background.tertiary },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <LinearGradient
              colors={categoryConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
            />
          </View>
          <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
        </View>

        {/* Encouragement */}
        <View style={styles.encouragementContainer}>
          <Ionicons name="sparkles" size={16} color={categoryConfig.accentColor} />
          <Text style={styles.encouragementText}>{stageConfig.encouragement}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalLogs}</Text>
            <Text style={styles.statLabel}>{categoryConfig.dataLabel}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{distinctDays}</Text>
            <Text style={styles.statLabel}>unique days</Text>
          </View>
        </View>

        {/* CTA Button */}
        {onAction && (
          <TouchableOpacity
            onPress={onAction}
            style={styles.ctaButton}
            accessibilityLabel={`${categoryConfig.ctaText} to build your insights`}
          >
            <LinearGradient
              colors={categoryConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name={categoryConfig.icon} size={20} color={TEXT.white} />
              <Text style={styles.ctaText}>{categoryConfig.ctaText}</Text>
              <Ionicons name="arrow-forward" size={18} color={TEXT.white} />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Compact version for inline display
 */
function CompactColdStartCard({
  stage,
  stageConfig,
  categoryConfig,
  daysRemaining,
  progressPercentage,
  onAction,
  style,
}) {
  return (
    <TouchableOpacity
      onPress={onAction}
      style={[styles.compactContainer, CARD_SYSTEM.compact, style]}
      accessibilityLabel={`${stageConfig.title}: ${daysRemaining} days remaining`}
    >
      <LinearGradient
        colors={[`${categoryConfig.accentColor}15`, `${categoryConfig.accentColor}08`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.compactGradient}
      >
        <View style={[styles.compactIcon, { backgroundColor: `${categoryConfig.accentColor}20` }]}>
          <Ionicons name={stageConfig.icon} size={20} color={categoryConfig.accentColor} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle}>{stageConfig.title}</Text>
          <Text style={styles.compactSubtitle}>
            {daysRemaining > 0 ? `${daysRemaining} days to insights` : 'Tap to explore'}
          </Text>
        </View>
        <View style={styles.compactProgress}>
          <Text style={[styles.compactPercentage, { color: categoryConfig.accentColor }]}>
            {Math.round(progressPercentage)}%
          </Text>
          <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/**
 * Inline progress indicator for headers
 */
export function ColdStartProgress({
  distinctDays = 0,
  minDays = 7,
  color,
  style,
}) {
  const percentage = Math.min((distinctDays / minDays) * 100, 100);

  if (distinctDays >= minDays) return null;

  return (
    <View style={[styles.inlineProgress, style]}>
      <View style={styles.inlineProgressBg}>
        <View
          style={[
            styles.inlineProgressFill,
            { width: `${percentage}%`, backgroundColor: color || BRAND.primary },
          ]}
        />
      </View>
      <Text style={styles.inlineProgressText}>
        {minDays - distinctDays} days to insights
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    padding: 0,
  },
  header: {
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.white,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  dismissButton: {
    position: 'absolute',
    top: SPACING[2],
    right: SPACING[2],
    padding: SPACING[1],
  },
  content: {
    padding: SPACING[4],
  },
  message: {
    fontSize: TYPOGRAPHY.size.base,
    color: TEXT.secondary,
    lineHeight: 22,
    marginBottom: SPACING[4],
  },
  progressSection: {
    marginBottom: SPACING[3],
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    marginBottom: SPACING[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: SPACING[1],
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotFilled: {
    transform: [{ scale: 1 }],
  },
  progressDotCurrent: {
    transform: [{ scale: 1.2 }],
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    minWidth: 36,
    textAlign: 'right',
  },
  encouragementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: SURFACES.background.tertiary,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[4],
  },
  encouragementText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: SURFACES.divider,
  },
  ctaButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
  },
  ctaText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
  },

  // Compact styles
  compactContainer: {
    padding: 0,
    overflow: 'hidden',
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING[3],
  },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  compactSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },
  compactProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  compactPercentage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },

  // Inline progress styles
  inlineProgress: {
    alignItems: 'center',
  },
  inlineProgressBg: {
    width: 60,
    height: 4,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  inlineProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  inlineProgressText: {
    fontSize: 10,
    color: TEXT.tertiary,
  },
});
