/**
 * Sleep Tracking Routes
 *
 * Dedicated sleep logging with quality assessment and context tags.
 *
 * Routes:
 * - POST /sleep/log - Log sleep entry (with idempotency)
 * - GET /sleep/today - Get last night's sleep
 * - GET /sleep/history - Get sleep history
 * - GET /sleep/trends - Get sleep patterns and trends
 * - DELETE /sleep/:id - Delete sleep entry
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { sleepLogTable } from '../db/schema.js';
import { updateStreak, awardXP } from '../services/gamificationRewardService.js';
import { parseTimezoneOffsetMinutes, getDayKey } from '../utils/timezone.js';
import { clearPatternCache } from '../services/patternMiningService.js';
import {
  normalizeHistoryQuery,
  summarizeClockTimes,
  summarizeSleepHistory,
} from '../utils/wellnessHistory.js';
import { compareBinaryGroups, MIN_PATTERN_GROUP_SIZE } from '../utils/patternEvidence.js';
import {
  getTrackedDaySnapshot,
  reconcileStreakAfterDeletion,
} from '../services/streakReconciliationService.js';

const router = express.Router();

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

router.use(requireAuth());

// ============================================================================
// CONSTANTS
// ============================================================================

export const SLEEP_QUALITY_LABELS = [
  { value: 1, label: 'Terrible', icon: 'sad-outline', color: '#EF4444' },
  { value: 2, label: 'Very Poor', icon: 'sad-outline', color: '#F87171' },
  { value: 3, label: 'Poor', icon: 'sad-outline', color: '#FB923C' },
  { value: 4, label: 'Below Average', icon: 'remove-circle-outline', color: '#FBBF24' },
  { value: 5, label: 'Average', icon: 'remove-circle-outline', color: '#FCD34D' },
  { value: 6, label: 'Fair', icon: 'remove-circle-outline', color: '#BEF264' },
  { value: 7, label: 'Good', icon: 'happy-outline', color: '#84CC16' },
  { value: 8, label: 'Very Good', icon: 'happy-outline', color: '#4ADE80' },
  { value: 9, label: 'Great', icon: 'happy-outline', color: '#22C55E' },
  { value: 10, label: 'Excellent', icon: 'star', color: '#10B981' },
];

export const SLEEP_CONTEXT_TAGS = [
  { key: 'caffeine', label: 'Had Caffeine', icon: 'cafe' },
  { key: 'alcohol', label: 'Had Alcohol', icon: 'wine' },
  { key: 'exercise', label: 'Exercised', icon: 'fitness' },
  { key: 'stress', label: 'Stressed', icon: 'flash' },
  { key: 'screenTime', label: 'Late Screen Time', icon: 'phone-portrait' },
  { key: 'lateFood', label: 'Late Heavy Meal', icon: 'restaurant' },
];

const SLEEP_CONTEXT_KEYS = new Set(SLEEP_CONTEXT_TAGS.map(({ key }) => key));

export function normalizeSleepLogInput(body = {}, offsetMinutes = 0) {
  const {
    bedTime,
    wakeTime,
    quality,
    tags = {},
    notes = null,
    sleepDate = null,
    clientEventId = null,
  } = body || {};

  if (!Number.isInteger(quality) || quality < 1 || quality > 10) {
    return { error: 'Sleep quality must be an integer between 1 and 10' };
  }
  if (!tags || Array.isArray(tags) || typeof tags !== 'object') {
    return { error: 'Sleep context tags must be an object' };
  }
  if (notes !== null && typeof notes !== 'string') {
    return { error: 'Notes must be text' };
  }
  if (typeof notes === 'string' && notes.length > 200) {
    return { error: 'Notes must be 200 characters or fewer' };
  }
  if (sleepDate !== null && (typeof sleepDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(sleepDate))) {
    return { error: 'Sleep date must use YYYY-MM-DD format' };
  }
  if (clientEventId !== null && (typeof clientEventId !== 'string' || clientEventId.length < 1 || clientEventId.length > 200)) {
    return { error: 'Invalid client event ID' };
  }

  const bedTimeDate = new Date(bedTime);
  const wakeTimeDate = new Date(wakeTime);
  if (Number.isNaN(bedTimeDate.getTime()) || Number.isNaN(wakeTimeDate.getTime())) {
    return { error: 'Bed time and wake time must be valid timestamps' };
  }

  const durationMinutes = Math.round((wakeTimeDate - bedTimeDate) / 60000);
  if (durationMinutes <= 0 || durationMinutes > 1440) {
    return { error: 'Sleep duration must be greater than zero and no more than 24 hours' };
  }

  const normalizedTags = {};
  for (const key of SLEEP_CONTEXT_KEYS) {
    const value = tags[key];
    if (value !== undefined && typeof value !== 'boolean') {
      return { error: `Sleep context tag ${key} must be true or false` };
    }
    normalizedTags[key] = value === true;
  }

  const effectiveSleepDate = sleepDate || getDayKey(bedTimeDate, offsetMinutes);
  const calendarDate = new Date(`${effectiveSleepDate}T00:00:00.000Z`);
  if (Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== effectiveSleepDate) {
    return { error: 'Sleep date must be a valid calendar date' };
  }

  return {
    value: {
      bedTimeDate,
      wakeTimeDate,
      durationMinutes,
      quality,
      tags: normalizedTags,
      notes: typeof notes === 'string' ? notes.trim() || null : null,
      effectiveSleepDate,
      clientEventId,
    },
  };
}

router.get('/constants', (req, res) => {
  res.json({
    qualityLabels: SLEEP_QUALITY_LABELS,
    contextTags: SLEEP_CONTEXT_TAGS,
  });
});

// ============================================================================
// LOG SLEEP (with idempotency)
// ============================================================================

router.post('/log', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const normalized = normalizeSleepLogInput(req.body, offsetMinutes);
    if (normalized.error) {
      return res.status(400).json({ error: normalized.error });
    }
    const {
      bedTimeDate,
      wakeTimeDate,
      durationMinutes,
      quality,
      tags,
      notes,
      effectiveSleepDate,
      clientEventId,
    } = normalized.value;
    const dayKey = effectiveSleepDate;

    // Idempotency check
    if (clientEventId) {
      const existing = await db
        .select()
        .from(sleepLogTable)
        .where(
          and(
            eq(sleepLogTable.userId, userId),
            eq(sleepLogTable.clientEventId, clientEventId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`[Sleep] Idempotency hit for clientEventId: ${clientEventId}`);
        return res.json({
          success: true,
          log: existing[0],
          idempotent: true,
          message: 'Sleep already logged',
        });
      }
    }

    // Check for existing entry for this sleep date (only one sleep per night)
    const existingForDate = await db
      .select()
      .from(sleepLogTable)
      .where(
        and(
          eq(sleepLogTable.userId, userId),
          eq(sleepLogTable.sleepDate, effectiveSleepDate)
        )
      )
      .limit(1);

    if (existingForDate.length > 0) {
      // Update existing entry instead of creating new one
      const [updated] = await db
        .update(sleepLogTable)
        .set({
          bedTime: bedTimeDate,
          wakeTime: wakeTimeDate,
          durationMinutes,
          quality,
          tags,
          notes,
          clientEventId: clientEventId || null,
          dayKey,
          timezoneOffset: offsetMinutes,
          updatedAt: new Date(),
        })
        .where(eq(sleepLogTable.id, existingForDate[0].id))
        .returning();

      clearPatternCache(userId);
      return res.json({
        success: true,
        log: updated,
        updated: true,
        message: `Updated sleep log for ${effectiveSleepDate}`,
      });
    }

    // Insert new sleep log
    const [newLog] = await db
      .insert(sleepLogTable)
      .values({
        userId,
        bedTime: bedTimeDate,
        wakeTime: wakeTimeDate,
        durationMinutes,
        quality,
        tags,
        notes,
        sleepDate: effectiveSleepDate,
        clientEventId: clientEventId || null,
        dayKey,
        timezoneOffset: offsetMinutes,
      })
      .returning();

    // Update streak. Every other logging route (activity/food/water/mood/
    // stress) credits the day the entry is FOR, not the moment it was
    // submitted — this one used new Date() instead, so a sleep log entered
    // any time after the fact (backfilling a missed night, bulk import,
    // even just logging late) credited today instead of the night it
    // actually happened, and could silently report a gap/break that never
    // occurred. wakeTimeDate (the morning the sleep session ends, when a
    // user would naturally log it) is the closest sleep-specific analogue
    // to "loggedDate" elsewhere — sleepDate/dayKey key off bedTime/now
    // instead, for the unrelated purpose of identifying which night this
    // entry is for, not when to credit the streak.
    let streakResult = null;
    try {
      streakResult = await updateStreak(userId, wakeTimeDate, db, offsetMinutes);
      console.log(`[Sleep] Streak updated: ${streakResult.streak}`);
    } catch (streakError) {
      console.error('[Sleep] Streak update failed (non-fatal):', streakError);
    }

    // Award XP: 10 base + 5 quality bonus (quality >= 7) + 8 consistent bedtime bonus
    let xpResult = null;
    let xpToAward = 10;
    try {
      if (quality >= 7) {
        xpToAward += 5; // Quality bonus
      }
      // Consistent bedtime bonus would require checking previous entries
      xpResult = await awardXP(userId, xpToAward, 'sleep_log', db);
      console.log(`[Sleep] XP awarded: +${xpToAward} (total: ${xpResult.newXP}, level: ${xpResult.newLevel})`);
    } catch (xpError) {
      console.error('[Sleep] XP award failed (non-fatal):', xpError);
    }

    // Clear pattern cache for this user (new data invalidates cached patterns)
    clearPatternCache(userId);

    res.json({
      success: true,
      log: newLog,
      durationMinutes,
      durationHours: Math.round((durationMinutes / 60) * 10) / 10,
      xp: xpResult ? { awarded: xpToAward, total: xpResult.newXP } : null,
      streak: streakResult ? { current: streakResult.streak } : null,
      message: `Logged ${Math.round((durationMinutes / 60) * 10) / 10} hours of sleep`,
    });
  } catch (error) {
    const clientEventId = req.body?.clientEventId;
    if ((error?.code === '23505' || error?.cause?.code === '23505') && typeof clientEventId === 'string') {
      const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
      const [existing] = await db
        .select()
        .from(sleepLogTable)
        .where(and(eq(sleepLogTable.userId, userId), eq(sleepLogTable.clientEventId, clientEventId)))
        .limit(1);
      if (existing) {
        return res.json({ success: true, log: existing, idempotent: true, message: 'Sleep already logged' });
      }
    }
    console.error('[Sleep] POST /log error:', error);
    res.status(500).json({ error: 'Failed to log sleep' });
  }
});

// ============================================================================
// GET LAST NIGHT'S SLEEP
// ============================================================================

router.get('/today', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);

    // Get yesterday's date (last night's sleep)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastNightDate = getDayKey(yesterday, offsetMinutes);

    // Also check today in case they just logged
    const todayDate = getDayKey(new Date(), offsetMinutes);

    const sleepLogs = await db
      .select()
      .from(sleepLogTable)
      .where(
        and(
          eq(sleepLogTable.userId, userId),
          sql`${sleepLogTable.sleepDate} IN (${lastNightDate}, ${todayDate})`
        )
      )
      .orderBy(desc(sleepLogTable.sleepDate))
      .limit(1);

    const lastSleep = sleepLogs[0] || null;

    res.json({
      success: true,
      lastSleep,
      sleepDate: lastSleep?.sleepDate || null,
      durationHours: lastSleep ? Math.round((lastSleep.durationMinutes / 60) * 10) / 10 : null,
      quality: lastSleep?.quality || null,
    });
  } catch (error) {
    console.error('[Sleep] GET /today error:', error);
    res.status(500).json({ error: 'Failed to get last night\'s sleep' });
  }
});

// ============================================================================
// GET SLEEP HISTORY
// ============================================================================

router.get('/history', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const { days, limit, offset } = normalizeHistoryQuery(req.query);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startDateStr = getDayKey(startDate, offsetMinutes);

    const historyFilter = and(
      eq(sleepLogTable.userId, userId),
      gte(sleepLogTable.sleepDate, startDateStr)
    );

    // The range query powers summaries and the chart. Pagination only affects
    // the recent-entry list, so changing page never changes the headline data.
    const rangeLogs = await db
      .select()
      .from(sleepLogTable)
      .where(historyFilter)
      .orderBy(desc(sleepLogTable.sleepDate));

    const sleepLogs = await db
      .select()
      .from(sleepLogTable)
      .where(historyFilter)
      .orderBy(desc(sleepLogTable.sleepDate))
      .limit(limit)
      .offset(offset);

    const total = rangeLogs.length;

    res.json({
      success: true,
      sleepLogs,
      total,
      summary: summarizeSleepHistory(rangeLogs),
      dailySummaries: [...rangeLogs].reverse().map((log) => ({
        date: log.sleepDate,
        durationMinutes: log.durationMinutes,
        quality: log.quality,
      })),
      pagination: {
        limit,
        offset,
        hasMore: offset + sleepLogs.length < total,
      },
    });
  } catch (error) {
    console.error('[Sleep] GET /history error:', error);
    res.status(500).json({ error: 'Failed to get sleep history' });
  }
});

// ============================================================================
// GET SLEEP TRENDS
// ============================================================================

router.get('/trends', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const { days } = normalizeHistoryQuery(req.query);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    const startDateStr = getDayKey(startDate, offsetMinutes);

    // Get sleep logs
    const sleepLogs = await db
      .select()
      .from(sleepLogTable)
      .where(
        and(
          eq(sleepLogTable.userId, userId),
          gte(sleepLogTable.sleepDate, startDateStr)
        )
      )
      .orderBy(desc(sleepLogTable.sleepDate));

    if (sleepLogs.length < 3) {
      return res.json({
        success: true,
        trends: null,
        message: 'Need at least 3 days of data for trends',
        daysTracked: sleepLogs.length,
      });
    }

    // Calculate trends
    const avgDuration = sleepLogs.reduce((sum, log) => sum + log.durationMinutes, 0) / sleepLogs.length;
    const avgQuality = sleepLogs.reduce((sum, log) => sum + log.quality, 0) / sleepLogs.length;

    // Calculate bedtime consistency (standard deviation of bed times)
    const bedTimes = sleepLogs.map(log => {
      const date = new Date(new Date(log.bedTime).getTime() - (log.timezoneOffset ?? offsetMinutes) * 60000);
      return date.getUTCHours() * 60 + date.getUTCMinutes();
    });
    const { averageMinutes: avgBedTime, standardDeviationMinutes: bedTimeStdDev } = summarizeClockTimes(bedTimes);
    const consistencyScore = Math.max(0, 1 - (bedTimeStdDev / 120)); // 120 min = 2 hours variance = 0 consistency

    // Count tag occurrences
    const tagCounts = {};
    sleepLogs.forEach(log => {
      if (log.tags) {
        Object.keys(log.tags).forEach(tag => {
          if (log.tags[tag]) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        });
      }
    });

    // Analyze tag correlations with quality
    const tagImpact = {};
    Object.keys(tagCounts).forEach(tag => {
      const comparison = compareBinaryGroups(
        sleepLogs,
        (log) => log.tags?.[tag] === true,
        (log) => log.quality
      );
      if (comparison) {
        tagImpact[tag] = {
          impact: comparison.difference,
          occurrences: comparison.countWith,
          comparisonOccurrences: comparison.countWithout,
        };
      }
    });

    res.json({
      success: true,
      trends: {
        avgDurationMinutes: Math.round(avgDuration),
        avgDurationHours: Math.round((avgDuration / 60) * 10) / 10,
        avgQuality: Math.round(avgQuality * 10) / 10,
        consistencyScore: Math.round(consistencyScore * 100),
        avgBedTime: `${Math.floor(avgBedTime / 60)}:${String(avgBedTime % 60).padStart(2, '0')}`,
        daysTracked: sleepLogs.length,
        tagCounts,
        tagImpact,
        minimumAssociationGroupSize: MIN_PATTERN_GROUP_SIZE,
      },
    });
  } catch (error) {
    console.error('[Sleep] GET /trends error:', error);
    res.status(500).json({ error: 'Failed to get sleep trends' });
  }
});

// ============================================================================
// DELETE SLEEP ENTRY
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const sleepId = Number(req.params.id);
    const offsetMinutes = parseTimezoneOffsetMinutes(req) ?? 0;

    if (!Number.isSafeInteger(sleepId) || sleepId <= 0) {
      return res.status(400).json({ error: 'Invalid sleep ID' });
    }

    const beforeStreak = await getTrackedDaySnapshot(userId, db, offsetMinutes);

    // Verify ownership and delete
    const deleted = await db
      .delete(sleepLogTable)
      .where(
        and(
          eq(sleepLogTable.id, sleepId),
          eq(sleepLogTable.userId, userId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Sleep entry not found or not owned by user' });
    }

    clearPatternCache(userId);

    const streakReconciliation = await reconcileStreakAfterDeletion({
      userId,
      beforeSnapshot: beforeStreak,
      dbConn: db,
      timezoneOffset: offsetMinutes,
    });

    res.json({
      success: true,
      deleted: deleted[0],
      streak: streakReconciliation.streak,
      message: 'Sleep entry deleted successfully',
    });
  } catch (error) {
    console.error('[Sleep] DELETE /:id error:', error);
    res.status(500).json({ error: 'Failed to delete sleep entry' });
  }
});

export default router;
