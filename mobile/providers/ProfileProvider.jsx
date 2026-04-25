/**
 * ProfileProvider - Centralized Profile State Management
 *
 * Provides a single source of truth for user profile data.
 * Prevents duplicate API calls across multiple components.
 *
 * Features:
 * - Centralized profile fetching via React Query
 * - Memoized onboarding status calculation
 * - Automatic cache management
 * - Error boundaries and loading states
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useProfile } from '../hooks/useProfile';

const ProfileContext = createContext(null);

/**
 * Hook to use profile data and methods
 * @throws Error if used outside ProfileProvider
 */
export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfileContext must be used within ProfileProvider');
  }
  return context;
};

/**
 * ProfileProvider Component
 * Wraps the app to provide profile context to all child components
 */
export const ProfileProvider = ({ children }) => {
  const { data: profile, isLoading, error, refetch } = useProfile();

  /**
   * Calculate onboarding completion status
   * Memoized to prevent unnecessary recalculations
   *
   * Onboarding is complete if EITHER:
   * 1. onboardingCompletedAt timestamp is set (new path), OR
   * 2. Profile has full setup (age, weight, height, activityLevel) - existing users
   */
  const onboardingComplete = useMemo(() => {
    // Return null (unknown) while loading or when there's no data yet.
    // Callers must treat null as "still loading" to avoid premature redirects.
    if (isLoading || !profile) return null;

    const hasCompletedAtTimestamp = !!profile.onboardingCompletedAt;
    const hasFullProfile = !!(
      profile.age &&
      profile.weightKg &&
      profile.heightCm &&
      profile.activityLevel
    );

    return hasCompletedAtTimestamp || hasFullProfile;
  }, [profile, isLoading]);

  /**
   * Check if user is in onboarding flow but hasn't completed
   */
  const isOnboarding = useMemo(() => {
    if (onboardingComplete === null) return null; // still loading
    return !onboardingComplete;
  }, [onboardingComplete]);

  /**
   * Context value exposed to consuming components
   */
  const value = {
    // Raw profile data
    profile,
    // Loading state
    isLoading,
    // Error state (if profile fetch failed)
    error,
    // Memoized onboarding status
    onboardingComplete,
    isOnboarding,
    // Manual refetch function (for retry scenarios)
    refetchProfile: refetch,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export default ProfileProvider;
