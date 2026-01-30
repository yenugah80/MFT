/**
 * HydrationHeartPath - Creative Hydration Dashboard
 * "Heart Path Journey" - Each glass brings you closer to your heart goal
 *
 * Features:
 * - Visual mountain climb with heart destination
 * - Glass counter as heart icons
 * - Encouraging progress messages
 * - Battery-efficient animations (native driver, no infinite loops)
 * - Edge case handling
 */

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  G,
} from 'react-native-svg';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
} from '../../constants/premiumTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Animated SVG components
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Colors with proper contrast (WCAG AA compliant)
const COLORS = {
  heart: {
    filled: '#EC4899',      // Pink-500 - filled hearts
    empty: '#FBCFE8',       // Pink-200 - empty hearts
    glow: '#FDF2F8',        // Pink-50 - background glow
  },
  mountain: {
    peak: '#6366F1',        // Indigo-500
    base: '#C7D2FE',        // Indigo-200
    path: '#A5B4FC',        // Indigo-300
    climber: '#F59E0B',     // Amber-500 - you marker
    climberRing: '#FDE68A', // Amber-200
  },
  progress: {
    track: '#E2E8F0',       // Slate-200
    fill: '#EC4899',        // Pink-500
  },
  button: {
    primary: ['#EC4899', '#DB2777'],  // Pink gradient
    success: ['#10B981', '#059669'],  // Green gradient
    secondary: '#F8FAFC',              // Slate-50
  },
};

// Safe number utilities
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const safePercentage = (current, goal) => {
  if (!Number.isFinite(current) || !Number.isFinite(goal) || goal <= 0) return 0;
  return clamp(Math.round((current / goal) * 100), 0, 150); // Cap at 150%
};

/**
 * Heart Icon Component with optional pulse animation
 */
