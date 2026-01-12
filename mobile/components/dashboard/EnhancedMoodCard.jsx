/**
 * EnhancedMoodCard - Premium Mood & Wellness Dashboard Card
 *
 * Unified mood and wellness tracking with:
 * - Current mood display with 3D icon
 * - Integrated Wellness Score ring
 * - 7-day mini sparkline trend
 * - Quick stats (avg mood, best day, patterns)
 * - Empty state for first-time users
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ICON_SIZES, MOOD_PALETTE, BRAND, TEXT, SEMANTIC_ACTIONS } from '../../constants/premiumTheme';
import { useTheme } from '../../providers/ThemeProvider';

import MoodIcon3D from '../MoodTracker/MoodIcon3D';

const SPARKLINE_WIDTH = 200;
const SPARKLINE_HEIGHT = 64;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Compact Wellness Score Ring
 */
const WellnessScoreRing = ({ score = 0, size = 56, strokeWidth = 5 }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: safeScore / 100,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [safeScore, animatedValue]);

  const getScoreColor = (s) => {
    if (s >= 80) return ['#10B981', '#34D399'];
    if (s >= 60) return ['#6B4EFF', '#8B6EFF'];
    if (s >= 40) return ['#F59E0B', '#FBBF24'];
    return ['#EF4444', '#F87171'];
  };

  const colors = getScoreColor(safeScore);

  return (
    <View style={wellnessStyles.ringContainer}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="wellnessGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1]} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`${SEMANTIC_ACTIONS.success}1A`}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#wellnessGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [circumference, 0],
          })}
        />
      </Svg>
      <View style={wellnessStyles.scoreOverlay}>
        <Text style={[wellnessStyles.scoreValue, { color: colors[0] }]}>{safeScore}</Text>
      </View>
    </View>
  );
};

const wellnessStyles = StyleSheet.create({
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
});

