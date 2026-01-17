import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { TEXT, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../../constants/premiumTheme';

// Creative stage design - Gradient badges with premium feel
const STAGE_PROGRESSION = {
  DISCOVERER: {
    duration: 1,
    gradient: ['#A5B4FC', '#6366F1'],
    glowColor: '#6366F1',
    icon: 'leaf',
    name: 'Discoverer',
    tagline: 'Starting your journey',
    emoji: '🌱',
  },
  BUILDER: {
    duration: 5,
    gradient: ['#FCD34D', '#D97706'],
    glowColor: '#D97706',
    icon: 'construct',
    name: 'Builder',
    tagline: 'Building habits',
    emoji: '🔨',
  },
  TRACKER: {
    duration: 23,
    gradient: ['#FDBA74', '#EA580C'],
    glowColor: '#EA580C',
    icon: 'bar-chart',
    name: 'Tracker',
    tagline: 'Tracking progress',
    emoji: '📊',
  },
  OPTIMIZER: {
    duration: 60,
    gradient: ['#F9A8D4', '#DB2777'],
    glowColor: '#DB2777',
    icon: 'flash',
    name: 'Optimizer',
    tagline: 'Optimizing results',
    emoji: '⚡',
  },
  MASTER: {
    duration: 90,
    gradient: ['#BEF264', '#65A30D'],
    glowColor: '#65A30D',
    icon: 'ribbon',
    name: 'Master',
    tagline: 'Mastering wellness',
    emoji: '🎯',
  },
  CHAMPION: {
    duration: 185,
    gradient: ['#6EE7B7', '#059669'],
    glowColor: '#059669',
    icon: 'trophy',
    name: 'Champion',
    tagline: 'Champion lifestyle',
    emoji: '🏆',
  },
  ELITE: {
    duration: Infinity,
    gradient: ['#93C5FD', '#2563EB'],
    glowColor: '#2563EB',
    icon: 'diamond',
    name: 'Elite',
    tagline: 'Elite performer',
    emoji: '💎',
  },
};

const STAGE_ORDER = ['DISCOVERER', 'BUILDER', 'TRACKER', 'OPTIMIZER', 'MASTER', 'CHAMPION', 'ELITE'];

/**
 * Animated Ring Progress - SVG circle for the badge
 */
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ProgressRing = ({ progress, size = 72, strokeWidth = 4, color }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <Svg width={size} height={size} style={styles.progressRing}>
      {/* Background track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress arc */}
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#FFF"
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [circumference, 0],
        })}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

/**
 * Mini Stage Indicator - Compact dots showing progression
 */
const MiniStageIndicator = ({ currentIndex, total = 7 }) => (
  <View style={styles.miniStages}>
    {Array.from({ length: Math.min(total, 7) }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.miniDot,
          i < currentIndex && styles.miniDotCompleted,
          i === currentIndex && styles.miniDotCurrent,
        ]}
      />
    ))}
  </View>
);

export function LifecycleStageIndicator({
  stage = 'DISCOVERER',
  daysSinceStart = 0,
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Subtle pulse animation for the badge
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const stageData = useMemo(() => {
    const current = STAGE_PROGRESSION[stage];
    if (!current) return null;

    const currentIndex = STAGE_ORDER.indexOf(stage);
    const nextIndex = currentIndex + 1;
    const nextStageName = nextIndex < STAGE_ORDER.length ? STAGE_ORDER[nextIndex] : stage;
    const nextStage = STAGE_PROGRESSION[nextStageName];

    let stageDaysStart = 0;
    for (let i = 0; i < currentIndex; i++) {
      stageDaysStart += STAGE_PROGRESSION[STAGE_ORDER[i]].duration;
    }

    const daysInStage = daysSinceStart - stageDaysStart;
    const daysToNextStage = Math.max(0, current.duration - daysInStage);
    const progressPercent = current.duration === Infinity
      ? 1
      : Math.min(1, Math.max(0, daysInStage / current.duration));

    return {
      current,
      currentIndex,
      nextStage,
      nextStageName,
      daysInStage,
      daysToNextStage,
      progressPercent,
      isElite: stage === 'ELITE',
    };
  }, [stage, daysSinceStart]);

  if (!stageData) return null;

  const { current, currentIndex, nextStage, daysToNextStage, progressPercent, isElite } = stageData;
  const levelNumber = currentIndex + 1;

  return (
    <View style={styles.container}>
      {/* Glassmorphic Card */}
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
        style={styles.glassCard}
      >
        <View style={styles.content}>
          {/* Left: Animated Badge */}
          <Animated.View style={[styles.badgeWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={current.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              {/* Progress Ring */}
              <ProgressRing progress={progressPercent} size={72} strokeWidth={4} />
              {/* Inner Badge Content */}
              <View style={styles.badgeInner}>
                <Text style={styles.badgeEmoji}>{current.emoji}</Text>
              </View>
              {/* Level Number */}
              <View style={styles.levelCircle}>
                <Text style={styles.levelNumber}>{levelNumber}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Right: Stage Info */}
          <View style={styles.infoSection}>
            {/* Stage Name + Level */}
            <View style={styles.nameRow}>
              <Text style={styles.stageName}>{current.name}</Text>
              <View style={[styles.levelPill, { backgroundColor: current.gradient[1] + '20' }]}>
                <Text style={[styles.levelPillText, { color: current.gradient[1] }]}>Lv.{levelNumber}</Text>
              </View>
            </View>

            {/* Tagline */}
            <Text style={styles.tagline}>{current.tagline}</Text>

            {/* Progress Info */}
            {!isElite ? (
              <View style={styles.progressInfo}>
                <View style={styles.progressRow}>
                  <Ionicons name="arrow-forward-circle" size={14} color={current.gradient[1]} />
                  <Text style={styles.progressText}>
                    <Text style={styles.progressHighlight}>{daysToNextStage}</Text> days to {nextStage.name}
                  </Text>
                </View>
                {/* Mini Progress Bar */}
                <View style={styles.miniProgress}>
                  <View style={[styles.miniProgressFill, { width: `${progressPercent * 100}%`, backgroundColor: current.gradient[1] }]} />
                </View>
              </View>
            ) : (
              <View style={styles.eliteRow}>
                <Ionicons name="star" size={14} color={current.gradient[1]} />
                <Text style={[styles.eliteText, { color: current.gradient[1] }]}>Elite Unlocked</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom: Mini Stage Dots */}
        <MiniStageIndicator currentIndex={currentIndex} total={7} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING[1],
  },
  glassCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  badgeWrapper: {
    // Animation target
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  progressRing: {
    position: 'absolute',
  },
  badgeInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  levelCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  levelNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT.primary,
  },
  infoSection: {
    flex: 1,
    gap: SPACING[1],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  stageName: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  levelPill: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  levelPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tagline: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  progressInfo: {
    marginTop: SPACING[1],
    gap: SPACING[1],
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 12,
    color: TEXT.secondary,
  },
  progressHighlight: {
    fontWeight: '700',
    color: TEXT.primary,
  },
  miniProgress: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  eliteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[1],
  },
  eliteText: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniStages: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING[3],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.04)',
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  miniDotCompleted: {
    backgroundColor: '#10B981',
  },
  miniDotCurrent: {
    backgroundColor: '#6366F1',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
