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
        console.log('[useInsights] Correlations received:', response);
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

  // Transform backend correlations to frontend format
  const transformedCorrelations = (data?.correlations || []).map(corr => ({
    id: corr.id,
    // Construct pattern from factor + outcome (e.g., "High-carb meals → afternoon tiredness")
    pattern: corr.factor && corr.outcome
      ? `${capitalizeFirst(corr.factor)} → ${corr.outcome}`
      : corr.explanation || 'Pattern detected',
    // Normalize confidence to 0-1 scale (backend may return 0-100 or 0-1)
    confidence: corr.confidence > 1 ? corr.confidence / 100 : (corr.confidence || 0),
    // Map instances/dataPoints to occurrences
    occurrences: corr.instances || corr.dataPoints || corr.occurrences || 0,
    // Transform for affected domains display
    impacts: buildImpacts(corr),
    // Original data for UI display
    type: corr.type,
    explanation: corr.explanation,
    suggestion: corr.suggestion,
  }));

  return {
    correlations: transformedCorrelations,
    source: data?.source || 'unknown',
    isLoading,
    isFetching,
    error,
    refetch,
    hasCorrelations: transformedCorrelations.length > 0,
  };
}

// ============================================================================
// HELPER FUNCTIONS FOR DATA TRANSFORMATION
// ============================================================================

// Capitalize first letter
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Build impacts array from correlation data
function buildImpacts(corr) {
  const impacts = [];

  // Extract from outcome
  if (corr.outcome) {
    const moodDomain = extractMoodDomain(corr.outcome);
    if (moodDomain) impacts.push({ label: moodDomain, icon: getDomainIcon(moodDomain) });
  }

  // Extract from factor
  if (corr.factor) {
    const foodDomain = extractFoodDomain(corr.factor);
    if (foodDomain && !impacts.some(i => i.label === foodDomain)) {
      impacts.push({ label: foodDomain, icon: getDomainIcon(foodDomain) });
    }
  }

  // Extract from type
  if (corr.type === 'positive') {
    impacts.push({ label: 'positive', icon: 'trending-up' });
  } else if (corr.type === 'negative') {
    impacts.push({ label: 'caution', icon: 'alert-circle-outline' });
  }

  return impacts.slice(0, 3); // Max 3 impacts
}

// Extract mood domain from outcome string
function extractMoodDomain(outcome) {
  if (!outcome) return null;
  const lower = outcome.toLowerCase();
  if (lower.includes('energy') || lower.includes('energized')) return 'energy';
  if (lower.includes('mood') || lower.includes('happy') || lower.includes('positive')) return 'mood';
  if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('tiredness')) return 'energy';
  if (lower.includes('stress') || lower.includes('anxious') || lower.includes('irritable')) return 'stress';
  if (lower.includes('focus') || lower.includes('clarity') || lower.includes('concentration')) return 'focus';
  if (lower.includes('sleep') || lower.includes('rest')) return 'sleep';
  if (lower.includes('calm') || lower.includes('relaxed')) return 'mood';
  return 'mood';
}

// Extract food domain from factor string
function extractFoodDomain(factor) {
  if (!factor) return null;
  const lower = factor.toLowerCase();
  if (lower.includes('carb') || lower.includes('sugar') || lower.includes('glucose')) return 'nutrition';
  if (lower.includes('protein')) return 'nutrition';
  if (lower.includes('water') || lower.includes('hydrat') || lower.includes('drink')) return 'hydration';
  if (lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('meal')) return 'nutrition';
  if (lower.includes('fat') || lower.includes('fiber')) return 'nutrition';
  return null;
}

// Get Ionicon name for domain
function getDomainIcon(domain) {
  const icons = {
    energy: 'flash',
    mood: 'happy-outline',
    stress: 'pulse',
    focus: 'eye',
    sleep: 'moon',
    nutrition: 'nutrition',
    hydration: 'water',
    positive: 'trending-up',
    caution: 'alert-circle-outline',
  };
  return icons[domain] || 'analytics';
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
 * useAIAnalysis - OpenAI-powered deep pattern analysis
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 * @param {number} options.days - Lookback period in days (default: 14)
 */
export function useAIAnalysis({ enabled = true, days = 14 } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['insights', 'ai-analysis', days],
    queryFn: async () => {
      try {
        console.log('[useInsights] Fetching AI analysis...');
        const response = await apiClient.get('/insights/ai-analysis', {
          params: { days }
        });
        console.log('[useInsights] AI analysis received:', response?.source);
        return response;
      } catch (err) {
        console.error('[useInsights] AI analysis fetch error:', err);
        throw new Error(err?.response?.data?.error || 'Failed to fetch AI analysis');
      }
    },
    enabled,
    staleTime: STALE_TIME * 2, // Cache longer for AI analysis (10 minutes)
    gcTime: CACHE_TIME * 2, // 60 minutes cache
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Transform AI insights to frontend format
  const transformedInsights = (data?.insights || []).map((insight, idx) => ({
    id: `ai-insight-${idx}`,
    type: insight.type,
    title: insight.title,
    statement: insight.statement,
    confidence: insight.confidence || 0,
    evidencePoints: insight.evidencePoints || [],
    affectedDomains: insight.affectedDomains || [],
    suggestion: insight.suggestion,
  }));

  // Transform AI patterns to correlation format for CorrelationCard
  const transformedPatterns = (data?.patterns || []).map((pattern, idx) => {
    // Build impacts from factor and outcome (since AI patterns don't have affectedDomains)
    const impacts = [];
    if (pattern.outcome) {
      const domain = extractMoodDomain(pattern.outcome);
      if (domain) impacts.push({ label: domain, icon: getDomainIcon(domain) });
    }
    if (pattern.factor) {
      const domain = extractFoodDomain(pattern.factor);
      if (domain && !impacts.some(i => i.label === domain)) {
        impacts.push({ label: domain, icon: getDomainIcon(domain) });
      }
    }
    if (pattern.type === 'positive') {
      impacts.push({ label: 'positive', icon: 'trending-up' });
    } else if (pattern.type === 'negative') {
      impacts.push({ label: 'caution', icon: 'alert-circle-outline' });
    }

    return {
      id: `ai-pattern-${idx}`,
      pattern: pattern.pattern,
      confidence: pattern.strength || 0,
      occurrences: pattern.occurrences || 1,
      impacts: impacts.slice(0, 3),
      type: pattern.type,
      timelag: pattern.timelag,
      factor: pattern.factor,
      outcome: pattern.outcome,
    };
  });

  return {
    // Raw data
    hasEnoughData: data?.hasEnoughData ?? false,
    dataPoints: data?.dataPoints || { food: 0, mood: 0, water: 0 },
    dataStatus: data?.dataStatus,
    source: data?.source || 'unknown',

    // Transformed insights
    insights: transformedInsights,
    patterns: transformedPatterns,

    // Priority recommendation
    priorityRecommendation: data?.priorityRecommendation || null,

    // Weekly story
    weeklyStory: data?.weeklyStory || '',

    // Loading state
    isLoading,
    isFetching,
    error,
    refetch,

    // Convenience booleans
    hasInsights: transformedInsights.length > 0,
    hasPatterns: transformedPatterns.length > 0,
    hasPriorityRecommendation: Boolean(data?.priorityRecommendation),
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
