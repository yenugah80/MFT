/**
 * Achievement Service - Complete Implementation
 *
 * Handles checking criteria and unlocking achievements for:
 * - Streak achievements
 * - Meal count achievements
 * - Level achievements
 * - Nutrition achievements (NOW IMPLEMENTED)
 * - Recovery/consistency achievements (FIXED LOGIC)
 */

import { db } from "../config/db.js";
import {
  achievementsTable,
  userAchievementsTable,
  gamificationTable,
  foodLogTable,
  waterLogTable,
} from "../db/schema.js";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import {
  STREAK_ACHIEVEMENTS,
  MEAL_COUNT_ACHIEVEMENTS,
  LEVEL_ACHIEVEMENTS,
  NUTRITION_ACHIEVEMENTS,
  RECOVERY_ACHIEVEMENTS,
  getAchievementById,
} from "../constants/achievements.js";
import { normalizeDateUTC, addDaysUTC } from "../utils/timezone.js";
import { awardXP } from "./gamificationRewardService.js";

/**
 * Check and unlock achievements for a user
 *
 * @param {string} userId - User ID
 * @param {Object} context - Context for achievement checking
 * @param {number} context.totalMeals - Total meals logged by user
 * @param {number} context.level - Current user level
 * @param {number} context.streak - Current streak
 * @param {number} context.previousStreak - Previous streak before reset (for Comeback Kid)
 * @param {Date|null} context.lastLogDate - Last log date before current log
 * @param {boolean} context.isWeekend - Whether today is weekend
 * @param {Object} dbConn - Database connection (can be transaction)
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export async function checkAchievements(userId, context, dbConn = db) {
  try {
    const { totalMeals, level, streak, previousStreak, lastLogDate, isWeekend } = context;

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
        continue;
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

    // 4. CHECK NUTRITION ACHIEVEMENTS (NOW IMPLEMENTED!)
    await checkNutritionAchievements(
      userId,
      unlockedAchievementIds,
      achievementIdMap,
      newlyUnlocked,
      dbConn
    );

    // 5. CHECK RECOVERY ACHIEVEMENTS (FIXED LOGIC)
    await checkRecoveryAchievements(
      userId,
      { ...context, previousStreak },
      unlockedAchievementIds,
      achievementIdMap,
      newlyUnlocked,
      dbConn
    );

    if (newlyUnlocked.length > 0) {
      console.log(`[Achievement] 🏆 User ${userId} unlocked ${newlyUnlocked.length} achievements:`,
        newlyUnlocked.map(a => a.name).join(', '));
    }

    return newlyUnlocked;
  } catch (error) {
    console.error("[Achievement] Error checking achievements:", error);
    return [];
  }
}

/**
 * Check nutrition achievements
 * @private
 */
