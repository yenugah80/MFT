/**
 * Onboarding Stack Navigator
 * Navigation container for the 4-step onboarding flow
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useOnboarding } from '../../hooks/useOnboarding';

export default function OnboardingLayout() {
  const { setStep } = useOnboarding();

  // Reset to step 1 when entering the onboarding stack
  useEffect(() => {
    console.log('[OnboardingLayout] Onboarding flow started, resetting to step 1');
    setStep(1);
  }, [setStep]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
        animationTypeForReplace: false,
        presentation: 'card',
        cardStyle: {
          opacity: 1,
        },
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 300,
            },
          },
        },
      }}
    >
      <Stack.Screen
        name="step-1"
        options={{
          title: 'Welcome',
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
  );
}
