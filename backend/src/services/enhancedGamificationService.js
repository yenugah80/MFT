/**
 * Enhanced Gamification Service
 *
 * Production-grade gamification system with badges, leaderboards,
 * challenges, and social features.
 *
 * Features:
 * - Badge system with tiers (Bronze, Silver, Gold, Diamond)
 * - Leaderboards (Global, Weekly, Friends)
 * - Daily & Weekly challenges with XP rewards
 * - Achievement tracking and unlocks
 * - Social sharing and competition
 */

import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import NodeCache from 'node-cache';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // XP Settings
  XP_PER_LEVEL: 100,
  LEVEL_MULTIPLIER: 1.15,
  MAX_LEVEL: 100,

  // Streak bonuses
  STREAK_MULTIPLIERS: {
    7: 1.25,   // 7 days = 25% bonus
    14: 1.5,  // 14 days = 50% bonus
    30: 2.0,  // 30 days = 100% bonus
    60: 2.5,  // 60 days = 150% bonus
    90: 3.0,  // 90 days = 200% bonus
  },

  // Leaderboard settings
  LEADERBOARD_SIZE: 100,
  LEADERBOARD_CACHE_TTL: 300, // 5 minutes

  // Challenge settings
  DAILY_CHALLENGE_RESET_HOUR: 4, // 4 AM local time
  WEEKLY_CHALLENGE_RESET_DAY: 1, // Monday
};

// Cache for leaderboards and badges
const cache = new NodeCache({ stdTTL: CONFIG.LEADERBOARD_CACHE_TTL });

// ============================================================================
// BADGE DEFINITIONS
// ============================================================================

