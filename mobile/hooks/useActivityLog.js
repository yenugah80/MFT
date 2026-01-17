/**
 * useActivityLog Hook
 * Production-ready activity logging with backend sync and optimistic updates
 * Includes MET-based calorie calculation and weekly progress tracking
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Activity types with icons and labels
 */
export const ACTIVITY_TYPES = [
  { key: 'running', label: 'Running', icon: 'fitness', color: '#EF4444' },
  { key: 'cycling', label: 'Cycling', icon: 'bicycle', color: '#F59E0B' },
  { key: 'walking', label: 'Walking', icon: 'walk', color: '#10B981' },
  { key: 'gym', label: 'Gym', icon: 'barbell', color: '#6366F1' },
  { key: 'swimming', label: 'Swimming', icon: 'water', color: '#06B6D4' },
  { key: 'yoga', label: 'Yoga', icon: 'body', color: '#8B5CF6' },
  { key: 'sports', label: 'Sports', icon: 'football', color: '#EC4899' },
  { key: 'hiking', label: 'Hiking', icon: 'trail-sign', color: '#84CC16' },
  { key: 'dancing', label: 'Dancing', icon: 'musical-notes', color: '#F472B6' },
  { key: 'hiit', label: 'HIIT', icon: 'flame', color: '#EF4444' },
  { key: 'strength', label: 'Strength', icon: 'barbell', color: '#6366F1' },
  { key: 'cardio', label: 'Cardio', icon: 'heart', color: '#F43F5E' },
  { key: 'flexibility', label: 'Flexibility', icon: 'body', color: '#A855F7' },
  { key: 'general', label: 'General', icon: 'fitness', color: '#64748B' },
];

/**
 * Intensity levels with descriptions
 */
export const INTENSITY_LEVELS = [
  { key: 'light', label: 'Light', description: 'Can easily hold a conversation', color: '#10B981' },
  { key: 'moderate', label: 'Moderate', description: 'Can talk but slightly breathless', color: '#F59E0B' },
  { key: 'vigorous', label: 'Vigorous', description: 'Hard to hold a conversation', color: '#EF4444' },
];

/**
 * Quick add presets (minutes)
 */
export const ACTIVITY_PRESETS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
];

/**
 * Get activity type by key
 */
export function getActivityType(key) {
  return ACTIVITY_TYPES.find((t) => t.key === key) || ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1];
}

/**
 * Get intensity level by key
 */
export function getIntensityLevel(key) {
  return INTENSITY_LEVELS.find((l) => l.key === key) || INTENSITY_LEVELS[1];
}

/**
 * Hook for activity logging operations
 */
