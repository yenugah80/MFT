/**
 * Gamification API Routes
 *
 * Endpoints for badges, leaderboards, challenges, and XP
 */

import express from 'express';
import { requireAuth } from '@clerk/express';
import gamificationService from '../services/enhancedGamificationService.js';
import { analyticsEventPipeline } from '../services/analyticsEventPipeline.js';

const router = express.Router();

// Middleware
router.use(requireAuth());

// ============================================================================
// BADGES
// ============================================================================

/**
 * GET /api/gamification/badges
 * Get all badges with user's progress
 */
router.get('/badges', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const badges = await gamificationService.getUserBadges(userId);

    // Track analytics
    analyticsEventPipeline?.trackEvent({
      userId,
      eventType: 'gamification',
      eventName: 'badges_viewed',
      properties: { badgeCount: badges.length },
    });

    res.json({
      success: true,
      badges,
      categories: ['streak', 'logging', 'hydration', 'nutrition', 'mood', 'achievement', 'social'],
    });
  } catch (error) {
    console.error('[Gamification] Badges error:', error);
    res.status(500).json({ success: false, error: 'Failed to get badges' });
  }
});

/**
 * POST /api/gamification/badges/check
 * Check and award any newly earned badges
 */
router.post('/badges/check', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const awarded = await gamificationService.checkAndAwardBadges(userId);

    if (awarded.length > 0) {
      analyticsEventPipeline?.trackEvent({
        userId,
        eventType: 'gamification',
        eventName: 'badges_earned',
        properties: { badges: awarded.map(b => b.badge) },
      });
    }

    res.json({
      success: true,
      awarded,
      message: awarded.length > 0
        ? `Congratulations! You earned ${awarded.length} new badge(s)!`
        : 'No new badges earned yet. Keep going!',
    });
  } catch (error) {
    console.error('[Gamification] Badge check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check badges' });
  }
});

// ============================================================================
// LEADERBOARDS
// ============================================================================

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard data
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { type = 'global', limit = 50 } = req.query;

    let leaderboard;
    switch (type) {
      case 'weekly':
        leaderboard = await gamificationService.getWeeklyLeaderboard(parseInt(limit));
        break;
      case 'streak':
        leaderboard = await gamificationService.getStreakLeaderboard(parseInt(limit));
        break;
      case 'global':
      default:
        leaderboard = await gamificationService.getGlobalLeaderboard(parseInt(limit));
    }

    // Get user's rank
    const userRank = await gamificationService.getUserRank(userId);

    // Find user in leaderboard
    const userPosition = leaderboard.findIndex(u => u.userId === userId);

    analyticsEventPipeline?.trackEvent({
      userId,
      eventType: 'gamification',
      eventName: 'leaderboard_viewed',
      properties: { type, userRank: userRank.rank },
    });

    res.json({
      success: true,
      type,
      leaderboard,
      userRank: userRank.rank,
      userInTop: userPosition !== -1,
      userPosition: userPosition !== -1 ? userPosition + 1 : null,
    });
  } catch (error) {
    console.error('[Gamification] Leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

// ============================================================================
// CHALLENGES
// ============================================================================

/**
 * GET /api/gamification/challenges
 * Get daily and weekly challenges with progress
 */
router.get('/challenges', async (req, res) => {
  try {
    const userId = req.auth.userId;

    const [daily, weekly] = await Promise.all([
      gamificationService.getDailyChallenges(userId),
      gamificationService.getWeeklyChallenges(userId),
    ]);

    // Calculate completion stats
    const dailyCompleted = daily.filter(c => c.completed).length;
    const weeklyCompleted = weekly.filter(c => c.completed).length;

    res.json({
      success: true,
      daily: {
        challenges: daily,
        completed: dailyCompleted,
        total: daily.length,
        allComplete: dailyCompleted === daily.length,
      },
      weekly: {
        challenges: weekly,
        completed: weeklyCompleted,
        total: weekly.length,
        allComplete: weeklyCompleted === weekly.length,
      },
      resetsAt: {
        daily: getNextDailyReset(),
        weekly: getNextWeeklyReset(),
      },
    });
  } catch (error) {
    console.error('[Gamification] Challenges error:', error);
    res.status(500).json({ success: false, error: 'Failed to get challenges' });
  }
});

/**
 * POST /api/gamification/challenges/:id/progress
 * Update challenge progress
 */
router.post('/challenges/:id/progress', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { id } = req.params;
    const { progress, type = 'daily' } = req.body;

    const result = await gamificationService.updateChallengeProgress(
      userId,
      id,
      type,
      progress
    );

    if (result.completed) {
      analyticsEventPipeline?.trackEvent({
        userId,
        eventType: 'gamification',
        eventName: 'challenge_completed',
        properties: { challengeId: id, type, xpAwarded: result.xpAwarded },
      });
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Gamification] Challenge progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to update challenge' });
  }
});

