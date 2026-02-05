/**
 * useGamification Hook
 *
 * Provides gamification state and helpers for the app.
 * - Extracts gamification data from dashboard
 * - Computes XP progress and level info
 * - Generates witty messages for gamification events
 * - Handles streak lifecycle (continued, at risk, lost, saved)
 * - Badges, Leaderboards, and Challenges API integration
 *
 * Usage:
 * ```jsx
 * const {
 *   xp,
 *   level,
 *   levelName,
 *   streak,
 *   streakFreezes,
 *   xpProgress,
 *   xpToNextLevel,
 *   isLoading,
 *   // Messages
 *   getXpMessage,
 *   getLevelUpMessage,
 *   getStreakMessage,
 *   getAchievementMessage,
 *   // Enhanced features
 *   badges,
 *   leaderboard,
 *   challenges,
 * } = useGamification();
 * ```
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDashboard } from './useDashboard';
import apiClient from '../services/apiClient';
import { gamificationMessages, streakMessages } from '../utils/wittyMessages';

// ============================================================================
// LEVEL NAMES (matches backend levelCalculator.js)
// ============================================================================

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

const getLevelName = (level) => LEVEL_NAMES[level] || `Level ${level}`;

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useGamification() {
  const { data: dashboard, isLoading, error, refetch } = useDashboard();

  // Track previous level/streak for detecting changes
  const prevLevelRef = useRef(null);
  const prevStreakRef = useRef(null);

  // Extract gamification data from dashboard
  const gamification = dashboard?.gamification || {};
  const trends = dashboard?.trends || {};
  const userLifecycle = dashboard?.userLifecycle || {};

  // ========== COMPUTED VALUES ==========

  const computedData = useMemo(() => {
    const xp = gamification.xp || 0;
    const level = gamification.level || 1;
    const streak = gamification.streak ?? trends.currentStreak ?? 0;
    const streakFreezes = gamification.streakFreezes || 0;
    const totalMealsLogged = gamification.totalMealsLogged || userLifecycle.totalMealsLogged || 0;
    const badges = gamification.badges || [];

    // XP Progress calculations
    const currentLevelXp = gamification.currentLevelXp || 0;
    const nextLevelXp = gamification.nextLevelXp || 100;
    const progressPercent = gamification.progressPercent || 0;
    const xpToNextLevel = nextLevelXp - currentLevelXp;

    // Level name
    const levelName = getLevelName(level);

    // Streak status
    const hasLoggedToday = userLifecycle.hasLoggedToday || false;
    const isStreakAtRisk = streak > 0 && !hasLoggedToday;

    // Estimate hours until streak is lost (assuming midnight reset)
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const hoursUntilMidnight = Math.max(0, Math.floor((midnight - now) / (1000 * 60 * 60)));

    return {
      xp,
      level,
      levelName,
      streak,
      streakFreezes,
      totalMealsLogged,
      badges,
      currentLevelXp,
      nextLevelXp,
      progressPercent,
      xpToNextLevel,
      hasLoggedToday,
      isStreakAtRisk,
      hoursUntilMidnight,
    };
  }, [gamification, trends, userLifecycle]);

  // ========== LEVEL UP DETECTION ==========

  useEffect(() => {
    // Track level changes
    if (prevLevelRef.current !== null && prevLevelRef.current < computedData.level) {
      // Level up detected! Could trigger a celebration here
      if (__DEV__) {
        console.log(`[Gamification] Level up! ${prevLevelRef.current} → ${computedData.level}`);
      }
    }
    prevLevelRef.current = computedData.level;
  }, [computedData.level]);

  useEffect(() => {
    // Track streak changes
    if (prevStreakRef.current !== null && prevStreakRef.current !== computedData.streak) {
      const streakGained = computedData.streak > prevStreakRef.current;
      const streakLost = prevStreakRef.current > 0 && computedData.streak === 0;
      if (__DEV__) {
        if (streakLost) {
          console.log(`[Gamification] Streak lost! Was ${prevStreakRef.current} days`);
        } else if (streakGained) {
          console.log(`[Gamification] Streak continued! Now ${computedData.streak} days`);
        }
      }
    }
    prevStreakRef.current = computedData.streak;
  }, [computedData.streak]);

  // ========== MESSAGE GENERATORS ==========

  /**
   * Get XP earned message
   */
  const getXpMessage = useCallback((amount, action = null) => {
    return gamificationMessages.xpEarned(amount, action);
  }, []);

  /**
   * Get XP bonus message (for multipliers/bonuses)
   */
  const getXpBonusMessage = useCallback((amount, reason = null) => {
    return gamificationMessages.xpBonus(amount, reason);
  }, []);

  /**
   * Get level up celebration message
   */
  const getLevelUpMessage = useCallback((newLevel = null) => {
    const level = newLevel || computedData.level;
    const levelName = getLevelName(level);
    return gamificationMessages.levelUp(level, levelName);
  }, [computedData.level]);

  /**
   * Get streak message based on event type
   */
  const getStreakMessage = useCallback((eventType = 'continued', data = {}) => {
    switch (eventType) {
      case 'continued':
        return streakMessages.continued(data.days || computedData.streak);
      case 'milestone':
        return streakMessages.milestone(data.days || computedData.streak);
      case 'lost':
        return streakMessages.lost(data.previousDays || 0);
      case 'saved':
        return streakMessages.saved();
      case 'restart':
        return streakMessages.restart();
      case 'closeCall':
        return streakMessages.closeCall();
      case 'atRisk':
        return streakMessages.atRisk(data.hoursLeft || computedData.hoursUntilMidnight);
      case 'freezeEarned':
        return streakMessages.freezeEarned();
      default:
        return streakMessages.continued(computedData.streak);
    }
  }, [computedData.streak, computedData.hoursUntilMidnight]);

  /**
   * Get achievement unlocked message
   */
  const getAchievementMessage = useCallback((name, description = null) => {
    return gamificationMessages.achievementUnlocked(name, description);
  }, []);

  /**
   * Get badge earned message
   */
  const getBadgeMessage = useCallback((badgeName, tier = null) => {
    return gamificationMessages.badgeEarned(badgeName, tier);
  }, []);

  /**
   * Get tier upgrade message (Bronze → Silver → Gold etc)
   */
  const getTierUpgradeMessage = useCallback((newTier, badgeName = null) => {
    return gamificationMessages.tierUpgrade(newTier, badgeName);
  }, []);

  /**
   * Get challenge completed message
   */
  const getChallengeMessage = useCallback((challengeName = null) => {
    return gamificationMessages.challengeCompleted(challengeName);
  }, []);

  /**
   * Get "almost level up" message
   */
  const getAlmostLevelUpMessage = useCallback(() => {
    return gamificationMessages.almostLevelUp(computedData.xpToNextLevel);
  }, [computedData.xpToNextLevel]);

  /**
   * Get first-time event messages
   */
  const getFirstTimeMessage = useCallback((eventType) => {
    const messages = gamificationMessages.firstTime;
    switch (eventType) {
      case 'firstLog':
        return messages.firstLog();
      case 'firstStreak':
        return messages.firstStreak();
      case 'firstGoal':
        return messages.firstGoal();
      case 'firstAchievement':
        return messages.firstAchievement();
      default:
        return messages.firstLog();
    }
  }, []);

  // ========== RETURN ==========

  return {
    // Core gamification data
    xp: computedData.xp,
    level: computedData.level,
    levelName: computedData.levelName,
    streak: computedData.streak,
    streakFreezes: computedData.streakFreezes,
    totalMealsLogged: computedData.totalMealsLogged,
    badges: computedData.badges,

    // XP progress
    currentLevelXp: computedData.currentLevelXp,
    nextLevelXp: computedData.nextLevelXp,
    progressPercent: computedData.progressPercent,
    xpToNextLevel: computedData.xpToNextLevel,

    // Streak status
    hasLoggedToday: computedData.hasLoggedToday,
    isStreakAtRisk: computedData.isStreakAtRisk,
    hoursUntilMidnight: computedData.hoursUntilMidnight,

    // State
    isLoading,
    error,
    refetch,

    // Message generators
    getXpMessage,
    getXpBonusMessage,
    getLevelUpMessage,
    getStreakMessage,
    getAchievementMessage,
    getBadgeMessage,
    getTierUpgradeMessage,
    getChallengeMessage,
    getAlmostLevelUpMessage,
    getFirstTimeMessage,

    // Level name helper
    getLevelName,
  };
}

