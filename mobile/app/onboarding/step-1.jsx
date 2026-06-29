/**
 * Onboarding Step 1 — Premium Wellness Design
 *
 * - Warm cream background (#F8FBF9) with white card surfaces
 * - Refined mint-green primary (#0F9B5E)
 * - Pill CTA: borderRadius 999, gradient #0F9B5E → #34D399
 * - Gentle box-shadow cards (rgba(0,0,0,0.06))
 * - Spring press feedback: stiffness 300, damping 20
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import GoalCard from '../../components/onboarding/GoalCard';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { GOALS, ONBOARDING_COPY } from '../../constants/onboardingConfig';
import { TYPOGRAPHY } from '../../constants/premiumTheme';

const DS = {
  primary:      '#0F9B5E',
  primaryDark:  '#0A7A49',
  primaryLight: '#34D399',
  onSurface:    '#111827',
  onSurfaceVar: 'rgba(17, 24, 39, 0.45)',
  surface:      '#F8FBF9',
  card:         '#FFFFFF',
};

const Step1Screen = () => {
  const { step1Data, updateStepData, goToNextStep } = useOnboarding();
  const selectedGoal = step1Data.primaryGoal;

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
      canGoBack={false}
    >
      {/* Section prompt */}
      <Text style={styles.sectionPrompt}>{ONBOARDING_COPY.step1.goalPrompt}</Text>

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
            gradientEnd={goal.gradientEnd}
            isSelected={selectedGoal === goal.id}
            onPress={handleGoalSelect}
          />
        ))}
      </View>

      {/* Flexible spacer pushes button to bottom */}
      <View style={styles.spacer} />

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
            colors={selectedGoal ? [DS.primary, DS.primaryLight] : ['#D1FAE5', '#A7F3D0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
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
              color={selectedGoal ? 'rgba(255,255,255,0.95)' : DS.onSurfaceVar}
            />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  sectionPrompt: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.family.semibold,
    color: DS.onSurfaceVar,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: -8,
  },
  goalsContainer: {
    gap: 14,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },

  /* Pill CTA */
  ctaWrapper: {
    borderRadius: 999,
    marginBottom: 8,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaWrapperDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaButton: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  ctaText: {
    fontSize: 17,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  ctaTextDisabled: {
    color: DS.onSurfaceVar,
  },
});

export default Step1Screen;
