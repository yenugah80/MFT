/**
 * useMoodInsights Hook
 * Fetches AI-powered mood insights from backend
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Hook for fetching AI-generated mood insights
 * @param {Object} options - Query options
 * @param {number} options.days - Number of days to analyze (default: 30)
 * @param {boolean} options.enabled - Whether to enable the query (default: true)
 * @returns {Object} - React Query result with insights data
 */
export function useMoodInsights({ days = 30, enabled = true } = {}) {
  return useQuery({
    queryKey: ['moodInsights', days],
    queryFn: async () => {
      const response = await apiClient.post('/mood/insights', { days });
      return response.data;
    },
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 1, // Only retry once for AI insights
  });
}
