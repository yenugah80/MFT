/**
 * Sync Retry Policy Tests
 *
 * Covers the decision logic behind the offline food-log queue: what gets
 * retried, how fast, and what gets parked for the user to deal with.
 * Regressions here are invisible in the UI until a user's meal silently never
 * reaches the server.
 */

import {
  SYNC_BACKOFF_BASE_MS,
  SYNC_BACKOFF_MAX_MS,
  getSyncBackoffMs,
  isRetryableStatus,
  isTerminalStatus,
  isUsableConnection,
} from '../utils/syncRetryPolicy';

describe('getSyncBackoffMs', () => {
  it('waits the base delay after the first failure', () => {
    expect(getSyncBackoffMs(1)).toBe(SYNC_BACKOFF_BASE_MS);
  });

  it('doubles on each subsequent attempt', () => {
    expect(getSyncBackoffMs(2)).toBe(SYNC_BACKOFF_BASE_MS * 2);
    expect(getSyncBackoffMs(3)).toBe(SYNC_BACKOFF_BASE_MS * 4);
    expect(getSyncBackoffMs(4)).toBe(SYNC_BACKOFF_BASE_MS * 8);
  });

  it('never exceeds the ceiling, however many attempts have been made', () => {
    expect(getSyncBackoffMs(20)).toBe(SYNC_BACKOFF_MAX_MS);
    // An item retrying for days must not compute an absurd delay
    expect(getSyncBackoffMs(5000)).toBe(SYNC_BACKOFF_MAX_MS);
    expect(Number.isFinite(getSyncBackoffMs(5000))).toBe(true);
  });

  it('treats a zero/negative attempt count as the first attempt', () => {
    // Guards against a NULL attempts column reintroducing a zero-delay hot loop
    expect(getSyncBackoffMs(0)).toBe(SYNC_BACKOFF_BASE_MS);
    expect(getSyncBackoffMs(-3)).toBe(SYNC_BACKOFF_BASE_MS);
  });

  it('always returns a positive delay', () => {
    for (let attempts = 0; attempts <= 30; attempts++) {
      expect(getSyncBackoffMs(attempts)).toBeGreaterThan(0);
    }
  });

  it('caps the wait between reconnecting and syncing at five minutes', () => {
    // With no NetInfo listener this ceiling is what bounds recovery time for a
    // user who reconnects without backgrounding the app.
    expect(SYNC_BACKOFF_MAX_MS).toBe(5 * 60 * 1000);
  });
});

describe('isTerminalStatus', () => {
  it('parks a rejected payload', () => {
    // Replaying a 400 forever is what pinned the old "Pending Sync" banner on
    // screen permanently.
    expect(isTerminalStatus(400)).toBe(true);
    expect(isTerminalStatus(403)).toBe(true);
    expect(isTerminalStatus(404)).toBe(true);
    expect(isTerminalStatus(422)).toBe(true);
  });

  it('does not park a server-side failure', () => {
    // A backend deploy or outage must never cost the user a logged meal
    expect(isTerminalStatus(500)).toBe(false);
    expect(isTerminalStatus(502)).toBe(false);
    expect(isTerminalStatus(503)).toBe(false);
  });

  it('does not park the transient 4xx statuses', () => {
    expect(isTerminalStatus(408)).toBe(false); // request timeout
    expect(isTerminalStatus(425)).toBe(false); // too early
    expect(isTerminalStatus(429)).toBe(false); // rate limited
  });

  it('does not park a success', () => {
    expect(isTerminalStatus(200)).toBe(false);
    expect(isTerminalStatus(201)).toBe(false);
  });
});

describe('isRetryableStatus', () => {
  it('is the exact inverse of isTerminalStatus', () => {
    for (const status of [200, 201, 400, 403, 404, 408, 422, 425, 429, 500, 502, 503]) {
      expect(isRetryableStatus(status)).toBe(!isTerminalStatus(status));
    }
  });

  it('retries everything transient', () => {
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
  });

  it('stops retrying a rejected payload', () => {
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(422)).toBe(false);
  });
});

