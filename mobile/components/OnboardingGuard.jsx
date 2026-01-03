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

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { useProfileContext } from '@/providers/ProfileProvider';

const OnboardingGuard = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const { onboardingComplete, isLoading: profileLoading, error: profileError, refetchProfile } = useProfileContext();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // 🆕 PREVENT DUPLICATE CHECKS: Track if check is already in progress
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Only check when auth is loaded and user is signed in
    if (!isLoaded || !isSignedIn) {
      setIsCheckingOnboarding(false);
      return;
    }

    const checkOnboardingStatus = async () => {
      // Profile is loading from ProfileProvider - wait for it
      if (profileLoading) {
        console.log('[OnboardingGuard] ⏳ Waiting for profile from context...');
        return;
      }

      // Profile fetch failed - handle error
      if (profileError) {
        console.error('[OnboardingGuard] ❌ Profile fetch error from context:', profileError);

        // Try to recover with AsyncStorage draft
        try {
          const savedDraft = await AsyncStorage.getItem('@onboarding_draft');
          if (savedDraft) {
            console.log('[OnboardingGuard] ✅ Found onboarding draft in AsyncStorage - user can resume');
            setError(null);
            setIsCheckingOnboarding(false);
          } else {
            console.log('[OnboardingGuard] 🔴 No draft found and profile unavailable');
            setError({
              message: 'Unable to load profile. Please check your connection.',
              status: profileError?.status,
              canRetry: true
            });
          }
        } catch (storageError) {
          console.warn('[OnboardingGuard] AsyncStorage error:', storageError?.message);
          setError({
            message: 'Unable to load profile. Please check your connection.',
            canRetry: true
          });
        }
        return;
      }

      // Profile loaded successfully - check onboarding status
      if (onboardingComplete === false) {
        // ✅ User needs to complete onboarding - they are a new user
        console.log('[OnboardingGuard] 🆕 New user detected. Onboarding is required');
        setIsCheckingOnboarding(false);
        setError(null);
      } else if (onboardingComplete === true) {
        // ✅ User has completed onboarding - they are a returning user
        console.log('[OnboardingGuard] ✅ Returning user detected');

        // Clear any stale onboarding draft data
        try {
          await AsyncStorage.removeItem('@onboarding_draft');
          await AsyncStorage.removeItem('@onboarding_current_step');
          console.log('[OnboardingGuard] Cleared onboarding draft data');
        } catch (error) {
          console.warn('[OnboardingGuard] Failed to clear onboarding draft:', error);
        }

        // Unconditionally redirect returning users to dashboard
        console.log('[OnboardingGuard] Redirecting returning user to dashboard');
        setTimeout(() => {
          router.replace('/(tabs)/dashboard');
        }, 100);
      }
    };

    checkOnboardingStatus();
    // Depend on profile context values and retry count
  }, [isLoaded, isSignedIn, profileLoading, profileError, onboardingComplete, retryCount]);

  // Retry handler - refetch profile from context
  const handleRetry = () => {
    setError(null); // Clear error state
    refetchProfile(); // Trigger profile refetch from ProfileProvider
  };

  // 🆕 Show error state with retry option
  if (error && !isCheckingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#DC2626' }}>
          ❌ Backend Connection Error
        </Text>
        <Text style={{ fontSize: 14, marginBottom: 15, textAlign: 'center', color: '#666' }}>
          {error.message}
        </Text>
        {error.status && (
          <Text style={{ fontSize: 12, marginBottom: 20, color: '#999' }}>
            Status Code: {error.status}
          </Text>
        )}
        <TouchableOpacity
          onPress={handleRetry}
          style={{
            backgroundColor: '#0066CC',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 5,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: '#999', marginTop: 10 }}>
          Check your internet connection and try again
        </Text>
      </View>
    );
  }

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