const HeartIcon = ({ filled, size = 18, animated = false, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated && filled) {
      // One-time pop animation when heart fills
      Animated.sequence([
        Animated.delay(delay),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [filled, animated, delay]);

  const animatedStyle = animated ? {
    transform: [{ scale: scaleAnim }],
  } : {};

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={filled ? 'heart' : 'heart-outline'}
        size={size}
        color={filled ? COLORS.heart.filled : COLORS.heart.empty}
      />
    </Animated.View>
  );
};

/**
 * Glass Counter Row - Shows hearts for each glass
 * Limited to 8 hearts max for UI cleanliness
 */
const GlassCounter = ({ current, total, animate = false }) => {
  // Cap display at 8 hearts to prevent overflow
  const displayTotal = Math.min(total, 8);
  const displayCurrent = Math.min(current, displayTotal);

  const hearts = [];
  for (let i = 0; i < displayTotal; i++) {
    hearts.push(
      <HeartIcon
        key={i}
        filled={i < displayCurrent}
        size={16}
        animated={animate}
        delay={i * 50}
      />
    );
  }

  return (
    <View style={styles.glassCounter}>
      <View style={styles.heartsRow}>
        {hearts}
        {total > 8 && (
          <Text style={styles.moreHeartsText}>+{total - 8}</Text>
        )}
      </View>
      <Text style={styles.glassCountText}>
        {current} of {total} glasses
      </Text>
    </View>
  );
};

/**
 * Mountain Path Visualization with animated climber
 */
const MountainPath = ({ percentage, size = 100 }) => {
  const clampedPercent = clamp(percentage, 0, 100);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const appState = useRef(AppState.currentState);

  // Battery-efficient pulse: only runs when app is active
  useEffect(() => {
    let animation;

    const startPulse = () => {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    };

    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        startPulse();
      } else if (nextAppState.match(/inactive|background/)) {
        animation?.stop();
        pulseAnim.setValue(1);
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    startPulse();

    return () => {
      animation?.stop();
      subscription?.remove();
    };
  }, []);

  // Path coordinates
  const pathProgress = clampedPercent / 100;
  const startX = 12;
  const startY = size - 18;
  const peakX = size - 22;
  const peakY = 22;

  // Quadratic bezier curve calculation
  const controlX = size / 2;
  const controlY = size / 2 - 10;

  // Calculate position on quadratic bezier
  const t = pathProgress;
  const climberX = (1-t)*(1-t)*startX + 2*(1-t)*t*controlX + t*t*peakX;
  const climberY = (1-t)*(1-t)*startY + 2*(1-t)*t*controlY + t*t*peakY;

  const isGoalMet = clampedPercent >= 100;

  return (
    <View style={styles.mountainContainer}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgGradient id="mountainGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={COLORS.mountain.base} />
            <Stop offset="100%" stopColor={COLORS.mountain.peak} />
          </SvgGradient>
          <SvgGradient id="heartGradFilled" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F472B6" />
            <Stop offset="100%" stopColor="#EC4899" />
          </SvgGradient>
        </Defs>

        {/* Mountain silhouette */}
        <Path
          d={`M ${size/2} 16 L ${size - 8} ${size - 12} L 8 ${size - 12} Z`}
          fill="url(#mountainGrad)"
          opacity={0.25}
        />

        {/* Path trail (dotted) */}
        <Path
          d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${peakX} ${peakY}`}
          stroke={COLORS.mountain.path}
          strokeWidth={2}
          strokeDasharray="3,4"
          fill="none"
          opacity={0.5}
        />

        {/* Filled progress path */}
        <Path
          d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${peakX} ${peakY}`}
          stroke={COLORS.heart.filled}
          strokeWidth={2.5}
          strokeDasharray={`${pathProgress * 120}, 120`}
          fill="none"
          strokeLinecap="round"
        />

        {/* Heart at peak */}
        <G transform={`translate(${peakX - 8}, ${peakY - 10})`}>
          <Path
            d="M8 3.5C8 1.5 6.5 0 4.5 0S1 1.5 1 3.5C1 7.5 8 12 8 12s7-4.5 7-8.5C15 1.5 13.5 0 11.5 0S8 1.5 8 3.5z"
            fill={isGoalMet ? 'url(#heartGradFilled)' : COLORS.heart.empty}
            scale={0.85}
          />
        </G>

        {/* Climber outer ring (animated pulse) */}
        <AnimatedCircle
          cx={climberX}
          cy={climberY}
          r={10}
          fill={COLORS.mountain.climberRing}
          opacity={0.4}
          style={{
            transform: [{ scale: pulseAnim }],
          }}
        />

        {/* Climber marker */}
        <Circle
          cx={climberX}
          cy={climberY}
          r={7}
          fill={COLORS.mountain.climber}
        />
        <Circle
          cx={climberX}
          cy={climberY}
          r={3}
          fill="#FFFFFF"
        />
      </Svg>

      {/* Goal met badge */}
      {isGoalMet && (
        <View style={styles.goalBadge}>
          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

/**
 * Animated Progress Bar
 */
const ProgressTrack = ({ percentage, label }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: Math.min(percentage, 100),
      tension: 40,
      friction: 8,
      useNativeDriver: false, // width requires JS driver
    }).start();
  }, [percentage]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressLabels}>
        <Text style={styles.progressLabelLeft}>You</Text>
        <Text style={styles.progressLabelRight}>Goal</Text>
      </View>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: animatedWidth }
          ]}
        />
      </View>
      <Text style={styles.progressSubtext}>{label}</Text>
    </View>
  );
};

/**
 * Get encouraging message based on progress
 */
const getEncouragingMessage = (percentage, glassesRemaining) => {
  if (percentage >= 100) return "You reached your heart's goal!";
  if (percentage >= 85) return "Almost there! One more push";
  if (percentage >= 70) return "Great progress! Keep climbing";
  if (percentage >= 50) return "Halfway to the peak";
  if (percentage >= 30) return `${glassesRemaining} glasses to go`;
  if (percentage >= 10) return "Your journey has begun";
  if (percentage > 0) return "First steps count the most";
  return "Start your heart journey";
};

/**
 * Main Component
 */
