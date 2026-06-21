import express from 'express';
import { checkAndAwardStreakFreeze, restoreStreak, getStreakRestorationInfo } from '../services/gamificationService.js';
import { checkStreakBrokenPopup, clearStreakSavedFlag } from '../jobs/dailyStreakCheck.js';
import { getUserAchievements } from '../services/achievementService.js';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../config/db.js';
import { gamificationTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { calculateLevel } from '../utils/levelCalculator.js';
import { ALL_ACHIEVEMENTS } from '../constants/achievements.js';

const router = express.Router();

// POST /api/gamification/check-streak
// Call this endpoint after successfully logging a meal or water that increments the streak
router.post('/check-streak', requireAuth(), async (req, res) => {
  try {
    const { currentStreak } = req.body;
    const userId = req.auth.userId;

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
    const userId = req.auth.userId;
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
    const userId = req.auth.userId;

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
    const userId = req.auth.userId;

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
    const userId = req.auth.userId;
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
    const userId = req.auth.userId;

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

export default router;
