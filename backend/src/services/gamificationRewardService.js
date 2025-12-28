// Gamification Reward Service
// Handles XP calculation, awarding, and streak management

import { db } from "../config/db.js";
import { gamificationTable } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { normalizeDateUTC, addDaysUTC } from "../utils/timezone.js";
import { calculateLevel, checkLevelUp } from "../utils/levelCalculator.js";

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
 * Update user's streak based on logging activity
 * Rules: Any logging (1+ meals) continues streak
 * @param {string} userId - User ID
 * @param {Date} date - Date of current log
 * @param {Object} dbConn - Database connection (can be transaction)
 * @returns {Promise<Object>} { streak, streakIncremented, previousStreak }
 */
export async function updateStreak(userId, date, dbConn = db) {
  try {
    const today = normalizeDateUTC(date);

    // Get current gamification data
    const [currentGamification] = await dbConn
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId));

    if (!currentGamification) {
      // Initialize with streak of 1
      await dbConn
        .insert(gamificationTable)
        .values({
          userId,
          xp: 0,
          level: 1,
          streak: 1,
          lastLogDate: today,
          lastStreakUpdatedAt: today,
          badges: [],
        })
        .returning();

      return {
        streak: 1,
        streakIncremented: true,
        previousStreak: 0,
      };
    }

    const currentStreak = currentGamification.streak || 0;
    const lastLogDate = currentGamification.lastLogDate
      ? normalizeDateUTC(new Date(currentGamification.lastLogDate))
      : null;

    const lastStreakUpdated = currentGamification.lastStreakUpdatedAt
      ? normalizeDateUTC(new Date(currentGamification.lastStreakUpdatedAt))
      : null;

    // Check if already updated streak today
    if (lastStreakUpdated && lastStreakUpdated.getTime() === today.getTime()) {
      return {
        streak: currentStreak,
        streakIncremented: false,
        previousStreak: currentStreak,
      };
    }

    let newStreak = currentStreak;
    let streakIncremented = false;

    if (!lastLogDate) {
      // First ever log
      newStreak = 1;
      streakIncremented = true;
    } else {
      const yesterday = addDaysUTC(today, -1);
      const daysSinceLastLog = Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLastLog === 0) {
        // Same day log, no change
        newStreak = currentStreak;
      } else if (daysSinceLastLog === 1 || lastLogDate.getTime() === yesterday.getTime()) {
        // Consecutive day
        newStreak = currentStreak + 1;
        streakIncremented = true;
      } else if (daysSinceLastLog > 1) {
        // Missed day(s), reset streak
        newStreak = 1;
        streakIncremented = false;
      }
    }

    // Update gamification table
    await dbConn
      .update(gamificationTable)
      .set({
        streak: newStreak,
        lastLogDate: today,
        lastStreakUpdatedAt: today,
        updatedAt: new Date(),
      })
      .where(eq(gamificationTable.userId, userId));

    if (newStreak !== currentStreak) {
      console.log(`[GamificationReward] User ${userId}: Streak ${currentStreak} → ${newStreak} ${streakIncremented ? '⬆️' : '🔄'}`);
    }

    return {
      streak: newStreak,
      streakIncremented,
      previousStreak: currentStreak,
    };
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
