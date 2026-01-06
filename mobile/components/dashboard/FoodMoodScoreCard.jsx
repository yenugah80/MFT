/**
 * FoodMoodScoreCard - Delightful Wellness Hero
 *
 * Staff Design Principles:
 * 1. ONE clear number - your wellness score
 * 2. EMOTIONAL feedback - celebrate, encourage, never stress
 * 3. SIMPLE next action - what to do now
 * 4. PROGRESSIVE disclosure - tap for details
 *
 * NO overwhelming data. NO stress. Pure delight.
 */

import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';

import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { BRAND, SURFACES, TEXT, SHADOWS, MOOD_PALETTE } from '../../constants/premiumTheme';
import { calculateFoodMoodScore } from '../../utils/foodMoodScore';

// Lottie animation sources for mood display
const MOOD_LOTTIE_SOURCES = {
  happy: require('../../constants/lottie/mood-happy.json'),
  calm: require('../../constants/lottie/mood-calm.json'),
  focused: require('../../constants/lottie/mood-focused.json'),
  energized: require('../../constants/lottie/mood-energized.json'),
  neutral: require('../../constants/lottie/mood-neutral.json'),
  tired: require('../../constants/lottie/mood-tired.json'),
  stressed: require('../../constants/lottie/mood-stressed.json'),
  sad: require('../../constants/lottie/mood-sad.json'),
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Animated Score Ring - The hero element
 */
function ScoreRing({ score, size = 120, strokeWidth = 10 }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Score fill animation
    Animated.timing(animatedValue, {
      toValue: score / 100,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Gentle pulse for high scores
    if (score >= 70) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [score, animatedValue, pulseAnim]);

  const getScoreGradient = (s) => {
    if (s >= 80) return ['#10B981', '#34D399']; // Green - Thriving
    if (s >= 60) return ['#6B4EFF', '#8B6EFF']; // Purple - Great
    if (s >= 40) return ['#3B82F6', '#60A5FA']; // Blue - Good
    return ['#F59E0B', '#FBBF24']; // Amber - Building
  };

  const colors = getScoreGradient(score);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <View style={ringStyles.container}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            <SvgGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colors[0]} />
              <Stop offset="100%" stopColor={colors[1]} />
            </SvgGradient>
          </Defs>
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(107, 78, 255, 0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Animated progress */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#scoreGradient)"
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
        {/* Score number */}
        <View style={ringStyles.scoreContainer}>
          <Text style={[ringStyles.score, { color: colors[0] }]}>{score}</Text>
          <Text style={ringStyles.label}>wellness</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const ringStyles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: -2,
  },
});

/**
 * Beautiful Lottie Mood Display - Pure animation-focused mood indicator
 * Shows ONLY Lottie animations (no emoji fallbacks) for premium feel
 */
