/**
 * useRecommendations - Custom hook for managing food recommendations
 *
 * Uses React Query for:
 * - Automatic caching (5-minute TTL)
 * - Request deduplication
 * - Automatic refetching
 * - Cache invalidation
 *
 * Handles:
 * - Fetching personalized recommendations
 * - Tracking user interactions (view, accept, reject)
 * - Accepting recommendations and adding to food log
 * - Fetching recommendation history with filters
 * - Error handling and notifications
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

export function useRecommendations() {
  const queryClient = useQueryClient();

  // ============================================================================
  // FETCH RECOMMENDATIONS (useQuery handles deduplication + caching automatically)
  // ============================================================================
  const {
    data: recommendations = [],
    isLoading: loading,
    error,
    refetch: fetchRecommendations,
    isFetching
  } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/recommendations', {
          params: { limit: 5 },
          _timeout: 15000 // 15s timeout for recommendations endpoint (complex AI processing)
        });
        return response.data?.recommendations || [];
      } catch (err) {
        // Distinguish timeout from other errors
        const isTimeout = err.message === 'Request timeout';
        const errorMessage = isTimeout
          ? 'Request took too long (15s) - try again'
          : err?.response?.data?.error || 'Failed to load recommendations';

        console.error('[useRecommendations] Fetch error:', err);
        throw new Error(errorMessage);
      }
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME, // formerly cacheTime
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // ============================================================================
  // TRACK INTERACTION (useMutation)
  // ============================================================================
  const trackInteractionMutation = useMutation({
    mutationFn: async ({ recommendationId, action, meta }) => {
      const response = await apiClient.post(`/recommendations/${recommendationId}/track`, {
        action,
        ...meta
      });
      return response.data;
    },
    onError: (err) => {
      console.error('[useRecommendations] Track error:', err);
    }
  });

  const trackInteraction = useCallback(async (recommendationId, action, meta = {}) => {
    try {
      await trackInteractionMutation.mutateAsync({ recommendationId, action, meta });
      return true;
    } catch (err) {
      console.error('[useRecommendations] Track error:', err);
      return false;
    }
  }, [trackInteractionMutation]);

  // ============================================================================
  // ACCEPT RECOMMENDATION (useMutation + cache invalidation)
  // ============================================================================
  const acceptRecommendationMutation = useMutation({
    mutationFn: async (recommendation) => {
      // Track interaction
      await trackInteraction(recommendation.id, 'accept');

      // Accept and add to log
      const response = await apiClient.post(
        `/recommendations/${recommendation.id}/accept`,
        {
          portion: recommendation.portion,
          mealType: recommendation.mealType
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // CRITICAL FIX: Invalidate cache AND refetch new recommendations
      // React Query automatically handles this efficiently
      console.log('[useRecommendations] Invalidating recommendations cache after accept');
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      // Also invalidate dashboard cache so it updates immediately
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      console.error('[useRecommendations] Accept error:', err);
    }
  });

  const acceptRecommendation = useCallback(async (recommendation) => {
    try {
      const result = await acceptRecommendationMutation.mutateAsync(recommendation);
      return {
        success: true,
        foodLog: result?.foodLog,
        message: result?.message || 'Added to food log!'
      };
    } catch (err) {
      console.error('[useRecommendations] Accept error:', err);
      return {
        success: false,
        error: err?.response?.data?.error || 'Failed to add to log',
        foodLog: null
      };
    }
  }, [acceptRecommendationMutation, trackInteraction]);

  // ============================================================================
  // REJECT RECOMMENDATION (useMutation)
  // ============================================================================
  const rejectRecommendationMutation = useMutation({
    mutationFn: async ({ recommendationId, reason }) => {
      await trackInteraction(recommendationId, 'reject', { reason });
    },
    onError: (err) => {
      console.error('[useRecommendations] Reject error:', err);
    }
  });

  const rejectRecommendation = useCallback(async (recommendationId, reason) => {
    try {
      await rejectRecommendationMutation.mutateAsync({ recommendationId, reason });
      return { success: true };
    } catch (err) {
      console.error('[useRecommendations] Reject error:', err);
      return {
        success: false,
        error: err?.response?.data?.error || 'Failed to record rejection'
      };
    }
  }, [rejectRecommendationMutation, trackInteraction]);

  // ============================================================================
  // GET HISTORY (useQuery)
  // ============================================================================
  const getHistory = useCallback(async (filters = {}) => {
    const { days = 30, status, type, limit = 50 } = filters;

    try {
      const response = await apiClient.get('/recommendations/history/list', {
        params: {
          days,
          status,
          type,
          limit
        }
      });

      return {
        history: response.data?.history || [],
        stats: response.data?.stats || {}
      };
    } catch (err) {
      console.error('[useRecommendations] History fetch error:', err);
      return {
        history: [],
        stats: {},
        error: err?.response?.data?.error || 'Failed to fetch history'
      };
    }
  }, []);

  // ============================================================================
  // GET DETAILED RECOMMENDATION (useQuery)
  // ============================================================================
  const getDetailedRecommendation = useCallback(async (recommendationId) => {
    try {
      const response = await apiClient.get(`/recommendations/${recommendationId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('[useRecommendations] Detail fetch error:', err);
      return {
        success: false,
        error: err?.response?.data?.error || 'Failed to fetch recommendation details',
        data: null
      };
    }
  }, []);

  // ============================================================================
  // CLEAR CACHE (React Query)
  // ============================================================================
  const clearCache = useCallback(() => {
    console.log('[useRecommendations] Cache cleared on demand');
    queryClient.invalidateQueries({ queryKey: ['recommendations'] });
  }, [queryClient]);

  return {
    // State
    recommendations,
    loading,
    error,
    isFetching,

    // Methods
    fetchRecommendations,
    trackInteraction,
    acceptRecommendation,
    rejectRecommendation,
    getHistory,
    getDetailedRecommendation,
    clearCache,

    // Derived
    hasRecommendations: recommendations.length > 0,
    isEmpty: !loading && recommendations.length === 0
  };
}

/**
 * useRecommendationHistory - Hook for managing recommendation history and stats
 * Uses React Query for automatic caching and refetching
 */
