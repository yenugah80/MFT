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
import { useMoodTrends, useMoodIntelligence } from '../../hooks/useMoodInsights';
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
// DISCOVERY CARD - Premium pattern visualization
// ============================================================================
function DiscoveryCard({ trigger, impact, impactType, frequency, icon }) {
  const isPositive = impactType === 'positive';
  const color = isPositive ? PREMIUM_COLORS.excellent : PREMIUM_COLORS.low;

  return (
    <View style={styles.discoveryCard}>
      <View style={styles.discoveryHeader}>
        <View style={[styles.discoveryIconWrap, { backgroundColor: color.light }]}>
          <Ionicons name={icon} size={20} color={color.base} />
        </View>
        <View style={styles.discoveryHeaderText}>
          <Text style={styles.discoveryTrigger}>{trigger}</Text>
          <Text style={styles.discoveryFrequency}>{frequency}</Text>
        </View>
        <View style={[styles.discoveryImpactBadge, { backgroundColor: color.light }]}>
          <Text style={[styles.discoveryImpactText, { color: color.base }]}>
            {isPositive ? '+' : ''}{impact}
          </Text>
        </View>
      </View>

      {/* Visual Impact Bar */}
      <View style={styles.discoveryBarContainer}>
        <View style={[styles.discoveryBarBg, { backgroundColor: color.light }]}>
          <LinearGradient
            colors={color.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.discoveryBarFill,
              { width: `${Math.min(Math.abs(parseInt(impact)) * 5, 100)}%` }
            ]}
          />
        </View>
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

  const isLoading = dashboardLoading || moodLoading;

  // Extract data
  const wellnessScore = intelligence?.wellnessScore || null;
  const todaysMoods = useMemo(() => dashboard?.today?.moodLogs || [], [dashboard]);
  const latestMood = todaysMoods[0] || null;

  // Calculate stats
  const moodStats = useMemo(() => {
    if (!moodData?.trendData) return null;
    const validDays = moodData.trendData.filter(d => d.hasData);
    const avgMood = validDays.length > 0
      ? validDays.reduce((sum, d) => sum + d.intensity, 0) / validDays.length
      : null;

    // Find best and worst days
    const sorted = [...validDays].sort((a, b) => b.intensity - a.intensity);
    const bestDay = sorted[0];
    const worstDay = sorted[sorted.length - 1];

    return {
      avgMood: avgMood ? parseFloat(avgMood.toFixed(1)) : 5,
      loggedDays: validDays.length,
      trend: moodData.trendSummary?.direction || 'stable',
      bestDay,
      worstDay,
      streak: validDays.length,
    };
  }, [moodData]);

  // Generate discoveries from data
  const discoveries = useMemo(() => {
    const items = [];

    // Food correlation
    const foodLogs = dashboard?.today?.foodLogs || [];
    if (foodLogs.length > 0 && latestMood) {
      const goodMeals = foodLogs.filter(f => f.nutriScore >= 70);
      if (goodMeals.length > 0) {
        items.push({
          trigger: 'Nutritious meals',
          icon: 'nutrition',
          impact: '+15%',
          impactType: 'positive',
          frequency: `${goodMeals.length} quality meals today`,
        });
      }
    }

    // Hydration pattern
    const waterLogs = dashboard?.today?.waterLogs || [];
    const totalWater = waterLogs.reduce((sum, w) => sum + (w.amount || 0), 0);
    if (totalWater < 1500) {
      items.push({
        trigger: 'Low hydration',
        icon: 'water',
        impact: '-12%',
        impactType: 'negative',
        frequency: 'Below daily target',
      });
    } else if (totalWater >= 2000) {
      items.push({
        trigger: 'Good hydration',
        icon: 'water',
        impact: '+8%',
        impactType: 'positive',
        frequency: 'Meeting daily goal',
      });
    }

    // Activity pattern
    const activityLogs = dashboard?.today?.activityLogs || [];
    if (activityLogs.length > 0) {
      items.push({
        trigger: 'Physical activity',
        icon: 'fitness',
        impact: '+18%',
        impactType: 'positive',
        frequency: `${activityLogs.length} session${activityLogs.length > 1 ? 's' : ''} logged`,
      });
    }

    // Sleep pattern (simulated)
    if (moodStats?.avgMood && moodStats.avgMood < 5) {
      items.push({
        trigger: 'Rest quality',
        icon: 'moon',
        impact: '-10%',
        impactType: 'negative',
        frequency: 'May need more sleep',
      });
    }

    return items.slice(0, 3);
  }, [dashboard, latestMood, moodStats]);

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
            DISCOVERIES SECTION - Pattern insights
            ════════════════════════════════════════════════════════════════════ */}
        {discoveries.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb-outline" size={20} color={PREMIUM_COLORS.low.base} />
              <Text style={styles.sectionTitle}>Discoveries</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{discoveries.length}</Text>
              </View>
            </View>

            <View style={styles.discoveriesContainer}>
              {discoveries.map((discovery, i) => (
                <DiscoveryCard
                  key={i}
                  trigger={discovery.trigger}
                  icon={discovery.icon}
                  impact={discovery.impact}
                  impactType={discovery.impactType}
                  frequency={discovery.frequency}
                />
              ))}
            </View>
          </View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            QUICK ACTIONS - Contextual next steps
            ════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={20} color={PREMIUM_COLORS.good.base} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleLogMood}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={PREMIUM_COLORS.heroGradient}
                style={styles.actionIconWrap}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.actionTitle}>Log Mood</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/log')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: PREMIUM_COLORS.excellent.light }]}>
                <Ionicons name="restaurant" size={20} color={PREMIUM_COLORS.excellent.base} />
              </View>
              <Text style={styles.actionTitle}>Log Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/dashboard')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: PREMIUM_COLORS.good.light }]}>
                <Ionicons name="water" size={20} color={PREMIUM_COLORS.good.base} />
              </View>
              <Text style={styles.actionTitle}>Hydrate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/insights/food-analytics')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: PREMIUM_COLORS.neutral.light }]}>
                <Ionicons name="analytics" size={20} color={PREMIUM_COLORS.neutral.base} />
              </View>
              <Text style={styles.actionTitle}>Insights</Text>
            </TouchableOpacity>
          </View>
        </View>

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

  // Discoveries
  discoveriesContainer: {
    gap: SPACING[3],
  },
  discoveryCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: SPACING[3],
  },
  discoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  discoveryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  discoveryHeaderText: {
    flex: 1,
  },
  discoveryTrigger: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    color: TEXT.primary,
  },
  discoveryFrequency: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
  discoveryImpactBadge: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: 20,
  },
  discoveryImpactText: {
    fontSize: 13,
    fontWeight: '700',
  },
  discoveryBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  discoveryBarBg: {
    flex: 1,
    borderRadius: 3,
  },
  discoveryBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
  },
  actionCard: {
    width: (SCREEN_WIDTH - SPACING[4] * 2 - SPACING[4] * 2 - SPACING[3] * 3) / 4,
    alignItems: 'center',
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT.secondary,
    textAlign: 'center',
  },

  // Ring Component
  ringLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: '600',
    marginTop: SPACING[2],
  },
  ringSublabel: {
    fontSize: 11,
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
