/**
 * React Query hook for Profile data
 * Consolidates profile fetching into a single cached source
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { Profile } from '@/types/api';

/**
 * Fetch user profile from backend
 */
const fetchProfile = async (): Promise<Profile> => {
  return await apiClient.get('/profile/me');
};

/**
 * Hook to fetch and cache profile data
 * Used by ProfileProvider and other components needing profile info
 */
export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
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
