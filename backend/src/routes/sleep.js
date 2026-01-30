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
import { requireAuth } from '@clerk/express';
import { eq, and, gte, lte, desc, sql, count, avg } from 'drizzle-orm';
import { db } from '../config/db.js';
import { sleepLogTable } from '../db/schema.js';
import { updateStreak, awardXP } from '../services/gamificationRewardService.js';
import { parseTimezoneOffsetMinutes, getDayKey } from '../utils/timezone.js';
import { clearPatternCache } from '../services/patternMiningService.js';

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
    const userId = req.auth.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const {
      bedTime,
      wakeTime,
      quality,
      tags = {},
      notes,
      sleepDate, // YYYY-MM-DD of the night
      clientEventId,
    } = req.body;

    // Validation
    if (!bedTime || !wakeTime) {
      return res.status(400).json({ error: 'Bed time and wake time are required' });
    }

    if (!quality || quality < 1 || quality > 10) {
      return res.status(400).json({ error: 'Quality must be between 1 and 10' });
    }

    // Calculate duration
    const bedTimeDate = new Date(bedTime);
    const wakeTimeDate = new Date(wakeTime);
    const durationMinutes = Math.round((wakeTimeDate - bedTimeDate) / 60000);

    if (durationMinutes <= 0 || durationMinutes > 1440) {
      return res.status(400).json({ error: 'Invalid sleep duration' });
    }

    // Determine sleep date (the night the sleep started)
    const effectiveSleepDate = sleepDate || getDayKey(bedTimeDate, offsetMinutes);
    const dayKey = getDayKey(new Date(), offsetMinutes);

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
          notes: notes || null,
          clientEventId: clientEventId || null,
          updatedAt: new Date(),
        })
        .where(eq(sleepLogTable.id, existingForDate[0].id))
        .returning();

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
        notes: notes || null,
        sleepDate: effectiveSleepDate,
        clientEventId: clientEventId || null,
        dayKey,
        timezoneOffset: offsetMinutes,
      })
      .returning();

    // Update streak
    let streakResult = null;
    try {
      streakResult = await updateStreak(userId, new Date(), db, offsetMinutes);
      console.log(`[Sleep] Streak updated: ${streakResult.streak}`);
    } catch (streakError) {
      console.error('[Sleep] Streak update failed (non-fatal):', streakError);
    }

    // Award XP: 10 base + 5 quality bonus (quality >= 7) + 8 consistent bedtime bonus
    let xpResult = null;
    try {
      let xpToAward = 10; // Base XP
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
      xp: xpResult ? { awarded: xpResult.newXP - (xpResult.newXP - 10), total: xpResult.newXP } : null,
      streak: streakResult ? { current: streakResult.streak } : null,
      message: `Logged ${Math.round((durationMinutes / 60) * 10) / 10} hours of sleep`,
    });
  } catch (error) {
    console.error('[Sleep] POST /log error:', error);
    res.status(500).json({ error: 'Failed to log sleep' });
  }
});

// ============================================================================
// GET LAST NIGHT'S SLEEP
// ============================================================================

router.get('/today', async (req, res) => {
  try {
    const userId = req.auth.userId;
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
    const userId = req.auth.userId;
    const { days = 30, limit = 100, offset = 0 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];

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
      .orderBy(desc(sleepLogTable.sleepDate))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(sleepLogTable)
      .where(
        and(
          eq(sleepLogTable.userId, userId),
          gte(sleepLogTable.sleepDate, startDateStr)
        )
      );

    // Calculate summary
    const totalDuration = sleepLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
    const avgDuration = sleepLogs.length > 0 ? Math.round(totalDuration / sleepLogs.length) : 0;
    const avgQuality = sleepLogs.length > 0
      ? Math.round((sleepLogs.reduce((sum, log) => sum + (log.quality || 0), 0) / sleepLogs.length) * 10) / 10
      : 0;

    res.json({
      success: true,
      sleepLogs,
      total: countResult?.count || 0,
      summary: {
        avgDurationMinutes: avgDuration,
        avgDurationHours: Math.round((avgDuration / 60) * 10) / 10,
        avgQuality,
        daysTracked: sleepLogs.length,
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + sleepLogs.length) < (countResult?.count || 0),
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
    const userId = req.auth.userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];

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
      const date = new Date(log.bedTime);
      return date.getHours() * 60 + date.getMinutes();
    });
    const avgBedTime = bedTimes.reduce((sum, t) => sum + t, 0) / bedTimes.length;
    const bedTimeVariance = bedTimes.reduce((sum, t) => sum + Math.pow(t - avgBedTime, 2), 0) / bedTimes.length;
    const bedTimeStdDev = Math.sqrt(bedTimeVariance);
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
      const withTag = sleepLogs.filter(log => log.tags?.[tag]);
      const withoutTag = sleepLogs.filter(log => !log.tags?.[tag]);
      if (withTag.length > 0 && withoutTag.length > 0) {
        const avgWithTag = withTag.reduce((sum, log) => sum + log.quality, 0) / withTag.length;
        const avgWithoutTag = withoutTag.reduce((sum, log) => sum + log.quality, 0) / withoutTag.length;
        tagImpact[tag] = {
          impact: Math.round((avgWithTag - avgWithoutTag) * 10) / 10,
          occurrences: withTag.length,
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
        avgBedTime: `${Math.floor(avgBedTime / 60)}:${String(Math.round(avgBedTime % 60)).padStart(2, '0')}`,
        daysTracked: sleepLogs.length,
        tagCounts,
        tagImpact,
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
    const userId = req.auth.userId;
    const sleepId = parseInt(req.params.id);

    if (!sleepId || isNaN(sleepId)) {
      return res.status(400).json({ error: 'Invalid sleep ID' });
    }

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

    res.json({
      success: true,
      deleted: deleted[0],
      message: 'Sleep entry deleted successfully',
    });
  } catch (error) {
    console.error('[Sleep] DELETE /:id error:', error);
    res.status(500).json({ error: 'Failed to delete sleep entry' });
  }
});

export default router;