const EnhancedMoodCard = ({
  insights,
  loading = false,
  wellnessScore = null,
  showWellnessScore = true,
  onOpenInsights,
}) => {
  const { colors, isDark } = useTheme();

  // Theme-aware colors
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;
  const textMuted = colors.text.muted || textTertiary;

  // Theme-aware backgrounds
  const containerBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F6F8FC';
  const sectionBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFE';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : SURFACES.background.tertiary;
  const statsGridBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F6FB';
  const hintBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F6FB';
  const pillBg = isDark ? 'rgba(255, 255, 255, 0.1)' : '#EEF2F6';
  const confidencePillBg = isDark ? 'rgba(255, 255, 255, 0.1)' : SURFACES.background.tertiary;

  const latestMood = insights?.latestMood || null;
  const moodColors = latestMood?.mood
    ? MOOD_PALETTE[latestMood.mood]
    : MOOD_PALETTE.neutral;
  const pastelGradient = isDark
    ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
    : getPastelGradient(latestMood?.mood);
  const lastLoggedLabel = useMemo(() => formatLastLogged(latestMood?.loggedDate), [latestMood?.loggedDate]);
  const stats = insights?.stats || null;
  const trendData = insights?.trendData || [];
  const trendSummary = insights?.trendSummary || { direction: 'flat', delta: null, lastIntensity: null };
  const confidenceLevel = insights?.confidenceLevel || 'low';
  const dataQuality = insights?.dataQuality || { totalLogs: 0, daysWithLogs: 0 };
  const flags = insights?.flags || { showStats: false, showTrend: false, showRecommendation: false };

  // Empty State - also check if mood field is missing
  if ((!latestMood || !latestMood.mood) && !loading) {
    const emptyGradient = isDark
      ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']
      : PASTEL_NEUTRAL_GRADIENT;
    return (
      <View style={[styles.container, { backgroundColor: containerBg }]}>
        <LinearGradient
          colors={emptyGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyGradient}
        >
          <View style={styles.emptyState}>
            <MoodIcon3D mood="happy" size={64} selected={false} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>How are you feeling?</Text>
            <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
              Track your mood and discover patterns
            </Text>
            <View style={[styles.emptyHintRow, { backgroundColor: hintBg }]}>
              <Ionicons name="information-circle" size={ICON_SIZES.md} color={textPrimary} />
              <Text style={[styles.emptyHintText, { color: textSecondary }]}>Log your mood in the tracker to unlock insights</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Loading State
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: containerBg }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={textTertiary} />
          <Text style={[styles.loadingText, { color: textSecondary }]}>Loading mood data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* Header with Gradient Glow */}
      <LinearGradient
        colors={pastelGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="happy" size={ICON_SIZES.md} color={textPrimary} />
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Mood & Energy</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Mood Summary */}
      <View style={[styles.moodSummary, { backgroundColor: sectionBg, borderColor }]}>
        <View style={styles.moodHeader}>
          <MoodIcon3D
            mood={latestMood?.mood || 'neutral'}
            size={60}
            selected={true}
            onSelect={() => {}}
          />
          <View style={styles.moodMeta}>
            <Text style={[styles.currentMoodLabel, { color: textTertiary }]}>Current Mood</Text>
            <Text style={[styles.currentMoodValue, { color: textPrimary }]}>
              {latestMood?.mood ? latestMood.mood.charAt(0).toUpperCase() + latestMood.mood.slice(1) : 'Unknown'}
            </Text>
            {lastLoggedLabel && (
              <Text style={[styles.lastLoggedText, { color: textTertiary }]}>Logged {lastLoggedLabel}</Text>
            )}
          </View>
        </View>
        <View style={styles.intensityContainer}>
          <Text style={[styles.intensityLabel, { color: textTertiary }]}>Intensity</Text>
          <View style={[styles.intensityBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : SURFACES.background.tertiary }]}>
            <View
              style={[
                styles.intensityFill,
                {
                  width: `${((latestMood?.intensity || 5) / 10) * 100}%`,
                  backgroundColor: moodColors?.base,
                },
              ]}
            />
          </View>
          <Text style={[styles.intensityValue, { color: textPrimary }]}>{latestMood?.intensity || 5}/10</Text>
        </View>
      </View>

      {/* Wellness Score Section - Redesigned for simplicity */}
      {showWellnessScore && wellnessScore !== null && wellnessScore?.score != null && (
        <TouchableOpacity
          style={[styles.wellnessSection, { backgroundColor: sectionBg, borderColor: `${SEMANTIC_ACTIONS.success}40` }]}
          onPress={onOpenInsights}
          activeOpacity={0.8}
        >
          <View style={styles.wellnessContent}>
            <View style={styles.wellnessScoreSection}>
              <WellnessScoreRing score={wellnessScore.score || 0} size={48} strokeWidth={4} />
              <View style={styles.wellnessMeta}>
                <Text style={[styles.wellnessScore, { color: textPrimary }]}>Wellness</Text>
                <View style={[styles.wellnessTier, { backgroundColor: getWellnessColor(wellnessScore.score) + '20' }]}>
                  <Text style={[styles.wellnessTierText, { color: getWellnessColor(wellnessScore.score) }]}>
                    {getWellnessTier(wellnessScore.score)}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.wellnessDescription, { color: textTertiary }]}>
              Tap to view detailed breakdown
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={textMuted} />
        </TouchableOpacity>
      )}

      {/* Trend Panel */}
      {flags.showTrend && Array.isArray(trendData) && trendData.length > 0 && (
        <TouchableOpacity
          style={[styles.trendPanel, { backgroundColor: sectionBg, borderColor }]}
          onPress={onOpenInsights}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open mood insights"
          accessibilityHint="Opens detailed mood insights and history"
        >
          <View style={styles.trendHeaderRow}>
            <Text style={[styles.trendLabel, { color: textSecondary }]}>7-Day Trend</Text>
            <View style={[styles.trendBadge, { backgroundColor: pillBg, borderColor }]}>
              <Ionicons
                name={trendSummary.direction === 'up' ? 'trending-up' : trendSummary.direction === 'down' ? 'trending-down' : 'remove'}
                size={12}
                color={trendSummary.direction === 'up' ? '#0F766E' : trendSummary.direction === 'down' ? '#B45309' : textTertiary}
              />
              <Text style={[styles.trendBadgeText, { color: textSecondary }]}>
                {trendSummary.direction === 'up'
                  ? 'Up'
                  : trendSummary.direction === 'down'
                  ? 'Down'
                  : trendSummary.direction === 'flat'
                  ? 'Flat'
                  : 'Insufficient'}
              </Text>
            </View>
          </View>
          <MiniSparkline data={trendData} width={SPARKLINE_WIDTH} height={SPARKLINE_HEIGHT} />
          {latestMood?.energyLevel && (
            <View style={styles.energyPill}>
              <Ionicons name="flash" size={ICON_SIZES.xs} color="#F59E0B" />
              <Text style={styles.energyText}>
                Energy {latestMood?.energyLevel}/10
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Quick Stats Grid */}
      {flags.showStats && stats && (
        <View style={styles.statsSection}>
          <View style={styles.statsHeaderRow}>
            <Text style={[styles.statsLabel, { color: textSecondary }]}>This Week</Text>
            <View style={[styles.confidencePill, { backgroundColor: confidencePillBg }]}>
              <Text style={[styles.confidenceText, { color: textSecondary }]}>{confidenceLevel} confidence</Text>
            </View>
          </View>
          <View style={[styles.statsGrid, { backgroundColor: statsGridBg }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.avgMood || '--'}</Text>
              <Text style={[styles.statLabel, { color: textTertiary }]}>Avg</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: borderColor }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: textPrimary }]}>
                {stats.bestDay ? formatDayKey(stats.bestDay) : '--'}
              </Text>
              <Text style={[styles.statLabel, { color: textTertiary }]}>Best</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: borderColor }]} />

            <View style={styles.statItem}>
              <Ionicons
                name={stats.patternsDetected ? 'checkmark-circle' : 'close-circle'}
                size={ICON_SIZES.md}
                color={stats.patternsDetected ? '#0F766E' : textTertiary}
              />
              <Text style={[styles.statLabel, { color: textTertiary }]}>Pattern</Text>
            </View>
          </View>
          <Text style={[styles.statsFootnote, { color: textTertiary }]}>
            Based on {dataQuality.totalLogs} log{dataQuality.totalLogs === 1 ? '' : 's'} over {dataQuality.daysWithLogs} day{dataQuality.daysWithLogs === 1 ? '' : 's'}.
          </Text>
          <Text style={[styles.progressHint, { color: textSecondary }]}>
            Insights sharpen as you log across more days.
          </Text>
        </View>
      )}

    </View>
  );
};

