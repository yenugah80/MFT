/**
 * Hydration Signal Service
 *
 * Real-time, actionable hydration intelligence layer that sits between raw
 * water logs and downstream consumers (push notifications, dashboard widgets,
 * reminder scheduling, pattern mining).
 *
 * RESPONSIBILITIES
 * ----------------
 * 1. Compute the canonical "hydration signal" for a user at a point in time:
 *    - Current intake vs. goal (absolute + %)
 *    - Caffeine load relative to the FDA 400 mg/day limit
 *    - Hours since last sip
 *    - Velocity (ml/hour over the last rolling window)
 *    - Dehydration risk level (NONE | LOW | MODERATE | HIGH | CRITICAL)
 *    - Whether the daily goal has already been met
 *
 * 2. Emit structured signal objects consumed by:
 *    - smartReminderService  → decides *when* to push a nudge
 *    - wittyMessageEngine    → decides *what* to say
 *    - patternMiningService  → detects cross-domain correlations
 *    - hydrationAnalyticsService → persists daily summaries
 *
 * 3. Maintain an in-process LRU-style cache so the hot path (dashboard
 *    refresh, rapid consecutive API calls) never hits the database more
 *    than once per TTL window.
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Zero external network calls – pure DB + in-memory
 * - Graceful degradation: every function returns a safe default on error
 * - All monetary constants (goal, limits) come from user's goals row, never
 *   hardcoded for the result (only the defaults are hardcoded)
 * - Explainability: every signal object carries the data points that
 *   produced it so consumers can render transparent UI
 *
 * BEVERAGE HYDRATION FACTORS (BHI – research backed)
 * ---------------------------------------------------
 * Identical to the values in backend/src/routes/water.js so they stay
 * in sync. If you change one, change both.
 */

import { db } from '../config/db.js';
import {
  waterLogTable,
  nutritionGoalsTable,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getLocalDayRange } from '../utils/timezone.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Beverage Hydration Index factors – keep in sync with water.js
 * Source: https://ajcn.nutrition.org/article/S0002-9165(22)06556-X/fulltext
 */
export const BEVERAGE_FACTORS = {
  water:           1.00,
  sparkling:       1.00,
  herbal:          1.00,
  tea:             1.00,
  coffee:          1.00,  // Myth debunked – not diuretic at normal doses
  milk:            1.50,
  milkSkim:        1.58,
  juice:           1.39,
  smoothie:        1.10,
  soda:            1.00,
  electrolyte:     1.10,
  coconut:         1.05,
  sports:          1.05,
  energy:          1.00,
  alcohol_beer:    0.85,
  alcohol_wine:    0.80,
  alcohol_spirits: 0.70,
};

/**
 * Caffeine content in mg per 250 ml serving.
 * Scale to actual volume: (amountLiters * caffeinePerServing * 4).
 */
export const CAFFEINE_PER_250ML = {
  water:           0,
  sparkling:       0,
  herbal:          0,
  milk:            0,
  milkSkim:        0,
  juice:           0,
  coconut:         0,
  smoothie:        0,
  coffee:          95,
  tea:             47,
  soda:            35,
  energy:          80,
  sports:          0,
  electrolyte:     0,
  alcohol_beer:    0,
  alcohol_wine:    0,
  alcohol_spirits: 0,
};

/**
 * FDA recommended maximum daily caffeine intake (mg).
 */
export const CAFFEINE_DAILY_LIMIT_MG = 400;

/**
 * Default daily water goal in litres when the user has no goals row.
 */
const DEFAULT_WATER_GOAL_LITERS = 2.0;

/**
 * Risk levels used in the hydration signal.
 */
export const DEHYDRATION_RISK = {
  NONE:     'NONE',
  LOW:      'LOW',
  MODERATE: 'MODERATE',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
};

/**
 * Velocity window: rolling period (ms) over which ml/hour is computed.
 */
const VELOCITY_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * In-process signal cache.
 * Key: `${userId}:${tzOffsetMinutes}`
 * Value: { signal, expiresAt }
 */
const signalCache = new Map();
const SIGNAL_CACHE_TTL_MS = 60 * 1000; // 1 minute – short because signals are time-sensitive

// ============================================================================
// TYPES (JSDoc only – project uses plain JS)
// ============================================================================

