// Gamification Reward Service
// Handles XP calculation, awarding, and streak management

import { db } from "../config/db.js";
import { gamificationTable } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { normalizeDateUTC, addDaysUTC, getLocalDateUTC } from "../utils/timezone.js";
import { calculateLevel, checkLevelUp } from "../utils/levelCalculator.js";
import {
  sendStreakCelebration,
  sendUserNotification,
  NOTIFICATION_TYPES,
} from "./pushNotificationService.js";

// Streak milestones that trigger celebrations
const STREAK_MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365];

// ============================================================================
// XP REWARDS BY LOG TYPE
// Balanced to reward all healthy behaviors equally
// ============================================================================
const XP_REWARDS = {
  food: { first: 10, subsequent: 5, dailyCap: 3 },      // First 3 meals: 10 XP, then 5 XP
  water: { base: 5, goalBonus: 10 },                     // 5 XP per log, +10 bonus for hitting daily goal
  mood: { base: 8 },                                     // 8 XP per mood log (encourages reflection)
  activity: { base: 10, intensityMultiplier: 0.5 },      // 10 XP base + bonus for intensity/duration
};

/**
 * Calculate XP for any log type
 * @param {string} logType - 'food' | 'water' | 'mood' | 'activity'
 * @param {Object} context - Additional context (e.g., logNumber, hitGoal, duration)
 * @returns {number} XP to award
 */
export function calculateLogXP(logType, context = {}) {
  const rewards = XP_REWARDS[logType];
  if (!rewards) return 5; // Default fallback

  switch (logType) {
    case 'food': {
      // First 3 meals of the day get bonus XP
      const logNumber = context.logNumber || 1;
      return logNumber <= rewards.dailyCap ? rewards.first : rewards.subsequent;
    }

    case 'water': {
      // Base XP + bonus if this log hits daily goal
      let waterXP = rewards.base;
      if (context.hitDailyGoal) waterXP += rewards.goalBonus;
      return waterXP;
    }

    case 'mood':
      // Flat XP for mood tracking (important for mental health)
      return rewards.base;

    case 'activity': {
      // Base XP + bonus based on duration (1 XP per 5 minutes, capped at 20 bonus)
      let activityXP = rewards.base;
      if (context.durationMinutes) {
        activityXP += Math.min(Math.floor(context.durationMinutes / 5), 20);
      }
      return activityXP;
    }

    default:
      return 5;
  }
}

/**
 * Calculate XP to award for a meal log
 * Rules: First 3 meals = 10 XP each, meals 4+ = 5 XP each
 * @param {string} userId - User ID
 * @param {Date} date - Date of the meal (will be normalized)
 * @param {Object} db - Database connection (can be transaction)
 * @returns {Promise<Object>} { xp, mealNumber, dailyTotal }
 */
