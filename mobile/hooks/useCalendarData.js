/**
 * useCalendarData - Shared hook for calendar/history data
 *
 * TIMEZONE HANDLING (CRITICAL):
 * - All date operations use DEVICE LOCAL timezone, never UTC
 * - Mobile sends X-Timezone-Offset header with every API request
 * - Backend uses this offset to calculate user's local day boundaries
 * - Dates are stored normalized to user's local midnight
 * - Mobile parses dates with local timezone methods (getFullYear, getMonth, getDate)
 * - Result: "today" always means the user's local today, not UTC today
 *
 * Transforms dashboard data into a calendar-friendly format with:
 * - Daily nutrition summaries
 * - Wellness scores
 * - Goal progress indicators
 * - Storyline generation
 *
 * Used by: Insights index, Dashboard calendar strip, History screens
 */

import { useMemo } from 'react';
import { useDashboard } from './useDashboard';
import { calculateFoodMoodScore, generateStoryLine } from '../utils/healthCalculations';

// ============================================================================
// HELPERS - ALL USE DEVICE LOCAL TIMEZONE (never UTC)
// ============================================================================

/**
 * Format date as YYYY-MM-DD key using DEVICE LOCAL timezone
 * IMPORTANT: Uses getFullYear/getMonth/getDate which are local timezone methods
 * DO NOT use toISOString() as it converts to UTC
 */
