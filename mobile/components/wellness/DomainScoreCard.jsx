/**
 * DomainScoreCard - Modern Sleek 4-Domain Wellness Breakdown
 *
 * Premium design with gradient progress rings and glass-like cards.
 * Each domain contributes up to 25 points to the total 100-point wellness score.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { TEXT, SURFACES, TYPOGRAPHY } from '../../constants/premiumTheme';
import { SPACING, RADIUS } from '../../constants/designTokens';

// Domain configurations with modern colors
const DOMAIN_CONFIG = {
  nutrition: {
    icon: 'nutrition',
    label: 'Food',
    gradient: ['#10B981', '#059669'],
    color: '#10B981',
    bgGradient: ['rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.04)'],
  },
  mood: {
    icon: 'happy',
    label: 'Mood',
    gradient: ['#F59E0B', '#D97706'],
    color: '#F59E0B',
    bgGradient: ['rgba(245, 158, 11, 0.12)', 'rgba(245, 158, 11, 0.04)'],
  },
  hydration: {
    icon: 'water',
    label: 'Hydration',
    gradient: ['#3B82F6', '#1D4ED8'],
    color: '#3B82F6',
    bgGradient: ['rgba(59, 130, 246, 0.12)', 'rgba(59, 130, 246, 0.04)'],
  },
  activity: {
    icon: 'fitness',
    label: 'Activity',
    gradient: ['#8B5CF6', '#6D28D9'],
    color: '#8B5CF6',
    bgGradient: ['rgba(139, 92, 246, 0.12)', 'rgba(139, 92, 246, 0.04)'],
  },
};

/**
 * Circular progress ring with gradient
 */
function DomainProgressRing({ value, maxValue = 25, size = 72, colors, domain }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference - progress * circumference;
  const percentage = Math.round((value / maxValue) * 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id={`ring-${domain}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1]} />
          </SvgGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0, 0, 0, 0.06)"
          strokeWidth={10}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#ring-${domain})`}
          strokeWidth={10}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.ringPercentage, { color: colors[0] }]}>{percentage}%</Text>
    </View>
  );
}

/**
 * Single Domain Score Card - Modern glass design
 */
export function DomainScoreCard({
  domain,
  score = 0,
  details = {},
  onPress,
  style,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const config = DOMAIN_CONFIG[domain] || DOMAIN_CONFIG.nutrition;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress?.(domain, { score, details });
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.card}>
          {/* Gradient background */}
          <LinearGradient
            colors={config.bgGradient}
            style={styles.cardGradient}
          >
            {/* Icon badge */}
            <View style={[styles.iconBadge, { backgroundColor: `${config.color}20` }]}>
              <Ionicons name={config.icon} size={18} color={config.color} />
            </View>

            {/* Progress Ring */}
            <DomainProgressRing
              value={score}
              maxValue={25}
              size={72}
              colors={config.gradient}
              domain={domain}
            />

            {/* Label */}
            <Text style={styles.label}>{config.label}</Text>

            {/* Score */}
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreValue, { color: config.color }]}>
                {Math.round(score)}
              </Text>
              <Text style={styles.scoreMax}>/25</Text>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * 2x2 Grid of Domain Score Cards
 */
export default function DomainBreakdownGrid({
  breakdown = {},
  onDomainPress,
  style,
}) {
  const domains = ['nutrition', 'mood', 'hydration', 'activity'];

  const getScore = (domain) => {
    const value = breakdown[domain];
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null) return value.score || 0;
    return 0;
  };

  return (
    <View style={[styles.gridContainer, style]}>
      <Text style={styles.sectionTitle}>WELLNESS DOMAINS</Text>
      <View style={styles.grid}>
        {domains.map((domain) => (
          <DomainScoreCard
            key={domain}
            domain={domain}
            score={getScore(domain)}
            details={typeof breakdown[domain] === 'object' ? breakdown[domain] : {}}
            onPress={onDomainPress}
            style={styles.gridItem}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Grid container
  gridContainer: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[4],
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.tertiary,
    marginBottom: SPACING[3],
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  gridItem: {
    width: '47%',
  },

  // Card styles
  card: {
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardGradient: {
    padding: SPACING[4],
    alignItems: 'center',
  },
  iconBadge: {
    position: 'absolute',
    top: SPACING[3],
    left: SPACING[3],
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercentage: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  label: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginTop: SPACING[2],
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  scoreMax: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    marginLeft: 2,
  },
});
