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