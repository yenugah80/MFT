/**
 * Onboarding Stack Navigator
 * Navigation container for the 4-step onboarding flow
 * Includes error boundary for graceful error recovery
 */

import React, { useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { OnboardingProvider } from '../../contexts/OnboardingContext';
import OnboardingErrorBoundary from '../../components/onboarding/OnboardingErrorBoundary';

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
  return (
    <OnboardingProvider>
      <OnboardingStack />
    </OnboardingProvider>
  );
}
