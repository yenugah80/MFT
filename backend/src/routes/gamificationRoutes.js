import express from 'express';
import { checkAndAwardStreakFreeze, restoreStreak, getStreakRestorationInfo } from '../services/gamificationService.js';
import { checkStreakBrokenPopup, clearStreakSavedFlag } from '../jobs/dailyStreakCheck.js';
import { getUserAchievements } from '../services/achievementService.js';
import { awardXP } from '../services/gamificationRewardService.js';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../config/db.js';
import { gamificationTable, foodLogTable, waterLogTable, moodLogTable, nutritionGoalsTable } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { calculateLevel } from '../utils/levelCalculator.js';
import { ALL_ACHIEVEMENTS } from '../constants/achievements.js';
import { DAILY_CHALLENGES, WEEKLY_CHALLENGES } from '../constants/challenges.js';

const router = express.Router();

function getWeekStartDate() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
  return weekStart.toISOString().split('T')[0];
}

function countPerfectDaysThisWeek(dailyChallengeState, weekStartStr) {
  let count = 0;
  for (const [dateStr, dayState] of Object.entries(dailyChallengeState || {})) {
    if (dateStr < weekStartStr) continue;
    const allCompleted = DAILY_CHALLENGES.every((c) => dayState?.[c.id]?.completed);
    if (allCompleted) count++;
  }
  return count;
}

// POST /api/gamification/check-streak
// Call this endpoint after successfully logging a meal or water that increments the streak
router.post('/check-streak', requireAuth(), async (req, res) => {
  try {
    const { currentStreak } = req.body;
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    if (typeof currentStreak !== 'number') {
      return res.status(400).json({ error: 'currentStreak is required' });
    }

    const result = await checkAndAwardStreakFreeze(userId, currentStreak);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check streak rewards' });
  }
});

// POST /api/gamification/restore-streak
// Restore a broken streak using a streak freeze (within 24 hours of losing it)
router.post('/restore-streak', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const result = await restoreStreak(userId);

    if (result.success) {
      return res.json(result);
    } else {
      // Return appropriate status code based on error type
      const statusCode = result.error === 'INTERNAL_ERROR' ? 500 : 400;
      return res.status(statusCode).json(result);
    }
  } catch (error) {
    console.error('[Gamification] Error restoring streak:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to restore streak',
    });
  }
});

// GET /api/gamification/user
// Get full gamification data for the current user
router.get('/user', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    // Fetch gamification stats
    const [gamification] = await db.select()
      .from(gamificationTable)
      .where(eq(gamificationTable.userId, userId))
      .limit(1);

    if (!gamification) {
      return res.json({
        xp: 0,
        level: 1,
        levelName: 'Beginner',
        streak: 0,
        streakFreezes: 0,
        totalMealsLogged: 0,
        badges: [],
        currentLevelXp: 0,
        nextLevelXp: 100,
        progressPercent: 0,
        // Streak restoration info
        canRestoreStreak: false,
        previousStreak: 0,
        streakResetAt: null,
      });
    }

    // Calculate level info from XP
    const levelInfo = calculateLevel(gamification.xp || 0);

    // Check if streak can be restored (within 24 hours and has freezes)
    const previousStreak = gamification.previousStreak || 0;
    const streakResetAt = gamification.streakResetAt || null;
    let canRestoreStreak = false;

    if (
      previousStreak > 0 &&
      gamification.streakFreezes > 0 &&
      gamification.streak === 0 &&
      streakResetAt
    ) {
      const hoursSinceReset = (Date.now() - new Date(streakResetAt).getTime()) / (1000 * 60 * 60);
      canRestoreStreak = hoursSinceReset <= 24;
    }

    res.json({
      xp: gamification.xp || 0,
      level: levelInfo.level,
      levelName: levelInfo.levelName || `Level ${levelInfo.level}`,
      streak: gamification.streak || 0,
      streakFreezes: gamification.streakFreezes || 0,
      totalMealsLogged: gamification.totalMealsLogged || 0,
      badges: gamification.badges || [],
      currentLevelXp: levelInfo.currentLevelXP || 0,
      nextLevelXp: levelInfo.nextLevelXP || 100,
      progressPercent: levelInfo.progressPercent || 0,
      // Streak restoration info (Snapchat-style)
      canRestoreStreak,
      previousStreak,
      streakResetAt,
      streakSavedByFreeze: gamification.streakSavedByFreeze || false,
      lastLogDate: gamification.lastLogDate || null,
    });
  } catch (error) {
    console.error('[Gamification] Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch gamification data' });
  }
});

// GET /api/gamification/streak-status
// Get Snapchat-style streak status for popup display
router.get('/streak-status', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    // Check if any popup should be shown
    const popupData = await checkStreakBrokenPopup(userId);

    // Get restoration info
    const restorationInfo = await getStreakRestorationInfo(userId);

    res.json({
      popup: popupData,
      restoration: restorationInfo,
    });
  } catch (error) {
    console.error('[Gamification] Error fetching streak status:', error);
    res.status(500).json({ error: 'Failed to fetch streak status' });
  }
});

