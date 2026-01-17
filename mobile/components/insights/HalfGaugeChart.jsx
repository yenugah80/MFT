/**
 * HalfGaugeChart - Beautiful semicircular gauge visualization
 *
 * Design Principles:
 * - WCAG 2.1 AA compliant color contrast (4.5:1 minimum)
 * - Smooth gradient fills for visual appeal
 * - Animated progress with reduced-motion support
 * - Clear value labels with proper typography hierarchy
 *
 * Usage:
 *   <HalfGaugeChart
 *     value={75}
 *     maxValue={100}
 *     label="Daily Goal"
 *     unit="%"
 *     color={VIBRANT_WELLNESS.activity.solid}
 *     gradient={VIBRANT_WELLNESS.activity.gradient}
 *   />
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Text as SvgText } from 'react-native-svg';
import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  VIBRANT_WELLNESS,
  SEMANTIC,
  BRAND,
} from '../../constants/premiumTheme';

// Animated SVG components
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Calculate SVG arc path for gauge
 */
function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
  // Round to avoid floating-point precision issues in native SVG rendering
  return {
    x: Math.round((cx + radius * Math.cos(angleInRadians)) * 100) / 100,
    y: Math.round((cy + radius * Math.sin(angleInRadians)) * 100) / 100,
  };
}

/**
 * METER-STYLE GRADIENT COLORS
 * Shows the full red-yellow-green spectrum like a classic speedometer
 */
const METER_GRADIENT = {
  // Full meter gradient from left (0%) to right (100%)
  stops: [
    { offset: '0%', color: '#EF4444' },     // Red (danger zone)
    { offset: '30%', color: '#F59E0B' },    // Orange (warning)
    { offset: '50%', color: '#FBBF24' },    // Yellow (caution)
    { offset: '70%', color: '#84CC16' },    // Lime (good)
    { offset: '100%', color: '#10B981' },   // Green (excellent)
  ],
};

/**
 * Get semantic color based on percentage
 */
function getProgressColor(percentage, customColor) {
  if (customColor) return customColor;
  if (percentage >= 100) return SEMANTIC.success.base;
  if (percentage >= 70) return '#84CC16'; // Lime green
  if (percentage >= 50) return '#FBBF24'; // Yellow
  if (percentage >= 30) return '#F59E0B'; // Orange
  return '#EF4444'; // Red
}

/**
 * Get gradient based on percentage - returns meter-style by default
 */
function getProgressGradient(percentage, customGradient) {
  if (customGradient) return customGradient;
  // Default to meter-style gradient
  return ['#EF4444', '#F59E0B', '#FBBF24', '#84CC16', '#10B981'];
}

