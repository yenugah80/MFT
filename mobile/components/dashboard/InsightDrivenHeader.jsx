/**
 * InsightDrivenHeader - Strategic Wellness Coach Header
 *
 * DESIGN PHILOSOPHY:
 * This header answers "What should I do NOW?" not "What have I done?"
 *
 * Instead of showing 3 equal metrics competing for attention,
 * we show ONE contextual insight that matters most right now.
 *
 * Strategic Principles:
 * 1. ONE PRIMARY FOCUS - The most important thing right now, big and bold
 * 2. CONTEXTUAL INTELLIGENCE - Time of day + user patterns drive messaging
 * 3. EMOTIONAL CONNECTION - We're a coach, not a spreadsheet
 * 4. ACTION-ORIENTED - Every insight has a clear next step
 *
 * Visual Hierarchy:
 * - Hero: Single insight message (60% of attention)
 * - Secondary: Minimal status indicators (30%)
 * - Tertiary: Utility actions (10%)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  TEXT,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from '../../constants/premiumTheme';

// ============================================================================
// INSIGHT ENGINE - The brain that decides what to show
// ============================================================================

/**
 * USER PERSONAS - Different users need different experiences
 *
 * 1. FIRST_TIME: No logs ever - Focus on education + first win
 * 2. ONBOARDING: 1-3 days - Build initial habit, celebrate small wins
 * 3. BUILDING: 4-14 days - Reinforce habit, show early patterns
 * 4. ESTABLISHED: 15-30 days - Deeper insights, trust the data
 * 5. POWER_USER: 30+ days - Predictive, pattern-based, minimal hand-holding
 */
function getUserPersona(totalDays, streak, consistency) {
  // Use streak as fallback if totalDays is missing/0
  // A user with a streak has logged at least that many days
  const effectiveDays = Math.max(totalDays || 0, streak || 0);

  if (effectiveDays === 0) return 'FIRST_TIME';
  if (effectiveDays <= 3) return 'ONBOARDING';
  if (effectiveDays <= 14) return 'BUILDING';
  if (effectiveDays <= 30) return 'ESTABLISHED';
  return 'POWER_USER';
}

/**
 * Determines the single most important insight to show right now
 * Based on: time of day, current progress, user patterns, persona, and priorities
 */
