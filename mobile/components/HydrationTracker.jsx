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
  water: { multiplier: 1.0, icon: 'water', color: '#3B82F6', label: 'Water', emoji: '💧' },
  coffee: { multiplier: 0.5, icon: 'cafe', color: '#78350F', label: 'Coffee', emoji: '☕' },
  tea: { multiplier: 0.9, icon: 'leaf', color: '#059669', label: 'Tea', emoji: '🍵' },
  juice: { multiplier: 0.8, icon: 'wine', color: '#F59E0B', label: 'Juice', emoji: '🧃' },
  milk: { multiplier: 0.9, icon: 'nutrition', color: '#FBBF24', label: 'Milk', emoji: '🥛' },
};

const QUICK_ADD_SIZES = [
  { ml: 150, label: 'Small', subtitle: '150ml', icon: 'water-outline' },
  { ml: 250, label: 'Cup', subtitle: '250ml', icon: 'water' },
  { ml: 500, label: 'Bottle', subtitle: '500ml', icon: 'water' },
  { ml: 750, label: 'Large', subtitle: '750ml', icon: 'water' },
];

const MILESTONES = [25, 50, 75, 100];

// Gamified tips and motivational messages
const HYDRATION_TIPS = [
  { emoji: '💡', message: 'Drink water before meals to aid digestion!' },
  { emoji: '🧠', message: 'Your brain is 75% water - stay sharp!' },
  { emoji: '⚡', message: 'Hydration boosts energy levels naturally!' },
  { emoji: '✨', message: 'Water helps maintain healthy skin glow!' },
  { emoji: '🏃', message: 'Drink water 30 mins before exercise!' },
  { emoji: '🌙', message: 'Hydrate early, sleep better tonight!' },
  { emoji: '💪', message: 'Water aids muscle recovery!' },
  { emoji: '🎯', message: 'Consistency is key - you\'re doing great!' },
  { emoji: '🔥', message: 'Water helps regulate body temperature!' },
  { emoji: '🌟', message: 'Small sips throughout the day work best!' },
  { emoji: '🎪', message: 'Thirsty? You\'re already slightly dehydrated!' },
  { emoji: '🚀', message: 'Water carries nutrients to your cells!' },
  { emoji: '💎', message: 'Clear urine = well hydrated!' },
  { emoji: '🌊', message: 'Every sip counts toward your goal!' },
  { emoji: '🎨', message: 'Mix it up - add lemon or cucumber!' },
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
            <Stop offset="0%" stopColor={SEMANTIC.info.light} stopOpacity="1" />
            <Stop offset="50%" stopColor={SEMANTIC.info.base} stopOpacity="1" />
            <Stop offset="100%" stopColor={SEMANTIC.info.dark} stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${BRAND.primary}14`}
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
              fill={reached ? SEMANTIC.success.base : `${BRAND.primary}33`}
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
      `Remove ${entry.amount}ml ${bevType.emoji} entry?`,
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
        <Text style={styles.timelineEmoji}>{bevType.emoji}</Text>
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

const UndoToast = ({ visible, message, onUndo, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismissToast();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      dismissToast();
    }
  }, [visible]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.undoToastContainer,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.undoToastGradient}
      >
        <View style={styles.undoToastContent}>
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.undoToastMessage}>{message}</Text>
        </View>
        <TouchableOpacity
          style={styles.undoButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            dismissToast();
            if (onUndo) onUndo();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-undo" size={18} color="#FFF" />
          <Text style={styles.undoButtonText}>Undo</Text>
        </TouchableOpacity>
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
    displayText = 'Great start! 🌟';
    color = '#10B981';
  } else {
    const messages = {
      25: { text: 'Keep going! 💪', color: '#3B82F6' },
      50: { text: 'Halfway there! 🎯', color: '#8B5CF6' },
      75: { text: 'Almost there! 🚀', color: '#EC4899' },
      100: { text: 'Goal reached! 🎉', color: '#10B981' },
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
        Tap a quick-add button below to log your first drink! 💧
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
          <Text style={styles.beverageEmoji}>{bev.emoji}</Text>
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
          {bev.multiplier < 1 && (
            <View style={styles.multiplierBadge}>
              <Text style={styles.beverageMultiplier}>
                {Math.round(bev.multiplier * 100)}%
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
    const totalToday = today.reduce((sum, entry) => sum + (entry.amountLiters || 0), 0);
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

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <Ionicons name="stats-chart" size={ICON_SIZES.md} color={SEMANTIC.info.base} />
        <Text style={styles.statsTitle}>Today's Stats</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalToday}ml</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.entriesCount}</Text>
          <Text style={styles.statLabel}>Entries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.avgPerEntry}ml</Text>
          <Text style={styles.statLabel}>Avg/Entry</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.peakHour}</Text>
          <Text style={styles.statLabel}>Peak Time</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// TIMELINE WITH SWIPE-TO-DELETE
// ============================================================================

const Timeline = ({ beverageHistory, onDelete }) => {
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
        <Ionicons name="time-outline" size={ICON_SIZES.md} color={SEMANTIC.info.base} />
        <Text style={styles.timelineTitle}>Timeline</Text>
        <Text style={styles.timelineHint}>← Swipe to delete</Text>
      </View>
      {renderPeriod('Morning', 'sunny', timelineData.morning)}
      {renderPeriod('Afternoon', 'partly-sunny', timelineData.afternoon)}
      {renderPeriod('Evening', 'moon', timelineData.evening)}
      {renderPeriod('Night', 'moon-outline', timelineData.night)}
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
        useNativeDriver: true,
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
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
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

  // Show random tips periodically (every 3 logs, not at milestones)
  useEffect(() => {
    // Show tip every 3 logs, but not if we just hit a milestone
    const shouldShowTip = logCount > 0 && logCount % 3 === 0 && !showMilestone;

    if (shouldShowTip) {
      const randomTip = HYDRATION_TIPS[Math.floor(Math.random() * HYDRATION_TIPS.length)];
      setMilestoneMessage(`${randomTip.emoji} ${randomTip.message}`);
      setIsTipMessage(true);
      setShowMilestone('tip'); // Use a special key for tips

      // Reset after showing
      setTimeout(() => {
        setMilestoneMessage(null);
        setIsTipMessage(false);
      }, 4500);
    }
  }, [logCount]);

  const handleQuickAdd = useCallback(async (ml) => {
    // Prevent double-clicks with debouncing
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setLoadingButton(ml); // Show loading state for this button

    try {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const bevType = BEVERAGE_TYPES[selectedBeverage];
      const effectiveMl = ml * bevType.multiplier;

      const entry = {
        amount: ml,
        type: selectedBeverage,
        effectiveAmount: effectiveMl,
        timestamp: Date.now(),
      };

      setLastEntry(entry);
      setShowUndoToast(true);

      // Increment log count for tip tracking
      setLogCount(prev => prev + 1);

      // Show "Great Start" only on first log of the day
      if (beverageHistory.length === 0 && !shownFirstLogToast) {
        setMilestoneMessage('Great start! 🌟');
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

  const handleUndo = useCallback(async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      if (lastEntry && onRemoveWater && beverageHistory.length > 0) {
        const lastLoggedEntry = beverageHistory[beverageHistory.length - 1];
        await onRemoveWater(lastLoggedEntry.id, lastLoggedEntry.amountLiters);
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
        await onRemoveWater(entry.id, entry.amountLiters);
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
                <Text style={styles.headerTitle}>Hydration Tracker</Text>
                <Text style={styles.headerSubtitle}>Stay hydrated, stay healthy</Text>
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
              <Text style={styles.progressPercentage}>{Math.round(percentage)}%</Text>
              <Text style={styles.progressLabel}>Hydrated</Text>

              {/* Next milestone indicator */}
              {percentage >= 25 && percentage < 100 && (
                <View style={styles.nextMilestoneChip}>
                  <Ionicons name="flag-outline" size={ICON_SIZES.xs} color={SEMANTIC.info.base} />
                  <Text style={styles.nextMilestoneText}>
                    {MILESTONES.find(m => m > percentage)}% next
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.mainStat}>
              <Text style={styles.mainStatValue}>
                {(currentIntake * 1000).toFixed(0)}ml
              </Text>
              <Text style={styles.mainStatLabel}>Consumed</Text>
            </View>
            <View style={styles.mainStatDivider} />
            <View style={styles.mainStat}>
              <Text style={styles.mainStatValue}>{remainingMl}ml</Text>
              <Text style={styles.mainStatLabel}>Remaining</Text>
            </View>
          </View>

          {goalReached && (
            <View style={styles.goalReachedBanner}>
              <Ionicons name="sparkles" size={20} color="#10B981" />
              <Text style={styles.goalReachedText}>Amazing! Goal achieved! 🎉</Text>
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
        </View>

        {/* Stats */}
        {!isEmpty && <StatsCard beverageHistory={beverageHistory} dailyGoal={dailyGoal} />}

        {/* Empty State or Timeline */}
        {isEmpty ? (
          <EmptyState />
        ) : (
          <Timeline beverageHistory={beverageHistory} onDelete={handleSwipeDelete} />
        )}
      </ScrollView>

      {/* Undo Toast */}
      <UndoToast
        visible={showUndoToast}
        message={`Added ${lastEntry?.amount}ml ${BEVERAGE_TYPES[lastEntry?.type]?.emoji || '💧'}`}
        onUndo={handleUndo}
        onDismiss={() => setShowUndoToast(false)}
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
    color: TEXT.secondary,
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
    color: TEXT.tertiary,
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
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
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
  beverageEmoji: {
    fontSize: 20,
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
    color: SEMANTIC.info.base,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
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
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
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
  timelineEmoji: {
    fontSize: 16,
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

  // Undo Toast
  undoToastContainer: {
    position: 'absolute',
    bottom: SPACING[6],
    left: SPACING[4],
    right: SPACING[4],
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.xl,
  },
  undoToastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  undoToastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    flex: 1,
  },
  undoToastMessage: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[3],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: RADIUS.md,
  },
  undoButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.white,
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