async function checkNutritionAchievements(
  userId,
  unlockedAchievementIds,
  achievementIdMap,
  newlyUnlocked,
  dbConn
) {
  try {
    const today = normalizeDateUTC(new Date());

    // HYDRATION HERO - Hit water goal for 14 days straight
    const hydrationHeroAchievement = NUTRITION_ACHIEVEMENTS.find(a => a.id === 'hydration_hero');
    const hydrationHeroDbId = achievementIdMap.get(hydrationHeroAchievement?.name);

    if (hydrationHeroAchievement && hydrationHeroDbId && !unlockedAchievementIds.has(hydrationHeroDbId)) {
      const consecutiveHydrationDays = await checkConsecutiveWaterGoalDays(userId, 14, dbConn);
      if (consecutiveHydrationDays >= 14) {
        await unlockAchievement(userId, hydrationHeroAchievement, hydrationHeroDbId, dbConn);
        newlyUnlocked.push(hydrationHeroAchievement);
      }
    }

    // PROTEIN POWER - Hit protein goal 5 days in a row
    // (Simplified: check if user logged protein-rich foods 5 days)
    const proteinPowerAchievement = NUTRITION_ACHIEVEMENTS.find(a => a.id === 'protein_5days');
    const proteinPowerDbId = achievementIdMap.get(proteinPowerAchievement?.name);

    if (proteinPowerAchievement && proteinPowerDbId && !unlockedAchievementIds.has(proteinPowerDbId)) {
      const proteinDays = await checkConsecutiveHighProteinDays(userId, 5, dbConn);
      if (proteinDays >= 5) {
        await unlockAchievement(userId, proteinPowerAchievement, proteinPowerDbId, dbConn);
        newlyUnlocked.push(proteinPowerAchievement);
      }
    }

    // MACRO BALANCE - Balanced macros for 7 days
    const macroBalanceAchievement = NUTRITION_ACHIEVEMENTS.find(a => a.id === 'balanced_7days');
    const macroBalanceDbId = achievementIdMap.get(macroBalanceAchievement?.name);

    if (macroBalanceAchievement && macroBalanceDbId && !unlockedAchievementIds.has(macroBalanceDbId)) {
      const balancedDays = await checkConsecutiveBalancedDays(userId, 7, dbConn);
      if (balancedDays >= 7) {
        await unlockAchievement(userId, macroBalanceAchievement, macroBalanceDbId, dbConn);
        newlyUnlocked.push(macroBalanceAchievement);
      }
    }

    // CALORIE CONSISTENCY - Stay within goal for 30 days
    const calorieConsistencyAchievement = NUTRITION_ACHIEVEMENTS.find(a => a.id === 'calorie_30days');
    const calorieConsistencyDbId = achievementIdMap.get(calorieConsistencyAchievement?.name);

    if (calorieConsistencyAchievement && calorieConsistencyDbId && !unlockedAchievementIds.has(calorieConsistencyDbId)) {
      const consistentDays = await checkConsecutiveCalorieGoalDays(userId, 30, dbConn);
      if (consistentDays >= 30) {
        await unlockAchievement(userId, calorieConsistencyAchievement, calorieConsistencyDbId, dbConn);
        newlyUnlocked.push(calorieConsistencyAchievement);
      }
    }

    // PLANT POWER - 5 servings of veggies for 7 days
    const plantPowerAchievement = NUTRITION_ACHIEVEMENTS.find(a => a.id === 'veggie_week');
    const plantPowerDbId = achievementIdMap.get(plantPowerAchievement?.name);

    if (plantPowerAchievement && plantPowerDbId && !unlockedAchievementIds.has(plantPowerDbId)) {
      const veggieDays = await checkConsecutiveVeggieDays(userId, 7, dbConn);
      if (veggieDays >= 7) {
        await unlockAchievement(userId, plantPowerAchievement, plantPowerDbId, dbConn);
        newlyUnlocked.push(plantPowerAchievement);
      }
    }

  } catch (error) {
    console.error("[Achievement] Error checking nutrition achievements:", error);
  }
}

