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

describe('retry budget', () => {
  it('has no attempt ceiling for transient failures', () => {
    // The policy exposes no max-attempts constant on purpose: a long flight or
    // a long outage must not cause the queue to give up on a valid meal.
    // eslint-disable-next-line global-require
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
