/**
 * ImpactEffortRings - Side-by-side rings showing impact and effort scores
 * Used in Food Recommendation screen to show score matrix
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/designSystem';

function SingleRing({
  score = 0.85,  // 0-1
  label = 'Impact',
  icon = '🎯',
  color = COLORS.insights.primary,
  size = 70,
  strokeWidth = 5,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 1) * circumference;

  const percentage = Math.round(score * 100);

  return (
    <View style={styles.ringWrapper}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgGradient
            id={`gradient-${label}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={color} />
            <Stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </SvgGradient>
        </Defs>

        {/* Background */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={COLORS.border.light}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#gradient-${label})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.ringCenter}>
          <Text style={styles.ringIcon}>{icon}</Text>
          <Text
            style={styles.ringPercentage}
            allowFontScaling={true}
            maxFontSizeMultiplier={1.2}
          >
            {percentage}%
          </Text>
        </View>
      </View>

      {/* Label below */}
      <Text
        style={styles.ringLabel}
        allowFontScaling={true}
        maxFontSizeMultiplier={1.1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function ImpactEffortRings({
  impact = 0.85,
  effort = 0.90,
  impactColor = COLORS.insights.primary,      // High impact color
  effortColor = COLORS.insights.warning,      // Easy effort color
  layout = 'side-by-side',  // 'side-by-side' or 'stacked'
}) {
  const containerStyle = layout === 'side-by-side'
    ? styles.containerHorizontal
    : styles.containerVertical;

  return (
    <View style={containerStyle}>
      <SingleRing
        score={impact}
        label="High Impact"
        icon="🎯"
        color={impactColor}
        size={70}
        strokeWidth={5}
      />

      <SingleRing
        score={effort}
        label="Easy to Do"
        icon="✓"
        color={effortColor}
        size={70}
        strokeWidth={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  containerHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  containerVertical: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringIcon: {
    fontSize: TYPOGRAPHY.size.title1,
    marginBottom: SPACING.xs,
  },
  ringPercentage: {
    fontSize: TYPOGRAPHY.size.headline,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.insights.primary,
  },
  ringLabel: {
    fontSize: TYPOGRAPHY.size.footnote,
    color: COLORS.text.tertiary,
    marginTop: SPACING.md,
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.family.medium,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
