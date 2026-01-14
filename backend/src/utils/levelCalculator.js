// Level Calculator Utility for Gamification System
// Uses balanced scaling that rewards consistent logging
// Target: Level up every ~5-7 days of consistent logging (3 meals/day = 30 XP)

/**
 * Calculate XP required to reach a specific level
 * Formula: 100 + (50 * level) - creates achievable progression
 * Level 2: 200 XP (~7 days)
 * Level 3: 350 XP (~12 days total)
 * Level 5: 650 XP (~22 days total)
 * Level 10: 1150 XP (~38 days total)
 * @param {number} level - Target level
 * @returns {number} XP required for that level
 */
export function getXPForLevel(level) {
  if (level <= 1) return 0;
  // Gentle progression: 100 base + 50 per level
  // This means each level requires slightly more XP but stays achievable
  return 100 + (50 * level);
}

/**
 * Calculate user's current level based on total XP
 * Returns level stats including progress to next level
 * @param {number} totalXP - User's total XP
 * @returns {Object} Level information
 */
export function calculateLevel(totalXP) {
  // Guard against invalid input
  if (totalXP == null || isNaN(totalXP) || totalXP < 0) {
    totalXP = 0;
  }

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