// ============================================================================
// ENHANCED GAMIFICATION HOOKS (API-based)
// ============================================================================

/**
 * Query keys for gamification API
 */
export const GAMIFICATION_KEYS = {
  badges: ['gamification', 'badges'],
  leaderboard: (type) => ['gamification', 'leaderboard', type],
  challenges: ['gamification', 'challenges'],
  xpHistory: (days) => ['gamification', 'xp', days],
  summary: ['gamification', 'summary'],
};

/**
 * Get all badges with user's progress
 */
export function useBadges(options = {}) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.badges,
    queryFn: async () => {
      const response = await apiClient.get('/gamification/badges');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Check and award new badges
 */
export function useCheckBadges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/gamification/badges/check');
      return response.data;
    },
    onSuccess: (data) => {
      if (data.awarded?.length > 0) {
        queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.badges });
        queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.summary });
      }
    },
  });
}

/**
 * Get leaderboard data
 */
export function useLeaderboard(type = 'global', limit = 50, options = {}) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.leaderboard(type),
    queryFn: async () => {
      const response = await apiClient.get('/gamification/leaderboard', {
        params: { type, limit },
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Get daily and weekly challenges
 */
export function useChallenges(options = {}) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.challenges,
    queryFn: async () => {
      const response = await apiClient.get('/gamification/challenges');
      return response.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Update challenge progress
 */
export function useUpdateChallengeProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, progress, type = 'daily' }) => {
      const response = await apiClient.post(`/gamification/challenges/${challengeId}/progress`, {
        progress,
        type,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.challenges });
      if (data.completed) {
        queryClient.invalidateQueries({ queryKey: ['gamification', 'xp'] });
        queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEYS.summary });
      }
    },
  });
}

/**
 * Get XP breakdown and history
 */
export function useXPHistory(days = 7, options = {}) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.xpHistory(days),
    queryFn: async () => {
      const response = await apiClient.get('/gamification/xp', {
        params: { days },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Get complete gamification summary
 */
export function useGamificationSummary(options = {}) {
  return useQuery({
    queryKey: GAMIFICATION_KEYS.summary,
    queryFn: async () => {
      const response = await apiClient.get('/gamification/summary');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

export default useGamification;
