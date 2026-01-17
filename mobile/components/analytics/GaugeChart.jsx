/**
 * Gauge Chart Component
 *
 * Research note: Traditional speedometer gauges can be hard to read (UX research)
 * This implementation uses a SEMI-CIRCLE gauge with clear zones and readable labels
 *
 * Based on 2025 health app best practices:
 * - Clear, readable zones (Poor/Fair/Good/Excellent)
 * - Color-coded for quick understanding
 * - Not a full speedometer (confusing), but semi-circle
 * - Used for scores: Wellness score, Food-Mood score, etc.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import { TEXT, SEMANTIC } from '../../constants/premiumTheme';

/**
 * GaugeChart - Semi-circular gauge for score visualization
 *
 * @param {number} value - Current value (0-100)
 * @param {number} size - Diameter in pixels (default 160)
 * @param {Array} zones - Custom zones [{min, max, color, label}]
 * @param {string} label - Label below gauge
 * @param {string} unit - Unit text (default '')
 */
export default function GaugeChart({
  value = 0,
  size = 160,
  zones = null,
  label = '',
  unit = '',
}) {
  const clampedValue = Math.min(Math.max(value, 0), 100);

  // Default zones: Poor (0-25), Fair (25-50), Good (50-75), Excellent (75-100)
  const defaultZones = [
    { min: 0, max: 25, color: SEMANTIC.danger, label: 'Poor' },
    { min: 25, max: 50, color: SEMANTIC.warning, label: 'Fair' },
    { min: 50, max: 75, color: SEMANTIC.info, label: 'Good' },
    { min: 75, max: 100, color: SEMANTIC.success, label: 'Excellent' },
  ];

  const zoneConfig = zones || defaultZones;

  // Find current zone
  const currentZone = zoneConfig.find(z => clampedValue >= z.min && clampedValue < z.max) ||
    zoneConfig[zoneConfig.length - 1];

  const radius = (size * 0.8) / 2;
  const centerX = size / 2;
  const centerY = size * 0.75;
  const strokeWidth = 20;

  // Calculate needle angle (180 degrees = semi-circle, 0 at left, 180 at right)
  const needleAngle = (clampedValue / 100) * 180 - 90; // -90 to 90 degrees

  // Generate arc path for each zone
  const generateArc = (startAngle, endAngle, color) => {
    const start = polarToCartesian(centerX, centerY, radius, startAngle);
    const end = polarToCartesian(centerX, centerY, radius, endAngle);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return {
      path: `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      color,
    };
  };

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const angleRad = (angleDeg - 90) * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  };

  // Generate zone arcs
  const zoneArcs = zoneConfig.map(zone => {
    const startAngle = (zone.min / 100) * 180;
    const endAngle = (zone.max / 100) * 180;
    return generateArc(startAngle, endAngle, zone.color);
  });

  // Needle position
  const needleEnd = polarToCartesian(centerX, centerY, radius - strokeWidth / 2, needleAngle + 90);

  return (
    <View style={[styles.container, { width: size, height: size * 0.75 }]}>
      <Svg width={size} height={size * 0.75}>
        {/* Zone arcs */}
        {zoneArcs.map((arc, index) => (
          <Path
            key={index}
            d={arc.path}
            stroke={arc.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        ))}

        {/* Needle */}
        <G>
          <Circle
            cx={centerX}
            cy={centerY}
            r={8}
            fill={currentZone.color}
          />
          <Path
            d={`M ${centerX} ${centerY} L ${needleEnd.x} ${needleEnd.y}`}
            stroke={currentZone.color}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Value and label */}
      <View style={styles.labelContainer}>
        <Text style={[styles.valueText, { color: currentZone.color }]}>
          {Math.round(clampedValue)}{unit}
        </Text>
        <Text style={styles.zoneLabel}>{currentZone.label}</Text>
        {label ? <Text style={styles.chartLabel}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    marginTop: -40,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 32,
    fontWeight: '700',
  },
  zoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.secondary,
    marginTop: 4,
  },
  chartLabel: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
});
