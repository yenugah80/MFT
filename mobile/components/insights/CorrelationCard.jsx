/**
 * CorrelationCard - Behavioral Pattern Discovery Display
 *
 * Shows discovered correlations between behaviors and outcomes.
 * Examples:
 * - "When you eat breakfast before 8am → 23% more water logged"
 * - "High-sugar lunches → 67% of afternoon tiredness"
 *
 * Design: Story-first with visual evidence
 */

import React from 'react';
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
  PREMIUM_COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../../constants/premiumDesignSystem';

// ============================================================================
// CORRELATION TYPES
// ============================================================================

const CORRELATION_TYPES = {
  positive: {
    icon: 'trending-up',
    color: PREMIUM_COLORS.semantic.success.primary,
    bgColor: '#D1FAE5',
    arrow: '→',
  },
  negative: {
    icon: 'trending-down',
    color: PREMIUM_COLORS.semantic.error.primary,
    bgColor: '#FEE2E2',
    arrow: '→',
  },
  neutral: {
    icon: 'remove',
    color: PREMIUM_COLORS.text.tertiary,
    bgColor: PREMIUM_COLORS.surface.secondary,
    arrow: '↔',
  },
};

// ============================================================================
// STRENGTH INDICATOR
// ============================================================================

function StrengthIndicator({ strength }) {
  // strength is 0-100
  const bars = 5;
  const filledBars = Math.round((strength / 100) * bars);

  return (
    <View style={styles.strengthContainer}>
      <Text style={styles.strengthLabel}>Correlation strength</Text>
      <View style={styles.strengthBars}>
        {Array(bars).fill(0).map((_, i) => (
          <View
            key={i}
            style={[
              styles.strengthBar,
              {
                backgroundColor: i < filledBars
                  ? PREMIUM_COLORS.brand.primary
                  : PREMIUM_COLORS.border.light,
              },
            ]}
          />
        ))}
        <Text style={styles.strengthValue}>{strength}%</Text>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CorrelationCard({
  // The behavior/trigger
  factor,
  // The outcome/result
  outcome,
  // Correlation type: 'positive' | 'negative' | 'neutral'
  type = 'positive',
  // Correlation percentage (0-100)
  correlation,
  // Number of data points
  dataPoints,
  // Confidence score (0-100)
  confidence,
  // Number of instances observed
  instances,
  // Optional detailed explanation
  explanation,
  // Optional action suggestion
  suggestion,
  // Callbacks
  onPress,
  onDismiss,
  style,
}) {
  const config = CORRELATION_TYPES[type] || CORRELATION_TYPES.positive;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      {/* Pattern Discovery Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.discoveryBadge, { backgroundColor: config.bgColor }]}>
            <Ionicons name="link" size={12} color={config.color} />
            <Text style={[styles.discoveryText, { color: config.color }]}>
              Pattern discovered
            </Text>
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

      {/* Main correlation statement */}
      <View style={styles.correlationStatement}>
        {/* Factor (trigger) */}
        <View style={styles.factorContainer}>
          <Text style={styles.whenText}>When you</Text>
          <Text style={styles.factorText}>{factor}</Text>
        </View>

        {/* Arrow indicator */}
        <View style={[styles.arrowContainer, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>

        {/* Outcome */}
        <View style={styles.outcomeContainer}>
          <Text style={styles.thenText}>Then</Text>
          <Text style={[styles.outcomeText, { color: config.color }]}>
            {correlation}% {outcome}
          </Text>
        </View>
      </View>

      {/* Evidence section */}
      <View style={styles.evidenceContainer}>
        <View style={styles.evidenceRow}>
          <View style={styles.evidenceStat}>
            <Ionicons name="calendar-outline" size={14} color={PREMIUM_COLORS.text.tertiary} />
            <Text style={styles.evidenceLabel}>{dataPoints} days analyzed</Text>
          </View>
          <View style={styles.evidenceStat}>
            <Ionicons name="checkbox-outline" size={14} color={PREMIUM_COLORS.text.tertiary} />
            <Text style={styles.evidenceLabel}>{instances} instances</Text>
          </View>
        </View>
        <StrengthIndicator strength={confidence || correlation} />
      </View>

      {/* Explanation (if provided) */}
      {explanation && (
        <View style={styles.explanationContainer}>
          <Ionicons name="information-circle-outline" size={16} color={PREMIUM_COLORS.text.tertiary} />
          <Text style={styles.explanationText}>{explanation}</Text>
        </View>
      )}

      {/* Suggestion (if provided) */}
      {suggestion && (
        <View style={styles.suggestionContainer}>
          <LinearGradient
            colors={[`${config.color}10`, `${config.color}05`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.suggestionGradient}
          >
            <View style={styles.suggestionContent}>
              <Ionicons name="bulb" size={18} color={config.color} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={config.color} />
          </LinearGradient>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

export function CorrelationCardCompact({
  factor,
  outcome,
  type = 'positive',
  correlation,
  onPress,
  style,
}) {
  const config = CORRELATION_TYPES[type] || CORRELATION_TYPES.positive;

  return (
    <TouchableOpacity
      style={[styles.compactContainer, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.compactIcon, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
      </View>
      <View style={styles.compactContent}>
        <Text style={styles.compactFactor} numberOfLines={1}>{factor}</Text>
        <Text style={[styles.compactOutcome, { color: config.color }]} numberOfLines={1}>
          {config.arrow} {correlation}% {outcome}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={PREMIUM_COLORS.text.muted} />
    </TouchableOpacity>
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
    ...SHADOWS.sm,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.sm,
  },
  discoveryText: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  dismissButton: {
    padding: SPACING[1],
  },

  // Correlation statement
  correlationStatement: {
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  factorContainer: {
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  whenText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[1],
  },
  factorText: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
    textAlign: 'center',
  },
  arrowContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING[2],
  },
  outcomeContainer: {
    alignItems: 'center',
    marginTop: SPACING[3],
  },
  thenText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[1],
  },
  outcomeText: {
    fontSize: TYPOGRAPHY.size.title3,
    fontWeight: TYPOGRAPHY.weight.bold,
    textAlign: 'center',
  },

  // Evidence
  evidenceContainer: {
    padding: SPACING[3],
    backgroundColor: PREMIUM_COLORS.surface.secondary,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[3],
  },
  evidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING[3],
  },
  evidenceStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  evidenceLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Strength indicator
  strengthContainer: {
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.muted,
    marginBottom: SPACING[1],
  },
  strengthBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  strengthBar: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  strengthValue: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.brand.primary,
    marginLeft: SPACING[2],
  },

  // Explanation
  explanationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  explanationText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.footnote * 1.4,
  },

  // Suggestion
  suggestionContainer: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  suggestionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[3],
  },
  suggestionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
  },
  suggestionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.footnote * 1.4,
  },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PREMIUM_COLORS.surface.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.border.light,
    gap: SPACING[3],
  },
  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactFactor: {
    fontSize: TYPOGRAPHY.size.subhead,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: 2,
  },
  compactOutcome: {
    fontSize: TYPOGRAPHY.size.footnote,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});
