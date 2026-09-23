/**
 * Sync Retry Policy
 *
 * Pure decision logic for the offline food-log sync queue: how long to wait
 * before retrying a failed upload, and whether a failure is worth retrying at
 * all. Kept free of SQLite/Clerk imports so it can be unit tested directly —
 * the queue plumbing lives in hooks/useFoodLog.js.
 *
 * The core distinction is terminal vs. transient:
 *
 * - **Terminal**: the server understood the request and rejected it, or the
 *   payload can't be built at all. Replaying it unchanged fails identically
 *   forever, so the item is parked ('blocked') for the user to fix or discard.
 *
 * - **Transient**: the request never got a verdict — no network, a timeout, a
 *   rate limit, a backend deploy. These are retried indefinitely with capped
 *   backoff and are NEVER parked. There is no upper bound on how long a flight
 *   or an outage lasts, and giving up would silently cost the user a logged
 *   meal. Retrying is safe to be generous with: the backend inserts with
 *   ON CONFLICT DO NOTHING on clientEventId, so a replay can never
 *   double-count against the daily summary.
 *
 * @module utils/syncRetryPolicy
 */

/** First retry delay; doubles each attempt up to SYNC_BACKOFF_MAX_MS */
export const SYNC_BACKOFF_BASE_MS = 5000;

/**
 * Ceiling for retry backoff. Also the worst-case delay between a device
 * regaining connectivity and a queued meal syncing without any user action.
 */
export const SYNC_BACKOFF_MAX_MS = 5 * 60 * 1000;

/**
 * Backoff delay for a queued sync item, capped at SYNC_BACKOFF_MAX_MS.
 *
 * @param {number} attempts - Attempts already made (1 after the first failure)
 * @returns {number} Delay in milliseconds
 */
export function getSyncBackoffMs(attempts) {
  const raw = SYNC_BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempts - 1));
  return Math.min(raw, SYNC_BACKOFF_MAX_MS);
}

/**
 * Whether an HTTP status means the request will fail identically forever.
 *
 * 4xx is the server saying "this payload is wrong", so it is terminal. The
 * exceptions are 408 (timeout), 425 (too early) and 429 (rate limited), which
 * describe the moment rather than the payload. 5xx is the server failing, not
 * the payload — transient.
 *
 * 401 is deliberately excluded: the sync loop refreshes the token and replays,
 * and a still-failing 401 pauses the whole queue rather than penalising one
 * item, so it never reaches this function.
 *
 * @param {number} status - HTTP status code
 * @returns {boolean} True if the item should be parked rather than retried
 */
export function isTerminalStatus(status) {
  if (status === 408 || status === 425 || status === 429) return false;
  return status >= 400 && status < 500;
}

/**
 * Inverse of isTerminalStatus for non-2xx responses, kept as its own name
 * because call sites read better asking "should I retry this?".
 *
 * @param {number} status - HTTP status code
 * @returns {boolean} True if a retry could plausibly succeed
 */
export function isRetryableStatus(status) {
  return !isTerminalStatus(status);
}

/**
 * Whether a network state is worth attempting requests on.
 *
 * Lives here rather than beside the expo-network plumbing because it is the
 * other half of the same policy question — "is it worth talking to the server
 * right now?" — and because keeping it pure is what makes it testable without
 * the native module.
 *
 * `isInternetReachable` is the stronger signal but is undefined on some
 * platforms and momentarily undefined right after a change, so it only vetoes
 * when explicitly false. Treating undefined as offline would swallow real
 * reconnects while a captive-portal probe is still resolving.
 *
 * @param {{isConnected?: boolean, isInternetReachable?: boolean}|null} state
 * @returns {boolean} True if requests are worth attempting
 */
export function isUsableConnection(state) {
  if (!state) return false;
  if (state.isConnected !== true) return false;
  return state.isInternetReachable !== false;
}
