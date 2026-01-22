/**
 * useIntelligence - Production-grade hook for the Intelligence System
 *
 * Fetches real data from:
 * - Decision Brain (recommendations, insights)
 * - Correlation Engine (patterns with evidence)
 * - Prediction Engine (forecasts with confidence)
 * - Auto-Discovery (novel correlations)
 * - Learning State (lifecycle stage)
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import apiClient from '../services/apiClient';

const QUERY_KEYS = {
  decisionBrain: ['intelligence', 'decision-brain'],
  correlations: ['intelligence', 'correlations'],
  predictions: ['intelligence', 'predictions'],
  novelDiscoveries: ['intelligence', 'novel'],
  patterns: ['intelligence', 'patterns'],
  combined: ['intelligence', 'combined'],
};

/**
 * Deduplicate similar patterns - keeps only the best instance per unique pattern
 * Groups by correlation type and description similarity, keeps highest confidence
 */
function deduplicatePatterns(patterns) {
  if (!patterns || patterns.length === 0) return [];

  const patternMap = new Map();

  patterns.forEach(pattern => {
    // Create a key based on the pattern's core characteristics
    // This groups patterns that are essentially the same insight
    const description = (pattern.description || '').toLowerCase();
    const correlationType = pattern.correlationType || '';

    // Extract key phrases to identify similar patterns
    const keyPhrases = [
      correlationType,
      // Extract main subject from description
      description.includes('hydration') ? 'hydration' : '',
      description.includes('mood') ? 'mood' : '',
      description.includes('energy') ? 'energy' : '',
      description.includes('sleep') ? 'sleep' : '',
      description.includes('food') || description.includes('eating') ? 'food' : '',
      description.includes('beverage') || description.includes('drinking') ? 'beverage' : '',
      description.includes('exercise') || description.includes('activity') ? 'activity' : '',
    ].filter(Boolean).join('_');

    const groupKey = keyPhrases || pattern.id || JSON.stringify(pattern);

    // Keep the pattern with higher confidence or more occurrences
    const existing = patternMap.get(groupKey);
    if (!existing) {
      patternMap.set(groupKey, pattern);
    } else {
      const existingScore = (existing.confidence || 0) * (existing.occurrences || 1);
      const newScore = (pattern.confidence || 0) * (pattern.occurrences || 1);

      // Prefer longer time windows if scores are similar (more statistically significant)
      const existingWindow = parseTimeWindow(existing.timeWindow);
      const newWindow = parseTimeWindow(pattern.timeWindow);

      if (newScore > existingScore || (newScore === existingScore && newWindow > existingWindow)) {
        patternMap.set(groupKey, pattern);
      }
    }
  });

  return Array.from(patternMap.values());
}

/**
 * Parse time window string to days for comparison
 */
function parseTimeWindow(window) {
  if (!window) return 0;
  const str = window.toLowerCase();
  if (str.includes('30d') || str.includes('month')) return 30;
  if (str.includes('15d')) return 15;
  if (str.includes('7d') || str.includes('week')) return 7;
  if (str.includes('24h') || str.includes('day')) return 1;
  if (str.includes('4h')) return 0.17;
  return 0;
}

/**
 * Main intelligence hook - fetches all real backend data
 */
