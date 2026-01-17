/**
 * Stress Tracking Routes
 *
 * Dedicated stress logging with triggers, symptoms, and coping strategies.
 *
 * Routes:
 * - POST /stress/log - Log stress entry (with idempotency)
 * - GET /stress/today - Get today's stress entries
 * - GET /stress/history - Get stress history
 * - GET /stress/triggers - Get trigger analysis
 * - GET /stress/patterns - Get stress patterns
 * - DELETE /stress/:id - Delete stress entry
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import { eq, and, gte, desc, sql, count } from 'drizzle-orm';
import { db } from '../config/db.js';
import { stressLogTable } from '../db/schema.js';
import { updateStreak, awardXP } from '../services/gamificationRewardService.js';
import { parseTimezoneOffsetMinutes, getDayKey } from '../utils/timezone.js';

const router = express.Router();

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

router.use(requireAuth());

// ============================================================================
// CONSTANTS
// ============================================================================

export const STRESS_LEVELS = [
  { value: 1, label: 'Minimal', description: 'Feeling calm and relaxed', color: '#10B981' },
  { value: 2, label: 'Very Low', description: 'Slight tension', color: '#34D399' },
  { value: 3, label: 'Low', description: 'Minor stress', color: '#84CC16' },
  { value: 4, label: 'Mild', description: 'Some pressure', color: '#BEF264' },
  { value: 5, label: 'Moderate', description: 'Noticeable stress', color: '#FCD34D' },
  { value: 6, label: 'Elevated', description: 'Significant stress', color: '#FBBF24' },
  { value: 7, label: 'High', description: 'Feeling overwhelmed', color: '#FB923C' },
  { value: 8, label: 'Very High', description: 'Struggling to cope', color: '#F87171' },
  { value: 9, label: 'Severe', description: 'Intense stress', color: '#EF4444' },
  { value: 10, label: 'Extreme', description: 'Crisis level', color: '#DC2626' },
];

export const STRESS_TRIGGERS = [
  { key: 'work', label: 'Work', icon: 'briefcase' },
  { key: 'relationships', label: 'Relationships', icon: 'heart' },
  { key: 'health', label: 'Health', icon: 'medkit' },
  { key: 'finances', label: 'Finances', icon: 'cash' },
  { key: 'family', label: 'Family', icon: 'people' },
  { key: 'social', label: 'Social', icon: 'chatbubbles' },
  { key: 'environment', label: 'Environment', icon: 'home' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export const PHYSICAL_SYMPTOMS = [
  { key: 'headache', label: 'Headache', icon: 'medical' },
  { key: 'tension', label: 'Muscle Tension', icon: 'body' },
  { key: 'fatigue', label: 'Fatigue', icon: 'battery-dead' },
  { key: 'heartRacing', label: 'Racing Heart', icon: 'heart' },
  { key: 'digestive', label: 'Digestive Issues', icon: 'restaurant' },
  { key: 'insomnia', label: 'Sleep Problems', icon: 'moon' },
];

export const COPING_STRATEGIES = [
  { key: 'meditation', label: 'Meditation', icon: 'leaf' },
  { key: 'exercise', label: 'Exercise', icon: 'walk' },
  { key: 'breathing', label: 'Deep Breathing', icon: 'cloud' },
  { key: 'social', label: 'Social Support', icon: 'people' },
  { key: 'nature', label: 'Time in Nature', icon: 'sunny' },
  { key: 'music', label: 'Music', icon: 'musical-notes' },
  { key: 'rest', label: 'Rest/Nap', icon: 'bed' },
  { key: 'hobby', label: 'Hobby/Activity', icon: 'color-palette' },
];

router.get('/constants', (req, res) => {
  res.json({
    stressLevels: STRESS_LEVELS,
    triggers: STRESS_TRIGGERS,
    physicalSymptoms: PHYSICAL_SYMPTOMS,
    copingStrategies: COPING_STRATEGIES,
  });
});

// ============================================================================
// LOG STRESS (with idempotency)
// ============================================================================

router.post('/log', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const {
      level,
      triggers = [],
      physicalSymptoms = {},
      copingUsed = [],
      notes,
      loggedAt,
      clientEventId,
    } = req.body;

    // Validation
    if (!level || level < 1 || level > 10) {
      return res.status(400).json({ error: 'Stress level must be between 1 and 10' });
    }

    const loggedDate = loggedAt ? new Date(loggedAt) : new Date();
    const dayKey = getDayKey(loggedDate, offsetMinutes);
    const loggedDateStr = dayKey;

    // Idempotency check
    if (clientEventId) {
      const existing = await db
        .select()
        .from(stressLogTable)
        .where(
          and(
            eq(stressLogTable.userId, userId),
            eq(stressLogTable.clientEventId, clientEventId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.log(`[Stress] Idempotency hit for clientEventId: ${clientEventId}`);
        return res.json({
          success: true,
          log: existing[0],
          idempotent: true,
          message: 'Stress entry already logged',
        });
      }
    }

    // Insert stress log
    const [newLog] = await db
      .insert(stressLogTable)
      .values({
        userId,
        level,
        triggers,
        physicalSymptoms,
        copingUsed,
        notes: notes || null,
        loggedDate: loggedDateStr,
        clientEventId: clientEventId || null,
        dayKey,
        timezoneOffset: offsetMinutes,
        loggedAt: loggedDate,
      })
      .returning();

    // Update streak
    let streakResult = null;
    try {
      streakResult = await updateStreak(userId, loggedDate, db, offsetMinutes);
      console.log(`[Stress] Streak updated: ${streakResult.streak}`);
    } catch (streakError) {
      console.error('[Stress] Streak update failed (non-fatal):', streakError);
    }

    // Award XP: 8 base + 5 coping bonus (if coping strategies logged)
    let xpResult = null;
    try {
      let xpToAward = 8; // Base XP
      if (copingUsed && copingUsed.length > 0) {
        xpToAward += 5; // Coping bonus
      }
      xpResult = await awardXP(userId, xpToAward, 'stress_log', db);
      console.log(`[Stress] XP awarded: +${xpToAward} (total: ${xpResult.newXP}, level: ${xpResult.newLevel})`);
    } catch (xpError) {
      console.error('[Stress] XP award failed (non-fatal):', xpError);
    }

    const levelInfo = STRESS_LEVELS.find(l => l.value === level) || { label: 'Unknown' };

    res.json({
      success: true,
      log: newLog,
      levelInfo,
      xp: xpResult ? { awarded: xpResult.xpAwarded || 8, total: xpResult.newXP } : null,
      streak: streakResult ? { current: streakResult.streak } : null,
      message: `Logged stress level: ${levelInfo.label}`,
    });
  } catch (error) {
    console.error('[Stress] POST /log error:', error);
    res.status(500).json({ error: 'Failed to log stress' });
  }
});

// ============================================================================
// GET TODAY'S STRESS ENTRIES
// ============================================================================

router.get('/today', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const offsetMinutes = parseTimezoneOffsetMinutes(req);
    const today = getDayKey(new Date(), offsetMinutes);

    // Get today's stress entries
    const stressLogs = await db
      .select()
      .from(stressLogTable)
      .where(
        and(
          eq(stressLogTable.userId, userId),
          eq(stressLogTable.dayKey, today)
        )
      )
      .orderBy(desc(stressLogTable.loggedAt));

    // Calculate today's average
    const avgLevel = stressLogs.length > 0
      ? Math.round((stressLogs.reduce((sum, log) => sum + log.level, 0) / stressLogs.length) * 10) / 10
      : null;

    // Get most common triggers today
    const triggerCounts = {};
    stressLogs.forEach(log => {
      (log.triggers || []).forEach(trigger => {
        triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
      });
    });

    res.json({
      success: true,
      stressLogs,
      today: {
        dayKey: today,
        count: stressLogs.length,
        avgLevel,
        triggers: triggerCounts,
        latestLevel: stressLogs[0]?.level || null,
      },
    });
  } catch (error) {
    console.error('[Stress] GET /today error:', error);
    res.status(500).json({ error: 'Failed to get today\'s stress entries' });
  }
});

// ============================================================================
// GET STRESS HISTORY
// ============================================================================

router.get('/history', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { days = 30, limit = 100, offset = 0 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get stress logs
    const stressLogs = await db
      .select()
      .from(stressLogTable)
      .where(
        and(
          eq(stressLogTable.userId, userId),
          gte(stressLogTable.loggedDate, startDateStr)
        )
      )
      .orderBy(desc(stressLogTable.loggedAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(stressLogTable)
      .where(
        and(
          eq(stressLogTable.userId, userId),
          gte(stressLogTable.loggedDate, startDateStr)
        )
      );

    // Calculate summary
    const avgLevel = stressLogs.length > 0
      ? Math.round((stressLogs.reduce((sum, log) => sum + log.level, 0) / stressLogs.length) * 10) / 10
      : 0;

    // Count high stress days (level >= 7)
    const highStressDays = new Set(
      stressLogs.filter(log => log.level >= 7).map(log => log.loggedDate)
    ).size;

    res.json({
      success: true,
      stressLogs,
      total: countResult?.count || 0,
      summary: {
        avgLevel,
        entriesCount: stressLogs.length,
        highStressDays,
        daysWithData: new Set(stressLogs.map(log => log.loggedDate)).size,
      },
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + stressLogs.length) < (countResult?.count || 0),
      },
    });
  } catch (error) {
    console.error('[Stress] GET /history error:', error);
    res.status(500).json({ error: 'Failed to get stress history' });
  }
});

// ============================================================================
// GET TRIGGER ANALYSIS
// ============================================================================

router.get('/triggers', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get stress logs
    const stressLogs = await db
      .select()
      .from(stressLogTable)
      .where(
        and(
          eq(stressLogTable.userId, userId),
          gte(stressLogTable.loggedDate, startDateStr)
        )
      )
      .orderBy(desc(stressLogTable.loggedAt));

    if (stressLogs.length < 3) {
      return res.json({
        success: true,
        triggers: null,
        message: 'Need at least 3 entries for trigger analysis',
        entriesCount: stressLogs.length,
      });
    }

    // Analyze triggers
    const triggerAnalysis = {};
    STRESS_TRIGGERS.forEach(trigger => {
      const withTrigger = stressLogs.filter(log =>
        Array.isArray(log.triggers) && log.triggers.includes(trigger.key)
      );

      if (withTrigger.length > 0) {
        const avgLevel = withTrigger.reduce((sum, log) => sum + log.level, 0) / withTrigger.length;
        triggerAnalysis[trigger.key] = {
          ...trigger,
          occurrences: withTrigger.length,
          avgLevel: Math.round(avgLevel * 10) / 10,
          percentage: Math.round((withTrigger.length / stressLogs.length) * 100),
        };
      }
    });

    // Sort by occurrences
    const sortedTriggers = Object.values(triggerAnalysis)
      .sort((a, b) => b.occurrences - a.occurrences);

    res.json({
      success: true,
      triggers: sortedTriggers,
      totalEntries: stressLogs.length,
      topTrigger: sortedTriggers[0] || null,
    });
  } catch (error) {
    console.error('[Stress] GET /triggers error:', error);
    res.status(500).json({ error: 'Failed to analyze triggers' });
  }
});

// ============================================================================
// GET STRESS PATTERNS
// ============================================================================

router.get('/patterns', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get stress logs
    const stressLogs = await db
      .select()
      .from(stressLogTable)
      .where(
        and(
          eq(stressLogTable.userId, userId),
          gte(stressLogTable.loggedDate, startDateStr)
        )
      )
      .orderBy(desc(stressLogTable.loggedAt));

    if (stressLogs.length < 5) {
      return res.json({
        success: true,
        patterns: null,
        message: 'Need at least 5 entries for pattern analysis',
        entriesCount: stressLogs.length,
      });
    }

    // Time of day analysis
    const timeOfDay = { morning: [], afternoon: [], evening: [], night: [] };
    stressLogs.forEach(log => {
      const hour = new Date(log.loggedAt).getHours();
      if (hour >= 5 && hour < 12) timeOfDay.morning.push(log.level);
      else if (hour >= 12 && hour < 17) timeOfDay.afternoon.push(log.level);
      else if (hour >= 17 && hour < 21) timeOfDay.evening.push(log.level);
      else timeOfDay.night.push(log.level);
    });

    const timePatterns = {};
    Object.keys(timeOfDay).forEach(period => {
      if (timeOfDay[period].length > 0) {
        timePatterns[period] = {
          avgLevel: Math.round((timeOfDay[period].reduce((a, b) => a + b, 0) / timeOfDay[period].length) * 10) / 10,
          count: timeOfDay[period].length,
        };
      }
    });

    // Day of week analysis
    const dayOfWeek = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    stressLogs.forEach(log => {
      const day = new Date(log.loggedAt).getDay();
      dayOfWeek[day].push(log.level);
    });

    const weekdayPatterns = {};
    Object.keys(dayOfWeek).forEach(day => {
      if (dayOfWeek[day].length > 0) {
        weekdayPatterns[dayNames[day]] = {
          avgLevel: Math.round((dayOfWeek[day].reduce((a, b) => a + b, 0) / dayOfWeek[day].length) * 10) / 10,
          count: dayOfWeek[day].length,
        };
      }
    });

    // Coping effectiveness
    const copingEffectiveness = {};
    COPING_STRATEGIES.forEach(strategy => {
      const withCoping = stressLogs.filter(log =>
        Array.isArray(log.copingUsed) && log.copingUsed.includes(strategy.key)
      );

      if (withCoping.length >= 2) {
        const avgLevel = withCoping.reduce((sum, log) => sum + log.level, 0) / withCoping.length;
        const overallAvg = stressLogs.reduce((sum, log) => sum + log.level, 0) / stressLogs.length;
        copingEffectiveness[strategy.key] = {
          ...strategy,
          timesUsed: withCoping.length,
          avgLevelWhenUsed: Math.round(avgLevel * 10) / 10,
          effectiveness: Math.round((overallAvg - avgLevel) * 10) / 10, // Positive = helps reduce stress
        };
      }
    });

    // Sort coping by effectiveness
    const sortedCoping = Object.values(copingEffectiveness)
      .sort((a, b) => b.effectiveness - a.effectiveness);

    // Overall trend (comparing first half to second half)
    const halfPoint = Math.floor(stressLogs.length / 2);
    const recentHalf = stressLogs.slice(0, halfPoint);
    const olderHalf = stressLogs.slice(halfPoint);
    const recentAvg = recentHalf.length > 0
      ? recentHalf.reduce((sum, log) => sum + log.level, 0) / recentHalf.length
      : 0;
    const olderAvg = olderHalf.length > 0
      ? olderHalf.reduce((sum, log) => sum + log.level, 0) / olderHalf.length
      : 0;
    const trend = Math.round((recentAvg - olderAvg) * 10) / 10;

    res.json({
      success: true,
      patterns: {
        timeOfDay: timePatterns,
        dayOfWeek: weekdayPatterns,
        copingStrategies: sortedCoping,
        trend: {
          direction: trend < -0.5 ? 'improving' : trend > 0.5 ? 'worsening' : 'stable',
          change: trend,
          recentAvg: Math.round(recentAvg * 10) / 10,
          olderAvg: Math.round(olderAvg * 10) / 10,
        },
        overallAvg: Math.round((stressLogs.reduce((sum, log) => sum + log.level, 0) / stressLogs.length) * 10) / 10,
        entriesCount: stressLogs.length,
      },
    });
  } catch (error) {
    console.error('[Stress] GET /patterns error:', error);
    res.status(500).json({ error: 'Failed to analyze patterns' });
  }
});

// ============================================================================
// DELETE STRESS ENTRY
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const stressId = parseInt(req.params.id);

    if (!stressId || isNaN(stressId)) {
      return res.status(400).json({ error: 'Invalid stress ID' });
    }

    // Verify ownership and delete
    const deleted = await db
      .delete(stressLogTable)
      .where(
        and(
          eq(stressLogTable.id, stressId),
          eq(stressLogTable.userId, userId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Stress entry not found or not owned by user' });
    }

    res.json({
      success: true,
      deleted: deleted[0],
      message: 'Stress entry deleted successfully',
    });
  } catch (error) {
    console.error('[Stress] DELETE /:id error:', error);
    res.status(500).json({ error: 'Failed to delete stress entry' });
  }
});

export default router;
