/**
 * React Query hook for Dashboard data
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { DashboardData } from '@/types/api';

/**
 * Fetch dashboard data
 */
const fetchDashboard = async (): Promise<DashboardData> => {
  return await apiClient.get('/nutrition/dashboard');
};

/**
 * Hook to fetch dashboard data
 */
export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    // Refresh dashboard every 2 minutes when screen is focused
    staleTime: 2 * 60 * 1000,
    // Keep cached data for 10 minutes (gcTime replaces deprecated cacheTime in React Query v5)
    gcTime: 10 * 60 * 1000,
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
