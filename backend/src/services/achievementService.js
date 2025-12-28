// Achievement Service
// Handles checking criteria and unlocking achievements

import { db } from "../config/db.js";
import { achievementsTable, userAchievementsTable, gamificationTable, foodLogTable } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import {
  STREAK_ACHIEVEMENTS,
  MEAL_COUNT_ACHIEVEMENTS,
  LEVEL_ACHIEVEMENTS,
  RECOVERY_ACHIEVEMENTS,
  getAchievementById,
} from "../constants/achievements.js";
import { normalizeDateUTC, addDaysUTC } from "../utils/timezone.js";
import { awardXP } from "./gamificationRewardService.js";

/**
 * Check and unlock achievements for a user
 * @param {string} userId - User ID
 * @param {Object} context - Context for achievement checking
 * @param {number} context.totalMeals - Total meals logged by user
 * @param {number} context.level - Current user level
 * @param {number} context.streak - Current streak
 * @param {Date|null} context.lastLogDate - Last log date before current log
 * @param {boolean} context.isWeekend - Whether today is weekend
 * @param {Object} dbConn - Database connection (can be transaction)
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export async function checkAchievements(userId, context, dbConn = db) {
  try {
    const { totalMeals, level, streak, lastLogDate, isWeekend } = context;

    // Get user's unlocked achievements
    const userAchievements = await dbConn
      .select()
      .from(userAchievementsTable)
      .where(eq(userAchievementsTable.userId, userId));

    const unlockedAchievementIds = new Set(
      userAchievements.map((ua) => ua.achievementId)
    );

    // Get all achievements from database
    const allAchievements = await dbConn.select().from(achievementsTable);
    const achievementIdMap = new Map(allAchievements.map((a) => [a.name, a.id]));

    const newlyUnlocked = [];

    // 1. CHECK STREAK ACHIEVEMENTS
    for (const achievement of STREAK_ACHIEVEMENTS) {
      const dbAchievementId = achievementIdMap.get(achievement.name);
      if (!dbAchievementId || unlockedAchievementIds.has(dbAchievementId)) {
        continue; // Already unlocked or doesn't exist in DB
      }

      if (streak >= achievement.streak) {
        await unlockAchievement(userId, achievement, dbAchievementId, dbConn);
        newlyUnlocked.push(achievement);
      }
    }

    // 2. CHECK MEAL COUNT ACHIEVEMENTS
    for (const achievement of MEAL_COUNT_ACHIEVEMENTS) {
      const dbAchievementId = achievementIdMap.get(achievement.name);
      if (!dbAchievementId || unlockedAchievementIds.has(dbAchievementId)) {
        continue;
      }

      if (totalMeals >= achievement.count) {
        await unlockAchievement(userId, achievement, dbAchievementId, dbConn);
        newlyUnlocked.push(achievement);
      }
    }

    // 3. CHECK LEVEL ACHIEVEMENTS
    for (const achievement of LEVEL_ACHIEVEMENTS) {
      const dbAchievementId = achievementIdMap.get(achievement.name);
      if (!dbAchievementId || unlockedAchievementIds.has(dbAchievementId)) {
        continue;
      }

      if (level >= achievement.level) {
        await unlockAchievement(userId, achievement, dbAchievementId, dbConn);
        newlyUnlocked.push(achievement);
      }
    }

    // 4. CHECK RECOVERY ACHIEVEMENTS
    await checkRecoveryAchievements(
      userId,
      context,
      unlockedAchievementIds,
      achievementIdMap,
      newlyUnlocked,
      dbConn
    );

    if (newlyUnlocked.length > 0) {
      console.log(`[Achievement] User ${userId} unlocked ${newlyUnlocked.length} achievements:`,
        newlyUnlocked.map(a => a.name).join(', '));
    }

    return newlyUnlocked;
  } catch (error) {
    console.error("[Achievement] Error checking achievements:", error);
    return [];
  }
}

/**
 * Check recovery/consistency achievements (SECRET WEAPON category)
 * @private
 */