/**
 * @typedef {Object} HydrationSignal
 * @property {string}  userId
 * @property {number}  goalLiters           - User's daily water goal
 * @property {number}  goalMl               - goalLiters * 1000
 * @property {number}  consumedLiters       - Effective hydration so far today (after BHI factors)
 * @property {number}  consumedMl           - consumedLiters * 1000
 * @property {number}  remainingLiters      - max(0, goalLiters - consumedLiters)
 * @property {number}  remainingMl          - remainingLiters * 1000
 * @property {number}  percentageComplete   - 0-100+
 * @property {boolean} goalMet              - consumedLiters >= goalLiters
 * @property {number}  logCountToday        - Number of individual log entries today
 * @property {number}  caffeineMgToday      - Total caffeine logged today (mg)
 * @property {string}  caffeineStatus       - 'low' | 'moderate' | 'high' | 'excessive'
 * @property {string|null} caffeineWarning  - Human-readable warning or null
 * @property {number|null} minutesSinceLastSip - null if no logs today
 * @property {number|null} hoursSinceLastSip   - rounded to 1 dp, null if no logs today
 * @property {number}  velocityMlPerHour    - ml/hour over the last VELOCITY_WINDOW_MS
 * @property {string}  dehydrationRisk      - DEHYDRATION_RISK enum value
 * @property {string}  riskReason           - Human-readable explanation of the risk
 * @property {object}  beverageBreakdown    - { [type]: { volumeMl, percentage } }
 * @property {Array}   recentLogs           - Last 5 log entries (for UI display)
 * @property {object}  explainability       - Data lineage for transparent UI
 * @property {string}  generatedAt          - ISO timestamp
 */

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compute and return the canonical hydration signal for a user.
 *
 * This is the primary entry point for all consumers. Results are cached for
 * SIGNAL_CACHE_TTL_MS to absorb burst traffic (e.g. dashboard + reminders
 * both resolving within the same second).
 *
 * @param {string} userId
 * @param {number} [tzOffsetMinutes=0] - Client timezone offset in minutes
 * @param {boolean} [forceRefresh=false] - Bypass cache
 * @returns {Promise<HydrationSignal>}
 */
export async function getHydrationSignal(userId, tzOffsetMinutes = 0, forceRefresh = false) {
  const cacheKey = `${userId}:${tzOffsetMinutes}`;

  if (!forceRefresh) {
    const cached = signalCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.signal;
    }
  }

  try {
    const signal = await _buildSignal(userId, tzOffsetMinutes);
    signalCache.set(cacheKey, {
      signal,
      expiresAt: Date.now() + SIGNAL_CACHE_TTL_MS,
    });
    return signal;
  } catch (error) {
    console.error('[HydrationSignal] getHydrationSignal error:', error);
    return _safeDefault(userId);
  }
}

/**
 * Invalidate the cached signal for a user.
 * Call this immediately after a new water log is recorded so that the next
 * dashboard refresh sees fresh data.
 *
 * @param {string} userId
 */
export function invalidateSignalCache(userId) {
  for (const key of signalCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      signalCache.delete(key);
    }
  }
}

/**
 * Compute the dehydration risk level given a partial signal context.
 * Exported for unit-testing and for consumers that already have the data.
 *
 * @param {object} ctx
 * @param {number} ctx.percentageComplete
 * @param {number|null} ctx.hoursSinceLastSip
 * @param {number} ctx.velocityMlPerHour
 * @param {number} ctx.currentHour  - 0-23
 * @returns {{ level: string, reason: string }}
 */
export function computeDehydrationRisk({
  percentageComplete,
  hoursSinceLastSip,
  velocityMlPerHour,
  currentHour,
}) {
  // Late-day / end-of-day: if far behind, escalate
  const isLateDay = currentHour >= 19;
  const isMidDay  = currentHour >= 12 && currentHour < 19;

  // 1. Critical: almost no intake AND it's late in the day
  if (percentageComplete < 20 && isLateDay) {
    return {
      level: DEHYDRATION_RISK.CRITICAL,
      reason: 'Very low hydration late in the day – drink water now',
    };
  }

  // 2. High: significantly below target by mid/late day, or very long gap
  if (
    (percentageComplete < 35 && isLateDay) ||
    (percentageComplete < 25 && isMidDay) ||
    (hoursSinceLastSip !== null && hoursSinceLastSip >= 5)
  ) {
    return {
      level: DEHYDRATION_RISK.HIGH,
      reason: hoursSinceLastSip >= 5
        ? `No water logged in ${hoursSinceLastSip.toFixed(1)} hours`
        : 'Well behind daily hydration goal',
    };
  }

  // 3. Moderate: behind pace or extended gap
  if (
    (percentageComplete < 50 && isMidDay) ||
    (percentageComplete < 60 && isLateDay) ||
    (hoursSinceLastSip !== null && hoursSinceLastSip >= 3) ||
    velocityMlPerHour < 50
  ) {
    return {
      level: DEHYDRATION_RISK.MODERATE,
      reason: hoursSinceLastSip >= 3
        ? `No water in ${hoursSinceLastSip.toFixed(1)} hours – worth a sip`
        : 'Hydration pace is below recommended rate',
    };
  }

  // 4. Low: on track but not yet there
  if (!percentageComplete || percentageComplete < 80) {
    return {
      level: DEHYDRATION_RISK.LOW,
      reason: 'On track – keep sipping steadily',
    };
  }

  // 5. None: goal met or nearly met
  return {
    level: DEHYDRATION_RISK.NONE,
    reason: 'Hydration goal achieved – great work',
  };
}

