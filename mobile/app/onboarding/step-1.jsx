/**
 * Onboarding Step 1 — "The Organic Editorial" Design System
 *
 * - No borders — tonal layering only
 * - Pill CTA: borderRadius 999, gradient #1c6d25 → #9df197
 * - Ambient shadow: 6% on-surface
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
  onSurface:    '#0e3a20',
  onSurfaceVar: 'rgba(14, 58, 32, 0.50)',
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
            colors={selectedGoal ? ['#1c6d25', '#9df197'] : ['#beeec8', '#d2f7d8']}
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
              color={selectedGoal ? 'rgba(255,255,255,0.9)' : 'rgba(14,58,32,0.4)'}
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
    letterSpacing: 1.2,
    marginBottom: -4,
  },
  goalsContainer: {
    gap: 12,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },

  /* Pill CTA */
  ctaWrapper: {
    borderRadius: 999,
    marginBottom: 8,
    shadowColor: '#1c6d25',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaWrapperDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaButton: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  ctaText: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  ctaTextDisabled: {
    color: DS.onSurfaceVar,
  },
});

export default Step1Screen;
