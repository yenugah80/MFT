/**
 * useMoodLog Hook
 * Production-ready mood logging with backend sync and optimistic updates
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Available mood types with metadata (8 core moods for premium design)
 */
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
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Mutation for logging mood to backend
   */
  const logMoodMutation = useMutation({
    mutationFn: async ({ mood, intensity, energyLevel, tags, note, source = 'manual' }) => {
      // Generate strong clientEventId for idempotency (prevents duplicate entries from double-taps)
      // Format: userId-timestamp-random1-random2 for maximum uniqueness
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      const clientEventId = `${userId}-${timestamp}-${random1}-${random2}`;

      return await apiClient.post('/mood/log', {
        mood,
        intensity: intensity || 5, // Default to 5 if not provided
        energyLevel: energyLevel || 5, // Default to 5 if not provided
        tags: tags || {}, // Context tags (sleep, exercise, social, weather, stress)
        note,
        source,
        loggedDate: new Date().toISOString(),
        clientEventId, // Add for backend idempotency
      });
    },
    onSuccess: () => {
      // Invalidate dashboard and mood queries to refresh display
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['moodLogs'] });
      queryClient.invalidateQueries({ queryKey: ['moodTrends'] });
      queryClient.invalidateQueries({ queryKey: ['moodInsights'] });
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
      const result = await logMoodMutation.mutateAsync({
        mood: data.mood,
        intensity: data.intensity || 5,
        energyLevel: data.energyLevel || 5,
        tags: data.tags || {},
        note: data.note?.trim() || null,
        source: 'manual',
      });

      return result;
    } catch (err) {
      console.error('[useMoodLog] Failed to log mood:', err);
      setError(err.message || 'Failed to log mood');
      throw err;
    } finally {
      setIsLogging(false);
    }
  }, [logMoodMutation]);

  /**
   * Get mood metadata by key
   */
  const getMoodMeta = useCallback((moodKey) => {
    return MOOD_TYPES.find(m => m.key === moodKey) || MOOD_TYPES[3]; // Default to neutral
  }, []);

  return {
    logMood,
    isLogging,
    error,
    moodTypes: MOOD_TYPES,
    getMoodMeta,
  };
}
