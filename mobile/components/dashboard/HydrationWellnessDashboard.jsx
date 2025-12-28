/**
 * ============================================================================
 * HydrationWellnessDashboard - Premium Hydration & Health Correlation Display
 * ============================================================================
 *
 * World-class dashboard component linking hydration to:
 * - Physical health (energy, skin, immunity, performance)
 * - Mental wellness (mood, clarity, focus, stress)
 * - Premium visualizations with gradients, waves, and glows
 *
 * Features:
 * - Animated liquid wave progress
 * - Health impact indicators with real-time correlation
 * - Mental wellness scoring
 * - Streak visualization with fire effects
 * - Quick add integration
 * - Beautiful mini charts and trends
 * - No boring icons - all premium gradients and effects
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Circle,
  Path,
  Rect,
  ClipPath,
} from 'react-native-svg';

import GlassCard from './GlassCard';
import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  SURFACES,
  BRAND,
} from '../../constants/premiumTheme';
import { getItem, setItem, STORAGE_KEYS } from '../../utils/storage';
import { parseLiters, parseGoal, safeDivide, calculatePercentage, parseDecimal } from '../../utils/safeNumbers';

// Create animated SVG component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - SPACING[8];

// ============================================================================
// HEALTH IMPACT CALCULATOR - Links hydration to health metrics
// ============================================================================

const calculateHealthImpact = (percentage) => {
  // Energy: 0-30% = Low, 30-70% = Medium, 70-100% = High, 100%+ = Optimal
  const energy = Math.min(percentage * 1.2, 100);

  // Mental Clarity: Peaks at 80-100% hydration
  const clarity = percentage >= 80 ? 95 + (percentage - 80) * 0.25 : percentage * 1.1;

  // Skin Health: Gradual improvement, significant boost at 60%+
  const skin = percentage >= 60 ? 60 + (percentage - 60) * 1.0 : percentage;

  // Physical Performance: Correlates strongly with hydration
  const performance = Math.min(percentage * 1.15, 100);

  // Mood: Improves significantly after 50% hydration
  const mood = percentage >= 50 ? 50 + (percentage - 50) * 0.9 : percentage * 0.8;

  // Focus: Critical for brain function
  const focus = Math.min(percentage * 1.1, 100);

  // Stress Relief: Hydration helps manage stress
  const stressRelief = Math.min(percentage * 0.9, 85);

  return {
    energy: Math.round(energy),
    clarity: Math.round(clarity),
    skin: Math.round(skin),
    performance: Math.round(performance),
    mood: Math.round(mood),
    focus: Math.round(focus),
    stressRelief: Math.round(stressRelief),
  };
};

// ============================================================================
// SMART CONTEXT ENGINE - Time & Status based advice
// ============================================================================
const getSmartAdvice = (percentage) => {
  const hour = new Date().getHours();
  if (percentage >= 100) return "Goal met! You're fully optimized";
  if (percentage >= 80) return "Almost there! Finish strong";

  if (hour < 10) return "Jumpstart your metabolism";
  if (hour < 14) return "Stay hydrated for peak focus";
  if (hour < 17) return "Beat the afternoon slump";
  if (hour < 20) return "Rehydrate from the day";
  return "Prepare for recovery sleep";
};

// ============================================================================
// FEEDBACK ENGINE - Behavior reactive, explainable, and actionable guidance
// ============================================================================
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const FEEDBACK_STATUS = {
  DAY_START: 'day_start',
  NO_LOG: 'no_log',
  GOAL: 'goal',
  BEHIND: 'behind',
  RHYTHM: 'rhythm',
  LOW_LOGS: 'low_logs',
  AHEAD: 'ahead',
  STEADY: 'steady',
};

const normalizeHour = (hour) => {
  if (!Number.isFinite(hour)) return null;
  return clamp(Math.round(hour), 0, 23);
};

const getDayProgress = (hour, wakeHour, sleepHour) => {
  const safeHour = normalizeHour(hour);
  const safeWake = normalizeHour(wakeHour);
  const safeSleep = normalizeHour(sleepHour);

  if (!Number.isFinite(safeHour) || !Number.isFinite(safeWake) || !Number.isFinite(safeSleep)) {
    return 0;
  }

  const normalizedSleep = safeSleep <= safeWake ? safeSleep + 24 : safeSleep;
  const normalizedHour = safeHour < safeWake ? safeHour + 24 : safeHour;
  const span = normalizedSleep - safeWake;

  if (span <= 0) return 0;
  if (normalizedHour <= safeWake) return 0;
  if (normalizedHour >= normalizedSleep) return 1;

  return (normalizedHour - safeWake) / span;
};

const sumTodayEvents = (events = []) => {
  if (!Array.isArray(events) || events.length === 0) return 0;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  return events.reduce((total, event) => {
    const timestamp = typeof event?.timestamp === 'number' ? event.timestamp : Date.parse(event?.timestamp);
    if (!Number.isFinite(timestamp)) return total;
    if (timestamp < startOfDay || timestamp >= endOfDay) return total;
    const amount = Number(event?.amountMl) || 0;
    return total + amount;
  }, 0);
};

const analyzeTodayEvents = (events = []) => {
  if (!Array.isArray(events) || events.length === 0) {
    return { logCountToday: 0, largestGapMinutesToday: null };
  }
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  const timestamps = events
    .map((event) => (typeof event?.timestamp === 'number' ? event.timestamp : Date.parse(event?.timestamp)))
    .filter((value) => Number.isFinite(value) && value >= startOfDay && value < endOfDay)
    .sort((a, b) => a - b);

  if (timestamps.length === 0) {
    return { logCountToday: 0, largestGapMinutesToday: null };
  }

  let largestGapMinutesToday = 0;
  for (let i = 1; i < timestamps.length; i += 1) {
    const gapMinutes = (timestamps[i] - timestamps[i - 1]) / (1000 * 60);
    if (gapMinutes > largestGapMinutesToday) largestGapMinutesToday = gapMinutes;
  }

  const gapSinceLast = (now.getTime() - timestamps[timestamps.length - 1]) / (1000 * 60);
  if (gapSinceLast > largestGapMinutesToday) largestGapMinutesToday = gapSinceLast;

  return {
    logCountToday: timestamps.length,
    largestGapMinutesToday,
  };
};

const getLastLogTimestampToday = (events = []) => {
  if (!Array.isArray(events) || events.length === 0) return null;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  const timestamps = events
    .map((event) => (typeof event?.timestamp === 'number' ? event.timestamp : Date.parse(event?.timestamp)))
    .filter((value) => Number.isFinite(value) && value >= startOfDay && value < endOfDay);
  if (timestamps.length === 0) return null;
  return Math.max(...timestamps);
};

const getLastLogTimestamp = (events = [], lastLoggedAt) => {
  if (lastLoggedAt) {
    const parsed = typeof lastLoggedAt === 'number' ? lastLoggedAt : Date.parse(lastLoggedAt);
    if (Number.isFinite(parsed)) return parsed;
  }

  if (!Array.isArray(events) || events.length === 0) return null;
  const timestamps = events
    .map((event) => (typeof event?.timestamp === 'number' ? event.timestamp : Date.parse(event?.timestamp)))
    .filter((value) => Number.isFinite(value));
  if (timestamps.length === 0) return null;
  return Math.max(...timestamps);
};

const formatTimeAgo = (minutesAgo) => {
  if (!Number.isFinite(minutesAgo)) return 'unknown';
  if (minutesAgo < 60) return `${Math.round(minutesAgo)} min ago`;
  const hours = Math.round(minutesAgo / 60);
  return `${hours}h ago`;
};

const applyRhythmPenalty = (metrics, lastLogMinutes, largestGapMinutesToday, logCountToday, dayProgress) => {
  let rhythmFactor = 1;
  const hasLastLog = Number.isFinite(lastLogMinutes);

  if (hasLastLog) {
    if (lastLogMinutes > 180) rhythmFactor = Math.min(rhythmFactor, 0.75);
    else if (lastLogMinutes > 120) rhythmFactor = Math.min(rhythmFactor, 0.85);
    else if (lastLogMinutes > 60) rhythmFactor = Math.min(rhythmFactor, 0.95);
  }

  if (Number.isFinite(largestGapMinutesToday) && largestGapMinutesToday > 150) {
    rhythmFactor = Math.min(rhythmFactor, 0.9);
  }

  if (Number.isFinite(dayProgress) && dayProgress > 0.5 && logCountToday < 3) {
    rhythmFactor = Math.min(rhythmFactor, 0.9);
  }

  if (rhythmFactor === 1) return metrics;

  return {
    ...metrics,
    focus: Math.round(metrics.focus * rhythmFactor),
    clarity: Math.round(metrics.clarity * rhythmFactor),
    stressRelief: Math.round(metrics.stressRelief * rhythmFactor),
  };
};

const applyOverhydrationPenalty = (metrics, percentage, dayProgress) => {
  if (percentage <= 110) return metrics;

  const earlyDay = Number.isFinite(dayProgress) && dayProgress < 0.7;
  const factor = earlyDay ? 0.85 : 0.95;

  return {
    ...metrics,
    clarity: Math.round(metrics.clarity * factor),
    focus: Math.round(metrics.focus * factor),
    stressRelief: Math.round(metrics.stressRelief * factor),
  };
};

const calculateWellnessScore = (metrics, feedbackStatus) => {
  const wellness =
    metrics.energy * 0.25 +
    metrics.clarity * 0.2 +
    metrics.focus * 0.2 +
    metrics.mood * 0.15 +
    metrics.stressRelief * 0.1 +
    metrics.performance * 0.1;

  const behaviorPenalty =
    feedbackStatus === FEEDBACK_STATUS.BEHIND
      ? 0.9
      : feedbackStatus === FEEDBACK_STATUS.NO_LOG
        ? 0.85
        : 1;

  return Math.round(clamp(wellness * behaviorPenalty, 0, 100));
};

const getFeedbackState = ({
  percentage,
  currentMl,
  goalMl,
  dayProgress,
  lastLogMinutes,
  todayEventTotal,
  logCountToday,
  largestGapMinutesToday,
  usesEventSource,
  yesterdayMl,
}) => {
  const expectedMl = Math.round(goalMl * dayProgress);
  const paceDelta = currentMl - expectedMl;
  const hasLoggedToday = usesEventSource ? todayEventTotal > 0 : currentMl > 0;
  const isGoalMet = percentage >= 100;
  const isBehind = paceDelta < -150;
  const isAhead = paceDelta > 200;

  let title = 'Steady progress';
  let reason = `You are ${Math.abs(paceDelta)}ml ${paceDelta < 0 ? 'behind' : 'ahead'} your pace target for this time.`;
  let nextStep = 'Keep sipping consistently to stay on track.';
  let icon = 'time';
  let accent = SEMANTIC.info.base;
  let suggestedMl = clamp(Math.round(Math.abs(paceDelta) / 2 / 50) * 50, 150, 400);
  let status = FEEDBACK_STATUS.STEADY;

  if (dayProgress === 0) {
    title = hasLoggedToday ? 'Early start' : 'Day just started';
    reason = hasLoggedToday
      ? 'You logged before your hydration window starts, which puts you ahead of pace.'
      : 'Hydration pacing starts at your wake time.';
    nextStep = hasLoggedToday
      ? 'Keep the rhythm steady once your day begins.'
      : 'Log your first glass after waking.';
    icon = 'sunny';
    accent = SEMANTIC.info.base;
    status = FEEDBACK_STATUS.DAY_START;
  } else if (!hasLoggedToday) {
    title = 'No water logged yet';
    reason = 'There are no hydration entries today, so your pace is behind by default.';
    nextStep = 'Log a quick 250ml to get momentum.';
    icon = 'water';
    accent = SEMANTIC.warning.base;
    suggestedMl = 250;
    status = FEEDBACK_STATUS.NO_LOG;
  } else if (isGoalMet) {
    title = 'Goal achieved';
    reason = 'You hit your daily target, which supports optimal energy and focus.';
    nextStep = 'Maintain with small sips if you feel thirsty.';
    icon = 'sparkles';
    accent = SEMANTIC.success.base;
    suggestedMl = 150;
    status = FEEDBACK_STATUS.GOAL;
  } else if (isBehind) {
    title = 'Falling behind pace';
    reason = `You are ${Math.abs(paceDelta)}ml behind your time-based target${lastLogMinutes ? `; last log was ${formatTimeAgo(lastLogMinutes)}.` : '.'}`;
    nextStep = `Add ${suggestedMl}ml now, then sip every 30–45 minutes.`;
    icon = 'alert-circle';
    accent = SEMANTIC.warning.base;
    status = FEEDBACK_STATUS.BEHIND;
  } else if (Number.isFinite(largestGapMinutesToday) && largestGapMinutesToday > 150) {
    title = 'Hydration rhythm slipping';
    reason = `Your longest gap today is ${Math.round(largestGapMinutesToday)} minutes, which slows consistency.`;
    nextStep = 'Set a short reminder and take a few small sips.';
    icon = 'pulse';
    accent = SEMANTIC.warning.base;
    status = FEEDBACK_STATUS.RHYTHM;
  } else if (Number.isFinite(dayProgress) && dayProgress > 0.5 && logCountToday < 3) {
    title = 'Too few logs today';
    reason = 'Your hydration is clustered instead of spaced across the day.';
    nextStep = `Log ${suggestedMl}ml now and aim for 2 more logs before evening.`;
    icon = 'time';
    accent = SEMANTIC.warning.base;
    status = FEEDBACK_STATUS.LOW_LOGS;
  } else if (isAhead) {
    title = 'Ahead of schedule';
    reason = `You are ${paceDelta}ml ahead of your time-based target.`;
    nextStep = 'Great pacing—keep the rhythm steady.';
    icon = 'rocket';
    accent = SEMANTIC.success.base;
    suggestedMl = 200;
    status = FEEDBACK_STATUS.AHEAD;
  }

  if (Number.isFinite(yesterdayMl)) {
    const yesterdaySoFar = Math.round(yesterdayMl * dayProgress);
    const trendDelta = currentMl - yesterdaySoFar;
    if (Math.abs(trendDelta) >= 200) {
      const trendLabel = trendDelta > 0 ? 'up' : 'down';
      reason += ` You are ${Math.abs(trendDelta)}ml ${trendLabel} vs yesterday at this time.`;
    }
  }

  return {
    status,
    title,
    reason,
    nextStep,
    icon,
    accent,
    suggestedMl,
    expectedMl,
    paceDelta,
  };
};

// ============================================================================
// CONFETTI CELEBRATION SYSTEM
// ============================================================================
const ConfettiParticle = ({ delay = 0 }) => {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 150;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 400,
        duration: 2500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: randomX,
        duration: 2500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 360,
        duration: 2500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const colors = ['#60A5FA', '#3B82F6', '#2563EB', '#93C5FD', '#BFDBFE'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          transform: [{ translateY }, { translateX }, { rotate: rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }],
          opacity,
        },
      ]}
    />
  );
};

// ============================================================================
// ANIMATED WAVE PROGRESS - Premium liquid visualization
// ============================================================================

const WaveProgress = ({ percentage, size = 140 }) => {
  const waveAnim = useRef(new Animated.Value(0)).current;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const normalizedPercentage = clamp(percentage, 0, 100);

  useEffect(() => {
    // Wave animation
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // Fill animation
    Animated.spring(fillAnim, {
      toValue: percentage,
      tension: 20,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const waveTranslate = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size],
  });

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [size, 0],
  });

  const getWaveColor = () => {
    if (normalizedPercentage >= 100) return ['#10B981', '#059669'];
    if (normalizedPercentage >= 75) return ['#2563EB', '#1D4ED8'];
    if (normalizedPercentage >= 50) return ['#3B82F6', '#2563EB'];
    if (normalizedPercentage >= 25) return ['#60A5FA', '#3B82F6'];
    return ['#8594cfff', '#60A5FA'];
  };

  const [color1, color2] = getWaveColor();

  return (
    <View style={[styles.waveShadowWrapper, { width: size, height: size }]}>
    <View style={[styles.waveClippingContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={color1} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={color2} stopOpacity="1" />
          </SvgGradient>
          <ClipPath id="waveClip">
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 4}
            />
          </ClipPath>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill={`${SEMANTIC.info.base}0D`}
          stroke={`${SEMANTIC.info.base}1A`}
          strokeWidth="3"
        />

        {/* Animated wave fill */}
        <AnimatedRect
          x={0}
          y={fillHeight}
          width={size}
          height={size}
          fill="url(#waveGradient)"
          clipPath="url(#waveClip)"
        />

        {/* Glow overlay */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="2"
        />
      </Svg>

      {/* Percentage overlay */}
      <View style={styles.waveTextOverlay}>
        <Text style={styles.wavePercentage}>{Math.round(percentage)}%</Text>
        <Text style={styles.waveLabel}>
          {percentage >= 100 ? '🎉 Goal!' : percentage >= 50 ? 'On Track' : 'Keep Going'}
        </Text>
      </View>
    </View>
    </View>
  );
};

