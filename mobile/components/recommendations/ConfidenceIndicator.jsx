/**
 * ConfidenceIndicator - Visual confidence badge for recommendations
 * Shows confidence % with visual ring indicator + data point count
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/designSystem';

export default function ConfidenceIndicator({
  confidence = 0.78,  // 0-1
  dataPoints = 45,
  metricColor = COLORS.nutrition.primary,  // Color of the ring
  size = 80,
  strokeWidth = 6,
}) {
  const percentage = Math.round(confidence * 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 1) * circumference;

  // Determine confidence text color based on level
  const getConfidenceColor = () => {
    if (confidence >= 0.75) return COLORS.insights.primary;      // High confidence - indigo
    if (confidence >= 0.5) return COLORS.insights.warning;       // Medium confidence - light indigo
    return COLORS.insights.danger;                                // Low confidence - lighter indigo
  };

  return (
    <View style={styles.container}>
      <View style={styles.ringContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgGradient
              id="confidenceGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={metricColor} />
              <Stop offset="100%" stopColor={metricColor} stopOpacity="0.6" />
            </SvgGradient>
          </Defs>

          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={COLORS.border.light}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#confidenceGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* Center text */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.centerContent}>
            <Text
              style={[
                styles.percentage,
                { color: getConfidenceColor() },
              ]}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
            >
              {percentage}%
            </Text>
            <Text
              style={styles.label}
              allowFontScaling={true}
              maxFontSizeMultiplier={1.1}
            >
              Confident
            </Text>
          </View>
        </View>
      </View>

      {/* Data point count below */}
      <View style={styles.dataPointContainer}>
        <Text
          style={styles.dataPointLabel}
          allowFontScaling={true}
          maxFontSizeMultiplier={1.1}
        >
          Based on {dataPoints} data point{dataPoints !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: TYPOGRAPHY.size.title1,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.insights.primary,
  },
  label: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  dataPointContainer: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  dataPointLabel: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.weight.regular,
  },
});