const BADGES = {
  // Streak badges
  STREAK_STARTER: {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: 'Log meals for 3 consecutive days',
    category: 'streak',
    tiers: [
      { tier: 'bronze', requirement: 3, xp: 50, icon: '🔥' },
      { tier: 'silver', requirement: 7, xp: 100, icon: '🔥' },
      { tier: 'gold', requirement: 14, xp: 200, icon: '🔥' },
      { tier: 'diamond', requirement: 30, xp: 500, icon: '💎' },
    ],
  },
  STREAK_MASTER: {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain long streaks',
    category: 'streak',
    tiers: [
      { tier: 'bronze', requirement: 30, xp: 200, icon: '⚡' },
      { tier: 'silver', requirement: 60, xp: 400, icon: '⚡' },
      { tier: 'gold', requirement: 90, xp: 600, icon: '⚡' },
      { tier: 'diamond', requirement: 365, xp: 2000, icon: '👑' },
    ],
  },

  // Logging badges
  MEAL_LOGGER: {
    id: 'meal_logger',
    name: 'Meal Logger',
    description: 'Log meals consistently',
    category: 'logging',
    tiers: [
      { tier: 'bronze', requirement: 10, xp: 50, icon: '🍽️' },
      { tier: 'silver', requirement: 50, xp: 150, icon: '🍽️' },
      { tier: 'gold', requirement: 200, xp: 400, icon: '🍽️' },
      { tier: 'diamond', requirement: 1000, xp: 1500, icon: '🏆' },
    ],
  },
  HYDRATION_HERO: {
    id: 'hydration_hero',
    name: 'Hydration Hero',
    description: 'Track water intake regularly',
    category: 'hydration',
    tiers: [
      { tier: 'bronze', requirement: 7, xp: 30, icon: '💧' },
      { tier: 'silver', requirement: 30, xp: 100, icon: '💧' },
      { tier: 'gold', requirement: 90, xp: 300, icon: '🌊' },
      { tier: 'diamond', requirement: 365, xp: 1000, icon: '🌊' },
    ],
  },

  // Nutrition badges
  PROTEIN_POWERHOUSE: {
    id: 'protein_powerhouse',
    name: 'Protein Powerhouse',
    description: 'Meet protein goals consistently',
    category: 'nutrition',
    tiers: [
      { tier: 'bronze', requirement: 7, xp: 75, icon: '💪' },
      { tier: 'silver', requirement: 30, xp: 200, icon: '💪' },
      { tier: 'gold', requirement: 90, xp: 500, icon: '🏋️' },
      { tier: 'diamond', requirement: 180, xp: 1200, icon: '🏋️' },
    ],
  },
  BALANCED_EATER: {
    id: 'balanced_eater',
    name: 'Balanced Eater',
    description: 'Maintain balanced macros',
    category: 'nutrition',
    tiers: [
      { tier: 'bronze', requirement: 7, xp: 100, icon: '⚖️' },
      { tier: 'silver', requirement: 30, xp: 250, icon: '⚖️' },
      { tier: 'gold', requirement: 90, xp: 600, icon: '🎯' },
      { tier: 'diamond', requirement: 180, xp: 1500, icon: '🎯' },
    ],
  },

  // Mood badges
  MOOD_TRACKER: {
    id: 'mood_tracker',
    name: 'Mood Tracker',
    description: 'Log mood regularly',
    category: 'mood',
    tiers: [
      { tier: 'bronze', requirement: 7, xp: 40, icon: '😊' },
      { tier: 'silver', requirement: 30, xp: 120, icon: '😊' },
      { tier: 'gold', requirement: 90, xp: 350, icon: '🧘' },
      { tier: 'diamond', requirement: 180, xp: 800, icon: '🧘' },
    ],
  },

  // Achievement badges
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Log breakfast before 9 AM',
    category: 'achievement',
    tiers: [
      { tier: 'bronze', requirement: 10, xp: 50, icon: '🌅' },
      { tier: 'silver', requirement: 30, xp: 150, icon: '🌅' },
      { tier: 'gold', requirement: 100, xp: 400, icon: '☀️' },
      { tier: 'diamond', requirement: 365, xp: 1000, icon: '☀️' },
    ],
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Avoid late night snacking (no food after 9 PM)',
    category: 'achievement',
    tiers: [
      { tier: 'bronze', requirement: 7, xp: 60, icon: '🌙' },
      { tier: 'silver', requirement: 30, xp: 180, icon: '🌙' },
      { tier: 'gold', requirement: 90, xp: 450, icon: '🦉' },
      { tier: 'diamond', requirement: 180, xp: 1000, icon: '🦉' },
    ],
  },
  VEGGIE_CHAMPION: {
    id: 'veggie_champion',
    name: 'Veggie Champion',
    description: 'Include vegetables in meals',
    category: 'nutrition',
    tiers: [
      { tier: 'bronze', requirement: 20, xp: 60, icon: '🥬' },
      { tier: 'silver', requirement: 100, xp: 200, icon: '🥬' },
      { tier: 'gold', requirement: 500, xp: 600, icon: '🥗' },
      { tier: 'diamond', requirement: 1000, xp: 1500, icon: '🥗' },
    ],
  },

  // Social badges
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Share achievements',
    category: 'social',
    tiers: [
      { tier: 'bronze', requirement: 5, xp: 25, icon: '🦋' },
      { tier: 'silver', requirement: 20, xp: 75, icon: '🦋' },
      { tier: 'gold', requirement: 50, xp: 200, icon: '🌟' },
      { tier: 'diamond', requirement: 100, xp: 500, icon: '🌟' },
    ],
  },
};

// ============================================================================
// CHALLENGE DEFINITIONS
// ============================================================================

