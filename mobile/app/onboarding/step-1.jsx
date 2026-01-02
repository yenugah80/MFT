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
import { useOnboarding } from '../../hooks/useOnboarding';
import { GOALS, ONBOARDING_COPY, A11Y_LABELS } from '../../constants/onboardingConfig';
import { BRAND } from '../../constants/premiumTheme';

const Step1Screen = () => {
  const { step, step1Data, updateStepData, goToNextStep, setStep } = useOnboarding();

  const selectedGoal = step1Data.primaryGoal;

  const handleGoalSelect = (goalId) => {
    updateStepData('step1', { primaryGoal: goalId });
  };

  const handleContinue = () => {
    if (selectedGoal) {
      console.log('[Step 1] Continue clicked, selectedGoal:', selectedGoal);
      console.log('[Step 1] Calling goToNextStep...');
      goToNextStep();
    }
  };

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(A11Y_LABELS.step1);
  }, []);

  // Ensure step is synchronized to 1 when this screen loads
  // Only sync if significantly out of sync (prevents override of ongoing navigation)
  useEffect(() => {
    if (step > 1) {
      console.log('[Step 1] Screen loaded - syncing hook state to step 1 (was:', step, ')');
      setStep(1);
    }
  }, [step, setStep]);

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
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default Step1Screen;
