import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { TEXT, BRAND, SURFACES, TYPOGRAPHY } from '../../constants/premiumTheme';

/**
 * PatternGauge
 *
 * Half-circle gauge showing pattern confidence (0-1).
 * Visual representation of how strong a pattern is.
 *
 * Color coding:
 * - 0.0-0.4: Red (#DC2626) - Weak
 * - 0.4-0.6: Amber (#F59E0B) - Moderate
 * - 0.6-0.8: Yellow (#FBBF24) - Strong
 * - 0.8-1.0: Green (#10B981) - Very Strong
 *
 * @param {Object} props
 * @param {number} props.confidence - Confidence value (0-1)
 * @param {string} [props.label] - Label below gauge (default: "Pattern strength")
 * @param {number} [props.size] - Gauge size (default: 120)
 * @returns {JSX.Element}
 */
export function PatternGauge({
  confidence,
  label = 'Pattern strength',
  size = 120,
}) {
  // Clamp confidence to 0-1
  const normalizedConfidence = Math.max(0, Math.min(1, confidence));

  // Determine color based on confidence
  const getColor = () => {
    if (normalizedConfidence < 0.4) return '#DC2626'; // Red
    if (normalizedConfidence < 0.6) return '#F59E0B'; // Amber
    if (normalizedConfidence < 0.8) return '#FBBF24'; // Yellow
    return BRAND.emerald; // Green (#10B981)
  };

  const color = getColor();
  const radius = size / 2 - 8;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference * (1 - normalizedConfidence);

  // Calculate needle rotation (0-180 degrees for half circle)
  const rotation = normalizedConfidence * 180;

  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size / 2 + 20 }}>
        <Svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
          {/* Background arc (light gray) */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={SURFACES.divider}
            strokeWidth={6}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={0}
          />

          {/* Filled arc (colored based on confidence) */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={color}
            strokeWidth={6}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />

          {/* Needle (line from center) */}
          <Path
            d={`M ${cx} ${cy} L ${cx + radius * Math.cos((rotation - 90) * (Math.PI / 180))} ${cy + radius * Math.sin((rotation - 90) * (Math.PI / 180))}`}
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Center circle */}
          <Circle cx={cx} cy={cy} r={6} fill={color} />
        </Svg>
      </View>

      {/* Center label */}
      <Text style={[styles.centerLabel, { color }]}>
        {Math.round(normalizedConfidence * 100)}%
      </Text>

      {/* Bottom label */}
      <Text style={styles.bottomLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    top: '30%',
  },
  bottomLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
    marginTop: 8,
  },
});
