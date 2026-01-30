/**
 * Mood Insights Screen - Premium Redesign
 *
 * A world-class recommendation system design featuring:
 * - Sophisticated visual hierarchy
 * - Premium color palette with subtle gradients
 * - Visual-first metrics (rings, gauges, not text dumps)
 * - Scannable card system
 * - Glassmorphism and depth
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop, G } from 'react-native-svg';
import LottieView from 'lottie-react-native';

import { useDashboard } from '../../hooks/useDashboard';
import { useMoodTrends, useMoodIntelligence, useDecisionBrainMoodInsights } from '../../hooks/useMoodInsights';
import { useNotification } from '../../providers/NotificationProvider';
import apiClient from '../../services/apiClient';
import {
  TEXT,
  SEMANTIC,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SURFACES,
  BRAND,
  SHADOWS,
} from '../../constants/premiumTheme';

// Lottie animations
const MOOD_ANIMATIONS = {
  sparkle: require('../../assets/animations/sparkle.json'),
  pulse: require('../../assets/animations/pulse.json'),
  success: require('../../assets/animations/success.json'),
  stars: require('../../assets/animations/stars.json'),
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// PREMIUM COLOR SYSTEM
// ============================================================================
const PREMIUM_COLORS = {
  // Mood spectrum - warm to cool
  excellent: { base: '#10B981', light: '#D1FAE5', gradient: ['#10B981', '#34D399'] },
  good: { base: '#3B82F6', light: '#DBEAFE', gradient: ['#3B82F6', '#60A5FA'] },
  neutral: { base: '#8B5CF6', light: '#EDE9FE', gradient: ['#8B5CF6', '#A78BFA'] },
  low: { base: '#F59E0B', light: '#FEF3C7', gradient: ['#F59E0B', '#FBBF24'] },
  poor: { base: '#EF4444', light: '#FEE2E2', gradient: ['#EF4444', '#F87171'] },

  // UI elements
  card: '#FFFFFF',
  cardHover: '#F8FAFC',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Accent gradients
  heroGradient: ['#667EEA', '#764BA2'],
  premiumGradient: ['#6366F1', '#8B5CF6', '#A855F7'],
  successGradient: ['#10B981', '#059669'],
  warmGradient: ['#F59E0B', '#D97706'],
};

// Mood type metadata for timeline display
const MOOD_META = {
  happy: { emoji: '😊', label: 'Happy', color: '#10B981', light: '#D1FAE5' },
  calm: { emoji: '😌', label: 'Calm', color: '#3B82F6', light: '#DBEAFE' },
  focused: { emoji: '🎯', label: 'Focused', color: '#6366F1', light: '#E0E7FF' },
  energized: { emoji: '⚡', label: 'Energized', color: '#F59E0B', light: '#FEF3C7' },
  neutral: { emoji: '😐', label: 'Neutral', color: '#8B5CF6', light: '#EDE9FE' },
  tired: { emoji: '😴', label: 'Tired', color: '#64748B', light: '#F1F5F9' },
  stressed: { emoji: '😰', label: 'Stressed', color: '#EF4444', light: '#FEE2E2' },
  sad: { emoji: '😢', label: 'Sad', color: '#6366F1', light: '#E0E7FF' },
};

// ============================================================================
// MOOD RING COMPONENT - Visual score display
// ============================================================================
function MoodRing({ score, size = 80, strokeWidth = 8, label, sublabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;

  // Color based on score
  const getColor = () => {
    if (score >= 8) return PREMIUM_COLORS.excellent;
    if (score >= 6) return PREMIUM_COLORS.good;
    if (score >= 4) return PREMIUM_COLORS.neutral;
    if (score >= 2) return PREMIUM_COLORS.low;
    return PREMIUM_COLORS.poor;
  };

  const color = getColor();

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color.gradient[0]} />
            <Stop offset="100%" stopColor={color.gradient[1]} />
          </SvgGradient>
        </Defs>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color.light}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Center text */}
        <G>
          <Text
            x={size / 2}
            y={size / 2 + 6}
            textAnchor="middle"
            fontSize={size * 0.3}
            fontWeight="700"
            fill={color.base}
          >
            {score.toFixed(1)}
          </Text>
        </G>
      </Svg>
      {label && <Text style={[styles.ringLabel, { color: color.base }]}>{label}</Text>}
      {sublabel && <Text style={styles.ringSublabel}>{sublabel}</Text>}
    </View>
  );
}

