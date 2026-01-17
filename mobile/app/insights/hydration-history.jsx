/**
 * Hydration History Screen
 *
 * Features:
 * - Vibrant gradient hero card
 * - AI-powered smart recommendations
 * - Dynamic pace indicators
 * - Full WEEK/MONTH/YEAR views
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

import { useWaterLog } from '../../hooks/useWaterLog';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GOAL_ML = 2000;
const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const COLORS = {
  primary: '#13a4ec',
  primaryDark: '#0284c7',
  primaryLight: '#E0F2FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    tertiary: '#94A3B8',
  },
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  gradient: {
    hero: ['#38BDF8', '#0EA5E9', '#0284C7'],
    success: ['#34D399', '#10B981', '#059669'],
  },
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ============================================================================
// HELPERS
// ============================================================================

const getLocalDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatMl = (ml) => {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1).replace('.0', '')}`;
  return `${ml}`;
};

const formatLiters = (ml) => (ml / 1000).toFixed(1);

// ============================================================================
// SMART RECOMMENDATION ENGINE
// ============================================================================

const generateSmartRecommendations = (hydrationByDate, todayMl, goal) => {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const recommendations = [];

  // Calculate patterns
  let weekdayTotal = 0, weekdayCount = 0;
  let weekendTotal = 0, weekendCount = 0;
  let morningTotal = 0, afternoonTotal = 0, eveningTotal = 0;
  let bestDay = { ml: 0, date: null };
  let recentDays = [];

  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getLocalDateKey(d);
    const data = hydrationByDate[key];
    const ml = data?.totalMl || 0;

    if (i < 7) recentDays.push(ml);

    if (ml > 0) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) {
        weekendTotal += ml;
        weekendCount++;
      } else {
        weekdayTotal += ml;
        weekdayCount++;
      }

      if (ml > bestDay.ml) {
        bestDay = { ml, date: d };
      }

      // Analyze logs by time
      (data?.logs || []).forEach(log => {
        const logHour = new Date(log.timestamp).getHours();
        if (logHour < 12) morningTotal += log.amount;
        else if (logHour < 17) afternoonTotal += log.amount;
        else eveningTotal += log.amount;
      });
    }
  }

  const weekdayAvg = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
  const weekendAvg = weekendCount > 0 ? weekendTotal / weekendCount : 0;

  // Expected progress based on time of day (assuming 6am-10pm active hours)
  const activeHoursElapsed = Math.max(0, Math.min(16, hour - 6));
  const expectedProgress = (activeHoursElapsed / 16) * goal;
  const currentPace = todayMl / Math.max(expectedProgress, 1);

  // === INTELLIGENT RECOMMENDATIONS ===

  // 1. Pace-based recommendations
  if (hour >= 8 && hour <= 20) {
    if (todayMl < expectedProgress * 0.5) {
      const glassesNeeded = Math.ceil((expectedProgress - todayMl) / 250);
      recommendations.push({
        id: 'pace_behind',
        icon: 'speedometer',
        iconColor: COLORS.warning,
        title: 'Catch Up Time',
        message: `You're ${Math.round((1 - currentPace) * 100)}% behind your usual pace. Try drinking ${glassesNeeded} glasses in the next 2 hours.`,
        priority: 1,
        actionable: true,
        action: 'Log 250ml now',
      });
    } else if (todayMl >= goal) {
      recommendations.push({
        id: 'goal_achieved',
        icon: 'trophy',
        iconColor: '#F59E0B',
        title: 'Goal Achieved!',
        message: 'Amazing work! You\'ve hit your daily hydration goal. Keep sipping to maintain optimal hydration.',
        priority: 0,
        actionable: false,
      });
    } else if (todayMl >= expectedProgress * 0.9) {
      recommendations.push({
        id: 'pace_good',
        icon: 'checkmark-circle',
        iconColor: COLORS.success,
        title: 'Great Progress',
        message: `You're on track! Just ${formatMl(goal - todayMl)}ml to go. You've got this!`,
        priority: 2,
        actionable: false,
      });
    }
  }

  // 2. Time-based recommendations
  if (hour >= 6 && hour < 9 && todayMl < 250) {
    recommendations.push({
      id: 'morning_hydration',
      icon: 'sunny',
      iconColor: '#FBBF24',
      title: 'Morning Boost',
      message: 'Start your day right! Drinking water first thing helps kickstart your metabolism and improve focus.',
      priority: 1,
      actionable: true,
      action: 'Log morning water',
    });
  }

  if (hour >= 14 && hour < 16 && todayMl < goal * 0.5) {
    recommendations.push({
      id: 'afternoon_slump',
      icon: 'cafe',
      iconColor: '#8B5CF6',
      title: 'Beat the Afternoon Slump',
      message: 'Feeling tired? Dehydration causes fatigue. A glass of water can boost energy better than caffeine!',
      priority: 2,
      actionable: true,
      action: 'Hydrate now',
    });
  }

  if (hour >= 20 && todayMl < goal * 0.8) {
    const remaining = goal - todayMl;
    recommendations.push({
      id: 'evening_catch_up',
      icon: 'moon',
      iconColor: '#6366F1',
      title: 'Evening Reminder',
      message: `Still ${formatMl(remaining)}ml to go. Try to finish before bed, but not too close to sleep time!`,
      priority: 1,
      actionable: true,
      action: 'Quick catch-up',
    });
  }

  // 3. Pattern-based recommendations
  if (isWeekend && weekendAvg < weekdayAvg * 0.7 && weekdayCount > 3) {
    recommendations.push({
      id: 'weekend_pattern',
      icon: 'calendar',
      iconColor: COLORS.primary,
      title: 'Weekend Watch',
      message: `Your weekend hydration tends to drop ${Math.round((1 - weekendAvg/weekdayAvg) * 100)}% below weekdays. Set a reminder to stay consistent!`,
      priority: 3,
      actionable: false,
    });
  }

  // 4. Streak and motivation
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getLocalDateKey(d);
    const ml = hydrationByDate[key]?.totalMl || 0;
    if (i === 0 && ml === 0) continue;
    if (ml > 0) streak++;
    else break;
  }

  if (streak >= 7) {
    recommendations.push({
      id: 'streak_celebration',
      icon: 'flame',
      iconColor: '#EF4444',
      title: `${streak} Day Streak!`,
      message: 'Your consistency is paying off. Research shows habits stick after 21 days. Keep going!',
      priority: 4,
      actionable: false,
    });
  } else if (streak === 0 && recentDays.filter(d => d > 0).length > 0) {
    recommendations.push({
      id: 'restart_streak',
      icon: 'refresh',
      iconColor: COLORS.primary,
      title: 'Fresh Start',
      message: 'Today is a new opportunity! Log your first drink to start building your streak.',
      priority: 1,
      actionable: true,
      action: 'Start streak',
    });
  }

  // 5. Best time insight
  const maxTime = Math.max(morningTotal, afternoonTotal, eveningTotal);
  if (maxTime > 0) {
    const bestTime = morningTotal === maxTime ? 'morning' : afternoonTotal === maxTime ? 'afternoon' : 'evening';
    const currentTimeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    if (bestTime === currentTimeSlot && todayMl < goal * 0.3) {
      recommendations.push({
        id: 'peak_time',
        icon: 'trending-up',
        iconColor: COLORS.success,
        title: 'Peak Hydration Time',
        message: `You typically drink the most in the ${bestTime}. Now's a great time to hydrate!`,
        priority: 2,
        actionable: true,
        action: 'Take advantage',
      });
    }
  }

  // 6. Personal best motivation
  if (bestDay.ml > 0 && todayMl > 0 && todayMl < bestDay.ml * 0.5 && hour >= 14) {
    recommendations.push({
      id: 'personal_best',
      icon: 'ribbon',
      iconColor: '#EC4899',
      title: 'Beat Your Best',
      message: `Your record is ${formatMl(bestDay.ml)}ml. You're ${Math.round((todayMl/bestDay.ml) * 100)}% there. Push for a new personal best!`,
      priority: 3,
      actionable: false,
    });
  }

  // Sort by priority and return top 3
  return recommendations.sort((a, b) => a.priority - b.priority).slice(0, 3);
};

// Calculate pace status - Encouraging messaging, no harsh colors
const getPaceStatus = (todayMl, goal) => {
  const now = new Date();
  const hour = now.getHours();
  const activeHoursElapsed = Math.max(0, Math.min(16, hour - 6));
  const expectedProgress = (activeHoursElapsed / 16) * goal;

  // Goal achieved - celebrate!
  if (todayMl >= goal) return { status: 'completed', label: 'Goal Reached!', color: COLORS.success, icon: 'trophy' };
  // Ahead of pace - positive reinforcement
  if (todayMl >= expectedProgress * 1.1) return { status: 'ahead', label: 'Ahead of Pace', color: COLORS.success, icon: 'rocket' };
  // On track - encouraging
  if (todayMl >= expectedProgress * 0.8) return { status: 'on_track', label: 'On Track', color: COLORS.primary, icon: 'checkmark-circle' };
  // Behind - gentle nudge (orange, not red)
  if (todayMl >= expectedProgress * 0.5) return { status: 'behind', label: 'Time to Hydrate', color: '#F59E0B', icon: 'water-outline' };
  // Far behind - still encouraging, use softer amber (no red!)
  if (hour < 12) return { status: 'starting', label: 'Start Your Day', color: '#F59E0B', icon: 'sunny-outline' };
  return { status: 'catch_up', label: 'Sip More Soon', color: '#F59E0B', icon: 'water' };
};

// ============================================================================
// TAB SELECTOR
// ============================================================================

const TabSelector = ({ selected, onSelect }) => {
  const tabs = ['WEEK', 'MONTH', 'YEAR'];

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, selected === tab && styles.tabSelected]}
          onPress={() => {
            Haptics.selectionAsync();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onSelect(tab);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, selected === tab && styles.tabTextSelected]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// VIBRANT HERO CARD (Gradient)
// ============================================================================

const HeroCard = ({ todayMl, goal, streak, onQuickAdd }) => {
  const percentage = Math.round((todayMl / goal) * 100);
  const remaining = Math.max(0, goal - todayMl);
  const paceStatus = getPaceStatus(todayMl, goal);
  const goalMet = todayMl >= goal;

  return (
    <ExpoLinearGradient
      colors={goalMet ? COLORS.gradient.success : COLORS.gradient.hero}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      {/* Header */}
      <View style={styles.heroHeader}>
        <View style={styles.heroBadge}>
          <Ionicons name="water" size={14} color={COLORS.primary} />
          <Text style={styles.heroBadgeText}>HYDRATION</Text>
        </View>
        <View style={styles.heroRightSection}>
          <View style={styles.heroPercentContainer}>
            <Text style={styles.heroPercentValue}>{Math.min(percentage, 999)}%</Text>
            <Text style={styles.heroPercentLabel}>OF DAILY GOAL</Text>
          </View>
          {/* Quick Add FAB - beside percentage with 3D effect */}
          <TouchableOpacity
            style={styles.heroFabInline}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onQuickAdd?.();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Value */}
      <View style={styles.heroMainValue}>
        <Text style={styles.heroMl}>{formatMl(todayMl)}</Text>
        <Text style={styles.heroMlUnit}>ml</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.heroProgressContainer}>
        <View style={styles.heroProgressBar}>
          <View style={[styles.heroProgressFill, { width: `${Math.min(percentage, 100)}%` }]} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.heroFooter}>
        <Text style={styles.heroRemaining}>
          {goalMet ? 'Well done!' : `${formatMl(remaining)}ml to go`}
        </Text>
        <View style={styles.paceIndicator}>
          <Ionicons name={paceStatus.icon || 'water'} size={12} color="#0284C7" style={{ marginRight: 4 }} />
          <Text style={styles.paceText}>
            {paceStatus.label}
          </Text>
        </View>
      </View>

    </ExpoLinearGradient>
  );
};

