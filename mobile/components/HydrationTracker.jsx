/**
 * ============================================================================
 * HydrationTracker - Ultra-Premium Interactive Water Logging Experience
 * ============================================================================
 * World-class UX with:
 * - Haptic feedback on all interactions
 * - Celebration confetti & animations
 * - Swipe-to-delete gestures
 * - Progress glow effects
 * - Achievement milestones
 * - Smart quick-add suggestions
 * - Smooth liquid wave animations
 * - Empty state with onboarding
 * - Micro-interactions everywhere
 *
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
  PanResponder,
  ActivityIndicator,
  AccessibilityInfo,
  TextInput,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Circle,
} from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
} from '../constants/premiumTheme';

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const BEVERAGE_TYPES = {
  water: {
    hydrationFactor: 1.0,
    icon: 'water',
    color: '#3B82F6',
    label: 'Water',
    description: '100% hydration credit',
  },
  coffee: {
    hydrationFactor: 0.5,
    icon: 'cafe',
    color: '#78350F',
    label: 'Coffee',
    description: 'Partial hydration credit',
  },
  tea: {
    hydrationFactor: 0.9,
    icon: 'leaf',
    color: '#059669',
    label: 'Tea',
    description: 'Lightly hydrating',
  },
  juice: {
    hydrationFactor: 0.8,
    icon: 'wine',
    color: '#F59E0B',
    label: 'Juice',
    description: 'Hydrating with sugars',
  },
  milk: {
    hydrationFactor: 0.9,
    icon: 'nutrition',
    color: '#FBBF24',
    label: 'Milk',
    description: 'Hydrating with protein',
  },
  electrolyte: {
    hydrationFactor: 1.1,
    icon: 'flash',
    color: '#0EA5E9',
    label: 'Electrolyte',
    description: 'Hydration boost',
  },
};

// Personality-driven quick-add sizes (Zomato-style naming)
const QUICK_ADD_SIZES = [
  { ml: 150, label: 'Quick Sip', subtitle: '150ml', icon: 'water-outline', wittyNote: 'Espresso-sized hydration' },
  { ml: 250, label: 'The Classic', subtitle: '250ml', icon: 'water', wittyNote: 'Standard issue refresh' },
  { ml: 500, label: 'Half Liter Hero', subtitle: '500ml', icon: 'water', wittyNote: 'Serious hydration intent' },
  { ml: 750, label: 'Overachiever', subtitle: '750ml', icon: 'water', wittyNote: 'Someone\'s committed' },
];

const MILESTONES = [25, 50, 75, 100];

// ============================================================================
// WITTY CONTEXT-AWARE HYDRATION TIPS (Zomato-style personality)
// ============================================================================

const WITTY_HYDRATION_TIPS = {
  // Morning tips (before noon)
  morning: {
    low: [ // <30% progress
      { icon: 'sunny', message: 'Your cells are like "Good morning, where\'s our water?" 💧' },
      { icon: 'cafe', message: 'Plot twist: water before coffee hits different.' },
      { icon: 'bulb', message: 'Morning brain fog? Often it\'s just thirst in disguise.' },
      { icon: 'rocket', message: 'Hydrate first. Caffeinate second. Dominate third.' },
    ],
    medium: [ // 30-60% progress
      { icon: 'sparkles', message: 'You\'re doing great! Your cells are sending thank-you notes.' },
      { icon: 'flash', message: 'Morning momentum: activated. Keep it flowing!' },
      { icon: 'fitness', message: 'This is the part where your energy takes off. 🚀' },
    ],
    high: [ // >60% progress
      { icon: 'trophy', message: 'Overachiever alert! You\'re crushing it this morning.' },
      { icon: 'star', message: 'Your hydration game is so strong right now.' },
      { icon: 'flame', message: 'At this rate, you\'ll hit your goal before lunch!' },
    ],
  },
  // Afternoon tips (noon to 5pm)
  afternoon: {
    low: [
      { icon: 'alert-circle', message: 'Afternoon slump calling? Water might be the answer you forgot to ask.' },
      { icon: 'bulb', message: 'Fun fact: your 3pm tiredness might just be your body\'s water alarm.' },
      { icon: 'cafe', message: 'Before you reach for more coffee, try this: 💧' },
      { icon: 'flash', message: 'Your energy bar is low. This is usually a water problem.' },
    ],
    medium: [
      { icon: 'rocket', message: 'Afternoon push! You\'re halfway to becoming a hydration legend.' },
      { icon: 'sparkles', message: 'Keep this pace and your future self will high-five you.' },
      { icon: 'fitness', message: 'Solid progress! Your cells are doing a little happy dance.' },
    ],
    high: [
      { icon: 'trophy', message: 'Afternoon and already crushing it? You\'re built different.' },
      { icon: 'diamond', message: 'At this point, you\'re basically a water sommelier.' },
      { icon: 'star', message: 'This is elite-level hydration. Just saying.' },
    ],
  },
  // Evening tips (after 5pm)
  evening: {
    low: [
      { icon: 'moon', message: 'Evening catch-up time! Your body is still keeping score.' },
      { icon: 'bulb', message: 'A few more glasses and you can call today a hydration win.' },
      { icon: 'water', message: 'The day isn\'t over yet. Your water bottle believes in you.' },
    ],
    medium: [
      { icon: 'sparkles', message: 'Solid day! A little more and you\'ll end on a high note.' },
      { icon: 'star', message: 'Evening hydration = better sleep. Science said it, not us.' },
      { icon: 'flash', message: 'You\'re so close to nailing today\'s goal!' },
    ],
    high: [
      { icon: 'trophy', message: 'You crushed it today. Your cells are throwing a party. 🎉' },
      { icon: 'flame', message: 'Goal reached! Tomorrow, you do it all over again. Champion.' },
      { icon: 'diamond', message: 'Hydration status: Immaculate. Rest well, you earned it.' },
    ],
  },
  // Streak-specific tips
  streak: {
    3: { icon: 'flame', message: '3 days strong! This is where habits start to form. Keep going!' },
    5: { icon: 'flash', message: '5 days! Your body is starting to expect this. Don\'t let it down.' },
    7: { icon: 'trophy', message: 'One week! Your cells have officially filed a "keep doing this" request.' },
    10: { icon: 'diamond', message: '10 days! You\'re not just hydrating, you\'re building a lifestyle.' },
    14: { icon: 'star', message: '2 weeks of consistency! At this point, you\'re basically unstoppable.' },
    21: { icon: 'rocket', message: '21 days! They say it takes this long to form a habit. Congratulations, you did it!' },
    30: { icon: 'medal', message: 'A FULL MONTH! You\'re a hydration role model now. Seriously.' },
  },
  // Beverage-specific tips
  beverage: {
    coffee: [
      { icon: 'cafe', message: 'Coffee counts, but chase it with water to balance things out!' },
      { icon: 'bulb', message: 'Pro tip: 1 cup of coffee + 1 cup of water = happy body.' },
    ],
    tea: [
      { icon: 'leaf', message: 'Tea is basically flavored hydration with benefits. Smart choice.' },
      { icon: 'sparkles', message: 'Green, black, or herbal - your body thanks you either way.' },
    ],
    electrolyte: [
      { icon: 'flash', message: 'Electrolytes: because sometimes water needs backup dancers.' },
      { icon: 'fitness', message: 'Post-workout perfection! Your muscles are sending thank-you notes.' },
    ],
  },
};

/**
 * Get a contextually-relevant, witty hydration tip
 * Zomato-style: never generic, always feels personal
 */
