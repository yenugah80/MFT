/**
 * HydrationIntelligenceCard - Tier 5: Dedicated Deep Dive for Hydration
 *
 * Premium card showing:
 * - Today's water intake vs goal
 * - Smart nudges based on patterns
 * - Weekly streak and trends
 * - Predictive insights
 *
 * Design: Premium glassmorphic card with contextual recommendations
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BRAND, TEXT, SURFACES, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../constants/premiumTheme';

/**
 * Generate smart hydration nudge based on patterns
 */
function generateHydrationNudge({ today, goals, trends, hydrationAnalytics }) {
  const currentHour = new Date().getHours();
  const waterIntake = Number(today?.waterIntakeLiters) || 0;
  const waterGoal = Number(goals?.waterLiters) || 2.5;
  const remaining = waterGoal - waterIntake;

  // Check if behind schedule
  const expectedProgress = (currentHour / 24) * waterGoal;
  const isBehind = waterIntake < expectedProgress * 0.8;

  if (isBehind && remaining > 0) {
    // Check typical drinking pattern
    const typicalAmount = hydrationAnalytics?.averagePerLog || 0.5;
    const suggestedTime = `${currentHour}pm`;

    return {
      type: 'nudge',
      icon: 'time',
      message: `You usually drink ${typicalAmount}L around ${suggestedTime}. Set a reminder?`,
      action: 'Set Reminder',
      severity: 'warning',
    };
  }

  // On track
  if (waterIntake >= waterGoal * 0.8) {
    return {
      type: 'success',
      icon: 'checkmark-circle',
      message: `Great hydration today! You're ${Math.round((waterIntake / waterGoal) * 100)}% of your goal`,
      action: null,
      severity: 'success',
    };
  }

  // General reminder
  return {
    type: 'info',
    icon: 'water',
    message: `${remaining.toFixed(1)}L remaining to hit your goal`,
    action: 'Quick Add 250ml',
    severity: 'info',
  };
}

export default function HydrationIntelligenceCard({
  today = {},
  goals = {},
  trends = {},
  hydrationAnalytics = {},
  onQuickAddWater,
  onViewTrends,
  onSetReminder,
}) {
  const [expanded, setExpanded] = useState(false);

  const waterIntake = Number(today?.waterIntakeLiters) || 0;
  const waterGoal = Number(goals?.waterLiters) || 2.5;
  const progress = Math.min((waterIntake / waterGoal) * 100, 100);
  const remaining = Math.max(waterGoal - waterIntake, 0);

  const weekTotal = trends?.hydrationWeekData?.reduce((sum, day) => sum + (day.totalLiters || 0), 0) || 0;
  const weekGoal = waterGoal * 7;
  const weekProgress = Math.round((weekTotal / weekGoal) * 100);

  const hydrationStreak = trends?.hydrationStreak || 0;
  const nudge = generateHydrationNudge({ today, goals, trends, hydrationAnalytics });

  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const handleQuickAdd = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onQuickAddWater) {
      onQuickAddWater(0.25); // Add 250ml
    }
  };

  const handleAction = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (nudge.action === 'Set Reminder' && onSetReminder) {
      onSetReminder();
    } else if (nudge.action === 'Quick Add 250ml' && onQuickAddWater) {
      onQuickAddWater(0.25);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'warning': return '#F59E0B';
      case 'success': return '#10B981';
      default: return BRAND.primary;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleToggle}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#06B6D4', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="water" size={20} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>HYDRATION INTELLIGENCE</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={TEXT.tertiary}
          />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressValue}>
              {waterIntake.toFixed(1)}L / {waterGoal.toFixed(1)}L
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getSeverityColor(nudge.severity) + '20' }]}>
              <Ionicons
                name={progress >= 80 ? 'checkmark-circle' : 'time'}
                size={14}
                color={getSeverityColor(nudge.severity)}
              />
              <Text style={[styles.statusText, { color: getSeverityColor(nudge.severity) }]}>
                {remaining > 0 ? `${remaining.toFixed(1)}L behind` : 'Goal hit!'}
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Expandable Content */}
        {expanded && (
          <View style={styles.expandedContent}>
            {/* Smart Nudge */}
            <View style={[styles.nudgeBox, { borderLeftColor: getSeverityColor(nudge.severity) }]}>
              <View style={styles.nudgeHeader}>
                <Ionicons name={nudge.icon} size={16} color={getSeverityColor(nudge.severity)} />
                <Text style={styles.nudgeLabel}>SMART NUDGE</Text>
              </View>
              <Text style={styles.nudgeMessage}>{nudge.message}</Text>
              {nudge.action && (
                <TouchableOpacity
                  style={[styles.nudgeAction, { backgroundColor: getSeverityColor(nudge.severity) + '20' }]}
                  onPress={handleAction}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.nudgeActionText, { color: getSeverityColor(nudge.severity) }]}>
                    {nudge.action}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={getSeverityColor(nudge.severity)} />
                </TouchableOpacity>
              )}
            </View>

            {/* Weekly Stats */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{weekTotal.toFixed(1)}L</Text>
                  <Text style={styles.statLabel}>{weekProgress}% of goal</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={16} color="#EF4444" />
                    <Text style={styles.streakValue}>{hydrationStreak}</Text>
                  </View>
                  <Text style={styles.statLabel}>day streak</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleQuickAdd}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#06B6D4', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="add-circle" size={18} color="#FFF" />
                  <Text style={styles.buttonText}>Quick Add 250ml</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onViewTrends}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>View Trends</Text>
                <Ionicons name="arrow-forward" size={16} color={BRAND.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: SURFACES.card.background,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    letterSpacing: 0.5,
  },
  progressSection: {
    marginBottom: SPACING.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  progressValue: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  statusText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    marginLeft: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#06B6D4',
    borderRadius: RADIUS.sm,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: SURFACES.card.border,
  },
  nudgeBox: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  nudgeLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  nudgeMessage: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  nudgeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  nudgeActionText: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    marginRight: 6,
  },
  statsSection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: SURFACES.card.border,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  streakValue: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#EF4444',
    marginLeft: 4,
  },
  actions: {
    gap: SPACING.sm,
  },
  primaryButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
    marginLeft: SPACING.xs,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
    marginRight: 6,
  },
});
