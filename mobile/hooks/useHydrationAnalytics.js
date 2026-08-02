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
      const fallbackData = {
        coldStart: { stage: 'day0', daysSinceFirstLog: 0, totalLogs: 0, distinctDays: 0 },
        patterns: null,
        persona: null,
        personaConfidence: 0,
        prediction: null,
        dismissedInsightTypes: [],
      };

      try {
        // apiClient.get returns data directly, not a response wrapper
        const data = await apiClient.get('/hydration/analytics/dashboard');
        // React Query requires returning a value - never undefined
        return data ?? fallbackData;
      } catch (error) {
        // Silently return fallback data - backend may not have tables yet
        // Once backend is fully deployed, this will work
        if (__DEV__) {
          console.warn('[useHydrationAnalytics] Using fallback data (backend may still be deploying)');
        }
        return fallbackData;
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
// DAILY HISTORY HOOK (for trend charts)
// ============================================================================

/**
 * Hook for day-by-day hydration totals.
 *
 * /hydration/analytics/dashboard gives aggregate patterns but no per-day
 * series, so the trend chart pulls /water/history and uses its
 * dailyAggregates (already grouped in the client's timezone by the backend,
 * and hydration-adjusted the same way /water/today computes totalLiters — so
 * a bar and the "today" card can never disagree).
 *
 * Always fetches a fixed `days` window and lets callers slice it. Streaks and
 * averages computed off a 7-day slice would silently understate a longer run,
 * and re-fetching on every range toggle is wasted network for data we already
 * hold. Missing days are zero-filled so the chart shows real gaps rather than
 * compressing them away.
 */
export function useHydrationHistory(days = 30, options = {}) {
  const { enabled = true } = options;

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [days]);

  const query = useQuery({
    queryKey: [...HYDRATION_ANALYTICS_KEYS.all, 'history', days],
    queryFn: async () => {
      const empty = { logs: [], dailyAggregates: [], totalEntries: 0 };
      try {
        // The backend limits newest-first, so an undersized limit silently
        // truncates the OLDEST days into looking like zero-intake days.
        // 600 covers ~20 logs/day over a month.
        const data = await apiClient.get('/water/history', {
          params: { ...range, limit: Math.max(600, days * 20) },
        });
        return { ...empty, ...(data || {}), failed: false };
      } catch {
        // Kept non-throwing for graceful degradation, but the caller needs to
        // tell "you have no logs" apart from "we couldn't load your logs" —
        // showing a new-user empty state to someone with months of data is
        // worse than showing a retry.
        return { ...empty, failed: true };
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Build a continuous, zero-filled series ending today
  const series = useMemo(() => {
    const byDate = {};
    (query.data?.dailyAggregates || []).forEach((day) => {
      byDate[day.date] = day;
    });

    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Local date key, matching the backend's timezone-aware grouping
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const agg = byDate[key];
      out.push({
        date: key,
        dayOfWeek: d.getDay(),
        ml: Math.round((agg?.hydrationLiters ?? 0) * 1000),
        entries: agg?.count || 0,
        isToday: i === 0,
      });
    }
    return out;
  }, [query.data, days]);

  return useMemo(() => ({
    series,
    logs: query.data?.logs || [],
    dailyAggregates: query.data?.dailyAggregates || [],
    isLoading: query.isLoading,
    hasFailed: query.data?.failed === true,
    error: query.error,
    refetch: query.refetch,
  }), [series, query.data, query.isLoading, query.error, query.refetch]);
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
      try {
        // apiClient.get already returns data directly, not response wrapper
        const data = await apiClient.get('/hydration/analytics/cold-start');
        return data;
      } catch {
        return { stage: 'day0', distinctDays: 0 };
      }
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
      try {
        const params = meetingCount ? { meetingCount } : {};
        // apiClient.get already returns data directly, not response wrapper
        const data = await apiClient.get('/hydration/analytics/prediction/tomorrow', { params });
        return data;
      } catch {
        // Return fallback prediction on error
        return {
          hasPrediction: false,
          predictedMl: 2000,
          factors: [],
        };
      }
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
      // apiClient.post already returns data directly
      return await apiClient.post('/hydration/analytics/feedback', {
        insightType,
        insightId,
        ...feedback,
      });
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
      // apiClient.post already returns data directly
      return await apiClient.post('/hydration/analytics/prediction/refresh', {
        meetingCount,
      });
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
      // apiClient.post already returns data directly
      return await apiClient.post('/hydration/analytics/profile/refresh-stage');
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
