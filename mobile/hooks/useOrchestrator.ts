/**
 * React Query hook for Orchestrator (Daily Intelligence)
 *
 * Fetches daily recommendations and decision intelligence from /api/orchestrator/run
 * Used by DailyIntelligenceCard and dashboard to display SPEAK/REINFORCE/PREDICT/SILENT decisions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';

/**
 * Complete response from orchestrator service (Phase 6 corrected schema)
 */
export interface OrchestratorResult {
  success: boolean;
  userId: string;

  // Main decision and supporting patterns
  decision: {
    type: 'SPEAK' | 'REINFORCE' | 'PREDICT' | 'SILENT';
    headline: string;
    subtitle?: string;
    confidence: number;
    confidenceLabel: 'Low' | 'Moderate' | 'High' | 'Very High';
    actions?: Array<{
      icon: string;
      text: string;
      description: string;
      type: string;
      metadata?: Record<string, any>;
    }>;
    visualComponent?: string;
  };

  // Supporting correlations/patterns
  correlations: Array<{
    id: number;
    pattern: string;
    confidence: number;
    occurrences: number;
    affectedDomains: string[];
    whatHappens: string;
    evidence: Array<{
      date: string;
      strength: number;
      context?: string;
      tags?: string[];
    }>;
  }>;

  // User's journey through lifecycle
  lifecycle: {
    stage: string;
    daysSinceStart: number;
    daysInCurrentStage: number;
    daysToNextStage: number;
  };

  // Feature readiness based on data quantity
  learningState: {
    canShowCorrelations: boolean;
    canShowPredictions: boolean;
  };

  timestamp: string;
}

/**
 * Map dismissal reason to override type for backend
 */
function mapReasonToOverrideType(reason: string): string {
  const mapping: Record<string, string> = {
    'not_relevant': 'USER_DISMISSED',
    'temporary': 'TEMPORARY_DISMISS',
    'fixed': 'RESOLVED',
    'never_show': 'DEACTIVATION',
  };
  return mapping[reason] || 'USER_DISMISSED';
}

/**
 * Fetch orchestrator results for the authenticated user
 * Falls back to mock data if endpoint returns 404 (during development)
 */
const fetchOrchestrator = async (): Promise<OrchestratorResult> => {
  try {
    const response = await apiClient.post('/orchestrator/run', {});
    const data = response?.data ?? response;

    if (data === undefined || data === null) {
      throw new Error('Orchestrator returned no data');
    }

    // Validate required fields exist
    if (!data.decision) {
      throw new Error('Invalid orchestrator response: missing decision');
    }

    return data;
  } catch (error) {
    // Development fallback: Return mock data when endpoint is not yet deployed
    const status = error?.response?.status || (error as any)?.status;
    if (status === 404) {
      console.log('[useOrchestrator] Orchestrator endpoint not found (404) - using mock data for development');
      return getMockOrchestratorData();
    }

    console.error('[useOrchestrator] Error fetching orchestrator:', error);
    throw error;
  }
};

/**
 * Mock orchestrator response for development/testing
 * Used when backend hasn't been deployed yet
 */
function getMockOrchestratorData(): OrchestratorResult {
  const now = new Date();
  return {
    success: true,
    userId: 'mock-user',
    decision: {
      type: 'SPEAK',
      headline: 'You\'re consuming high-NOVA foods',
      subtitle: 'Ultra-processed foods may be affecting your mood and energy',
      confidence: 0.82,
      confidenceLabel: 'High',
      actions: [
        {
          icon: 'leaf',
          text: 'View whole foods',
          description: 'Explore unprocessed alternatives',
          type: 'navigate',
          metadata: { path: '/insights' },
        },
      ],
    },
    correlations: [
      {
        id: 1,
        pattern: 'High NOVA food intake → Energy dips',
        confidence: 0.78,
        occurrences: 12,
        affectedDomains: ['energy', 'mood'],
        whatHappens: 'When you eat more processed foods, energy typically drops 2-4 hours later',
        evidence: [
          { date: '2024-01-10', strength: 0.85, context: 'After snacking on chips', tags: ['snack'] },
          { date: '2024-01-09', strength: 0.72, context: 'Lunch with takeout', tags: ['lunch'] },
        ],
      },
      {
        id: 2,
        pattern: 'Dehydration → Poor focus',
        confidence: 0.71,
        occurrences: 8,
        affectedDomains: ['focus', 'clarity'],
        whatHappens: 'Water intake below 2L correlates with reduced focus in afternoon',
        evidence: [
          { date: '2024-01-10', strength: 0.80, context: 'Only 1.5L water logged', tags: ['hydration'] },
        ],
      },
    ],
    lifecycle: {
      stage: 'TRACKER',
      daysSinceStart: 15,
      daysInCurrentStage: 8,
      daysToNextStage: 15,
    },
    learningState: {
      canShowCorrelations: true,
      canShowPredictions: false,
    },
    timestamp: now.toISOString(),
  };
}

/**
 * Hook to fetch daily intelligence from orchestrator
 * Single fetch point for the entire dashboard
 */
export const useOrchestrator = () => {
  return useQuery<OrchestratorResult, Error>({
    queryKey: ['orchestrator'],
    queryFn: fetchOrchestrator,
    // Fresh orchestrator data important - refresh every 60 seconds (stale)
    staleTime: 60 * 1000,
    // Cache in memory for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Always fetch on mount (in case user was offline)
    refetchOnMount: true,
    // Retry failed requests twice before giving up
    retry: 2,
    // Don't retry on 4xx errors, only on network/5xx
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Hook to send feedback on a correlation dismissal
 *
 * Maps dismissal reasons to backend override types:
 * - "not_relevant" → USER_DISMISSED (-0.2 confidence, permanent)
 * - "temporary" → TEMPORARY_DISMISS (-0.1 confidence, 7 days)
 * - "fixed" → RESOLVED (-0.05 confidence, 30 days)
 * - "never_show" → DEACTIVATION (permanent hide)
 *
 * Usage:
 * const { mutate: sendFeedback } = useCorrelationFeedback();
 * sendFeedback({ correlationId: 123, reason: 'not_relevant' });
 */
export const useCorrelationFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feedback: {
      correlationId: number;
      reason: 'not_relevant' | 'temporary' | 'fixed' | 'never_show';
    }) => {
      const overrideType = mapReasonToOverrideType(feedback.reason);
      const response = await apiClient.post(
        `/correlations/${feedback.correlationId}/feedback`,
        { overrideType }
      );
      return response?.data ?? response;
    },
    // After successful feedback, invalidate orchestrator cache to refresh
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orchestrator'] });
    },
    // Log errors for debugging
    onError: (error) => {
      console.error('[useCorrelationFeedback] Error sending feedback:', error);
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