/**
 * Return a lightweight summary suitable for embedding in cross-domain
 * recommendation payloads (e.g. the recommendations route) without loading
 * the full signal object.
 *
 * @param {string} userId
 * @param {number} [tzOffsetMinutes=0]
 * @returns {Promise<{ consumedMl: number, goalMl: number, percentageComplete: number, dehydrationRisk: string, goalMet: boolean }>}
 */
export async function getHydrationSummary(userId, tzOffsetMinutes = 0) {
  try {
    const signal = await getHydrationSignal(userId, tzOffsetMinutes);
    return {
      consumedMl:         signal.consumedMl,
      goalMl:             signal.goalMl,
      percentageComplete: signal.percentageComplete,
      dehydrationRisk:    signal.dehydrationRisk,
      goalMet:            signal.goalMet,
    };
  } catch (error) {
    console.error('[HydrationSignal] getHydrationSummary error:', error);
    return {
      consumedMl:         0,
      goalMl:             Math.round(DEFAULT_WATER_GOAL_LITERS * 1000),
      percentageComplete: 0,
      dehydrationRisk:    DEHYDRATION_RISK.MODERATE,
      goalMet:            false,
    };
  }
}

/**
 * Determine if the user needs a hydration nudge right now.
 * Thin wrapper used by smartReminderService to avoid duplicating risk logic.
 *
 * @param {string} userId
 * @param {number} [tzOffsetMinutes=0]
 * @returns {Promise<{ needsNudge: boolean, risk: string, reason: string, context: object }>}
 */
export async function evaluateNudgeEligibility(userId, tzOffsetMinutes = 0) {
  try {
    const signal = await getHydrationSignal(userId, tzOffsetMinutes);

    const needsNudge =
      signal.dehydrationRisk === DEHYDRATION_RISK.CRITICAL ||
      signal.dehydrationRisk === DEHYDRATION_RISK.HIGH     ||
      signal.dehydrationRisk === DEHYDRATION_RISK.MODERATE;

    return {
      needsNudge,
      risk:   signal.dehydrationRisk,
      reason: signal.riskReason,
      context: {
        consumedMl:         signal.consumedMl,
        goalMl:             signal.goalMl,
        percentageComplete: signal.percentageComplete,
        remainingMl:        signal.remainingMl,
        hoursSinceLastSip:  signal.hoursSinceLastSip,
        velocityMlPerHour:  signal.velocityMlPerHour,
        logCountToday:      signal.logCountToday,
        caffeineMgToday:    signal.caffeineMgToday,
        caffeineStatus:     signal.caffeineStatus,
      },
    };
  } catch (error) {
    console.error('[HydrationSignal] evaluateNudgeEligibility error:', error);
    return {
      needsNudge: false,
      risk:       DEHYDRATION_RISK.MODERATE,
      reason:     'Unable to evaluate – using conservative default',
      context:    {},
    };
  }
}

/**
 * Compute the hydration contribution of a single beverage log entry.
 * Used by water.js after inserting a log so it can return enriched data
 * without a second DB round-trip.
 *
 * @param {object} params
 * @param {number} params.amountLiters
 * @param {string} [params.beverageType='water']
 * @returns {{ hydrationLiters: number, caffeineMg: number, factor: number }}
 */
export function computeBeverageContribution({ amountLiters, beverageType = 'water' }) {
  const type   = (beverageType || 'water').toLowerCase();
  const factor = BEVERAGE_FACTORS[type] ?? BEVERAGE_FACTORS.water;
  const caffeinePer250ml = CAFFEINE_PER_250ML[type] ?? 0;

  return {
    hydrationLiters: parseFloat((amountLiters * factor).toFixed(3)),
    caffeineMg:      Math.round(amountLiters * caffeinePer250ml * 4),
    factor,
  };
}

