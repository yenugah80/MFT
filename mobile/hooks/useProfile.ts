/**
 * React Query hook for Profile data
 * Consolidates profile fetching into a single cached source
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import apiClient from '@/services/apiClient';
import type { Profile } from '@/types/api';

/**
 * Fetch user profile from backend.
 *
 * A brand-new account (first Apple/Google/email sign-in) has no profile row
 * yet, and the backend answers 404. That is a definite "no profile", not a
 * failure: resolving it to null lets ProfileProvider route to onboarding.
 * Throwing instead made React Query retry and then show "Couldn't load your
 * profile — check your connection", a dead end for every new account that
 * entered through "/".
 */
export const fetchProfile = async (): Promise<Profile | null> => {
  try {
    return await apiClient.get('/profile/me');
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

/**
 * Hook to fetch and cache profile data
 * Used by ProfileProvider and other components needing profile info
 */
export const useProfile = () => {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: isLoaded && isSignedIn,
    // Cache profile for 5 minutes (profile changes are rare)
    staleTime: 5 * 60 * 1000,
    // Keep data in memory for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Refetch on mount only if data is stale (default behavior with staleTime set)
    refetchOnMount: true,
  });
};

/**
 * Prefetch profile data (useful for optimistic loading)
 */
export const prefetchProfile = async (queryClient: any) => {
  await queryClient.prefetchQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });
};
