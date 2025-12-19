/**
 * useWaterLog Hook
 * Production-ready water logging with backend sync and optimistic updates
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Quick add presets (in liters)
 */
export const WATER_PRESETS = [
  { label: 'Glass', amount: 0.25, icon: '🥛', color: '#3b82f6' },
  { label: 'Bottle', amount: 0.5, icon: '💧', color: '#06b6d4' },
  { label: 'Large', amount: 1.0, icon: '🚰', color: '#0ea5e9' },
];

/**
 * Hook for water logging operations
 */
export function useWaterLog() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Mutation for logging water to backend
   */
  const logWaterMutation = useMutation({
    mutationFn: async ({ amountLiters }) => {
      // Generate clientEventId for idempotency (prevents duplicate entries from double-taps)
      const clientEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      return await apiClient.post('/water/log', {
        amountLiters,
        loggedDate: new Date().toISOString(),
        clientEventId, // Add for backend idempotency
      });
    },
    onMutate: async ({ amountLiters }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });

      const previousData = queryClient.getQueryData(['dashboard']);

      queryClient.setQueryData(['dashboard'], (old) => {
        if (!old) return old;
        return {
          ...old,
          today: {
            ...old.today,
            waterIntakeLiters: (old.today.waterIntakeLiters || 0) + amountLiters,
          },
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['dashboard'], context.previousData);
      }
    },
    onSuccess: () => {
      // Invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  /**
   * Log water intake
   * @param {number} amountLiters - Amount in liters
   * @returns {Promise<object>}
   */
  const logWater = useCallback(async (amountLiters) => {
    if (!amountLiters || amountLiters <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amountLiters > 5) {
      throw new Error('Amount seems unrealistic (max 5L per entry)');
    }

    setIsLogging(true);
    setError(null);

    try {
      const result = await logWaterMutation.mutateAsync({ amountLiters });
      return result;
    } catch (err) {
      console.error('[useWaterLog] Failed to log water:', err);
      setError(err.message || 'Failed to log water');
      throw err;
    } finally {
      setIsLogging(false);
    }
  }, [logWaterMutation]);

  /**
   * Quick add water using presets
   */
  const quickAdd = useCallback(async (preset) => {
    return await logWater(preset.amount);
  }, [logWater]);

  /**
   * Get total water intake for today
   */
  const getTodayTotal = useCallback(() => {
    const data = queryClient.getQueryData(['dashboard']);
    return data?.today?.waterIntakeLiters || 0;
  }, [queryClient]);

  /**
   * Get progress percentage toward daily goal
   */
  const getProgress = useCallback(() => {
    const data = queryClient.getQueryData(['dashboard']);
    const total = data?.today?.waterIntakeLiters || 0;
    const goal = parseFloat(data?.goals?.waterLiters || 2.0);
    return Math.min(100, Math.round((total / goal) * 100));
  }, [queryClient]);

  return {
    logWater,
    quickAdd,
    isLogging,
    error,
    presets: WATER_PRESETS,
    getTodayTotal,
    getProgress,
  };
}
