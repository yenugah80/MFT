/**
 * useUnifiedIntelligence - Single hook for all intelligence data
 *
 * Uses the new unified /api/intelligence/unified endpoint that:
 * - Coordinates all intelligence subsystems in parallel
 * - Returns prediction-aware recommendations
 * - Includes cross-domain correlations
 * - Provides satisfaction feedback tracking
 *
 * Benefits:
 * - Single API call instead of 5+ separate calls
 * - Predictions influence recommendation priority
 * - Deduplicated and ranked insights
 * - Consistent data across the app
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import apiClient from '../services/apiClient';

const QUERY_KEY = 'unified-intelligence';

/**
 * Main unified intelligence hook
 * @param {string} period - 'today' | 'week' | 'month' | 'all' (default: 'week')
 * @param {Object} options - Additional options
 * @param {boolean} options.enabled - Whether to fetch data (default: true)
 */
export function useUnifiedIntelligence(period = 'week', options = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  // Main query - fetches all intelligence data in one call
  const query = useQuery({
    queryKey: [QUERY_KEY, period],
    queryFn: async () => {
      const response = await apiClient.get('/intelligence/unified', {
        params: { period },
      });
      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });

  // Track action mutation
  const trackActionMutation = useMutation({
    mutationFn: async ({ recommendationId, actionType, context }) => {
      return apiClient.post('/intelligence/track-action', {
        recommendationId,
        actionType,
        context,
      });
    },
    onSuccess: () => {
      // Invalidate to refresh data after tracking
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Record satisfaction mutation
  const satisfactionMutation = useMutation({
    mutationFn: async ({ trackingId, helpful, rating, feedback }) => {
      return apiClient.post('/intelligence/satisfaction', {
        trackingId,
        helpful,
        rating,
        feedback,
      });
    },
    onSuccess: () => {
      // Invalidate to refresh recommendations after feedback
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  // Process the unified response
  const intelligence = useMemo(() => {
    if (!query.data?.success) {
      return {
        primaryInsight: null,
        predictions: null,
        patterns: [],
        recommendations: {},
        pendingFeedback: [],
        domains: {},
        userStage: 'first_steps',
        stageLabel: 'Getting Started',
        confidence: 0,
        hasData: false,
      };
    }

    const data = query.data;
    return {
      // Primary insight to highlight
      primaryInsight: data.primaryInsight,

      // Predictions with confidence
      predictions: data.predictions,

      // All patterns (correlations + discoveries)
      patterns: data.patterns || [],

      // Recommendations by domain
      recommendations: data.recommendations || {},

      // Pending feedback requests
      pendingFeedback: data.pendingFeedback || [],

      // Domain-specific stats
      domains: data.domainStats || {},

      // User's learning stage
      userStage: data.userStage?.label || 'first_steps',
      stageIndex: data.userStage?.index || 0,
      stageLabel: formatStageLabel(data.userStage?.label),

      // Overall confidence
      confidence: data.confidence || 0,

      // Meta info
      meta: data.meta,

      // Data availability flag
      hasData: true,
    };
  }, [query.data]);

  // Helper to get recommendations for a specific domain
  const getRecommendations = useCallback((domain) => {
    return intelligence.recommendations[domain] || [];
  }, [intelligence.recommendations]);

  // Helper to get patterns affecting a specific domain
  const getPatterns = useCallback((domain) => {
    return intelligence.patterns.filter(p =>
      p.affectedDomains?.includes(domain) || p.domain === domain
    );
  }, [intelligence.patterns]);

  // Track when a recommendation is shown
  const trackShown = useCallback((recommendationId, context = {}) => {
    trackActionMutation.mutate({
      recommendationId,
      actionType: 'shown',
      context: { timestamp: new Date().toISOString(), ...context },
    });
  }, [trackActionMutation]);

  // Track when a recommendation is clicked
  const trackClicked = useCallback((recommendationId, context = {}) => {
    return trackActionMutation.mutateAsync({
      recommendationId,
      actionType: 'clicked',
      context: { timestamp: new Date().toISOString(), ...context },
    });
  }, [trackActionMutation]);

  // Track when a recommendation is completed
  const trackCompleted = useCallback((recommendationId, context = {}) => {
    return trackActionMutation.mutateAsync({
      recommendationId,
      actionType: 'completed',
      context: { timestamp: new Date().toISOString(), ...context },
    });
  }, [trackActionMutation]);

  // Track when a recommendation is dismissed
  const trackDismissed = useCallback((recommendationId, context = {}) => {
    trackActionMutation.mutate({
      recommendationId,
      actionType: 'dismissed',
      context: { timestamp: new Date().toISOString(), ...context },
    });
  }, [trackActionMutation]);

  // Record satisfaction feedback
  const recordSatisfaction = useCallback((trackingId, { helpful, rating, feedback }) => {
    return satisfactionMutation.mutateAsync({
      trackingId,
      helpful,
      rating,
      feedback,
    });
  }, [satisfactionMutation]);

  return {
    // Main intelligence data
    intelligence,

    // Convenience accessors
    primaryInsight: intelligence.primaryInsight,
    predictions: intelligence.predictions,
    patterns: intelligence.patterns,
    recommendations: intelligence.recommendations,
    pendingFeedback: intelligence.pendingFeedback,
    userStage: intelligence.userStage,
    stageLabel: intelligence.stageLabel,
    confidence: intelligence.confidence,

    // Helper functions
    getRecommendations,
    getPatterns,

    // Tracking functions
    trackShown,
    trackClicked,
    trackCompleted,
    trackDismissed,
    recordSatisfaction,

    // Loading & control
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // Mutation states
    isTracking: trackActionMutation.isPending,
    isSavingSatisfaction: satisfactionMutation.isPending,

    // Raw query for advanced use
    query,
  };
}

/**
 * Format stage label for display
 */
function formatStageLabel(stage) {
  const labels = {
    first_steps: 'Getting Started',
    pattern_seeds: 'Finding Patterns',
    early_patterns: 'Early Patterns',
    pattern_recognition: 'Pattern Recognition',
    predictive: 'Predictive Mode',
    hyper_personal: 'Personalized',
  };
  return labels[stage] || 'Getting Started';
}

export default useUnifiedIntelligence;
