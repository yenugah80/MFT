/**
 * EnhancedMoodCard - Premium Mood Dashboard Card
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WELLNESS COMPONENT ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This component is MOOD-FOCUSED. Wellness score display is DISABLED by default
 * to avoid duplication with other wellness components.
 *
 * IMPORTANT: Parent passes showWellnessScore={false} to prevent duplicate display.
 *
 * RELATED COMPONENTS:
 * - WellnessScoreCard: Primary wellness display (Food+Mood+Water+Activity)
 * - WellnessNarrativeCard: Server-calculated wellness + narrative
 * - This component: Mood-only visualization (wellness score disabled)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * - Current mood display with 3D icon
 * - Integrated Wellness Score ring (when showWellnessScore={true})
 * - 7-day mini sparkline trend
 * - Quick stats (avg mood, best day, patterns)
 * - Empty state for first-time users
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, ICON_SIZES, MOOD_PALETTE, TEXT, SEMANTIC_ACTIONS, SURFACES } from '../../constants/premiumTheme';
import { useTheme } from '../../providers/ThemeProvider';
import * as Haptics from 'expo-haptics';

import MoodIcon3D from '../MoodTracker/MoodIcon3D';
import {
  useMoodLog,
  MOOD_TYPES,
  MOOD_DEFAULT_ENERGY,
  MOOD_DEFAULT_INTENSITY,
} from '../../hooks/useMoodLog';

// Five high-frequency choices fit compact phone widths. The complete mood
// taxonomy remains available through the full logger.
const QUICK_MOOD_KEYS = ['calm', 'happy', 'energized', 'neutral', 'tired'];
const QUICK_MOODS = QUICK_MOOD_KEYS
  .map((key) => MOOD_TYPES.find((mood) => mood.key === key))
  .filter(Boolean);

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
    fontFamily: TYPOGRAPHY.family.bold,
  },
});

const EnhancedMoodCard = ({
  insights,
  loading = false,
  wellnessScore = null,
  showWellnessScore = true,
  onOpenInsights,
  onViewHistory,
  onOpenFullLogger,
}) => {
  const { colors, isDark } = useTheme();
  const { logMood } = useMoodLog();
  const [quickLogging, setQuickLogging] = useState(null); // mood key being logged
  const [selectedQuickMood, setSelectedQuickMood] = useState(null);
  const [quickStatus, setQuickStatus] = useState(null);
  const statusTimerRef = useRef(null);

  // Theme-aware colors
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const textTertiary = colors.text.tertiary;
  const textMuted = colors.text.muted || textTertiary;

  // Theme-aware backgrounds
  const containerBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F6F8FC';
  const sectionBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFE';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : SURFACES.background.tertiary;
  const hintBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F6FB';
  const pillBg = isDark ? 'rgba(255, 255, 255, 0.1)' : '#EEF2F6';

  const latestMood = insights?.latestMood || null;
  const moodColors = latestMood?.mood
    ? MOOD_PALETTE[latestMood.mood]
    : MOOD_PALETTE.neutral;
  const pastelGradient = isDark
    ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
    : getPastelGradient(latestMood?.mood);
  const lastLoggedLabel = useMemo(() => formatLastLogged(latestMood?.loggedDate), [latestMood?.loggedDate]);
  const moodIsRecent = useMemo(() => isRecentMood(latestMood?.loggedDate), [latestMood?.loggedDate]);
  const trendSummary = insights?.trendSummary || { direction: 'flat', delta: null, lastIntensity: null };

  useEffect(() => {
    if (latestMood?.mood) setSelectedQuickMood(latestMood.mood);
  }, [latestMood?.mood]);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  const handleQuickLog = async (mood) => {
    if (quickLogging) return;

    setQuickLogging(mood.key);
    setQuickStatus(null);
    try {
      await logMood({
        mood: mood.key,
        intensity: MOOD_DEFAULT_INTENSITY[mood.key] ?? 5,
        energyLevel: MOOD_DEFAULT_ENERGY[mood.key] ?? 5,
        tags: {},
        source: 'quick_log',
      });
      setSelectedQuickMood(mood.key);
      setQuickStatus({ type: 'success', message: `${mood.label} saved` });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setQuickStatus(null), 2200);
    } catch {
      setQuickStatus({ type: 'error', message: 'Could not save' });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not save', 'Failed to log mood. Please try again.');
    } finally {
      setQuickLogging(null);
    }
  };

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
          <View
            style={[styles.currentMoodIcon, { backgroundColor: `${moodColors?.base || textSecondary}14` }]}
            accessible={false}
          >
            <MoodIcon3D
              mood={latestMood?.mood || 'neutral'}
              size={44}
              showLabel={false}
              selected={false}
              interactive={false}
              compact
              resizeMode="contain"
            />
          </View>
          <View style={styles.moodMeta}>
            <Text style={[styles.currentMoodLabel, { color: textTertiary }]}>
              {moodIsRecent ? 'Current Mood' : 'Last Mood'}
            </Text>
            <Text style={[styles.currentMoodValue, { color: textPrimary }]}>
              {latestMood?.mood ? latestMood.mood.charAt(0).toUpperCase() + latestMood.mood.slice(1) : 'Unknown'}
            </Text>
            {lastLoggedLabel && (
              <Text style={[styles.lastLoggedText, { color: textTertiary }]}>Logged {lastLoggedLabel}</Text>
            )}
            <View style={[styles.energyBadge, { backgroundColor: `${moodColors?.base || textSecondary}12` }]}>
              <Ionicons name="flash-outline" size={12} color={moodColors?.base || textSecondary} />
              <Text style={[styles.energyBadgeText, { color: textSecondary }]}>Energy {latestMood?.energyLevel ?? 5}/10</Text>
            </View>
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

      {/* Five labeled quick choices fit the phone viewport. More opens the
          complete logger for all moods, intensity, energy, tags and notes. */}
      <View style={[quickLogStyles.strip, { backgroundColor: sectionBg, borderColor }]}>
        <View style={quickLogStyles.labelRow}>
          <Text style={[quickLogStyles.label, { color: textSecondary }]}>Quick check-in</Text>
          <Text
            style={[
              quickLogStyles.status,
              { color: quickStatus?.type === 'error' ? '#B91C1C' : (quickStatus ? '#0F766E' : textTertiary) },
            ]}
            accessibilityLiveRegion="polite"
          >
            {quickStatus?.message || 'One tap saves'}
          </Text>
        </View>
        <View style={quickLogStyles.icons}>
          {QUICK_MOODS.map((m) => {
            const isSelected = selectedQuickMood === m.key;
            const isSaving = quickLogging === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[
                  quickLogStyles.moodButton,
                  { borderColor: isSelected ? m.color : borderColor },
                  isSelected && { backgroundColor: `${m.color}12` },
                ]}
                onPress={() => handleQuickLog(m)}
                disabled={!!quickLogging}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`Quick log ${m.label}`}
                accessibilityHint={`Saves ${m.label.toLowerCase()} with intensity ${MOOD_DEFAULT_INTENSITY[m.key]} and energy ${MOOD_DEFAULT_ENERGY[m.key]} out of 10`}
                accessibilityState={{ selected: isSelected, disabled: !!quickLogging, busy: isSaving }}
              >
                <View style={[quickLogStyles.iconCircle, { backgroundColor: `${m.color}14` }]}>
                  <MoodIcon3D
                    mood={m.key}
                    size={28}
                    showLabel={false}
                    selected={false}
                    autoPlay={isSaving}
                    loop={isSaving}
                    interactive={false}
                    compact
                    showSelectionIndicator={false}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[quickLogStyles.moodLabel, { color: isSelected ? m.color : textSecondary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.76}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[quickLogStyles.moodButton, { borderColor }]}
            onPress={onOpenFullLogger}
            activeOpacity={0.8}
            disabled={!!quickLogging}
            accessibilityRole="button"
            accessibilityLabel="Open full mood check-in"
            accessibilityHint="Choose from every mood and add intensity, energy, context, and notes"
            accessibilityState={{ disabled: !!quickLogging }}
          >
            <View style={[quickLogStyles.iconCircle, { backgroundColor: pillBg }]}>
              <Ionicons name="ellipsis-horizontal" size={20} color={textSecondary} />
            </View>
            <Text style={[quickLogStyles.moodLabel, { color: textSecondary }]}>More</Text>
          </TouchableOpacity>
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

      {/* Action Buttons Row */}
      <View style={styles.actionButtonsRow}>
        {/* View Insights Button */}
        {onOpenInsights && (
          <TouchableOpacity
            style={[styles.insightsButton, styles.actionButton, { backgroundColor: sectionBg, borderColor }]}
            onPress={onOpenInsights}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open mood insights"
          >
            <View style={styles.insightsButtonLeft}>
              <Ionicons name="analytics-outline" size={18} color={moodColors?.base || textSecondary} />
              <Text style={[styles.insightsButtonText, { color: textPrimary }]}>Insights</Text>
            </View>
            <View style={styles.insightsButtonRight}>
              {trendSummary?.direction && trendSummary.direction !== 'insufficient' && (
                <View style={[styles.trendBadge, { backgroundColor: pillBg }]}>
                  <Ionicons
                    name={trendSummary.direction === 'up' ? 'trending-up' : trendSummary.direction === 'down' ? 'trending-down' : 'remove'}
                    size={12}
                    color={trendSummary.direction === 'up' ? '#0F766E' : trendSummary.direction === 'down' ? '#B45309' : textTertiary}
                  />
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={textTertiary} />
            </View>
          </TouchableOpacity>
        )}

        {/* View History Button */}
        {onViewHistory && (
          <TouchableOpacity
            style={[styles.insightsButton, styles.actionButton, { backgroundColor: sectionBg, borderColor }]}
            onPress={onViewHistory}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View mood history"
          >
            <View style={styles.insightsButtonLeft}>
              <Ionicons name="time-outline" size={18} color={moodColors?.base || textSecondary} />
              <Text style={[styles.insightsButtonText, { color: textPrimary }]}>History</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={textTertiary} />
          </TouchableOpacity>
        )}
      </View>

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

/**
 * Whether the newest entry is recent enough to call "current".
 *
 * The card used to label whatever it had as "Current Mood", so an entry from
 * three days ago read as how the user feels right now.
 */
const isRecentMood = (loggedDate) => {
  if (!loggedDate) return false;
  const date = new Date(loggedDate);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() < 24 * 60 * 60 * 1000;
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F6F8FC',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING[2],
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.bold,
  },
  wellnessDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[3],
    gap: SPACING[2],
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  insightsButton: {
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    backgroundColor: '#F8FAFE',
    borderWidth: 1,
    borderColor: SURFACES.background.tertiary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightsButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  insightsButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  insightsButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
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
    gap: SPACING[3],
  },
  currentMoodIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
  energyBadge: {
    marginTop: SPACING[1],
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  energyBadgeText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  currentMoodValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.bold,
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
    fontFamily: TYPOGRAPHY.family.semibold,
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

const quickLogStyles = StyleSheet.create({
  strip: {
    marginHorizontal: SPACING[4],
    marginBottom: SPACING[3],
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[1],
    marginBottom: SPACING[2],
  },
  label: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  status: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  moodButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 2,
    paddingVertical: SPACING[1],
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});

export default EnhancedMoodCard;
