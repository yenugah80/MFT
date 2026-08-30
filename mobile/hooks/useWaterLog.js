/**
 * useWaterLog Hook
 * Production-ready water logging with backend sync and optimistic updates
 * Includes history fetching for pattern detection
 */

import { useState, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import apiClient from '../services/apiClient';
import {
  cancelStreakProtectionIfLoggedToday,
  cancelHydrationIfGoalReached,
} from '../services/pushNotifications';

/**
 * Quick add presets (in liters)
 */
// Import from single source of truth
import {
  WATER_PRESETS,
  DEFAULT_WATER_GOAL_LITERS,
  BEVERAGE_FACTORS,
} from '../constants/beverageConstants';

// Re-export for backwards compatibility
export { WATER_PRESETS };

/**
 * Hook for water logging operations
 */
export function useWaterLog() {
  const queryClient = useQueryClient();
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Mutation for logging water to backend
   */
  const logWaterMutation = useMutation({
    mutationFn: async ({ amountLiters, beverageType, clientEventId }) => {
      return await apiClient.post('/water/log', {
        amountLiters,
        loggedDate: new Date().toISOString(),
        clientEventId, // Add for backend idempotency
        beverageType,
      });
    },
    onMutate: async ({ amountLiters, beverageType, clientEventId }) => {
      // Paint the selected amount before any network work. Query cancellation
      // still prevents an older response from overwriting the optimistic row,
      // but it must not sit in front of the visible update.
      const previousData = queryClient.getQueryData(['dashboard']);
      const previousWaterToday = queryClient.getQueryData(['waterToday']);
      const hydrationFactor = BEVERAGE_FACTORS[beverageType] ?? 1;
      const hydrationLiters = amountLiters * hydrationFactor;
      const optimisticId = `optimistic-${clientEventId}`;

      const cancellations = [
        queryClient.cancelQueries({ queryKey: ['dashboard'] }),
        queryClient.cancelQueries({ queryKey: ['waterToday'] }),
      ];

      queryClient.setQueryData(['dashboard'], (old) => {
        if (!old) return old;
        return {
          ...old,
          today: {
            ...old.today,
            waterIntakeLiters: (old.today.waterIntakeLiters || 0) + hydrationLiters,
          },
        };
      });

      queryClient.setQueryData(['waterToday'], (old) => {
        const current = old || { logs: [], totalLiters: 0, count: 0 };
        const logs = current.logs || [];
        return {
          ...current,
          logs: [
            ...logs,
            {
              id: optimisticId,
              clientEventId,
              amountLiters,
              hydrationFactor,
              hydrationLiters,
              beverageType,
              loggedDate: new Date().toISOString(),
              optimistic: true,
            },
          ],
          totalLiters: Number(current.totalLiters || 0) + hydrationLiters,
          count: Number(current.count ?? logs.length) + 1,
        };
      });

      await Promise.all(cancellations);
      return { previousData, previousWaterToday, optimisticId };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['dashboard'], context.previousData);
      }
      if (context?.previousWaterToday) {
        queryClient.setQueryData(['waterToday'], context.previousWaterToday);
      } else {
        queryClient.removeQueries({ queryKey: ['waterToday'], exact: true });
      }
    },
    onSuccess: (data, variables, context) => {
      const persistedEntry = data?.entry ?? data?.data?.entry;
      if (persistedEntry?.id && context?.optimisticId) {
        queryClient.setQueryData(['waterToday'], (old) => {
          if (!old?.logs) return old;
          return {
            ...old,
            logs: old.logs.map((log) => (
              log.id === context.optimisticId
                ? { ...log, ...persistedEntry, optimistic: false }
                : log
            )),
          };
        });
      }

      // Revalidate in the background. The visible transaction is already
      // reconciled by clientEventId, so these requests must not hold the tap
      // confirmation open for another round trip.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['waterToday'] });
      // Your Progress reads these separately — without this a new water
      // entry wouldn't show there until a manual refresh.
      queryClient.invalidateQueries({ queryKey: ['analytics-unified'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['decision-brain'] });
      queryClient.invalidateQueries({ queryKey: ['hydration-analytics'] });

      // Smart notifications: Cancel streak protection since user logged water today
      cancelStreakProtectionIfLoggedToday().catch(() => {});

      // Check if hydration goal reached to cancel hydration reminders
      if (data?.todayTotal && data?.goal) {
        const currentMl = Math.round(data.todayTotal * 1000);
        const goalMl = Math.round(data.goal * 1000);
        cancelHydrationIfGoalReached(currentMl, goalMl).catch(() => {});
      }
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

    // Validate beverage type - must match keys in BEVERAGE_TYPES
    const validBeverageTypes = [
      'water', 'sparkling', 'coffee', 'tea', 'herbal', 'juice',
      'milk', 'electrolyte', 'coconut', 'smoothie', 'soda', 'sports',
      'energy', 'alcohol_beer', 'alcohol_wine', 'alcohol_spirits'
    ];
    if (!validBeverageTypes.includes(beverageType)) {
      console.warn('Invalid beverage type, defaulting to water:', beverageType);
      beverageType = 'water';
    }

    setIsLogging(true);
    setError(null);

    try {
      // Backend requires a valid UUID v4 for idempotency. Generate it before
      // mutation so the optimistic cache row and persisted row share one key.
      const clientEventId = Crypto.randomUUID();
      const result = await logWaterMutation.mutateAsync({
        amountLiters: amount,
        beverageType,
        clientEventId,
      });
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
    const goal = parseFloat(data?.goals?.waterLiters || DEFAULT_WATER_GOAL_LITERS);
    return Math.min(100, Math.round((total / goal) * 100));
  }, [queryClient]);

  /**
   * Mutation for removing water entry
   */
  const removeWaterMutation = useMutation({
    mutationFn: async ({ entryId, amountLiters, hydrationLiters }) => {
      console.log('[useWaterLog] Deleting entry:', entryId);
      return await apiClient.delete(`/water/${entryId}`);
    },
    onMutate: async ({ entryId, amountLiters, hydrationLiters }) => {
      // Optimistic update - subtract the amount and remove from logs
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      await queryClient.cancelQueries({ queryKey: ['waterToday'] });

      const previousDashboard = queryClient.getQueryData(['dashboard']);
      const previousWaterToday = queryClient.getQueryData(['waterToday']);
      const hydrationDelta = Number.isFinite(hydrationLiters) ? hydrationLiters : amountLiters;

      // Update dashboard water total
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

      // Optimistic update: Remove entry from waterToday logs for instant UI feedback
      queryClient.setQueryData(['waterToday'], (old) => {
        if (!old || !old.logs) return old;
        const filteredLogs = old.logs.filter(log => log.id !== entryId);
        const newTotal = filteredLogs.reduce((sum, log) => {
          const hydration = parseFloat(log.hydrationLiters || log.amountLiters || 0);
          return sum + hydration;
        }, 0);
        return {
          ...old,
          logs: filteredLogs,
          totalLiters: newTotal,
          count: filteredLogs.length,
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
    onSuccess: async () => {
      // Undo is only complete when all active consumers have reconciled with
      // the server. This keeps the tracker, history, dashboard, and Progress
      // screen from showing different totals after the same deletion.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['waterToday'] }),
      ]);
      queryClient.invalidateQueries({ queryKey: ['analytics-unified'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['decision-brain'] });
      queryClient.invalidateQueries({ queryKey: ['hydration-analytics'] });
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
        // A 404 can mean the row was already removed, but it can also mean an
        // older backend does not expose the delete route. Confirm against the
        // authoritative today feed before reporting Undo as successful.
        const today = await apiClient.get('/water/today');
        const stillExists = (today?.logs || []).some(
          (log) => Number(log.id) === Number(entryId)
        );
        if (!stillExists) {
          queryClient.setQueryData(['waterToday'], today);
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['hydration-analytics'] });
          return null;
        }
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
