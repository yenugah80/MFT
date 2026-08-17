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
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL, getTimezoneOffsetHeaders } from '../constants/api';
import { validateFoodLog, transformFoodLogToBackend, transformBackendToFoodLog } from '../types/foodLog';
import { db, runInTransaction } from '../services/database';
import { generateClientEventId } from '../utils/idGenerator';
import { cancelStreakProtectionIfLoggedToday } from '../services/pushNotifications';
import {
  SYNC_BACKOFF_MAX_MS,
  getSyncBackoffMs,
  isRetryableStatus,
  isUsableConnection,
} from '../utils/syncRetryPolicy';

/**
 * expo-network is a native module, so a JS bundle running on a binary built
 * before it was added would throw at import and take the whole app down.
 * Requiring it defensively degrades to "no reconnect detection" instead:
 * AppState resume and the capped backoff timer still drain the queue, just
 * less promptly.
 */
let Network = null;
try {
  Network = require('expo-network');
} catch {
  console.warn('[useFoodLog] expo-network unavailable - reconnect detection disabled');
}

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
 * Sync lock shared by every useFoodLog() instance.
 *
 * Several screens (log, history, dashboard) mount this hook at the same time
 * and all drain the same SQLite queue. A per-instance ref would let them run
 * the queue concurrently: the same row uploaded several times over, and each
 * concurrent failure compounding the row's backoff so a recovered network
 * takes far longer than it should to drain.
 */