const DAILY_CHALLENGES = [
  {
    id: 'log_all_meals',
    name: 'Complete Logger',
    description: 'Log breakfast, lunch, and dinner today',
    xp: 50,
    type: 'meals',
    target: 3,
    mealTypes: ['breakfast', 'lunch', 'dinner'],
  },
  {
    id: 'hydration_goal',
    name: 'Hydration Station',
    description: 'Drink at least 8 glasses of water',
    xp: 30,
    type: 'water',
    target: 2000, // ml
  },
  {
    id: 'protein_boost',
    name: 'Protein Boost',
    description: 'Eat at least 80g of protein today',
    xp: 40,
    type: 'nutrient',
    nutrient: 'protein',
    target: 80,
  },
  {
    id: 'mood_check',
    name: 'Mood Check',
    description: 'Log your mood at least twice today',
    xp: 25,
    type: 'mood',
    target: 2,
  },
  {
    id: 'fiber_focus',
    name: 'Fiber Focus',
    description: 'Consume at least 25g of fiber',
    xp: 35,
    type: 'nutrient',
    nutrient: 'fiber',
    target: 25,
  },
  {
    id: 'calorie_target',
    name: 'Calorie Conscious',
    description: 'Stay within your calorie goal (±10%)',
    xp: 45,
    type: 'calorie_range',
    tolerance: 0.1,
  },
];

const WEEKLY_CHALLENGES = [
  {
    id: 'seven_day_streak',
    name: 'Seven Seas Voyage',
    description: 'Log meals for 7 consecutive days',
    xp: 200,
    type: 'streak',
    target: 7,
    reward: 'Mystery Chest',
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete all daily challenges for 5 days',
    xp: 300,
    type: 'daily_challenges',
    target: 5,
    reward: 'Premium Badge',
  },
  {
    id: 'veggie_week',
    name: 'Veggie Victory',
    description: 'Include vegetables in 14+ meals this week',
    xp: 150,
    type: 'food_category',
    category: 'vegetables',
    target: 14,
    reward: 'Green Badge',
  },
  {
    id: 'hydration_week',
    name: 'Ocean Mastery',
    description: 'Meet hydration goal 6 out of 7 days',
    xp: 175,
    type: 'hydration_days',
    target: 6,
    reward: 'Water Badge',
  },
];

// ============================================================================
// BADGE FUNCTIONS
// ============================================================================

/**
 * Get all badges for a user with progress
 */
async function getUserBadges(userId) {
  try {
    // Get user's earned badges
    const earnedBadges = await db.execute(sql`
      SELECT badge_id, tier, earned_at, progress
      FROM user_badges
      WHERE user_id = ${userId}
    `);

    const earnedMap = {};
    for (const badge of earnedBadges.rows || []) {
      if (!earnedMap[badge.badge_id]) {
        earnedMap[badge.badge_id] = {};
      }
      earnedMap[badge.badge_id][badge.tier] = {
        earned: true,
        earnedAt: badge.earned_at,
        progress: badge.progress,
      };
    }

    // Get current progress for all badges
    const progress = await calculateBadgeProgress(userId);

    // Build badge list with progress
    const badges = Object.values(BADGES).map(badge => {
      const userBadge = earnedMap[badge.id] || {};
      const currentProgress = progress[badge.id] || 0;

      // Find current tier and next tier
      let currentTier = null;
      let nextTier = null;

      for (const tier of badge.tiers) {
        if (userBadge[tier.tier]?.earned) {
          currentTier = tier;
        } else if (!nextTier) {
          nextTier = tier;
        }
      }

      return {
        ...badge,
        currentTier: currentTier?.tier || null,
        nextTier: nextTier,
        progress: currentProgress,
        progressPercent: nextTier
          ? Math.min(100, Math.round((currentProgress / nextTier.requirement) * 100))
          : 100,
        earned: earnedMap[badge.id] || {},
      };
    });

    return badges;

  } catch (error) {
    console.error('[Gamification] Error getting badges:', error);
    return [];
  }
}

/**
 * Calculate progress for all badges
 */
