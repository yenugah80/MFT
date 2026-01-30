/**
 * StreakManager - Orchestrates All Streak UI Components
 *
 * A wrapper component that handles:
 * - StreakBrokenModal display
 * - StreakSavedModal display
 * - StreakAtRiskBanner display
 *
 * Usage:
 * ```jsx
 * // In your app layout or dashboard
 * <StreakManager onNavigateToLog={() => router.push('/(tabs)/log')} />
 * ```
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import StreakBrokenModal from './StreakBrokenModal';
import StreakSavedModal from './StreakSavedModal';
import StreakAtRiskBanner from './StreakAtRiskBanner';
import useStreakPopups from '../../hooks/useStreakPopups';

export default function StreakManager({ onNavigateToLog }) {
  const router = useRouter();
  const {
    // Data
    streak,
    previousStreak,
    freezesAvailable,
    hoursUntilMidnight,
    hoursRemainingToRestore,

    // States
    showBrokenModal,
    showSavedModal,
    shouldShowBanner,

    // Handlers
    handleRestoreStreak,
    handleSkipRestore,
    handleCloseSavedModal,
    handleDismissBanner,
    closeBrokenModal,
  } = useStreakPopups();

  const handleLogNow = () => {
    handleDismissBanner();
    if (onNavigateToLog) {
      onNavigateToLog();
    } else {
      router.push('/(tabs)/log');
    }
  };

  return (
    <>
      {/* Streak Broken Modal - Snapchat-style restoration prompt */}
      <StreakBrokenModal
        visible={showBrokenModal}
        previousStreak={previousStreak}
        freezesAvailable={freezesAvailable}
        hoursRemaining={hoursRemainingToRestore}
        onRestore={handleRestoreStreak}
        onSkip={handleSkipRestore}
        onClose={closeBrokenModal}
      />

      {/* Streak Saved Modal - Freeze auto-used notification */}
      <StreakSavedModal
        visible={showSavedModal}
        streak={streak}
        freezesRemaining={freezesAvailable}
        onClose={handleCloseSavedModal}
      />

      {/* At Risk Banner - Floating notification when streak is at risk */}
      <StreakAtRiskBanner
        visible={shouldShowBanner}
        streak={streak}
        hoursRemaining={hoursUntilMidnight}
        freezesAvailable={freezesAvailable}
        onLogNow={handleLogNow}
        onDismiss={handleDismissBanner}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Container styles if needed
});
