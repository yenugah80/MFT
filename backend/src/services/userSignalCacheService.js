/**
 * userSignalCacheService.js
 *
 * Provides a lightweight, 5-minute in-memory cache that aggregates real-time
 * user signals from the three specialist signal services:
 *
 *   moodSignalService      → moodUrgency, energyUrgency, moodBoostWeight
 *   hydrationSignalService → hydrationUrgency
 *   activitySignalService  → inPostWorkoutWindow, proteinUrgency,
 *                            carbUrgency, antiInflammatoryBonus
 *
 * Each service is imported **dynamically** so that a missing or failing
 * service never blocks the rest of the recommendation pipeline.
 *
 * Export surface
 * ──────────────
 *   getUserSignals(userId, forceRefresh?)  → Promise<AggregatedSignals>
 *   invalidateUserSignals(userId)          → void
 *
 * @typedef {Object} AggregatedSignals
 * @property {number}  moodUrgency           0-1, composite mood distress score
 * @property {number}  energyUrgency         0-1, energy deficit score
 * @property {number}  moodBoostWeight       0-1, weight for mood-boosting foods
 * @property {number}  hydrationUrgency      0-1, dehydration urgency
 * @property {boolean} inPostWorkoutWindow   true when inside the anabolic window
 * @property {number}  proteinUrgency        0-1, post-workout protein need
 * @property {number}  carbUrgency           0-1, post-workout carb need
 * @property {number}  antiInflammatoryBonus 0-1, recovery anti-inflammatory boost
 */

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

/**
 * Cache store: userId → { signals: AggregatedSignals, cachedAt: number }
 *
 * This is a plain Map (no LRU eviction) appropriate for typical server
 * concurrency.  If the user base grows very large, swap for an LRU-cache
 * library (e.g. lru-cache) without changing any caller code.
 *
 * @type {Map<string, { signals: object, cachedAt: number }>}
 */
const cache = new Map();

/** Cache time-to-live in milliseconds (5 minutes). */
const TTL_MS = 5 * 60 * 1000;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Remove a user's cached signals, forcing a fresh fetch on the next call.
 * Call this after a relevant event (e.g. mood log, water log, activity log).
 *
 * @param {string} userId
 * @returns {void}
 */
export function invalidateUserSignals(userId) {
  for (const key of cache.keys()) {
    if (key === userId || key.startsWith(`${userId}:`)) {
      cache.delete(key);
    }
  }
}

/**
 * Return aggregated signals for the given user, served from cache when fresh.
 *
 * @param {string}  userId
 * @param {boolean} [forceRefresh=false]  Bypass cache and re-fetch all signals.
 * @returns {Promise<AggregatedSignals>}
 */
export async function getUserSignals(userId, optionsOrForceRefresh = false) {
  if (!userId) {
    console.warn('[userSignalCacheService] getUserSignals called with empty userId');
    return defaultSignals();
  }

  const options = typeof optionsOrForceRefresh === 'object' && optionsOrForceRefresh !== null
    ? optionsOrForceRefresh
    : {};
  const forceRefresh = typeof optionsOrForceRefresh === 'boolean'
    ? optionsOrForceRefresh
    : Boolean(options.forceRefresh);
  const cacheKey = getCacheKey(userId, options);
  const entry = cache.get(cacheKey);
  const now = Date.now();

  if (!forceRefresh && entry && now - entry.cachedAt < TTL_MS) {
    return entry.signals;
  }

  const signals = await aggregateSignals(userId, options);

  cache.set(cacheKey, { signals, cachedAt: now });

  return signals;
}

// ============================================================================
// CACHE MAINTENANCE
// ============================================================================

/**
 * Remove all expired entries from the cache.
 * Called automatically on a periodic interval (see bottom of file).
 */
function pruneExpiredEntries() {
  const now = Date.now();
  for (const [userId, entry] of cache.entries()) {
    if (now - entry.cachedAt >= TTL_MS) {
      cache.delete(userId);
    }
  }
}

// Prune stale entries every 10 minutes to prevent unbounded growth.
setInterval(pruneExpiredEntries, 10 * 60 * 1000).unref?.();

// ============================================================================
// SIGNAL AGGREGATION
// ============================================================================

/**
 * Return a zeroed-out signals object used as a safe default on cold-start
 * or total service failure.
 *
 * @returns {AggregatedSignals}
 */
function defaultSignals() {
  return {
    moodUrgency: 0,
    energyUrgency: 0,
    moodBoostWeight: 0,
    moodConfidence: 0,
    moodConfidenceLabel: 'insufficient',
    hydrationUrgency: 0,
    inPostWorkoutWindow: false,
    proteinUrgency: 0,
    carbUrgency: 0,
    antiInflammatoryBonus: 0,
    insights: {
      mood: '',
      hydration: '',
      activity: '',
    },
    explainability: {
      mood: null,
      hydration: null,
      activity: null,
    },
  };
}

/**
 * Fetch signals from all three specialist services in parallel.
 * Each import is wrapped in a dynamic import + try/catch via Promise.allSettled
 * so a missing or crashing service degrades gracefully to zeroed defaults.
 *
 * @param {string} userId
 * @returns {Promise<AggregatedSignals>}
 */