export default function HalfGaugeChart({
  value = 0,
  maxValue = 100,
  label = '',
  sublabel = '',
  unit = '',
  size = 140,
  strokeWidth = 14,
  color,
  gradient,
  showTicks = true,
  tickCount = 5,
  animated = true,
  centerContent,
  style,
  accessibilityLabel,
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = React.useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    );
    return () => subscription?.remove();
  }, []);

  // Animate progress
  useEffect(() => {
    if (animated && !reducedMotion) {
      Animated.spring(animatedValue, {
        toValue: value,
        tension: 40,
        friction: 12,
        useNativeDriver: false,
      }).start();
    } else {
      animatedValue.setValue(value);
    }
  }, [value, animated, reducedMotion]);

  // Calculate dimensions
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const percentage = Math.min((value / maxValue) * 100, 100);
  const progressAngle = (percentage / 100) * 180;

  // Get colors
  const progressColor = getProgressColor(percentage, color);
  const progressGradient = getProgressGradient(percentage, gradient);

  // Generate tick marks
  const ticks = useMemo(() => {
    if (!showTicks) return [];
    const tickArray = [];
    for (let i = 0; i <= tickCount; i++) {
      const angle = (i / tickCount) * 180;
      const tickValue = Math.round((i / tickCount) * maxValue);
      const pos = polarToCartesian(cx, cy, radius + strokeWidth / 2 + 12, angle);
      tickArray.push({ angle, value: tickValue, x: pos.x, y: pos.y });
    }
    return tickArray;
  }, [tickCount, maxValue, cx, cy, radius, strokeWidth, showTicks]);

  // Background arc (full semicircle)
  const bgPath = describeArc(cx, cy, radius, 0, 180);
  // Progress arc
  const progressPath = describeArc(cx, cy, radius, 0, progressAngle);

  // Gradient ID for unique identification
  const gradientId = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;

  // Accessibility
  const a11yLabel = accessibilityLabel || `${label}: ${value}${unit} of ${maxValue}${unit}, ${Math.round(percentage)}% complete`;

  // Ensure integer dimensions to avoid native rendering precision issues
  const viewHeight = Math.round(size / 2 + 40);
  const svgHeight = Math.round(size / 2 + strokeWidth);

  return (
    <View
      style={[styles.container, { width: size, height: viewHeight }, style]}
      accessible={true}
      accessibilityLabel={a11yLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: Math.round(maxValue),
        now: Math.round(value),
      }}
    >
      <Svg width={size} height={svgHeight} viewBox={`0 0 ${size} ${svgHeight}`}>
        <Defs>
          {/* Meter-style gradient: Red (left) -> Yellow (middle) -> Green (right) */}
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {METER_GRADIENT.stops.map((stop, i) => (
              <Stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </LinearGradient>
          {/* Background meter gradient (faded) */}
          <LinearGradient id={`${gradientId}-bg`} x1="0%" y1="0%" x2="100%" y2="0%">
            {METER_GRADIENT.stops.map((stop, i) => (
              <Stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={0.15} />
            ))}
          </LinearGradient>
        </Defs>

        {/* Background Track - shows faded meter gradient */}
        <Path
          d={bgPath}
          fill="none"
          stroke={`url(#${gradientId}-bg)`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress Arc with Gradient */}
        {progressAngle > 0 && (
          <Path
            d={progressPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* End Cap Glow Effect - color based on current progress */}
        {progressAngle > 0 && (
          <Circle
            cx={polarToCartesian(cx, cy, radius, progressAngle).x}
            cy={polarToCartesian(cx, cy, radius, progressAngle).y}
            r={strokeWidth / 2 + 3}
            fill={progressColor}
            opacity={0.4}
          />
        )}

        {/* Tick Labels */}
        {ticks.map((tick, index) => (
          <G key={index}>
            <SvgText
              x={tick.x}
              y={tick.y + 4}
              fontSize={10}
              fill={TEXT.tertiary}
              textAnchor="middle"
              fontWeight="500"
            >
              {tick.value}
            </SvgText>
          </G>
        ))}
      </Svg>

      {/* Center Content */}
      <View style={styles.centerContent}>
        {centerContent ? (
          centerContent
        ) : (
          <>
            <Text style={[styles.valueText, { color: progressColor }]}>
              {Math.round(value)}
              <Text style={styles.unitText}>{unit}</Text>
            </Text>
            {label && <Text style={styles.labelText}>{label}</Text>}
            {sublabel && <Text style={styles.sublabelText}>{sublabel}</Text>}
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Mini version for compact displays
 */
export function MiniHalfGauge({
  value = 0,
  maxValue = 100,
  size = 80,
  strokeWidth = 8,
  color,
  gradient,
  label,
  style,
  showActualValue = true, // Show actual percentage even if > 100%
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;

  // Calculate actual percentage (can be > 100%)
  const actualPercentage = (value / maxValue) * 100;
  // Cap visual progress at 100% for the arc
  const visualPercentage = Math.min(actualPercentage, 100);
  const progressAngle = (visualPercentage / 100) * 180;
  const isOver = actualPercentage > 100;

  // Use danger color if over 100%, otherwise calculate based on progress
  const progressColor = isOver ? SEMANTIC.danger.base : getProgressColor(actualPercentage, color);
  const progressGradient = isOver
    ? [SEMANTIC.danger.base, SEMANTIC.danger.dark || SEMANTIC.danger.base]
    : getProgressGradient(actualPercentage, gradient);
  const gradientId = `mini-gauge-${Math.random().toString(36).substr(2, 9)}`;

  const bgPath = describeArc(cx, cy, radius, 0, 180);
  const progressPath = describeArc(cx, cy, radius, 0, progressAngle);

  // Ensure integer dimensions to avoid native rendering precision issues
  const viewHeight = Math.round(size / 2 + 20);
  const svgHeight = Math.round(size / 2 + strokeWidth);

  // Display value: show actual percentage (e.g., 254%) if showActualValue is true
  const displayValue = showActualValue ? Math.round(actualPercentage) : Math.round(visualPercentage);

  return (
    <View style={[styles.miniContainer, { width: size, height: viewHeight }, style]}>
      <Svg width={size} height={svgHeight} viewBox={`0 0 ${size} ${svgHeight}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={progressGradient[0]} />
            <Stop offset="100%" stopColor={progressGradient[1] || progressGradient[0]} />
          </LinearGradient>
        </Defs>
        <Path
          d={bgPath}
          fill="none"
          stroke={SURFACES.background.tertiary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {progressAngle > 0 && (
          <Path
            d={progressPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={styles.miniCenter}>
        <Text style={[styles.miniValue, { color: progressColor }]}>
          {displayValue}%
        </Text>
        {label && <Text style={styles.miniLabel}>{label}</Text>}
      </View>
    </View>
  );
}

/**
 * Multi-metric gauge with comparison
 */
export function ComparisonGauge({
  metrics = [],
  size = 200,
  strokeWidth = 12,
  style,
}) {
  const cx = size / 2;
  const cy = size / 2;
  const baseRadius = (size - strokeWidth * metrics.length * 2) / 2;

  // Ensure integer dimensions to avoid native rendering precision issues
  const viewHeight = Math.round(size / 2 + 40);
  const svgHeight = Math.round(size / 2 + strokeWidth * metrics.length);

  return (
    <View style={[styles.comparisonContainer, { width: size, height: viewHeight }, style]}>
      <Svg width={size} height={svgHeight} viewBox={`0 0 ${size} ${svgHeight}`}>
        {metrics.map((metric, index) => {
          const radius = baseRadius + index * (strokeWidth + 4);
          const percentage = Math.min((metric.value / metric.maxValue) * 100, 100);
          const progressAngle = (percentage / 100) * 180;
          const gradientId = `comparison-${index}-${Math.random().toString(36).substr(2, 9)}`;

          const bgPath = describeArc(cx, cy, radius, 0, 180);
          const progressPath = describeArc(cx, cy, radius, 0, progressAngle);
          const gradient = metric.gradient || getProgressGradient(percentage);

          return (
            <G key={index}>
              <Defs>
                <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={gradient[0]} />
                  <Stop offset="100%" stopColor={gradient[1] || gradient[0]} />
                </LinearGradient>
              </Defs>
              <Path
                d={bgPath}
                fill="none"
                stroke={SURFACES.background.tertiary}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={0.5}
              />
              {progressAngle > 0 && (
                <Path
                  d={progressPath}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              )}
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.comparisonLegend}>
        {metrics.map((metric, index) => (
          <View key={index} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: metric.gradient?.[0] || getProgressColor((metric.value / metric.maxValue) * 100) },
              ]}
            />
            <Text style={styles.legendLabel}>{metric.label}</Text>
            <Text style={styles.legendValue}>
              {Math.round((metric.value / metric.maxValue) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerContent: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  valueText: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  labelText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginTop: 2,
  },
  sublabelText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },

  // Mini gauge styles
  miniContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  miniCenter: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  miniValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  miniLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },

  // Comparison gauge styles
  comparisonContainer: {
    alignItems: 'center',
  },
  comparisonLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: SPACING[3],
    gap: SPACING[4],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  legendValue: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.primary,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});
