/**
 * moodSignalService.js
 *
 * Computes mood signals for recommendations using timezone-aware local day
 * grouping, cold-start guards, confidence labels, and privacy-safe copy.
 */

import { db } from '../config/db.js';
import { moodLogTable, foodLogTable } from '../db/schema.js';
import { eq, and, gte, desc } from 'drizzle-orm';
import { getDayKey } from '../utils/timezone.js';

const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_CORRELATION_LOOKBACK_DAYS = 30;
const DEFAULT_MIN_TOTAL_LOGS = 5;
const DEFAULT_MIN_DISTINCT_DAYS = 2;
const MAX_OFFSET_MINUTES = 14 * 60;

const MOOD_SCORE_MAP = {
  ecstatic: 10,
  excited: 9,
  happy: 8,
  good: 7,
  okay: 6,
  neutral: 5,
  meh: 5,
  anxious: 4,
  stressed: 4,
  sad: 3,
  down: 3,
  angry: 2,
  terrible: 1,
  awful: 1,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, places = 2) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function moodToScore(moodLog) {
  const intensity = Number(moodLog.intensity);
  if (Number.isFinite(intensity) && intensity >= 1 && intensity <= 10) {
    return intensity;
  }

  const key = (moodLog.mood || '').toLowerCase().trim();
  return MOOD_SCORE_MAP[key] ?? 5;
}

function energyToScore(moodLog) {
  const energy = Number(moodLog.energyLevel);
  if (Number.isFinite(energy) && energy >= 1 && energy <= 10) {
    return energy;
  }
  return moodToScore(moodLog);
}

function normalize10(score) {
  return clamp((score - 1) / 9, 0, 1);
}

function velocityToLabel(velocity) {
  if (velocity >= 0.3) return 'rising';
  if (velocity >= 0.08) return 'improving';
  if (velocity <= -0.3) return 'declining';
  if (velocity <= -0.08) return 'softening';
  return 'stable';
}

function confidenceLabelFromEvidence(totalLogs, distinctDays) {
  if (totalLogs >= 14 && distinctDays >= 5) return 'high';
  if (totalLogs >= 8 && distinctDays >= 3) return 'medium';
  if (totalLogs >= DEFAULT_MIN_TOTAL_LOGS && distinctDays >= DEFAULT_MIN_DISTINCT_DAYS) return 'low';
  return 'insufficient';
}

function confidenceScoreFromEvidence(totalLogs, distinctDays) {
  const logComponent = Math.min(1, totalLogs / 14);
  const dayComponent = Math.min(1, distinctDays / 5);
  return round(logComponent * 0.65 + dayComponent * 0.35, 2);
}

function normalizeOffset(offset) {
  const parsed = Number(offset);
  if (!Number.isFinite(parsed)) return null;
  return clamp(parsed, -MAX_OFFSET_MINUTES, MAX_OFFSET_MINUTES);
}

function resolveTimezoneOffset(logs, options = {}) {
  const optionOffset = normalizeOffset(options.timezoneOffset ?? options.tzOffsetMinutes);
  if (optionOffset !== null) return optionOffset;

  const latestWithOffset = logs.find((log) => Number.isFinite(Number(log.timezoneOffset)));
  if (latestWithOffset) return normalizeOffset(latestWithOffset.timezoneOffset);

  return 0;
}

function getLocalHour(date, timezoneOffset = 0) {
  const local = new Date(date.getTime() - timezoneOffset * 60 * 1000);
  return local.getUTCHours();
}