const syncLock = { inFlight: false };

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
 *   blockedSyncCount: number,
 *   hasSyncFailure: boolean,
 *   addLog: (foodLog: Object) => Promise<Object>,
 *   deleteLog: (logId: number|string) => Promise<void>,
 *   fetchHistory: (options?: Object) => Promise<Array>,
 *   getTodayLogs: () => Array,
 *   getAggregate: (startDate: Date, endDate: Date) => Object,
 *   retryFailedSyncs: () => Promise<void>,
 *   discardBlockedSync: (clientEventId: string) => Promise<void>,
 *   getBlockedSyncs: () => Promise<Array>,
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
  const [blockedSyncCount, setBlockedSyncCount] = useState(0);
  const [hasSyncFailure, setHasSyncFailure] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const processSyncQueueRef = useRef(null); // Stable callback reference
  const syncTimeoutRef = useRef(null); // For debouncing
  const backoffTimerRef = useRef(null); // Wakes the queue when an item comes due
  // Pauses sync until the app is next foregrounded. Set only when auth is
  // genuinely unusable; cleared on resume so a transient token failure can't
  // silently kill sync for the rest of the session.
  const authPausedRef = useRef(false);

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

      // Parse per row: a single corrupt data_json used to throw out of the map
      // and drop the user's entire local log list, not just the bad row.
      const parsed = [];
      for (const row of results) {
        try {
          parsed.push(JSON.parse(row.data_json));
        } catch {
          console.warn('[useFoodLog] Skipping unparseable food_logs row');
        }
      }

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
      const result = await db.getFirstAsync(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN state = 'blocked' THEN 1 ELSE 0 END) AS blocked,
           SUM(CASE WHEN state != 'blocked' AND attempts > 0 THEN 1 ELSE 0 END) AS retrying
         FROM sync_queue`
      );

      const total = result?.total || 0;
      const blocked = result?.blocked || 0;
      const retrying = result?.retrying || 0;

      setPendingSyncCount(total - blocked);
      setBlockedSyncCount(blocked);
      // Only true once something has actually failed at least once. A log that
      // is merely queued and about to sync normally is not a failure, and the
      // UI should stay quiet about it.
      setHasSyncFailure(blocked > 0 || retrying > 0);
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
      // Upsert rather than INSERT OR IGNORE: if this clientEventId is already
      // sitting in the queue (in particular already 'blocked'), a fresh enqueue
      // must revive it with the new payload. OR IGNORE would drop it silently
      // and the meal would never sync.
      await db.runAsync(
        `INSERT INTO sync_queue (clientEventId, log_data, timestamp)
         VALUES (?, ?, ?)
         ON CONFLICT(clientEventId) DO UPDATE SET
           log_data = excluded.log_data,
           timestamp = excluded.timestamp,
           attempts = 0,
           next_attempt_at = 0,
           last_error = NULL,
           state = 'pending'`,
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
        } catch (_parseError) {
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
              const logUserId = log.userId || userId;
              const clientEventId = log.clientEventId || generateClientEventId(logUserId);
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
   * Park a queue item that can never succeed as-is, so it stops consuming
   * retries and can be surfaced to the user as something to act on.
   *
   * Callers pass the queue ROW's clientEventId, not the parsed log's — the
   * two can diverge for legacy logs that get an ID generated at sync time,
   * and an update keyed on the wrong one silently matches nothing.
   *
   * @param {string} clientEventId - Queue row client event ID
   * @param {string} reason - Human-readable failure reason
   * @returns {Promise<void>}
   */
  const blockQueueItem = useCallback(async (clientEventId, reason) => {
    await db.runAsync(
      `UPDATE sync_queue
         SET state = 'blocked', attempts = attempts + 1, last_error = ?
       WHERE clientEventId = ?`,
      [reason, clientEventId]
    );
    await db.runAsync(
      'UPDATE food_logs SET status = "failed" WHERE clientEventId = ?',
      [clientEventId]
    );
  }, []);

  /**
   * Record a transient failure and schedule the next attempt with exponential
   * backoff.
   *
   * Deliberately has no attempt ceiling. A transient failure means the request
   * never got a verdict — offline, timed out, backend restarting — and none of
   * those have a bounded duration. Giving up after N tries would park a
   * perfectly good meal because the user was on a long flight, so items only
   * ever get parked by blockQueueItem() on a real rejection. `attempts` is kept
   * purely to drive the backoff curve, which is capped, so an item retrying for
   * days still costs at most one request per SYNC_BACKOFF_MAX_MS.
   *
   * @param {string} clientEventId - Queue row client event ID
   * @param {number} attempts - Attempts made before this one
   * @param {string} reason - Human-readable failure reason
   * @returns {Promise<void>}
   */
  const bumpRetry = useCallback(async (clientEventId, attempts, reason) => {
    const nextAttempts = (attempts || 0) + 1;

    await db.runAsync(
      `UPDATE sync_queue
         SET attempts = ?, next_attempt_at = ?, last_error = ?
       WHERE clientEventId = ?`,
      [nextAttempts, Date.now() + getSyncBackoffMs(nextAttempts), reason, clientEventId]
    );
  }, []);

  /**
   * Schedule a wake-up for the next queued item that is not yet due.
   * Without this a backed-off item would sit untouched until the user
   * happens to log something else or reopen the app.
   *
   * @returns {Promise<void>}
   */
  const scheduleNextAttempt = useCallback(async () => {
    if (backoffTimerRef.current) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }

    try {
      const next = await db.getFirstAsync(
        `SELECT MIN(next_attempt_at) AS due FROM sync_queue WHERE state != 'blocked'`
      );
      // MIN() over an empty set gives NULL — that's "nothing queued", the only
      // case to bail on. A due-right-now item has next_attempt_at = 0, which
      // `!next?.due` was treating the same as "nothing queued" and silently
      // skipping — the item then never got its wake-up timer armed.
      if (next?.due == null) return;

      const delay = Math.max(1000, next.due - Date.now());
      if (delay > SYNC_BACKOFF_MAX_MS) return;

      backoffTimerRef.current = setTimeout(() => {
        backoffTimerRef.current = null;
        if (isMountedRef.current) {
          processSyncQueueRef.current?.();
        }
      }, delay);
    } catch (err) {
      console.error('[useFoodLog] Failed to schedule next sync attempt:', err);
    }
  }, []);

  /**
   * Process sync queue with background sync
   * Uses ref-based lock to prevent parallel execution
   *
   * @returns {Promise<void>}
   */
  const processSyncQueue = useCallback(async () => {
    // Auth is unusable until the app is foregrounded again (see authPausedRef)
    if (authPausedRef.current) {
      return;
    }

    // Only pull items that are due. Blocked items are terminal and are never
    // picked up again except through an explicit user-driven retry.
    const queue = await db.getAllAsync(
      `SELECT * FROM sync_queue
        WHERE state != 'blocked' AND next_attempt_at <= ?
        ORDER BY timestamp ASC`,
      [Date.now()]
    );

    if (queue.length === 0 || syncLock.inFlight) {
      // Nothing due now, but something may be due later
      if (!syncLock.inFlight) await scheduleNextAttempt();
      return;
    }

    // Set lock immediately (synchronous)
    syncLock.inFlight = true;
    setIsSyncing(true);

    try {
      // Try to get a fresh token (forces refresh if expired)
      let token = await getToken();
      if (!token) {
        console.warn('[useFoodLog] No auth token, pausing sync until app resumes');
        authPausedRef.current = true;
        setError('Authentication required. Please sign in.');
        return;
      }

      for (let i = 0; i < queue.length; i++) {
        const row = queue[i];

        // Corrupt queue rows used to throw out of the whole loop, stalling
        // every other item behind them. Park the bad row and keep going.
        let log;
        try {
          log = JSON.parse(row.log_data);
        } catch {
          console.error('[useFoodLog] Unparseable queue row, blocking:', row.clientEventId);
          await blockQueueItem(row.clientEventId, 'Corrupted local data');
          continue;
        }

        try {
          // Skip if already synced
          if (log.status === 'synced') {
            await removeFromSyncQueue(log.clientEventId);
            continue;
          }

          // Ensure legacy logs have clientEventId
          if (!log.clientEventId) {
            log.clientEventId = generateClientEventId(userId);
            console.log('[useFoodLog] Generated clientEventId for legacy log:', log.foodName);
          }

          // Sync to backend. A transform failure is a bad payload, not a
          // network problem — replaying it would fail identically forever.
          let payload;
          try {
            payload = transformFoodLogToBackend(log);
          } catch (transformErr) {
            console.error('[useFoodLog] Payload rejected, blocking:', log.foodName, transformErr);
            await blockQueueItem(row.clientEventId, transformErr.message || 'Invalid meal data');
            continue;
          }

          // Offset from when the meal was logged, not now — see addLog. Legacy
          // rows queued before this was recorded fall back to the current offset.
          const tzHeaders = getTimezoneOffsetHeaders(log.tzOffsetMinutes);

          let response = await fetch(`${API_URL}/nutrition/log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              ...tzHeaders,
            },
            body: JSON.stringify(payload),
          });

          // A 401 usually just means the cached token aged out. Force one
          // refresh and replay before concluding auth is broken.
          if (response.status === 401) {
            const refreshed = await getToken({ skipCache: true }).catch(() => null);

            if (refreshed && refreshed !== token) {
              token = refreshed;
              response = await fetch(`${API_URL}/nutrition/log`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  ...tzHeaders,
                },
                body: JSON.stringify(payload),
              });
            }
          }

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

            // Invalidate dashboard cache for auto-refresh. Also Your Progress's
            // keys — without this a synced meal wouldn't show there until a
            // manual pull-to-refresh, even though it's already on the server.
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-unified'] });
            queryClient.invalidateQueries({ queryKey: ['analytics-recommendations'] });
            queryClient.invalidateQueries({ queryKey: ['decision-brain'] });

            console.log('[useFoodLog] ✅ Synced:', log.foodName);
          } else {
            // Still 401 after a forced refresh: auth really is unusable.
            // Pause rather than latch permanently, so foregrounding the app
            // (or a fresh sign-in) resumes sync on its own.
            if (response.status === 401) {
              console.error('[useFoodLog] ⚠️ Authentication failed after refresh - pausing sync');
              authPausedRef.current = true;
              setError('Authentication token expired. Please sign out and sign back in.');
              return; // Stop processing queue
            }

            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData.error || `Sync failed: ${response.status}`;

            if (isRetryableStatus(response.status)) {
              await bumpRetry(row.clientEventId, row.attempts || 0, errorMsg);
              console.warn('[useFoodLog] ⏳ Sync will retry:', log.foodName, errorMsg);
            } else {
              await blockQueueItem(row.clientEventId, errorMsg);
              console.error('[useFoodLog] ❌ Sync rejected, blocked:', log.foodName, errorMsg);
            }
          }
        } catch (err) {
          // Transport failure: the request never reached a verdict. Every other
          // due item is about to fail the same way, so back the whole batch off
          // together instead of firing one doomed request per queued meal — a
          // user who logged 20 meals offline should cost one failed request,
          // not 20. Purely local DB writes, no further network calls.
          const reason = err.message || 'Network error';
          console.error('[useFoodLog] Sync error, backing off batch:', err);

          for (let j = i; j < queue.length; j++) {
            await bumpRetry(queue[j].clientEventId, queue[j].attempts || 0, reason);
          }
          break;
        }
      }

      await loadLocalLogs();
    } catch (err) {
      console.error('[useFoodLog] Sync queue processing error:', err);
    } finally {
      // Release lock immediately (synchronous)
      syncLock.inFlight = false;
      setIsSyncing(false);
      await updateSyncCount();
      await scheduleNextAttempt();
    }
  }, [
    getToken,
    loadLocalLogs,
    removeFromSyncQueue,
    queryClient,
    userId,
    blockQueueItem,
    bumpRetry,
    updateSyncCount,
    scheduleNextAttempt,
  ]);

  // Update ref on every render for stable callback reference
  processSyncQueueRef.current = processSyncQueue;

  /**
   * Clear pending backoff and drain immediately.
   *
   * Backoff exists to avoid hammering a network that just proved unreachable.
   * When something gives positive evidence the network is usable again — a
   * reconnect event, or the user foregrounding the app expecting their data to
   * be there — that assumption no longer holds, and waiting out a timer that
   * could be up to SYNC_BACKOFF_MAX_MS long defeats the point of noticing at
   * all. Without this, a device that reconnects two seconds into a five-second
   * backoff window would sit idle for the remaining three.
   *
   * Blocked items are untouched: a reconnect does not fix a rejected payload.
   * `attempts` is preserved so the backoff curve and the UI's failure signal
   * both survive.
   *
   * @returns {Promise<void>}
   */
  const syncNow = useCallback(async () => {
    try {
      await db.runAsync(
        `UPDATE sync_queue SET next_attempt_at = 0 WHERE state != 'blocked'`
      );
    } catch (err) {
      console.error('[useFoodLog] Failed to clear sync backoff:', err);
    }
    await processSyncQueueRef.current?.();
  }, []);

  const syncNowRef = useRef(null);
  syncNowRef.current = syncNow;

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
        clientEventId: foodLog.clientEventId || generateClientEventId(userId),
        // Captured now, not at sync time. The backend derives the user's local
        // day from this (daily summary, meal XP tier, streak), and a meal logged
        // offline can upload hours or days later — after travel or a DST change
        // the device's current offset would put the meal on the wrong day.
        tzOffsetMinutes: Number.isFinite(foodLog.tzOffsetMinutes)
          ? foodLog.tzOffsetMinutes
          : new Date().getTimezoneOffset(),
      };

      // Insert into SQLite (including fiber, sugar, sodium)
      await db.runAsync(
        'INSERT OR REPLACE INTO food_logs (userId, foodName, calories, protein, carbs, fat, fiber, sugar, sodium, timestamp, status, clientEventId, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          newLog.foodName,
          newLog.calories,
          newLog.protein,
          newLog.carbs,
          newLog.fat,
          newLog.fiber ?? null,
          newLog.sugar ?? null,
          newLog.sodium ?? null,
          newLog.timestamp,
          newLog.status,
          newLog.clientEventId,
          JSON.stringify(newLog)
        ]
      );

      // Update local state
      await loadLocalLogs();

      // Add to sync queue
      await addToSyncQueue(newLog);

      // Trigger background sync (debounced)
      triggerSync();

      // Smart notification: Cancel streak protection since user logged today
      cancelStreakProtectionIfLoggedToday().catch(() => {
        // Non-blocking - ignore errors
      });

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
      // Remove from sync queue first — the lookup joins on food_logs, so it
      // must run before that row is gone or it always matches nothing,
      // leaving an orphaned queue entry that retries a meal that no longer
      // exists locally.
      await db.runAsync('DELETE FROM sync_queue WHERE clientEventId IN (SELECT clientEventId FROM food_logs WHERE id = ? OR timestamp = ?)', [logId, logId]);

      // Delete from local DB
      await db.runAsync('DELETE FROM food_logs WHERE id = ? OR timestamp = ?', [logId, logId]);

      await loadLocalLogs();
      await updateSyncCount();

      // If synced, delete from backend
      const token = await getToken();
      if (token && typeof logId === 'number') {
        await fetch(`${API_URL}/nutrition/log/${logId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getTimezoneOffsetHeaders(),
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
              ...getTimezoneOffsetHeaders(),
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
            if (!merged.some(m =>
              (m.id && local.id && m.id === local.id) ||
              (m.clientEventId && local.clientEventId && m.clientEventId === local.clientEventId) ||
              m.timestamp === local.timestamp
            )) {
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
      totalFats: filtered.reduce((sum, log) => sum + (log.fat || 0), 0),
      logs: filtered,
    };
  }, [logs]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Retry failed syncs.
   *
   * Differs from the automatic paths (reconnect, resume) in exactly one way: it
   * also revives 'blocked' items. Only an explicit user action should re-attempt
   * a payload the server already rejected — automatic retries would spin on it
   * forever. Clearing the backoff and draining is then delegated to syncNow so
   * there is one code path for that, not two that can drift.
   *
   * `attempts` is intentionally preserved. It no longer gates anything (only a
   * real rejection parks an item), and zeroing it would make hasSyncFailure flip
   * to false, hiding the card for the second or two the retry is in flight and
   * then flashing it back on failure.
   */
  const retryFailedSyncs = useCallback(async () => {
    try {
      authPausedRef.current = false;
      setError(null);
      await db.runAsync(`UPDATE sync_queue SET state = 'pending' WHERE state = 'blocked'`);
      await updateSyncCount();
    } catch (err) {
      console.error('[useFoodLog] Failed to revive blocked syncs:', err);
    }
    await syncNow();
  }, [syncNow, updateSyncCount]);

  /**
   * Discard a queued log that can never sync, removing it locally too.
   * Gives the user an exit from a permanently stuck item.
   *
   * @param {string} clientEventId - Client event ID
   * @returns {Promise<void>}
   */
  const discardBlockedSync = useCallback(async (clientEventId) => {
    try {
      await db.runAsync('DELETE FROM sync_queue WHERE clientEventId = ?', [clientEventId]);
      await db.runAsync('DELETE FROM food_logs WHERE clientEventId = ?', [clientEventId]);
      await loadLocalLogs();
      await updateSyncCount();
    } catch (err) {
      console.error('[useFoodLog] Failed to discard blocked sync:', err);
    }
  }, [loadLocalLogs, updateSyncCount]);

  /**
   * Queued items that are terminally stuck, for surfacing in the UI.
   *
   * @returns {Promise<Array>} Blocked queue entries
   */
  const getBlockedSyncs = useCallback(async () => {
    try {
      const rows = await db.getAllAsync(
        `SELECT clientEventId, log_data, attempts, last_error
           FROM sync_queue WHERE state = 'blocked' ORDER BY timestamp ASC`
      );
      return rows.map(row => {
        let foodName = 'Unknown meal';
        try {
          foodName = JSON.parse(row.log_data)?.foodName || foodName;
        } catch {
          // Corrupted payload - keep the fallback name
        }
        return {
          clientEventId: row.clientEventId,
          foodName,
          attempts: row.attempts,
          lastError: row.last_error,
        };
      });
    } catch (err) {
      console.error('[useFoodLog] Failed to load blocked syncs:', err);
      return [];
    }
  }, []);

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

      // Trigger initial sync. syncNow rather than a raw drain because AppState
      // never fires 'active' on a cold launch — the app starts active — so this
      // is the only place that can treat "the user just opened the app" as
      // reason enough to ignore a backoff persisted from the last session.
      setTimeout(() => syncNowRef.current?.(), 1000);
    })();

    return () => {
      isMountedRef.current = false;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (backoffTimerRef.current) {
        clearTimeout(backoffTimerRef.current);
      }
    };
  }, [loadLocalLogs, updateSyncCount, migrateFromAsyncStorage]);

  // Drain the queue whenever the app returns to the foreground.
  //
  // Without this, a meal logged offline sits in the queue until the user
  // happens to log something else — sync otherwise only ran on mount and on
  // add. Resume is also the moment a stale Clerk token can be refreshed, so
  // it doubles as the recovery point for a paused-on-auth queue.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;

      authPausedRef.current = false;
      // syncNow, not processSyncQueue: the user is looking at the app now, so
      // waiting out a backoff timer before even trying is the wrong trade.
      syncNowRef.current?.();
    });

    return () => subscription.remove();
  }, []);

  // Drain the queue the moment connectivity comes back, without waiting for the
  // user to foreground the app or for the backoff timer to come due.
  //
  // Edge-triggered on purpose. expo-network emits on every network change —
  // wifi to cellular, IP reassignment, signal flapping — and syncing on each of
  // those would hammer the backend while someone walks between cells. Only a
  // genuine unusable -> usable transition drains.
  useEffect(() => {
    if (!Network?.addNetworkStateListener) return;

    // Seeded from the real current state, not an optimistic default: an app
    // launched while offline would otherwise start as "was online", making the
    // first real reconnect look like no transition at all.
    let wasUsable = true;
    let cancelled = false;

    Network.getNetworkStateAsync?.()
      .then(state => { if (!cancelled) wasUsable = isUsableConnection(state); })
      .catch(() => { /* keep the optimistic default */ });

    let subscription;
    try {
      subscription = Network.addNetworkStateListener(state => {
        const usable = isUsableConnection(state);
        const reconnected = usable && !wasUsable;
        wasUsable = usable;

        if (reconnected) {
          console.log('[useFoodLog] Reconnected - draining sync queue');
          // Clears backoff first: the reconnect IS the evidence that the
          // network is worth trying again, so honouring a timer set while
          // offline would waste the signal entirely.
          syncNowRef.current?.();
        }
      });
    } catch (err) {
      console.warn('[useFoodLog] Could not attach network listener:', err?.message);
      return;
    }

    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, []);

  // A new signed-in user means a usable token again. Without this, signing out
  // and back in inside one session leaves sync paused until the app is
  // backgrounded, because resume was the only thing clearing the pause.
  useEffect(() => {
    if (!userId) return;

    authPausedRef.current = false;
    setError(null);
    syncNowRef.current?.();
  }, [userId]);

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
    blockedSyncCount,
    hasSyncFailure,

    // Actions
    addLog,
    deleteLog,
    fetchHistory,
    getTodayLogs,
    getAggregate,
    retryFailedSyncs,
    discardBlockedSync,
    getBlockedSyncs,
    clearError,
  };
}
