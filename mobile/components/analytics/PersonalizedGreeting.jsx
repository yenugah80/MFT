/**
 * PersonalizedGreeting - Time-contextual header with encouragement
 *
 * Design Principles:
 * 1. PERSONALITY - Warm, encouraging, never robotic
 * 2. CONTEXT - Adapts to time of day and user progress
 * 3. DELIGHT - Subtle animation on entrance
 * 4. MOTIVATION - Celebrates progress, encourages action
 *
 * Features:
 * - Time-based greeting (morning/afternoon/evening)
 * - Dynamic encouragement based on progress
 * - Gradient background matching time theme
 * - Animated entrance
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  BRAND,
} from '../../constants/premiumTheme';
import {
  TIME_THEMES,
  getTimeTheme,
  SMART_TYPOGRAPHY,
  SMART_SPACING,
} from '../../constants/smartRecommendationTheme';

// ============================================================================
// ENCOURAGEMENT MESSAGES
// ============================================================================

const ENCOURAGEMENT_MESSAGES = {
  excellent: [
    "You're crushing it today! 💪",
    "Amazing progress! Keep it up!",
    "You're on fire! 🔥",
    "Incredible work today!",
  ],
  good: [
    "Great job so far!",
    "You're doing well!",
    "Nice progress today!",
    "Keep up the momentum!",
  ],
  moderate: [
    "You're making progress!",
    "Every step counts!",
    "Keep going, you've got this!",
    "Building healthy habits!",
  ],
  needsAttention: [
    "Let's get started!",
    "Time to fuel up!",
    "Ready to make progress?",
    "Let's hit your goals!",
  ],
};

function getEncouragement(progressPercentage) {
  let category;
  if (progressPercentage >= 80) category = 'excellent';
  else if (progressPercentage >= 60) category = 'good';
  else if (progressPercentage >= 30) category = 'moderate';
  else category = 'needsAttention';

  const messages = ENCOURAGEMENT_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================================================
// SMART FOOD HEADER
// ============================================================================

export function SmartFoodHeader({ summary, nutritionalStatus }) {
  const timeTheme = getTimeTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.headerContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={timeTheme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          {/* Icon */}
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          </View>

          {/* Text */}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Smart Food Picks</Text>
            <Text style={styles.headerSubtitle}>
              {timeTheme.message}
            </Text>
          </View>
        </View>

        {/* Decorative element */}
        <View style={styles.decorativeCircle} />
        <View style={styles.decorativeCircleSmall} />
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================================================
// PERSONALIZED GREETING
// ============================================================================

