import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, BRAND, SEMANTIC_ACTIONS, TYPOGRAPHY } from '../../constants/premiumTheme';

/**
 * ProgressBar
 *
 * Linear progress indicator showing progress toward a goal.
 * Supports standard and segmented variants.
 *
 * @param {Object} props
 * @param {number} props.current - Current value
 * @param {number} props.goal - Goal/target value
 * @param {string} [props.label] - Label text (optional)
 * @param {string} [props.unit] - Unit text (optional, e.g., "L", "kcal")
 * @param {boolean} [props.showPercent] - Show percentage (default: true)
 * @param {number} [props.height] - Bar height in pixels (default: 8)
 * @param {string} [props.variant] - 'linear' (default) or 'segmented'
 * @param {number} [props.segments] - Number of segments for segmented variant
 * @returns {JSX.Element}
 */
export function ProgressBar({
  current,
  goal,
  label,
  unit = '',
  showPercent = true,
  height = 8,
  variant = 'linear',
  segments = 4,
}) {
  const percent = useMemo(
    () => Math.min((current / goal) * 100, 100),
    [current, goal]
  );

  const renderLinear = () => (
    <View style={[styles.barContainer, { height }]}>
      <LinearGradient
        colors={SEMANTIC_ACTIONS.successGradient}  // Vibrant emerald to mint
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.filledBar,
          {
            width: `${percent}%`,
            height,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );

  const renderSegmented = () => {
    const segmentWidth = 100 / segments;
    const filledSegments = Math.ceil((percent / 100) * segments);

    return (
      <View style={[styles.segmentedContainer, { height }]}>
        {Array.from({ length: segments }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                width: `${segmentWidth}%`,
                height,
                marginRight: index < segments - 1 ? 4 : 0,
                backgroundColor: index < filledSegments ? SEMANTIC_ACTIONS.success : '#F0E8F8',
              },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}

      {variant === 'segmented' ? renderSegmented() : renderLinear()}

      {(showPercent || unit) && (
        <View style={styles.footer}>
          {showPercent && (
            <Text style={styles.percentLabel}>
              {Math.round(percent)}%
            </Text>
          )}
          {unit && (
            <Text style={styles.amountLabel}>
              {current.toFixed(1)}{unit} / {goal.toFixed(1)}{unit}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: 6,
  },
  barContainer: {
    backgroundColor: '#F0E8F8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  filledBar: {
    backgroundColor: SEMANTIC_ACTIONS.success,  // Fallback for non-gradient cases
  },
  segmentedContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  percentLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: SEMANTIC_ACTIONS.success,  // Vibrant green
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
  },
});
