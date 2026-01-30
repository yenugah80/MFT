/**
 * SmartEmptyState - Context-aware empty state for returning users
 *
 * Instead of boring "No data logged" messages, this shows:
 * - Time-aware greetings and suggestions
 * - Yesterday's summary or weekly averages
 * - Pattern-based meal suggestions
 * - Streak info and motivation
 * - Quick action buttons
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TEXT, SURFACES, BRAND, SEMANTIC } from '../../constants/premiumTheme';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/designTokens';

// Time-based greetings and meal suggestions
const TIME_CONTEXT = {
  morning: {
    greeting: 'Good morning!',
    mealType: 'breakfast',
    icon: 'sunny',
    color: '#F59E0B',
    suggestions: ['Oatmeal', 'Eggs', 'Smoothie', 'Toast'],
    message: 'Start your day right',
  },
  midMorning: {
    greeting: 'Mid-morning energy check',
    mealType: 'snack',
    icon: 'cafe',
    color: '#8B5CF6',
    suggestions: ['Fruit', 'Nuts', 'Yogurt', 'Coffee'],
    message: 'A quick snack keeps you going',
  },
  lunch: {
    greeting: 'Lunchtime!',
    mealType: 'lunch',
    icon: 'restaurant',
    color: '#10B981',
    suggestions: ['Salad', 'Sandwich', 'Rice bowl', 'Soup'],
    message: 'Fuel up for the afternoon',
  },
  afternoon: {
    greeting: 'Afternoon pick-me-up',
    mealType: 'snack',
    icon: 'leaf',
    color: '#06B6D4',
    suggestions: ['Tea', 'Fruit', 'Protein bar', 'Smoothie'],
    message: 'Beat the afternoon slump',
  },
  dinner: {
    greeting: 'Dinner time!',
    mealType: 'dinner',
    icon: 'moon',
    color: '#6366F1',
    suggestions: ['Chicken', 'Fish', 'Pasta', 'Vegetables'],
    message: 'End your day well',
  },
  evening: {
    greeting: 'Evening wind-down',
    mealType: 'snack',
    icon: 'moon-outline',
    color: '#8B5CF6',
    suggestions: ['Herbal tea', 'Light snack'],
    message: 'Keep it light before bed',
  },
};

function getTimeContext() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return TIME_CONTEXT.morning;
  if (hour >= 10 && hour < 12) return TIME_CONTEXT.midMorning;
  if (hour >= 12 && hour < 14) return TIME_CONTEXT.lunch;
  if (hour >= 14 && hour < 17) return TIME_CONTEXT.afternoon;
  if (hour >= 17 && hour < 20) return TIME_CONTEXT.dinner;
  return TIME_CONTEXT.evening;
}

// Generate personalized suggestions based on user history
function getPersonalizedSuggestions(userPatterns, timeContext) {
  if (!userPatterns || !userPatterns.frequentFoods) {
    return timeContext.suggestions;
  }

  // Filter user's frequent foods that match current meal type
  const relevantFoods = userPatterns.frequentFoods
    .filter(f => f.mealType === timeContext.mealType || !f.mealType)
    .slice(0, 4)
    .map(f => f.name);

  return relevantFoods.length > 0 ? relevantFoods : timeContext.suggestions;
}

export default function SmartEmptyState({
  domain = 'nutrition',
  userHistory = {},
  userPatterns = {},
  streak = 0,
  onLogPress,
  onSuggestionPress,
  compact = false,
}) {
  const timeContext = useMemo(() => getTimeContext(), []);
  const suggestions = useMemo(
    () => getPersonalizedSuggestions(userPatterns, timeContext),
    [userPatterns, timeContext]
  );

  // Calculate if user is a returning user
  const isReturningUser = userHistory.totalDays > 0 || userHistory.yesterdayCalories > 0;
  const hasYesterdayData = userHistory.yesterdayCalories > 0;

  // Domain-specific configurations
  const domainConfig = {
    nutrition: {
      icon: 'nutrition',
      color: '#10B981',
      label: 'Nutrition',
      quickLogLabel: `Log ${timeContext.mealType}`,
    },
    hydration: {
      icon: 'water',
      color: '#3B82F6',
      label: 'Hydration',
      quickLogLabel: 'Log drink',
    },
    mood: {
      icon: 'happy',
      color: '#8B5CF6',
      label: 'Mood',
      quickLogLabel: 'Quick check-in',
    },
    activity: {
      icon: 'fitness',
      color: '#F59E0B',
      label: 'Activity',
      quickLogLabel: 'Log activity',
    },
  };

  const config = domainConfig[domain] || domainConfig.nutrition;

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactContainer}
        onPress={onLogPress}
        activeOpacity={0.7}
      >
        <View style={[styles.compactIcon, { backgroundColor: timeContext.color + '15' }]}>
          <Ionicons name={timeContext.icon} size={20} color={timeContext.color} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactGreeting}>{timeContext.greeting}</Text>
          <Text style={styles.compactMessage}>{timeContext.message}</Text>
        </View>
        <View style={styles.compactAction}>
          <Text style={[styles.compactActionText, { color: config.color }]}>
            {config.quickLogLabel}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={config.color} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Time-aware header */}
      <View style={styles.header}>
        <View style={[styles.timeIcon, { backgroundColor: timeContext.color + '15' }]}>
          <Ionicons name={timeContext.icon} size={28} color={timeContext.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{timeContext.greeting}</Text>
          <Text style={styles.message}>{timeContext.message}</Text>
        </View>
      </View>

      {/* Returning user: Show yesterday's summary or weekly average */}
      {isReturningUser && (
        <View style={styles.historyCard}>
          {hasYesterdayData ? (
            <>
              <View style={styles.historyHeader}>
                <Ionicons name="time-outline" size={16} color={TEXT.secondary} />
                <Text style={styles.historyLabel}>Yesterday</Text>
              </View>
              <View style={styles.historyStats}>
                <View style={styles.historyStat}>
                  <Text style={styles.historyValue}>{userHistory.yesterdayCalories}</Text>
                  <Text style={styles.historyUnit}>cal</Text>
                </View>
                {userHistory.yesterdayMeals > 0 && (
                  <View style={styles.historyStat}>
                    <Text style={styles.historyValue}>{userHistory.yesterdayMeals}</Text>
                    <Text style={styles.historyUnit}>meals</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <>
              <View style={styles.historyHeader}>
                <Ionicons name="analytics-outline" size={16} color={TEXT.secondary} />
                <Text style={styles.historyLabel}>Your average</Text>
              </View>
              <View style={styles.historyStats}>
                <View style={styles.historyStat}>
                  <Text style={styles.historyValue}>{userHistory.avgCalories || '~1800'}</Text>
                  <Text style={styles.historyUnit}>cal/day</Text>
                </View>
              </View>
            </>
          )}
        </View>
      )}

      {/* Streak motivation (if any) */}
      {streak > 0 && (
        <View style={styles.streakBanner}>
          <Ionicons name="flame" size={18} color="#F59E0B" />
          <Text style={styles.streakText}>
            {streak} day streak! Keep it going
          </Text>
        </View>
      )}

      {/* Quick suggestions based on time & patterns */}
      <View style={styles.suggestionsSection}>
        <Text style={styles.suggestionsTitle}>
          {isReturningUser ? 'Your favorites' : 'Quick ideas'}
        </Text>
        <View style={styles.suggestionChips}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => onSuggestionPress?.(suggestion)}
              activeOpacity={0.7}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
              <Ionicons name="add" size={14} color={BRAND.primary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Primary action */}
      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: config.color }]}
        onPress={onLogPress}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={20} color="#fff" />
        <Text style={styles.primaryButtonText}>{config.quickLogLabel}</Text>
      </TouchableOpacity>

      {/* Subtle tip for new users */}
      {!isReturningUser && (
        <View style={styles.tipContainer}>
          <Ionicons name="bulb-outline" size={14} color={TEXT.tertiary} />
          <Text style={styles.tipText}>
            Tip: Just say what you ate - we'll figure out the nutrition
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  timeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  message: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.secondary,
    marginTop: 2,
  },
  historyCard: {
    backgroundColor: SURFACES.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[3],
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING[2],
  },
  historyLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyStats: {
    flexDirection: 'row',
    gap: SPACING[4],
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  historyValue: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: TEXT.primary,
  },
  historyUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.tertiary,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    marginBottom: SPACING[3],
  },
  streakText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
    color: '#92400E',
  },
  suggestionsSection: {
    marginBottom: SPACING[4],
  },
  suggestionsTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING[2],
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SURFACES.card.primary,
    borderWidth: 1,
    borderColor: SURFACES.divider,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: 20,
  },
  suggestionText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: TEXT.primary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING[3],
    borderRadius: RADIUS.lg,
    marginBottom: SPACING[3],
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: '#fff',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  tipText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.tertiary,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACES.card.primary,
    padding: SPACING[3],
    borderRadius: RADIUS.lg,
    gap: SPACING[3],
  },
  compactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactGreeting: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },
  compactMessage: {
    fontSize: TYPOGRAPHY.size.xs,
    color: TEXT.secondary,
  },
  compactAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactActionText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    fontFamily: TYPOGRAPHY.family.medium,
  },
});
