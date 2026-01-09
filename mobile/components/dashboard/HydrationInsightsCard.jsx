/**
 * ============================================================================
 * HydrationInsightsCard - Staff-Level Premium Hydration Dashboard
 * ============================================================================
 *
 * Design Philosophy:
 * - Hero Progress: Emotional anchor with animated liquid fill
 * - Smart Context: AI-driven insights based on time, behavior, goals
 * - Scannable Stats: Key metrics in a glanceable format
 * - Visual Storytelling: Beverage breakdown + weekly trends
 * - Effortless Action: Quick-add without leaving dashboard
 *
 * Senior Designer Principles:
 * - Progressive disclosure (show right info at right time)
 * - Motion with meaning (not decoration)
 * - Color conveys state (not just aesthetics)
 * - Touch = immediate feedback
 * - Delight in details
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  SURFACES,
} from '../../constants/premiumTheme';

import {
  BEVERAGE_TYPES,
  getCurrentTimePeriod,
  getTimeBasedRecommendation,
} from '../../constants/beverageConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// CONSTANTS
// ============================================================================

const QUICK_ADDS = [
  { ml: 250, label: '250ml', icon: 'water-outline' },
  { ml: 500, label: '500ml', icon: 'water', primary: true },
  { ml: 750, label: '750ml', icon: 'water-outline' },
];

const INSIGHT_TEMPLATES = {
  earlyStart: {
    icon: 'sunny-outline',
    color: '#F59E0B',
    message: 'Great start! Morning hydration boosts metabolism',
  },
  onTrack: {
    icon: 'trending-up',
    color: '#10B981',
    message: 'You\'re on pace - keep the rhythm going',
  },
  behindPace: {
    icon: 'time-outline',
    color: '#F59E0B',
    message: 'A bit behind - try a glass now to catch up',
  },
  almostThere: {
    icon: 'flag-outline',
    color: '#3B82F6',
    message: 'Almost there! One more glass to hit your goal',
  },
  goalReached: {
    icon: 'trophy',
    color: '#10B981',
    message: 'Goal achieved! Maintain with small sips if needed',
  },
  coffeeHeavy: {
    icon: 'cafe-outline',
    color: '#78350F',
    message: 'Lots of caffeine today - balance with water',
  },
  excellentVariety: {
    icon: 'sparkles',
    color: '#8B5CF6',
    message: 'Great beverage variety today!',
  },
  eveningWind: {
    icon: 'moon-outline',
    color: '#6366F1',
    message: 'Evening mode - smaller sips for better sleep',
  },
};

// ============================================================================
// ANIMATED PROGRESS RING
// ============================================================================

function AnimatedProgressRing({ progress, size = 140, strokeWidth = 12 }) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: Math.min(progress, 100),
      tension: 20,
      friction: 8,
      useNativeDriver: false,
    }).start();

    // Glow effect when near goal
    if (progress >= 80) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glowOpacity.setValue(0);
    }
  }, [progress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  const progressColor = progress >= 100 ? '#10B981' : progress >= 80 ? '#3B82F6' : '#60A5FA';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow Effect */}
      <Animated.View
        style={[
          styles.progressGlow,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            opacity: glowOpacity,
            backgroundColor: progressColor,
          },
        ]}
      />

      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#60A5FA" />
            <Stop offset="100%" stopColor={progressColor} />
          </SvgGradient>
        </Defs>

        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(59, 130, 246, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Progress Circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>

      {/* Center Content */}
      <View style={styles.progressCenter}>
        <Text style={[styles.progressPercent, { color: progressColor }]}>
          {Math.round(progress)}%
        </Text>
        <Text style={styles.progressLabel}>hydrated</Text>
      </View>
    </View>
  );
}

// Animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// BEVERAGE BREAKDOWN PILLS
// ============================================================================