function timeOfDayBucket(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function localDayKeyForLog(log, fallbackOffset) {
  if (typeof log.dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(log.dayKey)) {
    return log.dayKey;
  }

  const offset = normalizeOffset(log.timezoneOffset) ?? fallbackOffset;
  return getDayKey(new Date(log.loggedDate), offset);
}

function addDaysToKey(dayKey, days) {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function average(logs, scorer) {
  if (!logs.length) return null;
  return logs.reduce((sum, log) => sum + scorer(log), 0) / logs.length;
}

function safeInsightForInsufficientData(minTotalLogs) {
  return `Mood insights will become more reliable after ${minTotalLogs} mood logs across multiple days.`;
}

function buildInsight({ velocityLabel, currentMood, currentEnergy, moodUrgency, energyUrgency, localHour, confidenceLabel }) {
  if (confidenceLabel === 'low') {
    return 'Early mood patterns are starting to form. Recommendations will stay broad until more logs are available.';
  }

  const tod = timeOfDayBucket(localHour);

  if (moodUrgency > 0.6) {
    if (velocityLabel === 'declining' || velocityLabel === 'softening') {
      return 'Recent mood logs are trending lower. A steady, balanced option may be a good fit right now.';
    }
    return 'Recent mood logs are on the lower side. A balanced, mood-supportive option may be worth prioritizing.';
  }

  if (energyUrgency > 0.6) {
    return `Recent energy logs are lower this ${tod}. Protein or complex carbs may be helpful to consider.`;
  }

  if (velocityLabel === 'rising' || velocityLabel === 'improving') {
    return 'Recent mood logs are trending upward. A balanced meal can help keep recommendations aligned with that pattern.';
  }

  if (currentMood >= 7 && currentEnergy >= 7) {
    return 'Recent mood and energy logs look strong. Recommendations can focus on balanced, goal-aligned choices.';
  }

  return 'Recent mood logs look fairly steady. A balanced option is a good default recommendation.';
}

function buildExplainabilityReason({ currentMood, currentEnergy, todayAvg, threeDayAvg, sevenDayAvg, moodUrgency, energyUrgency }) {
  if (todayAvg <= threeDayAvg - 0.5) {
    return 'Mood is lower than your 3-day average.';
  }

  if (todayAvg >= threeDayAvg + 0.5) {
    return 'Mood is higher than your 3-day average.';
  }

  if (todayAvg <= sevenDayAvg - 0.5) {
    return 'Mood is lower than your 7-day average.';
  }

  if (energyUrgency > moodUrgency && currentEnergy <= 5) {
    return 'Energy is lower than your recent baseline.';
  }

  if (currentMood <= 5) {
    return 'Recent mood logs are on the lower side.';
  }

  return 'Recent mood logs are steady.';
}

function buildNullResult(options = {}) {
  const minTotalLogs = options.minTotalLogs ?? DEFAULT_MIN_TOTAL_LOGS;
  const timezoneOffset = normalizeOffset(options.timezoneOffset ?? options.tzOffsetMinutes) ?? 0;
  const now = options.now instanceof Date ? options.now : new Date();
  const localHour = typeof options.nowHour === 'number' ? options.nowHour : getLocalHour(now, timezoneOffset);

  return {
    currentMood: 5,
    currentEnergy: 5,
    velocity: 0,
    velocityLabel: 'stable',
    todayAvg: 5,
    threeDayAvg: 5,
    sevenDayAvg: 5,
    trend: 'stable',
    moodUrgency: 0,
    energyUrgency: 0,
    timeOfDay: localHour,
    timezoneOffset,
    moodBoostWeight: 0,
    energyBoostWeight: 0,
    confidence: 0,
    confidenceLabel: 'insufficient',
    insight: safeInsightForInsufficientData(minTotalLogs),
    hasData: false,
    explainability: {
      reason: 'insufficient_mood_logs',
      logsAnalyzed: 0,
      distinctLocalDays: 0,
      minTotalLogs,
      minDistinctDays: options.minDistinctDays ?? DEFAULT_MIN_DISTINCT_DAYS,
      timezoneOffset,
      dayGrouping: 'user_local_day',
      generatedAt: now.toISOString(),
    },
  };
}

/**
 * Compute the real-time mood signal for a user.
 *
 * @param {string} userId
 * @param {object} options
 * @param {number} [options.timezoneOffset] Client getTimezoneOffset() minutes.
 * @param {number} [options.minTotalLogs=5] Minimum mood logs before signal output.
 * @param {number} [options.minDistinctDays=2] Minimum local days before signal output.
 * @param {Date} [options.now] Test override.
 * @param {number} [options.nowHour] Test override for local hour.
 */
export async function computeMoodSignal(userId, options = {}) {
  const minTotalLogs = options.minTotalLogs ?? DEFAULT_MIN_TOTAL_LOGS;
  const minDistinctDays = options.minDistinctDays ?? DEFAULT_MIN_DISTINCT_DAYS;
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const now = options.now instanceof Date ? options.now : new Date();
  const nullResult = buildNullResult({ ...options, minTotalLogs, minDistinctDays, now });

  if (!userId) return nullResult;

  try {
    const since = daysAgo(lookbackDays + 1);

    const logs = await db
      .select({
        id: moodLogTable.id,
        mood: moodLogTable.mood,
        intensity: moodLogTable.intensity,
        energyLevel: moodLogTable.energyLevel,
        dayKey: moodLogTable.dayKey,
        timezoneOffset: moodLogTable.timezoneOffset,
        loggedDate: moodLogTable.loggedDate,
      })
      .from(moodLogTable)
      .where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, since)))
      .orderBy(desc(moodLogTable.loggedDate));

    if (!logs.length) {
      return nullResult;
    }

    const timezoneOffset = resolveTimezoneOffset(logs, options);
    const todayKey = getDayKey(now, timezoneOffset);
    const localHour = typeof options.nowHour === 'number' ? options.nowHour : getLocalHour(now, timezoneOffset);

    const enrichedLogs = logs.map((log) => ({
      ...log,
      _localDayKey: localDayKeyForLog(log, timezoneOffset),
    }));

    const sevenDayKeys = new Set(
      Array.from({ length: lookbackDays }, (_, index) => addDaysToKey(todayKey, -index))
    );
    const activeLogs = enrichedLogs.filter((log) => sevenDayKeys.has(log._localDayKey));
    const localDays = [...new Set(activeLogs.map((log) => log._localDayKey))];
    const confidenceLabel = confidenceLabelFromEvidence(activeLogs.length, localDays.length);
    const confidence = confidenceScoreFromEvidence(activeLogs.length, localDays.length);

    if (activeLogs.length < minTotalLogs || localDays.length < minDistinctDays) {
      return {
        ...nullResult,
        timezoneOffset,
        timeOfDay: localHour,
        confidence,
        confidenceLabel: 'insufficient',
        insight: safeInsightForInsufficientData(minTotalLogs),
        explainability: {
          ...nullResult.explainability,
          logsAnalyzed: activeLogs.length,
          distinctLocalDays: localDays.length,
          timezoneOffset,
          todayKey,
          generatedAt: now.toISOString(),
        },
      };
    }

    const latestLog = activeLogs[0];
    const currentMood = moodToScore(latestLog);
    const currentEnergy = energyToScore(latestLog);

    const todayLogs = activeLogs.filter((log) => log._localDayKey === todayKey);
    const threeDayKeys = new Set([todayKey, addDaysToKey(todayKey, -1), addDaysToKey(todayKey, -2)]);
    const threeDayLogs = activeLogs.filter((log) => threeDayKeys.has(log._localDayKey));

    const todayAvg = average(todayLogs, moodToScore) ?? currentMood;
    const threeDayAvg = average(threeDayLogs, moodToScore) ?? todayAvg;
    const sevenDayAvg = average(activeLogs, moodToScore) ?? threeDayAvg;

    const todayEnergyAvg = average(todayLogs, energyToScore) ?? currentEnergy;
    const threeDayEnergyAvg = average(threeDayLogs, energyToScore) ?? todayEnergyAvg;

    const velocity = clamp(((todayAvg - threeDayAvg) / 3) / 3, -1, 1);
    const velocityLabel = velocityToLabel(velocity);

    const trendDelta = todayAvg - sevenDayAvg;
    let trend = 'stable';
    if (trendDelta >= 0.5) trend = 'improving';
    if (trendDelta <= -0.5) trend = 'declining';

    const moodUrgency = clamp((1 - normalize10(currentMood)) * 0.7 + Math.max(0, -velocity * 0.3), 0, 1);
    const energyVelocity = clamp((todayEnergyAvg - threeDayEnergyAvg) / 9, -1, 1);
    const energyUrgency = clamp((1 - normalize10(currentEnergy)) * 0.7 + Math.max(0, -energyVelocity * 0.3), 0, 1);

    const moodBoostWeight = round(moodUrgency * 0.3, 2);
    const energyBoostWeight = round(energyUrgency * 0.3, 2);

    const insight = buildInsight({
      velocityLabel,
      currentMood,
      currentEnergy,
      moodUrgency,
      energyUrgency,
      localHour,
      confidenceLabel,
    });
    const reason = buildExplainabilityReason({
      currentMood,
      currentEnergy,
      todayAvg,
      threeDayAvg,
      sevenDayAvg,
      moodUrgency,
      energyUrgency,
    });

    return {
      currentMood: round(currentMood, 2),
      currentEnergy: round(currentEnergy, 2),
      velocity: round(velocity, 2),
      velocityLabel,
      todayAvg: round(todayAvg, 2),
      threeDayAvg: round(threeDayAvg, 2),
      sevenDayAvg: round(sevenDayAvg, 2),
      trend,
      moodUrgency: round(moodUrgency, 2),
      energyUrgency: round(energyUrgency, 2),
      timeOfDay: localHour,
      timezoneOffset,
      moodBoostWeight,
      energyBoostWeight,
      confidence,
      confidenceLabel,
      insight,
      hasData: true,
      explainability: {
        reason,
        dayGrouping: 'user_local_day',
        todayKey,
        timezoneOffset,
        logsAnalyzed: activeLogs.length,
        totalFetched: logs.length,
        distinctLocalDays: localDays.length,
        localDayKeys: localDays.sort(),
        minTotalLogs,
        minDistinctDays,
        windows: {
          today: [todayKey],
          threeDay: [...threeDayKeys],
          sevenDay: [...sevenDayKeys],
        },
        scoreSource: {
          mood: 'intensity_or_mood_label',
          energy: 'energy_level_or_mood_score_fallback',
        },
        generatedAt: now.toISOString(),
      },
    };
  } catch (err) {
    console.error('[moodSignalService] computeMoodSignal error:', err);
    return {
      ...nullResult,
      explainability: {
        ...nullResult.explainability,
        reason: 'service_error',
      },
    };
  }
}

