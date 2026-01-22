/**
 * MomentumEngine - Intelligence layer for MomentumCard
 *
 * Inspired by: Noom (variable reinforcement), Oura (personal bests),
 * Headspace (meaningful reframing), Fitbit (milestone celebration)
 *
 * Design Principles:
 * 1. Variable reinforcement - don't show same highlight every time
 * 2. Personal comparisons only - compare to user's own history
 * 3. Smart suppression - don't celebrate failure or spam user
 * 4. Meaningful metrics - reframe numbers with context
 */

import { getItem, setItem, STORAGE_KEYS } from '../../../utils/storage';

// ============================================================================
// HIGHLIGHT TYPES - Each represents a different type of achievement
// ============================================================================

export const HIGHLIGHT_TYPES = {
  STREAK_MILESTONE: 'streak_milestone',
  CONSISTENCY_WIN: 'consistency_win',
  MACRO_BALANCED: 'macro_balanced',
  HYDRATION_CHAMPION: 'hydration_champion',
  VARIETY_EXPLORER: 'variety_explorer',
  PERSONAL_BEST: 'personal_best',
  PATTERN_DISCOVERY: 'pattern_discovery',
  LEVEL_UP: 'level_up',
};

// Milestone thresholds for streaks
const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 90, 180, 365];

// ============================================================================
// HIGHLIGHT DETECTION - Check if each highlight type is achievable
// ============================================================================

/**
 * Check if current streak is a milestone
 */
function detectStreakMilestone(streak) {
  if (!streak || streak < 3) return null;

  if (STREAK_MILESTONES.includes(streak)) {
    return {
      type: HIGHLIGHT_TYPES.STREAK_MILESTONE,
      value: streak,
      priority: streak >= 30 ? 100 : streak >= 7 ? 80 : 60,
      message: getStreakMessage(streak),
      icon: 'flame',
      iconColor: '#EF4444',
      gradientColors: ['#FEF2F2', '#FEE2E2'],
    };
  }
  return null;
}

/**
 * Check for weekly consistency win (X of 7 days on track)
 */
function detectConsistencyWin(weeklyComplianceDays) {
  if (!weeklyComplianceDays || weeklyComplianceDays < 5) return null;

  return {
    type: HIGHLIGHT_TYPES.CONSISTENCY_WIN,
    value: weeklyComplianceDays,
    maxValue: 7,
    priority: weeklyComplianceDays === 7 ? 90 : 70,
    message: getConsistencyMessage(weeklyComplianceDays),
    icon: 'calendar-outline',
    iconColor: '#8B5CF6',
    gradientColors: ['#F5F3FF', '#EDE9FE'],
  };
}

/**
 * Check for balanced macros (all within ±15% of goals)
 */
function detectMacroBalance(macroBalance) {
  if (!macroBalance) return null;

  const { protein, carbs, fats } = macroBalance;
  const isBalanced = [protein, carbs, fats].every(
    m => m && m.progress >= 85 && m.progress <= 115
  );

  if (!isBalanced) return null;

  return {
    type: HIGHLIGHT_TYPES.MACRO_BALANCED,
    value: 'balanced',
    priority: 75,
    message: 'Your macros are perfectly balanced today',
    icon: 'pie-chart-outline',
    iconColor: '#10B981',
    gradientColors: ['#ECFDF5', '#D1FAE5'],
  };
}

/**
 * Check for hydration streak
 */
function detectHydrationChampion(hydrationStreak, hydrationProgress) {
  // Either on a hydration streak OR hit today's goal
  if (hydrationStreak >= 3) {
    return {
      type: HIGHLIGHT_TYPES.HYDRATION_CHAMPION,
      value: hydrationStreak,
      priority: hydrationStreak >= 7 ? 85 : 65,
      message: `${hydrationStreak} days fully hydrated`,
      icon: 'water-outline',
      iconColor: '#06B6D4',
      gradientColors: ['#ECFEFF', '#CFFAFE'],
    };
  }

  if (hydrationProgress >= 100) {
    return {
      type: HIGHLIGHT_TYPES.HYDRATION_CHAMPION,
      value: 100,
      isPercentage: true,
      priority: 55,
      message: "You've hit your water goal today",
      icon: 'water',
      iconColor: '#06B6D4',
      gradientColors: ['#ECFEFF', '#CFFAFE'],
    };
  }

  return null;
}