// ============================================================================
// MINI STAT CARD - Compact visual metric
// ============================================================================
function MiniStatCard({ icon, value, label, color, trend }) {
  return (
    <View style={[styles.miniStatCard, { borderLeftColor: color }]}>
      <View style={[styles.miniStatIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.miniStatContent}>
        <View style={styles.miniStatValueRow}>
          <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
          {trend && (
            <Ionicons
              name={trend === 'up' ? 'arrow-up' : trend === 'down' ? 'arrow-down' : 'remove'}
              size={12}
              color={trend === 'up' ? PREMIUM_COLORS.excellent.base : trend === 'down' ? PREMIUM_COLORS.poor.base : TEXT.tertiary}
            />
          )}
        </View>
        <Text style={styles.miniStatLabel}>{label}</Text>
      </View>
    </View>
  );
}


// ============================================================================
// JOURNEY DAY CHIP - Premium mood day visualization
// ============================================================================
function JourneyDayChip({ day, intensity, isToday, hasData, index }) {
  const getConfig = () => {
    if (!hasData) return { color: '#E2E8F0', bgColor: '#F8FAFC', showAnimation: false };
    if (intensity >= 8) return { color: PREMIUM_COLORS.excellent.base, bgColor: PREMIUM_COLORS.excellent.light, showAnimation: true };
    if (intensity >= 6) return { color: PREMIUM_COLORS.good.base, bgColor: PREMIUM_COLORS.good.light, showAnimation: false };
    if (intensity >= 4) return { color: PREMIUM_COLORS.neutral.base, bgColor: PREMIUM_COLORS.neutral.light, showAnimation: false };
    return { color: PREMIUM_COLORS.low.base, bgColor: PREMIUM_COLORS.low.light, showAnimation: false };
  };

  const config = getConfig();

  return (
    <View style={styles.journeyChipWrapper}>
      <View
        style={[
          styles.journeyChip,
          {
            backgroundColor: config.bgColor,
            borderColor: isToday ? config.color : 'transparent',
            borderWidth: isToday ? 2 : 0,
          },
        ]}
      >
        {hasData ? (
          config.showAnimation ? (
            <LottieView
              source={MOOD_ANIMATIONS.sparkle}
              autoPlay
              loop
              style={styles.journeyLottie}
            />
          ) : (
            <Text style={[styles.journeyScore, { color: config.color }]}>
              {intensity}
            </Text>
          )
        ) : (
          <View style={styles.journeyEmpty} />
        )}
      </View>
      <Text style={[styles.journeyDay, isToday && { color: TEXT.primary, fontWeight: '600' }]}>
        {day}
      </Text>
      {/* Connection line */}
      {index < 6 && (
        <View style={[styles.journeyConnector, { backgroundColor: config.color + '30' }]} />
      )}
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function MoodInsightsScreen() {
  const router = useRouter();
  const notify = useNotification();

  // Data hooks
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();
  const { data: moodData, isLoading: moodLoading } = useMoodTrends({ period: 'week' });
  const { data: intelligence, isLoading: intelligenceLoading } = useMoodIntelligence();

  // Decision Brain - ML-powered insights from backend
  const { data: decisionBrainData, isLoading: decisionBrainLoading } = useDecisionBrainMoodInsights();

  const isLoading = dashboardLoading || moodLoading || decisionBrainLoading;

  // Extract data
  const wellnessScore = intelligence?.wellnessScore || null;

  // Prefer backend data for today's moods, fall back to dashboard
  const todaysMoods = useMemo(() => {
    if (decisionBrainData?.todaysMoods?.length > 0) {
      return decisionBrainData.todaysMoods;
    }
    return dashboard?.today?.moodLogs || [];
  }, [decisionBrainData, dashboard]);

  const latestMood = todaysMoods[0] || null;

  // Calculate stats - prefer Decision Brain stats, fall back to local calculation
  const moodStats = useMemo(() => {
    // If Decision Brain returned stats, use them (they're ML-enhanced)
    if (decisionBrainData?.stats && decisionBrainData.hasEnoughData) {
      return {
        avgMood: decisionBrainData.stats.avgMood ?? 5,
        avgEnergy: decisionBrainData.stats.avgEnergy ?? 5,
        loggedDays: decisionBrainData.stats.loggedDays ?? 0,
        trend: decisionBrainData.stats.trend || 'stable',
        isConsistent: decisionBrainData.stats.isConsistent ?? true,
        dominantMood: decisionBrainData.stats.dominantMood || 'neutral',
        bestDay: decisionBrainData.stats.bestDay,
        worstDay: decisionBrainData.stats.worstDay,
        streak: decisionBrainData.stats.streak ?? 0,
        // Additional ML-derived metrics
        variance: decisionBrainData.stats.moodVariance ?? 0,
      };
    }

    // Fallback to local calculation
    if (!moodData?.trendData) return null;
    const validDays = moodData.trendData.filter(d => d.hasData);
    const avgMood = validDays.length > 0
      ? validDays.reduce((sum, d) => sum + d.intensity, 0) / validDays.length
      : null;

    // Find best and worst days
    const sorted = [...validDays].sort((a, b) => b.intensity - a.intensity);
    const bestDay = sorted[0];
    const worstDay = sorted[sorted.length - 1];

    // Calculate variance locally
    const intensities = validDays.map(d => d.intensity);
    const variance = intensities.length > 1
      ? intensities.reduce((sum, val) => sum + Math.pow(val - (avgMood || 5), 2), 0) / intensities.length
      : 0;

    return {
      avgMood: avgMood ? parseFloat(avgMood.toFixed(1)) : 5,
      loggedDays: validDays.length,
      trend: moodData.trendSummary?.direction || 'stable',
      isConsistent: variance < 2,
      bestDay,
      worstDay,
      streak: validDays.length,
      variance,
    };
  }, [moodData, decisionBrainData]);

  // Generate mood-specific insights - prefer Decision Brain patterns (ML-backed)
  const moodInsights = useMemo(() => {
    // PREFER: Decision Brain ML-powered patterns (includes correlations, causal inference)
    if (decisionBrainData?.patterns && decisionBrainData.patterns.length > 0) {
      // Backend patterns already have the right format: { title, description, icon, color, light, confidence }
      return decisionBrainData.patterns.slice(0, 5);
    }

    // FALLBACK: Local statistical calculation (basic patterns only)
    const items = [];
    if (!moodData?.trendData || !moodStats) return items;

    const validDays = moodData.trendData.filter(d => d.hasData);
    if (validDays.length < 2) return items;

    // 1. Mood consistency insight
    const intensities = validDays.map(d => d.intensity);
    const variance = intensities.length > 1
      ? intensities.reduce((sum, val) => sum + Math.pow(val - moodStats.avgMood, 2), 0) / intensities.length
      : 0;
    const isConsistent = variance < 2;

    if (isConsistent && validDays.length >= 3) {
      items.push({
        title: 'Stable mood pattern',
        description: 'Your mood has been consistent this week',
        icon: 'shield-checkmark',
        color: PREMIUM_COLORS.excellent.base,
        light: PREMIUM_COLORS.excellent.light,
      });
    } else if (variance > 4) {
      items.push({
        title: 'Mood variability',
        description: 'Your mood has fluctuated this week',
        icon: 'pulse',
        color: PREMIUM_COLORS.low.base,
        light: PREMIUM_COLORS.low.light,
      });
    }

    // 2. Trend direction insight
    if (moodStats.trend === 'up' && validDays.length >= 3) {
      items.push({
        title: 'Upward trend',
        description: 'Your mood has been improving lately',
        icon: 'trending-up',
        color: PREMIUM_COLORS.excellent.base,
        light: PREMIUM_COLORS.excellent.light,
      });
    } else if (moodStats.trend === 'down' && validDays.length >= 3) {
      items.push({
        title: 'Downward trend',
        description: 'Your mood has dipped recently',
        icon: 'trending-down',
        color: PREMIUM_COLORS.low.base,
        light: PREMIUM_COLORS.low.light,
      });
    }

    // 3. Best day insight
    if (moodStats.bestDay && moodStats.bestDay.intensity >= 7) {
      const bestDayName = new Date(moodStats.bestDay.dayKey).toLocaleDateString('en-US', { weekday: 'long' });
      items.push({
        title: `Peak on ${bestDayName}`,
        description: `You felt great with ${moodStats.bestDay.intensity}/10`,
        icon: 'sunny',
        color: PREMIUM_COLORS.good.base,
        light: PREMIUM_COLORS.good.light,
      });
    }

    // 4. Logging streak insight
    if (moodStats.streak >= 3) {
      items.push({
        title: `${moodStats.streak}-day tracking streak`,
        description: 'Keep up the self-awareness habit!',
        icon: 'flame',
        color: PREMIUM_COLORS.low.base,
        light: PREMIUM_COLORS.low.light,
      });
    }

    // 5. Average mood level insight
    if (moodStats.avgMood >= 7) {
      items.push({
        title: 'Great week overall',
        description: `Averaging ${moodStats.avgMood.toFixed(1)}/10 mood`,
        icon: 'happy',
        color: PREMIUM_COLORS.excellent.base,
        light: PREMIUM_COLORS.excellent.light,
      });
    } else if (moodStats.avgMood < 4 && validDays.length >= 3) {
      items.push({
        title: 'Tough week',
        description: 'Consider what might help boost your mood',
        icon: 'heart',
        color: PREMIUM_COLORS.neutral.base,
        light: PREMIUM_COLORS.neutral.light,
      });
    }

    return items.slice(0, 3);
  }, [moodData, moodStats, decisionBrainData]);

  // Handlers
  const handleBack = useCallback(() => {
    Haptics.selectionAsync();
    router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard');
  }, [router]);

  const handleLogMood = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/dashboard');
  }, [router]);

  const handleShare = useCallback(async () => {
    if (!moodStats) return;
    const message = `My Mood This Week\nAverage: ${moodStats.avgMood}/10\nStreak: ${moodStats.streak} days\n\nTracked with MyFoodTracker`;
    try {
      await Share.share({ message });
    } catch (err) {
      notify.error('Unable to share');
    }
  }, [moodStats, notify]);

  const handleDeepAnalytics = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/insights/mood-deep');
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_COLORS.heroGradient[0]} />
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  const currentScore = latestMood?.intensity || latestMood?.energyLevel || moodStats?.avgMood || 5;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={TEXT.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mood Insights</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-outline" size={22} color={TEXT.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════════════════════════════════════════════════════════════
            HERO SECTION - Premium score display
            ════════════════════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={PREMIUM_COLORS.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            {/* Main Score Ring */}
            <View style={styles.heroScoreSection}>
              <View style={styles.heroRingContainer}>
                <Svg width={120} height={120}>
                  <Defs>
                    <SvgGradient id="heroRing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                      <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.6" />
                    </SvgGradient>
                  </Defs>
                  <Circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                  <Circle
                    cx="60" cy="60" r="50"
                    stroke="url(#heroRing)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(currentScore / 10) * 314} 314`}
                    transform="rotate(-90 60 60)"
                  />
                </Svg>
                <View style={styles.heroScoreCenter}>
                  <Text style={styles.heroScoreValue}>{currentScore.toFixed(1)}</Text>
                  <Text style={styles.heroScoreMax}>/10</Text>
                </View>
              </View>
              <Text style={styles.heroScoreLabel}>
                {latestMood ? 'Current Mood' : 'Weekly Average'}
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{moodStats?.loggedDays || 0}</Text>
                <Text style={styles.heroStatLabel}>Days</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Ionicons
                  name={moodStats?.trend === 'up' ? 'trending-up' : moodStats?.trend === 'down' ? 'trending-down' : 'remove'}
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.heroStatLabel}>
                  {moodStats?.trend === 'up' ? 'Rising' : moodStats?.trend === 'down' ? 'Falling' : 'Stable'}
                </Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{moodStats?.streak || 0}</Text>
                <Text style={styles.heroStatLabel}>Streak</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ════════════════════════════════════════════════════════════════════
            WELLNESS METRICS ROW - Visual-first design
            ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.metricsRow}>
          <MiniStatCard
            icon="heart"
            value={wellnessScore?.score || moodStats?.avgMood?.toFixed(0) || '—'}
            label="Wellness"
            color={PREMIUM_COLORS.excellent.base}
            trend={moodStats?.trend}
          />
          <MiniStatCard
            icon="flash"
            value={moodStats?.bestDay?.intensity || '—'}
            label="Peak"
            color={PREMIUM_COLORS.good.base}
          />
          <MiniStatCard
            icon="pulse"
            value={moodStats?.loggedDays || 0}
            label="Logged"
            color={PREMIUM_COLORS.neutral.base}
          />
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            JOURNEY SECTION - Week at a glance
            ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color={PREMIUM_COLORS.heroGradient[0]} />
            <Text style={styles.sectionTitle}>Your Week</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.journeyContainer}
          >
            {moodData?.trendData?.map((day, i) => {
              const dayName = new Date(day.dayKey).toLocaleDateString('en-US', { weekday: 'short' });
              const isToday = i === (moodData.trendData.length - 1);
              return (
                <JourneyDayChip
                  key={i}
                  day={dayName}
                  intensity={day.intensity}
                  isToday={isToday}
                  hasData={day.hasData}
                  index={i}
                />
              );
            })}
          </ScrollView>

          {/* Weekly insight */}
          {moodStats?.bestDay && (
            <View style={styles.weeklyInsight}>
              <Ionicons name="sparkles" size={16} color={PREMIUM_COLORS.excellent.base} />
              <Text style={styles.weeklyInsightText}>
                Best day: {new Date(moodStats.bestDay.dayKey).toLocaleDateString('en-US', { weekday: 'long' })} ({moodStats.bestDay.intensity}/10)
              </Text>
            </View>
          )}
        </View>

        {/* ════════════════════════════════════════════════════════════════════
            MOOD INSIGHTS SECTION - Real patterns from mood data
            ════════════════════════════════════════════════════════════════════ */}
        {moodInsights.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={20} color={PREMIUM_COLORS.neutral.base} />
              <Text style={styles.sectionTitle}>Patterns</Text>
              <View style={[styles.sectionBadge, { backgroundColor: PREMIUM_COLORS.neutral.light }]}>
                <Text style={[styles.sectionBadgeText, { color: PREMIUM_COLORS.neutral.base }]}>
                  {moodInsights.length}
                </Text>
              </View>
            </View>

            <View style={styles.insightsContainer}>
              {moodInsights.map((insight, i) => (
                <View key={i} style={styles.insightCard}>
                  <View style={[styles.insightIconWrap, { backgroundColor: insight.light }]}>
                    <Ionicons name={insight.icon} size={18} color={insight.color} />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={[styles.insightTitle, { color: insight.color }]}>{insight.title}</Text>
                    <Text style={styles.insightDescription}>{insight.description}</Text>
                    {/* Show confidence if available (from ML backend) */}
                    {insight.confidence && (
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>
                          {Math.round(insight.confidence * 100)}% confidence
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            ML CORRELATIONS SECTION - Deep patterns from Decision Brain
            ════════════════════════════════════════════════════════════════════ */}
        {decisionBrainData?.correlations && decisionBrainData.correlations.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-network-outline" size={20} color={PREMIUM_COLORS.good.base} />
              <Text style={styles.sectionTitle}>What Affects Your Mood</Text>
              <View style={[styles.sectionBadge, { backgroundColor: PREMIUM_COLORS.good.light }]}>
                <Text style={[styles.sectionBadgeText, { color: PREMIUM_COLORS.good.base }]}>
                  ML
                </Text>
              </View>
            </View>

            <View style={styles.correlationsContainer}>
              {decisionBrainData.correlations.map((correlation, i) => (
                <View key={correlation.id || i} style={styles.correlationCard}>
                  <View style={styles.correlationHeader}>
                    <View style={[
                      styles.correlationIconWrap,
                      { backgroundColor: correlation.impactType === 'positive' ? PREMIUM_COLORS.excellent.light : PREMIUM_COLORS.low.light }
                    ]}>
                      <Ionicons
                        name={correlation.impactType === 'positive' ? 'arrow-up' : 'arrow-down'}
                        size={16}
                        color={correlation.impactType === 'positive' ? PREMIUM_COLORS.excellent.base : PREMIUM_COLORS.low.base}
                      />
                    </View>
                    <View style={styles.correlationMeta}>
                      <Text style={styles.correlationStatement}>{correlation.statement}</Text>
                      <View style={styles.correlationStats}>
                        <Text style={styles.correlationConfidence}>
                          {Math.round(correlation.confidence * 100)}% confident
                        </Text>
                      </View>
                    </View>
                  </View>
                  {correlation.suggestion && (
                    <View style={styles.correlationSuggestion}>
                      <Ionicons name="bulb-outline" size={12} color={TEXT.tertiary} />
                      <Text style={styles.correlationSuggestionText}>{correlation.suggestion}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Data source attribution */}
            <View style={styles.mlAttribution}>
              <Ionicons name="sparkles" size={12} color={TEXT.muted} />
              <Text style={styles.mlAttributionText}>
                Powered by ML analysis of your wellness data
              </Text>
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TODAY'S MOODS SECTION - Timeline of mood entries
            ════════════════════════════════════════════════════════════════════ */}
        {todaysMoods.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color={PREMIUM_COLORS.neutral.base} />
              <Text style={styles.sectionTitle}>Today's Moods</Text>
              <View style={[styles.sectionBadge, { backgroundColor: PREMIUM_COLORS.neutral.light }]}>
                <Text style={[styles.sectionBadgeText, { color: PREMIUM_COLORS.neutral.base }]}>
                  {todaysMoods.length}
                </Text>
              </View>
            </View>

            <View style={styles.moodTimelineContainer}>
              {todaysMoods.map((entry, index) => {
                const moodMeta = MOOD_META[entry.mood] || MOOD_META.neutral;
                const time = new Date(entry.loggedDate).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });
                const isLast = index === todaysMoods.length - 1;

                return (
                  <View key={entry.id || entry.clientEventId || index} style={styles.moodTimelineItem}>
                    {/* Timeline connector */}
                    {!isLast && <View style={[styles.timelineConnector, { backgroundColor: moodMeta.color + '30' }]} />}

                    {/* Mood icon */}
                    <View style={[styles.moodTimelineIcon, { backgroundColor: moodMeta.light }]}>
                      <Text style={styles.moodTimelineEmoji}>{moodMeta.emoji}</Text>
                    </View>

                    {/* Content */}
                    <View style={styles.moodTimelineContent}>
                      <View style={styles.moodTimelineHeader}>
                        <Text style={[styles.moodTimelineLabel, { color: moodMeta.color }]}>
                          {moodMeta.label}
                        </Text>
                        <Text style={styles.moodTimelineTime}>{time}</Text>
                      </View>
                      <View style={styles.moodTimelineMeta}>
                        {entry.intensity && (
                          <View style={[styles.intensityPill, { backgroundColor: moodMeta.color + '15' }]}>
                            <Text style={[styles.intensityPillText, { color: moodMeta.color }]}>
                              {entry.intensity}/10
                            </Text>
                          </View>
                        )}
                        {entry.energyLevel && (
                          <View style={[styles.energyPill, { backgroundColor: PREMIUM_COLORS.low.light }]}>
                            <Ionicons name="flash" size={10} color={PREMIUM_COLORS.low.base} />
                            <Text style={[styles.energyPillText, { color: PREMIUM_COLORS.low.base }]}>
                              {entry.energyLevel}/10
                            </Text>
                          </View>
                        )}
                        {entry.note && (
                          <View style={styles.noteBadge}>
                            <Ionicons name="chatbubble-outline" size={10} color={TEXT.tertiary} />
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            DEEP ANALYTICS CTA - Navigate to mood-deep for detailed visualizations
            ════════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity onPress={handleDeepAnalytics} style={styles.deepAnalyticsCta} activeOpacity={0.8}>
          <View style={styles.deepAnalyticsContent}>
            <View style={styles.deepAnalyticsLeft}>
              <View style={styles.deepAnalyticsIconWrap}>
                <Ionicons name="analytics" size={20} color={PREMIUM_COLORS.neutral.base} />
              </View>
              <View>
                <Text style={styles.deepAnalyticsTitle}>Deep Analytics</Text>
                <Text style={styles.deepAnalyticsSubtitle}>Time patterns, distributions & more</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={TEXT.tertiary} />
          </View>
        </TouchableOpacity>

        {/* ════════════════════════════════════════════════════════════════════
            FOOTER CTA
            ════════════════════════════════════════════════════════════════════ */}
        <TouchableOpacity onPress={handleLogMood} style={styles.footerCta} activeOpacity={0.8}>
          <LinearGradient
            colors={PREMIUM_COLORS.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.footerCtaGradient}
          >
            <Ionicons name="add-circle" size={24} color="#FFFFFF" />
            <Text style={styles.footerCtaText}>Log Your Mood</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={14} color={TEXT.muted} />
          <Text style={styles.disclaimerText}>
            Insights are for informational purposes only. Consult a healthcare professional for medical advice.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: SPACING[3],
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[6],
    paddingBottom: SPACING[3],
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    padding: SPACING[2],
    marginLeft: -SPACING[2],
  },
  headerCenter: {
    flex: 1,
    marginLeft: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  shareButton: {
    padding: SPACING[2],
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING[4],
    paddingBottom: SPACING[10],
  },

  // Hero Card
  heroCard: {
    borderRadius: 24,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroScoreSection: {
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  heroRingContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroScoreCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  heroScoreValue: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  heroScoreMax: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: -4,
  },
  heroScoreLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING[2],
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  miniStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING[3],
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  miniStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[2],
  },
  miniStatContent: {
    flex: 1,
  },
  miniStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
  },
  miniStatLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[4],
    gap: SPACING[2],
  },
  sectionTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  sectionBadge: {
    backgroundColor: PREMIUM_COLORS.low.light,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: PREMIUM_COLORS.low.base,
  },

  // Journey
  journeyContainer: {
    flexDirection: 'row',
    paddingRight: SPACING[4],
  },
  journeyChipWrapper: {
    alignItems: 'center',
    marginRight: SPACING[3],
    position: 'relative',
  },
  journeyChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyLottie: {
    width: 28,
    height: 28,
  },
  journeyScore: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.family.bold,
  },
  journeyEmpty: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  journeyDay: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: SPACING[1],
  },
  journeyConnector: {
    position: 'absolute',
    top: 24,
    right: -SPACING[2],
    width: SPACING[2],
    height: 2,
  },
  weeklyInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  weeklyInsightText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
  },

  // Mood Insights (Patterns)
  insightsContainer: {
    gap: SPACING[2],
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: SPACING[3],
    gap: SPACING[3],
  },
  insightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  insightDescription: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Confidence badge for ML-powered insights
  confidenceBadge: {
    marginTop: SPACING[1],
  },
  confidenceText: {
    fontSize: 10,
    color: TEXT.muted,
    fontStyle: 'italic',
  },

  // ML Correlations Section
  correlationsContainer: {
    gap: SPACING[3],
  },
  correlationCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  correlationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
  },
  correlationIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correlationMeta: {
    flex: 1,
  },
  correlationStatement: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.primary,
    lineHeight: 20,
  },
  correlationStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[1],
  },
  correlationConfidence: {
    fontSize: 11,
    color: TEXT.tertiary,
  },
  correlationSuggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginTop: SPACING[3],
    paddingTop: SPACING[2],
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  correlationSuggestionText: {
    flex: 1,
    fontSize: 12,
    color: TEXT.secondary,
    lineHeight: 18,
  },
  mlAttribution: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  mlAttributionText: {
    fontSize: 11,
    color: TEXT.muted,
  },

  // Ring Component
  ringLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    marginTop: SPACING[2],
  },
  ringSublabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Today's Moods Timeline
  moodTimelineContainer: {
    gap: SPACING[1],
  },
  moodTimelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    paddingBottom: SPACING[3],
  },
  timelineConnector: {
    position: 'absolute',
    left: 20,
    top: 44,
    bottom: 0,
    width: 2,
    borderRadius: 1,
  },
  moodTimelineIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  moodTimelineEmoji: {
    fontSize: 20,
  },
  moodTimelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  moodTimelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[1],
  },
  moodTimelineLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  moodTimelineTime: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  moodTimelineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  intensityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: 10,
  },
  intensityPillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  energyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: 10,
  },
  energyPillText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  noteBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Deep Analytics CTA
  deepAnalyticsCta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.neutral.light,
  },
  deepAnalyticsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deepAnalyticsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  deepAnalyticsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PREMIUM_COLORS.neutral.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deepAnalyticsTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  deepAnalyticsSubtitle: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Footer CTA
  footerCta: {
    marginTop: SPACING[2],
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  footerCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[4],
    gap: SPACING[2],
  },
  footerCtaText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
    marginTop: SPACING[4],
    paddingHorizontal: SPACING[2],
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: TEXT.muted,
    lineHeight: 16,
  },
});
