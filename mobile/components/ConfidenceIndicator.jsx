/**
 * ConfidenceIndicator - Honest Uncertainty Display
 *
 * Addresses the fundamental problem of false precision in nutrition apps.
 * Shows users that estimates have uncertainty, not exact values.
 *
 * Design Principles:
 * - Honesty over precision: Show ranges, not false exact numbers
 * - Non-judgmental: Uncertainty is normal, not a failure
 * - Informative: Help users understand why estimates vary
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TEXT, TYPOGRAPHY, SPACING, RADIUS } from '../constants/premiumTheme';
import { CONFIDENCE_COLORS, UNCERTAINTY_FACTORS } from '../constants/modernColorPalette';

/**
 * Get confidence level from uncertainty factor or explicit level
 */
const getConfidenceLevel = (source, confidenceScore) => {
  // If explicit confidence score provided (0-1)
  if (typeof confidenceScore === 'number') {
    if (confidenceScore >= 0.9) return 'high';
    if (confidenceScore >= 0.75) return 'good';
    if (confidenceScore >= 0.6) return 'medium';
    if (confidenceScore >= 0.4) return 'low';
    return 'veryLow';
  }

  // Otherwise derive from source type
  const factor = UNCERTAINTY_FACTORS[source] || UNCERTAINTY_FACTORS.userEstimate;
  if (factor <= 0.05) return 'high';
  if (factor <= 0.10) return 'good';
  if (factor <= 0.20) return 'medium';
  if (factor <= 0.30) return 'low';
  return 'veryLow';
};

/**
 * Calculate uncertainty range from value and source
 */
export const calculateUncertaintyRange = (value, source, confidenceScore) => {
  if (!value || typeof value !== 'number') return { min: 0, max: 0, factor: 0 };

  let factor;
  if (typeof confidenceScore === 'number') {
    // Convert confidence to uncertainty factor (inverse relationship)
    factor = Math.max(0.05, (1 - confidenceScore) * 0.4);
  } else {
    factor = UNCERTAINTY_FACTORS[source] || UNCERTAINTY_FACTORS.userEstimate;
  }

  const min = Math.round(value * (1 - factor));
  const max = Math.round(value * (1 + factor));

  return { min, max, factor };
};

/**
 * Format value with uncertainty prefix
 */
export const formatWithUncertainty = (value, source, options = {}) => {
  const { showTilde = true, decimals = 0 } = options;
  const level = getConfidenceLevel(source);
  const prefix = showTilde && level !== 'high' ? '~' : '';

  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';

  return `${prefix}${value.toFixed(decimals)}`;
};

/**
 * Confidence Dot - Minimal visual indicator
 */
export function ConfidenceDot({ source, confidenceScore, size = 8 }) {
  const level = getConfidenceLevel(source, confidenceScore);
  const colors = CONFIDENCE_COLORS[level];

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.color,
        },
      ]}
    />
  );
}

/**
 * Confidence Badge - Compact label with color
 */
export function ConfidenceBadge({ source, confidenceScore, showLabel = false }) {
  const level = getConfidenceLevel(source, confidenceScore);
  const colors = CONFIDENCE_COLORS[level];

  const getShortLabel = () => {
    switch (level) {
      case 'high': return 'High';
      case 'good': return 'Good';
      case 'medium': return 'Est.';
      case 'low': return 'Low';
      case 'veryLow': return '?';
      default: return '';
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.badgeDot,
          { backgroundColor: colors.color },
        ]}
      />
      {showLabel && (
        <Text style={[styles.badgeText, { color: colors.color }]}>
          {getShortLabel()}
        </Text>
      )}
    </View>
  );
}

/**
 * Confidence Range - Shows value with uncertainty range
 */
