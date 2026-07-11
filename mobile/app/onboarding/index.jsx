/**
 * Onboarding Index Route
 * Redirects to the appropriate step based on saved progress
 */

import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text, Pressable } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

export default function OnboardingIndex() {
  const { step, isLoading, resetOnboarding } = useOnboarding();
  const [showDevOptions, setShowDevOptions] = useState(false);
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    // Wait for context to load state from AsyncStorage
    if (!isLoading) {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      // In dev mode, show options if resuming from a later step
      if (__DEV__ && step > 1) {
        setShowDevOptions(true);
      } else {
        // Navigate to the current step
        router.replace(`/onboarding/step-${step}`);
      }
      return;
    }

    // Fallback: if still loading after 3s, force redirect to step-1
    // This handles the race condition where router.replace conflicts with a pending Redirect
    fallbackTimerRef.current = setTimeout(() => {
      console.warn('[OnboardingIndex] Load timeout - forcing redirect to step-1');
      router.replace('/onboarding/step-1');
    }, 3000);

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };
  }, [step, isLoading]);

  const handleResume = () => {
    router.replace(`/onboarding/step-${step}`);
  };

  const handleStartFresh = async () => {
    await resetOnboarding();
    router.replace('/onboarding/step-1');
  };

  // Dev mode: show resume/restart options
  if (__DEV__ && showDevOptions) {
    return (
      <View style={styles.container}>
        <Text style={styles.devTitle}>Resume Onboarding?</Text>
        <Text style={styles.devSubtitle}>You have saved progress at step {step}</Text>

        <Pressable style={styles.resumeButton} onPress={handleResume}>
          <Text style={styles.resumeButtonText}>Continue from Step {step}</Text>
        </Pressable>

        <Pressable style={styles.resetButton} onPress={handleStartFresh}>
          <Text style={styles.resetButtonText}>Start Fresh (Reset)</Text>
        </Pressable>
      </View>
    );
  }

  // Show loading while context loads from AsyncStorage
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={BRAND.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  devTitle: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#1A1A2E',
    marginBottom: 8,
  },
  devSubtitle: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: '#6B7280',
    marginBottom: 32,
  },
  resumeButton: {
    backgroundColor: BRAND.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.semibold,
  },
});
