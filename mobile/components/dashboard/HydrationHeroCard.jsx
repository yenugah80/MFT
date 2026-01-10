/**
 * HydrationHeroCard - Premium Gamified Hydration Experience
 *
 * Design Philosophy: "Calm Luxury meets Gamification"
 * Inspired by: Oura Ring, Apple Fitness+, Calm
 *
 * Features:
 * - Animated water wave effect
 * - Gradient progress ring
 * - Gamified streaks & levels
 * - Satisfying quick-add interactions
 * - Celebration animations on goal completion
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../constants/designTokens';
import { BRAND, TEXT, SURFACES, SHADOWS } from '../../constants/premiumTheme';

// Premium color palette for hydration
const HYDRATION_COLORS = {
  primary: ['#0EA5E9', '#06B6D4'], // Sky to cyan
  secondary: ['#38BDF8', '#22D3EE'], // Light sky to light cyan
  accent: ['#0284C7', '#0891B2'], // Deep blue
  glow: 'rgba(14, 165, 233, 0.3)',
  success: ['#10B981', '#34D399'], // Emerald gradient
  gold: ['#F59E0B', '#FBBF24'], // Achievement gold
};

// Hydration levels for gamification
const HYDRATION_LEVELS = [
  { level: 1, name: 'Seedling', minDays: 0, icon: '🌱' },
  { level: 2, name: 'Sprout', minDays: 3, icon: '🌿' },
  { level: 3, name: 'Blooming', minDays: 7, icon: '🌸' },
  { level: 4, name: 'Thriving', minDays: 14, icon: '🌳' },
  { level: 5, name: 'Master', minDays: 30, icon: '💎' },
];

/**
 * Animated Wave Background
 */
function WaveBackground({ progress, size }) {
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [waveAnim]);

  const translateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -size],
  });

  const waveHeight = size * (1 - Math.min(progress / 100, 1));

  return (
    <View style={[styles.waveContainer, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.wave,
          {
            transform: [{ translateX }],
            top: waveHeight,
          },
        ]}
      >
        <Svg width={size * 2} height={size} viewBox={`0 0 ${size * 2} ${size}`}>
          <Defs>
            <SvgLinearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0.6" />
            </SvgLinearGradient>
          </Defs>
          <Path
            d={`M0,${size * 0.3}
               Q${size * 0.25},${size * 0.1} ${size * 0.5},${size * 0.3}
               T${size},${size * 0.3}
               Q${size * 1.25},${size * 0.1} ${size * 1.5},${size * 0.3}
               T${size * 2},${size * 0.3}
               V${size} H0 Z`}
            fill="url(#waveGradient)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * Gradient Progress Ring
 */
function ProgressRing({ progress, size = 180, strokeWidth = 12 }) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: progress,
      tension: 20,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0EA5E9" />
            <Stop offset="50%" stopColor="#06B6D4" />
            <Stop offset="100%" stopColor="#10B981" />
          </SvgLinearGradient>
        </Defs>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(14, 165, 233, 0.15)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Glow effect */}
      {progress >= 100 && (
        <View style={[styles.ringGlow, { width: size + 20, height: size + 20 }]} />
      )}
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Quick Add Button with satisfying feedback
 */
function QuickAddButton({ amount, icon, onPress, isSelected }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
    onPress?.(amount);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.quickAddButton, isSelected && styles.quickAddButtonSelected]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isSelected ? HYDRATION_COLORS.primary : ['#F8FAFC', '#F1F5F9']}
          style={styles.quickAddGradient}
        >
          <Ionicons
            name={icon}
            size={20}
            color={isSelected ? '#FFF' : HYDRATION_COLORS.primary[0]}
          />
          <Text style={[styles.quickAddText, isSelected && styles.quickAddTextSelected]}>
            {amount}ml
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Streak Badge with glow
 */
