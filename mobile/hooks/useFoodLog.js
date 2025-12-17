/**
 * useFoodLog Hook
 * Production-ready hook for food log persistence and sync
 * Handles: local storage, optimistic updates, background sync, history retrieval
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '../constants/api';
import { validateFoodLog, transformFoodLogToBackend, transformBackendToFoodLog } from '../types/foodLog';

const STORAGE_KEY = '@food_logs';
const SYNC_QUEUE_KEY = '@sync_queue';
const MAX_LOCAL_LOGS = 500; // Keep last 500 logs locally

/**
 * Hook for food log management
 */
export function useFoodLog() {
  const { getToken, userId } = useAuth();

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  const syncQueueRef = useRef([]);
  const isMountedRef = useRef(true);

  /**
   * Load logs from local storage
   */
  const loadLocalLogs = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLogs(parsed);
        return parsed;
      }
      return [];
    } catch (err) {
      console.error('[useFoodLog] Failed to load logs:', err);
      return [];
    }
  }, []);

  /**
   * Save logs to local storage
   */
  const saveLocalLogs = useCallback(async (logsToSave) => {
    try {
      // Keep only the most recent logs to prevent storage bloat
      const trimmed = logsToSave.slice(0, MAX_LOCAL_LOGS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return true;
    } catch (err) {
      console.error('[useFoodLog] Failed to save logs:', err);
      return false;
    }
  }, []);

  /**
   * Add log to sync queue
   */
  const addToSyncQueue = useCallback(async (log) => {
    try {
      const queue = syncQueueRef.current;
      queue.push(log);
      syncQueueRef.current = queue;

      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('[useFoodLog] Failed to add to sync queue:', err);
    }
  }, []);

  /**
   * Process sync queue
   */
  const processSyncQueue = useCallback(async () => {
    if (syncQueueRef.current.length === 0 || isSyncing) {
      return;
    }

    setIsSyncing(true);

    try {
      const token = await getToken();
      if (!token) {
        console.warn('[useFoodLog] No auth token, skipping sync');
        return;
      }

      const queue = [...syncQueueRef.current];
      const synced = [];

      for (const log of queue) {
        try {
          // Skip if already synced
          if (log.status === 'synced') {
            synced.push(log);
            continue;
          }

          // Sync to backend
          const payload = transformFoodLogToBackend(log);

          const response = await fetch(`${API_URL}/nutrition/log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const backendLog = await response.json();

            // Update log with server data
            const updatedLog = {
              ...log,
              id: backendLog.id,
              status: 'synced',
              syncError: undefined,
            };

            synced.push(updatedLog);

            // Update local state
            setLogs(prev =>
              prev.map(l => l.timestamp === log.timestamp ? updatedLog : l)
            );

            console.log('[useFoodLog] ✅ Synced:', log.foodName);
          } else {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `Sync failed: ${response.status}`;

            // Mark as failed
            const failedLog = {
              ...log,
              status: 'failed',
              syncError: errorMsg,
            };

            synced.push(failedLog);

            setLogs(prev =>
              prev.map(l => l.timestamp === log.timestamp ? failedLog : l)
            );

            console.error('[useFoodLog] ❌ Sync failed:', log.foodName, errorMsg);
          }
        } catch (err) {
          console.error('[useFoodLog] Sync error:', err);

          // Keep in queue for retry
          const failedLog = {
            ...log,
            status: 'failed',
            syncError: err.message,
          };

          synced.push(failedLog);
        }
      }

      // Update sync queue (remove successfully synced items)
      const stillPending = synced.filter(l => l.status !== 'synced');
      syncQueueRef.current = stillPending;
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(stillPending));

      // Save updated logs
      await saveLocalLogs(logs);
    } catch (err) {
      console.error('[useFoodLog] Sync queue processing error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [getToken, isSyncing, logs, saveLocalLogs]);

  /**
   * Add a new food log (optimistic update)
   */
  const addLog = useCallback(async (foodLog) => {
    try {
      setError(null);

      // Validate
      const validationError = validateFoodLog(foodLog);
      if (validationError) {
        throw new Error(validationError);
      }

      // Optimistic update
      const newLog = {
        ...foodLog,
        timestamp: foodLog.timestamp || Date.now(),
        userId,
        status: 'pending',
      };

      setLogs(prev => [newLog, ...prev]);

      // Save locally
      const updatedLogs = [newLog, ...logs];
      await saveLocalLogs(updatedLogs);

      // Add to sync queue
      await addToSyncQueue(newLog);

      // Trigger background sync
      setTimeout(() => processSyncQueue(), 100);

      console.log('[useFoodLog] ✅ Log added:', newLog.foodName);

      return newLog;
    } catch (err) {
      console.error('[useFoodLog] Failed to add log:', err);
      setError(err.message);
      throw err;
    }
  }, [userId, logs, saveLocalLogs, addToSyncQueue, processSyncQueue]);

  /**
   * Delete a food log
   */
  const deleteLog = useCallback(async (logId) => {
    try {
      setLogs(prev => prev.filter(l => l.id !== logId && l.timestamp !== logId));

      // Update local storage
      const updatedLogs = logs.filter(l => l.id !== logId && l.timestamp !== logId);
      await saveLocalLogs(updatedLogs);

      // If synced, delete from backend
      const token = await getToken();
      if (token && typeof logId === 'number') {
        await fetch(`${API_URL}/nutrition/log/${logId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).catch(err => {
          console.warn('[useFoodLog] Backend delete failed:', err);
        });
      }

      console.log('[useFoodLog] ✅ Log deleted');
    } catch (err) {
      console.error('[useFoodLog] Delete failed:', err);
      setError(err.message);
    }
  }, [logs, saveLocalLogs, getToken]);

  /**
   * Fetch history from backend (with date range)
   */
  const fetchHistory = useCallback(async (options = {}) => {
    const { date, startDate, endDate, limit = 50 } = options;

    try {
      setIsLoading(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Build query params
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', limit.toString());

      const response = await fetch(`${API_URL}/nutrition/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`);
      }

      const backendLogs = await response.json();

      // Transform backend logs
      const transformedLogs = backendLogs.map(transformBackendToFoodLog);

      // Merge with local logs (avoid duplicates)
      const localLogs = await loadLocalLogs();
      const merged = [...transformedLogs];

      localLogs.forEach(local => {
        if (!merged.some(m => m.id === local.id || m.timestamp === local.timestamp)) {
          merged.push(local);
        }
      });

      // Sort by timestamp desc
      merged.sort((a, b) => b.timestamp - a.timestamp);

      setLogs(merged);

      return merged;
    } catch (err) {
      console.error('[useFoodLog] Failed to fetch history:', err);
      setError(err.message);

      // Fallback to local logs
      return await loadLocalLogs();
    } finally {
      setIsLoading(false);
    }
  }, [getToken, loadLocalLogs]);

  /**
   * Get logs for today
   */
  const getTodayLogs = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return logs.filter(log => log.timestamp >= todayTimestamp);
  }, [logs]);

  /**
   * Get aggregated totals for a date range
   */
  const getAggregate = useCallback((startDate, endDate) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    const filtered = logs.filter(log =>
      log.timestamp >= start && log.timestamp <= end
    );

    return {
      totalLogs: filtered.length,
      totalCalories: filtered.reduce((sum, log) => sum + (log.calories || 0), 0),
      totalProtein: filtered.reduce((sum, log) => sum + (log.protein || 0), 0),
      totalCarbs: filtered.reduce((sum, log) => sum + (log.carbs || 0), 0),
      totalFat: filtered.reduce((sum, log) => sum + (log.fat || 0), 0),
      logs: filtered,
    };
  }, [logs]);

  /**
   * Retry failed syncs
   */
  const retryFailedSyncs = useCallback(() => {
    processSyncQueue();
  }, [processSyncQueue]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load logs and sync queue on mount
  useEffect(() => {
    (async () => {
      const localLogs = await loadLocalLogs();
      setLogs(localLogs);

      // Load sync queue
      try {
        const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
        if (stored) {
          syncQueueRef.current = JSON.parse(stored);
        }
      } catch (err) {
        console.error('[useFoodLog] Failed to load sync queue:', err);
      }

      // Trigger initial sync
      setTimeout(() => processSyncQueue(), 1000);
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadLocalLogs, processSyncQueue]);

  return {
    // State
    logs,
    isLoading,
    isSyncing,
    error,
    pendingSyncCount: syncQueueRef.current.length,

    // Actions
    addLog,
    deleteLog,
    fetchHistory,
    getTodayLogs,
    getAggregate,
    retryFailedSyncs,
    clearError,
  };
}