describe('isUsableConnection', () => {
  it('accepts a fully connected state', () => {
    expect(isUsableConnection({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it('rejects a disconnected state', () => {
    expect(isUsableConnection({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isUsableConnection({ isConnected: false, isInternetReachable: true })).toBe(false);
  });

  it('rejects an explicitly unreachable connection', () => {
    // Connected to a wifi network that has no route out (captive portal)
    expect(isUsableConnection({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('accepts a connection whose reachability is still unknown', () => {
    // The critical case: reachability is undefined on some platforms and
    // momentarily undefined right after a change. Treating that as offline
    // would swallow real reconnects and leave meals queued.
    expect(isUsableConnection({ isConnected: true })).toBe(true);
    expect(isUsableConnection({ isConnected: true, isInternetReachable: undefined })).toBe(true);
  });

  it('rejects missing or malformed state instead of throwing', () => {
    expect(isUsableConnection(null)).toBe(false);
    expect(isUsableConnection(undefined)).toBe(false);
    expect(isUsableConnection({})).toBe(false);
  });

  it('requires isConnected to be exactly true, not merely truthy', () => {
    // Guards against a native bridge handing back a non-boolean
    expect(isUsableConnection({ isConnected: 1 })).toBe(false);
    expect(isUsableConnection({ isConnected: 'yes' })).toBe(false);
  });
});

describe('reconnect edge detection', () => {
  // Mirrors the listener logic in useFoodLog.js: drain only on a genuine
  // unusable -> usable transition, never on every network event.
  const drainsOn = (states, startUsable = true) => {
    let wasUsable = startUsable;
    let drains = 0;
    for (const s of states) {
      const usable = isUsableConnection(s);
      if (usable && !wasUsable) drains++;
      wasUsable = usable;
    }
    return drains;
  };

  const OFFLINE = { isConnected: false };
  const WIFI = { isConnected: true, isInternetReachable: true };
  const CELL = { isConnected: true, isInternetReachable: true };

  it('drains once when connectivity returns', () => {
    expect(drainsOn([OFFLINE, WIFI])).toBe(1);
  });

  it('does not drain on a wifi-to-cellular handoff', () => {
    // Both states are usable, so there is no edge — this is the case that
    // would otherwise fire a sync every time a user walks between cells.
    expect(drainsOn([WIFI, CELL, WIFI])).toBe(0);
  });

  it('drains once per outage, not once per event', () => {
    expect(drainsOn([WIFI, OFFLINE, OFFLINE, OFFLINE, WIFI])).toBe(1);
  });

  it('drains for each separate outage', () => {
    expect(drainsOn([WIFI, OFFLINE, WIFI, OFFLINE, WIFI])).toBe(2);
  });

  it('drains when an app launched offline first gets a connection', () => {
    // Requires seeding wasUsable from the real state; an optimistic default
    // would treat this as no transition and never drain.
    expect(drainsOn([WIFI], /* startUsable */ false)).toBe(1);
  });
});

describe('retry budget', () => {
  it('has no attempt ceiling for transient failures', () => {
    // The policy exposes no max-attempts constant on purpose: a long flight or
    // a long outage must not cause the queue to give up on a valid meal.
    const policy = require('../utils/syncRetryPolicy');
    const names = Object.keys(policy);
    expect(names).not.toContain('MAX_SYNC_ATTEMPTS');
    expect(names).not.toContain('shouldBlockAfter');
  });

  it('keeps a day of retrying cheap once backoff saturates', () => {
    // One request per 5 minutes is the steady-state cost of an item that
    // cannot sync — worth it to never lose a meal.
    const perDay = (24 * 60 * 60 * 1000) / getSyncBackoffMs(50);
    expect(perDay).toBeLessThanOrEqual(288);
  });
});
