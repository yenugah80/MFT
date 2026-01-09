/**
 * useHydrationAnalytics - Client-side hook for hydration intelligence
 *
 * Provides access to:
 * - Cold start stage and progression
 * - Pattern analysis
 * - Persona classification
 * - Tomorrow's prediction
 *
 * Usage:
 *   const { analytics, isLoading, refetch } = useHydrationAnalytics();
 *   if (analytics?.coldStart?.stage === 'established') { ... }
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import apiClient from '../services/apiClient';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const HYDRATION_ANALYTICS_KEYS = {
  all: ['hydration-analytics'],
  dashboard: () => [...HYDRATION_ANALYTICS_KEYS.all, 'dashboard'],
  coldStart: () => [...HYDRATION_ANALYTICS_KEYS.all, 'cold-start'],
  patterns: (days) => [...HYDRATION_ANALYTICS_KEYS.all, 'patterns', days],
  persona: () => [...HYDRATION_ANALYTICS_KEYS.all, 'persona'],
  prediction: () => [...HYDRATION_ANALYTICS_KEYS.all, 'prediction'],
  profile: () => [...HYDRATION_ANALYTICS_KEYS.all, 'profile'],
};

// ============================================================================
// MAIN DASHBOARD HOOK
// ============================================================================

/**
 * Main hook for hydration analytics dashboard
 * Returns combined analytics data optimized for the dashboard card
 */
export function useHydrationAnalytics(options = {}) {
  const { enabled = true, refetchInterval = 5 * 60 * 1000 } = options; // 5 min default

  const query = useQuery({
    queryKey: HYDRATION_ANALYTICS_KEYS.dashboard(),
    queryFn: async () => {
      try {
        const response = await apiClient.get('/hydration/analytics/dashboard');
        return response.data;
      } catch (error) {
        console.error('[useHydrationAnalytics] Dashboard fetch error:', error);
        // Return fallback data on error
        return {
          coldStart: { stage: 'day0', daysSinceFirstLog: 0, totalLogs: 0, distinctDays: 0 },
          patterns: null,
          persona: null,
          personaConfidence: 0,
          prediction: null,
          dismissedInsightTypes: [],
        };
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchInterval,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => ({
    analytics: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    // Convenience accessors
    coldStart: query.data?.coldStart,
    patterns: query.data?.patterns,
    persona: query.data?.persona,
    prediction: query.data?.prediction,
  }), [query.data, query.isLoading, query.isFetching, query.error, query.refetch]);
}

// ============================================================================
// COLD START HOOK
// ============================================================================

/**
 * Hook for cold start stage only (lightweight)
 */
export function useColdStartStage(options = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: HYDRATION_ANALYTICS_KEYS.coldStart(),
    queryFn: async () => {
      const response = await apiClient.get('/hydration/analytics/cold-start');
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    coldStart: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

// ============================================================================
// PREDICTION HOOK
// ============================================================================

/**
 * Hook for tomorrow's prediction
 */
export function useHydrationPrediction(options = {}) {
  const { enabled = true, meetingCount } = options;

  const query = useQuery({
    queryKey: HYDRATION_ANALYTICS_KEYS.prediction(),
    queryFn: async () => {
      const params = meetingCount ? { meetingCount } : {};
      const response = await apiClient.get('/hydration/analytics/prediction/tomorrow', { params });
      return response.data;
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour (predictions don't change often)
  });

  return {
    prediction: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================================
// FEEDBACK MUTATION
// ============================================================================

/**
 * Hook for recording insight feedback
 */
export function useInsightFeedback() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ insightType, insightId, feedback }) => {
      const response = await apiClient.post('/hydration/analytics/feedback', {
        insightType,
        insightId,
        ...feedback,
      });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate dashboard to refresh dismissed insights
      queryClient.invalidateQueries({ queryKey: HYDRATION_ANALYTICS_KEYS.dashboard() });
    },
    onError: (error) => {
      console.error('[useInsightFeedback] Error:', error);
    },
  });

  const recordFeedback = useCallback((insightType, insightId, feedback) => {
    return mutation.mutateAsync({ insightType, insightId, feedback });
  }, [mutation]);

  const dismissInsight = useCallback((insightType, insightId, reason = 'not_useful') => {
    return recordFeedback(insightType, insightId, {
      dismissed: true,
      dismissReason: reason,
    });
  }, [recordFeedback]);

  const markHelpful = useCallback((insightType, insightId, wasHelpful) => {
    return recordFeedback(insightType, insightId, { wasHelpful });
  }, [recordFeedback]);

  return {
    recordFeedback,
    dismissInsight,
    markHelpful,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// ============================================================================
// REFRESH PREDICTION MUTATION
// ============================================================================

/**
 * Hook for manually refreshing prediction
 */
export function useRefreshPrediction() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ meetingCount } = {}) => {
      const response = await apiClient.post('/hydration/analytics/prediction/refresh', {
        meetingCount,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HYDRATION_ANALYTICS_KEYS.prediction() });
      queryClient.invalidateQueries({ queryKey: HYDRATION_ANALYTICS_KEYS.dashboard() });
    },
  });

  return {
    refreshPrediction: mutation.mutateAsync,
    isRefreshing: mutation.isPending,
    error: mutation.error,
  };
}

// ============================================================================
// UPDATE STAGE MUTATION (After logging water)
// ============================================================================

/**
 * Hook for updating onboarding stage after activity
 */
export function useUpdateOnboardingStage() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/hydration/analytics/profile/refresh-stage');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HYDRATION_ANALYTICS_KEYS.dashboard() });
      queryClient.invalidateQueries({ queryKey: HYDRATION_ANALYTICS_KEYS.coldStart() });
    },
  });

  return {
    updateStage: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

export default useHydrationAnalytics;
