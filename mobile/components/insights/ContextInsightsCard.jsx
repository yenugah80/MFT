/**
 * ContextInsightsCard - Smart Contextual Recommendations
 *
 * Displays personalized insights based on:
 * - Time of day
 * - Weather conditions
 * - User's recent activity
 * - Mood patterns
 * - Nutritional needs
 *
 * Features:
 * - Animated weather icons
 * - Contextual meal suggestions
 * - Activity recommendations
 * - Hydration reminders
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TEXT,
  SURFACES,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
} from '../../constants/premiumTheme';

// ============================================================================
// CONTEXT CONFIGURATIONS
// ============================================================================

const WEATHER_CONFIG = {
  sunny: {
    icon: 'sunny',
    color: '#F59E0B',
    gradient: ['#FEF3C7', '#FDE68A'],
    tip: 'Stay hydrated! Perfect day for outdoor activities.',
    emoji: '☀️',
  },
  cloudy: {
    icon: 'cloudy',
    color: '#6B7280',
    gradient: ['#F3F4F6', '#E5E7EB'],
    tip: 'Comfort food weather! Try warm, nourishing meals.',
    emoji: '☁️',
  },
  rainy: {
    icon: 'rainy',
    color: '#3B82F6',
    gradient: ['#DBEAFE', '#BFDBFE'],
    tip: 'Cozy up with warm soups and hot drinks.',
    emoji: '🌧️',
  },
  cold: {
    icon: 'snow',
    color: '#06B6D4',
    gradient: ['#CFFAFE', '#A5F3FC'],
    tip: 'Warm foods help maintain body temperature.',
    emoji: '❄️',
  },
  hot: {
    icon: 'sunny',
    color: '#EF4444',
    gradient: ['#FEE2E2', '#FECACA'],
    tip: 'Light meals and extra hydration recommended!',
    emoji: '🔥',
  },
};

const TIME_CONFIG = {
  morning: {
    icon: 'sunny',
    label: 'Good Morning',
    emoji: '🌅',
    color: '#F59E0B',
    mealSuggestion: 'breakfast',
    tip: 'Start your day with protein for sustained energy.',
  },
  afternoon: {
    icon: 'partly-sunny',
    label: 'Good Afternoon',
    emoji: '☀️',
    color: '#3B82F6',
    mealSuggestion: 'lunch',
    tip: 'Balanced lunch keeps afternoon slumps away.',
  },
  evening: {
    icon: 'moon',
    label: 'Good Evening',
    emoji: '🌆',
    color: '#8B5CF6',
    mealSuggestion: 'dinner',
    tip: 'Lighter dinners promote better sleep quality.',
  },
  night: {
    icon: 'moon',
    label: 'Good Night',
    emoji: '🌙',
    color: '#6366F1',
    mealSuggestion: 'snack',
    tip: 'If hungry, choose light, sleep-friendly snacks.',
  },
};

// ============================================================================
// INSIGHT CARD COMPONENT
// ============================================================================

function InsightItem({ icon, iconColor, title, subtitle, onPress }) {
  return (
    <TouchableOpacity
      style={styles.insightItem}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.insightIcon, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={TEXT.tertiary} />
    </TouchableOpacity>
  );
}

// ============================================================================
// WEATHER BADGE
// ============================================================================

function WeatherBadge({ weather, temperature }) {
  const config = WEATHER_CONFIG[weather] || WEATHER_CONFIG.sunny;

  return (
    <LinearGradient
      colors={config.gradient}
      style={styles.weatherBadge}
    >
      <Text style={styles.weatherEmoji}>{config.emoji}</Text>
      <Text style={styles.weatherTemp}>{temperature}°</Text>
    </LinearGradient>
  );
}

// ============================================================================
// HYDRATION REMINDER
// ============================================================================

function HydrationReminder({ currentIntake, goal, onPress }) {
  const progress = Math.min(1, currentIntake / goal);
  const remaining = Math.max(0, goal - currentIntake);
  const glasses = Math.ceil(remaining / 250);

  if (progress >= 1) {
    return (
      <View style={[styles.hydrationCard, styles.hydrationComplete]}>
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        <Text style={styles.hydrationCompleteText}>
          Hydration goal reached! Great job!
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.hydrationCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.hydrationLeft}>
        <Ionicons name="water" size={20} color="#3B82F6" />
        <View>
          <Text style={styles.hydrationTitle}>Stay Hydrated</Text>
          <Text style={styles.hydrationSubtitle}>
            {glasses} more glass{glasses > 1 ? 'es' : ''} to reach your goal
          </Text>
        </View>
      </View>
      <View style={styles.hydrationProgress}>
        <View style={[styles.hydrationBar, { width: `${progress * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContextInsightsCard({
  // Context data
  weather = 'sunny',
  temperature = 72,
  timeOfDay = null,
  // User state
  currentMood = null,
  energyLevel = null,
  // Hydration
  waterIntake = 0,
  waterGoal = 2000,
  // Display options
  hideGreeting = false,
  // Callbacks
  onMealSuggestionPress,
  onHydrationPress,
  onWeatherTipPress,
  onMoodCheckPress,
}) {
  // Determine time of day if not provided
  const currentTimeOfDay = useMemo(() => {
    if (timeOfDay) return timeOfDay;

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }, [timeOfDay]);

  const timeConfig = TIME_CONFIG[currentTimeOfDay];
  const weatherConfig = WEATHER_CONFIG[weather] || WEATHER_CONFIG.sunny;

  // Generate contextual insights
  const insights = useMemo(() => {
    const items = [];

    // Meal suggestion based on time
    items.push({
      icon: 'restaurant',
      iconColor: timeConfig.color,
      title: `${timeConfig.mealSuggestion.charAt(0).toUpperCase() + timeConfig.mealSuggestion.slice(1)} Time`,
      subtitle: timeConfig.tip,
      onPress: onMealSuggestionPress,
    });

    // Weather-based tip
    items.push({
      icon: weatherConfig.icon,
      iconColor: weatherConfig.color,
      title: 'Weather Insight',
      subtitle: weatherConfig.tip,
      onPress: onWeatherTipPress,
    });

    // Mood check if not logged today
    if (!currentMood) {
      items.push({
        icon: 'happy',
        iconColor: '#EC4899',
        title: 'How are you feeling?',
        subtitle: 'Log your mood to get personalized recommendations',
        onPress: onMoodCheckPress,
      });
    }

    // Energy-based suggestion
    if (energyLevel && energyLevel < 3) {
      items.push({
        icon: 'flash',
        iconColor: '#F59E0B',
        title: 'Energy Boost',
        subtitle: 'Try a balanced snack with protein and complex carbs',
        onPress: onMealSuggestionPress,
      });
    }

    return items.slice(0, 3); // Max 3 insights
  }, [
    timeConfig,
    weatherConfig,
    currentMood,
    energyLevel,
    onMealSuggestionPress,
    onWeatherTipPress,
    onMoodCheckPress,
  ]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!hideGreeting && (
            <Text style={styles.greeting}>
              {timeConfig.emoji} {timeConfig.label}
            </Text>
          )}
          <Text style={[styles.subtitle, hideGreeting && styles.subtitleLarge]}>
            {hideGreeting ? 'Smart Suggestions' : "Here's what we suggest for you"}
          </Text>
        </View>
        <WeatherBadge weather={weather} temperature={temperature} />
      </View>

      {/* Hydration Reminder */}
      <HydrationReminder
        currentIntake={waterIntake}
        goal={waterGoal}
        onPress={onHydrationPress}
      />

      {/* Contextual Insights */}
      <View style={styles.insightsList}>
        {insights.map((insight, idx) => (
          <InsightItem
            key={idx}
            icon={insight.icon}
            iconColor={insight.iconColor}
            title={insight.title}
            subtitle={insight.subtitle}
            onPress={insight.onPress}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: SURFACES.card,
    borderRadius: RADIUS.xl,
    padding: SPACING[4],
    ...SHADOWS.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[4],
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: TYPOGRAPHY.family.bold,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: TYPOGRAPHY.family.regular,
    color: TEXT.tertiary,
  },
  subtitleLarge: {
    fontSize: TYPOGRAPHY.size.base,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: TEXT.primary,
  },

  // Weather badge
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.full,
    gap: SPACING[1],
  },
  weatherEmoji: {
    fontSize: 16,
  },
  weatherTemp: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },

  // Hydration
  hydrationCard: {
    flexDirection: 'column',
    backgroundColor: '#3B82F608',
    borderRadius: RADIUS.lg,
    padding: SPACING[3],
    marginBottom: SPACING[4],
    gap: SPACING[2],
  },
  hydrationComplete: {
    backgroundColor: '#10B98108',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  hydrationCompleteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#10B981',
  },
  hydrationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  hydrationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
  },
  hydrationSubtitle: {
    fontSize: 12,
    color: TEXT.tertiary,
  },
  hydrationProgress: {
    height: 6,
    backgroundColor: '#3B82F620',
    borderRadius: 3,
    overflow: 'hidden',
  },
  hydrationBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },

  // Insights
  insightsList: {
    gap: SPACING[2],
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    gap: SPACING[3],
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT.primary,
    marginBottom: 2,
  },
  insightSubtitle: {
    fontSize: 12,
    color: TEXT.tertiary,
    lineHeight: 16,
  },
});
