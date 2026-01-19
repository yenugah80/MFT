import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import { aggregateMoodInsights } from '../utils/moodAggregation';

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_TREND_DAYS = 7;
const MAX_HISTORY_LIMIT = 500;

const buildHistoryUrl = (days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const start = encodeURIComponent(startDate.toISOString());
  const end = encodeURIComponent(endDate.toISOString());
  return `/mood/history?startDate=${start}&endDate=${end}&limit=${MAX_HISTORY_LIMIT}`;
};

export const useMoodInsights = ({ windowDays = DEFAULT_WINDOW_DAYS, trendDays = DEFAULT_TREND_DAYS } = {}) => {
  return useQuery({
    queryKey: ['moodInsights', windowDays, trendDays],
    queryFn: async () => {
      const response = await apiClient.get(buildHistoryUrl(windowDays));
      const logs = Array.isArray(response) ? response : [];
      return aggregateMoodInsights({
        logs,
        windowDays,
        trendDays,
      });
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * useMoodTrends - Alias for useMoodInsights with period-based configuration
 * @param {Object} options - { period: 'week' | 'month' | 'quarter' }
 */
export const useMoodTrends = ({ period = 'week' } = {}) => {
  const periodDays = {
    week: 7,
    month: 30,
    quarter: 90,
  };
  const windowDays = periodDays[period] || 7;
  return useMoodInsights({ windowDays, trendDays: Math.min(windowDays, 7) });
};

/**
 * useMoodIntelligence - Fetches AI-powered mood recommendations and wellness insights
 */
export const useMoodIntelligence = () => {
  return useQuery({
    queryKey: ['moodIntelligence'],
    queryFn: async () => {
      const response = await apiClient.get('/mood/intelligence', { _timeout: 30000 });
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
  });
};

/**
 * useDecisionBrainMoodInsights - Fetches ML-powered mood insights from Decision Brain
 *
 * This is the PRIMARY hook for mood insights. It calls the unified Decision Brain
 * backend which integrates:
 * - Correlation Engine (pattern detection)
 * - Thompson Sampling (exploration-exploitation)
 * - Mood Recommendation Engine
 * - Safety Guardrails
 *
 * @returns {Object} Query result with:
 *   - stats: { avgMood, avgEnergy, trend, isConsistent, dominantMood, bestDay, worstDay }
 *   - trendData: 7-day trend data for visualization
 *   - patterns: Array of discovered patterns with titles, descriptions, icons
 *   - correlations: ML-detected correlations with confidence scores
 *   - recommendations: Actionable recommendations
 *   - todaysMoods: Today's mood entries
 *   - profile: Mood profile summary
 *   - decision: { type, reason, shouldShowInsights }
 */
export const useDecisionBrainMoodInsights = () => {
  return useQuery({
    queryKey: ['decisionBrainMoodInsights'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/decision-brain/mood-insights', { _timeout: 30000 });
        return response;
      } catch (error) {
        console.warn('[useDecisionBrainMoodInsights] Backend call failed, returning empty:', error.message);
        // Return a minimal response so the UI doesn't break
        return {
          success: false,
          hasEnoughData: false,
          stats: null,
          trendData: [],
          patterns: [],
          correlations: [],
          recommendations: [],
          todaysMoods: [],
          profile: null,
          decision: { type: 'SILENT', reason: 'api_error', shouldShowInsights: false },
        };
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
};

/**
 * useDecisionBrainRecommendations - Fetches ML-powered recommendations from Decision Brain
 *
 * @param {Object} options - { domain: 'mood' | 'nutrition' | 'hydration' | 'activity' | 'all' }
 */
export const useDecisionBrainRecommendations = ({ domain = 'all' } = {}) => {
  return useQuery({
    queryKey: ['decisionBrainRecommendations', domain],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/decision-brain/recommendations?domain=${domain}`, { _timeout: 30000 });
        return response;
      } catch (error) {
        console.warn('[useDecisionBrainRecommendations] Backend call failed:', error.message);
        return {
          success: false,
          decision: { type: 'SILENT', shouldSpeak: false },
          recommendation: null,
          correlations: [],
          userContext: null,
        };
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};

/**
 * useDecisionBrainNutritionInsights - Fetches ML-powered nutrition insights from Decision Brain
 *
 * @returns {Object} Query result with:
 *   - stats: { avgCalories, avgProtein, calorieGoalAdherence, trend, ... }
 *   - trendData: 7-day trend data for macros
 *   - patterns: Array of discovered patterns
 *   - correlations: ML-detected correlations
 *   - recommendations: Actionable recommendations
 *   - todaysMeals: Today's meal entries
 *   - profile: { nutritionScore, macroBalance, consistency }
 */
export const useDecisionBrainNutritionInsights = () => {
  return useQuery({
    queryKey: ['decisionBrainNutritionInsights'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/decision-brain/nutrition-insights', { _timeout: 30000 });
        return response;
      } catch (error) {
        console.warn('[useDecisionBrainNutritionInsights] Backend call failed:', error.message);
        return {
          success: false,
          hasEnoughData: false,
          stats: null,
          trendData: [],
          patterns: [],
          correlations: [],
          recommendations: [],
          todaysMeals: [],
          profile: null,
          decision: { type: 'SILENT', reason: 'api_error', shouldShowInsights: false },
        };
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};

/**
 * useDecisionBrainHydrationInsights - Fetches ML-powered hydration insights from Decision Brain
 *
 * @returns {Object} Query result with:
 *   - stats: { avgDailyIntake, goalAdherence, todayProgress, trend, ... }
 *   - trendData: 7-day trend data for water intake
 *   - patterns: Array of discovered patterns
 *   - correlations: ML-detected correlations
 *   - recommendations: Actionable recommendations
 *   - todaysIntake: Today's total water intake
 *   - profile: { hydrationHabit, peakHydrationTime, consistency }
 */
export const useDecisionBrainHydrationInsights = () => {
  return useQuery({
    queryKey: ['decisionBrainHydrationInsights'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/decision-brain/hydration-insights', { _timeout: 30000 });
        return response;
      } catch (error) {
        console.warn('[useDecisionBrainHydrationInsights] Backend call failed:', error.message);
        return {
          success: false,
          hasEnoughData: false,
          stats: null,
          trendData: [],
          patterns: [],
          correlations: [],
          recommendations: [],
          todaysIntake: 0,
          profile: null,
          decision: { type: 'SILENT', reason: 'api_error', shouldShowInsights: false },
        };
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};

/**
 * useDecisionBrainActivityInsights - Fetches ML-powered activity insights from Decision Brain
 *
 * @returns {Object} Query result with:
 *   - stats: { totalMinutesThisWeek, activeDays, moodImpact, preferredActivityType, ... }
 *   - trendData: 7-day trend data for activity
 *   - patterns: Array of discovered patterns
 *   - correlations: ML-detected correlations
 *   - recommendations: Actionable recommendations
 *   - todaysActivities: Today's activity entries
 *   - profile: { fitnessLevel, preferredTime, moodBoostEffect }
 */
export const useDecisionBrainActivityInsights = () => {
  return useQuery({
    queryKey: ['decisionBrainActivityInsights'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/decision-brain/activity-insights', { _timeout: 30000 });
        return response;
      } catch (error) {
        console.warn('[useDecisionBrainActivityInsights] Backend call failed:', error.message);
        return {
          success: false,
          hasEnoughData: false,
          stats: null,
          trendData: [],
          patterns: [],
          correlations: [],
          recommendations: [],
          todaysActivities: [],
          profile: null,
          decision: { type: 'SILENT', reason: 'api_error', shouldShowInsights: false },
        };
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};
