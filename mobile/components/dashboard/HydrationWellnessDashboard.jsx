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

import React, { useRef, useEffect, useMemo, useState } from 'react';
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
import LottieView from 'lottie-react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Circle,
  Path,
  Rect,
  ClipPath,
} from 'react-native-svg';

// Lottie Animation Assets
const LOTTIE_ANIMATIONS = {
  celebration: require('../../assets/animations/celebration.json'),
  success: require('../../assets/animations/success.json'),
  streak: require('../../assets/animations/streak.json'),
};

import GlassCard from './GlassCard';
import {
  TEXT,
  SEMANTIC,
  SEMANTIC_ACTIONS,
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
// HOURLY INTAKE CHART - Real data visualization
// ============================================================================

/**
 * Build hourly intake data from today's water logs
 * Shows actual logged amounts per hour for bar chart
 */
const buildHourlyIntake = (events = []) => {
  const hourlyData = Array(24).fill(0).map((_, hour) => ({
    hour,
    amount: 0,
    label: hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`,
  }));

  if (!Array.isArray(events) || events.length === 0) {
    return hourlyData;
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  events.forEach((event) => {
    const timestamp = typeof event?.timestamp === 'number' ? event.timestamp : Date.parse(event?.timestamp);
    if (!Number.isFinite(timestamp) || timestamp < startOfDay || timestamp >= endOfDay) return;

    const eventDate = new Date(timestamp);
    const hour = eventDate.getHours();
    const amount = Number(event?.rawAmountMl ?? event?.amountMl) || 0;

    if (hour >= 0 && hour < 24 && amount > 0) {
      hourlyData[hour].amount += amount;
    }
  });

  return hourlyData;
};

// ============================================================================
// BEVERAGE MIX INSIGHTS
// ============================================================================

const BEVERAGE_PROFILE = {
  water: {
    label: 'Water',
    color: '#3B82F6',
  },
  coffee: {
    label: 'Coffee',
    color: '#92400E',
  },
  tea: {
    label: 'Tea',
    color: '#059669',
  },
  juice: {
    label: 'Juice',
    color: '#F59E0B',
  },
  milk: {
    label: 'Milk',
    color: '#FBBF24',
  },
  electrolyte: {
    label: 'Electrolyte',
    color: '#0EA5E9',
  },
  smoothie: {
    label: 'Smoothie',
    color: '#EC4899',
  },
  alcohol: {
    label: 'Alcohol',
    color: '#B45309',
  },
};

const normalizeBeverageType = (type) => (type && BEVERAGE_PROFILE[type] ? type : 'water');

const buildBeverageSummary = (events = []) => {
  if (!Array.isArray(events) || events.length === 0) {
    return { totalMl: 0, totals: {}, sorted: [] };
  }

  const totals = {};
  let totalMl = 0;

  events.forEach((event) => {
    const amount = Number(event?.rawAmountMl ?? event?.amountMl) || 0;
    if (amount <= 0) return;
    const type = normalizeBeverageType(event?.type);
    totals[type] = (totals[type] || 0) + amount;
    totalMl += amount;
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return { totalMl, totals, sorted };
};

const getBeverageInsight = (summary) => {
  if (!summary || summary.totalMl <= 0) return null;

  const { totalMl, totals, sorted } = summary;
  const topType = sorted[0]?.[0] || 'water';
  const topShare = sorted[0] ? sorted[0][1] / totalMl : 0;

  const caffeinatedMl = (totals.coffee || 0) + (totals.tea || 0);
  const juiceMl = totals.juice || 0;
  const electrolyteMl = totals.electrolyte || 0;
  const smoothieMl = totals.smoothie || 0;
  const alcoholMl = totals.alcohol || 0;

  let note = null;
  if (alcoholMl / totalMl >= 0.2) {
    note = 'Alcohol shows up today. A glass of water before bed can help tomorrow.';
  } else if (caffeinatedMl / totalMl >= 0.5) {
    note = 'Caffeinated drinks dominate today. Add water to balance.';
  } else if (smoothieMl / totalMl >= 0.4) {
    note = 'Smoothies help, but water keeps hydration steady.';
  } else if (juiceMl / totalMl >= 0.4) {
    note = 'Juice contributes a lot today; it hydrates but can be high in sugar.';
  } else if (electrolyteMl / totalMl >= 0.4) {
    note = 'Electrolytes help after heavy sweat; water covers daily hydration.';
  } else if (topType === 'water' && topShare >= 0.5) {
    note = 'Water is your main base today, which supports steady hydration.';
  } else if (topShare >= 0.5) {
    note = `${BEVERAGE_PROFILE[topType].label} leads today. Consider mixing in more water.`;
  }

  const breakdown = sorted.slice(0, 4).map(([type, amount]) => ({
    type,
    label: BEVERAGE_PROFILE[type]?.label || 'Water',
    color: BEVERAGE_PROFILE[type]?.color || '#3B82F6',
    percent: Math.round((amount / totalMl) * 100),
  }));

  return {
    topType,
    breakdown,
    note,
  };
};

// ============================================================================
// SMART CONTEXT ENGINE - Time & Status based advice
// ============================================================================
const getSmartAdvice = (percentage) => {
  const hour = new Date().getHours();
  if (percentage >= 100) return "Goal met! You&apos;re fully optimized";
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

const getHydrationInsightCandidate = ({
  summary,
  feedbackStatus,
  logCountToday,
  largestGapMinutesToday,
}) => {
  if (!summary || summary.totalMl <= 0) return null;

  const { totalMl, totals } = summary;
  const caffeinatedMl = (totals.coffee || 0) + (totals.tea || 0);
  const alcoholMl = totals.alcohol || 0;
  const electrolyteMl = totals.electrolyte || 0;
  const smoothieMl = totals.smoothie || 0;

  if (alcoholMl / totalMl >= 0.2) {
    return 'Alcohol shows up today. A glass of water before bed can help tomorrow.';
  }
  if (caffeinatedMl / totalMl >= 0.5) {
    return 'Lots of coffee today; a bit of water later might feel good.';
  }
  if (electrolyteMl / totalMl >= 0.35) {
    return 'Electrolytes help after heavy sweat; keep water steady too.';
  }
  if (smoothieMl / totalMl >= 0.4) {
    return 'Smoothies help, but water keeps hydration steady.';
  }

  const steadyRhythm = [FEEDBACK_STATUS.STEADY, FEEDBACK_STATUS.AHEAD, FEEDBACK_STATUS.GOAL].includes(feedbackStatus)
    && logCountToday >= 3
    && (!Number.isFinite(largestGapMinutesToday) || largestGapMinutesToday <= 150);

  if (steadyRhythm) {
    return 'Steady hydration today; nice balance across the day.';
  }

  return null;
};

const getHydrationLeadMessage = (insight, feedbackStatus) => {
  if (insight) return insight;

  switch (feedbackStatus) {
    case FEEDBACK_STATUS.NO_LOG:
      return 'Your hydration day starts with one glass.';
    case FEEDBACK_STATUS.GOAL:
      return 'Hydration looks strong today. Keep it steady.';
    case FEEDBACK_STATUS.AHEAD:
      return 'You are ahead of pace. Small sips keep it smooth.';
    case FEEDBACK_STATUS.BEHIND:
      return 'A little water now can help you catch up.';
    case FEEDBACK_STATUS.RHYTHM:
      return 'Spacing drinks out helps hydration feel better.';
    case FEEDBACK_STATUS.LOW_LOGS:
      return 'A couple more drinks will smooth out your day.';
    default:
      return 'Steady pacing so far. Keep it consistent.';
  }
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
    title = 'Ready when you are';
    reason = 'Tap to log your first glass.';
    nextStep = '';
    icon = 'water-outline';
    accent = SEMANTIC.info.base;  // Neutral, not warning
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
// LOTTIE CELEBRATION OVERLAY - Premium goal celebration
// ============================================================================
const CelebrationOverlay = ({ visible, onComplete }) => {
  const lottieRef = useRef(null);

  useEffect(() => {
    if (visible && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.celebrationOverlay} pointerEvents="none">
      <LottieView
        ref={lottieRef}
        source={LOTTIE_ANIMATIONS.celebration}
        autoPlay
        loop={false}
        speed={1.2}
        onAnimationFinish={onComplete}
        style={styles.celebrationLottie}
      />
    </View>
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
    const waveLoop = Animated.loop(
      Animated.timing(waveAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    );
    waveLoop.start();

    Animated.spring(fillAnim, { toValue: percentage, tension: 20, friction: 7, useNativeDriver: false }).start();

    return () => waveLoop.stop();
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
    // Water blue progression matching hero card - Ultramarine, Prussian, Indigo
    if (normalizedPercentage >= 100) return ['#5B8DEE', '#3B6DD9']; // Bright Ultramarine - goal achieved!
    if (normalizedPercentage >= 75) return ['#4169E1', '#2E4A7D']; // Ultramarine → Prussian - almost there
    if (normalizedPercentage >= 50) return ['#6B8DD9', '#4169E1']; // Sky Ultramarine - good progress
    if (normalizedPercentage >= 25) return ['#87A8E8', '#6B8DD9']; // Misty Blue - building
    return ['#A8C4F5', '#87A8E8']; // Light Misty → Misty Blue - just started
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
        {normalizedPercentage >= 100 ? (
          <View style={styles.goalAchievedContainer}>
            <LottieView
              source={LOTTIE_ANIMATIONS.success}
              autoPlay
              loop={false}
              style={styles.goalSuccessLottie}
            />
            <Text style={styles.wavePercentageDone}>Done!</Text>
          </View>
        ) : (
          <>
            <Text style={styles.wavePercentage}>{Math.round(percentage)}%</Text>
            <Text style={styles.waveLabel}>
              {percentage >= 50 ? 'On Track' : percentage > 0 ? 'Building' : ''}
            </Text>
          </>
        )}
      </View>
    </View>
    </View>
  );
};

// ============================================================================
// HOURLY INTAKE BAR CHART - Real visualization of today's water intake
// ============================================================================

const HourlyIntakeChart = ({ hourlyData, maxAmount }) => {
  const currentHour = new Date().getHours();
  const barWidth = 12;
  const chartHeight = 80;
  const maxBarHeight = chartHeight - 20;

  // Find max for scaling (use at least 500ml for visible bars)
  const effectiveMax = Math.max(maxAmount || 500, 500);

  // Show hours from 6am to 11pm (waking hours)
  const visibleHours = hourlyData.slice(6, 23);

  return (
    <View style={styles.hourlyChartContainer}>
      <View style={styles.hourlyChartHeader}>
        <Ionicons name="bar-chart-outline" size={16} color={SEMANTIC.info.base} />
        <Text style={styles.hourlyChartTitle}>Today's Intake</Text>
      </View>

      <View style={[styles.hourlyChartBars, { height: chartHeight }]}>
        {visibleHours.map((hourData, index) => {
          const actualHour = hourData.hour;
          const barHeight = hourData.amount > 0
            ? Math.max(4, (hourData.amount / effectiveMax) * maxBarHeight)
            : 2;
          const isCurrentHour = actualHour === currentHour;
          const isPastHour = actualHour < currentHour;
          const hasIntake = hourData.amount > 0;

          return (
            <View key={actualHour} style={styles.hourlyBarColumn}>
              <View
                style={[
                  styles.hourlyBar,
                  {
                    height: barHeight,
                    backgroundColor: hasIntake
                      ? (isCurrentHour ? '#0EA5E9' : '#60A5FA')
                      : (isPastHour ? '#E2E8F0' : '#F1F5F9'),
                    borderRadius: 4,
                  },
                ]}
              />
              {(actualHour === 6 || actualHour === 12 || actualHour === 18 || actualHour === 22) && (
                <Text style={styles.hourlyLabel}>{hourData.label}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.hourlyChartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
          <Text style={styles.legendText}>Logged</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0EA5E9' }]} />
          <Text style={styles.legendText}>Current hour</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// WELLNESS SCORE CARD - Overall health impact
// ============================================================================

const WellnessScoreCard = ({ score, compact = false }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const getScoreStatus = () => {
    if (score >= 90) return { icon: 'star', text: 'Exceptional', colors: ['#10B981', '#059669'] };
    if (score >= 75) return { icon: 'diamond', text: 'Excellent', colors: ['#3B82F6', '#2563EB'] };
    if (score >= 60) return { icon: 'sparkles', text: 'Good', colors: ['#8B5CF6', '#7C3AED'] };
    if (score >= 40) return { icon: 'leaf', text: 'Fair', colors: ['#F59E0B', '#D97706'] };
    // Neutral state for Day 0 / low scores - not punishing, just starting
    if (score > 0) return { icon: 'leaf-outline', text: 'Building', colors: ['#6B7280', TEXT.secondary] };
    return { icon: 'water-outline', text: 'Ready', colors: ['#9CA3AF', '#6B7280'] };
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
          <Ionicons name={status.icon} size={32} color="rgba(255, 255, 255, 0.9)" />
        </View>
        <View style={styles.wellnessInfo}>
          <Text style={styles.wellnessScore}>{score}</Text>
          <Text style={styles.wellnessLabel}>Wellness Score</Text>
          <Text style={styles.wellnessStatus}>{status.text}</Text>
        </View>
      </View>

      <Text style={styles.wellnessDescription} numberOfLines={2}>
        Your hydration is {status.text.toLowerCase()} impacting your overall health and mental clarity
      </Text>
    </LinearGradient>
  );
};

// ============================================================================
// STREAK COUNTER - Premium Lottie fire effect
// ============================================================================

const StreakCounter = ({ streak }) => {
  const lottieRef = useRef(null);

  useEffect(() => {
    if (streak > 0 && lottieRef.current) {
      lottieRef.current.play();
    }
  }, [streak]);

  if (streak === 0) return null;

  const getStreakStatus = () => {
    if (streak >= 30) return { message: 'Legendary!', colors: ['#FEF3C7', '#FDE68A', '#F59E0B'] };
    if (streak >= 14) return { message: 'Amazing!', colors: ['#FEF3C7', '#FDE68A'] };
    if (streak >= 7) return { message: 'Great job!', colors: ['#FEF3C7', '#FDE68A'] };
    return { message: 'Keep it up!', colors: ['#FEF3C7', '#FDE68A'] };
  };

  const status = getStreakStatus();

  return (
    <LinearGradient
      colors={status.colors.slice(0, 2)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.streakCard}
    >
      <View style={styles.streakFlame}>
        <LottieView
          ref={lottieRef}
          source={LOTTIE_ANIMATIONS.streak}
          autoPlay
          loop
          speed={0.8}
          style={styles.streakLottie}
        />
      </View>

      <View style={styles.streakInfo}>
        <Text style={styles.streakCount}>{streak}</Text>
        <Text style={styles.streakLabel}>Day Streak</Text>
        <Text style={styles.streakMessage}>{status.message}</Text>
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
  onViewHistory, // Navigate to hydration history/insights
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
  const beverageSummary = useMemo(() => buildBeverageSummary(intakeEvents), [intakeEvents]);
  const beverageInsight = useMemo(() => getBeverageInsight(beverageSummary), [beverageSummary]);

  // Build hourly intake data for bar chart (REAL data)
  const hourlyIntakeData = useMemo(() => buildHourlyIntake(intakeEvents), [intakeEvents]);
  const maxHourlyAmount = useMemo(() =>
    Math.max(...hourlyIntakeData.map(h => h.amount), 0),
    [hourlyIntakeData]
  );

  const smartAdvice = getSmartAdvice(percentage);
  const remaining = Math.max(goalMl - currentMl, 0);
  const { logCountToday, largestGapMinutesToday } = analyzeTodayEvents(intakeEvents);
  const hasLoggedToday = logCountToday > 0;
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
  const insightCandidate = useMemo(() => getHydrationInsightCandidate({
    summary: beverageSummary,
    feedbackStatus: feedback.status,
    logCountToday,
    largestGapMinutesToday,
  }), [beverageSummary, feedback.status, logCountToday, largestGapMinutesToday]);

  const [showConfetti, setShowConfetti] = useState(false);
  const [dailyInsight, setDailyInsight] = useState(null);
  const isCompact = SCREEN_WIDTH < 360;
  const previousPercentageRef = useRef(percentage);
  const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const leadMessage = useMemo(
    () => getHydrationLeadMessage(dailyInsight, feedback.status),
    [dailyInsight, feedback.status]
  );

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
      const confettiTimer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(confettiTimer);
    }

    previousPercentageRef.current = percentage;
  }, [percentage, celebratedTodayKey, onCelebrate, todayKey]);

  useEffect(() => {
    if (streak < 0 || streak > 400) {
      console.warn('Invalid hydration streak');
    }
  }, [streak]);

  // FIX: Always use real-time insight from actual beverage data, no caching
  // This prevents stale tips like "Lots of coffee today" when no coffee was logged
  useEffect(() => {
    // Always use the freshly calculated insight from real beverage data
    setDailyInsight(insightCandidate);
  }, [insightCandidate]);

  const handleOpenFull = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onOpenFullTracker) {
      onOpenFullTracker();
    }
  };

  const handleViewHistory = async () => {
    await Haptics.selectionAsync();
    if (onViewHistory) {
      onViewHistory();
    }
  };

  // Water Blue gradients - Ultramarine, Prussian, Indigo (NO teal/cyan)
  const getProgressGradient = () => {
    if (percentage >= 100) return ['#5B8DEE', '#3B6DD9', '#1B4F9E']; // Bright Ultramarine → Deep Prussian - complete!
    if (percentage >= 75) return ['#4169E1', '#2E4A7D', '#1A237E']; // Ultramarine → Indigo - almost there
    if (percentage >= 50) return ['#6B8DD9', '#4169E1', '#2E4A7D']; // Sky Ultramarine → Ultramarine - good
    if (percentage >= 25) return ['#87A8E8', '#6B8DD9', '#4169E1']; // Misty Blue → Sky Ultramarine - building
    return ['#A8C4F5', '#87A8E8', '#6B8DD9']; // Light Misty → Misty Blue - starting
  };

  return (
    <View style={styles.container}>
      {/* Premium Hero Card with Gradient Background */}
      <LinearGradient
        colors={getProgressGradient()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        {/* 3D Decorative circles for depth and visual interest */}
        <View style={styles.heroDecorCircle1} />
        <View style={styles.heroDecorCircle2} />
        <View style={styles.heroDecorCircle3} />

        {/* Header Row inside gradient */}
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleRow}>
            <Ionicons name="water" size={22} color="rgba(255,255,255,0.95)" />
            <Text style={styles.heroTitle}>Hydration</Text>
          </View>
          {/* Daily goal indicator */}
          <View style={styles.goalIndicator}>
            <Text style={styles.goalIndicatorText}>{Math.round(percentage)}%</Text>
          </View>
        </View>

        {/* Main Content Row */}
        <View style={styles.heroContent}>
          {/* Wave Progress on left */}
          <View style={styles.heroWaveContainer}>
            <WaveProgress percentage={percentage} size={isCompact ? 100 : 115} />
          </View>

          {/* Stats on right */}
          <View style={styles.heroStatsContainer}>
            <View style={styles.heroIntakeRow}>
              <Text style={styles.heroIntakeValue}>{currentMl}</Text>
              <Text style={styles.heroIntakeUnit}>ml</Text>
            </View>
            <Text style={styles.heroGoalText}>of {goalMl}ml goal</Text>

            {/* Progress bar */}
            <View style={styles.heroProgressBar}>
              <View style={[styles.heroProgressFill, { width: `${Math.min(percentage, 100)}%` }]} />
            </View>

            {/* Status message */}
            <Text style={styles.heroStatusText}>
              {percentage >= 100 ? '🎉 Goal complete!' : `${remaining}ml remaining`}
            </Text>
          </View>
        </View>

        {/* Status Badge at bottom */}
        {hasLoggedToday && (
          <View style={styles.heroStatusBadge}>
            <Ionicons name={feedback.icon} size={14} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroStatusBadgeText}>{feedback.title}</Text>
            {lastLogMinutes && (
              <Text style={styles.heroLastLogText}>· {formatTimeAgo(lastLogMinutes)}</Text>
            )}
          </View>
        )}
      </LinearGradient>

      {/* Contextual Insight Card - Only when there's something important */}
      {hasLoggedToday && (feedback.status === 'behind' || feedback.status === 'rhythm' || feedback.status === 'low_logs') && (
        <View style={[styles.insightCard, { borderLeftColor: '#4169E1' }]}>
          <View style={styles.insightContent}>
            <Ionicons name="bulb-outline" size={18} color="#4169E1" />
            <Text style={styles.insightText}>{smartAdvice}</Text>
          </View>
          <View style={styles.paceProgressContainer}>
            <View style={styles.paceTrack}>
              <View
                style={[
                  styles.paceFill,
                  {
                    width: `${clamp(calculatePercentage(currentMl, feedback.expectedMl || 1, 100), 0, 100)}%`,
                    backgroundColor: '#4169E1'
                  }
                ]}
              />
            </View>
            <Text style={styles.paceLabel}>
              {currentMl}ml of {feedback.expectedMl}ml expected
            </Text>
          </View>
        </View>
      )}

      {/* Hourly chart removed - available in History page */}

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        {/* Open Full Tracker - Primary */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleOpenFull}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#5B8DEE', '#4169E1', '#2E4A7D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.primaryButtonText}>Log Water</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* View Insights - Secondary with icon */}
        {onViewHistory && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleViewHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="analytics" size={18} color={BRAND.primary} />
            <Text style={styles.secondaryButtonText}>History</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lottie Celebration Overlay - Premium Goal Achievement */}
      <CelebrationOverlay
        visible={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  // Premium Hero Card with 3D Gradient - Water Blues
  heroCard: {
    borderRadius: RADIUS.xl + 4,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    position: 'relative',
    overflow: 'hidden',
    // 3D depth shadow effect with Ultramarine
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
    // Inner light effect simulated with border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroDecorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    // 3D blur effect
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
  },
  heroDecorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroDecorCircle3: {
    position: 'absolute',
    top: 40,
    left: '40%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: 'rgba(255,255,255,0.95)',
  },
  goalIndicator: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 2,
    borderRadius: RADIUS.full,
  },
  goalIndicatorText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.black,
    color: '#FFF',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
  },
  heroWaveContainer: {
    // 3D depth effect for wave
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: RADIUS.full,
  },
  heroStatsContainer: {
    flex: 1,
    gap: SPACING[1],
  },
  heroIntakeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  heroIntakeValue: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weight.black,
    color: '#FFF',
    letterSpacing: -1,
  },
  heroIntakeUnit: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: 'rgba(255,255,255,0.8)',
  },
  heroGoalText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.75)',
  },
  heroProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.full,
    marginTop: SPACING[2],
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: RADIUS.full,
  },
  heroStatusText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: 'rgba(255,255,255,0.9)',
    marginTop: SPACING[1],
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    gap: SPACING[2],
    marginTop: SPACING[3],
    alignSelf: 'flex-start',
  },
  heroStatusBadgeText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: 'rgba(255,255,255,0.95)',
  },
  heroLastLogText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255,255,255,0.7)',
  },

  // Insight Card with 3D accent
  insightCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg + 2,
    padding: SPACING[3],
    marginBottom: SPACING[3],
    gap: SPACING[2],
    borderLeftWidth: 4,
    // 3D shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // Chart Card with 3D depth
  chartCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg + 2,
    padding: SPACING[3],
    marginBottom: SPACING[3],
    // 3D shadow effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    // Subtle border for depth
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  chartTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  chartSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },
  insightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  insightText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
  },
  paceProgressContainer: {
    gap: SPACING[1],
  },
  paceTrack: {
    height: 4,
    backgroundColor: SURFACES.muted,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  paceFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  paceLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    textAlign: 'right',
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
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.white,
    marginTop: SPACING[1],
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  goalAchievedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalSuccessLottie: {
    width: 48,
    height: 48,
  },
  wavePercentageDone: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginTop: -SPACING[2],
  },

  // Wellness Score Card
  wellnessCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: 0,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  wellnessCardCompact: {
    padding: SPACING[3],
  },
  wellnessGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  wellnessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[2],
  },
  wellnessInfo: {
    flex: 1,
  },
  wellnessScore: {
    fontSize: 40,
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.white,
    letterSpacing: -2,
  },
  wellnessLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  wellnessStatus: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.white,
    marginTop: SPACING[1],
  },
  wellnessDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.secondary,
  },
  segmentedTextActive: {
    color: TEXT.primary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: `${SEMANTIC_ACTIONS.success}14`,
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
    fontFamily: TYPOGRAPHY.family.bold,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    textAlign: 'center',
  },

  // Empty State (encouraging)
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[3],
  },
  emptyStateIconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING[3],
  },
  emptyStateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginBottom: SPACING[1],
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    textAlign: 'center',
    lineHeight: 18,
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
    fontFamily: TYPOGRAPHY.family.bold,
  },
  quickStatLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    marginTop: SPACING[1],
  },
  quickStatBenefit: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: SPACING[1],
  },
  beverageInsightCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  beverageGradient: {
    padding: SPACING[4],
    gap: SPACING[3],
  },
  beverageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  beverageIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  beverageHeaderText: {
    flex: 1,
  },
  beverageTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  beverageSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: SPACING[1],
  },
  beverageRows: {
    gap: SPACING[2],
  },
  beverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  beverageDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
  },
  beverageLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  beveragePercent: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  beverageNote: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: SPACING[2],
  },

  // Action Buttons Row with 3D Effects
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[1],
  },
  primaryButton: {
    flex: 1,
    borderRadius: RADIUS.lg + 2,
    overflow: 'hidden',
    // 3D depth effect with Ultramarine shadow
    shadowColor: '#4169E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3] + 2,
    paddingHorizontal: SPACING[4],
    // Inner highlight for 3D effect
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.white,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.lg + 2,
    // 3D depth effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    // Inner border for depth
    borderWidth: 1,
    borderColor: `${BRAND.primary}20`,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
  },

  // Hourly Intake Chart
  hourlyChartContainer: {
    gap: SPACING[3],
  },
  hourlyChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  hourlyChartTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  hourlyChartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[1],
  },
  hourlyBarColumn: {
    alignItems: 'center',
    flex: 1,
    gap: SPACING[1],
  },
  hourlyBar: {
    width: 8,
    minHeight: 2,
  },
  hourlyLabel: {
    fontSize: 9,
    color: TEXT.muted,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  hourlyChartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[4],
    marginTop: SPACING[2],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
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
  legendText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },

  // Lottie Celebration Overlay
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  celebrationLottie: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },

  // Streak Lottie
  streakLottie: {
    width: 64,
    height: 64,
  },
});
