/**
 * useAchievements Hook
 *
 * Provides achievement data and helpers for the app.
 * - Fetches all achievements with unlock status
 * - Computes progress towards locked achievements
 * - Generates witty messages for achievement events
 *
 * Usage:
 * ```jsx
 * const {
 *   achievements,
 *   unlockedAchievements,
 *   lockedAchievements,
 *   byCategory,
 *   stats,
 *   isLoading,
 *   // Helpers
 *   getProgress,
 *   getNextAchievement,
 *   getMessage,
 * } = useAchievements();
 * ```
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import { useGamification } from './useGamification';
import { gamificationMessages } from '../utils/wittyMessages';

// ============================================================================
// API FETCH
// ============================================================================

const fetchAchievements = async () => {
  const response = await apiClient.get('/gamification/achievements');
  const data = response?.data ?? response;
  if (!data) {
    throw new Error('Achievements returned no data');
  }
  return data;
};

// ============================================================================
// LOTTIE ANIMATION MAP (for mobile)
// ============================================================================

export const LOTTIE_ANIMATIONS = {
  streak: require('../assets/animations/streak.json'),
  celebration: require('../assets/animations/celebration.json'),
  success: require('../assets/animations/success.json'),
  sync: require('../assets/animations/sync.json'),
};

// Fallback to success animation if specific one not found
export const getLottieAnimation = (lottieSource) => {
  return LOTTIE_ANIMATIONS[lottieSource] || LOTTIE_ANIMATIONS.success;
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAchievements() {
  // Fetch achievements from API
  const {
    data: achievementData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['achievements'],
    queryFn: fetchAchievements,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
  });

  // Get current gamification state for progress calculation
  const { streak, totalMealsLogged, level } = useGamification();

  // ========== COMPUTED VALUES ==========

  const computed = useMemo(() => {
    const achievements = achievementData?.achievements || [];
    const byCategory = achievementData?.byCategory || {};
    const stats = achievementData?.stats || {
      total: 0,
      unlocked: 0,
      locked: 0,
      completionPercent: 0,
      totalXpEarned: 0,
    };

    const unlockedAchievements = achievements.filter(a => a.isUnlocked);
    const lockedAchievements = achievements.filter(a => !a.isUnlocked);

    // Find recently unlocked (within last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyUnlocked = unlockedAchievements.filter(
      a => new Date(a.unlockedAt) > oneDayAgo
    );

    return {
      achievements,
      unlockedAchievements,
      lockedAchievements,
      recentlyUnlocked,
      byCategory,
      stats,
    };
  }, [achievementData]);

  // ========== PROGRESS CALCULATION ==========

  /**
   * Get progress towards a specific achievement
   * Returns { current, target, percent, isClose }
   */
  const getProgress = useCallback((achievement) => {
    if (!achievement?.criteria) return null;
    if (achievement.isUnlocked) {
      return { current: 1, target: 1, percent: 100, isClose: false, isComplete: true };
    }

    const { streak: streakReq, count: countReq, level: levelReq } = achievement.criteria;

    if (streakReq) {
      const percent = Math.min(100, Math.round((streak / streakReq) * 100));
      return {
        current: streak,
        target: streakReq,
        percent,
        isClose: percent >= 80,
        isComplete: false,
        remaining: Math.max(0, streakReq - streak),
        unit: 'days',
      };
    }

    if (countReq) {
      const percent = Math.min(100, Math.round((totalMealsLogged / countReq) * 100));
      return {
        current: totalMealsLogged,
        target: countReq,
        percent,
        isClose: percent >= 80,
        isComplete: false,
        remaining: Math.max(0, countReq - totalMealsLogged),
        unit: 'meals',
      };
    }

    if (levelReq) {
      const percent = Math.min(100, Math.round((level / levelReq) * 100));
      return {
        current: level,
        target: levelReq,
        percent,
        isClose: percent >= 80,
        isComplete: false,
        remaining: Math.max(0, levelReq - level),
        unit: 'levels',
      };
    }

    // No trackable criteria (e.g., recovery achievements)
    return null;
  }, [streak, totalMealsLogged, level]);

  /**
   * Get the next closest achievement in a category
   */
  const getNextAchievement = useCallback((category = null) => {
    const locked = category
      ? computed.lockedAchievements.filter(a => a.category === category)
      : computed.lockedAchievements;

    if (locked.length === 0) return null;

    // Find the one with highest progress
    let bestProgress = { percent: -1 };
    let bestAchievement = null;

    for (const achievement of locked) {
      const progress = getProgress(achievement);
      if (progress && progress.percent > bestProgress.percent) {
        bestProgress = progress;
        bestAchievement = achievement;
      }
    }

    return bestAchievement
      ? { achievement: bestAchievement, progress: bestProgress }
      : null;
  }, [computed.lockedAchievements, getProgress]);

  /**
   * Get achievements that are close to being unlocked (>= 80% progress)
   */
  const getCloseAchievements = useCallback(() => {
    return computed.lockedAchievements
      .map(achievement => ({
        achievement,
        progress: getProgress(achievement),
      }))
      .filter(item => item.progress?.isClose)
      .sort((a, b) => b.progress.percent - a.progress.percent);
  }, [computed.lockedAchievements, getProgress]);

  // ========== MESSAGE GENERATORS ==========

  /**
   * Get achievement unlocked message
   */
  const getMessage = useCallback((achievement) => {
    return gamificationMessages.achievementUnlocked(
      achievement.name,
      achievement.description
    );
  }, []);

  /**
   * Get "almost there" message for close achievements
   */
  const getAlmostMessage = useCallback((achievement, progress) => {
    return gamificationMessages.almostAchievement(
      achievement.name,
      `${progress.remaining} ${progress.unit}`
    );
  }, []);

  /**
   * Get first achievement message
   */
  const getFirstAchievementMessage = useCallback(() => {
    return gamificationMessages.firstTime.firstAchievement();
  }, []);

  // ========== RETURN ==========

  return {
    // Achievement data
    achievements: computed.achievements,
    unlockedAchievements: computed.unlockedAchievements,
    lockedAchievements: computed.lockedAchievements,
    recentlyUnlocked: computed.recentlyUnlocked,
    byCategory: computed.byCategory,
    stats: computed.stats,

    // State
    isLoading,
    error,
    refetch,

    // Progress helpers
    getProgress,
    getNextAchievement,
    getCloseAchievements,

    // Message helpers
    getMessage,
    getAlmostMessage,
    getFirstAchievementMessage,

    // Animation helper
    getLottieAnimation,
  };
}

export default useAchievements;