// ============================================================================
// SMART RECOMMENDATIONS CARD
// ============================================================================

const RecommendationsSection = ({ recommendations, onAction }) => {
  if (recommendations.length === 0) return null;

  return (
    <View style={styles.recommendationsContainer}>
      <Text style={styles.sectionTitle}>Smart Insights</Text>
      {recommendations.map((rec, idx) => (
        <View key={rec.id} style={styles.recommendationCard}>
          <View style={[styles.recommendationIcon, { backgroundColor: `${rec.iconColor}15` }]}>
            <Ionicons name={rec.icon} size={20} color={rec.iconColor} />
          </View>
          <View style={styles.recommendationContent}>
            <Text style={styles.recommendationTitle}>{rec.title}</Text>
            <Text style={styles.recommendationMessage}>{rec.message}</Text>
            {rec.actionable && (
              <TouchableOpacity
                style={styles.recommendationAction}
                onPress={() => onAction?.(rec)}
                activeOpacity={0.7}
              >
                <Text style={styles.recommendationActionText}>{rec.action}</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

// ============================================================================
// STATS CARDS
// ============================================================================

const StatsRow = ({ hydrationByDate, goal }) => {
  const stats = useMemo(() => {
    let streak = 0;
    let totalDays = 0;
    let totalMl = 0;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      const ml = hydrationByDate[key]?.totalMl || 0;
      if (ml > 0) {
        totalMl += ml;
        totalDays++;
      }
    }

    // Calculate streak
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      const ml = hydrationByDate[key]?.totalMl || 0;
      if (i === 0 && ml === 0) continue;
      if (ml > 0) streak++;
      else break;
    }

    const avgMl = totalDays > 0 ? totalMl / totalDays : 0;
    const avgPct = Math.round((avgMl / goal) * 100);

    return { streak, avgMl, avgPct, totalDays };
  }, [hydrationByDate, goal]);

  return (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <View style={styles.statIconContainer}>
          <Ionicons name="flame" size={18} color="#EF4444" />
        </View>
        <Text style={styles.statValue}>{stats.streak}</Text>
        <Text style={styles.statLabel}>Day Streak</Text>
      </View>
      <View style={styles.statCard}>
        <View style={styles.statIconContainer}>
          <Ionicons name="water" size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.statValue}>{formatLiters(stats.avgMl)}L</Text>
        <Text style={styles.statLabel}>Daily Avg</Text>
      </View>
      <View style={styles.statCard}>
        <View style={styles.statIconContainer}>
          <Ionicons name="analytics" size={18} color={COLORS.success} />
        </View>
        <Text style={styles.statValue}>{stats.avgPct}%</Text>
        <Text style={styles.statLabel}>Avg Goal</Text>
      </View>
    </View>
  );
};

// ============================================================================
// WEEKLY BAR CHART - 7-day bar chart with last week comparison
// ============================================================================

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const WeeklyBarChart = ({ hydrationByDate, goal }) => {
  const chartData = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // Current week data
    const currentWeek = [];
    let currentWeekTotal = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - mondayOffset + i);
      const key = getLocalDateKey(d);
      const ml = hydrationByDate[key]?.totalMl || 0;
      currentWeek.push({ day: WEEK_DAYS[i], ml, isToday: getLocalDateKey(d) === getLocalDateKey(today) });
      // Only count up to today for fair comparison
      if (d <= today) currentWeekTotal += ml;
    }

    // Last week data (same days)
    let lastWeekTotal = 0;
    const daysElapsed = mondayOffset + 1; // How many days into the week
    for (let i = 0; i < daysElapsed; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - mondayOffset + i - 7);
      const key = getLocalDateKey(d);
      lastWeekTotal += hydrationByDate[key]?.totalMl || 0;
    }

    // Calculate comparison percentage
    let comparison = 0;
    if (lastWeekTotal > 0) {
      comparison = Math.round(((currentWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
    } else if (currentWeekTotal > 0) {
      comparison = 100; // Infinite improvement from 0
    }

    // Find max for scaling
    const maxMl = Math.max(...currentWeek.map(d => d.ml), goal);

    return {
      days: currentWeek,
      total: currentWeekTotal,
      lastWeekTotal,
      comparison,
      maxMl,
    };
  }, [hydrationByDate, goal]);

  const isImproving = chartData.comparison >= 0;

  return (
    <View style={styles.weeklyBarCard}>
      <View style={styles.weeklyBarHeader}>
        <View style={styles.weeklyBarTitleRow}>
          <Ionicons name="bar-chart" size={18} color={COLORS.primary} />
          <Text style={styles.weeklyBarTitle}>This Week</Text>
        </View>
        <View style={styles.weeklyBarStats}>
          <Text style={styles.weeklyBarTotal}>{formatLiters(chartData.total)}L</Text>
          {chartData.lastWeekTotal > 0 && (
            <View style={[styles.comparisonBadge, isImproving ? styles.comparisonBadgeUp : styles.comparisonBadgeDown]}>
              <Ionicons
                name={isImproving ? 'trending-up' : 'trending-down'}
                size={12}
                color={isImproving ? COLORS.success : COLORS.warning}
              />
              <Text style={[styles.comparisonText, isImproving ? styles.comparisonTextUp : styles.comparisonTextDown]}>
                {isImproving ? '+' : ''}{chartData.comparison}%
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.weeklyBarChartContainer}>
        {/* Goal line */}
        <View style={[styles.goalLine, { bottom: `${(goal / chartData.maxMl) * 100}%` }]}>
          <View style={styles.goalLineDash} />
          <Text style={styles.goalLineLabel}>Goal</Text>
        </View>

        {/* Bars */}
        <View style={styles.weeklyBars}>
          {chartData.days.map((day, idx) => {
            const heightPct = chartData.maxMl > 0 ? (day.ml / chartData.maxMl) * 100 : 0;
            const metGoal = day.ml >= goal;
            return (
              <View key={idx} style={styles.weeklyBarItem}>
                <View style={styles.weeklyBarTrack}>
                  <View
                    style={[
                      styles.weeklyBarFill,
                      { height: `${Math.min(heightPct, 100)}%` },
                      metGoal && styles.weeklyBarFillGoal,
                      day.isToday && styles.weeklyBarFillToday,
                    ]}
                  />
                </View>
                <Text style={[styles.weeklyBarLabel, day.isToday && styles.weeklyBarLabelToday]}>
                  {day.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.weeklyBarFooter}>
        <Text style={styles.weeklyBarFooterText}>
          {chartData.lastWeekTotal > 0
            ? `vs ${formatLiters(chartData.lastWeekTotal)}L last week`
            : 'Keep logging to see weekly trends'}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// CONSISTENCY CARD - Weekly streak visualization
// ============================================================================

const ConsistencyCard = ({ hydrationByDate, goal }) => {
  const weekData = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Adjust to start from Monday (0 = Monday, 6 = Sunday)
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const result = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - mondayOffset + i);
      const key = getLocalDateKey(d);
      const data = hydrationByDate[key];
      const ml = data?.totalMl || 0;
      const pct = Math.min((ml / goal) * 100, 100);
      const isPast = d < today && getLocalDateKey(d) !== getLocalDateKey(today);
      const isToday = getLocalDateKey(d) === getLocalDateKey(today);
      const isFuture = d > today && !isToday;
      // Partial progress (logged something but didn't hit goal)
      const hasProgress = ml > 0 && ml < goal;
      result.push({ day: WEEK_DAYS[i], ml, pct, goalMet: ml >= goal, isPast, isToday, isFuture, hasProgress });
    }
    return result;
  }, [hydrationByDate, goal]);

  const daysCompleted = weekData.filter(d => d.goalMet).length;
  const daysWithProgress = weekData.filter(d => d.hasProgress || d.goalMet).length;
  const consistencyPct = Math.round((daysCompleted / 7) * 100);

  return (
    <View style={styles.consistencyCard}>
      <View style={styles.consistencyHeader}>
        <View style={styles.consistencyTitleRow}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
          <Text style={styles.consistencyTitle}>Weekly Consistency</Text>
        </View>
        <View style={[styles.consistencyBadge, daysCompleted >= 5 && styles.consistencyBadgeSuccess]}>
          <Text style={[styles.consistencyBadgeText, daysCompleted >= 5 && styles.consistencyBadgeTextSuccess]}>
            {daysCompleted}/7 days
          </Text>
        </View>
      </View>

      <View style={styles.consistencyDots}>
        {weekData.map((day, idx) => (
          <View key={idx} style={styles.consistencyDotContainer}>
            <View style={[
              styles.consistencyDot,
              day.goalMet && styles.consistencyDotFilled,
              day.hasProgress && !day.goalMet && styles.consistencyDotPartial,
              day.isToday && styles.consistencyDotToday,
              day.isFuture && styles.consistencyDotFuture,
            ]}>
              {day.goalMet && <Ionicons name="checkmark" size={12} color="#FFF" />}
              {day.hasProgress && !day.goalMet && (
                <View style={[styles.consistencyDotProgress, { height: `${day.pct}%` }]} />
              )}
              {day.isToday && !day.goalMet && !day.hasProgress && day.pct > 0 && (
                <View style={[styles.consistencyDotProgress, { height: `${day.pct}%` }]} />
              )}
            </View>
            <Text style={[
              styles.consistencyDotLabel,
              day.isToday && styles.consistencyDotLabelToday,
            ]}>
              {day.day}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.consistencyFooter}>
        <View style={styles.consistencyProgressBar}>
          <View style={[styles.consistencyProgressFill, { width: `${consistencyPct}%` }]} />
        </View>
        <Text style={styles.consistencyPctText}>
          {daysWithProgress > daysCompleted
            ? `${daysCompleted} goals · ${daysWithProgress - daysCompleted} in progress`
            : `${consistencyPct}% this week`}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// BEVERAGE BREAKDOWN CARD - Shows beverage types consumed
// ============================================================================

// Beverage display config with colors and icons
const BEVERAGE_CONFIG = {
  water: { label: 'Water', icon: 'water', color: '#0EA5E9' },
  sparkling: { label: 'Sparkling', icon: 'sparkles', color: '#06B6D4' },
  herbal: { label: 'Herbal Tea', icon: 'leaf', color: '#22C55E' },
  tea: { label: 'Tea', icon: 'cafe-outline', color: '#84CC16' },
  coffee: { label: 'Coffee', icon: 'cafe', color: '#A16207' },
  milk: { label: 'Milk', icon: 'nutrition', color: '#A78BFA' },
  milkSkim: { label: 'Skim Milk', icon: 'nutrition-outline', color: '#C4B5FD' },
  juice: { label: 'Juice', icon: 'color-fill', color: '#F97316' },
  smoothie: { label: 'Smoothie', icon: 'flask', color: '#EC4899' },
  soda: { label: 'Soda', icon: 'water-outline', color: '#EF4444' },
  electrolyte: { label: 'Electrolyte', icon: 'flash', color: '#FBBF24' },
  coconut: { label: 'Coconut Water', icon: 'leaf-outline', color: '#10B981' },
  sports: { label: 'Sports Drink', icon: 'fitness', color: '#3B82F6' },
  energy: { label: 'Energy Drink', icon: 'flash-outline', color: '#8B5CF6' },
  alcohol_beer: { label: 'Beer', icon: 'beer', color: '#D97706' },
  alcohol_wine: { label: 'Wine', icon: 'wine', color: '#7C3AED' },
  alcohol_spirits: { label: 'Spirits', icon: 'wine-outline', color: '#6366F1' },
};

const BeverageBreakdownCard = ({ hydrationByDate }) => {
  const beverageData = useMemo(() => {
    const today = new Date();
    const beverageTotals = {};
    let totalMl = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      const data = hydrationByDate[key];

      if (data?.logs && data.logs.length > 0) {
        data.logs.forEach(log => {
          const type = (log.type || 'water').toLowerCase();
          if (!beverageTotals[type]) beverageTotals[type] = 0;
          beverageTotals[type] += log.amount || 0;
          totalMl += log.amount || 0;
        });
      }
    }

    if (totalMl === 0) return { beverages: [], totalMl: 0, topBeverage: null };

    // Convert to array and sort by amount
    const beverages = Object.entries(beverageTotals)
      .map(([type, ml]) => ({
        type,
        ml,
        pct: Math.round((ml / totalMl) * 100),
        config: BEVERAGE_CONFIG[type] || BEVERAGE_CONFIG.water,
      }))
      .sort((a, b) => b.ml - a.ml)
      .slice(0, 4); // Top 4 beverages

    return {
      beverages,
      totalMl,
      topBeverage: beverages[0]?.config?.label || 'Water',
    };
  }, [hydrationByDate]);

  const hasBeverageVariety = beverageData.beverages.length > 1;

  return (
    <View style={styles.intensityCard}>
      <View style={styles.intensityHeader}>
        <View style={styles.intensityTitleRow}>
          <Ionicons name="apps" size={18} color="#8B5CF6" />
          <Text style={styles.intensityTitle}>Beverage Mix</Text>
        </View>
        {beverageData.topBeverage && (
          <View style={styles.intensityPeakBadge}>
            <Ionicons name="trophy" size={12} color="#8B5CF6" />
            <Text style={styles.intensityPeakText}>Top: {beverageData.topBeverage}</Text>
          </View>
        )}
      </View>

      {beverageData.beverages.length === 0 ? (
        <View style={styles.emptyBeverageContainer}>
          <Ionicons name="water-outline" size={32} color={COLORS.text.tertiary} />
          <Text style={styles.emptyBeverageText}>Log drinks to see your mix</Text>
        </View>
      ) : (
        <View style={styles.intensityBars}>
          {beverageData.beverages.map((bev) => (
            <View key={bev.type} style={styles.intensityBarContainer}>
              <View style={styles.intensityBarHeader}>
                <View style={[styles.beverageIconCircle, { backgroundColor: `${bev.config.color}20` }]}>
                  <Ionicons name={bev.config.icon} size={12} color={bev.config.color} />
                </View>
                <Text style={styles.intensityBarLabel}>{bev.config.label}</Text>
                <Text style={styles.intensityBarValue}>{bev.pct}%</Text>
              </View>
              <View style={styles.intensityBarTrack}>
                <View
                  style={[
                    styles.intensityBarFill,
                    { width: `${bev.pct}%`, backgroundColor: bev.config.color }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.intensityFooter}>
        <Ionicons name="water" size={14} color={COLORS.text.secondary} />
        <Text style={styles.intensityAvgText}>
          {formatMl(Math.round(beverageData.totalMl / 7))}ml/day avg this week
        </Text>
        {hasBeverageVariety && (
          <View style={styles.varietyBadge}>
            <Ionicons name="sparkles" size={10} color={COLORS.success} />
            <Text style={styles.varietyText}>Great variety!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// CONTEXTUAL TIP CARD - Personalized tips based on patterns
// ============================================================================

const generateContextualTip = (hydrationByDate, todayMl, goal) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const hour = today.getHours();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Calculate patterns
  let weekdayTotal = 0, weekdayCount = 0;
  let weekendTotal = 0, weekendCount = 0;
  let morningHydration = 0, afternoonHydration = 0;
  let streak = 0;
  let bestDay = { ml: 0 };

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getLocalDateKey(d);
    const data = hydrationByDate[key];
    const ml = data?.totalMl || 0;

    if (ml > 0) {
      const dow = d.getDay();
      if (dow === 0 || dow === 6) {
        weekendTotal += ml;
        weekendCount++;
      } else {
        weekdayTotal += ml;
        weekdayCount++;
      }
      if (ml > bestDay.ml) bestDay = { ml, date: d };
    }

    // Streak calculation
    if (i === 0 && ml === 0) continue;
    if (ml > 0) streak++;
    else if (streak > 0) break;
  }

  const weekdayAvg = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
  const weekendAvg = weekendCount > 0 ? weekendTotal / weekendCount : 0;

  // Generate tips based on patterns
  const tips = [];

  // Weekend drop-off
  if (isWeekend && weekendAvg < weekdayAvg * 0.7 && weekdayCount > 3) {
    const dropPct = Math.round((1 - weekendAvg / weekdayAvg) * 100);
    tips.push({
      icon: 'calendar',
      color: '#F59E0B',
      title: 'Weekend Reminder',
      message: `You typically drink ${dropPct}% less on weekends. Try setting a reminder to stay on track!`,
    });
  }

  // Morning boost
  if (hour >= 6 && hour < 10 && todayMl < 250) {
    tips.push({
      icon: 'sunny',
      color: '#FBBF24',
      title: 'Morning Boost',
      message: 'Starting your day with water helps kickstart your metabolism and improve focus.',
    });
  }

  // Great streak
  if (streak >= 7) {
    tips.push({
      icon: 'flame',
      color: '#EF4444',
      title: `${streak} Day Streak!`,
      message: 'Your consistency is amazing! Research shows habits stick after 21 days.',
    });
  }

  // Afternoon slump
  if (hour >= 14 && hour < 16 && todayMl < goal * 0.5) {
    tips.push({
      icon: 'cafe',
      color: '#8B5CF6',
      title: 'Beat the Slump',
      message: 'Feeling tired? Dehydration causes fatigue. A glass of water can boost energy better than caffeine!',
    });
  }

  // Goal almost reached
  if (todayMl >= goal * 0.8 && todayMl < goal) {
    const remaining = goal - todayMl;
    tips.push({
      icon: 'trophy',
      color: '#F59E0B',
      title: 'Almost There!',
      message: `Just ${formatMl(remaining)}ml more to hit your goal. You've got this!`,
    });
  }

  // Goal achieved
  if (todayMl >= goal) {
    tips.push({
      icon: 'checkmark-circle',
      color: COLORS.success,
      title: 'Goal Achieved!',
      message: 'Great job hitting your hydration goal! Keep sipping to maintain optimal levels.',
    });
  }

  // New user encouragement
  if (streak === 0 && Object.keys(hydrationByDate).length < 3) {
    tips.push({
      icon: 'star',
      color: COLORS.primary,
      title: 'Great Start!',
      message: 'Log your drinks daily to see personalized insights and build healthy habits.',
    });
  }

  // Return tip based on day (rotate through available tips)
  if (tips.length === 0) {
    tips.push({
      icon: 'water',
      color: COLORS.primary,
      title: 'Stay Hydrated',
      message: 'Proper hydration supports energy, focus, and overall health. Keep it up!',
    });
  }

  // Rotate tips daily
  const dayIndex = today.getDate() % tips.length;
  return tips[dayIndex];
};

const ContextualTipCard = ({ hydrationByDate, todayMl, goal, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);
  const tip = useMemo(() => generateContextualTip(hydrationByDate, todayMl, goal), [hydrationByDate, todayMl, goal]);

  if (dismissed) return null;

  return (
    <View style={styles.tipCard}>
      <View style={[styles.tipIconContainer, { backgroundColor: `${tip.color}15` }]}>
        <Ionicons name={tip.icon} size={20} color={tip.color} />
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{tip.title}</Text>
        <Text style={styles.tipMessage}>{tip.message}</Text>
      </View>
      <TouchableOpacity
        style={styles.tipDismiss}
        onPress={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color={COLORS.text.tertiary} />
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// DAILY CARD
// ============================================================================

// Helper to get beverage config
const getBeverageConfig = (type) => {
  const normalizedType = (type || 'water').toLowerCase();
  return BEVERAGE_CONFIG[normalizedType] || BEVERAGE_CONFIG.water;
};

// Count beverages for summary
const getBeverageSummary = (logs) => {
  const counts = {};
  logs.forEach(log => {
    const type = (log.type || 'water').toLowerCase();
    counts[type] = (counts[type] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count, config: getBeverageConfig(type) }))
    .sort((a, b) => b.count - a.count);
};

const DailyCard = ({ date, data, goal, isToday, onPress }) => {
  const [expanded, setExpanded] = useState(false);
  const ml = data?.totalMl || 0;
  const logs = data?.logs || [];
  const percentage = Math.round((ml / goal) * 100);
  const goalMet = ml >= goal;

  const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const beverageSummary = useMemo(() => getBeverageSummary(logs), [logs]);

  const handlePress = () => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    onPress?.();
  };

  return (
    <TouchableOpacity style={styles.dailyCard} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.dailyCardMain}>
        <View style={styles.dailyCardLeft}>
          <View style={[styles.dailyCardIndicator, goalMet ? styles.dailyCardIndicatorSuccess : ml > 0 ? styles.dailyCardIndicatorPartial : styles.dailyCardIndicatorEmpty]} />
          <View>
            <Text style={styles.dailyCardDay}>{dayName}, {dateStr}</Text>
            <Text style={styles.dailyCardMl}>{formatMl(ml)}ml • {percentage}%</Text>
          </View>
        </View>
        <View style={styles.dailyCardRight}>
          {/* Beverage type icons preview */}
          {logs.length > 0 && !goalMet && (
            <View style={styles.beveragePreview}>
              {beverageSummary.slice(0, 3).map((bev, idx) => (
                <View
                  key={bev.type}
                  style={[styles.beveragePreviewIcon, { backgroundColor: `${bev.config.color}20`, marginLeft: idx > 0 ? -4 : 0 }]}
                >
                  <Ionicons name={bev.config.icon} size={10} color={bev.config.color} />
                </View>
              ))}
            </View>
          )}
          {goalMet ? (
            <View style={styles.perfectBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.perfectBadgeText}>PERFECT</Text>
            </View>
          ) : logs.length > 0 ? (
            <View style={styles.drinkCountBadge}>
              <Text style={styles.drinkCountText}>{logs.length} drinks</Text>
            </View>
          ) : null}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.text.tertiary} />
        </View>
      </View>

      {/* Expanded Detail */}
      {expanded && logs.length > 0 && (
        <View style={styles.dailyCardExpanded}>
          <View style={styles.dailyCardDivider} />

          {/* Beverage Summary */}
          <View style={styles.beverageSummaryRow}>
            {beverageSummary.map((bev) => (
              <View key={bev.type} style={styles.beverageSummaryItem}>
                <View style={[styles.beverageSummaryIcon, { backgroundColor: `${bev.config.color}20` }]}>
                  <Ionicons name={bev.config.icon} size={12} color={bev.config.color} />
                </View>
                <Text style={styles.beverageSummaryText}>{bev.count} {bev.config.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.dailyCardExpandedTitle}>Drinks logged</Text>
          {logs.slice(0, 5).map((log, idx) => {
            const bevConfig = getBeverageConfig(log.type);
            return (
              <View key={log.id || idx} style={styles.dailyCardLogItem}>
                <View style={[styles.dailyCardLogIcon, { backgroundColor: `${bevConfig.color}20` }]}>
                  <Ionicons name={bevConfig.icon} size={12} color={bevConfig.color} />
                </View>
                <Text style={styles.dailyCardLogText}>
                  {log.amount}ml <Text style={styles.dailyCardLogType}>{bevConfig.label}</Text>
                </Text>
                <Text style={styles.dailyCardLogTime}>
                  {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            );
          })}
          {logs.length > 5 && (
            <Text style={styles.dailyCardMoreText}>+{logs.length - 5} more</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================================================
// WEEK VIEW
// ============================================================================

const WeekView = ({ hydrationByDate, goal, todayMl, onQuickAdd, onViewAll }) => {
  const recommendations = useMemo(() =>
    generateSmartRecommendations(hydrationByDate, todayMl, goal),
  [hydrationByDate, todayMl, goal]);

  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      result.push({ date: d, key, data: hydrationByDate[key], isToday: i === 0 });
    }
    return result;
  }, [hydrationByDate]);

  return (
    <>
      <HeroCard todayMl={todayMl} goal={goal} onQuickAdd={onQuickAdd} />
      <StatsRow hydrationByDate={hydrationByDate} goal={goal} />

      {/* Weekly Bar Chart */}
      <View style={styles.sectionContainer}>
        <WeeklyBarChart hydrationByDate={hydrationByDate} goal={goal} />
      </View>

      {/* Contextual Tip */}
      <View style={styles.sectionContainer}>
        <ContextualTipCard hydrationByDate={hydrationByDate} todayMl={todayMl} goal={goal} />
      </View>

      {/* Consistency & Beverage Mix Cards */}
      <View style={styles.insightCardsRow}>
        <ConsistencyCard hydrationByDate={hydrationByDate} goal={goal} />
        <BeverageBreakdownCard hydrationByDate={hydrationByDate} />
      </View>

      <RecommendationsSection recommendations={recommendations} onAction={onQuickAdd} />

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>
        {days.map((day) => (
          <DailyCard key={day.key} date={day.date} data={day.data} goal={goal} isToday={day.isToday} />
        ))}
      </View>
    </>
  );
};

// ============================================================================
// MONTH VIEW
// ============================================================================

const MonthView = ({ hydrationByDate, goal, currentMonth, onDaySelect }) => {
  const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const [selectedDay, setSelectedDay] = useState(null);

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ empty: true });
    for (let d = 1; d <= lastDate; d++) {
      const date = new Date(year, month, d);
      const key = getLocalDateKey(date);
      const data = hydrationByDate[key];
      const ml = data?.totalMl || 0;
      const pct = Math.min((ml / goal) * 100, 100);
      days.push({ day: d, key, ml, pct, goalMet: ml >= goal });
    }
    return days;
  }, [currentMonth, hydrationByDate, goal]);

  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    let totalMl = 0, daysWithData = 0, daysGoalMet = 0;

    Object.entries(hydrationByDate).forEach(([key, data]) => {
      const d = new Date(key);
      if (d.getFullYear() === year && d.getMonth() === month && data.totalMl > 0) {
        totalMl += data.totalMl;
        daysWithData++;
        if (data.totalMl >= goal) daysGoalMet++;
      }
    });

    const avgMl = daysWithData > 0 ? totalMl / daysWithData : 0;
    const lastDate = new Date(year, month + 1, 0).getDate();
    const consistency = Math.round((daysWithData / lastDate) * 100);

    return { totalMl, avgMl, daysWithData, daysGoalMet, consistency };
  }, [currentMonth, hydrationByDate, goal]);

  const getIntensityStyle = (pct) => {
    if (pct >= 100) return { backgroundColor: COLORS.primary, borderColor: COLORS.primary };
    if (pct >= 75) return { backgroundColor: `${COLORS.primary}CC`, borderColor: COLORS.primary };
    if (pct >= 50) return { backgroundColor: `${COLORS.primary}80`, borderColor: `${COLORS.primary}80` };
    if (pct >= 25) return { backgroundColor: `${COLORS.primary}40`, borderColor: `${COLORS.primary}40` };
    if (pct > 0) return { backgroundColor: `${COLORS.primary}20`, borderColor: `${COLORS.primary}30` };
    return { backgroundColor: 'transparent', borderColor: COLORS.border };
  };

  return (
    <View style={styles.monthViewContainer}>
      <View style={styles.monthHeadline}>
        <Text style={styles.monthHeadlineTitle}>Hydration Heatmap</Text>
        <Text style={styles.monthHeadlineSubtitle}>{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</Text>
      </View>

      <View style={styles.heatmapContainer}>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day, i) => <Text key={i} style={styles.weekdayLabel}>{day}</Text>)}
        </View>
        <View style={styles.heatmapGrid}>
          {calendarData.map((item, idx) => (
            <View key={idx} style={styles.heatmapCell}>
              {!item.empty && (
                <TouchableOpacity
                  style={[
                    styles.heatmapDot,
                    getIntensityStyle(item.pct),
                    selectedDay === item.day && styles.heatmapDotSelected,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDay(selectedDay === item.day ? null : item.day);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.heatmapDayNum, item.pct >= 50 && styles.heatmapDayNumLight]}>{item.day}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Selected Day Detail */}
        {selectedDay && (
          <View style={styles.heatmapSelectedDetail}>
            <View style={styles.heatmapSelectedHeader}>
              <Text style={styles.heatmapSelectedDate}>
                {MONTHS[currentMonth.getMonth()]} {selectedDay}, {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
              </TouchableOpacity>
            </View>
            {(() => {
              const dayData = calendarData.find(d => d.day === selectedDay);
              if (!dayData) return null;
              return (
                <View style={styles.heatmapSelectedContent}>
                  <Text style={styles.heatmapSelectedMl}>{formatMl(dayData.ml)}ml</Text>
                  <Text style={styles.heatmapSelectedPct}>{Math.round(dayData.pct)}% of goal</Text>
                  {dayData.goalMet && (
                    <View style={styles.heatmapSelectedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                      <Text style={styles.heatmapSelectedBadgeText}>Goal achieved!</Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        <View style={styles.legendRow}>
          <Text style={styles.legendText}>Low</Text>
          <View style={styles.legendDots}>
            {[20, 40, 70, 100].map((p, i) => (
              <View key={i} style={[styles.legendDot, { backgroundColor: `${COLORS.primary}${['33', '66', 'AA', 'FF'][i]}` }]} />
            ))}
          </View>
          <Text style={styles.legendText}>Goal</Text>
        </View>
      </View>

      <View style={styles.monthStatsCard}>
        <View style={styles.monthStatsHeader}>
          <View>
            <Text style={styles.monthStatsLabel}>TOTAL INTAKE</Text>
            <Text style={styles.monthStatsValue}>{formatLiters(monthStats.totalMl)}<Text style={styles.monthStatsUnit}>L</Text></Text>
          </View>
          <View style={styles.monthStatsBadge}>
            <Text style={styles.monthStatsBadgeText}>{monthStats.daysGoalMet} perfect days</Text>
          </View>
        </View>
        <View style={styles.monthStatsGrid}>
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatLabel}>DAILY AVG</Text>
            <Text style={styles.monthStatValue}>{formatLiters(monthStats.avgMl)}<Text style={styles.monthStatUnit}>L</Text></Text>
          </View>
          <View style={styles.monthStatItem}>
            <Text style={styles.monthStatLabel}>CONSISTENCY</Text>
            <Text style={styles.monthStatValue}>{monthStats.consistency}<Text style={styles.monthStatUnit}>%</Text></Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// YEAR VIEW
// ============================================================================

const YearView = ({ hydrationByDate, goal, currentYear, onMonthSelect }) => {
  const yearStats = useMemo(() => {
    let totalMl = 0, daysWithData = 0;
    const monthlyData = Array(12).fill(0);

    Object.entries(hydrationByDate).forEach(([key, data]) => {
      const d = new Date(key);
      if (d.getFullYear() === currentYear && data.totalMl > 0) {
        totalMl += data.totalMl;
        daysWithData++;
        monthlyData[d.getMonth()] += data.totalMl;
      }
    });

    const avgMl = daysWithData > 0 ? totalMl / daysWithData : 0;
    const consistency = Math.round((daysWithData / 365) * 100);

    let bestMonth = 0, bestMonthMl = 0;
    monthlyData.forEach((ml, i) => { if (ml > bestMonthMl) { bestMonthMl = ml; bestMonth = i; } });

    return { totalMl, avgMl, daysWithData, consistency, monthlyData, bestMonth, bestMonthMl };
  }, [hydrationByDate, currentYear]);

  const chartPath = useMemo(() => {
    const maxMl = Math.max(...yearStats.monthlyData, goal * 30);
    const width = SCREEN_WIDTH - 64;
    const height = 120;
    const points = yearStats.monthlyData.map((ml, i) => ({
      x: (i / 11) * width,
      y: height - (ml / maxMl) * height || height,
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1], curr = points[i];
      path += ` C ${prev.x + (curr.x - prev.x) / 3} ${prev.y} ${prev.x + (2 * (curr.x - prev.x)) / 3} ${curr.y} ${curr.x} ${curr.y}`;
    }
    return path;
  }, [yearStats.monthlyData, goal]);

  const topMonths = yearStats.monthlyData
    .map((ml, i) => ({ month: i, ml }))
    .filter(m => m.ml > 0)
    .sort((a, b) => b.ml - a.ml)
    .slice(0, 3);

  return (
    <View style={styles.yearViewContainer}>
      <View style={styles.yearHeadline}>
        <Text style={styles.yearTotalValue}>{formatLiters(yearStats.totalMl)}<Text style={styles.yearTotalUnit}>L</Text></Text>
        <Text style={styles.yearSubtitle}>Total in {currentYear}</Text>
      </View>

      <View style={styles.chartContainer}>
        {yearStats.bestMonthMl > 0 && (
          <View style={styles.chartBadge}>
            <Ionicons name="trophy" size={14} color="#F59E0B" />
            <Text style={styles.chartBadgeText}>Best: {MONTHS_SHORT[yearStats.bestMonth]}</Text>
          </View>
        )}
        <Svg width={SCREEN_WIDTH - 64} height={140}>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={chartPath + ` L ${SCREEN_WIDTH - 64} 120 L 0 120 Z`} fill="url(#grad)" />
          <Path d={chartPath} stroke={COLORS.primary} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
        <View style={styles.chartLabels}>
          {MONTHS_SHORT.filter((_, i) => i % 2 === 0).map((m) => <Text key={m} style={styles.chartLabel}>{m}</Text>)}
        </View>
      </View>

      <View style={styles.yearStatsRow}>
        <View style={styles.yearStatCard}>
          <Ionicons name="water" size={20} color={COLORS.primary} />
          <Text style={styles.yearStatLabel}>AVG DAILY</Text>
          <Text style={styles.yearStatValue}>{formatLiters(yearStats.avgMl)}L</Text>
        </View>
        <View style={styles.yearStatCard}>
          <Ionicons name="calendar" size={20} color={COLORS.success} />
          <Text style={styles.yearStatLabel}>CONSISTENCY</Text>
          <Text style={styles.yearStatValue}>{yearStats.consistency}%</Text>
        </View>
      </View>

      {topMonths.length > 0 && (
        <View style={styles.topMonthsSection}>
          <Text style={styles.topMonthsTitle}>TOP PERFORMANCE MONTHS</Text>
          {topMonths.map((item, idx) => (
            <TouchableOpacity
              key={item.month}
              style={styles.topMonthCard}
              onPress={() => {
                Haptics.selectionAsync();
                onMonthSelect?.(item.month);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.topMonthLeft}>
                <View style={[styles.topMonthRank, idx === 0 && styles.topMonthRankFirst]}>
                  <Text style={[styles.topMonthRankText, idx === 0 && styles.topMonthRankTextFirst]}>#{idx + 1}</Text>
                </View>
                <View>
                  <Text style={styles.topMonthName}>{MONTHS[item.month]}</Text>
                  <Text style={styles.topMonthMl}>{formatLiters(item.ml)}L total</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={idx === 0 ? COLORS.primary : COLORS.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ============================================================================
// MONTH PICKER MODAL
// ============================================================================

const MonthPickerModal = ({ visible, currentDate, onSelect, onClose }) => {
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Select Month</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.yearSelector}>
            <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)}><Ionicons name="chevron-back" size={24} color={COLORS.text.secondary} /></TouchableOpacity>
            <Text style={styles.yearSelectorText}>{selectedYear}</Text>
            <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)}><Ionicons name="chevron-forward" size={24} color={COLORS.text.secondary} /></TouchableOpacity>
          </View>
          <View style={styles.monthGrid}>
            {MONTHS_SHORT.map((month, idx) => (
              <TouchableOpacity
                key={month}
                style={[styles.monthGridItem, selectedYear === currentDate.getFullYear() && idx === currentDate.getMonth() && styles.monthGridItemSelected]}
                onPress={() => { onSelect(new Date(selectedYear, idx, 1)); onClose(); }}
              >
                <Text style={[styles.monthGridText, selectedYear === currentDate.getFullYear() && idx === currentDate.getMonth() && styles.monthGridTextSelected]}>{month}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function HydrationHistoryScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('WEEK');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyData, setHistoryData] = useState({ logs: [], dailyAggregates: [] });
  const [isLoading, setIsLoading] = useState(true);
  const { fetchHistory, logWater } = useWaterLog();

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      const result = await fetchHistory({ startDate: startDate.toISOString(), endDate: endDate.toISOString(), limit: 2000 });
      setHistoryData(result || { logs: [], dailyAggregates: [] });
    } catch (e) {
      console.error('[HydrationHistory] Load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [fetchHistory]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const hydrationByDate = useMemo(() => {
    const byDate = {};

    // Process individual logs using LOCAL dates (users think in local time)
    historyData.logs?.forEach((log) => {
      const logDate = new Date(log.loggedDate || log.timestamp);
      const key = getLocalDateKey(logDate);
      if (!key) return;
      if (!byDate[key]) byDate[key] = { totalMl: 0, logs: [] };
      const ml = Math.round((log.hydrationLiters || log.amountLiters || 0) * 1000);
      byDate[key].totalMl += ml;
      byDate[key].logs.push({
        id: log.id,
        amount: ml,
        type: log.beverageType || 'water',
        timestamp: log.loggedDate || log.timestamp,
      });
    });

    // Also process dailyAggregates as fallback
    // d.date is now in client's LOCAL timezone format (from backend getDayKey)
    historyData.dailyAggregates?.forEach((d) => {
      if (!d.date) return;
      // d.date is already in local YYYY-MM-DD format from backend
      const [year, month, day] = d.date.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      const key = getLocalDateKey(localDate);

      if (!byDate[key]) byDate[key] = { totalMl: 0, logs: [] };
      const ml = Math.round((d.hydrationLiters || d.totalLiters || 0) * 1000);
      // Only use aggregate if it's higher (logs might have been processed already)
      if (ml > byDate[key].totalMl) byDate[key].totalMl = ml;
    });

    return byDate;
  }, [historyData]);

  const todayMl = hydrationByDate[getLocalDateKey(new Date())]?.totalMl || 0;

  const handleQuickAdd = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/');
  }, [router]);

  const navigateMonth = (delta) => {
    Haptics.selectionAsync();
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  const headerTitle = selectedTab === 'MONTH' ? `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}` :
    selectedTab === 'YEAR' ? `${currentYear}` : 'Hydration History';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: headerTitle,
          headerStyle: { backgroundColor: COLORS.background },
          headerTitleStyle: { color: COLORS.text.primary, fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (selectedTab === 'MONTH') navigateMonth(-1);
                else if (selectedTab === 'YEAR') { Haptics.selectionAsync(); setCurrentYear(y => y - 1); }
                else if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/dashboard');
              }}
              style={styles.headerButton}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                if (selectedTab === 'MONTH') navigateMonth(1);
                else if (selectedTab === 'YEAR') { Haptics.selectionAsync(); setCurrentYear(y => y + 1); }
                else setShowMonthPicker(true);
              }}
              style={styles.headerButton}
            >
              <Ionicons name={selectedTab === 'WEEK' ? 'calendar-outline' : 'chevron-forward'} size={22} color={selectedTab === 'WEEK' ? COLORS.primary : COLORS.text.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : (
          <>
            <TabSelector selected={selectedTab} onSelect={setSelectedTab} />
            {selectedTab === 'WEEK' && <WeekView hydrationByDate={hydrationByDate} goal={GOAL_ML} todayMl={todayMl} onQuickAdd={handleQuickAdd} onViewAll={() => setSelectedTab('MONTH')} />}
            {selectedTab === 'MONTH' && <MonthView hydrationByDate={hydrationByDate} goal={GOAL_ML} currentMonth={currentMonth} />}
            {selectedTab === 'YEAR' && (
              <YearView
                hydrationByDate={hydrationByDate}
                goal={GOAL_ML}
                currentYear={currentYear}
                onMonthSelect={(monthIdx) => {
                  Haptics.selectionAsync();
                  setCurrentMonth(new Date(currentYear, monthIdx, 1));
                  setSelectedTab('MONTH');
                }}
              />
            )}
          </>
        )}
      </ScrollView>

      <MonthPickerModal visible={showMonthPicker} currentDate={currentMonth} onSelect={(d) => { setCurrentMonth(d); setSelectedTab('MONTH'); }} onClose={() => setShowMonthPicker(false)} />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  headerButton: { padding: 8 },
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.text.secondary },

  // Tabs
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabSelected: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: COLORS.text.tertiary, letterSpacing: 1 },
  tabTextSelected: { color: COLORS.primary, fontWeight: '700' },

  // Hero Card (Compact)
  heroCard: { margin: 16, marginBottom: 12, borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16 },
  heroBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  heroRightSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroPercentContainer: { alignItems: 'flex-end' },
  heroFabInline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    // 3D effect with layered shadows
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    // Top highlight for 3D depth
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.9)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  heroPercentValue: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  heroPercentLabel: { fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  heroMainValue: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  heroMl: { fontSize: 48, fontWeight: '300', color: '#FFF', letterSpacing: -1 },
  heroMlUnit: { fontSize: 18, fontWeight: '400', color: 'rgba(255,255,255,0.9)', marginLeft: 4 },
  heroProgressContainer: { marginTop: 10 },
  heroProgressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  heroProgressFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 3 },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  heroRemaining: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  paceIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12 },
  paceText: { fontSize: 11, fontWeight: '600', color: '#0284C7' },

  // Stats Row
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
  statLabel: { fontSize: 10, fontWeight: '500', color: COLORS.text.tertiary, marginTop: 2 },

  // Weekly Bar Chart
  weeklyBarCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  weeklyBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  weeklyBarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weeklyBarTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  weeklyBarStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weeklyBarTotal: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary },
  comparisonBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 },
  comparisonBadgeUp: { backgroundColor: COLORS.successLight },
  comparisonBadgeDown: { backgroundColor: COLORS.warningLight },
  comparisonText: { fontSize: 11, fontWeight: '600' },
  comparisonTextUp: { color: COLORS.success },
  comparisonTextDown: { color: COLORS.warning },
  weeklyBarChartContainer: { height: 100, position: 'relative', marginBottom: 8 },
  goalLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  goalLineDash: { flex: 1, height: 1, borderWidth: 1, borderColor: COLORS.success, borderStyle: 'dashed' },
  goalLineLabel: { fontSize: 9, fontWeight: '600', color: COLORS.success, marginLeft: 6 },
  weeklyBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, gap: 4 },
  weeklyBarItem: { flex: 1, alignItems: 'center' },
  weeklyBarTrack: { width: '100%', height: 80, backgroundColor: COLORS.background, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  weeklyBarFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  weeklyBarFillGoal: { backgroundColor: COLORS.success },
  weeklyBarFillToday: { backgroundColor: COLORS.primary },
  weeklyBarLabel: { fontSize: 10, fontWeight: '600', color: COLORS.text.tertiary, marginTop: 6 },
  weeklyBarLabelToday: { color: COLORS.primary, fontWeight: '700' },
  weeklyBarFooter: { alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  weeklyBarFooterText: { fontSize: 12, color: COLORS.text.tertiary },

  // Contextual Tip Card
  tipCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'flex-start' },
  tipIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary, marginBottom: 2 },
  tipMessage: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },
  tipDismiss: { padding: 4 },

  // Insight Cards Row (Consistency & Intensity)
  insightCardsRow: { paddingHorizontal: 16, marginTop: 16, gap: 12 },

  // Consistency Card
  consistencyCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  consistencyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  consistencyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  consistencyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  consistencyBadge: { backgroundColor: COLORS.primaryLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  consistencyBadgeSuccess: { backgroundColor: COLORS.successLight },
  consistencyBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  consistencyBadgeTextSuccess: { color: COLORS.success },
  consistencyDots: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  consistencyDotContainer: { alignItems: 'center', gap: 6 },
  consistencyDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  consistencyDotFilled: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  consistencyDotPartial: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  consistencyDotToday: { borderColor: COLORS.primary, borderWidth: 2 },
  consistencyDotFuture: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderStyle: 'dashed' },
  consistencyDotProgress: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: `${COLORS.primary}40`, borderRadius: 0 },
  consistencyDotLabel: { fontSize: 10, fontWeight: '600', color: COLORS.text.tertiary },
  consistencyDotLabelToday: { color: COLORS.primary, fontWeight: '700' },
  consistencyFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consistencyProgressBar: { flex: 1, height: 6, backgroundColor: COLORS.background, borderRadius: 3, overflow: 'hidden' },
  consistencyProgressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 3 },
  consistencyPctText: { fontSize: 12, fontWeight: '600', color: COLORS.text.secondary, minWidth: 80, textAlign: 'right' },

  // Intensity Card
  intensityCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  intensityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  intensityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  intensityTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  intensityPeakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3E8FF', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  intensityPeakText: { fontSize: 11, fontWeight: '600', color: '#8B5CF6' },
  intensityBars: { gap: 12 },
  intensityBarContainer: { gap: 6 },
  intensityBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  intensityBarLabel: { flex: 1, fontSize: 12, fontWeight: '500', color: COLORS.text.secondary },
  intensityBarValue: { fontSize: 12, fontWeight: '700', color: COLORS.text.primary, minWidth: 36, textAlign: 'right' },
  intensityBarTrack: { height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden' },
  intensityBarFill: { height: '100%', borderRadius: 4 },
  intensityFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, flexWrap: 'wrap' },
  intensityAvgText: { fontSize: 12, color: COLORS.text.secondary },

  // Beverage Card specific styles
  emptyBeverageContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  emptyBeverageText: { fontSize: 12, color: COLORS.text.tertiary, marginTop: 8 },
  beverageIconCircle: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  varietyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.successLight, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10, marginLeft: 'auto' },
  varietyText: { fontSize: 10, fontWeight: '600', color: COLORS.success },

  // Recommendations
  recommendationsContainer: { paddingHorizontal: 16, marginTop: 24 },
  recommendationCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  recommendationIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  recommendationContent: { flex: 1 },
  recommendationTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary, marginBottom: 4 },
  recommendationMessage: { fontSize: 13, color: COLORS.text.secondary, lineHeight: 18 },
  recommendationAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-start' },
  recommendationActionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Section
  sectionContainer: { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text.primary },
  viewAllText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // Daily Card
  dailyCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  dailyCardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dailyCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyCardIndicator: { width: 4, height: 40, borderRadius: 2 },
  dailyCardIndicatorSuccess: { backgroundColor: COLORS.success },
  dailyCardIndicatorPartial: { backgroundColor: COLORS.primary },
  dailyCardIndicatorEmpty: { backgroundColor: COLORS.border },
  dailyCardDay: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  dailyCardMl: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  perfectBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.successLight, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  perfectBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.success },
  drinkCountBadge: { backgroundColor: COLORS.primaryLight, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  drinkCountText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  // Beverage preview icons (collapsed view)
  beveragePreview: { flexDirection: 'row', alignItems: 'center', marginRight: 4 },
  beveragePreviewIcon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.card },
  // Daily Card Expanded
  dailyCardExpanded: { marginTop: 12 },
  dailyCardDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },
  // Beverage summary row (expanded view)
  beverageSummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  beverageSummaryItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.background, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
  beverageSummaryIcon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  beverageSummaryText: { fontSize: 11, fontWeight: '500', color: COLORS.text.secondary },
  dailyCardExpandedTitle: { fontSize: 11, fontWeight: '600', color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  dailyCardLogItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  dailyCardLogIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dailyCardLogDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  dailyCardLogText: { flex: 1, fontSize: 13, color: COLORS.text.primary },
  dailyCardLogType: { color: COLORS.text.secondary, fontWeight: '400' },
  dailyCardLogTime: { fontSize: 12, color: COLORS.text.tertiary },
  dailyCardMoreText: { fontSize: 12, color: COLORS.text.tertiary, textAlign: 'center', marginTop: 4 },

  // Month View
  monthViewContainer: { paddingBottom: 20 },
  monthHeadline: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  monthHeadlineTitle: { fontSize: 24, fontWeight: '600', color: COLORS.text.primary },
  monthHeadlineSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  heatmapContainer: { marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: COLORS.text.tertiary },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  heatmapCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  heatmapDot: { flex: 1, borderRadius: 100, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  heatmapDotSelected: { borderWidth: 2, borderColor: COLORS.primary, transform: [{ scale: 1.1 }] },
  heatmapDayNum: { fontSize: 10, fontWeight: '500', color: COLORS.text.primary },
  heatmapDayNumLight: { color: '#FFF', fontWeight: '700' },
  heatmapSelectedDetail: { marginTop: 16, padding: 12, backgroundColor: COLORS.primaryLight, borderRadius: 12 },
  heatmapSelectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heatmapSelectedDate: { fontSize: 14, fontWeight: '600', color: COLORS.text.primary },
  heatmapSelectedContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heatmapSelectedMl: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  heatmapSelectedPct: { fontSize: 13, color: COLORS.text.secondary },
  heatmapSelectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  heatmapSelectedBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  legendText: { fontSize: 10, color: COLORS.text.tertiary },
  legendDots: { flexDirection: 'row', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  monthStatsCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: COLORS.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  monthStatsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  monthStatsLabel: { fontSize: 10, fontWeight: '600', color: COLORS.text.tertiary, letterSpacing: 1 },
  monthStatsValue: { fontSize: 36, fontWeight: '600', color: COLORS.primary },
  monthStatsUnit: { fontSize: 18, fontWeight: '400' },
  monthStatsBadge: { backgroundColor: COLORS.successLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  monthStatsBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.success },
  monthStatsGrid: { flexDirection: 'row', gap: 16 },
  monthStatItem: { flex: 1, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  monthStatLabel: { fontSize: 9, fontWeight: '600', color: COLORS.text.tertiary, letterSpacing: 1, marginBottom: 4 },
  monthStatValue: { fontSize: 20, fontWeight: '600', color: COLORS.text.primary },
  monthStatUnit: { fontSize: 12, color: COLORS.text.secondary },

  // Year View
  yearViewContainer: { paddingBottom: 20 },
  yearHeadline: { paddingHorizontal: 16, paddingTop: 24 },
  yearTotalValue: { fontSize: 48, fontWeight: '700', color: COLORS.text.primary },
  yearTotalUnit: { fontSize: 24, color: COLORS.primary },
  yearSubtitle: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  chartContainer: { marginHorizontal: 16, marginTop: 24, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, position: 'relative' },
  chartBadge: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  chartBadgeText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartLabel: { fontSize: 10, fontWeight: '600', color: COLORS.text.tertiary },
  yearStatsRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16 },
  yearStatCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  yearStatLabel: { fontSize: 9, fontWeight: '600', color: COLORS.text.tertiary, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  yearStatValue: { fontSize: 22, fontWeight: '700', color: COLORS.text.primary },
  topMonthsSection: { marginHorizontal: 16, marginTop: 24 },
  topMonthsTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text.tertiary, letterSpacing: 1, marginBottom: 12 },
  topMonthCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  topMonthLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topMonthRank: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  topMonthRankFirst: { backgroundColor: COLORS.primaryLight },
  topMonthRankText: { fontSize: 12, fontWeight: '700', color: COLORS.text.secondary },
  topMonthRankTextFirst: { color: COLORS.primary },
  topMonthName: { fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  topMonthMl: { fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalCancel: { fontSize: 16, color: COLORS.primary },
  modalTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text.primary },
  yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingVertical: 16 },
  yearSelectorText: { fontSize: 20, fontWeight: '600', color: COLORS.text.primary },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  monthGridItem: { width: '25%', paddingVertical: 16, alignItems: 'center' },
  monthGridItemSelected: { backgroundColor: COLORS.primaryLight, borderRadius: 8 },
  monthGridText: { fontSize: 15, color: COLORS.text.primary },
  monthGridTextSelected: { color: COLORS.primary, fontWeight: '600' },
});
