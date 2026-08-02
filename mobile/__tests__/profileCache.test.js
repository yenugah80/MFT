/**
 * Tests for the profile cache — the layer that lets the profile screen paint
 * real data immediately instead of blocking on a network round trip.
 *
 * A fake in-memory storage is injected so these run without a React Native
 * runtime, matching the pure-unit jest config.
 */

import {
  readCachedProfile,
  writeCachedProfile,
  clearCachedProfile,
  cacheKeyFor,
  CACHE_VERSION,
  CACHE_MAX_AGE_MS,
} from '../services/profileCache';

const createStorage = (initial = {}) => {
  const store = { ...initial };
  return {
    store,
    getItem: jest.fn(async (k) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k, v) => {
      store[k] = v;
    }),
    removeItem: jest.fn(async (k) => {
      delete store[k];
    }),
  };
};

const PROFILE = {
  basics: { fullName: 'y harika', age: 28, weightKg: 60, heightCm: 163 },
  goals: { primaryGoal: 'lose', dailyCalories: 1312, proteinG: 132 },
  dietary: { preferences: ['balanced', 'low_carb'], allergies: [] },
};

const USER = 'user_abc123';

describe('profileCache round trip', () => {
  it('returns a profile that was written', async () => {
    const storage = createStorage();
    await writeCachedProfile(USER, PROFILE, { storage, now: () => 1000 });

    const result = await readCachedProfile(USER, { storage, now: () => 2000 });

    expect(result).not.toBeNull();
    expect(result.profile).toEqual(PROFILE);
    expect(result.cachedAt).toBe(1000);
    expect(result.ageMs).toBe(1000);
  });

  it('returns null when nothing has been cached', async () => {
    const storage = createStorage();
    await expect(readCachedProfile(USER, { storage })).resolves.toBeNull();
  });

  it('scopes entries per user so one account never sees another', async () => {
    const storage = createStorage();
    await writeCachedProfile('user_one', PROFILE, { storage });

    await expect(readCachedProfile('user_two', { storage })).resolves.toBeNull();
    expect(cacheKeyFor('user_one')).not.toBe(cacheKeyFor('user_two'));
  });
});

describe('profileCache invalidation', () => {
  it('ignores entries written by an older schema version', async () => {
    const storage = createStorage({
      [cacheKeyFor(USER)]: JSON.stringify({
        version: CACHE_VERSION - 1,
        cachedAt: Date.now(),
        profile: PROFILE,
      }),
    });

    await expect(readCachedProfile(USER, { storage })).resolves.toBeNull();
  });

  it('ignores entries older than the max age', async () => {
    const storage = createStorage();
    await writeCachedProfile(USER, PROFILE, { storage, now: () => 0 });

    const justInside = await readCachedProfile(USER, { storage, now: () => CACHE_MAX_AGE_MS });
    expect(justInside).not.toBeNull();

    const justOutside = await readCachedProfile(USER, { storage, now: () => CACHE_MAX_AGE_MS + 1 });
    expect(justOutside).toBeNull();
  });

  it('ignores entries with a future timestamp (clock moved backwards)', async () => {
    const storage = createStorage();
    await writeCachedProfile(USER, PROFILE, { storage, now: () => 5000 });

    await expect(readCachedProfile(USER, { storage, now: () => 1000 })).resolves.toBeNull();
  });

  it('treats corrupt JSON as a cache miss rather than throwing', async () => {
    const storage = createStorage({ [cacheKeyFor(USER)]: '{not valid json' });
    await expect(readCachedProfile(USER, { storage })).resolves.toBeNull();
  });

  it('clears a cached entry', async () => {
    const storage = createStorage();
    await writeCachedProfile(USER, PROFILE, { storage });

    await clearCachedProfile(USER, { storage });

    await expect(readCachedProfile(USER, { storage })).resolves.toBeNull();
  });
});

describe('profileCache resilience', () => {
  it('never throws when the storage backend fails on write', async () => {
    const storage = createStorage();
    storage.setItem.mockRejectedValueOnce(new Error('disk full'));

    await expect(writeCachedProfile(USER, PROFILE, { storage })).resolves.toBe(false);
  });

  it('never throws when the storage backend fails on read', async () => {
    const storage = createStorage();
    storage.getItem.mockRejectedValueOnce(new Error('unavailable'));

    await expect(readCachedProfile(USER, { storage })).resolves.toBeNull();
  });

  it('ignores calls with no user id or no profile', async () => {
    const storage = createStorage();

    await expect(readCachedProfile(null, { storage })).resolves.toBeNull();
    await expect(writeCachedProfile(null, PROFILE, { storage })).resolves.toBe(false);
    await expect(writeCachedProfile(USER, null, { storage })).resolves.toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