async function calculateBadgeProgress(userId) {
  const progress = {};

  try {
    // Streak progress
    const streakResult = await db.execute(sql`
      SELECT streak FROM user_gamification WHERE user_id = ${userId}
    `);
    const streak = streakResult.rows?.[0]?.streak || 0;
    progress['streak_starter'] = streak;
    progress['streak_master'] = streak;

    // Meal count
    const mealCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM food_log WHERE user_id = ${userId}
    `);
    progress['meal_logger'] = parseInt(mealCount.rows?.[0]?.count) || 0;

    // Water logging days
    const waterDays = await db.execute(sql`
      SELECT COUNT(DISTINCT DATE(logged_at)) as count
      FROM water_log
      WHERE user_id = ${userId}
    `);
    progress['hydration_hero'] = parseInt(waterDays.rows?.[0]?.count) || 0;

    // Mood logging days
    const moodDays = await db.execute(sql`
      SELECT COUNT(DISTINCT DATE(logged_at)) as count
      FROM mood_log
      WHERE user_id = ${userId}
    `);
    progress['mood_tracker'] = parseInt(moodDays.rows?.[0]?.count) || 0;

    // Days where protein >= 30% of total calories (protein_powerhouse badge)
    const proteinDays = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM daily_nutrition_summary
      WHERE user_id = ${userId}
        AND total_calories > 0
        AND (total_protein * 4.0) / total_calories >= 0.30
    `);
    progress['protein_powerhouse'] = parseInt(proteinDays.rows?.[0]?.count) || 0;

    // Days where all three macros are within 10-40% of total calories (balanced_eater badge)
    const balancedDays = await db.execute(sql`
      SELECT COUNT(*) AS count
      FROM daily_nutrition_summary
      WHERE user_id = ${userId}
        AND total_calories > 0
        AND (total_protein * 4.0) / total_calories BETWEEN 0.10 AND 0.40
        AND (total_carbs   * 4.0) / total_calories BETWEEN 0.10 AND 0.60
        AND (total_fats    * 9.0) / total_calories BETWEEN 0.10 AND 0.40
    `);
    progress['balanced_eater'] = parseInt(balancedDays.rows?.[0]?.count) || 0;

    // Early bird count
    const earlyBird = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM food_log
      WHERE user_id = ${userId}
        AND meal_type = 'breakfast'
        AND EXTRACT(HOUR FROM logged_at) < 9
    `);
    progress['early_bird'] = parseInt(earlyBird.rows?.[0]?.count) || 0;

    // Veggie meals
    const veggieMeals = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM food_log
      WHERE user_id = ${userId}
        AND (
          LOWER(food_name) LIKE '%vegetable%'
          OR LOWER(food_name) LIKE '%salad%'
          OR LOWER(food_name) LIKE '%broccoli%'
          OR LOWER(food_name) LIKE '%spinach%'
        )
    `);
    progress['veggie_champion'] = parseInt(veggieMeals.rows?.[0]?.count) || 0;

  } catch (error) {
    console.error('[Gamification] Error calculating progress:', error);
  }

  return progress;
}

/**
 * Check and award badges for a user
 */
async function checkAndAwardBadges(userId) {
  const awarded = [];

  try {
    const progress = await calculateBadgeProgress(userId);

    for (const badge of Object.values(BADGES)) {
      for (const tier of badge.tiers) {
        const currentProgress = progress[badge.id] || 0;

        if (currentProgress >= tier.requirement) {
          // Check if already earned
          const existing = await db.execute(sql`
            SELECT id FROM user_badges
            WHERE user_id = ${userId}
              AND badge_id = ${badge.id}
              AND tier = ${tier.tier}
          `);

          if (!existing.rows?.length) {
            // Award badge
            await db.execute(sql`
              INSERT INTO user_badges (user_id, badge_id, tier, progress, earned_at)
              VALUES (${userId}, ${badge.id}, ${tier.tier}, ${currentProgress}, NOW())
            `);

            // Award XP
            await awardXP(userId, tier.xp, `Badge: ${badge.name} (${tier.tier})`);

            awarded.push({
              badge: badge.name,
              tier: tier.tier,
              xp: tier.xp,
              icon: tier.icon,
            });
          }
        }
      }
    }

  } catch (error) {
    console.error('[Gamification] Error awarding badges:', error);
  }

  return awarded;
}

// ============================================================================
// LEADERBOARD FUNCTIONS
// ============================================================================

/**
 * Get global XP leaderboard
 */
