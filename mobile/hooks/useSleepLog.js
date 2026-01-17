/**
 * useSleepLog Hook
 * Production-ready sleep logging with backend sync and optimistic updates
 * Includes quality tracking, context tags, and trend analysis
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Sleep quality labels with icons and colors
 */
export const SLEEP_QUALITY_LABELS = [
  { value: 1, label: 'Terrible', icon: 'sad-outline', color: '#EF4444' },
  { value: 2, label: 'Very Poor', icon: 'sad-outline', color: '#F87171' },
  { value: 3, label: 'Poor', icon: 'sad-outline', color: '#FB923C' },
  { value: 4, label: 'Below Average', icon: 'remove-circle-outline', color: '#FBBF24' },
  { value: 5, label: 'Average', icon: 'remove-circle-outline', color: '#FCD34D' },
  { value: 6, label: 'Fair', icon: 'remove-circle-outline', color: '#BEF264' },
  { value: 7, label: 'Good', icon: 'happy-outline', color: '#84CC16' },
  { value: 8, label: 'Very Good', icon: 'happy-outline', color: '#4ADE80' },
  { value: 9, label: 'Great', icon: 'happy-outline', color: '#22C55E' },
  { value: 10, label: 'Excellent', icon: 'star', color: '#10B981' },
];

/**
 * Context tags that may affect sleep
 */
export const SLEEP_CONTEXT_TAGS = [
  { key: 'caffeine', label: 'Had Caffeine', icon: 'cafe', description: 'Coffee, tea, or energy drinks' },
  { key: 'alcohol', label: 'Had Alcohol', icon: 'wine', description: 'Any alcoholic drinks' },
  { key: 'exercise', label: 'Exercised', icon: 'fitness', description: 'Physical activity that day' },
  { key: 'stress', label: 'Stressed', icon: 'flash', description: 'Felt stressed or anxious' },
  { key: 'screenTime', label: 'Late Screen Time', icon: 'phone-portrait', description: 'Phone/TV before bed' },
  { key: 'lateFood', label: 'Late Heavy Meal', icon: 'restaurant', description: 'Big meal close to bedtime' },
];

/**
 * Get quality label by value
 */
export function getQualityLabel(value) {
  return SLEEP_QUALITY_LABELS.find((q) => q.value === value) || SLEEP_QUALITY_LABELS[4];
}

/**
 * Get quality color by value
 */
export function getQualityColor(value) {
  return getQualityLabel(value).color;
}

/**
 * Hook for sleep logging operations
 */
