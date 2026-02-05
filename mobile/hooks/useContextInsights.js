/**
 * useContextInsights Hook
 *
 * Provides context-aware insights based on:
 * - Time of day
 * - Weather conditions
 * - User's activity and mood
 * - Nutritional patterns
 *
 * Features:
 * - Weather integration
 * - Time-based recommendations
 * - Personalized insights
 * - Goal adjustments
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import { useDashboard } from './useDashboard';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const CONTEXT_KEYS = {
  weather: ['context', 'weather'],
  insights: ['context', 'insights'],
  recommendations: ['context', 'recommendations'],
};

// ============================================================================
// TIME OF DAY HELPER
// ============================================================================

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getMealType() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 21) return 'dinner';
  return 'snack';
}

// ============================================================================
// WEATHER HOOK
// ============================================================================

/**
 * Get current weather conditions
 */
export function useWeather(options = {}) {
  return useQuery({
    queryKey: CONTEXT_KEYS.weather,
    queryFn: async () => {
      try {
        const response = await apiClient.get('/context/weather');
        return response.data;
      } catch (error) {
        // Return default weather if API fails
        return {
          condition: 'sunny',
          temperature: 72,
          humidity: 50,
          description: 'Clear sky',
        };
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    ...options,
  });
}

// ============================================================================
// CONTEXT INSIGHTS HOOK
// ============================================================================

/**
 * Get contextual insights from backend
 */
export function useContextualInsights(options = {}) {
  return useQuery({
    queryKey: CONTEXT_KEYS.insights,
    queryFn: async () => {
      const response = await apiClient.get('/context/insights');
      return response.data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Combined context insights hook
 */
export function useContextInsights() {
  // Get dashboard data for user state
  const { data: dashboardData, isLoading: isDashboardLoading } = useDashboard();

  // Get weather data
  const { data: weatherData, isLoading: isWeatherLoading } = useWeather();

  // Compute time-based context
  const timeContext = useMemo(() => ({
    timeOfDay: getTimeOfDay(),
    mealType: getMealType(),
    hour: new Date().getHours(),
    isWeekend: [0, 6].includes(new Date().getDay()),
  }), []);

  // Compute weather context
  const weatherContext = useMemo(() => {
    if (!weatherData) return null;

    const { condition, temperature } = weatherData;

    // Determine weather category
    let weatherCategory = 'sunny';
    if (condition?.includes('rain') || condition?.includes('storm')) {
      weatherCategory = 'rainy';
    } else if (condition?.includes('cloud') || condition?.includes('overcast')) {
      weatherCategory = 'cloudy';
    } else if (temperature < 50) {
      weatherCategory = 'cold';
    } else if (temperature > 85) {
      weatherCategory = 'hot';
    }

    return {
      condition: weatherCategory,
      temperature,
      rawCondition: condition,
    };
  }, [weatherData]);

  // Compute user state context
  const userContext = useMemo(() => {
    if (!dashboardData) return null;

    const { summary, hydration, gamification } = dashboardData;

    return {
      // Hydration
      waterIntake: hydration?.current || 0,
      waterGoal: hydration?.goal || 2000,
      hydrationPercent: hydration?.goal
        ? Math.round((hydration.current / hydration.goal) * 100)
        : 0,

      // Nutrition progress
      caloriesConsumed: summary?.calories || 0,
      caloriesGoal: summary?.caloriesGoal || 2000,
      caloriesRemaining: (summary?.caloriesGoal || 2000) - (summary?.calories || 0),

      // Streak and gamification
      streak: gamification?.streak || 0,
      hasLoggedToday: gamification?.hasLoggedToday || false,

      // Mood (from last log if available)
      lastMood: dashboardData?.lastMood || null,
    };
  }, [dashboardData]);

  // Generate contextual suggestions
  const suggestions = useMemo(() => {
    const items = [];
    const { timeOfDay, mealType, hour } = timeContext;

    // Time-based meal suggestion
    items.push({
      type: 'meal',
      title: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Time`,
      description: getMealTip(timeOfDay),
      priority: 'high',
      mealType,
    });

    // Weather-based suggestion
    if (weatherContext) {
      items.push({
        type: 'weather',
        title: 'Weather Tip',
        description: getWeatherTip(weatherContext.condition, weatherContext.temperature),
        priority: 'medium',
        weather: weatherContext,
      });
    }

    // Hydration reminder
    if (userContext && userContext.hydrationPercent < 75) {
      const glassesNeeded = Math.ceil((userContext.waterGoal - userContext.waterIntake) / 250);
      items.push({
        type: 'hydration',
        title: 'Stay Hydrated',
        description: `${glassesNeeded} more glass${glassesNeeded > 1 ? 'es' : ''} to reach your goal`,
        priority: userContext.hydrationPercent < 50 ? 'high' : 'medium',
        progress: userContext.hydrationPercent,
      });
    }

    // Mood check if not logged today (afternoon onwards)
    if (hour >= 12 && userContext && !userContext.lastMood) {
      items.push({
        type: 'mood',
        title: 'How are you feeling?',
        description: 'Log your mood for personalized recommendations',
        priority: 'low',
      });
    }

    // Streak reminder if at risk
    if (userContext && userContext.streak > 0 && !userContext.hasLoggedToday && hour >= 18) {
      items.push({
        type: 'streak',
        title: 'Keep Your Streak!',
        description: `Log a meal to maintain your ${userContext.streak} day streak`,
        priority: 'high',
      });
    }

    return items.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [timeContext, weatherContext, userContext]);

  // Generate greeting message
  const greeting = useMemo(() => {
    const greetings = {
      morning: 'Good Morning',
      afternoon: 'Good Afternoon',
      evening: 'Good Evening',
      night: 'Good Night',
    };
    return greetings[timeContext.timeOfDay];
  }, [timeContext.timeOfDay]);

  return {
    // Context data
    timeOfDay: timeContext.timeOfDay,
    mealType: timeContext.mealType,
    isWeekend: timeContext.isWeekend,
    weather: weatherContext,
    userState: userContext,

    // Computed values
    greeting,
    suggestions,

    // Hydration shortcuts
    waterIntake: userContext?.waterIntake || 0,
    waterGoal: userContext?.waterGoal || 2000,

    // Loading state
    isLoading: isDashboardLoading || isWeatherLoading,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getMealTip(timeOfDay) {
  const tips = {
    morning: 'Start your day with protein for sustained energy.',
    afternoon: 'Balanced lunch keeps afternoon slumps away.',
    evening: 'Lighter dinners promote better sleep quality.',
    night: 'If hungry, choose light, sleep-friendly snacks.',
  };
  return tips[timeOfDay];
}

function getWeatherTip(condition, temperature) {
  const tips = {
    sunny: 'Stay hydrated! Perfect day for outdoor activities.',
    cloudy: 'Comfort food weather! Try warm, nourishing meals.',
    rainy: 'Cozy up with warm soups and hot drinks.',
    cold: 'Warm foods help maintain body temperature.',
    hot: 'Light meals and extra hydration recommended!',
  };
  return tips[condition] || tips.sunny;
}

export default useContextInsights;
