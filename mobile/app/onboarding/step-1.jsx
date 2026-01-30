/**
 * Onboarding Step 1: Welcome & Primary Goal
 * User selects their main fitness objective
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  AccessibilityInfo,
} from 'react-native';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import GoalCard from '../../components/onboarding/GoalCard';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { GOALS, ONBOARDING_COPY, A11Y_LABELS } from '../../constants/onboardingConfig';
import { BRAND, TYPOGRAPHY } from '../../constants/premiumTheme';

const Step1Screen = () => {
  const { step1Data, updateStepData, goToNextStep } = useOnboarding();

  const selectedGoal = step1Data.primaryGoal;

  const handleGoalSelect = (goalId) => {
    updateStepData('step1', { primaryGoal: goalId });
  };

  const handleContinue = () => {
    if (selectedGoal) {
      goToNextStep();
    }
  };

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step1);
  }, []);

  return (
    <OnboardingLayout
      step={1}
      totalSteps={4}
      title={ONBOARDING_COPY.step1.title}
      subtitle={ONBOARDING_COPY.step1.subtitle}
      canGoBack={false}
    >
      {/* Goals */}
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

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Continue Button */}
      <Pressable
        onPress={handleContinue}
        disabled={!selectedGoal}
        style={({ pressed }) => [
          styles.continueButton,
          !selectedGoal && styles.continueButtonDisabled,
          pressed && styles.continueButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Continue to next step"
        accessibilityState={{ disabled: !selectedGoal }}
      >
        <Text style={styles.continueButtonText}>
          {ONBOARDING_COPY.step1.continueBtn}
        </Text>
      </Pressable>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  goalsContainer: {
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  continueButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    marginBottom: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  continueButtonPressed: {
    backgroundColor: BRAND.primaryDark,
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
  },
});

export default Step1Screen;