export function useSleepLog() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch last night's sleep
   */
  const {
    data: lastSleepData,
    isLoading: isLastSleepLoading,
    error: lastSleepError,
    refetch: refetchLastSleep,
  } = useQuery({
    queryKey: ['sleepToday'],
    queryFn: async () => {
      const response = await apiClient.get('/sleep/today');
      return response;
    },
    staleTime: 60000, // 1 minute
    retry: 1,
  });

  /**
   * Fetch sleep history
   */
  const fetchHistory = useCallback(async (options = {}) => {
    const { days = 30, limit = 100, offset = 0 } = options;

    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await apiClient.get(`/sleep/history?${params}`);
      return response;
    } catch (err) {
      console.error('[useSleepLog] Failed to fetch history:', err);
      return { sleepLogs: [], total: 0, summary: {} };
    }
  }, []);

  /**
   * Fetch sleep trends
   */
  const {
    data: trendsData,
    isLoading: isTrendsLoading,
    refetch: refetchTrends,
  } = useQuery({
    queryKey: ['sleepTrends'],
    queryFn: async () => {
      const response = await apiClient.get('/sleep/trends?days=30');
      return response;
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
  });

  /**
   * Mutation for logging sleep to backend
   */
  const logSleepMutation = useMutation({
    mutationFn: async (sleepData) => {
      // Generate strong clientEventId for idempotency
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      const clientEventId = `${userId}-sleep-${timestamp}-${random1}-${random2}`;

      return await apiClient.post('/sleep/log', {
        ...sleepData,
        clientEventId,
      });
    },
    onMutate: async (sleepData) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['sleepToday'] });
      const previousData = queryClient.getQueryData(['sleepToday']);

      queryClient.setQueryData(['sleepToday'], (old) => ({
        ...old,
        lastSleep: {
          quality: sleepData.quality,
          durationMinutes: sleepData.durationMinutes,
          sleepDate: sleepData.sleepDate,
        },
      }));

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['sleepToday'], context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepToday'] });
      queryClient.invalidateQueries({ queryKey: ['sleepTrends'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /**
   * Log sleep entry
   * @param {Object} sleepData - Sleep data
   * @param {Date|string} sleepData.bedTime - Time went to bed
   * @param {Date|string} sleepData.wakeTime - Time woke up
   * @param {number} sleepData.quality - Quality rating (1-10)
   * @param {Object} [sleepData.tags] - Context tags
   * @param {string} [sleepData.notes] - Optional notes
   * @param {string} [sleepData.sleepDate] - The night's date (YYYY-MM-DD)
   * @returns {Promise<object>}
   */
  const logSleep = useCallback(async (sleepData) => {
    const { bedTime, wakeTime, quality, tags = {}, notes, sleepDate } = sleepData;

    // Validation
    if (!bedTime || !wakeTime) {
      throw new Error('Bed time and wake time are required');
    }

    if (!quality || quality < 1 || quality > 10) {
      throw new Error('Quality must be between 1 and 10');
    }

    // Calculate duration
    const bedTimeDate = new Date(bedTime);
    const wakeTimeDate = new Date(wakeTime);
    const durationMinutes = Math.round((wakeTimeDate - bedTimeDate) / 60000);

    if (durationMinutes <= 0 || durationMinutes > 1440) {
      throw new Error('Invalid sleep duration');
    }

    setIsLogging(true);
    setError(null);

    try {
      const result = await logSleepMutation.mutateAsync({
        bedTime: bedTimeDate.toISOString(),
        wakeTime: wakeTimeDate.toISOString(),
        quality,
        tags,
        notes,
        sleepDate,
        durationMinutes,
      });
      return result;
    } catch (err) {
      console.error('[useSleepLog] Failed to log sleep:', err);
      setError(err.message || 'Failed to log sleep');
      throw err;
    } finally {
      setIsLogging(false);
    }
  }, [logSleepMutation]);

  /**
   * Mutation for deleting sleep entry
   */
  const deleteSleepMutation = useMutation({
    mutationFn: async (sleepId) => {
      return await apiClient.delete(`/sleep/${sleepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleepToday'] });
      queryClient.invalidateQueries({ queryKey: ['sleepTrends'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /**
   * Delete sleep entry
   * @param {number} sleepId - Sleep entry ID
   * @returns {Promise<object>}
   */
  const deleteSleep = useCallback(async (sleepId) => {
    if (!sleepId) {
      throw new Error('Sleep ID is required');
    }

    setIsLogging(true);
    setError(null);

    try {
      const result = await deleteSleepMutation.mutateAsync(sleepId);
      return result;
    } catch (err) {
      if (err?.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['sleepToday'] });
        return null;
      }
      console.error('[useSleepLog] Failed to delete sleep:', err);
      setError(err.message || 'Failed to delete sleep');
      throw err;
    } finally {
      setIsLogging(false);
    }
  }, [deleteSleepMutation, queryClient]);

  /**
   * Get last night's sleep
   */
  const lastSleep = useMemo(() => lastSleepData?.lastSleep || null, [lastSleepData]);

  /**
   * Get sleep trends
   */
  const trends = useMemo(() => trendsData?.trends || null, [trendsData]);

  /**
   * Refetch all data
   */
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchLastSleep(),
      refetchTrends(),
    ]);
  }, [refetchLastSleep, refetchTrends]);

  return {
    // Logging functions
    logSleep,
    deleteSleep,

    // State
    isLogging,
    error,

    // Last night's sleep
    lastSleep,
    isLastSleepLoading,
    lastSleepError,

    // Trends
    trends,
    isTrendsLoading,

    // History
    fetchHistory,

    // Refetch
    refetch,
    refetchLastSleep,
    refetchTrends,

    // Constants
    qualityLabels: SLEEP_QUALITY_LABELS,
    contextTags: SLEEP_CONTEXT_TAGS,
  };
}

export default useSleepLog;
