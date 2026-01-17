/**
 * PersonalizedHydrationInsights - Real Data Only
 *
 * Provides genuinely useful insights based on ACTUAL user data:
 * - Time since last drink (from real water logs)
 * - Pace prediction (based on current intake vs time of day)
 * - Real mood-hydration correlation (from correlation engine)
 * - Personal patterns (from user's history)
 *
 * NO fake/demo/sample data - everything comes from real user logs.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SURFACES,
  BRAND,
  SEMANTIC,
  VIBRANT_WELLNESS,
} from '../../constants/premiumTheme';

// NOTE: usePersonalizedPatterns is disabled for now to avoid bundle loading errors
// import { usePersonalizedPatterns } from '../../hooks/useInsights';

// ============================================================================
// TIME CALCULATIONS (from real data)
// ============================================================================

/**
 * Calculate time since last water log
 * @param {Array} waterLogs - Today's water logs from API
 * @returns {Object} { minutes, hours, displayText, isOverdue }
 */
const calculateTimeSinceLastDrink = (waterLogs) => {
  if (!waterLogs || waterLogs.length === 0) {
    return { minutes: null, hours: null, displayText: 'No logs today', isOverdue: false, hasData: false };
  }

  // Sort by timestamp descending to get most recent
  const sortedLogs = [...waterLogs].sort((a, b) =>
    new Date(b.loggedDate || b.timestamp) - new Date(a.loggedDate || a.timestamp)
  );

  const lastLog = sortedLogs[0];
  const lastLogTime = new Date(lastLog.loggedDate || lastLog.timestamp);
  const now = new Date();
  const diffMs = now - lastLogTime;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;

  let displayText;
  let isOverdue = false;

  if (diffMinutes < 5) {
    displayText = 'Just now';
  } else if (diffMinutes < 60) {
    displayText = `${diffMinutes}m ago`;
    isOverdue = diffMinutes > 90; // More than 1.5 hours
  } else if (diffHours < 24) {
    displayText = remainingMinutes > 0
      ? `${diffHours}h ${remainingMinutes}m ago`
      : `${diffHours}h ago`;
    isOverdue = diffHours >= 2; // More than 2 hours
  } else {
    displayText = 'Over a day ago';
    isOverdue = true;
  }

  return {
    minutes: diffMinutes,
    hours: diffHours,
    displayText,
    isOverdue,
    hasData: true,
    lastLogTime,
  };
};

/**
 * Calculate pace prediction based on current intake and time of day
 * @param {number} currentMl - Current water intake in ml
 * @param {number} goalMl - Daily goal in ml
 * @returns {Object} Pace prediction info
 */
