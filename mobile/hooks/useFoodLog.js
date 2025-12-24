/**
 * useFoodLog Hook
 * Production-ready hook for food log persistence and sync
 *
 * Features:
 * - SQLite persistence with AsyncStorage migration
 * - Optimistic updates with background sync
 * - Robust error handling and retry logic
 * - Transaction-safe operations
 * - Network-aware syncing
 *
 * @module hooks/useFoodLog
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL } from '../constants/api';
import { validateFoodLog, transformFoodLogToBackend, transformBackendToFoodLog } from '../types/foodLog';
import { db, runInTransaction } from '../services/database';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum number of logs to keep in local storage */
const MAX_LOCAL_LOGS = 500;

/** AsyncStorage key for migration tracking */
const MIGRATION_KEY = '@sqlite_migration_completed';

/** Maximum retry attempts for network requests */
const MAX_RETRY_ATTEMPTS = 3;

/** Initial retry delay in milliseconds */
const INITIAL_RETRY_DELAY_MS = 1000;

/** Backoff multiplier for exponential retry */
const RETRY_BACKOFF_MULTIPLIER = 2;

/** Sync debounce delay (prevent rapid-fire syncs) */
const SYNC_DEBOUNCE_MS = 100;

/** Progress logging interval during migration */
const MIGRATION_PROGRESS_INTERVAL = 50;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Exponential backoff delay calculator
 * @param {number} attempt - Current attempt number (0-indexed)
 * @returns {number} Delay in milliseconds
 */
const getRetryDelay = (attempt) => {
  return INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt);
};

/**
 * Sanitize numeric value (handle null/undefined/NaN)
 * @param {any} val - Value to sanitize
 * @returns {number|null} Sanitized number or null
 */
const sanitizeNumber = (val) => {
  return (typeof val === 'number' && !isNaN(val)) ? val : null;
};

/**
 * Generate unique client event ID
 * @param {number} timestamp - Timestamp for ID
 * @returns {string} Unique event ID
 */
const generateClientEventId = (timestamp = Date.now()) => {
  return `${timestamp}-${Math.random().toString(36).slice(2, 11)}`;
};

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Food Log Management Hook
 *
 * @returns {{
 *   logs: Array,
 *   isLoading: boolean,
 *   isSyncing: boolean,
 *   error: string|null,
 *   pendingSyncCount: number,
 *   addLog: (foodLog: Object) => Promise<Object>,
 *   deleteLog: (logId: number|string) => Promise<void>,
 *   fetchHistory: (options?: Object) => Promise<Array>,
 *   getTodayLogs: () => Array,
 *   getAggregate: (startDate: Date, endDate: Date) => Object,
 *   retryFailedSyncs: () => void,
 *   clearError: () => void
 * }}
 */