// ============================================================================
// XP & LEVEL
// ============================================================================

/**
 * GET /api/gamification/xp
 * Get user's XP breakdown and history
 */
router.get('/xp', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { days = 7 } = req.query;

    const breakdown = await gamificationService.getXPBreakdown(userId, parseInt(days));

    // Calculate totals
    const totalXp = breakdown.reduce((sum, day) => sum + parseInt(day.total_xp), 0);
    const totalBonus = breakdown.reduce((sum, day) => sum + parseInt(day.bonus_xp), 0);

    res.json({
      success: true,
      period: `${days} days`,
      totalXp,
      totalBonus,
      dailyAverage: Math.round(totalXp / parseInt(days)),
      breakdown,
    });
  } catch (error) {
    console.error('[Gamification] XP error:', error);
    res.status(500).json({ success: false, error: 'Failed to get XP data' });
  }
});

/**
 * POST /api/gamification/xp/award
 * Award XP (internal use, admin, or specific actions)
 */
router.post('/xp/award', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0 || amount > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid XP amount (1-1000)',
      });
    }

    const result = await gamificationService.awardXP(userId, amount, reason || 'Manual award');

    if (result.leveledUp) {
      analyticsEventPipeline?.trackEvent({
        userId,
        eventType: 'gamification',
        eventName: 'level_up',
        properties: { newLevel: result.newLevel },
      });
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Gamification] Award XP error:', error);
    res.status(500).json({ success: false, error: 'Failed to award XP' });
  }
});

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * GET /api/gamification/summary
 * Get complete gamification summary for dashboard
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.auth.userId;

    const [badges, dailyChallenges, weeklyChallenges, userRank, xpBreakdown] = await Promise.all([
      gamificationService.getUserBadges(userId),
      gamificationService.getDailyChallenges(userId),
      gamificationService.getWeeklyChallenges(userId),
      gamificationService.getUserRank(userId),
      gamificationService.getXPBreakdown(userId, 7),
    ]);

    // Count stats
    const earnedBadges = badges.filter(b => b.currentTier).length;
    const totalBadgeTiers = badges.reduce((sum, b) => sum + b.tiers.length, 0);
    const earnedTiers = badges.reduce((sum, b) => {
      return sum + Object.keys(b.earned).length;
    }, 0);

    const dailyCompleted = dailyChallenges.filter(c => c.completed).length;
    const weeklyCompleted = weeklyChallenges.filter(c => c.completed).length;

    const weeklyXp = xpBreakdown.reduce((sum, day) => sum + parseInt(day.total_xp), 0);

    res.json({
      success: true,
      summary: {
        badges: {
          earned: earnedBadges,
          total: badges.length,
          tiersEarned: earnedTiers,
          totalTiers: totalBadgeTiers,
        },
        challenges: {
          dailyCompleted,
          dailyTotal: dailyChallenges.length,
          weeklyCompleted,
          weeklyTotal: weeklyChallenges.length,
        },
        rank: userRank.rank,
        weeklyXp,
        dailyAverageXp: Math.round(weeklyXp / 7),
      },
      highlights: {
        nearestBadge: badges.find(b => !b.currentTier && b.progressPercent >= 50),
        todaysChallenges: dailyChallenges,
        activeChallenges: weeklyChallenges.filter(c => !c.completed),
      },
    });
  } catch (error) {
    console.error('[Gamification] Summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to get summary' });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function getNextDailyReset() {
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(4, 0, 0, 0); // 4 AM

  if (now >= reset) {
    reset.setDate(reset.getDate() + 1);
  }

  return reset.toISOString();
}

function getNextWeeklyReset() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  const reset = new Date(now);
  reset.setDate(reset.getDate() + daysUntilMonday);
  reset.setHours(4, 0, 0, 0);

  return reset.toISOString();
}

export default router;
