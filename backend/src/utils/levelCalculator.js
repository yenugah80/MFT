// Level Calculator Utility for Gamification System
// Uses exponential scaling: baseXP * (level ^ 1.3)

/**
 * Calculate XP required to reach a specific level
 * Formula: 1000 * (level ^ 1.3)
 * @param {number} level - Target level
 * @returns {number} XP required for that level
 */
export function getXPForLevel(level) {
  if (level <= 1) return 0;
  return Math.floor(1000 * Math.pow(level, 1.3));
}

/**
 * Calculate user's current level based on total XP
 * Returns level stats including progress to next level
 * @param {number} totalXP - User's total XP
 * @returns {Object} Level information
 */
export function calculateLevel(totalXP) {
  let level = 1;
  let cumulativeXP = 0;

  // Find the current level by accumulating XP requirements
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
    currentLevelXP,      // XP progress in current level
    nextLevelXP,         // XP needed for next level
    totalXP,             // Total XP accumulated
    progressPercent,     // Progress percentage (0-100)
  };
}

/**
 * Check if awarding XP will result in a level up
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
    levelsGained: afterLevel.level - beforeLevel.level,
  };
}

/**
 * Get rank title based on level
 * @param {number} level - Current level
 * @returns {string} Rank title
 */
export function getRankTitle(level) {
  if (level < 5) return 'Novice';
  if (level < 10) return 'Apprentice';
  if (level < 20) return 'Expert';
  if (level < 30) return 'Master';
  if (level < 50) return 'Grandmaster';
  return 'Legend';
}

/**
 * Get total XP needed to reach a specific level from level 1
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
