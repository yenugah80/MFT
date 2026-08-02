/**
 * Profile Cache
 *
 * The profile screen used to block on a network round trip every time it
 * mounted — a full-screen spinner on every cold start, and a blank error screen
 * whenever the request failed. The data barely changes between sessions, so
 * that latency is entirely avoidable.
 *
 * This stores the last successfully fetched profile on the device so the screen
 * can paint real data immediately and revalidate in the background
 * (stale-while-revalidate). If the network is slow, down, or rate limited, the
 * user still sees their profile instead of a spinner or an error.
 *
 * Cache entries are keyed per user id so signing in as someone else can never
 * surface the previous account's data, and carry a schema version so a shape
 * change invalidates old entries instead of rendering them.
 *
 * The storage backend is injectable purely so this logic can be unit tested
 * without a React Native runtime.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const CACHE_PREFIX = '@mft:profile_cache:';

// Bump when the cached profile shape changes; older entries are then ignored.
export const CACHE_VERSION = 1;

// Entries older than this are treated as unusable. Generous on purpose: a
// week-old profile is still far better than an empty screen, and it is always
// revalidated in the background anyway.
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const cacheKeyFor = (userId) => `${CACHE_PREFIX}${userId}`;

/**
 * Reads the cached profile for a user.
 *
 * @returns {Promise<{profile: object, cachedAt: number, ageMs: number} | null>}
 *          null when absent, unparseable, wrong version, or expired.
 */
export async function readCachedProfile(userId, { storage = AsyncStorage, now = Date.now } = {}) {
  if (!userId) return null;

  try {
    const raw = await storage.getItem(cacheKeyFor(userId));
    if (!raw) return null;

    const entry = JSON.parse(raw);

    // A corrupt or superseded entry is simply a cache miss — never a crash and
    // never a reason to fail the screen.
    if (!entry || entry.version !== CACHE_VERSION || !entry.profile) return null;

    const ageMs = now() - (entry.cachedAt ?? 0);
    if (ageMs > CACHE_MAX_AGE_MS || ageMs < 0) return null;

    return { profile: entry.profile, cachedAt: entry.cachedAt, ageMs };
  } catch {
    return null;
  }
}

/**
 * Stores a freshly fetched profile. Never throws — a cache write failing must
 * not break the load that just succeeded.
 */
export async function writeCachedProfile(userId, profile, { storage = AsyncStorage, now = Date.now } = {}) {
  if (!userId || !profile) return false;

  try {
    await storage.setItem(
      cacheKeyFor(userId),
      JSON.stringify({ version: CACHE_VERSION, cachedAt: now(), profile })
    );
    return true;
  } catch {
    return false;
  }
}

/** Removes a user's cached profile (sign-out, account deletion). Never throws. */
export async function clearCachedProfile(userId, { storage = AsyncStorage } = {}) {
  if (!userId) return false;
  try {
    await storage.removeItem(cacheKeyFor(userId));
    return true;
  } catch {
    return false;
  }
}

export default { readCachedProfile, writeCachedProfile, clearCachedProfile, cacheKeyFor };