async function getGlobalLeaderboard(limit = 50) {
  const cacheKey = `leaderboard:global:${limit}`;
  let leaderboard = cache.get(cacheKey);

  if (!leaderboard) {
    try {
      const result = await db.execute(sql`
        SELECT
          ug.user_id,
          ug.xp,
          ug.level,
          ug.streak,
          u.first_name,
          u.last_name,
          u.avatar_url
        FROM user_gamification ug
        JOIN users u ON u.id = ug.user_id
        WHERE ug.xp > 0
        ORDER BY ug.xp DESC
        LIMIT ${limit}
      `);

      leaderboard = (result.rows || []).map((row, idx) => ({
        rank: idx + 1,
        userId: row.user_id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Anonymous',
        avatar: row.avatar_url,
        xp: row.xp,
        level: row.level,
        streak: row.streak,
      }));

      cache.set(cacheKey, leaderboard);

    } catch (error) {
      console.error('[Gamification] Error getting leaderboard:', error);
      leaderboard = [];
    }
  }

  return leaderboard;
}

/**
 * Get weekly XP leaderboard
 */
async function getWeeklyLeaderboard(limit = 50) {
  const cacheKey = `leaderboard:weekly:${limit}`;
  let leaderboard = cache.get(cacheKey);

  if (!leaderboard) {
    try {
      const result = await db.execute(sql`
        SELECT
          xh.user_id,
          SUM(xh.xp_gained) as weekly_xp,
          ug.level,
          ug.streak,
          u.first_name,
          u.last_name,
          u.avatar_url
        FROM xp_history xh
        JOIN user_gamification ug ON ug.user_id = xh.user_id
        JOIN users u ON u.id = xh.user_id
        WHERE xh.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY xh.user_id, ug.level, ug.streak, u.first_name, u.last_name, u.avatar_url
        ORDER BY weekly_xp DESC
        LIMIT ${limit}
      `);

      leaderboard = (result.rows || []).map((row, idx) => ({
        rank: idx + 1,
        userId: row.user_id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Anonymous',
        avatar: row.avatar_url,
        weeklyXp: parseInt(row.weekly_xp),
        level: row.level,
        streak: row.streak,
      }));

      cache.set(cacheKey, leaderboard);

    } catch (error) {
      console.error('[Gamification] Error getting weekly leaderboard:', error);
      leaderboard = [];
    }
  }

  return leaderboard;
}

/**
 * Get streak leaderboard
 */
async function getStreakLeaderboard(limit = 50) {
  const cacheKey = `leaderboard:streak:${limit}`;
  let leaderboard = cache.get(cacheKey);

  if (!leaderboard) {
    try {
      const result = await db.execute(sql`
        SELECT
          ug.user_id,
          ug.streak,
          ug.longest_streak,
          ug.level,
          u.first_name,
          u.last_name,
          u.avatar_url
        FROM user_gamification ug
        JOIN users u ON u.id = ug.user_id
        WHERE ug.streak > 0
        ORDER BY ug.streak DESC, ug.longest_streak DESC
        LIMIT ${limit}
      `);

      leaderboard = (result.rows || []).map((row, idx) => ({
        rank: idx + 1,
        userId: row.user_id,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Anonymous',
        avatar: row.avatar_url,
        streak: row.streak,
        longestStreak: row.longest_streak,
        level: row.level,
      }));

      cache.set(cacheKey, leaderboard);

    } catch (error) {
      console.error('[Gamification] Error getting streak leaderboard:', error);
      leaderboard = [];
    }
  }

  return leaderboard;
}

/**
 * Get user's rank on leaderboard
 */
async function getUserRank(userId) {
  try {
    const result = await db.execute(sql`
      WITH ranked AS (
        SELECT user_id, xp, RANK() OVER (ORDER BY xp DESC) as rank
        FROM user_gamification
        WHERE xp > 0
      )
      SELECT rank, xp FROM ranked WHERE user_id = ${userId}
    `);

    return result.rows?.[0] || { rank: null, xp: 0 };

  } catch (error) {
    console.error('[Gamification] Error getting user rank:', error);
    return { rank: null, xp: 0 };
  }
}