export function useActivityLog() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch today's activity summary
   */
  const {
    data: todayData,
    isLoading: isTodayLoading,
    error: todayError,
    refetch: refetchToday,
  } = useQuery({
    queryKey: ['activityToday'],
    queryFn: async () => {
      const response = await apiClient.get('/activity/today');
      return response;
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });

  /**
   * Fetch activity history
   */
  const fetchHistory = useCallback(async (options = {}) => {
    const { days = 30, type, limit = 100, offset = 0 } = options;

    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      if (type && type !== 'all') params.append('type', type);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await apiClient.get(`/activity/history?${params}`);
      return response;
    } catch (err) {
      console.error('[useActivityLog] Failed to fetch history:', err);
      return { activities: [], total: 0, summary: {} };
    }
  }, []);

  /**
   * Fetch week data for charts
   */
  const {
    data: weekData,
    isLoading: isWeekLoading,
    refetch: refetchWeek,
  } = useQuery({
    queryKey: ['activityWeek'],
    queryFn: async () => {
      const response = await apiClient.get('/activity/week-data');
      return response;
    },
    staleTime: 60000, // 1 minute
    retry: 1,
  });

  /**
   * Mutation for logging activity to backend
   */
  const logActivityMutation = useMutation({
    mutationFn: async (activityData) => {
      // Generate strong clientEventId for idempotency
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      const clientEventId = `${userId}-activity-${timestamp}-${random1}-${random2}`;

      return await apiClient.post('/activity/log', {
        ...activityData,
        loggedAt: activityData.loggedAt || new Date().toISOString(),
        clientEventId,
      });
    },
    onMutate: async (activityData) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['activityToday'] });
      await queryClient.cancelQueries({ queryKey: ['activityWeek'] });

      const previousToday = queryClient.getQueryData(['activityToday']);

      queryClient.setQueryData(['activityToday'], (old) => {
        if (!old) return old;
        return {
          ...old,
          today: {
            ...old.today,
            totalMinutes: (old.today?.totalMinutes || 0) + activityData.minutes,
            activityCount: (old.today?.activityCount || 0) + 1,
          },
        };
      });

      return { previousToday };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousToday) {
        queryClient.setQueryData(['activityToday'], context.previousToday);
      }
    },
    onSuccess: () => {
      // Invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['activityToday'] });
      queryClient.invalidateQueries({ queryKey: ['activityWeek'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /**
   * Log activity
   * @param {Object} activityData - Activity data
   * @param {string} activityData.type - Activity type (running, cycling, etc.)
   * @param {number} activityData.minutes - Duration in minutes
   * @param {string} activityData.intensity - Intensity level (light/moderate/vigorous)
   * @param {string} [activityData.notes] - Optional notes
   * @param {number} [activityData.distanceKm] - Optional distance in km
   * @param {number} [activityData.heartRateAvg] - Optional average heart rate
   * @param {number} [activityData.steps] - Optional step count
   * @returns {Promise<object>}
   */
  const logActivity = useCallback(async (activityData) => {
    const { type = 'general', minutes, intensity = 'moderate', notes, distanceKm, heartRateAvg, steps } = activityData;

    // Validation
    if (!minutes || minutes <= 0) {
      throw new Error('Duration is required and must be positive');
    }

    if (minutes > 1440) {
      throw new Error('Duration cannot exceed 24 hours');
    }

    // Validate type
    const validTypes = ACTIVITY_TYPES.map((t) => t.key);
    const validType = validTypes.includes(type) ? type : 'general';

    // Validate intensity
    const validIntensities = INTENSITY_LEVELS.map((l) => l.key);
    const validIntensity = validIntensities.includes(intensity) ? intensity : 'moderate';

    setIsLogging(true);
    setError(null);

    try {
      const result = await logActivityMutation.mutateAsync({
        type: validType,
        minutes,
        intensity: validIntensity,
        notes,
        distanceKm,
        heartRateAvg,
        steps,
      });
      return result;
    } catch (err) {
      console.error('[useActivityLog] Failed to log activity:', err);
      setError(err.message || 'Failed to log activity');
      throw err;
    } finally {
      setIsLogging(false);
    }
  }, [logActivityMutation]);

  /**
   * Quick add activity with preset
   */
  const quickAdd = useCallback(async (type, preset, intensity = 'moderate') => {
    return await logActivity({
      type,
      minutes: preset.minutes,
      intensity,
    });
  }, [logActivity]);

  /**
   * Mutation for deleting activity
   */
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId) => {
      return await apiClient.delete(`/activity/${activityId}`);
    },
    onMutate: async (activityId) => {
      await queryClient.cancelQueries({ queryKey: ['activityToday'] });
      const previousToday = queryClient.getQueryData(['activityToday']);

      queryClient.setQueryData(['activityToday'], (old) => {
        if (!old || !old.activities) return old;
        const activity = old.activities.find((a) => a.id === activityId);
        if (!activity) return old;

        return {
          ...old,
          today: {
            ...old.today,
            totalMinutes: Math.max((old.today?.totalMinutes || 0) - (activity.durationMinutes || 0), 0),
            totalCalories: Math.max((old.today?.totalCalories || 0) - (activity.caloriesBurned || 0), 0),
            activityCount: Math.max((old.today?.activityCount || 0) - 1, 0),
          },
          activities: old.activities.filter((a) => a.id !== activityId),
        };
      });

      return { previousToday };
    },
    onError: (err, variables, context) => {
      if (context?.previousToday) {
        queryClient.setQueryData(['activityToday'], context.previousToday);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityToday'] });
      queryClient.invalidateQueries({ queryKey: ['activityWeek'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /**
   * Delete activity entry
   * @param {number} activityId - Activity ID to delete
   * @returns {Promise<object>}
   */
  const deleteActivity = useCallback(async (activityId) => {
    if (!activityId) {
      throw new Error('Activity ID is required');
    }

    setIsLogging(true);
    setError(null);

    try {
      const result = await deleteActivityMutation.mutateAsync(activityId);
      return result;
    } catch (err) {
      if (err?.response?.status === 404) {
        // Already deleted, just refresh
        queryClient.invalidateQueries({ queryKey: ['activityToday'] });
        queryClient.invalidateQueries({ queryKey: ['activityWeek'] });
        return null;
      }
      console.error('[useActivityLog] Failed to delete activity:', err);
      setError(err.message || 'Failed to delete activity');
      throw err;
    } finally {
      setIsLogging(false);
    }
  }, [deleteActivityMutation, queryClient]);

  /**
   * Get today's activity summary
   */
  const todaySummary = useMemo(() => ({
    totalMinutes: todayData?.today?.totalMinutes || 0,
    totalCalories: todayData?.today?.totalCalories || 0,
    activityCount: todayData?.today?.activityCount || 0,
    types: todayData?.today?.types || {},
  }), [todayData]);

  /**
   * Get weekly progress
   */
  const weeklyProgress = useMemo(() => ({
    progress: todayData?.weeklyProgress?.progress || 0,
    target: todayData?.weeklyProgress?.target || 150,
    remaining: todayData?.weeklyProgress?.remaining || 150,
    onTrack: todayData?.weeklyProgress?.onTrack || false,
    weeklyMinutes: todayData?.weeklyProgress?.weeklyMinutes || 0,
  }), [todayData]);

  /**
   * Get today's activities list
   */
  const activities = useMemo(() => todayData?.activities || [], [todayData]);

  /**
   * Refetch all data
   */
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchToday(),
      refetchWeek(),
    ]);
  }, [refetchToday, refetchWeek]);

  return {
    // Logging functions
    logActivity,
    quickAdd,
    deleteActivity,

    // State
    isLogging,
    error,

    // Today's data
    todaySummary,
    activities,
    isTodayLoading,
    todayError,

    // Weekly data
    weeklyProgress,
    weekData: weekData?.weekData || [],
    isWeekLoading,

    // History
    fetchHistory,

    // Refetch
    refetch,
    refetchToday,
    refetchWeek,

    // Constants
    types: ACTIVITY_TYPES,
    intensities: INTENSITY_LEVELS,
    presets: ACTIVITY_PRESETS,
  };
}

export default useActivityLog;
