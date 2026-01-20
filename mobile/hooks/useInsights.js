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

const STALE_TIME = 10 * 60 * 1000; // 10 minutes - increased for better caching
const CACHE_TIME = 60 * 60 * 1000; // 60 minutes - aggressive caching
const AI_STALE_TIME = 30 * 60 * 1000; // 30 minutes - AI insights don't change quickly
const AI_CACHE_TIME = 2 * 60 * 60 * 1000; // 2 hours - expensive to compute

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

  // Quality thresholds - only show meaningful patterns
  const MIN_CONFIDENCE = 0.65; // 65% minimum confidence
  const MIN_OCCURRENCES = 5;   // At least 5 observations

  // Transform backend correlations to frontend format
  const transformedCorrelations = (data?.correlations || [])
    .map(corr => ({
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
    }))
    // Filter out low-quality patterns (weak confidence or few occurrences)
    .filter(corr => corr.confidence >= MIN_CONFIDENCE && corr.occurrences >= MIN_OCCURRENCES);

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
 *
 * PERFORMANCE OPTIMIZED:
 * - Long cache times (30min stale, 2hr cache) since AI insights don't change quickly
 * - Low priority fetch - doesn't block initial page load
 * - Graceful fallback if fetch fails
 *
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
        console.log('[useInsights] Fetching AI analysis (background)...');
        const response = await apiClient.get('/insights/ai-analysis', {
          params: { days },
          // Add timeout to prevent hanging
          timeout: 15000, // 15 second timeout for AI calls
        });
        console.log('[useInsights] AI analysis received:', response?.source);
        return response;
      } catch (err) {
        console.error('[useInsights] AI analysis fetch error:', err);
        // Return empty data instead of throwing - don't block UI
        return {
          hasEnoughData: false,
          insights: [],
          patterns: [],
          priorityRecommendation: null,
          weeklyStory: null,
          source: 'error',
        };
      }
    },
    enabled,
    staleTime: AI_STALE_TIME, // 30 minutes - AI results are stable
    gcTime: AI_CACHE_TIME, // 2 hours cache
    retry: 0, // Don't retry - fail fast
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    refetchOnReconnect: false,
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
 * usePersonalizedPatterns - Fetch deep behavioral patterns from correlation engine
 *
 * Returns personalized temporal patterns like:
 * - "When you skip breakfast, your mood crashes around 3pm"
 * - "High-sugar dinners make you anxious the next morning"
 * - "On days you drink enough water, you're less irritable"
 * - "Morning workouts give you energy that lasts all day"
 *
 * Features:
 * - Tries backend API first for server-computed correlations
 * - Falls back to client-side pattern engine if backend fails
 * - Uses local data from useFoodLog, useMoodTrends, useWaterLog
 * - Bayesian confidence with scientific priors
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 * @param {number} options.windowDays - Lookback period in days (default: 21)
 */