async function checkRecoveryAchievements(
  userId,
  context,
  unlockedAchievementIds,
  achievementIdMap,
  newlyUnlocked,
  dbConn
) {
  const { lastLogDate, isWeekend, streak } = context;
  const today = new Date();

  // BACK ON TRACK - Logged after missing 1+ days
  const backOnTrackAchievement = RECOVERY_ACHIEVEMENTS.find((a) => a.id === "back_on_track");
  const backOnTrackDbId = achievementIdMap.get(backOnTrackAchievement?.name);

  if (
    backOnTrackAchievement &&
    backOnTrackDbId &&
    !unlockedAchievementIds.has(backOnTrackDbId) &&
    lastLogDate
  ) {
    const daysSinceLastLog = Math.floor(
      (today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastLog >= 2) {
      // Missed at least 1 full day
      await unlockAchievement(userId, backOnTrackAchievement, backOnTrackDbId, dbConn);
      newlyUnlocked.push(backOnTrackAchievement);
    }
  }

  // WEEKEND WARRIOR - Logged on both Saturday & Sunday
  const weekendWarriorAchievement = RECOVERY_ACHIEVEMENTS.find((a) => a.id === "weekend_warrior");
  const weekendWarriorDbId = achievementIdMap.get(weekendWarriorAchievement?.name);

  if (
    weekendWarriorAchievement &&
    weekendWarriorDbId &&
    !unlockedAchievementIds.has(weekendWarriorDbId) &&
    isWeekend
  ) {
    const hasWeekendLogs = await checkWeekendLogs(userId, dbConn);
    if (hasWeekendLogs.hasSaturday && hasWeekendLogs.hasSunday) {
      await unlockAchievement(userId, weekendWarriorAchievement, weekendWarriorDbId, dbConn);
      newlyUnlocked.push(weekendWarriorAchievement);
    }
  }

  // COMEBACK KID - Rebuilt 7-day streak after a break
  const comebackKidAchievement = RECOVERY_ACHIEVEMENTS.find((a) => a.id === "comeback_kid");
  const comebackKidDbId = achievementIdMap.get(comebackKidAchievement?.name);

  if (
    comebackKidAchievement &&
    comebackKidDbId &&
    !unlockedAchievementIds.has(comebackKidDbId) &&
    streak === 7 &&
    lastLogDate
  ) {
    // Check if there was a previous streak break
    const hadPreviousStreak = await checkPreviousStreakBreak(userId, dbConn);
    if (hadPreviousStreak) {
      await unlockAchievement(userId, comebackKidAchievement, comebackKidDbId, dbConn);
      newlyUnlocked.push(comebackKidAchievement);
    }
  }

  // FRESH START MONDAY - Logged on Monday after missing weekend
  const freshStartAchievement = RECOVERY_ACHIEVEMENTS.find((a) => a.id === "fresh_start");
  const freshStartDbId = achievementIdMap.get(freshStartAchievement?.name);

  if (
    freshStartAchievement &&
    freshStartDbId &&
    !unlockedAchievementIds.has(freshStartDbId)
  ) {
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
    if (dayOfWeek === 1) {
      // It's Monday
      const missedWeekend = await checkMissedWeekend(userId, dbConn);
      if (missedWeekend) {
        await unlockAchievement(userId, freshStartAchievement, freshStartDbId, dbConn);
        newlyUnlocked.push(freshStartAchievement);
      }
    }
  }
}

/**
 * Unlock an achievement for a user
 * @private
 */
async function unlockAchievement(userId, achievement, dbAchievementId, dbConn) {
  try {
    // Insert into user_achievements (idempotent with ON CONFLICT DO NOTHING)
    await dbConn
      .insert(userAchievementsTable)
      .values({
        userId,
        achievementId: dbAchievementId,
        unlockedAt: new Date(),
      })
      .onConflictDoNothing();

    // Award bonus XP if achievement has XP reward
    if (achievement.xp) {
      await awardXP(userId, achievement.xp, `achievement_${achievement.id}`, dbConn);
    }

    console.log(`[Achievement] ✨ User ${userId} unlocked "${achievement.name}" (+${achievement.xp} XP)`);
  } catch (error) {
    console.error(`[Achievement] Error unlocking ${achievement.name}:`, error);
  }
}

/**
 * Check if user has logs on both Saturday and Sunday this week
 * @private
 */
async function checkWeekendLogs(userId, dbConn) {
  try {
    const today = normalizeDateUTC(new Date());
    const dayOfWeek = today.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // Calculate this week's Saturday and Sunday
    let saturday, sunday;

    if (dayOfWeek === 0) {
      // Today is Sunday
      sunday = today;
      saturday = addDaysUTC(today, -1);
    } else if (dayOfWeek === 6) {
      // Today is Saturday
      saturday = today;
      sunday = addDaysUTC(today, 1);
    } else {
      // Weekday - calculate nearest weekend
      const daysUntilSaturday = 6 - dayOfWeek;
      saturday = addDaysUTC(today, daysUntilSaturday);
      sunday = addDaysUTC(saturday, 1);
    }

    // Check for logs on Saturday
    const saturdayEnd = new Date(saturday);
    saturdayEnd.setUTCHours(23, 59, 59, 999);

    const saturdayLogs = await dbConn
      .select({ count: sql`count(*)::int` })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${saturday}`,
          sql`${foodLogTable.loggedDate} <= ${saturdayEnd}`
        )
      );

    // Check for logs on Sunday
    const sundayEnd = new Date(sunday);
    sundayEnd.setUTCHours(23, 59, 59, 999);

    const sundayLogs = await dbConn
      .select({ count: sql`count(*)::int` })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${sunday}`,
          sql`${foodLogTable.loggedDate} <= ${sundayEnd}`
        )
      );

    return {
      hasSaturday: (saturdayLogs[0]?.count || 0) > 0,
      hasSunday: (sundayLogs[0]?.count || 0) > 0,
    };
  } catch (error) {
    console.error("[Achievement] Error checking weekend logs:", error);
    return { hasSaturday: false, hasSunday: false };
  }
}

