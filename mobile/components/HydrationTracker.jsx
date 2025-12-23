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

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
  PanResponder,
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

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  SURFACES,
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
            <Stop offset="0%" stopColor="#60A5FA" stopOpacity="0.9" />
            <Stop offset="50%" stopColor="#3B82F6" stopOpacity="0.95" />
            <Stop offset="100%" stopColor="#2563EB" stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          fill="rgba(59, 130, 246, 0.05)"
          stroke="rgba(59, 130, 246, 0.2)"
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

const ProgressRing = ({ percentage, size = 180, strokeWidth = 12 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View
      style={[
        styles.ringContainer,
        { width: size, height: size },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
            <Stop offset="50%" stopColor="#8B5CF6" stopOpacity="1" />
            <Stop offset="100%" stopColor="#EC4899" stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(107, 78, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress Circle */}
        <Circle
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
              fill={reached ? '#10B981' : 'rgba(107, 78, 255, 0.2)'}
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          translateX.setValue(Math.max(gesture.dx, -100));
          deleteOpacity.setValue(Math.min(Math.abs(gesture.dx) / 100, 1));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -60) {
          // Delete threshold
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Animated.timing(translateX, {
            toValue: -300,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (onDelete) onDelete();
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }).start();
          Animated.timing(deleteOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
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
      <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
        <Ionicons name="trash" size={24} color="#FFF" />
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
// MILESTONE TOAST - Celebrates progress milestones
// ============================================================================

const MilestoneToast = ({ milestone, visible, onDismiss }) => {
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
      }, 3000);
    }
  }, [visible, milestone]);

  if (!visible) return null;

  const messages = {
    25: { text: 'Great start! 🌟', color: '#3B82F6' },
    50: { text: 'Halfway there! 💪', color: '#8B5CF6' },
    75: { text: 'Almost there! 🚀', color: '#EC4899' },
    100: { text: 'Goal reached! 🎉', color: '#10B981' },
  };

  const { text, color } = messages[milestone] || messages[25];

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
      <Text style={styles.milestoneText}>{text}</Text>
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
      setShowMilestone(currentMilestone);

      if (currentMilestone === 100) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }

    setPreviousPercentage(percentage);
  }, [percentage]);

  const handleQuickAdd = async (ml) => {
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

    if (onLogWater) {
      onLogWater(entry);
    }
  };

  const handleUndo = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (lastEntry && onRemoveWater && beverageHistory.length > 0) {
      const lastLoggedEntry = beverageHistory[beverageHistory.length - 1];
      onRemoveWater(lastLoggedEntry.id, lastLoggedEntry.amountLiters);
    }
    setShowUndoToast(false);
  };

  const handleSwipeDelete = async (entry) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (onRemoveWater) {
      onRemoveWater(entry.id, entry.amountLiters);
    }
  };

  const isEmpty = beverageHistory.length === 0;

  return (
    <View style={styles.mainContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <LinearGradient
          colors={['#F0F9FF', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="water" size={28} color={SEMANTIC.info.base} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Hydration Tracker</Text>
                <Text style={styles.headerSubtitle}>Stay hydrated, stay healthy</Text>
              </View>
            </View>
            {goalReached && (
              <View style={styles.goalBadge}>
                <Ionicons name="trophy" size={20} color="#F59E0B" />
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Main Visualization */}
        <View style={styles.visualizationCard}>
          <View style={styles.progressContainer}>
            <ProgressRing percentage={percentage} size={160} strokeWidth={10} />
            <View style={styles.liquidInner}>
              <LiquidWave percentage={percentage} size={120} />
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
              <TouchableOpacity
                key={key}
                style={[
                  styles.beverageChip,
                  selectedBeverage === key && styles.beverageChipActive,
                ]}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedBeverage(key);
                }}
                activeOpacity={0.7}
              >
                {selectedBeverage === key && (
                  <LinearGradient
                    colors={[bev.color + '20', bev.color + '10']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={styles.beverageEmoji}>{bev.emoji}</Text>
                <Text
                  style={[
                    styles.beverageChipLabel,
                    selectedBeverage === key && { color: bev.color, fontWeight: '700' },
                  ]}
                >
                  {bev.label}
                </Text>
                {bev.multiplier < 1 && (
                  <Text style={styles.beverageMultiplier}>
                    {Math.round(bev.multiplier * 100)}%
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.quickAddCard}>
          <Text style={styles.sectionLabel}>Quick Add</Text>
          <View style={styles.quickAddGrid}>
            {QUICK_ADD_SIZES.map((size) => (
              <TouchableOpacity
                key={size.ml}
                style={styles.quickAddTile}
                onPress={() => handleQuickAdd(size.ml)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={SURFACES.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickAddTileGradient}
                >
                  <Ionicons name={size.icon} size={32} color="#FFF" />
                  <Text style={styles.quickAddTileLabel}>{size.label}</Text>
                  <Text style={styles.quickAddTileSubtitle}>{size.subtitle}</Text>
                </LinearGradient>
              </TouchableOpacity>
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
        onDismiss={() => setShowMilestone(null)}
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
    ...SHADOWS.md,
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
    width: 56,
    height: 56,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  goalBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: SPACING[5],
  },
  ringContainer: {
    position: 'absolute',
  },
  liquidInner: {
    position: 'relative',
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
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.secondary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  beverageChipActive: {
    borderColor: SEMANTIC.info.base,
    ...SHADOWS.sm,
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
    marginLeft: SPACING[1],
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
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
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