export function usePersonalizedPatterns({ enabled = true, windowDays = 21 } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['insights', 'personalized-patterns', windowDays],
    queryFn: async () => {
      // Try backend API first
      try {
        console.log('[useInsights] Fetching personalized patterns from backend...');
        const response = await apiClient.get('/insights/patterns/personalized', {
          params: { windowDays }
        });

        // If backend returns patterns, use them
        if (response?.patterns?.length > 0) {
          console.log('[useInsights] Personalized patterns received from backend:', response.patternsFound || 0, 'patterns');
          return { ...response, source: 'backend' };
        }

        // Backend returned no patterns, try client-side analysis
        console.log('[useInsights] Backend returned no patterns, trying client-side analysis...');
        throw new Error('No patterns from backend');
      } catch (backendErr) {
        // Backend failed or returned no patterns - use client-side engine
        console.log('[useInsights] Using client-side pattern engine as fallback');

        try {
          // Import the client-side pattern engine dynamically
          const { analyzePersonalizedPatterns } = await import('../utils/personalizedPatternEngine');

          // Fetch data from local storage/cache via API
          const [foodResponse, moodResponse, waterResponse] = await Promise.allSettled([
            apiClient.get('/food/history', { params: { limit: 100 } }),
            apiClient.get('/mood/trends', { params: { days: windowDays } }),
            apiClient.get('/water/history', { params: { limit: 100 } }),
          ]);

          // Extract data safely
          const foodLogs = foodResponse.status === 'fulfilled' ? (foodResponse.value?.logs || foodResponse.value?.data || []) : [];
          const moodLogs = moodResponse.status === 'fulfilled' ? (moodResponse.value?.data?.data || moodResponse.value?.data || []) : [];
          const waterLogs = waterResponse.status === 'fulfilled' ? (waterResponse.value?.logs || waterResponse.value?.data || []) : [];
          const activityLogs = []; // Activity logs not yet implemented

          console.log('[useInsights] Client-side data loaded:', {
            food: foodLogs.length,
            mood: moodLogs.length,
            water: waterLogs.length,
          });

          // Run client-side analysis
          const result = analyzePersonalizedPatterns({
            foodLogs,
            moodLogs,
            waterLogs,
            activityLogs,
          }, {
            minConfidence: 0.4,
            maxPatterns: 10,
          });

          // Update dataQuality with patternsFound
          if (result.dataQuality) {
            result.dataQuality.patternsFound = result.patternsFound || 0;
          }

          console.log('[useInsights] Client-side patterns computed:', result.patternsFound || 0, 'patterns');
          return { ...result, source: 'client' };

        } catch (clientErr) {
          console.error('[useInsights] Client-side analysis failed:', clientErr);
          // Return empty state instead of throwing
          return {
            success: false,
            hasEnoughData: false,
            patterns: [],
            categories: {
              mealTiming: [],
              nextDayCarryover: [],
              hydration: [],
              activity: [],
              general: [],
            },
            dataQuality: { score: 0, label: 'insufficient', patternsFound: 0 },
            topInsight: null,
            patternsFound: 0,
            source: 'none',
            message: 'Unable to analyze patterns. Please try again later.',
          };
        }
      }
    },
    enabled,
    staleTime: AI_STALE_TIME, // 30 minutes - patterns don't change quickly
    gcTime: AI_CACHE_TIME, // 2 hours cache
    retry: 0, // Don't retry - fail fast
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Use cached data if available
    refetchOnReconnect: false,
  });

  // Get patterns by category for easy UI grouping
  const categories = data?.categories || {
    mealTiming: [],
    nextDayCarryover: [],
    hydration: [],
    activity: [],
    general: [],
  };

  // Flatten all patterns for list display
  const allPatterns = data?.patterns || [];

  // Get top insight (most confident/impactful)
  const topInsight = data?.topInsight || null;

  return {
    // All patterns
    patterns: allPatterns,
    patternsFound: data?.patternsFound || 0,

    // Grouped by category
    categories,
    mealTimingPatterns: categories.mealTiming,
    nextDayCarryoverPatterns: categories.nextDayCarryover,
    hydrationPatterns: categories.hydration,
    activityPatterns: categories.activity,

    // Top insight for featured display
    topInsight,

    // Data quality info
    dataQuality: data?.dataQuality || { score: 0, label: 'insufficient', patternsFound: 0 },
    hasEnoughData: data?.hasEnoughData ?? false,

    // Window info
    windowDays: data?.windowDays || windowDays,

    // Source info (backend vs client)
    source: data?.source || 'unknown',

    // Loading state
    isLoading,
    isFetching,
    error,
    refetch,

    // Convenience booleans
    hasPatterns: allPatterns.length > 0,
    hasMealTimingPatterns: categories.mealTiming?.length > 0,
    hasHydrationPatterns: categories.hydration?.length > 0,
    hasActivityPatterns: categories.activity?.length > 0,
    hasCarryoverPatterns: categories.nextDayCarryover?.length > 0,
  };
}

/**
 * useCombinedInsights - OPTIMIZED: Single API call for all basic insights
 *
 * PERFORMANCE BENEFITS:
 * - 1 API call instead of 4
 * - Single DB connection on backend
 * - Reduces latency by ~75%
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 * @param {number} options.days - Lookback period in days (default: 14)
 */