async function aggregateSignals(userId, options = {}) {
  const [mood, hydration, activity] = await Promise.allSettled([
    // ── Mood signal ────────────────────────────────────────────────────────
    import('./moodSignalService.js').then((m) => m.getMoodInsightForRecommendation(userId, {
      timezoneOffset: options.timezoneOffset,
      minTotalLogs: options.minTotalLogs,
      minDistinctDays: options.minDistinctDays,
    })),

    // ── Hydration signal ───────────────────────────────────────────────────
    // Support both naming conventions present in the codebase:
    //   getHydrationInsightForRecommendation  (preferred)
    //   getHydrationSignal                    (fallback)
    import('./hydrationSignalService.js').then((m) => {
      if (typeof m.getHydrationInsightForRecommendation === 'function') {
        return m.getHydrationInsightForRecommendation(userId);
      }
      if (typeof m.getHydrationSignal === 'function') {
        return m.getHydrationSignal(userId);
      }
      return {};
    }),

    // ── Activity signal ────────────────────────────────────────────────────
    import('./activitySignalService.js').then((m) => m.getActivityInsightForRecommendation(userId)),
  ]);

  // ── Mood extraction ────────────────────────────────────────────────────────
  let moodUrgency = 0;
  let energyUrgency = 0;
  let moodBoostWeight = 0;
  let moodConfidence = 0;
  let moodConfidenceLabel = 'insufficient';
  let moodInsight = '';
  let moodExplainability = null;

  if (mood.status === 'fulfilled' && mood.value != null) {
    const mv = mood.value;
    moodUrgency = clamp01(mv.moodUrgency ?? mv.urgency ?? 0);
    energyUrgency = clamp01(mv.energyUrgency ?? (
      typeof mv.energyBoostWeight === 'number' ? mv.energyBoostWeight / 0.3 : 0
    ));
    moodBoostWeight = clamp01(mv.moodBoostWeight ?? 0);
    moodConfidence = clamp01(mv.confidence ?? 0);
    moodConfidenceLabel = mv.confidenceLabel ?? 'insufficient';
    moodInsight = mv.insight ?? '';
    moodExplainability = mv.explainability ?? null;
  } else if (mood.status === 'rejected') {
    console.error('[userSignalCacheService] moodSignalService failed:', mood.reason);
  }

  // ── Hydration extraction ───────────────────────────────────────────────────
  let hydrationUrgency = 0;
  let hydrationInsight = '';
  let hydrationExplainability = null;

  if (hydration.status === 'fulfilled' && hydration.value != null) {
    const hv = hydration.value;
    hydrationUrgency = clamp01(
      hv.urgencyScore
        ?? hv.urgency
        ?? hydrationRiskToUrgency(hv.dehydrationRisk)
    );
    hydrationInsight = hv.insight ?? hv.riskReason ?? '';
    hydrationExplainability = hv.explainability ?? null;
  } else if (hydration.status === 'rejected') {
    console.error('[userSignalCacheService] hydrationSignalService failed:', hydration.reason);
  }

  // ── Activity extraction ────────────────────────────────────────────────────
  let inPostWorkoutWindow = false;
  let proteinUrgency = 0;
  let carbUrgency = 0;
  let antiInflammatoryBonus = 0;
  let activityInsight = '';
  let activityExplainability = null;

  if (activity.status === 'fulfilled' && activity.value != null) {
    const av = activity.value;
    inPostWorkoutWindow = Boolean(av.inPostWorkoutWindow ?? false);
    proteinUrgency = clamp01(av.proteinUrgency ?? 0);
    carbUrgency = clamp01(av.carbUrgency ?? 0);
    antiInflammatoryBonus = clamp01(av.antiInflammatoryBonus ?? 0);
    activityInsight = av.insight ?? '';
    activityExplainability = av.explainability ?? null;
  } else if (activity.status === 'rejected') {
    console.error('[userSignalCacheService] activitySignalService failed:', activity.reason);
  }

  return {
    moodUrgency,
    energyUrgency,
    moodBoostWeight,
    moodConfidence,
    moodConfidenceLabel,
    hydrationUrgency,
    inPostWorkoutWindow,
    proteinUrgency,
    carbUrgency,
    antiInflammatoryBonus,
    insights: {
      mood: moodInsight,
      hydration: hydrationInsight,
      activity: activityInsight,
    },
    explainability: {
      mood: moodExplainability,
      hydration: hydrationExplainability,
      activity: activityExplainability,
    },
  };
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Clamp a value to [0, 1], coercing NaN/null/undefined to 0.
 *
 * @param {number} value
 * @returns {number}
 */
function clamp01(value) {
  const n = Number(value);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function hydrationRiskToUrgency(risk) {
  const key = String(risk ?? '').toLowerCase();
  if (key === 'high' || key === 'severe') return 0.9;
  if (key === 'moderate') return 0.55;
  if (key === 'low') return 0.2;
  return 0;
}

function getCacheKey(userId, options = {}) {
  const offset = Number(options.timezoneOffset);
  return Number.isFinite(offset) ? `${userId}:tz:${offset}` : userId;
}
