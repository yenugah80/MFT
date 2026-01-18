/**
 * usePredictions Hook
 *
 * React Query hooks for proactive wellness predictions:
 * - Morning prediction: How will today go
 * - Meal feeling: How will this food make me feel
 * - Real-time interventions
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Fetch morning prediction for the day ahead
 */
async function fetchMorningPrediction() {
  const response = await apiClient.get('/predictions/morning');
  return response.data;
}

/**
 * Fetch time-aware prediction (adapts to current time of day)
 */
async function fetchTimeAwarePrediction() {
  const response = await apiClient.get('/predictions/now');
  return response.data;
}

/**
 * Fetch meal feeling prediction
 */
async function fetchMealFeeling(mealData) {
  const response = await apiClient.post('/predictions/meal-feeling', mealData);
  return response.data;
}

/**
 * Fetch real-time interventions
 */
async function fetchRealtimeInterventions({ lastMealHours, hydrationPercent }) {
  const params = new URLSearchParams();
  if (lastMealHours !== undefined) params.append('lastMealHours', lastMealHours);
  if (hydrationPercent !== undefined) params.append('hydrationPercent', hydrationPercent);

  const response = await apiClient.get(`/predictions/realtime?${params.toString()}`);
  return response.data;
}

/**
 * Hook for morning prediction
 * Automatically fetches on mount, refreshes every 30 minutes
 */
export function useMorningPrediction(options = {}) {
  const query = useQuery({
    queryKey: ['morning-prediction'],
    queryFn: fetchMorningPrediction,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    refetchOnWindowFocus: false,
    ...options,
  });

  return {
    prediction: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,

    // Convenience getters
    energyScore: query.data?.energyScore ?? null,
    energyLevel: query.data?.energyLevel ?? 'unknown',
    risks: query.data?.risks ?? [],
    preventionTips: query.data?.preventionTips ?? [],
    hasHighRisk: query.data?.hasHighRisk ?? false,
    confidence: query.data?.confidence ?? 0,
  };
}

/**
 * Hook for time-aware prediction (adapts throughout the day)
 * Use this instead of useMorningPrediction for dynamic predictions
 */
export function useTimeAwarePrediction(options = {}) {
  const query = useQuery({
    queryKey: ['time-aware-prediction'],
    queryFn: fetchTimeAwarePrediction,
    staleTime: 15 * 60 * 1000, // 15 minutes (shorter since it changes with time)
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
    refetchOnWindowFocus: true, // Refresh when user comes back
    ...options,
  });

  // Extract deep insights for convenience
  const deepInsights = query.data?.deepInsights ?? null;

  return {
    prediction: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,

    // Time-aware fields
    timePeriod: query.data?.timePeriod ?? 'morning',
    greeting: query.data?.greeting ?? 'Hello',
    forecastTitle: query.data?.forecastTitle ?? 'YOUR FORECAST',
    focusArea: query.data?.focusArea ?? null,
    nextMilestone: query.data?.nextMilestone ?? null,

    // Base prediction fields
    energyScore: query.data?.energyScore ?? null,
    energyLevel: query.data?.energyLevel ?? 'unknown',
    risks: query.data?.risks ?? [],
    preventionTips: query.data?.preventionTips ?? [],
    hasHighRisk: query.data?.hasHighRisk ?? false,
    confidence: query.data?.confidence ?? 0,

    // Deep insights (14-day analysis)
    deepInsights,
    hasDeepInsights: deepInsights?.hasDeepInsights ?? false,
    trends: deepInsights?.trends ?? null,
    crashPatterns: deepInsights?.crashPatterns ?? null,
    weekendPatterns: deepInsights?.weekendPatterns ?? null,

    // Logging consistency (for showing gaps to user)
    loggingConsistency: deepInsights?.loggingConsistency ?? null,
    loggingEncouragement: deepInsights?.encouragement ?? null,
    deepInsightsSummary: deepInsights?.summary ?? 'Keep logging to unlock insights',
  };
}

/**
 * Hook for meal feeling prediction
 * Use mutation pattern since we send meal data
 */
export function useMealFeelingPrediction() {
  const mutation = useMutation({
    mutationFn: fetchMealFeeling,
    retry: 1,
  });

  return {
    predictFeeling: mutation.mutate,
    predictFeelingAsync: mutation.mutateAsync,
    feeling: mutation.data,
    isLoading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,

    // Convenience getters from result
    impactScore: mutation.data?.impactScore ?? null,
    impactLabel: mutation.data?.impactLabel ?? '',
    timeline: mutation.data?.timeline ?? [],
    insights: mutation.data?.insights ?? [],
  };
}

/**
 * Hook for real-time interventions
 * Pass current state to get contextual suggestions
 */
export function useRealtimeInterventions(state = {}, options = {}) {
  const { lastMealHours, hydrationPercent } = state;

  const query = useQuery({
    queryKey: ['realtime-interventions', lastMealHours, hydrationPercent],
    queryFn: () => fetchRealtimeInterventions({ lastMealHours, hydrationPercent }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    enabled: options.enabled !== false,
    ...options,
  });

  return {
    interventions: query.data?.interventions ?? [],
    hasUrgent: query.data?.hasUrgent ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Fetch prediction stories for "Remember when" moments
 */
async function fetchPredictionStories() {
  const response = await apiClient.get('/predictions/stories');
  return response.data;
}

/**
 * Acknowledge a story
 */
async function acknowledgeStory(storyId, reaction) {
  const response = await apiClient.post(
    `/predictions/stories/${storyId}/acknowledge`,
    { reaction }
  );
  return response.data;
}

/**
 * Hook for prediction stories ("Remember when" moments)
 */
export function usePredictionStories(options = {}) {
  const query = useQuery({
    queryKey: ['prediction-stories'],
    queryFn: fetchPredictionStories,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: ({ storyId, reaction }) => acknowledgeStory(storyId, reaction),
  });

  return {
    stories: query.data?.stories ?? [],
    hasStories: query.data?.hasStories ?? false,
    storiesCount: query.data?.count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // Actions
    acknowledgeStory: (storyId, reaction) =>
      acknowledgeMutation.mutateAsync({ storyId, reaction }),
    isAcknowledging: acknowledgeMutation.isPending,
  };
}

/**
 * Hook for user's personalized thresholds
 */
export function usePersonalizedThresholds(options = {}) {
  const query = useQuery({
    queryKey: ['personalized-thresholds'],
    queryFn: async () => {
      const response = await apiClient.get('/predictions/thresholds');
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
    ...options,
  });

  return {
    thresholds: query.data?.thresholds ?? {},
    byDomain: query.data?.byDomain ?? {},
    isPersonalized: query.data?.isPersonalized ?? false,
    domains: query.data?.domains ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default {
  useMorningPrediction,
  useTimeAwarePrediction,
  useMealFeelingPrediction,
  useRealtimeInterventions,
  usePredictionStories,
  usePersonalizedThresholds,
};
