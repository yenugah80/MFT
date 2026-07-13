/**
 * ApiInitializer - Initializes API client with Clerk token
 * This component should be placed inside ClerkProvider
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';

const ApiInitializer = ({ children }) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Only set token provider once Clerk is fully loaded
    if (!isLoaded) {
      return;
    }

    // Set token provider for API client
    apiClient.setTokenProvider(async () => {
      // Don't try to get token if user isn't signed in
      if (!isSignedIn) {
        return null;
      }

      try {
        const token = await getToken();
        return token;
      } catch (error) {
        // "Unable to authenticate" is expected when session isn't ready
        const isSessionError = error?.message?.includes('Unable to authenticate') ||
                               error?.message?.includes('active session');
        if (isSessionError) {
          // Silent - this is normal during app startup
          return null;
        }
        console.warn('[ApiInitializer] Token error:', error?.message || error);
        return null;
      }
    });

    // Invalidate auth-dependent queries so they refetch with the new token.
    // This fixes the case where profile/dashboard cached a 401 before the token was ready.
    if (isSignedIn) {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]); // ✅ Remove getToken from dependencies - it's a reference that changes on every render

  // Render children regardless of Clerk load state
  // This prevents blocking the entire app if Clerk is slow to initialize
  return children;
};

export default ApiInitializer;