// ============================================================================
// INTERNAL – SIGNAL BUILDER
// ============================================================================

/**
 * Core signal computation.  Queries the DB and assembles all derived values.
 *
 * @param {string} userId
 * @param {number} tzOffsetMinutes
 * @returns {Promise<HydrationSignal>}
 */
async function _buildSignal(userId, tzOffsetMinutes) {
  const { start: dayStart, end: dayEnd } = getLocalDayRange(tzOffsetMinutes);
  const now = new Date();
  const currentHour = now.getHours();

  // Run goal query and today's log query in parallel
  const [goalsRows, todayLogs] = await Promise.all([
    db
      .select()
      .from(nutritionGoalsTable)
      .where(eq(nutritionGoalsTable.userId, userId))
      .limit(1),

    db
      .select()
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, userId),
          gte(waterLogTable.loggedDate, dayStart),
          lte(waterLogTable.loggedDate, dayEnd)
        )
      )
      .orderBy(desc(waterLogTable.loggedDate)),
  ]);

  // ── Goals ─────────────────────────────────────────────────────────────────
  const goals       = goalsRows[0] ?? null;
  const goalLiters  = parseFloat(goals?.waterLiters) || DEFAULT_WATER_GOAL_LITERS;
  const goalMl      = Math.round(goalLiters * 1000);

  // ── Totals ────────────────────────────────────────────────────────────────
  let consumedLiters  = 0;
  let caffeineMgToday = 0;
  const beverageAccumulator = {}; // { [type]: ml }

  todayLogs.forEach((log) => {
    // Prefer the stored hydrationLiters (already factor-adjusted at insert time)
    const hydration = parseFloat(log.hydrationLiters || log.amountLiters || 0);
    consumedLiters += hydration;

    // Caffeine
    const type = (log.beverageType || 'water').toLowerCase();
    const caffeinePer250ml = CAFFEINE_PER_250ML[type] ?? 0;
    caffeineMgToday += Math.round(parseFloat(log.amountLiters || 0) * caffeinePer250ml * 4);

    // Beverage breakdown (use raw amountLiters for visual breakdown)
    const rawMl = parseFloat(log.amountLiters || 0) * 1000;
    beverageAccumulator[type] = (beverageAccumulator[type] || 0) + rawMl;
  });

  const consumedMl        = Math.round(consumedLiters * 1000);
  const remainingLiters   = Math.max(0, goalLiters - consumedLiters);
  const remainingMl       = Math.round(remainingLiters * 1000);
  const percentageComplete = goalLiters > 0
    ? Math.round((consumedLiters / goalLiters) * 100)
    : 0;
  const goalMet = consumedLiters >= goalLiters;

  // ── Beverage breakdown (with percentages) ─────────────────────────────────
  const totalRawMl = Object.values(beverageAccumulator).reduce((a, b) => a + b, 0);
  const beverageBreakdown = {};
  Object.entries(beverageAccumulator).forEach(([type, volumeMl]) => {
    beverageBreakdown[type] = {
      volumeMl:   Math.round(volumeMl),
      percentage: totalRawMl > 0 ? Math.round((volumeMl / totalRawMl) * 100) : 0,
    };
  });

  // ── Caffeine status ───────────────────────────────────────────────────────
  let caffeineStatus  = 'low';
  let caffeineWarning = null;
  if (caffeineMgToday > CAFFEINE_DAILY_LIMIT_MG) {
    caffeineStatus  = 'excessive';
    caffeineWarning = 'Over recommended daily limit (400 mg)';
  } else if (caffeineMgToday > 300) {
    caffeineStatus  = 'high';
    caffeineWarning = 'Approaching daily caffeine limit';
  } else if (caffeineMgToday > 200) {
    caffeineStatus = 'moderate';
  }

  // ── Last sip timing ───────────────────────────────────────────────────────
  let minutesSinceLastSip = null;
  let hoursSinceLastSip   = null;

  if (todayLogs.length > 0) {
    // todayLogs is DESC ordered, so [0] is the most recent
    const lastLogDate = new Date(todayLogs[0].loggedDate);
    minutesSinceLastSip = Math.floor((now.getTime() - lastLogDate.getTime()) / (1000 * 60));
    hoursSinceLastSip   = parseFloat((minutesSinceLastSip / 60).toFixed(1));
  }

  // ── Velocity (ml/hour over VELOCITY_WINDOW_MS) ────────────────────────────
  const velocityWindowStart = new Date(now.getTime() - VELOCITY_WINDOW_MS);
  const velocityLogs = todayLogs.filter(
    (log) => new Date(log.loggedDate) >= velocityWindowStart
  );
  const velocityMl = velocityLogs.reduce(
    (sum, log) => sum + parseFloat(log.hydrationLiters || log.amountLiters || 0) * 1000,
    0
  );
  const velocityWindowHours = VELOCITY_WINDOW_MS / (1000 * 60 * 60);
  const velocityMlPerHour   = Math.round(velocityMl / velocityWindowHours);

  // ── Risk level ────────────────────────────────────────────────────────────
  const { level: dehydrationRisk, reason: riskReason } = computeDehydrationRisk({
    percentageComplete,
    hoursSinceLastSip,
    velocityMlPerHour,
    currentHour,
  });

  // ── Recent logs (last 5 for UI) ───────────────────────────────────────────
  const recentLogs = todayLogs.slice(0, 5).map((log) => ({
    id:             log.id,
    amountLiters:   parseFloat(log.amountLiters || 0),
    hydrationLiters: parseFloat(log.hydrationLiters || log.amountLiters || 0),
    beverageType:   log.beverageType || 'water',
    loggedDate:     log.loggedDate,
  }));

  // ── Assemble signal ───────────────────────────────────────────────────────
  return {
    userId,
    goalLiters,
    goalMl,
    consumedLiters: parseFloat(consumedLiters.toFixed(3)),
    consumedMl,
    remainingLiters: parseFloat(remainingLiters.toFixed(3)),
    remainingMl,
    percentageComplete,
    goalMet,
    logCountToday: todayLogs.length,
    caffeineMgToday,
    caffeineStatus,
    caffeineWarning,
    minutesSinceLastSip,
    hoursSinceLastSip,
    velocityMlPerHour,
    dehydrationRisk,
    riskReason,
    beverageBreakdown,
    recentLogs,
    explainability: {
      dayStart:            dayStart.toISOString(),
      dayEnd:              dayEnd.toISOString(),
      tzOffsetMinutes,
      logsAnalyzed:        todayLogs.length,
      velocityWindowHours,
      velocityWindowLogs:  velocityLogs.length,
      goalSource:          goals ? 'user_goals_table' : 'default',
      caffeineLimitMg:     CAFFEINE_DAILY_LIMIT_MG,
    },
    generatedAt: now.toISOString(),
  };
}