export function useCombinedInsights({ enabled = true, days = 14 } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['insights', 'combined', days],
    queryFn: async () => {
      try {
        console.log('[useInsights] Fetching combined insights (optimized)...');
        const start = Date.now();
        const response = await apiClient.get('/insights/combined', {
          params: { days },
          _timeout: 15000, // 15 second timeout to prevent infinite loading
        });
        console.log(`[useInsights] Combined insights received in ${Date.now() - start}ms`);
        return response;
      } catch (err) {
        console.error('[useInsights] Combined fetch error:', err);
        // Return empty data instead of throwing - prevents infinite loading state
        return {
          success: false,
          predictions: {},
          correlations: [],
          weeklyNarrative: {},
          whatToChange: {},
          dataPoints: { food: 0, mood: 0, water: 0 },
          _error: err?.message || 'Failed to fetch insights',
        };
      }
    },
    enabled,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 0, // Don't retry - fail fast
    refetchOnWindowFocus: false,
  });

  // Extract predictions
  const predictions = data?.predictions || {};
  const allPredictions = [
    predictions.energy && { ...predictions.energy, id: 'energy', type: 'energy', icon: '⚡' },
    predictions.mood && { ...predictions.mood, id: 'mood', type: 'mood', icon: '😊' },
    predictions.nutrient && { ...predictions.nutrient, id: 'nutrient', type: 'nutrient', icon: '🥗' },
  ].filter(Boolean);

  // Extract correlations
  const correlations = (data?.correlations || []).map(corr => ({
    id: corr.id,
    pattern: corr.factor && corr.outcome
      ? `${capitalizeFirst(corr.factor)} → ${corr.outcome}`
      : corr.explanation || 'Pattern detected',
    confidence: corr.confidence > 1 ? corr.confidence / 100 : (corr.confidence || 0),
    occurrences: corr.instances || corr.dataPoints || corr.occurrences || 0,
    impacts: buildImpacts(corr),
    type: corr.type,
    explanation: corr.explanation,
    suggestion: corr.suggestion,
  }));

  // Extract weekly narrative
  const weeklyNarrative = data?.weeklyNarrative || {};

  // Extract what to change
  const whatToChange = data?.whatToChange || {};

  return {
    // Predictive data
    energyPrediction: predictions.energy ? {
      id: 'energy',
      type: 'energy',
      icon: '⚡',
      statement: predictions.energy.statement,
      hourlyLevels: predictions.energy.hourlyLevels,
      prevention: predictions.energy.prevention,
      confidence: predictions.energy.confidence,
    } : null,
    moodPrediction: predictions.mood ? {
      id: 'mood',
      type: 'mood',
      icon: '😊',
      statement: predictions.mood.statement,
      confidence: predictions.mood.confidence,
    } : null,
    nutrientPrediction: predictions.nutrient ? {
      id: 'nutrient',
      type: 'nutrient',
      icon: '🥗',
      statement: predictions.nutrient.statement,
      confidence: predictions.nutrient.confidence,
    } : null,
    allPredictions,

    // Correlations
    correlations,
    hasCorrelations: correlations.length > 0,

    // Weekly narrative
    weeklyNarrative,
    hasWeeklyNarrative: Boolean(weeklyNarrative.narrative),

    // What to change
    whatToChange,
    hasWhatToChange: Boolean(whatToChange.title),

    // Data points
    dataPoints: data?.dataPoints || { food: 0, mood: 0, water: 0 },

    // Loading state
    isLoading,
    isFetching,
    error,
    refetch,

    // Convenience
    hasPredictions: allPredictions.length > 0,
  };
}

/**
 * useInsights - Combined hook for all insights
 *
 * OPTIMIZED: Now uses single /insights/combined endpoint
 * instead of 4 separate API calls
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch all (default: true)
 */