// ============================================================================
// CHALLENGE FUNCTIONS
// ============================================================================

/**
 * Get daily challenges for user
 */
async function getDailyChallenges(userId) {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get user's challenge progress for today
    const progressResult = await db.execute(sql`
      SELECT challenge_id, progress, completed, completed_at
      FROM user_challenges
      WHERE user_id = ${userId}
        AND challenge_type = 'daily'
        AND DATE(created_at) = ${today}
    `);

    const progressMap = {};
    for (const row of progressResult.rows || []) {
      progressMap[row.challenge_id] = row;
    }

    // Select today's challenges (rotate based on day)
    const dayOfWeek = new Date().getDay();
    const todaysChallenges = DAILY_CHALLENGES.filter((_, idx) =>
      (idx + dayOfWeek) % 3 === 0 || idx < 3
    ).slice(0, 4);

    return todaysChallenges.map(challenge => {
      const userProgress = progressMap[challenge.id] || {};
      return {
        ...challenge,
        progress: userProgress.progress || 0,
        completed: userProgress.completed || false,
        completedAt: userProgress.completed_at,
        progressPercent: Math.min(100, Math.round(((userProgress.progress || 0) / challenge.target) * 100)),
      };
    });

  } catch (error) {
    console.error('[Gamification] Error getting daily challenges:', error);
    return DAILY_CHALLENGES.slice(0, 4).map(c => ({
      ...c,
      progress: 0,
      completed: false,
      progressPercent: 0,
    }));
  }
}

/**
 * Get weekly challenges for user
 */
async function getWeeklyChallenges(userId) {
  const weekStart = getWeekStart();

  try {
    const progressResult = await db.execute(sql`
      SELECT challenge_id, progress, completed, completed_at
      FROM user_challenges
      WHERE user_id = ${userId}
        AND challenge_type = 'weekly'
        AND created_at >= ${weekStart}
    `);

    const progressMap = {};
    for (const row of progressResult.rows || []) {
      progressMap[row.challenge_id] = row;
    }

    return WEEKLY_CHALLENGES.map(challenge => {
      const userProgress = progressMap[challenge.id] || {};
      return {
        ...challenge,
        progress: userProgress.progress || 0,
        completed: userProgress.completed || false,
        completedAt: userProgress.completed_at,
        progressPercent: Math.min(100, Math.round(((userProgress.progress || 0) / challenge.target) * 100)),
      };
    });

  } catch (error) {
    console.error('[Gamification] Error getting weekly challenges:', error);
    return WEEKLY_CHALLENGES.map(c => ({
      ...c,
      progress: 0,
      completed: false,
      progressPercent: 0,
    }));
  }
}

/**
 * Update challenge progress
 */
