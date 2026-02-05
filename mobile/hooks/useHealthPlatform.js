/**
 * useHealthPlatform Hook
 *
 * React hook for HealthKit (iOS) and Google Fit (Android) integration.
 * Provides easy access to health data and sync functionality.
 *
 * Features:
 * - Permission management
 * - Activity data fetching
 * - Sleep tracking
 * - Heart rate monitoring
 * - Body measurements
 * - Nutrition data sync
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const HEALTH_KEYS = {
  permissions: ['health', 'permissions'],
  todayActivity: ['health', 'activity', 'today'],
  activityHistory: (days) => ['health', 'activity', 'history', days],
  sleep: (date) => ['health', 'sleep', date],
  heartRate: (date) => ['health', 'heartRate', date],
  body: ['health', 'body'],
  insights: ['health', 'insights'],
  syncStatus: ['health', 'syncStatus'],
};

// ============================================================================
// PERMISSION HOOK
// ============================================================================

/**
 * Hook for managing health platform permissions
 */
export function useHealthPermissions() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);

  // Check if health platform is available
  useEffect(() => {
    // In production, this would check native module availability
    setIsAvailable(Platform.OS === 'ios' || Platform.OS === 'android');
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    if (!isAvailable) {
      return { success: false, error: 'Health platform not available' };
    }

    setIsRequesting(true);

    try {
      // In production, this would call the native health module
      // For now, we simulate the permission request
      const response = await apiClient.post('/health/permissions/request', {
        platform: Platform.OS === 'ios' ? 'healthkit' : 'google_fit',
      });

      setPermissions(response.data.permissions);
      return { success: true, permissions: response.data.permissions };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setIsRequesting(false);
    }
  }, [isAvailable]);

  return {
    isAvailable,
    permissions,
    hasPermissions: permissions?.granted || false,
    isRequesting,
    requestPermissions,
  };
}

// ============================================================================
// ACTIVITY HOOKS
// ============================================================================

/**
 * Get today's activity summary
 */
export function useTodayActivity(options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: HEALTH_KEYS.todayActivity,
    queryFn: async () => {
      const response = await apiClient.get('/health/activity/today');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
    enabled,
    ...options,
  });
}

/**
 * Get activity history for a number of days
 */
export function useActivityHistory(days = 7, options = {}) {
  return useQuery({
    queryKey: HEALTH_KEYS.activityHistory(days),
    queryFn: async () => {
      const response = await apiClient.get('/health/activity/history', {
        params: { days },
      });
      return response.data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================================================
// SLEEP HOOK
// ============================================================================

/**
 * Get sleep data for a specific date
 */
export function useSleepData(date = new Date(), options = {}) {
  const dateKey = date.toISOString().split('T')[0];

  return useQuery({
    queryKey: HEALTH_KEYS.sleep(dateKey),
    queryFn: async () => {
      const response = await apiClient.get('/health/sleep', {
        params: { date: dateKey },
      });
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (sleep data doesn't change often)
    ...options,
  });
}

// ============================================================================
// HEART RATE HOOK
// ============================================================================

/**
 * Get heart rate data
 */
export function useHeartRate(date = new Date(), options = {}) {
  const dateKey = date.toISOString().split('T')[0];

  return useQuery({
    queryKey: HEALTH_KEYS.heartRate(dateKey),
    queryFn: async () => {
      const response = await apiClient.get('/health/heart-rate', {
        params: { date: dateKey },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================================================
// BODY MEASUREMENTS HOOK
// ============================================================================

/**
 * Get body measurements (weight, height, BMI, etc.)
 */
export function useBodyMeasurements(options = {}) {
  return useQuery({
    queryKey: HEALTH_KEYS.body,
    queryFn: async () => {
      const response = await apiClient.get('/health/body');
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

// ============================================================================
// HEALTH INSIGHTS HOOK
// ============================================================================

/**
 * Get combined health insights
 */
export function useHealthInsights(options = {}) {
  return useQuery({
    queryKey: HEALTH_KEYS.insights,
    queryFn: async () => {
      const response = await apiClient.get('/health/insights');
      return response.data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

// ============================================================================
// SYNC MUTATIONS
// ============================================================================

/**
 * Write nutrition data to health platform
 */
export function useWriteNutrition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nutritionData) => {
      const response = await apiClient.post('/health/nutrition', nutritionData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: HEALTH_KEYS.todayActivity });
      queryClient.invalidateQueries({ queryKey: HEALTH_KEYS.insights });
    },
  });
}

/**
 * Write water intake to health platform
 */
export function useWriteWater() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, timestamp }) => {
      const response = await apiClient.post('/health/water', {
        amount,
        timestamp: timestamp || new Date().toISOString(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HEALTH_KEYS.todayActivity });
    },
  });
}

/**
 * Trigger manual sync with health platform
 */
export function useSyncHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/health/sync');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all health queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });
}

// ============================================================================
// COMBINED HEALTH HOOK
// ============================================================================

/**
 * Main hook combining all health platform features
 */
export function useHealthPlatform(options = {}) {
  const queryClient = useQueryClient();

  // Permission state
  const permissions = useHealthPermissions();

  // Data queries (only enabled if permissions granted)
  const isEnabled = permissions.hasPermissions && options.enabled !== false;

  const todayActivity = useTodayActivity({ enabled: isEnabled });
  const bodyMeasurements = useBodyMeasurements({ enabled: isEnabled });
  const healthInsights = useHealthInsights({ enabled: isEnabled });

  // Mutations
  const writeNutrition = useWriteNutrition();
  const writeWater = useWriteWater();
  const syncHealth = useSyncHealth();

  // Refresh all health data
  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['health'] });
  }, [queryClient]);

  return {
    // Permission state
    isAvailable: permissions.isAvailable,
    hasPermissions: permissions.hasPermissions,
    permissions: permissions.permissions,
    requestPermissions: permissions.requestPermissions,
    isRequestingPermissions: permissions.isRequesting,

    // Today's activity
    todayActivity: todayActivity.data,
    isActivityLoading: todayActivity.isLoading,
    activityError: todayActivity.error,

    // Body measurements
    bodyMeasurements: bodyMeasurements.data,
    isBodyLoading: bodyMeasurements.isLoading,

    // Health insights
    insights: healthInsights.data?.insights || [],
    isInsightsLoading: healthInsights.isLoading,

    // Overall loading state
    isLoading: todayActivity.isLoading || bodyMeasurements.isLoading,

    // Mutations
    writeNutrition: writeNutrition.mutateAsync,
    isWritingNutrition: writeNutrition.isPending,
    writeWater: writeWater.mutateAsync,
    isWritingWater: writeWater.isPending,
    syncHealth: syncHealth.mutateAsync,
    isSyncing: syncHealth.isPending,

    // Utilities
    refreshAll,
    refetchActivity: todayActivity.refetch,
    refetchInsights: healthInsights.refetch,
  };
}

export default useHealthPlatform;
