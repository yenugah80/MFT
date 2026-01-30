/**
 * usePersonalizedInsights - Hook for accessing deep personalized insights
 *
 * Fetches pattern-mined data from the backend:
 * - Food-mood correlations specific to THIS user
 * - Timing patterns (breakfast, late eating, day-of-week)
 * - Cross-domain correlations (activity, sleep, hydration, stress)
 * - Personalized narratives and recommendations
 *
 * This is the "magic" that makes recommendations feel personal
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import apiClient from '../services/apiClient';

const QUERY_KEY = 'personalized-insights';

/**
 * Main hook for personalized insights
 */
export function usePersonalizedInsights(options = {}) {
  const {
    enabled = true,
    lookbackDays = 30
  } = options;

  const queryClient = useQueryClient();

  // Full personalized narrative query (FIXED: removed duplicate /personalized)
  const narrativeQuery = useQuery({
    queryKey: [QUERY_KEY, 'narrative', lookbackDays],
    queryFn: async () => {
      const response = await apiClient.get('/insights/personalized', {
        params: { days: lookbackDays }
      });
      return response;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes (patterns don't change fast)
    cacheTime: 30 * 60 * 1000, // 30 minutes cache
    retry: 2,
  });

  // Quick insight query (for dashboard)
  const quickInsightQuery = useQuery({
    queryKey: [QUERY_KEY, 'quick'],
    queryFn: async () => {
      const response = await apiClient.get('/insights/personalized/quick');
      return response;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000,
    retry: 2,
  });

  // Food correlations query
  const foodCorrelationsQuery = useQuery({
    queryKey: [QUERY_KEY, 'food-correlations', lookbackDays],
    queryFn: async () => {
      const response = await apiClient.get('/insights/personalized/food-correlations', {
        params: { days: lookbackDays }
      });
      return response;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: 2,
  });

  // Timing patterns query
  const timingQuery = useQuery({
    queryKey: [QUERY_KEY, 'timing', lookbackDays],
    queryFn: async () => {
      const response = await apiClient.get('/insights/personalized/timing', {
        params: { days: lookbackDays }
      });
      return response;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: 2,
  });

  // Cross-domain patterns query (activity, sleep, hydration, stress correlations)
  const patternsQuery = useQuery({
    queryKey: [QUERY_KEY, 'patterns', lookbackDays],
    queryFn: async () => {
      const response = await apiClient.get('/insights/personalized/patterns', {
        params: { days: lookbackDays }
      });
      return response;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: 2,
  });

  // Summary query (lightweight)
  const summaryQuery = useQuery({
    queryKey: [QUERY_KEY, 'summary'],
    queryFn: async () => {
      const response = await apiClient.get('/insights/personalized/summary');
      return response;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    retry: 2,
  });

  // Process and combine data
  const insights = useMemo(() => {
    const narrative = narrativeQuery.data;
    const quickInsight = quickInsightQuery.data;
    const foodCorrelations = foodCorrelationsQuery.data;
    const timing = timingQuery.data;
    const patterns = patternsQuery.data;
    const summary = summaryQuery.data;

    return {
      // Full narrative sections
      narrative: narrative?.narrative || null,
      patterns: narrative?.patterns || patterns?.patterns || [],

      // Quick insight for dashboard
      quickInsight: quickInsight?.insight || null,
      quickInsightType: quickInsight?.type || 'encourage',

      // Food-specific data (normalize property names)
      goodFoods: (foodCorrelations?.goodFoods || []).map(f => ({
        ...f,
        energyBoost: f.energyBoost ?? f.energyImpact ?? 0,
        moodBoost: f.moodBoost ?? f.moodImpact ?? 0,
      })),
      watchFoods: (foodCorrelations?.watchFoods || []).map(f => ({
        ...f,
        energyImpact: f.energyImpact ?? f.energyBoost ?? 0,
        moodImpact: f.moodImpact ?? f.moodBoost ?? 0,
      })),

      // Timing data
      timingPatterns: timing?.timingPatterns || [],
      bestDay: timing?.summary?.bestDay || null,
      challengingDay: timing?.summary?.challengingDay || null,

      // Cross-domain correlations (NEW)
      activityCorrelations: patterns?.activityCorrelations || [],
      sleepCorrelations: patterns?.sleepCorrelations || [],
      hydrationCorrelations: patterns?.hydrationCorrelations || [],
      stressCorrelations: patterns?.stressCorrelations || [],

      // Food correlations by type (from patterns endpoint)
      foodSleepCorrelations: patterns?.foodSleepCorrelations || [],
      foodStressCorrelations: patterns?.foodStressCorrelations || [],

      // Summary stats
      hasInsights: summary?.summary?.hasInsights || (patterns?.patterns?.length > 0) || false,
      patternsFound: summary?.summary?.patternsFound || patterns?.patterns?.length || 0,
      dataStatus: summary?.summary?.dataStatus || 'building',
      dataProgress: summary?.summary?.dataProgress || patterns?.dataSufficiency || { food: 0, mood: 0 },

      // Data quality/sufficiency
      dataSufficiency: patterns?.dataSufficiency ||
                       narrative?.narrative?.dataQuality ||
                       foodCorrelations?.dataSufficiency ||
                       { sufficient: false, overallScore: 0 }
    };
  }, [
    narrativeQuery.data,
    quickInsightQuery.data,
    foodCorrelationsQuery.data,
    timingQuery.data,
    patternsQuery.data,
    summaryQuery.data
  ]);

  // Helper: Get insight for a specific context
  const getContextualInsight = useCallback((context) => {
    if (!insights.hasInsights) return null;

    const { goodFoods, timingPatterns, quickInsight } = insights;

    switch (context) {
      case 'morning':
        // Check for breakfast timing pattern
        const breakfastPattern = timingPatterns.find(p => p.type === 'BREAKFAST_TIMING');
        if (breakfastPattern) return breakfastPattern.insight;
        break;

      case 'mealtime':
        // Suggest a good food
        if (goodFoods.length > 0) {
          const topFood = goodFoods[0];
          return `${topFood.food} tends to boost your energy by ${topFood.energyBoost}%`;
        }
        break;

      case 'evening':
        // Check for late eating pattern
        const latePattern = timingPatterns.find(p => p.type === 'LATE_EATING');
        if (latePattern) return latePattern.insight;
        break;

      default:
        return quickInsight?.text;
    }

    return quickInsight?.text;
  }, [insights]);

  // Helper: Check if a food is good/bad for this user
  const checkFood = useCallback((foodName) => {
    const normalizedName = foodName.toLowerCase().trim();

    const isGood = insights.goodFoods.some(f =>
      f.food.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(f.food.toLowerCase())
    );

    const isWatch = insights.watchFoods.some(f =>
      f.food.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(f.food.toLowerCase())
    );

    if (isGood) {
      const food = insights.goodFoods.find(f =>
        f.food.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(f.food.toLowerCase())
      );
      return {
        status: 'good',
        message: `${food.food} works well for you (+${food.energyBoost}% energy)`,
        confidence: food.confidence
      };
    }

    if (isWatch) {
      const food = insights.watchFoods.find(f =>
        f.food.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(f.food.toLowerCase())
      );
      return {
        status: 'watch',
        message: food.suggestion,
        confidence: food.confidence
      };
    }

    return { status: 'neutral', message: null, confidence: 0 };
  }, [insights]);

  // Refresh all insights
  const refresh = useCallback(() => {
    return Promise.all([
      narrativeQuery.refetch(),
      quickInsightQuery.refetch(),
      foodCorrelationsQuery.refetch(),
      timingQuery.refetch(),
      patternsQuery.refetch(),
      summaryQuery.refetch()
    ]);
  }, [narrativeQuery, quickInsightQuery, foodCorrelationsQuery, timingQuery, patternsQuery, summaryQuery]);

  // Prefetch narrative (for navigation) - FIXED: removed duplicate /personalized
  const prefetchNarrative = useCallback(() => {
    return queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, 'narrative', lookbackDays],
      queryFn: () => apiClient.get('/insights/personalized', { params: { days: lookbackDays } })
    });
  }, [queryClient, lookbackDays]);

  return {
    // Core data
    insights,

    // Convenience accessors
    narrative: insights.narrative,
    patterns: insights.patterns,
    quickInsight: insights.quickInsight,
    goodFoods: insights.goodFoods,
    watchFoods: insights.watchFoods,
    timingPatterns: insights.timingPatterns,
    bestDay: insights.bestDay,
    challengingDay: insights.challengingDay,
    hasInsights: insights.hasInsights,
    patternsFound: insights.patternsFound,
    dataStatus: insights.dataStatus,
    dataProgress: insights.dataProgress,
    dataSufficiency: insights.dataSufficiency,

    // Cross-domain correlations (NEW)
    activityCorrelations: insights.activityCorrelations,
    sleepCorrelations: insights.sleepCorrelations,
    hydrationCorrelations: insights.hydrationCorrelations,
    stressCorrelations: insights.stressCorrelations,
    foodSleepCorrelations: insights.foodSleepCorrelations,
    foodStressCorrelations: insights.foodStressCorrelations,

    // Helpers
    getContextualInsight,
    checkFood,
    prefetchNarrative,

    // Loading states
    isLoading: narrativeQuery.isLoading || quickInsightQuery.isLoading || patternsQuery.isLoading,
    isFetching: narrativeQuery.isFetching || quickInsightQuery.isFetching || patternsQuery.isFetching,
    isError: narrativeQuery.isError || patternsQuery.isError,
    error: narrativeQuery.error || patternsQuery.error,

    // Actions
    refetch: refresh,

    // Raw queries (for advanced use)
    queries: {
      narrative: narrativeQuery,
      quickInsight: quickInsightQuery,
      foodCorrelations: foodCorrelationsQuery,
      timing: timingQuery,
      patterns: patternsQuery,
      summary: summaryQuery
    }
  };
}

/**
 * Lightweight hook for just the quick insight (dashboard use)
 */
export function useQuickInsight() {
  const query = useQuery({
    queryKey: [QUERY_KEY, 'quick'],
    queryFn: async () => {
      const response = await apiClient.get('/insights/personalized/quick');
      return response;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 15 * 60 * 1000,
    retry: 2,
  });

  return {
    insight: query.data?.insight || null,
    type: query.data?.type || 'encourage',
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}

/**
 * Hook for food correlations only (meal suggestion use)
 * Now includes food-mood, food-sleep, and food-stress correlations
 */
export function useFoodCorrelations(options = {}) {
  const { lookbackDays = 30 } = options;

  const query = useQuery({
    queryKey: [QUERY_KEY, 'food-correlations', lookbackDays],
    queryFn: async () => {
      const response = await apiClient.get('/insights/personalized/food-correlations', {
        params: { days: lookbackDays }
      });
      return response;
    },
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: 2,
  });

  return {
    goodFoods: (query.data?.goodFoods || []).map(f => ({
      ...f,
      // Normalize property names for consistency
      energyBoost: f.energyBoost ?? f.energyImpact ?? 0,
      moodBoost: f.moodBoost ?? f.moodImpact ?? 0,
    })),
    watchFoods: (query.data?.watchFoods || []).map(f => ({
      ...f,
      energyImpact: f.energyImpact ?? f.energyBoost ?? 0,
      moodImpact: f.moodImpact ?? f.moodBoost ?? 0,
    })),
    byType: query.data?.byType || null,
    dataSufficiency: query.data?.dataSufficiency || null,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}

/**
 * Hook for cross-domain patterns (activity, sleep, hydration, stress)
 */
export function useCrossDomainPatterns(options = {}) {
  const { lookbackDays = 30, enabled = true } = options;

  const query = useQuery({
    queryKey: [QUERY_KEY, 'patterns', lookbackDays],
    queryFn: async () => {
      const response = await apiClient.get('/insights/personalized/patterns', {
        params: { days: lookbackDays }
      });
      return response;
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: 2,
  });

  return {
    patterns: query.data?.patterns || [],
    activityCorrelations: query.data?.activityCorrelations || [],
    sleepCorrelations: query.data?.sleepCorrelations || [],
    hydrationCorrelations: query.data?.hydrationCorrelations || [],
    stressCorrelations: query.data?.stressCorrelations || [],
    foodSleepCorrelations: query.data?.foodSleepCorrelations || [],
    foodStressCorrelations: query.data?.foodStressCorrelations || [],
    dataSufficiency: query.data?.dataSufficiency || null,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}

export default usePersonalizedInsights;