async function updateChallengeProgress(userId, challengeId, challengeType, progress) {
  try {
    const challenge = challengeType === 'daily'
      ? DAILY_CHALLENGES.find(c => c.id === challengeId)
      : WEEKLY_CHALLENGES.find(c => c.id === challengeId);

    if (!challenge) return { success: false, error: 'Challenge not found' };

    const completed = progress >= challenge.target;
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart();

    // Upsert progress
    await db.execute(sql`
      INSERT INTO user_challenges (user_id, challenge_id, challenge_type, progress, completed, completed_at)
      VALUES (
        ${userId},
        ${challengeId},
        ${challengeType},
        ${progress},
        ${completed},
        ${completed ? new Date() : null}
      )
      ON CONFLICT (user_id, challenge_id, challenge_type)
      WHERE DATE(created_at) = ${challengeType === 'daily' ? today : weekStart}
      DO UPDATE SET
        progress = ${progress},
        completed = ${completed},
        completed_at = CASE WHEN ${completed} AND user_challenges.completed = false THEN NOW() ELSE user_challenges.completed_at END
    `);

    // Award XP if just completed
    if (completed) {
      const existing = await db.execute(sql`
        SELECT completed_at FROM user_challenges
        WHERE user_id = ${userId}
          AND challenge_id = ${challengeId}
          AND challenge_type = ${challengeType}
          AND completed = true
      `);

      // Only award if this is the first time completing
      if (!existing.rows?.length || !existing.rows[0].completed_at) {
        await awardXP(userId, challenge.xp, `Challenge: ${challenge.name}`);
      }
    }

    return {
      success: true,
      completed,
      progress,
      xpAwarded: completed ? challenge.xp : 0,
    };

  } catch (error) {
    console.error('[Gamification] Error updating challenge:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// XP FUNCTIONS
// ============================================================================

/**
 * Award XP to user
 */
async function awardXP(userId, amount, reason = '') {
  try {
    // Get current gamification state
    const current = await db.execute(sql`
      SELECT xp, level, streak FROM user_gamification
      WHERE user_id = ${userId}
    `);

    let currentXp = current.rows?.[0]?.xp || 0;
    let currentLevel = current.rows?.[0]?.level || 1;
    const streak = current.rows?.[0]?.streak || 0;

    // Apply streak multiplier
    let multiplier = 1;
    for (const [days, mult] of Object.entries(CONFIG.STREAK_MULTIPLIERS)) {
      if (streak >= parseInt(days)) {
        multiplier = mult;
      }
    }

    const bonusXp = Math.round(amount * (multiplier - 1));
    const totalXp = amount + bonusXp;
    currentXp += totalXp;

    // Calculate new level
    let newLevel = currentLevel;
    let xpForNextLevel = calculateXPForLevel(currentLevel + 1);

    while (currentXp >= xpForNextLevel && newLevel < CONFIG.MAX_LEVEL) {
      newLevel++;
      xpForNextLevel = calculateXPForLevel(newLevel + 1);
    }

    // Update gamification
    await db.execute(sql`
      INSERT INTO user_gamification (user_id, xp, level)
      VALUES (${userId}, ${currentXp}, ${newLevel})
      ON CONFLICT (user_id)
      DO UPDATE SET xp = ${currentXp}, level = ${newLevel}, updated_at = NOW()
    `);

    // Log XP history
    await db.execute(sql`
      INSERT INTO xp_history (user_id, xp_gained, reason, bonus_xp, multiplier)
      VALUES (${userId}, ${amount}, ${reason}, ${bonusXp}, ${multiplier})
    `);

    return {
      awarded: totalXp,
      baseXp: amount,
      bonusXp,
      multiplier,
      newTotal: currentXp,
      leveledUp: newLevel > currentLevel,
      newLevel,
    };

  } catch (error) {
    console.error('[Gamification] Error awarding XP:', error);
    return { awarded: 0, error: error.message };
  }
}

/**
 * Calculate XP required for a level
 */
function calculateXPForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(CONFIG.XP_PER_LEVEL * Math.pow(CONFIG.LEVEL_MULTIPLIER, level - 1));
}

/**
 * Get XP breakdown for user
 */
async function getXPBreakdown(userId, days = 7) {
  try {
    const result = await db.execute(sql`
      SELECT
        DATE(created_at) as date,
        SUM(xp_gained) as total_xp,
        SUM(bonus_xp) as bonus_xp,
        COUNT(*) as actions
      FROM xp_history
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    return result.rows || [];

  } catch (error) {
    console.error('[Gamification] Error getting XP breakdown:', error);
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Badges
  getUserBadges,
  checkAndAwardBadges,
  BADGES,

  // Leaderboards
  getGlobalLeaderboard,
  getWeeklyLeaderboard,
  getStreakLeaderboard,
  getUserRank,

  // Challenges
  getDailyChallenges,
  getWeeklyChallenges,
  updateChallengeProgress,
  DAILY_CHALLENGES,
  WEEKLY_CHALLENGES,

  // XP
  awardXP,
  calculateXPForLevel,
  getXPBreakdown,

  // Config
  CONFIG,
};