/**
 * Compute food-mood correlations using 3-hour temporal windows.
 */
export async function computeWindowedFoodMoodCorrelations(userId, options = {}) {
  const lookbackDays = options.lookbackDays ?? DEFAULT_CORRELATION_LOOKBACK_DAYS;
  const minTotalLogs = options.minTotalLogs ?? DEFAULT_MIN_TOTAL_LOGS;
  const nullResult = {
    goodFoods: [],
    watchFoods: [],
    confidence: 0,
    confidenceLabel: 'insufficient',
    dataPoints: 0,
    explainability: {
      reason: 'insufficient_mood_logs',
      logsAnalyzed: 0,
      minTotalLogs,
      windowHours: 3,
      generatedAt: new Date().toISOString(),
    },
  };

  if (!userId) return nullResult;

  try {
    const since = daysAgo(lookbackDays);

    const moodLogs = await db
      .select({
        id: moodLogTable.id,
        mood: moodLogTable.mood,
        intensity: moodLogTable.intensity,
        energyLevel: moodLogTable.energyLevel,
        dayKey: moodLogTable.dayKey,
        timezoneOffset: moodLogTable.timezoneOffset,
        loggedDate: moodLogTable.loggedDate,
      })
      .from(moodLogTable)
      .where(and(eq(moodLogTable.userId, userId), gte(moodLogTable.loggedDate, since)))
      .orderBy(desc(moodLogTable.loggedDate));

    if (moodLogs.length < minTotalLogs) {
      return {
        ...nullResult,
        explainability: {
          ...nullResult.explainability,
          logsAnalyzed: moodLogs.length,
        },
      };
    }

    const foodLogs = await db
      .select({
        id: foodLogTable.id,
        foodName: foodLogTable.foodName,
        loggedDate: foodLogTable.loggedDate,
      })
      .from(foodLogTable)
      .where(and(eq(foodLogTable.userId, userId), gte(foodLogTable.loggedDate, since)))
      .orderBy(desc(foodLogTable.loggedDate));

    if (!foodLogs.length) {
      return {
        ...nullResult,
        confidenceLabel: 'low',
        explainability: {
          ...nullResult.explainability,
          reason: 'no_food_logs_in_window',
          logsAnalyzed: moodLogs.length,
        },
      };
    }

    const baseline = average(moodLogs, moodToScore) ?? 5;
    const foodStats = new Map();

    for (const moodLog of moodLogs) {
      const moodTime = new Date(moodLog.loggedDate).getTime();
      const windowStart = moodTime - 3 * 60 * 60 * 1000;
      const windowEnd = moodTime - 30 * 60 * 1000;
      const moodDiff = moodToScore(moodLog) - baseline;
      const seenFoods = new Set();

      for (const food of foodLogs) {
        const foodTime = new Date(food.loggedDate).getTime();
        if (foodTime < windowStart || foodTime > windowEnd) continue;

        const name = (food.foodName || '').toLowerCase().trim();
        if (!name || seenFoods.has(name)) continue;
        seenFoods.add(name);

        if (!foodStats.has(name)) {
          foodStats.set(name, { totalMoodDiff: 0, occurrences: 0, rawName: food.foodName });
        }

        const stats = foodStats.get(name);
        stats.totalMoodDiff += moodDiff;
        stats.occurrences += 1;
      }
    }

    const goodFoods = [];
    const watchFoods = [];
    let dataPoints = 0;

    for (const stats of foodStats.values()) {
      dataPoints += stats.occurrences;
      if (stats.occurrences < 3) continue;

      const avgDiff = stats.totalMoodDiff / stats.occurrences;
      if (avgDiff > 0.5) {
        goodFoods.push({
          food: stats.rawName,
          avgMoodLift: round(avgDiff, 2),
          occurrences: stats.occurrences,
        });
      } else if (avgDiff < -0.5) {
        watchFoods.push({
          food: stats.rawName,
          avgMoodDrop: round(Math.abs(avgDiff), 2),
          occurrences: stats.occurrences,
        });
      }
    }

    goodFoods.sort((a, b) => b.avgMoodLift - a.avgMoodLift);
    watchFoods.sort((a, b) => b.avgMoodDrop - a.avgMoodDrop);

    const qualifyingOccurrences = [...foodStats.values()]
      .filter((stats) => stats.occurrences >= 3)
      .reduce((sum, stats) => sum + stats.occurrences, 0);
    const confidence = round(Math.min(1, qualifyingOccurrences / 30) * Math.min(1, moodLogs.length / 14), 2);
    const confidenceLabel = confidence >= 0.75 ? 'high' : confidence >= 0.4 ? 'medium' : 'low';
    const timezoneOffset = resolveTimezoneOffset(moodLogs, options);

    return {
      goodFoods,
      watchFoods,
      confidence,
      confidenceLabel,
      dataPoints,
      explainability: {
        dayGrouping: 'user_local_day',
        timezoneOffset,
        logsAnalyzed: moodLogs.length,
        foodLogsAnalyzed: foodLogs.length,
        qualifyingOccurrences,
        windowHours: 3,
        minFoodOccurrences: 3,
        baselineMoodScore: round(baseline, 2),
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('[moodSignalService] computeWindowedFoodMoodCorrelations error:', err);
    return {
      ...nullResult,
      explainability: {
        ...nullResult.explainability,
        reason: 'service_error',
      },
    };
  }
}

/**
 * Lightweight wrapper around computeMoodSignal for the recommendation engine.
 */
export async function getMoodInsightForRecommendation(userId, options = {}) {
  try {
    const signal = await computeMoodSignal(userId, options);
    return {
      moodBoostWeight: signal.moodBoostWeight,
      energyBoostWeight: signal.energyBoostWeight,
      moodUrgency: signal.moodUrgency,
      energyUrgency: signal.energyUrgency,
      velocity: signal.velocity,
      velocityLabel: signal.velocityLabel,
      urgency: Math.max(signal.moodUrgency, signal.energyUrgency),
      confidence: signal.confidence,
      confidenceLabel: signal.confidenceLabel,
      timezoneOffset: signal.timezoneOffset,
      timeOfDay: signal.timeOfDay,
      insight: signal.insight,
      hasData: signal.hasData,
      explainability: signal.explainability,
    };
  } catch (err) {
    console.error('[moodSignalService] getMoodInsightForRecommendation error:', err);
    return {
      moodBoostWeight: 0,
      energyBoostWeight: 0,
      moodUrgency: 0,
      energyUrgency: 0,
      velocity: 0,
      velocityLabel: 'stable',
      urgency: 0,
      confidence: 0,
      confidenceLabel: 'insufficient',
      timezoneOffset: 0,
      timeOfDay: getLocalHour(new Date(), 0),
      insight: safeInsightForInsufficientData(DEFAULT_MIN_TOTAL_LOGS),
      hasData: false,
      explainability: {
        reason: 'safe_default',
        dayGrouping: 'user_local_day',
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
