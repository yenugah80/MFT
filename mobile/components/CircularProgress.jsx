import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { SEMANTIC_ACTIONS, TEXT, SURFACES, TYPOGRAPHY, getMutedToVibrantSolid } from '../constants/premiumTheme';

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

const CircularProgress = ({
  value,
  maxValue,                 // REQUIRED
  size = 120,
  strokeWidth = 10,
  color = SEMANTIC_ACTIONS.primary,  // Vibrant orange
  backgroundColor = `${SEMANTIC_ACTIONS.primary}20`,  // Vibrant with transparency
  label,
  unit,
  showPercent = true,
}) => {
  // ---- Defensive guards ----
  const safeValue = Number.isFinite(value) ? value : 0;
  const safeMax = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : null;

  // ---- Geometry (always calculate to avoid hook order issues) ----
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // ---- Math ----
  const ratio = safeMax ? safeValue / safeMax : 0;
  const visualRatio = clamp(ratio, 0, 1);
  const strokeDashoffset =
    circumference - visualRatio * circumference;

  // ---- Text formatting (hook must be called before any conditional returns) ----
  const percentText = useMemo(() => {
    if (!showPercent) return null;
    if (ratio >= 2) return '200%+';
    return `${Math.round(ratio * 100)}%`;
  }, [ratio, showPercent]);

  // If goal is missing, render a neutral placeholder
  if (!safeMax) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={styles.noGoalText}>No goal set</Text>
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    );
  }

  // ---- Color feedback (optional) ----
  const progressColor =
    ratio > 1 ? '#e55c21ff' : color;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={styles.value}>
          {Math.round(safeValue)}
          {unit && <Text style={styles.unit}>{unit}</Text>}
        </Text>

        {percentText && (
          <Text style={styles.percent}>{percentText}</Text>
        )}
      </View>

      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  unit: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.secondary,
  },
  percent: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.secondary,
    marginTop: 2,
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  noGoalText: {
    fontSize: 14,
    color: TEXT.tertiary,
    fontFamily: TYPOGRAPHY.family.medium,
  },
});

export default CircularProgress;
