/**
 * React Query hook for Dashboard data
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { DashboardData } from '@/types/api';

/**
 * Fetch dashboard data
 * React Query requires queryFn to always return a value (not undefined)
 */
const fetchDashboard = async (): Promise<DashboardData> => {
  const response = await apiClient.get('/nutrition/dashboard');
  const data = response?.data ?? response;
  // Ensure we never return undefined - React Query will throw an error
  if (data === undefined || data === null) {
    throw new Error('Dashboard returned no data');
  }
  if (__DEV__) {
    console.log('[Dashboard] gamification.streak:', data?.gamification?.streak);
    console.log('[Dashboard] trends.currentStreak:', data?.trends?.currentStreak);
    console.log('[Dashboard] gamification.xp:', data?.gamification?.xp);
    console.log('[Dashboard] gamification.level:', data?.gamification?.level);
    console.log('[Dashboard] gamification.nextLevelXp:', data?.gamification?.nextLevelXp);
    console.log('[Dashboard] gamification.progressPercent:', data?.gamification?.progressPercent);
  }
  return data;
};

/**
 * Hook to fetch dashboard data
 */
export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    // Refresh dashboard every 30 seconds for real-time water/mood tracking
    staleTime: 30 * 1000,
    // Keep cached data for 5 minutes (gcTime replaces deprecated cacheTime in React Query v5)
    gcTime: 5 * 60 * 1000,
    // Refetch on mount only if data is stale (default behavior with staleTime set)
    refetchOnMount: true,
  });
};

/**
 * Prefetch dashboard data (useful for optimistic loading)
 */
export const prefetchDashboard = async (queryClient: any) => {
  await queryClient.prefetchQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });
};
