/**
 * useWellnessIntelligence - Hook for holistic wellness intelligence
 *
 * Fetches cross-domain wellness data from the new unified wellness service:
 * - Wellness score (0-100)
 * - Recovery score (WHOOP-style 0-100)
 * - Current state flags (LOW_RECOVERY, DEHYDRATED, HIGH_STRESS, etc.)
 * - Cross-domain correlations
 * - Personalized narratives and guidance
 *
 * This provides the "story behind the numbers" - not just metrics,
 * but personalized explanations of what they mean for the user.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import apiClient from '../services/apiClient';

const QUERY_KEY = 'wellness-intelligence';

/**
 * Main wellness intelligence hook
 * @param {Object} options - Configuration options
 * @param {number} options.lookbackDays - Days to analyze (default: 7)
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 * @param {boolean} options.includeSummary - Fetch lightweight summary only (default: false)
 */
export function useWellnessIntelligence(options = {}) {
  const {
    lookbackDays = 7,
    enabled = true,
    includeSummary = false
  } = options;

  const queryClient = useQueryClient();

  // Main query for full intelligence
  const intelligenceQuery = useQuery({
    queryKey: [QUERY_KEY, 'full', lookbackDays],
    queryFn: async () => {
      const response = await apiClient.get('/wellness/intelligence', {
        params: { lookbackDays }
      });
      return response;
    },
    enabled: enabled && !includeSummary,
    staleTime: 3 * 60 * 1000, // 3 minutes (wellness changes slowly)
    cacheTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 2,
  });

  // Lightweight summary query (for dashboard quick load)
  const summaryQuery = useQuery({
    queryKey: [QUERY_KEY, 'summary'],
    queryFn: async () => {
      const response = await apiClient.get('/wellness/summary');
      return response;
    },
    enabled: enabled && includeSummary,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Process the wellness data
  const wellness = useMemo(() => {
    const query = includeSummary ? summaryQuery : intelligenceQuery;
    const data = query.data;

    if (!data?.success) {
      return {
        // Default state when no data
        wellnessScore: 50,
        recoveryScore: 50,
        scoreLabel: 'Loading...',
        recoveryLabel: 'Loading...',
        emoji: '💭',
        headline: 'Checking your wellness...',
        primaryConcern: 'NONE',
        needsAttention: false,
        flags: [],
        insights: {},
        correlations: [],
        narrative: null,
        guidance: [],
        hasData: false,
        isNewUser: false,
        dataCompleteness: { percentage: 0, label: 'No data' }
      };
    }

    // Handle summary vs full response
    if (includeSummary && data.summary) {
      return processSummary(data.summary);
    }

    return processFullIntelligence(data);
  }, [intelligenceQuery.data, summaryQuery.data, includeSummary]);

  // Get personalized message for a specific context
  const getContextualMessage = useCallback((context) => {
    if (!wellness.hasData) return null;

    const messages = {
      dashboard: wellness.narrative?.summary || 'Check your wellness insights',
      mealTime: getMealTimeMessage(wellness),
      morning: getMorningMessage(wellness),
      evening: getEveningMessage(wellness),
      postWorkout: getPostWorkoutMessage(wellness),
      stressed: getStressMessage(wellness),
    };

    return messages[context] || wellness.narrative?.summary;
  }, [wellness]);

  // Check if a specific concern is active
  const hasConcern = useCallback((concernType) => {
    return wellness.flags.some(f => f.flag === concernType);
  }, [wellness.flags]);

  // Get the primary action the user should take
  const getPrimaryAction = useCallback(() => {
    if (!wellness.hasData || wellness.flags.length === 0) {
      return {
        action: 'Log your meals, mood, and water to unlock personalized insights',
        priority: 'low',
        type: 'encourage'
      };
    }

    const topFlag = wellness.flags[0];
    return {
      action: topFlag.foodImplication,
      priority: topFlag.severity,
      type: topFlag.flag
    };
  }, [wellness]);

  // Refresh wellness data
  const refresh = useCallback(() => {
    if (includeSummary) {
      return summaryQuery.refetch();
    }
    return intelligenceQuery.refetch();
  }, [includeSummary, summaryQuery, intelligenceQuery]);

  // Prefetch full data (call from summary to prepare detailed view)
  const prefetchFull = useCallback(() => {
    return queryClient.prefetchQuery({
      queryKey: [QUERY_KEY, 'full', lookbackDays],
      queryFn: () => apiClient.get('/wellness/intelligence', { params: { lookbackDays } })
    });
  }, [queryClient, lookbackDays]);

  const query = includeSummary ? summaryQuery : intelligenceQuery;

  return {
    // Core wellness data
    wellness,

    // Convenience accessors
    wellnessScore: wellness.wellnessScore,
    recoveryScore: wellness.recoveryScore,
    scoreLabel: wellness.scoreLabel,
    recoveryLabel: wellness.recoveryLabel,
    emoji: wellness.emoji,
    headline: wellness.headline,
    primaryConcern: wellness.primaryConcern,
    needsAttention: wellness.needsAttention,
    flags: wellness.flags,
    narrative: wellness.narrative,
    guidance: wellness.guidance,
    correlations: wellness.correlations,
    hasData: wellness.hasData,
    isNewUser: wellness.isNewUser,
    dataCompleteness: wellness.dataCompleteness,

    // Domain insights
    insights: wellness.insights,

    // Helpers
    getContextualMessage,
    hasConcern,
    getPrimaryAction,
    prefetchFull,

    // Query state
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: refresh,

    // Raw query
    query,
  };
}

// ==================== Processing Functions ====================

function processSummary(summary) {
  return {
    wellnessScore: summary.scores?.wellness || 50,
    recoveryScore: summary.scores?.recovery || 50,
    scoreLabel: getScoreLabel(summary.scores?.wellness),
    recoveryLabel: getRecoveryLabel(summary.scores?.recovery),
    emoji: getWellnessEmoji(summary.scores?.wellness),
    headline: summary.topFlag?.flag ? getFlagHeadline(summary.topFlag.flag) : 'Balanced',
    primaryConcern: summary.primaryConcern || 'NONE',
    needsAttention: summary.needsAttention || false,
    flags: summary.topFlag ? [summary.topFlag] : [],
    insights: {},
    correlations: [],
    narrative: null,
    guidance: summary.quickInsight ? [summary.quickInsight] : [],
    hasData: true,
    isNewUser: summary.primaryConcern === 'NEW_USER',
    dataCompleteness: summary.dataCompleteness || { percentage: 0, label: 'Unknown' }
  };
}

function processFullIntelligence(data) {
  const { wellnessScore, recoveryScore, currentState, insights, correlations, narrative, contextualGuidance, meta } = data;

  return {
    wellnessScore: wellnessScore || 50,
    recoveryScore: recoveryScore || 50,
    scoreLabel: getScoreLabel(wellnessScore),
    recoveryLabel: getRecoveryLabel(recoveryScore),
    emoji: getWellnessEmoji(wellnessScore),
    headline: narrative?.headline || 'Balanced',
    primaryConcern: currentState?.primaryConcern || 'NONE',
    needsAttention: currentState?.needsSpecialAttention || false,
    flags: currentState?.flags || [],
    insights: insights || {},
    correlations: correlations?.significant || [],
    narrative: narrative || null,
    guidance: contextualGuidance || [],
    conflictResolution: currentState?.conflictResolution || null,
    hasData: true,
    isNewUser: currentState?.primaryConcern === 'NEW_USER',
    dataCompleteness: {
      percentage: calculateCompleteness(meta?.dataPoints),
      label: getCompletenessLabel(meta?.dataPoints)
    },
    meta
  };
}

// ==================== Helper Functions ====================

function getScoreLabel(score) {
  if (!score && score !== 0) return 'Unknown';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 40) return 'Needs attention';
  return 'Low';
}

function getRecoveryLabel(score) {
  if (!score && score !== 0) return 'Unknown';
  if (score >= 70) return 'Ready for activity';
  if (score >= 50) return 'Moderate - take it easy';
  if (score >= 30) return 'Low - light activity only';
  return 'Rest recommended';
}

function getWellnessEmoji(score) {
  if (!score && score !== 0) return '💭';
  if (score >= 80) return '🌟';
  if (score >= 70) return '💚';
  if (score >= 60) return '💛';
  if (score >= 50) return '🧡';
  if (score >= 40) return '❤️';
  return '❤️‍🩹';
}

function getFlagHeadline(flag) {
  const headlines = {
    LOW_RECOVERY: 'Recovery Day',
    DEHYDRATED: 'Hydration Focus',
    HIGH_STRESS: 'Stress Relief Mode',
    POST_WORKOUT: 'Recovery Window',
    LOW_MOOD: 'Mood Boost Day',
    LOW_ENERGY: 'Energy Recharge',
    POOR_SLEEP: 'Rest & Restore',
    NEW_USER: 'Welcome!',
    OPTIMAL_STATE: 'Peak Performance',
    CRITICAL_RECOVERY: 'Rest Priority',
    NONE: 'Balanced'
  };
  return headlines[flag] || 'Balanced';
}

function calculateCompleteness(dataPoints) {
  if (!dataPoints) return 0;
  const total = Object.values(dataPoints).reduce((sum, val) => sum + (val || 0), 0);
  const domains = Object.keys(dataPoints).length;
  const expectedMinimum = domains * 3;
  return Math.min(100, Math.round((total / expectedMinimum) * 100));
}

function getCompletenessLabel(dataPoints) {
  const percentage = calculateCompleteness(dataPoints);
  if (percentage >= 80) return 'Rich data';
  if (percentage >= 50) return 'Good data';
  if (percentage >= 25) return 'Building data';
  return 'Just starting';
}

// Contextual message generators
function getMealTimeMessage(wellness) {
  if (wellness.primaryConcern === 'DEHYDRATED') {
    return 'Have a glass of water with your meal - you\'re running low!';
  }
  if (wellness.primaryConcern === 'LOW_RECOVERY') {
    return 'Choose something light and easy to digest.';
  }
  if (wellness.primaryConcern === 'POST_WORKOUT') {
    return 'Great time for protein! Your muscles are ready to rebuild.';
  }
  if (wellness.primaryConcern === 'HIGH_STRESS') {
    return 'Try something with magnesium - dark chocolate, spinach, or nuts.';
  }
  return 'Enjoy your meal! Your wellness is balanced.';
}

function getMorningMessage(wellness) {
  if (wellness.flags.some(f => f.flag === 'POOR_SLEEP')) {
    return 'Rough night? Start gentle - avoid heavy caffeine and try some energizing protein.';
  }
  if (wellness.recoveryScore >= 70) {
    return 'Great recovery! You\'re ready for an energizing day.';
  }
  return 'Good morning! Your body is ready for fuel.';
}

function getEveningMessage(wellness) {
  if (wellness.flags.some(f => f.flag === 'HIGH_STRESS')) {
    return 'Wind down with calming foods - chamomile, magnesium-rich snacks, or warm milk.';
  }
  if (wellness.flags.some(f => f.flag === 'DEHYDRATED')) {
    return 'Catch up on hydration before bed - but not too much to avoid midnight trips!';
  }
  return 'Evening approaches - consider a lighter meal for better sleep.';
}

function getPostWorkoutMessage(wellness) {
  if (wellness.recoveryScore < 50) {
    return 'Recovery is low - keep it light. Protein shake or yogurt would be perfect.';
  }
  return 'Great workout! Get protein + carbs within 30 min for best recovery.';
}

function getStressMessage(wellness) {
  if (wellness.flags.some(f => f.flag === 'DEHYDRATED')) {
    return 'Stress + dehydration is a tough combo. Water first, then magnesium-rich foods.';
  }
  return 'Feeling stressed? Dark chocolate, almonds, or spinach can help calm your nervous system.';
}

export default useWellnessIntelligence;
