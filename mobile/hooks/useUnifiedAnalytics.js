/**
 * useUnifiedAnalytics Hook
 *
 * React Query hooks for fetching unified analytics data
 * across all health domains with multi-timeframe support.
 *
 * @module useUnifiedAnalytics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

// Query keys
export const ANALYTICS_KEYS = {
  availability: ['analytics', 'availability'],
  daily: (date) => ['analytics', 'daily', date],
  weekly: (date) => ['analytics', 'weekly', date],
  monthly: (date) => ['analytics', 'monthly', date],
  wellness: (timeframe) => ['analytics', 'wellness', timeframe],
  trends: (timeframe) => ['analytics', 'trends', timeframe],
};

/**
 * Hook to check data availability across all domains
 */
export function useDataAvailability(lookbackDays = 30) {
  return useQuery({
    queryKey: [...ANALYTICS_KEYS.availability, lookbackDays],
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/availability', {
        params: { days: lookbackDays },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get daily analytics
 */
export function useDailyAnalytics(date = null) {
  const dateStr = date ? formatDate(date) : formatDate(new Date());

  return useQuery({
    queryKey: ANALYTICS_KEYS.daily(dateStr),
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/daily', {
        params: { date: dateStr },
      });
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for daily data
  });
}

/**
 * Hook to get weekly analytics
 */
export function useWeeklyAnalytics(date = null) {
  const dateStr = date ? formatDate(date) : formatDate(new Date());

  return useQuery({
    queryKey: ANALYTICS_KEYS.weekly(dateStr),
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/weekly', {
        params: { date: dateStr },
      });
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for weekly data
  });
}

/**
 * Hook to get monthly analytics
 */
export function useMonthlyAnalytics(date = null) {
  const dateStr = date ? formatDate(date) : formatDate(new Date());

  return useQuery({
    queryKey: ANALYTICS_KEYS.monthly(dateStr),
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/monthly', {
        params: { date: dateStr },
      });
      return data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes for monthly data
  });
}

/**
 * Hook to get wellness score
 */
export function useWellnessScore(timeframe = 'weekly') {
  return useQuery({
    queryKey: ANALYTICS_KEYS.wellness(timeframe),
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/wellness', {
        params: { timeframe },
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get trends comparison
 */
export function useTrends(timeframe = 'weekly') {
  return useQuery({
    queryKey: ANALYTICS_KEYS.trends(timeframe),
    queryFn: async () => {
      const { data } = await apiClient.get('/analytics/trends', {
        params: { timeframe },
      });
      return data;
    },
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Unified hook for all analytics with timeframe selection
 */
export function useUnifiedAnalytics(timeframe = 'weekly', date = null) {
  const dateStr = date ? formatDate(date) : formatDate(new Date());

  const availabilityQuery = useDataAvailability();

  const analyticsQuery = useQuery({
    queryKey: ['analytics', timeframe, dateStr],
    queryFn: async () => {
      let endpoint;
      switch (timeframe) {
        case 'daily':
          endpoint = '/analytics/daily';
          break;
        case 'weekly':
          endpoint = '/analytics/weekly';
          break;
        case 'monthly':
          endpoint = '/analytics/monthly';
          break;
        default:
          endpoint = '/analytics/weekly';
      }
      const { data } = await apiClient.get(endpoint, {
        params: { date: dateStr },
      });
      return data;
    },
    staleTime: timeframe === 'daily' ? 2 * 60 * 1000 : timeframe === 'weekly' ? 10 * 60 * 1000 : 30 * 60 * 1000,
  });

  const trendsQuery = useTrends(timeframe);

  return {
    analytics: analyticsQuery.data,
    availability: availabilityQuery.data,
    trends: trendsQuery.data,
    isLoading: analyticsQuery.isLoading || availabilityQuery.isLoading,
    isError: analyticsQuery.isError,
    error: analyticsQuery.error,
    refetch: analyticsQuery.refetch,
  };
}

// Utility to format date as YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export default {
  useDataAvailability,
  useDailyAnalytics,
  useWeeklyAnalytics,
  useMonthlyAnalytics,
  useWellnessScore,
  useTrends,
  useUnifiedAnalytics,
  ANALYTICS_KEYS,
};