export function ConfidenceRange({
  value,
  unit = '',
  source,
  confidenceScore,
  showRange = true,
  onPress,
}) {
  const level = getConfidenceLevel(source, confidenceScore);
  const colors = CONFIDENCE_COLORS[level];
  const { min, max } = calculateUncertaintyRange(value, source, confidenceScore);

  const prefix = level !== 'high' ? '~' : '';

  const content = (
    <View style={styles.rangeContainer}>
      <View style={styles.rangeMain}>
        <Text style={styles.rangeValue}>
          {prefix}{Math.round(value)}
        </Text>
        <Text style={styles.rangeUnit}>{unit}</Text>
        <ConfidenceDot source={source} confidenceScore={confidenceScore} />
      </View>
      {showRange && level !== 'high' && (
        <Text style={[styles.rangeText, { color: colors.color }]}>
          Range: {min}-{max} {unit}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

/**
 * Confidence Info Card - Detailed explanation (for modals/expanded views)
 */
export function ConfidenceInfoCard({ source, confidenceScore, onClose }) {
  const level = getConfidenceLevel(source, confidenceScore);
  const colors = CONFIDENCE_COLORS[level];
  const factor = UNCERTAINTY_FACTORS[source] || 0.25;

  const getSourceLabel = () => {
    switch (source) {
      case 'barcode': return 'Barcode Scan';
      case 'database': return 'Database Match';
      case 'aiText': return 'AI Text Analysis';
      case 'aiPhoto': return 'Photo Analysis';
      case 'mixedDish': return 'Mixed Dish Estimate';
      case 'userEstimate': return 'User Estimate';
      default: return 'Estimate';
    }
  };

  const getExplanation = () => {
    switch (level) {
      case 'high':
        return 'This value comes from verified sources with minimal uncertainty.';
      case 'good':
        return 'This is a reliable estimate based on database matching.';
      case 'medium':
        return 'This estimate has moderate uncertainty. Actual values may vary by ~20%.';
      case 'low':
        return 'Portion sizes are difficult to estimate. Values could vary by ~30%.';
      case 'veryLow':
        return 'Mixed dishes and hidden ingredients make this estimate uncertain. Consider adjusting if needed.';
      default:
        return 'This is an estimate based on available data.';
    }
  };

  return (
    <View style={[styles.infoCard, { borderColor: colors.color }]}>
      <View style={styles.infoHeader}>
        <View style={styles.infoTitleRow}>
          <Ionicons name="information-circle" size={20} color={colors.color} />
          <Text style={styles.infoTitle}>About This Estimate</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color={TEXT.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.infoRow, { backgroundColor: colors.bg }]}>
        <Text style={styles.infoLabel}>Source</Text>
        <Text style={[styles.infoValue, { color: colors.color }]}>{getSourceLabel()}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Confidence</Text>
        <View style={styles.infoValueRow}>
          <ConfidenceDot source={source} confidenceScore={confidenceScore} size={10} />
          <Text style={[styles.infoValue, { color: colors.color }]}>{colors.label}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Uncertainty</Text>
        <Text style={styles.infoValue}>±{Math.round(factor * 100)}%</Text>
      </View>

      <Text style={styles.infoExplanation}>{getExplanation()}</Text>

      <View style={styles.infoFooter}>
        <Ionicons name="bulb-outline" size={14} color={TEXT.muted} />
        <Text style={styles.infoFooterText}>
          Estimates improve with more specific inputs and barcode scans.
        </Text>
      </View>
    </View>
  );
}

/**
 * Main ConfidenceIndicator Component
 *
 * Modes:
 * - 'dot': Just a colored dot
 * - 'badge': Dot with optional label
 * - 'range': Value with uncertainty range
 * - 'full': Complete card with explanation
 */
export default function ConfidenceIndicator({
  mode = 'badge',
  value,
  unit,
  source,
  confidenceScore,
  showLabel,
  showRange,
  onPress,
  onClose,
  size,
}) {
  switch (mode) {
    case 'dot':
      return <ConfidenceDot source={source} confidenceScore={confidenceScore} size={size} />;
    case 'badge':
      return <ConfidenceBadge source={source} confidenceScore={confidenceScore} showLabel={showLabel} />;
    case 'range':
      return (
        <ConfidenceRange
          value={value}
          unit={unit}
          source={source}
          confidenceScore={confidenceScore}
          showRange={showRange}
          onPress={onPress}
        />
      );
    case 'full':
      return <ConfidenceInfoCard source={source} confidenceScore={confidenceScore} onClose={onClose} />;
    default:
      return <ConfidenceBadge source={source} confidenceScore={confidenceScore} />;
  }
}

const styles = StyleSheet.create({
  // Dot
  dot: {
    marginLeft: SPACING[1],
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    gap: SPACING[1],
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },

  // Range
  rangeContainer: {
    alignItems: 'flex-start',
  },
  rangeMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  rangeValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  rangeUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  rangeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    marginTop: SPACING[1],
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    borderWidth: 1,
    gap: SPACING[3],
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.md,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  infoExplanation: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: TYPOGRAPHY.size.sm * 1.5,
  },
  infoFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoFooterText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    lineHeight: TYPOGRAPHY.size.xs * 1.5,
  },
});
