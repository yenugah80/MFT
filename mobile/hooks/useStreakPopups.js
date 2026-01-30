/**
 * useStreakPopups - Snapchat-Style Streak Management Hook
 *
 * Manages all streak-related popup states and API calls:
 * - Detects when streak was broken (shows restore modal)
 * - Detects when streak was auto-saved by freeze
 * - Tracks "at risk" state for floating banner
 * - Handles streak restoration API calls
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import { useDashboard } from './useDashboard';

// Storage keys for dismissal state
const STREAK_BANNER_DISMISSED_KEY = '@streak_banner_dismissed';
const STREAK_POPUP_SHOWN_KEY = '@streak_popup_shown_';

/**
 * Check streak status from API
 */
const fetchStreakStatus = async () => {
  try {
    const response = await apiClient.get('/gamification/streak-status');
    return response.data || response;
  } catch (error) {
    console.error('[useStreakPopups] Failed to fetch streak status:', error);
    return null;
  }
};

/**
 * Restore streak using freeze
 */
const restoreStreak = async () => {
  const response = await apiClient.post('/gamification/restore-streak');
  return response.data || response;
};

/**
 * Clear "streak saved" flag after acknowledging
 */
const clearStreakSavedFlag = async () => {
  try {
    await apiClient.post('/gamification/clear-streak-saved');
  } catch (error) {
    console.error('[useStreakPopups] Failed to clear streak saved flag:', error);
  }
};

export function useStreakPopups() {
  const queryClient = useQueryClient();
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard();

  // Local state for popup visibility
  const [showBrokenModal, setShowBrokenModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Extract gamification data from dashboard
  const gamification = dashboard?.gamification || {};
  const {
    streak = 0,
    previousStreak = 0,
    streakFreezes = 0,
    streakResetAt = null,
    streakSavedByFreeze = false,
    lastLogDate = null,
  } = gamification;

  // Calculate derived states
  const computed = useMemo(() => {
    const now = new Date();

    // Check if user has logged today
    let hasLoggedToday = false;
    if (lastLogDate) {
      const lastLog = new Date(lastLogDate);
      hasLoggedToday =
        lastLog.getFullYear() === now.getFullYear() &&
        lastLog.getMonth() === now.getMonth() &&
        lastLog.getDate() === now.getDate();
    }

    // Calculate hours until midnight (streak reset time)
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const hoursUntilMidnight = Math.max(0, (midnight - now) / (1000 * 60 * 60));

    // Check if streak is at risk
    const isStreakAtRisk = streak > 0 && !hasLoggedToday;

    // Check if streak can be restored
    let canRestore = false;
    let hoursRemainingToRestore = 0;

    if (streakResetAt && previousStreak > 0) {
      const resetTime = new Date(streakResetAt);
      const hoursSinceReset = (now - resetTime) / (1000 * 60 * 60);
      hoursRemainingToRestore = Math.max(0, 24 - hoursSinceReset);
      canRestore = hoursSinceReset <= 24 && streakFreezes > 0;
    }

    // Determine urgency level
    let urgencyLevel = 'none';
    if (isStreakAtRisk) {
      if (hoursUntilMidnight <= 1) urgencyLevel = 'critical';
      else if (hoursUntilMidnight <= 3) urgencyLevel = 'urgent';
      else if (hoursUntilMidnight <= 6) urgencyLevel = 'moderate';
      else urgencyLevel = 'low';
    }

    return {
      hasLoggedToday,
      hoursUntilMidnight,
      isStreakAtRisk,
      canRestore,
      hoursRemainingToRestore,
      urgencyLevel,
    };
  }, [streak, previousStreak, streakFreezes, streakResetAt, lastLogDate]);

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: restoreStreak,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
      setShowBrokenModal(false);
    },
    onError: (error) => {
      console.error('[useStreakPopups] Restore failed:', error);
    },
  });

  // Check for popup conditions on mount and when data changes
  useEffect(() => {
    if (dashboardLoading) return;

    const checkPopups = async () => {
      // Check if we've already shown a popup for this reset event
      const popupKey = `${STREAK_POPUP_SHOWN_KEY}${streakResetAt || 'none'}`;
      const alreadyShown = await AsyncStorage.getItem(popupKey);

      // Case 1: Streak was auto-saved by freeze
      if (streakSavedByFreeze && !alreadyShown) {
        setShowSavedModal(true);
        await AsyncStorage.setItem(popupKey, 'true');
        return;
      }

      // Case 2: Streak was broken and can be restored
      if (computed.canRestore && previousStreak > 0 && !alreadyShown) {
        setShowBrokenModal(true);
        await AsyncStorage.setItem(popupKey, 'true');
        return;
      }

      // Check banner dismissal state
      const dismissedDate = await AsyncStorage.getItem(STREAK_BANNER_DISMISSED_KEY);
      if (dismissedDate) {
        const dismissed = new Date(dismissedDate);
        const now = new Date();
        // Reset dismissal at midnight
        if (dismissed.getDate() !== now.getDate()) {
          await AsyncStorage.removeItem(STREAK_BANNER_DISMISSED_KEY);
          setBannerDismissed(false);
        } else {
          setBannerDismissed(true);
        }
      }
    };

    checkPopups();
  }, [dashboardLoading, streakSavedByFreeze, computed.canRestore, previousStreak, streakResetAt]);

  // Handlers
  const handleRestoreStreak = useCallback(() => {
    restoreMutation.mutate();
  }, [restoreMutation]);

  const handleSkipRestore = useCallback(() => {
    setShowBrokenModal(false);
  }, []);

  const handleCloseSavedModal = useCallback(async () => {
    setShowSavedModal(false);
    // Clear the flag in backend
    await clearStreakSavedFlag();
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  const handleDismissBanner = useCallback(async () => {
    setBannerDismissed(true);
    await AsyncStorage.setItem(STREAK_BANNER_DISMISSED_KEY, new Date().toISOString());
  }, []);

  const handleLogNow = useCallback(() => {
    // This should navigate to log screen - caller should handle
    handleDismissBanner();
  }, [handleDismissBanner]);

  // Determine if banner should show
  const shouldShowBanner = computed.isStreakAtRisk && !bannerDismissed && !showBrokenModal && !showSavedModal;

  return {
    // Current streak data
    streak,
    previousStreak,
    freezesAvailable: streakFreezes,

    // Computed states
    hasLoggedToday: computed.hasLoggedToday,
    hoursUntilMidnight: computed.hoursUntilMidnight,
    isStreakAtRisk: computed.isStreakAtRisk,
    canRestore: computed.canRestore,
    hoursRemainingToRestore: computed.hoursRemainingToRestore,
    urgencyLevel: computed.urgencyLevel,

    // Modal states
    showBrokenModal,
    showSavedModal,
    shouldShowBanner,

    // Mutation state
    isRestoring: restoreMutation.isPending,
    restoreError: restoreMutation.error,

    // Handlers
    handleRestoreStreak,
    handleSkipRestore,
    handleCloseSavedModal,
    handleDismissBanner,
    handleLogNow,

    // Manual control
    openBrokenModal: () => setShowBrokenModal(true),
    closeBrokenModal: () => setShowBrokenModal(false),
    openSavedModal: () => setShowSavedModal(true),
    closeSavedModal: () => setShowSavedModal(false),
  };
}

export default useStreakPopups;
