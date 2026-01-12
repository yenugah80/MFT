/**
 * ApiInitializer - Initializes API client with Clerk token
 * This component should be placed inside ClerkProvider
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import apiClient from '@/services/apiClient';

const ApiInitializer = ({ children }) => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // Only set token provider once Clerk is fully loaded
    if (!isLoaded) {
      console.log('[ApiInitializer] Waiting for Clerk to load...');
      return;
    }

    // Set token provider for API client
    apiClient.setTokenProvider(async () => {
      try {
        const token = await getToken({ template: 'backend' });
        if (!token) {
          console.warn('[ApiInitializer] Token unavailable (user signed in: %s)', isSignedIn);
        } else if (__DEV__) {
          console.log('[ApiInitializer] Token acquired (length %d)', token.length);
        }
        return token;
      } catch (error) {
        console.error('[ApiInitializer] Failed to get token:', error);
        return null;
      }
    });

    console.log('[ApiInitializer] API client initialized with Clerk token provider');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]); // ✅ Remove getToken from dependencies - it's a reference that changes on every render

  // Render children regardless of Clerk load state
  // This prevents blocking the entire app if Clerk is slow to initialize
  return children;
};

export default ApiInitializer;