function getHeroInsight({
  hour,
  mealsLogged,
  waterPercent,
  caloriesConsumed,
  calorieGoal,
  proteinConsumed,
  proteinGoal,
  streak,
  lastMealTime, // Note: Currently unused, kept for future time-since-meal features
  userName,
  // New persona-aware props
  totalLoggingDays = 0,
  consistency = 0,
  avgCalories = 0,
  bestStreak = 0,
  hasLoggedToday = false,
}) {
  const firstName = userName?.split(' ')[0] || '';
  const persona = getUserPersona(totalLoggingDays, streak, consistency);

  // BUG FIX: Normalize hasLoggedToday to prevent conflicts with mealsLogged
  // If mealsLogged > 0, user HAS logged today regardless of hasLoggedToday prop
  // This prevents "Pick up where you left off" when user has actually logged
  const actuallyLoggedToday = hasLoggedToday || mealsLogged > 0;

  // ========================================================================
  // FIRST TIME USER - Education + First Win
  // ========================================================================
  if (persona === 'FIRST_TIME') {
    if (hour >= 5 && hour < 11) {
      return {
        type: 'welcome',
        category: 'start',
        headline: `Welcome${firstName ? `, ${firstName}` : ''}`,
        message: 'Log your first meal and I\'ll start learning your patterns.',
        cta: 'Log your first meal',
        ctaIcon: 'camera',
        gradient: ['#EEF2FF', '#E0E7FF'],
        accentColor: '#6366F1',
        priority: 'critical',
      };
    }
    if (hour >= 11 && hour < 17) {
      return {
        type: 'welcome',
        category: 'start',
        headline: 'Let\'s get started',
        message: 'Snap a photo of your meal. I\'ll handle the nutrition math.',
        cta: 'Take a photo',
        ctaIcon: 'camera',
        gradient: ['#FFF7ED', '#FFEDD5'],
        accentColor: '#F97316',
        priority: 'critical',
      };
    }
    return {
      type: 'welcome',
      category: 'start',
      headline: 'Track your first meal',
      message: 'Even a late start counts. Log dinner and begin your journey.',
      cta: 'Log dinner',
      ctaIcon: 'restaurant',
      gradient: ['#EDE9FE', '#DDD6FE'],
      accentColor: '#8B5CF6',
      priority: 'critical',
    };
  }

  // ========================================================================
  // ONBOARDING USER (Days 1-3) - Celebrate every win, build confidence
  // ========================================================================
  if (persona === 'ONBOARDING') {
    // Celebrate if they've logged today
    if (actuallyLoggedToday && mealsLogged >= 1) {
      if (streak === 1) {
        return {
          type: 'celebration',
          category: 'milestone',
          headline: 'Day 1 complete!',
          message: 'You took the first step. Come back tomorrow to build momentum.',
          cta: null,
          gradient: ['#ECFDF5', '#D1FAE5'],
          accentColor: '#10B981',
          priority: 'positive',
        };
      }
      if (streak === 2) {
        return {
          type: 'celebration',
          category: 'milestone',
          headline: '2 days in a row!',
          message: 'This is how habits start. One more day and you\'ll feel it click.',
          cta: null,
          gradient: ['#FEF3C7', '#FDE68A'],
          accentColor: '#F59E0B',
          priority: 'positive',
        };
      }
      if (streak === 3) {
        return {
          type: 'celebration',
          category: 'milestone',
          headline: '3-day streak!',
          message: 'Research says it takes 3 days to start a habit. You\'re building one.',
          cta: null,
          gradient: ['#ECFDF5', '#D1FAE5'],
          accentColor: '#10B981',
          priority: 'positive',
        };
      }
    }

    // Not logged today yet - encourage without pressure
    if (!actuallyLoggedToday) {
      if (streak > 0) {
        return {
          type: 'nudge',
          category: 'nutrition',
          headline: `Keep it going`,
          message: `${streak} day${streak > 1 ? 's' : ''} tracked. Don't break the chain!`,
          cta: 'Log today\'s meal',
          ctaIcon: 'add-circle',
          gradient: ['#FFF7ED', '#FFEDD5'],
          accentColor: '#F97316',
          priority: 'high',
        };
      }
      return {
        type: 'action',
        category: 'nutrition',
        headline: 'Pick up where you left off',
        message: 'Every log teaches me more about you. Let\'s continue.',
        cta: 'Log a meal',
        ctaIcon: 'camera',
        gradient: ['#EEF2FF', '#E0E7FF'],
        accentColor: '#6366F1',
        priority: 'medium',
      };
    }
  }

  // ========================================================================
  // BUILDING USER (Days 4-14) - Show early patterns, reinforce habit
  // ========================================================================
  if (persona === 'BUILDING') {
    if (!actuallyLoggedToday) {
      if (streak >= 7) {
        // BUG FIX: Don't repeat streak number - badge already shows it
        // Make hero message motivational, badge shows the number
        return {
          type: 'nudge',
          category: 'streak',
          headline: 'Keep the momentum',
          message: 'You\'ve built real consistency. Don\'t break the chain today.',
          cta: 'Log now',
          ctaIcon: 'add-circle',
          gradient: ['#FEF3C7', '#FDE68A'],
          accentColor: '#F59E0B',
          priority: 'high',
        };
      }
      if (bestStreak > streak && bestStreak >= 5) {
        return {
          type: 'motivation',
          category: 'nutrition',
          headline: 'Beat your record',
          message: `Your best was ${bestStreak} days. You're at ${streak}. Let's go.`,
          cta: 'Log today',
          ctaIcon: 'trophy',
          gradient: ['#EDE9FE', '#DDD6FE'],
          accentColor: '#8B5CF6',
          priority: 'medium',
        };
      }
    }

    // Week milestone celebration
    if (totalLoggingDays === 7 && actuallyLoggedToday) {
      return {
        type: 'celebration',
        category: 'milestone',
        headline: 'One week!',
        message: 'You\'ve logged for a full week. I\'m starting to see your patterns.',
        cta: 'See insights',
        ctaIcon: 'analytics',
        gradient: ['#ECFDF5', '#D1FAE5'],
        accentColor: '#10B981',
        priority: 'positive',
      };
    }

    if (totalLoggingDays === 14 && actuallyLoggedToday) {
      return {
        type: 'celebration',
        category: 'milestone',
        headline: 'Two weeks strong',
        message: 'You\'re officially building a habit. Your data is getting meaningful.',
        cta: 'Explore patterns',
        ctaIcon: 'trending-up',
        gradient: ['#FDF4FF', '#FAE8FF'],
        accentColor: '#A855F7',
        priority: 'positive',
      };
    }
  }

  // ========================================================================
  // ESTABLISHED USER (Days 15-30) - Deeper insights, trust building
  // BUG FIX: This persona was missing entirely!
  // ========================================================================
  if (persona === 'ESTABLISHED') {
    if (!actuallyLoggedToday) {
      // Streak protection messaging
      // BUG FIX: Don't repeat streak number - badge already shows it
      if (streak >= 14) {
        return {
          type: 'nudge',
          category: 'streak',
          headline: 'You\'re on a roll',
          message: 'You\'ve built something real. Keep it going today.',
          cta: 'Log now',
          ctaIcon: 'add-circle',
          gradient: ['#FEF3C7', '#FDE68A'],
          accentColor: '#F59E0B',
          priority: 'high',
        };
      }
      return {
        type: 'action',
        category: 'nutrition',
        headline: 'Ready when you are',
        message: 'Your patterns are clear now. I can predict what you need.',
        cta: 'Log a meal',
        ctaIcon: 'camera',
        gradient: ['#EEF2FF', '#E0E7FF'],
        accentColor: '#6366F1',
        priority: 'medium',
      };
    }

    // Week 3 milestone
    if (totalLoggingDays === 21 && actuallyLoggedToday) {
      return {
        type: 'celebration',
        category: 'milestone',
        headline: 'Three weeks!',
        message: 'Most people quit by now. You\'re in the top 10% of trackers.',
        cta: 'See your stats',
        ctaIcon: 'stats-chart',
        gradient: ['#ECFDF5', '#D1FAE5'],
        accentColor: '#10B981',
        priority: 'positive',
      };
    }

    // Month milestone
    if (totalLoggingDays === 30 && actuallyLoggedToday) {
      return {
        type: 'celebration',
        category: 'milestone',
        headline: 'One month!',
        message: 'You\'ve made tracking a real habit. Your data tells a complete story now.',
        cta: 'View insights',
        ctaIcon: 'analytics',
        gradient: ['#FDF4FF', '#FAE8FF'],
        accentColor: '#A855F7',
        priority: 'positive',
      };
    }
  }

  // ========================================================================
  // POWER USER (30+ days) - Predictive, data-driven, minimal friction
  // ========================================================================
  if (persona === 'POWER_USER') {
    const caloriePercent = calorieGoal > 0 ? (caloriesConsumed / calorieGoal) * 100 : 0;
    const proteinPercent = proteinGoal > 0 ? (proteinConsumed / proteinGoal) * 100 : 0;

    // Pattern-based predictions
    if (!actuallyLoggedToday && hour >= 6 && hour < 10) {
      return {
        type: 'pattern',
        category: 'nutrition',
        headline: 'Good morning',
        message: avgCalories > 0
          ? `You average ${Math.round(avgCalories)} cal/day. Start when ready.`
          : 'Ready to log when you are.',
        cta: 'Log breakfast',
        ctaIcon: 'add',
        gradient: ['#F8FAFC', '#F1F5F9'],
        accentColor: '#64748B',
        priority: 'low',
      };
    }

    // Smart deficit/surplus detection
    if (actuallyLoggedToday && avgCalories > 0) {
      const dailyDelta = caloriesConsumed - avgCalories;

      if (hour >= 18 && Math.abs(dailyDelta) > 300) {
        if (dailyDelta > 300) {
          return {
            type: 'insight',
            category: 'nutrition',
            headline: 'Higher intake today',
            message: `${Math.round(dailyDelta)} cal above your average. Totally normal—one day doesn't define a pattern.`,
            cta: null,
            gradient: ['#FEF3C7', '#FDE68A'],
            accentColor: '#D97706',
            priority: 'info',
          };
        }
        if (dailyDelta < -300) {
          return {
            type: 'insight',
            category: 'nutrition',
            headline: 'Light day',
            message: `${Math.round(Math.abs(dailyDelta))} cal under average. Listen to your hunger cues.`,
            cta: null,
            gradient: ['#EEF2FF', '#E0E7FF'],
            accentColor: '#6366F1',
            priority: 'info',
          };
        }
      }
    }

    // Consistency acknowledgment for power users
    if (consistency >= 80 && streak >= 14) {
      if (hour >= 20 && actuallyLoggedToday) {
        return {
          type: 'acknowledgment',
          category: 'wellness',
          headline: `${streak} days`,
          message: `${consistency}% consistency. You've made tracking a true habit.`,
          cta: null,
          gradient: ['#ECFDF5', '#D1FAE5'],
          accentColor: '#10B981',
          priority: 'positive',
        };
      }
    }
  }

  // PRIORITY 1: Morning momentum (5-10 AM)
  // BUG FIX: Extended to 5 AM for early risers
  if (hour >= 5 && hour < 10) {
    if (mealsLogged === 0) {
      return {
        type: 'action',
        category: 'nutrition',
        headline: 'Start strong today',
        message: 'Breakfast sets your metabolism. What sounds good?',
        cta: 'Log breakfast',
        ctaIcon: 'add-circle',
        gradient: ['#FFF7ED', '#FFEDD5'],
        accentColor: '#F97316',
        priority: 'high',
      };
    }
    if (waterPercent < 15) {
      return {
        type: 'action',
        category: 'hydration',
        headline: 'Morning hydration',
        message: 'Your body lost water overnight. A glass now boosts focus.',
        cta: 'Log water',
        ctaIcon: 'water',
        gradient: ['#ECFEFF', '#CFFAFE'],
        accentColor: '#0891B2',
        priority: 'medium',
      };
    }
  }

  // PRIORITY 2: Midday check-in (11 AM - 2 PM)
  if (hour >= 11 && hour < 14) {
    if (mealsLogged < 2) {
      const proteinPercent = proteinGoal > 0 ? (proteinConsumed / proteinGoal) * 100 : 0;
      if (proteinPercent < 40) {
        return {
          type: 'insight',
          category: 'nutrition',
          headline: 'Protein opportunity',
          message: `You're at ${Math.round(proteinPercent)}% protein. Lunch is your chance to catch up.`,
          cta: 'Log lunch',
          ctaIcon: 'restaurant',
          gradient: ['#FDF4FF', '#FAE8FF'],
          accentColor: '#A855F7',
          priority: 'high',
        };
      }
      return {
        type: 'action',
        category: 'nutrition',
        headline: 'Lunchtime',
        message: 'Midday fuel keeps your energy steady through afternoon.',
        cta: 'Log lunch',
        ctaIcon: 'restaurant',
        gradient: ['#FFF7ED', '#FFEDD5'],
        accentColor: '#F97316',
        priority: 'medium',
      };
    }
    if (waterPercent < 40) {
      return {
        type: 'nudge',
        category: 'hydration',
        headline: `${Math.round(waterPercent)}% hydrated`,
        message: 'Afternoon slump often = dehydration. Quick water break?',
        cta: 'Add water',
        ctaIcon: 'water',
        gradient: ['#ECFEFF', '#CFFAFE'],
        accentColor: '#0891B2',
        priority: 'medium',
      };
    }
  }

  // PRIORITY 3: Afternoon energy (2-5 PM)
  if (hour >= 14 && hour < 17) {
    if (waterPercent < 50) {
      return {
        type: 'insight',
        category: 'hydration',
        headline: 'Energy dip incoming?',
        message: `At ${Math.round(waterPercent)}% water, 3pm fatigue is likely. Hydrate now.`,
        cta: 'Log water',
        ctaIcon: 'water',
        gradient: ['#ECFEFF', '#CFFAFE'],
        accentColor: '#0891B2',
        priority: 'high',
      };
    }
    const caloriePercent = calorieGoal > 0 ? (caloriesConsumed / calorieGoal) * 100 : 0;
    if (caloriePercent < 50 && mealsLogged < 3) {
      return {
        type: 'nudge',
        category: 'nutrition',
        headline: 'Running light today',
        message: `${Math.round(caloriePercent)}% of daily fuel. A snack will help sustain you.`,
        cta: 'Log snack',
        ctaIcon: 'nutrition',
        gradient: ['#FEF3C7', '#FDE68A'],
        accentColor: '#D97706',
        priority: 'medium',
      };
    }
  }

  // PRIORITY 4: Evening reflection (5-9 PM)
  if (hour >= 17 && hour < 21) {
    const caloriePercent = calorieGoal > 0 ? (caloriesConsumed / calorieGoal) * 100 : 0;

    // Great day celebration
    if (caloriePercent >= 80 && caloriePercent <= 110 && waterPercent >= 70) {
      return {
        type: 'celebration',
        category: 'wellness',
        headline: 'Balanced day',
        message: 'Nutrition and hydration on point. This is what consistency looks like.',
        cta: null,
        gradient: ['#ECFDF5', '#D1FAE5'],
        accentColor: '#10B981',
        priority: 'positive',
      };
    }

    if (mealsLogged < 3) {
      return {
        type: 'action',
        category: 'nutrition',
        headline: 'Dinner time',
        message: 'Round out your day. What are you having tonight?',
        cta: 'Log dinner',
        ctaIcon: 'restaurant',
        gradient: ['#FFF7ED', '#FFEDD5'],
        accentColor: '#F97316',
        priority: 'medium',
      };
    }

    if (waterPercent < 70) {
      return {
        type: 'nudge',
        category: 'hydration',
        headline: 'Evening hydration',
        message: `${Math.round(100 - waterPercent)}% to go. A few more glasses before bed.`,
        cta: 'Add water',
        ctaIcon: 'water',
        gradient: ['#ECFEFF', '#CFFAFE'],
        accentColor: '#0891B2',
        priority: 'low',
      };
    }
  }

  // PRIORITY 5: Night wind-down (9 PM - 5 AM)
  // BUG FIX: Changed hour < 6 to hour < 5 so 5AM gets morning treatment, not "Good evening"
  if (hour >= 21 || hour < 5) {
    const caloriePercent = calorieGoal > 0 ? (caloriesConsumed / calorieGoal) * 100 : 0;

    if (caloriePercent >= 80 && waterPercent >= 60) {
      return {
        type: 'celebration',
        category: 'wellness',
        headline: 'Day complete',
        message: streak > 1
          ? `${streak} days of tracking. Rest well, ${firstName || 'you'}.`
          : `Good tracking today. Rest well, ${firstName || 'you'}.`,
        cta: null,
        gradient: ['#EDE9FE', '#DDD6FE'],
        accentColor: '#8B5CF6',
        priority: 'positive',
      };
    }

    return {
      type: 'neutral',
      category: 'wellness',
      headline: 'Good evening',
      message: 'Review your day or log anything you missed.',
      cta: 'View today',
      ctaIcon: 'calendar',
      gradient: ['#F8FAFC', '#F1F5F9'],
      accentColor: '#64748B',
      priority: 'low',
    };
  }

  // DEFAULT: Encouraging neutral state
  return {
    type: 'neutral',
    category: 'wellness',
    headline: `Hey${firstName ? `, ${firstName}` : ''}`,
    message: 'Track your meals and water to see personalized insights.',
    cta: 'Log something',
    ctaIcon: 'add-circle',
    gradient: ['#F8FAFC', '#F1F5F9'],
    accentColor: '#6366F1',
    priority: 'low',
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InsightDrivenHeader({
  userName,
  mealsLogged = 0,
  mealGoal = 3,
  waterIntakeLiters = 0,
  waterGoalLiters = 2.0,
  caloriesConsumed = 0,
  calorieGoal = 2000,
  proteinConsumed = 0,
  proteinGoal = 50,
  streak = 0,
  lastMealTime = null,
  // Learning loop data - enables personalization
  totalLoggingDays = 0,
  consistency = 0,
  avgCalories = 0,
  bestStreak = 0,
  hasLoggedToday = false,
  // Actions
  onLogFood,
  onLogWater,
  onViewToday,
  onViewInsights,
  onSettingsPress,
  style,
}) {
  const hour = new Date().getHours();
  const waterPercent = waterGoalLiters > 0 ? (waterIntakeLiters / waterGoalLiters) * 100 : 0;

  // Get the single most important insight right now
  // This is where the "learning loop" happens - more data = smarter insights
  const insight = useMemo(() => getHeroInsight({
    hour,
    mealsLogged,
    waterPercent,
    caloriesConsumed,
    calorieGoal,
    proteinConsumed,
    proteinGoal,
    streak,
    lastMealTime,
    userName,
    // Learning loop data
    totalLoggingDays,
    consistency,
    avgCalories,
    bestStreak,
    hasLoggedToday,
  }), [
    hour, mealsLogged, waterPercent, caloriesConsumed, calorieGoal,
    proteinConsumed, proteinGoal, streak, lastMealTime, userName, totalLoggingDays,
    consistency, avgCalories, bestStreak, hasLoggedToday
  ]);

  // Determine CTA action based on insight category and icon
  const handleCTA = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Hydration-related CTAs
    if (insight.category === 'hydration' && onLogWater) {
      onLogWater();
      return;
    }

    // BUG FIX: Handle insights/analytics CTAs properly
    // These should route to insights screen, not fall through to viewToday
    const isInsightsRelated =
      insight.category === 'milestone' ||
      ['analytics', 'stats-chart', 'trending-up'].includes(insight.ctaIcon);

    if (isInsightsRelated && onViewInsights) {
      onViewInsights();
      return;
    }

    // Food logging CTAs - includes 'nutrition' and 'start' (first-time users)
    // Also check for food-related icons as fallback
    const isFoodRelated =
      insight.category === 'nutrition' ||
      insight.category === 'start' ||
      insight.category === 'streak' ||
      ['camera', 'restaurant', 'add-circle', 'nutrition', 'add', 'flame'].includes(insight.ctaIcon);

    if (isFoodRelated && onLogFood) {
      onLogFood();
      return;
    }

    // Fallback to view today
    if (onViewToday) {
      onViewToday();
    }
  };

  const firstName = userName?.split(' ')[0] || '';
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={[styles.container, style]}>
      {/* Brand Header - Always visible, stable identity */}
      <View style={styles.brandHeader}>
        <View style={styles.brandLeft}>
          {/* Logo + Brand */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#F97316', '#FB923C']}
              style={styles.logoGradient}
            >
              <Ionicons name="nutrition" size={18} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.brandText}>
            <Text style={styles.greeting}>{greeting}{firstName ? `, ${firstName}` : ''}</Text>
            <Text style={styles.brandName}>MyFoodTracker</Text>
          </View>
        </View>

        <View style={styles.brandRight}>
          {/* BUG FIX: Show badge for streak >= 1, not just > 1 */}
          {/* First day deserves recognition too! */}
          {streak >= 1 && (
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color="#F97316" />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}
          {onSettingsPress && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={onSettingsPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="person-circle-outline" size={28} color={TEXT.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Hero Insight Card */}
      <LinearGradient
        colors={insight.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        {/* Insight Category Badge */}
        <View style={styles.topRow}>
          <View style={[styles.categoryBadge, { backgroundColor: `${insight.accentColor}20` }]}>
            <View style={[styles.categoryDot, { backgroundColor: insight.accentColor }]} />
            <Text style={[styles.categoryText, { color: insight.accentColor }]}>
              {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
            </Text>
          </View>
        </View>

        {/* Hero Content */}
        <View style={styles.heroContent}>
          <Text style={[styles.headline, { color: insight.accentColor }]}>
            {insight.headline}
          </Text>
          <Text style={styles.message}>
            {insight.message}
          </Text>
        </View>

        {/* CTA Button */}
        {insight.cta && (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: insight.accentColor }]}
            onPress={handleCTA}
            activeOpacity={0.8}
          >
            {insight.ctaIcon && (
              <Ionicons name={insight.ctaIcon} size={18} color="#FFFFFF" style={styles.ctaIcon} />
            )}
            <Text style={styles.ctaText}>{insight.cta}</Text>
          </TouchableOpacity>
        )}

        {/* Celebration state - no CTA, show checkmark */}
        {insight.type === 'celebration' && (
          <View style={styles.celebrationBadge}>
            <Ionicons name="checkmark-circle" size={20} color={insight.accentColor} />
            <Text style={[styles.celebrationText, { color: insight.accentColor }]}>
              On track
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Minimal Status Bar - Secondary info, very subtle */}
      {/* BUG FIX: Changed flame icon to nutrition icon for calories */}
      {/* flame = streak (universally understood), nutrition = food/calories */}
      <View style={styles.statusBar}>
        <StatusPill
          icon="restaurant"
          value={`${mealsLogged}/${mealGoal}`}
          color={mealsLogged >= mealGoal ? '#10B981' : '#94A3B8'}
        />
        <StatusPill
          icon="water"
          value={`${Math.round(waterPercent)}%`}
          color={waterPercent >= 80 ? '#10B981' : '#94A3B8'}
        />
        <StatusPill
          icon="nutrition"
          value={`${caloriesConsumed}`}
          label="cal"
          color="#94A3B8"
        />
      </View>
    </View>
  );
}

// Minimal status indicator
const StatusPill = ({ icon, value, label, color }) => (
  <View style={styles.statusPill}>
    <Ionicons name={icon} size={12} color={color} />
    <Text style={[styles.statusValue, { color }]}>{value}</Text>
    {label && <Text style={[styles.statusLabel, { color }]}>{label}</Text>}
  </View>
);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[3],
  },

  // Brand Header
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[4],
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  logoContainer: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoGradient: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    gap: 2,
  },
  greeting: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
    letterSpacing: -0.3,
  },
  brandName: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: TEXT.tertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Hero Card
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: RADIUS.full,
    gap: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: SPACING[2],
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#F97316',
  },
  settingsButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Content
  heroContent: {
    marginBottom: SPACING[4],
  },
  headline: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    letterSpacing: -0.5,
    marginBottom: SPACING[1],
  },
  message: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.normal,
    color: TEXT.secondary,
    lineHeight: 22,
  },

  // CTA Button
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.lg,
    gap: SPACING[2],
  },
  ctaIcon: {
    marginRight: 2,
  },
  ctaText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#FFFFFF',
  },

  // Celebration Badge
  celebrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
  },
  celebrationText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
  },

  // Status Bar
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING[4],
    marginTop: SPACING[3],
    paddingVertical: SPACING[2],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusValue: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.normal,
  },
});