export const formatDateKey = (date) => {
  const d = new Date(date);
  // These methods return local timezone values, not UTC
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date key in DEVICE LOCAL timezone
 */
export const getTodayKey = () => formatDateKey(new Date());

/**
 * Get date range for a timeframe
 * @param {'daily' | 'weekly' | 'monthly'} timeframe
 * @returns {{ start: Date, end: Date, days: number }}
 */
export function getTimeframeRange(timeframe) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (timeframe) {
    case 'daily':
      return { start: today, end: today, days: 1 };

    case 'weekly':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6); // Last 7 days
      return { start: weekStart, end: today, days: 7 };

    case 'monthly':
      const monthStart = new Date(today);
      monthStart.setDate(today.getDate() - 29); // Last 30 days
      return { start: monthStart, end: today, days: 30 };

    default:
      return { start: today, end: today, days: 1 };
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * useCalendarData - Transform dashboard data into calendar format
 *
 * @param {Object} options
 * @param {'daily' | 'weekly' | 'monthly'} options.timeframe - Current timeframe filter
 * @returns {Object} Calendar data and metadata
 */
export function useCalendarData(options = {}) {
  const { timeframe = 'weekly' } = options;

  // Get dashboard data
  const { data: dashboard, isLoading, error, refetch } = useDashboard();

  // Extract goals from dashboard
  const goals = useMemo(() => {
    if (!dashboard?.goals) return {
      calorieGoal: 2000,
      proteinGoal: 150,
      carbsGoal: 250,
      fatGoal: 65,
      waterGoal: 2.0,
    };

    const g = dashboard.goals;
    return {
      calorieGoal: g.dailyCalories || 2000,
      proteinGoal: g.proteinG || 150,
      carbsGoal: g.carbsG || 250,
      fatGoal: g.fatsG || 65,
      waterGoal: parseFloat(g.waterLiters) || 2.0,
    };
  }, [dashboard?.goals]);

  // Build calendar data from dashboard response
  const calendarData = useMemo(() => {
    if (!dashboard) return {};

    const calData = {};
    const todayKey = getTodayKey();
    const { calorieGoal, proteinGoal, waterGoal } = goals;

    // Process today's data
    if (dashboard.today) {
      const { nutrition, foodLogs, moodLogs, waterIntakeLiters } = dashboard.today;
      const totalCals = nutrition?.totalCalories || 0;
      const totalProtein = nutrition?.totalProtein || 0;
      const totalCarbs = nutrition?.totalCarbs || 0;
      const totalFat = nutrition?.totalFats || 0;
      const totalFiber = nutrition?.totalFiber || 0;
      const waterIntake = parseFloat(waterIntakeLiters) || 0;
      const hydrationPercent = Math.min((waterIntake / waterGoal) * 100, 100);
      const moodAvg = moodLogs?.length > 0
        ? moodLogs.reduce((sum, log) => sum + (log.intensity ?? 5), 0) / moodLogs.length
        : null;
      const goalReached = totalCals >= (calorieGoal * 0.9) && totalCals <= (calorieGoal * 1.1);

      // Calculate wellness score
      const foodMoodScore = calculateFoodMoodScore({
        calories: totalCals,
        calorieGoal,
        protein: totalProtein,
        proteinGoal,
        hydrationPercent,
        micronutrientCount: 0,
        moodIntensity: moodAvg,
      });

      // Generate storyline
      const storyLine = generateStoryLine({
        calories: totalCals,
        calorieGoal,
        meals: foodLogs?.length || 0,
        goalReached,
        moodAvg,
        hydrationPercent,
        protein: totalProtein,
        proteinGoal,
      });

      calData[todayKey] = {
        date: todayKey,
        calories: totalCals,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        fiber: totalFiber,
        meals: foodLogs?.length || 0,
        goalReached,
        logged: (foodLogs?.length || 0) > 0,
        moodAvg,
        hydrationPercent,
        proteinGoal,
        foodCount: foodLogs?.length || 0,
        moodCount: moodLogs?.length || 0,
        water: waterIntake,
        foodMoodScore,
        storyLine,
        isToday: true,
      };
    }

    // Process week summaries (historical data)
    if (dashboard.trends?.weekSummaries) {
      dashboard.trends.weekSummaries.forEach(summary => {
        const key = formatDateKey(summary.date);
        if (key === todayKey) return; // Skip today, already processed

        const totalCals = summary.totalCalories || 0;
        const totalProtein = summary.totalProtein || 0;
        const goalReached = totalCals >= (calorieGoal * 0.9) && totalCals <= (calorieGoal * 1.1);

        // Calculate partial wellness score (without mood/water since not available for history)
        const foodMoodScore = calculateFoodMoodScore({
          calories: totalCals,
          calorieGoal,
          protein: totalProtein,
          proteinGoal,
          hydrationPercent: 0,
          micronutrientCount: 0,
          moodIntensity: null,
        });

        // Generate storyline
        const storyLine = generateStoryLine({
          calories: totalCals,
          calorieGoal,
          meals: summary.mealCount || 0,
          goalReached,
          moodAvg: null,
          hydrationPercent: 0,
          protein: totalProtein,
          proteinGoal,
        });

        calData[key] = {
          date: key,
          calories: totalCals,
          protein: totalProtein,
          carbs: 0, // Not available in summary
          fat: 0,
          fiber: 0,
          meals: summary.mealCount || 0,
          goalReached,
          logged: totalCals > 0,
          protein: totalProtein,
          proteinGoal,
          foodCount: summary.mealCount || 0,
          moodCount: 0,
          moodAvg: null,
          hydrationPercent: 0,
          water: 0,
          foodMoodScore,
          storyLine,
          isToday: false,
        };
      });
    }

    // Ensure today exists
    if (!calData[todayKey]) {
      calData[todayKey] = {
        date: todayKey,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        meals: 0,
        goalReached: false,
        logged: false,
        moodAvg: null,
        hydrationPercent: 0,
        foodCount: 0,
        moodCount: 0,
        isToday: true,
      };
    }

    return calData;
  }, [dashboard, goals]);

  // Filter data by timeframe
  const filteredData = useMemo(() => {
    const range = getTimeframeRange(timeframe);
    const filtered = {};

    Object.entries(calendarData).forEach(([key, data]) => {
      const date = new Date(key);
      if (date >= range.start && date <= range.end) {
        filtered[key] = data;
      }
    });

    return filtered;
  }, [calendarData, timeframe]);

  // Calculate aggregated stats for the timeframe
  const aggregatedStats = useMemo(() => {
    const entries = Object.values(filteredData);
    if (entries.length === 0) {
      return {
        totalCalories: 0,
        avgCalories: 0,
        totalProtein: 0,
        avgProtein: 0,
        totalMeals: 0,
        daysLogged: 0,
        daysOnGoal: 0,
        goalSuccessRate: 0,
        avgWellnessScore: 0,
      };
    }

    const daysLogged = entries.filter(e => e.logged).length;
    const daysOnGoal = entries.filter(e => e.goalReached).length;
    const totalCalories = entries.reduce((sum, e) => sum + (e.calories || 0), 0);
    const totalProtein = entries.reduce((sum, e) => sum + (e.protein || 0), 0);
    const totalMeals = entries.reduce((sum, e) => sum + (e.meals || 0), 0);
    const avgWellnessScore = entries.reduce((sum, e) => sum + (e.foodMoodScore || 0), 0) / entries.length;

    return {
      totalCalories: Math.round(totalCalories),
      avgCalories: Math.round(totalCalories / Math.max(daysLogged, 1)),
      totalProtein: Math.round(totalProtein),
      avgProtein: Math.round(totalProtein / Math.max(daysLogged, 1)),
      totalMeals,
      daysLogged,
      daysOnGoal,
      goalSuccessRate: daysLogged > 0 ? Math.round((daysOnGoal / daysLogged) * 100) : 0,
      avgWellnessScore: Math.round(avgWellnessScore),
    };
  }, [filteredData]);

  // Get today's data specifically
  const today = useMemo(() => {
    return calendarData[getTodayKey()] || null;
  }, [calendarData]);

  return {
    // Raw calendar data (all dates)
    calendarData,

    // Filtered by current timeframe
    filteredData,

    // Aggregated stats for timeframe
    aggregatedStats,

    // Today's data specifically
    today,

    // Goals
    goals,

    // Current streak from dashboard
    currentStreak: dashboard?.trends?.currentStreak || 0,

    // Loading/error states
    isLoading,
    error,
    refetch,

    // Helpers
    formatDateKey,
    getTodayKey,
    getTimeframeRange,
  };
}

export default useCalendarData;
