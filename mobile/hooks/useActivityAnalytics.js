/**
 * useActivityAnalytics - Client-side hook for activity intelligence
 *
 * Provides access to:
 * - Cold start stage and progression
 * - Activity pattern analysis
 * - Persona classification (Active Achiever, Weekend Warrior, etc.)
 * - Tomorrow's prediction
 * - Personalized recommendations
 *
 * Usage:
 *   const { analytics, isLoading, refetch } = useActivityAnalytics();
 *   if (analytics?.coldStart?.stage === 'established') { ... }
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import apiClient from '../services/apiClient';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const ACTIVITY_ANALYTICS_KEYS = {
  all: ['activity-analytics'],
  dashboard: () => [...ACTIVITY_ANALYTICS_KEYS.all, 'dashboard'],
  coldStart: () => [...ACTIVITY_ANALYTICS_KEYS.all, 'cold-start'],
  patterns: (days) => [...ACTIVITY_ANALYTICS_KEYS.all, 'patterns', days],
  persona: () => [...ACTIVITY_ANALYTICS_KEYS.all, 'persona'],
  prediction: () => [...ACTIVITY_ANALYTICS_KEYS.all, 'prediction'],
  recommendations: () => [...ACTIVITY_ANALYTICS_KEYS.all, 'recommendations'],
  weekData: () => [...ACTIVITY_ANALYTICS_KEYS.all, 'week-data'],
};

// ============================================================================
// DATA STATUS CONSTANTS - For production-grade error handling
// ============================================================================

/**
 * Data availability status to distinguish between:
 * - 'loading': Still fetching data
 * - 'ready': Real data available from backend
 * - 'insufficient': User hasn't logged enough data yet
 * - 'error': API call failed
 */
export const DATA_STATUS = {
  LOADING: 'loading',
  READY: 'ready',
  INSUFFICIENT: 'insufficient',
  ERROR: 'error',
};

// ============================================================================
// MAIN DASHBOARD HOOK
// ============================================================================

/**
 * Main hook for activity analytics dashboard
 * Returns combined analytics data optimized for the dashboard card
 */
