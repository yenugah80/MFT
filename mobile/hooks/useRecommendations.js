/**
 * useRecommendations - Custom hook for managing food recommendations
 *
 * Handles:
 * - Fetching personalized recommendations
 * - Tracking user interactions (view, accept, reject)
 * - Accepting recommendations and adding to food log
 * - Fetching recommendation history with filters
 * - Error handling and notifications
 */

import { useState, useCallback, useRef } from 'react';
import apiClient from '../services/apiClient';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // CRITICAL FIX: Request deduplication + AbortController
  // Prevents timeout cascades from duplicate concurrent requests
  const pendingRequestRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Fetch recommendations with deduplication
  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    // CRITICAL FIX: If request already pending, return existing promise
    // This prevents duplicate API calls on rapid double-clicks
    if (pendingRequestRef.current && !forceRefresh) {
      return pendingRequestRef.current;
    }

    // Check cache (skip if forceRefresh)
    if (!forceRefresh && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
      return recommendations;
    }

    setLoading(true);
    setError(null);

    // CRITICAL FIX: Cancel previous request if starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const newAbortController = new AbortController();
    abortControllerRef.current = newAbortController;

    const fetchPromise = (async () => {
      try {
        const response = await apiClient.get('/recommendations', {
          params: { limit: 5 },
          signal: newAbortController.signal
        });

        const recs = response.data?.recommendations || [];
        setRecommendations(recs);
        setLastFetchTime(Date.now());

        return recs;
      } catch (err) {
        // CRITICAL FIX: Distinguish timeout from other errors
        const isTimeout = err.message === 'Request timeout';
        const errorMessage = isTimeout
          ? 'Request took too long (10s) - try again'
          : err?.response?.data?.error || 'Failed to load recommendations';

        console.error('[useRecommendations] Fetch error:', err);
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
        // Clear pending request reference
        pendingRequestRef.current = null;
      }
    })();

    // Store promise for deduplication
    pendingRequestRef.current = fetchPromise;
    return fetchPromise;
  }, [recommendations, lastFetchTime]);

  // Track interaction with recommendation
  const trackInteraction = useCallback(async (recommendationId, action, meta = {}) => {
    try {
      await apiClient.post(`/recommendations/${recommendationId}/track`, {
        action,
        ...meta
      });

      return true;
    } catch (err) {
      console.error('[useRecommendations] Track error:', err);
      return false;
    }
  }, []);

  // Accept recommendation and add to food log
  const acceptRecommendation = useCallback(async (recommendation) => {
    try {
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

      // CRITICAL FIX: Clear cache AND refetch new recommendations
      // This prevents stale UI showing old recommendations for 5 minutes
      setLastFetchTime(null);
      console.log('[useRecommendations] Cache invalidated after accepting recommendation');

      // Auto-fetch fresh recommendations
      // Don't await - let it happen in background
      fetchRecommendations(true).catch(err => {
        console.error('[useRecommendations] Failed to refetch after accept:', err);
        // Silently fail - user already got success message
      });

      return {
        success: true,
        foodLog: response.data?.foodLog,
        message: response.data?.message || 'Added to food log!'
      };
    } catch (err) {
      console.error('[useRecommendations] Accept error:', err);
      return {
        success: false,
        error: err?.response?.data?.error || 'Failed to add to log',
        foodLog: null
      };
    }
  }, [trackInteraction, fetchRecommendations]);

  // Reject recommendation with reason
  const rejectRecommendation = useCallback(async (recommendationId, reason) => {
    try {
      await trackInteraction(recommendationId, 'reject', { reason });
      return { success: true };
    } catch (err) {
      console.error('[useRecommendations] Reject error:', err);
      return {
        success: false,
        error: err?.response?.data?.error || 'Failed to record rejection'
      };
    }
  }, [trackInteraction]);

  // Get recommendation history with optional filters
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

  // Get detailed recommendation
  const getDetailedRecommendation = useCallback(async (recommendationId) => {
    try {
      const response = await apiClient.get(`/recommendations/${recommendationId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (err) {
      console.error('[useRecommendations] Detail fetch error:', err);
      // CRITICAL FIX: Return consistent error format instead of throwing
      // Allows callers to handle uniformly: if (result.success) ... else error
      return {
        success: false,
        error: err?.response?.data?.error || 'Failed to fetch recommendation details',
        data: null
      };
    }
  }, []);

  // Clear cache on demand (useful when food is logged from other sources)
  const clearCache = useCallback(() => {
    setLastFetchTime(null);
    console.log('[useRecommendations] Cache cleared on demand');
  }, []);

  return {
    // State
    recommendations,
    loading,
    error,

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
 */
export function useRecommendationHistory() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/recommendations/history/list', {
        params: filters
      });

      setHistory(response.data?.history || []);
      setStats(response.data?.stats || {});

      return {
        history: response.data?.history || [],
        stats: response.data?.stats || {}
      };
    } catch (err) {
      console.error('[useRecommendationHistory] Fetch error:', err);
      setError(err?.response?.data?.error || 'Failed to fetch history');

      // CRITICAL FIX: Clear state on error
      // Previously: old history stayed in state while error message said "failed to fetch"
      // This confused users who thought they were looking at fresh data
      setHistory([]);
      setStats({});

      return { history: [], stats: {} };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    history,
    stats,
    loading,
    error,
    fetchHistory,
    isEmpty: history.length === 0
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
