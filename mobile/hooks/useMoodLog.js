/**
 * useMoodLog Hook
 * Production-ready mood logging with backend sync and optimistic updates
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as Crypto from 'expo-crypto';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Available mood types with metadata (8 core moods for premium design)
 */
// Default intensity per mood — used by quick-log (no slider) and pre-fill on select
export const MOOD_DEFAULT_INTENSITY = {
  happy: 7, calm: 5, focused: 6, energized: 8,
  neutral: 5, tired: 6, stressed: 7, sad: 6,
};

export const MOOD_TYPES = [
  { key: 'happy', emoji: '😊', label: 'Happy', color: '#10B981' },
  { key: 'calm', emoji: '😌', label: 'Calm', color: '#3B82F6' },
  { key: 'focused', emoji: '🎯', label: 'Focused', color: '#14B8A6' },
  { key: 'energized', emoji: '⚡', label: 'Energized', color: '#FBBF24' },
  { key: 'neutral', emoji: '😐', label: 'Neutral', color: '#a8ddbfff' },
  { key: 'tired', emoji: '😴', label: 'Tired', color: '#8B5CF6' },
  { key: 'stressed', emoji: '😰', label: 'Stressed', color: '#F97316' },
  { key: 'sad', emoji: '😢', label: 'Sad', color: '#6366F1' },
];

/**
 * Hook for mood logging operations
 */
export function useMoodLog() {
  const queryClient = useQueryClient();
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /**
   * Mutation for logging mood to backend
   */
  const logMoodMutation = useMutation({
    mutationFn: async ({ mood, intensity, energyLevel, tags, note, source = 'manual', clientEventId, loggedDate }) => {
      return await apiClient.post('/mood/log', {
        mood,
        intensity: intensity || 5,
        energyLevel: energyLevel || 5,
        tags: tags || {},
        note,
        source,
        loggedDate: loggedDate || new Date().toISOString(),
        clientEventId,
      });
    },
    onSuccess: () => {
      // Batch invalidation — single flush instead of 5 independent refetches
      queryClient.invalidateQueries({
        predicate: (q) => ['dashboard', 'moodLogs', 'moodTrends', 'moodInsights', 'moodToday']
          .includes(q.queryKey[0]),
      });
    },
  });

  /**
   * Log a mood entry with enhanced fields
   * @param {object} moodData - Mood data object
   * @param {string} moodData.mood - Mood key (happy, sad, etc.)
   * @param {number} moodData.intensity - Mood intensity (1-10)
   * @param {number} moodData.energyLevel - Energy level (1-10)
   * @param {object} moodData.tags - Context tags (sleep, exercise, social, weather, stress)
   * @param {string} moodData.note - Optional note
   * @returns {Promise<object>}
   */
  const { mutateAsync } = logMoodMutation;
  const logMood = useCallback(async (moodData) => {
    // Support both new object format and legacy string format
    const data = typeof moodData === 'string'
      ? { mood: moodData, intensity: 5, energyLevel: 5, tags: {}, note: '' }
      : moodData;

    if (!data.mood) {
      throw new Error('Mood is required');
    }

    setIsLogging(true);
    setError(null);

    try {
      const clientEventId = Crypto.randomUUID();
      const result = await mutateAsync({
        mood: data.mood,
        intensity: data.intensity || 5,
        energyLevel: data.energyLevel || 5,
        tags: data.tags || {},
        note: data.note?.trim() || null,
        source: data.source || 'manual',
        loggedDate: data.loggedDate,
        clientEventId,
      });

      return result;
    } catch (err) {
      console.error('[useMoodLog] Failed to log mood:', err);
      if (mountedRef.current) setError(err.message || 'Failed to log mood');
      throw err;
    } finally {
      if (mountedRef.current) setIsLogging(false);
    }
  }, [mutateAsync, mountedRef]);

  /**
   * Get mood metadata by key
   */
  const getMoodMeta = useCallback((moodKey) => {
    return MOOD_TYPES.find(m => m.key === moodKey) || MOOD_TYPES.find(m => m.key === 'neutral');
  }, []);

  return {
    logMood,
    isLogging,
    error,
    moodTypes: MOOD_TYPES,
    getMoodMeta,
  };
}
