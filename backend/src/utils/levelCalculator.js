/**
 * Level Calculator - Unified Gamification Progression
 *
 * XP Formula: 100 + (50 * level) per level
 * - Level 2: 200 XP (~7 days of logging)
 * - Level 5: 350 XP
 * - Level 10: 600 XP
 *
 * Level Names: 20-tier system matching mobile/hooks/useGamification.js
 */

// Unified level names - MUST match mobile/hooks/useGamification.js
const LEVEL_NAMES = {
  1: 'Beginner',
  2: 'Novice',
  3: 'Learner',
  4: 'Explorer',
  5: 'Apprentice',
  6: 'Intermediate',
  7: 'Practitioner',
  8: 'Skilled',
  9: 'Proficient',
  10: 'Advanced',
  11: 'Expert',
  12: 'Master',
  13: 'Grandmaster',
  14: 'Champion',
  15: 'Legend',
  16: 'Mythic',
  17: 'Transcendent',
  18: 'Immortal',
  19: 'Celestial',
  20: 'Ultimate',
};

// Rank tiers for badge display (broader categories)
const RANK_TIERS = {
  1: { name: 'Novice', color: '#9CA3AF', icon: 'leaf' },       // 1-4
  5: { name: 'Apprentice', color: '#10B981', icon: 'star' },   // 5-9
  10: { name: 'Expert', color: '#3B82F6', icon: 'diamond' },   // 10-14
  15: { name: 'Legend', color: '#8B5CF6', icon: 'crown' },     // 15-19
  20: { name: 'Ultimate', color: '#F59E0B', icon: 'trophy' },  // 20+
};

/**
 * Calculate XP required to reach a specific level
 * Formula: 100 + (50 * level) - gentle linear progression
 *
 * @param {number} level - Target level
 * @returns {number} XP required for that level
 */
export function getXPForLevel(level) {
  if (level <= 1) return 0;
  return 100 + (50 * level);
}

/**
 * Calculate user's current level based on total XP
 *
 * @param {number} totalXP - User's total XP
 * @returns {Object} Level information with progress details
 */
export function calculateLevel(totalXP) {
  if (totalXP == null || isNaN(totalXP) || totalXP < 0) {
    totalXP = 0;
  }

  let level = 1;
  let cumulativeXP = 0;

  // Find current level by accumulating XP requirements
  while (cumulativeXP + getXPForLevel(level + 1) <= totalXP) {
    cumulativeXP += getXPForLevel(level + 1);
    level++;
  }

  const currentLevelXP = totalXP - cumulativeXP;
  const nextLevelXP = getXPForLevel(level + 1);
  const progressPercent = nextLevelXP > 0
    ? Math.floor((currentLevelXP / nextLevelXP) * 100)
    : 0;

  return {
    level,
    levelName: getLevelName(level),
    currentLevelXP,      // XP progress in current level
    nextLevelXP,         // XP needed for next level
    totalXP,             // Total XP accumulated
    progressPercent,     // Progress percentage (0-100)
    rank: getRankTier(level),
  };
}

/**
 * Check if awarding XP will result in a level up
 *
 * @param {number} currentXP - Current total XP
 * @param {number} xpToAdd - XP about to be added
 * @returns {Object} Level up information
 */
export function checkLevelUp(currentXP, xpToAdd) {
  const beforeLevel = calculateLevel(currentXP);
  const afterLevel = calculateLevel(currentXP + xpToAdd);

  return {
    leveledUp: afterLevel.level > beforeLevel.level,
    oldLevel: beforeLevel.level,
    newLevel: afterLevel.level,
    oldLevelName: beforeLevel.levelName,
    newLevelName: afterLevel.levelName,
    levelsGained: afterLevel.level - beforeLevel.level,
  };
}

/**
 * Get level name for display
 *
 * @param {number} level - Current level
 * @returns {string} Level name
 */
export function getLevelName(level) {
  if (level >= 20) return LEVEL_NAMES[20];
  return LEVEL_NAMES[level] || `Level ${level}`;
}

/**
 * Get rank tier for badge display (broader category)
 *
 * @param {number} level - Current level
 * @returns {Object} Rank tier info { name, color, icon }
 */
export function getRankTier(level) {
  if (level >= 20) return RANK_TIERS[20];
  if (level >= 15) return RANK_TIERS[15];
  if (level >= 10) return RANK_TIERS[10];
  if (level >= 5) return RANK_TIERS[5];
  return RANK_TIERS[1];
}

/**
 * Get rank title (backwards compatibility)
 *
 * @param {number} level - Current level
 * @returns {string} Rank title
 */
export function getRankTitle(level) {
  return getRankTier(level).name;
}

/**
 * Get total XP needed to reach a specific level from level 1
 *
 * @param {number} targetLevel - Target level
 * @returns {number} Cumulative XP needed
 */
export function getCumulativeXPForLevel(targetLevel) {
  let cumulativeXP = 0;
  for (let level = 2; level <= targetLevel; level++) {
    cumulativeXP += getXPForLevel(level);
  }
  return cumulativeXP;
}

/**
 * Get XP breakdown for level range (for UI display)
 *
 * @param {number} fromLevel - Starting level
 * @param {number} toLevel - Ending level
 * @returns {Array} XP requirements per level
 */
export function getXPBreakdown(fromLevel, toLevel) {
  const breakdown = [];
  let cumulative = getCumulativeXPForLevel(fromLevel);

  for (let level = fromLevel; level <= toLevel; level++) {
    const xpForLevel = getXPForLevel(level + 1);
    cumulative += xpForLevel;
    breakdown.push({
      level,
      levelName: getLevelName(level),
      xpRequired: xpForLevel,
      cumulativeXP: cumulative,
    });
  }

  return breakdown;
}
