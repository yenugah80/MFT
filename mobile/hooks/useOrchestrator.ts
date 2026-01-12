/**
 * React Query hook for Orchestrator (Daily Intelligence)
 *
 * Fetches daily recommendations and decision intelligence from /api/orchestrator/run
 * Used by DailyIntelligenceCard and dashboard to display SPEAK/REINFORCE/PREDICT/SILENT decisions
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';

/**
 * Response from orchestrator service
 */
export interface OrchestratorResult {
  success: boolean;
  userId: string;
  stage: string;
  daysSinceStart: number;
  decision: {
    type: 'SPEAK' | 'REINFORCE' | 'PREDICT' | 'SILENT';
    headline: string;
    subtitle?: string;
    confidence: number;
    confidenceLabel: string;
    correlationId?: number;
    actions?: Array<{
      icon: string;
      text: string;
      description: string;
      type: string;
      metadata?: Record<string, any>;
    }>;
  };
  correlations?: Array<{
    id: number;
    pattern: string;
    confidence: number;
    isHidden?: boolean;
  }>;
  recommendations?: Array<{
    id: number;
    type: string;
    food: string;
    reason: string;
    confidence: number;
  }>;
  timestamp: string;
}

/**
 * Fetch orchestrator results for the authenticated user
 */
const fetchOrchestrator = async (): Promise<OrchestratorResult> => {
  const response = await apiClient.post('/orchestrator/run', {});
  const data = response?.data ?? response;

  if (data === undefined || data === null) {
    throw new Error('Orchestrator returned no data');
  }

  return data;
};

/**
 * Hook to fetch daily intelligence from orchestrator
 */
export const useOrchestrator = () => {
  return useQuery({
    queryKey: ['orchestrator'],
    queryFn: fetchOrchestrator,
    // Fresh orchestrator data important - refresh every 60 seconds
    staleTime: 60 * 1000,
    // Cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true,
  });
};

/**
 * Hook to send feedback on a correlation (dismiss, helpful, etc.)
 *
 * Usage:
 * const { mutate: sendFeedback } = useCorrelationFeedback();
 * sendFeedback({ correlationId: 123, overrideType: 'USER_DISMISSED', userReason: 'Not relevant' });
 */
export const useCorrelationFeedback = () => {
  return useMutation({
    mutationFn: async (feedback: {
      correlationId: number;
      overrideType:
        | 'USER_DISMISSED'
        | 'TEMPORARY_DISMISS'
        | 'RESOLVED'
        | 'DEACTIVATION'
        | 'HELPFUL_FEEDBACK'
        | 'NOT_HELPFUL_FEEDBACK';
      userReason?: string;
    }) => {
      const response = await apiClient.post(
        `/correlations/${feedback.correlationId}/feedback`,
        {
          overrideType: feedback.overrideType,
          userReason: feedback.userReason,
        }
      );
      return response?.data ?? response;
    },
  });
};

/**
 * Hook to send learning feedback
 *
 * Usage:
 * const { mutate: sendLearningFeedback } = useLearningFeedback();
 * sendLearningFeedback({ feedbackType: 'correction', correlationId: 123, reason: '...' });
 */
export const useLearningFeedback = () => {
  return useMutation({
    mutationFn: async (feedback: {
      feedbackType: string;
      correlationId?: number;
      reason?: string;
    }) => {
      const response = await apiClient.post('/learning/feedback', feedback);
      return response?.data ?? response;
    },
  });
};

/**
 * Hook to get learning state and readiness
 *
 * Usage:
 * const { data: learningState } = useLearningState();
 */
export const useLearningState = () => {
  return useQuery({
    queryKey: ['learningState'],
    queryFn: async () => {
      const response = await apiClient.get('/learning/state');
      return response?.data ?? response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
  });
};

/**
 * Hook to resolve an intent to specific foods
 *
 * Usage:
 * const { mutate: resolveIntent } = useResolveIntent();
 * resolveIntent({ intent: 'improve sleep', count: 3 });
 */
export const useResolveIntent = () => {
  return useMutation({
    mutationFn: async (params: { intent: string; count?: number }) => {
      const response = await apiClient.post('/resolver/resolve', params);
      return response?.data ?? response;
    },
  });
};

/**
 * Hook to get expiry statistics
 *
 * Usage:
 * const { data: expiryStats } = useExpiryStats();
 */
export const useExpiryStats = () => {
  return useQuery({
    queryKey: ['expiryStats'],
    queryFn: async () => {
      const response = await apiClient.get('/expiry/stats');
      return response?.data ?? response;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,     // 30 minutes
  });
};

/**
 * Hook to revalidate a dismissed correlation
 *
 * Usage:
 * const { mutate: revalidate } = useRevalidateCorrelation();
 * revalidate({ correlationId: 123 });
 */
export const useRevalidateCorrelation = () => {
  return useMutation({
    mutationFn: async (params: { correlationId: number }) => {
      const response = await apiClient.post(
        `/expiry/${params.correlationId}/revalidate`,
        {}
      );
      return response?.data ?? response;
    },
  });
};