// ============================================================================
// HEALTH METRIC INDICATOR - Premium gradient ring with score
// ============================================================================

const HealthMetric = ({ icon, label, score, color, gradientColors, size = 70 }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(progressAnim, {
        toValue: score,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }),
    ]).start();
  }, [score]);

  const getStatusIcon = () => {
    if (score >= 80) return 'sparkles';
    if (score >= 60) return 'fitness';
    if (score >= 40) return 'thumbs-up';
    return 'water';
  };

  const getStatusColor = () => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return '#F59E0B';
    return '#94A3B8';
  };

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <Animated.View style={[styles.healthMetric, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.metricRing}>
        <Svg width={size} height={size}>
          <Defs>
            <SvgGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="1" />
            </SvgGradient>
          </Defs>

          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`${color}1A`}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Progress ring */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#gradient-${label})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>

        {/* Center content */}
        <View style={styles.metricCenter}>
          <Ionicons name={getStatusIcon()} size={18} color={getStatusColor()} />
          <Text style={[styles.metricScore, { color }]}>{score}%</Text>
        </View>
      </View>

      <Text style={styles.metricLabel}>{label}</Text>
    </Animated.View>
  );
};

// ============================================================================
// WELLNESS SCORE CARD - Overall health impact
// ============================================================================

