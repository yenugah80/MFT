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

import React, { useEffect, useRef, useMemo } from 'react';
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
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';
import { BRAND, TEXT, SEMANTIC, SURFACES } from '../../constants/premiumTheme';
import { BOLD_GRADIENTS, WELLNESS_COLORS } from '../../constants/modernColorPalette';
import { calculateFoodMoodScore } from '../../utils/foodMoodScore';

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
    // Use vibrant wellness gradients
    if (s >= 80) return [WELLNESS_COLORS.fitness.base, WELLNESS_COLORS.fitness.light]; // Vibrant green
    if (s >= 60) return WELLNESS_COLORS.mood.gradient.slice(0, 2); // Vibrant purple/magenta
    if (s >= 40) return WELLNESS_COLORS.energy.gradient.slice(0, 2); // Vibrant orange
    return [WELLNESS_COLORS.hydration.base, WELLNESS_COLORS.hydration.light]; // Vibrant cyan
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
            stroke="rgba(143, 163, 199, 0.22)"
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
          <Text style={ringStyles.label}>score</Text>
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
 * Celebration Badge - For wins (uses Ionicons, no emojis)
 */
function CelebrationBadge({ celebration }) {
  if (!celebration) return null;

  const bgColor = celebration.color ? `${celebration.color}15` : 'rgba(16, 185, 129, 0.1)';
  const borderColor = celebration.color ? `${celebration.color}30` : 'rgba(16, 185, 129, 0.2)';

  return (
    <View style={[celebrationStyles.badge, { backgroundColor: bgColor, borderColor }]}>
      <Ionicons name={celebration.icon || 'sparkles'} size={14} color={celebration.color || '#10B981'} />
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
    borderRadius: RADIUS.full,
    borderWidth: 1,
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
  historicalScores = [],
  onViewDetails,
}) {
  const cardAnim = useRef(new Animated.Value(0)).current;

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
    });
  }, [today, goals, moodLogs]);

  // Generate status indicator - functional, not emotional
  const getStatusIndicator = useMemo(() => {
    const { breakdown } = scoreData;
    const hasMeals = (today?.foodLogs || []).length > 0;
    const hasWater = (today?.waterIntakeLiters || 0) > 0;
    const hasMood = (moodLogs || []).length > 0;
    const logged = [hasMeals, hasWater, hasMood].filter(Boolean).length;

    if (logged === 3) return { icon: 'checkmark-circle', color: '#10B981', text: 'Complete' };
    if (logged === 2) return { icon: 'ellipse-outline', color: '#8B5CF6', text: '2 of 3' };
    if (logged === 1) return { icon: 'ellipse-outline', color: '#F59E0B', text: '1 of 3' };
    return { icon: 'scan-outline', color: '#6B7280', text: 'No data' };
  }, [scoreData, today, moodLogs]);

  // Functional message - what's next, not judgment
  const getDataMessage = ({ score, breakdown, hasMeals, hasWater, hasMood }) => {
    const missing = [];
    if (!hasMeals) missing.push('meals');
    if (!hasWater) missing.push('water');
    if (!hasMood) missing.push('mood');

    if (missing.length === 3) {
      return "Log meals to start pattern detection";
    }

    if (missing.length > 0) {
      return `Missing: ${missing.join(', ')}`;
    }

    // All data present - give functional insight
    if ((breakdown?.nutrition || 0) >= 25 && (breakdown?.hydration || 0) >= 15) {
      return "Full data. Check insights below.";
    }

    if ((breakdown?.nutrition || 0) < 18) {
      return "Low protein logged. Check portions.";
    }

    return "Data captured. Patterns building.";
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

  const hasMeals = (today?.foodLogs || []).length > 0;
  const hasWater = (today?.waterIntakeLiters || 0) > 0;
  const hasMood = (moodLogs || []).length > 0;
  const { score, label, emoji, color, breakdown } = scoreData;
  const message = getDataMessage({ score, breakdown, hasMeals, hasWater, hasMood });
  const statusIndicator = getStatusIndicator;

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
          colors={SURFACES.gradient.pastelLavender}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Header - Functional, not judgmental */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="analytics-outline" size={16} color={BRAND.primaryDark} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Data Coverage</Text>
                <Text style={styles.headerSubtitle}>Today&apos;s tracking</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusPill, { borderColor: `${statusIndicator.color}30`, backgroundColor: `${statusIndicator.color}12` }]}>
                <Ionicons name={statusIndicator.icon} size={14} color={statusIndicator.color} />
                <Text style={[styles.statusText, { color: statusIndicator.color }]}>{statusIndicator.text}</Text>
              </View>
            </View>
          </View>

          {/* Main content */}
          <View style={styles.content}>
            {/* Score Ring */}
            <View style={styles.scorePanel}>
              <ScoreRing score={score} />
              <View style={styles.scoreMeta}>
                <Text style={styles.scoreMetaLabel}>Completeness</Text>
                <Text style={[styles.scoreMetaValue, { color: statusIndicator.color }]}>{score}%</Text>
              </View>
            </View>

            {/* Right side info */}
            <View style={styles.info}>
              {/* Functional status message */}
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>

          {/* Tap hint */}
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>View all insights</Text>
            <Ionicons name="arrow-forward" size={14} color={TEXT.secondary} />
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
    backgroundColor: SURFACES.card.primary,
    // Luxurious shadow for depth
    shadowColor: BRAND.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    // Premium border glow
    borderWidth: 1.5,
    borderColor: SURFACES.card.border,
  },
  gradient: {
    padding: SPACING[5],
    backgroundColor: SURFACES.card.primary,
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
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(143, 163, 199, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.primary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusEmoji: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[5],
  },
  scorePanel: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  scoreMeta: {
    alignItems: 'center',
    gap: 2,
  },
  scoreMetaLabel: {
    fontSize: 11,
    color: TEXT.tertiary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  scoreMetaValue: {
    fontSize: 13,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },

  // Message
  message: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.primary,
    lineHeight: 24,
  },

  // Tap hint
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING[5],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
    borderRadius: RADIUS.full,
    backgroundColor: SURFACES.background.tertiary,
    borderWidth: 1,
    borderColor: SURFACES.card.border,
  },
  actionText: {
    fontSize: 12,
    color: TEXT.secondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