export async function calculateMealXP(userId, date, dbConn = db) {
  const normalizedDate = normalizeDateUTC(date);

  // Note: dailyMealCountsTable will be created in migration
  // For now, we'll query foodLogTable to count meals for the day
  // This is a temporary implementation until migration is run

  try {
    // Import foodLogTable dynamically to avoid circular dependencies
    const { foodLogTable } = await import("../db/schema.js");

    // Count existing meals for today
    const startOfDay = new Date(normalizedDate);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingMeals = await dbConn
      .select({ count: sql`count(*)::int` })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${startOfDay}`,
          sql`${foodLogTable.loggedDate} <= ${endOfDay}`
        )
      );

    const currentMealCount = existingMeals[0]?.count || 0;
    const nextMealNumber = currentMealCount + 1;

    // XP Rules: meals 1-3 = 10 XP, meals 4+ = 5 XP
    const xpToAward = nextMealNumber <= 3 ? 10 : 5;

    // Calculate daily total (rough estimate)
    const dailyTotal = Math.min(currentMealCount * 10, 30) + Math.max(0, (currentMealCount - 3) * 5) + xpToAward;

    return {
      xp: xpToAward,
      mealNumber: nextMealNumber,
      dailyTotal,
    };
  } catch (error) {
    console.error("[GamificationReward] Error calculating meal XP:", error);
    // Fallback: award 10 XP if calculation fails
    return {
      xp: 10,
      mealNumber: 1,
      dailyTotal: 10,
    };
  }
}

/**
 * Award XP to a user and update their level
 * @param {string} userId - User ID
 * @param {number} xp - XP to award
 * @param {string} source - Source of XP (meal_log, achievement_unlock, etc.)
 * @param {Object} dbConn - Database connection (can be transaction)
 * @returns {Promise<Object>} { newXP, newLevel, leveledUp }
 */
export async function awardXP(userId, xp, source = "meal_log", dbConn = db) {
  try {
    // Get current gamification data
    const [currentGamification] = await dbConn
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId));

    if (!currentGamification) {
      // Initialize gamification record if it doesn't exist
      const [newGamification] = await dbConn
        .insert(gamificationTable)
        .values({
          userId,
          xp: xp,
          level: 1,
          streak: 0,
          badges: [],
        })
        .returning();

      const levelInfo = calculateLevel(xp);

      return {
        newXP: xp,
        newLevel: levelInfo.level,
        leveledUp: levelInfo.level > 1,
        currentLevelXP: levelInfo.currentLevelXP,
        nextLevelXP: levelInfo.nextLevelXP,
        progressPercent: levelInfo.progressPercent,
      };
    }

    // Check if level up will occur
    const currentXP = currentGamification.xp || 0;
    const levelUpInfo = checkLevelUp(currentXP, xp);

    // Award XP
    const newXP = currentXP + xp;
    const levelInfo = calculateLevel(newXP);

    await dbConn
      .update(gamificationTable)
      .set({
        xp: newXP,
        level: levelInfo.level,
        lastXpAwardedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gamificationTable.userId, userId));

    console.log(`[GamificationReward] User ${userId}: +${xp} XP from ${source} (${currentXP} → ${newXP}, Level ${levelUpInfo.oldLevel} → ${levelInfo.level})`);

    // Send push notification for level up
    if (levelUpInfo.leveledUp) {
      sendUserNotification(dbConn, userId, NOTIFICATION_TYPES.GOAL_ACHIEVED, {
        title: `🎉 Level ${levelInfo.level}!`,
        body: `Congratulations! You've reached Level ${levelInfo.level}. Keep up the great work!`,
        data: { type: 'level_up', newLevel: levelInfo.level, screen: 'profile' },
        channelId: 'insights',
      }).catch((err) => {
        console.error(`[GamificationReward] Failed to send level-up notification:`, err);
      });
    }

    return {
      newXP,
      newLevel: levelInfo.level,
      leveledUp: levelUpInfo.leveledUp,
      currentLevelXP: levelInfo.currentLevelXP,
      nextLevelXP: levelInfo.nextLevelXP,
      progressPercent: levelInfo.progressPercent,
    };
  } catch (error) {
    console.error("[GamificationReward] Error awarding XP:", error);
    throw error;
  }
}

/**
 * Update user's streak based on logging activity (Snapchat-style)
 * Rules: ANY log (food, water, mood, activity) counts towards streak
 * @param {string} userId - User ID
 * @param {Date} date - Date of current log
 * @param {Object} dbConn - Database connection (can be transaction)
 * @param {number|null} timezoneOffset - User's timezone offset in minutes
 * @returns {Promise<Object>} { streak, streakIncremented, previousStreak, streakBroken, canRestore }
 */