export function useInsights({ enabled = true } = {}) {
  const queryClient = useQueryClient();

  // Use combined endpoint for better performance
  const combined = useCombinedInsights({ enabled });

  // Create compatible interface for existing code
  const predictive = {
    energyPrediction: combined.energyPrediction,
    moodPrediction: combined.moodPrediction,
    nutrientPrediction: combined.nutrientPrediction,
    allPredictions: combined.allPredictions,
    dataPoints: combined.dataPoints?.food || 0,
    isLoading: combined.isLoading,
    isFetching: combined.isFetching,
    error: combined.error,
    refetch: combined.refetch,
  };

  const correlations = {
    correlations: combined.correlations,
    hasCorrelations: combined.hasCorrelations,
    isLoading: combined.isLoading,
    isFetching: combined.isFetching,
    error: combined.error,
    refetch: combined.refetch,
  };

  const weeklyNarrative = {
    ...combined.weeklyNarrative,
    hasData: combined.hasWeeklyNarrative,
    isLoading: combined.isLoading,
    isFetching: combined.isFetching,
    error: combined.error,
    refetch: combined.refetch,
  };

  const whatToChange = {
    ...combined.whatToChange,
    hasData: combined.hasWhatToChange,
    isLoading: combined.isLoading,
    isFetching: combined.isFetching,
    error: combined.error,
    refetch: combined.refetch,
  };

  const refetchAll = () => {
    combined.refetch();
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['insights'] });
  };

  return {
    // Individual data (compatible interface)
    predictive,
    correlations,
    weeklyNarrative,
    whatToChange,

    // Combined state
    isLoading: combined.isLoading,
    isFetching: combined.isFetching,
    hasAnyError: combined.error,

    // Actions
    refetchAll,
    invalidateAll,

    // Convenience booleans
    hasPredictions: combined.hasPredictions,
    hasCorrelations: combined.hasCorrelations,
    hasWeeklyNarrative: combined.hasWeeklyNarrative,
    hasWhatToChange: combined.hasWhatToChange,
  };
}

// ============================================================================
// NOVEL CORRELATIONS - Auto-discovered patterns unique to you
// ============================================================================

/**
 * Transform technical correlation data into friendly, conversational language
 */
function humanizeCorrelation(correlation) {
  const { factorA, factorB, direction, strength, lagHours, correlation: corr } = correlation;

  // Map technical factor names to friendly descriptions
  const factorNames = {
    total_calories: 'your calorie intake',
    total_protein: 'protein in your meals',
    total_sugar: 'sugar consumption',
    total_fiber: 'fiber intake',
    total_carbs: 'carb intake',
    daily_water_ml: 'water intake',
    morning_hydration: 'morning hydration',
    evening_hydration: 'evening hydration',
    activity_minutes: 'physical activity',
    morning_activity: 'morning exercise',
    evening_activity: 'evening activity',
    avg_mood: 'your mood',
    avg_energy: 'energy levels',
    mood_variance: 'mood stability',
    late_eating: 'eating late at night',
    breakfast_skip: 'skipping breakfast',
    protein_ratio: 'protein balance',
    avg_nova_score: 'processed food intake',
    sleep_quality: 'sleep quality',
    stress_level: 'stress levels',
  };

  const friendlyA = factorNames[factorA] || factorA.replace(/_/g, ' ');
  const friendlyB = factorNames[factorB] || factorB.replace(/_/g, ' ');

  // Build human-readable insight based on direction and lag
  let insight = '';
  let emoji = '';
  let actionTip = '';

  const isPositive = direction === 'positive';
  const isStrong = strength === 'strong';
  const hasDelay = lagHours > 0;

  // Determine emoji based on pattern type
  if (factorB.includes('mood') || factorB.includes('energy')) {
    emoji = isPositive ? '✨' : '💡';
  } else if (factorA.includes('water') || factorA.includes('hydration')) {
    emoji = '💧';
  } else if (factorA.includes('activity') || factorA.includes('exercise')) {
    emoji = '🏃';
  } else if (factorA.includes('sugar') || factorA.includes('calories')) {
    emoji = '🍎';
  } else {
    emoji = '🔍';
  }

  // Build the insight message
  if (isPositive) {
    if (hasDelay) {
      insight = `When ${friendlyA} increases, ${friendlyB} tends to improve about ${lagHours} hours later`;
      actionTip = `Try increasing ${friendlyA} in the morning to feel the benefits by ${lagHours > 6 ? 'evening' : 'afternoon'}`;
    } else {
      insight = `Higher ${friendlyA} is linked to better ${friendlyB}`;
      actionTip = `Focus on ${friendlyA} to boost ${friendlyB}`;
    }
  } else {
    if (hasDelay) {
      insight = `When ${friendlyA} is high, ${friendlyB} tends to dip about ${lagHours} hours later`;
      actionTip = `Be mindful of ${friendlyA}, especially before important activities`;
    } else {
      insight = `Higher ${friendlyA} seems to affect ${friendlyB} negatively`;
      actionTip = `Consider moderating ${friendlyA} to help with ${friendlyB}`;
    }
  }

  // Add confidence qualifier
  const confidenceNote = isStrong
    ? "We've seen this pattern consistently in your data."
    : "This is an emerging pattern we're still learning about.";

  return {
    emoji,
    headline: insight,
    explanation: confidenceNote,
    actionTip,
    isPersonalized: true,
    strengthLabel: isStrong ? 'Strong pattern' : 'Emerging pattern',
    delayLabel: hasDelay ? `${lagHours}h delay` : 'Immediate effect',
  };
}

