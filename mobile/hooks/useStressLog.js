/**
 * useStressLog Hook
 * Production-ready stress logging with backend sync and optimistic updates
 * Includes triggers, symptoms, coping strategies, and pattern analysis
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Stress levels with descriptions and colors
 */
export const STRESS_LEVELS = [
  { value: 1, label: 'Minimal', description: 'Feeling calm and relaxed', color: '#10B981' },
  { value: 2, label: 'Very Low', description: 'Slight tension', color: '#34D399' },
  { value: 3, label: 'Low', description: 'Minor stress', color: '#84CC16' },
  { value: 4, label: 'Mild', description: 'Some pressure', color: '#BEF264' },
  { value: 5, label: 'Moderate', description: 'Noticeable stress', color: '#FCD34D' },
  { value: 6, label: 'Elevated', description: 'Significant stress', color: '#FBBF24' },
  { value: 7, label: 'High', description: 'Feeling overwhelmed', color: '#FB923C' },
  { value: 8, label: 'Very High', description: 'Struggling to cope', color: '#F87171' },
  { value: 9, label: 'Severe', description: 'Intense stress', color: '#EF4444' },
  { value: 10, label: 'Extreme', description: 'Crisis level', color: '#DC2626' },
];

/**
 * Stress triggers
 */
export const STRESS_TRIGGERS = [
  { key: 'work', label: 'Work', icon: 'briefcase', color: '#6366F1' },
  { key: 'relationships', label: 'Relationships', icon: 'heart', color: '#EC4899' },
  { key: 'health', label: 'Health', icon: 'medkit', color: '#EF4444' },
  { key: 'finances', label: 'Finances', icon: 'cash', color: '#10B981' },
  { key: 'family', label: 'Family', icon: 'people', color: '#F59E0B' },
  { key: 'social', label: 'Social', icon: 'chatbubbles', color: '#8B5CF6' },
  { key: 'environment', label: 'Environment', icon: 'home', color: '#06B6D4' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#64748B' },
];

/**
 * Physical symptoms of stress
 */
export const PHYSICAL_SYMPTOMS = [
  { key: 'headache', label: 'Headache', icon: 'medical' },
  { key: 'tension', label: 'Muscle Tension', icon: 'body' },
  { key: 'fatigue', label: 'Fatigue', icon: 'battery-dead' },
  { key: 'heartRacing', label: 'Racing Heart', icon: 'heart' },
  { key: 'digestive', label: 'Digestive Issues', icon: 'restaurant' },
  { key: 'insomnia', label: 'Sleep Problems', icon: 'moon' },
];

/**
 * Coping strategies
 */
export const COPING_STRATEGIES = [
  { key: 'meditation', label: 'Meditation', icon: 'leaf', color: '#10B981' },
  { key: 'exercise', label: 'Exercise', icon: 'walk', color: '#F59E0B' },
  { key: 'breathing', label: 'Deep Breathing', icon: 'cloud', color: '#06B6D4' },
  { key: 'social', label: 'Social Support', icon: 'people', color: '#EC4899' },
  { key: 'nature', label: 'Time in Nature', icon: 'sunny', color: '#84CC16' },
  { key: 'music', label: 'Music', icon: 'musical-notes', color: '#8B5CF6' },
  { key: 'rest', label: 'Rest/Nap', icon: 'bed', color: '#6366F1' },
  { key: 'hobby', label: 'Hobby/Activity', icon: 'color-palette', color: '#F472B6' },
];

/**
 * Get stress level info by value
 */
export function getStressLevel(value) {
  return STRESS_LEVELS.find((l) => l.value === value) || STRESS_LEVELS[4];
}

/**
 * Get stress color by value
 */
export function getStressColor(value) {
  return getStressLevel(value).color;
}

/**
 * Hook for stress logging operations
 */
export function useStressLog() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch today's stress entries
   */
  const {
    data: todayData,
    isLoading: isTodayLoading,
    error: todayError,
    refetch: refetchToday,
  } = useQuery({
    queryKey: ['stressToday'],
    queryFn: async () => {
      const response = await apiClient.get('/stress/today');
      return response;
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });

  /**
   * Fetch stress history
   */
  const fetchHistory = useCallback(async (options = {}) => {
    const { days = 30, limit = 100, offset = 0 } = options;

    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await apiClient.get(`/stress/history?${params}`);
      return response;
    } catch (err) {
      console.error('[useStressLog] Failed to fetch history:', err);
      return { stressLogs: [], total: 0, summary: {} };
    }
  }, []);

  /**
   * Fetch trigger analysis
   */
  const fetchTriggerAnalysis = useCallback(async (days = 30) => {
    try {
      const response = await apiClient.get(`/stress/triggers?days=${days}`);
      return response;
    } catch (err) {
      console.error('[useStressLog] Failed to fetch trigger analysis:', err);
      return { triggers: null };
    }
  }, []);

  /**
   * Fetch stress patterns
   */
  const {
    data: patternsData,
    isLoading: isPatternsLoading,
    refetch: refetchPatterns,
  } = useQuery({
    queryKey: ['stressPatterns'],
    queryFn: async () => {
      const response = await apiClient.get('/stress/patterns?days=30');
      return response;
    },
    staleTime: 300000, // 5 minutes
    retry: 1,
  });

  /**
   * Mutation for logging stress to backend
   */
  const logStressMutation = useMutation({
    mutationFn: async (stressData) => {
      // Generate strong clientEventId for idempotency
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      const clientEventId = `${userId}-stress-${timestamp}-${random1}-${random2}`;

      return await apiClient.post('/stress/log', {
        ...stressData,
        loggedAt: stressData.loggedAt || new Date().toISOString(),
        clientEventId,
      });
    },
    onMutate: async (stressData) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['stressToday'] });
      const previousData = queryClient.getQueryData(['stressToday']);

      queryClient.setQueryData(['stressToday'], (old) => ({
        ...old,
        today: {
          ...old?.today,
          count: (old?.today?.count || 0) + 1,
          latestLevel: stressData.level,
        },
      }));

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['stressToday'], context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stressToday'] });
      queryClient.invalidateQueries({ queryKey: ['stressPatterns'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /**
   * Log stress entry
   * @param {Object} stressData - Stress data
   * @param {number} stressData.level - Stress level (1-10)
   * @param {string[]} [stressData.triggers] - Trigger keys
   * @param {Object} [stressData.physicalSymptoms] - Symptoms object
   * @param {string[]} [stressData.copingUsed] - Coping strategies used
   * @param {string} [stressData.notes] - Optional notes
   * @returns {Promise<object>}
   */
  const logStress = useCallback(async (stressData) => {
    const { level, triggers = [], physicalSymptoms = {}, copingUsed = [], notes } = stressData;

    // Validation
    if (!level || level < 1 || level > 10) {
      throw new Error('Stress level must be between 1 and 10');
    }

    // Validate triggers
    const validTriggers = STRESS_TRIGGERS.map((t) => t.key);
    const filteredTriggers = triggers.filter((t) => validTriggers.includes(t));

    // Validate coping strategies
    const validCoping = COPING_STRATEGIES.map((c) => c.key);
    const filteredCoping = copingUsed.filter((c) => validCoping.includes(c));

    setIsLogging(true);
    setError(null);

    try {
      const result = await logStressMutation.mutateAsync({
        level,
        triggers: filteredTriggers,
        physicalSymptoms,
        copingUsed: filteredCoping,
        notes,
      });
      return result;
    } catch (err) {
      console.error('[useStressLog] Failed to log stress:', err);
      setError(err.message || 'Failed to log stress');
      throw err;
    } finally {
      setIsLogging(false);
    }
  }, [logStressMutation]);

  /**
   * Quick log stress (just level)
   */
  const quickLog = useCallback(async (level) => {
    return await logStress({ level });
  }, [logStress]);

  /**
   * Mutation for deleting stress entry
   */
  const deleteStressMutation = useMutation({
    mutationFn: async (stressId) => {
      return await apiClient.delete(`/stress/${stressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stressToday'] });
      queryClient.invalidateQueries({ queryKey: ['stressPatterns'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /**
   * Delete stress entry
   * @param {number} stressId - Stress entry ID
   * @returns {Promise<object>}
   */
  const deleteStress = useCallback(async (stressId) => {
    if (!stressId) {
      throw new Error('Stress ID is required');
    }

    setIsLogging(true);
    setError(null);

    try {
      const result = await deleteStressMutation.mutateAsync(stressId);
      return result;
    } catch (err) {
      if (err?.response?.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['stressToday'] });
        return null;
      }
      console.error('[useStressLog] Failed to delete stress:', err);
      setError(err.message || 'Failed to delete stress');
      throw err;
    } finally {
      setIsLogging(false);
    }
  }, [deleteStressMutation, queryClient]);

  /**
   * Get today's stress summary
   */
  const todaySummary = useMemo(() => ({
    count: todayData?.today?.count || 0,
    avgLevel: todayData?.today?.avgLevel || null,
    latestLevel: todayData?.today?.latestLevel || null,
    triggers: todayData?.today?.triggers || {},
  }), [todayData]);

  /**
   * Get today's stress logs
   */
  const stressLogs = useMemo(() => todayData?.stressLogs || [], [todayData]);

  /**
   * Get stress patterns
   */
  const patterns = useMemo(() => patternsData?.patterns || null, [patternsData]);

  /**
   * Refetch all data
   */
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchToday(),
      refetchPatterns(),
    ]);
  }, [refetchToday, refetchPatterns]);

  return {
    // Logging functions
    logStress,
    quickLog,
    deleteStress,

    // State
    isLogging,
    error,

    // Today's data
    todaySummary,
    stressLogs,
    isTodayLoading,
    todayError,

    // Patterns
    patterns,
    isPatternsLoading,

    // History & Analysis
    fetchHistory,
    fetchTriggerAnalysis,

    // Refetch
    refetch,
    refetchToday,
    refetchPatterns,

    // Constants
    levels: STRESS_LEVELS,
    triggers: STRESS_TRIGGERS,
    symptoms: PHYSICAL_SYMPTOMS,
    copingStrategies: COPING_STRATEGIES,
  };
}

export default useStressLog;