export async function updateStreak(userId, date, dbConn = db, timezoneOffset = null) {
  try {
    const today = Number.isFinite(timezoneOffset)
      ? getLocalDateUTC(timezoneOffset, date)
      : normalizeDateUTC(date);

    // PRODUCTION FIX: Remove transaction for Neon HTTP driver compatibility
    // Neon HTTP driver doesn't support transactions, so we use simple queries
    // Race conditions are unlikely for single-user streak updates

    // Get current gamification data
    const selectQuery = sql`
      SELECT * FROM gamification
      WHERE user_id = ${userId}
    `;
    const selectResult = await dbConn.execute(selectQuery);
    const currentGamification = selectResult.rows?.[0] || null;

    if (!currentGamification) {
      // Initialize with streak of 1 for brand new user
      const insertResult = await dbConn
        .insert(gamificationTable)
        .values({
          userId,
          xp: 0,
          level: 1,
          streak: 1,
          previousStreak: 0,
          lastLogDate: today,
          lastStreakUpdatedAt: today,
          timezoneOffset: Number.isFinite(timezoneOffset) ? timezoneOffset : null,
          badges: [],
        })
        .onConflictDoNothing()
        .returning();

      if (!insertResult || insertResult.length === 0) {
        const refetch = await dbConn.execute(selectQuery);
        const existingRow = refetch.rows?.[0];
        if (existingRow) {
          return {
            streak: existingRow.streak,
            streakIncremented: false,
            previousStreak: existingRow.previous_streak || 0,
            streakBroken: false,
            canRestore: false,
          };
        }
      }

      return {
        streak: 1,
        streakIncremented: true,
        previousStreak: 0,
        streakBroken: false,
        canRestore: false,
        isFirstLog: true,
      };
    }

    const currentStreak = currentGamification.streak || 0;
    const storedPreviousStreak = currentGamification.previous_streak || 0;
    const lastLogDate = currentGamification.last_log_date
      ? normalizeDateUTC(new Date(currentGamification.last_log_date))
      : null;
    const lastStreakUpdated = currentGamification.last_streak_updated_at
      ? normalizeDateUTC(new Date(currentGamification.last_streak_updated_at))
      : null;
    const streakResetAt = currentGamification.streak_reset_at
      ? new Date(currentGamification.streak_reset_at)
      : null;

    // Check if already updated streak today
    if (lastStreakUpdated && lastStreakUpdated.getTime() === today.getTime()) {
      return {
        streak: currentStreak,
        streakIncremented: false,
        previousStreak: storedPreviousStreak,
        streakBroken: false,
        canRestore: false,
      };
    }

    let newStreak = currentStreak;
    let streakIncremented = false;
    let streakBroken = false;
    let canRestore = false;
    let newPreviousStreak = storedPreviousStreak;
    let newStreakResetAt = streakResetAt;

    if (!lastLogDate) {
      // First ever log
      newStreak = 1;
      streakIncremented = true;
    } else {
      const yesterday = addDaysUTC(today, -1);
      const daysSinceLastLog = Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLastLog === 0) {
        // Same day log - no streak change
        newStreak = currentStreak;
      } else if (daysSinceLastLog === 1 || lastLogDate.getTime() === yesterday.getTime()) {
        // Consecutive day - increment streak! 🔥
        newStreak = currentStreak + 1;
        streakIncremented = true;
      } else if (daysSinceLastLog > 1) {
        // MISSED DAY(S) - Snapchat-style: Store previous streak for restoration
        streakBroken = true;
        newPreviousStreak = currentStreak; // Store the lost streak
        newStreakResetAt = new Date(); // Mark when it was reset
        newStreak = 1; // Start fresh at 1 (they're logging now)
        streakIncremented = true; // This IS their first day of new streak

        // Can restore within 24 hours if they have freezes
        const freezesAvailable = currentGamification.streak_freezes || 0;
        canRestore = freezesAvailable > 0 && currentStreak > 1;

        console.log(`[Streak] 💔 User ${userId}: Streak broken! Was ${currentStreak} days, stored for potential restore`);
      }
    }

    // Build update object
    const updateData = {
      streak: newStreak,
      lastLogDate: today,
      lastStreakUpdatedAt: today,
      timezoneOffset: Number.isFinite(timezoneOffset)
        ? timezoneOffset
        : currentGamification.timezone_offset ?? null,
      updatedAt: new Date(),
    };

    // Only update previousStreak/streakResetAt if streak was broken
    if (streakBroken) {
      updateData.previousStreak = newPreviousStreak;
      updateData.streakResetAt = newStreakResetAt;
    }

    await dbConn
      .update(gamificationTable)
      .set(updateData)
      .where(eq(gamificationTable.userId, userId));

    if (newStreak !== currentStreak) {
      const emoji = streakBroken ? '💔→🔥' : (streakIncremented ? '🔥' : '');
      console.log(`[Streak] User ${userId}: ${currentStreak} → ${newStreak} ${emoji}`);
    }

    const result = {
      streak: newStreak,
      streakIncremented,
      previousStreak: streakBroken ? newPreviousStreak : storedPreviousStreak,
      streakBroken,
      canRestore,
      isMilestone: STREAK_MILESTONES.includes(newStreak),
      daysMissed: streakBroken ? Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24)) - 1 : 0,
    };

    // Send push notification for streak milestones
    if (result.streakIncremented && !result.streakBroken && STREAK_MILESTONES.includes(result.streak)) {
      sendStreakCelebration(dbConn, userId, result.streak).catch((err) => {
        console.error(`[GamificationReward] Failed to send streak notification:`, err);
      });
    }

    return result;
  } catch (error) {
    console.error("[GamificationReward] Error updating streak:", error);
    throw error;
  }
}