/**
 * Mini Sparkline Component
 */
const MiniSparkline = ({ data, width, height }) => {
  const { colors, isDark } = useTheme();

  // Theme-aware colors for sparkline
  const lineStroke = isDark ? 'rgba(255,255,255,0.2)' : SURFACES.background.tertiary;
  const pathStroke = isDark ? '#A78BFF' : '#475569';
  const dotFill = isDark ? '#FFFFFF' : '#0F172A';
  const emptyTextColor = colors.text.tertiary;

  const { path, lastPoint } = useMemo(() => {
    if (!data.length) return { path: '', lastPoint: null };

    const maxIntensity = 10;
    const minIntensity = 0;
    let d = '';
    let lastValid = null;

    data.forEach((point, i) => {
      const intensity = point.intensity;
      if (!Number.isFinite(intensity)) return;
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y =
        height -
        ((intensity - minIntensity) / (maxIntensity - minIntensity)) * height;

      d += d ? ` L ${x} ${y}` : `M ${x} ${y}`;
      lastValid = { x, y, value: intensity };
    });

    return { path: d, lastPoint: lastValid };
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <View style={[styles.sparklineContainer, { width, height }]}>
        <Text style={[styles.sparklineEmpty, { color: emptyTextColor }]}>Trend builds as you log</Text>
      </View>
    );
  }

  return (
    <View style={[styles.sparklineContainer, { width, height }]}>
      <Svg width={width} height={height}>
        <Line
          x1={0}
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke={lineStroke}
          strokeWidth={1}
        />
        {path ? (
          <Path
            d={path}
            fill="none"
            stroke={pathStroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {lastPoint ? (
          <Circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill={dotFill} />
        ) : null}
      </Svg>
    </View>
  );
};

const PASTEL_NEUTRAL_GRADIENT = ['#F4F7FB', '#E9EFF7'];

const getWellnessColor = (score) => {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#6B4EFF';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
};

const getWellnessTier = (score) => {
  if (score >= 80) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Low';
};

const getPastelGradient = (moodKey) => {
  const gradients = {
    happy: ['#DFF5EE', '#F4FBF7'],
    calm: ['#E2ECFF', '#F5F8FF'],
    focused: ['#DFF3F2', '#F3FAFA'],
    energized: ['#FFF0D9', '#FFF8ED'],
    neutral: ['#EEF2F7', '#F7F9FB'],
    tired: ['#E9EEF6', '#F4F7FB'],
    stressed: ['#FCE7DF', '#FFF2EC'],
    sad: ['#E2F0FB', '#F2F8FF'],
  };

  return gradients[moodKey] || PASTEL_NEUTRAL_GRADIENT;
};

const formatLastLogged = (loggedDate) => {
  if (!loggedDate) return null;
  const date = new Date(loggedDate);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatDayKey = (dayKey) => {
  if (!dayKey) return '--';
  const [year, month, day] = dayKey.split('-').map(Number);
  if (!year || !month || !day) return '--';
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString('en-US', { weekday: 'short' });
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F6F8FC',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING[4],
    ...SHADOWS.lg,
  },
  header: {
    padding: SPACING[4],
    paddingBottom: SPACING[3],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  moodSummary: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[3],
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: SURFACES.background.tertiary,
  },
  wellnessSection: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[3],
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: `${SEMANTIC_ACTIONS.success}26`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  wellnessContent: {
    flex: 1,
    gap: SPACING[2],
  },
  wellnessScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  wellnessMeta: {
    flex: 1,
    gap: SPACING[1],
  },
  wellnessScore: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },
  wellnessTier: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  wellnessTierText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  wellnessDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  trendPanel: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[3],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: SURFACES.background.tertiary,
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  moodMeta: {
    flex: 1,
  },
  currentMoodLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastLoggedText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[0.5],
  },
  currentMoodValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginTop: SPACING[0.5],
  },
  intensityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[2],
    gap: SPACING[2],
  },
  intensityLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  intensityBar: {
    flex: 1,
    height: 6,
    backgroundColor: SURFACES.background.tertiary,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  intensityFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  intensityValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    width: 36,
    textAlign: 'right',
  },
  energyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[1],
    gap: SPACING[1],
  },
  energyPill: {
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[2],
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFF7ED',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  energyText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: '#92400E',
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  recommendationSection: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[3],
    padding: SPACING[3],
    backgroundColor: '#F8FAFE',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: SURFACES.background.tertiary,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  recommendationTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  recommendationHint: {
    marginLeft: 'auto',
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  recommendationText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
    lineHeight: 20,
  },
  trendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  trendLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: '#EEF2F6',
    borderWidth: 1,
    borderColor: SURFACES.background.tertiary,
  },
  trendBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sparklineContainer: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING[1],
    paddingHorizontal: SPACING[1],
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparklineEmpty: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  statsSection: {
    paddingHorizontal: SPACING[4],
    paddingBottom: SPACING[3],
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  statsLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  confidencePill: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F3F6FB',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: SURFACES.background.tertiary,
    marginHorizontal: SPACING[2],
  },
  statValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[0.5],
  },
  statsFootnote: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    marginTop: SPACING[2],
  },
  progressHint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    marginTop: SPACING[1],
  },
  emptyGradient: {
    borderRadius: RADIUS.xl,
    padding: SPACING[6],
  },
  emptyState: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
    marginTop: SPACING[2],
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    textAlign: 'center',
  },
  emptyHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: '#F3F6FB',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    marginTop: SPACING[3],
  },
  emptyHintText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[10],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: SPACING[3],
  },
});

export default EnhancedMoodCard;
