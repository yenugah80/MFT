/**
 * Activity Signal Service
 *
 * Computes post-workout metabolic signals that drive nutrition recommendations:
 *   - Anabolic window detection (strength/HIIT within 90 min)
 *   - EPOC (Excess Post-exercise Oxygen Consumption) hours & extra calories
 *   - Weekly load score for recovery assessment
 *   - Protein / carb urgency scores for the recommendation engine
 *
 * References:
 *   Borsheim & Bahr (2003) – Effect of exercise intensity, duration and mode
 *   on post-exercise oxygen consumption. Sports Medicine 33(14):1037-1060.
 */

import { db } from '../config/db.js';
import { activityLogTable } from '../db/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';
// ACTIVITY_TYPES / INTENSITY_LEVELS imported for future extensibility
import { ACTIVITY_TYPES, INTENSITY_LEVELS } from './metCalorieService.js'; // eslint-disable-line no-unused-vars

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * EPOC duration table (hours) by activity type and intensity.
 * Source: Borsheim & Bahr 2003, supplemented by Laforgia et al. 2006.
 *
 * Schema intensity values: 'light' | 'moderate' | 'vigorous'
 * The prompt spec uses 'low' | 'moderate' | 'high' as keys — we map them here
 * so the object stays readable by sport scientists while matching the DB values.
 */
const EPOC_HOURS = {
  strength:    { vigorous: 24, moderate: 16, light: 8  },
  hiit:        { vigorous: 24, moderate: 18, light: 12 },
  cardio:      { vigorous: 14, moderate: 8,  light: 3  },
  flexibility: { vigorous: 2,  moderate: 1,  light: 0.5 },
  walking:     { vigorous: 3,  moderate: 2,  light: 1  },
  default:     { vigorous: 8,  moderate: 4,  light: 2  },
};

/**
 * Activity types that trigger the anabolic window logic.
 * Matched via case-insensitive substring against the DB `type` field.
 */
const STRENGTH_TYPES = [
  'strength',
  'weight_training',
  'resistance',
  'hiit',
  'crossfit',
  'circuit',
];

/** Minutes defining the anabolic / post-workout window. */
const ANABOLIC_WINDOW_MINUTES = 90;

/** Intensity weights for weekly load score calculation. */
const INTENSITY_WEIGHTS = {
  vigorous: 1.5,
  moderate: 1.0,
  light: 0.5,
};

/**
 * Normalisation denominator for weekly load score.
 * Represents a "very high load" week (e.g. 7 × 57 min vigorous = ~600 pts).
 */
const WEEKLY_LOAD_NORMALISER = 600;

/**
 * Approximate extra calories burned per hour during EPOC.
 * Conservative estimate; real value varies widely with individual VO2max.
 */
const EPOC_EXTRA_CALORIES_PER_HOUR = 15;

/**
 * Target protein intake (grams) immediately post-workout.
 * Based on Morton et al. 2018 meta-analysis (~0.4 g/kg → ~28 g for 70 kg).
 */
const POST_WORKOUT_PROTEIN_TARGET_G = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return true when the activity type string indicates a strength/HIIT session.
 * Uses case-insensitive substring matching to handle compound type strings.
 *
 * @param {string} type - Activity type from DB (`activityLogTable.type`)
 * @returns {boolean}
 */
function isStrengthOrHiit(type) {
  if (!type) return false;
  const lower = type.toLowerCase();
  return STRENGTH_TYPES.some((t) => lower.includes(t));
}

/**
 * Look up EPOC duration (hours) for a given type + intensity combination.
 *
 * @param {string} type      - Activity type (e.g. 'strength', 'cardio')
 * @param {string} intensity - 'light' | 'moderate' | 'vigorous'
 * @returns {number} EPOC hours
 */
function getEpocHours(type, intensity) {
  const lower = (type || '').toLowerCase();
  const table = EPOC_HOURS[lower] ?? EPOC_HOURS.default;
  return table[intensity] ?? table.moderate;
}

/**
 * Clamp a value between min and max (inclusive).
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a float to a given number of decimal places.
 *
 * @param {number} value
 * @param {number} decimals
 * @returns {number}
 */