/**
 * Check for food variety exploration
 */
function detectVarietyExplorer(uniqueFoodsThisWeek) {
  if (!uniqueFoodsThisWeek || uniqueFoodsThisWeek < 8) return null;

  return {
    type: HIGHLIGHT_TYPES.VARIETY_EXPLORER,
    value: uniqueFoodsThisWeek,
    priority: uniqueFoodsThisWeek >= 15 ? 70 : 50,
    message: getVarietyMessage(uniqueFoodsThisWeek),
    icon: 'nutrition-outline',
    iconColor: '#F59E0B',
    gradientColors: ['#FFFBEB', '#FEF3C7'],
  };
}

/**
 * Check for personal best (improvement vs last week)
 */
function detectPersonalBest(vsLastWeekChange, complianceImprovement) {
  // Significant improvement in weekly compliance
  if (complianceImprovement && complianceImprovement >= 20) {
    return {
      type: HIGHLIGHT_TYPES.PERSONAL_BEST,
      value: complianceImprovement,
      isPercentage: true,
      priority: 85,
      message: `${complianceImprovement}% more consistent than last week`,
      icon: 'trending-up-outline',
      iconColor: '#10B981',
      gradientColors: ['#ECFDF5', '#D1FAE5'],
    };
  }

  return null;
}

/**
 * Check for pattern discovery
 */
function detectPatternDiscovery(patternsDiscovered, newPatternToday) {
  if (newPatternToday) {
    return {
      type: HIGHLIGHT_TYPES.PATTERN_DISCOVERY,
      value: patternsDiscovered || 1,
      priority: 95, // High priority - discoveries are exciting
      message: "You've discovered a new nutrition pattern",
      icon: 'bulb-outline',
      iconColor: '#3B82F6',
      gradientColors: ['#EFF6FF', '#DBEAFE'],
    };
  }
  return null;
}

/**
 * Check for level up
 */
function detectLevelUp(justLeveledUp, newLevel) {
  if (justLeveledUp && newLevel) {
    return {
      type: HIGHLIGHT_TYPES.LEVEL_UP,
      value: newLevel,
      priority: 100, // Highest priority
      message: getLevelUpMessage(newLevel),
      icon: 'trophy',
      iconColor: '#F59E0B',
      gradientColors: ['#FFFBEB', '#FDE68A'],
    };
  }
  return null;
}

// ============================================================================
// MESSAGE GENERATORS - Contextual, meaningful copy
// ============================================================================

function getStreakMessage(streak) {
  if (streak >= 365) return "A full year of consistency. Incredible.";
  if (streak >= 90) return "Three months strong. This is a lifestyle now.";
  if (streak >= 30) return "A month of dedication. You're building lasting habits.";
  if (streak >= 21) return "21 days - the habit formation milestone.";
  if (streak >= 14) return "Two weeks of momentum. Keep going.";
  if (streak >= 7) return "A full week logged. Great consistency.";
  if (streak >= 3) return "Building momentum. Every day counts.";
  return "You're on track.";
}

function getConsistencyMessage(days) {
  if (days === 7) return "Perfect week. Every single day logged.";
  if (days === 6) return "Almost perfect. 6 of 7 days tracked.";
  if (days === 5) return "Strong week. 5 days on track.";
  return `${days} of 7 days logged this week.`;
}

function getVarietyMessage(foods) {
  if (foods >= 20) return "Exceptional variety. Your gut microbiome thanks you.";
  if (foods >= 15) return "Great food diversity this week.";
  if (foods >= 10) return "Good variety in your meals.";
  return `${foods} different foods explored this week.`;
}

function getLevelUpMessage(level) {
  const titles = {
    2: "You've reached Explorer level.",
    3: "Welcome to Analyst level.",
    4: "Achieving Enthusiast status.",
    5: "Health Detective unlocked.",
    6: "Nutrition Pro achieved.",
    7: "Pattern Master status.",
    8: "Wellness Expert level.",
    9: "Elite Tracker achieved.",
    10: "Nutrition Master unlocked.",
  };
  return titles[level] || `Level ${level} achieved.`;
}

// ============================================================================
// MAIN ENGINE - Orchestrates highlight selection
// ============================================================================