/**
 * Get total meals logged by user (for achievement checking)
 * @param {string} userId - User ID
 * @param {Object} dbConn - Database connection
 * @returns {Promise<number>} Total meals logged
 */
export async function getTotalMealsLogged(userId, dbConn = db) {
  try {
    const { foodLogTable } = await import("../db/schema.js");

    const result = await dbConn
      .select({ count: sql`count(*)::int` })
      .from(foodLogTable)
      .where(eq(foodLogTable.userId, userId));

    return result[0]?.count || 0;
  } catch (error) {
    console.error("[GamificationReward] Error getting total meals:", error);
    return 0;
  }
}

/**
 * Get user's last log date
 * @param {string} userId - User ID
 * @param {Object} dbConn - Database connection
 * @returns {Promise<Date|null>} Last log date
 */
export async function getLastLogDate(userId, dbConn = db) {
  try {
    const [gamification] = await dbConn
      .select({ lastLogDate: gamificationTable.lastLogDate })
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId));

    return gamification?.lastLogDate ? new Date(gamification.lastLogDate) : null;
  } catch (error) {
    console.error("[GamificationReward] Error getting last log date:", error);
    return null;
  }
}

/**
 * Initialize gamification record for a new user
 * @param {string} userId - User ID
 * @param {Object} dbConn - Database connection
 * @returns {Promise<Object>} Created gamification record
 */
export async function initializeGamification(userId, dbConn = db) {
  try {
    const [existing] = await dbConn
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId));

    if (existing) {
      return existing;
    }

    const [newGamification] = await dbConn
      .insert(gamificationTable)
      .values({
        userId,
        xp: 0,
        level: 1,
        streak: 0,
        badges: [],
      })
      .returning();

    console.log(`[GamificationReward] Initialized gamification for user ${userId}`);
    return newGamification;
  } catch (error) {
    console.error("[GamificationReward] Error initializing gamification:", error);
    throw error;
  }
}

/**
 * Backfill XP from historical logs
 * Calculates XP that should have been awarded for all past logs
 * @param {string} userId - User ID
 * @param {Object} dbConn - Database connection
 * @returns {Promise<Object>} Backfill results with XP breakdown
 */
