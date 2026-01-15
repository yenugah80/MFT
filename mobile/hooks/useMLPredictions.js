/**
 * useMLPredictions Hook
 *
 * React Query hook for fetching ML predictions and personalization status.
 * Provides cached, auto-refetching access to MTL service.
 *
 * FEATURES:
 * - Automatic caching with 5-minute stale time
 * - Background refetching on focus
 * - Parallel fetching of predictions, status, and insights
 * - Error handling with retry logic
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Query keys for cache management
 */
const QUERY_KEYS = {
  predictions: ['ml', 'predictions'],
  status: ['ml', 'status'],
  insights: ['ml', 'insights'],
  forecast: (days) => ['ml', 'forecast', days],
};

/**
 * Fetch predictions from MTL service
 */
async function fetchPredictions(date = null) {
  const endpoint = date ? `/mtl/predict/${date}` : '/mtl/predict';
  const response = await apiClient.get(endpoint);
  return response.data;
}

/**
 * Fetch personalization status
 */
async function fetchStatus() {
  const response = await apiClient.get('/mtl/status');
  return response.data;
}

/**
 * Fetch model insights
 */
async function fetchInsights() {
  const response = await apiClient.get('/mtl/insights');
  return response.data;
}

/**
 * Fetch multi-day forecast
 */
async function fetchForecast(days = 3) {
  const response = await apiClient.get(`/mtl/forecast?days=${days}`);
  return response.data;
}

/**
 * Main hook for ML predictions
 */
export function useMLPredictions(options = {}) {
  const { date = null, includeInsights = true } = options;

  const queryClient = useQueryClient();

  // Fetch predictions
  const predictionsQuery = useQuery({
    queryKey: date ? [...QUERY_KEYS.predictions, date] : QUERY_KEYS.predictions,
    queryFn: () => fetchPredictions(date),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch status (parallel)
  const statusQuery = useQuery({
    queryKey: QUERY_KEYS.status,
    queryFn: fetchStatus,
    staleTime: 10 * 60 * 1000, // 10 minutes (changes less frequently)
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });

  // Fetch insights (optional, parallel)
  const insightsQuery = useQuery({
    queryKey: QUERY_KEYS.insights,
    queryFn: fetchInsights,
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: includeInsights,
    retry: 1,
  });

  // Combined refetch function
  const refetch = async () => {
    await Promise.all([
      predictionsQuery.refetch(),
      statusQuery.refetch(),
      includeInsights && insightsQuery.refetch(),
    ].filter(Boolean));
  };

  return {
    // Data
    predictions: predictionsQuery.data,
    status: statusQuery.data,
    insights: insightsQuery.data,

    // Loading states
    isLoading: predictionsQuery.isLoading,
    isStatusLoading: statusQuery.isLoading,
    isInsightsLoading: insightsQuery.isLoading,
    isAnyLoading: predictionsQuery.isLoading || statusQuery.isLoading,

    // Error states
    error: predictionsQuery.error || statusQuery.error,
    predictionsError: predictionsQuery.error,
    statusError: statusQuery.error,

    // Refetch
    refetch,
    refetchPredictions: predictionsQuery.refetch,
    refetchStatus: statusQuery.refetch,

    // Query metadata
    lastUpdated: predictionsQuery.dataUpdatedAt,
    isFetching: predictionsQuery.isFetching,
  };
}

/**
 * Hook for multi-day forecast
 */
export function useMLForecast(days = 3) {
  return useQuery({
    queryKey: QUERY_KEYS.forecast(days),
    queryFn: () => fetchForecast(days),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook for triggering model update
 */
export function useUpdateMLModel() {
  const queryClient = useQueryClient();

  const updateModel = async () => {
    try {
      const response = await apiClient.post('/mtl/update');

      // Invalidate related queries to refetch
      queryClient.invalidateQueries(QUERY_KEYS.predictions);
      queryClient.invalidateQueries(QUERY_KEYS.status);
      queryClient.invalidateQueries(QUERY_KEYS.insights);

      return response.data;
    } catch (error) {
      console.error('[useMLPredictions] Error updating model:', error);
      throw error;
    }
  };

  return { updateModel };
}

/**
 * Hook for specific task prediction
 */
export function useTaskPrediction(task) {
  const { predictions, isLoading, error } = useMLPredictions();

  return {
    prediction: predictions?.predictions?.[task],
    confidence: predictions?.personalization?.confidence,
    isLoading,
    error,
  };
}

/**
 * Prefetch predictions (for navigation optimization)
 */
export function usePrefetchPredictions() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.predictions,
      queryFn: () => fetchPredictions(),
      staleTime: 5 * 60 * 1000,
    });
  };
}

export default useMLPredictions;
