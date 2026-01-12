/**
 * useInsights - Custom hooks for premium intelligence features
 *
 * Provides:
 * - Predictive insights (energy, mood, nutrient predictions)
 * - Behavioral correlations (food-mood patterns)
 * - Weekly narrative (story of the week)
 * - What to change (priority recommendation)
 *
 * Part of the 5W2H intelligent wellness system.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * usePredictiveInsights - Fetch energy, mood, and nutrient predictions
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 * @param {number} options.days - Lookback period in days (default: 14)
 */
export function usePredictiveInsights({ enabled = true, days = 14 } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['insights', 'predictive', days],
    queryFn: async () => {
      try {
        console.log('[useInsights] Fetching predictive insights...');
        const response = await apiClient.get('/insights/predictive', {
          params: { days }
        });
        console.log('[useInsights] Predictive insights received');
        return response;
      } catch (err) {
        console.error('[useInsights] Predictive fetch error:', err);
        throw new Error(err?.response?.data?.error || 'Failed to fetch predictions');
      }
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Transform data to frontend format
  const predictions = data?.predictions || {};

  return {
    // Energy prediction
    energyPrediction: predictions.energy ? {
      id: 'energy',
      type: 'energy',
      icon: '⚡',
      statement: predictions.energy.statement,
      hourlyLevels: predictions.energy.hourlyLevels,
      prevention: predictions.energy.prevention,
      confidence: predictions.energy.confidence,
      metric: { current: predictions.energy.hourlyLevels?.[12] || 50, trend: 'stable' },
      suggestion: predictions.energy.prevention,
    } : null,

    // Mood prediction
    moodPrediction: predictions.mood ? {
      id: 'mood',
      type: 'mood',
      icon: '😊',
      statement: predictions.mood.statement,
      moodScores: predictions.mood.moodScores,
      factor: predictions.mood.factor,
      percentage: predictions.mood.percentage,
      confidence: predictions.mood.confidence,
      metric: { current: predictions.mood.percentage, trend: 'down' },
      suggestion: predictions.mood.suggestion,
    } : null,

    // Nutrient prediction
    nutrientPrediction: predictions.nutrient ? {
      id: 'nutrient',
      type: 'nutrient',
      icon: '🥗',
      statement: predictions.nutrient.statement,
      nutrients: predictions.nutrient.nutrients,
      confidence: predictions.nutrient.confidence,
      metric: {
        current: predictions.nutrient.nutrients?.[0]?.current || 0,
        trend: 'down'
      },
      suggestion: predictions.nutrient.recommendation,
    } : null,

    // All predictions as array for easy mapping
    allPredictions: [
      predictions.energy && { ...predictions.energy, id: 'energy', type: 'energy', icon: '⚡' },
      predictions.mood && { ...predictions.mood, id: 'mood', type: 'mood', icon: '😊' },
      predictions.nutrient && { ...predictions.nutrient, id: 'nutrient', type: 'nutrient', icon: '🥗' },
    ].filter(Boolean),

    dataPoints: data?.dataPoints || 0,
    lookbackDays: data?.lookbackDays || days,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}

/**
 * useCorrelations - Fetch behavioral correlations
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 * @param {number} options.limit - Max correlations to return (default: 5)
 */
export function useCorrelations({ enabled = true, limit = 5 } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['insights', 'correlations', limit],
    queryFn: async () => {
      try {
        console.log('[useInsights] Fetching correlations...');
        const response = await apiClient.get('/insights/correlations', {
          params: { limit }
        });
        console.log('[useInsights] Correlations received');
        return response;
      } catch (err) {
        console.error('[useInsights] Correlations fetch error:', err);
        throw new Error(err?.response?.data?.error || 'Failed to fetch correlations');
      }
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    correlations: data?.correlations || [],
    source: data?.source || 'unknown',
    isLoading,
    isFetching,
    error,
    refetch,
    hasCorrelations: (data?.correlations?.length || 0) > 0,
  };
}

/**
 * useWeeklyNarrative - Fetch weekly health story
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 */
export function useWeeklyNarrative({ enabled = true } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['insights', 'weekly-narrative'],
    queryFn: async () => {
      try {
        console.log('[useInsights] Fetching weekly narrative...');
        const response = await apiClient.get('/insights/weekly-narrative');
        console.log('[useInsights] Weekly narrative received');
        return response;
      } catch (err) {
        console.error('[useInsights] Weekly narrative fetch error:', err);
        throw new Error(err?.response?.data?.error || 'Failed to fetch weekly narrative');
      }
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    weekRange: data?.weekRange || 'This Week',
    dateLabel: data?.dateLabel || '',
    narrative: data?.narrative || '',
    highlights: data?.highlights || [],
    metrics: data?.metrics || {
      mealsLogged: { value: '0/21' },
      nutriScore: { current: 'C' },
      waterGoalDays: { value: '0/7' },
      moodAverage: { value: '5.0' },
    },
    focusAreas: data?.focusAreas || [],
    isLoading,
    isFetching,
    error,
    refetch,
    hasData: Boolean(data?.narrative),
  };
}

/**
 * useWhatToChange - Fetch priority change recommendation
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 */
export function useWhatToChange({ enabled = true } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['insights', 'what-to-change'],
    queryFn: async () => {
      try {
        console.log('[useInsights] Fetching what-to-change...');
        const response = await apiClient.get('/insights/what-to-change');
        console.log('[useInsights] What-to-change received');
        return response;
      } catch (err) {
        console.error('[useInsights] What-to-change fetch error:', err);
        throw new Error(err?.response?.data?.error || 'Failed to fetch recommendation');
      }
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    title: data?.title || '',
    subtitle: data?.subtitle || '',
    whyMatters: data?.whyMatters || [],
    difficulty: data?.difficulty || 'easy',
    impact: data?.impact || 'medium',
    timeRequired: data?.timeRequired || '',
    schedule: data?.schedule || [],
    alternatives: data?.alternatives || [],
    confidence: data?.confidence || 0,
    dataPoints: data?.dataPoints || 0,
    isLoading,
    isFetching,
    error,
    refetch,
    hasData: Boolean(data?.title),
  };
}

/**
 * useInsights - Combined hook for all insights
 * Convenience hook that fetches all insight types at once
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch all (default: true)
 */
export function useInsights({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  const predictive = usePredictiveInsights({ enabled });
  const correlations = useCorrelations({ enabled });
  const weeklyNarrative = useWeeklyNarrative({ enabled });
  const whatToChange = useWhatToChange({ enabled });

  const isLoading = predictive.isLoading || correlations.isLoading ||
                    weeklyNarrative.isLoading || whatToChange.isLoading;

  const isFetching = predictive.isFetching || correlations.isFetching ||
                     weeklyNarrative.isFetching || whatToChange.isFetching;

  const hasAnyError = predictive.error || correlations.error ||
                      weeklyNarrative.error || whatToChange.error;

  const refetchAll = () => {
    predictive.refetch();
    correlations.refetch();
    weeklyNarrative.refetch();
    whatToChange.refetch();
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['insights'] });
  };

  return {
    // Individual data
    predictive,
    correlations,
    weeklyNarrative,
    whatToChange,

    // Combined state
    isLoading,
    isFetching,
    hasAnyError,

    // Actions
    refetchAll,
    invalidateAll,

    // Convenience booleans
    hasPredictions: predictive.allPredictions?.length > 0,
    hasCorrelations: correlations.hasCorrelations,
    hasWeeklyNarrative: weeklyNarrative.hasData,
    hasWhatToChange: whatToChange.hasData,
  };
}

export default useInsights;