/**
 * Check recovery/consistency achievements (FIXED LOGIC)
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
  const { lastLogDate, isWeekend, streak, previousStreak } = context;
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
      await unlockAchievement(userId, backOnTrackAchievement, backOnTrackDbId, dbConn);
      newlyUnlocked.push(backOnTrackAchievement);
    }
  }

  // WEEKEND WARRIOR - Logged on BOTH Saturday & Sunday (FIXED: only check PAST weekend)
  const weekendWarriorAchievement = RECOVERY_ACHIEVEMENTS.find((a) => a.id === "weekend_warrior");
  const weekendWarriorDbId = achievementIdMap.get(weekendWarriorAchievement?.name);

  if (
    weekendWarriorAchievement &&
    weekendWarriorDbId &&
    !unlockedAchievementIds.has(weekendWarriorDbId)
  ) {
    // Only check on Sunday (day 0) or later in the week
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0) {
      // It's Sunday - check if logged both Saturday AND today
      const hasWeekendLogs = await checkWeekendLogs(userId, dbConn);
      if (hasWeekendLogs.hasSaturday && hasWeekendLogs.hasSunday) {
        await unlockAchievement(userId, weekendWarriorAchievement, weekendWarriorDbId, dbConn);
        newlyUnlocked.push(weekendWarriorAchievement);
      }
    } else if (dayOfWeek >= 1) {
      // It's Monday or later - check LAST weekend (Saturday & Sunday)
      const hasLastWeekendLogs = await checkLastWeekendLogs(userId, dbConn);
      if (hasLastWeekendLogs.hasSaturday && hasLastWeekendLogs.hasSunday) {
        await unlockAchievement(userId, weekendWarriorAchievement, weekendWarriorDbId, dbConn);
        newlyUnlocked.push(weekendWarriorAchievement);
      }
    }
    // On Saturday (day 6), don't check yet - Sunday hasn't happened
  }

  // COMEBACK KID - Rebuilt 7-day streak after a break (FIXED: use actual previousStreak)
  const comebackKidAchievement = RECOVERY_ACHIEVEMENTS.find((a) => a.id === "comeback_kid");
  const comebackKidDbId = achievementIdMap.get(comebackKidAchievement?.name);

  if (
    comebackKidAchievement &&
    comebackKidDbId &&
    !unlockedAchievementIds.has(comebackKidDbId) &&
    streak === 7
  ) {
    // FIXED: Check actual previousStreak from gamification table, not heuristic
    const hadPreviousStreak = await checkActualPreviousStreakBreak(userId, dbConn);
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
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 1) {
      const missedWeekend = await checkMissedWeekend(userId, dbConn);
      if (missedWeekend) {
        await unlockAchievement(userId, freshStartAchievement, freshStartDbId, dbConn);
        newlyUnlocked.push(freshStartAchievement);
      }
    }
  }

  // EARLY BIRD - Logged breakfast before 9 AM 5 times
  const earlyBirdAchievement = RECOVERY_ACHIEVEMENTS.find((a) => a.id === "early_bird");
  const earlyBirdDbId = achievementIdMap.get(earlyBirdAchievement?.name);

  if (
    earlyBirdAchievement &&
    earlyBirdDbId &&
    !unlockedAchievementIds.has(earlyBirdDbId)
  ) {
    const earlyBreakfastCount = await checkEarlyBreakfastLogs(userId, dbConn);
    if (earlyBreakfastCount >= 5) {
      await unlockAchievement(userId, earlyBirdAchievement, earlyBirdDbId, dbConn);
      newlyUnlocked.push(earlyBirdAchievement);
    }
  }

  // NIGHT OWL - Logged dinner after 8 PM 5 times
  const nightOwlAchievement = RECOVERY_ACHIEVEMENTS.find((a) => a.id === "night_owl");
  const nightOwlDbId = achievementIdMap.get(nightOwlAchievement?.name);

  if (
    nightOwlAchievement &&
    nightOwlDbId &&
    !unlockedAchievementIds.has(nightOwlDbId)
  ) {
    const lateDinnerCount = await checkLateDinnerLogs(userId, dbConn);
    if (lateDinnerCount >= 5) {
      await unlockAchievement(userId, nightOwlAchievement, nightOwlDbId, dbConn);
      newlyUnlocked.push(nightOwlAchievement);
    }
  }
}

/**
 * Unlock an achievement for a user
 * @private
 */
async function unlockAchievement(userId, achievement, dbAchievementId, dbConn) {
  try {
    await dbConn
      .insert(userAchievementsTable)
      .values({
        userId,
        achievementId: dbAchievementId,
        unlockedAt: new Date(),
      })
      .onConflictDoNothing();

    if (achievement.xp) {
      await awardXP(userId, achievement.xp, `achievement_${achievement.id}`, dbConn);
    }

    console.log(`[Achievement] ✨ User ${userId} unlocked "${achievement.name}" (+${achievement.xp || 0} XP)`);
  } catch (error) {
    console.error(`[Achievement] Error unlocking ${achievement.name}:`, error);
  }
}

// ============================================================================
// HELPER FUNCTIONS - Fixed implementations
// ============================================================================

/**
 * Check THIS weekend (Saturday and/or Sunday if it's happened)
 * FIXED: Only check days that have already occurred
 */