function getSmartHydrationTip(percentage, streak, beverageType, logCount) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const progressLevel = percentage < 30 ? 'low' : percentage < 60 ? 'medium' : 'high';

  // Priority 1: Streak milestones (these feel special)
  const streakMilestones = [3, 5, 7, 10, 14, 21, 30];
  if (streak > 0 && streakMilestones.includes(streak)) {
    return WITTY_HYDRATION_TIPS.streak[streak];
  }

  // Priority 2: Beverage-specific tips (40% chance if non-water)
  if (beverageType && beverageType !== 'water' && Math.random() < 0.4) {
    const bevTips = WITTY_HYDRATION_TIPS.beverage[beverageType];
    if (bevTips) {
      return bevTips[Math.floor(Math.random() * bevTips.length)];
    }
  }

  // Priority 3: Time + progress based tip (always relevant)
  const timeBasedTips = WITTY_HYDRATION_TIPS[timeOfDay][progressLevel];
  return timeBasedTips[Math.floor(Math.random() * timeBasedTips.length)];
}

// Legacy array for backward compatibility (rarely used now)
const HYDRATION_TIPS = [
  { icon: 'bulb', message: 'Drink water before meals to aid digestion!' },
  { icon: 'sparkles', message: 'Your brain is 75% water - stay sharp!' },
  { icon: 'flash', message: 'Hydration boosts energy levels naturally!' },
  { icon: 'sparkles', message: 'Water helps maintain healthy skin glow!' },
  { icon: 'fitness', message: 'Drink water 30 mins before exercise!' },
  { icon: 'moon', message: 'Hydrate early, sleep better tonight!' },
  { icon: 'fitness', message: 'Water aids muscle recovery!' },
  { icon: 'checkmark-circle', message: 'Consistency is key - you\'re doing great!' },
  { icon: 'flame', message: 'Water helps regulate body temperature!' },
  { icon: 'star', message: 'Small sips throughout the day work best!' },
  { icon: 'alert-circle', message: 'Thirsty? You\'re already slightly dehydrated!' },
  { icon: 'rocket', message: 'Water carries nutrients to your cells!' },
  { icon: 'diamond', message: 'Clear urine = well hydrated!' },
  { icon: 'water', message: 'Every sip counts toward your goal!' },
  { icon: 'color-palette', message: 'Mix it up - add lemon or cucumber!' },
];

// ============================================================================
// CONFETTI PARTICLE - For celebration
// ============================================================================

const ConfettiParticle = ({ delay = 0 }) => {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 100;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 300,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: randomX,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 360,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
          ],
          opacity,
        },
      ]}
    />
  );
};

// ============================================================================
// CELEBRATION CONFETTI
// ============================================================================

const Confetti = ({ visible }) => {
  if (!visible) return null;

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {Array.from({ length: 30 }).map((_, i) => (
        <ConfettiParticle key={i} delay={i * 50} />
      ))}
    </View>
  );
};

// ============================================================================
// LIQUID WAVE ANIMATION - Enhanced with actual wave
// ============================================================================