export function useRecommendationHistory() {
  const queryClient = useQueryClient();

  const {
    data: historyData = { history: [], stats: {} },
    isLoading: loading,
    error,
    refetch: fetchHistory
  } = useQuery({
    queryKey: ['recommendations', 'history'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/recommendations/history/list');
        return {
          history: response.data?.history || [],
          stats: response.data?.stats || {}
        };
      } catch (err) {
        console.error('[useRecommendationHistory] Fetch error:', err);
        // Return empty state on error (prevents stale data display)
        throw err?.response?.data?.error || 'Failed to fetch history';
      }
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 1
  });

  return {
    history: historyData.history,
    stats: historyData.stats,
    loading,
    error,
    fetchHistory,
    isEmpty: historyData.history.length === 0
  };
}

/**
 * Format recommendation for display
 */
export function formatRecommendationForModal(recommendation) {
  return {
    ...recommendation,
    // Ensure all fields are present
    title: recommendation.title || '🥗 Recommendation',
    foodName: recommendation.foodName || 'Food',
    portion: recommendation.portion || '1 serving',
    calories: recommendation.calories || 0,
    protein: recommendation.protein || 0,
    carbs: recommendation.carbs || 0,
    fats: recommendation.fats || 0,
    fiber: recommendation.fiber || 0,
    sugar: recommendation.sugar || 0,
    micros: recommendation.micros || {},
    reason: recommendation.reason || '',
    tips: recommendation.tips || '',
    prepTimeMinutes: recommendation.prepTimeMinutes || 10,
    cookTimeMinutes: recommendation.cookTimeMinutes || 10,
    recipeInstructions: recommendation.recipeInstructions || '',
    difficulty: recommendation.difficulty || 'easy',
    mealType: recommendation.mealType || 'snack'
  };
}