// ============================================================================
// INTERNAL – SAFE DEFAULT
// ============================================================================

/**
 * Return a zero-state signal so callers never receive null / undefined.
 *
 * @param {string} userId
 * @returns {HydrationSignal}
 */
function _safeDefault(userId) {
  const goalMl = Math.round(DEFAULT_WATER_GOAL_LITERS * 1000);
  return {
    userId,
    goalLiters:          DEFAULT_WATER_GOAL_LITERS,
    goalMl,
    consumedLiters:      0,
    consumedMl:          0,
    remainingLiters:     DEFAULT_WATER_GOAL_LITERS,
    remainingMl:         goalMl,
    percentageComplete:  0,
    goalMet:             false,
    logCountToday:       0,
    caffeineMgToday:     0,
    caffeineStatus:      'low',
    caffeineWarning:     null,
    minutesSinceLastSip: null,
    hoursSinceLastSip:   null,
    velocityMlPerHour:   0,
    dehydrationRisk:     DEHYDRATION_RISK.MODERATE,
    riskReason:          'Signal unavailable – using safe default',
    beverageBreakdown:   {},
    recentLogs:          [],
    explainability:      { error: 'safe_default' },
    generatedAt:         new Date().toISOString(),
  };
}

// ============================================================================
// CACHE MAINTENANCE
// ============================================================================

/**
 * Prune expired entries from the in-process cache.
 * Called on a low-frequency timer to prevent unbounded growth in long-running
 * processes with many users.
 */
function _pruneExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of signalCache.entries()) {
    if (entry.expiresAt <= now) {
      signalCache.delete(key);
    }
  }
}

// Prune every 5 minutes – the cache is small so this is plenty
setInterval(_pruneExpiredCache, 5 * 60 * 1000);

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Constants
  BEVERAGE_FACTORS,
  CAFFEINE_PER_250ML,
  CAFFEINE_DAILY_LIMIT_MG,
  DEHYDRATION_RISK,

  // Core API
  getHydrationSignal,
  invalidateSignalCache,
  getHydrationSummary,
  evaluateNudgeEligibility,
  computeBeverageContribution,
  computeDehydrationRisk,
};
