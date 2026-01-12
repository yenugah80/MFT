/**
 * useOutcomes - Hook for outcome tracking and confidence data
 *
 * Fetches real analytics from the backend:
 * - Recommendation effectiveness rate
 * - Total recommendations tracked
 * - Data quality confidence score
 * - Wellness score confidence
 *
 * Part of the 5W2H Visual Intelligence System.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * useOutcomeStats - Fetch recommendation effectiveness stats
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 * @param {number} options.days - Lookback period (default: 30)
 */
export function useOutcomeStats({ enabled = true, days = 30 } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['outcomes', 'stats', days],
    queryFn: async () => {
      try {
        console.log('[useOutcomes] Fetching outcome stats...');
        const response = await apiClient.get('/outcomes/stats', {
          params: { days },
        });
        console.log('[useOutcomes] Outcome stats received:', response);
        return response;
      } catch (err) {
        console.error('[useOutcomes] Stats fetch error:', err);
        throw new Error(err?.response?.data?.error || 'Failed to fetch outcome stats');
      }
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    effectivenessRate: data?.effectivenessRate ?? 0,
    totalRecommendations: data?.totalRecommendations ?? 0,
    acceptedCount: data?.acceptedCount ?? 0,
    loggedCount: data?.loggedCount ?? 0,
    viewedCount: data?.viewedCount ?? 0,
    periodDays: data?.periodDays ?? days,
    hasData: (data?.totalRecommendations ?? 0) > 0,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

/**
 * useDataConfidence - Fetch overall data quality confidence
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 * @param {number} options.days - Lookback period (default: 14)
 */
export function useDataConfidence({ enabled = true, days = 14 } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['outcomes', 'confidence', days],
    queryFn: async () => {
      try {
        console.log('[useOutcomes] Fetching data confidence...');
        const response = await apiClient.get('/outcomes/confidence', {
          params: { days },
        });
        console.log('[useOutcomes] Data confidence received:', response);
        return response;
      } catch (err) {
        console.error('[useOutcomes] Confidence fetch error:', err);
        throw new Error(err?.response?.data?.error || 'Failed to fetch confidence');
      }
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    confidence: data?.confidence ?? 0.5,
    dataPoints: data?.dataPoints ?? 0,
    breakdown: data?.breakdown ?? { food: 0, water: 0, mood: 0 },
    factors: data?.factors ?? {},
    periodDays: data?.periodDays ?? days,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

/**
 * useWellnessConfidence - Fetch wellness score confidence specifically
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 */
export function useWellnessConfidence({ enabled = true } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['outcomes', 'wellness-confidence'],
    queryFn: async () => {
      try {
        console.log('[useOutcomes] Fetching wellness confidence...');
        const response = await apiClient.get('/outcomes/wellness-confidence');
        console.log('[useOutcomes] Wellness confidence received:', response);
        return response;
      } catch (err) {
        console.error('[useOutcomes] Wellness confidence fetch error:', err);
        throw new Error(err?.response?.data?.error || 'Failed to fetch wellness confidence');
      }
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    confidence: data?.confidence ?? 0.5,
    breakdown: data?.breakdown ?? {
      nutrition: 0.5,
      hydration: 0.5,
      mood: 0.5,
      habits: 0.5,
    },
    dataPoints: data?.dataPoints ?? { food: 0, water: 0, mood: 0 },
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

/**
 * useOutcomes - Combined hook for all outcome data
 */
export function useOutcomes({ enabled = true } = {}) {
  const stats = useOutcomeStats({ enabled });
  const confidence = useDataConfidence({ enabled });
  const wellnessConfidence = useWellnessConfidence({ enabled });

  return {
    stats,
    confidence,
    wellnessConfidence,
    isLoading: stats.isLoading || confidence.isLoading || wellnessConfidence.isLoading,
    isFetching: stats.isFetching || confidence.isFetching || wellnessConfidence.isFetching,
  };
}

export default useOutcomes;