const WellnessScoreCard = ({ score, compact = false }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const getScoreStatus = () => {
    if (score >= 90) return { icon: 'star', text: 'Exceptional', colors: ['#10B981', '#059669'] };
    if (score >= 75) return { icon: 'diamond', text: 'Excellent', colors: ['#3B82F6', '#2563EB'] };
    if (score >= 60) return { icon: 'sparkles', text: 'Good', colors: ['#8B5CF6', '#7C3AED'] };
    if (score >= 40) return { icon: 'leaf', text: 'Fair', colors: ['#F59E0B', '#D97706'] };
    return { icon: 'water', text: 'Needs Attention', colors: ['#EF4444', '#DC2626'] };
  };

  const status = getScoreStatus();

  return (
    <LinearGradient
      colors={status.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wellnessCard, compact && styles.wellnessCardCompact]}
    >
      <Animated.View style={[styles.wellnessGlow, { opacity: glowOpacity }]} />

      <View style={styles.wellnessContent}>
        <View style={styles.wellnessIconContainer}>
          <Ionicons name={status.icon} size={48} color="rgba(255, 255, 255, 0.9)" />
        </View>
        <View style={styles.wellnessInfo}>
          <Text style={styles.wellnessScore}>{score}</Text>
          <Text style={styles.wellnessLabel}>Wellness Score</Text>
          <Text style={styles.wellnessStatus}>{status.text}</Text>
        </View>
      </View>

      <Text style={styles.wellnessDescription}>
        Your hydration is {status.text.toLowerCase()} impacting your overall health and mental clarity
      </Text>
    </LinearGradient>
  );
};

