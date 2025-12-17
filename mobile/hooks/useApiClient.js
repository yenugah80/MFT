/**
 * Hook to initialize API client with Clerk authentication
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import apiClient from '@/services/apiClient';

export const useApiClient = () => {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set token provider for API client
    apiClient.setTokenProvider(async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error('[useApiClient] Failed to get token:', error);
        return null;
      }
    });
  }, [getToken]);

  return apiClient;
};
