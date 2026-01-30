/**
 * FoodNutriScoreCard - Premium Compact Nutri-Score Display
 *
 * Design Philosophy: Industrial standard Nutri-Score with beautiful rings
 * Official colors: Dark Green (A) → Light Green (B) → Yellow (C) → Orange (D) → Red (E)
 *
 * Features:
 * - Beautiful gradient rings for score display
 * - Compact layout with barcode scanner link
 * - Official Nutri-Score color scheme
 * - Quick glance at food quality
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { BRAND, TEXT, SURFACES, SHADOWS, CARD_SYSTEM } from '../../constants/premiumTheme';

// Official Nutri-Score colors (EU standard)
const NUTRI_SCORE_COLORS = {
  A: { primary: '#038141', secondary: '#04A553', gradient: ['#038141', '#04A553'], label: 'Excellent' },
  B: { primary: '#85BB2F', secondary: '#9ACD32', gradient: ['#85BB2F', '#A8D84E'], label: 'Good' },
  C: { primary: '#FECB02', secondary: '#FFD93D', gradient: ['#FECB02', '#FFE066'], label: 'Fair' },
  D: { primary: '#EE8100', secondary: '#FF9A1F', gradient: ['#EE8100', '#FFA726'], label: 'Poor' },
  E: { primary: '#E63E11', secondary: '#FF5733', gradient: ['#E63E11', '#FF6B4A'], label: 'Avoid' },
};

// Animated score ring component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ScoreRing({ grade, size = 56 }) {
  const config = NUTRI_SCORE_COLORS[grade] || NUTRI_SCORE_COLORS.C;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: 100,
      tension: 20,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [animatedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={`scoreGradient-${grade}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={config.gradient[0]} />
            <Stop offset="100%" stopColor={config.gradient[1]} />
          </SvgGradient>
        </Defs>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${config.primary}20`}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#scoreGradient-${grade})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Grade letter */}
      <View style={styles.ringContent}>
        <Text style={[styles.gradeText, { color: config.primary }]}>{grade}</Text>
      </View>
    </View>
  );
}

// Mini score badge for individual foods
function MiniScoreBadge({ grade }) {
  const config = NUTRI_SCORE_COLORS[grade] || NUTRI_SCORE_COLORS.C;

  return (
    <LinearGradient
      colors={config.gradient}
      style={styles.miniBadge}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.miniBadgeText}>{grade}</Text>
    </LinearGradient>
  );
}

// Score scale visualization
function ScoreScale({ currentGrade }) {
  const grades = ['A', 'B', 'C', 'D', 'E'];

  return (
    <View style={styles.scaleContainer}>
      {grades.map((grade) => {
        const config = NUTRI_SCORE_COLORS[grade];
        const isActive = grade === currentGrade;

        return (
          <View key={grade} style={styles.scaleItem}>
            <View
              style={[
                styles.scaleDot,
                { backgroundColor: config.primary },
                isActive && styles.scaleDotActive,
              ]}
            />
            <Text
              style={[
                styles.scaleLabel,
                { color: isActive ? config.primary : TEXT.tertiary },
                isActive && styles.scaleLabelActive,
              ]}
            >
              {grade}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function calculateAverageGrade(foodLogs) {
  if (!foodLogs || foodLogs.length === 0) return null;
  const scoreValues = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const logsWithScores = foodLogs.filter(f => f.nutriscore);
  if (logsWithScores.length === 0) return null;
  const total = logsWithScores.reduce((sum, f) => sum + (scoreValues[f.nutriscore?.toUpperCase()] || 0), 0);
  const average = total / logsWithScores.length;
  if (average >= 4.5) return 'A';
  if (average >= 3.5) return 'B';
  if (average >= 2.5) return 'C';
  if (average >= 1.5) return 'D';
  return 'E';
}

export default function FoodNutriScoreCard({
  foodLogs = [],
  onScanBarcode,
  onViewDetails,
}) {
  const { isDark } = useTheme();

  const averageGrade = useMemo(() => calculateAverageGrade(foodLogs), [foodLogs]);
  const logsWithScores = useMemo(() => foodLogs.filter(f => f.nutriscore), [foodLogs]);
  const hasAnyScores = logsWithScores.length > 0;

  // If no food logs at all, show compact scanner prompt
  if (!foodLogs || foodLogs.length === 0 || !hasAnyScores) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, isDark && styles.containerDark]}
        onPress={onScanBarcode}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#F8FAFC', SURFACES.background.secondary]}
          style={styles.compactGradient}
        >
          <View style={styles.compactLeft}>
            <View style={styles.scanIconContainer}>
              <Ionicons name="scan-outline" size={24} color={BRAND.primary} />
            </View>
            <View>
              <Text style={styles.compactTitle}>Food Quality Score</Text>
              <Text style={styles.compactSubtitle}>Scan products to see Nutri-Score</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const config = NUTRI_SCORE_COLORS[averageGrade] || NUTRI_SCORE_COLORS.C;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={config.gradient}
            style={styles.headerIcon}
          >
            <Ionicons name="nutrition" size={16} color="#FFF" />
          </LinearGradient>
          <Text style={styles.title}>Nutri-Score</Text>
        </View>
        <TouchableOpacity onPress={onScanBarcode} style={styles.scanButton}>
          <Ionicons name="scan-outline" size={18} color={BRAND.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Score Display */}
      <View style={styles.scoreDisplay}>
        <ScoreRing grade={averageGrade} size={64} />
        <View style={styles.scoreInfo}>
          <Text style={[styles.scoreLabel, { color: config.primary }]}>
            {config.label}
          </Text>
          <Text style={styles.scoreSubtext}>
            Based on {logsWithScores.length} item{logsWithScores.length !== 1 ? 's' : ''} today
          </Text>
        </View>
      </View>

      {/* Score Scale */}
      <ScoreScale currentGrade={averageGrade} />

      {/* Recent Items */}
      {logsWithScores.length > 0 && (
        <View style={styles.recentItems}>
          <Text style={styles.recentTitle}>Recent Items</Text>
          <View style={styles.recentList}>
            {logsWithScores.slice(0, 3).map((food, idx) => (
              <View key={food.id || idx} style={styles.recentItem}>
                <MiniScoreBadge grade={food.nutriscore?.toUpperCase()} />
                <Text style={styles.recentItemName} numberOfLines={1}>
                  {food.foodName}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* View All Link */}
      {logsWithScores.length > 3 && (
        <TouchableOpacity onPress={onViewDetails} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View all {logsWithScores.length} items</Text>
          <Ionicons name="chevron-forward" size={14} color={BRAND.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...CARD_SYSTEM.standard,
  },
  containerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  compactContainer: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[3],
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  scanIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${BRAND.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  compactSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  scanButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${BRAND.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Score Display
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[3],
  },
  ringContainer: {
    position: 'relative',
  },
  ringContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 22,
    fontWeight: TYPOGRAPHY.weight.black,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },
  scoreSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Scale
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[3],
  },
  scaleItem: {
    alignItems: 'center',
    gap: 4,
  },
  scaleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.4,
  },
  scaleDotActive: {
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
  scaleLabel: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  scaleLabelActive: {
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
  },

  // Recent Items
  recentItems: {
    gap: SPACING[2],
  },
  recentTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentList: {
    gap: SPACING[1],
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  miniBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniBadgeText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFF',
  },
  recentItemName: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // View All
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
});