export function useFoodLog() {
  // ============================================================================
  // STATE & REFS
  // ============================================================================

  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const syncInFlightRef = useRef(false); // Prevents parallel sync execution
  const processSyncQueueRef = useRef(null); // Stable callback reference
  const syncTimeoutRef = useRef(null); // For debouncing
  const authFailedRef = useRef(false); // Prevents sync retries on auth failures

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Load logs from SQLite
   * @returns {Promise<Array>} Array of food logs
   */
  const loadLocalLogs = useCallback(async () => {
    try {
      const results = await db.getAllAsync(
        'SELECT data_json FROM food_logs ORDER BY timestamp DESC LIMIT ?',
        [MAX_LOCAL_LOGS]
      );
      const parsed = results.map(row => JSON.parse(row.data_json));
      setLogs(parsed);
      return parsed;
    } catch (err) {
      console.error('[useFoodLog] Failed to load logs from SQLite:', err);
      return [];
    }
  }, []);

  /**
   * Update pending sync count from database
   * @returns {Promise<void>}
   */
  const updateSyncCount = useCallback(async () => {
    try {
      const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM sync_queue');
      setPendingSyncCount(result.count || 0);
    } catch (err) {
      console.error('[useFoodLog] Failed to update sync count:', err);
    }
  }, []);

  /**
   * Add log to sync queue
   * @param {Object} log - Food log to queue
   * @returns {Promise<void>}
   */
  const addToSyncQueue = useCallback(async (log) => {
    try {
      await db.runAsync(
        'INSERT OR IGNORE INTO sync_queue (clientEventId, log_data, timestamp) VALUES (?, ?, ?)',
        [log.clientEventId, JSON.stringify(log), log.timestamp]
      );
      await updateSyncCount();
    } catch (err) {
      console.error('[useFoodLog] Failed to add to sync queue:', err);
      throw new Error('Failed to queue log for sync');
    }
  }, [updateSyncCount]);

  /**
   * Remove log from sync queue
   * @param {string} clientEventId - Client event ID
   * @returns {Promise<void>}
   */
  const removeFromSyncQueue = useCallback(async (clientEventId) => {
    try {
      await db.runAsync('DELETE FROM sync_queue WHERE clientEventId = ?', [clientEventId]);
      await updateSyncCount();
    } catch (err) {
      console.error('[useFoodLog] Failed to remove from sync queue:', err);
    }
  }, [updateSyncCount]);

  // ============================================================================
  // MIGRATION (AsyncStorage → SQLite)
  // ============================================================================

  /**
   * Migrate logs from AsyncStorage to SQLite
   * Production-grade migration with graceful error handling
   * Runs once per app installation
   *
   * @returns {Promise<void>}
   */
  const migrateFromAsyncStorage = useCallback(async () => {
    try {
      const isMigrated = await AsyncStorage.getItem(MIGRATION_KEY);
      if (isMigrated) return;

      console.log('[useFoodLog] 🔄 Starting migration from AsyncStorage to SQLite...');

      let totalLogs = 0;
      let successCount = 0;
      let errorCount = 0;

      const storedLogs = await AsyncStorage.getItem('@food_logs');

      if (storedLogs) {
        let parsedLogs = null;

        // Safe JSON parsing with corruption recovery
        try {
          parsedLogs = JSON.parse(storedLogs);
        } catch (parseError) {
          console.error('[useFoodLog] ⚠️ Corrupted AsyncStorage data, attempting recovery...');

          // Attempt to salvage partial data by removing trailing corruption
          const sanitized = storedLogs.replace(/[^\]]*$/, ']');
          try {
            parsedLogs = JSON.parse(sanitized);
            console.log('[useFoodLog] ✅ Partial data recovered');
          } catch {
            console.error('[useFoodLog] ❌ Data unrecoverable, skipping migration');
            await AsyncStorage.setItem(MIGRATION_KEY, 'true');
            return;
          }
        }

        // Validate schema
        if (!Array.isArray(parsedLogs)) {
          console.warn('[useFoodLog] ⚠️ Invalid data format (not an array), skipping');
          await AsyncStorage.setItem(MIGRATION_KEY, 'true');
          return;
        }

        totalLogs = parsedLogs.length;
        console.log(`[useFoodLog] Found ${totalLogs} logs to migrate`);

        // Atomic migration (all-or-nothing)
        await runInTransaction(async () => {
          for (let i = 0; i < parsedLogs.length; i++) {
            const log = parsedLogs[i];

            try {
              // Validate essential fields
              if (!log || typeof log !== 'object') {
                console.warn(`[useFoodLog] Skipping invalid log at index ${i}`);
                errorCount++;
                continue;
              }

              // Ensure required fields exist
              const clientEventId = log.clientEventId || generateClientEventId(log.timestamp);
              const logUserId = log.userId || userId;
              const timestamp = log.timestamp || Date.now();
              const status = log.status || 'pending';

              if (!logUserId) {
                console.warn(`[useFoodLog] Skipping log without userId at index ${i}`);
                errorCount++;
                continue;
              }

              // Sanitize data
              const sanitizedLog = {
                ...log,
                userId: logUserId,
                foodName: log.foodName || 'Unknown Food',
                calories: sanitizeNumber(log.calories),
                protein: sanitizeNumber(log.protein),
                carbs: sanitizeNumber(log.carbs),
                fat: sanitizeNumber(log.fat),
                fiber: sanitizeNumber(log.fiber),
                sugar: sanitizeNumber(log.sugar),
                netCarbs: sanitizeNumber(log.netCarbs),
                timestamp,
                status,
                clientEventId,
              };

              // Insert into SQLite
              await db.runAsync(
                'INSERT OR IGNORE INTO food_logs (userId, foodName, calories, protein, carbs, fat, fiber, sugar, netCarbs, timestamp, status, clientEventId, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  sanitizedLog.userId,
                  sanitizedLog.foodName,
                  sanitizedLog.calories,
                  sanitizedLog.protein,
                  sanitizedLog.carbs,
                  sanitizedLog.fat,
                  sanitizedLog.fiber,
                  sanitizedLog.sugar,
                  sanitizedLog.netCarbs,
                  sanitizedLog.timestamp,
                  sanitizedLog.status,
                  sanitizedLog.clientEventId,
                  JSON.stringify(sanitizedLog)
                ]
              );

              // Re-queue pending/failed logs for sync
              if (status === 'pending' || status === 'failed') {
                await db.runAsync(
                  'INSERT OR IGNORE INTO sync_queue (clientEventId, log_data, timestamp) VALUES (?, ?, ?)',
                  [sanitizedLog.clientEventId, JSON.stringify(sanitizedLog), timestamp]
                );
              }

              successCount++;

              // Progress logging
              if ((i + 1) % MIGRATION_PROGRESS_INTERVAL === 0) {
                console.log(`[useFoodLog] Progress: ${i + 1}/${totalLogs} migrated`);
              }
            } catch (logError) {
              console.error(`[useFoodLog] Failed to migrate log at index ${i}:`, logError.message);
              errorCount++;
              // Continue with next log (don't abort entire migration)
            }
          }
        });
      }

      // Mark migration complete
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');

      console.log(
        `[useFoodLog] ✅ Migration complete: ${successCount}/${totalLogs} successful` +
        (errorCount > 0 ? `, ${errorCount} errors` : '')
      );

      // Refresh state
      await loadLocalLogs();
      await updateSyncCount();
    } catch (error) {
      console.error('[useFoodLog] ❌ Migration failed catastrophically:', error);

      // Mark as migrated to prevent infinite retry loops
      try {
        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      } catch {
        console.error('[useFoodLog] Cannot write to AsyncStorage - device storage may be full');
      }
    }
  }, [userId, loadLocalLogs, updateSyncCount]);

  // ============================================================================
  // SYNC QUEUE PROCESSING
  // ============================================================================

  /**
   * Process sync queue with background sync
   * Uses ref-based lock to prevent parallel execution
   *
   * @returns {Promise<void>}
   */
  const processSyncQueue = useCallback(async () => {
    // Don't retry if auth previously failed
    if (authFailedRef.current) {
      return;
    }

    const queue = await db.getAllAsync('SELECT * FROM sync_queue ORDER BY timestamp ASC');

    if (queue.length === 0 || syncInFlightRef.current) {
      return;
    }

    // Set lock immediately (synchronous)
    syncInFlightRef.current = true;
    setIsSyncing(true);

    try {
      // Try to get a fresh token (forces refresh if expired)
      const token = await getToken();
      if (!token) {
        console.warn('[useFoodLog] No auth token, skipping sync');
        authFailedRef.current = true; // Prevent future sync attempts
        setError('Authentication required. Please sign in.');
        return;
      }

      // Reset auth failed flag on successful token retrieval
      authFailedRef.current = false;

      for (const row of queue) {
        const log = JSON.parse(row.log_data);

        try {
          // Skip if already synced
          if (log.status === 'synced') {
            await removeFromSyncQueue(log.clientEventId);
            continue;
          }

          // Ensure legacy logs have clientEventId
          if (!log.clientEventId) {
            log.clientEventId = generateClientEventId(log.timestamp);
            console.log('[useFoodLog] Generated clientEventId for legacy log:', log.foodName);
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

            // Update local DB
            await db.runAsync(
              'UPDATE food_logs SET status = "synced", id = ?, data_json = ? WHERE clientEventId = ?',
              [backendLog.id, JSON.stringify(updatedLog), log.clientEventId]
            );

            await removeFromSyncQueue(log.clientEventId);

            // Invalidate dashboard cache for auto-refresh
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });

            console.log('[useFoodLog] ✅ Synced:', log.foodName);
          } else {
            // Handle authentication errors - stop syncing and notify user
            if (response.status === 401) {
              console.error('[useFoodLog] ⚠️ Authentication failed - stopping sync. Please sign out and sign back in.');
              setError('Authentication token expired. Please sign out and sign back in.');
              return; // Stop processing queue
            }

            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `Sync failed: ${response.status}`;

            // Mark as failed
            const failedLog = {
              ...log,
              status: 'failed',
              syncError: errorMsg,
            };

            await db.runAsync(
              'UPDATE food_logs SET status = "failed", data_json = ? WHERE clientEventId = ?',
              [JSON.stringify(failedLog), log.clientEventId]
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

          await db.runAsync(
            'UPDATE food_logs SET status = "failed", data_json = ? WHERE clientEventId = ?',
            [JSON.stringify(failedLog), log.clientEventId]
          );
        }
      }

      await loadLocalLogs();
    } catch (err) {
      console.error('[useFoodLog] Sync queue processing error:', err);
    } finally {
      // Release lock immediately (synchronous)
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [getToken, loadLocalLogs, removeFromSyncQueue, queryClient]);

  // Update ref on every render for stable callback reference
  processSyncQueueRef.current = processSyncQueue;

  /**
   * Debounced sync trigger
   * Prevents rapid-fire sync requests
   */
  const triggerSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      processSyncQueueRef.current?.();
    }, SYNC_DEBOUNCE_MS);
  }, []);

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Add a new food log with optimistic update
   *
   * @param {Object} foodLog - Food log data
   * @returns {Promise<Object>} Created log
   * @throws {Error} If validation fails or database error
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
        clientEventId: foodLog.clientEventId || generateClientEventId(),
      };

      // Insert into SQLite
      await db.runAsync(
        'INSERT OR REPLACE INTO food_logs (userId, foodName, calories, protein, carbs, fat, timestamp, status, clientEventId, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, newLog.foodName, newLog.calories, newLog.protein, newLog.carbs, newLog.fat, newLog.timestamp, newLog.status, newLog.clientEventId, JSON.stringify(newLog)]
      );

      // Update local state
      await loadLocalLogs();

      // Add to sync queue
      await addToSyncQueue(newLog);

      // Trigger background sync (debounced)
      triggerSync();

      console.log('[useFoodLog] ✅ Log added:', newLog.foodName);

      return newLog;
    } catch (err) {
      const errorMsg = `Failed to add log: ${err.message}`;
      console.error('[useFoodLog]', errorMsg);
      setError(errorMsg);
      throw err;
    }
  }, [userId, loadLocalLogs, addToSyncQueue, triggerSync]);

  /**
   * Delete a food log
   *
   * @param {number|string} logId - Log ID or timestamp
   * @returns {Promise<void>}
   */
  const deleteLog = useCallback(async (logId) => {
    try {
      // Delete from local DB
      await db.runAsync('DELETE FROM food_logs WHERE id = ? OR timestamp = ?', [logId, logId]);

      // Also remove from sync queue if pending
      await db.runAsync('DELETE FROM sync_queue WHERE clientEventId IN (SELECT clientEventId FROM food_logs WHERE id = ? OR timestamp = ?)', [logId, logId]);

      await loadLocalLogs();
      await updateSyncCount();

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
      const errorMsg = `Failed to delete log: ${err.message}`;
      console.error('[useFoodLog]', errorMsg);
      setError(errorMsg);
    }
  }, [loadLocalLogs, updateSyncCount, getToken]);

  /**
   * Fetch history from backend with retry logic
   *
   * @param {Object} options - Query options
   * @param {string} options.date - Specific date
   * @param {string} options.startDate - Start date range
   * @param {string} options.endDate - End date range
   * @param {number} options.limit - Max results
   * @returns {Promise<Array>} Food logs
   */
  const fetchHistory = useCallback(async (options = {}) => {
    const { date, startDate, endDate, limit = 50 } = options;

    try {
      setIsLoading(true);
      setError(null);

      // Try to get a fresh token (forces refresh if expired)
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required. Please sign in.');
      }

      // Build query params
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', limit.toString());

      let lastError;

      // Retry with exponential backoff
      for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
        try {
          const response = await fetch(`${API_URL}/nutrition/history?${params}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            // Handle authentication errors specifically
            if (response.status === 401) {
              throw new Error('Authentication token expired. Please sign out and sign back in.');
            }

            let errorMessage = `Failed to fetch history: ${response.status}`;
            if (response.status === 503) {
              errorMessage = `Our servers are temporarily unavailable. Please try again later. (Status: ${response.status})`;
            } else if (response.statusText) {
              errorMessage += ` - ${response.statusText}`;
            }
            throw new Error(errorMessage);
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
          lastError = err;

          // If not retryable or last attempt, throw
          if (attempt === MAX_RETRY_ATTEMPTS - 1 || err.message.includes('Authentication')) {
            throw err;
          }

          // Wait before retry
          const delay = getRetryDelay(attempt);
          console.log(`[useFoodLog] Retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${delay}ms`);
          await sleep(delay);
        }
      }

      throw lastError;
    } catch (err) {
      const errorMsg = `Failed to fetch history: ${err.message}`;
      console.error('[useFoodLog]', errorMsg);
      setError(errorMsg);

      // Fallback to local logs
      return await loadLocalLogs();
    } finally {
      setIsLoading(false);
    }
  }, [getToken, loadLocalLogs]);

  // ============================================================================
  // COMPUTED DATA
  // ============================================================================

  /**
   * Get logs for today
   * Memoized to prevent unnecessary recalculations
   */
  const getTodayLogs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return logs.filter(log => log.timestamp >= todayTimestamp);
  }, [logs]);

  /**
   * Get aggregated totals for a date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Aggregated stats
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

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Retry failed syncs
   */
  const retryFailedSyncs = useCallback(() => {
    processSyncQueue();
  }, [processSyncQueue]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  // Load logs and sync queue on mount
  useEffect(() => {
    (async () => {
      // Run migration first
      await migrateFromAsyncStorage();

      // Load local logs
      await loadLocalLogs();

      // Load sync count
      await updateSyncCount();

      // Trigger initial sync (debounced)
      setTimeout(() => processSyncQueueRef.current?.(), 1000);
    })();

    return () => {
      isMountedRef.current = false;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [loadLocalLogs, updateSyncCount, migrateFromAsyncStorage]);

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  return {
    // State
    logs,
    isLoading,
    isSyncing,
    error,
    pendingSyncCount,

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
