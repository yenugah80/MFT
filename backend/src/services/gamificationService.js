import { db } from "../config/db.js";
import { gamificationTable } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

/**
 * Checks if a user qualifies for a streak freeze and awards it.
 * Should be called whenever a streak increments.
 */
export async function checkAndAwardStreakFreeze(userId, currentStreak) {
  try {
    // Rule: Award 1 freeze for every 7 days of streak
    if (currentStreak > 0 && currentStreak % 7 === 0) {
      
      // Update user: increment freezes and set award date
      await db.update(gamificationTable)
        .set({ 
          streakFreezes: sql`${gamificationTable.streakFreezes} + 1`,
          lastFreezeAwardedAt: new Date() 
        })
        .where(eq(gamificationTable.userId, userId));

      console.log(`[Gamification] Awarded streak freeze to user ${userId} for ${currentStreak} day streak`);
      
      return {
        awarded: true,
        message: "You earned a Streak Freeze! ❄️",
        newFreezeCount: null // Client should refresh data
      };
    }
    
    return { awarded: false };
  } catch (error) {
    console.error("[Gamification] Failed to award streak freeze:", error);
    throw error;
  }
}

/**
 * Consumes a streak freeze to save a broken streak.
 * Should be called by a cron job or daily check logic when a day is missed.
 */
export async function consumeStreakFreeze(userId) {
  try {
    const userStats = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId)).limit(1);

    if (userStats[0] && userStats[0].streakFreezes > 0) {
      await db.update(gamificationTable)
        .set({ streakFreezes: sql`${gamificationTable.streakFreezes} - 1` })
        .where(eq(gamificationTable.userId, userId));

      console.log(`[Gamification] Consumed streak freeze for user ${userId}`);
      return true; // Streak saved
    }

    return false; // Streak lost
  } catch (error) {
    console.error("[Gamification] Failed to consume streak freeze:", error);
    return false;
  }
}

/**
 * Restore a broken streak using a streak freeze.
 * User can restore their streak within 24 hours of it being reset.
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result with success status and message
 */
export async function restoreStreak(userId) {
  try {
    const [userStats] = await db
      .select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1);

    if (!userStats) {
      return {
        success: false,
        error: 'NO_GAMIFICATION_DATA',
        message: 'No gamification data found for user',
      };
    }

    // Check if user has freezes available
    if (!userStats.streakFreezes || userStats.streakFreezes <= 0) {
      return {
        success: false,
        error: 'NO_FREEZES',
        message: 'No streak freezes available. Earn freezes by maintaining a 7-day streak!',
        freezesAvailable: 0,
      };
    }

    // Check if there's a streak to restore
    const previousStreak = userStats.previousStreak || 0;
    if (previousStreak <= 0) {
      return {
        success: false,
        error: 'NO_STREAK_TO_RESTORE',
        message: 'No previous streak found to restore',
        currentStreak: userStats.streak || 0,
      };
    }

    // Check if streak was reset within the last 24 hours
    const streakResetAt = userStats.streakResetAt ? new Date(userStats.streakResetAt) : null;
    if (streakResetAt) {
      const hoursSinceReset = (Date.now() - streakResetAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceReset > 24) {
        return {
          success: false,
          error: 'RESTORATION_EXPIRED',
          message: 'Streak restoration is only available within 24 hours of losing your streak',
          hoursSinceReset: Math.floor(hoursSinceReset),
        };
      }
    }

    // Check if streak is already active (no need to restore)
    if (userStats.streak > 0) {
      return {
        success: false,
        error: 'STREAK_ACTIVE',
        message: 'Your streak is already active! No restoration needed.',
        currentStreak: userStats.streak,
      };
    }

    // Restore the streak
    await db
      .update(gamificationTable)
      .set({
        streak: previousStreak, // Restore to previous value
        previousStreak: 0, // Clear the stored value
        streakResetAt: null, // Clear the reset timestamp
        streakFreezes: sql`${gamificationTable.streakFreezes} - 1`, // Consume one freeze
        lastStreakUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(gamificationTable.userId, userId));

    console.log(`[Gamification] 🔥 User ${userId} restored streak to ${previousStreak} days (used 1 freeze, ${userStats.streakFreezes - 1} remaining)`);

    return {
      success: true,
      message: `Your ${previousStreak}-day streak has been restored! 🔥`,
      restoredStreak: previousStreak,
      freezesRemaining: userStats.streakFreezes - 1,
    };
  } catch (error) {
    console.error("[Gamification] Failed to restore streak:", error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to restore streak. Please try again.',
    };
  }
}