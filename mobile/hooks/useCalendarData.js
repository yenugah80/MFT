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
 * - Wellness scores (all 4 domains: Food, Mood, Hydration, Activity)
 * - Goal progress indicators
 * - Storyline generation
 *
 * DATA SOURCES:
 * - /nutrition/dashboard - today's comprehensive data
 * - /water/history - historical water logs
 * - /mood/history - historical mood entries
 * - /activity/history - historical activity logs
 *
 * Used by: Insights index, Dashboard calendar strip, History screens
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from './useDashboard';
import apiClient from '../services/apiClient';
import { calculateWellnessScore, generateStoryLine } from '../utils/healthCalculations';

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

/**
 * Aggregate logs by date key
 */
function aggregateLogsByDay(logs, dateField = 'loggedDate') {
  const byDay = {};
  if (!logs || !Array.isArray(logs)) return byDay;

  logs.forEach(log => {
    const logDate = new Date(log[dateField] || log.timestamp || log.createdAt);
    const key = formatDateKey(logDate);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(log);
  });
  return byDay;
}

/**
 * Fetch historical wellness data (water, mood, activity, AND nutrition)
 */
async function fetchHistoricalData(days = 7) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  try {
    const [waterHistory, moodHistory, activityHistory, nutritionHistory] = await Promise.all([
      apiClient.get('/water/history', { params: { startDate: startISO, endDate: endISO, limit: days * 10 } }).catch(() => ({ logs: [] })),
      apiClient.get('/mood/history', { params: { startDate: startISO, endDate: endISO, limit: days * 5 } }).catch(() => []),
      apiClient.get('/activity/history', { params: { days } }).catch(() => ({ activities: [] })),
      // Fetch nutrition summaries for full date range (not just 7 days from dashboard)
      apiClient.get('/nutrition/summary', { params: { startDate: startISO, endDate: endISO, limit: days } }).catch(() => []),
    ]);

    return {
      waterLogs: waterHistory?.logs || [],
      moodLogs: Array.isArray(moodHistory) ? moodHistory : [],
      activityLogs: activityHistory?.activities || [],
      nutritionSummaries: Array.isArray(nutritionHistory) ? nutritionHistory : [],
    };
  } catch (error) {
    console.error('[useCalendarData] Historical fetch error:', error);
    return { waterLogs: [], moodLogs: [], activityLogs: [], nutritionSummaries: [] };
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
  const { timeframe = 'weekly', days: customDays } = options;

  // Get dashboard data (includes today + nutrition week summaries)
  const { data: dashboard, isLoading: dashboardLoading, error, refetch: refetchDashboard } = useDashboard();

  // Fetch historical water, mood, activity data separately
  // Support custom days for 90D view, otherwise use timeframe
  const historyDays = customDays || (timeframe === 'monthly' ? 30 : timeframe === 'quarterly' ? 90 : 7);
  const { data: historicalData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['calendar-history', historyDays],
    queryFn: () => fetchHistoricalData(historyDays),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });

  const isLoading = dashboardLoading || historyLoading;
  const refetch = async () => {
    await Promise.all([refetchDashboard(), refetchHistory()]);
  };

  // Aggregate historical logs by date
  const { waterByDay, moodByDay, activityByDay, nutritionByDay } = useMemo(() => {
    if (!historicalData) return { waterByDay: {}, moodByDay: {}, activityByDay: {}, nutritionByDay: {} };

    // Aggregate nutrition summaries by date (they're already daily summaries)
    const nutritionByDay = {};
    (historicalData.nutritionSummaries || []).forEach(summary => {
      const key = formatDateKey(summary.date);
      nutritionByDay[key] = summary;
    });

    return {
      waterByDay: aggregateLogsByDay(historicalData.waterLogs, 'loggedDate'),
      moodByDay: aggregateLogsByDay(historicalData.moodLogs, 'loggedDate'),
      activityByDay: aggregateLogsByDay(historicalData.activityLogs, 'timestamp'),
      nutritionByDay,
    };
  }, [historicalData]);

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
      const wellnessScore = calculateWellnessScore({
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
        wellnessScore,
        storyLine,
        isToday: true,
      };
    }

    // Process ALL historical nutrition summaries (not just 7-day weekSummaries)
    // This provides accurate data for 30D/60D/90D views
    Object.entries(nutritionByDay).forEach(([key, summary]) => {
      if (key === todayKey) return; // Skip today, already processed

      const totalCals = summary.totalCalories || 0;
      const totalProtein = summary.totalProtein || 0;
      const totalCarbs = summary.totalCarbs || 0;
      const totalFats = summary.totalFats || 0;
      const goalReached = totalCals >= (calorieGoal * 0.9) && totalCals <= (calorieGoal * 1.1);

      // Get historical water, mood, activity for this day
      const dayWaterLogs = waterByDay[key] || [];
      const dayMoodLogs = moodByDay[key] || [];
      const dayActivityLogs = activityByDay[key] || [];

      // Calculate water intake (logs are in liters)
      const waterIntake = dayWaterLogs.reduce((sum, log) =>
        sum + parseFloat(log.amountLiters || log.hydrationLiters || 0), 0);
      const hydrationPercent = Math.min((waterIntake / waterGoal) * 100, 100);

      // Calculate mood average
      const moodAvg = dayMoodLogs.length > 0
        ? dayMoodLogs.reduce((sum, log) => sum + (log.intensity ?? 5), 0) / dayMoodLogs.length
        : null;

      // Calculate activity minutes
      const activityMinutes = dayActivityLogs.reduce((sum, log) =>
        sum + (log.durationMinutes || log.duration || 0), 0);

      // Calculate COMPLETE wellness score with all 4 domains
      const wellnessScore = calculateWellnessScore({
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
        meals: summary.mealCount || 0,
        goalReached,
        moodAvg,
        hydrationPercent,
        protein: totalProtein,
        proteinGoal,
      });

      calData[key] = {
        date: key,
        calories: totalCals,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFats,
        fiber: 0,
        meals: summary.mealCount || 0,
        goalReached,
        logged: totalCals > 0 || dayWaterLogs.length > 0 || dayMoodLogs.length > 0 || dayActivityLogs.length > 0,
        proteinGoal,
        foodCount: summary.mealCount || 0,
        moodCount: dayMoodLogs.length,
        moodAvg,
        hydrationPercent,
        water: waterIntake,
        activityMinutes,
        activityCount: dayActivityLogs.length,
        wellnessScore,
        storyLine,
        isToday: false,
      };
    });

    // Also add days with water/mood/activity but no food logged
    const allHistoricalDays = new Set([
      ...Object.keys(waterByDay),
      ...Object.keys(moodByDay),
      ...Object.keys(activityByDay),
    ]);

    allHistoricalDays.forEach(key => {
      if (key === todayKey || calData[key]) return; // Skip if already processed

      const dayWaterLogs = waterByDay[key] || [];
      const dayMoodLogs = moodByDay[key] || [];
      const dayActivityLogs = activityByDay[key] || [];

      if (dayWaterLogs.length === 0 && dayMoodLogs.length === 0 && dayActivityLogs.length === 0) return;

      const waterIntake = dayWaterLogs.reduce((sum, log) =>
        sum + parseFloat(log.amountLiters || log.hydrationLiters || 0), 0);
      const hydrationPercent = Math.min((waterIntake / waterGoal) * 100, 100);

      const moodAvg = dayMoodLogs.length > 0
        ? dayMoodLogs.reduce((sum, log) => sum + (log.intensity ?? 5), 0) / dayMoodLogs.length
        : null;

      const activityMinutes = dayActivityLogs.reduce((sum, log) =>
        sum + (log.durationMinutes || log.duration || 0), 0);

      const wellnessScore = calculateWellnessScore({
        calories: 0,
        calorieGoal,
        protein: 0,
        proteinGoal,
        hydrationPercent,
        micronutrientCount: 0,
        moodIntensity: moodAvg,
      });

      calData[key] = {
        date: key,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        meals: 0,
        goalReached: false,
        logged: true, // Has water/mood/activity data
        proteinGoal,
        foodCount: 0,
        moodCount: dayMoodLogs.length,
        moodAvg,
        hydrationPercent,
        water: waterIntake,
        activityMinutes,
        activityCount: dayActivityLogs.length,
        wellnessScore,
        storyLine: null,
        isToday: false,
      };
    });

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
  }, [dashboard, goals, waterByDay, moodByDay, activityByDay, nutritionByDay]);

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
    const avgWellnessScore = entries.reduce((sum, e) => sum + (e.wellnessScore || 0), 0) / entries.length;

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