function StreakBadge({ streak, level }) {
  const levelInfo = HYDRATION_LEVELS.find(l => l.minDays <= streak) || HYDRATION_LEVELS[0];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (streak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [streak, pulseAnim]);

  if (streak === 0) return null;

  return (
    <Animated.View style={[styles.streakBadge, { transform: [{ scale: pulseAnim }] }]}>
      <LinearGradient
        colors={HYDRATION_COLORS.gold}
        style={styles.streakGradient}
      >
        <Text style={styles.streakEmoji}>{levelInfo.icon}</Text>
        <View>
          <Text style={styles.streakCount}>{streak} day streak</Text>
          <Text style={styles.streakLevel}>{levelInfo.name}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

/**
 * Main HydrationHeroCard Component
 */
export default function HydrationHeroCard({
  currentMl = 0,
  goalMl = 2000,
  streak = 0,
  drinks = 0,
  onAddWater,
  onViewDetails,
}) {
  const progress = Math.min((currentMl / goalMl) * 100, 100);
  const isGoalMet = progress >= 100;
  const glassesLeft = Math.max(0, Math.ceil((goalMl - currentMl) / 250));

  // Celebration animation when goal is met
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isGoalMet) {
      Animated.sequence([
        Animated.timing(celebrateAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(celebrateAnim, {
          toValue: 0,
          duration: 500,
          delay: 2000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isGoalMet, celebrateAnim]);

  // Time-based encouragement
  const getEncouragement = () => {
    const hour = new Date().getHours();
    if (isGoalMet) return "You've crushed your goal!";
    if (progress >= 75) return "Almost there! Keep going!";
    if (hour < 12 && progress < 30) return "Great morning to hydrate!";
    if (hour >= 12 && hour < 17 && progress < 50) return "Afternoon boost needed";
    if (hour >= 17 && progress < 75) return "Evening catch-up time";
    return "Stay hydrated, stay healthy";
  };

  return (
    <View style={styles.container}>
      {/* Celebration overlay */}
      {isGoalMet && (
        <Animated.View
          style={[
            styles.celebrationOverlay,
            { opacity: celebrateAnim },
          ]}
        >
          <View style={styles.celebrationContent}>
            <Ionicons name="trophy" size={24} color="#F59E0B" />
            <Text style={styles.celebrationText}>Goal Achieved!</Text>
            <Ionicons name="trophy" size={24} color="#F59E0B" />
          </View>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={HYDRATION_COLORS.primary}
            style={styles.headerIcon}
          >
            <Ionicons name="water" size={18} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={styles.title}>Hydration</Text>
            <Text style={styles.subtitle}>{getEncouragement()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onViewDetails} style={styles.detailsButton}>
          <Text style={styles.detailsText}>Details</Text>
          <Ionicons name="chevron-forward" size={16} color={HYDRATION_COLORS.primary[0]} />
        </TouchableOpacity>
      </View>

      {/* Main Progress Display */}
      <View style={styles.progressContainer}>
        <View style={styles.ringWrapper}>
          <ProgressRing progress={progress} size={160} strokeWidth={14} />
          <View style={styles.ringContent}>
            <WaveBackground progress={progress} size={120} />
            <View style={styles.ringOverlay}>
              <Text style={styles.progressValue}>
                {Math.round(progress)}
                <Text style={styles.progressPercent}>%</Text>
              </Text>
              <Text style={styles.progressLabel}>hydrated</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{currentMl}</Text>
            <Text style={styles.statLabel}>ml today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{drinks}</Text>
            <Text style={styles.statLabel}>drinks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, isGoalMet && styles.statValueSuccess]}>
              {isGoalMet ? '✓' : glassesLeft}
            </Text>
            <Text style={styles.statLabel}>{isGoalMet ? 'complete' : 'glasses left'}</Text>
          </View>
        </View>
      </View>

      {/* Streak Badge */}
      <StreakBadge streak={streak} />

      {/* Quick Add Section */}
      <View style={styles.quickAddSection}>
        <Text style={styles.quickAddTitle}>Quick Add</Text>
        <View style={styles.quickAddRow}>
          <QuickAddButton amount={150} icon="cafe-outline" onPress={onAddWater} />
          <QuickAddButton amount={250} icon="water-outline" onPress={onAddWater} isSelected />
          <QuickAddButton amount={500} icon="beer-outline" onPress={onAddWater} />
          <QuickAddButton amount={750} icon="flask-outline" onPress={onAddWater} />
        </View>
      </View>

      {/* Goal indicator */}
      <View style={styles.goalIndicator}>
        <Ionicons name="flag" size={14} color={TEXT.tertiary} />
        <Text style={styles.goalText}>{goalMl}ml daily goal</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl + 4,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.1)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 1,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: HYDRATION_COLORS.primary[0],
  },

  // Progress
  progressContainer: {
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  ringWrapper: {
    position: 'relative',
    marginBottom: SPACING[4],
  },
  ringContainer: {
    position: 'relative',
  },
  ringGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  ringContent: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
  },
  ringOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  progressValue: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weight.black,
    color: HYDRATION_COLORS.primary[0],
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: -2,
  },

  // Wave
  waveContainer: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 60,
  },
  wave: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '100%',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statValueSuccess: {
    color: '#10B981',
  },
  statLabel: {
    fontSize: 10,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
  },

  // Streak
  streakBadge: {
    marginBottom: SPACING[4],
  },
  streakGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
  },
  streakEmoji: {
    fontSize: 20,
  },
  streakCount: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
  streakLevel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Quick Add
  quickAddSection: {
    marginBottom: SPACING[3],
  },
  quickAddTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING[2],
  },
  quickAddButton: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  quickAddButtonSelected: {
    ...SHADOWS.md,
  },
  quickAddGradient: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    gap: 4,
  },
  quickAddText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: HYDRATION_COLORS.primary[0],
  },
  quickAddTextSelected: {
    color: '#FFF',
  },

  // Goal
  goalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
  },
  goalText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },

  // Celebration
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    borderRadius: RADIUS.xl + 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  celebrationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  celebrationText: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#FFF',
  },
});