function LottieMoodDisplay({ mood, intensity, timestamp }) {
  const lottieRef = useRef(null);
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Get mood colors
  const moodColors = MOOD_PALETTE?.[mood] || { base: '#6B4EFF', gradient: ['#6B4EFF', '#8B6EFF'] };
  const lottieSource = MOOD_LOTTIE_SOURCES[mood];

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // Gentle glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
      // Subtle bounce effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -3,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Auto-play lottie
    if (lottieRef.current) {
      lottieRef.current.play();
    }
  }, [mood, glowAnim, scaleAnim, bounceAnim]);

  if (!mood) return null;

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    const date = new Date(ts);
    const hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${mins} ${ampm}`;
  };

  return (
    <Animated.View style={[moodStyles.container, { transform: [{ scale: scaleAnim }] }]}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          moodStyles.outerGlow,
          {
            backgroundColor: moodColors.base,
            opacity: glowAnim.interpolate({
              inputRange: [0.5, 1],
              outputRange: [0.1, 0.25],
            }),
          }
        ]}
      />

      {/* Main Lottie animation - HERO element */}
      <Animated.View
        style={[
          moodStyles.lottieWrapper,
          { transform: [{ translateY: bounceAnim }] }
        ]}
      >
        <View style={[moodStyles.lottieContainer, { borderColor: `${moodColors.base}30` }]}>
          {lottieSource && (
            <LottieView
              ref={lottieRef}
              source={lottieSource}
              style={moodStyles.lottie}
              autoPlay
              loop
              speed={0.7}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Animated sparkle dots */}
        <Animated.View style={[moodStyles.sparkle1, { backgroundColor: moodColors.base, opacity: glowAnim }]} />
        <Animated.View style={[moodStyles.sparkle2, { backgroundColor: moodColors.base, opacity: glowAnim.interpolate({ inputRange: [0.5, 1], outputRange: [1, 0.5] }) }]} />
      </Animated.View>

      {/* Mood info - minimal and clean */}
      <View style={moodStyles.info}>
        <View style={moodStyles.labelRow}>
          <Text style={[moodStyles.moodLabel, { color: moodColors.base }]}>
            {mood.charAt(0).toUpperCase() + mood.slice(1)}
          </Text>
          {intensity && (
            <View style={[moodStyles.intensityPill, { backgroundColor: `${moodColors.base}15`, borderColor: `${moodColors.base}30` }]}>
              <Text style={[moodStyles.intensityText, { color: moodColors.base }]}>
                {intensity}/10
              </Text>
            </View>
          )}
        </View>
        <Text style={moodStyles.timeText}>Logged at {formatTime(timestamp)}</Text>
      </View>
    </Animated.View>
  );
}

const moodStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS['2xl'],
    padding: SPACING[3],
    borderWidth: 1.5,
    borderColor: 'rgba(107, 78, 255, 0.12)',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  outerGlow: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: RADIUS['2xl'] + 12,
  },
  lottieWrapper: {
    position: 'relative',
  },
  lottieContainer: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(107, 78, 255, 0.04)',
    borderWidth: 2,
  },
  lottie: {
    width: 64,
    height: 64,
  },
  sparkle1: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 4,
    left: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  moodLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  intensityPill: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  intensityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: TEXT.tertiary,
    fontWeight: '500',
  },
});

/**
 * Celebration Badge - For wins
 */
function CelebrationBadge({ celebration }) {
  if (!celebration) return null;

  return (
    <View style={celebrationStyles.badge}>
      <Text style={celebrationStyles.emoji}>{celebration.emoji}</Text>
      <Text style={celebrationStyles.text}>{celebration.text}</Text>
    </View>
  );
}

const celebrationStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  emoji: {
    fontSize: 14,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
});

/**
 * Main FoodMoodScoreCard Component
 */
export default function FoodMoodScoreCard({
  today = {},
  goals = {},
  moodLogs = [],
  streak = 0,
  historicalScores = [],
  onViewDetails,
}) {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const [showDetails, setShowDetails] = useState(false);

  // Calculate the score
  const scoreData = useMemo(() => {
    const nutrition = today?.nutrition || {};
    const meals = today?.foodLogs || [];
    const water = today?.waterIntakeLiters || 0;

    return calculateFoodMoodScore({
      calories: nutrition.totalCalories || 0,
      calorieGoal: goals?.dailyCalories || 2000,
      protein: nutrition.totalProtein || 0,
      proteinGoal: goals?.proteinG || 150,
      carbs: nutrition.totalCarbs || 0,
      carbsGoal: goals?.carbsG || 250,
      fats: nutrition.totalFats || 0,
      fatsGoal: goals?.fatsG || 65,
      fiber: nutrition.totalFiber || 0,
      fiberGoal: 30,
      waterIntake: water,
      waterGoal: goals?.waterLiters || 2.5,
      moodLogs,
      meals,
      streak,
    });
  }, [today, goals, moodLogs, streak]);

  // Get latest mood
  const latestMood = useMemo(() => {
    if (!moodLogs || moodLogs.length === 0) return null;
    const sorted = [...moodLogs].sort((a, b) =>
      new Date(b.loggedDate || b.timestamp) - new Date(a.loggedDate || a.timestamp)
    );
    return sorted[0];
  }, [moodLogs]);

  // Generate celebration for wins
  const celebration = useMemo(() => {
    const { score, breakdown } = scoreData;

    if (score >= 85) return { emoji: '🌟', text: 'Amazing day!' };
    if (streak >= 7) return { emoji: '🔥', text: `${streak} day streak!` };
    if ((breakdown?.hydration || 0) >= 18) return { emoji: '💧', text: 'Hydration goal!' };
    if ((breakdown?.nutrition || 0) >= 30) return { emoji: '🥗', text: 'Great eating!' };
    if (score >= 70) return { emoji: '💪', text: 'Keep it up!' };
    return null;
  }, [scoreData, streak]);

  // Get encouraging message
  const getMessage = (score, tier) => {
    if (score >= 85) return "You're absolutely crushing it!";
    if (score >= 70) return "Great balance today!";
    if (score >= 55) return "You're building momentum";
    if (score >= 40) return "Every step counts";
    return "Let's make today great";
  };

  // Entrance animation
  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [cardAnim]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onViewDetails?.();
  };

  const { score, tier, label, emoji, color, breakdown } = scoreData;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: cardAnim }],
            opacity: cardAnim,
          },
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FAFBFF', '#F5F7FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="sparkles" size={18} color={BRAND.primary} />
              <Text style={styles.headerTitle}>Today's Wellness</Text>
            </View>
            {celebration && <CelebrationBadge celebration={celebration} />}
          </View>

          {/* Main content */}
          <View style={styles.content}>
            {/* Score Ring */}
            <ScoreRing score={score} />

            {/* Right side info */}
            <View style={styles.info}>
              {/* Tier badge */}
              <View style={[styles.tierBadge, { backgroundColor: `${color}15` }]}>
                <Text style={styles.tierEmoji}>{emoji}</Text>
                <Text style={[styles.tierLabel, { color }]}>{label}</Text>
              </View>

              {/* Encouraging message */}
              <Text style={styles.message}>{getMessage(score, tier)}</Text>

              {/* Beautiful Lottie Mood Display */}
              {latestMood && (
                <LottieMoodDisplay
                  mood={latestMood.mood}
                  intensity={latestMood.intensity}
                  timestamp={latestMood.loggedDate || latestMood.timestamp}
                />
              )}

              {/* No mood logged - encouraging CTA */}
              {!latestMood && (
                <TouchableOpacity style={styles.logMoodCta} activeOpacity={0.8}>
                  <View style={styles.logMoodIconContainer}>
                    <Ionicons name="happy-outline" size={24} color={BRAND.primary} />
                  </View>
                  <View style={styles.logMoodTextContainer}>
                    <Text style={styles.logMoodTitle}>How are you feeling?</Text>
                    <Text style={styles.logMoodSubtext}>Tap to log your mood</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={BRAND.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Quick stats row - subtle, not overwhelming */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.statLabel}>Food</Text>
              <Text style={styles.statValue}>{Math.round((breakdown?.nutrition || 0) / 35 * 100)}%</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={[styles.statDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.statLabel}>Water</Text>
              <Text style={styles.statValue}>{Math.round((breakdown?.hydration || 0) / 20 * 100)}%</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.statLabel}>Mood</Text>
              <Text style={styles.statValue}>{Math.round((breakdown?.mood || 0) / 25 * 100)}%</Text>
            </View>
          </View>

          {/* Tap hint */}
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Tap for insights</Text>
            <Ionicons name="chevron-forward" size={14} color={TEXT.muted} />
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS['2xl'],
    overflow: 'hidden',
    // Luxurious shadow for depth
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    // Premium border glow
    borderWidth: 1.5,
    borderColor: 'rgba(107, 78, 255, 0.15)',
  },
  gradient: {
    padding: SPACING[5],
    // Subtle inner glow effect
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
  },

  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[5],
  },
  info: {
    flex: 1,
    gap: SPACING[3],
  },

  // Tier badge
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
  },
  tierEmoji: {
    fontSize: 14,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Message
  message: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    lineHeight: 24,
  },

  // Log mood CTA - Beautiful encouraging prompt
  logMoodCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: 'rgba(107, 78, 255, 0.05)',
    borderRadius: RADIUS.xl,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(107, 78, 255, 0.1)',
    borderStyle: 'dashed',
  },
  logMoodIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(107, 78, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logMoodTextContainer: {
    flex: 1,
  },
  logMoodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 2,
  },
  logMoodSubtext: {
    fontSize: 12,
    color: TEXT.tertiary,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING[4],
    paddingTop: SPACING[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  statValue: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },

  // Tap hint
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING[3],
  },
  tapHintText: {
    fontSize: 11,
    color: TEXT.muted,
  },
});
