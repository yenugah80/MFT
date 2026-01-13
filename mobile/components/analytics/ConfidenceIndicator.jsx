/**
 * Confidence Indicator Component
 *
 * Visual representation of how confident the analytics are about insights
 * Shows learning progress - confidence improves as user logs more data
 *
 * Design Principles:
 * - Progressive trust visualization
 * - Clear confidence levels
 * - Educational (teaches users about the system)
 * - Encourages consistent logging
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CircularProgress from './CircularProgress';
import { TEXT, BRAND, SURFACES, SEMANTIC } from '../../constants/premiumTheme';

/**
 * Confidence Badge
 *
 * Small inline badge showing confidence level
 */
export function ConfidenceBadge({ confidence, size = 'small', showLabel = true }) {
  const { color, icon, label } = getConfidenceDisplay(confidence);

  if (size === 'small') {
    return (
      <View style={[styles.badgeSmall, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={12} color={color} />
        {showLabel && (
          <Text style={[styles.badgeTextSmall, { color }]}>{label}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.badgeLarge, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={16} color={color} />
      {showLabel && (
        <Text style={[styles.badgeTextLarge, { color }]}>{label}</Text>
      )}
    </View>
  );
}

/**
 * Confidence Meter
 *
 * Full-width visual meter showing confidence level with explanation
 */
export function ConfidenceMeter({ confidence, dataPoints = 0, showExplanation = true }) {
  const { color, icon, label, description } = getConfidenceDisplay(confidence);

  return (
    <View style={styles.meterContainer}>
      <View style={styles.meterHeader}>
        <View style={styles.meterLabelContainer}>
          <Ionicons name={icon} size={20} color={color} />
          <Text style={styles.meterLabel}>Confidence: {label}</Text>
        </View>
        <Text style={styles.meterValue}>{Math.round(confidence * 100)}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={[color + '80', color]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarFill, { width: `${confidence * 100}%` }]}
          />
        </View>
      </View>

      {/* Markers */}
      <View style={styles.markers}>
        <Text style={[styles.marker, confidence >= 0.8 && styles.markerActive]}>Strong</Text>
        <Text style={[styles.marker, confidence >= 0.6 && confidence < 0.8 && styles.markerActive]}>Moderate</Text>
        <Text style={[styles.marker, confidence >= 0.4 && confidence < 0.6 && styles.markerActive]}>Early</Text>
        <Text style={[styles.marker, confidence < 0.4 && styles.markerActive]}>Exploring</Text>
      </View>

      {showExplanation && (
        <View style={styles.explanationContainer}>
          <Ionicons name="information-circle-outline" size={16} color={TEXT.tertiary} />
          <Text style={styles.explanationText}>
            {description}
            {dataPoints > 0 && ` (${dataPoints} data points)`}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Confidence Progress Circle
 *
 * Circular progress indicator for confidence level
 */
export function ConfidenceCircle({ confidence, size = 80, showLabel = true }) {
  const { color, label } = getConfidenceDisplay(confidence);

  return (
    <View style={styles.circleContainer}>
      <CircularProgress
        percentage={confidence * 100}
        size={size}
        strokeWidth={6}
        color={color}
        showPercentage={false}
      >
        <Text style={[styles.circleValue, { fontSize: size * 0.25 }]}>
          {Math.round(confidence * 100)}%
        </Text>
      </CircularProgress>
      {showLabel && (
        <Text style={styles.circleLabel}>{label}</Text>
      )}
    </View>
  );
}

/**
 * Learning Progress Card
 *
 * Shows how the system is learning from user data over time
 */
export function LearningProgressCard({ currentConfidence, dataPoints, daysTracking }) {
  const { color, icon, label, nextMilestone } = getConfidenceDisplay(currentConfidence);

  return (
    <LinearGradient
      colors={[BRAND.primary + '10', SURFACES.card]}
      style={styles.learningCard}
    >
      <View style={styles.learningHeader}>
        <View style={styles.learningIcon}>
          <Ionicons name="brain-outline" size={32} color={BRAND.primary} />
        </View>
        <View style={styles.learningInfo}>
          <Text style={styles.learningTitle}>System Learning Progress</Text>
          <Text style={styles.learningSubtitle}>
            Confidence improves as you log more data
          </Text>
        </View>
      </View>

      <View style={styles.learningStats}>
        <View style={styles.learningStat}>
          <Text style={styles.learningStatValue}>{daysTracking}</Text>
          <Text style={styles.learningStatLabel}>Days Tracking</Text>
        </View>
        <View style={styles.learningDivider} />
        <View style={styles.learningStat}>
          <Text style={styles.learningStatValue}>{dataPoints}</Text>
          <Text style={styles.learningStatLabel}>Data Points</Text>
        </View>
        <View style={styles.learningDivider} />
        <View style={styles.learningStat}>
          <Text style={[styles.learningStatValue, { color }]}>{label}</Text>
          <Text style={styles.learningStatLabel}>Confidence</Text>
        </View>
      </View>

      {currentConfidence < 0.9 && nextMilestone && (
        <View style={styles.nextMilestone}>
          <Ionicons name="flag-outline" size={16} color={BRAND.accent} />
          <Text style={styles.nextMilestoneText}>
            {nextMilestone}
          </Text>
        </View>
      )}

      <View style={styles.learningTip}>
        <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
        <Text style={styles.learningTipText}>
          Keep logging consistently to unlock more personalized insights
        </Text>
      </View>
    </LinearGradient>
  );
}

/**
 * Helper function to get confidence display properties
 */
function getConfidenceDisplay(confidence) {
  if (confidence >= 0.8) {
    return {
      color: SEMANTIC.success,
      icon: 'shield-checkmark',
      label: 'Strong',
      description: 'High confidence - backed by substantial personal data',
      nextMilestone: null,
    };
  } else if (confidence >= 0.6) {
    return {
      color: SEMANTIC.info,
      icon: 'shield-half',
      label: 'Moderate',
      description: 'Moderate confidence - pattern is emerging from your data',
      nextMilestone: 'Log 10 more days to reach Strong confidence',
    };
  } else if (confidence >= 0.4) {
    return {
      color: BRAND.accent,
      icon: 'shield-outline',
      label: 'Early',
      description: 'Early pattern detected - needs more data to confirm',
      nextMilestone: 'Log 15 more days to reach Moderate confidence',
    };
  } else {
    return {
      color: TEXT.tertiary,
      icon: 'help-circle-outline',
      label: 'Exploring',
      description: 'Exploring - system is learning your patterns',
      nextMilestone: 'Log 20 more days to see reliable patterns',
    };
  }
}

const styles = StyleSheet.create({
  // Badge Styles
  badgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTextSmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeTextLarge: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Meter Styles
  meterContainer: {
    backgroundColor: SURFACES.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meterLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  meterValue: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: TEXT.tertiary + '20',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  markers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  marker: {
    fontSize: 10,
    color: TEXT.tertiary,
    fontWeight: '500',
  },
  markerActive: {
    color: TEXT.primary,
    fontWeight: '700',
  },
  explanationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TEXT.tertiary + '20',
  },
  explanationText: {
    flex: 1,
    fontSize: 12,
    color: TEXT.secondary,
    lineHeight: 16,
  },

  // Circle Styles
  circleContainer: {
    alignItems: 'center',
    gap: 8,
  },
  circleValue: {
    fontWeight: '700',
    color: TEXT.primary,
  },
  circleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.secondary,
  },

  // Learning Card Styles
  learningCard: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  learningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  learningIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  learningInfo: {
    flex: 1,
  },
  learningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT.primary,
  },
  learningSubtitle: {
    fontSize: 12,
    color: TEXT.secondary,
    marginTop: 2,
  },
  learningStats: {
    flexDirection: 'row',
    backgroundColor: SURFACES.elevated,
    padding: 12,
    borderRadius: 12,
  },
  learningStat: {
    flex: 1,
    alignItems: 'center',
  },
  learningStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
  },
  learningStatLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  learningDivider: {
    width: 1,
    backgroundColor: TEXT.tertiary + '20',
  },
  nextMilestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND.accent + '15',
    padding: 12,
    borderRadius: 8,
  },
  nextMilestoneText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.accent,
  },
  learningTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  learningTipText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
});

export default {
  ConfidenceBadge,
  ConfidenceMeter,
  ConfidenceCircle,
  LearningProgressCard,
};
