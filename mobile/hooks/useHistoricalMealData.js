/**
 * useHistoricalMealData - Hook for fetching historical meal statistics
 *
 * Provides real data for meal comparison insights:
 * - Weekly average calories/protein
 * - Yesterday's same meal type
 * - Monthly trend (increasing/decreasing/stable)
 * - Meal type averages
 *
 * Used by MealComparisonCard to show meaningful comparisons.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Fetch historical meal statistics from backend
 * @param {string} mealType - Optional meal type to get yesterday's comparison
 * @returns {object} Historical stats data
 */
const fetchHistoricalStats = async (mealType) => {
  const params = mealType ? { mealType } : {};
  const response = await apiClient.get('/nutrition/history-stats', { params });
  return response;
};

/**
 * Hook to get historical meal data for comparisons
 *
 * @param {object} options
 * @param {string} options.mealType - Meal type for yesterday comparison (breakfast, lunch, dinner, snack)
 * @param {boolean} options.enabled - Whether to fetch data (default: true)
 * @returns {object} Query result with data, loading, error states
 *
 * @example
 * const { data: historyStats, isLoading } = useHistoricalMealData({ mealType: 'lunch' });
 * // Returns:
 * // {
 * //   weeklyAverage: { calories: 450, protein: 22, carbs: 55, fat: 18 },
 * //   yesterdaySameMeal: { calories: 520, protein: 28 },
 * //   monthlyTrend: 'increasing' | 'decreasing' | 'stable',
 * //   mealTypeAverage: { breakfast: 380, lunch: 550, dinner: 620, snack: 200 },
 * //   similarFoods: [],
 * //   dataPoints: { weekLogs: 15, monthLogs: 45 }
 * // }
 */
export function useHistoricalMealData({ mealType, enabled = true } = {}) {
  return useQuery({
    queryKey: ['historicalMealStats', mealType],
    queryFn: () => fetchHistoricalStats(mealType),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change frequently
    cacheTime: 30 * 60 * 1000, // 30 minutes cache
    refetchOnWindowFocus: false,
    retry: 2,
    // Provide default/fallback data while loading or on error
    placeholderData: {
      weeklyAverage: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      yesterdaySameMeal: null,
      monthlyTrend: 'stable',
      mealTypeAverage: {},
      similarFoods: [],
      dataPoints: { weekLogs: 0, monthLogs: 0 },
      // Timing insights fields
      lastMealTime: null,
      mealsToday: 0,
    },
  });
}

/**
 * Transform historical data into the format expected by MealComparisonCard
 *
 * @param {object} historyStats - Raw stats from API
 * @returns {object} Formatted data for MealComparisonCard
 */
export function formatHistoricalDataForComparison(historyStats) {
  if (!historyStats) {
    return null;
  }

  return {
    weeklyAverage: historyStats.weeklyAverage || { calories: 0, protein: 0 },
    yesterdaySameMeal: historyStats.yesterdaySameMeal,
    monthlyTrend: historyStats.monthlyTrend || 'stable',
    mealTypeAverage: historyStats.mealTypeAverage || {},
    similarFoods: historyStats.similarFoods || [],
    // Timing insights data
    lastMealTime: historyStats.lastMealTime || null,
    mealsToday: historyStats.mealsToday || 0,
  };
}

export default useHistoricalMealData;
