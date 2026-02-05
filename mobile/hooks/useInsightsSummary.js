/**
 * useInsightsSummary Hook
 * Aggregates data from multiple sources for the simplified insights screen
 * Provides weekly/monthly summaries for Nutrition, Mood, Hydration, Activity
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from './useDashboard';
import { useMoodTrends } from './useMoodTrends';
import { useActivityLog } from './useActivityLog';
import apiClient from '../services/apiClient';

/**
 * Calculate percentage change between two values
 */
function calcChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get date range for period
 */
function getDateRange(period) {
  const now = new Date();
  const days = period === 'week' ? 7 : 30;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  return {
    days,
    startDate: startDate.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
}

/**
 * Hook for fetching water history
 */
function useWaterHistory(days) {
  const { startDate, endDate } = getDateRange(days === 7 ? 'week' : 'month');

  return useQuery({
    queryKey: ['waterHistory', startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get('/water/history', {
        params: { startDate, endDate, limit: 100 },
      });
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for fetching insights summary data
 * @param {string} period - 'week' or 'month'
 * @returns {Object} - Summary data for all metrics
 */
export function useInsightsSummary(period = 'week') {
  const { days } = getDateRange(period);

  // Fetch data from existing hooks
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboard();
  const { data: moodData, isLoading: moodLoading, refetch: refetchMood } = useMoodTrends({ days });
  const { weekData, weeklyProgress, isWeekLoading, refetch: refetchActivity } = useActivityLog();
  const { data: waterHistory, isLoading: waterLoading, refetch: refetchWater } = useWaterHistory(days);

  // Transform nutrition data
  const nutrition = useMemo(() => {
    if (!dashboard?.trends?.weekSummaries) {
      return { average: 0, dailyValues: [], changePercent: 0, unit: 'cal' };
    }

    const summaries = dashboard.trends.weekSummaries || [];
    const dailyValues = summaries.map(day => day.totalCalories || 0);

    const currentTotal = dailyValues.reduce((sum, val) => sum + val, 0);
    const average = dailyValues.length > 0 ? Math.round(currentTotal / dailyValues.length) : 0;

    // Get weekly averages for comparison
    const weeklyAvg = dashboard.trends?.weeklyAverages;
    const previousAvg = weeklyAvg?.prevWeekCalories || average;
    const changePercent = calcChange(average, previousAvg);

    return {
      average,
      dailyValues: dailyValues.slice(-7),
      changePercent,
      unit: 'cal',
      goal: dashboard.goals?.calories || 2000,
    };
  }, [dashboard]);

  // Transform mood data
  const mood = useMemo(() => {
    if (!moodData?.data || !Array.isArray(moodData.data)) {
      return { average: 0, dailyValues: [], changePercent: 0, unit: '/10' };
    }

    const entries = moodData.data;
    const dailyValues = entries.map(entry => entry.intensity || entry.mood || 0);

    const average = dailyValues.length > 0
      ? parseFloat((dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length).toFixed(1))
      : 0;

    // Calculate change vs previous period
    const halfPoint = Math.floor(dailyValues.length / 2);
    const recentHalf = dailyValues.slice(halfPoint);
    const olderHalf = dailyValues.slice(0, halfPoint);

    const recentAvg = recentHalf.length > 0
      ? recentHalf.reduce((sum, val) => sum + val, 0) / recentHalf.length
      : 0;
    const olderAvg = olderHalf.length > 0
      ? olderHalf.reduce((sum, val) => sum + val, 0) / olderHalf.length
      : 0;

    const changePercent = calcChange(recentAvg, olderAvg);

    return {
      average,
      dailyValues: dailyValues.slice(-7),
      changePercent,
      unit: '/10',
    };
  }, [moodData]);

  // Transform hydration data from water history API
  const hydration = useMemo(() => {
    const goal = dashboard?.goals?.waterLiters || 2.0;
    const todayWater = dashboard?.today?.waterIntakeLiters || 0;

    // Use dailyAggregates from water history API
    const dailyAggregates = waterHistory?.dailyAggregates || [];

    if (dailyAggregates.length === 0) {
      // Fallback to today's water only
      return {
        average: todayWater,
        dailyValues: todayWater > 0 ? [todayWater] : [],
        changePercent: 0,
        unit: 'L',
        goal,
      };
    }

    // Sort by date and extract hydration values
    const sortedAggregates = [...dailyAggregates].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );
    const dailyValues = sortedAggregates.map(day =>
      parseFloat((day.hydrationLiters || day.totalLiters || 0).toFixed(1))
    );

    const average = dailyValues.length > 0
      ? parseFloat((dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length).toFixed(1))
      : 0;

    // Calculate change: compare recent half to older half
    const halfPoint = Math.floor(dailyValues.length / 2);
    const recentHalf = dailyValues.slice(halfPoint);
    const olderHalf = dailyValues.slice(0, halfPoint);

    const recentAvg = recentHalf.length > 0
      ? recentHalf.reduce((sum, val) => sum + val, 0) / recentHalf.length
      : 0;
    const olderAvg = olderHalf.length > 0
      ? olderHalf.reduce((sum, val) => sum + val, 0) / olderHalf.length
      : average;

    const changePercent = calcChange(recentAvg, olderAvg);

    return {
      average,
      dailyValues: dailyValues.slice(-7),
      changePercent,
      unit: 'L',
      goal,
    };
  }, [waterHistory, dashboard]);

  // Transform activity data
  const activity = useMemo(() => {
    const dailyData = weekData || [];
    const dailyValues = dailyData.map(day => day.minutes || day.totalMinutes || 0);

    const totalMinutes = weeklyProgress?.weeklyMinutes ||
      dailyValues.reduce((sum, val) => sum + val, 0);
    const average = dailyValues.length > 0
      ? Math.round(totalMinutes / dailyValues.length)
      : 0;

    // Calculate change based on target progress
    const target = weeklyProgress?.target || 150;
    const progressPercent = Math.round((totalMinutes / target) * 100);
    const changePercent = progressPercent > 100 ? 100 : progressPercent - 50;

    return {
      average,
      dailyValues: dailyValues.slice(-7),
      changePercent: Math.round(changePercent / 5),
      unit: 'min',
      target,
      totalMinutes,
    };
  }, [weekData, weeklyProgress]);

  // Combined loading state
  const isLoading = dashboardLoading || moodLoading || isWeekLoading || waterLoading;

  // Refetch all data
  const refetch = async () => {
    await Promise.all([
      refetchDashboard(),
      refetchMood(),
      refetchActivity(),
      refetchWater(),
    ]);
  };

  return {
    nutrition,
    mood,
    hydration,
    activity,
    isLoading,
    refetch,
    period,
  };
}

export default useInsightsSummary;