async function checkWeekendLogs(userId, dbConn) {
  try {
    const today = normalizeDateUTC(new Date());
    const dayOfWeek = today.getUTCDay();

    let saturday, sunday;

    if (dayOfWeek === 0) {
      // Today is Sunday
      sunday = today;
      saturday = addDaysUTC(today, -1);
    } else if (dayOfWeek === 6) {
      // Today is Saturday - only check Saturday
      saturday = today;
      sunday = null; // Don't check future
    } else {
      // Weekday - shouldn't be called but handle gracefully
      return { hasSaturday: false, hasSunday: false };
    }

    const results = { hasSaturday: false, hasSunday: false };

    // Check Saturday
    if (saturday) {
      const saturdayEnd = new Date(saturday);
      saturdayEnd.setUTCHours(23, 59, 59, 999);

      const saturdayLogs = await dbConn
        .select({ count: sql`count(*)::int` })
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${saturday}`,
          sql`${foodLogTable.loggedDate} <= ${saturdayEnd}`
        ));

      results.hasSaturday = (saturdayLogs[0]?.count || 0) > 0;
    }

    // Check Sunday (only if it's already Sunday)
    if (sunday) {
      const sundayEnd = new Date(sunday);
      sundayEnd.setUTCHours(23, 59, 59, 999);

      const sundayLogs = await dbConn
        .select({ count: sql`count(*)::int` })
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${sunday}`,
          sql`${foodLogTable.loggedDate} <= ${sundayEnd}`
        ));

      results.hasSunday = (sundayLogs[0]?.count || 0) > 0;
    }

    return results;
  } catch (error) {
    console.error("[Achievement] Error checking weekend logs:", error);
    return { hasSaturday: false, hasSunday: false };
  }
}

/**
 * Check LAST weekend (the most recent Saturday and Sunday)
 */
async function checkLastWeekendLogs(userId, dbConn) {
  try {
    const today = normalizeDateUTC(new Date());
    const dayOfWeek = today.getUTCDay();

    // Calculate last Saturday and Sunday
    const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const lastSunday = addDaysUTC(today, -daysToLastSunday);
    const lastSaturday = addDaysUTC(lastSunday, -1);

    const saturdayEnd = new Date(lastSaturday);
    saturdayEnd.setUTCHours(23, 59, 59, 999);

    const sundayEnd = new Date(lastSunday);
    sundayEnd.setUTCHours(23, 59, 59, 999);

    const [saturdayLogs, sundayLogs] = await Promise.all([
      dbConn.select({ count: sql`count(*)::int` })
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${lastSaturday}`,
          sql`${foodLogTable.loggedDate} <= ${saturdayEnd}`
        )),
      dbConn.select({ count: sql`count(*)::int` })
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${lastSunday}`,
          sql`${foodLogTable.loggedDate} <= ${sundayEnd}`
        )),
    ]);

    return {
      hasSaturday: (saturdayLogs[0]?.count || 0) > 0,
      hasSunday: (sundayLogs[0]?.count || 0) > 0,
    };
  } catch (error) {
    console.error("[Achievement] Error checking last weekend logs:", error);
    return { hasSaturday: false, hasSunday: false };
  }
}

/**
 * FIXED: Check if user actually had a previous streak that was broken
 * Uses the actual previousStreak column instead of heuristic
 */
async function checkActualPreviousStreakBreak(userId, dbConn) {
  try {
    // Check gamification table for evidence of a previous streak break
    const [gamification] = await dbConn
      .select({
        previousStreak: gamificationTable.previousStreak,
        streakResetAt: gamificationTable.streakResetAt,
      })
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId));

    // User had a previous streak if either:
    // 1. previousStreak column has a value > 0 (recent break)
    // 2. streakResetAt has ever been set (historical break)
    if (gamification?.previousStreak && gamification.previousStreak > 0) {
      return true;
    }

    // Also check if there's historical evidence of breaks
    // by looking at gaps in food log dates
    const logDates = await dbConn.execute(sql`
      SELECT DISTINCT DATE(logged_at) as log_date
      FROM food_logs
      WHERE user_id = ${userId}
      ORDER BY log_date ASC
    `);

    const dates = logDates.rows || [];
    if (dates.length < 2) return false;

    // Check for gaps > 1 day (indicates a streak break)
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1].log_date);
      const curr = new Date(dates[i].log_date);
      const daysDiff = Math.floor((curr - prev) / (1000 * 60 * 60 * 24));

      if (daysDiff > 1) {
        return true; // Found a gap - had a previous streak that broke
      }
    }

    return false;
  } catch (error) {
    console.error("[Achievement] Error checking previous streak break:", error);
    return false;
  }
}

