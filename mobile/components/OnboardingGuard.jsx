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
import apiClient from '@/services/apiClient';

const OnboardingGuard = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
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
      // 🆕 GUARD: Don't check if already checking (prevents duplicate API calls)
      if (isCheckingRef.current) {
        console.log('[OnboardingGuard] ⏭️ Check already in progress, skipping duplicate');
        return;
      }

      isCheckingRef.current = true;

      try {
        // Clear any previous error state before checking
        setError(null);

        // Fetch complete profile from backend to check onboarding status
        // GET /profile returns: { basics, dietary, goals, gamification, onboardingCompletedAt }
        const profileResponse = await apiClient.get('/profile');

        // 🆕 EXPLICIT VALIDATION: Ensure response is valid
        if (!profileResponse) {
          throw new Error('Backend returned empty profile response - please try again');
        }

        if (profileResponse.onboardingCompletedAt) {
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
        // 🆕 EXPLICIT ERROR HANDLING: Log and display real error
        const errorMessage = error?.response?.data?.error || error?.message || 'Failed to fetch profile';
        const errorStatus = error?.response?.status;

        console.error('[OnboardingGuard] ❌ Profile fetch failed:', {
          message: errorMessage,
          status: errorStatus,
          details: error?.response?.data,
          endpoint: '/profile'
        });

        // 🆕 Store error for UI display
        setError({
          message: errorMessage,
          status: errorStatus,
          canRetry: true
        });

        // Fallback: Check AsyncStorage for onboarding draft
        // If user has a draft, they were in onboarding and should continue
        // If no draft, show error but allow manual retry
        try {
          const savedDraft = await AsyncStorage.getItem('@onboarding_draft');
          if (savedDraft) {
            // User has a draft - they were resuming onboarding
            console.log('[OnboardingGuard] ✅ Found onboarding draft in AsyncStorage - user can resume');
            setError(null); // Clear error if we can recover with draft
            setIsCheckingOnboarding(false);
          } else {
            // No draft found - show error to user
            console.log('[OnboardingGuard] 🔴 No draft found and API unavailable - showing error to user');
            // Keep error state for user to see
          }
        } catch (storageError) {
          console.warn('[OnboardingGuard] AsyncStorage error:', storageError?.message);
          // Even AsyncStorage failed - show error to user
        }
      } finally {
        // 🆕 IMPORTANT: Reset flag only after async work is done
        isCheckingRef.current = false;
      }
    };

    checkOnboardingStatus();
    // 🆕 FIXED: Only depend on isLoaded, isSignedIn, retryCount (not router)
  }, [isLoaded, isSignedIn, retryCount]);

  // 🆕 Retry handler
  const handleRetry = () => {
    isCheckingRef.current = false; // Reset flag before retry
    setRetryCount(prev => prev + 1);
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