const LiquidWave = ({ percentage, size = 200 }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fill animation - simplified, no continuous wave
    Animated.spring(fillAnim, {
      toValue: percentage,
      tension: 15,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  return (
    <View style={[styles.liquidContainer, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={SEMANTIC.info.light} stopOpacity="0.9" />
            <Stop offset="50%" stopColor={SEMANTIC.info.base} stopOpacity="0.95" />
            <Stop offset="100%" stopColor={SEMANTIC.info.dark} stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill={`${SEMANTIC.info.base}0D`}
          stroke={`${SEMANTIC.info.base}33`}
          strokeWidth="2"
        />

        {/* Liquid fill - using mask instead of clipPath */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="url(#liquidGradient)"
          opacity={percentage / 100}
        />

        {/* Overlay circle border */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="none"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="3"
        />
      </Svg>

      {/* Percentage text overlay */}
      <View style={styles.liquidTextOverlay}>
        <Text style={styles.liquidPercentage}>{Math.round(percentage)}%</Text>
        <Text style={styles.liquidLabel}>Hydrated</Text>
      </View>
    </View>
  );
};

// ============================================================================
// PROGRESS RING WITH GLOW EFFECT
// ============================================================================

const ProgressRing = ({ percentage, size = 200, strokeWidth = 14, reduceMotion = false }) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const animConfig = reduceMotion
      ? { duration: 250, useNativeDriver: false }
      : { tension: 60, friction: 10, useNativeDriver: false };

    Animated[reduceMotion ? 'timing' : 'spring'](animatedProgress, {
      toValue: percentage,
      ...animConfig,
    }).start();
  }, [percentage, reduceMotion]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // Golden/amber color progression based on percentage
  const getProgressColors = () => {
    if (percentage >= 100) return { start: '#10B981', mid: '#059669', end: '#047857' }; // Emerald - goal achieved!
    if (percentage >= 75) return { start: '#14B8A6', mid: '#0D9488', end: '#0F766E' }; // Teal - almost there
    if (percentage >= 50) return { start: '#FBBF24', mid: '#F59E0B', end: '#D97706' }; // Amber/Gold - good progress
    if (percentage >= 25) return { start: '#FCD34D', mid: '#FBBF24', end: '#F59E0B' }; // Golden yellow - building
    return { start: '#FDE68A', mid: '#FCD34D', end: '#FBBF24' }; // Light gold - just started
  };

  const progressColors = getProgressColors();

  return (
    <View
      style={[
        styles.ringContainer,
        { width: size, height: size },
      ]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`Hydration progress: ${Math.round(percentage)} percent of daily goal`}
      accessibilityValue={{ min: 0, max: 100, now: percentage }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={progressColors.start} stopOpacity="1" />
            <Stop offset="50%" stopColor={progressColors.mid} stopOpacity="1" />
            <Stop offset="100%" stopColor={progressColors.end} stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${progressColors.start}20`}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated Progress Circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />

        {/* Milestone Markers */}
        {MILESTONES.map((milestone) => {
          const angle = (milestone / 100) * 360 - 90;
          const x = size / 2 + radius * Math.cos((angle * Math.PI) / 180);
          const y = size / 2 + radius * Math.sin((angle * Math.PI) / 180);
          const reached = percentage >= milestone;

          return (
            <Circle
              key={milestone}
              cx={x}
              cy={y}
              r={reached ? 6 : 4}
              fill={reached ? '#10B981' : '#E5E7EB'}
            />
          );
        })}
      </Svg>
    </View>
  );
};

// ============================================================================
// SWIPEABLE TIMELINE ENTRY - Swipe to delete
// ============================================================================

const SwipeableEntry = ({ entry, onDelete, bevType }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const deleteScale = useRef(new Animated.Value(0.8)).current;
  const lastHapticThreshold = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          const clampedDx = Math.max(gesture.dx, -120);
          translateX.setValue(clampedDx);

          // Progressive reveal
          const progress = Math.min(Math.abs(clampedDx) / 100, 1);
          deleteOpacity.setValue(progress);
          deleteScale.setValue(0.8 + (progress * 0.2));

          // Haptic at threshold
          if (Math.abs(clampedDx) > 60 && lastHapticThreshold.current === 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            lastHapticThreshold.current = 1;
          }
        }
      },
      onPanResponderRelease: (_, gesture) => {
        lastHapticThreshold.current = 0;

        if (gesture.dx < -60) {
          // Delete threshold
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -400,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            if (onDelete) onDelete();
          });
        } else {
          // Better spring bounce-back
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 100,
              friction: 12,
              useNativeDriver: true,
            }),
            Animated.spring(deleteOpacity, {
              toValue: 0,
              tension: 100,
              friction: 12,
              useNativeDriver: true,
            }),
            Animated.spring(deleteScale, {
              toValue: 0.8,
              tension: 100,
              friction: 12,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Direct tap delete option
  const handleDirectDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Entry',
      `Remove ${entry.amount}ml ${bevType.label} entry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) onDelete();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.swipeableContainer}>
      <Animated.View
        style={[
          styles.deleteBackground,
          {
            opacity: deleteOpacity,
            transform: [{ scale: deleteScale }],
          },
        ]}
      >
        <Ionicons name="trash" size={ICON_SIZES.md} color={TEXT.white} />
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>
      <Animated.View
        style={[styles.timelineEntry, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.timelineDot} />
        <View style={styles.timelineIconWrapper}>
          <Ionicons name={bevType.icon} size={18} color={bevType.color} />
        </View>
        <Text style={styles.timelineAmount}>{entry.amount}ml</Text>
        <Text style={styles.timelineTime}>
          {new Date(entry.timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
        <TouchableOpacity
          onPress={handleDirectDelete}
          style={styles.timelineDeleteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={20} color="#EF4444" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ============================================================================
// UNDO TOAST WITH HAPTIC FEEDBACK
// ============================================================================

// ============================================================================
// PREMIUM HYDRATION SUCCESS TOAST - Celebration-style water logging feedback
// ============================================================================

const CELEBRATION_MESSAGES = {
  morning: [
    { icon: 'sunny', text: 'Great morning start!' },
    { icon: 'sunny-outline', text: 'Rise & hydrate!' },
    { icon: 'partly-sunny', text: 'Morning fuel added!' },
  ],
  afternoon: [
    { icon: 'fitness', text: 'Staying strong!' },
    { icon: 'flash', text: 'Energy boost!' },
    { icon: 'checkmark-circle', text: 'On track!' },
  ],
  evening: [
    { icon: 'moon', text: 'Evening sip logged!' },
    { icon: 'sparkles', text: 'Winding down right!' },
    { icon: 'star', text: 'Day well done!' },
  ],
  streak: [
    { icon: 'flame', text: 'Streak on fire!' },
    { icon: 'trophy', text: 'Champion hydrator!' },
    { icon: 'diamond', text: 'Consistency pays!' },
  ],
  beverage: {
    coffee: { icon: 'cafe', text: 'Coffee break!' },
    tea: { icon: 'leaf', text: 'Tea time!' },
    juice: { icon: 'wine', text: 'Fresh & fruity!' },
    milk: { icon: 'water', text: 'Calcium boost!' },
    electrolyte: { icon: 'flash', text: 'Electrolytes loaded!' },
    water: { icon: 'water', text: 'Pure hydration!' },
  },
};

const WaterRipple = ({ delay = 0 }) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2.5,
          duration: 1200,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1200,
          delay,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.waterRipple,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

const UndoToast = ({ visible, message, onUndo, onDismiss, amount, beverageType, streak }) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Get dynamic celebration message
  const getCelebrationMessage = useCallback(() => {
    const hour = new Date().getHours();
    let timeOfDay = 'afternoon';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour >= 18) timeOfDay = 'evening';

    // Prioritize streak messages for streaks > 3
    if (streak && streak > 3) {
      const streakMsgs = CELEBRATION_MESSAGES.streak;
      return streakMsgs[Math.floor(Math.random() * streakMsgs.length)];
    }

    // Beverage-specific message 40% of the time
    if (beverageType && beverageType !== 'water' && Math.random() < 0.4) {
      return CELEBRATION_MESSAGES.beverage[beverageType] || CELEBRATION_MESSAGES.beverage.water;
    }

    // Time-based message
    const timeMsgs = CELEBRATION_MESSAGES[timeOfDay];
    return timeMsgs[Math.floor(Math.random() * timeMsgs.length)];
  }, [beverageType, streak]);

  const celebration = useMemo(() => getCelebrationMessage(), [visible]);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset animations
      slideAnim.setValue(100);
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.9);

      // Entry animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // Subtle pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Shimmer effect
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();

      const timer = setTimeout(() => {
        dismissToast();
      }, 4500);

      return () => {
        clearTimeout(timer);
        pulseAnim.stopAnimation();
        shimmerAnim.stopAnimation();
      };
    } else {
      dismissToast();
    }
  }, [visible]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!visible) return null;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  return (
    <Animated.View
      style={[
        styles.successToastContainer,
        {
          transform: [
            { translateY: slideAnim },
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <LinearGradient
        colors={['#0EA5E9', '#0284C7', '#0369A1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.successToastGradient}
      >
        {/* Animated shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            { transform: [{ translateX: shimmerTranslate }] },
          ]}
        />

        {/* Water ripple effect background */}
        <View style={styles.rippleContainer}>
          <WaterRipple delay={0} />
          <WaterRipple delay={400} />
          <WaterRipple delay={800} />
        </View>

        <View style={styles.successToastContent}>
          {/* Left: Water drop icon with amount */}
          <View style={styles.successIconSection}>
            <View style={styles.waterDropContainer}>
              <Ionicons name="water" size={28} color="#FFF" />
            </View>
            <Text style={styles.amountText}>+{amount || 250}ml</Text>
          </View>

          {/* Center: Celebration message */}
          <View style={styles.celebrationSection}>
            {celebration?.icon ? (
              <Ionicons name={celebration.icon} size={24} color="#FFF" style={styles.celebrationIcon} />
            ) : null}
            <Text style={styles.celebrationText}>{celebration?.text || 'Logged!'}</Text>
            {streak > 1 ? (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={12} color="#FFF" />
                <Text style={styles.streakText}>{streak} day streak</Text>
              </View>
            ) : null}
          </View>

          {/* Right: Undo button */}
          <TouchableOpacity
            style={styles.successUndoButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              dismissToast();
              if (onUndo) onUndo();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-undo" size={16} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ============================================================================
// MILESTONE TOAST - Celebrates progress milestones and shows tips
// ============================================================================

const MilestoneToast = ({ milestone, visible, onDismiss, message, isFirstLog, isTip }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = isTip ? 4000 : 3000; // Tips stay longer
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onDismiss) onDismiss();
        });
      }, duration);
    }
  }, [visible, milestone, message, isTip]);

  if (!visible) return null;

  // Custom message or default milestone messages
  let displayText, color;

  if (message) {
    displayText = message;
    color = isTip ? '#6366F1' : '#10B981';
  } else if (isFirstLog) {
    displayText = 'First sip of the day! 🌟';
    color = '#10B981';
  } else {
    // Witty milestone messages (Zomato-style personality)
    const messages = {
      25: {
        text: ['Quarter tank filled! 🚀', 'Your cells just noticed. They approve.', '25% to hydration glory!'][Math.floor(Math.random() * 3)],
        color: '#3B82F6'
      },
      50: {
        text: ['50% hydration domination! 💧', 'Halfway to legendary status.', 'Glass half full? More like body half hydrated!'][Math.floor(Math.random() * 3)],
        color: '#8B5CF6'
      },
      75: {
        text: ['75% - The finish line is waving! 🏃', 'So close you can taste it (literally, it\'s water).', 'Your kidneys are doing a happy dance!'][Math.floor(Math.random() * 3)],
        color: '#EC4899'
      },
      100: {
        text: ['GOAL CRUSHED! 🏆 Your cells are throwing a party.', 'Hydration hero status: UNLOCKED', '100%! You beautiful hydrated legend.'][Math.floor(Math.random() * 3)],
        color: '#10B981'
      },
    };
    const milestoneData = messages[milestone] || messages[25];
    displayText = milestoneData.text;
    color = milestoneData.color;
  }

  return (
    <Animated.View
      style={[
        styles.milestoneToast,
        {
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          backgroundColor: color,
        },
      ]}
    >
      <Text style={styles.milestoneText}>{displayText}</Text>
    </Animated.View>
  );
};

// ============================================================================
// EMPTY STATE - First time experience
// ============================================================================

const EmptyState = () => {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="water-outline" size={64} color="#93C5FD" />
      </View>
      <Text style={styles.emptyTitle}>Start Your Hydration Journey</Text>
      <Text style={styles.emptySubtitle}>
        Tap a quick-add button below to log your first drink!
      </Text>
      <View style={styles.emptyTips}>
        <View style={styles.emptyTip}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.emptyTipText}>Track all beverages</Text>
        </View>
        <View style={styles.emptyTip}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.emptyTipText}>Swipe to undo entries</Text>
        </View>
        <View style={styles.emptyTip}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.emptyTipText}>Celebrate milestones</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// BEVERAGE CHIP - Animated Selection with Pulse
// ============================================================================

const BeverageChip = ({ bevKey, bev, selected, onSelect }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(bgAnim, {
      toValue: selected ? 1 : 0,
      tension: 80,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [selected]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Pulse animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();

    onSelect(bevKey);
  };

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SURFACES.background.secondary, `${bev.color}15`],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.beverageChip,
          selected && {
            borderColor: bev.color,
            ...SHADOWS.sm,
          },
        ]}
        onPress={handlePress}
        activeOpacity={1}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor, borderRadius: RADIUS.full }
          ]}
        />

        <View style={styles.beverageChipContent}>
          <Ionicons name={bev.icon} size={20} color={selected ? bev.color : TEXT.secondary} />
          <Text
            style={[
              styles.beverageChipLabel,
              selected && {
                color: bev.color,
                fontWeight: TYPOGRAPHY.weight.bold
              },
            ]}
          >
            {bev.label}
          </Text>
          {bev.hydrationFactor !== 1 && (
            <View style={styles.multiplierBadge}>
              <Text style={styles.beverageMultiplier}>
                {Math.round(bev.hydrationFactor * 100)}%
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// STATS CARD
// ============================================================================

const StatsCard = ({ beverageHistory, dailyGoal }) => {
  const stats = useMemo(() => {
    const today = beverageHistory || [];
    const totalToday = today.reduce((sum, entry) => {
      const hydrationLiters = Number.isFinite(entry.hydrationLiters)
        ? entry.hydrationLiters
        : entry.amountLiters;
      return sum + (hydrationLiters || 0);
    }, 0);
    const avgPerEntry = today.length > 0 ? totalToday / today.length : 0;

    const hourlyCounts = new Array(24).fill(0);
    today.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      hourlyCounts[hour]++;
    });
    const peakHour = hourlyCounts.indexOf(Math.max(...hourlyCounts));

    return {
      totalToday: (totalToday * 1000).toFixed(0),
      entriesCount: today.length,
      avgPerEntry: (avgPerEntry * 1000).toFixed(0),
      peakHour: peakHour >= 0 ? `${peakHour}:00` : 'N/A',
    };
  }, [beverageHistory]);

  // Witty commentary based on stats
  const getStatsCommentary = () => {
    const total = parseInt(stats.totalToday);
    const entries = stats.entriesCount;
    if (total === 0) return null;
    if (entries >= 8) return '🏆 Hydration habits: elite-level';
    if (entries >= 5) return '💧 Consistent sipper detected!';
    if (total >= 2000) return '🌊 Seriously committed to hydration';
    if (total >= 1500) return '📈 Nice steady progress today';
    return '🚀 Every sip counts!';
  };

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <Ionicons name="analytics" size={ICON_SIZES.md} color={BRAND.primary} />
        <Text style={styles.statsTitle}>Your Hydration Intel</Text>
      </View>

      {getStatsCommentary() && (
        <Text style={styles.statsCommentary}>{getStatsCommentary()}</Text>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalToday}ml</Text>
          <Text style={styles.statLabel}>Consumed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.entriesCount}</Text>
          <Text style={styles.statLabel}>Sips</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.avgPerEntry}ml</Text>
          <Text style={styles.statLabel}>Per Sip</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.peakHour}</Text>
          <Text style={styles.statLabel}>Prime Time</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// TIMELINE WITH SWIPE-TO-DELETE
