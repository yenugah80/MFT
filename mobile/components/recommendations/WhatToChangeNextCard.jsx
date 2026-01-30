/**
 * WhatToChangeNextCard - Premium Priority Guidance
 *
 * The #1 most important change for the user to focus on.
 * Based on their patterns, gaps, and goals.
 *
 * Design Philosophy:
 * - Single-focus: ONE clear action, not a list
 * - High-impact: Shows why THIS is the priority
 * - Actionable: Includes specific steps and schedule
 * - Confidence-building: Shows the evidence behind the recommendation
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumDesignSystem';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// DIFFICULTY BADGE
// ============================================================================

function DifficultyBadge({ difficulty }) {
  const config = {
    easy: { label: 'Easy', color: PREMIUM_COLORS.semantic.success.primary, icon: 'flash' },
    medium: { label: 'Medium', color: PREMIUM_COLORS.functional.progress.primary, icon: 'timer' },
    involved: { label: 'Involved', color: PREMIUM_COLORS.semantic.warning.primary, icon: 'construct' },
  };

  const { label, color, icon } = config[difficulty] || config.easy;

  return (
    <View style={[styles.difficultyBadge, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.difficultyText, { color }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// IMPACT BADGE
// ============================================================================

function ImpactBadge({ impact }) {
  const config = {
    high: { label: 'High Impact', color: PREMIUM_COLORS.brand.primary },
    medium: { label: 'Medium Impact', color: PREMIUM_COLORS.functional.insights.primary },
    low: { label: 'Low Impact', color: PREMIUM_COLORS.text.tertiary },
  };

  const { label, color } = config[impact] || config.high;

  return (
    <View style={[styles.impactBadge, { backgroundColor: `${color}15` }]}>
      <Text style={[styles.impactText, { color }]}>{label}</Text>
    </View>
  );
}

// ============================================================================
// SCHEDULE DAY CHIP
// ============================================================================

function ScheduleChip({ day, task }) {
  return (
    <View style={styles.scheduleChip}>
      <Text style={styles.scheduleDay}>{day}</Text>
      <Text style={styles.scheduleTask} numberOfLines={1}>{task}</Text>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WhatToChangeNextCard({
  // Core recommendation
  title,
  subtitle,
  // Why this matters
  whyMatters = [],
  // How to do it
  difficulty = 'easy',
  impact = 'high',
  timeRequired,
  // Schedule suggestions
  schedule = [],
  // Alternatives if user doesn't want this
  alternatives = [],
  // Confidence
  confidence,
  dataPoints,
  // Callbacks
  onStartChallenge,
  onSeeAlternatives,
  onDismiss,
  // Style
  style,
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const toggleSchedule = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSchedule(!showSchedule);
  }, [showSchedule]);

  const toggleAlternatives = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAlternatives(!showAlternatives);
  }, [showAlternatives]);

  const handleStartChallenge = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStartChallenge?.();
  }, [onStartChallenge]);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={PREMIUM_COLORS.brand.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="star" size={20} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerLabel}>#1 Change This Week</Text>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
        </View>
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={PREMIUM_COLORS.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Badges Row */}
      <View style={styles.badges}>
        <DifficultyBadge difficulty={difficulty} />
        <ImpactBadge impact={impact} />
        {timeRequired && (
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color={PREMIUM_COLORS.text.tertiary} />
            <Text style={styles.timeText}>{timeRequired}</Text>
          </View>
        )}
      </View>

      {/* Subtitle/Description */}
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      {/* Why This Matters */}
      {whyMatters.length > 0 && (
        <View style={styles.whySection}>
          <Text style={styles.sectionLabel}>WHY THIS MATTERS</Text>
          {whyMatters.map((reason, index) => (
            <View key={index} style={styles.whyItem}>
              <View style={styles.whyBullet}>
                <Ionicons name="checkmark" size={12} color={PREMIUM_COLORS.semantic.success.primary} />
              </View>
              <Text style={styles.whyText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Schedule Suggestion */}
      {schedule.length > 0 && (
        <View style={styles.scheduleSection}>
          <TouchableOpacity style={styles.scheduleHeader} onPress={toggleSchedule}>
            <View style={styles.scheduleHeaderLeft}>
              <Ionicons name="calendar-outline" size={16} color={PREMIUM_COLORS.text.secondary} />
              <Text style={styles.scheduleLabelText}>Suggested Schedule</Text>
            </View>
            <Ionicons
              name={showSchedule ? "chevron-up" : "chevron-down"}
              size={16}
              color={PREMIUM_COLORS.text.tertiary}
            />
          </TouchableOpacity>

          {showSchedule && (
            <View style={styles.scheduleList}>
              {schedule.map((item, index) => (
                <ScheduleChip key={index} day={item.day} task={item.task} />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Confidence Footer */}
      {(confidence || dataPoints) && (
        <View style={styles.confidenceRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={PREMIUM_COLORS.text.muted} />
          <Text style={styles.confidenceText}>
            {confidence && `${confidence}% confident`}
            {confidence && dataPoints && ' • '}
            {dataPoints && `Based on ${dataPoints} days of data`}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartChallenge}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={PREMIUM_COLORS.brand.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            <Ionicons name="flash" size={18} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start This Challenge</Text>
          </LinearGradient>
        </TouchableOpacity>

        {alternatives.length > 0 && (
          <TouchableOpacity
            style={styles.alternativesButton}
            onPress={toggleAlternatives}
          >
            <Text style={styles.alternativesButtonText}>
              {showAlternatives ? 'Hide alternatives' : 'See alternatives'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Alternatives List */}
      {showAlternatives && alternatives.length > 0 && (
        <View style={styles.alternativesList}>
          <Text style={styles.alternativesLabel}>UP NEXT (After you master this)</Text>
          {alternatives.map((alt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.alternativeItem}
              onPress={() => onSeeAlternatives?.(alt)}
            >
              <View style={styles.alternativeNumber}>
                <Text style={styles.alternativeNumberText}>{index + 2}</Text>
              </View>
              <Text style={styles.alternativeText}>{alt}</Text>
              <Ionicons name="chevron-forward" size={16} color={PREMIUM_COLORS.text.muted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS['2xl'],
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    ...SHADOWS.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    marginRight: SPACING[3],
  },
  iconGradient: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.brand.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[1],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.title3,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.text.primary,
    lineHeight: TYPOGRAPHY.size.title3 * 1.2,
  },
  dismissButton: {
    padding: SPACING[1],
  },

  // Badges
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  difficultyText: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  impactBadge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  impactText: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.sm,
  },
  timeText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Subtitle
  subtitle: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.body * 1.5,
    marginBottom: SPACING[4],
  },

  // Why Section
  whySection: {
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[4],
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  whyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING[2],
  },
  whyBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PREMIUM_COLORS.semantic.success.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[2],
    marginTop: 2,
  },
  whyText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.subhead * 1.4,
  },

  // Schedule Section
  scheduleSection: {
    marginBottom: SPACING[4],
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  scheduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  scheduleLabelText: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: PREMIUM_COLORS.text.secondary,
  },
  scheduleList: {
    marginTop: SPACING[2],
    gap: SPACING[2],
  },
  scheduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.md,
    padding: SPACING[2.5],
  },
  scheduleDay: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.brand.primary,
    width: 40,
  },
  scheduleTask: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
  },

  // Confidence
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginBottom: SPACING[4],
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
  },

  // Actions
  actions: {
    gap: SPACING[2],
  },
  startButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3.5],
    gap: SPACING[2],
  },
  startButtonText: {
    fontSize: TYPOGRAPHY.size.callout,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#FFFFFF',
  },
  alternativesButton: {
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  alternativesButtonText: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Alternatives List
  alternativesList: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
  },
  alternativesLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2.5],
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM_COLORS.border.light,
  },
  alternativeNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: PREMIUM_COLORS.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  alternativeNumberText: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontFamily: TYPOGRAPHY.family.semibold,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.tertiary,
  },
  alternativeText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
  },
});