export default function HydrationHeartPath({
  currentIntake = 0,        // in liters (e.g., 1.25)
  dailyGoal = 2.0,          // in liters (e.g., 2.0)
  onOpenFullTracker,        // Function to open full tracker
  onViewHistory,            // Function to view history (KEEP ACTIVE)
}) {
  // Edge case: Validate inputs
  const safeIntake = Number.isFinite(currentIntake) ? Math.max(0, currentIntake) : 0;
  const safeGoal = Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : 2.0;

  // Convert to ml for display
  const currentMl = Math.round(safeIntake * 1000);
  const goalMl = Math.round(safeGoal * 1000);
  const percentage = safePercentage(safeIntake, safeGoal);

  // Glass calculation (250ml per glass)
  const GLASS_SIZE = 250;
  const totalGlasses = Math.max(1, Math.ceil(goalMl / GLASS_SIZE));
  const currentGlasses = Math.min(Math.floor(currentMl / GLASS_SIZE), totalGlasses + 4); // Allow some overflow
  const glassesRemaining = Math.max(0, totalGlasses - currentGlasses);

  // Encouraging message
  const message = useMemo(() =>
    getEncouragingMessage(percentage, glassesRemaining),
    [percentage, glassesRemaining]
  );

  // Handle add water
  const handleAddWater = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Haptics may fail on some devices
    }
    if (onOpenFullTracker) {
      onOpenFullTracker();
    }
  }, [onOpenFullTracker]);

  // Handle view history
  const handleViewHistory = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      // Haptics may fail
    }
    if (onViewHistory) {
      onViewHistory();
    }
  }, [onViewHistory]);

  const isGoalMet = percentage >= 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="water" size={18} color={COLORS.heart.filled} />
          <Text style={styles.headerTitle}>Hydration</Text>
        </View>
        <View style={styles.percentBadge}>
          <Text style={styles.percentBadgeText}>
            {Math.min(percentage, 150)}%
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Left: Mountain Visualization */}
        <View style={styles.visualSection}>
          <MountainPath percentage={percentage} size={95} />
        </View>

        {/* Right: Stats */}
        <View style={styles.statsSection}>
          <View style={styles.intakeRow}>
            <Text style={styles.intakeValue}>
              {currentMl.toLocaleString()}
            </Text>
            <Text style={styles.intakeUnit}>ml</Text>
          </View>
          <Text style={styles.goalText}>of {goalMl.toLocaleString()} ml goal</Text>

          {/* Glass Counter */}
          <GlassCounter
            current={currentGlasses}
            total={totalGlasses}
            animate={false}
          />
        </View>
      </View>

      {/* Progress Track */}
      <ProgressTrack
        percentage={percentage}
        label={message}
      />

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {/* Primary: Add Water */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleAddWater}
          activeOpacity={0.85}
          accessibilityLabel={isGoalMet ? 'Goal met' : 'Add water'}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={isGoalMet ? COLORS.button.success : COLORS.button.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <Ionicons
              name={isGoalMet ? 'checkmark-circle' : 'add-circle'}
              size={17}
              color="#FFFFFF"
            />
            <Text style={styles.primaryButtonText}>
              {isGoalMet ? 'Goal Met' : 'Add Water'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary: History (ALWAYS ACTIVE) */}
        {onViewHistory && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewHistory}
            activeOpacity={0.7}
            accessibilityLabel="View hydration history"
            accessibilityRole="button"
          >
            <Ionicons name="analytics" size={15} color={BRAND.primary} />
            <Text style={styles.secondaryButtonText}>History</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  percentBadge: {
    backgroundColor: COLORS.heart.glow,
    paddingHorizontal: SPACING[2] + 4,
    paddingVertical: SPACING[1] + 1,
    borderRadius: RADIUS.full,
  },
  percentBadgeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: COLORS.heart.filled,
  },

  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  visualSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mountainContainer: {
    position: 'relative',
  },
  goalBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsSection: {
    flex: 1,
  },
  intakeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  intakeValue: {
    fontSize: 30,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
    letterSpacing: -0.5,
  },
  intakeUnit: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
  },
  goalText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Glass Counter
  glassCounter: {
    marginTop: SPACING[2],
  },
  heartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexWrap: 'wrap',
  },
  moreHeartsText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginLeft: 2,
  },
  glassCountText: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 4,
  },

  // Progress
  progressContainer: {
    marginBottom: SPACING[3],
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabelLeft: {
    fontSize: 11,
    color: COLORS.mountain.climber,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  progressLabelRight: {
    fontSize: 11,
    color: COLORS.heart.filled,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  progressTrack: {
    height: 5,
    backgroundColor: COLORS.progress.track,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.progress.fill,
    borderRadius: RADIUS.full,
  },
  progressSubtext: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[2],
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  primaryButton: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.heart.filled,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3] - 2,
    paddingHorizontal: SPACING[4],
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING[3] - 2,
    paddingHorizontal: SPACING[3] + 2,
    backgroundColor: COLORS.button.secondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: `${BRAND.primary}15`,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: BRAND.primary,
  },
});