// ============================================================================

const Timeline = ({ beverageHistory, onDelete, onViewHistory }) => {
  const timelineData = useMemo(() => {
    const sortedHistory = [...(beverageHistory || [])].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    const periods = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
    };

    sortedHistory.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      if (hour >= 5 && hour < 12) periods.morning.push(entry);
      else if (hour >= 12 && hour < 17) periods.afternoon.push(entry);
      else if (hour >= 17 && hour < 22) periods.evening.push(entry);
      else periods.night.push(entry);
    });

    return periods;
  }, [beverageHistory]);

  const renderPeriod = (periodName, icon, data) => {
    const totalMl = data.reduce((sum, entry) => sum + entry.amount, 0);
    if (data.length === 0) return null;

    return (
      <View key={periodName} style={styles.timelinePeriod}>
        <View style={styles.timelinePeriodHeader}>
          <Ionicons name={icon} size={ICON_SIZES.sm} color={SEMANTIC.info.base} />
          <Text style={styles.timelinePeriodName}>{periodName}</Text>
          <Text style={styles.timelinePeriodTotal}>{totalMl}ml</Text>
        </View>
        <View style={styles.timelinePeriodEntries}>
          {data.map((entry, idx) => {
            const bevType = BEVERAGE_TYPES[entry.type] || BEVERAGE_TYPES.water;
            return (
              <SwipeableEntry
                key={entry.id || idx}
                entry={entry}
                bevType={bevType}
                onDelete={() => onDelete(entry)}
              />
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineHeader}>
        <Ionicons name="water" size={ICON_SIZES.md} color={SEMANTIC.info.base} />
        <Text style={styles.timelineTitle}>Your Hydration Story</Text>
        <Text style={styles.timelineHint}>← Swipe to edit history</Text>
        {onViewHistory && (
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              onViewHistory();
            }}
            style={styles.viewHistoryButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.viewHistoryText}>History</Text>
            <Ionicons name="chevron-forward" size={14} color={BRAND.primary} />
          </TouchableOpacity>
        )}
      </View>
      {renderPeriod('AM Power-Up', 'sunny', timelineData.morning)}
      {renderPeriod('Midday Fuel', 'partly-sunny', timelineData.afternoon)}
      {renderPeriod('Evening Wind-Down', 'moon', timelineData.evening)}
      {renderPeriod('Night Owl Mode', 'moon-outline', timelineData.night)}
    </View>
  );
};

// ============================================================================
// PREMIUM QUICK ADD BUTTON - With Scale Animation + Glow + Loading
// ============================================================================

const PremiumQuickAddButton = ({ size, onPress, isLoading = false, accessible, accessibilityRole, accessibilityLabel, accessibilityHint }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Scale down + glow up
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 300,
        friction: 20,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Scale up bounce then back + glow down
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        tension: 300,
        friction: 10,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: false,
      }),
    ]).start();

    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(107, 78, 255, 0)', 'rgba(107, 78, 255, 0.4)'],
  });

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      activeOpacity={1}
      disabled={isLoading}
      style={styles.quickAddTile}
      accessible={accessible}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <Animated.View
        style={[
          styles.quickAddTileWrapper,
          {
            transform: [{ scale: scaleAnim }],
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 1,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        <LinearGradient
          colors={SURFACES.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickAddTileGradient}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#FFF" />
          ) : (
            <>
              <Ionicons name={size.icon} size={32} color="#FFF" />
              <Text style={styles.quickAddTileLabel}>{size.label}</Text>
              <Text style={styles.quickAddTileSubtitle}>{size.subtitle}</Text>
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HydrationTracker({
  currentIntake = 0,
  dailyGoal = 2.0,
  onLogWater,
  onRemoveWater,
  beverageHistory = [],
  streak = 0,
  onViewHistory,
}) {
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [lastEntry, setLastEntry] = useState(null);
  const [selectedBeverage, setSelectedBeverage] = useState('water');
  const [showMilestone, setShowMilestone] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousPercentage, setPreviousPercentage] = useState(0);
  const [milestoneMessage, setMilestoneMessage] = useState(null);
  const [isTipMessage, setIsTipMessage] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [shownFirstLogToast, setShownFirstLogToast] = useState(false);
  const [loadingButton, setLoadingButton] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isCustomLoading, setIsCustomLoading] = useState(false);
  const customInputRef = useRef(null);

  // Ref to prevent concurrent operations
  const syncInFlightRef = useRef(false);

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const percentage = Math.min((currentIntake / dailyGoal) * 100, 100);
  const remainingLiters = Math.max(dailyGoal - currentIntake, 0);
  const remainingMl = Math.round(remainingLiters * 1000);
  const goalReached = percentage >= 100;

  // Check for milestone achievements
  useEffect(() => {
    const currentMilestone = MILESTONES.find(m =>
      percentage >= m && previousPercentage < m
    );

    if (currentMilestone) {
      setMilestoneMessage(null);
      setIsTipMessage(false);
      setShowMilestone(currentMilestone);

      if (currentMilestone === 100) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }

    setPreviousPercentage(percentage);
  }, [percentage]);

  // Show smart, context-aware tips periodically (every 3 logs, not at milestones)
  useEffect(() => {
    // Show tip every 3 logs, but not if we just hit a milestone
    const shouldShowTip = logCount > 0 && logCount % 3 === 0 && !showMilestone;

    if (shouldShowTip) {
      // Use the smart tip function with full context
      const smartTip = getSmartHydrationTip(percentage, streak, selectedBeverage, logCount);
      setMilestoneMessage(smartTip.message);
      setIsTipMessage(true);
      setShowMilestone('tip'); // Use a special key for tips

      // Reset after showing
      setTimeout(() => {
        setMilestoneMessage(null);
        setIsTipMessage(false);
      }, 4500);
    }
  }, [logCount, percentage, streak, selectedBeverage]);

  const handleQuickAdd = useCallback(async (ml) => {
    // Prevent double-clicks with debouncing
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setLoadingButton(ml); // Show loading state for this button

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const bevType = BEVERAGE_TYPES[selectedBeverage];
      const effectiveMl = ml * bevType.hydrationFactor;

      // Generate strong clientEventId for idempotency (prevents duplicates from network retries)
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      const clientEventId = `hydration-${timestamp}-${random1}-${random2}`;

      const entry = {
        amount: ml,
        type: selectedBeverage,
        effectiveAmount: effectiveMl,
        timestamp,
        clientEventId,
      };

      setLastEntry(entry);
      setShowUndoToast(true);

      // Increment log count for tip tracking
      setLogCount(prev => prev + 1);

      // Show "Great Start" only on first log of the day
      if (beverageHistory.length === 0 && !shownFirstLogToast) {
        setMilestoneMessage('Great start!');
        setIsTipMessage(false);
        setShowMilestone('firstLog');
        setShownFirstLogToast(true);

        setTimeout(() => {
          setMilestoneMessage(null);
          setShowMilestone(null);
        }, 3500);
      }

      if (onLogWater) {
        await onLogWater(entry);
      }

      // Success haptic
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[HydrationTracker] Error logging water:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoadingButton(null);
      // Release lock after a short delay to prevent rapid clicks
      setTimeout(() => {
        syncInFlightRef.current = false;
      }, 500);
    }
  }, [selectedBeverage, beverageHistory.length, shownFirstLogToast, onLogWater]);

  // Handle custom amount submission
  const handleCustomAdd = useCallback(async () => {
    const ml = parseInt(customAmount, 10);
    if (!ml || ml <= 0 || ml > 5000) {
      Alert.alert('Invalid Amount', 'Please enter a value between 1 and 5000 ml');
      return;
    }

    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setIsCustomLoading(true);
    Keyboard.dismiss();

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const bevType = BEVERAGE_TYPES[selectedBeverage];
      const effectiveMl = ml * bevType.hydrationFactor;

      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      const clientEventId = `hydration-custom-${timestamp}-${random1}-${random2}`;

      const entry = {
        amount: ml,
        type: selectedBeverage,
        effectiveAmount: effectiveMl,
        timestamp,
        clientEventId,
      };

      setLastEntry(entry);
      setShowUndoToast(true);
      setLogCount(prev => prev + 1);
      setCustomAmount('');
      setShowCustomInput(false);

      if (beverageHistory.length === 0 && !shownFirstLogToast) {
        setMilestoneMessage('Great start!');
        setIsTipMessage(false);
        setShowMilestone('firstLog');
        setShownFirstLogToast(true);
        setTimeout(() => {
          setMilestoneMessage(null);
          setShowMilestone(null);
        }, 3500);
      }

      if (onLogWater) {
        await onLogWater(entry);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[HydrationTracker] Error logging custom water:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCustomLoading(false);
      setTimeout(() => {
        syncInFlightRef.current = false;
      }, 500);
    }
  }, [customAmount, selectedBeverage, beverageHistory.length, shownFirstLogToast, onLogWater]);

  const handleUndo = useCallback(async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      if (lastEntry && onRemoveWater && beverageHistory.length > 0) {
        const lastLoggedEntry = beverageHistory[0];
        if (Number.isFinite(lastLoggedEntry?.id)) {
          await onRemoveWater(
            lastLoggedEntry.id,
            lastLoggedEntry.amountLiters,
            lastLoggedEntry.hydrationLiters
          );
        }
      }
      setShowUndoToast(false);
    } finally {
      setTimeout(() => {
        syncInFlightRef.current = false;
      }, 500);
    }
  }, [lastEntry, onRemoveWater, beverageHistory]);

  const handleSwipeDelete = useCallback(async (entry) => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (onRemoveWater) {
        if (Number.isFinite(entry?.id)) {
          await onRemoveWater(entry.id, entry.amountLiters, entry.hydrationLiters);
        }
      }
    } finally {
      setTimeout(() => {
        syncInFlightRef.current = false;
      }, 500);
    }
  }, [onRemoveWater]);

  const isEmpty = beverageHistory.length === 0;

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <LinearGradient
          colors={SURFACES.gradient.blue}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="water" size={ICON_SIZES.xl} color={TEXT.white} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Hydration HQ</Text>
                <Text style={styles.headerSubtitle}>Where champions refuel 💧</Text>
              </View>
            </View>
            {goalReached && (
              <View style={styles.goalBadge}>
                <Ionicons name="trophy" size={20} color={SEMANTIC.warning.base} />
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Main Visualization */}
        <View style={styles.visualizationCard}>
          <View style={styles.progressContainer}>
            <ProgressRing percentage={percentage} size={200} strokeWidth={14} reduceMotion={reduceMotion} />

            {/* Stats overlay inside ring */}
            <View style={styles.progressCenter}>
              <Text style={[
                styles.progressPercentage,
                { color: percentage >= 100 ? '#10B981' : percentage >= 75 ? '#14B8A6' : percentage >= 50 ? '#F59E0B' : '#FBBF24' }
              ]}>
                {Math.round(percentage)}%
              </Text>
              <Text style={styles.progressLabel}>Hydrated</Text>

              {/* Next milestone indicator */}
              {percentage >= 25 && percentage < 100 && (
                <View style={[
                  styles.nextMilestoneChip,
                  { backgroundColor: percentage >= 75 ? '#CCFBF1' : percentage >= 50 ? '#FEF3C7' : '#FEF9C3' }
                ]}>
                  <Ionicons
                    name="flag-outline"
                    size={ICON_SIZES.xs}
                    color={percentage >= 75 ? '#14B8A6' : percentage >= 50 ? '#F59E0B' : '#FBBF24'}
                  />
                  <Text style={[
                    styles.nextMilestoneText,
                    { color: percentage >= 75 ? '#14B8A6' : percentage >= 50 ? '#F59E0B' : '#FBBF24' }
                  ]}>
                    {MILESTONES.find(m => m > percentage)}% next
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.mainStat}>
              <Text style={[
                styles.mainStatValue,
                { color: percentage >= 100 ? '#10B981' : percentage >= 75 ? '#14B8A6' : percentage >= 50 ? '#F59E0B' : '#FBBF24' }
              ]}>
                {(currentIntake * 1000).toFixed(0)}ml
              </Text>
              <Text style={styles.mainStatLabel}>Consumed</Text>
            </View>
            <View style={styles.mainStatDivider} />
            <View style={styles.mainStat}>
              <Text style={[
                styles.mainStatValue,
                { color: percentage >= 100 ? '#10B981' : percentage >= 75 ? '#14B8A6' : percentage >= 50 ? '#F59E0B' : '#FBBF24' }
              ]}>
                {remainingMl}ml
              </Text>
              <Text style={styles.mainStatLabel}>Remaining</Text>
            </View>
          </View>

          {goalReached && (
            <View style={styles.goalReachedBanner}>
              <Ionicons name="sparkles" size={20} color="#10B981" />
              <Text style={styles.goalReachedText}>Amazing! Goal achieved!</Text>
            </View>
          )}
        </View>

        {/* Beverage Selector */}
        <View style={styles.beverageSelectorCard}>
          <Text style={styles.sectionLabel}>Select Beverage</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.beverageScroll}
          >
            {Object.entries(BEVERAGE_TYPES).map(([key, bev]) => (
              <BeverageChip
                key={key}
                bevKey={key}
                bev={bev}
                selected={selectedBeverage === key}
                onSelect={setSelectedBeverage}
              />
            ))}
          </ScrollView>
        </View>

        {/* Quick Add Buttons - Premium with Scale Animation + Glow */}
        <View style={styles.quickAddCard}>
          <Text style={styles.sectionLabel}>Quick Add</Text>
          <View style={styles.quickAddGrid}>
            {QUICK_ADD_SIZES.map((size) => (
              <PremiumQuickAddButton
                key={size.ml}
                size={size}
                onPress={() => handleQuickAdd(size.ml)}
                isLoading={loadingButton === size.ml}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Add ${size.ml} milliliters of ${BEVERAGE_TYPES[selectedBeverage].label}`}
                accessibilityHint="Double tap to log this amount"
              />
            ))}
          </View>

          {/* Custom Amount Toggle */}
          <TouchableOpacity
            style={styles.customAmountToggle}
            onPress={() => {
              Haptics.selectionAsync();
              if (!showCustomInput) {
                setCustomAmount('100'); // Initialize with 100ml
              }
              setShowCustomInput(!showCustomInput);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showCustomInput ? 'chevron-up-circle-outline' : 'options-outline'}
              size={18}
              color={BRAND.primary}
            />
            <Text style={styles.customAmountToggleText}>
              {showCustomInput ? 'Hide custom amount' : 'Custom amount'}
            </Text>
          </TouchableOpacity>

          {/* Custom Amount Stepper - Plus/Minus Design */}
          {showCustomInput && (
            <View style={styles.customStepperContainer}>
              {/* Stepper Row */}
              <View style={styles.stepperRow}>
                {/* Minus Button */}
                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    styles.stepperButtonMinus,
                    parseInt(customAmount || '0') <= 50 && styles.stepperButtonDisabled,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const current = parseInt(customAmount || '100');
                    const newVal = Math.max(50, current - 50);
                    setCustomAmount(String(newVal));
                  }}
                  disabled={parseInt(customAmount || '0') <= 50}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="remove"
                    size={24}
                    color={parseInt(customAmount || '0') <= 50 ? '#CBD5E1' : SEMANTIC.info.base}
                  />
                </TouchableOpacity>

                {/* Value Display */}
                <View style={styles.stepperValueContainer}>
                  <Text style={styles.stepperValue}>{customAmount || '100'}</Text>
                  <Text style={styles.stepperUnit}>ml</Text>
                </View>

                {/* Plus Button */}
                <TouchableOpacity
                  style={[
                    styles.stepperButton,
                    styles.stepperButtonPlus,
                    parseInt(customAmount || '0') >= 2000 && styles.stepperButtonDisabled,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const current = parseInt(customAmount || '100');
                    const newVal = Math.min(2000, current + 50);
                    setCustomAmount(String(newVal));
                  }}
                  disabled={parseInt(customAmount || '0') >= 2000}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add"
                    size={24}
                    color={parseInt(customAmount || '0') >= 2000 ? '#CBD5E1' : SEMANTIC.info.base}
                  />
                </TouchableOpacity>
              </View>

              {/* Add Button */}
              <TouchableOpacity
                style={[
                  styles.stepperAddButton,
                  isCustomLoading && styles.stepperAddButtonDisabled,
                ]}
                onPress={handleCustomAdd}
                disabled={isCustomLoading}
                activeOpacity={0.7}
              >
                {isCustomLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="water" size={18} color="#FFF" />
                    <Text style={styles.stepperAddButtonText}>Log {customAmount || '100'}ml</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats */}
        {!isEmpty && <StatsCard beverageHistory={beverageHistory} dailyGoal={dailyGoal} />}

        {/* Empty State or Timeline */}
        {isEmpty ? (
          <EmptyState />
        ) : (
          <Timeline beverageHistory={beverageHistory} onDelete={handleSwipeDelete} onViewHistory={onViewHistory} />
        )}
      </ScrollView>

      {/* Premium Success Toast */}
      <UndoToast
        visible={showUndoToast}
        message={`Added ${lastEntry?.amount}ml ${BEVERAGE_TYPES[lastEntry?.type]?.label || 'Water'}`}
        onUndo={handleUndo}
        onDismiss={() => setShowUndoToast(false)}
        amount={lastEntry?.amount}
        beverageType={lastEntry?.type}
        streak={streak}
      />

      {/* Milestone Toast */}
      <MilestoneToast
        milestone={showMilestone}
        visible={!!showMilestone}
        message={milestoneMessage}
        isTip={isTipMessage}
        isFirstLog={showMilestone === 'firstLog'}
        onDismiss={() => {
          setShowMilestone(null);
          setMilestoneMessage(null);
          setIsTipMessage(false);
        }}
      />

      {/* Confetti */}
      <Confetti visible={showConfetti} />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[8],
  },

  // Header
  headerCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    ...SHADOWS.info,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: TEXT.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING[1],
  },
  goalBadge: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: SEMANTIC.warning.bg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.warning,
  },

  // Visualization
  visualizationCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
    marginBottom: SPACING[4],
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[6],
    width: 220,
    height: 220,
  },
  ringWrapper: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 0,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
    gap: SPACING[2],
  },
  progressPercentage: {
    fontSize: TYPOGRAPHY.size['4xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: SEMANTIC.info.base,
    letterSpacing: -1,
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#64748B', // Slate blue - more vibrant than gray
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextMilestoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: SEMANTIC.info.bg,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.full,
    marginTop: SPACING[2],
  },
  nextMilestoneText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: SEMANTIC.info.base,
  },
  liquidInner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -60,
    marginLeft: -60,
    zIndex: 1,
  },
  liquidContainer: {
    position: 'relative',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  liquidTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liquidPercentage: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  liquidLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.white,
    fontWeight: TYPOGRAPHY.weight.semibold,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginBottom: SPACING[4],
  },
  mainStat: {
    alignItems: 'center',
  },
  mainStatValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
  },
  mainStatLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#7C93B2', // Soft blue-gray - matches hydration theme
    fontWeight: TYPOGRAPHY.weight.medium,
    marginTop: 4,
  },
  mainStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
  },
  goalReachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: '#D1FAE5',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.full,
  },
  goalReachedText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: '#059669',
  },

  // Beverage Selector
  beverageSelectorCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#475569', // Deeper slate - stands out more
    marginBottom: SPACING[3],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  beverageScroll: {
    gap: SPACING[2],
    paddingRight: SPACING[4],
  },
  beverageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    minHeight: 44,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  beverageChipActive: {
    borderColor: SEMANTIC.info.base,
    ...SHADOWS.sm,
  },
  beverageChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    zIndex: 1,
  },
  beverageIconWrapper: {
    width: 24,
    alignItems: 'center',
  },
  beverageChipLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.primary,
  },
  beverageMultiplier: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },
  multiplierBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: SPACING[1],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },

  // Quick Add
  quickAddCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  quickAddGrid: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  quickAddTile: {
    flex: 1,
    aspectRatio: 1,
  },
  quickAddTileWrapper: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  quickAddTileGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING[3],
  },
  quickAddTileLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
    marginTop: SPACING[2],
  },
  quickAddTileSubtitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },

  // Custom Amount Stepper (Plus/Minus Design)
  customAmountToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    marginTop: SPACING[4],
    paddingVertical: SPACING[2],
  },
  customAmountToggleText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: BRAND.primary,
  },
  customStepperContainer: {
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
    alignItems: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepperButtonMinus: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  stepperButtonPlus: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  stepperButtonDisabled: {
    backgroundColor: SURFACES.background.secondary,
    borderColor: SURFACES.divider,
  },
  stepperValueContainer: {
    alignItems: 'center',
    minWidth: 100,
  },
  stepperValue: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    letterSpacing: -1,
  },
  stepperUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: '#7C93B2',
    marginTop: -4,
  },
  stepperAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: SEMANTIC.info.base,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
    borderRadius: RADIUS.full,
    marginTop: SPACING[4],
    minWidth: 160,
    ...SHADOWS.sm,
  },
  stepperAddButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  stepperAddButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
  },

  // Stats Card
  statsCard: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  statsTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  statsCommentary: {
    fontSize: TYPOGRAPHY.size.sm,
    color: BRAND.primary,
    fontWeight: TYPOGRAPHY.weight.medium,
    marginBottom: SPACING[3],
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: BRAND.primary, // Brand purple for consistency
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: BRAND.primaryLight, // Light purple label
    fontWeight: TYPOGRAPHY.weight.medium,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: `${BRAND.primary}25`, // Brand-consistent divider
  },

  // Timeline
  timelineContainer: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    ...SHADOWS.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  timelineTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    flex: 1,
  },
  timelineHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    fontStyle: 'italic',
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    backgroundColor: `${BRAND.primary}10`,
    borderRadius: RADIUS.full,
    marginLeft: SPACING[2],
  },
  viewHistoryText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: BRAND.primary,
  },
  timelinePeriod: {
    marginBottom: SPACING[4],
  },
  timelinePeriodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
    paddingBottom: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 78, 255, 0.05)',
  },
  timelinePeriodName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#475569', // Deeper slate - stands out more
    textTransform: 'capitalize',
    flex: 1,
  },
  timelinePeriodTotal: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: SEMANTIC.info.base,
  },
  timelinePeriodEntries: {
    gap: SPACING[2],
    paddingLeft: SPACING[4],
  },

  // Swipeable Entry
  swipeableContainer: {
    position: 'relative',
    marginBottom: SPACING[2],
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: SPACING[4],
    borderRadius: RADIUS.md,
    gap: SPACING[2],
  },
  deleteText: {
    color: '#FFF',
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  timelineEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.md,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: SEMANTIC.info.base,
  },
  timelineIconWrapper: {
    width: 24,
    alignItems: 'center',
    marginRight: SPACING[2],
  },
  timelineAmount: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    minWidth: 50,
  },
  timelineTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    flex: 1,
  },
  timelineDeleteButton: {
    padding: 4,
  },

  // Empty State
  emptyState: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.full,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.md,
    color: TEXT.secondary,
    textAlign: 'center',
    marginBottom: SPACING[4],
    lineHeight: 22,
  },
  emptyTips: {
    alignSelf: 'stretch',
    gap: SPACING[2],
  },
  emptyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  emptyTipText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Premium Success Toast
  successToastContainer: {
    position: 'absolute',
    bottom: SPACING[6],
    left: SPACING[4],
    right: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  successToastGradient: {
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    overflow: 'hidden',
  },
  successToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  successIconSection: {
    alignItems: 'center',
    gap: SPACING[1],
  },
  waterDropContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
    letterSpacing: -0.5,
  },
  celebrationSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
  },
  celebrationIcon: {
    marginBottom: SPACING[1],
  },
  celebrationText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
    textAlign: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginTop: SPACING[1],
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },
  successUndoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ skewX: '-20deg' }],
  },
  rippleContainer: {
    position: 'absolute',
    left: 20,
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterRipple: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },

  // Milestone Toast
  milestoneToast: {
    position: 'absolute',
    top: SPACING[6],
    left: SPACING[4],
    right: SPACING[4],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.xl,
  },
  milestoneText: {
    fontSize: TYPOGRAPHY.size.md,
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
    justifyContent: 'flex-start',
  },
  confettiParticle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