export default function PersonalizedGreeting({
  userName,
  calorieProgress = 0,
  proteinProgress = 0,
  mealsLogged = 0,
  streak = 0,
  compact = false,
}) {
  const timeTheme = getTimeTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    return (calorieProgress + proteinProgress) / 2;
  }, [calorieProgress, proteinProgress]);

  // Get personalized encouragement
  const encouragement = useMemo(() => {
    return getEncouragement(overallProgress);
  }, [overallProgress]);

  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  if (compact) {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.compactGreeting}>
          {timeTheme.emoji} {timeTheme.greeting}
          {userName ? `, ${userName.split(' ')[0]}` : ''}!
        </Text>
        <Text style={styles.compactEncouragement}>{encouragement}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[timeTheme.gradient[0] + '15', timeTheme.gradient[1] + '08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        {/* Main greeting */}
        <View style={styles.greetingRow}>
          <Text style={styles.emoji}>{timeTheme.emoji}</Text>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greeting}>
              {timeTheme.greeting}
              {userName ? `, ${userName.split(' ')[0]}` : ''}!
            </Text>
            <Text style={styles.encouragement}>{encouragement}</Text>
          </View>
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          {mealsLogged > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="restaurant" size={14} color={timeTheme.accent} />
              <Text style={styles.statText}>{mealsLogged} meals</Text>
            </View>
          )}
          {streak > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="flame" size={14} color="#EF4444" />
              <Text style={styles.statText}>{streak} day streak</Text>
            </View>
          )}
          {overallProgress >= 50 && (
            <View style={[styles.statItem, styles.progressBadge]}>
              <Ionicons name="trending-up" size={14} color="#10B981" />
              <Text style={[styles.statText, { color: '#10B981' }]}>
                {Math.round(overallProgress)}% of goals
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================================================
// NUTRITION STATUS BANNER
// Shows current nutritional status at a glance
// ============================================================================

export function NutritionStatusBanner({ nutritionalStatus, onViewDetails }) {
  if (!nutritionalStatus) return null;

  const { priorities = [], deficits = [] } = nutritionalStatus;

  // Get the top priority
  const topPriority = priorities[0];
  if (!topPriority) return null;

  const priorityColors = {
    protein: '#3B82F6',
    calories: '#EF4444',
    carbs: '#F59E0B',
    fat: '#8B5CF6',
    fiber: '#10B981',
  };

  const color = priorityColors[topPriority.toLowerCase()] || BRAND.primary;

  return (
    <View style={[styles.statusBanner, { borderLeftColor: color }]}>
      <View style={[styles.statusIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name="nutrition" size={18} color={color} />
      </View>
      <View style={styles.statusTextContainer}>
        <Text style={styles.statusTitle}>Focus: {topPriority}</Text>
        <Text style={styles.statusSubtext}>
          {priorities.length > 1
            ? `Also need: ${priorities.slice(1, 3).join(', ')}`
            : 'On track with other nutrients'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={TEXT.tertiary} />
    </View>
  );
}

// ============================================================================
// MEAL TIME PROMPT
// Contextual prompt based on time of day
// ============================================================================

export function MealTimePrompt({ mealType, onLogMeal }) {
  const mealConfig = {
    breakfast: {
      icon: 'sunny',
      color: '#F59E0B',
      message: 'Start your day right',
      action: 'Log breakfast',
    },
    lunch: {
      icon: 'restaurant',
      color: '#10B981',
      message: 'Power up for the afternoon',
      action: 'Log lunch',
    },
    dinner: {
      icon: 'moon',
      color: '#6366F1',
      message: 'Wind down with a good meal',
      action: 'Log dinner',
    },
    snack: {
      icon: 'cafe',
      color: '#EC4899',
      message: 'Need a quick bite?',
      action: 'Log snack',
    },
  };

  const config = mealConfig[mealType] || mealConfig.snack;

  return (
    <View style={[styles.mealPrompt, { backgroundColor: config.color + '10' }]}>
      <View style={[styles.mealPromptIcon, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>
      <View style={styles.mealPromptText}>
        <Text style={[styles.mealPromptTitle, { color: config.color }]}>
          {config.message}
        </Text>
        <Text style={styles.mealPromptAction}>{config.action}</Text>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Main container
  container: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  gradientBackground: {
    padding: SPACING[4],
    borderRadius: RADIUS.xl,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginRight: SPACING[3],
  },
  greetingTextContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT.primary,
    letterSpacing: -0.3,
  },
  encouragement: {
    fontSize: 14,
    color: TEXT.secondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING[3],
    gap: SPACING[3],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  statText: {
    fontSize: 12,
    color: TEXT.secondary,
    fontWeight: '500',
  },
  progressBadge: {
    backgroundColor: '#10B98115',
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },

  // Compact version
  compactContainer: {
    paddingVertical: SPACING[2],
  },
  compactGreeting: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT.primary,
  },
  compactEncouragement: {
    fontSize: 13,
    color: TEXT.secondary,
    marginTop: 2,
  },

  // Smart Food Header
  headerContainer: {
    marginBottom: SPACING[4],
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: SPACING[4],
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  decorativeCircle: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircleSmall: {
    position: 'absolute',
    right: 40,
    bottom: -10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Status banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    padding: SPACING[3],
    marginBottom: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  statusSubtext: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },

  // Meal time prompt
  mealPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
  },
  mealPromptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING[3],
  },
  mealPromptText: {
    flex: 1,
  },
  mealPromptTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  mealPromptAction: {
    fontSize: 12,
    color: TEXT.tertiary,
    marginTop: 2,
  },
});
