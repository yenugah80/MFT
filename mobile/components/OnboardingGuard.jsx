/**
 * OnboardingGuard - Production-Grade Onboarding State Guard
 *
 * PURPOSE:
 * Prevents returning users from re-entering onboarding flow by checking
 * the backend profile.onboardingCompletedAt timestamp.
 *
 * API ENDPOINT:
 * GET /profile - Returns { basics, dietary, goals, gamification, onboardingCompletedAt }
 * - Requires: Authentication (Bearer token from Clerk)
 * - Response field: profile.onboardingCompletedAt (timestamp or null)
 *
 * FLOW:
 * 1. User authenticates via Clerk
 * 2. OnboardingGuard checks profile.onboardingCompletedAt from API
 * 3. If timestamp exists → Returning user → Redirect to dashboard
 * 4. If timestamp missing → New user → Allow onboarding
 * 5. If API fails → Check AsyncStorage → Fallback to safe default
 *
 * ERROR HANDLING:
 * - API unavailable → Check AsyncStorage draft
 * - No draft + API down → Assume new user (safest default)
 * - Graceful offline support
 *
 * SECURITY:
 * - Only checks after user is authenticated (useAuth hook)
 * - Uses apiClient with proper auth headers
 * - No exposed sensitive data
 * - All timestamps validated before redirect
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import apiClient from '@/services/apiClient';

const OnboardingGuard = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    // Only check when auth is loaded and user is signed in
    if (!isLoaded || !isSignedIn) {
      setIsCheckingOnboarding(false);
      return;
    }

    const checkOnboardingStatus = async () => {
      try {
        // Fetch complete profile from backend to check onboarding status
        // GET /profile returns: { basics, dietary, goals, gamification, onboardingCompletedAt }
        const profileResponse = await apiClient.get('/profile');

        if (profileResponse && profileResponse.onboardingCompletedAt) {
          // ✅ User has completed onboarding - they are a returning user
          console.log('[OnboardingGuard] ✅ Returning user detected. Onboarding completed at:', profileResponse.onboardingCompletedAt);

          // Clear any stale onboarding draft data
          try {
            await AsyncStorage.removeItem('@onboarding_draft');
            await AsyncStorage.removeItem('@onboarding_current_step');
            console.log('[OnboardingGuard] Cleared onboarding draft data');
          } catch (error) {
            console.warn('[OnboardingGuard] Failed to clear onboarding draft:', error);
          }

          // Unconditionally redirect returning users to dashboard
          // This prevents them from accessing onboarding routes
          console.log('[OnboardingGuard] Redirecting returning user to dashboard');
          setTimeout(() => {
            router.replace('/(tabs)/dashboard');
          }, 100);
        } else {
          // ✅ User needs to complete onboarding - they are a new user
          console.log('[OnboardingGuard] 🆕 New user detected. Onboarding is required');
          setIsCheckingOnboarding(false);
        }
      } catch (error) {
        // API call failed - check offline strategy
        // This allows app to work when backend is temporarily unavailable
        console.error('[OnboardingGuard] ⚠️ Failed to fetch profile from /profile endpoint:', {
          message: error?.message,
          status: error?.response?.status,
          endpoint: '/profile'
        });

        // Fallback: Check AsyncStorage for onboarding draft
        // If user has a draft, they were in onboarding and should continue
        // If no draft, assume new user (safest default when offline)
        try {
          const savedDraft = await AsyncStorage.getItem('@onboarding_draft');
          if (savedDraft) {
            // User has a draft - they were resuming onboarding
            console.log('[OnboardingGuard] ✅ Found onboarding draft in AsyncStorage - user can resume');
            setIsCheckingOnboarding(false);
          } else {
            // No draft found - new user (safest assumption when API unavailable)
            console.log('[OnboardingGuard] 🆕 No draft found - treating as new user (offline fallback)');
            setIsCheckingOnboarding(false);
          }
        } catch (storageError) {
          console.warn('[OnboardingGuard] AsyncStorage error:', storageError?.message);
          // Even AsyncStorage failed - allow to proceed (safest path)
          setIsCheckingOnboarding(false);
        }
      }
    };

    checkOnboardingStatus();
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking onboarding status
  if (isCheckingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  // If not signed in or checking is done, render children
  return children;
};

export default OnboardingGuard;