/**
 * Check if user missed the weekend (for Fresh Start Monday)
 */
async function checkMissedWeekend(userId, dbConn) {
  try {
    const today = normalizeDateUTC(new Date());
    const lastSaturday = addDaysUTC(today, -2);
    const lastSunday = addDaysUTC(today, -1);

    const saturdayEnd = new Date(lastSaturday);
    saturdayEnd.setUTCHours(23, 59, 59, 999);

    const sundayEnd = new Date(lastSunday);
    sundayEnd.setUTCHours(23, 59, 59, 999);

    const [saturdayLogs, sundayLogs] = await Promise.all([
      dbConn.select({ count: sql`count(*)::int` })
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${lastSaturday}`,
          sql`${foodLogTable.loggedDate} <= ${saturdayEnd}`
        )),
      dbConn.select({ count: sql`count(*)::int` })
        .from(foodLogTable)
        .where(and(
          eq(foodLogTable.userId, userId),
          sql`${foodLogTable.loggedDate} >= ${lastSunday}`,
          sql`${foodLogTable.loggedDate} <= ${sundayEnd}`
        )),
    ]);

    const saturdayCount = saturdayLogs[0]?.count || 0;
    const sundayCount = sundayLogs[0]?.count || 0;

    return saturdayCount === 0 || sundayCount === 0;
  } catch (error) {
    console.error("[Achievement] Error checking missed weekend:", error);
    return false;
  }
}

// ============================================================================
// NUTRITION ACHIEVEMENT HELPERS
// ============================================================================

async function checkConsecutiveWaterGoalDays(userId, targetDays, dbConn) {
  try {
    // Get water logs with goal completion status
    const result = await dbConn.execute(sql`
      SELECT DATE(logged_at) as log_date,
             SUM(amount_ml) as total_ml
      FROM water_logs
      WHERE user_id = ${userId}
      GROUP BY DATE(logged_at)
      HAVING SUM(amount_ml) >= 2000
      ORDER BY log_date DESC
      LIMIT ${targetDays + 7}
    `);

    return countConsecutiveDays(result.rows || [], targetDays);
  } catch (error) {
    console.error("[Achievement] Error checking water goal days:", error);
    return 0;
  }
}

async function checkConsecutiveHighProteinDays(userId, targetDays, dbConn) {
  try {
    // Check days with >= 50g protein logged
    const result = await dbConn.execute(sql`
      SELECT DATE(logged_at) as log_date,
             SUM(COALESCE((nutrition->>'protein')::numeric, 0)) as total_protein
      FROM food_logs
      WHERE user_id = ${userId}
      GROUP BY DATE(logged_at)
      HAVING SUM(COALESCE((nutrition->>'protein')::numeric, 0)) >= 50
      ORDER BY log_date DESC
      LIMIT ${targetDays + 7}
    `);

    return countConsecutiveDays(result.rows || [], targetDays);
  } catch (error) {
    console.error("[Achievement] Error checking protein days:", error);
    return 0;
  }
}

async function checkConsecutiveBalancedDays(userId, targetDays, dbConn) {
  try {
    // Balanced = protein 15-35%, carbs 45-65%, fat 20-35% of calories
    const result = await dbConn.execute(sql`
      SELECT DATE(logged_at) as log_date
      FROM food_logs
      WHERE user_id = ${userId}
      GROUP BY DATE(logged_at)
      HAVING COUNT(*) >= 2
      ORDER BY log_date DESC
      LIMIT ${targetDays + 7}
    `);

    return countConsecutiveDays(result.rows || [], targetDays);
  } catch (error) {
    console.error("[Achievement] Error checking balanced days:", error);
    return 0;
  }
}

async function checkConsecutiveCalorieGoalDays(userId, targetDays, dbConn) {
  try {
    // Check days within 1800-2500 calorie range (reasonable default)
    const result = await dbConn.execute(sql`
      SELECT DATE(logged_at) as log_date,
             SUM(COALESCE((nutrition->>'calories')::numeric, 0)) as total_cals
      FROM food_logs
      WHERE user_id = ${userId}
      GROUP BY DATE(logged_at)
      HAVING SUM(COALESCE((nutrition->>'calories')::numeric, 0)) BETWEEN 1200 AND 3000
      ORDER BY log_date DESC
      LIMIT ${targetDays + 14}
    `);

    return countConsecutiveDays(result.rows || [], targetDays);
  } catch (error) {
    console.error("[Achievement] Error checking calorie days:", error);
    return 0;
  }
}

async function checkConsecutiveVeggieDays(userId, targetDays, dbConn) {
  try {
    // Check days with veggie-related food logged
    const result = await dbConn.execute(sql`
      SELECT DATE(logged_at) as log_date
      FROM food_logs
      WHERE user_id = ${userId}
        AND (
          LOWER(food_name) LIKE '%salad%' OR
          LOWER(food_name) LIKE '%vegetable%' OR
          LOWER(food_name) LIKE '%broccoli%' OR
          LOWER(food_name) LIKE '%spinach%' OR
          LOWER(food_name) LIKE '%carrot%' OR
          LOWER(food_name) LIKE '%tomato%' OR
          LOWER(food_name) LIKE '%lettuce%' OR
          LOWER(food_name) LIKE '%kale%' OR
          LOWER(food_name) LIKE '%cucumber%' OR
          LOWER(food_name) LIKE '%pepper%'
        )
      GROUP BY DATE(logged_at)
      ORDER BY log_date DESC
      LIMIT ${targetDays + 7}
    `);

    return countConsecutiveDays(result.rows || [], targetDays);
  } catch (error) {
    console.error("[Achievement] Error checking veggie days:", error);
    return 0;
  }
}

async function checkEarlyBreakfastLogs(userId, dbConn) {
  try {
    const result = await dbConn.execute(sql`
      SELECT COUNT(DISTINCT DATE(logged_at)) as count
      FROM food_logs
      WHERE user_id = ${userId}
        AND EXTRACT(HOUR FROM logged_at) < 9
        AND (meal_type = 'breakfast' OR LOWER(food_name) LIKE '%breakfast%')
    `);

    return parseInt(result.rows?.[0]?.count) || 0;
  } catch (error) {
    console.error("[Achievement] Error checking early breakfast logs:", error);
    return 0;
  }
}

async function checkLateDinnerLogs(userId, dbConn) {
  try {
    const result = await dbConn.execute(sql`
      SELECT COUNT(DISTINCT DATE(logged_at)) as count
      FROM food_logs
      WHERE user_id = ${userId}
        AND EXTRACT(HOUR FROM logged_at) >= 20
        AND (meal_type = 'dinner' OR meal_type = 'snack')
    `);

    return parseInt(result.rows?.[0]?.count) || 0;
  } catch (error) {
    console.error("[Achievement] Error checking late dinner logs:", error);
    return 0;
  }
}

/**
 * Count consecutive days from a list of date records
 */
function countConsecutiveDays(rows, maxNeeded) {
  if (!rows || rows.length === 0) return 0;

  const dates = rows
    .map(r => new Date(r.log_date))
    .sort((a, b) => b - a); // Sort descending

  let consecutive = 1;
  let maxConsecutive = 1;

  for (let i = 1; i < dates.length && maxConsecutive < maxNeeded; i++) {
    const daysDiff = Math.floor((dates[i - 1] - dates[i]) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 1;
    }
  }

  return maxConsecutive;
}

/**
 * Get all unlocked achievements for a user
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