/**
 * useNovelCorrelations - Fetch auto-discovered patterns unique to this user
 *
 * These are patterns the AI has discovered specifically for YOU - not generic
 * health advice, but insights learned from YOUR data over time.
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to auto-fetch (default: true)
 * @param {number} options.lookbackDays - Days to analyze (default: 30)
 * @param {number} options.limit - Max patterns to return (default: 5)
 */
export function useNovelCorrelations({ enabled = true, lookbackDays = 30, limit = 5 } = {}) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['insights', 'novel-correlations', lookbackDays, limit],
    queryFn: async () => {
      try {
        console.log('[useInsights] Fetching novel correlations...');
        const response = await apiClient.get('/insights/novel-correlations', {
          params: { lookbackDays, limit }
        });
        console.log('[useInsights] Novel correlations received:', response?.data?.correlations?.length || 0);
        return response?.data || response;
      } catch (err) {
        console.error('[useInsights] Novel correlations error:', err);
        return {
          correlations: [],
          insights: [],
          hasEnoughData: false,
          daysAnalyzed: 0,
        };
      }
    },
    enabled,
    staleTime: AI_STALE_TIME, // 30 minutes - discoveries don't change quickly
    gcTime: AI_CACHE_TIME, // 2 hours cache
    retry: 0,
    refetchOnWindowFocus: false,
  });

  // Transform raw correlations into user-friendly format
  const rawCorrelations = data?.correlations || [];
  const humanizedPatterns = rawCorrelations.map((corr, index) => ({
    id: `novel_${corr.factorA}_${corr.factorB}_${index}`,
    ...humanizeCorrelation(corr),
    // Technical details (for curious users)
    technical: {
      factorA: corr.factorA,
      factorB: corr.factorB,
      correlation: corr.correlation,
      pValue: corr.pValue,
      sampleSize: corr.sampleSize,
      lagHours: corr.lagHours,
      noveltyScore: corr.noveltyScore,
    },
    // Visual metadata
    priority: index + 1,
    isNew: corr.noveltyScore > 0.7,
    confidence: 1 - (corr.pValue || 0.5),
  }));

  // Get the most interesting discovery to highlight
  const topDiscovery = humanizedPatterns.length > 0 ? humanizedPatterns[0] : null;

  return {
    // User-friendly patterns
    patterns: humanizedPatterns,
    topDiscovery,

    // Data status
    hasPatterns: humanizedPatterns.length > 0,
    hasEnoughData: data?.hasEnoughData ?? false,
    daysAnalyzed: data?.daysAnalyzed || 0,

    // Metadata
    totalDiscovered: data?.meta?.totalDiscovered || humanizedPatterns.length,

    // Loading states
    isLoading,
    isFetching,
    error,
    refetch,

    // Helper for UI
    emptyStateMessage: !data?.hasEnoughData
      ? "Keep logging for a few more days and I'll start discovering patterns unique to you!"
      : "No new patterns discovered yet. Keep logging and check back soon!",
  };
}

// ============================================================================
// RECOMMENDATION TRACKING - Feedback loop for smarter recommendations
// ============================================================================