export async function backfillXPFromHistory(userId, dbConn = db) {
  try {
    console.log(`[GamificationReward] Starting XP backfill for user ${userId}`);

    // Import tables
    const { foodLogTable, waterLogTable, moodLogTable } = await import("../db/schema.js");

    // Count food logs (10 XP for first 3 per day, 5 XP for rest)
    const foodLogsResult = await dbConn.execute(sql`
      SELECT DATE(logged_at) as log_date, COUNT(*) as count
      FROM food_logs
      WHERE user_id = ${userId}
      GROUP BY DATE(logged_at)
    `);
    const foodLogsByDay = foodLogsResult.rows || [];
    let foodXP = 0;
    foodLogsByDay.forEach(day => {
      const count = parseInt(day.count) || 0;
      // First 3 meals = 10 XP each, rest = 5 XP each
      const bonusMeals = Math.min(count, 3);
      const regularMeals = Math.max(0, count - 3);
      foodXP += bonusMeals * 10 + regularMeals * 5;
    });

    // Count water logs (5 XP each)
    const waterLogsResult = await dbConn.execute(sql`
      SELECT COUNT(*) as count FROM water_logs WHERE user_id = ${userId}
    `);
    const waterCount = parseInt(waterLogsResult.rows?.[0]?.count) || 0;
    const waterXP = waterCount * 5;

    // Count mood logs (8 XP each)
    const moodLogsResult = await dbConn.execute(sql`
      SELECT COUNT(*) as count FROM mood_logs WHERE user_id = ${userId}
    `);
    const moodCount = parseInt(moodLogsResult.rows?.[0]?.count) || 0;
    const moodXP = moodCount * 8;

    // Count activity logs (10 XP base + duration bonus)
    const activityLogsResult = await dbConn.execute(sql`
      SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes, COUNT(*) as count
      FROM activity_log
      WHERE user_id = ${userId}
    `);
    const activityCount = parseInt(activityLogsResult.rows?.[0]?.count) || 0;
    const totalActivityMinutes = parseInt(activityLogsResult.rows?.[0]?.total_minutes) || 0;
    // 10 XP per log + 1 XP per 5 minutes (capped at 20 bonus per log)
    const activityXP = activityCount * 10 + Math.min(Math.floor(totalActivityMinutes / 5), activityCount * 20);

    const totalXP = foodXP + waterXP + moodXP + activityXP;

    console.log(`[GamificationReward] Backfill calculation:
      Food: ${foodLogsByDay.length} days, ${foodXP} XP
      Water: ${waterCount} logs, ${waterXP} XP
      Mood: ${moodCount} logs, ${moodXP} XP
      Activity: ${activityCount} logs, ${activityXP} XP
      TOTAL: ${totalXP} XP`);

    // Update gamification table with backfilled XP
    const levelInfo = calculateLevel(totalXP);

    await dbConn
      .insert(gamificationTable)
      .values({
        userId,
        xp: totalXP,
        level: levelInfo.level,
        streak: 0, // Streak would need separate calculation
        badges: [],
      })
      .onConflictDoUpdate({
        target: gamificationTable.userId,
        set: {
          xp: totalXP,
          level: levelInfo.level,
        },
      });

    console.log(`[GamificationReward] Backfill complete for user ${userId}: ${totalXP} XP, Level ${levelInfo.level}`);

    return {
      success: true,
      totalXP,
      breakdown: {
        food: { days: foodLogsByDay.length, xp: foodXP },
        water: { logs: waterCount, xp: waterXP },
        mood: { logs: moodCount, xp: moodXP },
        activity: { logs: activityCount, minutes: totalActivityMinutes, xp: activityXP },
      },
      level: levelInfo.level,
      nextLevelXP: levelInfo.nextLevelXP,
      progressPercent: levelInfo.progressPercent,
    };
  } catch (error) {
    console.error("[GamificationReward] Error backfilling XP:", error);
    throw error;
  }
}
