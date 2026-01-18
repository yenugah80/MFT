/**
 * useWellnessHistory Hook
 *
 * Fetches and aggregates wellness data for the Wellness Journey screen.
 * Calculates daily wellness scores across 4 domains: Food, Mood, Hydration, Activity.
 *
 * Data Sources:
 * - /nutrition/dashboard - today's comprehensive data
 * - /nutrition/summary - historical nutrition summaries
 * - /water/history - water logs
 * - /mood/history - mood entries
 * - /activity/history - activity logs
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import apiClient from '../services/apiClient';
import { calculateFoodMoodScore, detectPatterns } from '../utils/foodMoodScore';

// Day names for display
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Check if two dates are the same day
 */
function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Get start of day for a date
 */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get array of last N days (including today)
 */
function getLastNDays(n) {
  const days = [];
  const today = startOfDay(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    days.push(day);
  }
  return days;
}

/**
 * Aggregate logs by day
 */
function aggregateByDay(logs, dateField = 'loggedDate') {
  const byDay = {};
  logs.forEach(log => {
    const date = startOfDay(new Date(log[dateField] || log.timestamp || log.createdAt)).toISOString();
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(log);
  });
  return byDay;
}

/**
 * Fetch all wellness data in parallel
 */
async function fetchWellnessData(days = 7) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  try {
    const [dashboard, nutritionSummary, waterHistory, moodHistory, activityHistory] = await Promise.all([
      apiClient.get('/nutrition/dashboard').catch(() => null),
      apiClient.get('/nutrition/summary', { params: { startDate: startISO, endDate: endISO, limit: days } }).catch(() => []),
      apiClient.get('/water/history', { params: { startDate: startISO, endDate: endISO, limit: days * 10 } }).catch(() => ({ logs: [] })),
      apiClient.get('/mood/history', { params: { startDate: startISO, endDate: endISO, limit: days * 5 } }).catch(() => []),
      apiClient.get('/activity/history', { params: { days } }).catch(() => ({ activities: [] })),
    ]);

    return {
      dashboard: dashboard || {},
      nutritionSummary: Array.isArray(nutritionSummary) ? nutritionSummary : [],
      waterLogs: waterHistory?.logs || [],
      moodLogs: Array.isArray(moodHistory) ? moodHistory : [],
      activityLogs: activityHistory?.activities || [],
    };
  } catch (error) {
    console.error('[useWellnessHistory] Fetch error:', error);
    return {
      dashboard: {},
      nutritionSummary: [],
      waterLogs: [],
      moodLogs: [],
      activityLogs: [],
    };
  }
}

/**
 * Calculate wellness score for a specific day
 */
function calculateDayScore(dayData, goals) {
  const { foodLogs, moodLogs, waterLogs, activityLogs } = dayData;

  // Aggregate nutrition from food logs
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  let totalFiber = 0;

  foodLogs.forEach(log => {
    totalCalories += log.calories || 0;
    totalProtein += log.protein || 0;
    totalCarbs += log.carbs || 0;
    totalFats += log.fats || log.fat || 0;
    totalFiber += log.fiber || 0;
  });

  // Aggregate water from water logs
  let totalWater = 0;
  waterLogs.forEach(log => {
    totalWater += parseFloat(log.amountLiters || log.hydrationLiters || 0);
  });

  // Aggregate activity
  let totalActivityMinutes = 0;
  const activityTypes = new Set();
  activityLogs.forEach(log => {
    totalActivityMinutes += log.durationMinutes || log.duration || 0;
    if (log.type || log.activityType) {
      activityTypes.add(log.type || log.activityType);
    }
  });

  return calculateFoodMoodScore({
    calories: totalCalories,
    calorieGoal: goals.dailyCalories || 2000,
    protein: totalProtein,
    proteinGoal: goals.proteinG || 150,
    carbs: totalCarbs,
    carbsGoal: goals.carbsG || 250,
    fats: totalFats,
    fatsGoal: goals.fatsG || 65,
    fiber: totalFiber,
    fiberGoal: 30,
    waterIntake: totalWater,
    waterGoal: goals.waterLiters || 2.5,
    moodLogs,
    meals: foodLogs,
    activityMinutes: totalActivityMinutes,
    activityGoal: goals.activityMinutes || 30,
    activityTypes: Array.from(activityTypes),
  });
}

/**
 * Main hook for wellness history data
 */