function BeverageBreakdown({ logs = [] }) {
  const breakdown = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    const totals = {};
    let totalMl = 0;

    logs.forEach(log => {
      const type = log.beverageType || 'water';
      const amount = parseFloat(log.amountLiters || 0) * 1000;
      totals[type] = (totals[type] || 0) + amount;
      totalMl += amount;
    });

    return Object.entries(totals)
      .map(([type, amount]) => ({
        type,
        amount,
        percent: Math.round((amount / totalMl) * 100),
        ...BEVERAGE_TYPES[type] || BEVERAGE_TYPES.water,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4); // Max 4 types shown
  }, [logs]);

  if (breakdown.length === 0) return null;

  return (
    <View style={styles.breakdownContainer}>
      <Text style={styles.breakdownTitle}>Today's Mix</Text>
      <View style={styles.breakdownPills}>
        {breakdown.map((item) => (
          <View
            key={item.type}
            style={[styles.breakdownPill, { backgroundColor: `${item.color}15` }]}
          >
            <Text style={styles.breakdownEmoji}>{item.emoji}</Text>
            <Text style={[styles.breakdownPercent, { color: item.color }]}>
              {item.percent}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// WEEKLY TREND SPARKLINE
// ============================================================================

function WeeklyTrend({ weekData = [] }) {
  const data = useMemo(() => {
    // Ensure we have 7 days of data
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date().getDay();

    // Generate last 7 days
    return days.map((label, i) => {
      const dayIndex = (today - 6 + i + 7) % 7;
      const dayData = weekData[i] || { total: 0, goal: 2000 };
      return {
        label: days[dayIndex],
        value: dayData.total || 0,
        goal: dayData.goal || 2000,
        isToday: i === 6,
      };
    });
  }, [weekData]);

  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.goal)), 1);

  return (
    <View style={styles.trendContainer}>
      <View style={styles.trendHeader}>
        <Text style={styles.trendTitle}>This Week</Text>
        <View style={styles.trendLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Actual</Text>
          </View>
        </View>
      </View>

      <View style={styles.trendBars}>
        {data.map((day, i) => {
          const height = (day.value / maxValue) * 50;
          const goalHeight = (day.goal / maxValue) * 50;
          const metGoal = day.value >= day.goal;

          return (
            <View key={i} style={styles.trendBarWrapper}>
              <View style={styles.trendBarContainer}>
                {/* Goal line indicator */}
                <View
                  style={[
                    styles.trendGoalLine,
                    { bottom: goalHeight }
                  ]}
                />
                {/* Actual bar */}
                <View
                  style={[
                    styles.trendBar,
                    {
                      height: Math.max(height, 4),
                      backgroundColor: metGoal ? '#10B981' : day.isToday ? '#3B82F6' : '#93C5FD',
                    },
                  ]}
                />
              </View>
              <Text style={[
                styles.trendLabel,
                day.isToday && styles.trendLabelToday
              ]}>
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ============================================================================
// SMART INSIGHT CARD
// ============================================================================

function SmartInsight({ progress, logs = [], timePeriod }) {
  const insight = useMemo(() => {
    const hour = new Date().getHours();
    const expectedProgress = (hour / 24) * 100;

    // Goal reached
    if (progress >= 100) {
      return INSIGHT_TEMPLATES.goalReached;
    }

    // Almost there
    if (progress >= 85) {
      return INSIGHT_TEMPLATES.almostThere;
    }

    // Check beverage mix
    const coffeeCount = logs.filter(l => l.beverageType === 'coffee').length;
    if (coffeeCount >= 3) {
      return INSIGHT_TEMPLATES.coffeeHeavy;
    }

    // Evening wind down
    if (hour >= 20) {
      return INSIGHT_TEMPLATES.eveningWind;
    }

    // Early morning success
    if (hour < 10 && progress >= 25) {
      return INSIGHT_TEMPLATES.earlyStart;
    }

    // Behind pace
    if (progress < expectedProgress - 15) {
      return INSIGHT_TEMPLATES.behindPace;
    }

    // On track
    return INSIGHT_TEMPLATES.onTrack;
  }, [progress, logs]);

  return (
    <View style={styles.insightContainer}>
      <View style={[styles.insightIcon, { backgroundColor: `${insight.color}15` }]}>
        <Ionicons name={insight.icon} size={18} color={insight.color} />
      </View>
      <Text style={styles.insightText}>{insight.message}</Text>
    </View>
  );
}

// ============================================================================
// QUICK STATS ROW
// ============================================================================

function QuickStats({ current, goal, logsCount, streak = 0 }) {
  const remaining = Math.max(0, goal - current);
  const glassesRemaining = Math.ceil(remaining / 0.25); // 250ml glasses

  return (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{(current * 1000).toFixed(0)}</Text>
        <Text style={styles.statUnit}>ml today</Text>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <Text style={styles.statValue}>{logsCount}</Text>
        <Text style={styles.statUnit}>drinks</Text>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <Text style={[styles.statValue, remaining === 0 && styles.statValueSuccess]}>
          {remaining === 0 ? '✓' : glassesRemaining}
        </Text>
        <Text style={styles.statUnit}>{remaining === 0 ? 'complete' : 'glasses left'}</Text>
      </View>

      {streak > 0 && (
        <>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color="#F59E0B" />
              <Text style={styles.streakValue}>{streak}</Text>
            </View>
            <Text style={styles.statUnit}>day streak</Text>
          </View>
        </>
      )}
    </View>
  );
}

// ============================================================================
// QUICK ADD BUTTONS
// ============================================================================

function QuickAddButtons({ onAdd, isLoading }) {
  const [loadingIndex, setLoadingIndex] = useState(null);

  const handleAdd = async (ml, index) => {
    setLoadingIndex(index);
    await Haptics.impactAsync(
      QUICK_ADDS[index].primary
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );

    try {
      await onAdd(ml / 1000); // Convert to liters
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <View style={styles.quickAddContainer}>
      {QUICK_ADDS.map((item, index) => (
        <TouchableOpacity
          key={item.ml}
          style={[
            styles.quickAddButton,
            item.primary && styles.quickAddButtonPrimary,
            loadingIndex === index && styles.quickAddButtonLoading,
          ]}
          onPress={() => handleAdd(item.ml, index)}
          disabled={loadingIndex !== null}
          activeOpacity={0.7}
        >
          {item.primary ? (
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.quickAddGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={item.icon} size={18} color={TEXT.white} />
              <Text style={styles.quickAddLabelPrimary}>{item.label}</Text>
            </LinearGradient>
          ) : (
            <>
              <Ionicons name={item.icon} size={16} color={SEMANTIC.info.base} />
              <Text style={styles.quickAddLabel}>{item.label}</Text>
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HydrationInsightsCard({
  currentIntake = 0,
  dailyGoal = 2.0,
  logs = [],
  weekData = [],
  streak = 0,
  onQuickAdd,
  onOpenTracker,
}) {
  const progress = dailyGoal > 0 ? (currentIntake / dailyGoal) * 100 : 0;
  const timePeriod = getCurrentTimePeriod();

  const handleQuickAdd = useCallback(async (amountLiters) => {
    if (onQuickAdd) {
      await onQuickAdd(amountLiters, 'water');
    }
  }, [onQuickAdd]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="water" size={20} color={SEMANTIC.info.base} />
          </View>
          <Text style={styles.headerTitle}>Hydration</Text>
        </View>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={onOpenTracker}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.detailsText}>Details</Text>
          <Ionicons name="chevron-forward" size={16} color={SEMANTIC.info.base} />
        </TouchableOpacity>
      </View>

      {/* Hero Section - Progress Ring */}
      <View style={styles.heroSection}>
        <AnimatedProgressRing progress={progress} size={140} />

        {/* Goal Indicator */}
        <View style={styles.goalBadge}>
          <Ionicons name="flag" size={12} color={TEXT.tertiary} />
          <Text style={styles.goalText}>{(dailyGoal * 1000).toFixed(0)}ml goal</Text>
        </View>
      </View>

      {/* Smart Insight */}
      <SmartInsight progress={progress} logs={logs} timePeriod={timePeriod} />

      {/* Quick Stats */}
      <QuickStats
        current={currentIntake}
        goal={dailyGoal}
        logsCount={logs.length}
        streak={streak}
      />

      {/* Beverage Breakdown */}
      <BeverageBreakdown logs={logs} />

      {/* Weekly Trend */}
      <WeeklyTrend weekData={weekData} />

      {/* Quick Add Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.actionsLabel}>Quick Add</Text>
        <QuickAddButtons onAdd={handleQuickAdd} />
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.md,
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
    gap: SPACING[2],
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: `${SEMANTIC.info.base}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: SEMANTIC.info.base,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  progressGlow: {
    position: 'absolute',
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 32,
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: -1,
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    marginTop: SPACING[2],
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.full,
  },
  goalText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },

  // Smart Insight
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[4],
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
    lineHeight: 20,
  },

  // Quick Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[4],
    paddingVertical: SPACING[2],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statValueSuccess: {
    color: '#10B981',
  },
  statUnit: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: SURFACES.background.tertiary,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#F59E0B',
  },

  // Beverage Breakdown
  breakdownContainer: {
    marginBottom: SPACING[4],
  },
  breakdownTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  breakdownPills: {
    flexDirection: 'row',
    gap: SPACING[2],
    flexWrap: 'wrap',
  },
  breakdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[2],
    borderRadius: RADIUS.full,
  },
  breakdownEmoji: {
    fontSize: 14,
  },
  breakdownPercent: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Weekly Trend
  trendContainer: {
    marginBottom: SPACING[4],
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  trendTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendLegend: {
    flexDirection: 'row',
    gap: SPACING[3],
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
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 70,
    paddingTop: 20,
  },
  trendBarWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  trendBarContainer: {
    width: 24,
    height: 50,
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  trendBar: {
    width: 16,
    borderRadius: 4,
  },
  trendGoalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 1,
  },
  trendLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
    marginTop: SPACING[1],
  },
  trendLabelToday: {
    color: SEMANTIC.info.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },

  // Quick Add Actions
  actionsSection: {
    borderTopWidth: 1,
    borderTopColor: SURFACES.background.tertiary,
    paddingTop: SPACING[4],
  },
  actionsLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },
  quickAddContainer: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  quickAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: `${SEMANTIC.info.base}10`,
    borderWidth: 1,
    borderColor: `${SEMANTIC.info.base}20`,
  },
  quickAddButtonPrimary: {
    borderWidth: 0,
    overflow: 'hidden',
  },
  quickAddButtonLoading: {
    opacity: 0.6,
  },
  quickAddGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    paddingVertical: SPACING[3],
  },
  quickAddLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: SEMANTIC.info.base,
  },
  quickAddLabelPrimary: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.white,
  },
});