// ============================================================================
// STREAK COUNTER - Premium fire effect
// ============================================================================

const StreakCounter = ({ streak }) => {
  const flameAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (streak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [streak]);

  const flameScale = flameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const flameOpacity = flameAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  if (streak === 0) return null;

  return (
    <LinearGradient
      colors={['#FEF3C7', '#FDE68A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.streakCard}
    >
      <Animated.View
        style={[
          styles.streakFlame,
          {
            transform: [{ scale: flameScale }],
            opacity: flameOpacity,
          },
        ]}
      >
        <Text style={styles.streakEmoji}>🔥</Text>
      </Animated.View>

      <View style={styles.streakInfo}>
        <Text style={styles.streakCount}>{streak}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
        <Text style={styles.streakMessage}>
          {streak >= 30 ? 'Legendary!' : streak >= 14 ? 'Amazing!' : streak >= 7 ? 'Great job!' : 'Keep it up!'}
        </Text>
      </View>
    </LinearGradient>
  );
};

// ============================================================================
// QUICK STATS - Health benefits visualization
// ============================================================================

const QuickStatCard = ({ icon, value, label, color, benefit }) => {
  return (
    <View style={styles.quickStatCard}>
      <LinearGradient
        colors={[`${color}20`, `${color}10`]}
        style={styles.quickStatGradient}
      >
        <View style={[styles.quickStatIcon, { backgroundColor: `${color}30` }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <View style={styles.quickStatContent}>
          <Text style={[styles.quickStatValue, { color }]}>{value}</Text>
          <Text style={styles.quickStatLabel}>{label}</Text>
          <Text style={styles.quickStatBenefit}>{benefit}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HydrationWellnessDashboard({
  currentIntake = 0,
  dailyGoal = 2.0,
  streak = 0,
  intakeEvents = [],
  lastLoggedAt,
  yesterdayIntake,
  wakeHour = 7,
  sleepHour = 22,
  celebratedTodayKey,
  onCelebrate,
  onOpenFullTracker,
}) {
  const safeCurrentIntake = parseLiters(currentIntake);
  const safeGoal = parseGoal(dailyGoal, 2.0, 0.5, 10);
  const now = new Date();
  const dayProgress = getDayProgress(now.getHours(), wakeHour, sleepHour);
  const todayEventTotal = sumTodayEvents(intakeEvents);
  const currentIntakeMl = Math.round(safeCurrentIntake * 1000);
  const usesEventSource = todayEventTotal > 0;
  const derivedTodayMl = usesEventSource
    ? Math.max(todayEventTotal, currentIntakeMl)
    : currentIntakeMl;
  const currentMl = derivedTodayMl;
  const goalMl = Math.round(safeGoal * 1000);
  const percentage = Math.min(calculatePercentage(currentMl, goalMl, 120), 120);
  const baseMetrics = calculateHealthImpact(percentage);

  const smartAdvice = getSmartAdvice(percentage);
  const remaining = Math.max(goalMl - currentMl, 0);
  const { logCountToday, largestGapMinutesToday } = analyzeTodayEvents(intakeEvents);
  const lastLogTimestamp = getLastLogTimestampToday(intakeEvents) ?? getLastLogTimestamp(intakeEvents, lastLoggedAt);
  const lastLogMinutes = lastLogTimestamp
    ? (now.getTime() - lastLogTimestamp) / (1000 * 60)
    : null;
  const yesterdayMl = Number.isFinite(yesterdayIntake) ? Math.round(yesterdayIntake * 1000) : null;
  const feedback = getFeedbackState({
    percentage,
    currentMl,
    goalMl,
    dayProgress,
    lastLogMinutes,
    todayEventTotal,
    logCountToday,
    largestGapMinutesToday,
    usesEventSource,
    yesterdayMl,
  });

  const rhythmAdjustedMetrics = applyRhythmPenalty(
    baseMetrics,
    lastLogMinutes,
    largestGapMinutesToday,
    logCountToday,
    dayProgress
  );
  const overhydrationAdjustedMetrics = applyOverhydrationPenalty(
    rhythmAdjustedMetrics,
    percentage,
    dayProgress
  );
  const wellnessScore = calculateWellnessScore(overhydrationAdjustedMetrics, feedback.status);
  const healthMetrics = {
    ...overhydrationAdjustedMetrics,
    wellness: wellnessScore,
  };
  
  const [showConfetti, setShowConfetti] = useState(false);
  const [metricDeltaNote, setMetricDeltaNote] = useState(null);
  const [activeSection, setActiveSection] = useState('physical');
  const [showInsights, setShowInsights] = useState(false);
  const isCompact = SCREEN_WIDTH < 360;
  const previousMetricsRef = useRef(null);
  const previousPercentageRef = useRef(percentage);
  const lastSnapshotRef = useRef(null);
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  // PRODUCTION FIX: Celebration logic - no state in deps to prevent infinite loops
  // Uses ref-based guard (previousPercentageRef) + prop-based guard (celebratedTodayKey)
  useEffect(() => {
    const crossedGoal = previousPercentageRef.current < 100 && percentage >= 100;
    const alreadyCelebrated = celebratedTodayKey === todayKey;

    // Only celebrate if: (1) crossed 100% threshold, AND (2) haven't celebrated today
    if (crossedGoal && !alreadyCelebrated) {
      setShowConfetti(true);
      if (onCelebrate) {
        onCelebrate(todayKey); // Notify parent to persist celebration
      }
      setTimeout(() => setShowConfetti(false), 4000);
    }

    previousPercentageRef.current = percentage;
  }, [percentage, celebratedTodayKey, onCelebrate, todayKey]);

  useEffect(() => {
    if (streak < 0 || streak > 400) {
      console.warn('Invalid hydration streak');
    }
  }, [streak]);

  useEffect(() => {
    const nowTime = Date.now();
    const snapshot = lastSnapshotRef.current;
    const shouldCompare =
      !snapshot ||
      (Number.isFinite(lastLogTimestamp) && lastLogTimestamp !== snapshot.lastLogTimestamp) ||
      nowTime - snapshot.timestamp >= 30 * 60 * 1000;

    if (!shouldCompare) return;

    const previous = previousMetricsRef.current;
    if (previous) {
      const focusDelta = healthMetrics.focus - previous.focus;
      const clarityDelta = healthMetrics.clarity - previous.clarity;
      const stressDelta = healthMetrics.stressRelief - previous.stressRelief;
      let note = null;

      if (focusDelta < -5 && lastLogMinutes > 120) {
        note = 'Long gap since last hydration reduced focus.';
      } else if (clarityDelta < -5 && percentage > 110) {
        note = 'Early heavy intake can reduce mental clarity.';
      } else if (stressDelta < -5 && feedback.paceDelta < -200) {
        note = 'Falling behind pace softened stress resilience.';
      }

      setMetricDeltaNote(note);
    }

    previousMetricsRef.current = healthMetrics;
    lastSnapshotRef.current = {
      timestamp: nowTime,
      lastLogTimestamp,
    };
  }, [healthMetrics, lastLogMinutes, lastLogTimestamp, percentage, feedback.paceDelta]);

  const handleOpenFull = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onOpenFullTracker) {
      onOpenFullTracker();
    }
  };

  return (
    <View
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={SURFACES.gradient.blue}
            style={styles.headerIconContainer}
          >
            <Ionicons name="water" size={24} color="#FFF" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Hydration Wellness</Text>
            <Text style={styles.headerSubtitle}>Health & Mind Connection</Text>
          </View>
        </View>
      </View>

      {/* Main Progress & Wellness Score */}
      <GlassCard padding="lg" style={styles.mainCard}>
        <View style={[styles.mainContent, isCompact && styles.mainContentCompact]}>
          <WaveProgress percentage={percentage} size={isCompact ? 120 : 140} />

          <View style={styles.mainStats}>
            <View style={styles.statRow}>
              <Text style={styles.mainValue}>{currentMl}ml</Text>
              <Text style={styles.mainLabel}>/ {goalMl}ml</Text>
            </View>
            <Text style={styles.remainingText}>
              {remaining > 0 ? `${remaining}ml to goal` : '🎉 Goal reached!'}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* Behavior Feedback */}
      <GlassCard padding="md" style={styles.feedbackCard}>
        <View style={styles.feedbackHeader}>
          <View style={[styles.feedbackIcon, { backgroundColor: `${feedback.accent}20` }]}>
            <Ionicons name={feedback.icon} size={20} color={feedback.accent} />
          </View>
          <View style={styles.feedbackTitleBlock}>
            <Text style={styles.feedbackTitle}>{feedback.title}</Text>
            <Text style={styles.feedbackSubtitle}>Explains the why and next step</Text>
          </View>
        </View>

        <View style={styles.feedbackContent}>
          {isCompact ? (
            <View style={styles.feedbackCompactBlock}>
              <Text style={styles.feedbackInlineText}>
                <Text style={styles.feedbackInlineLabel}>Why: </Text>
                {feedback.reason}
              </Text>
              <Text style={styles.feedbackInlineText}>
                <Text style={styles.feedbackInlineLabel}>Next: </Text>
                {feedback.nextStep}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>Why</Text>
                <Text style={styles.feedbackValue}>{feedback.reason}</Text>
              </View>
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>Next</Text>
                <Text style={styles.feedbackValue}>{feedback.nextStep}</Text>
              </View>
            </>
          )}
          <View style={styles.pacingRow}>
            <View style={styles.pacingHeader}>
              <Text style={styles.pacingLabel}>Pace check</Text>
              <Text style={styles.pacingValue}>
                {currentMl}ml / {feedback.expectedMl}ml by now
              </Text>
            </View>
            <View style={styles.pacingTrack}>
              <View style={[styles.pacingFill, { width: `${clamp(calculatePercentage(currentMl, feedback.expectedMl || 1, 100), 0, 100)}%`, backgroundColor: feedback.accent }]} />
              <View style={[styles.pacingMarker, { left: `${clamp(dayProgress * 100, 0, 100)}%` }]} />
            </View>
          </View>
          <Text style={styles.smartAdviceText}>{smartAdvice}</Text>
          {metricDeltaNote && (
            <Text style={styles.metricDeltaText}>{metricDeltaNote}</Text>
          )}
          {todayEventTotal > 0 && (
            <Text style={styles.logMetaText}>
              {todayEventTotal}ml logged today {lastLogMinutes ? `• last log ${formatTimeAgo(lastLogMinutes)}` : ''}
            </Text>
          )}
        </View>
      </GlassCard>

      <View style={styles.sectionDivider} />

      {/* Wellness Score */}
      <WellnessScoreCard score={healthMetrics.wellness} compact={isCompact} />

      {/* Streak */}
      {streak > 0 && <StreakCounter streak={streak} />}

      <View style={styles.sectionDivider} />

      {/* Health Impact Indicators (Segmented) */}
      <GlassCard padding="md" style={styles.impactCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="fitness" size={20} color={BRAND.primary} />
            <Text style={styles.sectionTitle}>Health Impact</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Switch between body and mind</Text>
        </View>

        <View style={[styles.segmentedToggle, isCompact && styles.segmentedToggleCompact]}>
          <TouchableOpacity
            onPress={() => setActiveSection('physical')}
            style={styles.segmentedButton}
            activeOpacity={0.8}
          >
            {activeSection === 'physical' ? (
              <LinearGradient
                colors={['#FFFFFF', '#F4F7FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.segmentedPill, styles.segmentedPillActive]}
              >
                <Text style={[styles.segmentedText, styles.segmentedTextActive]}>
                  Physical
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.segmentedPill}>
                <Text style={styles.segmentedText}>Physical</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveSection('mental')}
            style={styles.segmentedButton}
            activeOpacity={0.8}
          >
            {activeSection === 'mental' ? (
              <LinearGradient
                colors={['#FFFFFF', '#F4F7FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.segmentedPill, styles.segmentedPillActive]}
              >
                <Text style={[styles.segmentedText, styles.segmentedTextActive]}>
                  Mental
                </Text>
              </LinearGradient>
            ) : (
              <View style={styles.segmentedPill}>
                <Text style={styles.segmentedText}>Mental</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {activeSection === 'physical' ? (
          <View style={styles.metricsGrid}>
            <HealthMetric
              icon="flash"
              label="Energy"
              score={healthMetrics.energy}
              color="#F59E0B"
              gradientColors={['#F59E0B', '#D97706']}
              size={isCompact ? 60 : 70}
            />
            <HealthMetric
              icon="diamond"
              label="Skin"
              score={healthMetrics.skin}
              color="#EC4899"
              gradientColors={['#EC4899', '#DB2777']}
              size={isCompact ? 60 : 70}
            />
            <HealthMetric
              icon="barbell"
              label="Performance"
              score={healthMetrics.performance}
              color="#10B981"
              gradientColors={['#10B981', '#059669']}
              size={isCompact ? 60 : 70}
            />
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <HealthMetric
              icon="locate"
              label="Focus"
              score={healthMetrics.focus}
              color="#3B82F6"
              gradientColors={['#3B82F6', '#2563EB']}
              size={isCompact ? 60 : 70}
            />
            <HealthMetric
              icon="sparkles"
              label="Clarity"
              score={healthMetrics.clarity}
              color="#8B5CF6"
              gradientColors={['#8B5CF6', '#7C3AED']}
              size={isCompact ? 60 : 70}
            />
            <HealthMetric
              icon="happy"
              label="Mood"
              score={healthMetrics.mood}
              color="#14B8A6"
              gradientColors={['#14B8A6', '#0D9488']}
              size={isCompact ? 60 : 70}
            />
          </View>
        )}
      </GlassCard>

      {/* Health Benefits Quick Stats */}
      <View style={styles.quickStatsSection}>
        <TouchableOpacity
          style={styles.insightsToggle}
          onPress={() => setShowInsights((prev) => !prev)}
          activeOpacity={0.8}
        >
          <View style={styles.sectionTitleRow}>
            <Ionicons name="star" size={18} color={BRAND.primary} />
            <Text style={styles.sectionTitle}>Today&apos;s Impact</Text>
          </View>
          <Ionicons
            name={showInsights ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={TEXT.secondary}
          />
        </TouchableOpacity>

        {showInsights && (
          <>
            <QuickStatCard
              icon="flash"
              value={`${healthMetrics.energy}%`}
              label="Energy Boost"
              color="#F59E0B"
              benefit="Optimal cellular function"
            />

            <QuickStatCard
              icon="bulb"
              value={`${healthMetrics.clarity}%`}
              label="Mental Clarity"
              color="#8B5CF6"
              benefit="Enhanced cognitive function"
            />

            <QuickStatCard
              icon="leaf"
              value={`${healthMetrics.stressRelief}%`}
              label="Stress Management"
              color="#14B8A6"
              benefit="Better stress response"
            />
          </>
        )}
      </View>

      {/* Open Full Tracker Button */}
      <TouchableOpacity
        style={styles.fullTrackerButton}
        onPress={handleOpenFull}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={SURFACES.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fullTrackerGradient}
        >
          <Ionicons name="water" size={24} color="#FFF" />
          <Text style={styles.fullTrackerText}>Open Full Tracker</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Confetti Overlay */}
      {showConfetti && (
        <View style={styles.confettiContainer} pointerEvents="none">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 40} />
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    // Removed flex: 1 to allow natural height in dashboard
    width: '100%',
  },

  // Header
  header: {
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[1],
  },

  // Main Card
  mainCard: {
    marginBottom: SPACING[3],
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
  },
  mainContentCompact: {
    gap: SPACING[3],
  },
  mainStats: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING[1],
  },
  mainValue: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
  },
  mainLabel: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.muted,
  },
  remainingText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[1],
    marginBottom: SPACING[3],
  },

  // Mini Quick Add
  // (Quick add removed from dashboard to reduce overload)

  // Wave Progress
  waveShadowWrapper: {
    // Outer container for shadow only
    ...SHADOWS.lg,
    borderRadius: RADIUS.full,
  },
  waveClippingContainer: {
    // Inner container for masking
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    backgroundColor: SURFACES.card.primary, // Ensure background for shadow to cast
  },
  waveTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wavePercentage: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  waveLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
    marginTop: SPACING[1],
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Wellness Score Card
  wellnessCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: 0,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  wellnessCardCompact: {
    padding: SPACING[4],
  },
  wellnessGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  wellnessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[3],
  },
  wellnessInfo: {
    flex: 1,
  },
  wellnessScore: {
    fontSize: 56,
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.white,
    letterSpacing: -2,
  },
  wellnessLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  wellnessStatus: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
    marginTop: SPACING[1],
  },
  wellnessDescription: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },

  // Feedback Card
  feedbackCard: {
    marginBottom: SPACING[3],
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  feedbackIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackTitleBlock: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  feedbackSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: SPACING[1],
  },
  feedbackContent: {
    gap: SPACING[3],
  },
  feedbackCompactBlock: {
    gap: SPACING[2],
  },
  feedbackInlineText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  feedbackInlineLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  feedbackLabel: {
    width: 48,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  feedbackValue: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    lineHeight: 20,
  },
  pacingRow: {
    gap: SPACING[2],
  },
  pacingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pacingLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.muted,
  },
  pacingValue: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  pacingTrack: {
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
    overflow: 'hidden',
  },
  pacingFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  pacingMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: TEXT.muted,
  },
  smartAdviceText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  metricDeltaText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  logMetaText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },

  // Streak Counter
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
    marginBottom: 0,
    ...SHADOWS.md,
  },
  streakFlame: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(251, 146, 60, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakInfo: {
    flex: 1,
  },
  streakCount: {
    fontSize: TYPOGRAPHY.size['3xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: '#D97706',
  },
  streakLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakMessage: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#B45309',
    marginTop: SPACING[1],
  },
  wellnessIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Headers
  sectionHeader: {
    marginBottom: SPACING[4],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[1],
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },
  segmentedToggle: {
    flexDirection: 'row',
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.full,
    padding: SPACING[1],
    gap: SPACING[1],
    marginBottom: SPACING[3],
  },
  segmentedToggleCompact: {
    marginBottom: SPACING[2],
  },
  segmentedButton: {
    flex: 1,
  },
  segmentedPill: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: RADIUS.full,
  },
  segmentedPillActive: {
    ...SHADOWS.sm,
  },
  segmentedText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  segmentedTextActive: {
    color: TEXT.primary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    marginVertical: SPACING[2],
  },
  impactCard: {
    marginBottom: SPACING[3],
  },

  // Health Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING[3],
  },
  healthMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricRing: {
    position: 'relative',
    marginBottom: SPACING[2],
  },
  metricCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[1],
  },
  metricScore: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    textAlign: 'center',
  },

  // Quick Stats
  quickStatsSection: {
    marginTop: SPACING[2],
    gap: SPACING[2],
  },
  insightsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  quickStatCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  quickStatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: SPACING[4],
  },
  quickStatIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatContent: {
    flex: 1,
  },
  quickStatValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  quickStatLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    marginTop: SPACING[1],
  },
  quickStatBenefit: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: SPACING[1],
  },

  // Full Tracker Button
  fullTrackerButton: {
    marginTop: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  fullTrackerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[6],
  },
  fullTrackerText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },

  // Confetti
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  confettiParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 0,
  },
});