export function useWellnessHistory({ days = 7 } = {}) {
  const query = useQuery({
    queryKey: ['wellness-history', days],
    queryFn: () => fetchWellnessData(days),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  const processedData = useMemo(() => {
    // Generate default week data with correct structure
    const defaultWeekData = getLastNDays(days).map((date) => {
      const dayOfWeek = date.getDay();
      return {
        date,
        dayName: DAY_NAMES[dayOfWeek],
        dayShort: DAY_NAMES_SHORT[dayOfWeek],
        score: null,
        breakdown: null,
        hasData: false,
        isToday: isSameDay(date, new Date()),
        isFuture: date > new Date(),
      };
    });

    if (!query.data) {
      return {
        todayScore: null,
        weekData: defaultWeekData,
        weekAverage: 0,
        personalBests: { highestScore: 0, highestDate: '--', currentStreak: 0, improvement: 0 },
        recommendations: [],
        patterns: [],
        hasData: false,
      };
    }

    const { dashboard, nutritionSummary, waterLogs, moodLogs, activityLogs } = query.data;
    const goals = dashboard?.goals || {};
    const trends = dashboard?.trends || {};

    // Get last N days
    const dayDates = getLastNDays(days);

    // Aggregate logs by day
    const waterByDay = aggregateByDay(waterLogs, 'loggedDate');
    const moodByDay = aggregateByDay(moodLogs, 'loggedDate');
    const activityByDay = aggregateByDay(activityLogs, 'timestamp');

    // Build nutrition map from summary
    const nutritionByDay = {};
    nutritionSummary.forEach(summary => {
      const date = startOfDay(new Date(summary.date)).toISOString();
      nutritionByDay[date] = summary;
    });

    // Calculate score for each day
    const weekData = dayDates.map((date, index) => {
      const dateKey = date.toISOString();
      const dayOfWeek = date.getDay();
      const isToday = isSameDay(date, new Date());

      // Get nutrition from summary or dashboard (for today)
      let foodLogs = [];
      if (isToday && dashboard?.today?.foodLogs) {
        foodLogs = dashboard.today.foodLogs;
      } else if (nutritionByDay[dateKey]) {
        // Create synthetic food log from summary
        const summary = nutritionByDay[dateKey];
        foodLogs = [{
          calories: summary.totalCalories || 0,
          protein: summary.totalProtein || 0,
          carbs: summary.totalCarbs || 0,
          fats: summary.totalFats || 0,
          fiber: summary.totalFiber || 0,
        }];
      }

      const dayData = {
        foodLogs,
        waterLogs: waterByDay[dateKey] || (isToday && dashboard?.today?.waterIntakeLiters ? [{ amountLiters: dashboard.today.waterIntakeLiters }] : []),
        moodLogs: moodByDay[dateKey] || [],
        activityLogs: activityByDay[dateKey] || [],
      };

      const hasAnyData = foodLogs.length > 0 || dayData.waterLogs.length > 0 || dayData.moodLogs.length > 0 || dayData.activityLogs.length > 0;

      if (!hasAnyData) {
        return {
          date,
          dayName: DAY_NAMES[dayOfWeek],
          dayShort: DAY_NAMES_SHORT[dayOfWeek],
          score: null,
          breakdown: null,
          hasData: false,
          isToday,
          isFuture: date > new Date(),
        };
      }

      const scoreResult = calculateDayScore(dayData, goals);

      return {
        date,
        dayName: DAY_NAMES[dayOfWeek],
        dayShort: DAY_NAMES_SHORT[dayOfWeek],
        score: scoreResult.score,
        breakdown: scoreResult.breakdown,
        tier: scoreResult.tier,
        label: scoreResult.label,
        color: scoreResult.color,
        recommendations: scoreResult.recommendations,
        weakestDomain: scoreResult.weakestDomain,
        strongestDomain: scoreResult.strongestDomain,
        hasData: true,
        isToday,
        isFuture: false,
        // Raw data for day detail modal
        rawData: dayData,
      };
    });

    // Calculate today's score
    const todayData = weekData.find(d => d.isToday);
    const todayScore = todayData?.hasData ? todayData : null;

    // Calculate personal bests
    const validScores = weekData.filter(d => d.hasData && d.score !== null);
    const scores = validScores.map(d => d.score);

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const highestDay = validScores.find(d => d.score === highestScore);

    const weekAverage = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Calculate improvement vs last week (simplified - compare first half to second half)
    const midpoint = Math.floor(validScores.length / 2);
    const firstHalf = validScores.slice(0, midpoint);
    const secondHalf = validScores.slice(midpoint);
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b.score, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b.score, 0) / secondHalf.length : 0;
    const improvement = firstHalfAvg > 0 ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 0;

    // Detect patterns
    const patterns = detectPatterns({
      foodLogs: dashboard?.today?.foodLogs || [],
      moodLogs: moodLogs,
      waterLogs: waterLogs,
      days,
    });

    // Get recommendations from today's score or weakest domain
    const recommendations = todayScore?.recommendations || [];

    return {
      todayScore,
      weekData,
      weekAverage,
      personalBests: {
        highestScore,
        highestDate: highestDay?.dayName || '--',
        currentStreak: trends.currentStreak || dashboard?.gamification?.streak || 0,
        improvement,
      },
      recommendations,
      patterns: patterns.slice(0, 3),
      hasData: validScores.length > 0,
      goals,
    };
  }, [query.data, days]);

  return {
    ...processedData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useWellnessHistory;