/**
 * Determine if MomentumCard should be shown
 * Prevents spam and respects user context
 */
export async function shouldShowMomentumCard(context) {
  const {
    streak = 0,
    goalProgress = 0,
    justLostStreak = false,
    lastMomentumShown,
  } = context;

  // Don't celebrate failure
  if (justLostStreak) return false;

  // Need some progress to celebrate
  if (goalProgress < 40) return false;

  // Fatigue prevention: minimum 8 hours between cards
  if (lastMomentumShown) {
    const hoursSinceLastShown = (Date.now() - lastMomentumShown) / (1000 * 60 * 60);
    if (hoursSinceLastShown < 8) return false;
  }

  // Variable ratio: only show on milestone days or special achievements
  const isMilestoneStreak = STREAK_MILESTONES.includes(streak);
  const hasSpecialAchievement = context.justLeveledUp ||
                                 context.newPatternToday ||
                                 context.weeklyComplianceDays === 7;

  if (!isMilestoneStreak && !hasSpecialAchievement) {
    // For non-milestone days, show with 30% probability
    // This creates variable reinforcement (slot machine effect)
    return Math.random() < 0.3;
  }

  return true;
}

/**
 * Select the best highlight to show based on current metrics
 * Uses priority scoring to pick the most relevant achievement
 */
export function selectHighlight(metrics) {
  const {
    streak,
    weeklyComplianceDays,
    macroBalance,
    hydrationStreak,
    hydrationProgress,
    uniqueFoodsThisWeek,
    vsLastWeekChange,
    complianceImprovement,
    patternsDiscovered,
    newPatternToday,
    justLeveledUp,
    newLevel,
  } = metrics;

  // Collect all applicable highlights
  const highlights = [
    detectLevelUp(justLeveledUp, newLevel),
    detectPatternDiscovery(patternsDiscovered, newPatternToday),
    detectStreakMilestone(streak),
    detectPersonalBest(vsLastWeekChange, complianceImprovement),
    detectConsistencyWin(weeklyComplianceDays),
    detectHydrationChampion(hydrationStreak, hydrationProgress),
    detectMacroBalance(macroBalance),
    detectVarietyExplorer(uniqueFoodsThisWeek),
  ].filter(Boolean);

  if (highlights.length === 0) {
    // Fallback: generic on-track message
    return {
      type: 'ON_TRACK',
      value: null,
      priority: 30,
      message: "You're making progress. Keep building.",
      icon: 'checkmark-circle-outline',
      iconColor: '#10B981',
      gradientColors: ['#ECFDF5', '#D1FAE5'],
    };
  }

  // Sort by priority and pick the highest
  highlights.sort((a, b) => b.priority - a.priority);
  return highlights[0];
}

/**
 * Get secondary supporting metrics (chips at bottom of card)
 */
export function getSecondaryMetrics(metrics) {
  const { streak, hydrationProgress, uniqueFoodsThisWeek, weeklyComplianceDays } = metrics;

  const chips = [];

  if (streak > 0) {
    chips.push({
      icon: 'flame-outline',
      value: streak,
      label: 'streak',
      color: '#EF4444',
    });
  }

  if (hydrationProgress >= 50) {
    chips.push({
      icon: 'water-outline',
      value: `${Math.round(hydrationProgress)}%`,
      label: 'hydrated',
      color: '#06B6D4',
    });
  }

  if (uniqueFoodsThisWeek >= 5) {
    chips.push({
      icon: 'nutrition-outline',
      value: uniqueFoodsThisWeek,
      label: 'foods',
      color: '#F59E0B',
    });
  }

  if (weeklyComplianceDays >= 3) {
    chips.push({
      icon: 'calendar-outline',
      value: `${weeklyComplianceDays}/7`,
      label: 'this week',
      color: '#8B5CF6',
    });
  }

  // Return top 3 most relevant (avoid clutter)
  return chips.slice(0, 3);
}

/**
 * Record that momentum card was shown (for fatigue prevention)
 */
export async function recordMomentumShown() {
  try {
    await setItem('lastMomentumShown', Date.now().toString());
  } catch (e) {
    // Silent fail - not critical
  }
}

/**
 * Get last momentum shown timestamp
 */
export async function getLastMomentumShown() {
  try {
    const timestamp = await getItem('lastMomentumShown');
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (e) {
    return null;
  }
}