// POST /api/gamification/clear-streak-saved
// Clear the "streak saved by freeze" flag after user acknowledges
router.post('/clear-streak-saved', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    await clearStreakSavedFlag(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('[Gamification] Error clearing streak saved flag:', error);
    res.status(500).json({ error: 'Failed to clear flag' });
  }
});

// GET /api/gamification/achievements
// Get all achievements with user's unlock status
router.get('/achievements', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;

    // Get user's unlocked achievements
    const unlockedAchievements = await getUserAchievements(userId);
    const unlockedIds = new Set(unlockedAchievements.map(a => a.name));

    // Combine all achievements with unlock status
    const achievements = ALL_ACHIEVEMENTS.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      lottieSource: achievement.lottieSource,
      xp: achievement.xp,
      category: achievement.category,
      isUnlocked: unlockedIds.has(achievement.name),
      unlockedAt: unlockedAchievements.find(a => a.name === achievement.name)?.unlockedAt || null,
      // Include criteria for progress tracking
      criteria: {
        streak: achievement.streak || null,
        count: achievement.count || null,
        level: achievement.level || null,
      },
    }));

    // Group by category
    const byCategory = {
      streak: achievements.filter(a => a.category === 'streak'),
      meal_count: achievements.filter(a => a.category === 'meal_count'),
      level: achievements.filter(a => a.category === 'level'),
      nutrition: achievements.filter(a => a.category === 'nutrition'),
      recovery: achievements.filter(a => a.category === 'recovery'),
    };

    // Stats
    const totalAchievements = achievements.length;
    const unlockedCount = achievements.filter(a => a.isUnlocked).length;
    const totalXpFromAchievements = unlockedAchievements.reduce(
      (sum, a) => sum + (ALL_ACHIEVEMENTS.find(x => x.name === a.name)?.xp || 0),
      0
    );

    res.json({
      achievements,
      byCategory,
      stats: {
        total: totalAchievements,
        unlocked: unlockedCount,
        locked: totalAchievements - unlockedCount,
        completionPercent: Math.round((unlockedCount / totalAchievements) * 100),
        totalXpEarned: totalXpFromAchievements,
      },
    });
  } catch (error) {
    console.error('[Gamification] Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// GET /api/gamification/challenges
// Daily & weekly challenges with progress computed live from real logged data
// (food_log, water_log, mood_log, nutrition_goals) — no separate progress-write
// path exists since nothing in the client calls one; XP is awarded here,
// the moment a challenge is newly detected as complete, and recorded in
// gamification.daily_challenge_state / weekly_challenge_state so repeat
// page loads don't double-award it.
router.get('/challenges', requireAuth(), async (req, res) => {
  try {
    const userId = (typeof req.auth === 'function' ? req.auth() : req.auth)?.userId;
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStartDate();

    const [gamificationRow] = await db.select().from(gamificationTable).where(eq(gamificationTable.userId, userId)).limit(1);
    const streak = gamificationRow?.streak || 0;
    const dailyChallengeState = gamificationRow?.dailyChallengeState || {};
    const weeklyChallengeState = gamificationRow?.weeklyChallengeState || {};
    const todayState = dailyChallengeState[today] || {};
    const weekState = weeklyChallengeState[weekStart] || {};

    const [goalsRow] = await db.select({ dailyCalories: nutritionGoalsTable.dailyCalories })
      .from(nutritionGoalsTable).where(eq(nutritionGoalsTable.userId, userId)).limit(1);
    const dailyCalorieGoal = goalsRow?.dailyCalories || 2000;

    const mealTypeRows = await db.select({ mealType: foodLogTable.mealType })
      .from(foodLogTable)
      .where(and(
        eq(foodLogTable.userId, userId),
        sql`DATE(${foodLogTable.loggedDate}) = CURRENT_DATE`,
        sql`${foodLogTable.mealType} IN ('breakfast', 'lunch', 'dinner')`
      ));
    const distinctMealTypesToday = new Set(mealTypeRows.map((r) => r.mealType)).size;

    const [todayNutrition] = await db.select({
      totalCalories: sql`COALESCE(SUM(${foodLogTable.calories}), 0)`,
      totalProtein: sql`COALESCE(SUM(${foodLogTable.protein}), 0)`,
      totalFiber: sql`COALESCE(SUM(${foodLogTable.fiber}), 0)`,
    }).from(foodLogTable).where(and(eq(foodLogTable.userId, userId), sql`DATE(${foodLogTable.loggedDate}) = CURRENT_DATE`));

    const [todayWater] = await db.select({
      totalLiters: sql`COALESCE(SUM(${waterLogTable.amountLiters}), 0)`,
    }).from(waterLogTable).where(and(eq(waterLogTable.userId, userId), sql`DATE(${waterLogTable.loggedDate}) = CURRENT_DATE`));

    const [todayMood] = await db.select({
      count: sql`COUNT(*)`,
    }).from(moodLogTable).where(and(eq(moodLogTable.userId, userId), sql`DATE(${moodLogTable.loggedDate}) = CURRENT_DATE`));

    const liveProgress = {
      log_all_meals: distinctMealTypesToday,
      hydration_goal: Number(todayWater?.totalLiters || 0),
      protein_boost: Number(todayNutrition?.totalProtein || 0),
      fiber_focus: Number(todayNutrition?.totalFiber || 0),
      mood_check: Number(todayMood?.count || 0),
      calorie_target: Number(todayNutrition?.totalCalories || 0),
    };

    const dailyResults = DAILY_CHALLENGES.map((challenge) => {
      const progress = liveProgress[challenge.id] ?? 0;
      let completed;
      if (challenge.type === 'calorie_range') {
        const lower = dailyCalorieGoal * (1 - challenge.tolerance);
        const upper = dailyCalorieGoal * (1 + challenge.tolerance);
        completed = progress > 0 && progress >= lower && progress <= upper;
      } else {
        completed = progress >= challenge.target;
      }
      return {
        ...challenge,
        progress,
        completed,
        progressPercent: challenge.type === 'calorie_range'
          ? (completed ? 100 : Math.min(100, Math.round((progress / dailyCalorieGoal) * 100)))
          : Math.min(100, Math.round((progress / challenge.target) * 100)),
      };
    });

    // Weekly live progress
    const [veggieWeek] = await db.select({ count: sql`COUNT(*)` })
      .from(foodLogTable)
      .where(and(
        eq(foodLogTable.userId, userId),
        sql`${foodLogTable.loggedDate} >= ${weekStart}`,
        sql`(LOWER(${foodLogTable.foodName}) LIKE '%vegetable%' OR LOWER(${foodLogTable.foodName}) LIKE '%salad%' OR LOWER(${foodLogTable.foodName}) LIKE '%broccoli%' OR LOWER(${foodLogTable.foodName}) LIKE '%spinach%')`
      ));

    const hydrationDaysResult = await db.execute(sql`
      SELECT DATE(logged_date) as day
      FROM water_log
      WHERE user_id = ${userId} AND logged_date >= ${weekStart}
      GROUP BY DATE(logged_date)
      HAVING SUM(amount_liters) >= 2
    `);
    const hydrationDaysMet = (hydrationDaysResult.rows || hydrationDaysResult || []).length;

    const weeklyLiveProgress = {
      seven_day_streak: Math.min(streak, 7),
      perfect_week: countPerfectDaysThisWeek(dailyChallengeState, weekStart),
      veggie_week: Number(veggieWeek?.count || 0),
      hydration_week: hydrationDaysMet,
    };

    const weeklyResults = WEEKLY_CHALLENGES.map((challenge) => {
      const progress = weeklyLiveProgress[challenge.id] ?? 0;
      const completed = progress >= challenge.target;
      return {
        ...challenge,
        progress,
        completed,
        progressPercent: Math.min(100, Math.round((progress / challenge.target) * 100)),
      };
    });

    // Award XP for anything newly completed since we last checked, and persist
    // that as a targeted single-column jsonb update (never a full-row read/write)
    // so it can't race with a concurrent XP award to the same row.
    const newTodayState = { ...todayState };
    for (const c of dailyResults) {
      if (c.completed && !todayState[c.id]?.xpAwarded) {
        await awardXP(userId, c.xp, `challenge:${c.id}`);
        newTodayState[c.id] = { completed: true, xpAwarded: true };
      } else if (c.completed) {
        newTodayState[c.id] = { completed: true, xpAwarded: true };
      }
    }
    if (JSON.stringify(newTodayState) !== JSON.stringify(todayState)) {
      await db.execute(sql`
        UPDATE gamification
        SET daily_challenge_state = jsonb_set(COALESCE(daily_challenge_state, '{}'::jsonb), ARRAY[${today}], ${JSON.stringify(newTodayState)}::jsonb)
        WHERE user_id = ${userId}
      `);
    }

    const newWeekState = { ...weekState };
    for (const c of weeklyResults) {
      if (c.completed && !weekState[c.id]?.xpAwarded) {
        await awardXP(userId, c.xp, `challenge:${c.id}`);
        newWeekState[c.id] = { completed: true, xpAwarded: true };
      }
    }
    if (JSON.stringify(newWeekState) !== JSON.stringify(weekState)) {
      await db.execute(sql`
        UPDATE gamification
        SET weekly_challenge_state = jsonb_set(COALESCE(weekly_challenge_state, '{}'::jsonb), ARRAY[${weekStart}], ${JSON.stringify(newWeekState)}::jsonb)
        WHERE user_id = ${userId}
      `);
    }

    res.json({
      success: true,
      daily: {
        challenges: dailyResults,
        completed: dailyResults.filter((c) => c.completed).length,
        total: dailyResults.length,
      },
      weekly: {
        challenges: weeklyResults,
        completed: weeklyResults.filter((c) => c.completed).length,
        total: weeklyResults.length,
      },
    });
  } catch (error) {
    console.error('[Gamification] Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

export default router;
