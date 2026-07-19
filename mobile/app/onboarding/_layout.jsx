/**
 * Onboarding Stack Navigator
 * Navigation container for the 4-step onboarding flow
 * Includes error boundary for graceful error recovery
 */

import React, { useCallback } from 'react';
import { Stack, Redirect, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { OnboardingProvider } from '../../contexts/OnboardingContext';
import OnboardingErrorBoundary from '../../components/onboarding/OnboardingErrorBoundary';
import { useProfileContext } from '../../providers/ProfileProvider';
import LoadingSpinner from '../../components/LoadingSpinner';

function OnboardingStack() {
  const router = useRouter();

  const handleRestart = useCallback(() => {
    router.replace('/onboarding/step-1');
  }, [router]);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/step-1');
    }
  }, [router]);

  return (
    <OnboardingErrorBoundary
      onRestart={handleRestart}
      onGoBack={handleGoBack}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Loading',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="step-1"
          options={{
            title: 'Welcome',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="step-2"
          options={{
            title: 'Basics',
          }}
        />
        <Stack.Screen
          name="step-3"
          options={{
            title: 'Preferences',
          }}
        />
        <Stack.Screen
          name="step-4"
          options={{
            title: 'Goals',
          }}
        />
      </Stack>
    </OnboardingErrorBoundary>
  );
}

export default function OnboardingLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { onboardingComplete, profile, isLoading } = useProfileContext();

  if (!isLoaded) return null;

  // Signed-out user deep-linked here → send to auth
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Wait for profile on initial load only
  if (!profile && isLoading) return <LoadingSpinner message="Loading your profile…" />;

  // Completed user navigated back into onboarding (deep-link / back gesture) → block
  if (onboardingComplete === true) return <Redirect href="/(tabs)" />;

  return (
    <OnboardingProvider>
      <OnboardingStack />
    </OnboardingProvider>
  );
}
