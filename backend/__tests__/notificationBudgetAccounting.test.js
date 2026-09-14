import { describe, test, expect } from '@jest/globals';
import {
  LOCAL_ALLOCATION,
  OWNABLE_CATEGORIES,
  getLocalBudgetClaimed,
  getEffectiveDailyCap,
} from '../src/utils/notificationOwnership.js';
import { NOTIFICATION_POLICY } from '../src/utils/notificationPolicy.js';

// Regression coverage for the count contradiction found 2026-09: the
// previous report's own "new user" timeline listed 6 local notifications
// (hydration x2, food, activity, mood, streak) while LOCAL_ALLOCATION only
// summed to 5, and the "active user" timeline allowed a 7th (backend
// motivation) on top of that — both silently exceeding the stated 6/day
// combined cap. These tests pin the corrected invariant: every
// locally-schedulable category is counted, the sum equals the real daily
// cap, and the effective backend cap for a fully-locally-owned device is
// exactly zero, never a stray reserved floor.

describe('LOCAL_ALLOCATION — combined count invariant', () => {
  test('every OWNABLE_CATEGORIES entry has a LOCAL_ALLOCATION value', () => {
    for (const category of OWNABLE_CATEGORIES) {
      expect(LOCAL_ALLOCATION[category]).toBeGreaterThan(0);
    }
  });

  test('LOCAL_ALLOCATION has no entries outside OWNABLE_CATEGORIES', () => {
    for (const category of Object.keys(LOCAL_ALLOCATION)) {
      expect(OWNABLE_CATEGORIES.has(category)).toBe(true);
    }
  });

  test('LOCAL_ALLOCATION sums to exactly the account-wide daily cap (6) — not 5, not 7', () => {
    const total = Object.values(LOCAL_ALLOCATION).reduce((a, b) => a + b, 0);
    expect(total).toBe(NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY);
  });

  test('streak_at_risk is counted (the specific category that was previously missing)', () => {
    expect(LOCAL_ALLOCATION.streak_at_risk).toBe(1);
    expect(OWNABLE_CATEGORIES.has('streak_at_risk')).toBe(true);
  });
});

describe('getEffectiveDailyCap', () => {
  test('a device owning nothing locally gets the full, unreduced cap', () => {
    expect(getEffectiveDailyCap(6, new Set())).toBe(6);
  });

  test('a device owning ALL FIVE categories (the full local schedule) has an effective cap of exactly 0, not floored at 1', () => {
    const allOwned = new Set(Object.keys(LOCAL_ALLOCATION));
    expect(getEffectiveDailyCap(6, allOwned)).toBe(0);
  });

  test('a device owning only hydration (2) has an effective cap of 4', () => {
    expect(getEffectiveDailyCap(6, new Set(['hydration_nudge']))).toBe(4);
  });

  test('never goes negative even if (hypothetically) local claimed more than maxPerDay', () => {
    const allOwned = new Set(Object.keys(LOCAL_ALLOCATION));
    expect(getEffectiveDailyCap(3, allOwned)).toBe(0); // 3 - 6 would be -3 without the floor
  });

  test('getLocalBudgetClaimed sums an arbitrary subset correctly', () => {
    expect(getLocalBudgetClaimed(new Set(['hydration_nudge', 'mood_checkin']))).toBe(3); // 2 + 1
    expect(getLocalBudgetClaimed(new Set())).toBe(0);
    expect(getLocalBudgetClaimed(new Set(['not_a_real_category']))).toBe(0);
  });
});

describe('combined total — worked example matching the corrected new-user timeline', () => {
  test('all 5 local categories owned + effective backend cap together never exceed 6/day', () => {
    const allOwned = new Set(Object.keys(LOCAL_ALLOCATION));
    const localTotal = getLocalBudgetClaimed(allOwned); // 6
    const effectiveBackendCap = getEffectiveDailyCap(NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY, allOwned); // 0
    expect(localTotal + effectiveBackendCap).toBe(NOTIFICATION_POLICY.MAX_NOTIFICATIONS_PER_USER_PER_DAY);
  });
});