function round(value, decimals = 2) {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

// ---------------------------------------------------------------------------
// Cold-start (no data) return shape
// ---------------------------------------------------------------------------

function buildColdStartSignal() {
  return {
    inAnabolicWindow: false,
    minutesSinceLastWorkout: null,
    lastWorkoutType: null,
    lastWorkoutIntensity: null,
    epocActive: false,
    epocHoursRemaining: 0,
    epocExtraCaloriesPerHour: 0,
    todayCaloriesBurned: 0,
    weeklyLoadScore: 0,
    recoveryNeeded: false,
    proteinUrgency: 0,
    carbUrgency: 0,
    antiInflammatoryBonus: 0,
    inPostWorkoutWindow: false,
    postWorkoutProteinTarget: 0,
    insight: null,
    hasData: false,
  };
}

// ---------------------------------------------------------------------------
// DB queries
// ---------------------------------------------------------------------------

/**
 * Fetch the most recent activity log entry for a user.
 *
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function fetchLastActivity(userId) {
  const rows = await db
    .select()
    .from(activityLogTable)
    .where(eq(activityLogTable.userId, userId))
    .orderBy(desc(activityLogTable.loggedAt))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Fetch all activity logs for a user within the last N days.
 *
 * @param {string} userId
 * @param {number} days  - Look-back window (default 7)
 * @returns {Promise<Object[]>}
 */
async function fetchRecentActivities(userId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return db
    .select()
    .from(activityLogTable)
    .where(
      and(
        eq(activityLogTable.userId, userId),
        gte(activityLogTable.loggedAt, since),
      ),
    )
    .orderBy(desc(activityLogTable.loggedAt));
}

/**
 * Fetch activity logs for today (calendar day in UTC).
 *
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
async function fetchTodayActivities(userId) {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  return db
    .select()
    .from(activityLogTable)
    .where(
      and(
        eq(activityLogTable.userId, userId),
        gte(activityLogTable.loggedAt, startOfDay),
      ),
    );
}

// ---------------------------------------------------------------------------
// Signal computation helpers
// ---------------------------------------------------------------------------

/**
 * Compute the weekly load score (0–1) from a list of activity rows.
 *
 * Score = Σ(intensityWeight × durationMinutes) / WEEKLY_LOAD_NORMALISER
 * Clamped to [0, 1].
 *
 * @param {Object[]} activities - Rows from activityLogTable
 * @returns {number} weeklyLoadScore ∈ [0, 1]
 */
function computeWeeklyLoadScore(activities) {
  const raw = activities.reduce((sum, row) => {
    const weight = INTENSITY_WEIGHTS[row.intensity] ?? INTENSITY_WEIGHTS.moderate;
    return sum + weight * (row.durationMinutes ?? 0);
  }, 0);

  return round(clamp(raw / WEEKLY_LOAD_NORMALISER, 0, 1), 3);
}

/**
 * Sum calories burned across an array of activity rows.
 * Falls back to 0 when caloriesBurned is null/undefined.
 *
 * @param {Object[]} activities
 * @returns {number}
 */
function sumCaloriesBurned(activities) {
  return activities.reduce((sum, row) => sum + (row.caloriesBurned ?? 0), 0);
}

/**
 * Build a human-readable insight string for the last workout.
 *
 * @param {Object} params
 * @param {boolean} params.inAnabolicWindow
 * @param {boolean} params.epocActive
 * @param {number}  params.epocHoursRemaining
 * @param {boolean} params.recoveryNeeded
 * @param {string}  params.lastWorkoutType
 * @param {string}  params.lastWorkoutIntensity
 * @param {number}  params.minutesSinceLastWorkout
 * @returns {string|null}
 */
function buildInsight({
  inAnabolicWindow,
  epocActive,
  epocHoursRemaining,
  recoveryNeeded,
  lastWorkoutType,
  lastWorkoutIntensity,
  minutesSinceLastWorkout,
}) {
  if (inAnabolicWindow) {
    return (
      `You're in the post-workout anabolic window after your ` +
      `${lastWorkoutIntensity} ${lastWorkoutType} session. ` +
      `Prioritise protein and fast carbs now for optimal recovery.`
    );
  }

  if (recoveryNeeded) {
    return (
      `Your weekly training load is high. Consider a recovery day with ` +
      `anti-inflammatory foods (fatty fish, berries, leafy greens).`
    );
  }

  if (epocActive) {
    const hrs = round(epocHoursRemaining, 1);
    return (
      `EPOC is still active (~${hrs}h remaining) from your last ` +
      `${lastWorkoutType} session. Your metabolism is elevated — ` +
      `support recovery with adequate protein.`
    );
  }

  if (minutesSinceLastWorkout !== null) {
    const hours = Math.round(minutesSinceLastWorkout / 60);
    return (
      `Last activity was ~${hours}h ago (${lastWorkoutIntensity} ${lastWorkoutType}). ` +
      `Keep up regular movement for sustained metabolic health.`
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the full activity signal for a user.
 *
 * Performs three DB queries (last activity, today's activities, 7-day window)
 * and derives all downstream metrics from the results.
 *
 * @param {string} userId   - Clerk user ID
 * @param {Object} [options]
 * @param {number} [options.lookbackDays=7] - Days used for weekly load score
 * @returns {Promise<ActivitySignal>}
 */
export async function computeActivitySignal(userId, options = {}) {
  const { lookbackDays = 7 } = options;

  // ── 1. Fetch data ────────────────────────────────────────────────────────
  const [lastActivity, todayActivities, weeklyActivities] = await Promise.all([
    fetchLastActivity(userId),
    fetchTodayActivities(userId),
    fetchRecentActivities(userId, lookbackDays),
  ]);

  // Cold start — user has no activity logs yet
  if (!lastActivity) {
    return buildColdStartSignal();
  }

  // ── 2. Time since last workout ───────────────────────────────────────────
  const now = new Date();
  const lastLoggedAt = new Date(lastActivity.loggedAt);
  const minutesSinceLastWorkout = round(
    (now - lastLoggedAt) / (1000 * 60),
    1,
  );

  const lastWorkoutType = lastActivity.type ?? 'general';
  const lastWorkoutIntensity = lastActivity.intensity ?? 'moderate';

  // ── 3. Anabolic window ───────────────────────────────────────────────────
  const inAnabolicWindow =
    isStrengthOrHiit(lastWorkoutType) &&
    minutesSinceLastWorkout <= ANABOLIC_WINDOW_MINUTES;

  // ── 4. EPOC ──────────────────────────────────────────────────────────────
  const epocTotalHours = getEpocHours(lastWorkoutType, lastWorkoutIntensity);
  const hoursElapsed = minutesSinceLastWorkout / 60;
  const rawEpocRemaining = epocTotalHours - hoursElapsed;
  const epocActive = rawEpocRemaining > 0;
  const epocHoursRemaining = epocActive ? round(rawEpocRemaining, 2) : 0;
  const epocExtraCaloriesPerHour = epocActive ? EPOC_EXTRA_CALORIES_PER_HOUR : 0;

  // ── 5. Today's calorie burn ──────────────────────────────────────────────
  const todayCaloriesBurned = sumCaloriesBurned(todayActivities);

  // ── 6. Weekly load score ─────────────────────────────────────────────────
  const weeklyLoadScore = computeWeeklyLoadScore(weeklyActivities);

  // Recovery flag: load > 0.8 or EPOC still active after a vigorous session
  const recoveryNeeded =
    weeklyLoadScore > 0.8 ||
    (lastWorkoutIntensity === 'vigorous' && epocHoursRemaining > 12);

  // ── 7. Nutritional urgency scores ────────────────────────────────────────
  let proteinUrgency = 0;
  if (inAnabolicWindow && lastWorkoutIntensity === 'vigorous') {
    proteinUrgency = 0.9;
  } else if (inAnabolicWindow) {
    proteinUrgency = 0.6;
  } else if (epocActive) {
    proteinUrgency = 0.4;
  }

  let carbUrgency = 0;
  if (inAnabolicWindow) {
    carbUrgency = 0.4;
  } else if (epocActive) {
    carbUrgency = 0.3;
  }

  // Anti-inflammatory bonus activates when weekly load is high (> 0.7)
  const rawAntiInflam = weeklyLoadScore > 0.7
    ? (weeklyLoadScore - 0.7) * 3
    : 0;
  const antiInflammatoryBonus = round(clamp(rawAntiInflam, 0, 1), 3);

  // ── 8. Post-workout protein target ───────────────────────────────────────
  const postWorkoutProteinTarget = inAnabolicWindow
    ? POST_WORKOUT_PROTEIN_TARGET_G
    : 0;

  // ── 9. Insight string ────────────────────────────────────────────────────
  const insight = buildInsight({
    inAnabolicWindow,
    epocActive,
    epocHoursRemaining,
    recoveryNeeded,
    lastWorkoutType,
    lastWorkoutIntensity,
    minutesSinceLastWorkout,
  });

  // ── 10. Assemble result ──────────────────────────────────────────────────
  return {
    inAnabolicWindow,
    minutesSinceLastWorkout,
    lastWorkoutType,
    lastWorkoutIntensity,
    epocActive,
    epocHoursRemaining,
    epocExtraCaloriesPerHour,
    todayCaloriesBurned,
    weeklyLoadScore,
    recoveryNeeded,
    proteinUrgency: round(proteinUrgency, 2),
    carbUrgency: round(carbUrgency, 2),
    antiInflammatoryBonus,
    inPostWorkoutWindow: inAnabolicWindow, // alias
    postWorkoutProteinTarget,
    insight,
    hasData: true,
  };
}

/**
 * Lightweight wrapper around `computeActivitySignal` for the recommendation
 * engine — returns only the fields needed to adjust food suggestions.
 *
 * @param {string} userId - Clerk user ID
 * @returns {Promise<ActivityInsightForRecommendation>}
 */
export async function getActivityInsightForRecommendation(userId) {
  const signal = await computeActivitySignal(userId);

  return {
    inPostWorkoutWindow: signal.inPostWorkoutWindow,
    proteinUrgency: signal.proteinUrgency,
    carbUrgency: signal.carbUrgency,
    antiInflammatoryBonus: signal.antiInflammatoryBonus,
    epocActive: signal.epocActive,
    recoveryNeeded: signal.recoveryNeeded,
    insight: signal.insight,
  };
}
