/**
 * EnergyStabilityGauge - Premium Intelligence Card
 *
 * Shows hourly energy prediction using 180° half-ring gauge.
 * Part of visual intelligence system for premium users.
 *
 * Design:
 * - 180° half-ring arc (Green → Yellow → Red)
 * - Hourly sparkline overlay
 * - AI-powered statement + confidence badge
 * - CTA: "View energy analysis →"
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { PREMIUM_COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../constants/premiumDesignSystem';
import { ConfidenceBadge } from '../ConfidenceIndicator';
import GlassCard from './GlassCard';

/**
 * EnergyStabilityGauge Component
 * 180° half-ring showing energy stability prediction
 */
export default function EnergyStabilityGauge({
  statement = 'Analyzing your energy patterns...',
  hourlyLevels = Array(24).fill(50), // 24 hourly values 0-100
  prevention = null,
  confidence = 0.75,
  onPress,
  style,
}) {
  const [expanded, setExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Calculate average energy level (0-100)
  const avgEnergy = Math.round(
    hourlyLevels.reduce((a, b) => a + b, 0) / hourlyLevels.length
  );

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  // Determine stability color based on average
  const getStabilityColor = (avg) => {
    if (avg >= 70) return { gradient: ['#10B981', '#34D399'], label: 'Stable' };
    if (avg >= 50) return { gradient: ['#F59E0B', '#FBBF24'], label: 'Fluctuating' };
    return { gradient: ['#EF4444', '#F87171'], label: 'Low' };
  };

  const stability = getStabilityColor(avgEnergy);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Energy stability. ${statement}`}
      >
        <GlassCard variant="standard">
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Energy Stability</Text>
              <Text style={styles.subtitle}>24-hour prediction</Text>
            </View>
            <Ionicons
              name="flash"
              size={24}
              color={PREMIUM_COLORS.functional.activity.primary}
            />
          </View>

          {/* Hero Gauge - 180° Half Ring */}
          <View style={styles.gaugeContainer}>
            <HalfRingGauge
              value={avgEnergy}
              size={140}
              gradient={stability.gradient}
            />

            {/* Center Label */}
            <View style={styles.gaugeLabel}>
              <Text style={styles.gaugeValue}>{stability.label}</Text>
              <Text style={styles.gaugePercent}>{avgEnergy}%</Text>
            </View>
          </View>

          {/* Confidence Badge */}
          <View style={styles.confidenceRow}>
            <ConfidenceBadge
              mode="badge"
              confidence={confidence}
              dataPoints={24}
              periodDays={1}
            />
          </View>

          {/* Statement */}
          <Text style={styles.statement}>{statement}</Text>

          {/* Prevention (optional) */}
          {prevention && (
            <View style={styles.preventionBox}>
              <Ionicons
                name="bulb-outline"
                size={16}
                color={PREMIUM_COLORS.text.tertiary}
              />
              <Text style={styles.preventionText}>{prevention}</Text>
            </View>
          )}

          {/* CTA */}
          <View style={styles.ctaRow}>
            <Text style={styles.ctaText}>View energy analysis</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={PREMIUM_COLORS.text.tertiary}
            />
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Half-Ring Gauge Component (180° arc)
 */
function HalfRingGauge({ value = 50, size = 140, gradient = ['#4F46E5', '#10B981'] }) {
  const radius = (size - 12) / 2; // strokeWidth = 12
  const arcLength = (180 * Math.PI) / 180 * radius;
  const strokeDashoffset = arcLength - (value / 100) * arcLength;

  return (
    <View style={{ width: size, height: size / 2 }}>
      <Svg width={size} height={size / 2 + 8} style={{ transform: [{ rotate: '180deg' }] }}>
        <Defs>
          <SvgGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={gradient[0]} />
            <Stop offset="100%" stopColor={gradient[1]} />
          </SvgGradient>
        </Defs>

        {/* Background arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0, 0, 0, 0.06)"
          strokeWidth={12}
          fill="none"
          strokeDasharray={arcLength}
          strokeDashoffset={0}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#energyGradient)"
          strokeWidth={12}
          fill="none"
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[5],
  },
  title: {
    fontSize: TYPOGRAPHY.size.headline,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.primary,
    marginBottom: SPACING[1],
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.caption,
    color: PREMIUM_COLORS.text.tertiary,
  },

  // Gauge
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: SPACING[5],
    height: 100,
  },
  gaugeLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 0,
  },
  gaugeValue: {
    fontSize: TYPOGRAPHY.size.callout,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: PREMIUM_COLORS.text.secondary,
  },
  gaugePercent: {
    fontSize: TYPOGRAPHY.size.body,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: PREMIUM_COLORS.text.primary,
    marginTop: SPACING[1],
  },

  // Confidence
  confidenceRow: {
    marginBottom: SPACING[4],
  },

  // Statement
  statement: {
    fontSize: TYPOGRAPHY.size.body,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.body * 1.5,
    marginBottom: SPACING[3],
  },

  // Prevention
  preventionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${PREMIUM_COLORS.functional.activity.primary}10`,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[4],
    gap: SPACING[2],
  },
  preventionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.footnote,
    color: PREMIUM_COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.size.footnote * 1.4,
  },

  // CTA
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: PREMIUM_COLORS.border.light,
    gap: SPACING[1],
  },
  ctaText: {
    fontSize: TYPOGRAPHY.size.subhead,
    color: PREMIUM_COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
