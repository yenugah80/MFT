/**
 * TodayScoreCard - The New Primary KPI
 *
 * Product Philosophy:
 * - NOT just a calorie counter - it's a holistic health score
 * - Blends nutrition (40%), mood (35%), and hydration (25%)
 * - Every subline reinforces Food × Mood correlation
 * - Makes users feel progress beyond just eating
 *
 * Billion-dollar app behavior:
 * - Whoop: "Recovery Score: 87% - You're primed"
 * - Oura: "Readiness Score: 92 - Go for it"
 * - Headspace: "Mindfulness Score: 78 - Building momentum"
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import GlassCard from './GlassCard';
import { TEXT, TYPOGRAPHY, SPACING, RADIUS, SURFACES } from '../../constants/premiumTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Calculate Today Score with weighted formula
const calculateTodayScore = (nutrition, mood, hydration) => {
  const nutritionScore = Math.min((nutrition.calories / nutrition.calorieGoal) * 100, 100);
  const moodScore = mood.score || 0; // Assume 0-100 scale
  const hydrationScore = Math.min((hydration.current / hydration.goal) * 100, 100);

  // Weighted formula: Nutrition 40%, Mood 35%, Hydration 25%
  const todayScore = (nutritionScore * 0.4) + (moodScore * 0.35) + (hydrationScore * 0.25);

  return {
    score: Math.round(todayScore),
    nutrition: Math.round(nutritionScore),
    mood: Math.round(moodScore),
    hydration: Math.round(hydrationScore),
  };
};

// Generate dynamic subline based on scores
const generateScoreInsight = (scores, timeOfDay) => {
  const { score, nutrition, mood, hydration } = scores;
  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 22;

  // EXCELLENT PERFORMANCE
  if (score >= 85) {
    return {
      text: "Balanced meals, elevated mood",
      icon: "🌟",
      color: '#10B981',
    };
  }

  // GREAT - HIGH MOOD
  if (score >= 75 && mood >= 70) {
    return {
      text: "Your food is fueling great energy",
      icon: "⚡",
      color: '#3B82F6',
    };
  }

  // GOOD - BALANCED
  if (score >= 65) {
    return {
      text: "Solid nutrition, stable mood",
      icon: "✨",
      color: '#8B5CF6',
    };
  }

  // MODERATE - NUTRITION HIGH, MOOD LOW
  if (nutrition >= 70 && mood < 60) {
    return {
      text: "Well-fed, but mood needs attention",
      icon: "🎯",
      color: '#F59E0B',
    };
  }

  // MODERATE - LOW HYDRATION
  if (hydration < 50 && score < 65) {
    return {
      text: "Low water affecting clarity",
      icon: "💧",
      color: '#06B6D4',
    };
  }

  // NEEDS IMPROVEMENT - MORNING
  if (score < 50 && isMorning) {
    return {
      text: "Fuel up to lift your mood",
      icon: "☀️",
      color: '#EF4444',
    };
  }

  // NEEDS IMPROVEMENT - GENERAL
  if (score < 50) {
    return {
      text: "Small meals can shift your mood",
      icon: "🍽️",
      color: '#EC4899',
    };
  }

  // DEFAULT
  return {
    text: "Your food shapes your mood",
    icon: "💫",
    color: '#6366F1',
  };
};

// Get gradient colors based on score
const getScoreGradient = (score) => {
  if (score >= 85) return ['#10B981', '#059669']; // Green - Excellent
  if (score >= 75) return ['#3B82F6', '#2563EB']; // Blue - Great
  if (score >= 65) return ['#8B5CF6', '#7C3AED']; // Purple - Good
  if (score >= 50) return ['#F59E0B', '#D97706']; // Orange - Fair
  return ['#EF4444', '#DC2626']; // Red - Needs attention
};

// Get score label
const getScoreLabel = (score) => {
  if (score >= 85) return 'Excellent';
  if (score >= 75) return 'Great';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Building';
};

export default function TodayScoreCard({ data }) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Calculate scores
  const scores = calculateTodayScore(
    {
      calories: data?.today?.nutrition?.totalCalories || 0,
      calorieGoal: data?.goals?.dailyCalories || 2000,
    },
    {
      score: data?.today?.moodLogs?.[0]?.score || 0,
    },
    {
      current: data?.today?.waterIntakeLiters || 0,
      goal: data?.goals?.waterLiters || 2.0,
    }
  );

  const insight = generateScoreInsight(scores, new Date().getHours());
  const gradient = getScoreGradient(scores.score);
  const label = getScoreLabel(scores.score);

  // Ring dimensions
  const size = 200;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate progress on mount and score change
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: scores.score,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [scores.score]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // Handle tap to expand
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Pulse animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();

    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
      <GlassCard padding="lg">
        {/* Main Score Ring */}
        <View style={styles.scoreContainer}>
          <Animated.View
            style={[
              styles.ringWrapper,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Svg width={size} height={size}>
              <Defs>
                <SvgGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={gradient[0]} stopOpacity="1" />
                  <Stop offset="100%" stopColor={gradient[1]} stopOpacity="1" />
                </SvgGradient>
              </Defs>

              {/* Background ring */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={`${gradient[0]}15`}
                strokeWidth={strokeWidth}
                fill="none"
              />

              {/* Progress ring */}
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#score-gradient)"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            </Svg>

            {/* Center content */}
            <View style={styles.centerContent}>
              <Text style={[styles.scoreValue, { color: gradient[1] }]}>
                {scores.score}
              </Text>
              <Text style={styles.scoreLabel}>{label}</Text>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>Today Score</Text>
              </View>
            </View>
          </Animated.View>

          {/* Glow effect */}
          <LinearGradient
            colors={[`${gradient[0]}20`, 'transparent']}
            style={styles.glowEffect}
          />
        </View>

        {/* Food × Mood Insight Subline */}
        <View style={styles.insightContainer}>
          <Text style={styles.insightIcon}>{insight.icon}</Text>
          <Text style={[styles.insightText, { color: insight.color }]}>
            {insight.text}
          </Text>
        </View>

        {/* Expand indicator */}
        <View style={styles.expandHint}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={TEXT.secondary}
          />
          <Text style={styles.expandText}>
            {expanded ? 'Hide breakdown' : 'Tap to see breakdown'}
          </Text>
        </View>

        {/* Expanded Breakdown */}
        {expanded && (
          <View style={styles.breakdown}>
            {/* Divider */}
            <View style={styles.divider} />

            {/* Score Components */}
            <Text style={styles.breakdownTitle}>Score Breakdown</Text>

            <View style={styles.componentGrid}>
              {/* Nutrition Component */}
              <View style={styles.component}>
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  style={styles.componentIcon}
                >
                  <Ionicons name="nutrition" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.componentLabel}>Nutrition</Text>
                <Text style={styles.componentValue}>{scores.nutrition}</Text>
                <View style={styles.componentBar}>
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.componentBarFill, { width: `${scores.nutrition}%` }]}
                  />
                </View>
                <Text style={styles.componentWeight}>40% weight</Text>
              </View>

              {/* Mood Component */}
              <View style={styles.component}>
                <LinearGradient
                  colors={['#EC4899', '#DB2777']}
                  style={styles.componentIcon}
                >
                  <Ionicons name="happy" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.componentLabel}>Mood</Text>
                <Text style={styles.componentValue}>{scores.mood}</Text>
                <View style={styles.componentBar}>
                  <LinearGradient
                    colors={['#EC4899', '#DB2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.componentBarFill, { width: `${scores.mood}%` }]}
                  />
                </View>
                <Text style={styles.componentWeight}>35% weight</Text>
              </View>

              {/* Hydration Component */}
              <View style={styles.component}>
                <LinearGradient
                  colors={['#06B6D4', '#0891B2']}
                  style={styles.componentIcon}
                >
                  <Ionicons name="water" size={20} color="#FFF" />
                </LinearGradient>
                <Text style={styles.componentLabel}>Hydration</Text>
                <Text style={styles.componentValue}>{scores.hydration}</Text>
                <View style={styles.componentBar}>
                  <LinearGradient
                    colors={['#06B6D4', '#0891B2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.componentBarFill, { width: `${scores.hydration}%` }]}
                  />
                </View>
                <Text style={styles.componentWeight}>25% weight</Text>
              </View>
            </View>

            {/* Formula Explanation */}
            <View style={styles.formulaBox}>
              <Ionicons name="calculator" size={16} color={TEXT.secondary} />
              <Text style={styles.formulaText}>
                Today Score = (Nutrition × 0.4) + (Mood × 0.35) + (Hydration × 0.25)
              </Text>
            </View>
          </View>
        )}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scoreContainer: {
    alignItems: 'center',
    marginBottom: SPACING[4],
    position: 'relative',
  },
  ringWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: TYPOGRAPHY.weight.black,
    letterSpacing: -2,
    lineHeight: 64,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: TEXT.secondary,
    marginTop: SPACING[1],
  },
  scoreBadge: {
    backgroundColor: `${TEXT.primary}08`,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    marginTop: SPACING[2],
  },
  scoreBadgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  glowEffect: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 200,
    opacity: 0.3,
    zIndex: -1,
  },

  // Insight
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  insightIcon: {
    fontSize: 20,
  },
  insightText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textAlign: 'center',
    flex: 1,
  },

  // Expand hint
  expandHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
  },
  expandText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },

  // Breakdown
  breakdown: {
    marginTop: SPACING[4],
  },
  divider: {
    height: 1,
    backgroundColor: `${TEXT.primary}10`,
    marginBottom: SPACING[4],
  },
  breakdownTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: TEXT.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[3],
  },

  // Component Grid
  componentGrid: {
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  component: {
    backgroundColor: `${TEXT.primary}03`,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
  },
  componentIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING[2],
  },
  componentLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: TEXT.secondary,
    marginBottom: SPACING[1],
  },
  componentValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.black,
    color: TEXT.primary,
    marginBottom: SPACING[2],
  },
  componentBar: {
    height: 6,
    backgroundColor: `${TEXT.primary}10`,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING[1],
  },
  componentBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  componentWeight: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.muted,
  },

  // Formula
  formulaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: `${TEXT.primary}05`,
    padding: SPACING[3],
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  formulaText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
    flex: 1,
    lineHeight: 16,
  },
});