/**
 * useRecommendationTracking - Track user interactions with recommendations
 *
 * This powers the feedback loop that makes recommendations smarter over time.
 * The more you interact, the better the AI learns what works for YOU.
 */
export function useRecommendationTracking() {
  const queryClient = useQueryClient();

  /**
   * Track when a recommendation is shown to the user
   */
  const trackShown = async (recommendation) => {
    try {
      await apiClient.post('/insights/recommendations/track', {
        recommendationId: recommendation.id,
        recommendationType: recommendation.type || 'general',
        domain: recommendation.domain || 'nutrition',
        actionType: 'shown',
        title: recommendation.title,
      });
    } catch (err) {
      // Silent fail - don't disrupt UX for tracking
      console.debug('[Tracking] Failed to track shown:', err.message);
    }
  };

  /**
   * Track when user taps on a recommendation to see details
   */
  const trackClicked = async (recommendation) => {
    try {
      await apiClient.post('/insights/recommendations/track', {
        recommendationId: recommendation.id,
        recommendationType: recommendation.type || 'general',
        domain: recommendation.domain || 'nutrition',
        actionType: 'clicked',
        title: recommendation.title,
        action: recommendation.action,
      });
    } catch (err) {
      console.debug('[Tracking] Failed to track clicked:', err.message);
    }
  };

  /**
   * Track when user marks a recommendation as done
   * This triggers outcome verification after the expected delay
   */
  const trackCompleted = async (recommendation) => {
    try {
      const response = await apiClient.post('/insights/recommendations/track', {
        recommendationId: recommendation.id,
        recommendationType: recommendation.type || 'general',
        domain: recommendation.domain || 'nutrition',
        actionType: 'completed',
        title: recommendation.title,
        action: recommendation.action,
        difficultyTier: recommendation.difficultyTier,
      });

      // Invalidate recommendations to refresh with new learnings
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });

      return response;
    } catch (err) {
      console.debug('[Tracking] Failed to track completed:', err.message);
      return null;
    }
  };

  /**
   * Track when user dismisses a recommendation
   * Helps the AI learn what's not relevant
   */
  const trackDismissed = async (recommendation, reason = null) => {
    try {
      await apiClient.post('/insights/recommendations/track', {
        recommendationId: recommendation.id,
        recommendationType: recommendation.type || 'general',
        domain: recommendation.domain || 'nutrition',
        actionType: 'dismissed',
        title: recommendation.title,
        context: { dismissReason: reason },
      });
    } catch (err) {
      console.debug('[Tracking] Failed to track dismissed:', err.message);
    }
  };

  return {
    trackShown,
    trackClicked,
    trackCompleted,
    trackDismissed,
  };
}

// ============================================================================
// DIFFICULTY TIER HELPERS - For recommendation display
// ============================================================================

/**
 * Get display properties for a difficulty tier
 */
export function getDifficultyTierDisplay(tier) {
  const tiers = {
    EASY: {
      label: 'Quick Win',
      description: 'Takes less than 5 minutes',
      icon: 'sparkles-outline',
      color: '#10B981', // green
      bgColor: 'rgba(16, 185, 129, 0.1)',
    },
    MEDIUM: {
      label: 'Worth It',
      description: 'Takes 5-15 minutes',
      icon: 'flash-outline',
      color: '#F59E0B', // amber
      bgColor: 'rgba(245, 158, 11, 0.1)',
    },
    HARD: {
      label: 'Challenge',
      description: 'Requires more effort but pays off',
      icon: 'trophy-outline',
      color: '#8B5CF6', // purple
      bgColor: 'rgba(139, 92, 246, 0.1)',
    },
  };

  return tiers[tier] || tiers.MEDIUM;
}

/**
 * Get motivational message based on completion streak
 */
export function getStreakMessage(completedCount) {
  if (completedCount === 0) return "Let's start building healthy habits!";
  if (completedCount === 1) return "Great start! One down, momentum building.";
  if (completedCount < 5) return `${completedCount} wins this week! Keep it up!`;
  if (completedCount < 10) return `${completedCount} healthy choices! You're on fire! 🔥`;
  return `${completedCount} wins! You're a wellness champion! 🏆`;
}

export default useInsights;
