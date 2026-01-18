/**
 * Activity Analytics Screen - Production Grade
 *
 * Design Philosophy:
 * - Time-aware coaching (morning/afternoon/evening context)
 * - Adaptive to user's current day progress
 * - Premium visual design with cohesive colors
 * - Single clear priority, not multiple competing cards
 * - Real data visualization
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Rect, Defs, LinearGradient as SvgGradient, Stop, G, Circle, Line, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  SURFACES,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  CARD_SYSTEM,
  SEMANTIC,
  BRAND,
  SHADOWS,
} from '../../constants/premiumTheme';

import HalfGaugeChart from '../../components/insights/HalfGaugeChart';
import { useActivityAnalytics, calculateActivityStreak } from '../../hooks/useActivityAnalytics';
import { getResponsiveGaugeSize, IS_SMALL_DEVICE } from '../../utils/responsiveLayout';

// Note: ColdStartCard removed - hero card handles all user stages including new users

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAUGE_CONFIG = getResponsiveGaugeSize('standard');
const CDC_WEEKLY_GOAL = 150;
const CDC_DAILY_AVG = Math.round(CDC_WEEKLY_GOAL / 7);

// Premium Activity Colors - Using Brand Purple
const ACTIVITY_COLORS = {
  primary: BRAND.primary,           // Brand purple
  primaryDark: BRAND.primaryDark,
  primaryLight: BRAND.primaryLight,
  gradient: [BRAND.primary, BRAND.primaryDark],
  gradientLight: [BRAND.primaryLight, BRAND.primary],
  surface: '#F5F3FF',               // Light purple surface
  surfaceLight: '#FAF8FF',
  text: '#4C1D95',                  // Dark purple text
  accent: BRAND.accent,
};

// ============================================================================
// TIME-AWARE COACH ENGINE
// ============================================================================

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getTimeAwareCoaching(coldStart, metrics, todayMinutes = 0) {
  const timeOfDay = getTimeOfDay();
  const totalLogs = coldStart?.totalLogs || 0;
  const distinctDays = coldStart?.distinctDays || 0;
  const { weeklyMinutes, streak, daysActive } = metrics;
  const hasLoggedToday = todayMinutes > 0;
  const metDailyGoal = todayMinutes >= CDC_DAILY_AVG;

  // Time-specific greetings and suggestions
  const timeContext = {
    morning: {
      greeting: 'Good morning',
      prime: 'Morning movement sets the tone for your day',
      suggestion: hasLoggedToday
        ? 'Great start! Keep the momentum going.'
        : 'A quick walk before lunch boosts focus all day.',
      optimalWindow: '6am - 10am',
      benefit: 'Morning exercise increases alertness and metabolism',
    },
    afternoon: {
      greeting: 'Good afternoon',
      prime: 'Beat the afternoon slump with movement',
      suggestion: hasLoggedToday
        ? 'Nice work today! A short walk can refresh your focus.'
        : 'Even a 10-minute walk clears afternoon brain fog.',
      optimalWindow: '12pm - 2pm',
      benefit: 'Afternoon activity prevents energy crashes',
    },
    evening: {
      greeting: 'Good evening',
      prime: 'Wind down with gentle movement',
      suggestion: hasLoggedToday
        ? metDailyGoal ? "You've hit today's target! Rest well." : 'A light walk could complete your day.'
        : 'An evening stroll aids sleep quality.',
      optimalWindow: '5pm - 8pm',
      benefit: 'Light evening activity improves sleep',
    },
    night: {
      greeting: 'Good night',
      prime: 'Rest is part of the journey',
      suggestion: hasLoggedToday
        ? "Great effort today. Tomorrow's a new day!"
        : "Rest well. Tomorrow offers new opportunities.",
      optimalWindow: 'Tomorrow morning',
      benefit: 'Quality sleep enhances recovery',
    },
  };

  const time = timeContext[timeOfDay];

  // Stage-based coaching with time awareness
  if (totalLogs === 0) {
    return {
      stage: 'new',
      headline: time.greeting,
      subhead: 'Ready to start your journey?',
      message: time.prime,
      action: {
        primary: 'Log your first activity',
        secondary: time.suggestion,
      },
      stats: {
        show: false,
      },
      tip: {
        icon: 'time-outline',
        text: `Best time: ${time.optimalWindow}`,
        subtext: time.benefit,
      },
      progress: {
        percent: 0,
        label: 'Day 1 starts now',
      },
    };
  }

  if (distinctDays < 7) {
    const remaining = 7 - distinctDays;
    return {
      stage: 'building',
      headline: hasLoggedToday ? 'Keep going!' : time.greeting,
      subhead: `${distinctDays} day${distinctDays > 1 ? 's' : ''} of activity logged`,
      message: hasLoggedToday
        ? `${todayMinutes} minutes today. ${time.suggestion}`
        : time.suggestion,
      action: {
        primary: hasLoggedToday ? 'Add more activity' : 'Log today\'s activity',
        secondary: `${remaining} more day${remaining > 1 ? 's' : ''} to unlock patterns`,
      },
      stats: {
        show: true,
        items: [
          { value: distinctDays, label: 'Days', icon: 'calendar-outline' },
          { value: streak, label: 'Streak', icon: 'flame-outline', highlight: streak > 0 },
          { value: todayMinutes, label: 'Today', icon: 'today-outline' },
        ],
      },
      tip: {
        icon: 'sparkles-outline',
        text: streak > 0 ? `${streak}-day streak!` : 'Start a streak today',
        subtext: 'Consistency builds lasting habits',
      },
      progress: {
        percent: Math.round((distinctDays / 7) * 100),
        label: `${distinctDays}/7 days to insights`,
      },
    };
  }

  // Established user with week+ of data
  const weeklyPercent = Math.round((weeklyMinutes / CDC_WEEKLY_GOAL) * 100);
  const todayPercent = Math.round((todayMinutes / CDC_DAILY_AVG) * 100);

  if (weeklyMinutes >= CDC_WEEKLY_GOAL) {
    return {
      stage: 'achieved',
      headline: 'Goal Achieved!',
      subhead: `${weeklyMinutes} minutes this week`,
      message: hasLoggedToday
        ? `${todayMinutes} min today. ${time.suggestion}`
        : time.suggestion,
      action: {
        primary: 'Keep it up',
        secondary: 'You\'ve exceeded your weekly target!',
      },
      stats: {
        show: true,
        items: [
          { value: weeklyMinutes, label: 'Weekly', icon: 'trending-up', highlight: true },
          { value: streak, label: 'Streak', icon: 'flame-outline', highlight: streak > 2 },
          { value: daysActive, label: 'Active', icon: 'checkmark-circle-outline' },
        ],
      },
      tip: {
        icon: 'trophy-outline',
        text: 'Weekly goal achieved!',
        subtext: 'Your commitment is paying off',
      },
      progress: {
        percent: Math.min(weeklyPercent, 100),
        label: `${weeklyPercent}% of weekly goal`,
      },
    };
  }

  // Progressing toward goal
  return {
    stage: 'progressing',
    headline: hasLoggedToday ? `${todayMinutes} min today` : time.greeting,
    subhead: `${weeklyMinutes} of ${CDC_WEEKLY_GOAL} min this week`,
    message: time.suggestion,
    action: {
      primary: hasLoggedToday ? 'Add more activity' : 'Log activity',
      secondary: `${CDC_WEEKLY_GOAL - weeklyMinutes} min to weekly goal`,
    },
    stats: {
      show: true,
      items: [
        { value: `${weeklyPercent}%`, label: 'Weekly', icon: 'analytics-outline' },
        { value: streak, label: 'Streak', icon: 'flame-outline', highlight: streak > 0 },
        { value: `${todayPercent}%`, label: 'Today', icon: 'today-outline' },
      ],
    },
    tip: {
      icon: 'time-outline',
      text: `Best time: ${time.optimalWindow}`,
      subtext: time.benefit,
    },
    progress: {
      percent: weeklyPercent,
      label: `${weeklyPercent}% of weekly goal`,
    },
  };
}

// ============================================================================
// WEEK CHART COMPONENT
// ============================================================================

function WeekChart({ weekData, goal = CDC_DAILY_AVG }) {
  const chartWidth = SCREEN_WIDTH - SPACING[8];
  const chartHeight = IS_SMALL_DEVICE ? 90 : 110;
  const barWidth = IS_SMALL_DEVICE ? 26 : 32;
  const spacing = (chartWidth - 7 * barWidth) / 6;

  const data = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (weekData || []).map((day, i) => ({
      label: day?.label || ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
      minutes: day?.minutes || 0,
      isToday: day?.date === today,
      metGoal: (day?.minutes || 0) >= goal,
    }));
  }, [weekData, goal]);

  const maxVal = Math.max(goal * 1.5, ...data.map(d => d.minutes));

  return (
    <View style={styles.chartWrapper}>
      <Svg width={chartWidth} height={chartHeight + 32}>
        <Defs>
          <SvgGradient id="activeBar" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={ACTIVITY_COLORS.primary} />
            <Stop offset="100%" stopColor={ACTIVITY_COLORS.primaryDark} />
          </SvgGradient>
          <SvgGradient id="goalBar" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={SEMANTIC.success.base} />
            <Stop offset="100%" stopColor="#059669" />
          </SvgGradient>
        </Defs>

        {/* Goal line */}
        <Line
          x1={0}
          y1={chartHeight - (goal / maxVal) * chartHeight}
          x2={chartWidth}
          y2={chartHeight - (goal / maxVal) * chartHeight}
          stroke={ACTIVITY_COLORS.primaryLight}
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.5}
        />

        {data.map((d, i) => {
          const h = Math.max((d.minutes / maxVal) * chartHeight, 4);
          const x = i * (barWidth + spacing);
          const y = chartHeight - h;

          return (
            <G key={i}>
              {/* Track */}
              <Rect
                x={x}
                y={0}
                width={barWidth}
                height={chartHeight}
                rx={barWidth / 2}
                fill={SURFACES.card.secondary}
                opacity={0.4}
              />
              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx={barWidth / 2}
                fill={d.metGoal ? 'url(#goalBar)' : 'url(#activeBar)'}
                opacity={d.isToday ? 1 : 0.85}
              />
              {/* Today dot */}
              {d.isToday && (
                <Circle cx={x + barWidth / 2} cy={chartHeight + 12} r={3} fill={BRAND.primary} />
              )}
              {/* Value */}
              {d.minutes > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 4}
                  fontSize={9}
                  fill={TEXT.secondary}
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {d.minutes}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>

      {/* Labels */}
      <View style={styles.chartLabels}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[
              styles.chartLabel,
              d.isToday && styles.chartLabelToday,
              { width: barWidth, marginRight: i < 6 ? spacing : 0 },
            ]}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ActivityAnalyticsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [reducedMotion, fadeAnim]);

  const { analytics, isLoading, error, refetch, coldStart, weekData, persona } = useActivityAnalytics();

  // Metrics
  const metrics = useMemo(() => {
    const data = weekData || [];
    const weeklyMinutes = data.reduce((sum, d) => sum + (d?.minutes || 0), 0);
    const cdcProgress = Math.min((weeklyMinutes / CDC_WEEKLY_GOAL) * 100, 150);
    const streak = calculateActivityStreak(data);
    const daysActive = data.filter(d => (d?.minutes || 0) > 0).length;

    // Today's minutes
    const today = new Date().toISOString().split('T')[0];
    const todayData = data.find(d => d?.date === today);
    const todayMinutes = todayData?.minutes || 0;

    return { weeklyMinutes, cdcProgress, streak, daysActive, weekData: data, todayMinutes };
  }, [weekData]);

  // Time-aware coaching
  const coach = useMemo(
    () => getTimeAwareCoaching(coldStart, metrics, metrics.todayMinutes),
    [coldStart, metrics]
  );

  // Handlers
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await refetch?.();
    setRefreshing(false);
  }, [refetch]);

  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard');
  }, [router]);

  const handleLog = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/log');
  }, [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Activity',
          headerStyle: { backgroundColor: SURFACES.background.primary },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color={TEXT.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACTIVITY_COLORS.primary} />}
      >
        {isLoading && !analytics && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={ACTIVITY_COLORS.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.errorWrap}>
            <Ionicons name="cloud-offline-outline" size={40} color={SEMANTIC.danger.base} />
            <Text style={styles.errorTitle}>Unable to load</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !error && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* ========== HERO CARD ========== */}
            <View style={styles.heroCard}>
              <LinearGradient
                colors={ACTIVITY_COLORS.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <Text style={styles.heroHeadline}>{coach.headline}</Text>
                <Text style={styles.heroSubhead}>{coach.subhead}</Text>
                <Text style={styles.heroMessage}>{coach.message}</Text>

                <TouchableOpacity style={styles.heroCTA} onPress={handleLog} activeOpacity={0.9}>
                  <Text style={styles.heroCTAText}>{coach.action.primary}</Text>
                  <Ionicons name="arrow-forward" size={18} color={ACTIVITY_COLORS.primary} />
                </TouchableOpacity>

                <Text style={styles.heroSecondary}>{coach.action.secondary}</Text>
              </LinearGradient>
            </View>

            {/* ========== STATS ROW ========== */}
            {coach.stats.show && (
              <View style={styles.statsCard}>
                {coach.stats.items.map((item, i) => (
                  <View key={i} style={styles.statBlock}>
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={item.highlight ? ACTIVITY_COLORS.primary : TEXT.tertiary}
                    />
                    <Text style={[styles.statVal, item.highlight && { color: ACTIVITY_COLORS.primary }]}>
                      {item.value}
                    </Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ========== PROGRESS SECTION ========== */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Weekly Progress</Text>
                <Text style={styles.progressPct}>{coach.progress.percent}%</Text>
              </View>

              <View style={styles.progressBarWrap}>
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={ACTIVITY_COLORS.gradientLight}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${Math.min(coach.progress.percent, 100)}%` }]}
                  />
                </View>
              </View>

              <Text style={styles.progressLabel}>{coach.progress.label}</Text>

              {/* Gauge */}
              <View style={styles.gaugeWrap}>
                <HalfGaugeChart
                  value={metrics.cdcProgress}
                  maxValue={100}
                  label={`${metrics.weeklyMinutes} min`}
                  sublabel={`of ${CDC_WEEKLY_GOAL} min weekly goal`}
                  size={GAUGE_CONFIG.size}
                  strokeWidth={GAUGE_CONFIG.strokeWidth}
                  animated={!reducedMotion}
                  color={ACTIVITY_COLORS.primary}
                  gradient={ACTIVITY_COLORS.gradient}
                />
              </View>
            </View>

            {/* ========== WEEK CHART ========== */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>This Week</Text>
                <View style={styles.chartLegend}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>Activity</Text>
                  <View style={[styles.legendDot, { backgroundColor: SEMANTIC.success.base }]} />
                  <Text style={styles.legendText}>Goal met</Text>
                </View>
              </View>
              <WeekChart weekData={metrics.weekData} goal={CDC_DAILY_AVG} />
            </View>

            {/* ========== COACH TIP ========== */}
            <View style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Ionicons name={coach.tip.icon} size={20} color={ACTIVITY_COLORS.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{coach.tip.text}</Text>
                <Text style={styles.tipSub}>{coach.tip.subtext}</Text>
              </View>
            </View>

            {/* ========== PERSONA (if available) ========== */}
            {persona && (
              <View style={styles.personaCard}>
                <View style={styles.personaIcon}>
                  <Ionicons name={persona.icon || 'person'} size={22} color={ACTIVITY_COLORS.primary} />
                </View>
                <View style={styles.personaContent}>
                  <Text style={styles.personaTitle}>{persona.title}</Text>
                  <Text style={styles.personaDesc}>{persona.description}</Text>
                </View>
              </View>
            )}

            {/* ========== RELATED INSIGHTS ========== */}
            <View style={styles.relatedCard}>
              <Text style={styles.relatedTitle}>Related Insights</Text>

              <TouchableOpacity
                style={styles.relatedRow}
                onPress={() => { Haptics.selectionAsync(); router.push('/insights/activity-mood'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.relatedIcon, { backgroundColor: `${SEMANTIC.success.base}12` }]}>
                  <Ionicons name="happy-outline" size={18} color={SEMANTIC.success.base} />
                </View>
                <View style={styles.relatedText}>
                  <Text style={styles.relatedRowTitle}>Activity & Mood</Text>
                  <Text style={styles.relatedRowSub}>How movement affects your mood</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={TEXT.muted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.relatedRow}
                onPress={() => { Haptics.selectionAsync(); router.push('/insights/hydration-analytics'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.relatedIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="water-outline" size={18} color="#0284C7" />
                </View>
                <View style={styles.relatedText}>
                  <Text style={styles.relatedRowTitle}>Hydration</Text>
                  <Text style={styles.relatedRowSub}>Water intake patterns</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={TEXT.muted} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SURFACES.background.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[4], paddingBottom: SPACING[12] },
  headerBtn: { padding: SPACING[2] },

  // Loading/Error
  loadingWrap: { alignItems: 'center', paddingVertical: SPACING[10] },
  loadingText: { marginTop: SPACING[2], fontSize: TYPOGRAPHY.size.sm, color: TEXT.secondary },
  errorWrap: { alignItems: 'center', paddingVertical: SPACING[10] },
  errorTitle: { marginTop: SPACING[3], fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  retryBtn: { marginTop: SPACING[3], backgroundColor: ACTIVITY_COLORS.primary, paddingHorizontal: SPACING[5], paddingVertical: SPACING[2], borderRadius: RADIUS.md },
  retryText: { color: TEXT.white, fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold },

  // Hero
  heroCard: { marginTop: SPACING[4], borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.lg },
  heroGradient: { padding: SPACING[5] },
  heroHeadline: { fontSize: TYPOGRAPHY.size['2xl'], fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.white, marginBottom: SPACING[1] },
  heroSubhead: { fontSize: TYPOGRAPHY.size.base, color: 'rgba(255,255,255,0.9)', marginBottom: SPACING[2] },
  heroMessage: { fontSize: TYPOGRAPHY.size.sm, color: 'rgba(255,255,255,0.8)', lineHeight: 20, marginBottom: SPACING[4] },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEXT.white,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
    borderRadius: RADIUS.lg,
    gap: SPACING[2],
    alignSelf: 'flex-start',
  },
  heroCTAText: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.bold, color: ACTIVITY_COLORS.primary },
  heroSecondary: { fontSize: TYPOGRAPHY.size.xs, color: 'rgba(255,255,255,0.7)', marginTop: SPACING[3], textAlign: 'center' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.sm,
  },
  statBlock: { alignItems: 'center', gap: SPACING[1] },
  statVal: { fontSize: TYPOGRAPHY.size.xl, fontWeight: TYPOGRAPHY.weight.bold, color: TEXT.primary },
  statLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary },

  // Progress
  progressCard: {
    marginTop: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.sm,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  progressPct: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.bold, color: ACTIVITY_COLORS.primary },
  progressBarWrap: { marginTop: SPACING[3] },
  progressBarBg: { height: 8, backgroundColor: ACTIVITY_COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: SPACING[2], textAlign: 'center' },
  gaugeWrap: { alignItems: 'center', marginTop: SPACING[4] },

  // Chart
  chartCard: {
    marginTop: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.sm,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING[2] },
  chartTitle: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: SPACING[1] },
  legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACTIVITY_COLORS.primary },
  legendText: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginRight: SPACING[2] },
  chartWrapper: { alignItems: 'center' },
  chartLabels: { flexDirection: 'row', marginTop: 4 },
  chartLabel: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, textAlign: 'center' },
  chartLabelToday: { color: BRAND.primary, fontWeight: TYPOGRAPHY.weight.bold },

  // Tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[4],
    backgroundColor: ACTIVITY_COLORS.surfaceLight,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    gap: SPACING[3],
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TEXT.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: ACTIVITY_COLORS.text },
  tipSub: { fontSize: TYPOGRAPHY.size.xs, color: ACTIVITY_COLORS.accent, marginTop: 2 },

  // Persona
  personaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    gap: SPACING[3],
    ...SHADOWS.sm,
  },
  personaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACTIVITY_COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaContent: { flex: 1 },
  personaTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary },
  personaDesc: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.secondary, marginTop: 2, lineHeight: 16 },

  // Related
  relatedCard: {
    marginTop: SPACING[4],
    backgroundColor: SURFACES.card.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.sm,
  },
  relatedTitle: { fontSize: TYPOGRAPHY.size.md, fontWeight: TYPOGRAPHY.weight.semibold, color: TEXT.primary, marginBottom: SPACING[2] },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: SURFACES.divider,
  },
  relatedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING[3],
  },
  relatedText: { flex: 1 },
  relatedRowTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.medium, color: TEXT.primary },
  relatedRowSub: { fontSize: TYPOGRAPHY.size.xs, color: TEXT.tertiary, marginTop: 2 },
});
