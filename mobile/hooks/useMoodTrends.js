/**
 * useMoodTrends Hook
 * Fetches aggregated mood trend data for charting
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Hook for fetching mood trends data
 * @param {Object} options - Query options
 * @param {string} options.period - Period to fetch: 'day' | 'week' | 'month'
 * @param {number} options.days - Number of days (alternative to period)
 * @returns {Object} - React Query result with trend data
 */
export function useMoodTrends({ period = 'week', days }) {
  return useQuery({
    queryKey: ['moodTrends', period, days],
    queryFn: async () => {
      const params = days ? { days } : { period };
      const response = await apiClient.get('/mood/trends', { params });

      // Validate response structure
      if (!response || !response.data) {
        throw new Error('Invalid response from mood trends API');
      }

      // Ensure data is an object with expected structure
      const data = response.data;
      if (typeof data !== 'object') {
        throw new Error('Invalid mood trends data format');
      }

      // Validate data array if it exists
      if (data.data && !Array.isArray(data.data)) {
        throw new Error('Mood trends data must be an array');
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Calculate quick stats from trend data
 * @param {Array} trendData - Trend data from API
 * @returns {Object} - Stats object
 */
export function calculateMoodStats(trendData) {
  if (!trendData || trendData.length === 0) {
    return {
      avgMood: '0.0',
      bestDay: 'N/A',
      patternsDetected: false,
    };
  }

  // Find best day
  const bestEntry = trendData.reduce((best, current) => {
    return current.intensity > (best?.intensity || 0) ? current : best;
  }, null);

  const bestDay = bestEntry
    ? new Date(bestEntry.loggedDate).toLocaleDateString('en-US', { weekday: 'short' })
    : 'N/A';

  // Calculate average mood
  const avgIntensity =
    trendData.reduce((sum, entry) => sum + (entry.intensity || 0), 0) / trendData.length;
  const avgMood = avgIntensity.toFixed(1);

  // Detect patterns (simple heuristic: variance in mood)
  const variance =
    trendData.reduce(
      (sum, entry) => sum + Math.pow((entry.intensity || 0) - avgIntensity, 2),
      0
    ) / trendData.length;
  const patternsDetected = variance > 2; // If variance > 2, consider patterns detected

  return {
    avgMood,
    bestDay,
    patternsDetected,
  };
}