export function useActivityAnalytics(options = {}) {
  const { enabled = true, refetchInterval = 5 * 60 * 1000 } = options; // 5 min default

  const query = useQuery({
    queryKey: ACTIVITY_ANALYTICS_KEYS.dashboard(),
    queryFn: async () => {
      const response = await apiClient.get('/activity/analytics/dashboard');

      // Validate response has real data
      if (!response || typeof response !== 'object') {
        return {
          status: DATA_STATUS.ERROR,
          coldStart: { stage: 'day0', daysSinceFirstLog: 0, totalLogs: 0, distinctDays: 0 },
          patterns: null,
          persona: null,
          personaConfidence: 0,
          prediction: null,
          recommendations: [],
          weekData: generateEmptyWeekData(),
          dismissedInsightTypes: [],
          message: 'Unable to load activity data',
        };
      }

      // Check if user has sufficient data
      const hasData = response.coldStart?.totalLogs > 0 || response.weekData?.some(d => d.minutes > 0);

      return {
        ...response,
        status: hasData ? DATA_STATUS.READY : DATA_STATUS.INSUFFICIENT,
        message: hasData ? null : 'Log your first activity to see personalized insights',
      };
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval,
    refetchOnWindowFocus: false,
  });

  // Derive status from query state and data
  const dataStatus = useMemo(() => {
    if (query.isLoading) return DATA_STATUS.LOADING;
    if (query.error) return DATA_STATUS.ERROR;
    return query.data?.status || DATA_STATUS.INSUFFICIENT;
  }, [query.isLoading, query.error, query.data?.status]);

  return useMemo(() => ({
    analytics: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    // Production-grade status indicators
    dataStatus,
    hasRealData: dataStatus === DATA_STATUS.READY,
    isInsufficientData: dataStatus === DATA_STATUS.INSUFFICIENT,
    statusMessage: query.data?.message || null,
    // Convenience accessors (only return if we have real data)
    coldStart: query.data?.coldStart,
    patterns: query.data?.patterns,
    persona: dataStatus === DATA_STATUS.READY ? query.data?.persona : null,
    prediction: dataStatus === DATA_STATUS.READY ? query.data?.prediction : null,
    recommendations: dataStatus === DATA_STATUS.READY ? (query.data?.recommendations || []) : [],
    weekData: query.data?.weekData || generateEmptyWeekData(),
  }), [query.data, query.isLoading, query.isFetching, query.error, query.refetch, dataStatus]);
}

// ============================================================================
// COLD START HOOK
// ============================================================================

/**
 * Hook for cold start stage only (lightweight)
 */
export function useActivityColdStartStage(options = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ACTIVITY_ANALYTICS_KEYS.coldStart(),
    queryFn: async () => {
      try {
        const response = await apiClient.get('/activity/analytics/cold-start');
        return response;
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
 * Hook for tomorrow's activity prediction
 */
export function useActivityPrediction(options = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ACTIVITY_ANALYTICS_KEYS.prediction(),
    queryFn: async () => {
      try {
        const response = await apiClient.get('/activity/analytics/prediction/tomorrow');
        return response;
      } catch {
        return {
          hasPrediction: false,
          predictedMinutes: 30,
          confidence: 0.5,
          factors: [],
        };
      }
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    prediction: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================================
// RECOMMENDATIONS HOOK
// ============================================================================

/**
 * Hook for personalized activity recommendations
 * Returns empty array when no real data available - UI should handle empty state
 */
export function useActivityRecommendations(options = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ACTIVITY_ANALYTICS_KEYS.recommendations(),
    queryFn: async () => {
      const response = await apiClient.get('/activity/analytics/recommendations');
      // Only return real recommendations from backend, never fake data
      const recommendations = response?.recommendations || [];
      return {
        recommendations,
        hasData: recommendations.length > 0,
        status: recommendations.length > 0 ? DATA_STATUS.READY : DATA_STATUS.INSUFFICIENT,
      };
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    recommendations: query.data?.recommendations || [],
    hasData: query.data?.hasData || false,
    dataStatus: query.isLoading ? DATA_STATUS.LOADING : (query.data?.status || DATA_STATUS.INSUFFICIENT),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ============================================================================
// FEEDBACK MUTATION
// ============================================================================

/**
 * Hook for recording activity insight feedback
 */
export function useActivityInsightFeedback() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ insightType, insightId, feedback }) => {
      const response = await apiClient.post('/activity/analytics/feedback', {
        insightType,
        insightId,
        ...feedback,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVITY_ANALYTICS_KEYS.dashboard() });
    },
    onError: (error) => {
      console.error('[useActivityInsightFeedback] Error:', error);
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
// LOG ACTIVITY MUTATION
// ============================================================================

/**
 * Hook for logging activity
 */
export function useLogActivity() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ type, minutes, intensity, notes }) => {
      const response = await apiClient.post('/activity/log', {
        type,
        minutes,
        intensity,
        notes,
        loggedAt: new Date().toISOString(),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate all activity analytics queries
      queryClient.invalidateQueries({ queryKey: ACTIVITY_ANALYTICS_KEYS.all });
    },
  });

  return {
    logActivity: mutation.mutateAsync,
    isLogging: mutation.isPending,
    error: mutation.error,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate empty week data structure for display when no data exists
 * Uses 2-char labels for Tuesday (Tu) and Thursday (Th) to avoid confusion
 * NOTE: This returns EMPTY data (0 minutes), not fake sample data
 */
function generateEmptyWeekData() {
  const today = new Date();
  const weekData = [];
  // Use 2-char for Tu/Th to distinguish, 1-char for others
  const dayLabels = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    weekData.push({
      date: date.toISOString().split('T')[0],
      label: dayLabels[dayOfWeek],
      minutes: 0, // Real zero, not fake data
      type: null,
      hasData: false, // Explicit flag that this is empty
    });
  }

  return weekData;
}

/**
 * Calculate activity streak
 */
export function calculateActivityStreak(weekData = []) {
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  // Sort by date descending
  const sorted = [...weekData].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const day of sorted) {
    if (day.minutes > 0) {
      streak++;
    } else {
      // Only break if we've passed today (allow current day to be incomplete)
      if (day.date < today) {
        break;
      }
    }
  }

  return streak;
}

/**
 * Get activity level label
 */
export function getActivityLevelLabel(minutes) {
  if (minutes === 0) return 'None';
  if (minutes < 15) return 'Light';
  if (minutes < 30) return 'Moderate';
  if (minutes < 60) return 'Active';
  return 'Very Active';
}

/**
 * Get activity color based on minutes
 */
export function getActivityColor(minutes, goal = 30) {
  const ratio = minutes / goal;
  if (ratio >= 1) return '#059669'; // Success green
  if (ratio >= 0.7) return '#10B981'; // Light green
  if (ratio >= 0.4) return '#F59E0B'; // Warning amber
  return '#EF4444'; // Danger red
}

export default useActivityAnalytics;
