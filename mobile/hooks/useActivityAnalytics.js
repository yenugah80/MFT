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
// FALLBACK DATA - Used when backend is not available
// ============================================================================

const FALLBACK_PERSONAS = [
  {
    title: 'Building Momentum',
    description: 'You\'re starting your activity journey. Small consistent steps lead to big changes.',
    recommendation: 'Start with 10-minute walks and gradually increase duration.',
    icon: 'trending-up',
  },
  {
    title: 'Consistent Mover',
    description: 'You maintain regular activity throughout the week. Great foundation!',
    recommendation: 'Try adding variety with different activities to keep things fresh.',
    icon: 'walk',
  },
  {
    title: 'Active Achiever',
    description: 'You exceed activity goals regularly. Your commitment is paying off!',
    recommendation: 'Consider setting new challenges to continue growing.',
    icon: 'trophy',
  },
];

const FALLBACK_RECOMMENDATIONS = [
  {
    title: 'Morning Movement',
    description: 'A 10-minute morning walk can boost mood and energy for the entire day.',
    action: 'Try tomorrow',
    icon: 'sunny-outline',
  },
  {
    title: 'Activity Breaks',
    description: 'Taking short movement breaks every hour improves focus and reduces fatigue.',
    action: 'Set reminders',
    icon: 'alarm-outline',
  },
  {
    title: 'Social Exercise',
    description: 'Exercising with others increases motivation and consistency.',
    action: 'Invite a friend',
    icon: 'people-outline',
  },
];

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
      const fallbackData = {
        coldStart: { stage: 'day0', daysSinceFirstLog: 0, totalLogs: 0, distinctDays: 0 },
        patterns: null,
        persona: FALLBACK_PERSONAS[0],
        personaConfidence: 0.5,
        prediction: null,
        recommendations: FALLBACK_RECOMMENDATIONS,
        weekData: generateFallbackWeekData(),
        dismissedInsightTypes: [],
      };

      try {
        const data = await apiClient.get('/activity/analytics/dashboard');
        // React Query requires returning a value - never undefined
        return data ?? fallbackData;
      } catch (error) {
        // Silently return fallback data - backend may not have endpoint yet
        if (__DEV__) {
          console.warn('[useActivityAnalytics] Using fallback data (endpoint may not exist yet)');
        }
        return fallbackData;
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
    recommendations: query.data?.recommendations,
    weekData: query.data?.weekData,
  }), [query.data, query.isLoading, query.isFetching, query.error, query.refetch]);
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
 */
export function useActivityRecommendations(options = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ACTIVITY_ANALYTICS_KEYS.recommendations(),
    queryFn: async () => {
      try {
        const response = await apiClient.get('/activity/analytics/recommendations');
        return response?.recommendations || FALLBACK_RECOMMENDATIONS;
      } catch {
        return FALLBACK_RECOMMENDATIONS;
      }
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    recommendations: query.data,
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
 * Generate fallback week data for display
 * Uses 2-char labels for Tuesday (Tu) and Thursday (Th) to avoid confusion
 */
function generateFallbackWeekData() {
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
      minutes: 0,
      type: null,
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
