/**
 * useInsightsSummary Hook
 *
 * Aggregates Nutrition, Mood, Hydration and Activity for the Insights screen.
 * Every metric is summarised the same way (see utils/insightsSummary.js): a
 * period of `days` calendar days compared against the `days` before it, with
 * nulls — not zeros — where there is no data or nothing to compare against.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from './useDashboard';
import { useMoodInsights } from './useMoodInsights';
import { useActivityLog } from './useActivityLog';
import apiClient from '../services/apiClient';
import {
  summariseCumulative,
  summariseMoodSeries,
  summariseActivityHistory,
} from '../utils/insightsSummary';

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
 * Water history covering two periods so the trend is a real comparison
 */
function useWaterHistory(days) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days * 2);

  const start = startDate.toISOString().split('T')[0];
  const end = now.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['waterHistory', start, end],
    queryFn: async () => {
      const response = await apiClient.get('/water/history', {
        params: { startDate: start, endDate: end, limit: 500 },
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
  // Two periods of mood days so the comparison has a baseline
  const { data: moodData, isLoading: moodLoading, refetch: refetchMood } = useMoodInsights({
    windowDays: days * 2,
    trendDays: days * 2,
  });
  const { weeklyProgress, fetchHistory, refetch: refetchActivity } = useActivityLog();
  const { data: waterHistory, isLoading: waterLoading, refetch: refetchWater } = useWaterHistory(days);

  // Two periods of activity history so the trend is a real period-over-period
  // comparison rather than goal progress in disguise.
  const {
    data: activityHistory,
    isLoading: activityLoading,
    refetch: refetchActivityHistory,
  } = useQuery({
    queryKey: ['activityHistory', 'insights-summary', days * 2],
    queryFn: () => fetchHistory({ days: days * 2, limit: 500 }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Nutrition. The dashboard only carries a 7-day summary, so this stays a
  // 7-day view even on the Month tab — `periodDays` says so and the card
  // labels it, rather than passing week data off as a month.
  const nutrition = useMemo(() => {
    const summaries = dashboard?.trends?.weekSummaries || [];

    const summary = summariseCumulative({
      entries: summaries,
      days: 7,
      getDate: (day) => day.date,
      getValue: (day) => day.totalCalories || 0,
      unit: 'cal',
      goal: dashboard?.goals?.dailyCalories || dashboard?.goals?.calories || 2000,
    });

    return {
      ...summary,
      // Only one week is available, so there is no previous week to compare to
      changePercent: null,
      hasComparison: false,
      scopeNote: 'last 7 days',
    };
  }, [dashboard]);

  // Mood: a day nobody rated is missing data, not a zero
  const mood = useMemo(
    () => summariseMoodSeries(moodData?.trendData, days),
    [moodData, days]
  );

  // Hydration
  const hydration = useMemo(() => {
    // waterLiters is a Postgres decimal, so it arrives as a string ("2.5")
    // — see NutritionGoals in types/api.ts. Coerce before it reaches any maths.
    const parsedGoal = parseFloat(dashboard?.goals?.waterLiters);
    const goal = Number.isFinite(parsedGoal) && parsedGoal > 0 ? parsedGoal : 2.0;
    const aggregates = waterHistory?.dailyAggregates || [];

    return summariseCumulative({
      entries: aggregates,
      days,
      getDate: (day) => day.date,
      getValue: (day) => day.hydrationLiters || day.totalLiters || 0,
      unit: 'L',
      decimals: 1,
      goal,
    });
  }, [waterHistory, dashboard, days]);

  // Activity
  const activity = useMemo(
    () => summariseActivityHistory(activityHistory?.activities, days, weeklyProgress),
    [activityHistory, days, weeklyProgress]
  );

  // Combined loading state
  const isLoading = dashboardLoading || moodLoading || activityLoading || waterLoading;

  // Refetch all data
  const refetch = async () => {
    await Promise.all([
      refetchDashboard(),
      refetchMood(),
      refetchActivity(),
      refetchActivityHistory(),
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