export function useIntelligence(options = {}) {
  const { domain = 'all', enabled = true } = options;

  // Decision Brain - Main recommendations with explanations
  const decisionBrainQuery = useQuery({
    queryKey: [...QUERY_KEYS.decisionBrain, domain],
    queryFn: async () => {
      try {
        const data = await apiClient.get('/decision-brain/recommendations', {
          params: { domain, explain: true, max: 5 },
        });
        return data;
      } catch (error) {
        console.warn('[useIntelligence] Decision brain error:', error.message);
        return null;
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  // Correlations - Unified patterns from rule-based + auto-discovery with evidence
  const correlationsQuery = useQuery({
    queryKey: QUERY_KEYS.correlations,
    queryFn: async () => {
      try {
        const response = await apiClient.get('/insights/unified-correlations');
        // Backend returns { success, data: { correlations, meta } }
        const responseData = response?.data || response;
        return {
          correlations: responseData?.correlations || [],
          meta: responseData?.meta || {
            ruleBasedCount: 0,
            autoDiscoveredCount: 0,
            totalBeforeDedup: 0,
            totalAfterDedup: 0,
          },
        };
      } catch (error) {
        console.warn('[useIntelligence] Correlations error:', error.message);
        return { correlations: [], meta: {} };
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Personalized Patterns - Deep temporal analysis
  const patternsQuery = useQuery({
    queryKey: QUERY_KEYS.patterns,
    queryFn: async () => {
      try {
        const data = await apiClient.get('/insights/patterns/personalized');
        return data;
      } catch (error) {
        console.warn('[useIntelligence] Patterns error:', error.message);
        return null;
      }
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 2,
  });

  // Predictive Insights - Forecasts
  const predictionsQuery = useQuery({
    queryKey: QUERY_KEYS.predictions,
    queryFn: async () => {
      try {
        const data = await apiClient.get('/insights/predictive');
        return data;
      } catch (error) {
        console.warn('[useIntelligence] Predictions error:', error.message);
        return null;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Novel Discoveries - Auto-discovered correlations
  const novelQuery = useQuery({
    queryKey: QUERY_KEYS.novelDiscoveries,
    queryFn: async () => {
      try {
        const response = await apiClient.get('/insights/novel-correlations');
        // Backend returns { success, data: { correlations, insights, hasEnoughData, ... } }
        const responseData = response?.data || response;
        return {
          correlations: responseData?.correlations || [],
          insights: responseData?.insights || [],
          hasEnoughData: responseData?.hasEnoughData || false,
          daysAnalyzed: responseData?.daysAnalyzed || 0,
        };
      } catch (error) {
        console.warn('[useIntelligence] Novel discoveries error:', error.message);
        return { correlations: [], insights: [], hasEnoughData: false, daysAnalyzed: 0 };
      }
    },
    enabled,
    staleTime: 15 * 60 * 1000,
    retry: 2,
  });

  // Process decision brain data
  const recommendation = useMemo(() => {
    const data = decisionBrainQuery.data;
    if (!data) return null;

    return {
      decision: data.decision,
      headline: data.recommendation?.headline,
      subtitle: data.recommendation?.subtitle,
      actions: data.recommendation?.actions || [],
      visual: data.recommendation?.visual,
      explanation: data.explanation,
      userContext: data.userContext,
      modelHealth: data.modelHealth,
      shouldSpeak: data.decision?.shouldSpeak,
    };
  }, [decisionBrainQuery.data]);

  // Process correlations into categorized groups with deduplication
  const correlations = useMemo(() => {
    const queryData = correlationsQuery.data || { correlations: [], meta: {} };
    const rawCorrelations = queryData.correlations || [];
    const meta = queryData.meta || {};

    // Deduplicate similar patterns - keep only the best instance per pattern type
    const deduplicatedData = deduplicatePatterns(rawCorrelations);

    const categorized = {
      foodMood: [],
      hydrationMood: [],
      activityMood: [],
      timing: [],
      other: [],
    };

    deduplicatedData.forEach(corr => {
      const type = corr.correlationType || '';
      const category = corr.category || '';

      if (type.includes('food') && type.includes('mood')) {
        categorized.foodMood.push(corr);
      } else if (type.includes('hydration') || category === 'hydration') {
        categorized.hydrationMood.push(corr);
      } else if (type.includes('activity') || category === 'activity') {
        categorized.activityMood.push(corr);
      } else if (type.includes('timing') || category === 'meal-timing') {
        categorized.timing.push(corr);
      } else {
        categorized.other.push(corr);
      }
    });

    // Sort each category by importance score (unified ranking) then by strength
    Object.keys(categorized).forEach(key => {
      categorized[key].sort((a, b) => {
        const importanceA = a.importanceScore || 0;
        const importanceB = b.importanceScore || 0;
        if (importanceB !== importanceA) return importanceB - importanceA;
        return (b.strength || 0) - (a.strength || 0);
      });
    });

    return {
      all: deduplicatedData,
      raw: rawCorrelations, // Keep raw data available if needed
      ...categorized,
      count: deduplicatedData.length,
      hasData: deduplicatedData.length > 0,
      // Unified correlation metadata
      meta: {
        ruleBasedCount: meta.ruleBasedCount || 0,
        autoDiscoveredCount: meta.autoDiscoveredCount || 0,
        totalBeforeDedup: meta.totalBeforeDedup || 0,
        totalAfterDedup: meta.totalAfterDedup || deduplicatedData.length,
      },
    };
  }, [correlationsQuery.data]);

  // Process patterns
  const patterns = useMemo(() => {
    const data = patternsQuery.data;
    if (!data) return null;

    return {
      mealTiming: data.patterns?.filter(p => p.category === 'meal-timing') || [],
      nextDayEffects: data.patterns?.filter(p => p.category === 'next-day-carryover') || [],
      hydration: data.patterns?.filter(p => p.category === 'hydration') || [],
      activity: data.patterns?.filter(p => p.category === 'activity') || [],
      all: data.patterns || [],
      dataQuality: data.dataQuality,
      lifecycleStage: data.lifecycleStage,
    };
  }, [patternsQuery.data]);

  // Process predictions
  const predictions = useMemo(() => {
    const data = predictionsQuery.data;
    if (!data) return null;

    // Handle both "nutrient" and "nutrients" keys from backend
    const nutrientsData = data.nutrients || data.nutrient;
    // Handle nested predictions structure
    const predictionsData = data.predictions || data;

    return {
      energy: predictionsData.energy,
      mood: predictionsData.mood,
      nutrients: predictionsData.nutrients || predictionsData.nutrient || nutrientsData,
      hasAny: !!(predictionsData.energy || predictionsData.mood || predictionsData.nutrients || predictionsData.nutrient || nutrientsData),
      dataPoints: data.dataPoints,
      lookbackDays: data.lookbackDays,
    };
  }, [predictionsQuery.data]);

  // Process novel discoveries
  const discoveries = useMemo(() => {
    const data = novelQuery.data || {};
    // Combine correlations and insights for display
    const correlations = data.correlations || [];
    const insights = data.insights || [];
    // Use insights if available (more user-friendly), otherwise use raw correlations
    const items = insights.length > 0 ? insights : correlations;
    return {
      items: items.slice(0, 5), // Top 5 most novel
      correlations,
      insights,
      count: items.length,
      hasData: items.length > 0 || data.hasEnoughData,
      hasEnoughData: data.hasEnoughData,
      daysAnalyzed: data.daysAnalyzed,
    };
  }, [novelQuery.data]);

  // User context from decision brain
  const userContext = useMemo(() => {
    return recommendation?.userContext || {
      lifecycleStage: 'DISCOVERER',
      stageLabel: 'Getting Started',
      daysActive: 0,
      dataQuality: { observations: 0, correlations: 0, avgConfidence: 0 },
    };
  }, [recommendation]);

  const isLoading = decisionBrainQuery.isLoading || correlationsQuery.isLoading ||
    patternsQuery.isLoading || predictionsQuery.isLoading;

  const refetch = async () => {
    await Promise.all([
      decisionBrainQuery.refetch(),
      correlationsQuery.refetch(),
      patternsQuery.refetch(),
      predictionsQuery.refetch(),
      novelQuery.refetch(),
    ]);
  };

  return {
    // Main recommendation from decision brain
    recommendation,

    // Correlations with evidence
    correlations,

    // Personalized patterns
    patterns,

    // Predictions
    predictions,

    // Novel discoveries
    discoveries,

    // User context & lifecycle
    userContext,

    // Loading & control
    isLoading,
    refetch,

    // Raw queries for granular control
    queries: {
      decisionBrain: decisionBrainQuery,
      correlations: correlationsQuery,
      patterns: patternsQuery,
      predictions: predictionsQuery,
      novel: novelQuery,
    },
  };
}

/**
 * Domain-specific intelligence hooks
 */
export function useMoodIntelligence(enabled = true) {
  const query = useQuery({
    queryKey: ['intelligence', 'mood-insights'],
    queryFn: async () => {
      try {
        const data = await apiClient.get('/decision-brain/mood-insights');
        return data;
      } catch (error) {
        console.warn('[useMoodIntelligence] Error:', error.message);
        return null;
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  return {
    insights: query.data,
    moodProfile: query.data?.moodProfile,
    patterns: query.data?.patterns || [],
    correlations: query.data?.correlations || [],
    recommendations: query.data?.recommendations || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useNutritionIntelligence(enabled = true) {
  const query = useQuery({
    queryKey: ['intelligence', 'nutrition-insights'],
    queryFn: async () => {
      try {
        const data = await apiClient.get('/decision-brain/nutrition-insights');
        return data;
      } catch (error) {
        console.warn('[useNutritionIntelligence] Error:', error.message);
        return null;
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  return {
    insights: query.data,
    stats: query.data?.nutritionStats,
    patterns: query.data?.patterns || [],
    correlations: query.data?.correlations || [],
    recommendations: query.data?.recommendations || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useActivityIntelligence(enabled = true) {
  const query = useQuery({
    queryKey: ['intelligence', 'activity-insights'],
    queryFn: async () => {
      try {
        const data = await apiClient.get('/decision-brain/activity-insights');
        return data;
      } catch (error) {
        console.warn('[useActivityIntelligence] Error:', error.message);
        return null;
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  return {
    insights: query.data,
    analytics: query.data?.activityAnalytics,
    patterns: query.data?.patterns || [],
    correlations: query.data?.correlations || [],
    recommendations: query.data?.recommendations || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useHydrationIntelligence(enabled = true) {
  const query = useQuery({
    queryKey: ['intelligence', 'hydration-insights'],
    queryFn: async () => {
      try {
        const data = await apiClient.get('/decision-brain/hydration-insights');
        return data;
      } catch (error) {
        console.warn('[useHydrationIntelligence] Error:', error.message);
        return null;
      }
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  return {
    insights: query.data,
    analytics: query.data?.hydrationAnalytics,
    patterns: query.data?.patterns || [],
    correlations: query.data?.correlations || [],
    recommendations: query.data?.recommendations || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/**
 * Learning status hook
 */
export function useLearningStatus(enabled = true) {
  const query = useQuery({
    queryKey: ['intelligence', 'learning-status'],
    queryFn: async () => {
      try {
        const data = await apiClient.get('/decision-brain/status');
        return data;
      } catch (error) {
        console.warn('[useLearningStatus] Error:', error.message);
        return null;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    status: query.data,
    stage: query.data?.lifecycleStage,
    readiness: query.data?.readiness,
    nextAction: query.data?.nextAction,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export default useIntelligence;
