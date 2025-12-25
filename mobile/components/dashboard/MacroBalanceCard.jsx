/**
 * MacroBalanceCard Component
 * Displays macro distribution quality with visual pie chart and assessment
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import GlassCard from './GlassCard';
import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SEMANTIC,
} from '../../constants/premiumTheme';

const MacroBar = ({ label, percentage, color, isIdeal }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: percentage,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.macroBar}>
      <View style={styles.macroHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <View style={styles.macroValueContainer}>
          <Text style={[styles.macroValue, { color }]}>{percentage}%</Text>
          {isIdeal && (
            <Ionicons name="checkmark-circle" size={16} color={SEMANTIC.success.base} />
          )}
        </View>
      </View>
      <View style={styles.macroTrack}>
        <Animated.View
          style={[
            styles.macroFill,
            {
              width: animatedWidth,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
};

const QualityBadge = ({ quality, score }) => {
  const getQualityStyle = () => {
    switch (quality) {
      case 'excellent':
        return {
          icon: 'star',
          color: SEMANTIC.success.base,
          gradient: [SEMANTIC.success.base, '#059669'],
          label: 'Excellent',
        };
      case 'good':
        return {
          icon: 'thumbs-up',
          color: SEMANTIC.info.base,
          gradient: [SEMANTIC.info.base, '#2563EB'],
          label: 'Good',
        };
      case 'fair':
        return {
          icon: 'alert-circle',
          color: SEMANTIC.warning.base,
          gradient: [SEMANTIC.warning.base, '#D97706'],
          label: 'Fair',
        };
      case 'poor':
        return {
          icon: 'close-circle',
          color: SEMANTIC.danger.base,
          gradient: [SEMANTIC.danger.base, '#DC2626'],
          label: 'Needs Work',
        };
      default:
        return {
          icon: 'help-circle',
          color: TEXT.tertiary,
          gradient: ['#94A3B8', '#64748B'],
          label: 'No Data',
        };
    }
  };

  const style = getQualityStyle();

  return (
    <View style={styles.qualityBadgeContainer}>
      <LinearGradient
        colors={style.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.qualityBadge}
      >
        <Ionicons name={style.icon} size={32} color="#FFF" />
        <Text style={styles.qualityLabel}>{style.label}</Text>
        <Text style={styles.qualityScore}>{score}/100</Text>
      </LinearGradient>
    </View>
  );
};

const MacroPieChart = ({ distribution }) => {
  const { protein = 0, carbs = 0, fat = 0 } = distribution;
  const size = 120;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke dash arrays for pie segments
  const proteinLength = (protein / 100) * circumference;
  const carbsLength = (carbs / 100) * circumference;
  const fatLength = (fat / 100) * circumference;

  const proteinOffset = 0;
  const carbsOffset = -proteinLength;
  const fatOffset = -(proteinLength + carbsLength);

  return (
    <View style={styles.pieChartContainer}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Protein segment (blue) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#3B82F6"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${proteinLength} ${circumference}`}
            strokeDashoffset={proteinOffset}
            strokeLinecap="round"
          />
          {/* Carbs segment (green) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10B981"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${carbsLength} ${circumference}`}
            strokeDashoffset={carbsOffset}
            strokeLinecap="round"
          />
          {/* Fat segment (amber) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F59E0B"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${fatLength} ${circumference}`}
            strokeDashoffset={fatOffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.pieChartCenter}>
        <Text style={styles.pieChartLabel}>Macros</Text>
      </View>
    </View>
  );
};

export default function MacroBalanceCard({ assessment }) {
  if (!assessment || assessment.quality === 'none') {
    return null;
  }

  const { quality, message, score, distribution } = assessment;

  // Determine if each macro is in ideal range
  const proteinIdeal = distribution.protein >= 25 && distribution.protein <= 35;
  const carbsIdeal = distribution.carbs >= 40 && distribution.carbs <= 60;
  const fatIdeal = distribution.fat >= 20 && distribution.fat <= 35;

  return (
    <GlassCard padding="md" style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <LinearGradient
            colors={SURFACES.gradient.primary}
            style={styles.headerIconGradient}
          >
            <Ionicons name="pie-chart" size={20} color="#FFF" />
          </LinearGradient>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Macro Balance</Text>
          <Text style={styles.headerSubtitle}>{message}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Left: Pie Chart */}
        <MacroPieChart distribution={distribution} />

        {/* Right: Quality Badge */}
        <QualityBadge quality={quality} score={score} />
      </View>

      {/* Macro Breakdown Bars */}
      <View style={styles.macrosSection}>
        <MacroBar
          label="Protein"
          percentage={distribution.protein}
          color="#3B82F6"
          isIdeal={proteinIdeal}
        />
        <MacroBar
          label="Carbs"
          percentage={distribution.carbs}
          color="#10B981"
          isIdeal={carbsIdeal}
        />
        <MacroBar
          label="Fat"
          percentage={distribution.fat}
          color="#F59E0B"
          isIdeal={fatIdeal}
        />
      </View>

      {/* Ideal Ranges Info */}
      <View style={styles.footer}>
        <Ionicons name="information-circle" size={16} color={TEXT.tertiary} />
        <Text style={styles.footerText}>
          Ideal: Protein 25-35% · Carbs 40-60% · Fat 20-35%
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[5],
    paddingBottom: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerIcon: {
    marginRight: SPACING[3],
  },
  headerIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  pieChartContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieChartCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieChartLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  qualityBadgeContainer: {
    flex: 1,
    marginLeft: SPACING[4],
  },
  qualityBadge: {
    borderRadius: RADIUS.lg,
    padding: SPACING[4],
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
    marginTop: SPACING[2],
  },
  qualityScore: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  macrosSection: {
    gap: SPACING[4],
    marginBottom: SPACING[4],
  },
  macroBar: {
    gap: SPACING[2],
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  macroValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  macroTrack: {
    height: 8,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  footerText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    flex: 1,
  },
});