/**
 * Check if user had a previous streak that was broken
 * (for Comeback Kid achievement)
 * @private
 */
async function checkPreviousStreakBreak(userId, dbConn) {
  try {
    // Simple heuristic: if user has more than 10 meals logged, they likely had a previous streak
    const result = await dbConn
      .select({ count: sql`count(*)::int` })
      .from(foodLogTable)
      .where(eq(foodLogTable.userId, userId));

    const totalMeals = result[0]?.count || 0;
    return totalMeals > 10; // Likely had a streak before if they have 10+ meals
  } catch (error) {
    console.error("[Achievement] Error checking previous streak:", error);
    return false;
  }
}

/**
 * Check if user missed the weekend (for Fresh Start Monday)
 * @private
 */
async function checkMissedWeekend(userId, dbConn) {
  try {
    const today = normalizeDateUTC(new Date());
    const lastSaturday = addDaysUTC(today, -2); // Monday - 2 days = Saturday
    const lastSunday = addDaysUTC(today, -1); // Monday - 1 day = Sunday

    // Check Saturday
    const saturdayEnd = new Date(lastSaturday);
    saturdayEnd.setUTCHours(23, 59, 59, 999);

    const saturdayLogs = await dbConn
      .select({ count: sql`count(*)::int` })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${lastSaturday}`,
          sql`${foodLogTable.loggedDate} <= ${saturdayEnd}`
        )
      );

    // Check Sunday
    const sundayEnd = new Date(lastSunday);
    sundayEnd.setUTCHours(23, 59, 59, 999);

    const sundayLogs = await dbConn
      .select({ count: sql`count(*)::int` })
      .from(foodLogTable)
      .where(
        and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${lastSunday}`,
          sql`${foodLogTable.loggedDate} <= ${sundayEnd}`
        )
      );

    const saturdayCount = saturdayLogs[0]?.count || 0;
    const sundayCount = sundayLogs[0]?.count || 0;

    // Missed weekend if either Saturday OR Sunday has no logs
    return saturdayCount === 0 || sundayCount === 0;
  } catch (error) {
    console.error("[Achievement] Error checking missed weekend:", error);
    return false;
  }
}

/**
 * Get all unlocked achievements for a user
 * @param {string} userId - User ID
 * @param {Object} dbConn - Database connection
 * @returns {Promise<Array>} Array of unlocked achievements with full details
 */
export async function getUserAchievements(userId, dbConn = db) {
  try {
    const achievements = await dbConn
      .select({
        id: achievementsTable.id,
        name: achievementsTable.name,
        description: achievementsTable.description,
        icon: achievementsTable.icon,
        lottieSource: achievementsTable.lottieSource,
        category: achievementsTable.category,
        xp: achievementsTable.requiredPoints,
        unlockedAt: userAchievementsTable.unlockedAt,
      })
      .from(userAchievementsTable)
      .innerJoin(
        achievementsTable,
        eq(userAchievementsTable.achievementId, achievementsTable.id)
      )
      .where(eq(userAchievementsTable.userId, userId))
      .orderBy(userAchievementsTable.unlockedAt);

    return achievements;
  } catch (error) {
    console.error("[Achievement] Error getting user achievements:", error);
    return [];
  }
}
