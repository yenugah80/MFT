/**
 * useWellnessInsights Hook
 *
 * Fetches insights data from the backend for the Wellness Journey screen.
 * Includes:
 * - What to change next (priority recommendation)
 * - Personalized patterns (behavioral correlations)
 *
 * Uses React Query for caching and background refetching.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Fetch combined insights data
 */
async function fetchWellnessInsights() {
  try {
    // Fetch what-to-change and personalized patterns in parallel
    const [whatToChangeRes, patternsRes] = await Promise.all([
      apiClient.get('/insights/what-to-change').catch(() => null),
      apiClient.get('/insights/patterns/personalized').catch(() => null),
    ]);

    return {
      whatToChange: whatToChangeRes?.success ? whatToChangeRes : null,
      patterns: patternsRes?.success ? patternsRes : null,
    };
  } catch (error) {
    console.error('[useWellnessInsights] Fetch error:', error);
    return {
      whatToChange: null,
      patterns: null,
    };
  }
}

/**
 * Main hook for wellness insights
 */
export function useWellnessInsights() {
  const query = useQuery({
    queryKey: ['wellness-insights'],
    queryFn: fetchWellnessInsights,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  return {
    whatToChange: query.data?.whatToChange || null,
    patterns: query.data?.patterns?.patterns || [],
    topInsight: query.data?.patterns?.topInsight || null,
    dataQuality: query.data?.patterns?.dataQuality || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useWellnessInsights;
