/**
 * useIntelligenceOrchestrator Hook
 *
 * React hook that exposes the full intelligence pipeline to components.
 * Combines:
 * - Dashboard data (useDashboard)
 * - Decision Brain data (useDecisionBrain* hooks)
 * - Intelligence Orchestrator (ranking, filtering, witty copy)
 *
 * Usage:
 * ```jsx
 * const {
 *   recommendations,    // Ranked, filtered recommendations with witty copy
 *   patterns,          // Ranked patterns
 *   heroMessage,       // Top recommendation formatted for hero display
 *   quickActions,      // Urgent actions based on context
 *   context,           // Current context summary
 *   isLoading,
 *   refetch,
 *   recordResponse,    // Call when user acts on recommendation
 *   dismissPattern,    // Call when user dismisses pattern
 * } = useIntelligenceOrchestrator();
 * ```
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboard } from './useDashboard';
import {
  useDecisionBrainMoodInsights,
  useDecisionBrainNutritionInsights,
  useDecisionBrainHydrationInsights,
  useDecisionBrainActivityInsights,
} from './useMoodInsights';
import { intelligenceOrchestrator, WITTY_COPY } from '../services/intelligence/IntelligenceOrchestrator';

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useIntelligenceOrchestrator(options = {}) {
  const {
    domain = 'all', // 'all' | 'mood' | 'nutrition' | 'hydration' | 'activity'
    enabled = true,
  } = options;

  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

  // ========== DATA SOURCES ==========

  // Dashboard data
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useDashboard();

  // Decision Brain hooks (fetch all domains for comprehensive orchestration)
  const { data: moodData, isLoading: moodLoading } = useDecisionBrainMoodInsights();
  const { data: nutritionData, isLoading: nutritionLoading } = useDecisionBrainNutritionInsights();
  const { data: hydrationData, isLoading: hydrationLoading } = useDecisionBrainHydrationInsights();
  const { data: activityData, isLoading: activityLoading } = useDecisionBrainActivityInsights();

  const isSourcesLoading = dashboardLoading || moodLoading || nutritionLoading ||
                           hydrationLoading || activityLoading;

  // ========== COMBINE DECISION BRAIN DATA ==========

  const combinedDecisionBrainData = useMemo(() => {
    // Merge all domain data based on filter
    if (domain === 'mood') return moodData;
    if (domain === 'nutrition') return nutritionData;
    if (domain === 'hydration') return hydrationData;
    if (domain === 'activity') return activityData;

    // 'all' - combine recommendations and patterns from all domains
    const allRecommendations = [
      ...(moodData?.recommendations || []).map(r => ({ ...r, domain: 'mood' })),
      ...(nutritionData?.recommendations || []).map(r => ({ ...r, domain: 'nutrition' })),
      ...(hydrationData?.recommendations || []).map(r => ({ ...r, domain: 'hydration' })),
      ...(activityData?.recommendations || []).map(r => ({ ...r, domain: 'activity' })),
    ];

    const allPatterns = [
      ...(moodData?.patterns || []).map(p => ({ ...p, domain: 'mood' })),
      ...(nutritionData?.patterns || []).map(p => ({ ...p, domain: 'nutrition' })),
      ...(hydrationData?.patterns || []).map(p => ({ ...p, domain: 'hydration' })),
      ...(activityData?.patterns || []).map(p => ({ ...p, domain: 'activity' })),
    ];

    const allCorrelations = [
      ...(moodData?.correlations || []),
      ...(nutritionData?.correlations || []),
      ...(hydrationData?.correlations || []),
      ...(activityData?.correlations || []),
    ];

    return {
      success: true,
      recommendations: allRecommendations,
      patterns: allPatterns,
      correlations: allCorrelations,
      hasEnoughData: moodData?.hasEnoughData || nutritionData?.hasEnoughData ||
                     hydrationData?.hasEnoughData || activityData?.hasEnoughData,
    };
  }, [domain, moodData, nutritionData, hydrationData, activityData]);

  // ========== ORCHESTRATION QUERY ==========

  const {
    data: orchestratedData,
    isLoading: orchestrationLoading,
    refetch: refetchOrchestration,
  } = useQuery({
    queryKey: ['intelligence-orchestration', domain, dashboardData?.today?.nutrition?.calories],
    queryFn: async () => {
      return intelligenceOrchestrator.orchestrate({
        dashboardData,
        decisionBrainData: combinedDecisionBrainData,
        recentLogs: {
          food: dashboardData?.today?.foodLogs || [],
          water: dashboardData?.today?.waterLogs || [],
          mood: moodData?.todaysMoods || [],
          activity: activityData?.todaysActivities || [],
        },
        historicalPatterns: {},
        domain,
      });
    },
    enabled: enabled && !isSourcesLoading && !!dashboardData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const isLoading = isSourcesLoading || orchestrationLoading;

  // ========== APP STATE HANDLING ==========

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - reset session and refetch
        intelligenceOrchestrator.setAppActive(true);
        refetchOrchestration();
      } else if (nextAppState.match(/inactive|background/)) {
        intelligenceOrchestrator.setAppActive(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [refetchOrchestration]);

  // ========== ACTIONS ==========

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchDashboard(),
      refetchOrchestration(),
    ]);
  }, [refetchDashboard, refetchOrchestration]);

  const recordResponse = useCallback(async (recommendation, responseType) => {
    await intelligenceOrchestrator.recordResponse(recommendation, responseType);
    // Invalidate to trigger re-ranking
    queryClient.invalidateQueries({ queryKey: ['intelligence-orchestration'] });
  }, [queryClient]);

  const dismissPattern = useCallback(async (pattern) => {
    await intelligenceOrchestrator.dismissPattern(pattern);
    queryClient.invalidateQueries({ queryKey: ['intelligence-orchestration'] });
  }, [queryClient]);

  // ========== RETURN ==========

  return {
    // Main outputs
    recommendations: orchestratedData?.recommendations || [],
    patterns: orchestratedData?.patterns || [],
    correlations: orchestratedData?.correlations || [],

    // Hero and quick actions
    heroMessage: orchestratedData?.heroMessage || null,
    quickActions: orchestratedData?.quickActions || [],

    // Context
    context: orchestratedData?.context || null,

    // Delivery info
    delivery: orchestratedData?.delivery || null,

    // Stats
    stats: orchestratedData?.stats || null,

    // Loading state
    isLoading,
    hasData: orchestratedData?.meta?.hasData || false,

    // Actions
    refetch,
    recordResponse,
    dismissPattern,

    // Copy helpers
    getSuccessMessage: intelligenceOrchestrator.getSuccessMessage.bind(intelligenceOrchestrator),
    getStreakMessage: intelligenceOrchestrator.getStreakMessage.bind(intelligenceOrchestrator),
    getPatternMessage: intelligenceOrchestrator.getPatternMessage.bind(intelligenceOrchestrator),

    // Raw data access (for advanced use)
    rawDashboard: dashboardData,
    rawDecisionBrain: combinedDecisionBrainData,
  };
}

// ============================================================================
// DOMAIN-SPECIFIC HOOKS (Convenience wrappers)
// ============================================================================

/**
 * Hook for nutrition-specific orchestrated intelligence
 */
export function useNutritionIntelligence() {
  return useIntelligenceOrchestrator({ domain: 'nutrition' });
}

/**
 * Hook for hydration-specific orchestrated intelligence
 */
export function useHydrationIntelligence() {
  return useIntelligenceOrchestrator({ domain: 'hydration' });
}

/**
 * Hook for activity-specific orchestrated intelligence
 */
export function useActivityIntelligence() {
  return useIntelligenceOrchestrator({ domain: 'activity' });
}

/**
 * Hook for mood-specific orchestrated intelligence
 */
export function useMoodIntelligence() {
  return useIntelligenceOrchestrator({ domain: 'mood' });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { WITTY_COPY };
export default useIntelligenceOrchestrator;
