/**
 * Gamification Service - Snapchat-Style Streak Management
 *
 * Features:
 * - Streak freezes: Earned every 7 days, can restore broken streaks
 * - 24-hour restoration window after streak loss
 * - Transaction-protected operations
 */

import { db } from "../config/db.js";
import { gamificationTable } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

// Unified freeze award milestones (consistent everywhere)
const FREEZE_AWARD_INTERVAL = 7; // Award 1 freeze every 7 days of streak

/**
 * Check if a user qualifies for a streak freeze and awards it.
 * Called whenever a streak increments.
 * Rule: 1 freeze for every 7 consecutive days (7, 14, 21, 28...)
 *
 * @param {string} userId - User ID
 * @param {number} currentStreak - Current streak count
 * @returns {Promise<Object>} Award result
 */
export async function checkAndAwardStreakFreeze(userId, currentStreak) {
  try {
    // Award freeze at every 7-day milestone
    if (currentStreak > 0 && currentStreak % FREEZE_AWARD_INTERVAL === 0) {
      // Use transaction to prevent race conditions
      const result = await db.transaction(async (tx) => {
        // Lock the row
        const lockQuery = sql`
          SELECT streak_freezes, last_freeze_awarded_at
          FROM gamification
          WHERE user_id = ${userId}
          FOR UPDATE
        `;
        const lockedRows = await tx.execute(lockQuery);
        const userData = lockedRows.rows?.[0];

        if (!userData) return { awarded: false, reason: 'no_user_data' };

        // Check if we already awarded a freeze for this milestone
        // (within same day to prevent duplicates)
        const lastAwarded = userData.last_freeze_awarded_at
          ? new Date(userData.last_freeze_awarded_at)
          : null;

        if (lastAwarded) {
          const hoursSince = (Date.now() - lastAwarded.getTime()) / (1000 * 60 * 60);
          // Don't award if already awarded in last 20 hours (buffer for timezone)
          if (hoursSince < 20) {
            return { awarded: false, reason: 'recently_awarded' };
          }
        }

        // Award the freeze
        await tx
          .update(gamificationTable)
          .set({
            streakFreezes: sql`${gamificationTable.streakFreezes} + 1`,
            lastFreezeAwardedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(gamificationTable.userId, userId));

        const newFreezeCount = (userData.streak_freezes || 0) + 1;
        console.log(`[Gamification] ❄️ User ${userId} earned streak freeze at ${currentStreak} days (now has ${newFreezeCount})`);

        return {
          awarded: true,
          message: `🎉 Streak Freeze earned! You now have ${newFreezeCount} freeze${newFreezeCount > 1 ? 's' : ''}.`,
          newFreezeCount,
          milestone: currentStreak,
        };
      });

      return result;
    }

    return { awarded: false };
  } catch (error) {
    console.error("[Gamification] Failed to award streak freeze:", error);
    return { awarded: false, error: error.message };
  }
}

/**
 * Consume a streak freeze to save a broken streak.
 * Called by the daily cron job when a day is missed.
 *
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if freeze was consumed and streak saved
 */
export async function consumeStreakFreeze(userId) {
  try {
    const result = await db.transaction(async (tx) => {
      // Lock the row
      const lockQuery = sql`
        SELECT streak, streak_freezes
        FROM gamification
        WHERE user_id = ${userId}
        FOR UPDATE
      `;
      const lockedRows = await tx.execute(lockQuery);
      const userData = lockedRows.rows?.[0];

      if (!userData) return { consumed: false, reason: 'no_user_data' };

      const freezes = userData.streak_freezes || 0;
      const streak = userData.streak || 0;

      if (freezes <= 0) {
        return { consumed: false, reason: 'no_freezes_available' };
      }

      if (streak <= 0) {
        return { consumed: false, reason: 'no_active_streak' };
      }

      // Consume the freeze - streak stays intact
      await tx
        .update(gamificationTable)
        .set({
          streakFreezes: sql`${gamificationTable.streakFreezes} - 1`,
          // Note: We do NOT update lastFreezeAwardedAt here - that's for awarding, not consuming
          lastStreakUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(gamificationTable.userId, userId));

      console.log(`[Gamification] ❄️ User ${userId} used streak freeze (${freezes - 1} remaining, streak preserved at ${streak})`);

      return {
        consumed: true,
        freezesRemaining: freezes - 1,
        streakPreserved: streak,
      };
    });

    return result.consumed;
  } catch (error) {
    console.error("[Gamification] Failed to consume streak freeze:", error);
    return false;
  }
}

/**
 * Restore a broken streak using a streak freeze (Snapchat-style).
 * User can restore their streak within 24 hours of it being reset.
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result with success status and details
 */
export async function restoreStreak(userId) {
  try {
    // Use transaction for atomic restore operation
    const result = await db.transaction(async (tx) => {
      // Lock the row to prevent race conditions
      const lockQuery = sql`
        SELECT * FROM gamification
        WHERE user_id = ${userId}
        FOR UPDATE
      `;
      const lockedRows = await tx.execute(lockQuery);
      const userData = lockedRows.rows?.[0];

      if (!userData) {
        return {
          success: false,
          error: 'NO_GAMIFICATION_DATA',
          message: 'No gamification data found',
        };
      }

      const freezes = userData.streak_freezes || 0;
      const previousStreak = userData.previous_streak || 0;
      const currentStreak = userData.streak || 0;
      const streakResetAt = userData.streak_reset_at
        ? new Date(userData.streak_reset_at)
        : null;

      // Validation checks
      if (freezes <= 0) {
        return {
          success: false,
          error: 'NO_FREEZES',
          message: 'No streak freezes available. Keep logging to earn freezes every 7 days!',
          freezesAvailable: 0,
        };
      }

      if (previousStreak <= 0) {
        return {
          success: false,
          error: 'NO_STREAK_TO_RESTORE',
          message: 'No previous streak found to restore.',
          currentStreak,
        };
      }

      // Check 24-hour restoration window
      if (streakResetAt) {
        const hoursSinceReset = (Date.now() - streakResetAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceReset > 24) {
          return {
            success: false,
            error: 'RESTORATION_EXPIRED',
            message: `Restoration window expired. You can only restore within 24 hours of losing your streak.`,
            hoursSinceReset: Math.floor(hoursSinceReset),
            expiredBy: Math.floor(hoursSinceReset - 24),
          };
        }
      }

      // Don't restore if current streak is already higher (edge case)
      if (currentStreak >= previousStreak) {
        return {
          success: false,
          error: 'STREAK_ALREADY_HIGHER',
          message: `Your current streak (${currentStreak}) is already equal or higher!`,
          currentStreak,
          previousStreak,
        };
      }

      // Perform the restoration
      await tx
        .update(gamificationTable)
        .set({
          streak: previousStreak,
          previousStreak: 0, // Clear stored value
          streakResetAt: null, // Clear reset timestamp
          streakFreezes: sql`${gamificationTable.streakFreezes} - 1`,
          lastStreakUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(gamificationTable.userId, userId));

      console.log(`[Gamification] 🔥 User ${userId} restored streak: ${currentStreak} → ${previousStreak} (used 1 freeze, ${freezes - 1} remaining)`);

      return {
        success: true,
        message: `Your ${previousStreak}-day streak has been restored! 🔥`,
        restoredStreak: previousStreak,
        freezesRemaining: freezes - 1,
        previousStreak: currentStreak,
      };
    });

    return result;
  } catch (error) {
    console.error("[Gamification] Failed to restore streak:", error);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to restore streak. Please try again.',
    };
  }
}

/**
 * Get streak restoration info for a user (for popup display)
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Restoration status and details
 */
export async function getStreakRestorationInfo(userId) {
  try {
    const [userData] = await db
      .select({
        streak: gamificationTable.streak,
        previousStreak: gamificationTable.previousStreak,
        streakFreezes: gamificationTable.streakFreezes,
        streakResetAt: gamificationTable.streakResetAt,
      })
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1);

    if (!userData) {
      return { canRestore: false, reason: 'no_data' };
    }

    const { streak, previousStreak, streakFreezes, streakResetAt } = userData;

    // Check if restoration is possible
    if (!previousStreak || previousStreak <= 0) {
      return {
        canRestore: false,
        reason: 'no_previous_streak',
        currentStreak: streak || 0,
        freezesAvailable: streakFreezes || 0,
      };
    }

    if (!streakFreezes || streakFreezes <= 0) {
      return {
        canRestore: false,
        reason: 'no_freezes',
        currentStreak: streak || 0,
        previousStreak,
        freezesAvailable: 0,
      };
    }

    // Check time window
    let hoursRemaining = 24;
    let isExpired = false;

    if (streakResetAt) {
      const hoursSinceReset = (Date.now() - new Date(streakResetAt).getTime()) / (1000 * 60 * 60);
      hoursRemaining = Math.max(0, 24 - hoursSinceReset);
      isExpired = hoursSinceReset > 24;
    }

    if (isExpired) {
      return {
        canRestore: false,
        reason: 'expired',
        currentStreak: streak || 0,
        previousStreak,
        freezesAvailable: streakFreezes,
        expiredAt: streakResetAt,
      };
    }

    return {
      canRestore: true,
      currentStreak: streak || 0,
      previousStreak,
      freezesAvailable: streakFreezes,
      hoursRemaining: Math.floor(hoursRemaining),
      minutesRemaining: Math.floor((hoursRemaining % 1) * 60),
      streakResetAt,
    };
  } catch (error) {
    console.error("[Gamification] Error getting restoration info:", error);
    return { canRestore: false, error: error.message };
  }
}

/**
 * Check if user's streak was automatically saved by freeze (cron job)
 * Returns info for "Streak Saved" notification
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Saved streak info if applicable
 */
export async function checkStreakSavedStatus(userId) {
  try {
    const [userData] = await db
      .select({
        streak: gamificationTable.streak,
        streakFreezes: gamificationTable.streakFreezes,
        lastStreakUpdatedAt: gamificationTable.lastStreakUpdatedAt,
      })
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1);

    if (!userData) return null;

    // Logic to detect if streak was saved by cron
    // This would be set by the cron job - we'd need a flag
    // For now, return current status
    return {
      streak: userData.streak || 0,
      freezesRemaining: userData.streakFreezes || 0,
    };
  } catch (error) {
    console.error("[Gamification] Error checking streak saved status:", error);
    return null;
  }
}
