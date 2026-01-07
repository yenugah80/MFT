/**
 * useWaterLog Hook
 * Production-ready water logging with backend sync and optimistic updates
 * Includes history fetching for pattern detection
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

/**
 * Quick add presets (in liters)
 */
export const WATER_PRESETS = [
  { label: 'Glass', amount: 0.25, icon: '🥛', color: '#3b82f6' },
  { label: 'Bottle', amount: 0.5, icon: '💧', color: '#06b6d4' },
  { label: 'Large', amount: 1.0, icon: '🚰', color: '#0ea5e9' },
];

const BEVERAGE_FACTORS = {
  water: 1.0,
  coffee: 0.5,
  tea: 0.9,
  juice: 0.8,
  milk: 0.9,
  electrolyte: 1.1,
  smoothie: 0.8,
  alcohol: 0.1,
};

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
    mutationFn: async ({ amountLiters, beverageType }) => {
      // Generate strong clientEventId for idempotency (prevents duplicate entries from double-taps)
      // Format: userId-timestamp-random1-random2 for maximum uniqueness
      const timestamp = Date.now();
      const random1 = Math.random().toString(36).substring(2, 15);
      const random2 = Math.random().toString(36).substring(2, 15);
      const clientEventId = `${userId}-${timestamp}-${random1}-${random2}`;

      return await apiClient.post('/water/log', {
        amountLiters,
        loggedDate: new Date().toISOString(),
        clientEventId, // Add for backend idempotency
        beverageType,
      });
    },
    onMutate: async ({ amountLiters, beverageType }) => {
      // Simplified optimistic update - just add raw amount, backend will calculate hydration factor
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });

      const previousData = queryClient.getQueryData(['dashboard']);

      queryClient.setQueryData(['dashboard'], (old) => {
        if (!old) return old;
        return {
          ...old,
          today: {
            ...old.today,
            // Add raw amount optimistically - backend response will overwrite with correct hydration value
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
      queryClient.invalidateQueries({ queryKey: ['waterToday'] });
    },
  });

  /**
   * Log water intake
   * @param {number} amountLiters - Amount in liters
   * @returns {Promise<object>}
   */
  const logWater = useCallback(async (amountLiters, beverageType = 'water') => {
    // Validate amount is a valid number
    const amount = parseFloat(amountLiters);
    if (isNaN(amount) || !isFinite(amount)) {
      throw new Error('Amount must be a valid number');
    }

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (amount > 5) {
      throw new Error('Amount seems unrealistic (max 5L per entry)');
    }

    // Validate beverage type
    const validBeverageTypes = ['water', 'coffee', 'tea', 'juice', 'milk', 'electrolyte', 'smoothie', 'alcohol'];
    if (!validBeverageTypes.includes(beverageType)) {
      console.warn('Invalid beverage type, defaulting to water:', beverageType);
      beverageType = 'water';
    }

    setIsLogging(true);
    setError(null);

    try {
      const result = await logWaterMutation.mutateAsync({ amountLiters: amount, beverageType });
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
    return await logWater(preset.amount, 'water');
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

  /**
   * Mutation for removing water entry
   */
  const removeWaterMutation = useMutation({
    mutationFn: async ({ entryId, amountLiters, hydrationLiters }) => {
      return await apiClient.delete(`/water/${entryId}`);
    },
    onMutate: async ({ amountLiters, hydrationLiters }) => {
      // Optimistic update - subtract the amount
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      await queryClient.cancelQueries({ queryKey: ['waterToday'] });

      const previousDashboard = queryClient.getQueryData(['dashboard']);
      const previousWaterToday = queryClient.getQueryData(['waterToday']);
      const hydrationDelta = Number.isFinite(hydrationLiters) ? hydrationLiters : amountLiters;

      queryClient.setQueryData(['dashboard'], (old) => {
        if (!old) return old;
        return {
          ...old,
          today: {
            ...old.today,
            waterIntakeLiters: Math.max((old.today.waterIntakeLiters || 0) - hydrationDelta, 0),
          },
        };
      });

      return { previousDashboard, previousWaterToday };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousDashboard) {
        queryClient.setQueryData(['dashboard'], context.previousDashboard);
      }
      if (context?.previousWaterToday) {
        queryClient.setQueryData(['waterToday'], context.previousWaterToday);
      }
    },
    onSuccess: () => {
      // Invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['waterToday'] });
    },
  });

  /**
   * Remove water entry
   * @param {number} entryId - Water log entry ID
   * @param {number} amountLiters - Amount in liters (for optimistic update)
   * @returns {Promise<object>}
   */
  const removeWater = useCallback(async (entryId, amountLiters, hydrationLiters) => {
    if (!entryId) {
      throw new Error('Entry ID is required');
    }

    setIsLogging(true);
    setError(null);

    try {
      const result = await removeWaterMutation.mutateAsync({ entryId, amountLiters, hydrationLiters });
      return result;
    } catch (err) {
      if (err?.response?.status === 404) {
        // Entry already removed or stale ID; resync without surfacing an error.
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['waterToday'] });
        return null;
      }
      console.error('[useWaterLog] Failed to remove water:', err);
      setError(err.message || 'Failed to remove water entry');
      throw err;
    } finally {
      setIsLogging(false);
    }
  }, [removeWaterMutation, queryClient]);

  /**
   * Persist daily hydration celebration (confetti gate)
   */
  const celebrationMutation = useMutation({
    mutationFn: async ({ dateKey }) => {
      return await apiClient.post('/water/celebration', { dateKey });
    },
    onMutate: async ({ dateKey }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previousData = queryClient.getQueryData(['dashboard']);

      queryClient.setQueryData(['dashboard'], (old) => {
        if (!old) return old;
        return {
          ...old,
          today: {
            ...old.today,
            hydrationCelebratedAt: new Date().toISOString(),
          },
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['dashboard'], context.previousData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const markHydrationCelebration = useCallback(async (dateKey) => {
    if (!dateKey) {
      throw new Error('dateKey is required');
    }

    try {
      return await celebrationMutation.mutateAsync({ dateKey });
    } catch (err) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  }, [celebrationMutation]);

  /**
   * Fetch water history for pattern detection
   * @param {Object} options - Query options
   * @param {string} options.startDate - Start date (ISO string)
   * @param {string} options.endDate - End date (ISO string)
   * @param {number} options.limit - Max results (default 200)
   * @returns {Promise<Object>} Water history with logs and daily aggregates
   */
  const fetchHistory = useCallback(async (options = {}) => {
    const { startDate, endDate, limit = 200 } = options;

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', limit.toString());

      const response = await apiClient.get(`/water/history?${params}`);
      return response;
    } catch (err) {
      console.error('[useWaterLog] Failed to fetch history:', err);
      return { logs: [], dailyAggregates: [], totalEntries: 0 };
    }
  }, []);

  return {
    logWater,
    removeWater,
    quickAdd,
    isLogging,
    error,
    presets: WATER_PRESETS,
    getTodayTotal,
    getProgress,
    markHydrationCelebration,
    fetchHistory,
  };
}