const calculatePacePrediction = (currentMl, goalMl) => {
  const now = new Date();
  const hour = now.getHours();
  const minutesIntoDay = hour * 60 + now.getMinutes();

  // Assume waking hours 6am-10pm (16 hours = 960 minutes)
  const wakeStart = 6 * 60; // 6am
  const wakeEnd = 22 * 60; // 10pm
  const totalWakingMinutes = wakeEnd - wakeStart;

  // Minutes elapsed since wake time
  const minutesSinceWake = Math.max(0, minutesIntoDay - wakeStart);
  const percentDayPassed = Math.min(1, minutesSinceWake / totalWakingMinutes);

  // Expected intake at this point
  const expectedMl = Math.round(goalMl * percentDayPassed);

  // Predicted end-of-day total at current pace
  const paceRate = percentDayPassed > 0 ? currentMl / percentDayPassed : 0;
  const predictedTotal = Math.round(paceRate);
  const predictedPercent = Math.round((predictedTotal / goalMl) * 100);

  // Remaining to meet goal
  const remainingMl = Math.max(0, goalMl - currentMl);
  const remainingMinutes = Math.max(0, wakeEnd - minutesIntoDay);
  const remainingHours = Math.round(remainingMinutes / 60);

  // Calculate how much per hour to meet goal
  const mlPerHourNeeded = remainingMinutes > 0 ? Math.round((remainingMl / remainingMinutes) * 60) : 0;

  // Status
  let status, statusColor, suggestion;
  const diff = currentMl - expectedMl;

  if (currentMl >= goalMl) {
    status = 'Goal reached';
    statusColor = SEMANTIC.success.base;
    suggestion = null;
  } else if (diff >= 0) {
    status = 'Ahead of pace';
    statusColor = SEMANTIC.success.base;
    suggestion = `On track for ${predictedPercent}% of goal`;
  } else if (diff > -300) {
    status = 'Slightly behind';
    statusColor = SEMANTIC.warning.base;
    suggestion = `Drink ${mlPerHourNeeded}ml/hr to catch up`;
  } else {
    status = 'Behind pace';
    statusColor = SEMANTIC.danger.base;
    suggestion = `Need ${remainingMl}ml in ${remainingHours}h to hit goal`;
  }

  return {
    expectedMl,
    predictedTotal,
    predictedPercent,
    remainingMl,
    remainingHours,
    mlPerHourNeeded,
    status,
    statusColor,
    suggestion,
    percentDayPassed: Math.round(percentDayPassed * 100),
    isAfterWakeHours: minutesIntoDay >= wakeEnd,
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PersonalizedHydrationInsights({
  waterLogs = [],
  currentIntakeMl = 0,
  goalMl = 2000,
  onLogWater,
}) {
  // Patterns are disabled for now - just show time since last drink and pace prediction
  const hydrationPatterns = [];
  const patternsLoading = false;
  const hasEnoughData = false;
  const hydrationMoodPattern = null;

  // Calculate time since last drink from REAL logs
  const timeSinceLastDrink = useMemo(() =>
    calculateTimeSinceLastDrink(waterLogs),
    [waterLogs]
  );

  // Calculate pace prediction from REAL current intake
  const pacePrediction = useMemo(() =>
    calculatePacePrediction(currentIntakeMl, goalMl),
    [currentIntakeMl, goalMl]
  );

  // Don't render if no meaningful data
  const hasAnyInsight = timeSinceLastDrink.hasData ||
    pacePrediction.suggestion ||
    hydrationMoodPattern;

  if (!hasAnyInsight && !patternsLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Time Since Last Drink - REAL DATA */}
      {timeSinceLastDrink.hasData && (
        <TouchableOpacity
          style={styles.insightCard}
          onPress={() => {
            Haptics.selectionAsync();
            onLogWater?.();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.insightRow}>
            <View style={[
              styles.iconContainer,
              { backgroundColor: timeSinceLastDrink.isOverdue ? `${SEMANTIC.warning.base}15` : `${VIBRANT_WELLNESS.hydration.solid}15` }
            ]}>
              <Ionicons
                name="time-outline"
                size={20}
                color={timeSinceLastDrink.isOverdue ? SEMANTIC.warning.base : VIBRANT_WELLNESS.hydration.solid}
              />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightLabel}>Last drink</Text>
              <Text style={[
                styles.insightValue,
                timeSinceLastDrink.isOverdue && { color: SEMANTIC.warning.base }
              ]}>
                {timeSinceLastDrink.displayText}
              </Text>
            </View>
            {timeSinceLastDrink.isOverdue && (
              <View style={styles.nudgeBadge}>
                <Text style={styles.nudgeText}>Time for water?</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Pace Prediction - REAL DATA */}
      {pacePrediction.suggestion && !pacePrediction.isAfterWakeHours && (
        <View style={styles.insightCard}>
          <View style={styles.insightRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${pacePrediction.statusColor}15` }]}>
              <Ionicons
                name="trending-up"
                size={20}
                color={pacePrediction.statusColor}
              />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightLabel}>{pacePrediction.status}</Text>
              <Text style={styles.insightValue}>{pacePrediction.suggestion}</Text>
            </View>
          </View>

          {/* Mini progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressExpected,
                  { width: `${pacePrediction.percentDayPassed}%` }
                ]}
              />
              <View
                style={[
                  styles.progressActual,
                  {
                    width: `${Math.min(100, (currentIntakeMl / goalMl) * 100)}%`,
                    backgroundColor: pacePrediction.statusColor,
                  }
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelText}>
                {currentIntakeMl}ml / {goalMl}ml
              </Text>
              <Text style={styles.progressLabelText}>
                {pacePrediction.percentDayPassed}% of day
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Real Mood-Hydration Correlation - FROM CORRELATION ENGINE */}
      {hydrationMoodPattern && (
        <View style={[styles.insightCard, styles.patternCard]}>
          <View style={styles.insightRow}>
            <View style={[styles.iconContainer, { backgroundColor: `${BRAND.primary}15` }]}>
              <Ionicons name="analytics" size={20} color={BRAND.primary} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightLabel}>Your Pattern</Text>
              <Text style={styles.patternStatement}>
                {hydrationMoodPattern.statement || hydrationMoodPattern.ruleName}
              </Text>
            </View>
          </View>
          {hydrationMoodPattern.confidence && (
            <View style={styles.confidenceBadge}>
              <Ionicons name="checkmark-circle" size={12} color={SEMANTIC.success.base} />
              <Text style={styles.confidenceText}>
                {Math.round(hydrationMoodPattern.confidence * 100)}% confidence from your data
              </Text>
            </View>
          )}
        </View>
      )}

      {/* No patterns yet message */}
      {!patternsLoading && !hydrationMoodPattern && hasEnoughData === false && (
        <View style={styles.noPatternCard}>
          <Ionicons name="bulb-outline" size={18} color={TEXT.tertiary} />
          <Text style={styles.noPatternText}>
            Keep logging water and mood to discover your personal patterns
          </Text>
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
    gap: SPACING[3],
  },
  insightCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    ...SHADOWS.sm,
  },
  patternCard: {
    borderLeftWidth: 3,
    borderLeftColor: BRAND.primary,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.tertiary,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  patternStatement: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
    lineHeight: 20,
  },
  nudgeBadge: {
    backgroundColor: `${SEMANTIC.warning.base}15`,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.full,
  },
  nudgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: SEMANTIC.warning.base,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING[2],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  progressContainer: {
    marginTop: SPACING[3],
  },
  progressBackground: {
    height: 6,
    backgroundColor: SURFACES.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  progressExpected: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: SURFACES.divider,
    borderRadius: 3,
  },
  progressActual: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING[1],
  },
  progressLabelText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  noPatternCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    padding: SPACING[3],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
  },
  noPatternText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    lineHeight: 18,
  },
});
