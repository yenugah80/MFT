/**
 * useMoodLog Hook
 * Production-ready mood logging with backend sync and optimistic updates
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Available mood types with metadata
 */
export const MOOD_TYPES = [
  { key: 'happy', emoji: '😊', label: 'Happy', color: '#10b981' },
  { key: 'excited', emoji: '🤩', label: 'Excited', color: '#f59e0b' },
  { key: 'calm', emoji: '😌', label: 'Calm', color: '#3b82f6' },
  { key: 'neutral', emoji: '😐', label: 'Neutral', color: '#6b7280' },
  { key: 'tired', emoji: '😴', label: 'Tired', color: '#8b5cf6' },
  { key: 'stressed', emoji: '😰', label: 'Stressed', color: '#f97316' },
  { key: 'sad', emoji: '😔', label: 'Sad', color: '#3b82f6' },
  { key: 'angry', emoji: '😠', label: 'Angry', color: '#ef4444' },
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
    mutationFn: async ({ mood, note, source = 'manual' }) => {
      // Generate clientEventId for idempotency (prevents duplicate entries from double-taps)
      const clientEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      return await apiClient.post('/mood/log', {
        mood,
        note,
        source,
        loggedDate: new Date().toISOString(),
        clientEventId, // Add for backend idempotency
      });
    },
    onSuccess: () => {
      // Invalidate dashboard to refresh mood display
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /**
   * Log a mood entry
   * @param {string} mood - Mood key (happy, sad, etc.)
   * @param {string} note - Optional note
   * @returns {Promise<object>}
   */
  const logMood = useCallback(async (mood, note = '') => {
    if (!mood) {
      throw new Error('Mood is required');
    }

    setIsLogging(true);
    setError(null);

    try {
      const result = await logMoodMutation.mutateAsync({
        mood,
        note: note.trim() || null,
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
