/**
 * Onboarding Step 1 — matches the warm-cream / deep-green editorial
 * brand established in the auth flow (see components/auth).
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import GoalCard from '../../components/onboarding/GoalCard';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { GOALS, ONBOARDING_COPY } from '../../constants/onboardingConfig';
import { AUTH_COLORS } from '../../components/auth/constants';

const FEATURES = [
  { label: 'Personalized\nNutrition', icon: 'locate', color: '#2C7A53', bg: 'rgba(44, 122, 83, 0.12)' },
  { label: 'Track\nProgress', icon: 'bar-chart', color: '#2563EB', bg: 'rgba(37, 99, 235, 0.10)' },
  { label: 'Smart\nPicks', icon: 'sparkles', color: '#D97706', bg: 'rgba(217, 153, 6, 0.12)' },
  { label: 'Private &\nSecure', icon: 'shield-checkmark', color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.10)' },
];

const Step1Screen = () => {
  const { step1Data, updateStepData, goToNextStep } = useOnboarding();
  const router = useRouter();
  const { signOut } = useAuth();
  const selectedGoal = step1Data.primaryGoal;

  const handleBack = () => {
    Alert.alert(
      'Exit setup?',
      'You can finish setting up your profile anytime from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/sign-in');
          },
        },
      ]
    );
  };

  const btnScale = useRef(new Animated.Value(1)).current;

  const handleGoalSelect = (goalId) => {
    updateStepData('step1', { primaryGoal: goalId });
  };

  const handleContinue = () => {
    if (selectedGoal) goToNextStep();
  };

  const onPressIn = () => {
    if (!selectedGoal) return;
    Animated.spring(btnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
    }).start();
  };

  return (
    <OnboardingLayout
      step={1}
      totalSteps={4}
      title={ONBOARDING_COPY.step1.title}
      subtitle={ONBOARDING_COPY.step1.subtitle}
      canGoBack={true}
      onBack={handleBack}
      footer={
        <>
          {/* Info pills */}
          <View style={styles.infoPillsRow}>
            <View style={styles.infoPill}>
              <Ionicons name="checkmark-circle" size={14} color={AUTH_COLORS.primary} />
              <Text style={styles.infoPillText}>Takes less than 1 minute</Text>
            </View>
            <View style={styles.infoPill}>
              <Ionicons name="refresh" size={14} color={AUTH_COLORS.primary} />
              <Text style={styles.infoPillText}>You can change this later</Text>
            </View>
          </View>

          {/* Pill CTA */}
          <Animated.View
            style={[
              styles.ctaWrapper,
              !selectedGoal && styles.ctaWrapperDisabled,
              { transform: [{ scale: btnScale }] },
            ]}
          >
            <Pressable
              onPress={handleContinue}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={!selectedGoal}
              accessibilityRole="button"
              accessibilityLabel="Continue to next step"
              accessibilityState={{ disabled: !selectedGoal }}
            >
              <LinearGradient
                colors={selectedGoal
                  ? [AUTH_COLORS.primaryLight, AUTH_COLORS.primary, AUTH_COLORS.primaryDeep]
                  : ['#E5E1D8', '#E5E1D8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButton}
              >
                <Text style={[
                  styles.ctaText,
                  !selectedGoal && styles.ctaTextDisabled,
                ]}>
                  {ONBOARDING_COPY.step1.continueBtn}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={selectedGoal ? AUTH_COLORS.white : AUTH_COLORS.muted}
                />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </>
      }
    >
      {/* Feature strip */}
      <View style={styles.featureStrip}>
        {FEATURES.map((feature, i) => (
          <React.Fragment key={feature.label}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIconBg, { backgroundColor: feature.bg }]}>
                <Ionicons name={feature.icon} size={17} color={feature.color} />
              </View>
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </View>
            {i < FEATURES.length - 1 && <View style={styles.featureDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Goal cards */}
      <View style={styles.goalsContainer}>
        {GOALS.map((goal) => (
          <GoalCard
            key={goal.id}
            id={goal.id}
            iconName={goal.iconName}
            label={goal.label}
            description={goal.description}
            gradientStart={goal.gradientStart}
            isSelected={selectedGoal === goal.id}
            onPress={handleGoalSelect}
          />
        ))}
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  /* Feature strip */
  featureStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 36, 31, 0.08)',
    paddingVertical: 15,
    paddingHorizontal: 6,
    shadowColor: 'rgba(7, 19, 30, 0.16)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  featureIconBg: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  featureLabel: {
    fontSize: 10.5,
    fontFamily: 'DMSans_500Medium',
    color: AUTH_COLORS.text,
    textAlign: 'center',
    lineHeight: 13,
  },
  featureDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(15, 36, 31, 0.08)',
  },

  goalsContainer: {
    gap: 13,
  },

  /* Info pills */
  infoPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  infoPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(107, 78, 255, 0.08)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  infoPillText: {
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
    color: AUTH_COLORS.primary,
    textAlign: 'center',
  },

  /* Pill CTA */
  ctaWrapper: {
    alignSelf: 'center',
    borderRadius: 999,
    shadowColor: 'rgba(107, 78, 255, 0.34)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaWrapperDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaButton: {
    paddingVertical: 15,
    paddingHorizontal: 44,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 15.5,
    fontFamily: 'DMSans_700Bold',
    color: AUTH_COLORS.white,
    letterSpacing: 0.2,
  },
  ctaTextDisabled: {
    color: AUTH_COLORS.muted,
  },
});

export default Step1Screen;
