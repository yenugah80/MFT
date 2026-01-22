/**
 * useInsightFeedback - Hook for submitting insight feedback to the backend
 *
 * Connects the InsightFeedback UI component to the backend API,
 * closing the feedback loop for the learning system.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

const QUERY_KEYS = {
  feedback: ['insight-feedback'],
  stats: ['insight-stats'],
};

/**
 * Submit feedback on an insight (thumbs up/down)
 */
export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      insightId,
      insightType,
      feedbackType, // 'helpful', 'not_helpful', 'dismiss', 'acted_on'
      insightContent,
      additionalContext,
    }) => {
      const response = await apiClient.post('/insights/feedback', {
        insightId,
        insightType,
        feedbackType,
        insightContent,
        additionalContext,
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate feedback queries to refresh stats
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.feedback });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats });
    },
    onError: (error) => {
      console.warn('[useInsightFeedback] Error submitting feedback:', error.message);
    },
  });
}

/**
 * Get user's feedback history
 */
export function useFeedbackHistory(options = {}) {
  const { limit = 50, insightType, enabled = true } = options;

  return useQuery({
    queryKey: [...QUERY_KEYS.feedback, insightType, limit],
    queryFn: async () => {
      const params = { limit };
      if (insightType) params.insightType = insightType;

      const response = await apiClient.get('/insights/feedback', { params });
      return response?.data || response;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Get insight accuracy and learning stats
 */
export function useInsightStats(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: async () => {
      const response = await apiClient.get('/insights/stats');
      return response?.data || response;
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Higher-level hook that combines feedback submission with local state
 */
export function useInsightFeedback(insightId, insightType) {
  const submitFeedback = useSubmitFeedback();

  const handleHelpful = async (wasHelpful, insightContent) => {
    return submitFeedback.mutateAsync({
      insightId,
      insightType,
      feedbackType: wasHelpful ? 'helpful' : 'not_helpful',
      insightContent,
    });
  };

  const handleDismiss = async (dismissReason, insightContent) => {
    return submitFeedback.mutateAsync({
      insightId,
      insightType,
      feedbackType: 'dismiss',
      additionalContext: { dismissReason },
      insightContent,
    });
  };

  const handleActedOn = async (insightContent) => {
    return submitFeedback.mutateAsync({
      insightId,
      insightType,
      feedbackType: 'acted_on',
      insightContent,
    });
  };

  return {
    handleHelpful,
    handleDismiss,
    handleActedOn,
    isSubmitting: submitFeedback.isPending,
    error: submitFeedback.error,
    isSuccess: submitFeedback.isSuccess,
  };
}

export default useInsightFeedback;
